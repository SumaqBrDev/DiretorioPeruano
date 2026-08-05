```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:2171adc53edbcdf5cc5cd2bca6eed613bff0baaeeaf062cbd9754d20235ed6b1
verdict: fail
blockers: 5
critical_findings: 5
requirements: 15/15
scenarios: 15/15
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:00a8d4f8d25172188ae79e5ee17ab66d2b454b1ca283b54a967c9488d947e976
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:1cba73d7569f0e5ecb16953c8539fffac347ca822dc480c35947e61111541c17
```

# Verification Report — DiretorioPeruano (ConectaPeru)

**Change**: (none — full PROJECT-STATE verification against baseline `openspec/SPEC.md`)
**Version**: SPEC.md (baseline, AC1–AC15, no active SDD change; `openspec/changes/` contains only `archive/.gitkeep`)
**Mode**: Strict TDD (openspec/config.yaml `strict_tdd: true`, runner `npm test`/Vitest detected)
**Date**: 2026-08-05 · **Executor**: sdd-verify sub-agent · **Workspace**: `D:\hermes_workspace\DiretorioPeruano`
**Scope note**: No `apply-progress` artifact exists (no change was applied) — TDD cycle-evidence checks are reported as N/A; all tests below are the project's existing suites.

---

## Completeness

| Metric | Value |
|--------|-------|
| Active SDD change | None (project-state verification) |
| Tasks total | 0 (no tasks artifact — baseline SPEC only) |
| Tasks complete | 0 |
| Tasks incomplete | 0 |
| Requirements (SPEC AC1–AC15) | 15/15 present |
| Scenarios (AC1–AC15, one per criterion) | 15/15 present |
| Proposal / Design / Tasks / applyProgress artifacts | missing (baseline project, not a change) |
| Verify report | this file (`openspec/verify-report-2026-08-05.md`) |

---

## Build & Tests Execution (real runs, 2026-08-05 ~11:58 local)

| Command | Exit code | Output hash | Result |
|---------|-----------|-------------|--------|
| `npm test` | **0** | `sha256:00a8d4f8d25172188ae79e5ee17ab66d2b454b1ca283b54a967c9488d947e976` | ✅ 2 files, 9/9 tests passed |
| `npm run lint` | **0** | `sha256:956bc8ee4f914c2b9959216813072da23057b807c717da0b2f4764ae59d4ef4a` | ✅ no errors (ESLint 8; `--ext js,jsx` only — TS files not linted) |
| `npm run build` | **0** | `sha256:1cba73d7569f0e5ecb16953c8539fffac347ca822dc480c35947e61111541c17` | ✅ vite v5.4.21, 6967 modules, dist emitted |
| `npx tsc --noEmit` | **2** | `sha256:5080f27afd88d460f328a97da1e7f64b99b1002e4583ba8b6d1c8d5e3583ea80` | ❌ **32 errors** (see below) |

> Note: hashes cover the captured log files, each of which includes the runner-appended exit-marker line (`TEST_EXIT=0`, `LINT_EXIT=0`, `BUILD_EXIT=0`, `TSC_EXIT=2`). Evidence digest `sha256:2171adc5…` = SHA-256 of the concatenated four logs.

**Tests** (exact output):
```
✓ tests/subscription.test.ts (5 tests)  4ms
✓ tests/cnpj.test.ts (4 tests)          4ms
 Test Files  2 passed (2)
      Tests  9 passed (9)
   Duration 428ms
```

