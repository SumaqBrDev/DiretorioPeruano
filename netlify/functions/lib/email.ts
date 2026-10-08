import { Resend } from 'resend';
import { buildApprovalEmail, escapeHtml } from './emailContent';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
// QA override: Resend's sandbox only delivers from onboarding@resend.dev to
// the account owner email. Production keeps the branded sender.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ConectaPerú <noreply@conectaperu.com>';
// BUG-026: email CTAs pointed at conectaperu.com (domain not live yet).
// Configurable via APP_URL so links resolve on the real deployed origin.
const APP_URL = process.env.APP_URL || 'https://conectaperu.com';

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Outcome of an email attempt.
 *
 * Email failure must never block the business operation that triggered it,
 * so these helpers never throw. They report instead, so the caller can log
 * the truth and operators know whether to follow up manually.
 */
export type EmailResult = {
  delivered: boolean;
  id?: string;
  error?: string;
};

/**
 * Send through Resend and report honestly.
 *
 * The Resend SDK does NOT throw on a rejected send: it resolves with
 * `{ data: null, error: {...} }`. A bare try/catch therefore logs "sent" for
 * messages the provider refused — exactly what happens while the sending
 * domain is unverified and the sandbox sender silently drops mail to anyone
 * but the account owner.
 */
async function deliver(
  label: string,
  to: string,
  payload: { from: string; to: string; subject: string; html: string }
): Promise<EmailResult> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send(payload);

    if (error) {
      const message = error.message || error.name || 'unknown Resend error';
      console.error(`${label} NOT delivered to ${to}: ${message}`);
      return { delivered: false, error: message };
    }

    console.log(`${label} delivered to ${to} (id=${data?.id ?? 'unknown'})`);
    return { delivered: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${label} NOT delivered to ${to}: ${message}`);
    return { delivered: false, error: message };
  }
}

/**
 * Send approval email.
 *
 * `betaMode` must reflect the mode the business was approved under: during the
 * controlled beta the listing is free, so the email must not quote a price or
 * a trial countdown the owner was never offered.
 */
export async function sendApprovalEmail(
  to: string,
  businessName: string,
  ownerName: string,
  trialEndDate: string,
  betaMode = false
): Promise<EmailResult> {
  const { subject, html } = buildApprovalEmail({
    businessName,
    ownerName,
    trialEndDate,
    betaMode,
    appUrl: APP_URL,
  });
  return deliver('Approval email', to, { from: FROM_EMAIL, to, subject, html });
}

/**
 * Send rejection email
 */
export async function sendRejectionEmail(
  to: string,
  businessName: string,
  ownerName: string,
  reason: string
): Promise<EmailResult> {
  const safeBusinessName = escapeHtml(businessName);
  const safeOwnerName = escapeHtml(ownerName);
  const safeReason = escapeHtml(reason);
  return deliver('Rejection email', to, {
    from: FROM_EMAIL,
    to,
    subject: `Actualización sobre ${businessName} en ConectaPerú`,
    html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a73e8; font-size: 28px; margin: 0;">ConectaPerú</h1>
            <p style="color: #666; font-size: 14px;">Directorio Peruano</p>
          </div>
          <div style="background-color: #fef2f2; border-radius: 12px; padding: 30px; border: 1px solid #fecaca;">
            <h2 style="color: #dc2626; margin-top: 0;">Hola ${safeOwnerName},</h2>
            <p>Lamentamos informarte que tu negocio <strong>${safeBusinessName}</strong> no ha sido aprobado en ConectaPerú en este momento.</p>
            <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">Motivo:</h3>
              <p>${safeReason}</p>
            </div>
            <p>Puedes realizar las correcciones necesarias y volver a solicitar la aprobación. Estamos aquí para ayudarte.</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            © 2026 ConectaPerú — Directorio de Negocios Peruanos
          </p>
        </div>
      `,
  });
}

/**
 * Send trial ending warning email
 */
export async function sendTrialEndingEmail(
  to: string,
  businessName: string,
  daysLeft: number
): Promise<EmailResult> {
  const safeBusinessName = escapeHtml(businessName);
  const subject = daysLeft <= 1
    ? '⚠️ Último día de tu prueba gratuita en ConectaPerú'
    : `⏰ Tu prueba gratuita en ConectaPerú termina en ${daysLeft} días`;

  return deliver('Trial ending email', to, {
    from: FROM_EMAIL,
    to,
    subject,
    html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a73e8; font-size: 28px; margin: 0;">ConectaPerú</h1>
            <p style="color: #666; font-size: 14px;">Directorio Peruano</p>
          </div>
          <div style="background-color: #fff7ed; border-radius: 12px; padding: 30px; border: 1px solid #fed7aa;">
            <h2 style="color: #c2410c; margin-top: 0;">Tu período de prueba está por terminar</h2>
            <p>Hola,</p>
            <p>Te quedan <strong>${daysLeft} días</strong> de prueba gratuita para tu negocio <strong>${safeBusinessName}</strong>.</p>
            <p>Para seguir disfrutando de los beneficios de ConectaPerú, asegúrate de tener un método de pago configurado.</p>
            <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p><strong>Plan:</strong> Premium — R$ 59,00/mes</p>
              <p>Si no deseas continuar, puedes cancelar desde tu panel de administración.</p>
            </div>
            <a href="${APP_URL}/meu-negocio" style="display: inline-block; background-color: #c2410c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 10px;">
              Gestionar Suscripción
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            © 2026 ConectaPerú — Directorio de Negocios Peruanos
          </p>
        </div>
      `,
  });
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
  to: string,
  businessName: string
): Promise<EmailResult> {
  const safeBusinessName = escapeHtml(businessName);
  return deliver('Payment failed email', to, {
    from: FROM_EMAIL,
    to,
    subject: '⚠️ Problema con el pago de tu suscripción en ConectaPerú',
    html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a73e8; font-size: 28px; margin: 0;">ConectaPerú</h1>
            <p style="color: #666; font-size: 14px;">Directorio Peruano</p>
          </div>
          <div style="background-color: #fef2f2; border-radius: 12px; padding: 30px; border: 1px solid #fecaca;">
            <h2 style="color: #dc2626; margin-top: 0;">Error en el procesamiento del pago</h2>
            <p>Hola,</p>
            <p>Hemos tenido un problema al procesar el pago de tu suscripción para <strong>${safeBusinessName}</strong>.</p>
            <p>Por favor, actualiza tu método de pago para evitar la suspensión del servicio.</p>
            <a href="${APP_URL}/meu-negocio" style="display: inline-block; background-color: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 10px;">
              Actualizar Método de Pago
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            © 2026 ConectaPerú — Directorio de Negocios Peruanos
          </p>
        </div>
      `,
  });
}
