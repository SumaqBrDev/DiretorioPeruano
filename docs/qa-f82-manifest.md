# QA Manifest — F8.2 Regression (ConectaPeru)
**Date:** 2026-08-12
**Environment:** https://conectaperu.netlify.app (deploy 5d48af8, rebuild 6a7c0ea2)
**DB:** Neon fancy-fire-04103830 (DiretorioPeruano)
**QA password:** ConectaQA!2026

## Dataset state (after campaign)
- NEGOCIO_A = Cantina Don José (SP, restaurante, 4.5, 8 fotos, owneraprobado01)
- NEGOCIO_B = Serviços Técnicos Andino (RJ, servicios, 3.5) — soft-deleted during CP-031 (restore pending)
- Mercado Andino Gourmet → rejected (CP-030 test) — restore to approved for dataset consistency
- Chicheria Qhapaq QA v2 → approved, active-trial sub sub_1U3VaeAYoh7rSSl1EyW5e6rq (CP-029)
- Hostal Miraflores → rejected (restored after CP-018)
- Wiracocha → disabled (unchanged)
- Users QA emails retargeted to jarhkof.apps@gmail.com (Resend sandbox) — RESTORE at campaign end

## Defects found (to fix)
- BUG-031: SearchFilters writes ?rating= instead of ?minRating (contract AC2, low impact — Busca reads both)
- BUG-032: upload-image validates only declared contentType, not real content (PDF renamed .jpg passes) — CP-021
- BUG-032b: upload-image has NO 10-photo limit server-side (UI-only MAX_PHOTOS=10) — storage abuse
- BUG-033: my-business PUT accepts mutations on disabled businesses (backend doesn't enforce read-only) — AC14
- BUG-034: admin-businesses search broken when term has no digits — cnpjDigits='' → contains:'' matches ALL rows
- BUG-035: admin-delete writes canceled but Stripe webhook (subscription.updated, cancel_at_period_end) overwrites to trial — race/incoherence (disabled+trial)
- BUG-036: invoice.payment_succeeded webhook forces 'active' even for trial invoices (Stripe says trialing, DB says active)

## Cases verified (evidence)
- CP-001 ✅ landing, CP-003 ✅ i18n persist, CP-004 ✅ role gating, CP-005 ✅ 6 reviews,
- CP-006/007/008 ✅ search+filters+404 non-public, CP-009 ✅ detail, CP-010 ✅ gallery,
- CP-011 ✅ review 201, CP-012 ✅ validations, CP-013 ✅ 409 dup, CP-014 ✅ 403 business,
- CP-015/017 ✅ CNPJ validations + pending create, CP-018 ✅ rejected→pending resubmit,
- CP-019 ✅ own-business + anti-spoof, CP-020/021 partial (BUG-032/032b), CP-023 ✅ disabled banner+hidden,
- CP-024/025/026 ✅ inbox B2B + authz + archive/soft-delete, CP-027 ✅ admin APIs (search BUG-034),
- CP-028 ✅ beta ON approve, CP-029 ✅ beta OFF approve (trial sub + welcome email),
- CP-030 ✅ reject + email, CP-031 ✅ delete (BUG-035), CP-032 ✅ beta toggle,
- CP-033 N/A (feature removed), CP-036 ✅ payment_failed→past_due+email, CP-037 ✅ status mapping,
- CP-038 ✅ trial_will_end email, CP-039 ✅ 401 no mutation, CP-040 partial, CP-041 ✅ XSS escaped,
- CP-042 ✅ a11y probe
- CP-002/010-mobile/022/034/035: manual UI steps pending (user) — see report

## Stripe test objects
- sub_1U3VaeAYoh7rSSl1EyW5e6rq (Chicheria, trialing, R$59/mo) — ACTIVE in DB as 'active' (BUG-036)
- sub_1U1v4PAYoh7rSSl1dQgOEot2 (Serviços, canceled_at_period_end) — stale reference
- Old sub_1U3VZAAYoh7rSSl1ifVxbOHm + cus_V3coToh35dOBHi — orphaned by re-approve (was replaced)

## Cleanup needed (end of F8.2)
1. Restore QA user emails (jarhkof.apps@gmail.com → +conectaqua aliases)
2. Restore Mercado Andino → approved/active (was approved pre-campaign)
3. Restore Serviços Técnicos Andino → approved/active (soft-deleted in CP-031)
4. Restore Wiracocha → disabled/past_due (unchanged, verify)
5. Cancel/clean orphaned Stripe subs (sub_1U3VZAAYoh7rSSl1ifVxbOHm)
6. Revert ownerdisabled01 role → business (was elevated to superadmin for admin API tests)