**TypeScript** — `npx tsc --noEmit` exits 2 with **32 errors** (pre-existing; NOT fixed per task instructions). Full list:
- `netlify/functions/lib/prisma.ts(1,10)` TS2305 — `'@prisma/client'` has no exported member `PrismaClient`
- `prisma/seed.ts(1,10)` TS2305 — same
- Stripe `apiVersion: '2025-03-01.basil'` mismatch (TS2322) ×5: admin-approve, admin-beta-mode, admin-delete, stripe-checkout, stripe-portal, stripe-webhook (6 files)
- Implicit `any` params (TS7006) ×9: admin-business-detail(111), admin-businesses(84), businesses(86), categories(24), community-reviews(39), featured(29), reviews(82), stats(28,30), testimonials(28)
- `delete-image.ts(49,43)` TS2769 overload; `upload-image.ts(188,28)` TS2345 Buffer vs BlobInput; `migrate-localstorage.ts(140,56)` TS2339 slice on `string|number`
- `r2-upload-worker/src/index.ts(2,18)` TS2304 `R2Bucket`; `r2-upload-worker/test/index.spec.ts` ×8 (TS2305×4, TS2635, TS2304, TS2351, TS2554)
- `src/components/ReviewsSection.tsx(73,9)` TS2322 `tags: string[] | undefined` vs `string[]`
- `worker-draft.ts(1,21)` TS2307 cannot find module `./index`

**Coverage**: ➖ Not available — no `@vitest/coverage-*` provider installed (config `coverage_threshold: 0`).

---

## Spec Compliance Matrix (AC1–AC15)

Statuses: ✅ COMPLIANT (passing covering test + faithful impl) · ⚠️ PARTIAL (impl present with spec deviation, and/or test missing/partial) · ❌ UNTESTED (impl faithful, no covering test) · ❌ FAILING (test failed).

