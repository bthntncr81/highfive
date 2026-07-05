import { useEffect, useState } from 'react';

/* ============================================================================
   Gerçeğe sadık ürün mockup'ları — ekran görüntüsü yerine elle inşa edilmiş,
   retina-keskin UI reprodüksiyonları. İçerik gerçek ürün akışından.
   ============================================================================ */

/* --- Ortak çerçeveler --- */

export function BrowserFrame({ url, children, className = '' }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_60px_-24px_oklch(0.18_0.012_150/0.25)] ${className}`}>
      <div className="flex items-center gap-2 border-b border-line bg-wash px-3.5 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="h-2.5 w-2.5 rounded-full bg-line" />
          <i className="h-2.5 w-2.5 rounded-full bg-line" />
          <i className="h-2.5 w-2.5 rounded-full bg-line" />
        </span>
        <span className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 font-mono text-[10px] text-ink-muted ring-1 ring-line">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

export function PhoneFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[2rem] border-[6px] border-ink bg-white shadow-[0_30px_70px_-28px_oklch(0.18_0.012_150/0.4)] ${className}`}>
      <div className="relative">
        <div className="absolute left-1/2 top-1.5 h-4 w-20 -translate-x-1/2 rounded-full bg-ink" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

/* --- POS: masa haritası + adisyon paneli --- */

const TABLES: Array<{ n: number; s: 'free' | 'busy' | 'bill' }> = [
  { n: 1, s: 'busy' }, { n: 2, s: 'free' }, { n: 3, s: 'busy' }, { n: 4, s: 'bill' },
  { n: 5, s: 'free' }, { n: 6, s: 'busy' }, { n: 7, s: 'free' }, { n: 8, s: 'free' },
  { n: 9, s: 'busy' }, { n: 10, s: 'free' }, { n: 11, s: 'bill' }, { n: 12, s: 'free' },
];

const tableStyle = {
  free: 'bg-white text-ink-muted ring-1 ring-line',
  busy: 'bg-brand-600 text-white',
  bill: 'bg-lichen text-ink',
} as const;

