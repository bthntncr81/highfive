// HighFive landing — build-time per-route SEO prerender.
// `npx vite build` SONRASI çalışır. dist/index.html'i baz alıp her route için
// kendi <head>'i (title, description, canonical, OG/Twitter, robots, JSON-LD) olan
// statik HTML üretir: dist/<route>/index.html + dist/404.html.
// Body yine SPA mount'u (#root) kalır; JS hydrate eder. Yeni npm bağımlılığı YOK.
//
// NOT: Blog yazısı eklenince aşağıdaki ROUTES dizisine de eklenmeli (statik liste).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DIST = 'dist'
const ORIGIN = 'https://highfivepps.com'
const OG_IMG = ORIGIN + '/media/og-cover.jpg'
const SITE = 'High Five Pizza & Makarna'

const base = readFileSync(join(DIST, 'index.html'), 'utf8')

const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => escText(s).replace(/"/g, '&quot;')

const ORG = {
  '@type': 'Organization',
  name: SITE,
  logo: { '@type': 'ImageObject', url: ORIGIN + '/icon-512x512.png' },
}

const articleLd = (r, url) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: r.headline || r.title,
  description: r.description,
  image: OG_IMG,
  datePublished: r.date,
  dateModified: r.date,
  author: ORG,
  publisher: ORG,
  mainEntityOfPage: { '@type': 'WebPage', '@id': url },
})

function render(r) {
  let html = base
  const url = r.canonical || (ORIGIN + (r.path === '/' ? '/' : r.path))
  const ogTitle = r.ogTitle || r.title
  const ogDesc = r.ogDesc || r.description
  const ogType = r.ogType || 'website'
  const robots = r.noindex ? 'noindex, follow' : 'index, follow'

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(r.title)}</title>`)
  html = html.replace(/(<meta name="description" content=")[\s\S]*?("\s*\/>)/, `$1${escAttr(r.description)}$2`)
  html = html.replace(/(<meta name="robots" content=")[^"]*(")/, `$1${robots}$2`)
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escAttr(url)}$2`)
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escAttr(url)}$2`)
  html = html.replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${escAttr(ogType)}$2`)
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(ogTitle)}$2`)
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(ogDesc)}$2`)
  html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${escAttr(OG_IMG)}$2`)
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(ogTitle)}$2`)
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(ogDesc)}$2`)
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${escAttr(OG_IMG)}$2`)

  if (r.article) {
    html = html.replace('</head>', `    <script type="application/ld+json">${articleLd(r, url)}</script>\n  </head>`)
  }
  return html
}

