// OtOrder ikon kütüphanesi — tek renk, stroke, HighFive ailesi (24x24, stroke 1.8).
// Prototipteki SVG symbol'lerin birebir React portu. Emoji kullanılmaz.
import type { CSSProperties, ReactNode } from 'react';

export interface IconProps {
  className?: string;
  style?: CSSProperties;
}

function Svg({ children, className = 'hi', style }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IcPizza = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 7.5L12 21l8.5-13.5C16 5 8 5 3.5 7.5z" />
    <path d="M3.5 7.5L12 4l8.5 3.5" />
    <circle cx="10" cy="10" r=".7" fill="currentColor" stroke="none" />
    <circle cx="14" cy="11" r=".7" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r=".7" fill="currentColor" stroke="none" />
  </Svg>
);

export const IcPasta = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11h16a8 8 0 01-16 0z" />
    <path d="M2.5 11h19" />
    <path d="M8 11c0-4 1.5-6 2-6M12 11c0-5 1.5-7 2-7M16 11c0-4 1-6 1.5-6" />
  </Svg>
);

export const IcDrink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 7h12l-1.2 12.5a1.5 1.5 0 01-1.5 1.4H8.7a1.5 1.5 0 01-1.5-1.4L6 7z" />
    <path d="M5 4h14M9 7l-.5-3M15 7l.5-3" />
  </Svg>
);

export const IcDessert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 13l7-8 7 8H5z" />
    <path d="M5 13v3a2 2 0 002 2h10a2 2 0 002-2v-3" />
    <circle cx="12" cy="9" r=".7" fill="currentColor" stroke="none" />
  </Svg>
);

export const IcCheese = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 15l9-7 9 4v3H3z" />
    <path d="M3 15v2h18v-2" />
    <circle cx="8" cy="13.5" r=".6" fill="currentColor" stroke="none" />
    <circle cx="13" cy="14" r=".6" fill="currentColor" stroke="none" />
  </Svg>
);

export const IcMushroom = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11c0-4 3.6-7 8-7s8 3 8 7c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1z" />
    <path d="M9.5 12l-.5 5a3 3 0 006 0l-.5-5" />
  </Svg>
);

export const IcScooter = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
    <path d="M8.5 17.5h6.5M4 7h3l2.2 7" />
    <path d="M15 17.5l-2-7h4l2 4" />
    <path d="M13 7h2.5l1.5 3.5" />
  </Svg>
);

export const IcPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21c4-4 7-7 7-11a7 7 0 10-14 0c0 4 3 7 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const IcStar = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
  </Svg>
);

export const IcCart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h2l1.6 9.5a1.5 1.5 0 001.5 1.3h7.5a1.5 1.5 0 001.5-1.2L20 8H6.5" />
    <circle cx="9.5" cy="19" r="1.3" />
    <circle cx="17" cy="19" r="1.3" />
  </Svg>
);

export const IcHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
  </Svg>
);

export const IcList = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 7h12M8 12h12M8 17h12" />
    <circle cx="4.5" cy="7" r=".8" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r=".8" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="17" r=".8" fill="currentColor" stroke="none" />
  </Svg>
);

export const IcSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Svg>
);

export const IcBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 16v-5a6 6 0 0112 0v5l1.5 2.5h-15L6 16z" />
    <path d="M10 21a2.2 2.2 0 004 0" />
  </Svg>
);

export const IcRepeat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 9.5a8 8 0 0113.6-2.6l1.9 2.1M19.5 14.5a8 8 0 01-13.6 2.6L4 15" />
    <path d="M20 4v5h-5M4 20v-5h5" />
  </Svg>
);

export const IcBolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 3L5.5 13.5H11L10 21l7.5-10.5H12L13 3z" />
  </Svg>
);

export const IcChip = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="7" width="10" height="10" rx="2.5" />
    <path d="M12 2.5V7M12 17v4.5M2.5 12H7M17 12h4.5M5 5l2.5 2.5M19 5l-2.5 2.5M5 19l2.5-2.5M19 19l-2.5-2.5" />
  </Svg>
);

export const IcMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 13.5A8.5 8.5 0 0110.5 4 8.5 8.5 0 1020 13.5z" />
  </Svg>
);

export const IcVideo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="7" width="12" height="10" rx="2.5" />
    <path d="M15 11l6-3.5v9L15 13" />
  </Svg>
);

export const IcPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
  </Svg>
);

export const IcMic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9.5" y="3.5" width="5" height="11" rx="2.5" />
    <path d="M6 12a6 6 0 0012 0M12 18v3" />
  </Svg>
);

export const IcSmile = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9 14.5c.8 1 1.8 1.5 3 1.5s2.2-.5 3-1.5" />
    <circle cx="9.3" cy="10" r=".8" fill="currentColor" stroke="none" />
    <circle cx="14.7" cy="10" r=".8" fill="currentColor" stroke="none" />
  </Svg>
);

export const IcQr = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <path d="M13.5 13.5h3v3h-3zM20 13.5v2M20 18v2h-4.5" />
  </Svg>
);

export const IcGift = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="10" width="16" height="10" rx="1.5" />
    <path d="M12 10v10M4 14.5h16" />
    <path d="M12 10c-3.8 0-5-1.8-4-3.6C9.1 4.5 12 6.2 12 10zm0 0c3.8 0 5-1.8 4-3.6C14.9 4.5 12 6.2 12 10z" />
  </Svg>
);

export const IcCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Svg>
);

export const IcX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Svg>
);

export const IcWa = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1L4 20z" />
    <path
      d="M9 9.5c.2 2 1.5 3.5 3.5 4 .6.1 1.3-.5 1.3-1.1l-1.8-.7-.7.7c-.8-.4-1.4-1-1.7-1.8l.7-.7-.6-1.8c-.6 0-1.1.6-1 1.2z"
      fill="currentColor"
      stroke="none"
    />
  </Svg>
);
