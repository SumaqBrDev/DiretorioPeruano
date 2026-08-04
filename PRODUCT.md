# PRODUCT.md — ConectaPeru (DiretorioPeruano)

> **Estado actual:** MVP funcional + features críticas en desarrollo  
> **Stack:** React + Vite + TypeScript + Tailwind + Clerk + Prisma + Netlify Functions + Stripe + Resend  
> **Última actualización:** 25/07/2026

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

**Diferencial chave:** Modelo **freemium com trial de 30 dias** → após trial, assinatura mensal (R$ 59/mês) via Stripe. Modo **Beta** ativo por padrão (sem cobranças) até decisão de lançamento.

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
- Acesso via role `superadmin` no Clerk (metadata pública).

---

## Funcionalidades Implementadas (Produção)

### ✅ 1. Catálogo de Negócios Público
- Listagem paginada com cards visuais por categoria.
- Filtros: **categoria**, **cidade** (dropdown populado do BD), **busca textual** (nome/endereço/tags), **rating mínimo**.
- Ordenação: mais recentes, melhor avaliados, mais comentados.
- Cards com: foto de capa, nome, categoria, tags, cidade/estado, média de estrelas.
- Busca com **debounce 300ms** e **URL params sincronizados** (links compartilháveis).

### ✅ 2. Página do Negócio (`/negocio/:id`)
- Galeria de fotos completa (Netlify Blobs) com **modal fullscreen** (navegação setas/teclado, swipe mobile, ESC/overlay para fechar).
- Endereço completo com Google Maps Embed.
- Descrição livre, tags personalizadas, horário de funcionamento, telefone/WhatsApp/Instagram/website.
- Seção de **avaliações** com formulário de review (estrelas 1-5 + comentário min 10 chars) para usuários logados que ainda não avaliaram.
- Lista de reviews aprovados (mais recentes primeiro).
- Resposta do negócio aos comentários (planejado).

### ✅ 3. Autenticação e Onboarding (Clerk)
- Provedor: **Clerk** (social Google + email/senha).
- Registro gratuito para negócios.
- **Fluxo de onboarding multi-step** pós-login:
  1. Dados básicos: nome, descrição, categoria
  2. Endereço: rua, número, bairro, cidade, estado (UF select), CEP, lat/lng
  3. Contato: telefone, WhatsApp, Instagram, website
  4. **CNPJ** (validação formato + dígitos verificadores + API Receita Federal opcional)
  5. **Dados do dono**: nome completo, cidade de nascimento (obrigatoriamente no Peru)
  6. Fotos: upload drag&drop (máx 10, 5MB cada, cover selecionável)
  7. Tags: input com sugestões de tags existentes no sistema
- Status inicial: `PENDING` → aguarda aprovação do superadmin.

### ✅ 4. Painel "Meu Negócio" (Business Owner)
- Edição completa de todos os campos do onboarding.
- **Gestão de galeria** (✅ **COMPLETA**):
  - Upload até 10 fotos (drag&drop + file input)
  - Definir foto de capa
  - Reordenar (drag&drop)
  - Excluir com confirmação
  - Modal de visualização fullscreen
  - Armazenamento em **Netlify Blobs** (migração futura para S3/R2)
- **Estado `DISABLED` (pagamento falhou)**: painel em modo **somente leitura** + banner "Atualize seu pagamento" com link para Stripe Customer Portal.

### ✅ 5. Sistema de Avaliações (Reviews)
- Consumidor logado: pode avaliar (1-5 estrelas + comentário) **uma única vez por negócio**.
- **Auto-aprovação** na v1 (status `APPROVED` direto) — moderação posterior se necessário.
- Negócio **NÃO** pode avaliar outro negócio (validação backend via role Clerk).
- Exibição na página do negócio + seção "O que a comunidade diz" no Home.

### ✅ 6. Seção Home: "O que a comunidade diz"
- **6 reviews aleatórios** (5 estrelas) de negócios **APROVADOS**, de negócios **diferentes**.
- Card: estrelas + comentário + "Autor - Negócio" + data.
- Novo conjunto aleatório a cada carregamento.
- Estado vazio: seção ocultada se < 6 reviews qualificados existirem.

