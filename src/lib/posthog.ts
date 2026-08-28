import posthog from 'posthog-js';

import { registerOptionalScript } from './scriptGate';

const POSTHOG_API_HOST = 'https://us.i.posthog.com';
const POSTHOG_SCRIPT_ID = 'analytics:posthog';

export type AnalyticsEventName =
  | 'business_search_submitted'
  | 'business_viewed'
  | 'business_signup_completed';

export interface BusinessSearchEvent {
  name: 'business_search_submitted';
  properties: {
    has_query: boolean;
    category: string;
    has_city_filter: boolean;
    has_min_rating: boolean;
  };
}

export interface BusinessViewedEvent {
  name: 'business_viewed';
  properties: {
    business_id: string;
    category: string;
    has_gallery: boolean;
    reviews_bucket: '0' | '1-4' | '5+';
  };
}

export interface BusinessSignupCompletedEvent {
  name: 'business_signup_completed';
  properties: {
    category: string;
    tags_count: number;
    has_photos: boolean;
  };
}

export type AnalyticsEvent =
  | BusinessSearchEvent
  | BusinessViewedEvent
  | BusinessSignupCompletedEvent;

export interface PostHogSdk {
  init: (apiKey: string, config: Record<string, unknown>) => void;
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
  opt_in_capturing: (options?: { captureEventName?: string | false | null }) => void;
  opt_out_capturing: () => void;
  has_opted_in_capturing: () => boolean;
}

interface AnalyticsClientOptions {
  apiKey?: string;
  sdk: PostHogSdk;
  registerScript: typeof registerOptionalScript;
  logger?: Pick<Console, 'warn'>;
}

export function hasUsablePostHogKey(apiKey?: string): boolean {
  const key = apiKey?.trim();
  return Boolean(key && key.startsWith('phc_'));
}

function getReviewsBucket(reviewsCount: number): '0' | '1-4' | '5+' {
  if (reviewsCount <= 0) return '0';
  if (reviewsCount < 5) return '1-4';
  return '5+';
}

export interface AnalyticsClient {
  register: () => boolean;
  isConfigured: () => boolean;
  isInitialized: () => boolean;
  reconcileConsent: (granted: boolean) => boolean;
  capturePageview: (pathname: string) => boolean;
  captureEvent: (event: AnalyticsEvent) => boolean;
  trackBusinessSearch: (input: {
    query: string;
    category?: string;
    city?: string;
    minRating?: string;
  }) => boolean;
  trackBusinessViewed: (input: {
    businessId: string;
    category: string;
    hasGallery: boolean;
    reviewsCount: number;
  }) => boolean;
  trackBusinessSignupCompleted: (input: {
    category: string;
    tagsCount: number;
    hasPhotos: boolean;
  }) => boolean;
}

export function createAnalyticsClient({
  apiKey,
  sdk,
  registerScript,
  logger = console,
}: AnalyticsClientOptions): AnalyticsClient {
  const normalizedKey = apiKey?.trim();
  const configured = hasUsablePostHogKey(normalizedKey);
  const privateKeyProvided = Boolean(normalizedKey?.startsWith('phx_'));

  let scriptRegistered = false;
  let initialized = false;
  let keyWarningShown = false;
  let lastPageviewPath: string | null = null;

  const warnInvalidKey = () => {
    if (keyWarningShown || !privateKeyProvided) return;
    keyWarningShown = true;
    logger.warn(
      'VITE_POSTHOG_API_KEY must use the public phc_ browser key. Never use a private phx_ key in the client.'
    );
  };

  const initialize = (): boolean => {
    if (!configured || !normalizedKey) {
      warnInvalidKey();
      return false;
    }
    if (initialized) return true;

    sdk.init(normalizedKey, {
      api_host: POSTHOG_API_HOST,
      capture_pageview: false,
      opt_out_capturing_by_default: true,
    });
    initialized = true;
    return true;
  };

  const register = (): boolean => {
    if (!configured) {
      warnInvalidKey();
      return false;
    }
    if (scriptRegistered) return true;

    registerScript('analytics', () => {
      initialize();
    }, POSTHOG_SCRIPT_ID);
    scriptRegistered = true;
    return true;
  };

  const reconcileConsent = (granted: boolean): boolean => {
    if (!configured) {
      warnInvalidKey();
      return false;
    }

    register();

    if (granted) {
      initialize();
    }

    if (!initialized) return false;

    if (granted) {
      if (!sdk.has_opted_in_capturing()) {
        sdk.opt_in_capturing({ captureEventName: false });
      }
      return true;
    }

    sdk.opt_out_capturing();
    lastPageviewPath = null;
    return true;
  };

  const capturePageview = (pathname: string): boolean => {
    if (!initialized || !sdk.has_opted_in_capturing()) return false;
    if (lastPageviewPath === pathname) return false;

    sdk.capture('$pageview', { pathname });
    lastPageviewPath = pathname;
    return true;
  };

  const captureEvent = (event: AnalyticsEvent): boolean => {
    if (!initialized || !sdk.has_opted_in_capturing()) return false;

    sdk.capture(event.name, event.properties);
    return true;
  };

  return {
    register,
    isConfigured: () => configured,
    isInitialized: () => initialized,
    reconcileConsent,
    capturePageview,
    captureEvent,
    trackBusinessSearch: ({ query, category, city, minRating }) =>
      captureEvent({
        name: 'business_search_submitted',
        properties: {
          has_query: query.trim().length > 0,
          category: category?.trim() || 'all',
          has_city_filter: Boolean(city?.trim()),
          has_min_rating: Boolean(minRating?.trim()),
        },
      }),
    trackBusinessViewed: ({ businessId, category, hasGallery, reviewsCount }) =>
      captureEvent({
        name: 'business_viewed',
        properties: {
          business_id: businessId,
          category,
          has_gallery: hasGallery,
          reviews_bucket: getReviewsBucket(reviewsCount),
        },
      }),
    trackBusinessSignupCompleted: ({ category, tagsCount, hasPhotos }) =>
      captureEvent({
        name: 'business_signup_completed',
        properties: {
          category,
          tags_count: tagsCount,
          has_photos: hasPhotos,
        },
      }),
  };
}

export const analytics = createAnalyticsClient({
  apiKey: import.meta.env.VITE_POSTHOG_API_KEY,
  sdk: posthog,
  registerScript: registerOptionalScript,
});
