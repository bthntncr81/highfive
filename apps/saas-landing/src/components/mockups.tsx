/* ============================================================================
   GERÇEK ürün ekran görüntüleri — canlı üründen (POS, KDS, sipariş sitesi)
   yakalanmış retina (2x/3x) görüntüler, cihaz çerçeveleri içinde sunulur.
   Kaynaklar: public/media/*.jpg (capture-screens.mjs ile üretilir).
   ============================================================================ */

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
        <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-ink" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

/* --- POS: gerçek masa haritası ekranı --- */
export function PosMockup({ className = '' }: { className?: string }) {
  return (
    <BrowserFrame url="mehmet.otorder.com/pos" className={className}>
      <img
        src="/media/pos-tables.jpg"
        width={1280}
        height={800}
        alt="OtOrder POS masa haritası: 12 masa, dolu ve boş durumları, adisyon tutarları"
        loading="lazy"
        className="block w-full"
      />
    </BrowserFrame>
  );
}

/* --- KDS: gerçek mutfak ekranı (koyu) --- */
export function KdsMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl shadow-[0_24px_60px_-24px_oklch(0.18_0.012_150/0.45)] ring-1 ring-kds-line ${className}`}>
      <img
        src="/media/kds-board.jpg"
        width={1280}
        height={800}
        alt="OtOrder mutfak ekranı: bekleyen, hazırlanan ve hazır siparişler süre rozetleriyle"
        loading="lazy"
        className="block w-full"
      />
    </div>
  );
}

/* --- Telefon: gerçek müşteri sipariş sitesi --- */
export function PhoneMockup({ className = '' }: { className?: string }) {
  return (
    <PhoneFrame className={className}>
      <img
        src="/media/order-site.jpg"
        width={721}
        height={1560}
        alt="Restoranın kendi sipariş sitesi: fotoğraflı menü, fiyatlar ve sepete ekle"
        loading="lazy"
        className="block w-full"
      />
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
