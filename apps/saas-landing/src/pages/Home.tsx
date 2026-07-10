// OtOrder ana sayfa — onaylanan canlı prototipin (otorder-canli.html) React portu.
// Animasyon kuralları: framer-motion YOK; IO tabanlı reveal (2.5sn fallback),
// saf CSS keyframe'ler, journey için scroll listener. Tüm interval/timeout'lar
// useEffect cleanup'lı; prefers-reduced-motion'da döngüler başlatılmaz.
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, Plan } from '../lib/api';
import {
  IcPizza, IcPasta, IcDrink, IcDessert, IcCheese, IcMushroom, IcScooter, IcPin,
  IcStar, IcCart, IcHome, IcList, IcSearch, IcBell, IcRepeat, IcBolt, IcChip,
  IcMoon, IcVideo, IcPhone, IcMic, IcSmile, IcQr, IcGift,
} from '../components/icons';
import './home.css';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* IO tabanlı reveal: .rv elemanlarına girişte .in ekler; 2.5sn fallback timer
   ile her durumda görünür olur (prototipteki gibi). */
function useReveal(rootRef: React.RefObject<HTMLElement | null>, dep: unknown) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.rv'));
    els.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 70}ms`;
    });
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.18 },
    );
    els.forEach((el) => io.observe(el));
    const t = window.setTimeout(() => els.forEach((el) => el.classList.add('in')), 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [rootRef, dep]);
}

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [annual, setAnnual] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.plans().then((r) => setPlans(r.plans ?? [])).catch(() => setPlans([]));
  }, []);

  useReveal(rootRef, plans.length);

  return (
    <div className="otr" ref={rootRef}>
      <Hero />
      <Journey />
      <Bento />
      <WaDetail />
      <AppDetail />
      <Showcase />
      <Pricing plans={plans} annual={annual} onToggle={() => setAnnual((a) => !a)} />
      <FinalCta />
    </div>
  );
}

/* ============================== HERO (canlı sipariş simülasyonu) ============================== */

const MSGS = [
  'Az önce: Masa 4 sipariş verdi',
  'Az önce: WhatsApp AI paket sipariş aldı',
  'Az önce: QR menüden Masa 7 sipariş verdi',
  'Az önce: gel-al siparişi hazır',
];
const ITEMS: Array<[string, string, string]> = [
  ['#1043', 'Masa 4', '2× Karışık Pizza L'],
  ['#1044', 'Paket · WhatsApp AI', '1× Trüflü Mantar'],
  ['#1045', 'Masa 7', '1× Smashé Burger'],
  ['#1046', 'Gel-al', '2× Ayran · 1× Künefe'],
];

type PosTag = 'new' | 'prep' | 'ready';
const TAG_CLS: Record<PosTag, string> = { new: 't-new', prep: 't-prep', ready: 't-ready' };
const TAG_LABEL: Record<PosTag, string> = { new: 'YENİ', prep: 'HAZIRLANIYOR', ready: 'HAZIR' };

const MARQ = ['SİPARİŞ SİTESİ', 'POS', 'MUTFAK EKRANI', 'WHATSAPP AI', 'QR MENÜ', 'SADAKAT', 'MARKALI APP', 'KOMİSYON YOK'];

function Hero() {
  const [liveMsg, setLiveMsg] = useState(MSGS[0]);
  const [posRows, setPosRows] = useState<Array<{ id: string; who: string; tag: PosTag; anim?: boolean }>>([
    { id: '#1042', who: 'Paket · WhatsApp AI', tag: 'prep' },
    { id: '#1041', who: 'Gel-al', tag: 'ready' },
  ]);
  const [kdsRows, setKdsRows] = useState<Array<{ id: string; meta: string; what: string; anim?: boolean }>>([
    { id: '#1042', meta: '#1042 · 04:55', what: '1× Smashé Burger' },
  ]);
  const [fly, setFly] = useState<{ cls: '' | 'go1' | 'go2'; k: number }>({ cls: '', k: 0 });
  const [saat, setSaat] = useState(22 * 60 + 41);

  // canlı simülasyon döngüsü (prototipteki cycle() birebir zamanlamayla)
  useEffect(() => {
    if (reducedMotion()) return;
    let no = 0;
    const tos: number[] = [];
    const cycle = () => {
      const [id, who, what] = ITEMS[no % ITEMS.length];
      const n = no;
      setFly((s) => ({ cls: 'go1', k: s.k + 1 }));
      tos.push(
        window.setTimeout(() => {
          setPosRows((rows) => [{ id, who, tag: 'new' as const, anim: true }, ...rows].slice(0, 3));
        }, 2000),
      );
      tos.push(window.setTimeout(() => setFly((s) => ({ cls: 'go2', k: s.k + 1 })), 2300));
      tos.push(
        window.setTimeout(() => {
          setKdsRows((rows) => [{ id, meta: `${id} · YENİ`, what, anim: true }, ...rows].slice(0, 2));
          setLiveMsg(MSGS[n % MSGS.length]);
        }, 6300),
      );
      no++;
    };
    cycle();
    const iv = window.setInterval(cycle, 7500);
    return () => {
      window.clearInterval(iv);
      tos.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // mutfak ekranı saati
  useEffect(() => {
    if (reducedMotion()) return;
    const iv = window.setInterval(() => setSaat((s) => s + 1), 4000);
    return () => window.clearInterval(iv);
  }, []);

  const clock = `${Math.floor(saat / 60) % 24}:${String(saat % 60).padStart(2, '0')}`;

  return (
    <section id="hero">
      <div className="wrap">
        <div className="hero-grid">
          <div>
            <span className="chip">
              <span className="dot" /> <span>{liveMsg}</span>
            </span>
            <h1 style={{ marginTop: 24 }}>
              Sipariş mutfağa
              <br />
              <em>saniyesinde</em> düşer.
            </h1>
            <p className="lead">
              POS, mutfak ekranı, sipariş sitesi ve yapay zekâ WhatsApp asistanı tek abonelikte.
              Komisyon yok, kurulum dakikalar sürer.
            </p>
            <div className="cta-row">
              <Link to="/signup" className="obtn obtn-red">Restoranımı oluştur</Link>
              <a href="#journey" className="obtn obtn-ghost">Yolculuğu izle ↓</a>
            </div>
            <div className="fine">7 gün ücretsiz · kart gerekmez · dilediğinde iptal</div>
          </div>
          <div className="stage">
            <div className="panel p-site">
              <div className="head">
                <span className="ui-dots"><i /><i /><i /></span> highfivepps.com/menu
              </div>
              <div className="row">
                <span><IcPizza /> Karışık Pizza (L) ×2</span>
                <span>₺480</span>
              </div>
              <div className="row">
                <span><IcDrink /> Ayran ×1</span>
                <span>₺40</span>
              </div>
              <div className="row" style={{ background: 'rgba(217,43,28,.05)', borderColor: 'rgba(217,43,28,.35)' }}>
                <b>Siparişi ver</b>
                <span><b>₺520</b></span>
              </div>
            </div>
            <div className="panel p-pos">
              <div className="head">
                <span className="ui-dots"><i /><i /><i /></span> POS · Siparişler{' '}
                <span style={{ marginLeft: 'auto', color: 'var(--wa)' }}>● canlı</span>
              </div>
              <div>
                {posRows.map((r) => (
                  <div key={r.id} className="row" style={r.anim ? { animation: 'scenein .5s both' } : undefined}>
                    <span><b>{r.id}</b> · {r.who}</span>
                    <span className={`tag ${TAG_CLS[r.tag]}`}>{TAG_LABEL[r.tag]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel p-kds">
              <div className="head">
                <span className="ui-dots"><i /><i /><i /></span> MUTFAK EKRANI · <span>{clock}</span>
              </div>
              <div>
                {kdsRows.map((r) => (
                  <div key={r.meta} className="kds-row" style={r.anim ? { animation: 'scenein .5s both' } : undefined}>
                    <span className="mono">{r.meta}</span>
                    <div>{r.what}</div>
                  </div>
                ))}
              </div>
            </div>
            <div key={fly.k} className={`fly ${fly.cls}`}>
              <IcPizza style={{ width: 14, height: 14, color: '#fff', verticalAlign: '-2.5px' }} /> Yeni sipariş · ₺520
            </div>
          </div>
        </div>

        <div className="marquee">
          <div className="mtrack">
            {[0, 1].map((k) => (
              <span key={k}>
                {MARQ.map((m) => (
                  <Fragment key={m}>{m} <i>●</i></Fragment>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================== JOURNEY (340vh pinned scroll) ============================== */

const STATIONS = [
  { left: '0%', no: '01', title: 'Sipariş gelir', desc: "QR menü, sipariş sitesi ya da WhatsApp'ta yapay zekâ alır." },
  { left: '20%', no: '02', title: "POS'a düşer", desc: 'Masa, paket, gel-al. Kasada her şey tek ekranda.' },
  { left: '40%', no: '03', title: 'Mutfak görür', desc: 'Saniyesinde mutfak ekranında. Süre takibi otomatik.' },
  { left: '60%', no: '04', title: 'Yola çıkar', desc: 'Kurye paneli, müşteriye durum maili.' },
  { left: '80%', no: '05', title: 'Kasa kapanır', desc: 'Gün sonu raporu, analitik, sadakat puanı.' },
];

const SPOT_HEADS = ['SİPARİŞ SİTESİ', 'POS · SİPARİŞLER', 'MUTFAK EKRANI', 'KURYE', 'GÜN SONU'];

const SCENES: ReactNode[] = [
  <>
    <div className="row">
      <span><IcPizza /> Karışık Pizza (L) ×2</span>
      <span>₺480</span>
    </div>
    <div className="row" style={{ background: 'rgba(217,43,28,.05)' }}>
      <b>Siparişi ver</b>
      <b>₺520</b>
    </div>
  </>,
  <>
    <div className="row">
      <span><b>#1043</b> · Masa 4</span>
      <span className="tag t-new">YENİ</span>
    </div>
    <div className="row">
      <span><b>#1042</b> · Paket</span>
      <span className="tag t-prep">HAZIRLANIYOR</span>
    </div>
  </>,
  <>
    <div className="kdsb" style={{ margin: '10px 12px' }}>
      <span className="mono">#1043 · MASA 4 · 00:12</span>
      <div style={{ fontWeight: 600, marginTop: 3 }}>2× Karışık Pizza L · 1× Ayran</div>
    </div>
  </>,
  <>
    <div className="row">
      <span><IcScooter /> Kurye: Emre</span>
      <span className="tag t-prep">YOLDA</span>
    </div>
    <div className="row" style={{ fontSize: '11.5px', color: 'var(--ink-mute)' }}>
      Müşteriye "siparişin yolda" maili gitti ✓
    </div>
  </>,
  <>
    <div className="row">
      <span>Bugünkü ciro</span>
      <b style={{ color: 'var(--red)' }}>₺18.460</b>
    </div>
    <div className="row">
      <span>Sipariş sayısı</span>
      <b>84</b>
    </div>
  </>,
];

function Journey() {
  const secRef = useRef<HTMLElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = secRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / (total || 1)));
      if (fillRef.current) fillRef.current.style.width = `${p * 88}%`;
      setIdx(Math.min(4, Math.floor(p * 5)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section id="journey" ref={secRef}>
      <div className="sticky">
        <div className="wrap">
          <span className="kicker">Bir siparişin yolculuğu — scroll et</span>
          <h2>Müşteriden mutfağa, tek çizgide.</h2>
          <div className="rail">
            <div className="track" />
            <div className="fill" ref={fillRef} />
            {STATIONS.map((s, i) => (
              <div
                key={s.no}
                className={`station ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}`}
                style={{ left: s.left }}
              >
                <span className="no">{s.no}</span>
                <div className="pt" />
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
            <div className="spot">
              <div className="head">
                <span className="ui-dots"><i /><i /><i /></span> <span>{SPOT_HEADS[idx]}</span>
              </div>
              {SCENES.map((sc, i) => (
                <div key={i} className={`scene ${i === idx ? 'on' : ''}`}>{sc}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================== BENTO (Tek abonelik, dört ekran) ============================== */

const TABLES: Array<{ n: string; state?: 'full' | 'rdy'; sub: string }> = [
  { n: 'M1', state: 'full', sub: '₺640' }, { n: 'M2', sub: 'boş' }, { n: 'M3', state: 'rdy', sub: 'hazır' }, { n: 'M4', sub: 'boş' },
  { n: 'M5', sub: 'boş' }, { n: 'M6', state: 'full', sub: '₺210' }, { n: 'M7', sub: 'boş' }, { n: 'M8', state: 'rdy', sub: 'hazır' },
  { n: 'M9', state: 'full', sub: '₺1.230' }, { n: 'M10', sub: 'boş' }, { n: 'M11', sub: 'boş' }, { n: 'M12', state: 'full', sub: '₺95' },
];

function Bento() {
  const [ciro, setCiro] = useState(18460);

  useEffect(() => {
    if (reducedMotion()) return;
    const iv = window.setInterval(() => setCiro((c) => c + Math.floor(Math.random() * 180) + 40), 3000);
    return () => window.clearInterval(iv);
  }, []);

  return (
    <section id="bento">
      <div className="wrap">
        <span className="kicker rv">Modüller</span>
        <h2 className="rv">Tek abonelik, dört ekran.</h2>
        <div className="bgrid">
          <div className="b b-pos rv">
            <h5>POS · Salon yönetimi</h5>
            <div className="sub">Masalar, adisyon, kasa, personel PIN girişi</div>
            <div className="tblg">
              {TABLES.map((t) => (
                <div key={t.n} className={`tbl ${t.state ?? ''}`}>
                  <b>{t.n}</b>
                  {t.sub}
                </div>
              ))}
            </div>
            <div className="ciro">
              <span className="sub">Bugünkü ciro</span>
              <span className="mono">₺{ciro.toLocaleString('tr-TR')}</span>
            </div>
          </div>
          <div className="b rv">
            <h5>Mutfak ekranı</h5>
            <div className="sub">Sipariş anında düşer</div>
            <div className="kdsb">
              <span className="mono">#1043 · 00:12</span>
              <div style={{ fontWeight: 600 }}>2× Karışık Pizza L</div>
            </div>
            <div className="kdsb" style={{ borderLeftColor: 'var(--red)' }}>
              <span className="mono">#1044 · YENİ</span>
              <div style={{ fontWeight: 600 }}>1× Trüflü Mantar</div>
            </div>
          </div>
          <div className="b rv">
            <h5>
              WhatsApp AI<span className="aibadge">Pro AI</span>
            </h5>
            <div className="sub">Asistan konuşur, sipariş POS'a düşer</div>
            <div className="bub in">2 büyük karışık, 1 ayran. Adres kayıtlı olan.</div>
            <div className="bub ai">
              <span className="who">OTORDER AI</span>
              <br />
              Toplam 520 TL. Onaylıyor musun?
            </div>
            <span className="okl">● Sipariş #1042 POS ekranına düştü</span>
          </div>
          <div className="b rv">
            <h5>Sipariş sitesi + QR menü</h5>
            <div className="sub">Kendi domaininde, komisyonsuz</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 9 }}>
              <div style={{ flex: 1, height: 105, borderRadius: 12, border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-mute)', fontSize: 12, background: 'var(--band)' }}>
                20 menü şablonu
              </div>
              <div style={{ width: 90, height: 105, borderRadius: 12, border: '1.5px dashed rgba(21,23,28,.25)', display: 'grid', placeItems: 'center', color: 'rgba(21,23,28,.45)' }}>
                <IcQr style={{ width: 30, height: 30 }} />
              </div>
            </div>
          </div>
          <div className="b rv">
            <h5>Markalı mobil app</h5>
            <div className="sub">App Store + Google Play'de kendi adınla</div>
            <div className="phone">
              <div className="ph">
                <img src="/hf-logo-white.svg" alt="High Five" style={{ height: 15 }} />
              </div>
              <div className="pi" />
              <div className="pi" />
              <div className="pi" style={{ width: '70%' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================== WHATSAPP AI DETAY ============================== */

const CONVO: Array<{ who: 'mine' | 'theirs' | 'sys'; typing?: number; node: ReactNode }> = [
  { who: 'mine', node: <>2 büyük karışık, 1 ayran. Adres kayıtlı olan.</> },
  {
    who: 'theirs',
    typing: 1400,
    node: <>Hoş geldin Batuhan! 2× Karışık Pizza (L) + 1× Ayran = <b>520 TL</b>. Kayıtlı adres: Yalı Mah. Onaylıyor musun?</>,
  },
  { who: 'mine', node: <>Onaylıyorum</> },
  {
    who: 'theirs',
    typing: 1100,
    node: <>Siparişin alındı. <b>#1043</b> mutfağa iletildi. Tahmini teslimat: <b>35 dk</b>.</>,
  },
  { who: 'sys', node: <>● Sipariş #1043 POS ekranına düştü</> },
];

const WA_FEATS = [
  { Icon: IcChip, t: 'Menünü ezbere bilir', d: '"2 büyük karışık, biri az pişmiş" der müşteri; asistan ürünü, boyutu ve notu doğru anlar.' },
  { Icon: IcPin, t: 'Adresi ve alışkanlığı hatırlar', d: '"Her zamanki adrese" yeter. Kayıtlı müşteri tek mesajla sipariş verir.' },
  { Icon: IcBolt, t: "POS'a anında düşer", d: 'Onaylanan sipariş mutfak ekranında belirir; kasada ayrı giriş yok, hata yok.' },
  { Icon: IcMoon, t: '7/24 hattın açık', d: 'Kapalıyken bile sipariş toplar, açılış saatinde mutfağa iletir.' },
];

function WaDetail() {
  const [msgs, setMsgs] = useState<Array<{ who: string; node: ReactNode; tm?: string; k: number }>>([]);
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState('çevrimiçi');

  useEffect(() => {
    if (reducedMotion()) return;
    let ci = 0;
    let k = 0;
    let alive = true;
    const tos: number[] = [];
    const later = (fn: () => void, ms: number) => tos.push(window.setTimeout(fn, ms));
    const step = () => {
      if (!alive) return;
      if (ci >= CONVO.length) {
        later(() => {
          setMsgs([]);
          ci = 0;
          later(step, 900);
        }, 3800);
        return;
      }
      const m = CONVO[ci];
      const show = () => {
        if (!alive) return;
        setTyping(false);
        setStatus('çevrimiçi');
        const tm = m.who !== 'sys' ? `22:4${1 + ci} ✓✓` : undefined;
        const key = k++;
        setMsgs((list) => [...list, { who: m.who, node: m.node, tm, k: key }]);
        ci++;
        later(step, 1600);
      };
      if (m.typing) {
        setTyping(true);
        setStatus('yazıyor...');
        later(show, m.typing);
      } else show();
    };
    later(step, 1200);
    return () => {
      alive = false;
      tos.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <section id="wa">
      <div className="wrap">
        <div className="wa-grid">
          <div>
            <span className="kicker rv">WhatsApp AI · Pro AI paketi</span>
            <h2 className="rv">
              Müşterin yazar,
              <br />
              yapay zekâ satar.
            </h2>
            <p className="lead rv">
              Asistan menünü bilir, adresi hatırlar, fiyatı hesaplar. Sipariş onaylanır onaylanmaz
              POS ve mutfak ekranına düşer. Sen hiç dokunmazsın.
            </p>
            {WA_FEATS.map(({ Icon, t, d }) => (
              <div key={t} className="feat-li rv">
                <div className="ic"><Icon /></div>
                <div>
                  <h6>{t}</h6>
                  <p>{d}</p>
                </div>
              </div>
            ))}
            <div className="statrow rv">
              <div className="stat"><b>5 sn</b><span>ortalama yanıt</span></div>
              <div className="stat"><b>7/24</b><span>hiç kapanmaz</span></div>
              <div className="stat"><b>%0</b><span>yanlış adisyon</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }} className="rv">
            <div className="iphone" style={{ animation: 'bob 8s ease-in-out infinite' }}>
              <div className="island" />
              <div className="sbtn" />
              <div className="sbtn2" />
              <div className="sbtn3" />
              <div className="screen">
                <div className="wa-head">
                  <span style={{ fontSize: 15, opacity: 0.8 }}>‹</span>
                  <div className="av">
                    <IcPizza style={{ width: 17, height: 17, color: '#fff' }} />
                  </div>
                  <div>
                    <div className="nm">High Five</div>
                    <div className="st">{status}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 13, opacity: 0.85 }}>
                    <IcVideo style={{ width: 16, height: 16 }} />
                    <IcPhone style={{ width: 16, height: 16 }} />
                  </div>
                </div>
                <div className="wa-body">
                  <div className="wmsg sys">Bugün · uçtan uca şifreli</div>
                  {msgs.map((m) => (
                    <div key={m.k} className={`wmsg ${m.who}`}>
                      {m.node}
                      {m.tm && <div className="tm">{m.tm}</div>}
                    </div>
                  ))}
                  <div className={`typing ${typing ? 'on' : ''}`}><i /><i /><i /></div>
                </div>
                <div className="wa-inp">
                  <IcSmile style={{ width: 18, height: 18, color: 'rgba(0,0,0,.4)' }} />
                  <div className="f">Mesaj</div>
                  <div className="mic">
                    <IcMic style={{ width: 15, height: 15, color: '#fff' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================== MOBİL APP DETAY ============================== */

const APP_FEATS = [
  { Icon: IcBell, t: 'Push ile kampanya duyur', d: '"Öğlene özel %15" bildirimi tek tıkla tüm müşterilere gider; dönüşü aynı gün görürsün.' },
  { Icon: IcStar, t: 'Sadakat cebinde', d: 'Puanlar, çark ve kuponlar uygulamada da aynı hesapla çalışır; müşteri geri gelir.' },
  { Icon: IcRepeat, t: 'Tek dokunuşla tekrar sipariş', d: 'Son sipariş kayıtlı: "yine ondan" demek kadar kolay.' },
];

const PRODS = [
  { Icon: IcPizza, t: 'Karışık Pizza', d: 'Sucuk, sosis, mantar, biber', p: '₺240' },
  { Icon: IcCheese, t: 'Margherita', d: 'Mozzarella, fesleğen, domates', p: '₺180' },
  { Icon: IcMushroom, t: 'Trüflü Mantar', d: 'Trüf yağı, mantar, parmesan', p: '₺290' },
];

const CATS = [
  { Icon: IcPizza, t: 'Pizza', on: true },
  { Icon: IcPasta, t: 'Makarna' },
  { Icon: IcDrink, t: 'İçecek' },
  { Icon: IcDessert, t: 'Tatlı' },
];

const TABS = [
  { Icon: IcHome, t: 'Ana sayfa', on: true },
  { Icon: IcList, t: 'Menü' },
  { Icon: IcCart, t: 'Sepet', badge: true },
  { Icon: IcStar, t: 'Puanlarım' },
];

function AppDetail() {
  const [pushK, setPushK] = useState(0);

  useEffect(() => {
    if (reducedMotion()) return;
    const t = window.setTimeout(() => setPushK(1), 800);
    const iv = window.setInterval(() => setPushK((k) => k + 1), 6000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(iv);
    };
  }, []);

  return (
    <section id="app">
      <div className="wrap">
        <div className="app-grid">
          <div className="phones rv">
            <div className="iphone ph2">
              <div className="island" />
              <div className="sbtn" />
              <div className="screen">
                <div className="lock">
                  <div className="tm display">21:47</div>
                  <div className="dt">9 Temmuz Perşembe</div>
                  <div key={pushK} className={`push ${pushK > 0 ? 'on' : ''}`}>
                    <div className="top">
                      <div className="ap">H</div>
                      <span className="an">High Five</span>
                      <span className="tt">şimdi</span>
                    </div>
                    <p>Öğlene özel %15: kuponun sepette hazır. Bugün geçerli.</p>
                  </div>
                  <div className="push push2">
                    <div className="top">
                      <div className="ap">H</div>
                      <span className="an">High Five</span>
                      <span className="tt">2 dk</span>
                    </div>
                    <p>Siparişin yola çıktı. Kurye Emre 18 dk içinde kapında.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="iphone ph1">
              <div className="island" />
              <div className="sbtn" />
              <div className="sbtn2" />
              <div className="sbtn3" />
              <div className="screen">
                <div className="app-hd">
                  <div className="hg">Hoş geldin Batuhan</div>
                  <img src="/hf-logo-white.svg" alt="High Five" style={{ height: 26, marginTop: 5, display: 'block' }} />
                </div>
                <div className="app-search">
                  <IcSearch style={{ width: 14, height: 14, verticalAlign: -2 }} /> Pizza, makarna, içecek ara...
                </div>
                <div className="cats">
                  {CATS.map(({ Icon, t, on }) => (
                    <span key={t} className={`cat ${on ? 'on' : ''}`}>
                      <Icon style={{ width: 13, height: 13, verticalAlign: -2 }} /> {t}
                    </span>
                  ))}
                </div>
                <div className="prods">
                  {PRODS.map(({ Icon, t, d, p }) => (
                    <div key={t} className="prod">
                      <div className="im">
                        <Icon style={{ width: 26, height: 26, color: 'var(--red)' }} />
                      </div>
                      <div>
                        <h6>{t}</h6>
                        <p>{d}</p>
                      </div>
                      <div className="pr">
                        <b>{p}</b>
                        <div className="add">+</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="tabbar">
                  {TABS.map(({ Icon, t, on, badge }) => (
                    <div key={t} className={`t ${on ? 'on' : ''} ${badge ? 'badge' : ''}`}>
                      <i><Icon style={{ width: 17, height: 17 }} /></i>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <span className="kicker rv">Markalı Mobil App · Ekstra modül</span>
            <h2 className="rv">
              App Store'da
              <br />
              kendi adınla.
            </h2>
            <p className="lead rv">
              Sipariş siten, senin adını, ikonunu ve renklerini taşıyan gerçek bir iOS + Android
              uygulamasına dönüşür. Yayınlamayı biz yürütürüz.
            </p>
            {APP_FEATS.map(({ Icon, t, d }) => (
              <div key={t} className="feat-li rv">
                <div className="ic"><Icon /></div>
                <div>
                  <h6>{t}</h6>
                  <p>{d}</p>
                </div>
              </div>
            ))}
            <div className="statrow rv">
              <div className="stat"><b>₺24.999</b><span>tek seferlik</span></div>
              <div className="stat"><b>iOS + Android</b><span>ikisi de dahil</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================== FİYATLAR (termal fiş / adisyon) ============================== */

const TICKET_LINES: Array<{ label: string; has: (p: Plan) => boolean | string }> = [
  { label: 'POS + Mutfak ekranı', has: () => true },
  { label: 'Sipariş sitesi + QR menü', has: () => true },
  { label: 'Sınırsız kullanıcı', has: () => true },
  { label: 'Sadakat + kampanyalar', has: (p) => !!p.features.loyalty },
  { label: 'Analitik raporlar', has: (p) => !!p.features.analytics },
  { label: 'WhatsApp modülü bağlama', has: (p) => !!p.features.whatsappLink },
  { label: 'Yapay zekâ WhatsApp asistanı', has: (p) => !!p.features.whatsappAI },
  // Web sitesi ve mobil app plan özelliği değil, tek seferlik Ekstra modül
  { label: 'Markalı mobil uygulama', has: () => 'ekstra' },
  { label: 'Özel tasarım web sitesi', has: () => 'ekstra' },
];

const ROT = ['r1', 'r2', 'r3'];

function Pricing({ plans, annual, onToggle }: { plans: Plan[]; annual: boolean; onToggle: () => void }) {
  return (
    <section id="fiyatlar">
      <div className="wrap">
        <span className="kicker rv">Fiyatlar</span>
        <h2 className="rv">Hesap, net.</h2>
        <p className="lead rv" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
          Komisyon yok, gizli kalem yok. Her pakette 7 gün ücretsiz deneme.
        </p>
        <div className="cycle-toggle rv">
          <span className={`lbl ${!annual ? 'on' : ''}`}>Aylık</span>
          <button
            type="button"
            className="sw"
            role="switch"
            aria-checked={annual}
            aria-label="Yıllık fiyatlandırmaya geç"
            onClick={onToggle}
          >
            <i />
          </button>
          <span className={`lbl ${annual ? 'on' : ''}`}>
            Yıllık <b style={{ color: 'var(--red)' }}>(2 ay hediye)</b>
          </span>
        </div>
        <div className="fisler">
          {plans.length === 0 && <p style={{ color: 'var(--ink-mute)' }}>Planlar yükleniyor…</p>}
          {plans.map((p, i) => (
            <PlanFis key={p.key} plan={p} annual={annual} rot={ROT[i % ROT.length]} />
          ))}
          {plans.length > 0 && <BundleFis />}
        </div>
      </div>
    </section>
  );
}

function PlanFis({ plan, annual, rot }: { plan: Plan; annual: boolean; rot: string }) {
  const featured = !!plan.features.whatsappAI;
  const price = annual ? plan.annualPrice : plan.monthlyPrice;
  return (
    <div className={`fis rv ${featured ? 'feat' : rot}`}>
      {featured && <span className="stamp red">EN ÇOK TERCİH</span>}
      <span className="mono">OTORDER.COM · ADİSYON</span>
      <h3>{plan.name}</h3>
      <div className="price">₺{price.toLocaleString('tr-TR')}</div>
      <div className="per">{annual ? '/yıl · 2 ay hediye dahil' : '/ay · yıllıkta 2 ay hediye'}</div>
      <ul>
        {TICKET_LINES.map(({ label, has }) => {
          const v = has(plan);
          if (v === false)
            return (
              <li key={label} className="off">
                <span>{label}</span>
                <span aria-hidden="true">·</span>
              </li>
            );
          return (
            <li key={label}>
              <span>{label}</span>
              {v === true ? <b>✓</b> : <span className="mono">{v}</span>}
            </li>
          );
        })}
      </ul>
      <Link to={`/signup?plan=${plan.key}`} className="go">
        {featured ? `${plan.name} ile başla` : 'Başla'}
      </Link>
    </div>
  );
}

// Kuruluş Paketi — özel tasarım web sitesi + markalı mobil app, tek seferlik; 1 yıl Pro hediye.
function BundleFis() {
  return (
    <div className="fis rv r3">
      <span className="stamp">EN İYİ DEĞER</span>
      <span className="mono">OTORDER.COM · KURULUŞ</span>
      <h3>Kuruluş Paketi</h3>
      <div className="price">₺44.999</div>
      <div className="per">tek seferlik</div>
      <ul>
        <li>
          <span>Özel tasarım web sitesi</span>
          <b>✓</b>
        </li>
        <li>
          <span>Markalı mobil app</span>
          <b>✓</b>
        </li>
        <li>
          <span>1 yıl Pro hediye</span>
          <b><IcGift style={{ width: 13, height: 13 }} /></b>
        </li>
        <li>
          <span>Kurulum ve yayına alma bizde</span>
          <b>✓</b>
        </li>
      </ul>
      <Link to="/signup?plan=PRO" className="go">
        Paketle başla
      </Link>
    </div>
  );
}

/* ============================== FİNAL CTA ============================== */

function FinalCta() {
  return (
    <section id="son">
      <div className="wrap">
        <span className="chip rv">
          <span className="dot" /> Kurulum ortalama 12 dakika
        </span>
        <h2 className="rv" style={{ marginTop: 26 }}>
          Bu akşamki servise <em>yetişir.</em>
        </h2>
        <p className="lead rv" style={{ margin: '18px auto 0', textAlign: 'center' }}>
          Kaydol, menünü yükle, QR kodları bas. Sipariş almaya başla.
        </p>
        <div className="rv" style={{ marginTop: 36 }}>
          <Link to="/signup" className="obtn obtn-red" style={{ fontSize: 17, padding: '18px 40px' }}>
            Restoranımı oluştur
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================== GALERİ (Showcase carousel — AYNEN korunur) ============================== */

// Örnek siteler — vitrin carouseli. Kartlar eşit boyda; şerit sağa doğru otomatik
// akar; ortaya gelen kartta sitenin gerçek ekran görüntüsü yavaşça kayarak
// önizlenir. Logolar/screenshot'lar scripts/gen-showcase-assets.mjs ile üretilir
// (public/showcase/).
const SHOWCASE_SITES: Array<{ key: string; name: string; cuisine: string; url: string; bg: string; accent: string; note: string; logoH: number }> = [
  { key: 'smashe', name: 'smashè club', cuisine: 'Smash burger & matcha', url: 'https://smashe.otorder.com', bg: '#1747D1', accent: '#ffffff', note: 'Royal mavi + pöti kare', logoH: 72 },
  { key: 'ustadoner', name: 'USTA DÖNER', cuisine: 'Dönerci', url: 'https://ustadoner.otorder.com', bg: '#141210', accent: '#ff5a1c', note: 'İs karası + ateş turuncusu', logoH: 40 },
  { key: 'sushisel', name: 'Sushisel', cuisine: 'Sushi teslimatı', url: 'https://sushisel.otorder.com', bg: '#ffffff', accent: '#E23D28', note: 'Zen beyaz + vermilyon mühür', logoH: 44 },
  { key: 'pidem', name: 'Pidem Karadeniz', cuisine: 'Taş fırın pide', url: 'https://pidem.otorder.com', bg: '#1E3B2E', accent: '#F3C64E', note: 'Yosun yeşili + tereyağı', logoH: 40 },
  { key: 'mokka', name: 'MOKKA', cuisine: 'Kahve & brunch', url: 'https://mokka.otorder.com', bg: '#2B1D16', accent: '#C57B45', note: 'Espresso + süt köpüğü', logoH: 36 },
  { key: 'serbet', name: 'Şerbet', cuisine: 'Baklava & künefe', url: 'https://serbet.otorder.com', bg: '#0C1F17', accent: '#93C572', note: 'Fıstık + bakır', logoH: 52 },
  { key: 'makti', name: 'MAK-TI', cuisine: 'Makarna & mantı', url: 'https://makti.otorder.com', bg: '#081C15', accent: '#7FE3A8', note: 'Canlı müşteri: Kdz. Ereğli', logoH: 64 },
  { key: 'highfive', name: 'High Five', cuisine: 'Pizza & makarna', url: 'https://highfivepps.com', bg: '#ffffff', accent: '#CF1D00', note: 'Canlı müşteri: Akçakoca', logoH: 60 },
];

const SHOT_H = 208; // önizleme alanı yüksekliği (px) — pan animasyonu bununla hesaplanır

function Showcase() {
  const N = SHOWCASE_SITES.length;
  // Sonsuz şerit: liste 3 kez dizilir, index orta blokta gezer; uçlara yaklaşınca
  // animasyonsuz bir "snap" ile orta bloğa geri taşınır (görsel olarak fark edilmez).
  const EXT = useMemo(() => [...SHOWCASE_SITES, ...SHOWCASE_SITES, ...SHOWCASE_SITES], []);
  const [idx, setIdx] = useState(N);
  const [anim, setAnim] = useState(true);
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  // Otomatik akış: index azalır → şerit sağa kayar (yeni kart soldan ortaya gelir).
  useEffect(() => {
    if (hover || !inView) return;
    const t = setInterval(() => setIdx((i) => i - 1), 4600);
    return () => clearInterval(t);
  }, [hover, inView]);

  // Sessiz sarma: geçiş bittikten sonra orta bloğa geri ışınlan.
  useEffect(() => {
    if (idx >= N && idx < 2 * N) return;
    const t = setTimeout(() => {
      setAnim(false);
      setIdx((i) => (i < N ? i + N : i - N));
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    }, 720);
    return () => clearTimeout(t);
  }, [idx, N]);

  // Ekran görüntülerini arka planda ısıt (ilk geçişte boş kart görünmesin).
  useEffect(() => {
    const t = setTimeout(() => {
      for (const s of SHOWCASE_SITES) { const im = new Image(); im.src = `/showcase/shot-${s.key}.jpg`; }
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  const CARD = w > 0 && w < 640 ? Math.round(w * 0.76) : 340;
  const GAP = w > 0 && w < 640 ? 14 : 24;
  const tx = w / 2 - (idx * (CARD + GAP) + CARD / 2);
  const activeDot = ((idx % N) + N) % N;

  return (
    <section className="gal-band overflow-hidden" id="ornekler">
      <style>{`
        @keyframes ot-shotpan { from { transform: translateY(0) } to { transform: translateY(calc(-100% + ${SHOT_H}px)) } }
        .ot-shot { animation: ot-shotpan 12s ease-in-out infinite alternate; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .ot-shot { animation: none } }
      `}</style>
      <div className="wrap">
        <span className="kicker rv">Galeri</span>
        <h2 className="rv">Her marka, kendi dünyası.</h2>
        <p className="lead rv">
          Özel tasarım web sitesi örnekleri. Hepsi canlı, ortadaki kart siteyi otomatik önizler.
        </p>
      </div>
      <div
        ref={wrapRef}
        className="relative mt-12"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Kenar sisleri — şeridin sonsuz aktığı hissi */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent md:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent md:w-40" />
        <div
          className="flex"
          style={{
            gap: GAP,
            transform: `translateX(${tx}px)`,
            transition: anim ? 'transform 680ms cubic-bezier(0.22, 0.61, 0.21, 1)' : 'none',
          }}
        >
          {EXT.map((x, k) => {
            const active = k === idx;
            const inner = (
              <>
                <div className="relative grid place-items-center overflow-hidden" style={{ height: SHOT_H, background: x.bg }}>
                  {/* Logo her durumda zeminde — screenshot yüklenene dek de görünür */}
                  <img src={`/showcase/${x.key}.png`} alt={x.name} className="max-w-[74%]" style={{ height: x.logoH, objectFit: 'contain' }} loading="lazy" decoding="async" />
                  {active && (
                    <>
                      <img src={`/showcase/shot-${x.key}.jpg`} alt={`${x.name} — canlı site`} className="ot-shot absolute inset-x-0 top-0 w-full" decoding="async" />
                      <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        CANLI
                      </span>
                    </>
                  )}
                </div>
                <div
                  className="flex items-center justify-between gap-3 px-4"
                  style={{ height: 64, background: active ? x.bg : '#ffffff', borderTop: '1px solid rgba(15,23,42,0.08)' }}
                >
                  {active ? (
                    <>
                      <img src={`/showcase/${x.key}.png`} alt="" className="max-w-[55%]" style={{ height: Math.min(x.logoH * 0.55, 30), objectFit: 'contain' }} />
                      <span className="whitespace-nowrap text-sm font-bold" style={{ color: x.accent }}>Siteyi gez ↗</span>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{x.cuisine}</p>
                        <p className="truncate text-xs text-ink-muted">{x.note}</p>
                      </div>
                      <span className="text-ink-muted">→</span>
                    </>
                  )}
                </div>
              </>
            );
            const cls = `block shrink-0 overflow-hidden rounded-2xl border text-left transition-shadow duration-500 ${active ? 'border-ink/15 shadow-2xl shadow-ink/15' : 'border-ink/10'}`;
            return active ? (
              <a key={`${x.key}-${k}`} href={x.url} target="_blank" rel="noopener noreferrer" className={cls} style={{ width: CARD }}>
                {inner}
              </a>
            ) : (
              <button key={`${x.key}-${k}`} type="button" onClick={() => setIdx(k)} aria-label={`${x.name} önizle`} className={cls} style={{ width: CARD }}>
                {inner}
              </button>
            );
          })}
        </div>
        {/* Nokta navigasyonu */}
        <div className="mt-7 flex items-center justify-center gap-2">
          {SHOWCASE_SITES.map((x, d) => (
            <button
              key={x.key}
              type="button"
              aria-label={`${x.name} göster`}
              onClick={() => setIdx((i) => i + (d - ((i % N) + N) % N))}
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: d === activeDot ? 22 : 8, background: d === activeDot ? '#0f172a' : 'rgba(15,23,42,0.2)' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
