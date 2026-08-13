# PRODUCT.md — ConectaPeru (DiretorioPeruano)

> **Estado actual:** ✅ **MVP COMPLETO + RELEASE VALIDADO** — migración `localStorage → API` cerrada (F3.x–F8.1) y **F8.2 (regresión E2E contra producción) CERRADA** el 12/08/2026.
> **Stack:** React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui + Clerk + Prisma + Neon (PostgreSQL) + Netlify Functions + Netlify Blobs + Stripe + Resend
> **Última actualización:** 12/08/2026
> **Commit de referencia:** `cea0715` (*fix(qa): paginate blob listing for accurate photo cap (BUG-032b)*) — cierre de campaña F8.2
> **Checklist SDD:** ✅ **24/24 fases** — F8.2 cerrada (regresión E2E + codegraph index + commit de cierre)

---

## Identidad del Producto

| Campo      | Valor                                                                                   |
|------------|-----------------------------------------------------------------------------------------|
| **Nombre** | ConectaPeru                                                                            |
| **Tagline**| *O Hub do Empreendedor Peruano no Brasil / El Hub del Emprendedor Peruano en Brasil*          |
| **Tipo**   | Diretório Multi-Setorial de negócios peruanos no Brasil (Gastronomia, Serviços, Saúde, etc.) |
| **Propósito** | Conectar a comunidade peruana no Brasil e dar visibilidade aos negócios e empreendedores de todos os setores |

---

## Visão Atual do Produto

Peruanos que vivem no Brasil carregam consigo a força do trabalho, cultura e serviços do seu país. O **ConectaPeru** é o hub digital dessa comunidade: um diretório moderno e escalável onde negócios peruanos de qualquer setor (gastronomia, estética, consultoria, mercados, tecnologia) podem se registrar, exibir seus produtos e serviços, e construir uma rede forte.

A plataforma começa com destaque para a **gastronomia**, mas nasce arquitetada como um ecossistema multi-setorial desde o dia um.

**Modelo de negócio:** freemium com trial de 30 dias → após trial, assinatura mensal (R$ 59/mês) via Stripe. **Modo Beta** ativo por padrão (sem cobranças) até decisão de lançamento.

**Estado arquitetural (04/08/2026):** el frontend ya **no** usa `localStorage` como fuente de datos primaria. Toda la capa de presentación consume la API de Netlify Functions (capa `src/lib/api.ts`). `localStorage` se preserva solo como **fallback** durante la migración y como utilidad de seed. El checklist SDD quedó en **23/24**; lo único pendiente es la verificación E2E contra producción (F8.2).

---

## Público-Alvo

### Consumidores
- Peruanos que vivem no Brasil e buscam comida, produtos e serviços da sua cultura.
- Brasileiros com interesse na culinária e cultura peruana.

### Negócios (Business)
- Restaurantes e lanchonetes peruanas no Brasil (foco inicial).
- Futuramente: mercados, salões de beleza, serviços profissionais, etc.
- Donos de negócio que querem visibilidade e conexão com sua comunidade.

### Administradores (Superadmin)
- Equipe interna responsável por aprovar/rejeitar cadastros, moderar conteúdo, gerenciar assinaturas e saúde da plataforma.
- Acesso via role `superadmin` no Clerk (`publicMetadata`), verificado no PostgreSQL em cada requisição protegida.

---

## ✅ Funcionalidades Implementadas (Produção)

### 1. Migración `localStorage → API` (completa)
- Capa de cliente **`src/lib/api.ts`** (~515 líneas) con firma async, `Authorization: Bearer <Clerk token>`, manejo de errores con `ApiError`.
- Todas las páginas migradas: **SuperAdmin, MeuNegocio, Inbox, Onboarding, Busca, Negocio, Home (+ componentes), Admin**.
- Endpoint **`migrate-localstorage`** (solo superadmin, no destructivo): lee datos locales (negocios/reviews/conversaciones), los envía al API, reporta conteos y permite borrar el local.
- `localStorage` permanece como **fallback** y seed (función de utilidad `localData.ts`).

### 2. Catálogo de Negócios Público
- Listagem paginada com cards visuais por categoria.
- Busca com **debounce 300ms**, filtros: **categoria**, **cidade** (dropdown do BD), **busca textual** (nome/endereço/tags), **rating mínimo**. URL params sincronizados.
- Dados servidos por `GET /api/businesses` (filtros `q`, `category`, `city`, `minRating`).

### 3. Página do Negócio (`/negocio/:id`)
- Dados completos servidos por **`GET /api/business-detail?id=`**: galeria, endereço, descrição, tags, horário, contato (telefone/WhatsApp/Instagram/website).
- **Sistema de reviews** vía `GET /api/reviews?businessId=` (aprovadas) y `POST /api/reviews` (criar). Auto-aprovação na v1.
- Galeria fullscreen (navegação setas/teclado, swipe mobile, ESC).

