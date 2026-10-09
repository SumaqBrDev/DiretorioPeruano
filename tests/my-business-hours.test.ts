import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';
import { DEFAULT_BUSINESS_HOURS, type BusinessHours } from '../src/lib/businessHours';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
    businessProfile: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('../netlify/functions/lib/auth', () => ({ authenticateRequest: vi.fn() }));

import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';
import { handler } from '../netlify/functions/my-business';

const authMock = vi.mocked(authenticateRequest);
const userFindMock = vi.mocked(prisma.user.findUnique);
const businessFindFirstMock = vi.mocked(prisma.businessProfile.findFirst);
const businessUpdateMock = vi.mocked(prisma.businessProfile.update);

const validHours = (): BusinessHours =>
  DEFAULT_BUSINESS_HOURS.map((entry) => ({ ...entry, isOpen: true, open: '09:00', close: '18:00' }));

const putEvent = (body: unknown): HandlerEvent =>
  ({
    httpMethod: 'PUT',
    headers: { authorization: 'Bearer token' },
    queryStringParameters: null,
    body: JSON.stringify(body),
  }) as unknown as HandlerEvent;

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ ok: true, clerkId: 'clerk-1' } as never);
  userFindMock.mockResolvedValue({ id: 'owner-1' } as never);
  businessFindFirstMock.mockResolvedValue({
    id: 'biz-1',
    ownerId: 'owner-1',
    status: 'approved',
    hours: validHours(),
    address: {},
    contact: {},
  } as never);
  businessUpdateMock.mockImplementation(async (args: any) => ({ id: args.where.id, ...args.data }) as never);
});

describe('PUT /api/my-business hours persistence', () => {
  it('omits hours from the update data when the request does not include hours', async () => {
    const res = await handler(putEvent({ name: 'New name' }));

    expect(res.statusCode).toBe(200);
    expect(businessUpdateMock).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: { name: 'New name' },
    });
  });

  it('clears persisted hours when hours is null', async () => {
    const res = await handler(putEvent({ hours: null }));

    expect(res.statusCode).toBe(200);
    expect(businessUpdateMock).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: { hours: null },
    });
  });

  it('normalizes and persists valid hours, including closed days', async () => {
    const hours = validHours();
    hours[6] = { day: 'Domingo', isOpen: false, open: '25:99', close: '24:99' };

    const res = await handler(putEvent({ hours }));

    expect(res.statusCode).toBe(200);
    expect(businessUpdateMock).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: {
        hours: expect.arrayContaining([
          { day: 'Domingo', isOpen: false, open: '', close: '' },
        ]),
      },
    });
  });

  it('rejects invalid hours without updating the business profile', async () => {
    const hours = validHours();
    hours[0] = { ...hours[0], open: '18:00', close: '09:00' };

    const res = await handler(putEvent({ hours }));

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error: 'Horários inválidos',
      errors: ['Segunda: horário de abertura deve ser antes do fechamento.'],
    });
    expect(businessUpdateMock).not.toHaveBeenCalled();
  });
});
