// Mobile Loyalty Card Visuals — her tip için tematik SVG illüstrasyon
// CashbackCoin / BirthdayCake / FireFlame / GiftBox / TrophyLadder / vs.

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
  Ellipse,
  Line,
  Text as SvgText,
} from "react-native-svg";

/* ──────────────────────────────────────────────────────────────── */
/*  1) CASHBACK — Coin stack + cüzdan (3D)                          */
/* ──────────────────────────────────────────────────────────────── */
export function CashbackVisual({ balance, color = "#22c55e" }: { balance: number; color?: string }) {
  const size = 180;
  const cx = size / 2;
  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="cbGoldRad" cx="35%" cy="30%" rx="60%" ry="60%">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="0.5" stopColor="#fbbf24" />
            <Stop offset="1" stopColor="#b45309" />
          </RadialGradient>
          <LinearGradient id="cbGreenGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#22c55e" />
            <Stop offset="1" stopColor="#15803d" />
          </LinearGradient>
        </Defs>

        {/* Yığılan paralar (3 kat) */}
        {[0, 1, 2].map((i) => {
          const cy = size - 40 - i * 14;
          return (
            <G key={i}>
              <Ellipse cx={cx} cy={cy + 4} rx={42} ry={5} fill="#000" opacity={0.15} />
              <Ellipse cx={cx} cy={cy} rx={44} ry={10} fill="url(#cbGoldRad)" />
              <Ellipse cx={cx} cy={cy - 2} rx={44} ry={10} fill="none" stroke="#92400e" strokeWidth={1.5} />
              {/* ₺ işareti */}
              <Text
                style={{
                  position: "absolute",
                  fontSize: 14,
                  fontWeight: "900",
                  color: "#92400e",
                }}
              />
            </G>
          );
        })}

        {/* En üstteki paranın yüzü ₺ */}
        <Circle cx={cx} cy={size - 70} r={28} fill="url(#cbGoldRad)" stroke="#92400e" strokeWidth={2.5} />
        <Circle cx={cx} cy={size - 70} r={22} fill="none" stroke="#fef3c7" strokeWidth={1} opacity={0.6} />

        {/* Cüzdan */}
        <Path
          d={`M ${cx - 60} 22 L ${cx + 60} 22 Q ${cx + 70} 22 ${cx + 70} 32 L ${cx + 70} 76 Q ${cx + 70} 86 ${cx + 60} 86 L ${cx - 60} 86 Q ${cx - 70} 86 ${cx - 70} 76 L ${cx - 70} 32 Q ${cx - 70} 22 ${cx - 60} 22 Z`}
          fill="url(#cbGreenGrad)"
        />
        {/* Cüzdan klipsi */}
        <Rect x={cx + 40} y={48} width={20} height={14} rx={3} fill="#15803d" stroke="#fef3c7" strokeWidth={1.5} />
        {/* Cüzdandan akan altın akış */}
        <Path
          d={`M ${cx} 86 L ${cx - 6} 100 L ${cx + 6} 100 Z`}
          fill="#fbbf24"
        />
      </Svg>
      {/* ₺ overlay */}
      <View
        style={{
          position: "absolute",
          top: size - 84,
          left: cx - 14,
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#92400e" }}>₺</Text>
      </View>
      {/* Balance text */}
      <View className="absolute" style={{ top: 32, alignSelf: "center" }}>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}>
          {balance.toFixed(0)} ₺
        </Text>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  2) BIRTHDAY — Pasta + N mum (yaş)                                */
/* ──────────────────────────────────────────────────────────────── */
export function BirthdayCakeVisual({ candles = 5, color = "#a855f7" }: { candles?: number; color?: string }) {
  const size = 200;
  const cx = size / 2;
  const cakeBottom = size - 24;
  const candleCount = Math.min(8, Math.max(1, candles));

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="cakeBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="1" stopColor="#d97706" />
          </LinearGradient>
          <LinearGradient id="frosting" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#f9a8d4" />
            <Stop offset="1" stopColor="#db2777" />
          </LinearGradient>
          <LinearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="0.5" stopColor="#fbbf24" />
            <Stop offset="1" stopColor="#dc2626" />
          </LinearGradient>
        </Defs>

        {/* Tabak */}
        <Ellipse cx={cx} cy={cakeBottom + 6} rx={90} ry={10} fill="#e2e8f0" />
        <Ellipse cx={cx} cy={cakeBottom + 4} rx={88} ry={7} fill="#cbd5e1" />

        {/* Alt kat */}
        <Rect x={cx - 70} y={cakeBottom - 50} width={140} height={50} fill="url(#cakeBase)" rx={4} />
        {/* Krema damlaları */}
        {Array.from({ length: 7 }).map((_, i) => (
          <Path
            key={`drip-${i}`}
            d={`M ${cx - 60 + i * 20} ${cakeBottom - 50}
                Q ${cx - 55 + i * 20} ${cakeBottom - 35}, ${cx - 50 + i * 20} ${cakeBottom - 50}`}
            fill="url(#frosting)"
            stroke="#9d174d"
            strokeWidth={0.6}
          />
        ))}
        {/* Renkli toz şeker */}
        {Array.from({ length: 14 }).map((_, i) => {
          const x = cx - 60 + (i * 9) % 130;
          const y = cakeBottom - 25 + (i * 3) % 18;
          const colors = ["#ef4444", "#3b82f6", "#10b981", "#fbbf24", "#a855f7"];
          return <Circle key={`spr-${i}`} cx={x} cy={y} r={2} fill={colors[i % 5]} />;
        })}

        {/* Üst kat */}
        <Rect x={cx - 50} y={cakeBottom - 90} width={100} height={40} fill="url(#frosting)" rx={3} />

        {/* Mumlar */}
        {Array.from({ length: candleCount }).map((_, i) => {
          const spacing = 80 / Math.max(candleCount, 1);
          const x = cx - 40 + spacing * i + spacing / 2 - 4;
          const y = cakeBottom - 90;
          return (
            <G key={`candle-${i}`}>
              {/* Mum gövdesi */}
              <Rect x={x - 2} y={y - 25} width={4} height={25} fill={i % 2 === 0 ? "#fbbf24" : "#a855f7"} />
              <Rect x={x - 2} y={y - 25 + 8} width={4} height={1} fill="#fff" opacity={0.5} />
              {/* Fitil */}
              <Line x1={x} y1={y - 25} x2={x} y2={y - 30} stroke="#171717" strokeWidth={1} />
              {/* Alev */}
              <Path
                d={`M ${x} ${y - 30}
                    Q ${x - 4} ${y - 35}, ${x} ${y - 42}
                    Q ${x + 4} ${y - 35}, ${x} ${y - 30} Z`}
                fill="url(#flame)"
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  3) STREAK — Alev (büyüklük seri sayısına göre değişir)          */
/* ──────────────────────────────────────────────────────────────── */
export function StreakFireVisual({ streak = 0, color = "#ef4444" }: { streak?: number; color?: string }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  // Streak büyüdükçe alev büyür: 0→küçük, 10+→büyük
  const scale = Math.min(1.4, 0.6 + streak * 0.08);

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="flameRad" cx="50%" cy="60%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="0.4" stopColor="#fbbf24" />
            <Stop offset="0.7" stopColor="#dc2626" />
            <Stop offset="1" stopColor="#7f1d1d" stopOpacity={0.7} />
          </RadialGradient>
          <RadialGradient id="emberRad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#fbbf24" />
            <Stop offset="1" stopColor="#7f1d1d" />
          </RadialGradient>
        </Defs>

        {/* Logs (alttaki odun) */}
        <Ellipse cx={cx} cy={cy + 50} rx={40} ry={5} fill="#000" opacity={0.2} />
        <Rect x={cx - 36} y={cy + 38} width={72} height={10} rx={4} fill="#7c2d12" />
        <Rect x={cx - 30} y={cy + 30} width={60} height={10} rx={4} fill="#92400e" transform={`rotate(-8 ${cx} ${cy + 35})`} />
        <Rect x={cx - 28} y={cy + 32} width={56} height={10} rx={4} fill="#a16207" transform={`rotate(12 ${cx} ${cy + 37})`} />

        {/* Ana alev */}
        <G transform={`translate(${cx}, ${cy + 30}) scale(${scale}) translate(${-cx}, ${-cy - 30})`}>
          <Path
            d={`M ${cx} ${cy + 40}
                C ${cx - 36} ${cy + 20}, ${cx - 36} ${cy - 30}, ${cx - 14} ${cy - 30}
                C ${cx - 12} ${cy - 5}, ${cx - 24} ${cy - 35}, ${cx - 6} ${cy - 50}
                C ${cx - 6} ${cy - 30}, ${cx + 6} ${cy - 70}, ${cx + 4} ${cy - 50}
                C ${cx + 14} ${cy - 35}, ${cx + 26} ${cy - 60}, ${cx + 18} ${cy - 30}
                C ${cx + 36} ${cy - 30}, ${cx + 36} ${cy + 20}, ${cx} ${cy + 40} Z`}
            fill="url(#flameRad)"
          />
          {/* İç sarı çekirdek */}
          <Path
            d={`M ${cx} ${cy + 30}
                C ${cx - 18} ${cy + 15}, ${cx - 18} ${cy - 10}, ${cx - 6} ${cy - 15}
                C ${cx - 4} ${cy - 5}, ${cx - 8} ${cy - 25}, ${cx} ${cy - 35}
                C ${cx} ${cy - 25}, ${cx + 4} ${cy - 30}, ${cx + 6} ${cy - 15}
                C ${cx + 18} ${cy - 10}, ${cx + 18} ${cy + 15}, ${cx} ${cy + 30} Z`}
            fill="#fef3c7"
            opacity={0.85}
          />
        </G>

        {/* Kıvılcımlar */}
        {streak > 3 && Array.from({ length: 5 }).map((_, i) => {
          const angle = i * 72 + 30;
          const dist = 60 + (i % 2) * 10;
          const x = cx + Math.cos((angle * Math.PI) / 180) * dist;
          const y = cy - 20 + Math.sin((angle * Math.PI) / 180) * dist * 0.3;
          return <Circle key={`sp-${i}`} cx={x} cy={y} r={2 + (i % 2)} fill="url(#emberRad)" />;
        })}
      </Svg>

      {/* Streak rakamı (alev üzerinde) */}
      <View
        style={{
          position: "absolute",
          top: cy - 6,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 32, fontWeight: "900", color: "#fff", textShadowColor: "rgba(220,38,38,0.9)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }}>
          {streak}
        </Text>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  4) WELCOME — Açılan hediye kutusu                               */
/* ──────────────────────────────────────────────────────────────── */
export function GiftBoxVisual({ color = "#3b82f6" }: { color?: string }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="boxBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#60a5fa" />
            <Stop offset="1" stopColor="#1e40af" />
          </LinearGradient>
          <LinearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fbbf24" />
            <Stop offset="1" stopColor="#d97706" />
          </LinearGradient>
        </Defs>

        {/* Gölge */}
        <Ellipse cx={cx} cy={cy + 60} rx={60} ry={6} fill="#000" opacity={0.2} />

        {/* Alt kutu */}
        <Rect x={cx - 50} y={cy - 10} width={100} height={70} fill="url(#boxBody)" rx={6} />
        {/* Dikey kurdele */}
        <Rect x={cx - 8} y={cy - 10} width={16} height={70} fill="url(#ribbonGrad)" />

        {/* Üst kapak (hafif kalkık) */}
        <Path
          d={`M ${cx - 56} ${cy - 16} L ${cx + 56} ${cy - 16} L ${cx + 56} ${cy} L ${cx - 56} ${cy} Z`}
          fill="url(#boxBody)"
          transform={`rotate(-6 ${cx} ${cy - 8})`}
        />
        {/* Yatay kurdele kapakta */}
        <Rect
          x={cx - 56}
          y={cy - 16}
          width={112}
          height={4}
          fill="url(#ribbonGrad)"
          transform={`rotate(-6 ${cx} ${cy - 14})`}
        />

        {/* Fiyonk */}
        <G transform={`translate(${cx}, ${cy - 30})`}>
          <Path d="M -14 0 Q -22 -10, -14 -16 Q -2 -10, 0 0 Q 2 -10, 14 -16 Q 22 -10, 14 0 Q 0 -6, -14 0 Z" fill="url(#ribbonGrad)" />
          <Circle cx={0} cy={-3} r={4} fill="#fbbf24" stroke="#92400e" strokeWidth={1} />
        </G>

        {/* Yıldız parıltıları */}
        {[
          { x: cx - 70, y: cy - 30, s: 6 },
          { x: cx + 60, y: cy - 50, s: 8 },
          { x: cx + 70, y: cy + 20, s: 5 },
          { x: cx - 60, y: cy + 30, s: 6 },
        ].map((sp, i) => (
          <Polygon
            key={`sk-${i}`}
            points={`${sp.x},${sp.y - sp.s} ${sp.x + sp.s * 0.4},${sp.y - sp.s * 0.4} ${sp.x + sp.s},${sp.y} ${sp.x + sp.s * 0.4},${sp.y + sp.s * 0.4} ${sp.x},${sp.y + sp.s} ${sp.x - sp.s * 0.4},${sp.y + sp.s * 0.4} ${sp.x - sp.s},${sp.y} ${sp.x - sp.s * 0.4},${sp.y - sp.s * 0.4}`}
            fill="#fef3c7"
            stroke="#fbbf24"
            strokeWidth={0.8}
          />
        ))}
      </Svg>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  5) REFERRAL — Bağlı insanlar (network)                          */
/* ──────────────────────────────────────────────────────────────── */
export function ReferralPeopleVisual({ count = 0, color = "#f59e0b" }: { count?: number; color?: string }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="meCircle" cx="50%" cy="40%" rx="55%" ry="55%">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="1" stopColor="#d97706" />
          </RadialGradient>
          <RadialGradient id="friendCircle" cx="50%" cy="40%" rx="55%" ry="55%">
            <Stop offset="0" stopColor="#dbeafe" />
            <Stop offset="1" stopColor="#3b82f6" />
          </RadialGradient>
        </Defs>

        {/* Çevredeki davet edilen 4 kişi (count'a göre dolu) */}
        {[0, 1, 2, 3].map((i) => {
          const angle = i * 90 + 45;
          const x = cx + Math.cos((angle * Math.PI) / 180) * 55;
          const y = cy + Math.sin((angle * Math.PI) / 180) * 55;
          const filled = i < count;
          return (
            <G key={`p-${i}`}>
              {/* Bağlantı çizgisi */}
              <Line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={filled ? color : "#d1d5db"}
                strokeWidth={2}
                strokeDasharray={!filled ? "4,3" : ""}
              />
              {/* Kafa */}
              <Circle
                cx={x}
                cy={y - 4}
                r={7}
                fill={filled ? "url(#friendCircle)" : "#f3f4f6"}
                stroke={filled ? "#1e40af" : "#d1d5db"}
                strokeWidth={1.5}
              />
              {/* Vücut */}
              <Path
                d={`M ${x - 9} ${y + 14} Q ${x} ${y + 4}, ${x + 9} ${y + 14} Z`}
                fill={filled ? "url(#friendCircle)" : "#f3f4f6"}
                stroke={filled ? "#1e40af" : "#d1d5db"}
                strokeWidth={1.5}
              />
              {filled && (
                <Polygon
                  points={`${x + 4},${y - 12} ${x + 6},${y - 8} ${x + 10},${y - 8} ${x + 7},${y - 5} ${x + 8},${y - 1} ${x + 4},${y - 4} ${x},${y - 1} ${x + 1},${y - 5} ${x - 2},${y - 8} ${x + 2},${y - 8}`}
                  fill="#fbbf24"
                  scale={0.6}
                />
              )}
            </G>
          );
        })}

        {/* Merkezdeki ben (büyük) */}
        <Circle cx={cx} cy={cy + 8} r={14} fill="url(#meCircle)" stroke="#92400e" strokeWidth={2} />
        <Path
          d={`M ${cx - 16} ${cy + 30} Q ${cx} ${cy + 16}, ${cx + 16} ${cy + 30} L ${cx + 16} ${cy + 36} L ${cx - 16} ${cy + 36} Z`}
          fill="url(#meCircle)"
          stroke="#92400e"
          strokeWidth={2}
        />
      </Svg>

      {/* Sayaç */}
      <View
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          backgroundColor: color,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 3,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>{count}</Text>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  6) MILESTONE — Trophy merdiveni                                 */
/* ──────────────────────────────────────────────────────────────── */
export function TrophyLadderVisual({
  current = 0,
  milestones = [5, 10, 20],
  color = "#ec4899",
}: {
  current?: number;
  milestones?: number[];
  color?: string;
}) {
  const size = 200;
  const stepHeight = (size - 30) / Math.max(3, milestones.length);

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="trGold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="0.5" stopColor="#fbbf24" />
            <Stop offset="1" stopColor="#92400e" />
          </LinearGradient>
        </Defs>

        {milestones.map((m, i) => {
          const y = size - 20 - i * stepHeight;
          const reached = current >= m;
          const w = 40 + i * 20;
          return (
            <G key={`m-${i}`}>
              {/* Basamak */}
              <Rect
                x={(size - w) / 2}
                y={y - 6}
                width={w}
                height={6}
                fill={reached ? color : "#e5e7eb"}
                rx={2}
              />
              {/* Trophy mini */}
              {i === milestones.length - 1 && reached && (
                <G transform={`translate(${size / 2}, ${y - 30})`}>
                  <Path
                    d="M -10 -16 Q -16 -16 -16 -10 Q -16 -4 -10 -2 L -10 6 L 10 6 L 10 -2 Q 16 -4 16 -10 Q 16 -16 10 -16 Z"
                    fill="url(#trGold)"
                    stroke="#92400e"
                    strokeWidth={1.5}
                  />
                  <Rect x={-6} y={6} width={12} height={4} fill="#92400e" />
                  <Rect x={-10} y={10} width={20} height={4} fill="#7c2d12" rx={1} />
                </G>
              )}
              {/* Hedef rakam */}
              <View
                style={{
                  position: "absolute",
                  top: y - 22,
                  left: size / 2 + w / 2 + 4,
                }}
              />
              <SvgText
                x={size / 2 + w / 2 + 6}
                y={y - 8}
                fontSize={11}
                fontWeight="700"
                fill={reached ? color : "#9ca3af"}
              >
                {String(m)}
              </SvgText>
            </G>
          );
        })}

        {/* Mevcut konum işaretçisi (yatay ok) */}
        <Polygon
          points={`8,${size - 14} 16,${size - 18} 16,${size - 10}`}
          fill={color}
        />
      </Svg>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  7) HAPPY HOUR — Saat dial (pulsing aktif saatte)                */
/* ──────────────────────────────────────────────────────────────── */
export function ClockDialVisual({
  startHour = 14,
  endHour = 17,
  multiplier = 2,
  color = "#06b6d4",
}: {
  startHour?: number;
  endHour?: number;
  multiplier?: number;
  color?: string;
}) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isActive = currentHour >= startHour && currentHour < endHour;

  // Hour to angle (12 o'clock = -90, clockwise)
  const hourToAngle = (h: number) => -90 + (h / 12) * 360;
  const startAng = hourToAngle(startHour % 12);
  const endAng = hourToAngle(endHour % 12);

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="clockBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff" />
            <Stop offset="1" stopColor="#e5e7eb" />
          </LinearGradient>
          <LinearGradient id="hhActive" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#06b6d4" />
            <Stop offset="1" stopColor="#0891b2" />
          </LinearGradient>
        </Defs>

        {/* Dış halka */}
        <Circle cx={cx} cy={cy} r={r + 6} fill={color} opacity={isActive ? 0.2 : 0.1} />
        <Circle cx={cx} cy={cy} r={r} fill="url(#clockBg)" stroke={color} strokeWidth={2.5} />

        {/* Aktif zaman dilimi */}
        {(() => {
          const start = polarPoint(cx, cy, r - 4, startAng);
          const end = polarPoint(cx, cy, r - 4, endAng);
          const largeArc = ((endAng - startAng + 360) % 360) > 180 ? 1 : 0;
          return (
            <Path
              d={`M ${cx} ${cy} L ${start.x} ${start.y} A ${r - 4} ${r - 4} 0 ${largeArc} 1 ${end.x} ${end.y} Z`}
              fill={isActive ? "url(#hhActive)" : color}
              opacity={isActive ? 0.85 : 0.35}
            />
          );
        })()}

        {/* Saat işaretleri */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * 360 - 90;
          const p1 = polarPoint(cx, cy, r - 6, angle);
          const p2 = polarPoint(cx, cy, r - 12, angle);
          return (
            <Line
              key={`tick-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#374151"
              strokeWidth={i % 3 === 0 ? 2 : 1}
            />
          );
        })}

        {/* Akrep (mevcut saat) */}
        {(() => {
          const ang = hourToAngle((currentHour) % 12);
          const tip = polarPoint(cx, cy, r - 22, ang);
          return (
            <G>
              <Line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="#171717" strokeWidth={3} strokeLinecap="round" />
              <Circle cx={cx} cy={cy} r={4} fill="#171717" />
            </G>
          );
        })()}

        {/* Multiplier badge */}
        <Circle cx={cx + 30} cy={cy + 30} r={18} fill={color} stroke="#fff" strokeWidth={2.5} />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: cy + 22,
          left: cx + 22,
          width: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{multiplier}x</Text>
      </View>
    </View>
  );
}

function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/* ──────────────────────────────────────────────────────────────── */
/*  8) PRODUCT VIP — Taç + ürün tabağı                              */
/* ──────────────────────────────────────────────────────────────── */
export function ProductCrownVisual({
  count = 0,
  required = 20,
  color = "#eab308",
}: {
  count?: number;
  required?: number;
  color?: string;
}) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const pct = Math.min(1, count / Math.max(1, required));

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="0.5" stopColor="#fbbf24" />
            <Stop offset="1" stopColor="#92400e" />
          </LinearGradient>
        </Defs>

        {/* Taç */}
        <Path
          d={`M ${cx - 50} ${cy - 30}
              L ${cx - 35} ${cy - 50}
              L ${cx - 18} ${cy - 35}
              L ${cx} ${cy - 60}
              L ${cx + 18} ${cy - 35}
              L ${cx + 35} ${cy - 50}
              L ${cx + 50} ${cy - 30}
              L ${cx + 50} ${cy - 14}
              L ${cx - 50} ${cy - 14}
              Z`}
          fill="url(#crownGrad)"
          stroke="#92400e"
          strokeWidth={2}
        />
        {/* Tac üzerinde mücevherler */}
        <Circle cx={cx - 35} cy={cy - 22} r={4} fill="#dc2626" />
        <Circle cx={cx} cy={cy - 22} r={5} fill="#3b82f6" />
        <Circle cx={cx + 35} cy={cy - 22} r={4} fill="#10b981" />
        {/* Tac alt çizgisi */}
        <Rect x={cx - 50} y={cy - 14} width={100} height={4} fill="#92400e" />

        {/* Tabak */}
        <Ellipse cx={cx} cy={cy + 30} rx={60} ry={10} fill="#e2e8f0" />
        <Ellipse cx={cx} cy={cy + 28} rx={60} ry={10} fill="none" stroke="#9ca3af" strokeWidth={1.5} />

        {/* Tabakta yıldız (premium içerik) */}
        <Polygon
          points={`${cx},${cy + 12} ${cx + 5},${cy + 22} ${cx + 16},${cy + 24} ${cx + 8},${cy + 32} ${cx + 10},${cy + 42} ${cx},${cy + 36} ${cx - 10},${cy + 42} ${cx - 8},${cy + 32} ${cx - 16},${cy + 24} ${cx - 5},${cy + 22}`}
          fill={color}
          stroke="#92400e"
          strokeWidth={1.5}
        />

        {/* Progress arc */}
        <Circle
          cx={cx}
          cy={cy + 30}
          r={50}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={4}
          strokeDasharray={`${Math.PI * 50} ${Math.PI * 50}`}
        />
        <Circle
          cx={cx}
          cy={cy + 30}
          r={50}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${Math.PI * 50 * pct} ${Math.PI * 50}`}
          strokeDashoffset={`${Math.PI * 25}`}
          strokeLinecap="round"
          opacity={0.85}
        />
      </Svg>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  9) TIER DISCOUNT — Elmas merdiven (BRONZE/SILVER/GOLD)          */
/* ──────────────────────────────────────────────────────────────── */
export function DiamondTierVisual({ tier = "BRONZE", color = "#0ea5e9" }: { tier?: string; color?: string }) {
  const size = 180;
  const cx = size / 2;
  const tiers = [
    { name: "BRONZE", color: "#92400e", y: 130 },
    { name: "SILVER", color: "#9ca3af", y: 90 },
    { name: "GOLD", color: "#fbbf24", y: 50 },
  ];
  const currentIdx = tiers.findIndex((t) => t.name === tier.toUpperCase());

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          {tiers.map((t, i) => (
            <LinearGradient key={`g-${i}`} id={`tier-${i}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.6} />
              <Stop offset="0.5" stopColor={t.color} />
              <Stop offset="1" stopColor={t.color} stopOpacity={0.7} />
            </LinearGradient>
          ))}
        </Defs>

        {tiers.map((t, i) => {
          const w = 48 - i * 8;
          const isCurrent = i === currentIdx;
          const isReached = i <= currentIdx;
          return (
            <G key={`d-${i}`}>
              {/* Elmas */}
              <Polygon
                points={`${cx},${t.y - 20} ${cx + w / 2},${t.y - 6} ${cx + w / 2 - 4},${t.y + 14} ${cx},${t.y + 26} ${cx - w / 2 + 4},${t.y + 14} ${cx - w / 2},${t.y - 6}`}
                fill={isReached ? `url(#tier-${i})` : "#f3f4f6"}
                stroke={isCurrent ? "#fff" : isReached ? t.color : "#d1d5db"}
                strokeWidth={isCurrent ? 3 : 2}
              />
              {/* Top facet */}
              <Polygon
                points={`${cx},${t.y - 20} ${cx + w / 2},${t.y - 6} ${cx},${t.y - 2} ${cx - w / 2},${t.y - 6}`}
                fill={isReached ? "#fff" : "#e5e7eb"}
                opacity={0.4}
              />
              {/* Tier name */}
              <SvgText x={cx} y={t.y + 4} fontSize={9} fontWeight="900" fill={isReached ? "#fff" : "#9ca3af"} textAnchor="middle">
                {t.name.charAt(0)}
              </SvgText>
              {isCurrent && (
                <Circle cx={cx + w / 2 + 8} cy={t.y + 3} r={4} fill={t.color} stroke="#fff" strokeWidth={1.5} />
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  10) BASIC POINTS — Yıldız sayacı                                */
/* ──────────────────────────────────────────────────────────────── */
export function StarCounterVisual({ points = 0, color = "#f97316" }: { points?: number; color?: string }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="bigStar" cx="50%" cy="40%" rx="55%" ry="55%">
            <Stop offset="0" stopColor="#fef3c7" />
            <Stop offset="0.6" stopColor="#fbbf24" />
            <Stop offset="1" stopColor="#b45309" />
          </RadialGradient>
        </Defs>

        {/* Arka plan ışıması */}
        <Circle cx={cx} cy={cy} r={60} fill={color} opacity={0.1} />
        <Circle cx={cx} cy={cy} r={50} fill={color} opacity={0.15} />

        {/* Büyük yıldız */}
        <Polygon
          points={starPolyPoints(cx, cy, 50, 22, 5)}
          fill="url(#bigStar)"
          stroke="#92400e"
          strokeWidth={2.5}
        />

        {/* Çevre küçük yıldızlar */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = i * 72;
          const x = cx + Math.cos((angle * Math.PI) / 180) * 75;
          const y = cy + Math.sin((angle * Math.PI) / 180) * 75;
          return (
            <Polygon
              key={`star-${i}`}
              points={starPolyPoints(x, y, 6, 2.5, 5)}
              fill="#fbbf24"
              stroke="#92400e"
              strokeWidth={1}
            />
          );
        })}
      </Svg>

      {/* Puan rakamı */}
      <View
        style={{
          position: "absolute",
          top: cy - 12,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "900", color: "#92400e" }}>
          {points >= 1000 ? `${(points / 1000).toFixed(1)}K` : points}
        </Text>
      </View>
    </View>
  );
}

function starPolyPoints(cx: number, cy: number, rOuter: number, rInner: number, points: number) {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    out.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return out.join(" ");
}

/* ──────────────────────────────────────────────────────────────── */
/*  11) SOCIAL — Sosyal ikon grid (4 platform)                      */
/* ──────────────────────────────────────────────────────────────── */
export function SocialIconsVisual({ color = "#8b5cf6" }: { color?: string }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const platforms = [
    { name: "📷", color: "#e1306c", angle: 45 },
    { name: "👍", color: "#1877f2", angle: 135 },
    { name: "🐦", color: "#1da1f2", angle: 225 },
    { name: "▶️", color: "#ff0000", angle: 315 },
  ];

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="centerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor={color} stopOpacity={0.3} />
          </RadialGradient>
        </Defs>

        {/* Arka plan halkası */}
        <Circle cx={cx} cy={cy} r={70} fill={color} opacity={0.08} />

        {/* Bağlantı çizgileri */}
        {platforms.map((p, i) => {
          const x = cx + Math.cos((p.angle * Math.PI) / 180) * 50;
          const y = cy + Math.sin((p.angle * Math.PI) / 180) * 50;
          return (
            <Line key={`l-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={1.5} strokeDasharray="3,3" opacity={0.5} />
          );
        })}

        {/* Merkez @ */}
        <Circle cx={cx} cy={cy} r={22} fill="url(#centerGlow)" stroke={color} strokeWidth={2.5} />
      </Svg>

      {/* Merkez @ overlay */}
      <View
        style={{
          position: "absolute",
          top: cy - 14,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 22, color: "#fff", fontWeight: "900" }}>@</Text>
      </View>

      {/* Sosyal ikonlar */}
      {platforms.map((p, i) => {
        const x = cx + Math.cos((p.angle * Math.PI) / 180) * 50;
        const y = cy + Math.sin((p.angle * Math.PI) / 180) * 50;
        return (
          <View
            key={`p-${i}`}
            style={{
              position: "absolute",
              top: y - 16,
              left: x - 16,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#fff",
              borderWidth: 2,
              borderColor: p.color,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: p.color,
              shadowOpacity: 0.3,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text style={{ fontSize: 16 }}>{p.name}</Text>
          </View>
        );
      })}
    </View>
  );
}
