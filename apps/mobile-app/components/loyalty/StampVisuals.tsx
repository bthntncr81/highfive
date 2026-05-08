// Mobile Stamp Visual primitives — pizza/burger/pasta/cup/hex
// SVG ile çizilen 5 farklı stamp görseli + otomatik picker.
// Her görsel `count`/`target` alır, dolulukla görseli doldurur.

import type { ReactElement } from "react";
import { View, Text } from "react-native";
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Polygon,
  ClipPath,
  Line,
  Ellipse,
  Filter,
  FeGaussianBlur,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

export type VisualStyle = "auto" | "pie" | "stack" | "bowl" | "cups" | "hex" | "dots";

type Props = {
  count: number;
  target: number;
  color: string;
  /** Hangi görsel? auto → category bazlı pick (categoryHint kullanılır) */
  visualStyle?: VisualStyle;
  /** "pizza" / "pasta" / "burger" / "icecek" — auto seçimi için */
  categoryHint?: string;
};

/**
 * Otomatik picker — visualStyle 'auto' veya verilmemişse,
 * categoryHint'e göre uygun visualStyle döner.
 */
function pickStyle(style: VisualStyle | undefined, hint?: string): Exclude<VisualStyle, "auto"> {
  if (style && style !== "auto") return style;
  if (!hint) return "hex";
  const h = hint.toLowerCase();
  if (h.includes("pizza")) return "pie";
  if (h.includes("makarna") || h.includes("pasta") || h.includes("çorba")) return "bowl";
  if (h.includes("burger") || h.includes("sandviç") || h.includes("sandwich")) return "stack";
  if (h.includes("İçecek") || h.includes("icecek") || h.includes("drink") || h.includes("kahve") || h.includes("çay")) return "cups";
  return "hex";
}

export function StampVisual({ count, target, color, visualStyle, categoryHint }: Props) {
  const style = pickStyle(visualStyle, categoryHint);
  const safeTarget = Math.max(2, target);
  const safeCount = Math.max(0, Math.min(safeTarget, count));
  const props = { count: safeCount, target: safeTarget, color };

  switch (style) {
    case "pie":
      return <PiePizza {...props} />;
    case "stack":
      return <BurgerStack {...props} />;
    case "bowl":
      return <PastaBowl {...props} />;
    case "cups":
      return <CupsRow {...props} />;
    case "dots":
      return <DotsRow {...props} />;
    case "hex":
    default:
      return <HexHoneycomb {...props} />;
  }
}

