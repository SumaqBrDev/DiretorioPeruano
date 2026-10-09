import { createElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiBusiness, ApiBusinessWithAds } from '../../src/lib/api';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  navigate: vi.fn(),
  getMyBusinesses: vi.fn(),
  getMyBusinessWithAds: vi.fn(),
  updateMyBusiness: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    isLoaded: true,
    user: { id: 'user-owner', publicMetadata: {} },
  }),
  useAuth: () => ({ getToken: mocks.getToken }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/api')>();
  return {
    ...actual,
    getMyBusinesses: mocks.getMyBusinesses,
    getMyBusinessWithAds: mocks.getMyBusinessWithAds,
    updateMyBusiness: mocks.updateMyBusiness,
    openStripeCheckout: vi.fn(),
    openStripePortal: vi.fn(),
    createBusinessAdCheckout: vi.fn(),
    uploadAdImage: vi.fn(),
  };
});

vi.mock('../../src/lib/toast', () => ({ showToast: vi.fn() }));
vi.mock('../../src/lib/businessUpgradeFlow', () => ({ runPaymentMethodSetup: vi.fn() }));
vi.mock('../../src/components/BusinessGallery', () => ({
  BusinessGallery: () => null,
}));
vi.mock('../../src/components/AdPublicationTerms', () => ({
  AdPublicationTerms: () => null,
}));
vi.mock('../../src/components/ContactFieldsForm', () => ({
  ContactFieldsForm: () => null,
}));

import { MeuNegocio } from '../../src/pages/MeuNegocio';

const listedBusiness: ApiBusiness = {
  id: 'biz-1',
  name: 'Chifa Owner',
  category: 'restaurante',
  status: 'approved',
  subscriptionStatus: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  city: 'São Paulo',
  state: 'SP',
};

function makeDetail(contact: ApiBusinessWithAds['contact']): ApiBusinessWithAds {
  return {
    ...listedBusiness,
    description: 'Painel do proprietário',
    address: { street: 'Rua Peru, 123', city: 'São Paulo', state: 'SP', zip: '01000-000' },
    tags: [],
    photos: [],
    hours: [
      { day: 'Segunda', isOpen: true, open: '10:00', close: '19:00' },
      { day: 'Terça', isOpen: false, open: '', close: '' },
      { day: 'Quarta', isOpen: true, open: '10:00', close: '19:00' },
      { day: 'Quinta', isOpen: true, open: '10:00', close: '19:00' },
      { day: 'Sexta', isOpen: true, open: '10:00', close: '19:00' },
      { day: 'Sábado', isOpen: true, open: '11:00', close: '16:00' },
      { day: 'Domingo', isOpen: false, open: '', close: '' },
    ],
    contact,
    ads: [],
  };
}

async function renderExpandedOwnerPanel(detail: ApiBusinessWithAds) {
  mocks.getToken.mockResolvedValue('token-owner');
  mocks.getMyBusinesses.mockResolvedValue({ businesses: [listedBusiness] });
  mocks.getMyBusinessWithAds.mockResolvedValue(detail);

  render(createElement(MeuNegocio));

  const businessToggle = await screen.findByRole('button', { name: /Chifa Owner/i });
  await userEvent.click(businessToggle);
  await screen.findByText('Contacto');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MeuNegocio contact view mode', () => {
  it('shows populated owner contact fields returned by the API', async () => {
    await renderExpandedOwnerPanel(
      makeDetail({
        phone: '+55 11 99999-1111',
        whatsapp: '+55 11 98888-2222',
        website: 'https://chifa.example.com',
        mapsUrl: 'https://maps.google.com/?q=chifa',
      })
    );

    const contactHeading = screen.getByText('Contacto');
    const contactBlock = contactHeading.closest('div');
    expect(contactBlock).not.toBeNull();
    expect(within(contactBlock as HTMLElement).getByText('Telefone')).toBeInTheDocument();
    expect(within(contactBlock as HTMLElement).getByText('+55 11 99999-1111')).toBeInTheDocument();
    expect(within(contactBlock as HTMLElement).getByText('WhatsApp')).toBeInTheDocument();
    expect(within(contactBlock as HTMLElement).getByText('+55 11 98888-2222')).toBeInTheDocument();
    expect(within(contactBlock as HTMLElement).getByText('Site ou rede social')).toBeInTheDocument();
    expect(within(contactBlock as HTMLElement).getByText('https://chifa.example.com')).toBeInTheDocument();
    expect(within(contactBlock as HTMLElement).getByText('Google Maps')).toBeInTheDocument();
    expect(within(contactBlock as HTMLElement).getByText('https://maps.google.com/?q=chifa')).toBeInTheDocument();
  });

  it('shows explicit empty states when owner contact fields are missing', async () => {
    await renderExpandedOwnerPanel(makeDetail({ phone: '', whatsapp: '', website: '', mapsUrl: '' }));

    const contactHeading = screen.getByText('Contacto');
    const contactBlock = contactHeading.closest('div');
    expect(contactBlock).not.toBeNull();
    expect(within(contactBlock as HTMLElement).getAllByText('Não informado')).toHaveLength(4);
  });
});
