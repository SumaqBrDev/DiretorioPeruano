# Tasks: Remediate‑Verify‑Criticals

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400‑450 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 2 PRs (foundation/core, then TS+testing) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Generate Prisma client before build | PR 1 | `npm run build` | N/A (build side‑effect) | None (generation is a preset step) |
| 2 | Migrate schema and run tests | PR 2 | `npm test` | In‑service API mock | `npx prisma migrate reset` |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Update `prisma/schema.prisma`: add `rating Float?`, `WebhookEvent` model, rename `stripeSubscriptionId` to `subscriptionId`, remove old field, change Review.status default from `PENDING` to `APPROVED`.
- [x] 1.2 Update `netlify.toml`: add `npx prisma generate` after `install`.
- [x] 1.3 Schema changes applied via manual SQL by convention (no `DATABASE_URL`; `prisma/migration_manual.sql` updated with `rating`, `WebhookEvent` table, Review default aligned to `approved`).
- [x] 1.4 Run `npx prisma generate` locally to create updated client (automation already added to netlify). 

## Phase 2: Core Implementation

- [x] 2.1 Modify `netlify/functions/reviews.ts`: use `authenticateRequest` to derive Clerk `consumerId`, set status default to `APPROVED` in the Prisma create.
- [x] 2.2 Update `netlify/functions/businesses.ts`: add handling of `cnpj`, `ownerFullName`, `ownerBirthCity`; invoke `validateCnpj`, persist on success; reject with 400 on validation failure.
- [x] 2.3 Extend `netlify/functions/businesses.ts`: add `minRating` query param; filter `BusinessProfile` where `rating >= minRating` and exclude `rating == null`.
- [x] 2.4 Update `netlify/functions/stripe-webhook.ts`: create/update `WebhookEvent` table entry for each event, check for duplicate stripeEventId; set `disabledAt` and status `DISABLED` on subscription deletion; use new `subscriptionId` fields.
- [x] 2.5 Update all admin functions (`admin-approve.ts`, `admin-delete.ts`, `admin-business-detail.ts`, `admin-beta-mode.ts`, `stripe-portal.ts`) to use `subscriptionId` instead of `stripeSubscriptionId` and add guard `requireBusinessOwner` / `requireSuperAdmin` on portal.
- [x] 2.6 Modify `src/pages/MeuNegocio.tsx`: render read‑only UI, banner and portal link when `status === 'disabled'`; enforce 403 on non‑owner access.
- [x] 2.7 Ensure all imports of `stripeSubscriptionId` are renamed to `subscriptionId` across the codebase.

## Phase 3: TypeScript Error Remediation

- [x] 3.1 Fix Group 1: add missing imports and correct paths in `src/components/ReviewsSection.tsx`, `src/hooks/useAnimatedCounter.ts`, `src/i18n/config.ts`, `src/lib/api.ts`.
- [x] 3.2 Fix Group 2: replace generic `any` types and add explicit return types in `src/components/ReviewModerationCard.tsx`, `src/components/InteractiveStarRating.tsx`, `src/scripts/cleanup.ts`, `src/lib/localData.ts`.
- [x] 3.3 Fix Group 3: update Prisma client usage after schema changes in `netlify/functions/lib/prisma.ts`, `netlify/functions/admin-approve.ts`, `netlify/functions/stripe-webhook.ts`.
- [x] 3.4 Fix Group 4: add optional chaining / nullish checks in `netlify/functions/businesses.ts`, `netlify/functions/reviews.ts`, `netlify/functions/stripe-webhook.ts`.
- [x] 3.5 Fix Group 5: propagate correct prop/state types in `src/pages/MeuNegocio.tsx` and align named exports.

> **Expanded scope (2026-08-07):** the tsc gate surfaced 48 errors across 17 files vs the ~32 planned.
> Extra fixes: shared `netlify/functions/lib/stripe.ts` (single `apiVersion` '2026-06-24.dahlia' source) in 6
> functions; owner-nullability guards in admin-approve/reject/beta-mode + stripe-checkout/webhook;
> `migrate-localstorage` (removed dead `b2BConversation` migration — model no longer in schema);
> `upload-image` (Blob wrapper for BlobInput), `delete-image` (`getMetadata`), `community-reviews`;
> root `tsconfig.json` now excludes `r2-upload-worker` (own tsconfig/wrangler context); stray
> `worker-draft.ts` deleted; `tests/businesses.test.ts` typed. Verified: `npx tsc --noEmit` exit 0.


## Phase 4: Testing & Verification

- [x] 4.1 RED test: `POST /api/reviews` without consumerId, expect 201 with `consumerId` derived and status `APPROVED` (mock `authenticateRequest`).
- [x] 4.2 GREEN test: make test pass by implementing consumerId derivation.
- [x] 4.3 REFRACTOR: tidy test helpers.
- [x] 4.4 RED test: `POST /api/businesses` with invalid CNPJ returns 400; valid CNPJ returns 201 with KYC fields.
- [x] 4.5 GREEN test: implement CNPJ validation wiring.
- [x] 4.6 RED test: Webhook idempotency – send same Stripe event twice, assert only one DB row and second call returns 200 without side‑effects.
- [x] 4.7 GREEN test: verify idempotency logic.
- [x] 4.8 RED test: `GET /api/businesses?minRating=4` returns only businesses with rating ≥ 4, excludes null rating.
- [x] 4.9 GREEN test: implement minRating filter.
- [x] 4.10 Type‑check gate: run `npx tsc --noEmit` and ensure exit status 0.
- [x] 4.11 Run `npm test` to confirm all unit tests pass.

## Phase 5: Cleanup / Documentation

- [x] 5.1 Update README snippets and comments explaining new business profile fields and idempotency table.
- [x] 5.2 Remove any temporary files or debug logs added during migration (stray `worker-draft.ts` deleted; no debug logs left).

## Next Steps
All 29 tasks complete (2026-08-07). `npx tsc --noEmit` exit 0, `npm test` 33/33, `npm run build` OK.
Ready for verify + archive (executed outside the SDD pipeline by maintainer decision).
