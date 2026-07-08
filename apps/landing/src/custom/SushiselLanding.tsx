import { useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────
// SUSHISEL — premium elle kodlanmış tenant landing'i (customLanding: "sushisel").
//
// Design read: İstanbul sushi teslimatı, Japon minimalizmi. SAF BEYAZ gövde +
// sumi mürekkep siyahı + tek VERMİLYON (#E23D28) mühür vurgusu. Bol beyaz alan,
// ince hairline çizgiler, dikey ritim, kanji mühür detayı (鮨).
// Tip: Marcellus (zarif Latin display serif) + Zen Kaku Gothic New (hafif
// Japon groteski; kanji karakterleri de bu aileden çizilir).
//
// Motion: saf CSS (framer YOK). Hero yükte keyframe ('both' fill); scroll
// bölümleri animation-timeline: view() ile SADECE translateY kayması (opacity
// gate yok; içerik her koşulda görünür). prefers-reduced-motion desteklenir.
// ─────────────────────────────────────────────────────────────────────

const INK = '#1b1b20'
const INK_SOFT = 'rgba(27,27,32,0.64)'
const HAIR = 'rgba(27,27,32,0.16)'
const VERMILION = '#E23D28'

const IMG = {
  hero: 'https://images.unsplash.com/photo-1615361200141-f45040f367be?w=1200&q=80',
  sashimi: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=900&q=80',
  nigiri: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=900&q=80',
  maki: 'https://images.unsplash.com/photo-1564489563601-c53cfc451e93?w=900&q=80',
  slate: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=1200&q=80',
  counter: 'https://images.unsplash.com/photo-1621871908119-295c8ce5cee4?w=900&q=80',
  boat: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80',
}

const SETS = [
  {
    name: 'Sashimi Seti',
    jp: '刺身',
    desc: 'Günün balığından on sekiz dilim: ton, somon ve halden o sabah ne geldiyse. Turp, shiso, taze wasabi.',
    price: '₺1.650',
    photo: IMG.sashimi,
    alt: 'Taş kasede günün sashimisi: ton, somon, karides ve salatalık',
    aspect: 'aspect-[3/4]',
    shift: '',
  },
  {
    name: 'Nigiri Seti',
    jp: '握り',
    desc: 'On iki parça nigiri. Pirinç vücut sıcaklığında, balık soğuk. İkisi elinizde aynı anda buluşur.',
    price: '₺1.250',
    photo: IMG.nigiri,
    alt: 'Siyah taş tabakta on iki parça nigiri seçkisi, yanında çubuklar',
    aspect: 'aspect-square',
    shift: 'md:translate-y-14',
  },
  {
    name: 'Maki Seti',
    jp: '巻き',
    desc: 'Yirmi dört dilim: somon avokado, ton kabuğu çıtırı, salatalıklı hosomaki. Paylaşmak için kesilmiştir.',
    price: '₺950',
    photo: IMG.maki,
    alt: 'Ahşap tablada somonlu ve avokadolu maki dilimleri, soya kasesiyle',
    aspect: 'aspect-[3/4]',
    shift: '',
  },
]

const STEPS = [
  {
    no: '一',
    title: '04.30, balık hali',
    body: 'Gün ağarmadan Kadıköy balık halindeyiz. Menü sabit değildir; o gün denizden ne çıktıysa liste onunla kurulur.',
  },
  {
    no: '二',
    title: 'Üç ölçü',
    body: 'Parlak göz, kırmızı solungaç, diri et. Üç ölçünün birinden geçemeyen balık tezgahımıza giremez.',
  },
  {
    no: '三',
    title: 'Son dakika kesimi',
    body: 'Balık siparişiniz düşünce kesilir, önce değil. Kutu 4 derecede yola çıkar, kapınıza 45 dakikada ulaşır.',
  },
]

const ZONES_ANADOLU = ['Kadıköy', 'Moda', 'Fenerbahçe', 'Caddebostan', 'Suadiye', 'Bostancı']
const ZONES_AVRUPA = ['Beşiktaş', 'Nişantaşı', 'Etiler', 'Levent']

const HOURS = [
  { d: 'Salı, Çarşamba, Perşembe', h: '12.00, 22.00' },
  { d: 'Cuma, Cumartesi', h: '12.00, 23.00' },
  { d: 'Pazar', h: '13.00, 22.00' },
  { d: 'Pazartesi', h: 'Kapalı' },
]

const MARQUEE = [
  'マグロ · ton',
  'サーモン · somon',
  '海老 · karides',
  'ハマチ · sarıkuyruk',
  'イカ · kalamar',
  'ウニ · deniz kestanesi',
]

export const SushiselLanding = () => {
  useEffect(() => {
    document.title = 'Sushisel · İstanbul sushi teslimatı'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        'Sushisel: her sabah balık halinden seçilen balıkla nigiri, sashimi ve maki. Kadıköy merkezli, İstanbul içi soğuk zincir teslimat. Online sipariş verin.'
      )
  }, [])

  return (
    <main className="ssl" style={{ background: '#ffffff', color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .ssl { font-family: 'Zen Kaku Gothic New', system-ui, sans-serif; }
        .ssl-display { font-family: 'Marcellus', 'Zen Kaku Gothic New', serif; font-weight: 400; }

        /* Hero girişi (yükte, JS'siz) */
        @keyframes ssl-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        @keyframes ssl-seal { from { opacity: 0; transform: scale(0.6) rotate(-14deg); } to { opacity: 1; transform: scale(1) rotate(-6deg); } }
        .ssl-rise   { animation: ssl-rise 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .ssl-rise-1 { animation-delay: 0.1s; } .ssl-rise-2 { animation-delay: 0.2s; }
        .ssl-rise-3 { animation-delay: 0.3s; } .ssl-rise-4 { animation-delay: 0.42s; }
        .ssl-seal   { animation: ssl-seal 0.55s 0.7s cubic-bezier(0.16,1,0.3,1) both; }

        /* Scroll reveal: İÇERİK HER ZAMAN GÖRÜNÜR (opacity gate YOK), sadece hafif kayma */
        @keyframes ssl-drift { from { transform: translateY(26px); } to { transform: none; } }
        @supports (animation-timeline: view()) {
          .ssl-reveal { animation: ssl-drift linear both; animation-timeline: view(); animation-range: entry 5% entry 90%; }
        }

        /* Marquee */
        .ssl-marquee { display: flex; overflow: hidden; user-select: none; }
        .ssl-marquee > div { display: flex; flex-shrink: 0; align-items: baseline; animation: ssl-scroll 34s linear infinite; }
        @keyframes ssl-scroll { to { transform: translateX(-100%); } }

        .ssl-card img { transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        .ssl-card:hover img { transform: scale(1.03); }

        .ssl-vertical { writing-mode: vertical-rl; letter-spacing: 0.4em; }

        @media (prefers-reduced-motion: reduce) {
          .ssl-marquee > div { animation: none; }
          .ssl-rise, .ssl-seal, .ssl-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
          .ssl-card img { transition: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95" style={{ borderBottom: `1px solid ${HAIR}` }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center text-lg font-bold text-white" style={{ background: VERMILION }}>鮨</span>
            <span className="ssl-display text-xl tracking-[0.22em]">SUSHISEL</span>
          </a>
          <nav className="hidden items-center gap-8 text-[15px] font-medium md:flex" style={{ color: INK_SOFT }}>
            <a href="#setler" className="transition-colors hover:text-black">Setler</a>
            <a href="#tazelik" className="transition-colors hover:text-black">Tazelik</a>
            <a href="#teslimat" className="transition-colors hover:text-black">Teslimat</a>
          </nav>
          <Link to="/menu" className="px-6 py-2.5 text-[15px] font-bold text-white transition-opacity hover:opacity-85" style={{ background: VERMILION }}>
            Sipariş ver
          </Link>
        </div>
      </header>

      {/* ── Hero: asimetrik, bol beyaz alan ─────────────────────────── */}
      <section id="top" className="relative overflow-hidden bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:gap-6 md:pb-28 md:pt-24">
          <div className="relative md:pr-10">
            <p className="ssl-rise text-sm font-medium tracking-[0.3em]" style={{ color: VERMILION }}>
              毎朝新鮮 · HER SABAH TAZE
            </p>
            <h1 className="ssl-display ssl-rise ssl-rise-1 mt-6" style={{ fontSize: 'clamp(2.7rem, 6.5vw, 4.6rem)', lineHeight: 1.08, textWrap: 'balance' }}>
              Sessiz bir ustalık, kapınıza gelir.
            </h1>
            <p className="ssl-rise ssl-rise-2 mt-7 max-w-md text-lg leading-relaxed" style={{ color: INK_SOFT }}>
              Her sabah balık halinden seçilen balık, gün içinde nigiriye, sashimiye ve makiye dönüşür. Akşam, soğuk zincirle İstanbul sofralarına dağılır.
            </p>
            <div className="ssl-rise ssl-rise-3 mt-10 flex flex-wrap items-center gap-5">
              <Link to="/menu" className="px-9 py-4 text-base font-bold text-white transition-opacity hover:opacity-85" style={{ background: INK }}>
                Sipariş ver
              </Link>
              <a href="#setler" className="border-b pb-1 text-base font-medium transition-colors hover:text-black" style={{ borderColor: INK, color: INK_SOFT }}>
                Setleri incele
              </a>
            </div>
            <p className="ssl-rise ssl-rise-4 mt-12 border-t pt-5 text-sm leading-relaxed" style={{ borderColor: HAIR, color: INK_SOFT }}>
              Kadıköy mutfağından çıkar, 45 dakika içinde kapınızdadır. Pazartesi hal kapalıdır; biz de kapalıyız.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <span className="ssl-vertical ssl-rise ssl-rise-2 absolute -left-10 top-4 hidden text-xs font-medium lg:block" style={{ color: INK_SOFT }}>
              鮨は静けさの味
            </span>
            <img
              src={IMG.hero}
              alt="Karides nigiri çubukların ucunda; pirinç henüz ılık, balık soğuk"
              className="ssl-rise ssl-rise-1 aspect-[3/4] w-full object-cover md:ml-auto md:w-[88%]"
              loading="eager"
            />
            <div
              className="ssl-seal absolute -bottom-6 left-2 grid h-20 w-20 place-items-center text-4xl font-bold text-white shadow-lg md:-left-6"
              style={{ background: VERMILION }}
              aria-hidden="true"
            >
              鮨
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee: günün tezgahı ──────────────────────────────────── */}
      <div className="ssl-marquee py-3.5" style={{ borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}` }} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="gap-10 pr-10 text-sm font-medium tracking-[0.14em]" style={{ color: INK_SOFT }}>
            {MARQUEE.map((t) => (
              <span key={t} className="flex items-baseline gap-10 whitespace-nowrap">
                {t} <span style={{ color: VERMILION }}>・</span>
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ── İmza setler ─────────────────────────────────────────────── */}
      <section id="setler" className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="ssl-reveal grid items-end gap-6 md:grid-cols-[auto_1fr]">
            <h2 className="ssl-display" style={{ fontSize: 'clamp(2rem, 4.6vw, 3.2rem)', textWrap: 'balance' }}>
              İmza setler
            </h2>
            <p className="max-w-sm text-[15px] leading-relaxed md:justify-self-end md:text-right" style={{ color: INK_SOFT }}>
              Üç set, tek ölçü: o sabah halden ne geldiyse. Fiyatlar günün balığına göre kurulur, set düzeni değişmez.
            </p>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
            {SETS.map((s) => (
              <article key={s.name} className={`ssl-card ssl-reveal ${s.shift}`}>
                <div className="overflow-hidden">
                  <img src={s.photo} alt={s.alt} loading="lazy" className={`${s.aspect} w-full object-cover`} />
                </div>
                <div className="mt-6 flex items-baseline justify-between gap-4">
                  <h3 className="ssl-display text-2xl">{s.name}</h3>
                  <span className="text-xl" style={{ color: VERMILION }}>{s.jp}</span>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: INK_SOFT }}>{s.desc}</p>
                <p className="mt-5 border-t pt-4 text-lg font-bold" style={{ borderColor: HAIR, color: VERMILION }}>{s.price}</p>
              </article>
            ))}
          </div>

          <div className="mt-20 text-center">
            <Link to="/menu" className="inline-block px-10 py-4 text-base font-bold text-white transition-opacity hover:opacity-85" style={{ background: INK }}>
              Tüm menüyü gör
            </Link>
          </div>
        </div>
      </section>

      {/* ── Tazelik felsefesi: sumi mürekkep bölümü ─────────────────── */}
      <section id="tazelik" className="py-24 text-white md:py-32" style={{ background: INK }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-14 md:grid-cols-[0.9fr_1.1fr] md:gap-20">
            <div>
              <p className="ssl-reveal text-sm font-medium tracking-[0.3em]" style={{ color: VERMILION }}>
                鮮度 · TAZELİK FELSEFESİ
              </p>
              <h2 className="ssl-display ssl-reveal mt-6" style={{ fontSize: 'clamp(2rem, 4.6vw, 3.2rem)', textWrap: 'balance' }}>
                Menüyü biz yazmayız. Deniz yazar.
              </h2>
              <p className="ssl-reveal mt-6 max-w-md text-lg leading-relaxed text-white/65">
                Dondurulmuş stok tutmayız, dünkü balığı bugüne taşımayız. Bu yüzden bazı akşamlar bir set erken biter. Özür yerine sebebini söyleriz: o balıktan o gün o kadar vardı.
              </p>
              <img
                src={IMG.slate}
                alt="Siyah kayrak üstünde somon nigiri ve susamlı uramaki, yanında soya"
                loading="lazy"
                className="ssl-reveal mt-12 aspect-[4/3] w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-center">
              {STEPS.map((s) => (
                <div key={s.title} className="ssl-reveal border-t border-white/15 py-9 first:border-t-0 first:pt-0 last:pb-0">
                  <div className="flex items-baseline gap-5">
                    <span className="text-3xl" style={{ color: VERMILION }}>{s.no}</span>
                    <h3 className="ssl-display text-2xl">{s.title}</h3>
                  </div>
                  <p className="mt-4 max-w-md pl-12 leading-relaxed text-white/65">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tezgah: craft / mekan ───────────────────────────────────── */}
      <section className="bg-white py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:gap-16">
          <img
            src={IMG.counter}
            alt="Sushisel tezgahında çay demliği ve günün ikramı, arkada taş bahçe"
            loading="lazy"
            className="ssl-reveal aspect-[3/4] w-full object-cover md:w-[85%]"
          />
          <div className="relative md:pl-6">
            <span className="ssl-vertical absolute -right-2 top-0 hidden text-xs font-medium lg:block" style={{ color: INK_SOFT }}>
              包丁は一方向に
            </span>
            <h2 className="ssl-display ssl-reveal" style={{ fontSize: 'clamp(2rem, 4.6vw, 3.2rem)', textWrap: 'balance' }}>
              Bıçak tek yönde çekilir.
            </h2>
            <p className="ssl-reveal mt-6 max-w-lg text-lg leading-relaxed" style={{ color: INK_SOFT }}>
              Balık ezilmez, kesilir. Yanagiba bıçağı tek yönde çekilir; dilimin yüzeyi cam gibi kalır, tat dilinize öyle ulaşır. Pirinç vücut sıcaklığında servis edilir, wasabi balığın altına ustanın elinden sürülür.
            </p>
            <p className="ssl-reveal mt-5 max-w-lg text-lg leading-relaxed" style={{ color: INK_SOFT }}>
              Kutularımız da aynı sessizlikle hazırlanır: her dilim tek sıra dizilir, üst üste konmaz. Kapağı açtığınızda tezgahın karşısında oturuyormuş gibi olursunuz.
            </p>
            <p className="ssl-reveal mt-9 flex items-center gap-4 text-sm font-medium tracking-[0.2em]" style={{ color: INK_SOFT }}>
              <span className="grid h-10 w-10 place-items-center text-xl font-bold text-white" style={{ background: VERMILION }}>鮨</span>
              SUSHISEL KADIKÖY, 2019'DAN BERİ
            </p>
          </div>
        </div>
      </section>

      {/* ── Teslimat bölgeleri + saatler ────────────────────────────── */}
      <section id="teslimat" className="py-24 md:py-32" style={{ background: '#fafafa', borderTop: `1px solid ${HAIR}` }}>
        <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 md:grid-cols-2 md:gap-20">
          <div>
            <p className="ssl-reveal text-sm font-medium tracking-[0.3em]" style={{ color: VERMILION }}>
              配達 · TESLİMAT
            </p>
            <h2 className="ssl-display ssl-reveal mt-6" style={{ fontSize: 'clamp(2rem, 4.6vw, 3.2rem)', textWrap: 'balance' }}>
              Soğuk zincir, sıcak karşılama.
            </h2>
            <div className="ssl-reveal mt-10 grid grid-cols-2 gap-10">
              <div>
                <h3 className="text-sm font-bold tracking-[0.2em]" style={{ color: INK_SOFT }}>ANADOLU YAKASI</h3>
                <ul className="mt-4 space-y-2.5 text-[16px]">
                  {ZONES_ANADOLU.map((z) => (
                    <li key={z} className="flex items-baseline gap-3">
                      <span style={{ color: VERMILION }}>・</span>{z}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-[0.2em]" style={{ color: INK_SOFT }}>AVRUPA YAKASI</h3>
                <ul className="mt-4 space-y-2.5 text-[16px]">
                  {ZONES_AVRUPA.map((z) => (
                    <li key={z} className="flex items-baseline gap-3">
                      <span style={{ color: VERMILION }}>・</span>{z}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm leading-relaxed" style={{ color: INK_SOFT }}>
                  Avrupa yakasına akşam siparişleri 19.00'a kadar alınır.
                </p>
              </div>
            </div>
            <img
              src={IMG.boat}
              alt="Teslimat teknesi: kırk parçalık paylaşım seti, nigiri ve maki bir arada"
              loading="lazy"
              className="ssl-reveal mt-12 aspect-[16/9] w-full object-cover"
            />
          </div>

          <div className="md:pt-24">
            <dl className="ssl-reveal">
              {HOURS.map((r) => (
                <div key={r.d} className="flex items-baseline justify-between gap-6 border-t py-4" style={{ borderColor: HAIR }}>
                  <dt className="font-medium">{r.d}</dt>
                  <dd className="ssl-display whitespace-nowrap" style={r.h === 'Kapalı' ? { color: VERMILION } : undefined}>{r.h}</dd>
                </div>
              ))}
            </dl>
            <address className="ssl-reveal mt-10 border-t pt-6 not-italic leading-relaxed" style={{ borderColor: HAIR, color: INK_SOFT }}>
              Caferağa Mah. Moda Cad. No: 104/A<br />
              Kadıköy, İstanbul<br />
              <a href="tel:+902163480104" className="mt-2 inline-block font-bold" style={{ color: INK }}>0216 348 01 04</a>
            </address>
            <div className="ssl-reveal mt-10 flex flex-wrap gap-4">
              <Link to="/menu" className="px-9 py-4 text-base font-bold text-white transition-opacity hover:opacity-85" style={{ background: VERMILION }}>
                Sipariş ver
              </Link>
              <a
                href="https://maps.google.com/?q=Moda+Caddesi+104+Kadıköy+İstanbul"
                target="_blank"
                rel="noopener noreferrer"
                className="border px-9 py-4 text-base font-medium transition-colors hover:bg-black/5"
                style={{ borderColor: INK, color: INK }}
              >
                Yol tarifi al
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-white pb-10 pt-16" style={{ borderTop: `1px solid ${HAIR}` }}>
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <span className="mx-auto grid h-14 w-14 place-items-center text-2xl font-bold text-white" style={{ background: VERMILION, transform: 'rotate(-6deg)' }} aria-hidden="true">
            鮨
          </span>
          <p className="ssl-display mt-6 text-xl tracking-[0.28em]">SUSHISEL</p>
          <p className="mt-3 text-sm" style={{ color: INK_SOFT }}>
            © {new Date().getFullYear()} Sushisel · Kadıköy, İstanbul
          </p>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm font-medium">
            <Link to="/menu" className="transition-colors hover:text-black" style={{ color: INK_SOFT }}>Menü</Link>
            <a href="https://instagram.com/sushisel" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-black" style={{ color: INK_SOFT }}>Instagram</a>
            <Link to="/panel" className="transition-colors hover:text-black" style={{ color: INK_SOFT }}>İşletme girişi</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
