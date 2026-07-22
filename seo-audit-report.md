# SEO Audit Report — ConectaPeru (DiretorioPeruano)

**Audit Date:** July 21, 2026  
**Site URL:** https://conectaperu.netlify.app/  
**Project:** DiretorioPeruano — Multi-sector business directory for the Peruvian community in Brazil  
**Stack:** React 18 + Vite + Tailwind CSS + Netlify (SPA, no SSR)  
**Languages:** pt-BR (primary), es-PE (alternate)  
**Auth:** Clerk (ClerkProvider)

---

## Executive Summary

**Overall Health: CRITICAL** — The site has fundamental SEO gaps that prevent search engines from properly discovering, indexing, and ranking its content. As a client-rendered SPA with zero SEO metadata, the site is effectively invisible to search engine crawlers. Several issues are quick wins; others require architectural changes.

### Top 5 Priority Issues
1. **SPA without SSR/prerendering** — Content is not indexable by Googlebot (JavaScript rendering gap)
2. **No XML Sitemap** — Crawlers cannot discover all pages efficiently
3. **No robots.txt** — No crawl instructions
4. **Zero Open Graph / Twitter Card tags** — No social previews on any platform
5. **All pages share identical title & meta description** — No unique page metadata

### Quick Wins
- ✅ Add robots.txt file to public/
- ✅ Add XML sitemap
- ✅ Add Open Graph tags to index.html
- ✅ Add favicon.ico file
- ❌ Most other fixes require build-time additions to index.html or SSR

---

## 1. Crawlability & Indexation

### 1.1 Robots.txt

| Issue | Impact | Evidence |
|-------|--------|----------|
| **No robots.txt exists** | HIGH | `https://conectaperu.netlify.app/robots.txt` serves the SPA shell (index.html) instead of a robots.txt file |
| Sitemap reference missing | HIGH | No sitemap URL declared for crawlers |

**Fix:** Create `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://conectaperu.netlify.app/sitemap.xml
```

### 1.2 XML Sitemap

| Issue | Impact | Evidence |
|-------|--------|----------|
| **No sitemap.xml exists** | HIGH | `https://conectaperu.netlify.app/sitemap.xml` serves the SPA shell |
| Dynamic URLs not in sitemap | HIGH | Business detail pages (`/negocio/1`, `/negocio/2`) should be in sitemap |
| No sitemap generation mechanism | HIGH | Vite build does not generate sitemaps |

**Fix:** Generate sitemap.xml at build time (e.g., `vite-plugin-sitemap` or a build script) that includes:
- `/` (home)
- `/busca`
- `/privacidade`
- `/termos`
- `/entrar`
- `/cadastrar`
- `/negocio/1`, `/negocio/2` (each business listing)

### 1.3 JavaScript Rendering / SPA Architecture

| Issue | Impact | Evidence |
|-------|--------|----------|
| **Client-side rendering only** | CRITICAL | React SPA — all content rendered in browser via JS. Googlebot may not execute all JS |
| **No SSR (Server-Side Rendering)** | CRITICAL | Vite config shows no SSR plugin |
| **No pre-rendering / SSG** | HIGH | No static generation of pages |
| **No meta tag injection per route** | HIGH | All routes share the same `<title>` and `<meta>` from index.html |

**Impact on SEO:** Google can render JS but it's slower, less reliable, and secondary rendering ("Crawling Queue") means:
- Content discovery is delayed
- Dynamic route content (business detail pages) may never be indexed
- All pages appear identical in the cached HTML snapshot

**Priority Fixes (in order of effort/impact):**
1. **Short-term:** Use `react-helmet-async` to inject unique `<title>` and `<meta>` tags per route — improves SERP snippets even if JS is rendered
2. **Medium-term:** Add prerendering via Netlify Prerendering (`netlify-plugin-prerender`) or a headless browser pre-render service
3. **Long-term:** Migrate to Astro, Next.js (SSG/SSR), or a static site generator with data fetching

---

## 2. Technical Foundations

### 2.1 Meta Tags (Per Page Analysis)

#### Homepage (`/`)

