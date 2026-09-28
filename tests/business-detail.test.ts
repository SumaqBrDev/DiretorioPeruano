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
});
