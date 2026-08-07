import prisma from './lib/prisma';
import { requireSuperAdmin } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

interface MigratingBusiness {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
  tags?: string[];
  photos?: string[];
  userId?: string;
  cnpj?: string;
  ownerFullName?: string;
  ownerBirthCity?: string;
  status?: string;
  rejectionReason?: string;
  approvedAt?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MigratingReview {
  id?: string;
  businessId: string;
  author?: string;
  rating?: number;
  text?: string;
  userId?: string;
  createdAt?: string;
}

interface MigratingConversation {
  id?: string;
  businessId?: string;
  userId?: string;
  archived?: boolean;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  messages?: Array<{ id?: string; senderId?: string; content?: string; createdAt?: string }>;
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Only superadmin may migrate data (idempotent, non-destructive).
  const auth = await requireSuperAdmin(event);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  const superadminClerkId = auth.clerkId!;

  try {
    const body = JSON.parse(event.body || '{}');
    const businesses: MigratingBusiness[] = body.businesses || [];
    const reviews: MigratingReview[] = body.reviews || [];
    const conversations: MigratingConversation[] = body.conversations || [];

    const report = {
      migrated: { businesses: 0, reviews: 0, conversations: 0 },
      skipped: 0,
      errors: 0,
      errorDetails: [] as string[],
    };

    // Resolve (or create) the superadmin User to own orphaned records.
    let superadminUser = await prisma.user.findUnique({
      where: { clerkId: superadminClerkId },
      select: { id: true, role: true },
    });
    if (!superadminUser) {
      superadminUser = await prisma.user.create({
        data: {
          clerkId: superadminClerkId,
          email: `superadmin-${superadminClerkId}@conectaperu.local`,
          name: 'Superadmin',
          role: 'superadmin',
        },
        select: { id: true, role: true },
      });
    }

    // ── Businesses (upsert, idempotent) ──
    for (const b of businesses) {
      if (!b.name) {
        report.skipped++;
        continue;
      }
      const lc = {
        name: b.name,
        description: b.description || '',
        category: b.category || 'servicos',
        street: b.address?.street || '',
        city: b.address?.city || '',
        state: b.address?.state || '',
        zipCode: b.address?.zip || '',
        number: '',
        tags: b.tags || [],
        photos: b.photos || [],
        cnpj: b.cnpj || null,
        ownerFullName: b.ownerFullName || null,
        ownerBirthCity: b.ownerBirthCity || null,
        status: b.status || 'pending',
        rejectionReason: b.rejectionReason || null,
        approvedAt: b.approvedAt ? new Date(b.approvedAt) : null,
        subscriptionStatus: b.subscriptionStatus || 'none',
        trialEndsAt: b.trialEndsAt ? new Date(b.trialEndsAt) : null,
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
      };

      // Slug (unique). Derive from name + id suffix to avoid collisions.
      const slugBase = (b.name || 'empresa')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'empresa';
      const slug = `${slugBase}-${String(b.id || Date.now()).slice(-6)}`;

      // Resolve owner: prefer the existing user by clerkId (b.userId), else superadmin.
      let ownerId = superadminUser.id;
      if (b.userId) {
        const existing = await prisma.user.findUnique({
          where: { clerkId: b.userId },
          select: { id: true },
        });
        if (existing) ownerId = existing.id;
      }

      try {
        const existing = b.id
          ? await prisma.businessProfile.findUnique({ where: { id: b.id } })
          : null;

        const data = {
          ...lc,
          ownerId,
          slug,
        };

        if (existing) {
          await prisma.businessProfile.update({ where: { id: existing.id }, data });
        } else {
          await prisma.businessProfile.create({
            data: { ...data, id: b.id || undefined } as any,
          });
        }
        report.migrated.businesses++;
      } catch (err: any) {
        report.errors++;
        report.errorDetails.push(`business:${b.name}: ${err.message}`);
      }
    }

    // ── Reviews (upsert by id) ──
    for (const r of reviews) {
      if (!r.businessId) {
        report.skipped++;
        continue;
      }
      try {
        const exists = r.id
          ? await prisma.review.findUnique({ where: { id: r.id } })
          : null;
        const consumer = r.userId
          ? await prisma.user.findUnique({ where: { clerkId: r.userId } })
          : null;

        const data = {
          rating: Math.min(5, Math.max(1, Math.round(r.rating || 5))),
          comment: r.text || r.author || '',
          businessId: r.businessId,
          consumerId: consumer?.id || superadminUser.id,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        };

        if (exists) {
          await prisma.review.update({
            where: { id: exists.id },
            data: { rating: data.rating, comment: data.comment },
          });
        } else {
          await prisma.review.create({ data: { ...data, id: r.id || undefined } as any });
        }
        report.migrated.reviews++;
      } catch (err: any) {
        report.errors++;
        report.errorDetails.push(`review:${r.id || '?'}: ${err.message}`);
      }
    }

    // ── Conversations (consumer <-> business) ──
    // The B2BConversation model no longer exists in the schema (inbox uses
    // JSONB + Message), so legacy conversations cannot be migrated. They stay
    // in localStorage — counted as skipped so the report stays honest.
    report.skipped += conversations.length;
    if (conversations.length > 0) {
      console.warn(
        `Skipped ${conversations.length} legacy conversations (B2BConversation model removed)`
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        migrated: report.migrated,
        skipped: report.skipped,
        errors: report.errors,
        errorDetails: report.errorDetails.slice(0, 20),
        note: 'localStorage no fue borrado. Ejecute la limpieza desde el cliente cuando lo confirme.',
      }),
    };
  } catch (error: any) {
    console.error('Error in migrate-localstorage:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al migrar datos', details: error.message }),
    };
  }
};