| Tag | Current | Status | Fix |
|-----|---------|--------|-----|
| `<title>` | "ConectaPeru - O Hub do Empreendedor Peruano no Brasil" | ✅ OK but could be optimized | Keep, add secondary keyword |
| `<meta name="description">` | "ConectaPeru - Diretório Multi-Setorial de negócios peruanos no Brasil. Encontre gastronomia, serviços, e muito mais." | ✅ OK but ~120 chars; could use full 155-160 | Expand to include keyword variations |
| `<meta name="keywords">` | "restaurante peruano, ceviche, lomo saltado, comida peruana Brasil, comunidade peruana Brasil" | ⚠️ Google ignores since 2009 | Safe to remove |
| `<meta name="robots">` | Missing | ❌ Add | Add `index, follow` |
| `<link rel="canonical">` | Missing | ❌ Critical | Add `href="https://conectaperu.netlify.app/"` |
| Open Graph tags | Missing | ❌ Critical | Add `og:title`, `og:description`, `og:image`, `og:url`, `og:type=website` |
| Twitter Card tags | Missing | ❌ Critical | Add `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` |
| Viewport tag | Present | ✅ OK | Keep |
| Charset | Present | ✅ OK | Keep |
| hreflang | Missing | ❌ HIGH | Add `hreflang="pt-BR"` and `hreflang="es-PE"` with `x-default` |

#### Busca (`/busca`)

| Tag | Current | Status | Fix |
|-----|---------|--------|-----|
| `<title>` | Same as homepage | ❌ | Should be "Buscar Negócios — ConectaPeru" or similar |
| `<meta name="description">` | Same as homepage | ❌ | Should describe search functionality |
| `<h1>` | "Buscar Negócios" (from i18n `search.title`) | ✅ | OK — dynamic heading is good |

#### Negocio (`/negocio/:id`)

| Tag | Current | Status | Fix |
|-----|---------|--------|-----|
| `<title>` | Same as homepage | ❌ Critical | Should be "El Ceviche de Lima — ConectaPeru" |
| `<meta description>` | Same as homepage | ❌ Critical | Should describe the specific business |
| `<h1>` | Business name (via `BusinessInfoCard`) | ✅ | Dynamic H1 from business data |
| JSON-LD schema | Missing | ❌ | Add LocalBusiness + Restaurant schema |
| BreadcrumbList schema | Missing | ❌ | Add despite visual breadcrumb |

#### Privacidade (`/privacidade`) & Termos (`/termos`)

| Tag | Current | Status | Fix |
|-----|---------|--------|-----|
| `<title>` | Same as homepage | ❌ | Should be "Política de Privacidade — ConectaPeru" / "Termos de Serviço — ConectaPeru" |
| `<h1>` | "Política de Privacidade" / "Termos de Serviço" | ✅ | Good, unique H1 |
| Content quality | Excellent | ✅ | Well-written, comprehensive LGPD compliance |

### 2.2 Open Graph / Social Sharing

**Status: COMPLETELY MISSING** — No Open Graph or Twitter Card tags anywhere in the HTML.

**Impact:** When users share ConectaPeru on WhatsApp, Facebook, LinkedIn, Twitter/X, Telegram, or Discord, the link appears as a bare URL or with auto-extracted (poor) preview.

**Fix in `index.html`:**
```html
<meta property="og:title" content="ConectaPeru - O Hub do Empreendedor Peruano no Brasil" />
<meta property="og:description" content="Diretório Multi-Setorial de negócios peruanos no Brasil. Encontre gastronomia, serviços, e muito mais." />
<meta property="og:image" content="https://conectaperu.netlify.app/og-image.png" />
<meta property="og:url" content="https://conectaperu.netlify.app/" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="pt_BR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="ConectaPeru - O Hub do Empreendedor Peruano no Brasil" />
<meta name="twitter:description" content="Diretório Multi-Setorial de negócios peruanos no Brasil." />
```

**Additional:** For per-page OG tags (business pages), use `react-helmet-async` or a `<Helmet>` approach.

### 2.3 Canonical URLs

**Status: MISSING** — No `<link rel="canonical">` tag anywhere.

**Impact:** Without canonical tags, Google may treat different URL variants (with/without trailing slash, query params, www vs non-www) as duplicate content. Since this is an SPA, duplicate content risk is moderate (same page served for all routes), but it's still a best practice violation.

**Fix:** Add self-referencing canonical to every route.

### 2.4 Schema Markup (JSON-LD)

**Status: COMPLETELY MISSING**