| AC | Feature | Implementation evidence (source inspection) | Covering test | Result |
|----|---------|----------------------------------------------|---------------|--------|
| AC1 | Home Community Reviews | `netlify/functions/community-reviews.ts`: 5-star, `status:'approved'`, distinct businesses, random per request, limit 6, empty→`[]`; `src/components/CommunityReviews.tsx`: 3-col/1-col grid, 6 cards, hides when empty; Home.tsx places it between Featured and CTA. Deviation: card omits **date** (spec card = stars + comment + author–business + date); client re-shuffles. | none | ⚠️ PARTIAL |
| AC2 | Search Filters | `src/pages/Busca.tsx`: q/category/city/rating, URL sync via `useSearchParams`, client-side filtering, skeletons, mobile modal. Deviations: **rating filter broken** (server `businesses.ts` hardcodes `rating: 0` → `item.rating >= 3.5` drops everything); city select **hardcoded 12 cities** (spec: DB-distinct); URL param `rating` not spec `minRating`; **no 300ms debounce**; server ignores `minRating`; `src/components/SearchFilters.tsx` is a stale static stub with no text search. | none | ⚠️ PARTIAL |
| AC3 | Business Detail Review | `ReviewsSection.tsx`: form (InteractiveStarRating 1–5, min 10 / max 500 chars, toast, optimistic list insert, "Você já avaliou" after submit); Negocio.tsx loads reviews via `getReviewsForBusiness`. Deviations: `reviews.ts` POST creates `status:'pending'` (spec §1.1: **auto-approved**, default APPROVED) → GET /reviews filters `approved` → submitted review disappears on reload; "already reviewed" not persisted server-side; form shown to anonymous users (submit fails on missing token); **no server-side Clerk auth** on POST /api/reviews (accepts arbitrary `consumerId`); no moderation endpoint exists (Moderar.tsx is mock-only). | none | ⚠️ PARTIAL |
| AC4 | Business Detail Gallery | `PhotoGallery.tsx`: main image, thumbnails swap main, fullscreen modal with counter, ESC + arrow keys + prev/next buttons, thumbnail strip, all photos (not just 4). Deviations: **overlay click does not close**; **no touch swipe** (both required by spec). | none | ⚠️ PARTIAL |
| AC5 | Meu Negócio Gallery (spec: DONE) | `BusinessGallery.tsx` (used by MeuNegocio.tsx): upload max 10 (JPEG/PNG/WebP ≤5MB), drag&drop zone, per-file progress + overall progress, set-cover (move to front), delete with confirm modal + blob delete, preview modal with ESC/arrows, persistence via `onPersistPhotos`. Deviation: no explicit reorder control (only cover-to-front). | none | ⚠️ PARTIAL |
| AC6 | Superadmin Dashboard | `SuperAdmin.tsx` + `admin-businesses.ts`: stats row (Total/Pendentes/Aprovados/Rejeitados/Desabilitados/Em Trial), status tabs incl. trial, search (name/CNPJ/owner), pagination (page/limit/totalPages), actions Ver/Aprovar/Rejeitar/Excluir modals, beta toggle. Deviation: **date-range filter missing** (spec: Status, Search, Date range). | none | ⚠️ PARTIAL |
| AC7 | Superadmin Approve | `admin-approve.ts`: superadmin auth (Clerk token + role in PG), creates Stripe customer + subscription with 30-day trial when NOT beta, sets status=approved/approvedAt/subscriptionStatus, sends welcome email (Resend). Deviations: writes **`stripeSubscriptionId`** — schema/DB column is `subscriptionId` (latent break once Prisma client generated); Stripe errors swallowed (approval continues without subscription); beta-mode path skips Stripe entirely (spec-consistent). | none | ⚠️ PARTIAL |
| AC8 | Superadmin Reject | `admin-reject.ts`: reason required (400 if empty), sets status=rejected + rejectionReason, sends rejection email. "Business can resubmit": only via editing the existing rejected business (MeuNegocio PUT) — `BusinessProfile.ownerId` is `@unique`, so POST /api/businesses cannot create a second profile; no explicit re-submit UI/endpoint. | none | ⚠️ PARTIAL |
| AC9 | Superadmin Delete | `admin-delete.ts`: cancels Stripe subscription (via `cancel_at_period_end: true`), soft-deletes by setting `status:'disabled'` + `subscriptionStatus:'canceled'`. Deviations: spec says soft-delete to `DELETED` or hard delete with `force` — **`force` param ignored**; cancel is end-of-period, not immediate; writes `stripeSubscriptionId` (field drift). | none | ⚠️ PARTIAL |
| AC10 | Beta Mode | `admin-beta-mode.ts`: GET/POST toggle (boolean validated), `siteConfig` singleton upsert; when disabling beta: creates Stripe customer+subscription for approved businesses without one and sets `trialEndsAt = now+30d`; `admin-approve.ts` skips Stripe in beta; SuperAdmin shows 🟡/🟢 banner + toggle. Trial-ending emails only fire via webhook (real subscriptions) → not sent in beta. | none | ⚠️ PARTIAL |
| AC11 | Stripe Webhook | `stripe-webhook.ts`: signature verification (`STRIPE_WEBHOOK_SECRET`), handles `invoice.payment_failed` (→ past_due + payment-failed email), `customer.subscription.updated` (status sync via `mapSubscriptionStatus`), `customer.subscription.deleted` (→ canceled, clears sub id), plus `trial_will_end` (email) and `payment_succeeded` (→ active). Deviations: **no `disabledAt = now` / `status = DISABLED`** on deleted/canceled (spec §1.4); catch-all returns 200 "Internal error processed" hiding failures; **no idempotency keys** (spec risk-mitigation table). | `tests/subscription.test.ts` (5/5 pass) — covers only the status mapper, not webhook handlers | ⚠️ PARTIAL |
| AC12 | Customer Portal | `stripe-portal.ts`: creates Billing Portal session, returns `{url}`; MeuNegocio calls it when subscription active/past_due (else Stripe Checkout). Deviations: `flow_data: { type: 'subscription_cancel' }` forces the cancel flow (spec wants update card / cancel / invoices); **no owner/superadmin authorization check** — any caller with a `businessId` can mint a portal session. | none | ⚠️ PARTIAL |
| AC13 | CNPJ Validation | `netlify/functions/lib/cnpj.ts`: 14-digit + mod-11 check digits + publica.cnpj.ws lookup (8s timeout, 24h cache, graceful fallback to format-only). **Lib is never imported by any endpoint or component** (verified by grep) — validation does not run anywhere in the product; Onboarding only formats the field (`formatCNPJ`), POST /api/businesses ignores `cnpj`; `my-business.ts` PUT persists it. | `tests/cnpj.test.ts` (4/4 pass) — covers the utility only | ⚠️ PARTIAL |
| AC14 | Disabled State | Hidden from search ✅ (`businesses.ts` GET filters `status:'approved'`; `business-detail.ts` too). Deviations: **owner editing not read-only** (MeuNegocio "✏️ Editar" + form not blocked when `status==='disabled'`); banner says "contact support" instead of "Atualize pagamento para reativar" + portal link; **portal button only rendered when `status==='approved'`** → no re-enable path from disabled state; webhook never sets DISABLED anyway (AC11). | none | ⚠️ PARTIAL |
| AC15 | Emails (Resend) | `netlify/functions/lib/email.ts`: all 4 templates implemented — approval/welcome (trial info), rejection (reason), trial-ending (days left), payment-failed — sent via Resend from `admin-approve`, `admin-reject`, `stripe-webhook`. Deviation: copy is Spanish (es-PE) vs spec PT-BR templates; welcome email lacks the "Gerenciar Pagamento → Customer Portal" button from spec. | none | ❌ UNTESTED |

