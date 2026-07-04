// HighFive marka ikon kütüphanesi.
// Tek aile: 24x24 viewBox, stroke = currentColor (kırmızı VEYA beyaz olabilir),
// strokeWidth 1.8, yuvarlak uç/köşe. Lucide/emoji karışıklığı yerine her yerde bunlar.
// Kullanım: <HfDelivery className="w-6 h-6 text-primary" />
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const Svg = ({ children, ...p }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {children}
  </svg>
)

// ---- Değerler / hizmet ----
export const HfDelivery = (p: P) => ( // teslimat scooter'ı
  <Svg {...p}>
    <circle cx="6" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    <path d="M8.5 17.5h6.5M4 7h3l2.2 7" /><path d="M15 17.5l-2-7h4l2 4" />
    <path d="M13 7h2.5l1.5 3.5" />
  </Svg>
)
export const HfLeaf = (p: P) => ( // taze malzeme
  <Svg {...p}>
    <path d="M4 20c0-8 6-13 16-13 0 10-5 15-13 15-2 0-3-1-3-2z" />
    <path d="M9 16c2.5-3.5 5-5.5 8.5-7" />
  </Svg>
)
export const HfRollingPin = (p: P) => ( // el yapımı hamur
  <Svg {...p}>
    <rect x="6" y="9" width="12" height="6" rx="3" />
    <path d="M6 12H3.5M18 12h2.5M3.5 10.5v3M20.5 10.5v3" />
  </Svg>
)
export const HfCheese = (p: P) => ( // bol peynir
  <Svg {...p}>
    <path d="M3 15l9-7 9 4v3H3z" /><path d="M3 15v2h18v-2" />
    <circle cx="8" cy="13.5" r=".6" fill="currentColor" stroke="none" />
    <circle cx="13" cy="14" r=".6" fill="currentColor" stroke="none" />
  </Svg>
)
export const HfFlame = (p: P) => ( // fırın / ateş
  <Svg {...p}>
    <path d="M12 3c1 3 4 4.5 4 8a4 4 0 01-8 0c0-1.5.7-2.5 1.5-3.5C10 8.5 11.5 6 12 3z" />
    <path d="M12 20a2.2 2.2 0 002-2c0-1.3-2-2.2-2-4-0 1.8-2 2.7-2 4a2.2 2.2 0 002 2z" />
  </Svg>
)

// ---- Kategoriler ----
export const HfPizza = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 7.5L12 21l8.5-13.5C16 5 8 5 3.5 7.5z" /><path d="M3.5 7.5L12 4l8.5 3.5" />
    <circle cx="10" cy="10" r=".7" fill="currentColor" stroke="none" />
    <circle cx="14" cy="11" r=".7" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r=".7" fill="currentColor" stroke="none" />
  </Svg>
)
export const HfPasta = (p: P) => ( // makarna kasesi
  <Svg {...p}>
    <path d="M4 11h16a8 8 0 01-16 0z" /><path d="M2.5 11h19" />
    <path d="M8 11c0-4 1.5-6 2-6M12 11c0-5 1.5-7 2-7M16 11c0-4 1-6 1.5-6" />
  </Svg>
)
export const HfSandwich = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5c0-2 3.6-3.5 8-3.5s8 1.5 8 3.5-3.6 3-8 3-8-1-8-3z" />
    <path d="M4 13c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5" /><path d="M7 11l2 1.5M12 11l2 1.5" />
  </Svg>
)
export const HfDrink = (p: P) => (
  <Svg {...p}>
    <path d="M6 7h12l-1.2 12.5a1.5 1.5 0 01-1.5 1.4H8.7a1.5 1.5 0 01-1.5-1.4L6 7z" />
    <path d="M5 4h14M9 7l-.5-3M15 7l.5-3" />
  </Svg>
)
export const HfDessert = (p: P) => ( // tatlı / dilim
  <Svg {...p}>
    <path d="M5 13l7-8 7 8H5z" /><path d="M5 13v3a2 2 0 002 2h10a2 2 0 002-2v-3" />
    <circle cx="12" cy="9" r=".7" fill="currentColor" stroke="none" />
  </Svg>
)

