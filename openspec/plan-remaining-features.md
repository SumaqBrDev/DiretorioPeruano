# SDD Plan: DiretorioPeruano — Remaining Features (Post-Gallery)

## Overview
Complete remaining critical features for production readiness.

## Scope
- Home: "O que a comunidade diz" — 6 random 5-star reviews
- Search: Fix search + filters (currently broken)
- Business Detail: Add review form + full gallery view
- Superadmin: Dashboard with business approval workflow (pending/approved/rejected)
- Stripe Integration: 30-day trial, subscription lifecycle
- Beta Mode: Superadmin toggle, no charges during beta

## Architecture Decisions

### Data Model (Prisma)
```
BusinessProfile {
  // existing fields...
  status: "pending" | "approved" | "rejected" | "disabled"
  rejectionReason?: string
  approvedAt?: DateTime
  trialEndsAt?: DateTime
  subscriptionStatus: "trial" | "active" | "past_due" | "canceled" | "none"
  stripeCustomerId?: String
  stripeSubscriptionId?: String
  ownerFullName: String
  ownerBirthCity: String  // must be Peru
  cnpj: String
}
User {
  role: "consumer" | "business" | "admin" | "superadmin"
}
Review { status: "pending" | "approved" | "rejected" }
```

### API Functions (Netlify)
- `/api/businesses` — GET/POST (existing)
- `/api/businesses/:id/approve` — POST (superadmin)
- `/api/businesses/:id/reject` — POST (superadmin) 
- `/api/businesses/:id` — GET/PUT/DELETE
- `/api/reviews` — GET/POST (existing)
- `/api/superadmin/stats` — GET
- `/api/superadmin/businesses` — GET with status filter
- `/api/stripe/create-checkout` — POST
- `/api/stripe/webhook` — POST
- `/api/stripe/portal` — POST

### Frontend Pages
- `/busca` — Fix search + filters
- `/negocio/:id` — Add review form + full gallery
- `/meu-negocio` — Already has gallery ✅
- `/superadmin` — New dashboard page
- `/admin/subscription` — Subscription management (Stripe portal)

### Storage
- Business images: Netlify Blobs ✅
- Future migration: S3/Cloudflare R2 when volume grows

## SDD Phases

### Phase 1: Spec & Design (this session)
- [ ] Write OpenSpec with acceptance criteria
- [ ] Design data model changes
- [ ] Design API contracts
- [ ] Design UI flows

### Phase 2: Backend (next session)
- [ ] Prisma migrations
- [ ] Netlify Functions implementation
- [ ] Stripe webhook handling

### Phase 3: Frontend (next sessions)
- [ ] Home: Community reviews component
- [ ] Search: Fix filters + API integration
- [ ] Business Detail: Review form + Gallery view
- [ ] Superadmin Dashboard
- [ ] Subscription flow

### Phase 4: Testing & Deploy
- [ ] Integration tests
- [ ] Beta mode verification
- [ ] Deploy

---

## Acceptance Criteria Highlights

### Home - Community Reviews
- Shows exactly 6 reviews per load
- All 5-star, from different businesses
- Randomized on each page load
- Shows author, business name, rating, text, date

### Search - Fixed Filters
- Text search works (q param)
- Category filter works (categoria)
- City filter works (cidade)
- Rating filter works (rating)
- URL params update correctly
- Results update in real-time

### Business Detail
- "Deixe sua avaliação" form (if logged in, hasn't reviewed)
- Shows all business photos in gallery modal
- Review form: stars (1-5) + comment (min 10 chars)
- Submits to API, shows in list after approval

### Superadmin
- Login as superadmin (role in Clerk metadata)
- Dashboard: stats cards (total, pending, approved, rejected, disabled)
- Table of businesses with filters
- Actions: Approve (starts 30-day trial), Reject (with reason), Delete
- View business details modal

### Stripe + Trial
- On approve: create Stripe customer, create subscription with 30-day trial
- Trial ends → charge R$ XX/month
- If payment fails → past_due → disabled (not visible in search, owner can't edit)
- Superadmin can cancel subscription
- Customer portal for payment method update

### Beta Mode
- Superadmin toggle in dashboard
- When ON: no Stripe charges, all businesses "trial" indefinitely
- When OFF: normal trial + billing logic applies
- Banner in superadmin dashboard showing beta status

---

## Questions for User (Blockers)

1. **Stripe Price ID**: What's the monthly price in BRL? (e.g., R$ 59,00/mês)
2. **Trial Days**: Confirm 30 days exactly?
3. **Superadmin User**: Which Clerk user ID(s) are superadmin? (Need to set in Clerk publicMetadata)
4. **CNPJ Validation**: Just format (14 digits) or validate against Receita Federal API?
5. **Owner Birth City**: Must be a city in Peru — validate against list?
6. **Review Approval**: Auto-approve or pending moderation?
7. **Email Notifications**: Send emails on approve/reject/trial ending? (Resend/SendGrid?)
8. **Migration Target**: S3, Cloudflare R2, or Supabase Storage for post-beta?
9. **Search Index**: Use Postgres full-text or Meilisearch/Algolia later?

---

## Notes
- Gallery ✅ DONE (Netlify Blobs, 10 photos, drag&drop, modal, cover, delete)
- Keep using localStorage fallback for offline resilience
- All new API functions need auth checks (Clerk session)
- Superadmin = Clerk publicMetadata.role === "superadmin"
- Business owner = Clerk publicMetadata.role === "business" + owns BusinessProfile