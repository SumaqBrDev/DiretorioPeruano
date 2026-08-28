import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAnalyticsClient, hasUsablePostHogKey, type PostHogSdk } from '../src/lib/posthog';

function createSdkMock(): PostHogSdk {
  let optedIn = false;

  return {
    init: vi.fn(),
    capture: vi.fn(),
    opt_in_capturing: vi.fn(() => {
      optedIn = true;
    }),
    opt_out_capturing: vi.fn(() => {
      optedIn = false;
    }),
    has_opted_in_capturing: vi.fn(() => optedIn),
  };
}

describe('hasUsablePostHogKey', () => {
  it('accepts only public phc_ keys', () => {
    expect(hasUsablePostHogKey('phc_public_key')).toBe(true);
    expect(hasUsablePostHogKey(' phc_public_key ')).toBe(true);
    expect(hasUsablePostHogKey('phx_private_key')).toBe(false);
    expect(hasUsablePostHogKey(undefined)).toBe(false);
    expect(hasUsablePostHogKey('')).toBe(false);
  });
});

describe('analytics client — initialization gating', () => {
  it('does not initialize when the public key is missing', () => {
    const sdk = createSdkMock();
    const registerScript = vi.fn();
    const client = createAnalyticsClient({ apiKey: undefined, sdk, registerScript });

    expect(client.register()).toBe(false);
    expect(client.reconcileConsent(true)).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
    expect(registerScript).not.toHaveBeenCalled();
  });

  it('rejects private phx_ keys and warns once', () => {
    const sdk = createSdkMock();
    const registerScript = vi.fn();
    const logger = { warn: vi.fn() };
    const client = createAnalyticsClient({
      apiKey: 'phx_private_key',
      sdk,
      registerScript,
      logger,
    });

    expect(client.register()).toBe(false);
    expect(client.reconcileConsent(true)).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('registers once and initializes once after consent is granted', () => {
    const sdk = createSdkMock();
    const registerScript = vi.fn((_category: string, loader: () => void) => {
      loader();
      return 'analytics:posthog';
    });
    const client = createAnalyticsClient({
      apiKey: 'phc_public_key',
      sdk,
      registerScript,
    });

    expect(client.register()).toBe(true);
    expect(client.register()).toBe(true);
    expect(client.reconcileConsent(true)).toBe(true);
    expect(client.reconcileConsent(true)).toBe(true);

    expect(registerScript).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.opt_in_capturing).toHaveBeenCalledTimes(1);
  });
});

describe('analytics client — pageview deduplication', () => {
  let sdk: PostHogSdk;
  let client: ReturnType<typeof createAnalyticsClient>;

  beforeEach(() => {
    sdk = createSdkMock();
    const registerScript = vi.fn((_category: string, loader: () => void) => {
      loader();
      return 'analytics:posthog';
    });
    client = createAnalyticsClient({
      apiKey: 'phc_public_key',
      sdk,
      registerScript,
    });
    client.reconcileConsent(true);
  });

  it('captures one $pageview per pathname', () => {
    expect(client.capturePageview('/busca')).toBe(true);
    expect(client.capturePageview('/busca')).toBe(false);
    expect(client.capturePageview('/negocio/123')).toBe(true);

    expect(sdk.capture).toHaveBeenNthCalledWith(1, '$pageview', { pathname: '/busca' });
    expect(sdk.capture).toHaveBeenNthCalledWith(2, '$pageview', { pathname: '/negocio/123' });
    expect(sdk.capture).toHaveBeenCalledTimes(2);
  });

  it('allows the current pathname to be captured again after revoke then re-accept', () => {
    expect(client.capturePageview('/')).toBe(true);

    client.reconcileConsent(false);
    expect(client.capturePageview('/')).toBe(false);

    client.reconcileConsent(true);
    expect(client.capturePageview('/')).toBe(true);
    expect(sdk.capture).toHaveBeenCalledTimes(2);
  });
});

describe('analytics client — consent transitions and event suppression', () => {
  it('opts out on decline/revoke and suppresses events until consent returns', () => {
    const sdk = createSdkMock();
    const registerScript = vi.fn((_category: string, loader: () => void) => {
      loader();
      return 'analytics:posthog';
    });
    const client = createAnalyticsClient({
      apiKey: 'phc_public_key',
      sdk,
      registerScript,
    });

    expect(
      client.trackBusinessSearch({
        query: 'ceviche',
        category: 'restaurante',
        city: 'Lima',
        minRating: '4.5',
      })
    ).toBe(false);

    client.reconcileConsent(true);
    expect(
      client.trackBusinessSearch({
        query: 'ceviche',
        category: 'restaurante',
        city: 'Lima',
        minRating: '4.5',
      })
    ).toBe(true);

    client.reconcileConsent(false);
    expect(sdk.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(
      client.trackBusinessSignupCompleted({
        category: 'restaurante',
        tagsCount: 3,
        hasPhotos: true,
      })
    ).toBe(false);

    client.reconcileConsent(true);
    expect(
      client.trackBusinessSignupCompleted({
        category: 'restaurante',
        tagsCount: 3,
        hasPhotos: true,
      })
    ).toBe(true);

    expect(sdk.capture).toHaveBeenNthCalledWith(1, 'business_search_submitted', {
      has_query: true,
      category: 'restaurante',
      has_city_filter: true,
      has_min_rating: true,
    });
    expect(sdk.capture).toHaveBeenNthCalledWith(2, 'business_signup_completed', {
      category: 'restaurante',
      tags_count: 3,
      has_photos: true,
    });
    expect(sdk.capture).toHaveBeenCalledTimes(2);
  });
});
