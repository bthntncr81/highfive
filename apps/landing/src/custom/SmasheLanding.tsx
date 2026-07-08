import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SMASHE_DEFAULTS, mergeSmashe, type SmasheContent } from './smasheContent'

// ─────────────────────────────────────────────────────────────────────
// SMASHÉ — premium elle kodlanmış tenant landing'i (customLanding: "smashe").
//
// Design read (impeccable brand register + taste): İstanbul smash burgerci,
// retro-piknik dili. COMMITTED NAVY + beyaz + pöti kare (gingham) imza dokusu.
// Tip: Alfa Slab One (Americana tabela slab'ı) + Archivo (grotesk gövde).
//
// İçerik: SMASHE_DEFAULTS + tenant'ın 'smasheContent' ayarı (varsa) üstüne biner;
// /smashe-admin editörü bu ayarı yazar. Motion: saf CSS (framer YOK) — hero yükte,
// scroll bölümleri animation-timeline: view() ile SADECE hafif kayma (opacity
// gate yok; içerik her koşulda görünür).
// ─────────────────────────────────────────────────────────────────────

const NAVY = '#1747D1' // smashè royal mavi (gerçek marka)
const NAVY_DEEP = '#0E2E9E'
const API_BASE = (import.meta as any).env?.VITE_API_URL || ''

const TILTS = ['-1.2deg', '1.2deg', '-1.2deg']

const MATCHA = '#3E9B4F' // franchise vurgusu (poster'daki yeşil ok)

