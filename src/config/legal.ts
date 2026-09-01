// src/config/legal.ts
// LGPD legal document registry — single source of truth (design D1).
//
// Pure, dependency-free TypeScript imported by the client (src/pages/*), the
// Netlify functions (netlify/functions/**) and the test suite, so wording and
// versions can be swapped WITHOUT code changes once the responsible/DPO
// approves the PT-BR texts.
//
// IMPORTANT (legal status): the currently active PT-BR documents have been
// approved by the responsible party for this release. Inactive historical and
// future-dated entries remain unapproved and are not resolved as active.
// `legalApproved` is evaluated by the release gate (`npm run check:legal`, D10).
//
// Hash contract: `hash` = lowercase hex sha256 of `JSON.stringify(sections)`.
// `verifyLegalDocHashes()` recomputes it from the sections so wording drift
// (or a copy/paste hash) is caught by the unit tests.

export interface LegalSection {
  title: string;
  body: string;
}

export interface LegalDoc {
  id: string;
  version: string;
  /** ISO date (UTC), e.g. "2026-08-17". Active = max version with effectiveDate <= today. */
  effectiveDate: string;
  /** Lowercase hex sha256 of JSON.stringify(sections). */
  hash: string;
  /** false until the responsible/DPO approves this exact text (D10). */
  legalApproved: boolean;
  /** Purposes this document is relevant to (service | marketing | analytics). */
  purposes: string[];
  /** LGPD legal bases the document relies on (contract | consent | legitimate_interest). */
  legalBases: string[];
  locale: string;
  /** i18n key for the document title. */
  titleKey: string;
  /** PT-BR placeholder sections rendered by the public legal pages. */
  sections: LegalSection[];
}

export interface CookieCategory {
  id: string;
  /** i18n key for the category label (UI copy is pt-BR/es-PE). */
  labelKey: string;
  essential: boolean;
}

export interface LegalHashMismatch {
  id: string;
  version: string;
  expected: string;
  actual: string;
}

// ── Registry ────────────────────────────────────────────────────────────────
// v2 of privacy_policy is in force today (v1 superseded); cookie_policy v2 is
// future-dated (2099) and must NEVER resolve as active until its effective
// date arrives.

export const LEGAL_DOCS: LegalDoc[] = [
  // privacy_policy v1 — superseded on 2026-08-17 by v2.
  {
    id: 'privacy_policy',
    version: '1',
    effectiveDate: '2026-01-01',
    hash: 'a7c83987f54ad18e96e03b8d71faa3805e9542dea08f32e7e4c1f2c13da2ecf6',
    legalApproved: false,
    purposes: ['service'],
    legalBases: ['contract', 'legitimate_interest'],
    locale: 'pt-BR',
    titleKey: 'legal.privacy.title',
    sections: [
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Compromisso com a LGPD',
        body: 'Texto provisório. A ConectaPeru trata dados pessoais em conformidade com a LGPD (Lei nº 13.709/2018). Esta política será revisada e aprovada pelo responsável/DPO antes da publicação.',
      },
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Dados Coletados',
        body: 'Texto provisório. Dados estritamente necessários para o funcionamento do diretório: nome, e-mail e informações do negócio.',
      },
    ],
  },
  // privacy_policy v2 — ACTIVE since 2026-08-17.
  {
    id: 'privacy_policy',
    version: '2',
    effectiveDate: '2026-08-17',
    hash: 'd94cb64ac17f18f3e64f03526c7efd32244848dc16b7386d2769152945ef2f6b',
    legalApproved: true,
    purposes: ['service'],
    legalBases: ['contract', 'legitimate_interest'],
    locale: 'pt-BR',
    titleKey: 'legal.privacy.title',
    sections: [
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Compromisso com a LGPD',
        body: 'Texto provisório. A ConectaPeru está comprometida com a proteção dos seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018). Esta política explica como coletamos, usamos, armazenamos e protegemos suas informações. Este texto é um rascunho pendente de aprovação legal.',
      },
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Dados Coletados',
        body: 'Texto provisório. Coletamos apenas os dados estritamente necessários para o funcionamento do diretório: nome, e-mail, informações do negócio (nome, endereço, telefone, horários, categoria, fotos) e avaliações enviadas por usuários. Não coletamos dados sensíveis.',
      },
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Uso dos Dados',
        body: 'Texto provisório. O uso dos dados é exclusivo para o funcionamento da plataforma ConectaPeru. Não vendemos, alugamos ou repassamos seus dados a terceiros.',
      },
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Seus Direitos (LGPD)',
        body: 'Texto provisório. Você pode confirmar a existência de tratamento, acessar, corrigir, portar e eliminar seus dados pessoais, entre outros direitos da LGPD, pelo e-mail privacidade@conectaperu.com.br.',
      },
    ],
  },
  // terms_of_service v1 — ACTIVE since 2026-08-17.
  {
    id: 'terms_of_service',
    version: '1',
    effectiveDate: '2026-08-17',
    hash: '7953fa0bc4f8cb28868e5681034476ba10425f3b8361a82da43de1510dfc270c',
    legalApproved: true,
    purposes: ['service'],
    legalBases: ['contract'],
    locale: 'pt-BR',
    titleKey: 'legal.terms.title',
    sections: [
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Aceitação dos Termos',
        body: 'Texto provisório. Ao acessar ou utilizar a plataforma ConectaPeru, você concorda em cumprir e estar vinculado a estes Termos de Serviço.',
      },
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Cadastro e Conta',
        body: 'Texto provisório. Para cadastrar um negócio ou enviar avaliações, é necessário criar uma conta. As informações fornecidas devem ser verdadeiras, precisas e atualizadas.',
      },
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Responsabilidades do Usuário',
        body: 'Texto provisório. Você concorda em não publicar conteúdo falso ou difamatório, não violar direitos de propriedade intelectual, não enviar spam e não tentar acessar áreas restritas sem autorização.',
      },
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Contato',
        body: 'Texto provisório. Para questões relacionadas a estes Termos de Serviço, entre em contato pelo e-mail contato@conectaperu.com.br.',
      },
    ],
  },
  // cookie_policy v1 — ACTIVE since 2026-08-17.
  {
    id: 'cookie_policy',
    version: '1',
    effectiveDate: '2026-08-17',
    hash: '897c9bd23dc02848eec9d7f33380771f47629d38cab0beb333ed3e915fb416b3',
    legalApproved: true,
    purposes: ['analytics', 'marketing'],
    legalBases: ['consent'],
    locale: 'pt-BR',
    titleKey: 'legal.cookies.title',
    sections: [
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] O que são cookies',
        body: 'Texto provisório. Cookies são pequenos arquivos armazenados no seu navegador. Utilizamos cookies essenciais para o funcionamento da plataforma e cookies opcionais (analytics e marketing) somente com o seu consentimento.',
      },
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Categorias e consentimento',
        body: 'Texto provisório. Essenciais: necessários ao funcionamento. Analytics: estatísticas de uso. Marketing: campanhas e anúncios. Você pode alterar suas preferências a qualquer momento na página de preferências.',
      },
    ],
  },
  // cookie_policy v2 — FUTURE-DATED (never active until 2099-01-01).
  {
    id: 'cookie_policy',
    version: '2',
    effectiveDate: '2099-01-01',
    hash: 'cbaa8d1f7e53f38386694b240465657dce29c7012bfbd777e451ae8f1258050a',
    legalApproved: false,
    purposes: ['analytics', 'marketing'],
    legalBases: ['consent'],
    locale: 'pt-BR',
    titleKey: 'legal.cookies.title',
    sections: [
      {
        title: '[PLACEHOLDER — AGUARDANDO APROVAÇÃO LEGAL] Política de Cookies v2',
        body: 'Texto provisório para a próxima versão da Política de Cookies. Efetiva a partir de 2099-01-01; não deve ser tratada como versão ativa antes dessa data.',
      },
    ],
  },
];

