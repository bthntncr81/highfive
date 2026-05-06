import { Image, ImageStyle } from "react-native";

const COLOR_LOGO = require("@/assets/logo-color.png");
const WHITE_LOGO = require("@/assets/logo-white.png");

// SVG aspect ratio: 3684.96 / 1417.2 ≈ 2.6
const ASPECT = 3684.96 / 1417.2;

type Props = {
  height?: number;
  variant?: "color" | "white";
  style?: ImageStyle;
};

export function Logo({ height = 32, variant = "color", style }: Props) {
  return (
    <Image
      source={variant === "white" ? WHITE_LOGO : COLOR_LOGO}
      style={[
        {
          height,
          width: height * ASPECT,
          resizeMode: "contain",
        },
        style,
      ]}
    />
  );
}
