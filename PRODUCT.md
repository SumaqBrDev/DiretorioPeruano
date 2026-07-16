# PRODUCT.md - SaborPeruano

## Identidade do Produto

| Campo      | Valor                                                                                   |
|------------|-----------------------------------------------------------------------------------------|
| **Nome**   | SaborPeruano                                                                            |
| **Tagline**| *El sabor del Perú en tierra brasileña / O sabor do Peru em terra brasileira*          |
| **Tipo**   | Diretório de negócios peruanos no Brasil — iniciando por restaurantes                  |
| **Propósito** | Conectar peruanos que vivem no Brasil com negócios da sua comunidade, especialmente restaurantes e comida típica peruana |

---

## Visão do Produto

Peruanos que vivem no Brasil carregam consigo saudade da culinária, cultura e serviços do seu país. O **SaborPeruano** é o ponto de encontro digital dessa comunidade: um diretório moderno e bonito onde negócios peruanos no Brasil podem se registrar, exibir seus produtos e serviços, e ser encontrados facilmente por compatriotas ou por brasileiros curiosos sobre a cultura peruana.

A plataforma começa pelo segmento de **restaurantes**, mas é arquitetada para escalar para outros tipos de negócio (mercadinhos, salões de beleza, serviços jurídicos, etc.).

---

## Público-Alvo

### Consumidores
- Peruanos que vivem no Brasil e buscam comida, produtos e serviços da sua cultura.
- Brasileiros com interesse na culinária e cultura peruana.

### Negócios (Business)
- Restaurantes e lanchonetes peruanas no Brasil.
- Futuramente: mercados, salões de beleza, serviços profissionais, etc.
- Donos de negócio que querem visibilidade e conexão com sua comunidade.

### Administradores
- Equipe interna responsável por moderar conteúdo e manter a saúde da plataforma.

---

## Objetivos

1. **Ser o ponto de referência** para peruanos no Brasil encontrarem o que precisam da sua cultura.
2. **Facilitar o cadastro de negócios** de forma gratuita, simples e autossuficiente.
3. **Criar comunidade** através de avaliações, comentários moderados e comunicação entre negócios.
4. **Escalar por categoria**: iniciar com restaurantes, expandir para outros tipos de negócio.
5. **Ser bilíngue de verdade**: Português e Espanhol com qualidade de tradução nativa, não automática.

---

## Funcionalidades por Módulo

### 1. Catálogo de Negócios

- Listagem paginada e com cards visuais por tipo de negócio (categoria).
- Filtro por **categoria** (ex.: Restaurante, Mercado, Serviços).
- Busca por:
  - Nome do negócio.
  - Endereço (endereço exato, cidade ou estado).
  - Tags customizadas do negócio (ex.: `#ceviche`, `#lomo-saltado`, `#almoço-executivo`).
- Ordenação por: mais recentes, melhor avaliados, mais comentados.
- Cards com: foto de capa, nome, categoria, tags, cidade/estado, média de estrelas.

### 2. Página do Negócio

- Galeria de fotos (upload pelo dono do negócio).
- Endereço completo com mapa integrado (Google Maps embed).
- Descrição livre do negócio.
- Tags personalizadas.
- Horário de funcionamento (opcional).
- Telefone / WhatsApp / Redes sociais (opcional).
- Seção de avaliações e comentários do público.
- Área de resposta do negócio aos comentários.

### 3. Autenticação e Cadastro

- Provedor de autenticação: **Clerk** ou **Auth0** (a definir na fase de setup).
- Registro gratuito para negócios.
- Login social (Google, e-mail/senha).
- Fluxo de onboarding para negócios após o primeiro login (preencher dados, foto, endereço, tags).

### 4. Sistema de Avaliações e Comentários

| Ação                                    | Consumidor | Negócio | Administrador |
|-----------------------------------------|:----------:|:-------:|:-------------:|
| Postar comentário em negócio            | ✅          | ❌       | ❌             |
| Dar nota (1–5 estrelas)                 | ✅          | ❌       | ❌             |
| Responder a comentário no próprio negócio | ❌        | ✅       | ❌             |
| Moderar (aprovar / rejeitar) comentários | ❌         | ❌       | ✅             |
| Excluir qualquer comentário             | ❌          | ❌       | ✅             |

**Fluxo de moderação**: comentários ficam em estado `pendente` até aprovação do administrador antes de aparecerem publicamente. O negócio é notificado quando um comentário é aprovado.

### 5. Inbox entre Negócios (B2B)

