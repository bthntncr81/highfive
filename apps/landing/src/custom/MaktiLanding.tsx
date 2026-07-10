import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────
// MAK-TI — premium hand-coded tenant landing (customLanding: "makti").
//
// Design read: Kdz. Ereğli pasta & mantı house, "AUTHENTİC ITALİAN PASTA".
// MIDNIGHT TRATTORIA: page drenched in the brand's deep forest green
// (#081C15, sampled from maktimenu.com), fresh mint/basil price accents,
// a thin Italian tricolor line as recurring signature detail, and one warm
// parchment panel for the handmade Anatolian mantı counterpoint.
// Open till 03:00 → the identity leans into "late night pasta".
// Type: Fraunces (Italian editorial display, real italics) + Manrope body.
//
// Motion: NO framer-motion. Hero enters with load keyframes ('both' fill);
// scroll sections use IntersectionObserver + [data-reveal] — hidden state is
// only applied once JS adds the .mkt-js class, so content is always visible
// without JS. Marquee is a pure CSS keyframe loop.
// Icons: single-color inline SVG only (24 viewBox, stroke 1.8) — no emoji.
// ─────────────────────────────────────────────────────────────────────

const NIGHT = '#081C15' // page ground — brand's menu-site background
const PINE = '#14471D' // logo green (sampled from the badge)
const BASIL = '#34B35B' // fresh green — buttons, links
const MINT = '#7FE3A8' // light mint — prices, highlights
const CREAM = '#F2F4EC' // foam white copy
const PARCHMENT = '#F4EAD8' // warm panel for the mantı world
const TERRA = '#B4552D' // terracotta accent on the warm panel
const INK = '#2A1B10' // dark copy on parchment

// Thin Italian tricolor line — the brand badge carries the same stripe.
const TRICOLOR =
  'linear-gradient(90deg, #2F9E44 0%, #2F9E44 33.4%, #F4F1E8 33.4%, #F4F1E8 66.7%, #C93B2E 66.7%, #C93B2E 100%)'

// ── Single-color inline icons (24×24, stroke 1.8, currentColor) ──────
const ico = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

type IconProps = { className?: string; style?: React.CSSProperties }

const IconClock = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 1.9" />
  </svg>
)

const IconMoon = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M20 13.6A8.6 8.6 0 1 1 10.4 4a6.8 6.8 0 0 0 9.6 9.6Z" />
  </svg>
)

const IconPin = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
)

const IconFork = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M8 3v5a4 4 0 0 0 8 0V3" />
    <path d="M12 3v18" />
  </svg>
)

const IconBowl = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M4 13h16a8 8 0 0 1-16 0Z" />
    <path d="M9 9c0-1.6 1.2-1.6 1.2-3.2" />
    <path d="M14 9c0-1.6 1.2-1.6 1.2-3.2" />
  </svg>
)

const IconLeaf = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M5.5 18.5C5.5 9.5 12 4.5 19.5 4.5c0 7.5-5 14-14 14Z" />
    <path d="M5.5 18.5c2.8-5.6 6.6-8.7 10.5-10.5" />
  </svg>
)

const IconInstagram = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="3.8" />
    <circle cx="17.1" cy="6.9" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const IconArrow = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M4 12h15" />
    <path d="M13 6l6 6-6 6" />
  </svg>
)

// Tiny Italian flag chip used as marquee separator.
const TricolorChip = () => (
  <span className="inline-flex h-3 w-[18px] overflow-hidden rounded-[2px]" aria-hidden="true">
    <span className="h-full w-1/3" style={{ background: '#2F9E44' }} />
    <span className="h-full w-1/3" style={{ background: '#F4F1E8' }} />
    <span className="h-full w-1/3" style={{ background: '#C93B2E' }} />
  </span>
)

// ── Content ──────────────────────────────────────────────────────────
type Dish = {
  name: string
  price: number
  desc: string
  photo: string
  alt: string
  span: string
  aspect: string
  offset?: string
  tag?: string
}

