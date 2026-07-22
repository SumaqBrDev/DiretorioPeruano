# OpenSpec: DiretorioPeruano — Remaining Features

## Project Context
- **Project**: DiretorioPeruano (ConectaPeru)
- **Stack**: React + Vite + TypeScript + Tailwind + Clerk + Prisma + Netlify Functions + Stripe + Resend
- **Current State**: Gallery DONE, Onboarding fixed, Reviews fixed, B2B Chat fixed
- **Target**: Production-ready multi-sector directory for Peruvian businesses in Brazil

---

## Phase 1: Spec & Design (This Document)

### 1.1 Data Model Changes (Prisma)

```prisma
// Add to existing models

model BusinessProfile {
  // ... existing fields
  cnpj              String?         @unique
  ownerFullName     String?
  ownerBirthCity    String?
  status            BusinessStatus  @default(PENDING)
  rejectionReason   String?
  approvedAt        DateTime?
  stripeCustomerId  String?
  subscriptionId    String?
  subscriptionStatus String?
  trialEndsAt       DateTime?
  disabledAt        DateTime?
}

enum BusinessStatus {
  PENDING
  APPROVED
  REJECTED
  DISABLED
}

model Review {
  // ... existing fields
  status ReviewStatus @default(APPROVED) // Auto-approved now
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}

model SiteConfig {
  id        String   @id @default("singleton")
  betaMode  Boolean  @default(true)
  updatedAt DateTime @updatedAt
}
```

### 1.2 API Contracts (Netlify Functions)

#### Business Registration (Extended)
```
POST /api/businesses
Body: {
  name, description, category,
  address: { street, city, state, zip },
  tags, photos,
  cnpj, ownerFullName, ownerBirthCity
}
Response: 201 { business }
```

#### Superadmin: List Businesses
```
GET /api/admin/businesses?status=PENDING&page=1&limit=20
Headers: Authorization: Bearer <clerk-token>
Response: 200 { businesses: [], total, page, totalPages }
```

#### Superadmin: Get Business Detail
```
GET /api/admin/businesses/:id
Response: 200 { business, reviews, subscription }
```

#### Superadmin: Approve Business
```
POST /api/admin/businesses/:id/approve
Body: { }
Side effects:
  - Set status = APPROVED, approvedAt = now
  - Create Stripe Customer
  - Create Stripe Subscription with 30-day trial
  - Send welcome email (Resend)
Response: 200 { business, subscription }
```

#### Superadmin: Reject Business
```
POST /api/admin/businesses/:id/reject
Body: { reason: string }
Side effects:
  - Set status = REJECTED, rejectionReason = reason
  - Send rejection email (Resend)
Response: 200 { business }
```

#### Superadmin: Delete Business
```
DELETE /api/admin/businesses/:id
Body: { force?: boolean }
Side effects:
  - If has subscription: cancel Stripe subscription
  - Soft delete (status = DELETED) or hard delete if force
Response: 200 { success: true }
```

#### Superadmin: Toggle Beta Mode
```
POST /api/admin/config/beta-mode
Body: { enabled: boolean }
Response: 200 { betaMode: boolean }
```

#### Business Owner: Update Business
```
PUT /api/businesses/:id
Headers: Authorization (must own business)
Body: { name, description, category, address, tags, photos, cnpj, ownerFullName, ownerBirthCity }
Response: 200 { business }
```

#### Reviews: Create (Auto-approve)
```
POST /api/reviews
Body: { businessId, rating, comment }
Headers: Authorization (Clerk user)
Response: 201 { review }
```

#### Reviews: List (for business detail)
```
GET /api/reviews?businessId=:id
Response: 200 { reviews: [] }
```

#### Community Reviews (Home)
```
GET /api/community-reviews?limit=6
Response: 200 { reviews: [] } // 5-star, random, from approved businesses
```

#### Search (Fixed)
```
GET /api/businesses?q=&category=&city=&minRating=
Response: 200 { businesses: [] }
```

