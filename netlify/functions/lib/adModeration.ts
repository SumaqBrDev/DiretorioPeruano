/**
 * Ad moderation policy: eligibility, rejection outcomes, display identity and
 * the publication terms shown before payment.
 *
 * Pure and dependency-free so the rules that carry legal and financial weight
 * can be tested without Prisma, Stripe or a browser.
 *
 * Two rules here are deliberate and should not be "simplified" later:
 *
 *  1. Eligibility never consults subscription status. Ads are a complementary
 *     product the user buys, not a benefit of the monthly plan.
 *
 *  2. A never-published ad is always refunded. Brazilian consumer law (CDC
 *     art. 51, II) voids clauses that strip the right to a refund, and that
 *     nullity does not depend on the user having accepted any terms. Keeping
 *     payment for an exhibition that never happened would be unenforceable, so
 *     the real deterrent against repeat offenders is losing the ability to
 *     advertise — not the R$30.
 */

/** Rejections a single ad may receive before it is terminated. */
export const MAX_REVIEW_ATTEMPTS = 3;

export type AdStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_review'
  | 'active'
  | 'inactive_for_review'
  | 'rejected_final'
  | 'disabled_breach'
  | 'expired';

export type EligibilityResult =
  | { allowed: true }
  | { allowed: false; reason: 'email_not_verified' | 'business_disabled' };

/**
 * Decide whether an account may buy an ad.
 *
 * The floor is a confirmed account: a verified session plus a verified email.
 * An approved business is NOT required — community members advertise too.
 *
 * The one disqualifier is owning a business that was disabled: a listing under
 * moderation must not buy its way back into visibility through ads.
 */
export function canUserAdvertise(input: {
  hasVerifiedEmail: boolean;
  business: { status?: string; subscriptionStatus?: string } | null;
}): EligibilityResult {
  if (!input.hasVerifiedEmail) {
    return { allowed: false, reason: 'email_not_verified' };
  }
  if (input.business && input.business.status === 'disabled') {
    return { allowed: false, reason: 'business_disabled' };
  }
  return { allowed: true };
}

export type RejectionOutcome = {
  status: AdStatus;
  attemptsUsed: number;
  attemptsRemaining: number;
  refund: boolean;
  terminal: boolean;
};

/**
 * Decide what a moderation rejection does to an ad.
 *
 * Pre-publication: the ad becomes correctable ("inactive for review") and the
 * user gets up to MAX_REVIEW_ATTEMPTS tries. On the final rejection the ad is
 * terminated AND refunded, because it never reached the public.
 *
 * Post-publication (`wasPublished`): the exhibition already happened, so a
 * breach found afterwards disables the ad with no refund. This is the only
 * no-refund path, and the only one that is defensible.
 */
export function resolveRejectionOutcome(input: {
  previousAttempts: number;
  wasPublished?: boolean;
}): RejectionOutcome {
  if (input.wasPublished) {
    return {
      status: 'disabled_breach',
      attemptsUsed: input.previousAttempts,
      attemptsRemaining: 0,
      refund: false,
      terminal: true,
    };
  }

  const attemptsUsed = Math.min(input.previousAttempts + 1, MAX_REVIEW_ATTEMPTS);
  const terminal = attemptsUsed >= MAX_REVIEW_ATTEMPTS;

  return {
    status: terminal ? 'rejected_final' : 'inactive_for_review',
    attemptsUsed,
    attemptsRemaining: Math.max(MAX_REVIEW_ATTEMPTS - attemptsUsed, 0),
    // Never published -> the service was not delivered -> the money goes back.
    refund: terminal,
    terminal,
  };
}

export type AdDisplayIdentity = {
  displayName: string;
  category: string | null;
  rating: number | null;
  imageUrl: string;
  targetUrl: string | null;
};

/** Shown when a community advertiser has no name on file. */
const ANONYMOUS_ADVERTISER_LABEL = 'Anunciante da comunidade';
/** Shown when a business row somehow has no name (the column is nullable). */
const UNNAMED_BUSINESS_LABEL = 'Negócio ConectaPeru';

/**
 * Resolve how an ad presents itself publicly.
 *
 * A business ad borrows the listing's name, category, rating and photo, and
 * links to the listing. A community ad has no listing to borrow from: its own
 * image and link are the only source, and category/rating stay null rather
 * than being faked — a rating invented for a user who has none would be a lie
 * to whoever reads the ad.
 */
