// OtOrder brand logo: "Pulse Plate" mark (plate ring + order pulse).
// Copied from apps/saas-landing/src/App.tsx to keep both apps in sync visually.
export function OtOrderMark({ size = 26, color = '#D92B1C' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="24" cy="24" r="17.5" strokeWidth="5" />
      <path d="M7 24h9l3.2-7.5 6 15 3.2-7.5H41" strokeWidth="4.6" />
    </svg>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="wordmark-ot inline-flex items-center gap-2">
      <OtOrderMark size={small ? 24 : 26} />
      {!small && (
        <span>
          OtOrder<b>.</b>
        </span>
      )}
    </span>
  );
}