**Impact:** Without structured data:
- Google cannot display rich results (star ratings, price ranges, business info)
- Local business info is not surfaced in Google Maps/Knowledge Panel
- Breadcrumbs are not shown in SERPs
- Search results look generic

**Required schemas:**

1. **Organization** (homepage):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ConectaPeru",
  "description": "Diretório Multi-Setorial de negócios peruanos no Brasil",
  "url": "https://conectaperu.netlify.app/",
  "areaServed": ["BR"],
  "knowsLanguage": ["pt-BR", "es-PE"],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contato@conectaperu.com.br",
    "contactType": "customer service"
  }
}
```

2. **LocalBusiness / Restaurant** (business detail pages):
```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "El Ceviche de Lima",
  "description": "Fundado em 2018 por chefs peruanos...",
  "image": "https://images.unsplash.com/photo-...",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua Augusta, 2500",
    "addressLocality": "São Paulo",
    "addressRegion": "SP",
    "postalCode": "01305-000",
    "addressCountry": "BR"
  },
  "telephone": "+55 11 98765-4321",
  "priceRange": "$$",
  "servesCuisine": "Peruvian",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "234"
  }
}
```

3. **BreadcrumbList** (all pages with breadcrumbs):
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Início",
    "item": "https://conectaperu.netlify.app/"
  }, {
    "@type": "ListItem",
    "position": 2,
    "name": "El Ceviche de Lima",
    "item": "https://conectaperu.netlify.app/negocio/1"
  }]
}
```

4. **ItemList** (search results on `/busca`):
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "item": { "@type": "LocalBusiness", "name": "El Ceviche de Lima" } }
  ]
}
```

### 2.5 Favicon

**Status: MISSING** — `index.html` references `<link rel="icon" href="/favicon.ico" />` but no favicon.ico exists in `public/`.

**Fix:** Generate and place `favicon.ico` (16×16 or 32×32) in `public/`. Also add:
```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### 2.6 Internationalization (hreflang)

**Status: MISSING** — Site supports pt-BR and es-PE via i18next, but no hreflang annotations exist.

**Impact:** Google may serve the wrong language variant to users. es-PE content may not be indexed for Spanish-speaking queries.

**Fix:** Add hreflang to `<head>`:
```html
<link rel="alternate" hreflang="pt-BR" href="https://conectaperu.netlify.app/" />
<link rel="alternate" hreflang="es-PE" href="https://conectaperu.netlify.app/es/" />
<link rel="alternate" hreflang="x-default" href="https://conectaperu.netlify.app/" />
```

**Note:** The es-PE locale would need a URL strategy (e.g., `/es/` prefix) for this to work properly.

---

## 3. On-Page SEO

### 3.1 Heading Structure

| Page | H1 Count | H2 Count | Hierarchy | Status |
|------|----------|----------|-----------|--------|
| Home | 1 | 5+ | H1 → H2 → H3 | ✅ Excellent |
| Busca | 1 | 2 | H1 → H2 | ✅ Good |
| Negocio | 1 | Multiple tab headers | H1 → H2 | ✅ Good, but H1 from BusinessInfoCard is good |
| Privacidade | 1 | Multiple section H2s | H1 → H2 | ✅ Excellent |
| Termos | 1 | Multiple section H2s | H1 → H2 | ✅ Excellent |
| Login | 1 | 0 | Only H1 | ⚠️ Acceptable for login page |

**Overall heading structure is very good** — proper hierarchy, single H1 per page, descriptive headings.

### 3.2 Content Quality

| Page | Quality | Notes |
|------|---------|-------|
| Home | ✅ Good | Compelling hero, clear CTA, stats, categories, testimonials |
| Busca | ✅ Good | Search with filters, clear results |
| Negocio | ✅ Very Good | Detailed business info with menu, reviews, hours, gallery |
| Privacidade | ✅ Excellent | Comprehensive LGPD privacy policy |
| Termos | ✅ Excellent | Thorough terms of service |
| Login | ⚠️ Minimal | Thin but acceptable for auth page |

**Content is generally high quality** — original, well-written Portuguese, good depth on legal pages.

### 3.3 Image Optimization

