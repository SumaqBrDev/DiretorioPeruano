# ConectaPerú - Diretório Peruano no Brasil

> **Conectando o Peru ao Brasil** - Diretório de negócios peruanos no Brasil

## 🚀 Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (custom design system: ají-rojo, oro-inca, creme-andino, noite-lima, verde-brasil)
- **Auth:** Clerk (React SDK)
- **Database:** Neon PostgreSQL + Prisma ORM
- **Deploy:** Netlify (SPA)
- **Lint:** ESLint (`npm run lint`)
- **Testes:** Vitest (`npm test`, node env, sem jsdom)

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── AboutSection.tsx
│   ├── Breadcrumb.tsx
│   ├── BusinessCard.tsx
│   ├── BusinessInfoCard.tsx
│   ├── BusinessList.tsx
│   ├── ContactInfoSection.tsx
│   ├── HoursSection.tsx
│   ├── MenuSection.tsx
│   ├── MessageForm.tsx
│   ├── MessageList.tsx
│   ├── Navbar.tsx
│   ├── PhotoGallery.tsx
│   ├── ReviewsSection.tsx
│   ├── SearchFilters.tsx
│   ├── Sidebar.tsx
│   ├── StarRating.tsx
│   └── StatsCard.tsx
├── data/
│   └── mockBusinesses.ts    # Dados mock (3 restaurantes)
├── pages/
│   ├── Admin.tsx            # Dashboard admin
│   ├── Busca.tsx            # Busca com filtros
│   ├── Home.tsx             # Landing page
│   ├── Inbox.tsx            # Mensagens B2B
│   ├── Login.tsx            # Auth Clerk
│   ├── Moderar.tsx          # Moderação de avaliações
│   ├── Negocio.tsx          # Detalhe do negócio (abas: Sobre/Cardápio/Avaliações)
│   └── Onboarding.tsx       # Cadastro de negócio (multi-step)
├── App.tsx                  # Rotas + ClerkProvider
├── main.tsx                 # Entry point + theme init
└── vite-env.d.ts            # TypeScript declarations
```

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js 20+
- npm 10+
- Conta Clerk (gratuita)
- Conta Neon (gratuita)

### Setup

```bash
# 1. Clone e instale
git clone https://github.com/SumaqBrDev/DiretorioPeruano.git
cd DiretorioPeruano
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves Clerk e Neon

# 3. Setup banco de dados (opcional - usa mock data por padrão)
npx prisma generate
npx prisma db push