### ✅ 7. Inbox B2B entre Negócios
- Canal privado de mensagens diretas exclusivo entre contas **business**.
- Não visível para consumidores.
- Interface tipo inbox/DM (assíncrono, notificação por email planejada).
- Validação: remetente e destinatário devem ser roles `business`.

### ✅ 8. Seletor de Idioma (i18n)
- Alternância **PT-BR ↔ ES-PE** em toda a interface.
- Persistência: `localStorage` (visitantes) / perfil do usuário (logados).
- Framework: **i18next** com namespaces (`common`, `auth`, `business`, `review`, `admin`).
- Todas as strings da UI, erros e emails transacionais bilíngues.

### ✅ 9. Landing Page Pública (visitante não logado)
1. **Hero** — Tagline + busca rápida (redirect para `/busca`) + imagem vibrante
2. **Como Funciona** — 3 passos ilustrados (Busca → Encontra → Conecta)
3. **Categorias em Destaque** — grid com ícones ilustrados
4. **Restaurantes em Destaque** — carrossel dos negócios mais bem avaliados (APROVADOS)
5. **Nossos Números** — contadores animados (negócios, cidades, avaliações)
6. **Depoimentos** — comentários reais moderados
7. **Para Seu Negócio** — CTA cadastro gratuito
8. **Footer** — links, seletor de idioma, redes sociais, créditos

---

## Funcionalidades Em Desenvolvimento / Planejadas (Próximas Sprints)

### 🔄 Superadmin Dashboard (`/admin`)
| Feature | Status | Detalhes |
|---------|--------|----------|
| Stats cards | 🟡 Planejado | Total | Pendentes | Aprovados | Rejeitados | Desabilitados | Em Trial |
| Tabela de negócios | 🟡 Planejado | Filtros: status, busca (nome/CNPJ), date range; paginação |
| Ações em lote | 🟡 Planejado | Ver detalhes | Aprovar | Rejeitar | Excluir |
| Modal "Ver" | 🟡 Planejado | Dados completos + info de assinatura Stripe |
| Modal "Aprovar" | 🟡 Planejado | Confirmação → cria Stripe Customer + Subscription (30-day trial) → email boas-vindas |
| Modal "Rejeitar" | 🟡 Planejado | Textarea motivo (obrigatório) → email rejeição → negócio pode reenviar |
| Modal "Excluir" | 🟡 Planejado | Confirmação forte → cancela Stripe sub → soft delete |
| **Beta Mode Toggle** | 🟡 Planejado | Banner prominente 🟡 "MODO BETA ATIVO" + toggle ON/OFF |

### 🔄 Stripe Integration (Billing)
| Feature | Status | Detalhes |
|---------|--------|----------|
| Stripe Product/Price | ⏳ Pendente | Criar manualmente no Dashboard: "Assinatura ConectaPeru - Mensal" R$ 59,00/mês |
| On Approve (auto) | 🟡 Planejado | Create Customer → Create Subscription (trial_period_days=30) → save `stripeCustomerId`, `subscriptionId`, `trialEndsAt` → email welcome |
| Trial ending (3 dias) | 🟡 Planejado | Email "Seu trial acaba em 3 dias" + botão Customer Portal |
| Payment failed | 🟡 Planejado | Email "Pagamento falhou" → 7 dias past_due → `disabledAt=now`, status=`DISABLED` → oculto na busca, painel read-only |
| Customer Portal | 🟡 Planejado | `GET /api/stripe/portal` → redirect para gerenciar cartão, cancelar, baixar faturas |
| Webhooks | 🟡 Planejado | `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` → sync status |
| Beta Mode logic | 🟡 Planejado | Se `SiteConfig.betaMode=true`: sem cobranças, trials infinitos, emails de trial NÃO enviados |

### 🔄 CNPJ Validation
- Formato: 14 dígitos + dígitos verificadores (mod 11)
- Lookup opcional: `https://publica.cnpj.ws/cnpj/{cnpj}` (grátis, sem auth) ou `receitaws.com.br` (rate limited)
- Cache 24h; fallback para validação apenas de formato se API falhar

