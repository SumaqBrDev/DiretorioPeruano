/**
 * Pure builders for transactional email content.
 *
 * Extracted from `email.ts` so the copy can be unit-tested without a Resend
 * client. The approval email must adapt to beta mode: during the controlled
 * beta there is no charge and no trial, so quoting a monthly price contradicts
 * what the owner was promised at signup.
 */

const PREMIUM_PRICE_LABEL = 'Premium — R$ 59,00/mes';

/** Escape values that originate from user input before interpolating as HTML. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type ApprovalEmailInput = {
  businessName: string;
  ownerName: string;
  trialEndDate: string;
  /** When true the business was approved under the controlled beta: no charge. */
  betaMode: boolean;
  appUrl: string;
};

export type EmailContent = {
  subject: string;
  html: string;
};

const shell = (inner: string) => `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a73e8; font-size: 28px; margin: 0;">ConectaPerú</h1>
            <p style="color: #666; font-size: 14px;">Directorio Peruano</p>
          </div>
          ${inner}
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            © 2026 ConectaPerú — Directorio de Negocios Peruanos
          </p>
        </div>
      `;

export function buildApprovalEmail(input: ApprovalEmailInput): EmailContent {
  const businessName = escapeHtml(input.businessName);
  const ownerName = escapeHtml(input.ownerName);
  const trialEndDate = escapeHtml(input.trialEndDate);
  const appUrl = input.appUrl;

  // During the beta the owner was told the listing is free and no card is
  // required. Showing a price or a trial countdown here would contradict that.
  const detailsBlock = input.betaMode
    ? `
            <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #059669; margin-top: 0;">Tu publicación durante la beta</h3>
              <p>Estamos en fase beta: tu negocio permanece publicado <strong>sin costo</strong>.</p>
              <p>No hay cobro ni tarjeta asociada. Si más adelante introducimos un plan de pago, te avisaremos con antelación y podrás decidir.</p>
            </div>`
    : `
            <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #059669; margin-top: 0;">Detalles de tu período de prueba</h3>
              <p><strong>Plan:</strong> ${PREMIUM_PRICE_LABEL}</p>
              <p><strong>Período de prueba:</strong> 30 días gratis</p>
              <p><strong>Fecha de término:</strong> ${trialEndDate}</p>
              <p>No se realizará ningún cobro durante el período de prueba. Puedes cancelar en cualquier momento.</p>
            </div>`;

  const html = shell(`
          <div style="background-color: #f0f9ff; border-radius: 12px; padding: 30px; border: 1px solid #bae6fd;">
            <h2 style="color: #0369a1; margin-top: 0;">¡Felicidades, ${ownerName}!</h2>
            <p>Tu negocio <strong>${businessName}</strong> ha sido aprobado y ya está visible en ConectaPerú.</p>${detailsBlock}
            <p>Accede a tu panel de administración para gestionar tu perfil, responder reseñas y más.</p>
            <a href="${appUrl}/meu-negocio" style="display: inline-block; background-color: #1a73e8; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 10px;">
              Ir al Panel
            </a>
          </div>`);

  return {
    subject: `¡Bienvenido a ConectaPerú! — ${input.businessName} ha sido aprobado`,
    html,
  };
}