**Compliance summary**: 0/15 scenarios fully compliant (14 ⚠️ PARTIAL, 1 ❌ UNTESTED, 0 ✅ COMPLIANT, 0 ❌ FAILING). Only 2 of 15 ACs have any covering test (`AC11` mapper, `AC13` utility), both passing.

---

## Correctness (Static Evidence)

| AC | Status | Notes |
|----|--------|-------|
| AC1 | ✅ Implemented (minor deviation) | Random 5-star approved distinct reviews; date omitted on card |
| AC2 | ⚠️ Partial | 3/4 filters functional client-side; rating filter broken (server `rating:0`); city hardcoded; no debounce; param `rating`≠`minRating` |
| AC3 | ⚠️ Partial | Form/validation/optimistic list good; auto-approve missing; no server auth; already-reviewed not persisted |
| AC4 | ✅ Implemented (minor deviation) | Modal, ESC, arrows, thumbs, all photos; no overlay-click, no swipe |
| AC5 | ✅ Implemented | Upload 10, DnD, cover, delete+confirm, modal, progress, persist |
| AC6 | ✅ Implemented (minor deviation) | Stats/table/filters(no date-range)/pagination/actions/beta toggle |
| AC7 | ✅ Implemented (latent defect) | Customer+30d trial+email; `stripeSubscriptionId` field drift |
| AC8 | ✅ Implemented (resubmit gap) | Reason required + email; resubmit = edit-only due to unique ownerId |
| AC9 | ✅ Implemented (deviation) | Cancel sub + soft-delete to `disabled`; `force` ignored |
| AC10 | ✅ Implemented | Toggle, no charges in beta, batch subscription on beta-off |
| AC11 | ⚠️ Partial | 5 event types handled; no DISABLED/disabledAt; no idempotency; errors swallowed |
| AC12 | ⚠️ Partial | Portal session works; forced cancel flow; no ownership auth |
| AC13 | ⚠️ Partial | Utility complete + tested; **not wired into product** |
| AC14 | ⚠️ Partial | Hidden from search; read-only and re-enable-via-portal missing |
| AC15 | ✅ Implemented | 4/4 templates via Resend; no tests |

---

## Coherence (Design — SPEC.md §1)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| `Review.status` default APPROVED (auto-approve) | ❌ No | schema + `reviews.ts` default `pending`; no moderation endpoint (Moderar.tsx mock-only) |
| `enum BusinessStatus` / `enum ReviewStatus` | ❌ No | plain `String` columns with string literals (`pending/approved/rejected/disabled`) |
| `SiteConfig` singleton + `betaMode` default true | ✅ Yes | schema + `admin-beta-mode.ts` |
| BusinessRegistration extended body (cnpj, ownerFullName, ownerBirthCity) | ❌ No | POST /api/businesses ignores all three (silently dropped); only PUT (my-business) persists them |
| Search fix: `categoria`→`category`, `cidade`→`city`, `rating`→`minRating` | ⚠️ Partial | category/city fixed; `rating` not renamed; city not DB-distinct; no debounce |
| Approve: Stripe customer + 30-day trial + welcome email | ✅ Yes (non-beta) | beta-aware; field-drift defect noted |
| Webhook: deleted → disabledAt=now; canceled → DISABLED | ❌ No | only subscriptionStatus sync |
| Customer Portal generic (update card, cancel, invoices) | ⚠️ Partial | forced `subscription_cancel` flow |
| CNPJ validation function + wiring | ⚠️ Partial | function exists/tested, never wired |
| Disabled business: hidden, read-only, portal re-enable | ⚠️ Partial | hidden only |