### 🔄 Email Templates (Resend)
| Template | Trigger |
|----------|---------|
| Welcome (on approve) | Superadmin aprova negócio |
| Trial ending (3 dias) | Cron job / webhook `trial_will_end` |
| Payment failed | Webhook `invoice.payment_failed` |
| Rejected | Superadmin rejeita cadastro |

---

## Regras de Negócio (Hard Rules)

### Autenticação & Roles (Clerk publicMetadata)
| Role | Permissões |
|------|------------|
| `consumer` | Avaliar, comentar, usar inbox (apenas receber se business) |
| `business` | Gerenciar seu negócio, responder reviews, inbox B2B, **não pode** avaliar outros negócios |
| `superadmin` | Acesso total ao `/admin`, aprovar/rejeitar/excluir negócios, toggle beta mode, métricas |
| *(não há `admin` separado na v1)* | Superadmin cobre tudo |

### Status do Negócio (`BusinessProfile.status`)
```
PENDING   → Aguardando revisão do superadmin (recém cadastrado)
APPROVED  → Ativo, visível na busca, trial ou assinatura ativa
REJECTED  → Superadmin rejeitou (motivo salvo); dono pode corrigir e reenviar
DISABLED  → Pagamento falhou (7 dias past_due) ou superadmin desabilitou; oculto na busca, painel read-only
DELETED   → Exclusão permanente (soft delete via status ou hard delete se force=true)
```

### Trial & Billing
- Trial: **30 dias** a partir da aprovação do superadmin.
- Preço: **R$ 59,00/mês** (configurável no Stripe Price ID).
- Beta Mode ON: **sem cobranças nunca**, trials infinitos, emails de trial desativados.
- Transição Beta → Produção: negócios existentes ganham `trialEndsAt = now + 30 dias`.

### Reviews
- Auto-aprovados na v1 (`status: APPROVED`).
- Um consumidor = uma review por negócio.
- Negócio (role `business`) **bloqueado** de deixar review em outro negócio (403 no backend).
- Mínimo 10 caracteres no comentário.

### Busca & Filtros
- Parâmetros URL: `q` (texto), `categoria`, `cidade`, `minRating`
- Cidade: `SELECT DISTINCT address->>'city' FROM BusinessProfile WHERE status='APPROVED'`
- Debounce 300ms no input textual
- Skeleton loaders durante fetch

### Galeria de Fotos
- Máx 10 fotos por negócio
- Máx 5MB por arquivo
- Formatos: JPEG, PNG, WebP
- Armazenamento: **Netlify Blobs** (atual) → migração futura para S3/Cloudflare R2
- Cover: uma foto marcada como principal (exibida no card/carrossel)

### Endereços
- Estado brasileiro: **select UF** (27 opções) — facilita filtro por estado
- Cidade: input livre (preenchido via CEP autocomplete se disponível)
- Lat/Lng: geocoding opcional (Google Maps API) para mapa embed

---

## Arquitetura de Dados (Prisma Schema Atualizado)

