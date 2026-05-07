// Anasayfa için yatay scroll sadakat program teaser'ı
// Aktif programları (12 türde) gösterir, basıldığında /loyalty'ye yönlendirir.

import { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useLoyaltyPrograms } from "@/lib/hooks";
import { StampVisual } from "@/components/loyalty/StampVisuals";

const TYPE_BADGES: Record<string, { label: string; color: string; emoji: string }> = {
  STAMP_CARD: { label: "Damga Kartı", color: "#bb1e10", emoji: "🎫" },
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

  if (loading || programs.length === 0) return null;

  return (
    <View className="mt-6">
      <View className="mb-3 flex-row items-center justify-between px-5">
        <Text className="text-lg font-extrabold text-foreground">
          ✨ Sadakat Programları
        </Text>
        <Pressable onPress={() => router.push("/loyalty")}>
          <Text className="text-sm font-semibold text-primary-500">Tümünü gör</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {programs.map((p) => (
          <ProgramTeaserCard key={p.id} program={p} />
        ))}
      </ScrollView>
    </View>
  );
}

function ProgramTeaserCard({ program }: { program: any }) {
  const badge = TYPE_BADGES[program.type] ?? { label: program.type, color: "#6b7280", emoji: "✨" };
  const color = program.color ?? badge.color;

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

      {/* Orta — visual preview */}
      <View style={{ padding: 12, alignItems: "center", height: 130, justifyContent: "center" }}>
        <ProgramPreview program={program} color={color} />
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

function ProgramPreview({ program, color }: { program: any; color: string }) {
  // Her tipe göre farklı önizleme
  switch (program.type) {
    case "STAMP_CARD": {
      const target = Math.max(2, Number(program.config?.stampsRequired ?? 6));
      // Teaser'da önizleme amaçlı yarı dolu göster — kullanıcı sucuk/peynir görür
      // (gerçek progress /loyalty sayfasında görünür)
      const count = Math.max(1, Math.floor((target - 1) / 2));
      const visualStyle = program.config?.visualStyle ?? "auto";
      const hint = `${program.name ?? ""} ${program.description ?? ""}`.toLowerCase();
      return (
        <View style={{ transform: [{ scale: 0.55 }] }}>
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
