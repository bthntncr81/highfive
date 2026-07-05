import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Plan } from '../lib/api';
import { PosMockup, KdsMockup, PhoneMockup, QrChip } from '../components/mockups';

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    api.plans().then((r) => setPlans(r.plans ?? [])).catch(() => setPlans([]));
  }, []);

  return (
    <>
      <Hero />
      <Tour />
      <Flow />
      <Gallery />
      <FeatureMenu />
      <WhatsappBand />
      <Pricing plans={plans} annual={annual} onToggle={() => setAnnual((a) => !a)} />
      <BrandedApp />
      <FinalCta />
    </>
  );
}

/* ============================== GERÇEK EKRAN GALERİSİ ============================== */

const GALLERY: Array<{ img: string; url: string; title: string; desc: string; wide?: boolean }> = [
  {
    img: 'pos-reports', url: 'mehmet.otorder.com/reports', wide: true,
    title: 'Raporlar',
    desc: 'Günlük ciro, net kâr, ödeme dağılımı ve en çok satanlar; yapay zeka önerisiyle.',
  },
  {
    img: 'pos-campaigns', url: 'mehmet.otorder.com/campaigns', wide: true,
    title: 'Kampanyalar',
    desc: 'İndirim, hediye ürün, min. sepet kampanyaları; kullanım limitli ve takipli.',
  },
  {
    img: 'pos-loyalty', url: 'mehmet.otorder.com/loyalty',
    title: 'Sadakat programları',
    desc: 'Puan, damga kartı, doğum günü, davet: 12+ hazır program türü.',
  },
  {
    img: 'pos-wheel', url: 'mehmet.otorder.com/spin-wheel',
    title: 'Şans çarkı',
    desc: 'Dilimleri ve olasılıkları siz belirlersiniz; müşteri sipariş sonrası çevirir.',
  },
  {
    img: 'pos-stock', url: 'mehmet.otorder.com/stock',
    title: 'Stok takibi',
    desc: 'Ham madde bazlı düşüm; kritik seviyede uyarı, tedarikçi ve maliyet kaydı.',
  },
];

