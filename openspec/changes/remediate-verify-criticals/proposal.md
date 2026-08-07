# Proposal: Remediate‑Verify‑Criticals

## Intent
Fix TS errors, generate Prisma client, align subscription IDs, enable auto‑approve reviews with Clerk auth, add KYC persistence, introduce server‑side minRating, secure webhook with idempotency, and enforce disabled‑user UX.

## Scope

### In Scope
- Resolve 32 `tsc` errors.
- Generate Prisma client and wire in Netlify.
- Rename `stripeSubscriptionId` → `subscriptionId` across five functions.
- Auto‑approve reviews; enforce Clerk auth on POST `/api/reviews`.
- Persist `cnpj`, `ownerFullName`, `ownerBirthCity` using `validateCnpj`/`lookupCnpj`.
- Server‑side `minRating` filter; rename `rating` → `minRating`.
- Webhook: set `disabledAt`, `status=DISABLED`; add idempotency.
- MeuNegocio: read‑only when disabled; banner + portal link.
- Stripe portal: add ownership/superadmin check.

### Out of Scope
- City dropdown, debounce, `SearchFilters.tsx` rewrite.
- Forced cancel flow change.

## Capabilities

### New
- `prisma-generation`
- `type-check-gate`
- `stripe-subscription-sync`
- `review-approval`
- `business-registration-kyc`
- `search-minrating-filter`
- `stripe-webhook-integrity`
- `business-disabled-state`
- `portal-auth-guard`

### Modified
- `prisma-client-dist`
- `review-status-default`
- `business-registration-fields`
- `search-filter-endpoint`
- `stripe-webhook`
- `portal-endpoint`

## Approach
1. Apply TS fixes (imports, any, apiVersion, R2).
2. Add `prisma generate` to `netlify.toml`; upgrade client.
3. Replace `stripeSubscriptionId` references.
4. Set Review status default to `APPROVED`; add Clerk middleware.
5. Call `validateCnpj`/`lookupCnpj` in POST `/api/businesses`.
6. Update `/api/businesses` to accept `minRating`.
7. Wrap webhook with idempotency cache; set status/disabledAt.
8. Guard MeuNegocio for disabled state; add banner/portal link.
9. Verify portal auth before session.

## Affected Areas
| Path | Impact | Effort |
|------|--------|--------|
| `src/**/*.ts` | TS fixes | Medium |
| `netlify.toml` | Add `prisma generate` | Low |
| `prisma/schema.prisma` | Field sync | Low |
| `netlify/functions/**` | Review, registration, search, webhook, portal updates | High |
| `src/components` | MeuNegocio UX | Medium |
| `src/hooks` | Clerk middleware | Low |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regression in flows | Medium | CI test coverage |
| Prisma client breakage | Low | Local builds |
| Webhook idempotency errors | Medium | Cache & retries |
| Clerk auth bypass | Low | Token validation |

## Rollback Plan
1. Remove `prisma generate` step.
2. Delete generated client.
3. Revert `subscriptionId` changes.
4. Restore review status to `PENDING`.
5. Disable KYC/minRating changes.
6. Disable webhook idempotency and status updates.

## Dependencies
- `@prisma/client` v7, `prisma` CLI.
- `stripe`, `resend`, `@clerk/clerk-sdk-node`.
- Redis for webhook cache.

## Success Criteria
- `npx tsc --noEmit` exits 0.
- `node_modules/.prisma/client` built on CI.
- POST `/api/reviews` returns `APPROVED` with Clerk derived `consumerId`.
- POST `/api/businesses` stores `cnpj`, `ownerFullName`, `ownerBirthCity` and validates CNPJ.
- `/api/businesses?minRating=4` returns matching items.
- Webhook sets `status=DISABLED`; `disabledAt` is stored; idempotent.
- MeuNegocio read‑only UX with banner for disabled.
- All criticals and specified warnings pass verification.
