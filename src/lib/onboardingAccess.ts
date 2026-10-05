/**
 * Access policy for the business onboarding screen.
 *
 * `/onboarding` is the destination of both homepage calls-to-action, so it is
 * the first authenticated screen most business owners ever reach. Rendering a
 * bare "access denied" message there strands exactly the audience the site is
 * trying to recruit: the visitor is told they may not pass, but not why, not
 * what to do next, and not that signing up is free.
 *
 * This module keeps that decision as pure data so the rule is testable without
 * mounting Clerk, and so the screen can never regress to a dead end: the
 * signed-out branch always carries a sign-up affordance and a redirect back to
 * onboarding.
 */

export type OnboardingAccessState =
  | { kind: 'loading' }
  | { kind: 'allowed' }
  | {
      kind: 'signup-required';
      /** Where Clerk returns the visitor once authentication succeeds. */
      redirectUrl: '/onboarding';
      titleKey: 'onboarding.auth_required.title';
      reasonKey: 'onboarding.auth_required.reason';
      signUpLabelKey: 'onboarding.auth_required.sign_up';
      signInLabelKey: 'onboarding.auth_required.sign_in';
    };

export function getOnboardingAccessState(input: {
  /** Clerk has finished resolving the session. */
  isLoaded: boolean;
  /** A session user is present. */
  hasUser: boolean;
}): OnboardingAccessState {
  // Session state is still unknown: showing either the form or a sign-up
  // prompt would flash the wrong screen at an already-authenticated owner.
  if (!input.isLoaded) return { kind: 'loading' };

  if (input.hasUser) return { kind: 'allowed' };

  return {
    kind: 'signup-required',
    redirectUrl: '/onboarding',
    titleKey: 'onboarding.auth_required.title',
    reasonKey: 'onboarding.auth_required.reason',
    signUpLabelKey: 'onboarding.auth_required.sign_up',
    signInLabelKey: 'onboarding.auth_required.sign_in',
  };
}