function emit(r) {
  const html = render(r)
  const out = r.path === '/' ? join(DIST, 'index.html') : join(DIST, r.path.replace(/^\//, ''), 'index.html')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html)
}

const ROUTES = [
  { path: '/', ogType: 'restaurant',
    title: 'High Five Pizza & Makarna | Akçakoca Taş Fırın Pizza',
    description: 'Akçakoca’da taş fırın İtalyan pizza, el yapımı makarna ve premium sandviç. Kendi pizzanı tasarla, sadakat puanı kazan, online sipariş ver. Her gün 11:00–02:00.' },

  { path: '/menu',
    title: 'Menü – Pizza, Makarna, Sandviç | High Five Akçakoca',
    description: 'High Five Akçakoca menüsü: taş fırın pizzalar, el yapımı makarnalar, ciabatta & schiacciata sandviçler, içecekler ve tatlılar. Online sipariş ve paket servis.' },

  { path: '/build',
    title: 'Kendi Pizzanı & Sandviçini Tasarla | High Five',
    description: '5 adımda kendi pizzanı veya sandviçini tasarla: hamur, sos, peynir ve malzemeleri seç, canlı önizle ve sipariş ver. High Five Akçakoca.' },
  { path: '/build/pizza',
    title: 'Kendi Pizzanı Tasarla | High Five Akçakoca',
    description: 'Hamurdan malzemeye kendi pizzanı 5 adımda tasarla, canlı önizle ve sipariş ver. High Five Akçakoca taş fırın pizza.' },
  { path: '/build/sandwich',
    title: 'Kendi Sandviçini Tasarla | High Five Akçakoca',
    description: 'Ekmek, içerik ve soslarını seçerek kendi özel sandviçini tasarla ve sipariş ver. High Five Akçakoca.' },

  { path: '/blog',
    title: 'Blog – Akçakoca Yemek & Gezi Rehberi | High Five',
    description: 'Akçakoca yemek, gezi ve hafta sonu kaçamak rehberleri. Napoli pizzasının farkı, Akçakoca Kalesi sonrası nerede yenir ve daha fazlası.' },

  { path: '/blog/akcakoca-kalesi-rehberi-gezi-sonrasi-yemek', article: true, ogType: 'article', date: '2026-05-10',
    title: 'Akçakoca Kalesi Rehberi: Gezi Sonrası Nerede Yenir?',
    headline: 'Akçakoca Kalesi Ziyaret Rehberi: Gezi Sonrası Nerede Yemek Yenir?',
    description: 'Akçakoca Kalesi nasıl gezilir, ne zaman gidilir, çevresinde ne var? Gezi sonrası en lezzetli pizza ve makarna nerede yenir? Tam rehber ve mekan önerisi.' },
  { path: '/blog/hafta-sonu-kacamak-noktalari-yemek-rehberi', article: true, ogType: 'article', date: '2026-05-08',
    title: 'Hafta Sonu Kaçamağı: Akçakoca Yemek & Gezi Rehberi',
    headline: 'İstanbul, Ankara, Bolu, Sakarya, Zonguldak Yakınında Hafta Sonu Kaçamak: Akçakoca',
    description: 'İstanbul, Ankara, Bolu, Sakarya, Zonguldak’a yakın hafta sonu kaçamak noktası: Akçakoca. Doğa, deniz, tarih ve en iyi yemek noktaları — komple rehber.' },
  { path: '/blog/napoli-pizzasinin-farki-mutfak-felsefemiz', article: true, ogType: 'article', date: '2026-05-05',
    title: 'Napoli Pizzasının Farkı | High Five Mutfak Felsefesi',
    headline: 'Napoli Pizzasının Farkı Nedir? HighFive’ın Mutfak Felsefesi',
    description: 'Gerçek İtalyan Napoli pizzası nasıl yapılır? Hamur, taş fırın, San Marzano domates ve mozzarella di bufala — HighFive’ın taş fırından gelen lezzet sırrı.' },

  { path: '/about',
    title: 'Hakkımızda | High Five Pizza & Makarna Akçakoca',
    description: 'Mart 2026’da Akçakoca’da kurulan High Five’ın hikayesi: San Marzano domatesi, Tip ‘00’ hamuru ve 450°C taş fırın. Mutfak felsefemiz ve değerlerimiz.' },
  { path: '/contact',
    title: 'İletişim & Adres | High Five Akçakoca',
    description: 'High Five Akçakoca adres, telefon ve çalışma saatleri (her gün 11:00–02:00). WhatsApp veya telefonla hızlı sipariş, 18 dakikada kapında.' },
  { path: '/app',
    title: 'Mobil Uygulama | High Five Akçakoca',
    description: 'High Five Akçakoca uygulamasını indir: tek dokunuşla sipariş, sadakat puanları ve sana özel kampanyalar. iOS ve Android.' },
  { path: '/oyun',
    title: 'Pizza Şefi Oyunu | High Five Akçakoca',
    description: 'High Five Pizza Şefi mini oyununu oyna, doğru siparişleri yetiştir ve global liderlik tablosunda yerini al!' },

  // Yasal sayfalar (index)
  { path: '/privacy', title: 'Gizlilik Politikası | High Five',
    description: 'High Five Pizza & Makarna gizlilik politikası ve kişisel verilerin korunması (KVKK) hakkında bilgilendirme.' },
  { path: '/terms-of-use', title: 'Kullanım Koşulları | High Five',
    description: 'High Five Pizza & Makarna web sitesi ve mobil uygulaması kullanım koşulları.' },
  { path: '/terms', canonical: ORIGIN + '/terms-of-use', title: 'Kullanım Koşulları | High Five',
    description: 'High Five Pizza & Makarna web sitesi ve mobil uygulaması kullanım koşulları.' },
  { path: '/delivery-terms', title: 'Teslimat Koşulları | High Five',
    description: 'High Five Akçakoca teslimat / paket servis koşulları, teslimat bölgesi ve teslimat süreleri.' },
  { path: '/distance-sales', title: 'Mesafeli Satış Sözleşmesi | High Five',
    description: 'High Five Pizza & Makarna mesafeli satış sözleşmesi ve online sipariş şartları.' },

  // İşlevsel / özel sayfalar (noindex)
  { path: '/order', noindex: true, title: 'Sipariş | High Five', description: 'High Five sipariş sayfası.' },
  { path: '/payment', noindex: true, title: 'Ödeme | High Five', description: 'High Five güvenli ödeme sayfası.' },
  { path: '/safemenu', noindex: true, title: 'Menü | High Five', description: 'High Five menü.' },
  { path: '/admin', noindex: true, title: 'Yönetim | High Five', description: 'High Five yönetim paneli.' },
  { path: '/admin/qr', noindex: true, title: 'QR Kodları | High Five', description: 'High Five masa QR kodları.' },
]

for (const r of ROUTES) emit(r)

// 404 — dist kökünde, nginx `error_page 404 /404.html` için
writeFileSync(join(DIST, '404.html'), render({
  path: '/404', noindex: true,
  title: 'Sayfa Bulunamadı (404) | ' + SITE,
  description: 'Aradığınız sayfa bulunamadı. High Five Akçakoca menüsüne göz atın ya da ana sayfaya dönün.',
}))

console.log(`[prerender] ${ROUTES.length} route + 404.html üretildi`)