export function resolveAdDisplayIdentity(input: {
  business: {
    id: string;
    // Nullable in the schema, so it must be handled rather than assumed.
    name?: string | null;
    category?: string | null;
    rating?: number | null;
    photos?: string[] | null;
  } | null;
  user: { name?: string | null } | null;
  ad: { imageUrl?: string | null; targetUrl?: string | null };
}): AdDisplayIdentity {
  if (input.business) {
    return {
      displayName: input.business.name?.trim() || UNNAMED_BUSINESS_LABEL,
      category: input.business.category ?? null,
      rating: input.business.rating ?? null,
      imageUrl: input.ad.imageUrl || input.business.photos?.[0] || '',
      targetUrl: input.ad.targetUrl || `/negocio/${input.business.id}`,
    };
  }

  return {
    displayName: input.user?.name?.trim() || ANONYMOUS_ADVERTISER_LABEL,
    category: null,
    rating: null,
    imageUrl: input.ad.imageUrl || '',
    targetUrl: input.ad.targetUrl || null,
  };
}

export type PublicationTerms = {
  /** Bumped whenever the text changes, so an acceptance records what was read. */
  version: string;
  title: string;
  sections: { title: string; body: string }[];
  acknowledgement: string;
};

/**
 * The publication rules shown before payment, in pt-BR (the advertiser-facing
 * language of the platform).
 *
 * Written in a formal register, and deliberately honest about refunds: it
 * states that a never-published ad IS refunded and that only a published ad
 * found in breach loses the amount paid. Promising to keep money in every
 * case would be void under CDC art. 51, II and would expose the platform
 * instead of protecting it.
 */
export function buildAdPublicationTerms(): PublicationTerms {
  return {
    version: '2026-10-08',
    title: 'Normas de Publicação de Anúncios',
    sections: [
      {
        title: '1. Análise prévia obrigatória',
        body:
          'Todo anúncio é submetido à análise da moderação antes de ser exibido ao público. ' +
          'A confirmação do pagamento não implica publicação imediata nem aprovação automática do conteúdo.',
      },
      {
        title: '2. Conteúdo permitido',
        body:
          'O anúncio deve referir-se a produtos, serviços, eventos ou atividades compatíveis com a ' +
          'temática da plataforma — a comunidade peruana no Brasil. O conteúdo deve ser verdadeiro, ' +
          'próprio ou devidamente autorizado, e não pode induzir o público a erro.',
      },
      {
        title: '3. Conteúdo proibido',
        body:
          'É vedada a publicação de conteúdo que promova discriminação, ódio, violência, assédio ou ' +
          'exploração de qualquer natureza; material sexualmente explícito; produtos ou serviços ilícitos, ' +
          'falsificados ou sujeitos a restrição legal sem a devida habilitação; dados pessoais de terceiros ' +
          'sem consentimento; bem como anúncios alheios à temática da plataforma.',
      },
      {
        title: '4. Correção e limite de tentativas',
        body:
          `Caso o anúncio seja reprovado, o anunciante será informado do motivo e o anúncio permanecerá ` +
          `no estado "inativo para revisão", podendo ser corrigido e reenviado. São admitidas até ` +
          `${MAX_REVIEW_ATTEMPTS} análises por anúncio. Esgotado esse limite, o anúncio será definitivamente ` +
          `recusado e o valor pago será integralmente devolvido, visto que não houve exibição ao público.`,
      },
      {
        title: '5. Infração após a publicação',
        body:
          'O anúncio já publicado que venha a ser identificado em violação a estas Normas será imediatamente ' +
          'inabilitado, sem reembolso do valor pago, uma vez que o serviço de exibição foi efetivamente prestado. ' +
          'A reincidência poderá acarretar a suspensão do direito de anunciar na plataforma.',
      },
      {
        title: '6. Competência da moderação',
        body:
          'A moderação atua com base nestas Normas e informará, em todos os casos, o motivo determinante de ' +
          'sua decisão. O anunciante poderá apresentar correções dentro do limite de análises previsto no item 4.',
      },
    ],
    acknowledgement:
      'Declaro ter lido e aceito as Normas de Publicação de Anúncios e estou ciente de que o anúncio ' +
      'somente será exibido após aprovação da moderação.',
  };
}
