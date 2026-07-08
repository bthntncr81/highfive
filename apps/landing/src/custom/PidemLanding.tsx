import { useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────
// PİDEM KARADENİZ — premium elle kodlanmış tenant landing'i.
//
// Design read: taş fırın pide salonu, aile işletmesi. DRENCHED derin
// yosun yeşili gövde (krem klişesi yok) + tereyağı sarısı vurgu; ahşap
// ve fırın sıcaklığı fotolarla gelir. Tip: Baloo 2 (yumuşak yuvarlak
// display) + Karla (okunur hümanist gövde).
//
// Motion: saf CSS (framer YOK). Hero girişi keyframe + 'both' fill;
// scroll bölümleri animation-timeline: view() ile SADECE translateY
// kayması (opacity gate YOK; içerik her koşulda görünür). Marquee CSS
// keyframe. prefers-reduced-motion tümünü kapatır.
// ─────────────────────────────────────────────────────────────────────

const MOSS = '#1E3B2E' // derin yosun yeşili (drenched gövde)
const MOSS_DEEP = '#14291F' // nav + footer
const MOSS_CARD = '#2A4C3B' // yeşil üstü kabarık yüzey
const BUTTER = '#F3C64E' // tereyağı sarısı vurgu
const CREAM_INK = '#F9F4E4' // koyu zemin üstü sıcak metin rengi (yüzey değil)

const IMG = {
  hero: 'https://images.unsplash.com/photo-1777315387813-12a78fcf22f5?auto=format&fit=crop&w=1100&q=80',
  kiymali: 'https://images.unsplash.com/photo-1653982960203-c8361d7bed96?auto=format&fit=crop&w=900&q=80',
  kasarli: 'https://images.unsplash.com/photo-1758714068469-75887ca0b8c3?auto=format&fit=crop&w=900&q=80',
  kusbasili: 'https://images.unsplash.com/photo-1620374230614-0ba831289903?auto=format&fit=crop&w=900&q=80',
  lahmacun: 'https://images.unsplash.com/photo-1620374230612-265d5045c85b?auto=format&fit=crop&w=900&q=80',
  firin: 'https://images.unsplash.com/photo-1772758632504-361aa9d14a19?auto=format&fit=crop&w=1200&q=80',
  pideler: 'https://images.unsplash.com/photo-1772758632889-b3518f24a4a7?auto=format&fit=crop&w=800&q=80',
  tezgah: 'https://images.unsplash.com/photo-1772758632990-4b886c15e3f4?auto=format&fit=crop&w=1000&q=80',
}

const MENU = [
  {
    name: 'Kıymalı Pide',
    price: 245,
    tag: 'Ustanın klasiği',
    desc: 'Kavrulmuş soğanlı dana kıyma, ince açılmış hamurun üstünde odun ateşinde mühürlenir. Çıkar çıkmaz tereyağı sürülür.',
    photo: IMG.kiymali,
    alt: 'Salata ve patates eşliğinde, kayık formunda bol kıymalı pide',
    wide: true,
  },
  {
    name: 'Kaşarlı Yumurtalı Pide',
    price: 225,
    tag: 'Fırından akışkan',
    desc: 'Bol eski kaşar, tam ortasına günlük köy yumurtası. Kaşığı kenarından batırıp karıştırmak serbest, hatta şart.',
    photo: IMG.kasarli,
    alt: 'Ortasında göz yumurta ve eriyen tereyağı olan kayık kaşarlı pide',
    wide: false,
  },
  {
    name: 'Kuşbaşılı Kaşarlı Pide',
    price: 295,
    tag: 'En çok sevilen',
    desc: 'Sote kuşbaşı, közlenmiş biber ve kaşar aynı hamurda buluşur. Dilim dilim gelir, masada uzun sürmez.',
    photo: IMG.kusbasili,
    alt: 'Dilimlenmiş kuşbaşılı kaşarlı pide, çıtır kenarlarıyla tabakta',
    wide: false,
  },
  {
    name: 'Lahmacun',
    price: 125,
    tag: 'İnce, çıtır',
    desc: 'İnce açılır, taş tabanda saniyeler içinde pişer. Maydanoz, limon, bir de ayran; gerisi laf kalabalığı.',
    photo: IMG.lahmacun,
    alt: 'Odun fırınından yeni çıkmış ince çıtır lahmacun',
    wide: true,
  },
]

const STEPS = [
  {
    title: 'Odun',
    body: 'Fırın her sabah meşe odunuyla yakılır. Taş taban ısıyı saatlerce tutar; pidenin altını çıtır yapan da budur.',
  },
  {
    title: 'Hamur',
    body: 'Hamur bir gece dinlenir, sabah elde açılır. Makine yok, merdane yok; ustanın avucu ve taş tezgah var.',
  },
  {
    title: 'Fırın',
    body: 'Pide küreğin ucunda fırına girer, üç dakikada kenarları kabarır. Çıkar çıkmaz tereyağıyla buluşur.',
  },
]

const HOURS = [
  { d: 'Pazartesi - Cuma', h: '11:00 - 22:00' },
  { d: 'Cumartesi', h: '11:00 - 23:00' },
  { d: 'Pazar', h: '12:00 - 22:00' },
]

const MARQUEE = ['Kıymalı', 'Kaşarlı', 'Kuşbaşılı', 'Yumurtalı', 'Lahmacun', 'Tereyağlı']

export const PidemLanding = () => {
  useEffect(() => {
    document.title = 'Pidem Karadeniz · Taş fırın pide salonu, Kasımpaşa'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        'Pidem Karadeniz, Kasımpaşa. Meşe odunlu taş fırında el açması pide: kıymalı, kaşarlı, kuşbaşılı. 1994 yılından beri aynı köşede. Gel al ya da online sipariş ver.'
      )
  }, [])

  return (
    <main className="pkz" style={{ background: MOSS, color: CREAM_INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Karla:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

        .pkz { font-family: 'Karla', system-ui, sans-serif; }
        .pkz-display { font-family: 'Baloo 2', system-ui, sans-serif; font-weight: 700; letter-spacing: -0.015em; }

        /* Fırın tuğlası hissi: çok düşük opaklıkta yatay derz çizgileri */
        .pkz-grain {
          background-color: ${MOSS};
          background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 2px, transparent 2px 88px);
        }

        /* Marquee (saf CSS keyframe) */
        .pkz-marquee { display: flex; overflow: hidden; user-select: none; }
        .pkz-marquee > div { display: flex; flex-shrink: 0; align-items: center; animation: pkz-scroll 30s linear infinite; }
        @keyframes pkz-scroll { to { transform: translateX(-100%); } }

        /* Hero girişi (yükte, JS'siz, 'both' fill) */
        @keyframes pkz-rise  { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
        @keyframes pkz-photo { from { opacity: 0; transform: rotate(-4deg) translateY(34px); } to { opacity: 1; transform: rotate(-1.5deg); } }
        @keyframes pkz-stkr  { from { opacity: 0; transform: scale(0.2) rotate(26deg); } to { opacity: 1; transform: scale(1) rotate(9deg); } }
        .pkz-rise   { animation: pkz-rise 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .pkz-rise-1 { animation-delay: 0.08s; } .pkz-rise-2 { animation-delay: 0.18s; } .pkz-rise-3 { animation-delay: 0.28s; }
        .pkz-photo  { animation: pkz-photo 0.75s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
        .pkz-stkr   { animation: pkz-stkr 0.5s 0.62s cubic-bezier(0.16,1,0.3,1) both; }

        /* Scroll reveal: İÇERİK HER ZAMAN GÖRÜNÜR (opacity gate YOK); sadece hafif kayma */
        @keyframes pkz-in { from { transform: translateY(28px); } to { transform: none; } }
        @supports (animation-timeline: view()) {
          .pkz-reveal { animation: pkz-in linear both; animation-timeline: view(); animation-range: entry 5% entry 90%; }
        }

        /* Menü kartı: hover'da foto hafif kalkar */
        .pkz-card img { transition: translate .35s cubic-bezier(.16,1,.3,1); }
        .pkz-card:hover img { translate: 0 -6px; }

        @media (prefers-reduced-motion: reduce) {
          .pkz-marquee > div { animation: none; }
          .pkz-rise, .pkz-photo, .pkz-stkr, .pkz-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
          .pkz-card img { transition: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ background: MOSS_DEEP, borderBottom: `3px solid ${BUTTER}` }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="pkz-display text-xl leading-none sm:text-2xl" style={{ color: BUTTER }}>
            Pidem Karadeniz
          </a>
          <nav className="hidden items-center gap-7 text-[15px] font-semibold md:flex" style={{ color: CREAM_INK }}>
            <a href="#pideler" className="hover:opacity-70">Pideler</a>
            <a href="#tasfirin" className="hover:opacity-70">Taş fırın</a>
            <a href="#konum" className="hover:opacity-70">Konum</a>
          </nav>
          <Link
            to="/menu"
            className="rounded-full px-5 py-2.5 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
            style={{ background: BUTTER, color: MOSS_DEEP }}
          >
            Sipariş ver
          </Link>
        </div>
      </header>

      {/* ── Hero: yosun yeşili drench, fırından çıkan pide ──────────── */}
      <section id="top" className="pkz-grain relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pb-28 md:pt-20">
          <div>
            <p
              className="pkz-rise mb-5 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
              style={{ border: `2px solid rgba(243,198,78,0.55)`, color: BUTTER }}
            >
              Taş fırın, odun ateşi, aile usulü
            </p>
            <h1 className="pkz-display pkz-rise pkz-rise-1" style={{ fontSize: 'clamp(2.7rem, 7.5vw, 5.2rem)', lineHeight: 1.04, textWrap: 'balance' }}>
              Pide dediğin
              <br />
              <span style={{ color: BUTTER }}>taş fırından</span> çıkar.
            </h1>
            <p className="pkz-rise pkz-rise-2 mt-6 max-w-md text-lg leading-relaxed" style={{ color: 'rgba(249,244,228,0.82)' }}>
              Karadeniz usulünü Kasımpaşa'nın köşesine kurduk. Hamur her sabah elde açılır,
              meşe ateşi gün boyu sönmez, tereyağı pide fırından çıkar çıkmaz sürülür.
            </p>
            <div className="pkz-rise pkz-rise-3 mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/menu"
                className="rounded-full px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                style={{ background: BUTTER, color: MOSS_DEEP }}
              >
                Sipariş ver
              </Link>
              <a
                href="#pideler"
                className="rounded-full px-8 py-4 text-base font-bold transition-colors hover:bg-white/10"
                style={{ border: '2px solid rgba(249,244,228,0.4)', color: CREAM_INK }}
              >
                Pidelere bak
              </a>
            </div>
          </div>

          <div className="pkz-photo relative mx-auto w-full max-w-md">
            <div
              className="absolute -bottom-5 -left-5 h-full w-full rounded-[2rem]"
              style={{ background: BUTTER, rotate: '2.5deg' }}
              aria-hidden="true"
            />
            <img
              src={IMG.hero}
              alt="Taş fırının önünde tepside sıralanmış kaşarlı ve kıymalı pideler, arkada ustamız iş başında"
              className="relative aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl"
              style={{ border: `8px solid ${MOSS_DEEP}` }}
              loading="eager"
            />
            <div
              className="pkz-stkr pkz-display absolute -right-5 -top-6 grid h-28 w-28 place-items-center rounded-full text-center text-[15px] leading-tight shadow-xl"
              style={{ background: BUTTER, color: MOSS_DEEP }}
            >
              1994'ten
              <br />
              beri aynı
              <br />
              fırın
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee: tereyağı şeridi ────────────────────────────────── */}
      <div className="pkz-marquee py-4" style={{ background: BUTTER, color: MOSS_DEEP }} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="pkz-display gap-9 pr-9 text-xl">
            {MARQUEE.map((t) => (
              <span key={t} className="flex items-center gap-9 whitespace-nowrap">
                {t} <span className="text-2xl">✳</span>
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ── İmza pideler: asimetrik geniş/dar kart dokusu ───────────── */}
      <section id="pideler" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <h2 className="pkz-display pkz-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
              İmza pidelerimiz
            </h2>
            <p className="pkz-reveal max-w-xs md:text-right" style={{ color: 'rgba(249,244,228,0.7)' }}>
              Hepsi el açması hamurla, siparişin üzerine fırına girer.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-12">
            {MENU.map((item, i) => (
              <article
                key={item.name}
                className={`pkz-reveal pkz-card rounded-[1.75rem] p-5 md:p-6 ${
                  item.wide ? 'md:col-span-7' : 'md:col-span-5'
                } ${i === 1 ? 'md:mt-10' : ''} ${i === 2 ? 'md:-mt-10' : ''}`}
                style={{ background: MOSS_CARD }}
              >
                <div className="relative">
                  <img
                    src={item.photo}
                    alt={item.alt}
                    loading="lazy"
                    className={`w-full rounded-2xl object-cover ${item.wide ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}
                  />
                  <div
                    className="pkz-display absolute -bottom-4 right-4 rounded-full px-4 py-1.5 text-lg shadow-lg"
                    style={{ background: BUTTER, color: MOSS_DEEP, rotate: i % 2 === 0 ? '-2deg' : '2deg' }}
                  >
                    ₺{item.price}
                  </div>
                </div>
                <div className="mt-7 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="pkz-display text-2xl">{item.name}</h3>
                  <span
                    className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: 'rgba(243,198,78,0.16)', color: BUTTER }}
                  >
                    {item.tag}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed" style={{ color: 'rgba(249,244,228,0.75)' }}>
                  {item.desc}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              to="/menu"
              className="inline-block rounded-full px-9 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
              style={{ background: BUTTER, color: MOSS_DEEP }}
            >
              Tüm menüyü gör
            </Link>
          </div>
        </div>
      </section>

      {/* ── Taş fırın hikayesi: odun, hamur, fırın ──────────────────── */}
      <section id="tasfirin" className="py-20 md:py-28" style={{ background: MOSS_DEEP }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <div className="relative mx-auto w-full max-w-lg md:order-2">
              <img
                src={IMG.firin}
                alt="Ustamız el açması hamuru odun ateşli taş fırına sürüyor"
                loading="lazy"
                className="pkz-reveal aspect-[4/3] w-full rounded-[2rem] object-cover"
                style={{ border: `8px solid ${MOSS_CARD}` }}
              />
              <img
                src={IMG.pideler}
                alt="Fırından yeni çıkmış, üst üste dizilmiş altın rengi pideler"
                loading="lazy"
                className="pkz-reveal absolute -bottom-8 -left-4 hidden w-40 rounded-2xl object-cover shadow-2xl sm:block md:-left-8 md:w-48"
                style={{ border: `6px solid ${BUTTER}`, rotate: '-4deg', aspectRatio: '1 / 1' }}
              />
            </div>

            <div className="md:order-1">
              <h2 className="pkz-display pkz-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
                Taş fırının üç adımı
              </h2>
              <p className="pkz-reveal mt-4 max-w-md text-lg leading-relaxed" style={{ color: 'rgba(249,244,228,0.75)' }}>
                Dedemizin Of'tan getirdiği usul bugün üçüncü kuşağın elinde. Tarif basit,
                sabır işi; kestirmesi yok.
              </p>

              <div className="mt-10 space-y-8">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="pkz-reveal flex items-start gap-5">
                    <span
                      className="pkz-display grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl"
                      style={{ background: BUTTER, color: MOSS_DEEP, rotate: i % 2 === 0 ? '-4deg' : '4deg' }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="pkz-display text-2xl" style={{ color: BUTTER }}>{s.title}</h3>
                      <p className="mt-1.5 leading-relaxed" style={{ color: 'rgba(249,244,228,0.78)' }}>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Konum & saatler ─────────────────────────────────────────── */}
      <section id="konum" className="pkz-grain py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="pkz-display pkz-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>
              Kasımpaşa'dayız
            </h2>
            <p className="pkz-reveal mt-5 text-lg leading-relaxed" style={{ color: 'rgba(249,244,228,0.82)' }}>
              Kulaksız Caddesi No: 34
              <br />
              Kasımpaşa, Beyoğlu / İstanbul
            </p>
            <p className="pkz-reveal mt-2 text-lg font-semibold" style={{ color: BUTTER }}>
              (0212) 361 44 27
            </p>
            <dl className="pkz-reveal mt-8 max-w-sm">
              {HOURS.map((r) => (
                <div
                  key={r.d}
                  className="flex items-baseline justify-between border-t py-3"
                  style={{ borderColor: 'rgba(249,244,228,0.22)' }}
                >
                  <dt className="font-semibold">{r.d}</dt>
                  <dd className="pkz-display text-lg" style={{ color: BUTTER }}>{r.h}</dd>
                </div>
              ))}
            </dl>
            <div className="pkz-reveal mt-9 flex flex-wrap gap-4">
              <Link
                to="/menu"
                className="rounded-full px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                style={{ background: BUTTER, color: MOSS_DEEP }}
              >
                Gel al siparişi ver
              </Link>
              <a
                href="https://maps.google.com/?q=Kulaks%C4%B1z+Caddesi+34+Kas%C4%B1mpa%C5%9Fa+Beyo%C4%9Flu+%C4%B0stanbul"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-8 py-4 text-base font-bold transition-colors hover:bg-white/10"
                style={{ border: '2px solid rgba(249,244,228,0.4)', color: CREAM_INK }}
              >
                Yol tarifi al
              </a>
            </div>
          </div>
          <img
            src={IMG.tezgah}
            alt="Tezgahın önünde sırasını bekleyen mahalleli, arkada fırın telaşı"
            loading="lazy"
            className="pkz-reveal aspect-[4/3] w-full self-center rounded-[2rem] object-cover"
            style={{ border: `8px solid ${MOSS_CARD}`, rotate: '1.5deg' }}
          />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="pb-10 pt-16" style={{ background: MOSS_DEEP }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="pkz-display text-center" style={{ fontSize: 'clamp(2.4rem, 8vw, 5rem)', color: BUTTER, lineHeight: 1 }}>
            Pidem Karadeniz
          </p>
          <p className="mt-3 text-center text-sm" style={{ color: 'rgba(249,244,228,0.55)' }}>
            Meşe odunu, taş taban, el açması hamur. Gerisi bahane.
          </p>
          <div
            className="mt-10 flex flex-col items-center justify-between gap-6 border-t pt-8 md:flex-row"
            style={{ borderColor: 'rgba(249,244,228,0.16)' }}
          >
            <p className="text-sm" style={{ color: 'rgba(249,244,228,0.55)' }}>
              © {new Date().getFullYear()} Pidem Karadeniz · Kasımpaşa, İstanbul
            </p>
            <div className="flex items-center gap-6 text-sm font-semibold">
              <Link to="/menu" className="hover:opacity-70" style={{ color: CREAM_INK }}>Menü</Link>
              <a
                href="https://instagram.com/pidemkaradeniz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70"
                style={{ color: CREAM_INK }}
              >
                Instagram
              </a>
              <Link to="/panel" className="hover:opacity-70" style={{ color: 'rgba(249,244,228,0.55)' }}>
                İşletme girişi
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
