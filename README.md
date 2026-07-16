# ConectaPerú - Diretório Peruano no Brasil

> **Conectando o Peru ao Brasil** - Diretório de negócios peruanos no Brasil

## 🚀 Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (custom design system: ají-rojo, oro-inca, creme-andino, noite-lima, verde-brasil)
- **Auth:** Clerk (React SDK)
- **Database:** Neon PostgreSQL + Prisma ORM
- **Deploy:** Netlify (SPA)
- **Lint/Format:** Oxlint + Prettier

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
npm run lint         # Oxlint (rápido)
npm run format       # Prettier
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
- `BusinessProfile` - Perfis de negócios
- `Review` - Avaliações com moderação
- `Message` - Mensagens B2B

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