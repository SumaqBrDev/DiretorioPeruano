// tests/script-gate.test.ts
// Strict TDD (WU4 task 4.1): RED-first tests for the single optional-script
// gate (src/lib/scriptGate.ts). Acceptance criteria: cookie-consent-manager /
// Single script gate — nothing loads before consent, only scripts of
// consented categories load, preference changes are respected, duplicate
// loads are avoided. No real analytics integrations are registered here.
//
// Pure node-env unit tests (design D9): loaders are plain counters; no
// jsdom, no network, no mocks of the module under test.

import { describe, it, expect, beforeEach } from 'vitest';

import {
  applyOptionalScriptConsent,
  isOptionalScriptLoaded,
  registerOptionalScript,
  resetScriptGate,
} from '../src/lib/scriptGate';

beforeEach(() => {
  resetScriptGate();
});

describe('scriptGate — no load before consent', () => {
  it('loads nothing when no consent has ever been applied', () => {
    let analyticsCalls = 0;
    let marketingCalls = 0;

    registerOptionalScript('analytics', () => {
      analyticsCalls += 1;
    });
    registerOptionalScript('marketing', () => {
      marketingCalls += 1;
    });

    expect(analyticsCalls).toBe(0);
    expect(marketingCalls).toBe(0);
  });

  it('loads nothing while optional categories are denied', () => {
    let analyticsCalls = 0;

    registerOptionalScript('analytics', () => {
      analyticsCalls += 1;
    });
    applyOptionalScriptConsent({ essential: true, analytics: false, marketing: false });

    expect(analyticsCalls).toBe(0);
  });
});

describe('scriptGate — load after consent', () => {
  it('loads a script once its category is consented', () => {
    let analyticsCalls = 0;

    const id = registerOptionalScript('analytics', () => {
      analyticsCalls += 1;
    });
    applyOptionalScriptConsent({ essential: true, analytics: true, marketing: false });

    expect(analyticsCalls).toBe(1);
    expect(isOptionalScriptLoaded(id)).toBe(true);
  });

  it('loads only scripts of consented categories', () => {
    let analyticsCalls = 0;
    let marketingCalls = 0;

    registerOptionalScript('analytics', () => {
      analyticsCalls += 1;
    });
    registerOptionalScript('marketing', () => {
      marketingCalls += 1;
    });
    applyOptionalScriptConsent({ essential: true, analytics: true, marketing: false });

    expect(analyticsCalls).toBe(1);
    expect(marketingCalls).toBe(0);
  });

  it('loads every registered script of a consented category (per-category registration)', () => {
    let calls = 0;

    registerOptionalScript('analytics', () => {
      calls += 1;
    }, 'tag-manager');
    registerOptionalScript('analytics', () => {
      calls += 1;
    }, 'heatmap');
    registerOptionalScript('marketing', () => {
      calls += 1;
    }, 'ads');
    applyOptionalScriptConsent({ analytics: true, marketing: false });

    expect(calls).toBe(2); // tag-manager + heatmap only
  });
});

describe('scriptGate — preference changes and dedupe', () => {
  it('loads a category granted later and never reloads already-loaded scripts', () => {
    let analyticsCalls = 0;
    let marketingCalls = 0;

    registerOptionalScript('analytics', () => {
      analyticsCalls += 1;
    }, 'analytics-script');
    registerOptionalScript('marketing', () => {
      marketingCalls += 1;
    }, 'marketing-script');

    applyOptionalScriptConsent({ analytics: true, marketing: false });
    applyOptionalScriptConsent({ analytics: true, marketing: true }); // marketing granted later

    expect(analyticsCalls).toBe(1); // not reloaded
    expect(marketingCalls).toBe(1); // loaded now
  });

  it('does not load a script twice when consent is re-applied', () => {
    let analyticsCalls = 0;

    registerOptionalScript('analytics', () => {
      analyticsCalls += 1;
    }, 'analytics-script');
    applyOptionalScriptConsent({ analytics: true });
    applyOptionalScriptConsent({ analytics: true });

    expect(analyticsCalls).toBe(1);
  });

  it('a script registered after consent was granted loads immediately, and duplicate ids are ignored', () => {
    let calls = 0;

    applyOptionalScriptConsent({ analytics: true });
    registerOptionalScript('analytics', () => {
      calls += 1;
    }, 'late-script');
    registerOptionalScript('analytics', () => {
      calls += 1;
    }, 'late-script'); // duplicate id — must not register twice

    expect(calls).toBe(1);
  });

  it('revoking consent never unloads an already-loaded script and prevents new loads', () => {
    let analyticsCalls = 0;

    registerOptionalScript('analytics', () => {
      analyticsCalls += 1;
    }, 'analytics-script');
    applyOptionalScriptConsent({ analytics: true });
    applyOptionalScriptConsent({ analytics: false });

    // The script already ran; revocation only stops FUTURE loads (no unload
    // mechanism exists for third-party scripts).
    expect(analyticsCalls).toBe(1);
  });
});
