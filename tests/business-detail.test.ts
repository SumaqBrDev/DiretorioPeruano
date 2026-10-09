import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { findFirst: vi.fn() },
  },
}));

import { handler } from '../netlify/functions/business-detail';
import prisma from '../netlify/functions/lib/prisma';

const findFirstMock = vi.mocked(prisma.businessProfile.findFirst);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('business-detail public projection', () => {
  it('does not expose KYC, billing, or owner PII fields to public callers', async () => {
    findFirstMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Chifa',
      category: 'restaurante',
      description: 'Comida peruana',
      address: { street: 'Rua A', city: 'São Paulo', state: 'SP', zip: '01000-000' },
      contact: { email: 'public@example.com', phone: '11999999999', whatsapp: '11999999999', website: 'https://example.com' },
      cnpj: '11222333000181',
      ownerFullName: 'Owner Name',
      ownerBirthCity: 'Lima',
      stripeCustomerId: 'cus_secret',
      subscriptionId: 'sub_secret',
      tags: ['ceviche'],
      photos: ['photo'],
      rating: 4.5,
      status: 'approved',
      _count: { reviews: 2 },
    } as any);

    const res = await handler({ httpMethod: 'GET', queryStringParameters: { id: 'biz-1' } } as any);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).not.toHaveProperty('cnpj');
    expect(body).not.toHaveProperty('ownerFullName');
    expect(body).not.toHaveProperty('ownerBirthCity');
    expect(body).not.toHaveProperty('stripeCustomerId');
    expect(body).not.toHaveProperty('subscriptionId');
    expect(body).not.toHaveProperty('email');
    expect(body.contact).not.toHaveProperty('email');
    expect(body.name).toBe('Chifa');
    expect(body.phone).toBe('11999999999');
  });

  it('serializes persisted hours as normalized public data and uses null for legacy hours', async () => {
    findFirstMock
      .mockResolvedValueOnce({
        id: 'biz-hours',
        name: 'Chifa Hours',
        category: 'restaurante',
        description: 'Comida peruana',
        address: {},
        contact: {},
        tags: [],
        photos: [],
        rating: 0,
        status: 'approved',
        hours: [
          { day: 'Segunda', isOpen: true, open: '09:00', close: '18:00' },
          { day: 'Terça', isOpen: true, open: '09:00', close: '18:00' },
          { day: 'Quarta', isOpen: true, open: '09:00', close: '18:00' },
          { day: 'Quinta', isOpen: true, open: '09:00', close: '18:00' },
          { day: 'Sexta', isOpen: true, open: '09:00', close: '18:00' },
          { day: 'Sábado', isOpen: true, open: '09:00', close: '18:00' },
          { day: 'Domingo', isOpen: false, open: '25:99', close: '' },
        ],
        _count: { reviews: 0 },
      } as any)
      .mockResolvedValueOnce({
        id: 'biz-legacy',
        name: 'Legacy',
        category: 'serviços',
        description: 'Sem horários',
        address: {},
        contact: {},
        tags: [],
        photos: [],
        rating: 0,
        status: 'approved',
        hours: null,
        _count: { reviews: 0 },
      } as any);

    const withHours = await handler({ httpMethod: 'GET', queryStringParameters: { id: 'biz-hours' } } as any);
    const legacy = await handler({ httpMethod: 'GET', queryStringParameters: { id: 'biz-legacy' } } as any);

    expect(JSON.parse(withHours.body).hours[6]).toEqual({
      day: 'Domingo',
      isOpen: false,
      open: '',
      close: '',
    });
    expect(JSON.parse(legacy.body).hours).toBeNull();
  });
});