### 4. Autenticação e Onboarding (Clerk)
- Provedor: **Clerk** (social Google + email/senha).
- **Fluxo de onboarding multi-step** pós-login (dados básicos, endereço, contato, CNPJ, dados do dono com cidade de nascimento no Peru, fotos, tags).
- Registro cria o negócio via **`POST /api/businesses`** con status `pending`.
- Estado inicial: `pending` → aguarda aprovação do superadmin.

### 5. Painel "Meu Negócio" (Business Owner) — `/meu-negocio`
- CRUD completo via **`GET /api/my-business`** e **`PUT /api/my-business`**.
- **Gestão de galeria completa**: upload até 10 fotos (drag&drop + file input) via `POST /api/upload-image` (multipart, Netlify Blobs, JPEG/PNG/WebP, máx 5MB), cover, reordenar, excluir (`DELETE /api/delete-image`), modal fullscreen.
- **Estado `disabled` (pagamento falhou / superadmin):** painel **somente leitura** + banner "Atualize seu pagamento" com link para **Stripe Customer Portal**.
- Botão **"Assinar / Ativar"** → `POST /api/stripe-checkout` (subscription monthly) y **"Gerenciar Assinatura"** → `POST /api/stripe-portal`.

### 6. Sistema de Avaliações (Reviews)
- Consumidor logado: pode avaliar (1-5 estrelas + comentário) **uma única vez por negócio**.
- **Auto-aprovação** na v1 (status `approved` direto).
- Negócio **não** pode avaliar outro negócio (validação backend via role Clerk).
- Exibição na página do negócio + seção "O que a comunidade diz" no Home.

### 7. Seção Home: "O que a comunidade diz" + seções dinâmicas
- Todas as seções consumem endpoints públicos de **`useHomeStore`** (Zustand):
  - **Categorias:** `GET /api/categories`
  - **Destaques (carrossel):** `GET /api/featured`
  - **Nossos Números:** `GET /api/stats`
  - **Depoimentos:** `GET /api/testimonials`
  - **Comunidade (6 reviews aleatórios 5⭐ de negócios diferentes):** `GET /api/community-reviews`
- Estados de loading (skeleton), error (retry) y vacío en cada sección.

### 8. Inbox B2B entre Negócios
- Canal privado de mensagens diretas exclusivo entre contas **business**.
- Endpoint **`/api/messages`** (Netlify), consumido por `src/lib/api.ts`:
  - `GET ?businessId=&archived=all` → resumen de conversaciones agrupadas por partner.
  - `GET ?businessId=&conversationWith=` → hilo completo (orden ascendente).
  - `POST` → enviar mensaje.
  - `PUT { action: mark-read | archive | unarchive }`.
  - `DELETE` → soft-delete (oculta 30 días, recuperable).
- Modelo `Message` con flags `read`, `archived`, `deletedAt` (JSONB en Neon).
- Autocomplete de negocios al redactar vía `GET /api/businesses` (`limit=50`).

### 9. Superadmin Dashboard (`/admin` — SuperAdmin.tsx) ✅ IMPLEMENTADO
| Feature | Estado | Detalles |
|---------|--------|----------|
| Stats cards | ✅ | `GET /api/admin-businesses` + cálculo local: Total, Pendentes, Aprovados, Rejeitados, Desabilitados, Em Trial |
| Tabela de negócios | ✅ | Filtros por status, busca (nome/CNPJ/owner), paginação (`page`, `limit`), ordenação por `createdAt desc` |
| Ações | ✅ | Ver detalhes, **Aprovar**, **Rejeitar** (motivo obrigatório), **Excluir** |
| Modal "Aprovar" | ✅ | **`POST /api/admin-approve`** → cria Stripe Customer + Subscription (trial 30d) → email boas-vindas |
| Modal "Rejeitar" | ✅ | **`POST /api/admin-reject`** → salva motivo + email rejeição → negócio pode reenviar |
| Excluir | ✅ | **`POST /api/admin-delete`** → cancela Stripe sub + soft delete |
| Beta Mode Toggle | ✅ | **`GET/POST /api/admin-beta-mode`** + banner "MODO BETA ATIVO" |

