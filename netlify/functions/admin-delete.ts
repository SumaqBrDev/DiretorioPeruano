import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { requireSuperAdmin } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

export const handler = async (event: any) => {
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'DELETE' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify superadmin: validate Clerk token + superadmin role in PostgreSQL
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
      select: {
        id: true,
        stripeCustomerId: true,
        subscriptionId: true,
        name: true,
      },
    });

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Negocio no encontrado' }),
      };
    }

    // Cancel Stripe subscription if exists.
    // BUG-035: `update({ cancel_at_period_end: true })` keeps the sub ACTIVE
    // until period end and fires `customer.subscription.updated` with the OLD
    // status (e.g. trialing) — the webhook then overwrites the local
    // `subscriptionStatus: 'canceled'` we just wrote with `trial`, leaving a
    // disabled business with an active-looking trial. Cancel immediately so
    // Stripe emits `customer.subscription.deleted` → `canceled` (consistent).
    if (business.subscriptionId) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(business.subscriptionId);
        console.log(`Stripe subscription ${business.subscriptionId} cancelled`);
      } catch (stripeError: any) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Don't block deletion if Stripe cancel fails
      }
    }

    // Soft delete: update status to disabled and remove from listings
    await prisma.businessProfile.update({
      where: { id: businessId },
      data: {
        status: 'disabled',
        subscriptionStatus: 'canceled',
      },
    });

    console.log(`Business ${businessId} (${business.name}) soft-deleted by superadmin`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('Error in admin-delete:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al eliminar negocio', details: error.message }),
    };
  }
};