/* --------------------------------------------------------------- */
/*                    1) PIZZA — pie wheel (gerçekçi)              */
/* --------------------------------------------------------------- */
function PiePizza({ count, target, color }: { count: number; target: number; color: string }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;

  const crustOuter = r;
  const crustInner = r - 14; // Kalın gerçekçi kabuk
  const sauceR = crustInner - 4;

  const slices = Array.from({ length: target }, (_, i) => {
    const startAngle = (i * 360) / target - 90;
    const endAngle = ((i + 1) * 360) / target - 90;
    const filled = i < count;
    return { startAngle, endAngle, filled, isReward: i === target - 1, idx: i };
  });

  return (
    <View
      className="items-center"
      style={{
        shadowColor: "#451a03",
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          {/* Crust radyal — orta sıcak sarı, dış kahverengi (3D efekt) */}
          <RadialGradient id="crustRad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#fbbf24" />
            <Stop offset="0.5" stopColor="#d97706" />
            <Stop offset="0.85" stopColor="#92400e" />
            <Stop offset="1" stopColor="#451a03" />
          </RadialGradient>
          {/* Peynir radyal — orta açık, kenarlar koyu kavurma */}
          <RadialGradient id="cheeseRad" cx="50%" cy="40%" rx="55%" ry="55%">
            <Stop offset="0" stopColor="#fffbe0" />
            <Stop offset="0.5" stopColor="#fde047" />
            <Stop offset="0.9" stopColor="#f59e0b" />
            <Stop offset="1" stopColor="#b45309" />
          </RadialGradient>
          {/* Domates sosu — dilim arası görünebilir */}
          <RadialGradient id="sauceRad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#ef4444" />
            <Stop offset="1" stopColor="#7f1d1d" />
          </RadialGradient>
          {/* Sucuk gradient — gerçek pepperoni rengi */}
          <RadialGradient id="pepperoniRad" cx="40%" cy="35%" rx="60%" ry="60%">
            <Stop offset="0" stopColor="#f87171" />
            <Stop offset="0.4" stopColor="#dc2626" />
            <Stop offset="1" stopColor="#7f1d1d" />
          </RadialGradient>
          {/* Zeytin gradient */}
          <RadialGradient id="oliveRad" cx="40%" cy="40%" rx="60%" ry="60%">
            <Stop offset="0" stopColor="#525252" />
            <Stop offset="1" stopColor="#171717" />
          </RadialGradient>
          {/* Mantar gradient */}
          <RadialGradient id="mushroomRad" cx="50%" cy="40%" rx="60%" ry="60%">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="0.7" stopColor="#e7e5e4" />
            <Stop offset="1" stopColor="#a8a29e" />
          </RadialGradient>
        </Defs>

        {/* Tepsi gölgesi (alttan yumuşak halka) */}
        <Ellipse cx={cx} cy={cy + 8} rx={r + 6} ry={6} fill="#000" opacity={0.18} />

        {/* Crust outer (kabuk) — radyal gradient */}
        <Circle cx={cx} cy={cy} r={crustOuter} fill="url(#crustRad)" />

        {/* Sos halkası (peynir kenarında kırmızı çizgi) */}
        <Circle cx={cx} cy={cy} r={crustInner} fill="url(#sauceRad)" />

        {/* Peynir merkez (gerçekçi 3D radyal) */}
        <Circle cx={cx} cy={cy} r={sauceR} fill="url(#cheeseRad)" />

        {/* Slice ayraç çizgileri (peynir üzerinde keskin kesim izleri) */}
        {slices.map((s, i) => {
          const p1 = polar(cx, cy, sauceR + 2, s.startAngle);
          const p2 = polar(cx, cy, 0, 0);
          return (
            <Line
              key={`cut-${i}`}
              x1={cx}
              y1={cy}
              x2={p1.x}
              y2={p1.y}
              stroke="rgba(180,83,9,0.45)"
              strokeWidth={1.2}
            />
          );
        })}

        {/* Boş dilimler için "yenmiş/eksik" kapatıcı (gri saydam) */}
        {slices.map((s, i) => {
          if (s.filled) return null;
          const start = polar(cx, cy, sauceR, s.startAngle);
          const end = polar(cx, cy, sauceR, s.endAngle);
          const largeArc = s.endAngle - s.startAngle > 180 ? 1 : 0;
          const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${sauceR} ${sauceR} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
          return (
            <G key={`empty-${i}`}>
              <Path
                d={path}
                fill={s.isReward ? "rgba(252,211,77,0.55)" : "rgba(243,244,246,0.88)"}
                stroke={s.isReward ? "#f59e0b" : "#d1d5db"}
                strokeWidth={1.2}
                strokeDasharray={!s.isReward ? "5,4" : ""}
              />
              {/* Reward yıldızı */}
              {s.isReward && (
                <Polygon
                  points={starPoints(
                    polar(cx, cy, sauceR * 0.55, (s.startAngle + s.endAngle) / 2).x,
                    polar(cx, cy, sauceR * 0.55, (s.startAngle + s.endAngle) / 2).y,
                    14,
                    6,
                    5,
                  )}
                  fill="#fbbf24"
                  stroke="#92400e"
                  strokeWidth={1.5}
                />
              )}
            </G>
          );
        })}

        {/* Topping'ler — sadece dolu dilimlerde, ZENGİN */}
        {slices.map((s, i) => {
          if (!s.filled) return null;
          const midAngle = (s.startAngle + s.endAngle) / 2;
          const spread = (360 / target) * 0.75;
          return (
            <PizzaToppings
              key={`top-${i}`}
              cx={cx}
              cy={cy}
              innerR={sauceR - 2}
              midAngle={midAngle}
              spread={spread}
              variant={s.idx % 4}
            />
          );
        })}

        {/* Crust üzerinde uneven yanmış benekler (gerçekçi pizza kenarı) */}
        {Array.from({ length: 28 }).map((_, i) => {
          const angle = (i * 360) / 28 + (i % 3) * 4;
          const dist = crustOuter - 4 - (i % 4);
          const p = polar(cx, cy, dist, angle);
          const sz = 0.8 + ((i * 7) % 3) * 0.6;
          return (
            <Circle
              key={`burn-${i}`}
              cx={p.x}
              cy={p.y}
              r={sz}
              fill={i % 2 === 0 ? "#451a03" : "#7c2d12"}
              opacity={0.7}
            />
          );
        })}

        {/* Crust iç kenarında peynir taşması (kabarcıklar) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12 + 12;
          const p = polar(cx, cy, sauceR + 1, angle);
          return <Circle key={`bub-${i}`} cx={p.x} cy={p.y} r={2} fill="#fef9c3" opacity={0.7} />;
        })}

        {/* Merkez ödül marker'ı (tüm dilimler dolduğunda) */}
        {count >= target && (
          <Circle cx={cx} cy={cy} r={36} fill="#10b981" stroke="#fff" strokeWidth={5} />
        )}
      </Svg>
      {count >= target && (
        <View
          style={{
            position: "absolute",
            top: size / 2 - 18,
            left: size / 2 - 18,
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 28 }}>🎉</Text>
        </View>
      )}
    </View>
  );
}

/**
 * PizzaToppings — bir dilimin içine zengin pizza topping'leri
 * variant 0..3: farklı dilimler farklı topping kombinasyonları (gerçek bir pizza gibi)
 */
function PizzaToppings({
  cx,
  cy,
  innerR,
  midAngle,
  spread,
  variant,
}: {
  cx: number;
  cy: number;
  innerR: number;
  midAngle: number;
  spread: number;
  variant: number;
}) {
  const elements: ReactElement[] = [];

  // Her dilime: 3-4 büyük sucuk + ek topping (variant'a göre)
  // Sucuk pozisyonları (mesafe, açı offset, yarıçap)
  const pepperoni = [
    { d: 0.45, a: midAngle - spread * 0.3, r: 9 },
    { d: 0.62, a: midAngle + spread * 0.18, r: 8 },
    { d: 0.78, a: midAngle - spread * 0.1, r: 7.5 },
    { d: 0.55, a: midAngle + spread * 0.32, r: 6.5 },
  ];
  pepperoni.forEach((pc, i) => {
    const p = polar(cx, cy, innerR * pc.d, pc.a);
    elements.push(
      <G key={`pep-${i}`}>
        {/* Sucuk gölgesi (3D efekt) */}
        <Circle cx={p.x + 0.8} cy={p.y + 1.2} r={pc.r + 0.5} fill="#000" opacity={0.18} />
        {/* Sucuk gövdesi */}
        <Circle cx={p.x} cy={p.y} r={pc.r} fill="url(#pepperoniRad)" />
        {/* Yağ benekleri (gerçek sucuk gibi) */}
        <Circle cx={p.x - pc.r * 0.35} cy={p.y - pc.r * 0.3} r={pc.r * 0.18} fill="#fff7ed" opacity={0.85} />
        <Circle cx={p.x + pc.r * 0.25} cy={p.y + pc.r * 0.35} r={pc.r * 0.13} fill="#fff7ed" opacity={0.7} />
        <Circle cx={p.x - pc.r * 0.1} cy={p.y + pc.r * 0.4} r={pc.r * 0.1} fill="#fff7ed" opacity={0.6} />
      </G>,
    );
  });

  // Variant 1: zeytin halkaları (gerçek siyah zeytin görünümü)
  if (variant === 1) {
    const olives = [
      { d: 0.55, a: midAngle - spread * 0.18, r: 4.5 },
      { d: 0.72, a: midAngle + spread * 0.3, r: 4 },
      { d: 0.4, a: midAngle + spread * 0.1, r: 3.5 },
    ];
    olives.forEach((o, i) => {
      const p = polar(cx, cy, innerR * o.d, o.a);
      elements.push(
        <G key={`oli-${i}`}>
          {/* Zeytin gölgesi */}
          <Circle cx={p.x + 0.5} cy={p.y + 0.7} r={o.r + 0.3} fill="#000" opacity={0.2} />
          {/* Zeytin gövdesi (halka) */}
          <Circle cx={p.x} cy={p.y} r={o.r} fill="url(#oliveRad)" />
          {/* Zeytin orta deliği (halka için) */}
          <Circle cx={p.x} cy={p.y} r={o.r * 0.42} fill="#dc2626" opacity={0.5} />
          {/* Parlak nokta */}
          <Circle cx={p.x - o.r * 0.3} cy={p.y - o.r * 0.3} r={o.r * 0.18} fill="#fff" opacity={0.4} />
        </G>,
      );
    });
  }

  // Variant 2: mantar dilimleri (Y şeklinde)
  if (variant === 2) {
    const mushrooms = [
      { d: 0.6, a: midAngle + spread * 0.22, sz: 6 },
      { d: 0.5, a: midAngle - spread * 0.28, sz: 5 },
    ];
    mushrooms.forEach((m, i) => {
      const p = polar(cx, cy, innerR * m.d, m.a);
      elements.push(
        <G key={`mush-${i}`}>
          {/* Mantar şapkası */}
          <Path
            d={`M ${p.x - m.sz} ${p.y} Q ${p.x} ${p.y - m.sz * 0.9}, ${p.x + m.sz} ${p.y} Z`}
            fill="url(#mushroomRad)"
            stroke="#a8a29e"
            strokeWidth={0.8}
          />
          {/* Mantar sapı */}
          <Rect
            x={p.x - m.sz * 0.25}
            y={p.y}
            width={m.sz * 0.5}
            height={m.sz * 0.55}
            fill="#fafaf9"
            stroke="#a8a29e"
            strokeWidth={0.5}
            rx={1}
          />
        </G>,
      );
    });
  }

  // Variant 3: yeşil fesleğen yaprakları
  if (variant === 3) {
    const basil = [
      { d: 0.55, a: midAngle + spread * 0.25, rot: 30 },
      { d: 0.7, a: midAngle - spread * 0.2, rot: -45 },
      { d: 0.42, a: midAngle - spread * 0.12, rot: 15 },
    ];
    basil.forEach((b, i) => {
      const p = polar(cx, cy, innerR * b.d, b.a);
      // Oval yaprak şekli
      elements.push(
        <G key={`bas-${i}`}>
          <Ellipse
            cx={p.x}
            cy={p.y}
            rx={4.5}
            ry={2.2}
            fill="#16a34a"
            transform={`rotate(${b.rot}, ${p.x}, ${p.y})`}
          />
          <Ellipse
            cx={p.x}
            cy={p.y - 0.5}
            rx={2.5}
            ry={1}
            fill="#22c55e"
            transform={`rotate(${b.rot}, ${p.x}, ${p.y})`}
            opacity={0.7}
          />
        </G>,
      );
    });
  }

  // Variant 0: bonus peynir benekleri (mozzarella parçaları)
  if (variant === 0) {
    const cheeseChunks = [
      { d: 0.5, a: midAngle - spread * 0.4, sz: 3 },
      { d: 0.66, a: midAngle + spread * 0.4, sz: 2.5 },
      { d: 0.85, a: midAngle + spread * 0.05, sz: 2 },
    ];
    cheeseChunks.forEach((c, i) => {
      const p = polar(cx, cy, innerR * c.d, c.a);
      elements.push(
        <G key={`ch-${i}`}>
          <Circle cx={p.x} cy={p.y} r={c.sz} fill="#fff" opacity={0.95} />
          <Circle cx={p.x - c.sz * 0.3} cy={p.y - c.sz * 0.3} r={c.sz * 0.4} fill="#fff" opacity={0.8} />
        </G>,
      );
    });
  }

  return <G>{elements}</G>;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/* --------------------------------------------------------------- */
/*                  2) BURGER — layer stack                        */
/* --------------------------------------------------------------- */
function BurgerStack({ count, target, color }: { count: number; target: number; color: string }) {
  // Burger katmanları — alt bun → tabak/patty/cheese/lettuce → üst bun
  // target sayısına bölelim, count kadar üstten dolu
  const w = 220;
  const layerH = 18;
  const totalH = (target + 2) * layerH + 16; // +bun top/bottom

  const layers = Array.from({ length: target }, (_, i) => {
    // Sondan başa doğru dolar (alttan üste)
    const filled = i < count;
    return { filled, isReward: i === target - 1 };
  }).reverse(); // En üstte reward

  return (
    <View className="items-center" style={{ width: w, height: totalH }}>
      <Svg width={w} height={totalH}>
        <Defs>
          <LinearGradient id="bunTop" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fde68a" />
            <Stop offset="1" stopColor="#d97706" />
          </LinearGradient>
          <LinearGradient id="bunBottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#d97706" />
            <Stop offset="1" stopColor="#92400e" />
          </LinearGradient>
        </Defs>

        {/* Top bun */}
        <Path
          d={`M 30 ${layerH + 8} Q ${w / 2} -8 ${w - 30} ${layerH + 8} L ${w - 30} ${layerH + 16} L 30 ${layerH + 16} Z`}
          fill="url(#bunTop)"
        />
        {/* Sesame seeds */}
        <Circle cx={w / 2 - 30} cy={layerH - 2} r={2} fill="#fef3c7" />
        <Circle cx={w / 2} cy={layerH - 6} r={2} fill="#fef3c7" />
        <Circle cx={w / 2 + 30} cy={layerH - 2} r={2} fill="#fef3c7" />

        {/* Layers */}
        {layers.map((l, i) => {
          const y = (i + 2) * layerH - 4;
          const colors = layerColor(i, target, l.filled, l.isReward, color);
          return (
            <G key={i}>
              <Rect x={20} y={y} width={w - 40} height={layerH - 2} rx={4} fill={colors.bg} stroke={colors.border} strokeWidth={1.2} />
              {l.filled && (
                <Circle cx={w - 32} cy={y + (layerH - 2) / 2} r={4} fill="#10b981" />
              )}
              {l.isReward && !l.filled && (
                <Path
                  d={`M ${w / 2 - 6} ${y + 4} L ${w / 2 + 6} ${y + 4} L ${w / 2 + 6} ${y + layerH - 6} L ${w / 2 - 6} ${y + layerH - 6} Z`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              )}
            </G>
          );
        })}

        {/* Bottom bun */}
        <Path
          d={`M 30 ${(target + 2) * layerH - 4} Q ${w / 2} ${(target + 2) * layerH + 12} ${w - 30} ${(target + 2) * layerH - 4} L ${w - 30} ${(target + 2) * layerH - 8} L 30 ${(target + 2) * layerH - 8} Z`}
          fill="url(#bunBottom)"
        />
      </Svg>
    </View>
  );
}

function layerColor(idx: number, target: number, filled: boolean, isReward: boolean, themeColor: string) {
  if (isReward) {
    return { bg: filled ? "#fde047" : "#fef3c7", border: "#f59e0b" };
  }
  if (filled) {
    // Renk paleti: et/peynir/marul/domates
    const palette = ["#dc2626", "#fbbf24", "#22c55e", "#ef4444", "#fde047", "#16a34a"];
    return { bg: palette[idx % palette.length], border: themeColor };
  }
  return { bg: "#f3f4f6", border: "#d1d5db" };
}

/* --------------------------------------------------------------- */
/*                  3) PASTA / SOUP — bowl fill                    */
/* --------------------------------------------------------------- */
function PastaBowl({ count, target, color }: { count: number; target: number; color: string }) {
  const size = 200;
  const cx = size / 2;
  const bowlTop = 30;
  const bowlBottom = size - 16;
  const bowlW = size - 24;
  const bowlH = bowlBottom - bowlTop;

  const fillPct = count / target;
  // Bowl içinde sıvı/makarna seviyesi — yukarıdan aşağı doğru dolar
  const liquidTop = bowlTop + 8 + (1 - fillPct) * (bowlH - 12);

  return (
    <View className="items-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="pastaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fbbf24" />
            <Stop offset="1" stopColor="#d97706" />
          </LinearGradient>
          <LinearGradient id="bowlOuter" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#e5e7eb" />
            <Stop offset="1" stopColor="#9ca3af" />
          </LinearGradient>
          <ClipPath id="bowlClip">
            <Path
              d={`M ${cx - bowlW / 2 + 12} ${bowlTop + 8}
                  Q ${cx} ${bowlBottom + 30}, ${cx + bowlW / 2 - 12} ${bowlTop + 8}
                  Z`}
            />
          </ClipPath>
        </Defs>

        {/* Steam */}
        <Path d={`M ${cx - 18} ${bowlTop - 16} Q ${cx - 22} ${bowlTop - 24} ${cx - 14} ${bowlTop - 32}`}
          fill="none" stroke="#cbd5e1" strokeWidth={2} strokeLinecap="round" />
        <Path d={`M ${cx} ${bowlTop - 18} Q ${cx + 4} ${bowlTop - 26} ${cx - 4} ${bowlTop - 36}`}
          fill="none" stroke="#cbd5e1" strokeWidth={2} strokeLinecap="round" />
        <Path d={`M ${cx + 18} ${bowlTop - 16} Q ${cx + 22} ${bowlTop - 24} ${cx + 14} ${bowlTop - 32}`}
          fill="none" stroke="#cbd5e1" strokeWidth={2} strokeLinecap="round" />

        {/* Bowl rim */}
        <Path
          d={`M ${cx - bowlW / 2} ${bowlTop}
              L ${cx + bowlW / 2} ${bowlTop}
              L ${cx + bowlW / 2 - 12} ${bowlTop + 16}
              L ${cx - bowlW / 2 + 12} ${bowlTop + 16}
              Z`}
          fill="#9ca3af"
        />

        {/* Bowl body */}
        <Path
          d={`M ${cx - bowlW / 2 + 12} ${bowlTop + 8}
              Q ${cx} ${bowlBottom + 30}, ${cx + bowlW / 2 - 12} ${bowlTop + 8}
              Z`}
          fill="url(#bowlOuter)"
          stroke="#6b7280"
          strokeWidth={2}
        />

        {/* Liquid fill (clipped to bowl shape) */}
        <G clipPath="url(#bowlClip)">
          {fillPct > 0 && (
            <>
              <Rect
                x={cx - bowlW / 2}
                y={liquidTop}
                width={bowlW}
                height={bowlH}
                fill="url(#pastaFill)"
              />
              {/* Wave on top */}
              <Path
                d={`M ${cx - bowlW / 2} ${liquidTop}
                    Q ${cx - bowlW / 4} ${liquidTop - 4}, ${cx} ${liquidTop}
                    T ${cx + bowlW / 2} ${liquidTop} L ${cx + bowlW / 2} ${liquidTop + 4} L ${cx - bowlW / 2} ${liquidTop + 4} Z`}
                fill="#fbbf24"
                opacity={0.8}
              />
            </>
          )}
        </G>

        {/* Reward star when full */}
        {count >= target && (
          <G>
            <Polygon
              points={starPoints(cx, bowlTop + 24, 14, 6, 5)}
              fill="#fbbf24"
              stroke="#92400e"
              strokeWidth={1.5}
            />
          </G>
        )}

        {/* Slot ticks on rim — target adımlı işaretler */}
        {Array.from({ length: target + 1 }).map((_, i) => {
          const tx = cx - bowlW / 2 + (i * bowlW) / target;
          return (
            <Line
              key={i}
              x1={tx}
              y1={bowlTop - 4}
              x2={tx}
              y2={bowlTop + 4}
              stroke={i <= count ? color : "#9ca3af"}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function starPoints(cx: number, cy: number, rOuter: number, rInner: number, points: number) {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    out.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return out.join(" ");
}

/* --------------------------------------------------------------- */
/*                  4) DRINKS — cups row                           */
/* --------------------------------------------------------------- */
function CupsRow({ count, target, color }: { count: number; target: number; color: string }) {
  // Maks 8 cup yan yana, sonra 2 satır
  const perRow = target > 8 ? Math.ceil(target / 2) : target;
  const rows = Math.ceil(target / perRow);
  const cupW = Math.floor(220 / perRow) - 4;
  const cupH = cupW * 1.4;
  const totalW = perRow * (cupW + 4);
  const totalH = rows * (cupH + 8);

  return (
    <View className="items-center" style={{ width: totalW, height: totalH }}>
      <Svg width={totalW} height={totalH}>
        <Defs>
          <LinearGradient id="cupFillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.8} />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
        </Defs>

        {Array.from({ length: target }).map((_, i) => {
          const row = Math.floor(i / perRow);
          const col = i % perRow;
          const x = col * (cupW + 4) + 2;
          const y = row * (cupH + 8) + 2;
          const filled = i < count;
          const isReward = i === target - 1;
          return (
            <G key={i}>
              {/* Lid */}
              <Rect
                x={x}
                y={y}
                width={cupW}
                height={6}
                rx={2}
                fill={filled ? color : "#9ca3af"}
              />
              {/* Body trapezoid */}
              <Path
                d={`M ${x + 2} ${y + 8}
                    L ${x + cupW - 2} ${y + 8}
                    L ${x + cupW - 6} ${y + cupH - 4}
                    L ${x + 6} ${y + cupH - 4}
                    Z`}
                fill={isReward ? "#fef3c7" : "#fff"}
                stroke={filled ? color : "#d1d5db"}
                strokeWidth={2}
                strokeDasharray={!filled && isReward ? "3,3" : ""}
              />
              {/* Liquid inside */}
              {filled && (
                <Path
                  d={`M ${x + 4} ${y + 14}
                      L ${x + cupW - 4} ${y + 14}
                      L ${x + cupW - 6} ${y + cupH - 6}
                      L ${x + 6} ${y + cupH - 6}
                      Z`}
                  fill="url(#cupFillGrad)"
                />
              )}
              {/* Straw / star */}
              {isReward ? (
                <G>
                  <Polygon
                    points={starPoints(x + cupW / 2, y + cupH / 2 + 2, 8, 3, 5)}
                    fill={filled ? "#f59e0b" : "#fbbf2433"}
                    stroke="#f59e0b"
                    strokeWidth={1.2}
                  />
                </G>
              ) : (
                <Line
                  x1={x + cupW / 2}
                  y1={y - 4}
                  x2={x + cupW / 2}
                  y2={y + 4}
                  stroke={filled ? "#f87171" : "#d1d5db"}
                  strokeWidth={2}
                />
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/* --------------------------------------------------------------- */
/*                  5) HEX HONEYCOMB                               */
/* --------------------------------------------------------------- */
function HexHoneycomb({ count, target, color }: { count: number; target: number; color: string }) {
  // Hex peteği — ızgara
  const cols = Math.min(5, Math.ceil(Math.sqrt(target)));
  const rows = Math.ceil(target / cols);
  const hexW = 44;
  const hexH = 50;
  const totalW = cols * hexW + (hexW / 2) + 8;
  const totalH = rows * (hexH * 0.85) + 16;

  const hexes: Array<{ cx: number; cy: number; filled: boolean; isReward: boolean }> = [];
  for (let i = 0; i < target; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cx = col * hexW + hexW / 2 + (row % 2 === 1 ? hexW / 2 : 0) + 4;
    const cy = row * (hexH * 0.85) + hexH / 2 + 4;
    hexes.push({ cx, cy, filled: i < count, isReward: i === target - 1 });
  }

  return (
    <View className="items-center" style={{ width: totalW, height: totalH }}>
      <Svg width={totalW} height={totalH}>
        <Defs>
          <LinearGradient id="hexFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.85} />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
        </Defs>
        {hexes.map((h, i) => (
          <G key={i}>
            <Polygon
              points={hexPoints(h.cx, h.cy, hexW / 2 - 2)}
              fill={
                h.isReward
                  ? h.filled
                    ? "#fbbf24"
                    : "#fef3c7"
                  : h.filled
                  ? "url(#hexFill)"
                  : "#f3f4f6"
              }
              stroke={
                h.isReward ? "#f59e0b" : h.filled ? color : "#d1d5db"
              }
              strokeWidth={h.isReward ? 2.5 : 1.5}
              strokeDasharray={h.isReward && !h.filled ? "3,2" : ""}
            />
            {h.filled && !h.isReward && (
              <Path
                d={`M ${h.cx - 5} ${h.cy} L ${h.cx - 1} ${h.cy + 4} L ${h.cx + 5} ${h.cy - 3}`}
                stroke="#fff"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {h.isReward && (
              <Polygon
                points={starPoints(h.cx, h.cy, 8, 3, 5)}
                fill={h.filled ? "#fff" : "#fbbf24"}
              />
            )}
          </G>
        ))}
      </Svg>
    </View>
  );
}

function hexPoints(cx: number, cy: number, r: number) {
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    out.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return out.join(" ");
}

/* --------------------------------------------------------------- */
/*                  6) DOTS (klasik)                               */
/* --------------------------------------------------------------- */
function DotsRow({ count, target, color }: { count: number; target: number; color: string }) {
  const items = Array.from({ length: target }, (_, i) => i);
  return (
    <View className="flex-row items-center" style={{ paddingHorizontal: 8 }}>
      {items.map((i) => {
        const filled = i < count;
        const isReward = i === target - 1;
        const size = isReward ? 40 : 28;
        return (
          <View key={i} className="flex-row items-center" style={{ flex: isReward ? 0 : 1 }}>
            <View
              style={{
                width: size,
                height: size,
                backgroundColor: filled
                  ? color
                  : isReward
                  ? "#fef3c7"
                  : "#f3f4f6",
                borderWidth: 2,
                borderColor: isReward ? "#f59e0b" : filled ? color : "#d1d5db",
                borderStyle: isReward && !filled ? "dashed" : "solid",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: size / 2,
              }}
            >
              {isReward ? (
                <Text style={{ fontSize: 18 }}>{filled ? "🎉" : "🎁"}</Text>
              ) : filled ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={{ color: "#9ca3af", fontSize: 11, fontWeight: "700" }}>
                  {i + 1}
                </Text>
              )}
            </View>
            {!isReward && (
              <View
                style={{ height: 3, flex: 1, marginHorizontal: 3, backgroundColor: "#e5e7eb", borderRadius: 2 }}
              >
                <View
                  style={{
                    width: filled ? "100%" : "0%",
                    height: "100%",
                    backgroundColor: color,
                    borderRadius: 2,
                  }}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
