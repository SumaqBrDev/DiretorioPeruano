// scripts/backfill-clerk-user-profiles.mjs
//
// One-time repair for users provisioned before the Clerk profile lookup fix.
//
// `ensureUserByClerkId` populated email/name only from session token claims,
// but Clerk's default token carries just `sub`, so those users were stored with
// NULL email and name. The fix repairs rows on their next consent-flow pass;
// this script repairs the rows that already exist.
//
// Safety properties:
//   - Reads only users whose email OR name is NULL. Never touches complete rows.
//   - Writes ONLY the fields that are currently NULL. Never overwrites a value.
//   - Skips a user when Clerk has nothing to offer for the missing field.
//   - Idempotent: a second run finds nothing left to repair.
//   - Dry run by default: writes only when BACKFILL_MODE=apply.
//
// Usage (env injected by Netlify, never printed). The mode is passed via env
// because `ntl dev:exec` consumes `--flags` itself before reaching node:
//   BACKFILL_MODE=dry   ntl dev:exec --context production node scripts/backfill-clerk-user-profiles.mjs
//   BACKFILL_MODE=apply ntl dev:exec --context production node scripts/backfill-clerk-user-profiles.mjs

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const APPLY = (process.env.BACKFILL_MODE || 'dry').toLowerCase() === 'apply';
const DRY_RUN = !APPLY;

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';
if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY is not available in this environment. Aborting.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not available in this environment. Aborting.');
  process.exit(1);
}

// Prisma 7 requires a driver adapter at construction time (mirrors lib/prisma.ts).
const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

/** Mask an email for logs: keeps enough to identify, not enough to leak. */
function maskEmail(email) {
  if (!email) return String(email);
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function resolveProfile(user) {
  const primaryId = user.primaryEmailAddressId;
  const addresses = user.emailAddresses || [];
  const primary = addresses.find((a) => a.id === primaryId) || addresses[0];
  const email = primary?.emailAddress ?? null;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const name = fullName || user.username || null;
  return { email, name };
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY (writes enabled)'}\n`);

  const incomplete = await prisma.user.findMany({
    where: { OR: [{ email: null }, { name: null }] },
    select: { id: true, clerkId: true, email: true, name: true, role: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Users with a missing email or name: ${incomplete.length}\n`);
  if (incomplete.length === 0) {
    console.log('Nothing to repair.');
    return;
  }

  let repaired = 0;
  let skipped = 0;

  for (const row of incomplete) {
    const label = `${row.id.slice(0, 8)} (${row.role})`;

    if (!row.clerkId) {
      console.log(`- ${label}: no clerkId stored; skipped.`);
      skipped += 1;
      continue;
    }

    let profile;
    try {
      const clerkUser = await clerk.users.getUser(row.clerkId);
      profile = resolveProfile(clerkUser);
    } catch (err) {
      console.log(`- ${label}: Clerk lookup failed (${err.message}); skipped.`);
      skipped += 1;
      continue;
    }

    // Only fill what is missing. An existing value is never overwritten.
    const data = {};
    if (row.email === null && profile.email) data.email = profile.email;
    if (row.name === null && profile.name) data.name = profile.name;

    if (Object.keys(data).length === 0) {
      console.log(`- ${label}: Clerk has nothing for the missing field(s); skipped.`);
      skipped += 1;
      continue;
    }

    const preview = [
      data.email ? `email=${maskEmail(data.email)}` : null,
      data.name ? `name=${data.name}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    if (DRY_RUN) {
      console.log(`- ${label}: would set ${preview}`);
      repaired += 1;
      continue;
    }

    // Guard against a concurrent write: only update while still NULL.
    const res = await prisma.user.updateMany({
      where: {
        id: row.id,
        ...(data.email ? { email: null } : {}),
        ...(data.name ? { name: null } : {}),
      },
      data,
    });

    if (res.count === 1) {
      console.log(`- ${label}: set ${preview}`);
      repaired += 1;
    } else {
      console.log(`- ${label}: row changed concurrently; left untouched.`);
      skipped += 1;
    }
  }

  console.log(
    `\n${DRY_RUN ? 'Would repair' : 'Repaired'}: ${repaired} | Skipped: ${skipped}`
  );
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