### 10. Stripe Integration (Billing) ✅ IMPLEMENTADO
| Feature | Estado | Detalles |
|---------|--------|----------|
| Checkout | ✅ | **`POST /api/stripe-checkout`** `{ businessId, plan: 'monthly' }` → URL de checkout |
| On Approve (auto) | ✅ | `admin-approve` → Create Customer → Create Subscription (`trial_period_days=30`, `payment_behavior='default_incomplete'`, `save_default_payment_method='on_subscription'`) → `stripeCustomerId`, `subscriptionId`, `trialEndsAt` → email welcome |
| Customer Portal | ✅ | **`POST /api/stripe-portal`** → redirect para gerenciar cartão, cancelar, baixar faturas |
| Webhooks | ✅ | **`POST /api/stripe-webhook`** (verificação de assinatura Stripe): `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.payment_succeeded` |
| Estado DISABLED | ✅ | `past_due` marcado; `status=disabled` → oculto na busca, painel read-only, link portal para reativar (AC14) |
| Beta Mode logic | ✅ | Se `SiteConfig.betaMode=true`: sem cobranças, trials infinitos, emails de trial **não** enviados; se `false`: criação de customer + subscription real |

**Mapeo de status (`lib/subscription.ts`):** `trialing→trial`, `active→active`, `past_due→past_due`, `canceled/unpaid→canceled`, `incomplete/incomplete_expired→none`.

### 11. Emails (Resend) ✅ IMPLEMENTADO (`netlify/functions/lib/email.ts`)
| Template | Trigger |
|----------|---------|
| **Welcome** (`sendApprovalEmail`) | Superadmin aprova negócio (`admin-approve`) |
| **Trial ending** (`sendTrialEndingEmail`, 3 dias) | Webhook `customer.subscription.trial_will_end` |
| **Payment failed** (`sendPaymentFailedEmail`) | Webhook `invoice.payment_failed` |
| **Rejected** (`sendRejectionEmail`) | Superadmin rejeita cadastro (`admin-reject`) |

### 12. Validação de CNPJ ✅ IMPLEMENTADO (`netlify/functions/lib/cnpj.ts`)
- Formato: 14 dígitos + dígitos verificadores (**mod 11**).
- Función pura con cobertura de tests (`tests/cnpj.test.ts`).

### 13. Autenticação Backend ✅ IMPLEMENTADO (`netlify/functions/lib/auth.ts`)
- Verificação criptográfica do token Clerk (`requireSuperAdmin`, validação de role no PostgreSQL).
- Todas as funções protegidas (`/api/admin/*`, `/api/my-business`, etc.) exigem token válido.

### 14. Seleto de Idioma (i18n)
- Alternância **PT-BR ↔ ES-PE** em toda a interface (`src/i18n/config.ts`).
- Framework **i18next** com namespaces (`common`, `auth`, `business`, `review`, `admin`).
- Persistência: `localStorage` (visitantes) / perfil do usuário (logados).

### 15. Landing Page Pública
- Hero, Como Funciona, Categorias em Destaque, Restaurantes em Destaque (carrossel dos mais bem avaliados APROVADOS), Nossos Números (contadores animados), Depoimentos, Para Seu Negócio (CTA), Footer.

---

## Funcionalidades Em Desenvolvimento / Planejadas (Próximas Sprints)

### 🔄 Pendente atual (bloqueio de release)
| Item | Estado | Detalles |
|------|--------|----------|
| **F8.2 E2E contra producción** | 🔴 Pendente | Regresión AC1–AC15 sobre el sitio desplegado, `codegraph index .`, commit final de cierre. Es el único ítem del checklist SDD sin cerrar. |

### 🟡 Planejadas (post-release)
| Feature | Detalles | Estado |
|---------|----------|--------|
| **Comunidad (foro)** | ✅ **IMPLEMENTADA 12/08/2026** — temas, comentarios estilo TikTok (un nivel + @autor), votos like/dislike en temas y respuestas, búsqueda, moderación post-publicación (reporte + cola superadmin). Lectura pública; participación solo registrados (todos los roles). Endpoints: `/api/community`, `/api/admin-community`. Páginas: `/comunidad`, `/comunidad/:id`, `/admin/comunidade`. | ✅ |
| **Moderação de reviews** | Fila `pending → approve/reject` en admin | 🟡 |
| **Resposta do negócio aos reviews** | Threads de resposta | 🟡 |
| **Painel do negócio: métricas** | Visualizações, clicks WhatsApp, reviews recebidas | 🟡 |
| **Busca full-text** | Postgres FTS ou Meilisearch | 🟡 |
| **Planos Free vs Premium** | Destaque no diretório | 🟡 |
| **Migração storage** | Netlify Blobs → S3/R2 cuando el volumen crezca | 🟡 |
| **PWA / App mobile** | React Native | 🟡 |
| **Notificaciones** | Email/InApp para review novo, mensagem inbox, etc. | 🟡 |

---

## Regras de Negócio (Hard Rules)