const SIGNATURES: Dish[] = [
  {
    name: 'Special Makarna',
    price: 250,
    desc: 'İşletmeye özel peynir harmanlı sos — evin imzası, menünün en çok konuşulanı.',
    photo: '/makti/menu/special-makarna.jpg',
    alt: 'Peynir harmanlı özel soslu Special Makarna tabağı',
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
    tag: 'İmza',
  },
  {
    name: 'Bolonez',
    price: 350,
    desc: 'Ağır ateşte saatlerce pişen kıymalı ragù, taze makarnanın üstünde.',
    photo: '/makti/menu/bolonez.jpg',
    alt: 'Kıymalı bolonez soslu makarna',
    span: 'md:col-span-5',
    aspect: 'aspect-[4/5]',
    offset: 'md:mt-16',
  },
  {
    name: 'Penne Arrabbiata',
    price: 230,
    desc: 'Sarımsak, kırmızı biber ve domates. Adı gibi: biraz öfkeli.',
    photo: '/makti/menu/penne-arrabbiata.jpg',
    alt: 'Acılı domates soslu penne arrabbiata',
    span: 'md:col-span-5',
    aspect: 'aspect-[4/5]',
    tag: 'Acı sever',
  },
  {
    name: 'Mantar Soslu Tortellini',
    price: 300,
    desc: 'Peynir dolgulu tortellini, kremalı mantar sosuyla buluşur.',
    photo: '/makti/menu/mantar-soslu-tortellini.jpg',
    alt: 'Kremalı mantar soslu tortellini',
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
    offset: 'md:-mt-16',
  },
  {
    name: 'Alfredo',
    price: 250,
    desc: 'Mantar ve kremanın en yumuşak hali; klasik Alfredo.',
    photo: '/makti/menu/alfredo.jpg',
    alt: 'Mantarlı kremalı Alfredo makarna',
    span: 'md:col-span-6',
    aspect: 'aspect-[16/11]',
  },
  {
    name: 'Mac and Cheese',
    price: 300,
    desc: 'Bol peynirli, üstü fırında kızarmış konfor klasiği.',
    photo: '/makti/menu/mac-and-cheese.jpg',
    alt: 'Fırında kızarmış bol peynirli mac and cheese',
    span: 'md:col-span-6',
    aspect: 'aspect-[16/11]',
    tag: 'Fırından',
  },
]

const MENU_BOARD: { cat: string; items: { n: string; p: number }[] }[] = [
  {
    cat: 'Makarnalar',
    items: [
      { n: 'Special Makarna', p: 250 },
      { n: 'Acılı Special', p: 260 },
      { n: 'Körili Makarna', p: 230 },
      { n: 'Penne Arrabbiata', p: 230 },
      { n: 'Alfredo', p: 250 },
      { n: 'Pesto', p: 230 },
      { n: 'Bolonez', p: 350 },
      { n: 'Mac and Cheese', p: 300 },
      { n: 'Özel Salçalı Soslu Makarna', p: 230 },
      { n: 'Mantar Soslu Tortellini', p: 300 },
    ],
  },
  {
    cat: 'Mantılar',
    items: [
      { n: 'Kayseri Mantı', p: 350 },
      { n: 'Çıtır Mantı', p: 380 },
    ],
  },
  {
    cat: 'Salatalar',
    items: [
      { n: 'Sezar Salata', p: 300 },
      { n: 'Akdeniz Salata', p: 300 },
    ],
  },
  {
    cat: 'İçecekler',
    items: [
      { n: 'Kutu İçecek', p: 50 },
      { n: 'Ice Tea', p: 75 },
      { n: 'Ayran', p: 30 },
      { n: 'Su', p: 20 },
    ],
  },
]

const MARQUEE = ['MAKARNA', 'MANTI', 'AUTHENTİC ITALİAN PASTA', 'KDZ. EREĞLİ', '12:00 – 03:00']