export const SmasheLanding = () => {
  const [c, setC] = useState<SmasheContent>(SMASHE_DEFAULTS)
  const [fr, setFr] = useState({ name: '', phone: '', email: '', city: '', message: '' })
  const [frState, setFrState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle')

  const submitFranchise = async (e: React.FormEvent) => {
    e.preventDefault()
    setFrState('busy')
    try {
      const r = await fetch(`${API_BASE}/api/franchise-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fr),
      })
      setFrState(r.ok ? 'ok' : 'err')
    } catch {
      setFrState('err')
    }
  }

  useEffect(() => {
    document.title = 'smashè club · smash burger & matcha'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        "smashè club, Kadıköy. Smash burger ve matcha odaklı yeni nesil burger club. Gel al ya da online sipariş ver."
      )
    // Tenant'ın düzenlenmiş içeriği (varsa) varsayılanların üstüne biner.
    fetch(`${API_BASE}/api/settings/smasheContent`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.smasheContent) setC(mergeSmashe(SMASHE_DEFAULTS, d.smasheContent)) })
      .catch(() => { /* varsayılan kopya kalır */ })
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
            repeating-linear-gradient(0deg,  rgba(23,71,209,0.20) 0 26px, transparent 26px 52px),
            repeating-linear-gradient(90deg, rgba(23,71,209,0.20) 0 26px, transparent 26px 52px);
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

        /* Scroll reveal — İÇERİK HER ZAMAN GÖRÜNÜR (opacity gate YOK); sadece hafif kayma. */
        @keyframes smx-in { from { transform: translateY(30px); } to { transform: none; } }
        @supports (animation-timeline: view()) {
          .smx-reveal { animation: smx-in linear both; animation-timeline: view(); animation-range: entry 5% entry 95%; }
        }

        /* Eğik menü kartı — hover'da düzelir + kalkar */
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
          <a href="#top" className="flex items-center">
            <img src="/smashe/logo-blue.png" alt="smashè club" className="h-11 w-auto" />
          </a>
          <nav className="hidden items-center gap-6 text-[15px] font-semibold md:flex">
            <Link to="/menu" className="hover:opacity-70">Menü</Link>
            <a href="#menu" className="hover:opacity-70">Lezzetler</a>
            <a href="#nasil" className="hover:opacity-70">Nasıl smash'lenir</a>
            <a href="#franchise" className="hover:opacity-70">Franchise</a>
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
              {c.hero.chip}
            </p>
            <h1 className="smx-display smx-rise smx-rise-1 text-white" style={{ fontSize: 'clamp(2.9rem, 8vw, 5.5rem)', lineHeight: 1.02, textWrap: 'balance' }}>
              {c.hero.h1a}<br />{c.hero.h1b}
            </h1>
            <p className="smx-rise smx-rise-2 mt-6 max-w-md text-lg leading-relaxed text-white/80">
              {c.hero.p}
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
              src={c.hero.photo}
              alt="Akan cheddar'lı çift köfteli Smashé, brioche ekmek arasında"
              className="relative aspect-[4/5] w-full rounded-2xl border-[10px] border-white object-cover shadow-2xl"
              loading="eager"
            />
            <div className="smx-stkr smx-display absolute -left-6 -top-6 grid h-24 w-24 place-items-center rounded-full bg-white text-center text-sm leading-tight shadow-xl" style={{ color: NAVY }}>
              {c.hero.stickerA}<br />{c.hero.stickerB}
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────────── */}
      <div className="smx-marquee bg-white py-4" style={{ borderBottom: `3px solid ${NAVY}` }} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="smx-display gap-10 pr-10 text-xl" style={{ color: NAVY }}>
            {c.marquee.map((t) => (
              <span key={t} className="flex items-center gap-10 whitespace-nowrap">{t} <span className="text-2xl">✕</span></span>
            ))}
          </div>
        ))}
      </div>

      {/* ── Menü öne çıkanlar ───────────────────────────────────────── */}
      <section id="menu" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="smx-display smx-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
            {c.menu.title}
          </h2>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {c.menu.items.map((item, i) => (
              <article
                key={`${item.name}-${i}`}
                className={`smx-reveal smx-card ${i === 1 ? 'md:translate-y-8' : ''}`}
                style={{ rotate: TILTS[i % TILTS.length] }}
              >
                <div className="relative">
                  <img src={item.photo} alt={item.alt || item.name} loading="lazy" className="aspect-square w-full rounded-2xl object-cover" style={{ border: `4px solid ${NAVY}` }} />
                  <div className="smx-display absolute -right-3 -top-3 grid h-20 w-20 place-items-center rounded-full text-lg text-white shadow-lg" style={{ background: NAVY, rotate: '8deg' }}>
                    ₺{item.price}
                  </div>
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-3">
                  <h3 className="smx-display text-2xl">{item.name}</h3>
                  {item.tag && (
                    <span className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: NAVY_DEEP }}>{item.tag}</span>
                  )}
                </div>
                <p className="mt-2 leading-relaxed" style={{ color: 'rgba(20,40,90,0.78)' }}>{item.desc}</p>
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

      {/* ── Nasıl smash'lenir: gerçek 3 adım ───────────────────────── */}
      <section id="nasil" className="smx-gingham-dark py-20 text-white md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
            <h2 className="smx-display smx-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
              {c.steps.title}
            </h2>
            <p className="smx-reveal max-w-xs text-white/70 md:text-right">{c.steps.note}</p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {c.steps.items.map((s, i) => (
              <div key={`${s.title}-${i}`} className="smx-reveal border-t-2 border-white/25 pt-6">
                <div className="flex items-baseline gap-4">
                  <span className="smx-display text-6xl" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.9)', color: 'transparent' }}>{i + 1}</span>
                  <h3 className="smx-display text-2xl">{s.title}</h3>
                </div>
                <p className="mt-4 leading-relaxed text-white/75">{s.body}</p>
              </div>
            ))}
          </div>

          <img
            src={c.steps.photo}
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
              {c.picnic.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(20,40,90,0.82)' }}>{c.picnic.p1}</p>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: 'rgba(20,40,90,0.82)' }}>{c.picnic.p2}</p>
          </div>
          <img
            src={c.picnic.photo}
            alt="Çelik kupada çıtır patates, yanında klasik burger"
            loading="lazy"
            className="smx-reveal aspect-[4/3] w-full rounded-2xl border-[10px] border-white object-cover shadow-xl"
            style={{ rotate: '-2deg' }}
          />
        </div>
      </section>

      {/* ── Franchise: başvurular açıldı ────────────────────────────── */}
      <section id="franchise" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Poster çerçevesi: pöti kare bantlı kutu */}
          <div className="smx-reveal overflow-hidden rounded-3xl" style={{ border: `3px solid ${NAVY}` }}>
            <div className="smx-gingham h-5 w-full" aria-hidden="true" />
            <div className="grid gap-10 p-8 md:grid-cols-2 md:p-12">
              <div>
                <p className="smx-display text-lg" style={{ color: MATCHA }}>Başvurular açıldı</p>
                <h2 className="smx-display mt-1" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', textWrap: 'balance' }}>
                  smashè franchise
                </h2>
                <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(20,40,90,0.82)' }}>
                  <b>smashè</b>; smash burger ve matcha odaklı yeni nesil konsepti, güçlü marka
                  kimliği ve pratik operasyon yapısı sayesinde düşük yatırımla hızlı geri dönüş
                  fırsatı sunan modern bir <b>Burger Club</b> modelidir.
                </p>
                <ul className="mt-6 space-y-2.5 text-[15px] font-semibold">
                  {['Güçlü marka kimliği, hazır tasarım dünyası', 'Kompakt menü, pratik mutfak operasyonu', 'Düşük yatırım, hızlı geri dönüş', 'POS + sipariş sitesi + mobil altyapı hazır'].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span style={{ color: MATCHA }}>➜</span> {t}
                    </li>
                  ))}
                </ul>
              </div>

              {frState === 'ok' ? (
                <div className="grid place-items-center rounded-2xl p-8 text-center" style={{ background: 'rgba(62,155,79,0.08)', border: `2px dashed ${MATCHA}` }}>
                  <div>
                    <div className="text-5xl">🤝</div>
                    <h3 className="smx-display mt-4 text-2xl">Başvurun alındı!</h3>
                    <p className="mt-2 text-[15px]" style={{ color: 'rgba(20,40,90,0.82)' }}>
                      Ekibimiz en kısa sürede seninle iletişime geçecek.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitFranchise} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input required placeholder="Ad Soyad" value={fr.name} onChange={(e) => setFr({ ...fr, name: e.target.value })} className="w-full rounded-xl border-2 px-4 py-3 text-[15px] outline-none" style={{ borderColor: 'rgba(23,71,209,0.25)' }} />
                    <input required placeholder="Telefon" value={fr.phone} onChange={(e) => setFr({ ...fr, phone: e.target.value })} className="w-full rounded-xl border-2 px-4 py-3 text-[15px] outline-none" style={{ borderColor: 'rgba(23,71,209,0.25)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="email" placeholder="E-posta" value={fr.email} onChange={(e) => setFr({ ...fr, email: e.target.value })} className="w-full rounded-xl border-2 px-4 py-3 text-[15px] outline-none" style={{ borderColor: 'rgba(23,71,209,0.25)' }} />
                    <input required placeholder="Şehir" value={fr.city} onChange={(e) => setFr({ ...fr, city: e.target.value })} className="w-full rounded-xl border-2 px-4 py-3 text-[15px] outline-none" style={{ borderColor: 'rgba(23,71,209,0.25)' }} />
                  </div>
                  <textarea rows={4} placeholder="Kısaca kendinden ve düşündüğün lokasyondan bahset" value={fr.message} onChange={(e) => setFr({ ...fr, message: e.target.value })} className="w-full rounded-xl border-2 px-4 py-3 text-[15px] outline-none" style={{ borderColor: 'rgba(23,71,209,0.25)' }} />
                  {frState === 'err' && <p className="text-sm font-semibold text-red-600">Gönderilemedi, lütfen tekrar dene.</p>}
                  <button type="submit" disabled={frState === 'busy'} className="w-full rounded-full py-4 text-base font-extrabold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60" style={{ background: NAVY }}>
                    {frState === 'busy' ? 'Gönderiliyor…' : 'Franchise başvurusu yap ➜'}
                  </button>
                </form>
              )}
            </div>
            <div className="smx-gingham h-5 w-full" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ── Konum & saatler ─────────────────────────────────────────── */}
      <section id="konum" className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="smx-display smx-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>{c.konum.title}</h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(20,40,90,0.82)' }}>
              {c.konum.addr1}<br />{c.konum.addr2}
            </p>
            <dl className="mt-8 max-w-sm">
              {c.konum.hours.map((r, i) => (
                <div key={`${r.d}-${i}`} className="flex items-baseline justify-between border-t py-3" style={{ borderColor: 'rgba(23,71,209,0.25)' }}>
                  <dt className="font-semibold">{r.d}</dt>
                  <dd className="smx-display">{r.h}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/menu" className="rounded-full px-8 py-4 text-base font-extrabold text-white transition-transform hover:-translate-y-0.5" style={{ background: NAVY }}>
                Gel al siparişi ver
              </Link>
              <a href={c.konum.mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border-2 px-8 py-4 text-base font-bold transition-colors hover:bg-black/5" style={{ borderColor: NAVY, color: NAVY }}>
                Yol tarifi al
              </a>
            </div>
          </div>
          <img
            src={c.konum.photo}
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
              {Array.from({ length: 6 }, (_, j) => (<span key={j} className="whitespace-nowrap">smashè ·</span>))}
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
          <div className="flex items-center gap-3">
            <img src="/smashe/logo-white.png" alt="smashè club" className="h-9 w-auto opacity-90" />
            <p className="text-sm text-white/60">© {new Date().getFullYear()} · Kadıköy, İstanbul</p>
          </div>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link to="/menu" className="hover:text-white/70">Menü</Link>
            <a href={c.footer.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">Instagram</a>
            <Link to="/panel" className="text-white/50 hover:text-white/70">İşletme girişi</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
