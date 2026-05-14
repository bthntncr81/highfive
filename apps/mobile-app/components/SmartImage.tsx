// SmartImage — kaynağa göre uygun renderer seçer.
// expo-image SVG desteklemiyor (SDWebImage/Glide native SVG yok),
// bu yüzden data:image/svg+xml URI'larını react-native-svg ile çiziyoruz.
// Diğer her şey (PNG/JPEG/WebP/HTTP) için expo-image kullanılır.

import { useMemo } from "react";
import { View, Text, ImageStyle, StyleProp, ViewStyle } from "react-native";
import { Image, ImageContentFit } from "expo-image";
import { SvgXml } from "react-native-svg";

type SmartImageProps = {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
  fallbackEmoji?: string;
};

// data:image/svg+xml;utf8,<svg ...>   ya da   data:image/svg+xml;base64,XXX
function decodeSvgDataUri(uri: string): string | null {
  if (!uri.startsWith("data:image/svg+xml")) return null;

  // Header'ı ayır: data:image/svg+xml;<encoding>,<payload>
  const commaIdx = uri.indexOf(",");
  if (commaIdx < 0) return null;

  const header = uri.slice(0, commaIdx); // örn: data:image/svg+xml;utf8
  const payload = uri.slice(commaIdx + 1);

  if (header.includes("base64")) {
    try {
      // RN'de global atob/Buffer var; ikisinden birini kullan
      const g = global as any;
      if (typeof g.atob === "function") return g.atob(payload);
      if (g.Buffer) return g.Buffer.from(payload, "base64").toString("utf-8");
      return null;
    } catch {
      return null;
    }
  }

  // utf8 / charset=utf-8 / no-encoding → percent-decode
  try {
    return decodeURIComponent(payload);
  } catch {
    // %23 vs zaten decode olmuşsa bu fail edebilir; raw geri dön
    return payload;
  }
}

export function SmartImage({
  uri,
  style,
  containerStyle,
  contentFit = "cover",
  transition,
  fallbackEmoji,
}: SmartImageProps) {
  const svgXml = useMemo(() => (uri ? decodeSvgDataUri(uri) : null), [uri]);

  if (!uri) {
    if (!fallbackEmoji) return null;
    return (
      <View style={[{ alignItems: "center", justifyContent: "center" }, containerStyle]}>
        <Text style={{ fontSize: 32 }}>{fallbackEmoji}</Text>
      </View>
    );
  }

  if (svgXml) {
    return (
      <View style={[{ overflow: "hidden" }, style as any, containerStyle]}>
        <SvgXml xml={svgXml} width="100%" height="100%" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      transition={transition}
    />
  );
}

export default SmartImage;
