import { useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────
// MOKKA — premium elle kodlanmış tenant landing'i (customLanding: "mokka").
//
// Design read: Kadıköy spesiyal kahve + brunch. ESPRESSO EDITORIAL:
// sayfa yüzeyi koyu kahve (drenched), süt köpüğü beyazı tipografi,
// bakır detay. Yatay geniş fotoğraf bantları, dergi ritmi.
// Tip: Unbounded (yüksek kontrast modern display) + Schibsted Grotesk (gövde).
//
// Motion: saf CSS (framer YOK). Hero yükte keyframe ('both' fill),
// scroll bölümleri animation-timeline: view() ile SADECE translateY kayması
// (opacity gate YOK; içerik her koşulda görünür). Marquee CSS keyframe.
// Kopya hardcoded; içerik modeli yok.
// ─────────────────────────────────────────────────────────────────────

const ESPRESSO = '#2B1D16'
const ROAST = '#1C110B'
const FOAM = '#F6EFE5'
const COPPER = '#C57B45'

const IMG = {
  heroLatte: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=1800&q=80&auto=format&fit=crop',
  avocadoToast: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1200&q=80&auto=format&fit=crop',
  croissant: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80&auto=format&fit=crop',
  pancake: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=80&auto=format&fit=crop',
  brunchTable: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=1400&q=80&auto=format&fit=crop',
  beans: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1800&q=80&auto=format&fit=crop',
  latteOnBeans: 'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=1000&q=80&auto=format&fit=crop',
  cafeInterior: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1800&q=80&auto=format&fit=crop',
  threeCups: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&q=80&auto=format&fit=crop',
}

const DISHES = [
  {
    name: 'Avokadolu Toast',
    price: 240,
    desc: 'Ekşi maya üstünde ezilmiş avokado, haşlanmış yumurta ve taze ıspanak. Yanında küçük filtre.',
    photo: IMG.avocadoToast,
    alt: 'Ekşi maya üstünde avokado ve haşlanmış yumurta, ıspanak yatağında servis',
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
    offset: '',
  },
  {
    name: 'Tereyağlı Kruvasan',
    price: 185,
    desc: 'Sabah altıda fırından çıkar. Pudra şekeri, yanına ev yapımı vişne reçeli.',
    photo: IMG.croissant,
    alt: 'Pudra şekeri yağarken koyu taş zeminde iki tereyağlı kruvasan',
    span: 'md:col-span-5',
    aspect: 'aspect-[4/5]',
    offset: 'md:mt-20',
  },
  {
    name: 'Ballı Pancake Kulesi',
    price: 260,
    desc: 'Sekiz kat pancake, muz dilimleri ve masada dökülen sıcak petek balı.',
    photo: IMG.pancake,
    alt: 'Sekiz katlı pancake kulesine yukarıdan bal dökülüyor',
    span: 'md:col-span-5',
    aspect: 'aspect-[4/5]',
    offset: '',
  },
  {
    name: 'Mokka Brunch Sofrası',
    price: 680,
    desc: 'İki kişilik. Waffle, sahanda yumurta, mevsim meyveleri, taze sıkım portakal ve sınırsız filtre kahve.',
    photo: IMG.brunchTable,
    alt: 'Kalabalık brunch sofrası, waffle tabakları ve taze sıkım portakal suyu',
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
    offset: 'md:-mt-20',
  },
]

const STEPS = [
  {
    title: 'Çekirdek',
    body: 'Etiyopya Yirgacheffe ve Kolombiya Huila. Tek origin mikrolotlar, her ay yeni hasatla yenilenir.',
  },
  {
    title: 'Kavurma',
    body: 'Kadıköy atölyesinde küçük parti kavrum. Orta koyu profil, fincanda kakao ve kuru meyve.',
  },
  {
    title: 'Demleme',
    body: 'V60, Chemex ya da klasik espresso. Baristanın terazisi hep tezgahta, oran hiç göz kararı değil.',
  },
]

const HOURS = [
  { d: 'Hafta içi', h: '08.00 · 22.00' },
  { d: 'Cumartesi', h: '09.00 · 23.00' },
  { d: 'Pazar', h: '09.00 · 22.00' },
]

const MARQUEE = ['V60', 'ESPRESSO', 'FLAT WHITE', 'CORTADO', 'BRUNCH', 'FİLTRE', 'CHEMEX']

export const MokkaLanding = () => {
  useEffect(() => {
    document.title = 'Mokka · Kadıköy spesiyal kahve & brunch'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        "Mokka, Kadıköy Moda'da spesiyal kahve ve brunch. Tek origin çekirdek, günlük kavrum, hafta sonu brunch sofrası. Online sipariş ver ya da uğra."
      )
  }, [])

  return (
    <main className="mk" style={{ background: ESPRESSO, color: FOAM }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;900&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap');

        .mk { font-family: 'Schibsted Grotesk', system-ui, sans-serif; }
        .mk-display { font-family: 'Unbounded', sans-serif; letter-spacing: -0.02em; }

        /* Hero girişi (yükte, JS'siz, 'both' fill) */
        @keyframes mk-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
        .mk-rise   { animation: mk-rise 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .mk-rise-1 { animation-delay: 0.1s; }
        .mk-rise-2 { animation-delay: 0.2s; }
        .mk-rise-3 { animation-delay: 0.32s; }
        .mk-rise-4 { animation-delay: 0.45s; }

        /* Scroll reveal: SADECE translateY kayması, opacity gate YOK. */
        @keyframes mk-drift { from { transform: translateY(34px); } to { transform: none; } }
        @supports (animation-timeline: view()) {
          .mk-reveal { animation: mk-drift linear both; animation-timeline: view(); animation-range: entry 5% entry 90%; }
        }

        /* Marquee */
        .mk-marquee { display: flex; overflow: hidden; user-select: none; }
        .mk-marquee > div { display: flex; flex-shrink: 0; align-items: center; animation: mk-scroll 30s linear infinite; }
        @keyframes mk-scroll { to { transform: translateX(-100%); } }

        .mk-dish img { transition: transform 0.5s cubic-bezier(0.16,1,0.3,1); }
        .mk-dish:hover img { transform: scale(1.03); }

        @media (prefers-reduced-motion: reduce) {
          .mk-marquee > div { animation: none; }
          .mk-rise, .mk-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
          .mk-dish img { transition: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ background: ROAST, borderBottom: `1px solid ${COPPER}` }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="mk-display text-xl" style={{ color: FOAM, fontWeight: 900 }}>
            MOKKA<span style={{ color: COPPER }}>.</span>
          </a>
          <nav className="hidden items-center gap-8 text-[15px] font-semibold md:flex" style={{ color: 'rgba(246,239,229,0.85)' }}>
            <a href="#brunch" className="hover:text-white">Brunch</a>
            <a href="#kahve" className="hover:text-white">Kahve</a>
            <a href="#mekan" className="hover:text-white">Mekan</a>
          </nav>
          <Link
            to="/menu"
            className="rounded-full px-5 py-2.5 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
            style={{ background: COPPER, color: ROAST }}
          >
            Sipariş ver
          </Link>
        </div>
      </header>

      {/* ── Hero: espresso drench + geniş latte art bandı ───────────── */}
      <section id="top" className="pt-16 md:pt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mk-rise text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: COPPER }}>
            Kadıköy, Moda · Est. 2019
          </p>
          <h1
            className="mk-display mk-rise mk-rise-1 mt-6 font-black"
            style={{ fontSize: 'clamp(2.1rem, 6.4vw, 4.6rem)', lineHeight: 1.06, textWrap: 'balance', fontWeight: 900 }}
          >
            Koyu çekirdek,<br />
            <span style={{ color: COPPER }}>süt köpüğü</span> sabahlar.
          </h1>
          <div className="mk-rise mk-rise-2 mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-lg leading-relaxed" style={{ color: 'rgba(246,239,229,0.78)' }}>
              Mokka, Kadıköy'ün spesiyal kahve durağı. Tek origin çekirdek, atölyede günlük kavrum,
              hafta sonları uzayan brunch sofraları.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/menu"
                className="rounded-full px-8 py-4 text-base font-bold transition-transform hover:-translate-y-0.5"
                style={{ background: COPPER, color: ROAST }}
              >
                Sipariş ver
              </Link>
              <a
                href="#brunch"
                className="rounded-full border px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(246,239,229,0.35)', color: FOAM }}
              >
                Brunch menüsü
              </a>
            </div>
          </div>
        </div>

        <div className="mk-rise mk-rise-3 mx-auto mt-12 max-w-[1400px] px-4 sm:px-6 md:mt-16">
          <img
            src={IMG.heroLatte}
            alt="Barista süt köpüğünü espressoya döküyor, latte art tam ortada"
            loading="eager"
            className="h-[46vh] w-full rounded-2xl object-cover md:h-[60vh]"
          />
          <div className="mk-rise mk-rise-4 mt-4 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold" style={{ color: 'rgba(246,239,229,0.6)' }}>
            <span>Flat white, çift shot, 65 derece süt</span>
            <span style={{ color: COPPER }}>Her fincan terazide</span>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────────── */}
      <div className="mk-marquee mt-16 py-5 md:mt-24" style={{ borderTop: `1px solid ${COPPER}`, borderBottom: `1px solid ${COPPER}` }} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="mk-display gap-10 pr-10 text-lg font-semibold" style={{ color: COPPER }}>
            {MARQUEE.map((t) => (
              <span key={t} className="flex items-center gap-10 whitespace-nowrap">
                {t} <span className="text-xs">●</span>
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ── Brunch menüsü: süt beyazı bant ──────────────────────────── */}
      <section id="brunch" className="py-20 md:py-28" style={{ background: FOAM, color: ESPRESSO }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mk-reveal grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <h2 className="mk-display font-black" style={{ fontSize: 'clamp(1.9rem, 4.6vw, 3.2rem)', textWrap: 'balance', fontWeight: 900 }}>
              Brunch, sütün<br />espressoya karıştığı yer.
            </h2>
            <p className="max-w-xs leading-relaxed md:text-right" style={{ color: 'rgba(43,29,22,0.7)' }}>
              Hafta sonu 09.00'dan 16.00'ya. Tabaklar mutfaktan sırayla gelir, kahve hiç bitmez.
            </p>
          </div>

          <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-12">
            {DISHES.map((d) => (
              <article key={d.name} className={`mk-reveal mk-dish ${d.span} ${d.offset}`}>
                <div className={`overflow-hidden rounded-2xl ${d.aspect}`}>
                  <img src={d.photo} alt={d.alt} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-4">
                  <h3 className="mk-display text-xl font-bold md:text-2xl">{d.name}</h3>
                  <span className="mk-display whitespace-nowrap text-xl font-black md:text-2xl" style={{ color: COPPER, fontWeight: 900 }}>
                    ₺{d.price}
                  </span>
                </div>
                <p className="mt-2 max-w-md leading-relaxed" style={{ color: 'rgba(43,29,22,0.72)' }}>{d.desc}</p>
              </article>
            ))}
          </div>

          <div className="mk-reveal mt-16 text-center">
            <Link
              to="/menu"
              className="inline-block rounded-full px-9 py-4 text-base font-bold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: ESPRESSO }}
            >
              Tüm menüyü gör
            </Link>
          </div>
        </div>
      </section>

      {/* ── Kahve craft'ı: çekirdek, kavurma, demleme ───────────────── */}
      <section id="kahve" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            className="mk-display mk-reveal max-w-2xl font-black"
            style={{ fontSize: 'clamp(1.9rem, 4.6vw, 3.2rem)', textWrap: 'balance', fontWeight: 900 }}
          >
            Fincandan önce üç durak var.
          </h2>

          <div className="mt-12 flex flex-col">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="mk-reveal grid gap-4 py-8 md:grid-cols-[120px_260px_1fr] md:items-baseline md:gap-10"
                style={{ borderTop: '1px solid rgba(197,123,69,0.35)' }}
              >
                <span className="mk-display text-5xl font-black md:text-6xl" style={{ color: COPPER, fontWeight: 900 }}>
                  0{i + 1}
                </span>
                <h3 className="mk-display text-2xl font-bold">{s.title}</h3>
                <p className="max-w-xl text-lg leading-relaxed" style={{ color: 'rgba(246,239,229,0.75)' }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-[1400px] gap-6 px-4 sm:px-6 md:grid-cols-[1.6fr_1fr]">
          <img
            src={IMG.beans}
            alt="Günlük kavrulmuş çekirdekler soğumaya serilmiş"
            loading="lazy"
            className="mk-reveal h-64 w-full rounded-2xl object-cover md:h-[420px]"
          />
          <img
            src={IMG.latteOnBeans}
            alt="Çekirdek denizinin ortasında kalp desenli flat white"
            loading="lazy"
            className="mk-reveal h-64 w-full rounded-2xl object-cover md:h-[420px]"
          />
        </div>
      </section>

      {/* ── Mekan & saatler ─────────────────────────────────────────── */}
      <section id="mekan" className="py-20 md:py-28" style={{ background: ROAST }}>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <img
            src={IMG.cafeInterior}
            alt="Mokka'nın Moda'daki salonu, yeşillikler ve ahşap masalar"
            loading="lazy"
            className="mk-reveal h-[40vh] w-full rounded-2xl object-cover md:h-[52vh]"
          />
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="mk-display mk-reveal font-black" style={{ fontSize: 'clamp(1.9rem, 4.6vw, 3rem)', fontWeight: 900 }}>
              Moda'da, denize<br />beş dakika.
            </h2>
            <p className="mk-reveal mt-5 text-lg leading-relaxed" style={{ color: 'rgba(246,239,229,0.78)' }}>
              Moda Caddesi No: 87/A<br />
              Kadıköy, İstanbul<br />
              0216 550 42 18
            </p>
            <div className="mk-reveal mt-8 rounded-2xl p-6" style={{ border: `1px solid ${COPPER}` }}>
              <p className="mk-display text-lg font-bold" style={{ color: COPPER }}>Hafta sonu brunch servisi</p>
              <p className="mt-2 leading-relaxed" style={{ color: 'rgba(246,239,229,0.78)' }}>
                Cumartesi ve pazar 09.00'dan 16.00'ya. Sofra kalabalıksa rezervasyonu öneririz.
              </p>
            </div>
            <div className="mk-reveal mt-9 flex flex-wrap gap-4">
              <Link
                to="/menu"
                className="rounded-full px-8 py-4 text-base font-bold transition-transform hover:-translate-y-0.5"
                style={{ background: COPPER, color: ROAST }}
              >
                Gel al siparişi ver
              </Link>
              <a
                href="https://maps.google.com/?q=Moda+Caddesi+Kadıköy+İstanbul"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(246,239,229,0.35)', color: FOAM }}
              >
                Yol tarifi al
              </a>
            </div>
          </div>

          <div>
            <dl className="mk-reveal">
              {HOURS.map((r) => (
                <div
                  key={r.d}
                  className="flex items-baseline justify-between py-4"
                  style={{ borderTop: '1px solid rgba(246,239,229,0.18)' }}
                >
                  <dt className="font-semibold">{r.d}</dt>
                  <dd className="mk-display font-bold" style={{ color: COPPER }}>{r.h}</dd>
                </div>
              ))}
            </dl>
            <img
              src={IMG.threeCups}
              alt="Üç fincan kahve masanın üstünde buluşuyor"
              loading="lazy"
              className="mk-reveal mt-10 aspect-[4/3] w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="pb-10 pt-16" style={{ background: ESPRESSO, borderTop: `1px solid ${COPPER}` }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mk-display text-center font-black" style={{ fontSize: 'clamp(3rem, 12vw, 8rem)', lineHeight: 1, fontWeight: 900 }}>
            MOKKA<span style={{ color: COPPER }}>.</span>
          </p>
          <div className="mt-12 flex flex-col items-center justify-between gap-6 md:flex-row">
            <p className="text-sm" style={{ color: 'rgba(246,239,229,0.55)' }}>
              © {new Date().getFullYear()} Mokka · Kadıköy, İstanbul
            </p>
            <div className="flex items-center gap-6 text-sm font-semibold">
              <Link to="/menu" className="hover:opacity-70">Menü</Link>
              <a
                href="https://instagram.com/mokkamoda"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70"
              >
                Instagram
              </a>
              <Link to="/panel" className="hover:opacity-70" style={{ color: 'rgba(246,239,229,0.55)' }}>
                İşletme girişi
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