---

## Strict TDD Sections (mode active)

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported (apply-progress) | ➖ N/A | No active change, no apply-progress artifact exists — nothing to validate |
| All tasks have tests | ➖ N/A | No task list in scope |
| RED confirmed (test files exist) | ✅ | 2 test files exist: `tests/cnpj.test.ts`, `tests/subscription.test.ts` |
| GREEN confirmed (tests pass) | ✅ | 9/9 pass on execution (`npm test`, exit 0) |
| Triangulation | ✅ | CNPJ: 4 cases (valid formatted, invalid digits, malformed, digit-only valid/invalid); subscription mapper: 5 cases covering all branches |
| Safety Net | ➖ N/A | No modified files (no change) |

**TDD Compliance**: N/A for change-cycle checks (project-state verification); existing suites are green.

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 9 | 2 | vitest |
| Integration | 0 | 0 | not installed (config `layers.integration.available: false`) |
| E2E | 0 | 0 | not installed |
| **Total** | **9** | **2** | |

### Changed File Coverage
Coverage analysis skipped — no coverage tool detected (`@vitest/coverage-*` absent; config `coverage_threshold: 0`).

### Assertion Quality
**✅ All assertions verify real behavior** — 9/9 tests assert concrete values (`toBe(true/false)`, `toBe('trial')`, etc.); no tautologies, no ghost loops, no mocks (0 `vi.mock` vs 24 `expect`), no smoke-only tests.

### Quality Metrics
**Linter**: ✅ No errors (`npm run lint`, exit 0 — ESLint 8, JS/JSX only).
**Type Checker**: ❌ 32 errors (`npx tsc --noEmit`, exit 2) — declared quality gate in `openspec/config.yaml` is red.

---

## Issues Found

### CRITICAL
1. **Type checker red (32 errors, exit 2)** — `npx tsc --noEmit` fails across `netlify/functions/`, `prisma/seed.ts`, `r2-upload-worker/`, `src/components/ReviewsSection.tsx`, `worker-draft.ts`. Includes TS2305 `'@prisma/client' has no exported member 'PrismaClient'` in `lib/prisma.ts` and `prisma/seed.ts`, and Stripe `apiVersion` type mismatches ×6. Pre-existing; documented, not fixed (per instructions). Note: the pre-existing set is larger than the 3 files previously recorded — 32 errors in ~20 files.
2. **Prisma client not generated in the working tree** — `node_modules/.prisma/client` is empty; `@prisma/client` v7 exports no `PrismaClient`; no `prisma generate` step exists in `netlify.toml` build (`npm run build` only) or package.json scripts. Consequence: **all 26 DB-touching Netlify functions fail to load/run in the current tree**; `npm test` passes only because both suites avoid Prisma.
3. **`stripeSubscriptionId` vs `subscriptionId` field drift** — schema.prisma and `prisma/migration_manual.sql` define `subscriptionId`; `admin-approve.ts`, `admin-beta-mode.ts`, `admin-business-detail.ts`, `admin-delete.ts`, `stripe-webhook.ts` read/write `stripeSubscriptionId`. Masked today by the missing generated client; once the client is generated, these become compile errors and **runtime failures in the Stripe approve/delete/beta-off/webhook flows** (Prisma rejects unknown fields).
4. **Review auto-approve not implemented (spec §1.1/AC3/AC1)** — reviews are created `status:'pending'`; no endpoint ever approves them (Moderar.tsx is mock-only); GET `/api/reviews` and `/api/community-reviews` filter `approved` → submitted reviews vanish on reload and can never reach the community section. Additionally, POST `/api/reviews` performs **no server-side Clerk authentication** (accepts arbitrary `consumerId` in the body).
5. **Extended registration contract violated (spec §1.2/AC13)** — POST `/api/businesses` ignores `cnpj`, `ownerFullName`, `ownerBirthCity` (onboarding data silently dropped; search-by-CNPJ finds nothing); the validated CNPJ library (`lib/cnpj.ts`) is never imported by any endpoint or component — AC13 exists only as an unused, tested utility.