### Roles (Clerk `publicMetadata` ↔ `User.role` en PostgreSQL)
| Role | Permissões |
|------|------------|
| `consumer` | Avaliar, comentar, usar inbound de inbox (apenas se business no destino) |
| `business` | Gerenciar seu negócio, responder reviews, inbox B2B, **não pode** avaliar outros negócios |
| `superadmin` | Acesso total ao `/admin`, aprovar/rejeitar/excluir negócios, toggle beta mode, migrar dados |

### Status do Negócio (`BusinessProfile.status`)
```
pending   → Aguardando revisão do superadmin (recém cadastrado)
approved  → Ativo, visível na busca, trial ou assinatura ativa
rejected  → Superadmin rejeitou (motivo salvo); dono pode corrigir e reenviar
disabled  → Pagamento falhou (7 dias past_due) ou superadmin desabilitou; oculto na busca, painel read-only
(deleted  → soft delete via status/subscription cancelada)
```

### SubscriptionStatus
```
none      → sem assinatura (beta mode ou ainda não aprovado com cobrança)
trial     → período de trial (30 dias)
active    → pagamento em dia
past_due  → pagamento atrasado (7 dias até disabled)
canceled  → assinatura cancelada/excluída
```

### Trial & Billing
- Trial: **30 dias** a partir da aprovação do superadmin (`STRIPE_TRIAL_DAYS`, default 30).
- Preço: **R$ 59,00/mês** (`STRIPE_PRICE_ID`).
- **Early-bird de lançamento (Opção A, decidido 12/08/2026):** cupom `EARLY_BIRD_COUPON_ID`
  (amount_off R$20, duration=repeating, 3 meses) → **R$ 39/mês nas 3 primeiras faturas**, R$ 59 depois.
  Aplicado em `stripe-checkout.ts` (`discounts`) e `admin-approve.ts` (`coupon`) quando a env var
  existe; remover a env var desativa a oferta sem tocar código.
- **Estado LIVE (12/08/2026):** conta `jarhkof.apps@gmail.com` (acct_1TFRvKAYoh7rSSl1) —
  product "Subscripcion ConectaPeru" + price `price_1U3mWKAYoh7rSSl1kIFlJ2z9` (5900 BRL/mês, ativo);
  cupom early-bird **`QdNMZlb5`** (R$20 off × 3) criado e validado (session test: 5900→3900).
  `EARLY_BIRD_COUPON_ID=QdNMZlb5` setado na Netlify (deploy `6a7d1337`).
- Beta Mode ON: **sem cobranças nunca**, trials infinitos, emails de trial desativados.
- Transição Beta → Produção: negócios existentes ganham `trialEndsAt = now + 30 dias`.

### ⚠️ Checklist de saída do Beta (Stripe TEST → LIVE)
> O deploy atual roda com **keys TEST** (STRIPE_SECRET_KEY sk_test, STRIPE_PRICE_ID price_1U1mfDAY… = price de TEST,
> webhook whsec de TEST). A conta LIVE já tem tudo pronto. Para ligar cobranças reais, trocar NO Netlify:
1. `STRIPE_SECRET_KEY` → **sk_live_…** (conta jarhkof.apps@gmail.com)
2. `STRIPE_PRICE_ID` → **`price_1U3mWKAYoh7rSSl1kIFlJ2z9`** (R$59/mês LIVE)
3. `STRIPE_WEBHOOK_SECRET` → whsec de LIVE + criar endpoint webhook `/api/stripe-webhook` em LIVE
   com os eventos: `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`,
   `customer.subscription.trial_will_end`, `invoice.payment_succeeded`, `checkout.session.completed`
4. `EARLY_BIRD_COUPON_ID=QdNMZlb5` já está setado (mesmo cupom vale em LIVE)
5. **Pix:** NÃO habilitado na conta LIVE (capabilities sem `pix_payments`) — ativar no dashboard
   (Configurações → Métodos de pagamento) antes de sair do beta se quiser Pix no checkout

### Reviews
- Auto-aprovados na v1 (`status: approved`).
- Um consumidor = uma review por negócio.
- Negócio (role `business`) **bloqueado** de deixar review em outro negócio (403 no backend).
- Mínimo 10 caracteres no comentário.

### Busca & Filtros
- Parâmetros URL: `q` (texto), `category`, `city`, `minRating`.
- Cidade: `SELECT DISTINCT address->>'city' FROM BusinessProfile WHERE status='approved'`.
- Debounce 300ms no input textual; skeleton loaders durante fetch.

### Galeria de Fotos
- Máx 10 fotos por negócio; máx **5MB** por arquivo.
- Formatos: **JPEG, PNG, WebP** (`ALLOWED_TYPES` no `upload-image.ts`).
- Armazenamento: **Netlify Blobs** (store `business-photos`), URL `/.netlify/blobs/business-photos/<businessId>/<timestamp>-<random>.<ext>`.
- Upload `multipart/form-data` (parser não-streaming para Netlify Functions v1).

