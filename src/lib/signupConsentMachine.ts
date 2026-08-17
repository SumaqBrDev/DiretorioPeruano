// src/lib/signupConsentMachine.ts
// Pure signup/re-consent state machine (design D9: pure logic extracted for
// node-env unit tests — no DOM, no jsdom). Consumed by the signup pre-flow
// (Login) and the re-consent screen (Reconsent) in WU3.
//
// Flow (design): idle → intent_checked (sessionStorage intent; NEVER
// evidence) → clerk_verified → evidence_recorded (POST /api/consent ok) →
// onboarding → submitted | gate_hit (CONSENT_REQUIRED) → reconsent → retry.
// Dismissing the re-consent screen keeps the user GATED: localStorage /
// sessionStorage is UI intent only, never evidence, so a dismissal performs
// NO server write and the phase returns to gate_hit.

export type SignupConsentPhase =
  | 'idle'
  | 'intent_checked'
  | 'clerk_verified'
  | 'evidence_recorded'
  | 'onboarding'
  | 'submitted'
  | 'gate_hit'
  | 'reconsent';

export interface SignupConsentState {
  phase: SignupConsentPhase;
  /** Legal versions the user accepted pre-signup (UI intent, not evidence). */
  legalVersions: readonly string[];
  /** Optional consents accepted pre-signup, e.g. ['marketing']. */
  optionalAccepted: readonly string[];
  /** Epoch ms of the intent capture. */
  checkedAt: number | null;
  /** Docs listed by the CONSENT_REQUIRED gate response. */
  requiredDocs: readonly string[];
}

export const INITIAL_SIGNUP_STATE: SignupConsentState = {
  phase: 'idle',
  legalVersions: [],
  optionalAccepted: [],
  checkedAt: null,
  requiredDocs: [],
};

export type SignupConsentEvent =
  | { type: 'CHECK_INTENT'; legalVersions: readonly string[]; optionalAccepted: readonly string[]; checkedAt: number }
  | { type: 'CLERK_VERIFIED' }
  | { type: 'EVIDENCE_RECORDED' }
  | { type: 'START_ONBOARDING' }
  | { type: 'SUBMITTED' }
  | { type: 'GATE_HIT'; requiredDocs: readonly string[] }
  | { type: 'RECONSENT_ACCEPT' }
  | { type: 'DISMISS' };

/**
 * Total reducer: illegal/unknown transitions return the SAME state reference.
 * DISMISS from gate_hit or reconsent always lands back on gate_hit — a
 * dismissal never grants consent and never writes evidence.
 */
export function signupConsentReducer(
  state: SignupConsentState,
  event: SignupConsentEvent
): SignupConsentState {
  switch (event.type) {
    case 'CHECK_INTENT':
      if (state.phase !== 'idle') return state;
      if (!event.legalVersions || event.legalVersions.length === 0) return state;
      return {
        ...state,
        phase: 'intent_checked',
        legalVersions: event.legalVersions,
        optionalAccepted: event.optionalAccepted,
        checkedAt: event.checkedAt,
      };
    case 'CLERK_VERIFIED':
      if (state.phase !== 'intent_checked') return state;
      return { ...state, phase: 'clerk_verified' };
    case 'EVIDENCE_RECORDED':
      if (state.phase !== 'clerk_verified' && state.phase !== 'reconsent') return state;
      return { ...state, phase: 'evidence_recorded' };
    case 'START_ONBOARDING':
      if (state.phase !== 'evidence_recorded') return state;
      return { ...state, phase: 'onboarding' };
    case 'SUBMITTED':
      if (state.phase !== 'onboarding') return state;
      return { ...state, phase: 'submitted' };
    case 'GATE_HIT':
      if (state.phase !== 'onboarding') return state;
      return { ...state, phase: 'gate_hit', requiredDocs: event.requiredDocs };
    case 'RECONSENT_ACCEPT':
      if (state.phase !== 'gate_hit') return state;
      return { ...state, phase: 'reconsent', requiredDocs: [] };
    case 'DISMISS':
      // Dismissing the re-consent screen (or the gate itself) keeps the user
      // gated — no server write, no evidence (dismissal is NOT consent).
      if (state.phase !== 'gate_hit' && state.phase !== 'reconsent') return state;
      return { ...state, phase: 'gate_hit' };
    default:
      return state;
  }
}