#### Stripe Webhook
```
POST /api/stripe/webhook
Headers: Stripe-Signature
Events: invoice.payment_failed, customer.subscription.deleted, customer.subscription.updated
```

---

### 1.3 UI Flows

#### Home - "O que a comunidade diz"
```
Section between Featured and CTA
├── Grid 3 cols (desktop) / 1 col (mobile)
├── 6 cards randomized on each load
├── Card: ⭐⭐⭐⭐⭐ + "Comentario" + "Autor - Negocio" + date
├── Only 5-star reviews from APPROVED businesses
└── Empty state: hidden if < 6 reviews exist
```

#### Search - Fixed Filters
```
Sidebar (desktop) / Modal (mobile)
├── Text search (q) → debounced 300ms
├── Category select (categoria)
├── City select (cidade) — populated from DB distinct cities
├── Rating select (minRating)
├── URL params sync perfectly
├── Results update without full reload
└── Loading skeletons during fetch
```

#### Business Detail - Review Form
```
Tab "Avaliações"
├── If logged in + hasn't reviewed: Show form
│   ├── InteractiveStarRating (1-5)
│   ├── Textarea (min 10 chars, max 500)
│   ├── Submit → POST /api/reviews
│   └── Toast success, appears in list
├── If already reviewed: "Você já avaliou"
├── List all reviews (newest first)
│   ├── Author avatar + name
│   ├── Stars + date
│   ├── Comment
└── Empty state
```

#### Business Detail - Photo Gallery
```
PhotoGallery component (existing) enhanced:
├── Main image + Main image click → Fullscreen modal
├── Thumbnails click → Swap main
├── Modal: ESC to close, click overlay to close, arrows to navigate
├── Touch swipe support mobile
└── All business photos (not just 4)
```

#### Meu Negócio - Gallery Management (DONE ✅)
```
Already implemented: upload (10 max), drag&drop, cover, delete, modal
```

#### Superadmin Dashboard
```
/admin
├── Header: "Painel Superadmin" + Beta Mode Toggle (prominent)
├── Stats Row: Total | Pendentes | Aprovados | Rejeitados | Desabilitados | Em Trial
├── Filters: Status, Search (name/CNPJ), Date range
├── Table: Nome | Dono | CNPJ | Cidade | Status | Trial Ends | Ações
│   ├── Ações: Ver | Aprovar | Rejeitar | Excluir
├── Modal "Ver": Detalhes completos + Subscription info
├── Modal "Aprovar": Confirmação → chama API → Stripe trial → email
├── Modal "Rejeitar": Textarea reason (required) → API → email
├── Modal "Excluir": Confirmação fuerte → cancel Stripe sub → delete
└── Pagination
```

#### Superadmin - Business Detail Modal
```
┌─────────────────────────────────────┐
│ [Nome]                    [Status]  │
├─────────────────────────────────────┤
│ Dono: [Nome] | CNPJ: [XX.XXX.XXX/...] │
│ Cidade origem: [Texto livre]          │
│ Endereço: [Completo]                  │
│ Categoria: [Tag]                      │
│ Criado: [Data]                        │
├─────────────────────────────────────┤
│ Subscription                          │
│ Stripe Customer: [cus_xxx]            │
│ Status: [trialing/active/past_due]    │
│ Trial ends: [Data] | Próximo cobro: $59 │
│ [Cancelar Subscription]               │
├─────────────────────────────────────┤
│ [Aprovar] [Rejeitar] [Excluir]        │
└─────────────────────────────────────┘
```

---

### 1.4 Stripe Integration

#### Product Setup (One-time, Manual in Dashboard)
```
Product: "Assinatura ConectaPeru - Mensal"
Price: R$ 59,00/mês (recurring monthly)
Metadata: product_type = "business_subscription"
```

#### On Approve (Auto)
```
1. Create Stripe Customer (email = business owner email)
2. Attach PaymentMethod later (Customer Portal)
3. Create Subscription:
   - price = monthly_59_brl
   - trial_period_days = 30
   - metadata: { businessId, clerkUserId }
4. Save stripeCustomerId, subscriptionId, trialEndsAt in BusinessProfile
5. Send welcome email with trial end date
```