- Canal privado de mensagens diretas exclusivo entre contas do tipo **Negócio**.
- Não visível para consumidores.
- Interface tipo inbox/DM (não é chat em tempo real na v1, pode ser assíncrono com notificação por e-mail).
- Um negócio **não pode** deixar avaliação ou comentário público em outro negócio.

### 6. Painel do Administrador

- Lista de todos os negócios com status (ativo / inativo / pendente).
- Ação: inativar, reativar ou excluir permanentemente um negócio.
- Fila de comentários pendentes de moderação com ações: aprovar / rejeitar / marcar como spam.
- Visão de mensagens reportadas (se implementado sistema de denúncia).
- Métricas básicas: total de negócios, total de usuários, comentários pendentes.

### 7. Seletor de Idioma

- Alternância entre **Português (PT-BR)** e **Español (ES-PE)** disponível em toda a interface.
- Persistência da preferência no perfil do usuário (ou `localStorage` para visitantes).
- Todas as strings da UI, mensagens de erro e e-mails transacionais devem ser bilíngues.

---

## Tipos de Usuário e Permissões

### Consumidor
- Cria conta para comentar e avaliar.
- Pode editar ou excluir seus próprios comentários enquanto estiverem pendentes.
- Vê o status de aprovação dos seus comentários.

### Negócio
- Acesso ao painel do negócio: editar informações, galeria de fotos, tags.
- Responde a comentários aprovados no seu próprio perfil.
- Acessa o inbox para comunicação com outros negócios.
- Um negócio está vinculado a **um único perfil de página**.

### Administrador
- Acesso total ao painel de administração.
- Única role com poder de moderar comentários e gerenciar negócios.
- Não é uma role pública; atribuída internamente.

---

## Design e Identidade Visual

### Conceito
**"Peru no coração, Brasil em volta."**

O design deve transmitir calor, cor e pertencimento. Usar referências visuais que unem as duas culturas: os padrões têxteis andinos (qeros, mantas), as cores vibrantes da culinária peruana (vermelho ají, amarelo pisco, verde huacatay), com toques do verde e amarelo brasileiro e a exuberância tropical.

### Paleta de Cores (base)

| Nome         | Hex       | Uso                                              |
|--------------|-----------|--------------------------------------------------|
| Ají Rojo     | `#C0392B` | Cor primária, CTAs principais                    |
| Oro Inca     | `#F39C12` | Destaques, badges, estrelas                      |
| Verde Brasil | `#27AE60` | Ações secundárias, elementos positivos           |
| Creme Andino | `#FAF3E0` | Fundo claro, cards                               |
| Noche Lima   | `#1A1A2E` | Fundo escuro, texto principal no modo escuro     |
| Branco Pisco | `#FFFFFF` | Backgrounds, espaço negativo                     |

### Tipografia (sugestão)
- **Títulos**: Fonte serifada expressiva (ex.: *Playfair Display*, *Cormorant Garamond*) — traz nobreza e identidade cultural.
- **Corpo / UI**: Fonte sans-serif moderna (ex.: *Inter*, *DM Sans*) — legibilidade e limpeza.

### Animações e Interações
- Hero section com animação de entrada (fade + slide) e fundo com padrão têxtil andino animado (SVG ou CSS).
- Cards de negócio com hover 3D tilt sutil e elevação de sombra.
- Skeleton loaders nos cards durante carregamento.
- Transição suave entre seções (scroll-triggered reveals com `Intersection Observer`).
- Contador animado na seção "Nossos Números" (total de negócios, cidades, avaliações).
- Carrossel de fotos na página do negócio com transição tipo swipe.
- Toast notifications animadas para ações (comentário enviado, negócio salvo, etc.).
- Seletor de idioma com micro-animação de troca de bandeira (🇵🇪 ↔ 🇧🇷).

### Seções da Landing Page (visitante não logado)
1. **Hero** — Tagline + busca rápida + imagem de comida peruana vibrante.
2. **Como Funciona** — 3 passos ilustrados (Busca → Encontra → Conecta).
3. **Categorias em Destaque** — grid de categorias com ícones ilustrados.
4. **Restaurantes em Destaque** — carrossel de cards dos negócios mais bem avaliados.
5. **Nossos Números** — contadores animados (negócios, cidades, avaliações).
6. **Depoimentos** — comentários reais de consumidores (moderados).
7. **Para Seu Negócio** — CTA para donos de negócio se cadastrarem gratuitamente.
8. **Footer** — links úteis, seletor de idioma, redes sociais, créditos.

---

## Arquitetura de Dados (Entidades Principais)