// ── Cookie categories (script gate config) ─────────────────────────────────
// The script gate (WU4) reads this same config: optional categories load
// nothing until consent is granted.
export const COOKIE_CATEGORIES: CookieCategory[] = [
  { id: 'essential', labelKey: 'cookies.category.essential', essential: true },
  { id: 'analytics', labelKey: 'cookies.category.analytics', essential: false },
  { id: 'marketing', labelKey: 'cookies.category.marketing', essential: false },
];

// ── Closed validation lists (consent API, WU2) ─────────────────────────────
export const CLOSED_LISTS = {
  documentTypes: ['terms_of_service', 'privacy_policy', 'cookie_policy'],
  purposes: ['service', 'marketing', 'analytics'],
  legalBases: ['contract', 'consent', 'legitimate_interest'],
  sources: ['signup', 'onboarding', 'reconsent', 'settings', 'import'],
  intents: ['grant', 'revoke'],
  locales: ['pt-BR', 'es-PE'],
} as const;

// ── Resolution helpers ──────────────────────────────────────────────────────

function toUtcDateMs(isoDate: string): number {
  // Date-only semantics: "2026-08-17" is effective from 2026-08-17T00:00:00Z.
  return Date.parse(`${isoDate}T00:00:00Z`);
}

function isEffectiveOn(doc: LegalDoc, now: Date): boolean {
  return toUtcDateMs(doc.effectiveDate) <= now.getTime();
}

function isNewerThan(a: LegalDoc, b: LegalDoc): boolean {
  const da = toUtcDateMs(a.effectiveDate);
  const db = toUtcDateMs(b.effectiveDate);
  if (da !== db) return da > db;
  return parseInt(a.version, 10) > parseInt(b.version, 10);
}

/** Active version per document id: max version with effectiveDate <= now. */
export function activeLegalDocs(now: Date = new Date()): LegalDoc[] {
  const activeById = new Map<string, LegalDoc>();
  for (const doc of LEGAL_DOCS) {
    if (!isEffectiveOn(doc, now)) continue;
    const current = activeById.get(doc.id);
    if (!current || isNewerThan(doc, current)) activeById.set(doc.id, doc);
  }
  return Array.from(activeById.values()).sort((a, b) => a.id.localeCompare(b.id));
}

/** Active version for one document id; undefined for unknown ids (validation error upstream). */
export function getLegalDoc(id: string, now: Date = new Date()): LegalDoc | undefined {
  return activeLegalDocs(now).find((d) => d.id === id);
}

/** Exact version lookup across the whole registry (includes future-dated versions). */
export function getLegalDocVersion(id: string, version: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.id === id && d.version === version);
}

// ── Hash integrity ──────────────────────────────────────────────────────────
// Web Crypto (globalThis.crypto.subtle) works in the browser AND in Node 18+,
// keeping this module dependency-free and importable from both.

/** Lowercase hex sha256 of JSON.stringify(sections) — the hash contract. */
export async function computeDocHash(sections: LegalSection[]): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(sections));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Returns every registry entry whose stored hash drifts from its sections. Empty = intact. */
export async function verifyLegalDocHashes(): Promise<LegalHashMismatch[]> {
  const mismatches: LegalHashMismatch[] = [];
  for (const doc of LEGAL_DOCS) {
    const actual = await computeDocHash(doc.sections);
    if (actual !== doc.hash) {
      mismatches.push({ id: doc.id, version: doc.version, expected: doc.hash, actual });
    }
  }
  return mismatches;
}
