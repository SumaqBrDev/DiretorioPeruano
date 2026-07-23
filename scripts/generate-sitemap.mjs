import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://conectaperu.netlify.app';
const OUTPUT_PATH = path.resolve('public/sitemap.xml');

// Static pages
const staticPages = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/busca', changefreq: 'daily', priority: 0.9 },
  { url: '/meu-negocio', changefreq: 'weekly', priority: 0.7 },
  { url: '/inbox', changefreq: 'weekly', priority: 0.6 },
  { url: '/onboarding', changefreq: 'monthly', priority: 0.5 },
  { url: '/entrar', changefreq: 'monthly', priority: 0.3 },
  { url: '/cadastrar', changefreq: 'monthly', priority: 0.3 },
  { url: '/privacidade', changefreq: 'yearly', priority: 0.2 },
  { url: '/termos', changefreq: 'yearly', priority: 0.2 },
];

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  xml += 'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <xhtml:link rel="alternate" hreflang="pt-BR" href="' + BASE_URL + page.url + '" />\n';
    xml += '    <xhtml:link rel="alternate" hreflang="es-PE" href="' + BASE_URL + page.url + '" />\n';
    xml += '    <xhtml:link rel="alternate" hreflang="x-default" href="' + BASE_URL + page.url + '" />\n';
    xml += '  </url>\n';
  }

  // TODO: Add dynamic business pages from API/localStorage
  // Example:
  // const businesses = await fetchBusinesses();
  // for (const biz of businesses) {
  //   xml += `  <url>\n    <loc>${BASE_URL}/negocio/${biz.id}</loc>\n`;
  //   xml += `    <changefreq>weekly</changefreq>\n`;
  //   xml += `    <priority>0.8</priority>\n`;
  //   xml += `    <lastmod>${today}</lastmod>\n`;
  //   xml += '    <xhtml:link rel="alternate" hreflang="pt-BR" href="' + BASE_URL + '/negocio/' + biz.id + '" />\n';
  //   xml += '    <xhtml:link rel="alternate" hreflang="es-PE" href="' + BASE_URL + '/negocio/' + biz.id + '" />\n';
  //   xml += '    <xhtml:link rel="alternate" hreflang="x-default" href="' + BASE_URL + '/negocio/' + biz.id + '" />\n';
  //   xml += '  </url>\n';
  // }

  xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  xml += 'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <xhtml:link rel="alternate" hreflang="pt-BR" href="' + BASE_URL + page.url + '" />\n';
    xml += '    <xhtml:link rel="alternate" hreflang="es-PE" href="' + BASE_URL + page.url + '" />\n';
    xml += '    <xhtml:link rel="alternate" hreflang="x-default" href="' + BASE_URL + page.url + '" />\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  fs.writeFileSync(path.resolve('public/sitemap.xml'), xml);
  console.log('✅ sitemap.xml generated at public/sitemap.xml');
}

generateSitemap();