---

## 🗄️ Arquitetura de Dados (Prisma Schema — Neon PostgreSQL)

> **Importante:** el modelo usa **JSONB** para `address` y `contact`, y el modelo `Message` (no `B2BConversation`/`B2BMessage` estructurado), por ser lo que está aplicado y poblado en producción (Neon). Ids con `dbgenerated("gen_random_uuid()")`.

```prisma
// datasource provider = "postgresql"  (Neon)

model User {
  id        String   @id @default(dbgenerated("gen_random_uuid()"))
  clerkId   String?  @unique
  email     String?
  name      String?
  role      String   @default("consumer") // consumer, business, admin, superadmin
  language  String   @default("pt-BR")

  business  BusinessProfile?
  reviews   Review[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model BusinessProfile {
  id                 String   @id @default(dbgenerated("gen_random_uuid()"))
  name               String?
  description        String?
  category           String   @default("restaurante")

  address            Json?    // JSONB: street, number, neighborhood, city, state, zip, lat, lng
  tags               String[]
  photos             String[]
  contact            Json?    // JSONB: phone, whatsapp, instagram, website

  status             String   @default("pending") // pending, approved, rejected, disabled

  ownerId            String?  @unique
  owner              User?    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  cnpj               String?  @unique
  ownerFullName      String?
  ownerBirthCity     String?
  rejectionReason    String?
  approvedAt         DateTime?
  disabledAt         DateTime?

  stripeCustomerId   String?  @unique
  subscriptionId     String?
  subscriptionStatus String?  // none, trial, active, past_due, canceled
  trialEndsAt        DateTime?

  reviews            Review[]
  sentMessages       Message[] @relation("BusinessSentMessages")
  receivedMessages   Message[] @relation("BusinessReceivedMessages")

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  @@index([status])
  @@index([ownerId])
  @@index([category])
}

model Review {
  id          String          @id @default(dbgenerated("gen_random_uuid()"))
  rating      Int?
  comment     String?
  status      String          @default("pending") // pending, approved
  business    BusinessProfile @relation(fields: [businessId], references: [id], onDelete: Cascade)
  businessId  String
  consumer    User            @relation(fields: [consumerId], references: [id], onDelete: Cascade)
  consumerId  String
  createdAt   DateTime        @default(now())
  @@index([businessId])
  @@index([status])
}

model Message {
  id              String          @id @default(dbgenerated("gen_random_uuid()"))
  fromBusiness    BusinessProfile @relation("BusinessSentMessages", fields: [fromBusinessId], references: [id], onDelete: Cascade)
  fromBusinessId  String
  toBusiness      BusinessProfile @relation("BusinessReceivedMessages", fields: [toBusinessId], references: [id], onDelete: Cascade)
  toBusinessId    String
  body            String?
  read            Boolean         @default(false)
  archived        Boolean         @default(false)
  deletedAt       DateTime?
  createdAt       DateTime        @default(now())
  @@index([fromBusinessId])
  @@index([toBusinessId])
  @@index([read])
}

model SiteConfig {
  id        String   @id @default("singleton")
  betaMode  Boolean  @default(true)
  updatedAt DateTime @updatedAt
  @@unique([id])
}
```

**Migraciones aplicadas (idempotentes):** `apply_schema.sql` (schema base: address/contact JSONB, Message), `prisma/migration_manual.sql` (colunas billing/KYC), `supabase_migration.sql` (`archived`/`deletedAt` em Message).

---

## 🔌 API Contracts (Netlify Functions) — ESTADO REAL

> Base: `/.netlify/functions/*` (redirect `/api/*` en `netlify.toml`). Auth: `Authorization: Bearer <Clerk token>`. Base relativa (`API_BASE = ''`).

### Públicas (token opcional/vacio)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/businesses?q=&category=&city=&minRating=&limit=` | Busca aprovados + filtros + paginação (usado también por autocomplete B2B) |
| GET | `/api/business-detail?id=` | Detalhe do negócio aprovado |
| GET | `/api/categories` | Categorias do Home (slug, name multilingue, icon, count) |
| GET | `/api/featured` | Negócios em destaque (carrossel) |
| GET | `/api/stats` | Cards de estatísticas do Home |
| GET | `/api/testimonials` | Depoimentos da landing |
| GET | `/api/community-reviews` | 6 reviews aleatórios 5⭐ de negócios diferentes |
| GET | `/api/reviews?businessId=` | Listar reviews aprovados de um negócio |
| POST | `/api/reviews` | Criar review (auth, role consumer) |