```prisma
enum UserRole {
  CONSUMER
  BUSINESS
  SUPERADMIN
}

enum BusinessStatus {
  PENDING
  APPROVED
  REJECTED
  DISABLED
  DELETED
}

enum ReviewStatus {
  APPROVED  // v1: auto-approved
  // PENDING, REJECTED — reservados para v2 moderação
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
  NONE
}

model User {
  id                String      @id @default(cuid())
  clerkUserId       String      @unique
  email             String      @unique
  name              String?
  avatar            String?
  role              UserRole    @default(CONSUMER)
  language          String      @default("pt-BR")
  businessProfile   BusinessProfile?
  reviews           Review[]
  sentMessages      Message[]   @relation("SentMessages")
  receivedMessages  Message[]   @relation("ReceivedMessages")
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

model BusinessProfile {
  id                    String           @id @default(cuid())
  ownerId               String           @unique
  owner                 User             @relation(fields: [ownerId], references: [id])
  
  // Dados básicos
  name                  String
  description           String?
  category              String           // "restaurante", "mercado", "servicos", etc.
  
  // Endereço
  street                String
  number                String
  neighborhood          String?
  city                  String
  state                 String           // UF (SP, RJ, etc.)
  zipCode               String
  lat                   Float?
  lng                   Float?
  
  // Contato & branding
  tags                  String[]         @default([])
  photos                String[]         @default([]) // URLs Netlify Blobs
  coverPhotoIndex       Int              @default(0)
  phone                 String?
  whatsapp              String?
  instagram             String?
  website               String?
  
  // Documentos & validação
  cnpj                  String?          @unique
  ownerFullName         String?
  ownerBirthCity        String?          // Deve ser cidade no Peru
  
  // Status & billing
  status                BusinessStatus   @default(PENDING)
  rejectionReason       String?
  approvedAt            DateTime?
  disabledAt            DateTime?
  
  stripeCustomerId      String?          @unique
  stripeSubscriptionId  String?          @unique
  subscriptionStatus    SubscriptionStatus @default(NONE)
  trialEndsAt           DateTime?
  
  reviews               Review[]
  sentMessages          Message[]        @relation("BusinessSentMessages")
  receivedMessages      Message[]        @relation("BusinessReceivedMessages")
  
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  
  @@index([status])
  @@index([city, state])
  @@index([category])
}

model Review {
  id          String        @id @default(cuid())
  businessId  String
  business    BusinessProfile @relation(fields: [businessId], references: [id])
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  rating      Int           // 1-5
  comment     String
  status      ReviewStatus  @default(APPROVED)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  @@unique([businessId, userId]) // Uma review por usuário por negócio
  @@index([businessId])
  @@index([status])
}

model Message {
  id              String         @id @default(cuid())
  fromBusinessId  String
  fromBusiness    BusinessProfile @relation("BusinessSentMessages", fields: [fromBusinessId], references: [id])
  toBusinessId    String
  toBusiness      BusinessProfile @relation("BusinessReceivedMessages", fields: [toBusinessId], references: [id])
  body            String
  read            Boolean        @default(false)
  createdAt       DateTime       @default(now())
  
  @@index([fromBusinessId])
  @@index([toBusinessId])
  @@index([read])
}

model SiteConfig {
  id        String   @id @default("singleton")
  betaMode  Boolean  @default(true)
  updatedAt DateTime @updatedAt
}
```

---

## API Contracts (Netlify Functions)

### Públicas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/businesses?q=&categoria=&cidade=&minRating=` | Busca com filtros + paginação |
| GET | `/api/businesses/:id` | Detalhe do negócio (aprovados) |
| GET | `/api/community-reviews?limit=6` | 6 reviews aleatórios 5⭐ de negócios diferentes |
| POST | `/api/businesses` | Cadastro novo negócio (auth Clerk, role business) |
| POST | `/api/reviews` | Criar review (auth Clerk, role consumer) |
| GET | `/api/reviews?businessId=` | Listar reviews de um negócio |

### Protegidas (Business Owner)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/businesses/me` | Meu negócio (dados completos) |
| PUT | `/api/businesses/me` | Atualizar meu negócio |
| POST | `/api/businesses/me/photos` | Upload foto (Netlify Blobs) |
| DELETE | `/api/businesses/me/photos/:index` | Excluir foto |
| PUT | `/api/businesses/me/photos/reorder` | Reordenar galeria |
| POST | `/api/stripe/portal` | Criar sessão Customer Portal |

### Superadmin (`/api/admin/*` — requer role `superadmin`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/businesses?status=&page=&limit=&search=` | Listar com filtros + paginação |
| GET | `/api/admin/businesses/:id` | Detalhe completo + subscription info |
| POST | `/api/admin/businesses/:id/approve` | Aprovar → cria Stripe customer + trial sub + email |
| POST | `/api/admin/businesses/:id/reject` | Rejeitar com motivo → email |
| DELETE | `/api/admin/businesses/:id?force=` | Excluir (cancela Stripe sub) |
| GET | `/api/admin/stats` | Cards: total, pending, approved, rejected, disabled, in_trial |
| POST | `/api/admin/config/beta-mode` | Toggle beta mode `{ enabled: boolean }` |