#### Trial Ending Flow
```
- 3 days before trial_end: Email "Seu trial acaba em 3 dias"
- On trial_end: Stripe attempts payment
  - Success → active
  - Failed → past_due → email "Pagamento falhou, atualize cartão"
- 7 days past_due → BusinessProfile.disabledAt = now, status = DISABLED
  - Hidden from search
  - Owner can't edit (read-only Meu Negócio)
  - Owner sees "Atualize pagamento para reativar" + link to Customer Portal
```

#### Customer Portal
```
GET /api/stripe/portal
→ Creates Stripe Billing Portal session
→ Redirects to portal (update card, cancel, download invoices)
```

#### Webhook Events
```
invoice.payment_failed:
  - Mark subscription past_due
  - Send email

customer.subscription.updated:
  - Sync status to BusinessProfile
  - If canceled → status = DISABLED

customer.subscription.deleted:
  - BusinessProfile.disabledAt = now
```

---

### 1.5 Email Templates (Resend)

#### Welcome (On Approve)
```
Subject: 🎉 Seu negócio foi aprovado! Trial de 30 dias iniciado
Body:
  Olá [Owner Name],

  Seu negócio "[Business Name]" foi aprovado e está no ar!

  📅 Trial gratuito: 30 dias (até [trialEndDate])
  💰 Após trial: R$ 59,00/mês
  🔗 Acesse: [business-url]

  Configure seu pagamento antes do fim do trial:
  [Botão: Gerenciar Pagamento] → Stripe Customer Portal
```

#### Trial Ending (3 days before)
```
Subject: ⏰ Seu trial grátis acaba em 3 dias
Body:
  Olá [Owner Name],

  Seu trial de 30 dias para "[Business Name]" termina em [trialEndDate].

  Para continuar no ar, adicione um cartão:
  [Botão: Adicionar Cartão]

  Se não houver pagamento, seu negócio ficará oculto nas buscas.
```

#### Payment Failed
```
Subject: ❌ Pagamento falhou - Atualize seu cartão
Body:
  Não conseguimos cobrar R$ 59,00 para "[Business Name]".

  Atualize seu cartão aqui:
  [Botão: Atualizar Pagamento]

  Você tem 7 dias antes do negócio ser desabilitado.
```

#### Rejected
```
Subject: ❌ Seu cadastro precisa de ajustes
Body:
  Olá [Owner Name],

  Seu negócio "[Business Name]" não foi aprovado.

  Motivo: [rejectionReason]

  Você pode corrigir e reenviar em: [onboarding-url]
```

#### Beta Mode Toggle (Superadmin)
```
Internal notification only
```

---

### 1.6 Beta Mode Logic

```
SiteConfig.betaMode = true (default)

IF betaMode = true:
  - No Stripe charges ever
  - All approved businesses = "trial" indefinitely
  - No disabledAt, no payment emails
  - Superadmin sees 🟡 "MODO BETA ATIVO" banner
  - Trial emails NOT sent

IF betaMode = false:
  - Normal trial + billing logic applies
  - All existing beta businesses get trialEndsAt = now + 30 days
  - Stripe subscriptions created on next approve (or batch for existing)
```

---

### 1.7 CNPJ Validation (Receita Federal)

```
API: https://receitaws.com.br/v1/cnpj/{cnpj} (gratis, rate limited)
Alternative: https://publica.cnpj.ws/cnpj/{cnpj} (gratis, no auth)

Function validateCNPJ(cnpj: string):
  1. Strip non-digits
  2. If length !== 14: return { valid: false, error: "14 dígitos" }
  3. Check digit validation (mod 11)
  4. If check digits ok:
     - Try Receita Federal API (timeout 3s)
     - If success + status != "BAIXADA": return { valid: true, data }
     - If API fails: return { valid: true, warning: "Formato OK, API indisponível" }
  5. Return { valid: false, error: "Dígitos verificadores inválidos" }
```

