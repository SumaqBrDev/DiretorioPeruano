// tests/approval-email-content.test.ts
import { describe, it, expect } from 'vitest';
import { buildApprovalEmail } from '../netlify/functions/lib/emailContent';

const APP_URL = 'https://conectaperu.netlify.app';

describe('buildApprovalEmail — beta mode', () => {
  const beta = () =>
    buildApprovalEmail({
      businessName: 'Cantina Don José',
      ownerName: 'María',
      trialEndDate: 'No aplica (modo beta)',
      betaMode: true,
      appUrl: APP_URL,
    });

  it('never mentions a price during beta', () => {
    const { html } = beta();
    // Strip inline styles first: hex colours like #059669 contain "59" and
    // would make a naive substring assertion fail for the wrong reason.
    const text = html.replace(/style="[^"]*"/g, '');
    expect(text).not.toContain('59,00');
    expect(text).not.toMatch(/R\$/);
    expect(text).not.toMatch(/premium/i);
  });

  it('never promises a trial period during beta', () => {
    const { html } = beta();
    expect(html).not.toMatch(/per[ií]odo de prueba/i);
    expect(html).not.toMatch(/30 d[ií]as/i);
  });

  it('states explicitly that the beta has no charge', () => {
    const { html } = beta();
    expect(html).toMatch(/sin costo|gratuito|no hay cobro/i);
  });

  it('keeps the business name, owner name and panel link', () => {
    const { subject, html } = beta();
    expect(subject).toContain('Cantina Don José');
    expect(html).toContain('María');
    expect(html).toContain(`${APP_URL}/meu-negocio`);
  });
});

describe('buildApprovalEmail — paid mode', () => {
  const paid = () =>
    buildApprovalEmail({
      businessName: 'Mercado Andino',
      ownerName: 'Luis',
      trialEndDate: '5 de noviembre de 2026',
      betaMode: false,
      appUrl: APP_URL,
    });

  it('shows the price and the trial end date', () => {
    const { html } = paid();
    expect(html).toContain('59,00');
    expect(html).toMatch(/per[ií]odo de prueba/i);
    expect(html).toContain('5 de noviembre de 2026');
  });
});

describe('buildApprovalEmail — HTML safety', () => {
  it('escapes user-supplied values so they cannot inject markup', () => {
    const { subject, html } = buildApprovalEmail({
      businessName: '<script>alert(1)</script>Bar',
      ownerName: '"><img src=x onerror=alert(1)>',
      trialEndDate: 'hoy',
      betaMode: true,
      appUrl: APP_URL,
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    // the readable text survives, only the markup is neutralised
    expect(subject).toContain('Bar');
  });
});
