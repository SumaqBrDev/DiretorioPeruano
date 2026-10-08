// tests/email-delivery-reporting.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendApprovalEmail } from '../netlify/functions/lib/email';

describe('sendApprovalEmail — delivery reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // Resend does NOT throw on a rejected send: it resolves with
  // { data: null, error: {...} }. The old code only had a try/catch, so a
  // sandbox rejection was logged as "Approval email sent" — a false success.
  it('reports failure when Resend returns an error instead of throwing', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { statusCode: 403, name: 'validation_error', message: 'Domain is not verified' },
    });

    const result = await sendApprovalEmail('owner@example.com', 'Cantina', 'María', 'n/a', true);

    expect(result.delivered).toBe(false);
    expect(result.error).toMatch(/not verified/i);
    // must not claim success
    expect(console.log).not.toHaveBeenCalledWith(expect.stringMatching(/email sent/i));
  });

  it('reports success when Resend accepts the message', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_123' }, error: null });

    const result = await sendApprovalEmail('owner@example.com', 'Cantina', 'María', 'n/a', true);

    expect(result.delivered).toBe(true);
    expect(result.id).toBe('msg_123');
  });

  it('reports failure when the SDK throws, without breaking approval', async () => {
    sendMock.mockRejectedValue(new Error('network down'));

    const result = await sendApprovalEmail('owner@example.com', 'Cantina', 'María', 'n/a', true);

    expect(result.delivered).toBe(false);
    expect(result.error).toMatch(/network down/i);
  });
});