### WARNING
1. AC2 — rating filter is non-functional end-to-end (server hardcodes `rating: 0`; `item.rating >= min` then removes every result); city dropdown hardcoded instead of DB-distinct; URL param `rating` instead of spec `minRating`; no 300ms debounce; `SearchFilters.tsx` is a stale stub duplicating (and contradicting) the real filters in `Busca.tsx`.
2. AC11 — webhook does not set `disabledAt`/`status = DISABLED` on `customer.subscription.deleted` or canceled `subscription.updated` (spec §1.4); catch-all returns HTTP 200 "Internal error processed", masking internal failures; no idempotency keys despite the spec risk-mitigation table.
3. AC14 — disabled state is display-only: owner editing is not read-only, the banner says "contact support" instead of "update payment to re-enable" + portal link, and the portal button is only rendered for `approved` businesses.
4. AC12 — `stripe-portal.ts` forces `flow_data: { type: 'subscription_cancel' }` (spec: update card, cancel, download invoices) and has no ownership/superadmin authorization check — any caller knowing a `businessId` can obtain a portal session.
5. AC6 — date-range filter missing from the admin dashboard (spec: Status, Search, Date range).
6. AC4 — fullscreen modal lacks overlay-click-to-close and touch swipe.
7. AC9 — `force` param ignored; soft-delete sets `disabled` (spec: `DELETED`); Stripe cancel is end-of-period, not immediate.
8. AC8 — resubmit path is constrained: `BusinessProfile.ownerId @unique` prevents a new profile after rejection; no explicit re-submit flow.
9. AC15 — 4 templates implemented but no covering tests; copy is Spanish vs spec's PT-BR; welcome email lacks the Customer Portal CTA button.
10. AC1 — community review card omits the date element from the spec card design.

### SUGGESTION
1. Add covering tests for the remaining 14 ACs (currently only AC11 mapper + AC13 utility are tested; e.g. unit tests for `cnpj.ts` lookup fallback, `email.ts` template payloads, `admin-*` handlers with mocked Prisma).
2. Run `prisma generate`, add it to `netlify.toml` build command, and align field names (`subscriptionId`) across the 5 functions.
3. Wire `validateCnpj`/`lookupCnpj` into POST `/api/businesses` and Onboarding; persist KYC fields on create.
4. Add server-side Clerk auth to POST `/api/reviews` (derive `consumerId` from verified claims) and enforce the spec's auto-approve default (or ship a real review-moderation endpoint).
5. Implement webhook idempotency (event-id cache) and set `disabledAt`/DISABLED per spec §1.4.
6. Implement server-side `minRating` filter in `businesses.ts`, DB-distinct city endpoint, and 300ms input debounce; remove/replace the stale `SearchFilters.tsx`.
7. Enforce read-only MeuNegocio when `status === 'disabled'` and surface the portal link for re-enable.

---

## Verdict

**FAIL**

Declared commands `npm test` (0), `npm run lint` (0) and `npm run build` (0) are green, but verification fails on: type checker exit 2 with 32 errors, an ungenerated Prisma client that makes the entire API layer non-runnable in the current tree, a schema/code field-name drift that will break the Stripe flows, the unimplemented review auto-approve contract (AC3/AC1), the dropped KYC fields in registration (AC13/AC8), and 14 of 15 acceptance criteria lacking runtime covering tests (0/15 fully compliant).