export function PosMockup({ className = '' }: { className?: string }) {
  return (
    <BrowserFrame url="mehmet.otorder.com/pos" className={className}>
      <div className="grid grid-cols-[1.4fr_1fr] text-[10px]">
        {/* Masa haritası */}
        <div className="border-r border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-ink">Salon</span>
            <span className="flex items-center gap-3 text-[9px] text-ink-muted">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-brand-600" />Dolu</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-lichen" />Hesap</span>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {TABLES.map((t) => (
              <div key={t.n} className={`flex h-10 flex-col items-center justify-center rounded-md font-semibold ${tableStyle[t.s]}`}>
                <span>M{t.n}</span>
                {t.s === 'busy' && <span className="text-[8px] font-normal opacity-80">2 sipariş</span>}
                {t.s === 'bill' && <span className="text-[8px] font-normal opacity-80">hesap</span>}
              </div>
            ))}
          </div>
        </div>
        {/* Adisyon paneli */}
        <div className="flex flex-col p-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-bold text-ink">Masa 3</span>
            <span className="font-mono text-[9px] text-ink-muted">#1042</span>
          </div>
          <ul className="flex-1 space-y-1 text-ink-soft">
            {[
              ['1× Margherita', '185'],
              ['2× Sucuklu', '440'],
              ['1× Ayran', '25'],
            ].map(([name, price]) => (
              <li key={name} className="flex justify-between border-b border-line/70 pb-1">
                <span>{name}</span>
                <span className="font-mono">{price}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between font-bold text-ink">
            <span>Toplam</span>
            <span className="font-mono">₺650</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <span className="rounded-md bg-brand-600 py-1.5 text-center font-semibold text-white">Mutfağa gönder</span>
            <span className="rounded-md ring-1 ring-line py-1.5 text-center font-semibold text-ink-soft">Hesap al</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* --- KDS: koyu mutfak ekranı, CANLI işleyen sayaçlar --- */

function useTick() {
  const [, setT] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const KDS_ORDERS = [
  { id: '#1039', table: 'Masa 7', items: ['1× Bolonez', '1× Alfredo'], base: 341, state: 'hazır' },
  { id: '#1041', table: 'Paket', items: ['2× Karışık', '1× Kola'], base: 128, state: 'hazırlanıyor' },
  { id: '#1042', table: 'Masa 3', items: ['1× Margherita', '2× Sucuklu'], base: 37, state: 'yeni' },
] as const;

export function KdsMockup({ className = '' }: { className?: string }) {
  useTick();
  const now = Math.floor(Date.now() / 1000);
  return (
    <div className={`overflow-hidden rounded-xl bg-kds shadow-[0_24px_60px_-24px_oklch(0.18_0.012_150/0.45)] ring-1 ring-kds-line ${className}`}>
      <div className="flex items-center justify-between border-b border-kds-line px-3.5 py-2">
        <span className="text-[11px] font-bold text-white">Mutfak Ekranı</span>
        <span className="flex items-center gap-1.5 text-[9px] text-brand-300">
          <i className="pulse-dot h-1.5 w-1.5 rounded-full bg-brand-300" />
          canlı
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-2.5 text-[9px]">
        {KDS_ORDERS.map((o, i) => {
          const elapsed = (now + o.base) % (o.state === 'yeni' ? 90 : 900);
          return (
            <div
              key={o.id}
              className={`rounded-lg bg-kds-panel p-2 ring-1 ring-kds-line ${o.state === 'yeni' ? 'kds-new' : ''}`}
            >
              <div className="mb-1 flex items-center justify-between gap-1.5">
                <span className="truncate font-bold text-white">{o.table}</span>
                <span className="shrink-0 font-mono text-brand-300">{fmt(elapsed)}</span>
              </div>
              <ul className="space-y-0.5 text-white/70">
                {o.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              <span
                className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                  o.state === 'hazır'
                    ? 'bg-brand-600 text-white'
                    : o.state === 'yeni'
                      ? 'bg-lichen text-ink'
                      : 'bg-white/10 text-white/80'
                }`}
              >
                {o.state}
              </span>
              <span className="sr-only">{o.id}</span>
              {i === 0 && <span className="sr-only">hazır siparişler garsona bildirilir</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- Telefon: müşterinin sipariş sitesi --- */

const MENU = [
  { name: 'Margherita', desc: 'San Marzano, fior di latte', price: 185 },
  { name: 'Sucuklu', desc: 'Kangal sucuk, mozzarella', price: 220 },
  { name: 'Bolonez', desc: 'Dana ragu, taze fesleğen', price: 200 },
];

export function PhoneMockup({ className = '' }: { className?: string }) {
  return (
    <PhoneFrame className={className}>
      <div className="w-full bg-white pt-7 text-[10px]">
        <div className="flex items-center justify-between px-3 pb-2">
          <div>
            <p className="text-[12px] font-extrabold text-ink">Pizzacı Mehmet</p>
            <p className="text-[8.5px] text-ink-muted">mehmet.otorder.com · 25-35 dk</p>
          </div>
          <span className="rounded-full bg-brand-50 px-2 py-1 text-[8.5px] font-bold text-brand-700">Açık</span>
        </div>
        <div className="flex gap-1.5 border-b border-line px-3 pb-2 text-[8.5px] font-semibold text-ink-muted">
          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-white">Pizzalar</span>
          <span className="rounded-full ring-1 ring-line px-2 py-0.5">Makarnalar</span>
          <span className="rounded-full ring-1 ring-line px-2 py-0.5">İçecekler</span>
        </div>
        <ul>
          {MENU.map((m) => (
            <li key={m.name} className="flex items-center justify-between border-b border-line/70 px-3 py-2">
              <div>
                <p className="font-bold text-ink">{m.name}</p>
                <p className="text-[8.5px] text-ink-muted">{m.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-ink">₺{m.price}</span>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 font-bold text-white">+</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="m-2.5 flex items-center justify-between rounded-xl bg-ink px-3 py-2 text-white">
          <span className="font-semibold">Sepet · 2 ürün</span>
          <span className="font-mono font-bold">₺405</span>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* --- QR menü çipi (hero kompozisyonunda küçük detay) --- */

export function QrChip({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border border-line bg-white p-2.5 shadow-[0_16px_40px_-18px_oklch(0.18_0.012_150/0.3)] ${className}`}>
      <svg viewBox="0 0 21 21" className="h-10 w-10" aria-hidden="true">
        <rect width="21" height="21" fill="white" />
        <path
          fill="oklch(0.18 0.012 150)"
          d="M0 0h7v7H0zM2 2v3h3V2zM14 0h7v7h-7zM16 2v3h3V2zM0 14h7v7H0zM2 16v3h3v-3zM9 0h1v2H9zM12 1h1v3h-1zM9 4h2v1H9zM9 6h1v3H9zM11 6h3v1h-3zM12 8h2v2h-2zM0 9h2v1H0zM3 9h3v2H3zM7 9h1v1H7zM15 9h2v1h-2zM18 9h3v1h-3zM8 11h2v1H8zM11 11h1v2h-1zM14 12h2v1h-2zM17 11h1v3h-1zM19 12h2v2h-2zM9 14h2v2H9zM12 14h1v1h-1zM13 15h3v2h-3zM18 15h1v1h-1zM9 17h1v4H9zM11 18h2v1h-2zM14 18h1v3h-1zM16 18h2v1h-2zM19 17h2v1h-2zM17 20h4v1h-4z"
        />
      </svg>
      <div className="text-[10px] leading-tight">
        <p className="font-bold text-ink">Masa 3 · QR menü</p>
        <p className="text-ink-muted">Tarat, sipariş ver</p>
      </div>
    </div>
  );
}