### Stripe Webhook
| Método | Endpoint | Eventos |
|--------|----------|---------|
| POST | `/api/stripe/webhook` | `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `customer.subscription.trial_will_end` |

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
- **Títulos**: *Geist* / *Satoshi* — moderna, geométrica, ar de plataforma tech
- **Corpo/UI**: *Geist* / *Inter* — legibilidade máxima

### Animações (Framer Motion)
- Hero: fade + slide up + padrão têxtil andino animado (SVG)
- Cards: hover 3D tilt sutil + elevação sombra
- Skeletons nos cards durante carregamento
- Scroll-reveal (IntersectionObserver) nas seções
- Contadores animados em "Nossos Números"
- Carrossel fotos: swipe transition
- Toasts animados (sucesso/erro)
- Seletor idioma: micro-animação bandeira 🇵🇪 ↔ 🇧🇷

---

## Roadmap de Fases (Atualizado)

### Fase 1 — MVP Restaurantes ✅ **MAJORITY DONE**
- [x] Autenticação Clerk
- [x] Cadastro + onboarding completo (incl. CNPJ, owner data)
- [x] Catálogo público com busca/filtros corrigidos
- [x] Página detalhes + galeria fullscreen
- [x] Painel "Meu Negócio" + galeria management
- [x] Reviews (auto-aprovadas) + seção Home "comunidade"
- [x] Inbox B2B
- [x] i18n PT-BR/ES-PE
- [x] Landing page completa
- [ ] **Superadmin Dashboard** (em desenvolvimento)
- [ ] **Stripe Billing + Trial 30d** (em desenvolvimento)
- [ ] **Beta Mode Toggle** (em desenvolvimento)
- [ ] **CNPJ Validation API** (em desenvolvimento)
- [ ] **Emails Resend** (em desenvolvimento)

### Fase 2 — Comunidade & Moderação
- [ ] Moderação de reviews (pending → approve/reject)
- [ ] Resposta do negócio aos reviews
- [ ] Painel admin: fila de moderação
- [ ] Notificações email: review novo, mensagem inbox

### Fase 3 — Métricas & Escala
- [ ] Painel do negócio: visualizações, clicks WhatsApp, reviews recebidas
- [ ] Busca full-text (Postgres FTS ou Meilisearch)
- [ ] Planos: Free vs Premium (destaque no diretório)
- [ ] Migração storage: Netlify Blobs → S3/R2

### Fase 4 — Expansão Categorias
- [ ] Novas categorias ativas (mercado, servicos, saude, tecnologia)
- [ ] PWA / App mobile (React Native)

---

## Tecnologias em Uso

| Camada          | Tecnologia                                   |
|-----------------|----------------------------------------------|
| Frontend        | React 18 + Vite 5 + TypeScript               |
| Estilização     | Tailwind CSS 3.4 + shadcn/ui components      |
| Animações       | Framer Motion 11                             |
| Autenticação    | **Clerk** (React SDK + Clerk SDK Node)       |
| Backend/API     | **Netlify Functions** (Edge/Node)            |
| Banco de Dados  | **PostgreSQL** (Supabase) + **Prisma ORM**   |
| Upload Fotos    | **Netlify Blobs** (atual) → S3/R2 (futuro)   |
| Pagamentos      | **Stripe** (Subscriptions + Customer Portal) |
| Emails          | **Resend** (templates React Email)           |
| Mapas           | Google Maps Embed API                        |
| i18n            | i18next + react-i18next                      |
| Validação       | Zod (schemas compartilhados frontend/backend)|
| Deploy          | **Netlify** (frontend + functions)           |
| CI/CD           | Netlify auto-deploy on push to main          |

---

## Variáveis de Ambiente (Referência)

### Frontend (Vite)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_API_URL=https://api.seudominio.com  # ou /.netlify/functions
VITE_STRIPE_PUBLISHABLE_KEY=pk_...       # para Customer Portal redirect
VITE_GOOGLE_MAPS_API_KEY=...             # para mapa embed
```