// ---- İletişim / aksiyon ----
export const HfPhone = (p: P) => (
  <Svg {...p}>
    <path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
  </Svg>
)
export const HfWhatsapp = (p: P) => (
  <Svg {...p}>
    <path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1L4 20z" />
    <path d="M9 9.5c.2 2 1.5 3.5 3.5 4 .6.1 1.3-.5 1.3-1.1l-1.8-.7-.7.7c-.8-.4-1.4-1-1.7-1.8l.7-.7-.6-1.8c-.6 0-1.1.6-1 1.2z" fill="currentColor" stroke="none" />
  </Svg>
)
export const HfPin = (p: P) => (
  <Svg {...p}><path d="M12 21c4-4 7-7 7-11a7 7 0 10-14 0c0 4 3 7 7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>
)
export const HfClock = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
)
export const HfStar = (p: P) => (
  <Svg {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9L12 3.5z" /></Svg>
)
export const HfHeart = (p: P) => (
  <Svg {...p}><path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0112 8a3.8 3.8 0 017 2.8C19 15.7 12 20 12 20z" /></Svg>
)
export const HfTarget = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" /></Svg>
)
export const HfArrow = (p: P) => (
  <Svg {...p}><path d="M5 12h13m-6-6l6 6-6 6" /></Svg>
)
export const HfCart = (p: P) => (
  <Svg {...p}><path d="M4 5h2l1.6 9.5a1.5 1.5 0 001.5 1.3h7.5a1.5 1.5 0 001.5-1.2L20 8H6.5" /><circle cx="9.5" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></Svg>
)
export const HfPlus = (p: P) => (<Svg {...p}><path d="M12 6v12M6 12h12" /></Svg>)
export const HfCheck = (p: P) => (<Svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Svg>)
export const HfGame = (p: P) => ( // oyun kolu
  <Svg {...p}>
    <rect x="3" y="8" width="18" height="9" rx="4.5" />
    <path d="M8 11v3M6.5 12.5h3" /><circle cx="15.5" cy="12" r=".8" fill="currentColor" stroke="none" /><circle cx="17.5" cy="13.5" r=".8" fill="currentColor" stroke="none" />
  </Svg>
)
export const HfBuild = (p: P) => ( // tasarla / kişiselleştir
  <Svg {...p}><path d="M5 19l3-1 9-9-2-2-9 9-1 3z" /><path d="M14 6l2 2M4 4h4M4 4v4" /></Svg>
)

// ---- Sosyal ----
export const HfInstagram = (p: P) => (
  <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17" cy="7" r=".9" fill="currentColor" stroke="none" /></Svg>
)
export const HfTiktok = (p: P) => (
  <Svg {...p}><path d="M14 4v9.5a3.5 3.5 0 11-3-3.46" /><path d="M14 6.5c.8 1.6 2.2 2.6 4 2.7" /></Svg>
)

// ---- UI ----
export const HfMenu = (p: P) => (<Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>)
export const HfClose = (p: P) => (<Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>)

// Highlight emoji -> marka ikon eşlemesi (content.highlights icon alanı için)
export const HIGHLIGHT_ICON: Record<string, (p: P) => JSX.Element> = {
  '🚀': HfDelivery, '🥬': HfLeaf, '👨‍🍳': HfRollingPin, '🧀': HfCheese, '🔥': HfFlame,
}
// Kategori id -> marka ikon
export const CATEGORY_ICON: Record<string, (p: P) => JSX.Element> = {
  pizza: HfPizza, makarna: HfPasta, sandvic: HfSandwich, icecek: HfDrink, tatli: HfDessert,
}
