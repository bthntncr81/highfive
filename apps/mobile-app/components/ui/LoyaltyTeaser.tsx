// Anasayfa için yatay scroll sadakat program teaser'ı
// Aktif programları (12 türde) gösterir, basıldığında /loyalty'ye yönlendirir.
// Login ise: kullanıcının her programdaki gerçek progress'ini çeker.

import { BRAND_PRIMARY } from "@/lib/brand";
import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useLoyaltyPrograms } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { endpoints } from "@/lib/api";
import { StampVisual } from "@/components/loyalty/StampVisuals";

const TYPE_BADGES: Record<string, { label: string; color: string; emoji: string }> = {
  STAMP_CARD: { label: "Damga Kartı", color: BRAND_PRIMARY, emoji: "🎫" },
  CASHBACK: { label: "Cashback", color: "#22c55e", emoji: "💰" },
  BIRTHDAY: { label: "Doğum Günü", color: "#a855f7", emoji: "🎂" },
  WELCOME: { label: "Hoş Geldin", color: "#3b82f6", emoji: "👋" },
  REFERRAL: { label: "Davet", color: "#f59e0b", emoji: "🤝" },
  MILESTONE: { label: "Milestone", color: "#ec4899", emoji: "🎯" },
  STREAK: { label: "Süreklilik", color: "#ef4444", emoji: "🔥" },
  PRODUCT_VIP: { label: "Ürün VIP", color: "#eab308", emoji: "🏆" },
  HAPPY_HOUR_POINTS: { label: "Saat Bonusu", color: "#06b6d4", emoji: "⏰" },
  SOCIAL: { label: "Sosyal", color: "#8b5cf6", emoji: "📱" },
  TIER_DISCOUNT: { label: "Tier", color: "#0ea5e9", emoji: "💎" },
  BASIC_POINTS: { label: "Puan", color: "#f97316", emoji: "⭐" },
};