### Netlify Functions / Backend
```env
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_WEBHOOK_SECRET=whsec_...

DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # para migrations

STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...    # R$ 59/mês
STRIPE_PORTAL_CONFIGURATION=...  # opcional

RESEND_API_KEY=re_...
EMAIL_FROM=ConectaPeru <noreply@conectaperu.com>

NETLIFY_BLOBS_STORE=business-photos
```

---

## Checklist de Aceite (Acceptance Criteria)

| ID | Feature | Critério |
|----|---------|----------|
| AC1 | Home Community Reviews | 6 reviews aleatórios 5⭐, negócios diferentes, novo set a cada load |
| AC2 | Search Filters | Todos 4 filtros funcionam, URL sincroniza, resultados precisos |
| AC3 | Business Detail Review | Form aparece se logado + não avaliou; submete; aparece na lista |
| AC4 | Business Detail Gallery | Todas fotos em modal fullscreen com navegação completa |
| AC5 | Meu Negócio Gallery | ✅ Upload 10, cover, delete, reorder, modal |
| AC6 | Superadmin Dashboard | Stats, tabela, filtros, paginação, ações funcionam |
| AC7 | Superadmin Approve | Cria Stripe customer + trial sub 30d + email welcome |
| AC8 | Superadmin Reject | Salva motivo + email rejeição + negócio pode reenviar |
| AC9 | Superadmin Delete | Cancela Stripe sub + soft delete |
| AC10 | Beta Mode | Toggle funciona, sem cobranças em beta, fluxo normal quando off |
| AC11 | Stripe Webhook | Trata payment_failed, subscription_updated, deleted |
| AC12 | Customer Portal | Owner atualiza cartão, cancela, baixa faturas |
| AC13 | CNPJ Validation | 14 dígitos + check digits + API lookup (cache 24h) |
| AC14 | Disabled State | Oculto na busca, painel read-only, link portal para reativar |
| AC15 | Emails | 4 templates enviam via Resend |

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Stripe webhook falhas | Idempotency keys, retry logic, dead letter queue no Netlify |
| CNPJ API rate limits | Cache 24h, fallback validação apenas formato |
| Resend deliverability | Domain verification, SPF/DKIM, test emails |
| Clerk sync | Webhook + fallback API call on login |
| Migration data loss | Backup before migrate, test on staging |
| Netlify Blobs limits | Migração planejada para S3/R2 quando volume crescer |

---

## Próximos Passos Imediatos

1. **Prisma Migrations** — Aplicar schema atualizado (BusinessProfile + SiteConfig + enums)
2. **Clerk Webhook** — Sincronizar role `superadmin` via `publicMetadata`
3. **API `/api/businesses`** — Corrigir busca + filtros + city distinct
4. **API `/api/community-reviews`** — 6 reviews aleatórios 5⭐
5. **Superadmin API endpoints** — List, detail, approve, reject, delete, beta-toggle
6. **Stripe Webhook + Portal** — Endpoints + handlers
7. **Resend Service + 4 Templates** — Welcome, trial ending, payment failed, rejected
8. **CNPJ Utility** — Validação formato + dígitos + API lookup
9. **Frontend: Home CommunityReviews** — Componente + integração
10. **Frontend: Search** — Fix filters + city dropdown from API
11. **Frontend: Negocio ReviewForm** — Stars + textarea + submit
12. **Frontend: Superadmin Dashboard** — Página `/admin` com modais
13. **Onboarding** — Adicionar campos CNPJ, ownerFullName, ownerBirthCity
14. **E2E + Deploy** — Testes integração + deploy production

---

> **Nota:** Este documento reflete o estado **real implementado + planejado** do projeto ConectaPeru (DiretorioPeruano) a partir dos specs abertos (`openspec/SPEC.md`, `openspec/plan-remaining-features.md`) e do código base atual. Substitui a visão original "SaborPeruano" do PRODUCT.md anterior.