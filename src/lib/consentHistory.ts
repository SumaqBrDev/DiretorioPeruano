// src/lib/consentHistory.ts
// Pure client-side helpers for the LGPD preferences UI (WU5 task 5.1,
// design D7/D9). Node-env unit-testable — no DOM, no storage, no server.
//
// The /preferencias page shows the user's CURRENT consent state per document
// and purpose. The server already resolves "latest row per key" (lib/consent
// resolveCurrentConsents, spec: "latest row per key is current consent");
// these helpers mirror that resolution on the CLIENT for display, so the UI
// never re-implements persistence rules — it only reads what the history API
// (GET /api/consent, own rows only) returns.

import type { ConsentRecord } from './api';

export interface CurrentConsentRow {
  documentType: string;
  purpose: string;
  version: string;
  granted: boolean;
  consentedAt: string;
}

/**
 * Latest row per (documentType, purpose), newest first overall — mirrors the
 * server's resolveCurrentConsents. Append-only history means grants AND
 * revocations are rows; the newest row per key is the current state.
 */
export function resolveCurrentFromRecords(records: ConsentRecord[]): CurrentConsentRow[] {
  const latestByKey = new Map<string, CurrentConsentRow>();
  const sorted = [...records].sort(
    (a, b) => new Date(b.consentedAt).getTime() - new Date(a.consentedAt).getTime()
  );
  for (const r of sorted) {
    const key = `${r.documentType}\u0000${r.purpose}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, {
        documentType: r.documentType,
        purpose: r.purpose,
        version: r.documentVersion,
        granted: r.granted,
        consentedAt: r.consentedAt,
      });
    }
  }
  return Array.from(latestByKey.values()).sort(
    (a, b) => a.documentType.localeCompare(b.documentType) || a.purpose.localeCompare(b.purpose)
  );
}

/**
 * Mandatory service-contract consents (terms_of_service / privacy_policy,
 * purpose=service) cannot be revoked while the account is active (spec:
 * Revocation channel; server rejects with MANDATORY_NOT_REVOCABLE).
 */
export function isMandatoryPurpose(purpose: string): boolean {
  return purpose === 'service';
}

/** Optional consents the user controls on the preferences page (cookie categories). */
export function isOptionalPurpose(purpose: string): boolean {
  return purpose === 'analytics' || purpose === 'marketing';
}
