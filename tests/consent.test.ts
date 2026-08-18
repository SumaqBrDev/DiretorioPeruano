// tests/consent.test.ts
// Strict TDD (WU2a task 2.1): RED-first unit tests for the consent core lib
// (netlify/functions/lib/consent.ts) and the signup consent state-machine
// reducer (src/lib/signupConsentMachine.ts).
//
// Acceptance criteria (spec #229): consent-api/* (closed-list validation,
// idempotent duplicate, revocation rules), re-consent gate (fail-closed +
// admin exemption), consent-rights-preferences/Export (own data only, no
// secrets), signup-consent-ux (dismissing re-consent keeps the user gated).
//
// Core tests use an INJECTED mocked Prisma (repo convention: vi.mock of
// lib/prisma/lib/auth is reserved for handler tests). Pure node env.

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  validateClosedLists,
  ensureUserByClerkId,
  recordConsent,
  revokeConsent,
  assertCurrentMandatoryConsent,
  resolveCurrentConsents,
  buildExport,
} from '../netlify/functions/lib/consent';

import {
  signupConsentReducer,
  INITIAL_SIGNUP_STATE,
  type SignupConsentState,
} from '../src/lib/signupConsentMachine';

import { CLOSED_LISTS } from '../src/config/legal';

// Deterministic "today" so the tests never depend on the wall clock.
// Active registry at NOW: privacy_policy v2 (service), terms_of_service v1
// (service), cookie_policy v1 (analytics, marketing). Mandatory (service)
// documents = privacy_policy + terms_of_service.
const NOW = new Date('2026-08-17T12:00:00Z');
const COOKIE_V1_HASH = '897c9bd23dc02848eec9d7f33380771f47629d38cab0beb333ed3e915fb416b3';

