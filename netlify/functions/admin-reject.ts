import prisma from './lib/prisma';
import { sendRejectionEmail } from './lib/email';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

async function verifySuperAdmin(clerkId: string): Promise<boolean> {
  if (!clerkId) return false;
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return user?.role === 'superadmin';
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify superadmin
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado — token requerido' }),
      };
    }

    const isSuperAdmin = await verifySuperAdmin(token);
    if (!isSuperAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acceso denegado — se requiere rol superadmin' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { businessId, reason } = body;

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId requerido' }),
      };
    }

    if (!reason || reason.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Motivo de rechazo requerido' }),
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

    if (business.status === 'rejected') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El negocio ya está rechazado' }),
      };
    }

    // Update business status to rejected
    const updatedBusiness = await prisma.businessProfile.update({
      where: { id: businessId },
      data: {
        status: 'rejected',
        rejectionReason: reason,
      },
      select: {
        id: true,
        name: true,
        status: true,
        rejectionReason: true,
        updatedAt: true,
      },
    });

    // Send rejection email
    const ownerEmail = business.owner.email;
    const ownerName = business.owner.name || business.ownerFullName || 'Usuario';

    await sendRejectionEmail(ownerEmail, business.name, ownerName, reason);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ business: updatedBusiness }),
    };
  } catch (error: any) {
    console.error('Error in admin-reject:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al rechazar negocio', details: error.message }),
    };
  }
};