| Aspect | Status | Notes |
|--------|--------|-------|
| Alt text (business images) | ✅ Good | `alt={business.name}` on business cards, `alt={`Foto principal de ${name}`}` on galleries |
| Alt text (decorative images) | ✅ Correct | Hero background uses `alt=""` (properly decorative) |
| Alt text (category images) | ✅ OK | Category grid uses `alt=""` for background images (decorative — correct) |
| File naming | ⚠️ Poor | All images are Unsplash CDN URLs, not descriptive filenames |
| Image compression | ⚠️ Unknown | Unsplash provides optimized images, but no WebP conversion verified |
| Lazy loading | ✅ Good | `loading="lazy"` on business images, `loading="eager"` on hero (correct) |
| Responsive images | ❌ Missing | No `srcset` or `<picture>` elements for different viewport sizes |

### 3.4 Internal Linking

| Aspect | Status | Notes |
|--------|--------|-------|
| Navigation | ✅ Good | Home, Buscar, auth in navbar |
| Business cards link to detail | ✅ Good | `Link` to `/negocio/:id` |
| Category grid links to filtered search | ✅ Good | `/busca?categoria=...` |
| Footer links | ✅ Good | Privacy and Terms linked |
| Breadcrumbs | ✅ Good | Present on detail and legal pages |
| Orphan pages | ❌ Potential | Inbox, Admin, Moderar, Onboarding linked only through auth |

---

## 4. Performance & Core Web Vitals

### 4.1 Estimated Performance

Based on code review (live PageSpeed not accessible):

| Metric | Estimated | Status |
|--------|-----------|--------|
| **TTFB** | ~200-400ms (Netlify CDN) | ✅ Good |
| **LCP** | ~2.5-4s (hero image heavy) | ⚠️ Needs testing |
| **CLS** | ~0.05-0.10 (design uses fixed aspect ratios) | ✅ Likely good |
| **JavaScript** | ~320KB gzipped bundle | ⚠️ Moderate |
| **CSS** | ~49KB (Tailwind) | ✅ Good |

**Findings:**
- Hero image (1920w Unsplash) is large and sets LCP candidate
- Google Fonts (Inter + Playfair Display) add ~200-300KB
- Motion (framer-motion) library adds bundle size
- All images served from Unsplash CDN (good CDN, but no local optimization)

### 4.2 Security

| Aspect | Status | Evidence |
|--------|--------|----------|
| HTTPS | ✅ | Netlify provides auto HTTPS |
| HSTS | ✅ | Netlify default |
| X-Frame-Options: DENY | ✅ | In netlify.toml headers |
| X-Content-Type-Options: nosniff | ✅ | In netlify.toml |
| Referrer-Policy | ✅ | In netlify.toml |
| Permissions-Policy | ✅ | In netlify.toml |

**Security is excellent** — proper headers set via netlify.toml.

---

## 5. Authority & Trust Signals

### 5.1 E-E-A-T Assessment

| Signal | Status | Notes |
|--------|--------|-------|
| Author/Expert info | ❌ Missing | No "About" page, no author bios |
| Contact info | ⚠️ Partial | Email in privacy/terms pages only; no phone |
| Address/Physical location | ❌ Missing | No physical business address on homepage |
| Business transparency | ✅ Good | Privacy policy, terms, cookie consent — all well-written |
| Original content | ✅ Good | All content is original Portuguese |
| User reviews/social proof | ✅ Good | Testimonials, rating system |
| External authority | ❌ Unknown | No backlink/profile data available |

### 5.2 Missing Trust Pages

- **About Us page** — Who runs ConectaPeru, mission, team
- **Contact page** — Contact form or clearer contact info
- **Social media presence** — No social links (Instagram, Facebook, etc.)

---

## 6. Keyword Analysis

### 6.1 Current Keyword Targeting

| Keyword | Presence | Notes |
|---------|----------|-------|
| "restaurante peruano Brasil" | ✅ In meta keywords, content | Weak — in keywords tag only (ignored by Google) |
| "comida peruana Brasil" | ✅ In meta keywords | Same issue |
| "negócios peruanos Brasil" | ✅ In title, headings | Good placement |
| "ceviche" | ✅ In content, business names | Good |
| "lomo saltado" | ✅ In business data | Should be more prominent |
| "comunidade peruana Brasil" | ✅ In hero/subtitle | Good |
| "diretório peruano" | ❌ Not present | Missed — brand could rank for this |
| "peruano em São Paulo" | ❌ Not optimized | City-specific long-tail missing |
| "mercado peruano Rio de Janeiro" | ❌ Not optimized | City + category long-tail missing |

