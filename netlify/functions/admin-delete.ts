import prisma from './lib/prisma';
import Stripe from 'stripe';
import { requireSuperAdmin } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-01.basil',
    });
  }
  return stripeInstance;
}


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
        stripeSubscriptionId: true,
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

    // Cancel Stripe subscription if exists
    if (business.stripeSubscriptionId) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.update(business.stripeSubscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            cancelledBy: 'superadmin',
            businessId: businessId,
          },
        });
        console.log(`Stripe subscription ${business.stripeSubscriptionId} marked for cancellation`);
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