export function LoyaltyTeaser() {
  const { data, loading } = useLoyaltyPrograms();
  const programs = useMemo(() => data?.programs ?? [], [data]);
  const token = useAuth((s) => s.token);
  const customer = useAuth((s) => s.user);

  // Login varsa: kullanıcının her programdaki progress'ini çek
  const [progressByProgram, setProgressByProgram] = useState<Record<string, any>>({});
  const [meCustomer, setMeCustomer] = useState<any>(null);
  useEffect(() => {
    if (!token) {
      setProgressByProgram({});
      setMeCustomer(null);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const res = await endpoints.loyaltyProgress();
        if (cancel) return;
        const map: Record<string, any> = {};
        for (const pr of res.progress ?? []) {
          map[pr.programId] = pr;
        }
        setProgressByProgram(map);
        setMeCustomer(res.customer);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [token]);

  if (loading || programs.length === 0) return null;

  return (
    <View className="mt-6">
      <View className="mb-3 flex-row items-center justify-between px-5">
        <View className="flex-row items-center">
          <Text className="text-lg font-extrabold text-foreground">
            ✨ Sadakat Programları
          </Text>
          <View className="ml-2 rounded-full bg-primary-50 px-2 py-0.5">
            <Text className="text-[10px] font-bold text-primary-600">
              {programs.length}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/loyalty")}
          className="flex-row items-center"
        >
          <Text className="text-sm font-semibold text-primary-500">Tümünü gör</Text>
          <Ionicons name="chevron-forward" size={14} color={BRAND_PRIMARY} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {programs.map((p) => (
          <ProgramTeaserCard
            key={p.id}
            program={p}
            progress={progressByProgram[p.id]}
            customer={meCustomer ?? customer}
            isLoggedIn={!!token}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ProgramTeaserCard({
  program,
  progress,
  customer,
  isLoggedIn,
}: {
  program: any;
  progress?: any;
  customer?: any;
  isLoggedIn: boolean;
}) {
  const badge = TYPE_BADGES[program.type] ?? { label: program.type, color: "#6b7280", emoji: "✨" };
  const color = program.color ?? badge.color;

  // Progress chip metni — tipe göre
  const progressInfo = computeProgressChip(program, progress, customer, isLoggedIn);

  return (
    <Pressable
      onPress={() => router.push("/loyalty")}
      style={{
        width: 240,
        backgroundColor: "#fff",
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: `${color}30`,
        shadowColor: color,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        overflow: "hidden",
      }}
    >
      {/* Üst — gradient banner */}
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View className="flex-row items-center" style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, marginRight: 6 }}>{program.icon || badge.emoji}</Text>
          <Text
            numberOfLines={1}
            style={{ color: "#fff", fontWeight: "800", fontSize: 14, flex: 1 }}
          >
            {program.name}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.25)",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{badge.label}</Text>
        </View>
      </View>

      {/* Progress chip (login durumuna göre) */}
      {progressInfo && (
        <View
          style={{
            backgroundColor: progressInfo.bg,
            paddingHorizontal: 12,
            paddingVertical: 6,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "700", color: progressInfo.fg }}>
            {progressInfo.label}
          </Text>
          {progressInfo.value && (
            <Text style={{ fontSize: 12, fontWeight: "900", color: progressInfo.fg }}>
              {progressInfo.value}
            </Text>
          )}
        </View>
      )}

      {/* Orta — visual preview */}
      <View style={{ padding: 12, alignItems: "center", height: 130, justifyContent: "center" }}>
        <ProgramPreview
          program={program}
          color={color}
          progress={progress}
          customer={customer}
          isLoggedIn={isLoggedIn}
        />
      </View>

      {/* Alt — açıklama / CTA */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
        <Text numberOfLines={2} style={{ fontSize: 11, color: "#6b7280", minHeight: 28 }}>
          {program.description ?? "Detayları görmek için tıkla"}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Tipe göre kullanıcı durumunu özetleyen küçük chip metni
 * (login değilse → "Sen de katıl" gibi tease)
 */
function computeProgressChip(
  program: any,
  progress: any,
  customer: any,
  isLoggedIn: boolean,
): { label: string; value?: string; bg: string; fg: string } | null {
  if (!isLoggedIn) {
    return {
      label: "Üye olduğunda kazanmaya başla",
      bg: "#fef3c7",
      fg: "#b45309",
    };
  }

  switch (program.type) {
    case "STAMP_CARD": {
      const target = Math.max(2, Number(program.config?.stampsRequired ?? 6));
      const count = Math.min(target, Number(progress?.count ?? 0));
      const ready = count >= target;
      return ready
        ? { label: "🎁 ÖDÜLÜN HAZIR!", value: `${count}/${target}`, bg: "#dcfce7", fg: "#166534" }
        : { label: `${target - count} sipariş kaldı`, value: `${count}/${target}`, bg: "#fef3c7", fg: "#92400e" };
    }
    case "BASIC_POINTS":
      return {
        label: "Mevcut puanın",
        value: `${customer?.totalPoints ?? 0} ⭐`,
        bg: "#fef3c7",
        fg: "#92400e",
      };
    case "CASHBACK":
      return {
        label: "Cüzdanın",
        value: `${Number(customer?.cashbackBalance ?? 0).toFixed(0)} ₺`,
        bg: "#dcfce7",
        fg: "#166534",
      };
    case "STREAK":
      return {
        label: "Serin",
        value: `🔥 ${customer?.currentStreak ?? 0}`,
        bg: "#fee2e2",
        fg: "#991b1b",
      };
    case "REFERRAL":
      return {
        label: "Davet ettiklerin",
        value: `${customer?.referralCount ?? 0} kişi`,
        bg: "#ede9fe",
        fg: "#6d28d9",
      };
    case "BIRTHDAY":
      return customer?.birthDate
        ? { label: "Doğum günün kayıtlı", value: "🎂", bg: "#fce7f3", fg: "#9d174d" }
        : { label: "Profilden doğum gününü ekle", value: "+", bg: "#fce7f3", fg: "#9d174d" };
    case "MILESTONE": {
      const oc = Number(customer?.orderCount ?? 0);
      return { label: "Toplam siparişin", value: `${oc}`, bg: "#fce7f3", fg: "#9d174d" };
    }
    case "WELCOME":
      return Number(customer?.orderCount ?? 0) === 0
        ? { label: "İlk siparişe hazır", value: "🎁", bg: "#dbeafe", fg: "#1e40af" }
        : { label: "Hoş geldin bonusun bekliyor", value: "✓", bg: "#dbeafe", fg: "#1e40af" };
    default:
      return null;
  }
}

function ProgramPreview({
  program,
  color,
  progress,
  customer,
  isLoggedIn,
}: {
  program: any;
  color: string;
  progress?: any;
  customer?: any;
  isLoggedIn?: boolean;
}) {
  // Her tipe göre farklı önizleme
  switch (program.type) {
    case "STAMP_CARD": {
      const target = Math.max(2, Number(program.config?.stampsRequired ?? 6));
      // Login varsa gerçek progress; değilse yarı dolu önizleme (sucuk görünsün)
      const realCount = Number(progress?.count ?? 0);
      const count = isLoggedIn
        ? Math.min(target, realCount)
        : Math.max(1, Math.floor((target - 1) / 2));
      const visualStyle = program.config?.visualStyle ?? "auto";
      const hint = `${program.name ?? ""} ${program.description ?? ""}`.toLowerCase();
      return (
        <View style={{ transform: [{ scale: 0.5 }] }}>
          <StampVisual
            count={count}
            target={target}
            color={color}
            visualStyle={visualStyle}
            categoryHint={hint}
          />
        </View>
      );
    }
    case "CASHBACK":
      return <BigEmoji emoji="💰" subtitle={`%${program.config?.cashbackPercent ?? 5} iade`} color={color} />;
    case "BIRTHDAY":
      return <BigEmoji emoji="🎂" subtitle={`%${program.config?.discountPercent ?? 20} indirim`} color={color} />;
    case "WELCOME":
      return <BigEmoji emoji="🎁" subtitle="İlk siparişinde sürpriz" color={color} />;
    case "REFERRAL":
      return <BigEmoji emoji="🤝" subtitle="Arkadaşını davet et" color={color} />;
    case "STREAK":
      return <BigEmoji emoji="🔥" subtitle={`${program.config?.requiredCount ?? 5} hafta üst üste`} color={color} />;
    case "MILESTONE":
      return <BigEmoji emoji="🎯" subtitle="Sipariş hedefleri" color={color} />;
    case "HAPPY_HOUR_POINTS":
      return <BigEmoji emoji="⏰" subtitle={`${program.config?.startHour ?? 14}:00 - ${program.config?.endHour ?? 17}:00 ${program.config?.multiplier ?? 2}x`} color={color} />;
    case "PRODUCT_VIP":
      return <BigEmoji emoji="🏆" subtitle={`${program.config?.requiredCount ?? 20} ürün al`} color={color} />;
    case "TIER_DISCOUNT":
      return <BigEmoji emoji="💎" subtitle="Üyelik seviyesi indirimi" color={color} />;
    case "BASIC_POINTS":
      return <BigEmoji emoji="⭐" subtitle={`Her ₺${program.config?.pointsPerTL ?? 10} = 1 puan`} color={color} />;
    case "SOCIAL":
      return <BigEmoji emoji="📱" subtitle="Paylaş, puan kazan" color={color} />;
    default:
      return <BigEmoji emoji={program.icon ?? "✨"} subtitle={program.description ?? ""} color={color} />;
  }
}

function BigEmoji({ emoji, subtitle, color }: { emoji: string; subtitle: string; color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: `${color}15`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 36 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 11, fontWeight: "700", color, textAlign: "center" }} numberOfLines={2}>
        {subtitle}
      </Text>
    </View>
  );
}