```
User
  ├── id, email, name, avatar
  ├── role: consumer | business | admin
  └── language_preference: pt-BR | es-PE

BusinessProfile
  ├── id, owner_user_id
  ├── name, description, category
  ├── address (street, city, state, zip, lat, lng)
  ├── tags: string[]
  ├── photos: url[]
  ├── contact (phone, whatsapp, instagram, website)
  ├── status: active | inactive | pending
  └── created_at, updated_at

Review
  ├── id, business_id, consumer_user_id
  ├── rating: 1–5
  ├── comment: text
  ├── status: pending | approved | rejected
  └── created_at

ReviewReply
  ├── id, review_id, business_user_id
  ├── reply: text
  └── created_at

Message (B2B Inbox)
  ├── id, from_business_id, to_business_id
  ├── body: text
  ├── read: boolean
  └── created_at
```

---

## Internacionalização (i18n)

- Framework recomendado: **i18next** (React) ou equivalente.
- Namespaces: `common`, `auth`, `business`, `review`, `admin`.
- Arquivos de tradução em JSON para `pt-BR` e `es-PE`.
- Conteúdo gerado por usuários (nomes, descrições, comentários) não é traduzido automaticamente — é exibido no idioma em que foi escrito.

---

## Roadmap de Fases

### Fase 1 — MVP (Restaurantes)
- [ ] Autenticação (Clerk ou Auth0).
- [ ] Cadastro e onboarding de negócio (restaurantes).
- [ ] Catálogo público com busca e filtros.
- [ ] Página de detalhes do negócio com galeria.
- [ ] Seletor de idioma PT-BR / ES-PE.
- [ ] Design completo com animações e identidade visual.
- [ ] Landing page pública.

### Fase 2 — Comunidade
- [ ] Sistema de avaliações com estrelas.
- [ ] Comentários com fluxo de moderação pelo admin.
- [ ] Painel básico do administrador.
- [ ] Resposta do negócio aos comentários.

### Fase 3 — Rede B2B
- [ ] Inbox privado entre negócios.
- [ ] Notificações por e-mail (novo comentário aprovado, nova mensagem inbox).
- [ ] Painel do negócio com métricas (visualizações, avaliações recebidas).

### Fase 4 — Expansão de Categorias
- [ ] Novas categorias além de restaurantes (mercados, serviços, etc.).
- [ ] Sistema de planos (free vs. premium com destaque no diretório).
- [ ] App mobile (PWA ou React Native).

---

## Tecnologias Recomendadas

| Camada          | Opção Recomendada                            | Alternativa              |
|-----------------|----------------------------------------------|--------------------------|
| Frontend        | Next.js 14+ (App Router)                     | Remix, Astro             |
| Estilização     | Tailwind CSS + shadcn/ui                     | CSS Modules              |
| Animações       | Framer Motion                                | GSAP, CSS puro           |
| Autenticação    | **Clerk**                                    | Auth0                    |
| Backend/API     | Next.js API Routes / tRPC                    | FastAPI, Express         |
| Banco de dados  | PostgreSQL (via Supabase ou Railway)         | PlanetScale (MySQL)      |
| ORM             | Prisma                                       | Drizzle ORM              |
| Upload de fotos | Cloudinary ou Uploadthing                    | AWS S3                   |
| Mapas           | Google Maps Embed API                        | Leaflet + OpenStreetMap  |
| i18n            | next-intl ou i18next                         | react-i18next            |
| Deploy          | Vercel                                       | Railway, Render          |

---

## Tom e Personalidade

- **Acolhedor e nostálgico**: fala à saudade e ao pertencimento da comunidade peruana.
- **Vibrante e colorido**: a culinária e cultura peruana são exuberantes — o design reflete isso.
- **Confiável**: moderação de conteúdo e verificação de negócios transmitem seriedade.
- **Bilíngue de alma**: não apenas traduzido, mas escrito nativamente nas duas línguas.

---

## Notas para o Desenvolvedor

- Todo o sistema de comentários deve ter **moderação ativa** antes de publicação — nunca exibir comentários sem aprovação prévia.
- Um usuário com role `business` **não pode** deixar avaliação ou comentário público em outro negócio (validação no backend).
- O campo `tags` deve ter sugestão inteligente com as tags já existentes no sistema para evitar duplicatas (ex.: `#ceviche` e `#Ceviche` devem ser a mesma tag).
- Endereços devem ter campo de **estado brasileiro** como select (UF) para facilitar busca por estado.
- Preparar o schema desde o início para suportar múltiplas categorias — mesmo que apenas `restaurante` seja ativo no MVP.