### Protegidas (Business Owner / Onboarding)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/businesses` | Cadastro novo negócio (onboarding) |
| GET | `/api/my-business` | Meu negócio (dados completos) |
| PUT | `/api/my-business` | Atualizar meu negócio (name, description, category, tags, photos, address, contact, cnpj, owner) |
| POST | `/api/upload-image` | Upload foto (multipart, Netlify Blobs) |
| DELETE | `/api/delete-image` | Excluir foto |
| POST | `/api/stripe-checkout` | Criar checkout subscription `{ businessId, plan: 'monthly' }` |
| POST | `/api/stripe-portal` | Criar sessão Stripe Customer Portal |
| GET | `/api/messages?businessId=` | Resumo de conversas B2B agrupadas por partner |
| GET | `/api/messages?businessId=&conversationWith=` | Hilo completo |
| POST | `/api/messages` | Enviar mensagem B2B |
| PUT | `/api/messages` | `{ action: mark-read | archive | unarchive }` |
| DELETE | `/api/messages` | Soft-delete conversa |

### Superadmin (`/api/admin/*` — requer role `superadmin` verificado)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin-businesses?status=&search=&page=&limit=` | Listar com filtros + paginação (nome/CNPJ/owner) |
| POST | `/api/admin-approve` | Aprovar `{ businessId }` → cria Stripe customer + trial sub + email welcome |
| POST | `/api/admin-reject` | Rejeitar `{ businessId, reason }` → email rejeição |
| POST | `/api/admin-delete` | Excluir `{ businessId }` (cancela Stripe sub) |
| GET | `/api/admin-beta-mode` | Ler beta mode |
| POST | `/api/admin-beta-mode` | Toggle beta mode `{ betaMode }` |
| POST | `/api/migrate-localstorage` | Migrar dados locais → API (superadmin, no destructivo, reporta conteos) |

### Stripe Webhook
| Método | Endpoint | Eventos |
|--------|----------|---------|
| POST | `/api/stripe-webhook` | `checkout.session.completed` (ads one-time), `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.payment_succeeded` |

### Anúncios pagos na Comunidade (Opción A+B)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/ad-checkout` | Cria anúncio pago (R$30/30 dias, só negócios aprovados com assinatura ativa). Beta mode ativa sem Stripe; produção cria Checkout Session `mode=payment` e o webhook ativa após `checkout.session.completed` |
| GET | `/api/ads` | Anúncios ativos (público): sidebar 300×250 + card patrocinado acima da lista de temas. Ordenação: expiração mais próxima primeiro |
| GET | `/api/admin-finance` | Dashboard financeiro (superadmin): receita de assinaturas (ativas × R$59) + receita de anúncios (pagos × R$30) + tabelas detalhadas de assinaturas ativas e anúncios |

---

## 🧱 Funções Netlify (24 archivos — `netlify/functions/`)

`ad-checkout.ts`, `ads.ts`, `admin-approve.ts`, `admin-beta-mode.ts`, `admin-business-detail.ts`, `admin-businesses.ts`, `admin-delete.ts`, `admin-reject.ts`, `business-detail.ts`, `businesses.ts`, `categories.ts`, `community-reviews.ts`, `delete-image.ts`, `featured.ts`, `messages.ts`, `migrate-localstorage.ts`, `my-business.ts`, `reviews.ts`, `stats.ts`, `stripe-checkout.ts`, `stripe-portal.ts`, `stripe-webhook.ts`, `testimonials.ts`, `upload-image.ts`.

**Libs compartidas (`netlify/functions/lib/`):** `auth.ts` (verificação Clerk/role), `cnpj.ts` (validação mod 11), `email.ts` (Resend, 4 templates), `prisma.ts` (client singleton), `subscription.ts` (mapeo status Stripe), `stripe.ts` (client), `blobs.ts`/store.

---

## UI/UX — Design System

### Paleta de Cores (Implementada)

| Nome         | Hex       | Uso                                              |
|--------------|-----------|--------------------------------------------------|
| Ají Rojo     | `#C0392B` | Cor primária, CTAs principais                    |
| Oro Inca     | `#F39C12` | Destaques, badges, estrelas                      |
| Verde Brasil | `#27AE60` | Ações secundárias, elementos positivos           |
| Creme Andino | `#FAF3E0` | Fundo claro, cards                               |
| Noche Lima   | `#1A1A2E` | Fundo escuro, texto principal no modo escuro     |
| Branco Pisco | `#FFFFFF` | Backgrounds, espaço negativo                     |

### Tipografia
- **Títulos:** *Geist* — moderna, geométrica, ar de plataforma tech (bundlada via woff2).
- **Corpo/UI:** *Geist* / syste... — legibilidade máxima.

### Animações (Framer Motion)
- Hero: fade + slide up + padrão têxtil andino animado (SVG).
- Cards: hover 3D tilt sutil + elevação sombra.
- Skeletons nos cards durante carregamento.
- Scroll-reveal (IntersectionObserver) nas seções.
- Contadores animados em "Nossos Números".
- Carrossel fotos: swipe transition.
- Toasts animados (sucesso/erro).

