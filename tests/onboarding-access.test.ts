import { describe, expect, it } from 'vitest';

import { getOnboardingAccessState } from '../src/lib/onboardingAccess';

describe('getOnboardingAccessState', () => {
  it('waits while Clerk is still resolving the session', () => {
    expect(getOnboardingAccessState({ isLoaded: false, hasUser: false })).toEqual({
      kind: 'loading',
    });
  });

  it('waits while Clerk is still resolving even if a stale user object exists', () => {
    expect(getOnboardingAccessState({ isLoaded: false, hasUser: true })).toEqual({
      kind: 'loading',
    });
  });

  it('grants access to a signed-in visitor', () => {
    expect(getOnboardingAccessState({ isLoaded: true, hasUser: true })).toEqual({
      kind: 'allowed',
    });
  });

  /**
   * The regression this module exists for: a signed-out visitor arriving from
   * the homepage call-to-action must be invited to sign up, never dead-ended.
   */
  it('invites a signed-out visitor to sign up instead of denying access', () => {
    const state = getOnboardingAccessState({ isLoaded: true, hasUser: false });

    expect(state.kind).toBe('signup-required');
  });

  it('sends the signed-out visitor back to onboarding after authenticating', () => {
    const state = getOnboardingAccessState({ isLoaded: true, hasUser: false });

    if (state.kind !== 'signup-required') throw new Error('expected signup-required');
    expect(state.redirectUrl).toBe('/onboarding');
  });

  it('explains the reason and the consequence of the sign-in requirement', () => {
    const state = getOnboardingAccessState({ isLoaded: true, hasUser: false });

    if (state.kind !== 'signup-required') throw new Error('expected signup-required');
    // Reason: why the gate exists. Consequence: what happens after signing up.
    expect(state.titleKey).toBe('onboarding.auth_required.title');
    expect(state.reasonKey).toBe('onboarding.auth_required.reason');
    expect(state.signUpLabelKey).toBe('onboarding.auth_required.sign_up');
    expect(state.signInLabelKey).toBe('onboarding.auth_required.sign_in');
  });

  it('never returns a bare denial for any input combination', () => {
    const combinations = [
      { isLoaded: true, hasUser: true },
      { isLoaded: true, hasUser: false },
      { isLoaded: false, hasUser: true },
      { isLoaded: false, hasUser: false },
    ];

    for (const input of combinations) {
      expect(getOnboardingAccessState(input).kind).not.toBe('denied');
    }
  });
});
