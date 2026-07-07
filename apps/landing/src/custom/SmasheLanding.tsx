import { useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────
// SMASHÉ — premium elle kodlanmış tenant landing'i (customLanding: "smashe").
//
// Design read (impeccable brand register + taste): İstanbul smash burgerci,
// retro-piknik dili. Renk stratejisi COMMITTED NAVY (burger-kırmızı klişesi
// bilinçli reddedildi): koyu lacivert + beyaz + pöti kare (gingham) imza dokusu.
// Tip: Alfa Slab One (Americana tabela slab'ı) + Archivo (grotesk gövde).
//
// Motion: framer YOK — reveal'lar saf CSS. Hero yükte oynar; scroll bölümleri
// animation-timeline: view() ile (destek yoksa İÇERİK GÖRÜNÜR kalır — impeccable
// kuralı: reveal görünür bir varsayılanı zenginleştirir, gizlemez). Fotoğraflar
// Unsplash, tek tek indirilip gözle doğrulandı (burger içerikli).
// ─────────────────────────────────────────────────────────────────────

const NAVY = '#122a5c'
const NAVY_DEEP = '#0c1d42'

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

const PHOTOS = {
  hero: img('photo-1568901346375-23c9450c58cd', 1400), // çift köfte, akan cheddar, ahşap tabla
  klasik: img('photo-1542574271-7f3b92e6c821', 900), // çift cheddar + karamelize soğan, koyu fon
  brisket: img('photo-1553979459-d2229ba7433b', 900), // pastırmalı üç katlı kule
  mantar: img('photo-1552526881-721ce8509abb', 900), // açık fon (kart ritmi: koyu-koyu-açık)
  sac: img('photo-1607013251379-e6eecfffe234', 1200), // sacdan yeni inmiş çift smash
  patates: img('photo-1594212699903-ec8a3eca50f5', 900), // çelik kupada patates + burger
  sepet: img('photo-1550547660-d9450f859349', 1200), // ahşap tablada iki burger + gazoz
}

const MENU = [
  {
    name: 'Klasik Smashé',
    desc: 'Çift ezme köfte, iki kat eritme cheddar, turşu, çiğ soğan, Smashé sos.',
    price: 340,
    photo: PHOTOS.klasik,
    alt: 'Klasik Smashé: çift köfte, iki kat cheddar, karamelize soğanla',
    tag: 'Çok satan',
    tilt: '-1.2deg',
  },
  {
    name: 'Brisket Smashé',
    desc: 'Dana döş kırığı köfte, isli cheddar, karamelize soğan, hardallı mayo.',
    price: 420,
    photo: PHOTOS.brisket,
    alt: 'Brisket Smashé: üç katlı kule, döş kırığı ve isli cheddar',
    tag: 'Şefin ezmesi',
    tilt: '1.2deg',
    down: true,
  },
  {
    name: 'Trüflü Mantar',
    desc: 'Izgara portobello, trüf mayonez, rokfor krema, çıtır soğan.',
    price: 390,
    photo: PHOTOS.mantar,
    alt: 'Trüflü Mantar: susamlı bun arasında portobello, açık fonda',
    tag: 'Vejetaryen',
    tilt: '-1.2deg',
  },
]

const STEPS = [
  { n: '1', title: 'Topla', body: 'Dana döş her sabah kasaptan gelir, kendi çekeriz. 90 gramlık toplar, buz gibi bekler.' },
  { n: '2', title: 'Ez', body: '230 derece sacda 10 saniye pres. Köfte inceldikçe yüzey büyür, yüzey büyüdükçe kabuk artar.' },
  { n: '3', title: 'Kızart', body: 'Kenarlar dantel gibi çıtırlayınca cheddar kapanır, brioche sacdan geçer, paket 90 saniyede çıkar.' },
]

const HOURS = [
  { d: 'Pazartesi · Perşembe', h: '11.30 · 23.00' },
  { d: 'Cuma · Cumartesi', h: '11.30 · 01.00' },
  { d: 'Pazar', h: '12.00 · 23.00' },
]

export const SmasheLanding = () => {
  useEffect(() => {
    document.title = 'Smashé · İstanbul smash burger'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        'Smashé, Kadıköy. Sacda ezilmiş çıtır kenarlı smash burger, günlük brioche, el yapımı sos. Gel al ya da online sipariş ver.'
      )
  }, [])

  return (
    <main className="smx" style={{ background: '#fff', color: NAVY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Archivo:wght@400;500;600;700;800&display=swap');

        .smx { font-family: 'Archivo', system-ui, sans-serif; }
        .smx-display { font-family: 'Alfa Slab One', serif; font-weight: 400; letter-spacing: -0.01em; }

        /* Pöti kare (gingham) — iki eksenli yarı saydam şerit; kesişimler koyulaşır */
        .smx-gingham {
          background-color: #fff;
          background-image:
            repeating-linear-gradient(0deg,  rgba(18,42,92,0.22) 0 26px, transparent 26px 52px),
            repeating-linear-gradient(90deg, rgba(18,42,92,0.22) 0 26px, transparent 26px 52px);
        }
        .smx-gingham-dark {
          background-color: ${NAVY};
          background-image:
            repeating-linear-gradient(0deg,  rgba(255,255,255,0.05) 0 26px, transparent 26px 52px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 26px, transparent 26px 52px);
        }

        /* Marquee */
        .smx-marquee { display: flex; overflow: hidden; user-select: none; }
        .smx-marquee > div { display: flex; flex-shrink: 0; align-items: center; animation: smx-scroll 26s linear infinite; }
        @keyframes smx-scroll { to { transform: translateX(-100%); } }

        /* Hero girişi (yükte, JS'siz) */
        @keyframes smx-rise  { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes smx-photo { from { opacity: 0; transform: rotate(6deg) translateY(30px); } to { opacity: 1; transform: rotate(3deg); } }
        @keyframes smx-stkr  { from { opacity: 0; transform: scale(0) rotate(-30deg); } to { opacity: 1; transform: scale(1) rotate(-12deg); } }
        .smx-rise   { animation: smx-rise 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .smx-rise-1 { animation-delay: 0.08s; } .smx-rise-2 { animation-delay: 0.18s; } .smx-rise-3 { animation-delay: 0.28s; }
        .smx-photo  { animation: smx-photo 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
        .smx-stkr   { animation: smx-stkr 0.5s 0.6s cubic-bezier(0.16,1,0.3,1) both; }

        /* Scroll reveal — İÇERİK HER ZAMAN GÖRÜNÜR (opacity gate YOK). Yalnızca hafif
           bir yukarı-kayma; animation-timeline yoksa veya range dışındaysa en kötü
           ihtimalle 30px ötelenir, ASLA kaybolmaz (impeccable: görünür varsayılanı zenginleştir). */
        @keyframes smx-in { from { transform: translateY(30px); } to { transform: none; } }
        @supports (animation-timeline: view()) {
          .smx-reveal { animation: smx-in linear both; animation-timeline: view(); animation-range: entry 5% entry 95%; }
        }

        /* Eğik menü kartı — hover'da düzelir + kalkar (rotate/translate bağımsız özellikler) */
        .smx-card { transition: rotate .35s cubic-bezier(.16,1,.3,1), translate .35s cubic-bezier(.16,1,.3,1); }
        .smx-card:hover { rotate: 0deg !important; translate: 0 -6px; }

        @media (prefers-reduced-motion: reduce) {
          .smx-marquee > div { animation: none; }
          .smx-rise, .smx-photo, .smx-stkr, .smx-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
          .smx-card { transition: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: `3px solid ${NAVY}` }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="smx-display text-2xl" style={{ color: NAVY }}>SMASHÉ</a>
          <nav className="hidden items-center gap-7 text-[15px] font-semibold md:flex">
            <a href="#menu" className="hover:opacity-70">Lezzetler</a>
            <a href="#nasil" className="hover:opacity-70">Nasıl ezilir</a>
            <a href="#konum" className="hover:opacity-70">Konum</a>
          </nav>
          <Link to="/menu" className="rounded-full px-5 py-2.5 text-[15px] font-bold text-white transition-transform hover:-translate-y-0.5" style={{ background: NAVY }}>
            Sipariş ver
          </Link>
        </div>
      </header>

      {/* ── Hero: lacivert drench ───────────────────────────────────── */}
      <section id="top" className="smx-gingham-dark relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-20">
          <div>
            <p className="smx-rise mb-5 inline-block rounded-full border-2 border-white/25 px-4 py-1.5 text-sm font-bold text-white/85">
              Kadıköy, İstanbul
            </p>
            <h1 className="smx-display smx-rise smx-rise-1 text-white" style={{ fontSize: 'clamp(2.9rem, 8vw, 5.5rem)', lineHeight: 1.02, textWrap: 'balance' }}>
              Sacda ezilir,<br />kenarında çıtırlar.
            </h1>
            <p className="smx-rise smx-rise-2 mt-6 max-w-md text-lg leading-relaxed text-white/80">
              90 gramlık dana toplar 230 derece sacda preslenir. On saniyede kabuk, doksan saniyede paket. Smashé bu kadar.
            </p>
            <div className="smx-rise smx-rise-3 mt-9 flex flex-wrap items-center gap-4">
              <Link to="/menu" className="rounded-full bg-white px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5" style={{ color: NAVY }}>
                Sipariş ver
              </Link>
              <a href="#menu" className="rounded-full border-2 border-white/40 px-8 py-4 text-base font-bold text-white transition-colors hover:bg-white/10">
                Menüye bak
              </a>
            </div>
          </div>

          <div className="smx-photo relative mx-auto w-full max-w-md">
            <div className="smx-gingham absolute -bottom-4 -right-4 h-full w-full rounded-2xl" aria-hidden="true" />
            <img
              src={PHOTOS.hero}
              alt="Akan cheddar'lı çift köfteli Smashé, brioche ekmek arasında"
              className="relative aspect-[4/5] w-full rounded-2xl border-[10px] border-white object-cover shadow-2xl"
              loading="eager"
            />
            <div className="smx-stkr smx-display absolute -left-6 -top-6 grid h-24 w-24 place-items-center rounded-full bg-white text-center text-sm leading-tight shadow-xl" style={{ color: NAVY }}>
              180g<br />dana
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────────── */}
      <div className="smx-marquee bg-white py-4" style={{ borderBottom: `3px solid ${NAVY}` }} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="smx-display gap-10 pr-10 text-xl" style={{ color: NAVY }}>
            {['El ezmesi smash', 'Günlük brioche', 'Çift cheddar', 'Kendi sosumuz', 'Çıtır kenar'].map((t) => (
              <span key={t} className="flex items-center gap-10 whitespace-nowrap">{t} <span className="text-2xl">✕</span></span>
            ))}
          </div>
        ))}
      </div>

      {/* ── Menü öne çıkanlar ───────────────────────────────────────── */}
      <section id="menu" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="smx-display smx-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
            En çok ezilenler
          </h2>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {MENU.map((item) => (
              <article
                key={item.name}
                className={`smx-reveal smx-card ${item.down ? 'md:translate-y-8' : ''}`}
                style={{ rotate: item.tilt }}
              >
                <div className="relative">
                  <img src={item.photo} alt={item.alt} loading="lazy" className="aspect-square w-full rounded-2xl object-cover" style={{ border: `4px solid ${NAVY}` }} />
                  <div className="smx-display absolute -right-3 -top-3 grid h-20 w-20 place-items-center rounded-full text-lg text-white shadow-lg" style={{ background: NAVY, rotate: '8deg' }}>
                    ₺{item.price}
                  </div>
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-3">
                  <h3 className="smx-display text-2xl">{item.name}</h3>
                  <span className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: NAVY_DEEP }}>{item.tag}</span>
                </div>
                <p className="mt-2 leading-relaxed" style={{ color: 'rgba(18,42,92,0.75)' }}>{item.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-16 text-center md:mt-20">
            <Link to="/menu" className="inline-block rounded-full px-9 py-4 text-base font-extrabold text-white transition-transform hover:-translate-y-0.5" style={{ background: NAVY }}>
              Tüm menüyü gör
            </Link>
          </div>
        </div>
      </section>

      {/* ── Nasıl ezilir: gerçek 3 adım ─────────────────────────────── */}
      <section id="nasil" className="smx-gingham-dark py-20 text-white md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
            <h2 className="smx-display smx-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
              Doksan saniyede sacdan pakete
            </h2>
            <p className="smx-reveal max-w-xs text-white/70 md:text-right">Smash bir tarif değil, bir sıra. Sırayı bozmayız.</p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="smx-reveal border-t-2 border-white/25 pt-6">
                <div className="flex items-baseline gap-4">
                  <span className="smx-display text-6xl" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.9)', color: 'transparent' }}>{s.n}</span>
                  <h3 className="smx-display text-2xl">{s.title}</h3>
                </div>
                <p className="mt-4 leading-relaxed text-white/75">{s.body}</p>
              </div>
            ))}
          </div>

          <img
            src={PHOTOS.sac}
            alt="Sacdan yeni inmiş çift smash, cheddar akıyor, turşusu üstünde"
            loading="lazy"
            className="smx-reveal mt-14 h-64 w-full rounded-2xl border-[6px] border-white object-cover md:h-96"
          />
        </div>
      </section>

      {/* ── Piknik masası ───────────────────────────────────────────── */}
      <section className="smx-gingham py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
          <div className="smx-reveal rounded-3xl bg-white p-8 md:p-12" style={{ border: `3px dashed ${NAVY}` }}>
            <h2 className="smx-display" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)', textWrap: 'balance' }}>
              Masamız pöti kare, işimiz net
            </h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(18,42,92,0.8)' }}>
              Döşü her sabah kasaptan alır, kendimiz çekeriz. Brioche fırından günlük gelir, turşuyu kavanozda biz kurarız. Sos mu? Tarifi yok, alışkanlığı var.
            </p>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: 'rgba(18,42,92,0.8)' }}>
              Masa örtüsü neden pöti kare diye soranlara: burger elle yenir, piknikte utanılmaz.
            </p>
          </div>
          <img
            src={PHOTOS.patates}
            alt="Çelik kupada çıtır patates, yanında klasik burger"
            loading="lazy"
            className="smx-reveal aspect-[4/3] w-full rounded-2xl border-[10px] border-white object-cover shadow-xl"
            style={{ rotate: '-2deg' }}
          />
        </div>
      </section>

      {/* ── Konum & saatler ─────────────────────────────────────────── */}
      <section id="konum" className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="smx-display smx-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>Kadıköy'deyiz</h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(18,42,92,0.8)' }}>
              Caferağa Mahallesi, Moda Caddesi 61/A<br />Kadıköy, İstanbul
            </p>
            <dl className="mt-8 max-w-sm">
              {HOURS.map((r) => (
                <div key={r.d} className="flex items-baseline justify-between border-t py-3" style={{ borderColor: 'rgba(18,42,92,0.2)' }}>
                  <dt className="font-semibold">{r.d}</dt>
                  <dd className="smx-display">{r.h}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/menu" className="rounded-full px-8 py-4 text-base font-extrabold text-white transition-transform hover:-translate-y-0.5" style={{ background: NAVY }}>
                Gel al siparişi ver
              </Link>
              <a href="https://maps.google.com/?q=Moda+Caddesi+Kadıköy" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 px-8 py-4 text-base font-bold transition-colors hover:bg-black/5" style={{ borderColor: NAVY, color: NAVY }}>
                Yol tarifi al
              </a>
            </div>
          </div>
          <img
            src={PHOTOS.sepet}
            alt="Ahşap tablada iki Smashé, yanında soğuk gazoz"
            loading="lazy"
            className="smx-reveal aspect-[4/3] w-full self-center rounded-2xl object-cover"
            style={{ border: `4px solid ${NAVY}`, rotate: '1.5deg' }}
          />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{ background: NAVY_DEEP }} className="pb-10 pt-14 text-white">
        <div className="smx-marquee mb-10 opacity-90" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="smx-display gap-8 pr-8 text-5xl md:text-7xl">
              {Array.from({ length: 6 }, (_, j) => (<span key={j} className="whitespace-nowrap">SMASHÉ ·</span>))}
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
          <p className="text-sm text-white/60">© {new Date().getFullYear()} Smashé · Kadıköy, İstanbul</p>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link to="/menu" className="hover:text-white/70">Menü</Link>
            <a href="https://instagram.com/smashegang" target="_blank" rel="noopener noreferrer" className="hover:text-white/70">Instagram</a>
            <Link to="/panel" className="text-white/50 hover:text-white/70">İşletme girişi</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