export const MaktiLanding = () => {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = 'MAK-TI · Makarna & Mantı — Kdz. Ereğli'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        "MAK-TI, Kdz. Ereğli'de İtalyan makarnası ve el açması Kayseri mantısı. Authentic Italian Pasta — her gün 12:00'den gece 03:00'e kadar açık. Online sipariş ver."
      )

    // Reveal-on-scroll: the hidden initial state only activates once JS adds
    // .mkt-js — without JS everything stays visible (no opacity gate risk).
    const root = rootRef.current
    if (!root) return
    root.classList.add('mkt-js')
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('mkt-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('mkt-in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <main ref={rootRef} className="mkt" style={{ background: NIGHT, color: CREAM }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap');

        .mkt { font-family: 'Manrope', system-ui, sans-serif; }
        .mkt-display { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.015em; }

        /* Hero entrance (on load, no JS needed, 'both' fill) */
        @keyframes mkt-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
        .mkt-rise   { animation: mkt-rise 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .mkt-rise-1 { animation-delay: 0.1s; }
        .mkt-rise-2 { animation-delay: 0.2s; }
        .mkt-rise-3 { animation-delay: 0.32s; }
        .mkt-rise-4 { animation-delay: 0.45s; }

        /* Floating brand badge on the hero photo */
        @keyframes mkt-float { 0%, 100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-10px) rotate(-6deg); } }
        .mkt-float { animation: mkt-float 5.5s ease-in-out infinite; }

        /* Scroll reveal — gated behind .mkt-js so no-JS keeps content visible */
        .mkt-js [data-reveal] {
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .mkt-js [data-reveal].mkt-in { opacity: 1; transform: none; }

        /* Marquee */
        .mkt-marquee { display: flex; overflow: hidden; user-select: none; }
        .mkt-marquee > div { display: flex; flex-shrink: 0; align-items: center; animation: mkt-scroll 32s linear infinite; }
        @keyframes mkt-scroll { to { transform: translateX(-100%); } }

        .mkt-dish img { transition: transform 0.55s cubic-bezier(0.16,1,0.3,1); }
        .mkt-dish:hover img { transform: scale(1.045); }

        @media (prefers-reduced-motion: reduce) {
          .mkt-marquee > div { animation: none; }
          .mkt-rise, .mkt-float { animation: none !important; }
          .mkt-js [data-reveal] { opacity: 1 !important; transform: none !important; transition: none; }
          .mkt-dish img { transition: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(8,28,21,0.92)', backdropFilter: 'blur(10px)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-3">
            <img src="/makti/logo-circle.png" alt="MAK-TI logo" className="h-10 w-10" />
            <span className="leading-none">
              <span className="mkt-display block text-lg font-semibold tracking-wide">MAK-TI</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: MINT }}>
                Makarna &amp; Mantı
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-[15px] font-semibold md:flex" style={{ color: 'rgba(242,244,236,0.85)' }}>
            <a href="#lezzetler" className="hover:text-white">Lezzetler</a>
            <a href="#iki-dunya" className="hover:text-white">İki Dünya</a>
            <a href="#menu-panosu" className="hover:text-white">Menü</a>
            <a href="#konum" className="hover:text-white">Konum</a>
          </nav>
          <Link
            to="/menu"
            className="rounded-full px-5 py-2.5 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
            style={{ background: BASIL, color: NIGHT }}
          >
            Sipariş Ver
          </Link>
        </div>
        <div className="h-[2px] w-full opacity-80" style={{ background: TRICOLOR }} aria-hidden="true" />
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        id="top"
        className="relative overflow-hidden"
        style={{ background: `radial-gradient(1100px 620px at 82% -10%, rgba(20,71,29,0.55), transparent 65%), ${NIGHT}` }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:min-h-[calc(100vh-66px)] md:grid-cols-[1.05fr_0.95fr] md:pb-24 md:pt-16">
          <div>
            <p className="mkt-rise text-xs font-bold uppercase tracking-[0.32em]" style={{ color: MINT }}>
              Kdz. Ereğli · Makarna &amp; Mantı Evi
            </p>
            <h1
              className="mkt-display mkt-rise mkt-rise-1 mt-6 font-semibold"
              style={{ fontSize: 'clamp(2.9rem, 8.5vw, 6rem)', lineHeight: 0.99, textWrap: 'balance' }}
            >
              AUTHENTİC
              <br />
              <em className="font-medium" style={{ color: MINT }}>ITALİAN</em> PASTA
            </h1>
            <p className="mkt-rise mkt-rise-2 mt-7 max-w-md text-lg leading-relaxed" style={{ color: 'rgba(242,244,236,0.78)' }}>
              İtalyan usulü taze makarna ile el açması Kayseri mantısı aynı mutfakta.
              Ereğli'de, her gece 03:00'e kadar sıcak tabak çıkar.
            </p>
            <div className="mkt-rise mkt-rise-3 mt-8 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
                style={{ borderColor: 'rgba(127,227,168,0.4)', color: MINT }}
              >
                <IconClock className="h-4 w-4" /> Her gün 12:00 – 03:00
              </span>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
                style={{ borderColor: 'rgba(242,244,236,0.2)', color: 'rgba(242,244,236,0.75)' }}
              >
                <IconMoon className="h-4 w-4" /> Gece mutfağı açık
              </span>
            </div>
            <div className="mkt-rise mkt-rise-4 mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                style={{ background: BASIL, color: NIGHT }}
              >
                Sipariş Ver <IconArrow className="h-5 w-5" />
              </Link>
              <a
                href="#lezzetler"
                className="rounded-full border px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(242,244,236,0.3)', color: CREAM }}
              >
                İmza lezzetler
              </a>
            </div>
          </div>

          <div className="mkt-rise mkt-rise-2 relative mx-auto w-full max-w-md md:max-w-none">
            <img
              src="/makti/menu/special-makarna.jpg"
              alt="MAK-TI'nın peynir harmanlı soslu Special Makarna tabağı"
              loading="eager"
              className="aspect-[4/5] w-full rounded-3xl object-cover"
              style={{ border: '1px solid rgba(127,227,168,0.25)' }}
            />
            <div
              className="absolute inset-0 rounded-3xl"
              style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(8,28,21,0.72) 100%)' }}
              aria-hidden="true"
            />
            <img
              src="/makti/menu/citir-manti.jpg"
              alt="Çıtır mantı, sarımsaklı yoğurt ve tereyağlı sosla"
              loading="lazy"
              className="absolute -bottom-8 -left-4 hidden w-44 rotate-[-4deg] rounded-2xl object-cover shadow-2xl sm:block md:-left-10 md:w-52"
              style={{ border: `5px solid ${NIGHT}`, aspectRatio: '1 / 1' }}
            />
            <img
              src="/makti/logo-circle.png"
              alt=""
              aria-hidden="true"
              className="mkt-float absolute -right-4 -top-8 h-24 w-24 drop-shadow-2xl md:-right-8 md:h-28 md:w-28"
            />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
              <div>
                <p className="mkt-display text-xl font-semibold">Special Makarna</p>
                <p className="text-sm" style={{ color: 'rgba(242,244,236,0.7)' }}>Peynir harmanlı özel sos</p>
              </div>
              <span className="mkt-display whitespace-nowrap rounded-full px-4 py-1.5 text-lg font-semibold" style={{ background: MINT, color: PINE }}>
                ₺250
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────────── */}
      <div
        className="mkt-marquee py-4"
        style={{ borderTop: '1px solid rgba(127,227,168,0.22)', borderBottom: '1px solid rgba(127,227,168,0.22)' }}
        aria-hidden="true"
      >
        {[0, 1].map((i) => (
          <div key={i} className="mkt-display gap-9 pr-9 text-lg font-medium" style={{ color: 'rgba(242,244,236,0.85)' }}>
            {MARQUEE.map((t) => (
              <span key={t} className="flex items-center gap-9 whitespace-nowrap">
                {t} <TricolorChip />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ── İmza lezzetler ──────────────────────────────────────────── */}
      <section id="lezzetler" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div data-reveal className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.32em]" style={{ color: MINT }}>
                <IconLeaf className="h-4 w-4" /> İmza Lezzetler
              </p>
              <h2 className="mkt-display mt-4 font-semibold" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
                Sos tencereden,
                <br />
                makarna <em style={{ color: MINT }}>taze</em> çıkar.
              </h2>
            </div>
            <p className="max-w-xs leading-relaxed md:text-right" style={{ color: 'rgba(242,244,236,0.65)' }}>
              On çeşit makarna, iki usul mantı. Hepsi sipariş üstüne, hepsi aynı gece mutfağından.
            </p>
          </div>

          <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-12">
            {SIGNATURES.map((d) => (
              <article key={d.name} data-reveal className={`mkt-dish ${d.span} ${d.offset ?? ''}`}>
                <div className={`relative overflow-hidden rounded-2xl ${d.aspect}`}>
                  <img src={d.photo} alt={d.alt} loading="lazy" className="h-full w-full object-cover" />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, rgba(8,28,21,0.05) 40%, rgba(8,28,21,0.82) 100%)' }}
                    aria-hidden="true"
                  />
                  <span
                    className="mkt-display absolute right-4 top-4 rounded-full px-3.5 py-1 text-base font-semibold"
                    style={{ background: MINT, color: PINE }}
                  >
                    ₺{d.price}
                  </span>
                  {d.tag && (
                    <span
                      className="absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider"
                      style={{ borderColor: 'rgba(242,244,236,0.4)', color: CREAM, background: 'rgba(8,28,21,0.45)' }}
                    >
                      {d.tag}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="mkt-display text-xl font-semibold md:text-2xl">{d.name}</h3>
                    <p className="mt-1.5 max-w-md text-[15px] leading-relaxed" style={{ color: 'rgba(242,244,236,0.78)' }}>
                      {d.desc}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div data-reveal className="mt-16 text-center">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
              style={{ background: BASIL, color: NIGHT }}
            >
              Tüm menüyü gör <IconArrow className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── İki dünya: İtalya ↔ Anadolu ─────────────────────────────── */}
      <section id="iki-dunya" className="py-20 md:py-28" style={{ background: 'rgba(20,71,29,0.16)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.32em]" style={{ color: MINT }}>
              Mak + Tı
            </p>
            <h2 className="mkt-display mt-4 font-semibold" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
              İki dünya, tek mutfak.
            </h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: 'rgba(242,244,236,0.7)' }}>
              Adımız iki kelimenin kısaltması: <b>mak</b>arna ve man<b>tı</b>.
              Bir tarafta İtalya'nın sosları, diğer tarafta Anadolu'nun el açması hamuru.
            </p>
          </div>

          <div data-reveal className="relative mt-14 grid overflow-hidden rounded-3xl md:grid-cols-2">
            {/* Italy side */}
            <div className="flex flex-col" style={{ background: PINE }}>
              <div className="h-1.5 w-full" style={{ background: TRICOLOR }} aria-hidden="true" />
              <div className="relative">
                <img
                  src="/makti/menu/pesto.jpg"
                  alt="Taze fesleğenli pesto soslu makarna"
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(20,71,29,0.85) 100%)' }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-1 flex-col p-8 md:p-10">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: MINT }}>
                  <IconFork className="h-4 w-4" /> İtalya'dan
                </p>
                <h3 className="mkt-display mt-3 text-3xl font-semibold">
                  <em style={{ color: MINT }}>Al dente</em>, her seferinde.
                </h3>
                <p className="mt-4 leading-relaxed" style={{ color: 'rgba(242,244,236,0.78)' }}>
                  Pesto'dan arrabbiata'ya, Alfredo'dan şefin peynir harmanlı Special sosuna —
                  soslar her gün tencerede, makarna sipariş üstüne pişer.
                </p>
                <ul className="mt-6 space-y-2.5 text-[15px] font-semibold">
                  {[
                    ['Pesto', 230],
                    ['Acılı Special', 260],
                    ['Körili Makarna', 230],
                  ].map(([n, p]) => (
                    <li key={n} className="flex items-baseline justify-between gap-4">
                      <span>{n}</span>
                      <span className="mkt-display" style={{ color: MINT }}>₺{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Anatolia side — warm handmade contrast */}
            <div className="flex flex-col" style={{ background: PARCHMENT, color: INK }}>
              <div
                className="h-1.5 w-full"
                style={{ background: `repeating-linear-gradient(-45deg, ${TERRA} 0 10px, #D9A566 10px 20px)` }}
                aria-hidden="true"
              />
              <div className="relative">
                <img
                  src="/makti/menu/kayseri-manti.jpg"
                  alt="Sarımsaklı yoğurt ve kızgın tereyağlı Kayseri mantısı"
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(244,234,216,0.9) 100%)' }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-1 flex-col p-8 md:p-10">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TERRA }}>
                  <IconBowl className="h-4 w-4" /> Anadolu'dan
                </p>
                <h3 className="mkt-display mt-3 text-3xl font-semibold">
                  Hamur elde, <em style={{ color: TERRA }}>usul dedeninki</em>.
                </h3>
                <p className="mt-4 leading-relaxed" style={{ color: 'rgba(42,27,16,0.75)' }}>
                  Kayseri usulü mantı sarımsaklı yoğurt ve kızgın tereyağıyla; çıtır mantı ise
                  gece atıştırmasının kralı. İkisi de el açması hamurla.
                </p>
                <ul className="mt-6 space-y-2.5 text-[15px] font-semibold">
                  {[
                    ['Kayseri Mantı', 350],
                    ['Çıtır Mantı', 380],
                  ].map(([n, p]) => (
                    <li key={n} className="flex items-baseline justify-between gap-4">
                      <span>{n}</span>
                      <span className="mkt-display" style={{ color: TERRA }}>₺{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Center seam badge (desktop) */}
            <div
              className="absolute left-1/2 top-1/2 z-10 hidden h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full md:grid"
              style={{ background: NIGHT, border: `1px solid ${MINT}`, color: MINT }}
              aria-hidden="true"
            >
              <IconFork className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Menü panosu + gece CTA ──────────────────────────────────── */}
      <section id="menu-panosu" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div data-reveal className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <h2 className="mkt-display font-semibold" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
              Menü panosu
            </h2>
            <p className="max-w-xs leading-relaxed md:text-right" style={{ color: 'rgba(242,244,236,0.65)' }}>
              Fiyatlar günceldir. Sipariş ve detaylar için menü sayfası her zaman açık.
            </p>
          </div>

          <div className="mt-12 grid gap-x-14 gap-y-12 md:grid-cols-2">
            <div data-reveal>
              <h3 className="mkt-display text-xl font-semibold" style={{ color: MINT }}>
                {MENU_BOARD[0].cat}
              </h3>
              <div className="mt-5 space-y-3.5">
                {MENU_BOARD[0].items.map((it) => (
                  <div key={it.n} className="flex items-baseline gap-3 text-[15px]">
                    <span className="font-semibold">{it.n}</span>
                    <span className="flex-1 border-b border-dotted" style={{ borderColor: 'rgba(242,244,236,0.25)' }} aria-hidden="true" />
                    <span className="mkt-display font-semibold" style={{ color: MINT }}>₺{it.p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-12">
              {MENU_BOARD.slice(1).map((cat) => (
                <div key={cat.cat} data-reveal>
                  <h3 className="mkt-display text-xl font-semibold" style={{ color: MINT }}>
                    {cat.cat}
                  </h3>
                  <div className="mt-5 space-y-3.5">
                    {cat.items.map((it) => (
                      <div key={it.n} className="flex items-baseline gap-3 text-[15px]">
                        <span className="font-semibold">{it.n}</span>
                        <span className="flex-1 border-b border-dotted" style={{ borderColor: 'rgba(242,244,236,0.25)' }} aria-hidden="true" />
                        <span className="mkt-display font-semibold" style={{ color: MINT }}>₺{it.p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Late-night order banner */}
          <div
            data-reveal
            className="relative mt-16 overflow-hidden rounded-3xl p-8 md:mt-20 md:p-14"
            style={{
              background: `radial-gradient(700px 320px at 85% 0%, rgba(127,227,168,0.16), transparent 60%), linear-gradient(120deg, #0D2B1E 0%, ${PINE} 100%)`,
              border: '1px solid rgba(127,227,168,0.25)',
            }}
          >
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: MINT }}>
                  <IconMoon className="h-4 w-4" /> Gece Mutfağı
                </p>
                <h3 className="mkt-display mt-4 font-semibold" style={{ fontSize: 'clamp(1.7rem, 4vw, 2.8rem)', textWrap: 'balance' }}>
                  Gece acıktıysan sorun değil —
                  <br />
                  ocak <em style={{ color: MINT }}>03:00'e kadar</em> yanıyor.
                </h3>
                <p className="mt-4 max-w-lg leading-relaxed" style={{ color: 'rgba(242,244,236,0.75)' }}>
                  Sıcak makarna gece yarısından sonra da çıkar. Menüden seç, siparişini ver;
                  gerisi mutfağın işi.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 md:items-end">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
                  style={{ borderColor: 'rgba(127,227,168,0.4)', color: MINT }}
                >
                  <IconClock className="h-4 w-4" /> 12:00 – 03:00 · Her gün
                </span>
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                  style={{ background: MINT, color: PINE }}
                >
                  Sipariş Ver <IconArrow className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Konum & Instagram ───────────────────────────────────────── */}
      <section id="konum" className="py-20 md:py-28" style={{ background: 'rgba(20,71,29,0.16)' }}>
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2 md:gap-16">
          <div>
            <p data-reveal className="text-xs font-bold uppercase tracking-[0.32em]" style={{ color: MINT }}>
              Hakkında &amp; Konum
            </p>
            <h2 data-reveal className="mkt-display mt-4 font-semibold" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', textWrap: 'balance' }}>
              Ereğli'de bir köşe,
              <br />
              iki mutfağın buluşması.
            </h2>
            <p data-reveal className="mt-5 max-w-md text-lg leading-relaxed" style={{ color: 'rgba(242,244,236,0.75)' }}>
              MAK-TI, Karadeniz kıyısında bir makarna ve mantı evi. Gündüz uzun öğle
              sofraları, gece geç saat tabakları — mutfak ikisine de aynı özenle bakar.
            </p>
            <div data-reveal className="mt-8 space-y-4 text-[15px] font-semibold">
              <p className="flex items-center gap-3">
                <IconPin className="h-5 w-5 shrink-0" style={{ color: MINT }} /> Kdz. Ereğli, Zonguldak
              </p>
              <p className="flex items-center gap-3">
                <IconClock className="h-5 w-5 shrink-0" style={{ color: MINT }} /> Her gün 12:00 – 03:00
              </p>
              <a
                href="https://instagram.com/maktihouse"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 transition-opacity hover:opacity-80"
              >
                <IconInstagram className="h-5 w-5 shrink-0" style={{ color: MINT }} /> @maktihouse
              </a>
            </div>
            <div data-reveal className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/menu"
                className="rounded-full px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                style={{ background: BASIL, color: NIGHT }}
              >
                Gel al siparişi ver
              </Link>
              <a
                href="https://instagram.com/maktihouse"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full border px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(242,244,236,0.3)', color: CREAM }}
              >
                <IconInstagram className="h-5 w-5" /> Instagram
              </a>
            </div>
          </div>

          <div className="relative self-center">
            <img
              data-reveal
              src="/makti/menu/korili-makarna.jpg"
              alt="Körili soslu makarna, MAK-TI mutfağından"
              loading="lazy"
              className="aspect-[4/3] w-full rounded-3xl object-cover"
              style={{ border: '1px solid rgba(127,227,168,0.25)' }}
            />
            <img
              data-reveal
              src="/makti/menu/sezar-salata.jpg"
              alt="Tavuklu Sezar salata"
              loading="lazy"
              className="absolute -bottom-10 -right-2 hidden w-48 rotate-[3deg] rounded-2xl object-cover shadow-2xl sm:block md:-right-6 md:w-56"
              style={{ border: `5px solid ${NIGHT}`, aspectRatio: '1 / 1' }}
            />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="pb-10 pt-16" style={{ borderTop: '1px solid rgba(127,227,168,0.2)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mkt-display text-center font-semibold" style={{ fontSize: 'clamp(3rem, 13vw, 8.5rem)', lineHeight: 1 }}>
            MAK<span style={{ color: MINT }}>-</span>TI
          </p>
          <div className="mx-auto mt-8 h-[2px] max-w-xs opacity-80" style={{ background: TRICOLOR }} aria-hidden="true" />
          <div className="mt-12 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img src="/makti/logo-circle.png" alt="MAK-TI logo" className="h-9 w-9 opacity-90" />
              <p className="text-sm" style={{ color: 'rgba(242,244,236,0.55)' }}>
                © {new Date().getFullYear()} MAK-TI · Kdz. Ereğli, Zonguldak
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm font-semibold">
              <Link to="/menu" className="hover:opacity-70">Menü</Link>
              <a
                href="https://instagram.com/maktihouse"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70"
              >
                Instagram
              </a>
              <Link to="/panel" className="hover:opacity-70" style={{ color: 'rgba(242,244,236,0.55)' }}>
                İşletme girişi
              </Link>
            </div>
          </div>
          <p className="mt-8 text-center text-xs" style={{ color: 'rgba(242,244,236,0.4)' }}>
            Sipariş altyapısı: OtOrder
          </p>
        </div>
      </footer>
    </main>
  )
}
