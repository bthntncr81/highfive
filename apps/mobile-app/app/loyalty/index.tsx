// Mobile Loyalty Hub — Domino's / McDonald's tarzı zengin sadakat ekranı
// Aktif programları gradient kart deck olarak gösterir, her tipte özel UI.

import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { endpoints } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { StampVisual } from "@/components/loyalty/StampVisuals";

type ProgramType =
  | "BASIC_POINTS" | "STAMP_CARD" | "BIRTHDAY" | "WELCOME"
  | "REFERRAL" | "MILESTONE" | "STREAK" | "CASHBACK"
  | "PRODUCT_VIP" | "HAPPY_HOUR_POINTS" | "SOCIAL" | "TIER_DISCOUNT";

export default function LoyaltyHub() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await endpoints.loyaltyProgress();
      setData(res);
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading && !data) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#bb1e10" size="large" />
      </SafeAreaView>
    );
  }

  if (!data?.customer) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="px-5 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground-muted">Veri yok</Text>
        </View>
      </SafeAreaView>
    );
  }

  const c = data.customer;
  const programs = data.programs ?? [];
  const progress = data.progress ?? [];

  const getProgress = (programId: string) =>
    progress.find((p: any) => p.programId === programId)?.data ?? {};

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-5 pt-2 pb-3 bg-white">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="ml-3 text-2xl font-extrabold text-foreground">
          Sadakat
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#bb1e10"
          />
        }
      >
        {/* HERO — Tier + puan */}
        <HeroCard customer={c} />

        {/* Aktif programlar — kart deck */}
        {programs.length === 0 ? (
          <View className="mt-4 rounded-2xl bg-white p-6 items-center">
            <Text className="text-4xl">⭐</Text>
            <Text className="mt-2 text-base font-bold text-foreground">
              Sadakat programları yakında
            </Text>
            <Text className="mt-1 text-center text-xs text-foreground-muted">
              Yöneticiler sadakat programlarını henüz aktifleştirmedi.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mt-5 mb-3 text-xs font-extrabold uppercase tracking-widest text-foreground-muted">
              🎁 Senin için aktif programlar
            </Text>
            <View className="gap-3">
              {programs.map((p: any) => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  progress={getProgress(p.id)}
                  customer={c}
                  onChanged={refresh}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== HERO CARD ====================
function HeroCard({ customer: c }: { customer: any }) {
  const tier = c.loyaltyTier;
  return (
    <View className="overflow-hidden rounded-3xl">
      <View
        style={{ backgroundColor: tier?.color ?? "#bb1e10" }}
        className="p-5"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xs uppercase tracking-widest text-white/80">
              {tier ? `${tier.icon ?? "🏆"} ${tier.name} Üye` : "🥉 Bronze Üye"}
            </Text>
            <Text className="mt-1 text-4xl font-extrabold text-white">
              {c.totalPoints.toLocaleString("tr-TR")}
            </Text>
            <Text className="text-xs text-white/80">
              ≈ {(c.totalPoints / 10).toFixed(2)} ₺ indirim
            </Text>
          </View>
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Ionicons name="star" size={32} color="#fff" />
          </View>
        </View>

        <View className="mt-4 flex-row gap-2">
          <View className="flex-1 rounded-xl bg-white/15 p-2">
            <Text className="text-[10px] text-white/80 uppercase tracking-wide">
              Sipariş
            </Text>
            <Text className="text-base font-bold text-white">{c.orderCount}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/15 p-2">
            <Text className="text-[10px] text-white/80 uppercase tracking-wide">
              Cashback
            </Text>
            <Text className="text-base font-bold text-white">
              {Number(c.cashbackBalance).toFixed(2)}₺
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/15 p-2">
            <Text className="text-[10px] text-white/80 uppercase tracking-wide">
              Streak
            </Text>
            <Text className="text-base font-bold text-white">
              🔥 {c.currentStreak}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ==================== PROGRAM CARD (programa göre özel render) ====================
function ProgramCard({
  program,
  progress,
  customer,
  onChanged,
}: {
  program: any;
  progress: any;
  customer: any;
  onChanged: () => void;
}) {
  const type = program.type as ProgramType;
  const color = program.color ?? "#bb1e10";

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View
      className="overflow-hidden rounded-3xl"
      style={{ backgroundColor: "#fff", borderWidth: 2, borderColor: color + "30" }}
    >
      {children}
    </View>
  );

  switch (type) {
    case "STAMP_CARD":
      return <Wrapper><StampCard program={program} progress={progress} /></Wrapper>;
    case "CASHBACK":
      return <Wrapper><CashbackCard program={program} customer={customer} /></Wrapper>;
    case "BIRTHDAY":
      return <Wrapper><BirthdayCard program={program} customer={customer} /></Wrapper>;
    case "REFERRAL":
      return <Wrapper><ReferralCard program={program} customer={customer} onChanged={onChanged} /></Wrapper>;
    case "STREAK":
      return <Wrapper><StreakCard program={program} customer={customer} /></Wrapper>;
    case "MILESTONE":
      return <Wrapper><MilestoneCard program={program} customer={customer} /></Wrapper>;
    case "WELCOME":
      return <Wrapper><WelcomeCard program={program} customer={customer} progress={progress} /></Wrapper>;
    case "PRODUCT_VIP":
      return <Wrapper><ProductVipCard program={program} progress={progress} /></Wrapper>;
    case "HAPPY_HOUR_POINTS":
      return <Wrapper><HappyHourCard program={program} /></Wrapper>;
    case "TIER_DISCOUNT":
      return <Wrapper><TierDiscountCard program={program} customer={customer} /></Wrapper>;
    case "BASIC_POINTS":
      return <Wrapper><BasicPointsCard program={program} customer={customer} /></Wrapper>;
    case "SOCIAL":
      return <Wrapper><SocialCard program={program} /></Wrapper>;
    default:
      return <Wrapper><GenericCard program={program} /></Wrapper>;
  }
}

// ==================== KART TASARIMLARI ====================

function CardHeader({ icon, color, name, description, badge }: any) {
  return (
    <View
      style={{ backgroundColor: color + "10", borderBottomWidth: 1, borderBottomColor: color + "20" }}
      className="flex-row items-center px-4 py-3"
    >
      <View
        style={{ backgroundColor: color }}
        className="h-12 w-12 items-center justify-center rounded-2xl"
      >
        <Text className="text-2xl">{icon || "⭐"}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-extrabold text-foreground">{name}</Text>
        {description && (
          <Text className="text-xs text-foreground-muted" numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>
      {badge && (
        <View
          style={{ backgroundColor: color }}
          className="rounded-full px-2.5 py-1"
        >
          <Text className="text-[10px] font-extrabold text-white">{badge}</Text>
        </View>
      )}
    </View>
  );
}

// 1) STAMP CARD — Pizza/Burger/Pasta/Cup/Hex SVG visual
function StampCard({ program, progress }: any) {
  const target = Math.max(2, Number(program.config?.stampsRequired ?? 10));
  const count = Math.min(target, Number(progress?.count ?? 0));
  const remaining = Math.max(0, target - count);
  const color = program.color ?? "#bb1e10";
  const ready = remaining === 0;
  const pctText = Math.round((count / target) * 100);
  const visualStyle = program.config?.visualStyle ?? "auto";
  // categoryHint: program adından/açıklamasından çıkarılmaya çalışılır
  const categoryHint = `${program.name ?? ""} ${program.description ?? ""}`.toLowerCase();

  // Reward ürünleri (ödüller) — birden fazla seçilmiş olabilir
  const rewardItems: any[] = program.rewardMenuItems ?? [];

  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={program.description}
        badge={ready ? "🎉 ÖDÜL HAZIR" : `${count}/${target}`}
      />
      <View className="p-4">
        {/* Big counter row */}
        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-xs font-medium text-foreground-muted">İlerleme</Text>
            <Text className="text-3xl font-extrabold" style={{ color }}>
              {count}
              <Text className="text-base font-semibold text-foreground-muted"> / {target}</Text>
            </Text>
          </View>
          <View
            style={{ backgroundColor: ready ? "#10b981" : `${color}15` }}
            className="rounded-full px-3 py-1.5"
          >
            <Text style={{ color: ready ? "#fff" : color }} className="text-xs font-bold">
              {ready ? "🎁 Hediye hazır!" : `%${pctText}`}
            </Text>
          </View>
        </View>

        {/* SVG Visual — pizza pie / burger stack / pasta bowl / cups / hex */}
        <View className="my-2 items-center">
          <StampVisual
            count={count}
            target={target}
            color={color}
            visualStyle={visualStyle}
            categoryHint={categoryHint}
          />
        </View>

        {/* Reward items preview — verilen ürünler */}
        {rewardItems.length > 0 && (
          <View className="mt-3 rounded-xl bg-amber-50 p-3 border border-amber-200">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              🎁 Bedava alacağın ürünler
            </Text>
            <Text className="text-xs font-semibold text-amber-900">
              {rewardItems.map((it: any) => it.name).join(" · ")}
            </Text>
          </View>
        )}

        {/* Footer: remaining or claim */}
        {ready ? (
          <Pressable
            style={{ backgroundColor: color }}
            className="mt-4 flex-row items-center justify-center rounded-full py-3.5"
          >
            <Ionicons name="gift" size={18} color="#fff" />
            <Text className="ml-2 text-sm font-extrabold text-white">
              Ödülünü Kullan
            </Text>
          </Pressable>
        ) : (
          <View className="mt-3 flex-row items-center justify-center">
            <View
              style={{ backgroundColor: `${color}10` }}
              className="flex-row items-center rounded-full px-3 py-1.5"
            >
              <Ionicons name="flag" size={12} color={color} />
              <Text className="ml-1.5 text-xs font-semibold" style={{ color }}>
                {remaining} sipariş daha = bedava!
              </Text>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

// 2) CASHBACK
function CashbackCard({ program, customer }: any) {
  const balance = Number(customer.cashbackBalance ?? 0);
  const pct = program.config?.cashbackPercent ?? 5;
  const color = program.color ?? "#22C55E";
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={`Her sipariş %${pct} cüzdana iade`}
      />
      <View className="p-4 items-center">
        <Text className="text-xs text-foreground-muted uppercase tracking-widest">
          Mevcut bakiye
        </Text>
        <Text style={{ color }} className="mt-1 text-4xl font-extrabold">
          {balance.toFixed(2)} ₺
        </Text>
        <Text className="mt-2 text-center text-xs text-foreground-muted">
          Sonraki siparişinde otomatik kullanılır
        </Text>
      </View>
    </>
  );
}

// 3) BIRTHDAY
function BirthdayCard({ program, customer }: any) {
  const color = program.color ?? "#EC4899";
  const hasBirthday = !!customer.birthDate;
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={program.description}
      />
      <View className="p-4">
        {hasBirthday ? (
          <Text className="text-center text-sm text-foreground-muted">
            🎂 Doğum gününde otomatik bildirim alacaksın
          </Text>
        ) : (
          <View>
            <Text className="text-center text-sm text-foreground-muted mb-2">
              Doğum tarihini eklemek için profilini güncelle
            </Text>
            <Pressable
              onPress={() => router.push("/profile/edit")}
              style={{ backgroundColor: color }}
              className="items-center rounded-full py-2.5"
            >
              <Text className="text-sm font-bold text-white">
                Doğum tarihimi gir
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

// 4) REFERRAL
function ReferralCard({ program, customer, onChanged }: any) {
  const color = program.color ?? "#8B5CF6";
  const code = customer.referralCode;
  const refPoints = program.config?.referrerPoints ?? 100;

  const shareCode = async () => {
    if (!code) return;
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `🍔 HighFive'a benim davetimle gel, ikimiz de ${refPoints} puan kazanalım! Kod: ${code}\n\nİndir: https://highfivepps.com`,
      });
    } catch {}
  };

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Kopyalandı", `Davet kodun kopyalandı: ${code}`);
  };

  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={program.description}
        badge={customer.referralCount > 0 ? `${customer.referralCount} davet` : undefined}
      />
      <View className="p-4">
        <View
          style={{ backgroundColor: color + "10", borderWidth: 2, borderColor: color, borderStyle: "dashed" }}
          className="rounded-2xl p-4 items-center"
        >
          <Text className="text-xs text-foreground-muted uppercase tracking-widest">
            Senin davet kodun
          </Text>
          <Text style={{ color }} className="mt-1 text-3xl font-black tracking-widest">
            {code ?? "..."}
          </Text>
        </View>
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={copyCode}
            className="flex-1 items-center rounded-full bg-gray-100 py-3"
          >
            <Text className="text-sm font-bold text-foreground">
              📋 Kopyala
            </Text>
          </Pressable>
          <Pressable
            onPress={shareCode}
            style={{ backgroundColor: color }}
            className="flex-1 items-center rounded-full py-3"
          >
            <Text className="text-sm font-bold text-white">
              📤 Paylaş
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

// 5) STREAK
function StreakCard({ program, customer }: any) {
  const color = program.color ?? "#F97316";
  const period = program.config?.period ?? "WEEKLY";
  const target = program.config?.requiredCount ?? 5;
  const current = customer.currentStreak ?? 0;
  const longest = customer.longestStreak ?? 0;
  const periodLabel = period === "DAILY" ? "gün" : period === "WEEKLY" ? "hafta" : "ay";
  return (
    <>
      <CardHeader
        icon="🔥"
        color={color}
        name={program.name}
        description={`${target} ${periodLabel} üst üste sipariş`}
      />
      <View className="p-4">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-xs uppercase tracking-widest text-foreground-muted">
              Şu anki seri
            </Text>
            <Text style={{ color }} className="text-5xl font-black">
              {current}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] text-foreground-muted">En uzun seri</Text>
            <Text className="text-base font-bold text-foreground">{longest}</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
          <View
            style={{ width: `${Math.min(100, (current / target) * 100)}%`, backgroundColor: color }}
            className="h-full"
          />
        </View>
        <Text className="mt-2 text-center text-xs text-foreground-muted">
          {current >= target ? "🎉 Hedefe ulaştın!" : `Hedefe ${target - current} ${periodLabel} kaldı`}
        </Text>
      </View>
    </>
  );
}

// 6) MILESTONE
function MilestoneCard({ program, customer }: any) {
  const color = program.color ?? "#3B82F6";
  const milestones: any[] = program.config?.milestones ?? [];
  const orderCount = customer.orderCount ?? 0;
  const next = milestones.find((m) => m.orderCount > orderCount);
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={program.description}
      />
      <View className="p-4">
        <Text className="text-xs uppercase tracking-widest text-foreground-muted">
          Toplam sipariş
        </Text>
        <Text className="text-3xl font-extrabold text-foreground">
          {orderCount}
        </Text>
        {next ? (
          <View className="mt-3 rounded-xl bg-blue-50 border border-blue-200 p-3">
            <Text className="text-xs text-blue-700 font-bold">
              🎯 Sıradaki ödül: {next.label || `${next.orderCount}. siparişte`}
            </Text>
            <Text className="mt-1 text-xs text-foreground-muted">
              {next.orderCount - orderCount} sipariş kaldı
            </Text>
          </View>
        ) : (
          <Text className="mt-3 text-sm text-green-700 font-bold">
            🏆 Tüm milestone'ları tamamladın!
          </Text>
        )}
      </View>
    </>
  );
}

// 7) WELCOME
function WelcomeCard({ program, customer, progress }: any) {
  const color = program.color ?? "#10B981";
  const claimed = progress?.claimed === true || customer.orderCount > 0;
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={program.description}
        badge={claimed ? "✓ Kullanıldı" : "🎁 Senin"}
      />
      <View className="p-4">
        {!claimed ? (
          <View className="rounded-xl bg-green-50 border-2 border-green-300 border-dashed p-3">
            <Text className="text-sm font-bold text-green-800">
              %{program.config?.discountPercent ?? 25} indirim + {program.config?.bonusPoints ?? 50} puan
            </Text>
            <Text className="mt-1 text-xs text-green-700">
              İlk siparişinde otomatik uygulanır
            </Text>
          </View>
        ) : (
          <Text className="text-sm text-foreground-muted">
            Hoş geldin bonusunu kullandın 🎉
          </Text>
        )}
      </View>
    </>
  );
}

// 8) PRODUCT VIP
function ProductVipCard({ program, progress }: any) {
  const color = program.color ?? "#EAB308";
  const target = program.config?.requiredCount ?? 20;
  const itemCounts = progress?.itemCounts ?? {};
  const total = Object.values(itemCounts).reduce((a: number, b: any) => a + Number(b), 0);
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={program.description}
        badge={`${total}/${target}`}
      />
      <View className="p-4">
        <View className="h-3 overflow-hidden rounded-full bg-gray-200">
          <View
            style={{ width: `${Math.min(100, (total / target) * 100)}%`, backgroundColor: color }}
            className="h-full"
          />
        </View>
        <Text className="mt-2 text-center text-xs text-foreground-muted">
          {total >= target ? "🎉 Ödül kazandın!" : `${target - total} adet kaldı`}
        </Text>
      </View>
    </>
  );
}

// 9) HAPPY HOUR
function HappyHourCard({ program }: any) {
  const color = program.color ?? "#06B6D4";
  const start = program.config?.startHour ?? 14;
  const end = program.config?.endHour ?? 17;
  const mult = program.config?.multiplier ?? 2;
  const now = new Date().getHours();
  const isActive = now >= start && now < end;
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={`${String(start).padStart(2, "0")}:00 - ${String(end).padStart(2, "0")}:00 arası ${mult}x puan`}
        badge={isActive ? "🟢 ŞU AN" : "💤 Bekliyor"}
      />
      <View className="p-4">
        {isActive ? (
          <Text style={{ color }} className="text-center text-base font-extrabold">
            🔥 Şu an sipariş ver, {mult}x puan kazan!
          </Text>
        ) : (
          <Text className="text-center text-sm text-foreground-muted">
            Sonraki dilim {String(start).padStart(2, "0")}:00'da başlıyor
          </Text>
        )}
      </View>
    </>
  );
}

// 10) TIER DISCOUNT
function TierDiscountCard({ program, customer }: any) {
  const color = program.color ?? "#0EA5E9";
  const tier = customer.loyaltyTier;
  const discount = tier ? Number(tier.discountPercent ?? 0) : 0;
  return (
    <>
      <CardHeader
        icon={tier?.icon ?? program.icon ?? "💎"}
        color={color}
        name={program.name}
        description={tier ? `${tier.name} olarak %${discount} her zaman indirim` : "Bronze - henüz indirim yok"}
      />
      {discount > 0 && (
        <View className="p-4 items-center">
          <Text style={{ color }} className="text-3xl font-extrabold">
            %{discount}
          </Text>
          <Text className="text-xs text-foreground-muted">otomatik indirim</Text>
        </View>
      )}
    </>
  );
}

// 11) BASIC POINTS (klasik)
function BasicPointsCard({ program, customer }: any) {
  const color = program.color ?? "#F59E0B";
  const pointsPerTL = program.config?.pointsPerTL ?? 10;
  const ratio = program.config?.redeemRatio ?? 10;
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={program.description}
      />
      <View className="p-4 gap-2">
        <RuleRow icon="trending-up-outline" text={`Her ${pointsPerTL}₺ harcamada 1 puan`} />
        <RuleRow icon="cash-outline" text={`100 puan = ${ratio}₺ indirim`} />
        <RuleRow icon="information-circle-outline" text={`Min ${program.config?.minRedemption ?? 100} puan kullanılabilir`} />
      </View>
    </>
  );
}

// 12) SOCIAL
function SocialCard({ program }: any) {
  const color = program.color ?? "#A855F7";
  const platforms: any[] = program.config?.platforms ?? [];
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={color}
        name={program.name}
        description={program.description}
      />
      <View className="p-4 gap-2">
        {platforms.map((p: any, i: number) => (
          <View
            key={i}
            className="flex-row items-center justify-between rounded-xl bg-gray-50 p-3"
          >
            <Text className="text-sm font-semibold text-foreground">{p.name}</Text>
            <Text style={{ color }} className="text-sm font-extrabold">
              +{p.points} puan
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

// Generic
function GenericCard({ program }: any) {
  return (
    <>
      <CardHeader
        icon={program.icon}
        color={program.color ?? "#6b6b6b"}
        name={program.name}
        description={program.description}
      />
    </>
  );
}

function RuleRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center">
      <Ionicons name={icon} size={14} color="#6b6b6b" />
      <Text className="ml-2 flex-1 text-xs text-foreground-muted">{text}</Text>
    </View>
  );
}
