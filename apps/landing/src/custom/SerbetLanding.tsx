import { useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────
// ŞERBET — premium elle kodlanmış tenant landing'i (customLanding: "serbet").
//
// Design read: Gaziantep usulü baklava & künefe atölyesi. Estetik aile:
// MÜCEVHER KUTUSU — gece yeşili zemin + doygun fıstık yeşili yüzey +
// bakır/amber ışıltı. İmza doku: baklava tepsisinin elmas dilim kesimi
// (45° çapraz lattice). Tip: Yeseva One (süslü yüksek-kontrast display)
// + Schibsted Grotesk (grotesk gövde).
//
// Kopya hardcoded (içerik modeli yok). Motion: saf CSS (framer YOK) —
// hero yükte keyframe, scroll bölümleri animation-timeline: view() ile
// SADECE hafif kayma (opacity gate yok; içerik her koşulda görünür).
// ─────────────────────────────────────────────────────────────────────

const NIGHT = '#0C1F17' // gece yeşili zemin
const NIGHT_2 = '#12291E' // bölüm varyantı
const NIGHT_DEEP = '#071510' // footer
const FERN = '#4F7942' // doygun fıstık yüzeyi
const PIST = '#93C572' // fıstık yeşili vurgu
const COPPER = '#B87333' // bakır
const COPPER_LIGHT = '#D89A5B' // amber parlama
const IVORY = '#F1EDE2' // koyu zemin üstü metin

const IMG = {
  hero: 'https://images.unsplash.com/photo-1761828122856-8703baac8e86?w=900&q=80&fm=jpg',
  baklava: 'https://images.unsplash.com/photo-1778448547699-6cb8d3f318a4?w=900&q=80&fm=jpg',
  kunefe: 'https://images.unsplash.com/photo-1567244394476-cd3a920b65bb?w=900&q=80&fm=jpg',
  katmer: 'https://images.unsplash.com/photo-1654465442143-cd40c7649b0e?w=900&q=80&fm=jpg',
  havuc: 'https://images.unsplash.com/photo-1778448563279-e7b39093933c?w=900&q=80&fm=jpg',
  serbetPour: 'https://images.unsplash.com/photo-1705663106388-6c1c51ff5a8d?w=1200&q=80&fm=jpg',
  vitrin: 'https://images.unsplash.com/photo-1676014959543-81df1079b423?w=900&q=80&fm=jpg',
}

const MARQUEE = [
  'Fıstık Barak ovasından',
  'Şerbet her sabah kaynar',
  'Yufka elde açılır',
  'Künefe tepsisiyle gelir',
  'Kargo soğuk zincirle',
]

const SWEETS = [
  {
    name: 'Fıstıklı baklava',
    price: 295,
    tag: 'En çok satan',
    photo: IMG.baklava,
    alt: 'Tepside kare kare kesilmiş fıstıklı baklava, şerbeti bakır gibi parlıyor',
    desc: 'Kırk kat yufka, iki parmak fıstık, üstünde günlük şerbetin bakır parlaması. Klasiğin ta kendisi; porsiyonda dört dilim.',
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
    shift: '',
    tilt: '-0.7deg',
  },
  {
    name: 'Kaymaklı künefe',
    price: 260,
    tag: '',
    photo: IMG.kunefe,
    alt: 'Kaymaklı künefe porselen tabakta, yanında ince belli çay',
    desc: 'Tel kadayıf bakır tepside kızarır, sıcak sıcak kaymağıyla buluşur. Peynir uzar, şerbet damlar, çay şart.',
    span: 'md:col-span-5',
    aspect: 'aspect-[4/5]',
    shift: 'md:translate-y-10',
    tilt: '0.8deg',
  },
  {
    name: 'Fıstıklı katmer',
    price: 320,
    tag: 'Usta işi',
    photo: IMG.katmer,
    alt: 'Ahşap tablada Gaziantep katmeri, üstünde fıstık tozu, arkada çay',
    desc: 'Kağıt inceliğinde yufkanın içinde kaymak ve dövülmüş boz iç fıstık. Gaziantep sabahının tacı, burada günün her saati.',
    span: 'md:col-span-5',
    aspect: 'aspect-[4/3]',
    shift: 'md:-translate-y-4',
    tilt: '0.6deg',
  },
  {
    name: 'Havuç dilim',
    price: 310,
    tag: '',
    photo: IMG.havuc,
    alt: 'Yuvarlak tepsiden yelpaze gibi açılan havuç dilim baklava, ortasında dövülmüş Antep fıstığı',
    desc: 'Tepsinin ortasından yelpaze gibi açılan geniş dilim. Fıstığı cömert, şerbeti kararında, kenarı çıtır.',
    span: 'md:col-span-7',
    aspect: 'aspect-[16/9]',
    shift: '',
    tilt: '-0.6deg',
  },
]

const STEPS = [
  {
    title: 'Yufka',
    body: 'Nişastalı hamur oklavayla kırk kat açılır. Her kat tülbent inceliğinde; ustalar arkasından gazete okunur der, biz denedik, okunuyor.',
  },
  {
    title: 'Fıstık',
    body: 'Barak ovasının boz iç fıstığı taş değirmende çekilir. Yeşilin bu tonu boyayla olmaz; toprakla, mevsimle, sabırla olur.',
  },
  {
    title: 'Şerbet',
    body: 'Fırından çıkan sıcak tepsiye soğuk şerbet dökülür. O cızırtı atölyenin en sevdiğimiz sesidir; parlaklık oradan gelir.',
  },
]

const HOURS = [
  { d: 'Hafta içi', h: '09.00 - 21.00' },
  { d: 'Cumartesi', h: '09.00 - 22.00' },
  { d: 'Pazar', h: '10.00 - 20.00' },
]

export const SerbetLanding = () => {
  useEffect(() => {
    document.title = 'Şerbet · Gaziantep usulü baklava & künefe atölyesi'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        "Şerbet, Beyoğlu'nda Gaziantep usulü baklava ve künefe atölyesi. Kırk kat el açması yufka, Barak fıstığı, her sabah taze kaynayan şerbet. Online sipariş ve Türkiye'ye soğuk zincir kargo."
      )
  }, [])

  return (
    <main className="srb" style={{ background: NIGHT, color: IVORY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Yeseva+One&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap');

        .srb { font-family: 'Schibsted Grotesk', system-ui, sans-serif; }
        .srb-display { font-family: 'Yeseva One', serif; font-weight: 400; letter-spacing: 0.005em; }

        /* Baklava tepsisi elmas kesimi: 45 derece çapraz bakır lattice */
        .srb-lattice {
          background-color: ${NIGHT};
          background-image:
            repeating-linear-gradient(45deg,  rgba(184,115,51,0.10) 0 1.5px, transparent 1.5px 34px),
            repeating-linear-gradient(-45deg, rgba(184,115,51,0.10) 0 1.5px, transparent 1.5px 34px);
        }
        .srb-lattice-fern {
          background-color: ${FERN};
          background-image:
            repeating-linear-gradient(45deg,  rgba(12,31,23,0.18) 0 1.5px, transparent 1.5px 30px),
            repeating-linear-gradient(-45deg, rgba(12,31,23,0.18) 0 1.5px, transparent 1.5px 30px);
        }

        /* Mücevher kutusu çerçevesi: bakır bezel + fıstık ince kontur */
        .srb-frame {
          border: 3px solid ${COPPER};
          outline: 1px solid rgba(147,197,114,0.4);
          outline-offset: 7px;
          border-radius: 16px;
        }

        /* Marquee */
        .srb-marquee { display: flex; overflow: hidden; user-select: none; }
        .srb-marquee > div { display: flex; flex-shrink: 0; align-items: center; animation: srb-scroll 30s linear infinite; }
        @keyframes srb-scroll { to { transform: translateX(-100%); } }

        /* Hero girişi (yükte, JS'siz, 'both' fill) */
        @keyframes srb-rise  { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
        @keyframes srb-photo { from { opacity: 0; transform: rotate(-4deg) translateY(34px); } to { opacity: 1; transform: rotate(-1.5deg); } }
        @keyframes srb-seal  { from { opacity: 0; transform: scale(0) rotate(28deg); } to { opacity: 1; transform: scale(1) rotate(-10deg); } }
        .srb-rise   { animation: srb-rise 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .srb-rise-1 { animation-delay: 0.08s; } .srb-rise-2 { animation-delay: 0.18s; } .srb-rise-3 { animation-delay: 0.28s; }
        .srb-photo  { animation: srb-photo 0.75s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
        .srb-seal   { animation: srb-seal 0.5s 0.65s cubic-bezier(0.16,1,0.3,1) both; }

        /* Scroll reveal: İÇERİK HER ZAMAN GÖRÜNÜR (opacity gate YOK); sadece hafif kayma. */
        @keyframes srb-in { from { transform: translateY(28px); } to { transform: none; } }
        @supports (animation-timeline: view()) {
          .srb-reveal { animation: srb-in linear both; animation-timeline: view(); animation-range: entry 5% entry 95%; }
        }

        /* Vitrin kartı: hover'da düzelir + hafif kalkar */
        .srb-card { transition: rotate .35s cubic-bezier(.16,1,.3,1), translate .35s cubic-bezier(.16,1,.3,1); }
        .srb-card:hover { rotate: 0deg !important; translate: 0 -6px; }

        @media (prefers-reduced-motion: reduce) {
          .srb-marquee > div { animation: none; }
          .srb-rise, .srb-photo, .srb-seal, .srb-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
          .srb-card { transition: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ background: NIGHT, borderBottom: `2px solid ${COPPER}` }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="srb-display text-2xl" style={{ color: PIST }}>Şerbet</a>
          <nav className="hidden items-center gap-7 text-[15px] font-semibold md:flex" style={{ color: IVORY }}>
            <a href="#tatlilar" className="hover:opacity-70">Tatlılar</a>
            <a href="#atolye" className="hover:opacity-70">Atölye</a>
            <a href="#siparis" className="hover:opacity-70">Sipariş &amp; kargo</a>
          </nav>
          <Link
            to="/menu"
            className="rounded-full px-5 py-2.5 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
            style={{ background: COPPER, color: NIGHT_DEEP }}
          >
            Sipariş ver
          </Link>
        </div>
      </header>

      {/* ── Hero: gece yeşili kutu, bakır ışıltı ────────────────────── */}
      <section id="top" className="srb-lattice relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{ background: `radial-gradient(60% 50% at 85% 10%, rgba(216,154,91,0.14), transparent 70%)` }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pb-28 md:pt-20">
          <div>
            <p
              className="srb-rise mb-5 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
              style={{ border: `1.5px solid ${COPPER}`, color: COPPER_LIGHT }}
            >
              Beyoğlu, İstanbul · Gaziantep usulü
            </p>
            <h1
              className="srb-display srb-rise srb-rise-1"
              style={{ fontSize: 'clamp(2.7rem, 7.5vw, 5rem)', lineHeight: 1.05, textWrap: 'balance', color: IVORY }}
            >
              Tatlı değil,<br />
              <span style={{ color: PIST }}>mücevher.</span>
            </h1>
            <p className="srb-rise srb-rise-2 mt-6 max-w-md text-lg leading-relaxed" style={{ color: 'rgba(241,237,226,0.78)' }}>
              Şerbet, Gaziantep'ten İstanbul'a taşınmış bir atölye alışkanlığıdır: yufka elde açılır, fıstık Barak
              ovasından gelir, şerbet her sabah taze kaynar. Her dilim kutusundan yeni çıkmış gibi parlar.
            </p>
            <div className="srb-rise srb-rise-3 mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/menu"
                className="rounded-full px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                style={{ background: COPPER, color: NIGHT_DEEP }}
              >
                Sipariş ver
              </Link>
              <a
                href="#tatlilar"
                className="rounded-full px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                style={{ border: `2px solid rgba(147,197,114,0.45)`, color: PIST }}
              >
                Tatlıları gör
              </a>
            </div>
          </div>

          <div className="srb-photo relative mx-auto w-full max-w-md">
            <img
              src={IMG.hero}
              alt="Bakır tezgahta sıra sıra fıstıklı dilim baklava, şerbeti ışıl ışıl"
              className="srb-frame aspect-[4/5] w-full object-cover shadow-2xl"
              loading="eager"
            />
            <div
              className="srb-seal srb-display absolute -left-6 -top-6 grid h-24 w-24 place-items-center rounded-full text-center text-sm leading-tight shadow-xl"
              style={{ background: COPPER, color: NIGHT_DEEP }}
            >
              Şerbeti<br />günlük
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee: fıstık bandı ───────────────────────────────────── */}
      <div className="srb-marquee py-4" style={{ background: FERN, borderTop: `2px solid ${COPPER}`, borderBottom: `2px solid ${COPPER}` }} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="srb-display gap-10 pr-10 text-xl" style={{ color: NIGHT_DEEP }}>
            {MARQUEE.map((t) => (
              <span key={t} className="flex items-center gap-10 whitespace-nowrap">
                {t} <span className="text-2xl" style={{ color: COPPER_LIGHT }}>✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ── İmza tatlılar: asimetrik vitrin ─────────────────────────── */}
      <section id="tatlilar" className="py-20 md:py-28" style={{ background: NIGHT_2 }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <h2 className="srb-display srb-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance', color: IVORY }}>
              Vitrinin baş köşesi
            </h2>
            <p className="srb-reveal max-w-xs md:text-right" style={{ color: 'rgba(241,237,226,0.65)' }}>
              Fiyatlar porsiyon içindir. Tepsi ve kutu siparişi için bizi arayın.
            </p>
          </div>

          <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-12">
            {SWEETS.map((s) => (
              <article key={s.name} className={`srb-reveal srb-card ${s.span} ${s.shift}`} style={{ rotate: s.tilt }}>
                <div className="relative">
                  <img src={s.photo} alt={s.alt} loading="lazy" className={`srb-frame ${s.aspect} w-full object-cover`} />
                  <div
                    className="srb-display absolute -right-3 -top-3 grid h-20 w-20 place-items-center rounded-full text-lg shadow-lg"
                    style={{ background: COPPER, color: NIGHT_DEEP, rotate: '7deg' }}
                  >
                    ₺{s.price}
                  </div>
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-3">
                  <h3 className="srb-display text-2xl" style={{ color: PIST }}>{s.name}</h3>
                  {s.tag && (
                    <span
                      className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold"
                      style={{ border: `1.5px solid ${COPPER}`, color: COPPER_LIGHT }}
                    >
                      {s.tag}
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-lg leading-relaxed" style={{ color: 'rgba(241,237,226,0.72)' }}>{s.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-16 text-center md:mt-20">
            <Link
              to="/menu"
              className="inline-block rounded-full px-9 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
              style={{ background: COPPER, color: NIGHT_DEEP }}
            >
              Tüm vitrini gör
            </Link>
          </div>
        </div>
      </section>

      {/* ── Atölye: kırk katın hesabı (fıstık drench) ───────────────── */}
      <section id="atolye" className="srb-lattice-fern py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
            <h2 className="srb-display srb-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance', color: NIGHT_DEEP }}>
              Kırk katın hesabı
            </h2>
            <p className="srb-reveal max-w-xs font-medium md:text-right" style={{ color: 'rgba(7,21,16,0.75)' }}>
              Üç adım, üç ayrı sabır. Atölyede hepsi elle yapılır.
            </p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="srb-reveal pt-6" style={{ borderTop: `2px solid rgba(7,21,16,0.4)` }}>
                <div className="flex items-baseline gap-4">
                  <span
                    className="srb-display text-6xl"
                    style={{ WebkitTextStroke: '2px rgba(7,21,16,0.85)', color: 'transparent' }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="srb-display text-2xl" style={{ color: NIGHT_DEEP }}>{s.title}</h3>
                </div>
                <p className="mt-4 font-medium leading-relaxed" style={{ color: 'rgba(7,21,16,0.78)' }}>{s.body}</p>
              </div>
            ))}
          </div>

          <img
            src={IMG.serbetPour}
            alt="Kaynamış şerbet fıstıklı baklava dilimlerinin üstüne ince bir telle süzülüyor"
            loading="lazy"
            className="srb-frame srb-reveal mt-14 h-64 w-full object-cover md:h-96"
          />
        </div>
      </section>

      {/* ── Sipariş, kargo ve saatler ───────────────────────────────── */}
      <section id="siparis" className="py-20 md:py-28" style={{ background: NIGHT }}>
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="srb-display srb-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', color: IVORY }}>
              Atölyeden kapınıza
            </h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(241,237,226,0.78)' }}>
              Asmalı Mescit Mah. General Yazgan Sok. No: 12/A<br />
              Beyoğlu, İstanbul · (0212) 244 68 40
            </p>

            <div
              className="srb-reveal mt-8 max-w-md rounded-2xl p-6"
              style={{ border: `2px dashed ${COPPER}`, background: 'rgba(184,115,51,0.06)' }}
            >
              <h3 className="srb-display text-xl" style={{ color: COPPER_LIGHT }}>Kargo notu</h3>
              <p className="mt-3 leading-relaxed" style={{ color: 'rgba(241,237,226,0.78)' }}>
                Türkiye'nin her yerine soğuk zincir kargoyla gönderiyoruz. Baklava ahşap kutusunda, künefe pişmeye
                hazır bakır tepsisinde yola çıkar; yanına tarif kartı koyarız.
              </p>
            </div>

            <dl className="mt-8 max-w-sm">
              {HOURS.map((r) => (
                <div key={r.d} className="flex items-baseline justify-between py-3" style={{ borderTop: '1px solid rgba(147,197,114,0.25)' }}>
                  <dt className="font-semibold" style={{ color: IVORY }}>{r.d}</dt>
                  <dd className="srb-display" style={{ color: PIST }}>{r.h}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/menu"
                className="rounded-full px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                style={{ background: COPPER, color: NIGHT_DEEP }}
              >
                Sipariş ver
              </Link>
              <a
                href="https://maps.google.com/?q=Serbet+Atolyesi+Beyoglu+Istanbul"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                style={{ border: `2px solid rgba(147,197,114,0.45)`, color: PIST }}
              >
                Yol tarifi al
              </a>
            </div>
          </div>

          <img
            src={IMG.vitrin}
            alt="Atölye vitrininde piramit gibi dizilmiş fıstıklı baklava çeşitleri"
            loading="lazy"
            className="srb-frame srb-reveal aspect-[4/5] w-full self-center object-cover md:max-w-md md:justify-self-end"
            style={{ rotate: '1deg' }}
          />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="pb-10 pt-14" style={{ background: NIGHT_DEEP }}>
        <div className="srb-marquee mb-10 opacity-80" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="srb-display gap-8 pr-8 text-5xl md:text-7xl" style={{ color: COPPER }}>
              {Array.from({ length: 6 }, (_, j) => (
                <span key={j} className="whitespace-nowrap">Şerbet ✦</span>
              ))}
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
          <p className="text-sm" style={{ color: 'rgba(241,237,226,0.55)' }}>
            © {new Date().getFullYear()} Şerbet · Beyoğlu, İstanbul
          </p>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link to="/menu" className="hover:opacity-70" style={{ color: PIST }}>Menü</Link>
            <a
              href="https://instagram.com/serbetatolyesi"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70"
              style={{ color: PIST }}
            >
              Instagram
            </a>
            <Link to="/panel" className="hover:opacity-70" style={{ color: 'rgba(241,237,226,0.5)' }}>
              İşletme girişi
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