---

### 1.8 Search Fix Details

**Current Issues:**
- Filters use wrong param names (`categoria` vs `category`, `cidade` vs `city`)
- City filter hardcoded, not from DB
- No debounce on text search
- URL params not fully synced

**Fix:**
- Param mapping: `categoria`→`category`, `cidade`→`city`, `rating`→`minRating`
- City select: `SELECT DISTINCT address->>'city' FROM BusinessProfile WHERE status='APPROVED'`
- Debounce 300ms on text input
- All filters in URL, shareable links work

---

### 1.9 Acceptance Criteria Checklist

| ID | Feature | Criteria |
|----|---------|----------|
| AC1 | Home Community Reviews | 6 random 5-star reviews, different businesses, refresh = new set |
| AC2 | Search Filters | All 4 filters work, URL updates, results accurate |
| AC3 | Business Detail Review | Form shows if logged in + not reviewed, submits, appears in list |
| AC4 | Business Detail Gallery | All photos viewable in fullscreen modal with navigation |
| AC5 | Meu Negócio Gallery | ✅ DONE - upload 10, cover, delete, reorder, modal |
| AC6 | Superadmin Dashboard | Stats, table, filters, pagination, actions work |
| AC7 | Superadmin Approve | Creates Stripe customer + 30-day trial sub, sends email |
| AC8 | Superadmin Reject | Saves reason, sends email, business can resubmit |
| AC9 | Superadmin Delete | Cancels Stripe sub, soft deletes |
| AC10 | Beta Mode | Toggle works, no charges in beta, normal flow when off |
| AC11 | Stripe Webhook | Handles payment_failed, subscription_updated, deleted |
| AC12 | Customer Portal | Owner can update card, cancel, download invoices |
| AC13 | CNPJ Validation | 14 digits + check digits + API lookup |
| AC14 | Disabled State | Hidden from search, read-only for owner, re-enable via portal |
| AC15 | Emails | All 4 templates send via Resend |

---

## Phase 2: Implementation Order (Recommended)

### Sprint 1: Data + Auth + Search
1. Prisma migrations (BusinessProfile + SiteConfig + enums)
2. Clerk webhook: sync superadmin role
3. Fix `/api/businesses` (search + filters + city distinct)
4. Fix `/api/community-reviews` (random 6, 5-star)

### Sprint 2: Superadmin + Stripe
5. `/api/admin/*` endpoints (list, detail, approve, reject, delete, beta-toggle)
6. Stripe webhook + Customer Portal endpoint
7. Resend email service + 4 templates
8. CNPJ validation utility

### Sprint 3: Frontend - Business Detail + Home
9. Home: CommunityReviews component
10. Search: Fix filters + city dropdown from API
11. Negocio: ReviewForm in ReviewsSection
12. Negocio: Enhanced PhotoGallery (fullscreen modal)

### Sprint 4: Superadmin UI
13. `/admin` page with dashboard
14. Modals: View, Approve, Reject, Delete
15. Beta mode banner + toggle

### Sprint 5: Meu Negócio + Polish
16. MeuNegocio: Read-only when disabled, portal link
17. Onboarding: Add CNPJ + ownerFullName + ownerBirthCity fields
18. E2E testing + Deploy

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Stripe webhook failures | Idempotency keys, retry logic, dead letter queue in Netlify |
| CNPJ API rate limits | Cache results 24h, fallback to format-only |
| Resend deliverability | Domain verification, SPF/DKIM, test emails |
| Clerk sync | Webhook + fallback API call on login |
| Migration data loss | Backup before migrate, test on staging |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@netlify/blobs": "^8.0.0",
    "stripe": "^14.0.0",
    "resend": "^3.0.0",
    "@clerk/clerk-sdk-node": "^4.0.0"
  }
}
```

---

## Approval

**Status**: Ready for Phase 2 implementation

**Next Action**: Run `npx prisma migrate dev` with schema changes, then implement API endpoints in order.