---

## 🗺️ Roadmap de Fases (SDD — ConectaPeru PostgreSQL+Stripe Migration)

> Checklist "Actividades SDD-Explore" (Trello card `SDD-Explore`): **23/24 completas**.

### ✅ Cerradas (verificadas 04/08/2026)
| Fase | Detalle | Commit |
|------|---------|--------|
| F1.1 | `stripe-checkout.ts` (sesion subscription, trial 30d, metadata businessId) | ✅ |
| F1.2 | `migrate-localstorage.ts` (solo superadmin, idempotente, no destructivo) | ✅ |
| F1.3 | `mapSubscriptionStatus` corregido (active→active, past_due→past_due) | ✅ |
| F1.4 | CLERK_SECRET_KEY + webhook sync de roles (superadmin publicMetadata) | ✅ |
| F1.5 | `community-reviews.ts` (6 reviews 5⭐) + util CNPJ | ✅ |
| F1.6 | Revisión de endpoints contra API contracts PRODUCT.md | ✅ |
| F2.1 | Capa `src/lib/api.ts` (async, token Clerk, loading/error) | ✅ |
| F3.1 | Migrar SuperAdmin.tsx → api | ✅ |
| F3.2 | Migrar MeuNegocio.tsx → api | ✅ |
| F3.3 | Migrar Inbox.tsx → api | ✅ |
| F3.4 | Migrar Onboarding.tsx → api | ✅ |
| F3.5 | Migrar Busca.tsx + Negocio.tsx → api | ✅ `24fe9a9` |
| F3.6 | Migrar Home.tsx + componentes (CommunityReviews, ReviewsSection, BusinessGallery, useHomeStore) | ✅ `24fe9a9` |
| F4.1 | Botón "Migrar Datos" en SuperAdmin (lee localStorage, confirma, envía, reporta, ofrece borrar) | ✅ `24fe9a9` |
| F5.1 | Superadmin Dashboard: stats cards + tabla filtros/busca/paginación | ✅ `24fe9a9` |
| F5.2 | Modales aprobar/rechazar/excluir + Admin.tsx | ✅ `24fe9a9` |
| F5.3 | Beta Mode Toggle funcional | ✅ `24fe9a9` |
| F6.1 | Stripe billing: aprobar → customer + trial + email welcome | ✅ `24fe9a9` |
| F6.2 | Webhooks Stripe correctos + Customer Portal | ✅ `24fe9a9` |
| F6.3 | Estado disabled: oculto en búsqueda, panel read-only, link portal | ✅ `24fe9a9` |
| F6.4 | Transición Beta → Producción (trialEndsAt = now + 30) | ✅ `24fe9a9` |
| F7.1 | Emails Resend: welcome, trial ending 3d, payment failed, rejected | ✅ `24fe9a9` |
| F8.1 | Build + lint + tests unitarios mínimos | ✅ **verificado 04/08: build EXIT 0, lint EXIT 0, vitest 9/9 passed** |

### 🔴 Pendiente
| Fase | Detalle | Estado |
|------|---------|--------|
| **F8.2** | E2E contra producción (regresión AC1–AC15) + `codegraph index .` + commit de cierre | ✅ **CERRADA 12/08/2026** — 42 casos CP ejecutados (P0 100%), 7 defectos corregidos (BUG-031..036+), codegraph indexado (899 nodos). Detalle: `docs/qa-f82-manifest.md` + PRUEBAS_FUNCIONALES.md |

---

## 🧪 Testes (Vitest)
- **`tests/cnpj.test.ts`** — validação CNPJ (mod 11).
- **`tests/subscription.test.ts`** — mapeo de status Stripe.
- Total: **9 testes passando** (verificado 04/08/2026).
- Comandos: `npm run test` (`vitest run tests`), `npm run build`, `npm run lint`.

---

## Tecnologias em Uso

| Camada          | Tecnologia                                   |
|-----------------|----------------------------------------------|
| Frontend        | React 18 + Vite 5 + TypeScript               |
| Estilização     | Tailwind CSS 3.4 + shadcn/ui components      |
| Animações       | Framer Motion 11                             |
| Autenticação    | **Clerk** (React SDK + verificação server-side em lib/auth.ts) |
| Backend/API     | **Netlify Functions** (Node, 22 funciones)   |
| Banco de Dados  | **PostgreSQL (Neon)** + **Prisma ORM** (JSONB address/contact) |
| Upload Fotos    | **Netlify Blobs** (store `business-photos`)  |
| Pagamentos      | **Stripe** (subscriptions + Customer Portal) |
| Emails          | **Resend** (4 templates em lib/email.ts)     |
| Mapas           | Google Maps Embed API                        |
| i18n            | i18next + react-i18next                      |
| Validação       | Zod (schemas compartilhados frontend/backend)|
| Estado          | Zustand (`useHomeStore`)                     |
| Deploy          | **Netlify** (frontend + functions) + Neon    |
| CI/CD           | Netlify auto-deploy on push to main          |

