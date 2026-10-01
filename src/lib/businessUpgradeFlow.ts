import type { ApiBusiness, CreateBusinessInput } from './api';

export type BusinessAccountNavEntry = {
  path: '/registrar-negocio' | '/meu-negocio';
  labelKey: 'nav.register_business' | 'nav.business_request_status' | 'nav.my_business';
  state: 'none' | string;
};

export function getBusinessAccountNavEntry(input: {
  business: ApiBusiness | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}): BusinessAccountNavEntry | null {
  if (input.isAdmin || input.isSuperAdmin) return null;
  if (!input.business) {
    return { path: '/registrar-negocio', labelKey: 'nav.register_business', state: 'none' };
  }
  if (input.business.status === 'approved') {
    return { path: '/meu-negocio', labelKey: 'nav.my_business', state: 'approved' };
  }
  return { path: '/meu-negocio', labelKey: 'nav.business_request_status', state: input.business.status || 'pending' };
}

type CheckoutResult = { url?: string; betaMode?: boolean; message?: string };

export type BusinessUpgradeSubmissionResult =
  | { kind: 'existing-business'; business: ApiBusiness }
  | { kind: 'redirect'; business: ApiBusiness; url: string }
  | { kind: 'owner-panel-retry'; business: ApiBusiness; message?: string };

export async function runBusinessUpgradeSubmission(input: {
  token: string;
  businessData: CreateBusinessInput;
  getMyBusiness: (token: string) => Promise<ApiBusiness | null>;
  markBusinessIntent: (token: string) => Promise<unknown>;
  createBusiness: (token: string, data: CreateBusinessInput) => Promise<ApiBusiness>;
  openStripeCheckout: (token: string, businessId: string) => Promise<CheckoutResult>;
}): Promise<BusinessUpgradeSubmissionResult> {
  try {
    const existingBusiness = await input.getMyBusiness(input.token);
    if (existingBusiness) return { kind: 'existing-business', business: existingBusiness };
  } catch (error) {
    if (!(typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 404)) {
      throw error;
    }
  }

  await input.markBusinessIntent(input.token);
  const business = await input.createBusiness(input.token, input.businessData);

  try {
    const checkout = await input.openStripeCheckout(input.token, business.id);
    if (checkout.url) return { kind: 'redirect', business, url: checkout.url };
    return { kind: 'owner-panel-retry', business, message: checkout.message };
  } catch (error) {
    return {
      kind: 'owner-panel-retry',
      business,
      message: error instanceof Error ? error.message : undefined,
    };
  }
}

export type PaymentMethodSetupResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'no-url'; message?: string };

export async function runPaymentMethodSetup(input: {
  token: string;
  business: Pick<ApiBusiness, 'id'>;
  openStripeCheckout: (token: string, businessId: string) => Promise<CheckoutResult>;
}): Promise<PaymentMethodSetupResult> {
  const checkout = await input.openStripeCheckout(input.token, input.business.id);
  if (checkout.url) return { kind: 'redirect', url: checkout.url };
  return { kind: 'no-url', message: checkout.message };
}