# 4. Rode o dev server
npm run dev
# Abre em http://localhost:5173
```

### Variáveis de Ambiente Obrigatórias

| Variável | Onde Obter | Descrição |
|----------|------------|-----------|
| `VITE_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com/apps/app_3GVoHO4YI3D66tNLyOlNwdWdNfY) | Chave pública do Clerk |
| `CLERK_SECRET_KEY` | [Clerk Dashboard](https://dashboard.clerk.com/apps/app_3GVoHO4YI3D66tNLyOlNwdWdNfY) | Chave secreta (server-side) |
| `DATABASE_URL` | [Neon Console](https://console.neon.tech/) | Connection string PostgreSQL |

## 🏗️ Build de Produção

```bash
npm run build
# Output em ./dist (pronto para Netlify)
```

## 🌐 Deploy no Netlify

### 1. Conecte o Repositório
- Acesse [Netlify](https://app.netlify.com/)
- "Add new site" → "Import from Git"
- Selecione `SumaqBrDev/DiretorioPeruano`

### 2. Configurações de Build
```
Build command: npm run build
Publish directory: dist
Node version: 20
```

### 3. Variáveis de Ambiente no Netlify
Vá em **Site Configuration → Environment Variables** e adicione:

| Key | Value |
|-----|-------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` (sua chave Clerk) |
| `DATABASE_URL` | `postgresql://...` (sua string Neon) |
| `CLERK_SECRET_KEY` | `sk_test_...` (apenas se usar Netlify Functions) |

### 4. Configuração do Clerk para Produção
No [Clerk Dashboard](https://dashboard.clerk.com/apps/app_3GVoHO4YI3D66tNLyOlNwdWdNfY):
1. **Domains** → Adicione seu domínio Netlify (`seu-site.netlify.app`)
2. **Redirect URLs** → Adicione `https://seu-site.netlify.app/*`
3. **Allowed Origins** → Adicione `https://seu-site.netlify.app`

### 5. Deploy Automático
- Push para `main` → Deploy automático
- Preview deploys para PRs

## 📦 Scripts Disponíveis

```bash
npm run dev          # Dev server com HMR
npm run build        # Build de produção
npm run preview      # Preview do build local
npm run lint         # ESLint (js/jsx)
npm run test         # Vitest (node env; gate de merge — precisa ficar verde)
npm run check:legal  # Gate legal LGPD (D10): falha enquanto houver documento ATIVO não aprovado
                     #   pelo responsável/DPO ou hash divergente. NÃO faz parte do npm test.
```

## 🗄️ Banco de Dados (Prisma)

```bash
npx prisma studio        # UI visual do banco
npx prisma generate      # Regenera client
npx prisma db push       # Sincroniza schema
npx prisma migrate dev   # Cria migração
npx prisma db seed       # Popula dados iniciais
```

**Schema principal:** `prisma/schema.prisma`
- `User` - Usuários Clerk sincronizados
- `BusinessProfile` - Perfis de negócios (KYC: `cnpj`, `ownerFullName`, `ownerBirthCity`; billing: `stripeCustomerId`, `subscriptionId`, `subscriptionStatus`, `trialEndsAt`, `disabledAt`; média: `rating`)
- `Review` - Avaliações com moderação (auto-aprovadas; `status` default `approved`)
- `WebhookEvent` - Idempotência de webhooks Stripe (sem Redis; `stripeEventId` único)
- `Message` - Mensagens B2B
- `ConsentRecord` - Evidência de consentimento LGPD (append-only; `@@unique(userId, idempotencyKey)`)
- `CookiePreference` - Estado operacional das preferências de cookies (upsert por usuário; NÃO é evidência)

> **Migrações:** este projeto não usa `prisma migrate dev` (sem `DATABASE_URL` local).
> Aplicar SQL manual idempotente: `apply_schema.sql` (base) + `prisma/migration_manual.sql`
> (billing/KYC/rating/WebhookEvent) + `supabase_migration.sql` (archive) +
> `prisma/lgpd_migration.sql` (ConsentRecord + CookiePreference).
> Comando (padrão do repositório, re-executável sem efeitos colaterais):
> `node run-migration.cjs prisma/lgpd_migration.sql`

## 🎨 Design System

### Cores (Tailwind Config)
```css
--aji-rojo: #C0392B        /* Vermelho ají - primary */
--oro-inca: #D4A843        /* Dourado inca - accent */
--creme-andino: #FDF6E3    /* Creme andino - bg light */
--noite-lima: #1A1A2E      /* Noite de Lima - bg dark */
--verde-brasil: #009B3A    /* Verde Brasil - success */
```

### Fontes
- **Headings:** Playfair Display (serif, elegante)
- **Body:** Inter / system-ui (legível)

## 📱 Páginas Implementadas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Home | Hero, categorias, destaque, depoimentos, CTA |
| `/busca` | Busca | Filtros laterais, grid de resultados |
| `/negocio/:id` | Negócio | Abas: Sobre, Cardápio, Avaliações + Sidebar ações |
| `/onboarding` | Cadastro | 3 steps: Básico, Endereço, Tags/Fotos |
| `/inbox` | Inbox B2B | Conversas + formulário nova mensagem |
| `/admin` | Admin | Stats, gestão de negócios |
| `/admin/moderar` | Moderação | Aprovar/rejeitar avaliações |
| `/entrar` | Login | Clerk SignIn |
| `/cadastrar` | Cadastro | Clerk SignUp |

## 🔐 Autenticação (Clerk)

- **Sign Up / Sign In** - Email/senha + OAuth (Google, GitHub)
- **Protected Routes** - `Onboarding`, `Inbox`, `Admin`, `Moderar`
- **User Sync** - Webhook Clerk → Prisma `User` table
- **Organizations** - Futuro: multi-tenancy para redes de franquias

## 🔒 Governança LGPD (consentimento e privacidade)

> **Status honesto (01/09/2026):** a implementação técnica de consentimento LGPD está presente
> e coberta por testes (`npm test` — 24 arquivos, 253 testes, verde). Os documentos legais
> **ativos** (privacy_policy v3, terms_of_service v2, cookie_policy v2, efetivos em 2026-09-01)
> foram **aprovados pelo responsável** e publicados sem marcadores de placeholder; o gate de
> release `npm run check:legal` **passa** com os 3 ativos aprovados e hashes íntegros. Versões
> anteriores (superseded) permanecem no registro como histórico imutável e nunca resolvem como
> ativas. Este README não é certificação legal.

### Contrato de configuração legal (fonte única — D1)

`src/config/legal.ts` é o registro único de documentos legais, importado pelo client
(`src/pages/*`), pelas Netlify Functions e pelos testes — textos e versões podem ser trocados
**sem mudança de código** após aprovação legal.

| Campo | Significado |
|---|---|
| `id` | `terms_of_service` \| `privacy_policy` \| `cookie_policy` |
| `version` | Versão do documento (ex.: `'2'`) |
| `effectiveDate` | ISO date (UTC). Ativo = maior versão com `effectiveDate <= hoje` |
| `hash` | sha256 hex (lowercase) de `JSON.stringify(sections)`; verificado por teste e pelo gate (drift = falha) |
| `purposes` | `service` \| `marketing` \| `analytics` |
| `legalBases` | `contract` \| `consent` \| `legitimate_interest` |
| `locale` | `pt-BR` (textos atuais) / `es-PE` |
| `legalApproved` | `true` para os documentos ATIVOS aprovados pelo responsável (D10); superseded permanecem no registro sem resolver como ativos |

Versões anteriores (superseded) e qualquer versão com `effectiveDate` futuro **nunca** resolvem
como ativas — `activeLegalDocs()`/`getLegalDoc()` aplicam essa regra no client, nas Functions e
no gate (a entrada scaffold `cookie_policy` v2/2099 foi removida na limpeza do wording).

### Migração manual idempotente

```bash
node run-migration.cjs prisma/lgpd_migration.sql   # padrão do repositório, re-executável
```

Cria `ConsentRecord` (evidência append-only) + `CookiePreference` (estado operacional), com
`CREATE TABLE/INDEX IF NOT EXISTS` e chave única `(userId, idempotencyKey)` — re-executar não
gera erro nem duplicata.

> ⚠️ **Limitação conhecida:** o runner `run-migration.cjs` (raiz) lê um caminho **fixo**
> (`./prisma/migration_manual.sql`) e atualmente **não consome o argumento de caminho**. Antes
> de aplicar o SQL LGPD, aponte o caminho dentro do arquivo (o cabeçalho de
> `prisma/lgpd_migration.sql` documenta o mesmo padrão: "edit the SQL path if needed").

### Fluxo híbrido de consentimento (D1)

1. **Pré-signup — intenção, NUNCA evidência:** as checkboxes em `Login` gravam a intenção em
   `sessionStorage` (`conectaperu_signup_intent`). O signup fica bloqueado até a checkbox
   obrigatória ser marcada (frontend); o servidor revalida depois (409 `CONSENT_REQUIRED`).
2. **Evidência server-side após o redirect do Clerk:** `Onboarding` (passo 0) / `Reconsent`
   chamam `POST /api/consent` por documento ativo; o servidor deriva `documentVersion` +
   `documentHash` do registro ativo — versão superada ou futura-datada é rejeitada (422).
3. **Idempotência (D2):** a `idempotencyKey` deriva do timestamp da intenção + documento +
   propósito; reenvio idêntico → `200 {record, duplicate:true}` (pré-checagem lógica + chave
   única `(userId, idempotencyKey)` como backstop de corrida).

### IP/userAgent NÃO são capturados (D5)

Nenhuma coluna `ipAddress`/`userAgent` existe em `ConsentRecord`/`CookiePreference` (sem
justificativa/retention definida) — o consentimento é registrado sem dados de rede/dispositivo.

### Evidência vs. estado operacional

| Modelo | Papel | Escrita |
|---|---|---|
| `ConsentRecord` | **Evidência imutável** (LGPD) | Append-only: grants E revogações são **novas linhas**; consentimento atual = última linha por `(userId, documentType, purpose)`; nunca UPDATE |
| `CookiePreference` | **Estado operacional** da UI | Upsert por usuário (`userId` único); NÃO é evidência |

### Endpoints e semântica de status

| Endpoint | Auth | Comportamento |
|---|---|---|
| `GET /api/legal-docs` | pública | Metadados dos documentos ATIVOS (sem texto, sem flags internas) |
| `POST /api/consent` | Clerk | Grant → `201`; reenvio idêntico → `200 {duplicate:true}`; `403 CROSS_USER_TARGETING` (body `userId` ≠ sujeito do token); `422 INVALID_PAYLOAD` (listas fechadas / versão inativa) |
| `GET /api/consent` | Clerk | Histórico próprio, mais recente primeiro |
| `GET /api/consent/status` | Clerk | `mandatoryCurrent`, `current[]`, `requiredDocs[]` |
| `POST /api/consent/revoke` | Clerk | Revogação opcional (append) → `201`; obrigatório (`service`) → **`409 MANDATORY_NOT_REVOCABLE`**; documento desconhecido/inativo → `404 DOCUMENT_NOT_FOUND` |
| `GET/POST /api/consent/preferences` | Clerk | Upsert `CookiePreference` (categorias validadas contra `COOKIE_CATEGORIES`) |
| `GET /api/consent/export` | Clerk | Dados próprios (perfil + histórico + preferências); campos selecionados — sem hashes de senha, roles ou IDs Stripe |
| `GET /api/consent/admin` | superadmin | Visão de governança paginada/filtrável; expõe só `userId` (sem PII adicional) |
| `POST /api/businesses` | Clerk | Gate de re-consentimento **fail-closed**: obrigatório ausente/desatualizado → **`409 CONSENT_REQUIRED`** (admin/superadmin isentos) |

O sujeito é **sempre derivado do token Clerk verificado** (`ensureUserByClerkId` upsert);
qualquer `userId` alheio no body é rejeitado com `403 CROSS_USER_TARGETING` e nada é gravado.

### Script gate (scripts opcionais nunca carregam antes do consentimento)

`src/lib/scriptGate.ts` é o ponto único de carga de scripts de terceiros: todo script opcional
deve passar por `registerOptionalScript(categoria, loader)` e **nada carrega** até o
consentimento da categoria (`applyOptionalScriptConsent`). Nenhuma integração real de
analytics/marketing está registrada ainda — integrações futuras obrigatoriamente passam pelo
gate. A preferência fica em `localStorage` versionado (`conectaperu_cookie_prefs_v1`, com
migração do banner legado `conectaperu_cookie_consent`) e, para usuários autenticados,
sincroniza com `CookiePreference` via `POST /api/consent/preferences`. Categorias essenciais
não podem ser desativadas.

### Pré-requisito de release (D10) e verificação atual

```bash
npm test            # 22 arquivos / 238 testes — verde (gate de merge; inclui consent, script-gate,
                    #   cookie-manager, signup-intent, legal-config, check-legal, consent-rights…)
npm run check:legal # GATE LGPD (D10): falha (exit != 0) enquanto houver documento ATIVO com
                    #   legalApproved:false ou hash divergente. NÃO faz parte do npm test.
```

- **Estado atual:** `npm run check:legal` **falha por design** — 3 documentos ativos
  (`privacy_policy` v2, `terms_of_service` v1, `cookie_policy` v1) são placeholder com
  `legalApproved: false`. **Release bloqueado** até: (1) `npm run check:legal` passar, (2)
  aprovação do responsável/DPO dos textos PT-BR e da matriz de tratamento, e (3) confirmação do
  ponto de captura D1.
- **Páginas:** `/termos`, `/privacidade`, `/cookies`, `/reconsent` (tela de re-consentimento —
  usuários existentes que caem no gate `CONSENT_REQUIRED`) e `/preferencias` (preferências de
  consentimento/cookies).

## 🚧 Próximos Passos (Roadmap)

- [ ] **Webhooks Clerk** → Sincronizar usuários no Neon
- [ ] **API Routes** (Netlify Functions) para CRUD real
- [ ] **Upload de imagens** → Cloudinary/S3
- [ ] **Busca full-text** → PostgreSQL tsvector ou Meilisearch
- [ ] **PWA** → Service worker + manifest
- [ ] **i18n** → PT/ES/EN
- [ ] **Testes** → Vitest + Playwright

## 📄 Licença

MIT - Desenvolvido com ❤️ para a comunidade peruana no Brasil

---

**Links Úteis:**
- [Clerk Dashboard](https://dashboard.clerk.com/apps/app_3GVoHO4YI3D66tNLyOlNwdWdNfY)
- [Neon Console](https://console.neon.tech/)
- [Netlify Dashboard](https://app.netlify.com/)
- [GitHub Repo](https://github.com/SumaqBrDev/DiretorioPeruano)