function Gallery() {
  return (
    <section className="border-t border-line bg-wash py-20 lg:py-28">
      <div className="container-x">
        <h2 className="reveal max-w-[24ch] text-[clamp(1.75rem,3.5vw,2.6rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
          Panelin tamamı: bunlar maket değil, üründen alınmış ekranlar.
        </h2>
        <div className="mt-12 grid gap-8 lg:grid-cols-6">
          {GALLERY.map((g) => (
            <figure key={g.img} className={`reveal ${g.wide ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
              <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_60px_-24px_oklch(0.2_0.01_29/0.25)]">
                <div className="flex items-center gap-2 border-b border-line bg-white px-3.5 py-2">
                  <span className="flex gap-1.5" aria-hidden="true">
                    <i className="h-2 w-2 rounded-full bg-line" />
                    <i className="h-2 w-2 rounded-full bg-line" />
                    <i className="h-2 w-2 rounded-full bg-line" />
                  </span>
                  <span className="ml-1 flex-1 truncate rounded bg-wash px-2.5 py-0.5 font-mono text-[9px] text-ink-muted ring-1 ring-line">
                    {g.url}
                  </span>
                </div>
                <img
                  src={`/media/${g.img}.jpg`}
                  width={1280}
                  height={800}
                  alt={`OtOrder ${g.title} ekranı`}
                  loading="lazy"
                  className="block w-full"
                />
              </div>
              <figcaption className="mt-3.5">
                <p className="font-bold text-ink">{g.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-ink-muted">{g.desc}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== MARKALI MOBİL UYGULAMA (KURUMSAL) ============================== */

function BrandedApp() {
  return (
    <section className="border-t border-line py-20 lg:py-24">
      <div className="container-x grid items-center gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <div className="reveal mx-auto w-full max-w-[250px]">
          <PhoneMockup />
        </div>
        <div className="reveal">
          <p className="font-mono text-[12px] font-semibold text-brand-700">Kurumsal paket</p>
          <h2 className="mt-2 text-[clamp(1.75rem,3.5vw,2.6rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
            Aynı sipariş deneyimi, kendi adınızla App Store ve Google Play'de.
          </h2>
          <p className="mt-4 max-w-measure leading-relaxed text-ink-soft">
            Kurumsal pakette sipariş siteniz, sizin adınızı, ikonunuzu ve renklerinizi taşıyan
            markalı bir mobil uygulamaya dönüşür. Yayınlamayı biz yürütürüz; puanlar,
            kampanyalar ve push bildirimleri uygulamada da aynı hesapla çalışır.
          </p>
          <ul className="mt-6 space-y-2.5">
            {['Kendi uygulama adınız ve ikonunuz', 'Push bildirimiyle kampanya duyurusu', 'Sadakat puanları ve çark uygulamada da geçerli'].map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[15px] text-ink-soft">
                <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true">
                  <path fill="currentColor" d="M6.5 12.2 2.3 8l1.4-1.4 2.8 2.8 5.8-5.8L13.7 5z" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
          <Link to="/signup?plan=ENTERPRISE" className="btn-primary mt-8">
            Kurumsal ile başla
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================== HERO ============================== */

function Hero() {
  return (
    <section className="overflow-hidden">
      <div className="container-x grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24">
        <div>
          <h1 className="text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-ink">
            Sipariş mutfağa <span className="text-brand-600">saniyesinde</span> düşer.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
            OtOrder, restoranınızın tamamını tek abonelikte toplar: POS, mutfak ekranı,
            size özel sipariş sitesi ve QR menü. Komisyon yok. Kurulum dakikalar sürer.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/signup" className="btn-primary text-base">Ücretsiz dene</Link>
            <a href="#fiyatlar" className="btn-ghost text-base">Planları gör</a>
          </div>
          <p className="mt-4 text-sm text-ink-muted">14 gün ücretsiz · kart gerekmez · dilediğinde iptal</p>
          <p className="mt-8 flex items-center gap-2.5 text-sm text-ink-soft">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
            High Five Pizza &amp; Makarna, Akçakoca: bu sistemle servis yapıyor.
          </p>
        </div>

        {/* Katmanlı ürün kompozisyonu */}
        <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none" aria-label="OtOrder ürün ekranları: POS, mutfak ekranı ve QR menü">
          <PosMockup className="float-in relative z-10 w-[88%]" />
          <KdsMockup className="float-in absolute -bottom-10 right-0 z-20 w-[64%] [--d:180ms]" />
          <QrChip className="float-in absolute -left-2 -bottom-6 z-30 [--d:340ms] max-sm:hidden" />
        </div>
      </div>
      <div className="h-10 lg:h-16" aria-hidden="true" />
    </section>
  );
}

/* ============================== ÜRÜN TURU ============================== */

const TOUR = [
  {
    title: 'Kasada: POS',
    body:
      'Masa haritası, adisyon, hesap bölme ve gün sonu tek ekranda. Garson siparişi girer, mutfak aynı saniye görür; kağıt adisyon ve mutfağa koşturma biter.',
    points: ['Masa & paket & gel-al akışları', 'Hesap bölme, ikram, indirim', 'Gün sonu raporu otomatik'],
    art: (c: string) => <PosMockup className={c} />,
  },
  {
    title: 'Mutfakta: KDS',
    body:
      'Her sipariş süresiyle birlikte mutfak ekranına düşer. Geciken sipariş kendini belli eder; şef "hazır" dediğinde garsonun ekranına bildirim gider.',
    points: ['Sipariş başına canlı süre', 'İstasyon bazlı görünüm', 'Hazır bildirimi garsona'],
    art: (c: string) => <KdsMockup className={c} />,
    dark: true,
  },
  {
    title: 'Müşteride: sipariş sitesi',
    body:
      'restoraniniz.otorder.com sizin markanızla açılır: menü, online ödeme, adres. Masadaki müşteri QR ile aynı menüden söyler. Komisyon yok, müşteri verisi sizde kalır.',
    points: ['Kendi alan adınız ve renkleriniz', 'QR menü ve masadan sipariş', 'Online ödeme (kendi iyzico hesabınız)'],
    art: (c: string) => <PhoneMockup className={`${c} max-w-[240px]`} />,
  },
];

function Tour() {
  return (
    <section className="border-t border-line bg-wash py-20 lg:py-28">
      <div className="container-x">
        <h2 className="reveal max-w-[22ch] text-[clamp(1.75rem,3.5vw,2.6rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
          Üç ekran, tek sistem: kasa, mutfak ve müşteri aynı anda aynı siparişi görür.
        </h2>
        <div className="mt-14 space-y-20 lg:space-y-24">
          {TOUR.map((t, i) => (
            <div
              key={t.title}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <div className="reveal">
                <h3 className="text-2xl font-bold tracking-[-0.01em] text-ink">{t.title}</h3>
                <p className="mt-3 max-w-measure leading-relaxed text-ink-soft">{t.body}</p>
                <ul className="mt-5 space-y-2.5">
                  {t.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[15px] text-ink-soft">
                      <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true">
                        <path fill="currentColor" d="M6.5 12.2 2.3 8l1.4-1.4 2.8 2.8 5.8-5.8L13.7 5z" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`reveal flex justify-center ${t.dark ? '' : ''}`}>
                {t.art('w-full max-w-[520px]')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== SİPARİŞ AKIŞI ============================== */

const FLOW = [
  { t: 'Müşteri söyler', d: 'QR menüden, sipariş sitesinden veya garsona' },
  { t: 'POS işler', d: 'Adisyon açılır, stok düşer' },
  { t: 'Mutfak görür', d: 'KDS ekranında süre işlemeye başlar' },
  { t: 'Servis çıkar', d: 'Garsona hazır bildirimi, kuryeye rota' },
];

function Flow() {
  return (
    <section className="border-t border-line py-20 lg:py-24">
      <div className="container-x">
        <h2 className="reveal text-[clamp(1.75rem,3.5vw,2.6rem)] font-bold tracking-[-0.02em] text-ink">
          Bir siparişin yolculuğu
        </h2>
        <p className="reveal mt-3 max-w-measure text-ink-soft">
          Sipariş nereden gelirse gelsin aynı hatta girer. Telefonla not almak, mutfağa bağırmak, kağıt kaybetmek yok.
        </p>
        <ol className="reveal mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((s, i) => (
            <li key={s.t} className="relative">
              {i < FLOW.length - 1 && (
                <svg
                  className="absolute left-[calc(100%_-_1.25rem)] top-4 hidden h-2 w-[calc(100%_-_2rem)] lg:block"
                  aria-hidden="true"
                >
                  <line x1="0" y1="4" x2="100%" y2="4" stroke="#f9a8a2" strokeWidth="2" className="flow-dash" />
                </svg>
              )}
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-mono text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-bold text-ink">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ============================== ÖZELLİK MENÜSÜ ============================== */

const FEATURES: Array<[string, string]> = [
  ['Sadakat programı', 'puan, kupon, çark ve başarımlarla müşteri geri gelir'],
  ['Kampanyalar', 'happy hour, paket menü, hedefli push bildirimi'],
  ['Stok takibi', 'ham madde bazlı düşüm, azalınca uyarı'],
  ['Kurye takibi', 'canlı konum, müşteriye teslimat durumu'],
  ['Raporlar', 'ciro, ürün, saat ve şube kırılımı'],
  ['Çoklu şube', 'tek panelden tüm lokasyonlar'],
  ['Yazıcı entegrasyonu', 'adisyon ve mutfak fişi otomatik yazar'],
  ['Personel & PIN', 'rol bazlı yetki, 4 haneli hızlı giriş'],
];

function FeatureMenu() {
  return (
    <section className="border-t border-line bg-wash py-20 lg:py-24">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="reveal">
          <h2 className="text-[clamp(1.75rem,3.5vw,2.6rem)] font-bold tracking-[-0.02em] text-ink">
            Menünün devamı
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Üç ana ekranın arkasında, işletmeyi büyüten araçlar hazır bekler. Hepsi
            aynı panelde, ayrı kurulum yok.
          </p>
        </div>
        <dl className="reveal space-y-4">
          {FEATURES.map(([name, desc]) => (
            <div key={name} className="flex items-baseline gap-2">
              <dt className="shrink-0 font-bold text-ink">{name}</dt>
              <span className="mx-1 flex-1 -translate-y-1 border-b-2 border-dotted border-line" aria-hidden="true" />
              <dd className="max-w-[52%] text-right text-sm leading-snug text-ink-muted">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ============================== WHATSAPP BANDI ============================== */

function WhatsappBand() {
  return (
    <section className="bg-brand-700 py-16 text-white lg:py-20">
      <div className="container-x grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="reveal">
          <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] font-bold tracking-[-0.02em]">
            WhatsApp'tan gelen sipariş de aynı mutfağa düşer.
          </h2>
          <p className="mt-4 max-w-measure leading-relaxed text-white/85">
            WhatsApp Sipariş Modülü ayrı bir üründür: müşteriniz mesajla söyler, sipariş
            otomatik POS'a ve mutfak ekranına işlenir. Pro pakete "Bağlan" düğmesiyle
            eklenir; ayrı menü girmek gerekmez.
          </p>
          <a
            href="https://order.highfivepps.com"
            className="btn mt-7 bg-white text-brand-800 hover:bg-brand-50"
          >
            WhatsApp modülünü incele
          </a>
        </div>
        <div className="reveal">
          {/* Mini sohbet vinyeti */}
          <div className="ml-auto max-w-[320px] space-y-2.5 rounded-2xl bg-brand-800/60 p-4 text-[13px]">
            <p className="w-fit max-w-[85%] rounded-xl rounded-bl-sm bg-white px-3 py-2 text-ink">
              2 sucuklu pizza, 1 ayran. Adres kayıtlı 🙏
            </p>
            <p className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-brand-600 px-3 py-2">
              Siparişiniz alındı! Tahmini teslimat 30 dk. Toplam ₺465
            </p>
            <p className="ml-auto flex w-fit items-center gap-1.5 rounded-lg bg-brand-900/60 px-2.5 py-1.5 font-mono text-[10px] text-brand-200">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-lichen" aria-hidden="true" />
              POS'a işlendi · #1043 mutfakta
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================== FİYATLAR (ADİSYON) ============================== */

function Pricing({ plans, annual, onToggle }: { plans: Plan[]; annual: boolean; onToggle: () => void }) {
  return (
    <section id="fiyatlar" className="border-t border-line py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="reveal">
            <h2 className="text-[clamp(1.75rem,3.5vw,2.6rem)] font-bold tracking-[-0.02em] text-ink">Hesap, net.</h2>
            <p className="mt-2 text-ink-soft">Komisyon yok, gizli kalem yok. Her pakette 14 gün ücretsiz deneme.</p>
          </div>
          <div className="reveal flex items-center gap-3 text-sm font-semibold">
            <span className={annual ? 'text-ink-muted' : 'text-ink'}>Aylık</span>
            <button
              onClick={onToggle}
              role="switch"
              aria-checked={annual}
              aria-label="Yıllık fiyatlandırmaya geç"
              className="relative h-7 w-12 rounded-full bg-brand-600 transition-colors"
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${annual ? 'left-6' : 'left-1'}`} />
            </button>
            <span className={annual ? 'text-ink' : 'text-ink-muted'}>
              Yıllık <span className="text-brand-600">(2 ay hediye)</span>
            </span>
          </div>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {plans.length === 0 && (
            <p className="col-span-3 text-center text-ink-muted">Planlar yükleniyor…</p>
          )}
          {plans.map((p, i) => (
            <PlanTicket key={p.key} plan={p} annual={annual} featured={i === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

const TICKET_LINES: Array<{ label: string; has: (p: Plan) => boolean | string }> = [
  { label: 'POS + Mutfak ekranı', has: () => true },
  { label: 'Sipariş sitesi + QR menü', has: () => true },
  { label: 'Şube', has: (p) => (p.maxLocations === -1 ? 'sınırsız' : String(p.maxLocations)) },
  { label: 'Kullanıcı', has: (p) => (p.maxUsers === -1 ? 'sınırsız' : String(p.maxUsers)) },
  { label: 'Sadakat + kampanyalar', has: (p) => !!p.features.loyalty },
  { label: 'Analitik raporlar', has: (p) => !!p.features.analytics },
  { label: 'WhatsApp modülü bağlama', has: (p) => !!p.features.whatsappLink },
  { label: 'Markalı mobil uygulama', has: (p) => !!p.features.brandedApp },
  { label: 'Özel tasarım landing', has: (p) => !!p.features.customLanding },
];

function PlanTicket({ plan, annual, featured }: { plan: Plan; annual: boolean; featured: boolean }) {
  const price = annual ? plan.annualPrice : plan.monthlyPrice;
  return (
    <article
      className={`ticket p-7 ${featured ? 'md:-translate-y-3 md:shadow-[0_28px_60px_-24px_rgb(187_30_16/0.30)]' : ''}`}
    >
      <header className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] text-ink-muted">otorder.com · adisyon</p>
          <h3 className="mt-1 text-xl font-extrabold tracking-[-0.01em] text-ink">{plan.name}</h3>
        </div>
        {featured && (
          <span className="rotate-6 rounded border-2 border-brand-600 px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-700">
            en çok tercih
          </span>
        )}
      </header>

      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="font-mono text-4xl font-semibold tracking-tight text-ink">
          {price === 0 ? '₺0' : `₺${price.toLocaleString('tr-TR')}`}
        </span>
        <span className="text-sm text-ink-muted">/{annual ? 'yıl' : 'ay'}</span>
      </p>

      <ul className="ticket-rule mt-5 space-y-2.5 pt-5 font-mono text-[13px]">
        {TICKET_LINES.map(({ label, has }) => {
          const v = has(plan);
          if (v === false)
            return (
              <li key={label} className="flex justify-between text-ink-muted/50">
                <span className="line-through decoration-1">{label}</span>
                <span aria-hidden="true">·</span>
              </li>
            );
          return (
            <li key={label} className="flex justify-between gap-3 text-ink-soft">
              <span>{label}</span>
              <span className="font-semibold text-brand-700">{typeof v === 'string' ? v : '✓'}</span>
            </li>
          );
        })}
      </ul>

      <div className="ticket-rule mt-5 pt-5">
        <Link
          to={`/signup?plan=${plan.key}`}
          className={`${featured ? 'btn-primary' : 'btn-ghost'} w-full`}
        >
          {plan.name} ile başla
        </Link>
        <p className="mt-3 text-center font-mono text-[10px] text-ink-muted">
          14 gün deneme · kart gerekmez · KDV dahil
        </p>
      </div>
    </article>
  );
}

/* ============================== FİNAL CTA ============================== */

function FinalCta() {
  return (
    <section className="border-t border-line bg-wash py-20 text-center lg:py-24">
      <div className="container-x">
        <h2 className="reveal mx-auto max-w-[24ch] text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-tight tracking-[-0.025em] text-ink">
          Bu akşamki servise yetişir.
        </h2>
        <p className="reveal mx-auto mt-4 max-w-[42ch] text-ink-soft">
          Kaydolun, menünüzü şablondan yükleyin, QR kodları basın: sipariş almaya başlayın.
        </p>
        <div className="reveal mt-8">
          <Link to="/signup" className="btn-primary text-base">Restoranımı oluştur</Link>
        </div>
      </div>
    </section>
  );
}