---

## ⚙️ Variáveis de Ambiente (Referência)

### Frontend (Vite)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...       # para Customer Portal redirect
VITE_GOOGLE_MAPS_API_KEY=...             # para mapa embed
```

### Netlify Functions / Backend
```env
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_WEBHOOK_SECRET=whsec_...

DATABASE_URL=postgresql://...             # Neon
DIRECT_URL=postgresql://...               # para migrations

STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_59_brl_monthly      # R$ 59/mês
STRIPE_TRIAL_DAYS=30
STRIPE_PORTAL_CONFIGURATION=...           # opcional

RESEND_API_KEY=re_...
EMAIL_FROM=ConectaPeru <noreply@conectaperu.com>

NETLIFY_BLOBS_STORE=business-photos
```

---

## ✅ Checklist de Aceite (Acceptance Criteria)

| ID | Feature | Estado |
|----|---------|--------|
| AC1 | Home Community Reviews — 6 reviews aleatórios 5⭐, negócios diferentes, novo set a cada load | ✅ `community-reviews.ts` + CommunityReviews.tsx |
| AC2 | Search Filters — 4 filtros, URL sincroniza, resultados precisos | ✅ `businesses.ts` + Busca.tsx |
| AC3 | Business Detail Review — form se logado + não avaliou; aparece na lista | ✅ `reviews.ts` + Negocio.tsx |
| AC4 | Business Detail Gallery — fotos em modal fullscreen | ✅ PhotoGallery + Negocio.tsx |
| AC5 | Meu Negócio Gallery — upload 10, cover, delete, reorder, modal | ✅ `upload-image.ts` + MeuNegocio.tsx |
| AC6 | Superadmin Dashboard — stats, tabela, filtros, paginação, ações | ✅ SuperAdmin.tsx + admin-* |
| AC7 | Superadmin Approve — Stripe customer + trial sub 30d + email welcome | ✅ `admin-approve.ts` |
| AC8 | Superadmin Reject — salva motivo + email rejeição | ✅ `admin-reject.ts` |
| AC9 | Superadmin Delete — cancela Stripe sub + soft delete | ✅ `admin-delete.ts` |
| AC10 | Beta Mode — toggle funciona, sem cobranças em beta | ✅ `admin-beta-mode.ts` |
| AC11 | Stripe Webhook — payment_failed, subscription_updated, deleted | ✅ `stripe-webhook.ts` |
| AC12 | Customer Portal — owner atualiza cartão, cancela, baixa faturas | ✅ `stripe-portal.ts` |
| AC13 | CNPJ Validation — 14 dígitos + check digits + API lookup | ✅ `lib/cnpj.ts` |
| AC14 | Disabled State — oculto na busca, painel read-only, link portal | ✅ MeuNegocio.tsx + subscriptions |
| AC15 | Emails — 4 templates enviam via Resend | ✅ `lib/email.ts` |

**AC1–AC15: todas implementadas. Pendiente solo la verificación E2E en producción (F8.2).**

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Stripe webhook falhas | Idempotency keys, retry logic, sempre retorna 200 para evitar retries externos |
| CNPJ API rate limits | Validação local mod 11 + API lookup com cache 24h / fallback |
| Resend deliverability | Domain verification, SPF/DKIM, test emails |
| Clerk sync | Verificação criptográfica token + role no PostgreSQL por requisição |
| Migration data loss | `migrate-localstorage` no destructivo + localStorage preservado como fallback |
| Netlify Blobs limits | Migração planejada para S3/R2 quando volume crescer |
| Chunk JS grande (>500kB) | Code-splitting dinâmico planejado (warning de build atual) |

---

## Próximos Passos Imediatos

1. **F8.2 — E2E contra producción**: regresión AC1–AC15 sobre el sitio desplegado.
2. `codegraph index .` en `DiretorioPeruano` tras la verificación.
3. Commit de cierre de la fase F8.2 y push a `main`.
4. (Opcional) Code-splitting para reducir el chunk principal.

---

> **Nota:** Este documento refleja el estado **real implementado + planejado** do projeto ConectaPeru (DiretorioPeruano) a partir da verificação em código (commit `24fe9a9`, 04/08/2026: build EXIT 0, lint EXIT 0, vitest 9/9 passed) e do checklist SDD (23/24). Substitui a visão "planejado" anterior que ainda listava Superadmin/Stripe/Beta/Emails como pendentes.
