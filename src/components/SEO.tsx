import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
  noFollow?: boolean;
  locale?: 'pt-BR' | 'es-PE';
}

const defaultImage = 'https://conectaperu.netlify.app/og-image.png';
const siteName = 'ConectaPeru';
const baseUrl = 'https://conectaperu.netlify.app';

export const SEO = ({
  title,
  description,
  image = defaultImage,
  url,
  type = 'website',
  noIndex = false,
  noFollow = false,
  locale = 'pt-BR',
}: SEOProps) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // Usar locale atual do i18n se não fornecido
  const currentLocale = locale || i18n.language || 'pt-BR';
  const hreflang = currentLocale === 'es-PE' ? 'es-PE' : 'pt-BR';

  const pageTitle = title
    ? `${title} | ${siteName}`
    : `${siteName} - ${t('brand.tagline') || 'O Hub do Empreendedor Peruano no Brasil'}`;

  const pageDescription = description || t('brand.description') || 'Diretório Multi-Setorial de negócios peruanos no Brasil. Conectando a comunidade peruana no Brasil.';

  const canonicalUrl = url ? `${baseUrl}${url}` : `${baseUrl}${location.pathname}`;

  const hreflangLinks = [
    { hreflang: 'pt-BR', href: `${baseUrl}${location.pathname}` },
    { hreflang: 'es-PE', href: `${baseUrl}${location.pathname}` },
    { hreflang: 'x-default', href: `${baseUrl}${location.pathname}` },
  ];

  return (
    <Helmet>
      <html lang={currentLocale} />

      {/* Title */}
      <title>{pageTitle}</title>

      {/* Meta básicos */}
      <meta name="description" content={pageDescription} />
      <meta name="theme-color" content="#C0392B" />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex" />}
      {noFollow && <meta name="robots" content="nofollow" />}
      {!noIndex && !noFollow && <meta name="robots" content="index, follow" />}

      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang */}
      {hreflangLinks.map((link) => (
        <link key={link.hreflang} rel="alternate" hreflang={link.hreflang} href={link.href} />
      ))}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={pageTitle} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={hreflang} />
      <meta property="og:locale:alternate" content={hreflang === 'pt-BR' ? 'es_PE' : 'pt_BR'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={pageTitle} />

      {/* Meta adicionais para SEO local */}
      <meta name="geo.region" content="BR" />
      <meta name="geo.placename" content="Brasil" />
      <meta name="ICBM" content="-23.5505, -46.6333" />

      {/* JSON-LD Schema.org - WebSite com SearchAction */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteName,
          url: baseUrl,
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${baseUrl}/busca?q={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          },
          inLanguage: ['pt-BR', 'es-PE']
        })}
      </script>

      {/* JSON-LD Schema.org - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: siteName,
          url: baseUrl,
          logo: `${baseUrl}/conectaperu-logo.png`,
          description: pageDescription,
          sameAs: [
            'https://www.facebook.com/ConectaPeru',
            'https://www.instagram.com/conectaperu',
            'https://www.linkedin.com/company/conectaperu'
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+55-11-99999-9999',
            contactType: 'customer service',
            availableLanguage: ['Portuguese', 'Spanish']
          },
          areaServed: 'BR',
          foundingDate: '2024',
          knowsAbout: ['Negócios peruanos', 'Comunidade peruana no Brasil', 'Gastronomia peruana', 'Serviços profissionais']
        })}
      </script>

      {/* JSON-LD Schema.org - BreadcrumbList para páginas internas */}
      {location.pathname !== '/' && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: location.pathname
              .split('/')
              .filter(Boolean)
              .map((segment, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
                item: `${baseUrl}/${location.pathname.split('/').slice(0, index + 1).join('/')}`
              }))
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;