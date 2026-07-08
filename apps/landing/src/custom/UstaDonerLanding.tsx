import { useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────
// USTA DÖNER — premium elle kodlanmış tenant landing'i.
//
// Design read: İstanbul dönercisi, 1974'ten beri baba mesleği. Gece sokak
// lokantası estetiği: İS KARASI gövde (drenched-dark) + tek vurgu ATEŞ
// TURUNCUSU. Tip: Anton (kondanse tabela display'i) + Barlow (DIN kokulu
// nötr grotesk gövde).
//
// Motion: saf CSS (framer YOK). Hero girişi keyframe + 'both' fill; scroll
// bölümleri @supports (animation-timeline: view()) ile SADECE translateY
// kayması (opacity gate YOK, içerik her koşulda görünür). Marquee CSS
// keyframe. prefers-reduced-motion'da hepsi kapanır.
// ─────────────────────────────────────────────────────────────────────

const INK = '#141210'
const INK_DEEP = '#0b0908'
const RAISED = '#1e1913'
const FIRE = '#ff5a1c'
const BONE = '#f4ede3'
const SMOKE = 'rgba(244,237,227,0.64)'
const HAIRLINE = 'rgba(244,237,227,0.14)'

const IMG = {
  heroSpit: 'https://images.unsplash.com/photo-1756362847925-71c792d6729c?w=1000&q=80&auto=format&fit=crop',
  craftSlice: 'https://images.unsplash.com/photo-1596995804697-27d11d43652e?w=1000&q=80&auto=format&fit=crop',
  storyKnife: 'https://images.unsplash.com/photo-1684864115205-242c064363e6?w=900&q=80&auto=format&fit=crop',
  ekmekArasi: 'https://images.unsplash.com/photo-1699728088614-7d1d4277414b?w=800&q=80&auto=format&fit=crop',
  durum: 'https://images.unsplash.com/photo-1778168199427-4e839943d20f?w=800&q=80&auto=format&fit=crop',
  pilavUstu: 'https://images.unsplash.com/photo-1733310900396-b690f51b6ee4?w=800&q=80&auto=format&fit=crop',
  geceTezgah: 'https://images.unsplash.com/photo-1772436908747-90928ab4fb72?w=900&q=80&auto=format&fit=crop',
}

const MARQUEE = ['İSKENDER', 'DÜRÜM', 'PİLAV ÜSTÜ', 'MEŞE KÖMÜRÜ', '1974\'TEN BERİ']

const STEPS = [
  {
    title: 'Dinlendirme',
    body: 'Dana but ve kaburga yağı, soğanlı sütlü marinasyonda bir gece bekler. Aceleye gelen et şişte tutmaz, biz beklemesini biliriz.',
  },
  {
    title: 'Şiş dizme',
    body: 'Sabah beşte yaprak yaprak diziyoruz. Bir kat yağsız, bir kat yağlı. Elli kiloluk şiş terazi gibi dengede durmalı, yoksa döner adını hak etmez.',
  },
  {
    title: 'Ateşin başı',
    body: 'Meşe kömürü harlanır, yüzey mühürlenir. Usta bıçağı ince tutar, döner kağıt gibi iner. Kalın kesen dönerci, dönerciliği bırakmalı.',
  },
]

const HOURS = [
  { d: 'Pazartesi - Perşembe', h: '11.00 - 24.00' },
  { d: 'Cuma - Cumartesi', h: '11.00 - 02.00' },
  { d: 'Pazar', h: '12.00 - 23.00' },
]

export const UstaDonerLanding = () => {
  useEffect(() => {
    document.title = 'Usta Döner · Beyoğlu, İstanbul'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        'Usta Döner, Beyoğlu. 1974\'ten beri meşe kömüründe dönen şiş, yaprak döner, İskender ve dürüm. Gel al ya da online sipariş ver.'
      )
  }, [])

  return (
    <main className="ud" style={{ background: INK, color: BONE }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&display=swap');

        .ud { font-family: 'Barlow', system-ui, sans-serif; }
        .ud-display { font-family: 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; letter-spacing: 0.01em; }

        /* Hero girişi (yükte, JS'siz, 'both' fill) */
        @keyframes ud-rise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        .ud-rise   { animation: ud-rise 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .ud-rise-1 { animation-delay: 0.08s; }
        .ud-rise-2 { animation-delay: 0.18s; }
        .ud-rise-3 { animation-delay: 0.28s; }
        .ud-rise-4 { animation-delay: 0.4s; }

        /* Scroll reveal: İÇERİK HER ZAMAN GÖRÜNÜR (opacity gate YOK), sadece hafif kayma */
        @keyframes ud-shift { from { transform: translateY(34px); } to { transform: none; } }
        @supports (animation-timeline: view()) {
          .ud-reveal { animation: ud-shift linear both; animation-timeline: view(); animation-range: entry 5% entry 90%; }
        }

        /* Marquee */
        .ud-marquee { display: flex; overflow: hidden; user-select: none; }
        .ud-marquee > div { display: flex; flex-shrink: 0; align-items: center; animation: ud-scroll 30s linear infinite; }
        @keyframes ud-scroll { to { transform: translateX(-100%); } }

        .ud-card { transition: transform .35s cubic-bezier(.16,1,.3,1), border-color .35s; }
        .ud-card:hover { transform: translateY(-6px); }

        @media (prefers-reduced-motion: reduce) {
          .ud-marquee > div { animation: none; }
          .ud-rise, .ud-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
          .ud-card { transition: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ background: INK_DEEP, borderBottom: `1px solid rgba(255,90,28,0.35)` }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="ud-display text-xl tracking-wide" style={{ color: BONE }}>
            USTA<span style={{ color: FIRE }}> DÖNER</span>
          </a>
          <nav className="hidden items-center gap-8 text-[15px] font-semibold md:flex" style={{ color: SMOKE }}>
            <a href="#menu" className="transition-colors hover:text-white">Menü</a>
            <a href="#ustalik" className="transition-colors hover:text-white">Ustalık</a>
            <a href="#konum" className="transition-colors hover:text-white">Konum</a>
          </nav>
          <Link
            to="/menu"
            className="ud-display rounded-[3px] px-5 py-2.5 text-[15px] tracking-wider transition-transform hover:-translate-y-0.5"
            style={{ background: FIRE, color: INK }}
          >
            Sipariş ver
          </Link>
        </div>
      </header>

      {/* ── Hero: is karası + ocak közü ─────────────────────────────── */}
      <section
        id="top"
        className="relative overflow-hidden"
        style={{ background: `radial-gradient(120% 85% at 80% 112%, rgba(255,90,28,0.26), transparent 62%), ${INK}` }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pb-28 md:pt-24">
          <div>
            <p className="ud-rise mb-6 inline-block border px-4 py-1.5 text-sm font-semibold tracking-wide" style={{ borderColor: 'rgba(255,90,28,0.5)', color: FIRE }}>
              Beyoğlu · 1974'ten beri
            </p>
            <h1 className="ud-display ud-rise ud-rise-1" style={{ fontSize: 'clamp(3.2rem, 9.5vw, 6.8rem)', lineHeight: 0.96, textWrap: 'balance' }}>
              Ateşin başında<br />
              <span style={{ color: FIRE }}>yarım asır</span>
            </h1>
            <p className="ud-rise ud-rise-2 mt-7 max-w-md text-lg leading-relaxed" style={{ color: SMOKE }}>
              Şiş sabah beşte dizilir, kömür on birde harlanır. Babadan kalma tek kural var: döner ince iner, ekmek sıcak gider.
            </p>
            <div className="ud-rise ud-rise-3 mt-10 flex flex-wrap items-center gap-4">
              <Link to="/menu" className="ud-display rounded-[3px] px-9 py-4 text-lg tracking-wider transition-transform hover:-translate-y-0.5" style={{ background: FIRE, color: INK }}>
                Sipariş ver
              </Link>
              <a href="#menu" className="ud-display rounded-[3px] border px-9 py-4 text-lg tracking-wider transition-colors hover:bg-white/5" style={{ borderColor: HAIRLINE, color: BONE }}>
                Menüye bak
              </a>
            </div>
          </div>

          <div className="ud-rise ud-rise-2 relative mx-auto w-full max-w-sm md:max-w-md">
            <div className="absolute -right-3 -top-3 h-full w-full border" style={{ borderColor: 'rgba(255,90,28,0.55)' }} aria-hidden="true" />
            <img
              src={IMG.heroSpit}
              alt="Meşe kömürünün karşısında dönen elli kiloluk döner şişi"
              className="relative aspect-[3/4] w-full object-cover"
              style={{ border: `1px solid ${HAIRLINE}` }}
              loading="eager"
            />
            <div className="ud-display absolute bottom-4 left-4 px-3 py-1.5 text-sm tracking-widest" style={{ background: INK_DEEP, color: FIRE }}>
              EST. 1974
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee: ateş bandı ─────────────────────────────────────── */}
      <div className="ud-marquee py-3.5" style={{ background: FIRE, color: INK }} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="ud-display gap-8 pr-8 text-lg tracking-wider">
            {MARQUEE.map((t) => (
              <span key={t} className="flex items-center gap-8 whitespace-nowrap">{t} <span aria-hidden="true">●</span></span>
            ))}
          </div>
        ))}
      </div>

      {/* ── İmza ürünler ────────────────────────────────────────────── */}
      <section id="menu" className="py-20 md:py-28" style={{ background: INK }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="ud-display ud-reveal" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)', textWrap: 'balance' }}>
              Şişten tabağa
            </h2>
            <p className="ud-reveal max-w-xs text-base leading-relaxed" style={{ color: SMOKE }}>
              Dört imza, tek şiş. Hepsi gün içinde biter, geç kalan yarına bakar.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-12">
            {/* İskender: kurucunun tarifi, tipografik ateş kartı */}
            <article className="ud-reveal ud-card flex flex-col justify-between p-8 md:col-span-7 md:p-10" style={{ background: FIRE, color: INK }}>
              <div>
                <span className="inline-block border px-3 py-1 text-xs font-bold uppercase tracking-widest" style={{ borderColor: 'rgba(20,18,16,0.5)' }}>
                  Kurucunun tarifi
                </span>
                <h3 className="ud-display mt-6" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.6rem)', lineHeight: 0.95 }}>
                  İskender
                </h3>
                <p className="mt-5 max-w-md text-lg font-medium leading-relaxed" style={{ color: 'rgba(20,18,16,0.82)' }}>
                  Tereyağı ocakta kızdırılır, domates sos taze çekilir. Pide kuşbaşı doğranır, üstüne yaprak döner, kenarına süzme yoğurt. 1974'ten beri aynı tabak.
                </p>
              </div>
              <div className="mt-10 flex items-baseline justify-between border-t pt-5" style={{ borderColor: 'rgba(20,18,16,0.35)' }}>
                <span className="text-sm font-bold uppercase tracking-widest">Porsiyon</span>
                <span className="ud-display text-4xl">₺340</span>
              </div>
            </article>

            {/* Dürüm */}
            <article className="ud-reveal ud-card md:col-span-5 md:mt-12" style={{ background: RAISED, border: `1px solid ${HAIRLINE}` }}>
              <img src={IMG.durum} alt="Üst üste sarılmış acılı döner dürümler, lavaşı el açması" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-6">
                <div className="flex items-baseline gap-3">
                  <h3 className="ud-display text-2xl">Dürüm döner</h3>
                  <span className="flex-1 border-b border-dotted" style={{ borderColor: 'rgba(244,237,227,0.35)' }} aria-hidden="true" />
                  <span className="ud-display text-2xl" style={{ color: FIRE }}>₺240</span>
                </div>
                <p className="mt-3 leading-relaxed" style={{ color: SMOKE }}>
                  El açması lavaş sacda ısınır, içine döner, közlenmiş domates, sumaklı soğan. Acılısı sorulur, sorulmadan konmaz.
                </p>
              </div>
            </article>

            {/* Pilav üstü */}
            <article className="ud-reveal ud-card md:col-span-5" style={{ background: RAISED, border: `1px solid ${HAIRLINE}` }}>
              <img src={IMG.pilavUstu} alt="Pilav üstü döner, tereyağlı pirinç pilavının yanında közlenmiş sebze" loading="lazy" className="aspect-square w-full object-cover" />
              <div className="p-6">
                <div className="flex items-baseline gap-3">
                  <h3 className="ud-display text-2xl">Pilav üstü</h3>
                  <span className="flex-1 border-b border-dotted" style={{ borderColor: 'rgba(244,237,227,0.35)' }} aria-hidden="true" />
                  <span className="ud-display text-2xl" style={{ color: FIRE }}>₺260</span>
                </div>
                <p className="mt-3 leading-relaxed" style={{ color: SMOKE }}>
                  Tereyağlı pirinç pilavının üstüne sıcak yaprak döner. Suyu ayrı gelir, isteyen tabağın dibine döker.
                </p>
              </div>
            </article>

            {/* Ekmek arası */}
            <article className="ud-reveal ud-card md:col-span-7 md:mt-10" style={{ background: RAISED, border: `1px solid ${HAIRLINE}` }}>
              <img src={IMG.ekmekArasi} alt="Ekmek arası döner, üstünde domates ve maydanoz" loading="lazy" className="aspect-[16/9] w-full object-cover" />
              <div className="p-6">
                <div className="flex items-baseline gap-3">
                  <h3 className="ud-display text-2xl">Ekmek arası</h3>
                  <span className="flex-1 border-b border-dotted" style={{ borderColor: 'rgba(244,237,227,0.35)' }} aria-hidden="true" />
                  <span className="ud-display text-2xl" style={{ color: FIRE }}>₺180</span>
                </div>
                <p className="mt-3 leading-relaxed" style={{ color: SMOKE }}>
                  Yarım ekmek fırından sıcak alınır, dönerin yağıyla ıslanır. Ayakta yenir, sokağın hakkıdır.
                </p>
              </div>
            </article>
          </div>

          <div className="mt-16 text-center">
            <Link to="/menu" className="ud-display inline-block rounded-[3px] px-10 py-4 text-lg tracking-wider transition-transform hover:-translate-y-0.5" style={{ background: FIRE, color: INK }}>
              Tüm menüyü gör
            </Link>
          </div>
        </div>
      </section>

      {/* ── Ustalık: gerçek üç adım ─────────────────────────────────── */}
      <section id="ustalik" className="py-20 md:py-28" style={{ background: INK_DEEP, borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-[0.9fr_1.1fr]">
          <img
            src={IMG.craftSlice}
            alt="Usta, harlı ateşin önünde şişten yaprak döner indiriyor"
            loading="lazy"
            className="ud-reveal aspect-[3/4] w-full object-cover md:sticky md:top-24 md:self-start"
            style={{ border: `1px solid ${HAIRLINE}` }}
          />
          <div>
            <h2 className="ud-display ud-reveal" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)', textWrap: 'balance' }}>
              Ustalık üç adımda
            </h2>
            <p className="ud-reveal mt-4 max-w-md text-lg leading-relaxed" style={{ color: SMOKE }}>
              Elli yıldır değişmeyen sıra. Kestirmesi yok, kısası yok.
            </p>
            <div className="mt-10">
              {STEPS.map((s, i) => (
                <div key={s.title} className="ud-reveal grid grid-cols-[auto_1fr] gap-6 border-b py-8" style={{ borderColor: HAIRLINE }}>
                  <span className="ud-display text-5xl leading-none md:text-6xl" style={{ color: FIRE }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="ud-display text-2xl">{s.title}</h3>
                    <p className="mt-3 leading-relaxed" style={{ color: SMOKE }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Hikaye: ateş bandı ──────────────────────────────────────── */}
      <section className="py-20 md:py-28" style={{ background: FIRE, color: INK }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="ud-display ud-reveal" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)', textWrap: 'balance' }}>
              Baba mesleği, oğul terbiyesi
            </h2>
            <p className="ud-reveal mt-6 max-w-lg text-lg font-medium leading-relaxed" style={{ color: 'rgba(20,18,16,0.82)' }}>
              Hüseyin Usta bu ocağı 1974'te yaktı. Çıraklığını yapan oğlu bugün aynı bıçağı tutuyor, aynı kasaptan alıyor, aynı saatte diziyor. Tabela hiç değişmedi, tarif de.
            </p>
            <p className="ud-reveal mt-4 max-w-lg text-lg font-medium leading-relaxed" style={{ color: 'rgba(20,18,16,0.82)' }}>
              Müdavimin adı bilinir, siparişi sorulmaz. Yeni gelene bir çay ikram edilir, gerisini döner anlatır.
            </p>
          </div>
          <img
            src={IMG.storyKnife}
            alt="Uzun döner bıçağı şişin yüzeyinden ince yaprak alıyor"
            loading="lazy"
            className="ud-reveal aspect-[4/5] w-full max-w-sm justify-self-center object-cover md:justify-self-end"
            style={{ border: `6px solid ${INK}` }}
          />
        </div>
      </section>

      {/* ── Konum & saatler ─────────────────────────────────────────── */}
      <section id="konum" className="py-20 md:py-28" style={{ background: INK }}>
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="ud-display ud-reveal" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)', textWrap: 'balance' }}>
              Ocağın dibinde
            </h2>
            <p className="ud-reveal mt-6 text-lg leading-relaxed" style={{ color: SMOKE }}>
              Nevizade Sk. No: 12<br />Beyoğlu, İstanbul
            </p>
            <a href="tel:+902122491974" className="ud-reveal mt-2 inline-block text-lg font-semibold transition-colors hover:text-white" style={{ color: FIRE }}>
              0212 249 19 74
            </a>
            <dl className="ud-reveal mt-8 max-w-sm">
              {HOURS.map((r) => (
                <div key={r.d} className="flex items-baseline justify-between border-t py-3" style={{ borderColor: HAIRLINE }}>
                  <dt className="font-semibold" style={{ color: SMOKE }}>{r.d}</dt>
                  <dd className="ud-display tracking-wider">{r.h}</dd>
                </div>
              ))}
            </dl>
            <div className="ud-reveal mt-9 flex flex-wrap gap-4">
              <Link to="/menu" className="ud-display rounded-[3px] px-8 py-4 text-lg tracking-wider transition-transform hover:-translate-y-0.5" style={{ background: FIRE, color: INK }}>
                Gel al siparişi ver
              </Link>
              <a
                href="https://maps.google.com/?q=Nevizade+Sokak+Beyoglu+Istanbul"
                target="_blank"
                rel="noopener noreferrer"
                className="ud-display rounded-[3px] border px-8 py-4 text-lg tracking-wider transition-colors hover:bg-white/5"
                style={{ borderColor: HAIRLINE, color: BONE }}
              >
                Yol tarifi al
              </a>
            </div>
          </div>
          <img
            src={IMG.geceTezgah}
            alt="Gece yarısı Beyoğlu, tezgahın ışığına toplanan müşteriler"
            loading="lazy"
            className="ud-reveal aspect-[4/5] w-full self-center object-cover"
            style={{ border: `1px solid ${HAIRLINE}` }}
          />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{ background: INK_DEEP, borderTop: `1px solid ${HAIRLINE}` }} className="pb-10 pt-12">
        <div className="overflow-hidden" aria-hidden="true">
          <p className="ud-display whitespace-nowrap leading-none" style={{ fontSize: 'clamp(5rem, 17vw, 13rem)', color: 'rgba(255,90,28,0.14)' }}>
            USTA DÖNER USTA DÖNER
          </p>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
          <p className="text-sm" style={{ color: 'rgba(244,237,227,0.5)' }}>
            © {new Date().getFullYear()} Usta Döner · Beyoğlu, İstanbul
          </p>
          <div className="flex items-center gap-6 text-sm font-semibold" style={{ color: SMOKE }}>
            <Link to="/menu" className="transition-colors hover:text-white">Menü</Link>
            <a href="tel:+902122491974" className="transition-colors hover:text-white">0212 249 19 74</a>
            <Link to="/panel" className="transition-colors hover:text-white" style={{ color: 'rgba(244,237,227,0.45)' }}>İşletme girişi</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
