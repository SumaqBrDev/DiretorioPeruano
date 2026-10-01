import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { sendApprovalEmail } from './lib/email';
import { requireSuperAdmin } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_59_brl_monthly';
const STRIPE_TRIAL_DAYS = parseInt(process.env.STRIPE_TRIAL_DAYS || '30', 10);
// Early-bird launch offer: coupon id (amount_off R$20, duration repeating 3 months).
// Present = applied to every subscription created on approval; remove to disable.
// Read at call time so the configured value is honoured per request.
const getEarlyBirdCouponId = () => process.env.EARLY_BIRD_COUPON_ID || '';

// Version of the subscription-create payload sent to Stripe. Stripe binds an
// idempotency key to the exact parameters it was first used with and answers
// `idempotency_error` when a reused key carries a different payload. Earlier
// attempts burned the unversioned key with a now-invalid payload, so the key
// must change whenever the payload shape does. Bump this on every such change.
const APPROVAL_PAYLOAD_VERSION = 2;

type StripeCustomerWithDefaultPaymentMethod = {
  deleted?: boolean;
  invoice_settings?: {
    default_payment_method?: string | { id?: string } | null;
  } | null;
};

function getDefaultPaymentMethodId(customer: StripeCustomerWithDefaultPaymentMethod): string | null {
  const paymentMethod = customer.invoice_settings?.default_payment_method;
  if (typeof paymentMethod === 'string') return paymentMethod;
  return paymentMethod?.id ?? null;
}

async function releaseApprovalClaim(businessId: string): Promise<void> {
  await prisma.businessProfile.updateMany({
    where: { id: businessId, subscriptionStatus: 'approval_processing', status: 'pending' },
    data: { subscriptionStatus: null },
  });
}

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify superadmin: cryptographically validate the Clerk token,
    // then confirm the verified user has the superadmin role in PostgreSQL.
    const auth = await requireSuperAdmin(event);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { businessId } = body;

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId requerido' }),
      };
    }

    // Fetch the business
    const business = await prisma.businessProfile.findUnique({
      where: { id: businessId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Negocio no encontrado' }),
      };
    }

    if (!business.owner) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Negocio sin propietario registrado' }),
      };
    }

    if (business.status === 'approved') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El negocio ya está aprobado' }),
      };
    }

    // Check if beta mode is enabled
    const siteConfig = await prisma.siteConfig.findUnique({
      where: { id: 'singleton' },
    });
    const betaMode = siteConfig?.betaMode ?? true;

    let stripeCustomerId = business.stripeCustomerId;
    let subscriptionId = business.subscriptionId;
    let trialEndsAt: Date | null = business.trialEndsAt ?? null;

    // In paid mode, approval is responsible for creating the Stripe
    // subscription. Checkout previously saved the customer's payment method but
    // did not create a subscription or start the trial while pending.
    if (!betaMode && !subscriptionId) {
      const claim = await prisma.businessProfile.updateMany({
        where: {
          id: businessId,
          status: 'pending',
          subscriptionId: null,
          OR: [
            { subscriptionStatus: null },
            { subscriptionStatus: { not: 'approval_processing' } },
          ],
        },
        data: { subscriptionStatus: 'approval_processing' },
      });

      if (claim.count !== 1) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'La aprobación ya está en proceso o el negocio cambió de estado',
            code: 'APPROVAL_ALREADY_IN_PROGRESS',
          }),
        };
      }

      try {
        const stripe = getStripe();

        if (!stripeCustomerId) {
          await releaseApprovalClaim(businessId);
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              error: 'Completa Checkout para guardar un método de pago antes de aprobar el negocio',
              code: 'SETUP_PAYMENT_METHOD_REQUIRED',
            }),
          };
        }

        const customer = await stripe.customers.retrieve(stripeCustomerId) as StripeCustomerWithDefaultPaymentMethod;
        const defaultPaymentMethodId = customer.deleted ? null : getDefaultPaymentMethodId(customer);
        if (!defaultPaymentMethodId) {
          await releaseApprovalClaim(businessId);
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              error: 'Completa Checkout para guardar un método de pago antes de aprobar el negocio',
              code: 'SETUP_PAYMENT_METHOD_REQUIRED',
            }),
          };
        }

        // Create Stripe Subscription with 30-day trial. This is the first time
        // the subscription exists: checkout only saved a payment method while
        // the business was pending.
        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          default_payment_method: defaultPaymentMethodId,
          items: [{ price: STRIPE_PRICE_ID }],
          trial_period_days: STRIPE_TRIAL_DAYS,
          // Stripe removed the top-level `coupon` param on subscription create:
          // it now answers "Received unknown parameter: coupon. Did you mean to
          // use `discounts` instead?" and the approval fails with 502.
          ...(getEarlyBirdCouponId() ? { discounts: [{ coupon: getEarlyBirdCouponId() }] } : {}),
          metadata: {
            businessId: business.id,
          },
          payment_settings: {
            save_default_payment_method: 'on_subscription',
          },
        }, { idempotencyKey: `business-approval-${business.id}-v${APPROVAL_PAYLOAD_VERSION}` });

        subscriptionId = subscription.id;
        trialEndsAt = subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : new Date(Date.now() + STRIPE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
      } catch (stripeError: any) {
        await releaseApprovalClaim(businessId);
        console.error('Stripe error during approval:', stripeError);
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({
            error: 'No se pudo crear la suscripción de Stripe; el negocio permanece pendiente',
            code: 'SUBSCRIPTION_CREATE_FAILED',
            details: stripeError.message,
          }),
        };
      }
    }

    // Update business status
    const now = new Date();
    const updatedBusiness = await prisma.businessProfile.update({
      where: { id: businessId },
      data: {
        status: 'approved',
        approvedAt: now,
        subscriptionStatus: betaMode ? 'none' : 'trial',
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        ...(subscriptionId ? { subscriptionId } : {}),
        ...(trialEndsAt ? { trialEndsAt } : {}),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send approval email
    const ownerEmail = business.owner.email ?? '';
    const ownerName = business.owner.name || business.ownerFullName || 'Usuario';
    const formattedTrialEnd = trialEndsAt
      ? trialEndsAt.toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : betaMode
        ? 'No aplica (modo beta)'
        : '30 días desde ahora';

    await sendApprovalEmail(ownerEmail, business.name ?? '', ownerName, formattedTrialEnd);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        business: {
          id: updatedBusiness.id,
          name: updatedBusiness.name,
          status: updatedBusiness.status,
          approvedAt: updatedBusiness.approvedAt,
          subscriptionStatus: updatedBusiness.subscriptionStatus,
          stripeCustomerId: updatedBusiness.stripeCustomerId,
          subscriptionId: updatedBusiness.subscriptionId,
          trialEndsAt: updatedBusiness.trialEndsAt,
        },
        subscription: subscriptionId
          ? {
              id: subscriptionId,
              customerId: stripeCustomerId,
              trialEndsAt: trialEndsAt,
              priceId: STRIPE_PRICE_ID,
            }
          : null,
      }),
    };
  } catch (error: any) {
    console.error('Error in admin-approve:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al aprobar negocio', details: error.message }),
    };
  }
};