### 6.2 Missed Opportunities

- **City + Category + "Peruano"** pages — e.g., "restaurante peruano em São Paulo", "salão peruano no Rio de Janeiro"
- **"Peruvian community in Brazil"** (English-language queries from tourists)
- **"Peruvian grocery near me"** — local search intent

---

## 7. Action Plan

### 🔴 Critical (Fix Immediately)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Create `public/robots.txt` with Allow rules and sitemap reference | 5 min | HIGH |
| 2 | Create `public/sitemap.xml` with all static pages + business URLs | 30 min | HIGH |
| 3 | Add Open Graph + Twitter Card meta tags to `index.html` | 15 min | HIGH |
| 4 | Create `public/favicon.ico` and `public/og-image.png` | 30 min | HIGH |
| 5 | Add `react-helmet-async` for per-page meta injection (title, description, canonical, OG) | 2-4 hours | HIGH |
| 6 | Add self-referencing canonical tag to all pages | 30 min | HIGH |

### 🟡 High Priority (This Sprint)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 7 | Add JSON-LD Organization schema to homepage | 1 hour | HIGH |
| 8 | Add JSON-LD LocalBusiness + Restaurant schema to business detail pages | 2-3 hours | HIGH |
| 9 | Add JSON-LD BreadcrumbList schema to pages with breadcrumbs | 1 hour | MEDIUM |
| 10 | Implement prerendering (Netlify Prerendering or similar) for JS content | 4-8 hours | HIGH |
| 11 | Add hreflang tags for pt-BR and es-PE | 1 hour | MEDIUM |
| 12 | Create unique title and meta description for each page via react-helmet | 2-3 hours | HIGH |

### 🟢 Medium Priority (Next Sprint)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 13 | Set up custom domain (e.g., conectaperu.com.br) | 1-2 hours | HIGH |
| 14 | Add srcset/responsive images for better performance | 2-4 hours | MEDIUM |
| 15 | Create "About Us" and "Contact" pages | 2-4 hours | MEDIUM |
| 16 | Add social media links (Instagram, Facebook) | 30 min | LOW |
| 17 | Implement analytics (Google Analytics 4 + Search Console) | 1 hour | MEDIUM |
| 18 | Generate and submit sitemap to Google Search Console | 1 hour | HIGH |

### 🔵 Long-term

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 19 | Migrate to SSG/SSR (Astro, Next.js) for full SEO control | 2-4 weeks | HIGH |
| 20 | Implement city + category landing pages for local SEO | 1-2 weeks | HIGH |
| 21 | Build backlinks through partnerships with Peruvian community orgs in Brazil | Ongoing | HIGH |
| 22 | Create blog/content section for "Guia do Peruano no Brasil" topics | 2-4 weeks | MEDIUM |

---

## 8. Recommendations Summary

### Week 1 (Critical Fixes)
1. ✅ `robots.txt` + `sitemap.xml` — 30 min
2. ✅ `favicon.ico` + Open Graph image — 30 min
3. ✅ Add OG/Twitter tags to `index.html` — 15 min
4. ✅ Install `react-helmet-async`, inject unique meta per route — 2-4 hours
5. ✅ Add canonical URL tag — 15 min

### Week 2 (High Impact)
6. ✅ Add JSON-LD schemas (Organization, LocalBusiness, BreadcrumbList) — 3-4 hours
7. ✅ Set up Netlify Prerendering for crawlers — 4-8 hours
8. ✅ Register custom domain + Google Search Console — 2 hours

### Week 3-4 (Foundation)
9. 🔄 Create About/Contact pages
10. 🔄 Add city+category landing pages
11. 🔄 Set up analytics
12. 🔄 Begin outreach for backlinks

---

## 9. Resources Required

- **Developer time:** ~16-24 hours for critical + high priority items
- **Designer:** Custom OG image (1200×630px) + favicon
- **Domain:** conectaperu.com.br (or similar) — ~R$40/year
- **Tools:** Google Search Console (free), Google Analytics 4 (free)

---

*Report generated via SEO audit framework. Schema detection performed via live HTTP response inspection (SPA renders metadata client-side — only static HTML available for analysis).*
