/**
 * Pós-build para GitHub Pages:
 *  - gera um index.html por rota com título, descrição, canonical e Open Graph próprios (SEO)
 *  - 404.html = aplicativo (rotas dinâmicas como /consulta/:token e /admin funcionam)
 *  - sitemap.xml e robots.txt
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const SITE = (process.env.VITE_SITE_URL ?? 'https://duduwwl.github.io/clinica-vivaz').replace(/\/$/, '')
const html = readFileSync(join(DIST, 'index.html'), 'utf8')

const content = readFileSync('src/lib/content.ts', 'utf8')
const grab = (re) => [...content.matchAll(re)].map((m) => m.slice(1))
const specs = grab(/slug: '([a-z0-9-]+)',\s*\n\s*name: '([^']+)',\s*\n\s*summary:\s*'([^']+)'/g)
const pros = grab(/slug: '([a-z0-9-]+)',\s*\n\s*name: '([^']+)',\s*\n\s*title: '([^']+)'/g)

const routes = [
  ['/', 'Clínica Vivaz · Saúde integral da mulher em Lavras-MG', 'Ginecologia 40+, menopausa, mastologia, obstetrícia e nutrição em Lavras-MG. Veja os próximos horários livres e agende sua consulta on-line na Clínica Vivaz.'],
  ['/especialidades', 'Especialidades · Clínica Vivaz', 'Ginecologia 40+ e menopausa, cirurgia e laser íntimo, mastologia, ginecologia e obstetrícia, nutrição funcional e clínica na Clínica Vivaz, em Lavras-MG.'],
  ['/equipe', 'Equipe · Clínica Vivaz', 'Conheça as médicas e nutricionistas da Clínica Vivaz, em Lavras-MG, e agende direto na agenda de cada uma.'],
  ['/a-clinica', 'A clínica · Clínica Vivaz', 'Conheça a história e os ambientes da Clínica Vivaz, inaugurada em outubro de 2025 no bairro Ouro Preto, em Lavras-MG.'],
  ['/contato', 'Contato e localização · Clínica Vivaz', 'Clínica Vivaz: Rua Professor Alberto de Carvalho, 174, bairro Ouro Preto, Lavras-MG. WhatsApp, mapa e orientações para a consulta.'],
  ['/agendar', 'Agendar consulta · Clínica Vivaz', 'Escolha a especialidade, a profissional, o dia e o horário livre e agende sua consulta na Clínica Vivaz, em Lavras-MG.'],
  ['/privacidade', 'Política de privacidade · Clínica Vivaz', 'Como a Clínica Vivaz trata os dados pessoais de pacientes e visitantes, conforme a LGPD.'],
  ...specs.map(([slug, name, summary]) => [`/especialidades/${slug}`, `${name} em Lavras-MG · Clínica Vivaz`, `${summary} Agende na Clínica Vivaz, em Lavras-MG.`]),
  ...pros.map(([slug, name, title]) => [`/equipe/${slug}`, `${name} · ${title} · Clínica Vivaz`, `Conheça ${name} (${title}) e agende sua consulta na Clínica Vivaz, em Lavras-MG.`]),
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

for (const [path, title, desc] of routes) {
  const url = SITE + (path === '/' ? '/' : path + '/')
  const page = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(desc)}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(title)}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(desc)}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
  if (path === '/') {
    writeFileSync(join(DIST, 'index.html'), page)
  } else {
    mkdirSync(join(DIST, path), { recursive: true })
    writeFileSync(join(DIST, path, 'index.html'), page)
  }
}

const notFound = html
  .replace(/<title>[^<]*<\/title>/, '<title>Clínica Vivaz</title>')
  .replace('<meta name="theme-color"', '<meta name="robots" content="noindex" />\n    <meta name="theme-color"')
writeFileSync(join(DIST, '404.html'), notFound)

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map(([p]) => `  <url><loc>${SITE}${p === '/' ? '/' : p + '/'}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /clinica-vivaz/admin\nDisallow: /clinica-vivaz/consulta/\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`postbuild: ${routes.length} páginas, sitemap.xml, robots.txt, 404.html`)