interface PrismaMock {
  user: { upsert: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  consentRecord: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  cookiePreference: { findMany: ReturnType<typeof vi.fn> };
}

function makePrismaMock(): PrismaMock {
  return {
    user: { upsert: vi.fn(), findUnique: vi.fn() },
    consentRecord: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    cookiePreference: { findMany: vi.fn() },
  } as unknown as PrismaMock;
}

/** Minimal ConsentRecord-shaped row builder. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    userId: 'user-1',
    documentType: 'terms_of_service',
    documentVersion: '1',
    documentHash: 'hash',
    purpose: 'service',
    legalBasis: 'contract',
    intent: 'grant',
    granted: true,
    consentedAt: new Date('2026-08-17T10:00:00Z'),
    revokedAt: null,
    source: 'onboarding',
    locale: 'pt-BR',
    idempotencyKey: 'idem-1',
    createdAt: new Date('2026-08-17T10:00:00Z'),
    ...overrides,
  };
}

function userRow(overrides: Record<string, unknown> = {}) {
  return { id: 'user-1', clerkId: 'user_clerk_1', email: 'a@b.c', name: 'Ana', role: 'consumer', ...overrides };
}

describe('validateClosedLists — closed-list validation', () => {
  it('accepts every value allowed by CLOSED_LISTS', () => {
    const res = validateClosedLists({
      documentType: 'terms_of_service',
      purpose: 'service',
      legalBasis: 'contract',
      source: 'onboarding',
      locale: 'pt-BR',
      intent: 'grant',
    });
    expect(res.ok).toBe(true);
  });

  it('rejects an unknown documentType', () => {
    const res = validateClosedLists({ documentType: 'no_such_doc', purpose: 'service' });
    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.errors.join()).toContain('documentType');
  });

  it('rejects an unknown purpose', () => {
    const res = validateClosedLists({ documentType: 'terms_of_service', purpose: 'spam' });
    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.errors.join()).toContain('purpose');
  });

  it('rejects an unknown legalBasis', () => {
    const res = validateClosedLists({ documentType: 'terms_of_service', legalBasis: 'fiscal' });
    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.errors.join()).toContain('legalBasis');
  });

  it('rejects an unknown source', () => {
    const res = validateClosedLists({ documentType: 'terms_of_service', source: 'carrier-pigeon' });
    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.errors.join()).toContain('source');
  });

  it('rejects an unknown locale', () => {
    const res = validateClosedLists({ documentType: 'terms_of_service', locale: 'xx-XX' });
    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.errors.join()).toContain('locale');
  });

  it('rejects an unknown intent', () => {
    const res = validateClosedLists({ documentType: 'terms_of_service', intent: 'maybe' });
    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.errors.join()).toContain('intent');
  });

  it('reports every invalid field at once', () => {
    const res = validateClosedLists({ documentType: 'x', purpose: 'y', legalBasis: 'z', source: 'w', locale: 'v', intent: 'u' });
    expect(res.ok).toBe(false);
    if (res.ok !== true) {
      const all = res.errors.join();
      expect(all).toContain('documentType');
      expect(all).toContain('purpose');
      expect(all).toContain('legalBasis');
      expect(all).toContain('source');
      expect(all).toContain('locale');
      expect(all).toContain('intent');
    }
  });

  it('only validates the fields that are present', () => {
    expect(validateClosedLists({ purpose: 'analytics' }).ok).toBe(true);
    expect(validateClosedLists({}).ok).toBe(true);
  });
});

describe('recordConsent — append-only grant with idempotency', () => {
  let prisma: PrismaMock;
  beforeEach(() => {
    prisma = makePrismaMock();
    prisma.consentRecord.findFirst.mockResolvedValue(null);
    prisma.consentRecord.create.mockImplementation((args: any) => Promise.resolve({ id: 'row-new', ...args.data }));
  });

  it('records a grant row using the server-derived ACTIVE version and hash from the registry', async () => {
    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'terms_of_service',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'onboarding',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(true);
    if (res.ok !== true) return;
    expect(res.duplicate).toBe(false);
    expect(prisma.consentRecord.create).toHaveBeenCalledTimes(1);
    const data = (prisma.consentRecord.create as any).mock.calls[0][0].data;
    expect(data.userId).toBe('user-1');
    expect(data.documentType).toBe('terms_of_service');
    expect(data.documentVersion).toBe('1');
    expect(data.documentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.intent).toBe('grant');
    expect(data.granted).toBe(true);
    expect(data.revokedAt).toBeNull();
    expect(data.source).toBe('onboarding');
    expect(data.locale).toBe('pt-BR');
    expect(data.idempotencyKey).toBe('idem-1');
    expect(data.consentedAt).toEqual(NOW);
  });

  it('records the ACTIVE privacy_policy v2 (never the superseded v1)', async () => {
    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'privacy_policy',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'onboarding',
        locale: 'pt-BR',
        idempotencyKey: 'idem-2',
      },
      { prisma: prisma as any },
      NOW
    );
    expect(res.ok).toBe(true);
    const data = (prisma.consentRecord.create as any).mock.calls[0][0].data;
    expect(data.documentVersion).toBe('2');
  });

  it('returns duplicate:true on the idempotency PRE-CHECK hit without creating another row', async () => {
    const existing = row({ id: 'row-existing', idempotencyKey: 'idem-1' });
    prisma.consentRecord.findFirst.mockResolvedValue(existing);

    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'terms_of_service',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'onboarding',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res).toEqual({ ok: true, record: existing, duplicate: true });
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
    expect(prisma.consentRecord.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', idempotencyKey: 'idem-1' },
    });
  });

  it('returns duplicate:true when a P2002 race beats the pre-check', async () => {
    prisma.consentRecord.findFirst
      .mockResolvedValueOnce(null) // pre-check: nothing yet
      .mockResolvedValueOnce(row({ id: 'row-winner', idempotencyKey: 'idem-1' })); // post-race lookup
    prisma.consentRecord.create.mockRejectedValueOnce({ code: 'P2002' });

    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'terms_of_service',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'onboarding',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(true);
    if (res.ok !== true) return;
    expect(res.duplicate).toBe(true);
    expect(res.record.id).toBe('row-winner');
  });

  it('rejects an unknown documentType with INVALID_PAYLOAD and records nothing', async () => {
    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'no_such_doc',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'onboarding',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('INVALID_PAYLOAD');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects a superseded version (privacy_policy v1 while v2 is active)', async () => {
    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'privacy_policy',
        documentVersion: '1',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'onboarding',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('INVALID_PAYLOAD');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects a future-dated version (cookie_policy v2, effective 2099)', async () => {
    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'cookie_policy',
        documentVersion: '2',
        purpose: 'analytics',
        legalBasis: 'consent',
        source: 'settings',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('INVALID_PAYLOAD');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects a purpose the document does not apply to (marketing on terms_of_service)', async () => {
    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'terms_of_service',
        purpose: 'marketing',
        legalBasis: 'consent',
        source: 'settings',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('INVALID_PAYLOAD');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects invalid closed-list values with INVALID_PAYLOAD before touching the DB', async () => {
    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'terms_of_service',
        purpose: 'service',
        legalBasis: 'not-a-basis',
        source: 'onboarding',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('INVALID_PAYLOAD');
    expect(prisma.consentRecord.findFirst).not.toHaveBeenCalled();
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects granted=false on the record endpoint (revokes must go through revokeConsent)', async () => {
    const res = await recordConsent(
      {
        userId: 'user-1',
        documentType: 'cookie_policy',
        purpose: 'analytics',
        legalBasis: 'consent',
        source: 'settings',
        locale: 'pt-BR',
        granted: false,
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('INVALID_PAYLOAD');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('appends new rows on re-consent — never UPDATEs existing evidence', async () => {
    await recordConsent(
      {
        userId: 'user-1',
        documentType: 'privacy_policy',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'onboarding',
        locale: 'pt-BR',
        idempotencyKey: 'idem-1',
      },
      { prisma: prisma as any },
      NOW
    );
    await recordConsent(
      {
        userId: 'user-1',
        documentType: 'privacy_policy',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'reconsent',
        locale: 'pt-BR',
        idempotencyKey: 'idem-2',
      },
      { prisma: prisma as any },
      NOW
    );

    expect(prisma.consentRecord.create).toHaveBeenCalledTimes(2);
    expect(prisma.consentRecord.update).not.toHaveBeenCalled();
  });
});

describe('revokeConsent — optional-only revocation rules', () => {
  let prisma: PrismaMock;
  beforeEach(() => {
    prisma = makePrismaMock();
    prisma.consentRecord.findFirst.mockResolvedValue(null);
    prisma.consentRecord.create.mockImplementation((args: any) => Promise.resolve({ id: 'row-rev', ...args.data }));
  });

  it('revokes an OPTIONAL consent by appending granted=false with revokedAt set', async () => {
    const res = await revokeConsent(
      { userId: 'user-1', documentType: 'cookie_policy', purpose: 'analytics', idempotencyKey: 'rev-1' },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(true);
    if (res.ok !== true) return;
    expect(res.duplicate).toBe(false);
    expect(prisma.consentRecord.create).toHaveBeenCalledTimes(1);
    const data = (prisma.consentRecord.create as any).mock.calls[0][0].data;
    expect(data.documentType).toBe('cookie_policy');
    expect(data.documentVersion).toBe('1');
    expect(data.documentHash).toBe(COOKIE_V1_HASH);
    expect(data.purpose).toBe('analytics');
    expect(data.granted).toBe(false);
    expect(data.intent).toBe('revoke');
    expect(data.revokedAt).toEqual(NOW);
    expect(data.source).toBe('settings'); // defaulted server-side
    expect(data.locale).toBe('pt-BR');
  });

  it('rejects revoking the MANDATORY service consent (terms_of_service) with MANDATORY_NOT_REVOCABLE', async () => {
    const res = await revokeConsent(
      { userId: 'user-1', documentType: 'terms_of_service', purpose: 'service', idempotencyKey: 'rev-1' },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('MANDATORY_NOT_REVOCABLE');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects revoking the mandatory privacy_policy service consent', async () => {
    const res = await revokeConsent(
      { userId: 'user-1', documentType: 'privacy_policy', purpose: 'service', idempotencyKey: 'rev-1' },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('MANDATORY_NOT_REVOCABLE');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects revoking an unknown document with DOCUMENT_NOT_FOUND', async () => {
    const res = await revokeConsent(
      { userId: 'user-1', documentType: 'no_such_doc', purpose: 'analytics', idempotencyKey: 'rev-1' },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('DOCUMENT_NOT_FOUND');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects a purpose the document does not apply to (service on cookie_policy)', async () => {
    const res = await revokeConsent(
      { userId: 'user-1', documentType: 'cookie_policy', purpose: 'service', idempotencyKey: 'rev-1' },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.code).toBe('INVALID_PAYLOAD');
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('returns duplicate:true on the idempotency pre-check hit', async () => {
    const existing = row({ id: 'row-existing-rev', idempotencyKey: 'rev-1' });
    prisma.consentRecord.findFirst.mockResolvedValue(existing);

    const res = await revokeConsent(
      { userId: 'user-1', documentType: 'cookie_policy', purpose: 'analytics', idempotencyKey: 'rev-1' },
      { prisma: prisma as any },
      NOW
    );

    expect(res).toEqual({ ok: true, record: existing, duplicate: true });
    expect(prisma.consentRecord.create).not.toHaveBeenCalled();
  });

  it('appends the revocation as a NEW row — the prior grant row is never updated', async () => {
    prisma.consentRecord.findFirst.mockResolvedValueOnce(null);

    const res = await revokeConsent(
      { userId: 'user-1', documentType: 'cookie_policy', purpose: 'marketing', idempotencyKey: 'rev-2' },
      { prisma: prisma as any },
      NOW
    );

    expect(res.ok).toBe(true);
    const data = (prisma.consentRecord.create as any).mock.calls[0][0].data;
    expect(data.granted).toBe(false);
    expect(data.intent).toBe('revoke');
    expect(prisma.consentRecord.update).not.toHaveBeenCalled();
  });
});

describe('resolveCurrentConsents — current consent resolution', () => {
  let prisma: PrismaMock;
  beforeEach(() => {
    prisma = makePrismaMock();
  });

  it('returns the LATEST row per (documentType, purpose), newest first', async () => {
    prisma.consentRecord.findMany.mockResolvedValue([
      // deliberately unsorted — lib must sort defensively
      row({ id: 'r2', documentType: 'terms_of_service', purpose: 'service', granted: true, createdAt: new Date('2026-08-17T11:00:00Z') }),
      row({ id: 'r1', documentType: 'cookie_policy', purpose: 'analytics', granted: true, createdAt: new Date('2026-08-17T09:00:00Z') }),
      row({ id: 'r3', documentType: 'terms_of_service', purpose: 'service', granted: true, createdAt: new Date('2026-08-17T12:00:00Z') }),
    ]);

    const current = await resolveCurrentConsents('user-1', { prisma: prisma as any });

    expect(current).toHaveLength(2);
    expect(current[0].documentType).toBe('terms_of_service');
    expect(current[0].id).toBe('r3'); // newest wins
    expect(current[1].documentType).toBe('cookie_policy');
    expect(current[1].purpose).toBe('analytics');
  });

  it('reflects a revocation: grant then revoke for the same key yields granted=false', async () => {
    prisma.consentRecord.findMany.mockResolvedValue([
      row({ id: 'grant', documentType: 'cookie_policy', purpose: 'marketing', granted: true, intent: 'grant', revokedAt: null, createdAt: new Date('2026-08-17T09:00:00Z') }),
      row({ id: 'revoke', documentType: 'cookie_policy', purpose: 'marketing', granted: false, intent: 'revoke', revokedAt: new Date('2026-08-17T10:00:00Z'), createdAt: new Date('2026-08-17T10:00:00Z') }),
    ]);

    const current = await resolveCurrentConsents('user-1', { prisma: prisma as any });

    expect(current).toHaveLength(1);
    expect(current[0].id).toBe('revoke');
    expect(current[0].granted).toBe(false);
    expect(current[0].revokedAt).toEqual(new Date('2026-08-17T10:00:00Z'));
  });

  it('returns an empty array when the user has no rows', async () => {
    prisma.consentRecord.findMany.mockResolvedValue([]);
    await expect(resolveCurrentConsents('user-1', { prisma: prisma as any })).resolves.toEqual([]);
  });
});

describe('assertCurrentMandatoryConsent — fail-closed gate with admin exemption', () => {
  let prisma: PrismaMock;
  beforeEach(() => {
    prisma = makePrismaMock();
  });

  it('FAILS CLOSED with CONSENT_REQUIRED when no user row exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.consentRecord.findMany.mockResolvedValue([]);

    const res = await assertCurrentMandatoryConsent('user-missing', { prisma: prisma as any }, NOW);

    expect(res.ok).toBe(false);
    if (res.ok !== true) {
      expect(res.code).toBe('CONSENT_REQUIRED');
      expect(res.requiredDocs).toEqual(['privacy_policy', 'terms_of_service']);
    }
  });

  it('passes when the latest service rows are granted with the ACTIVE versions', async () => {
    prisma.user.findUnique.mockResolvedValue(userRow({ id: 'user-1', role: 'business' }));
    prisma.consentRecord.findMany.mockResolvedValue([
      row({ documentType: 'privacy_policy', documentVersion: '2', purpose: 'service', granted: true }),
      row({ documentType: 'terms_of_service', documentVersion: '1', purpose: 'service', granted: true }),
    ]);

    const res = await assertCurrentMandatoryConsent('user-1', { prisma: prisma as any }, NOW);
    expect(res).toEqual({ ok: true });
  });

  it('blocks when the latest row for a mandatory doc has a STALE version', async () => {
    prisma.user.findUnique.mockResolvedValue(userRow({ id: 'user-1' }));
    prisma.consentRecord.findMany.mockResolvedValue([
      row({ documentType: 'privacy_policy', documentVersion: '1', purpose: 'service', granted: true }), // v1 while v2 active
      row({ documentType: 'terms_of_service', documentVersion: '1', purpose: 'service', granted: true }),
    ]);

    const res = await assertCurrentMandatoryConsent('user-1', { prisma: prisma as any }, NOW);

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.requiredDocs).toEqual(['privacy_policy']);
  });

  it('blocks when the latest row for a mandatory doc is a revocation', async () => {
    prisma.user.findUnique.mockResolvedValue(userRow({ id: 'user-1' }));
    prisma.consentRecord.findMany.mockResolvedValue([
      row({ documentType: 'privacy_policy', documentVersion: '2', purpose: 'service', granted: false, intent: 'revoke' }),
      row({ documentType: 'terms_of_service', documentVersion: '1', purpose: 'service', granted: true }),
    ]);

    const res = await assertCurrentMandatoryConsent('user-1', { prisma: prisma as any }, NOW);

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.requiredDocs).toEqual(['privacy_policy']);
  });

  it('exempts admin users even with no consent rows', async () => {
    prisma.user.findUnique.mockResolvedValue(userRow({ id: 'user-admin', role: 'admin' }));
    prisma.consentRecord.findMany.mockResolvedValue([]);

    const res = await assertCurrentMandatoryConsent('user-admin', { prisma: prisma as any }, NOW);
    expect(res).toEqual({ ok: true });
  });

  it('exempts superadmin users', async () => {
    prisma.user.findUnique.mockResolvedValue(userRow({ id: 'user-sa', role: 'superadmin' }));
    prisma.consentRecord.findMany.mockResolvedValue([]);

    const res = await assertCurrentMandatoryConsent('user-sa', { prisma: prisma as any }, NOW);
    expect(res).toEqual({ ok: true });
  });

  it('lists exactly the missing mandatory docs for a consumer', async () => {
    prisma.user.findUnique.mockResolvedValue(userRow({ id: 'user-1' }));
    prisma.consentRecord.findMany.mockResolvedValue([
      row({ documentType: 'privacy_policy', documentVersion: '2', purpose: 'service', granted: true }),
      // terms_of_service missing entirely
    ]);

    const res = await assertCurrentMandatoryConsent('user-1', { prisma: prisma as any }, NOW);

    expect(res.ok).toBe(false);
    if (res.ok !== true) expect(res.requiredDocs).toEqual(['terms_of_service']);
  });
});

describe('ensureUserByClerkId — server-derived user provisioning', () => {
  let prisma: PrismaMock;
  beforeEach(() => {
    prisma = makePrismaMock();
    prisma.user.upsert.mockImplementation((args: any) =>
      Promise.resolve({ id: 'user-new', ...args.create, ...args.update })
    );
  });

  it('provisions the user on first call, keyed by clerkId, with claims from the verified token', async () => {
    const res = await ensureUserByClerkId('user_clerk_1', { email: 'ana@example.com', name: 'Ana Lima' }, { prisma: prisma as any });

    expect(res.id).toBe('user-new');
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkId: 'user_clerk_1' },
      update: { email: 'ana@example.com', name: 'Ana Lima' },
      create: { clerkId: 'user_clerk_1', email: 'ana@example.com', name: 'Ana Lima' },
    });
  });

  it('updates email/name from claims on an existing user (no duplicate row)', async () => {
    await ensureUserByClerkId('user_clerk_1', { email: 'new@example.com', name: 'Ana N.' }, { prisma: prisma as any });

    const call = (prisma.user.upsert as any).mock.calls[0][0];
    expect(call.where).toEqual({ clerkId: 'user_clerk_1' });
    expect(call.update).toEqual({ email: 'new@example.com', name: 'Ana N.' });
  });

  it('works with minimal claims (no email/name in the token)', async () => {
    await ensureUserByClerkId('user_clerk_1', {}, { prisma: prisma as any });

    const call = (prisma.user.upsert as any).mock.calls[0][0];
    expect(call.create).toEqual({ clerkId: 'user_clerk_1' });
    expect(call.update).toEqual({});
  });
});

describe('buildExport — own-data export without secrets', () => {
  it('returns only profile id/email/name plus consent rows and preferences', () => {
    const user = userRow({ id: 'user-1', email: 'ana@example.com', name: 'Ana Lima', role: 'business' });
    const consents = [
      row({ id: 'c1', documentType: 'privacy_policy', documentVersion: '2', granted: true }),
    ];
    const prefs = [{ policyVersion: '1', categories: { analytics: true }, locale: 'pt-BR', createdAt: NOW, updatedAt: NOW }];

    const out = buildExport({ user, consents, cookiePreferences: prefs });

    expect(out.profile).toEqual({ id: 'user-1', email: 'ana@example.com', name: 'Ana Lima' });
    expect(out.consents).toHaveLength(1);
    expect(out.consents[0]).toMatchObject({
      id: 'c1',
      documentType: 'privacy_policy',
      documentVersion: '2',
      purpose: 'service',
      granted: true,
      source: 'onboarding',
      locale: 'pt-BR',
    });
    expect(out.cookiePreferences).toHaveLength(1);
    expect(out.cookiePreferences[0].policyVersion).toBe('1');
  });

  it('never leaks role, internal fields, or password-hash-like data', () => {
    const out = buildExport({
      user: userRow({ id: 'user-1', email: 'a@b.c', name: 'Ana', role: 'superadmin', passwordHash: 'secret', stripeCustomerId: 'cus_x' }),
      consents: [row({ id: 'c1', userId: 'user-1', consentInternalNote: 'nope' })],
      cookiePreferences: [],
    });

    expect(Object.keys(out.profile).sort()).toEqual(['email', 'id', 'name']);
    expect(Object.keys(out.consents[0]).sort()).not.toContain('passwordHash');
    expect(Object.keys(out.consents[0]).sort()).not.toContain('consentInternalNote');
    expect(Object.keys(out.consents[0]).sort()).not.toContain('userId');
    expect(JSON.stringify(out)).not.toContain('password');
    expect(JSON.stringify(out)).not.toContain('passwordHash');
    expect(JSON.stringify(out)).not.toContain('secret');
    expect(JSON.stringify(out)).not.toContain('stripeCustomerId');
    expect(JSON.stringify(out)).not.toContain('consentInternalNote');
    expect(JSON.stringify(out)).not.toContain('userId');
    expect(JSON.stringify(out)).not.toContain('superadmin');
  });

  it('handles an empty consent history', () => {
    const out = buildExport({ user: userRow({ id: 'user-1' }), consents: [], cookiePreferences: [] });
    expect(out.consents).toEqual([]);
    expect(out.cookiePreferences).toEqual([]);
    expect(out.profile.id).toBe('user-1');
  });
});

describe('signup consent state machine — reducer (dismiss stays gated)', () => {
  const intentEvent = {
    type: 'CHECK_INTENT',
    legalVersions: ['privacy_policy@2', 'terms_of_service@1'],
    optionalAccepted: ['marketing'],
    checkedAt: 1723900000000,
  } as const;

  it('starts idle and records intent when the user checks the boxes', () => {
    const s = signupConsentReducer(INITIAL_SIGNUP_STATE, intentEvent);
    expect(s.phase).toBe('intent_checked');
    expect(s.legalVersions).toEqual(intentEvent.legalVersions);
    expect(s.optionalAccepted).toEqual(['marketing']);
  });

  it('does NOT record intent when no legal version is supplied (nothing checked)', () => {
    const s = signupConsentReducer(INITIAL_SIGNUP_STATE, { type: 'CHECK_INTENT', legalVersions: [], optionalAccepted: [], checkedAt: 1 });
    expect(s.phase).toBe('idle');
  });

  it('walks the happy path idle → intent_checked → clerk_verified → evidence_recorded → onboarding → submitted', () => {
    let s: SignupConsentState = INITIAL_SIGNUP_STATE;
    s = signupConsentReducer(s, intentEvent);
    s = signupConsentReducer(s, { type: 'CLERK_VERIFIED' });
    s = signupConsentReducer(s, { type: 'EVIDENCE_RECORDED' });
    s = signupConsentReducer(s, { type: 'START_ONBOARDING' });
    s = signupConsentReducer(s, { type: 'SUBMITTED' });
    expect(s.phase).toBe('submitted');
  });

  it('enters gate_hit with the required docs when business creation is blocked', () => {
    let s: SignupConsentState = INITIAL_SIGNUP_STATE;
    s = signupConsentReducer(s, intentEvent);
    s = signupConsentReducer(s, { type: 'CLERK_VERIFIED' });
    s = signupConsentReducer(s, { type: 'EVIDENCE_RECORDED' });
    s = signupConsentReducer(s, { type: 'START_ONBOARDING' });
    s = signupConsentReducer(s, { type: 'GATE_HIT', requiredDocs: ['privacy_policy'] });
    expect(s.phase).toBe('gate_hit');
    expect(s.requiredDocs).toEqual(['privacy_policy']);
  });

  it('DISMISS from gate_hit keeps the user gated (no server write, no evidence)', () => {
    let s: SignupConsentState = INITIAL_SIGNUP_STATE;
    s = signupConsentReducer(s, intentEvent);
    s = signupConsentReducer(s, { type: 'CLERK_VERIFIED' });
    s = signupConsentReducer(s, { type: 'EVIDENCE_RECORDED' });
    s = signupConsentReducer(s, { type: 'START_ONBOARDING' });
    s = signupConsentReducer(s, { type: 'GATE_HIT', requiredDocs: ['privacy_policy'] });
    s = signupConsentReducer(s, { type: 'DISMISS' });
    expect(s.phase).toBe('gate_hit');
    expect(s.requiredDocs).toEqual(['privacy_policy']);
  });

  it('re-accepting on the re-consent screen appends evidence and retries (gate cleared)', () => {
    let s: SignupConsentState = INITIAL_SIGNUP_STATE;
    s = signupConsentReducer(s, intentEvent);
    s = signupConsentReducer(s, { type: 'CLERK_VERIFIED' });
    s = signupConsentReducer(s, { type: 'EVIDENCE_RECORDED' });
    s = signupConsentReducer(s, { type: 'START_ONBOARDING' });
    s = signupConsentReducer(s, { type: 'GATE_HIT', requiredDocs: ['privacy_policy'] });
    s = signupConsentReducer(s, { type: 'RECONSENT_ACCEPT' });
    expect(s.phase).toBe('reconsent');
    s = signupConsentReducer(s, { type: 'EVIDENCE_RECORDED' });
    expect(s.phase).toBe('evidence_recorded');
    s = signupConsentReducer(s, { type: 'START_ONBOARDING' });
    s = signupConsentReducer(s, { type: 'SUBMITTED' });
    expect(s.phase).toBe('submitted');
  });

  it('DISMISS from the reconsent screen also keeps the user gated', () => {
    let s: SignupConsentState = INITIAL_SIGNUP_STATE;
    s = signupConsentReducer(s, intentEvent);
    s = signupConsentReducer(s, { type: 'CLERK_VERIFIED' });
    s = signupConsentReducer(s, { type: 'EVIDENCE_RECORDED' });
    s = signupConsentReducer(s, { type: 'START_ONBOARDING' });
    s = signupConsentReducer(s, { type: 'GATE_HIT', requiredDocs: ['privacy_policy'] });
    s = signupConsentReducer(s, { type: 'RECONSENT_ACCEPT' });
    s = signupConsentReducer(s, { type: 'DISMISS' });
    expect(s.phase).toBe('gate_hit');
  });

  it('ignores illegal transitions (total reducer — state stays unchanged)', () => {
    const s = signupConsentReducer(INITIAL_SIGNUP_STATE, { type: 'SUBMITTED' });
    expect(s).toBe(INITIAL_SIGNUP_STATE);
  });
});

// Guard: the closed lists the lib validates against are the ones WU1 shipped.
it('CLOSED_LISTS covers every enum the consent API validates', () => {
  expect(CLOSED_LISTS.documentTypes).toEqual(['terms_of_service', 'privacy_policy', 'cookie_policy']);
  expect(CLOSED_LISTS.purposes).toEqual(['service', 'marketing', 'analytics']);
  expect(CLOSED_LISTS.legalBases).toEqual(['contract', 'consent', 'legitimate_interest']);
  expect(CLOSED_LISTS.sources).toEqual(['signup', 'onboarding', 'reconsent', 'settings', 'import']);
  expect(CLOSED_LISTS.intents).toEqual(['grant', 'revoke']);
  expect(CLOSED_LISTS.locales).toEqual(['pt-BR', 'es-PE']);
});
