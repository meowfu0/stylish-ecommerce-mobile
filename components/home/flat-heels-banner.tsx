import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/design-tokens";

type FlatHeelsBannerProps = {
  onVisitNow: () => void;
  width: number;
};

const FIGMA_WIDTH = 343;

export function FlatHeelsBanner({ onVisitNow, width }: FlatHeelsBannerProps) {
  const scale = width / FIGMA_WIDTH;

  return (
    <View
      className="overflow-hidden rounded-sm bg-neutral-0"
      style={{ height: 172 * scale, width }}
    >
      <View
        className="absolute bg-neutral-200/30"
        style={{
          bottom: 9 * scale,
          left: 8 * scale,
          right: 4 * scale,
          top: 8 * scale,
        }}
      />
      <View
        accessibilityElementsHidden
        className="absolute bg-brand-offer/70"
        importantForAccessibility="no-hide-descendants"
        style={{
          height: 138 * scale,
          left: 15 * scale,
          top: 17 * scale,
          transform: [{ rotate: "4deg" }],
          width: 18 * scale,
        }}
      />
      <Image
        accessibilityLabel="Pair of white heels"
        accessibilityRole="image"
        contentFit="contain"
        source={require("@/assets/images/home/flat-heels-artwork.png")}
        style={{
          height: 109 * scale,
          left: 16 * scale,
          position: "absolute",
          top: 32 * scale,
          width: 144 * scale,
        }}
      />

      <View
        className="absolute items-center"
        style={{
          left: 164 * scale,
          top: 43 * scale,
          width: 163 * scale,
        }}
      >
        <Text
          className="font-montserrat-medium text-center text-neutral-1000"
          style={{ fontSize: 16 * scale, lineHeight: 20 * scale }}
        >
          Flat and Heels
        </Text>
        <Text
          className="font-montserrat-regular text-center text-neutral-1000"
          style={{
            fontSize: 10 * scale,
            lineHeight: 16 * scale,
            marginTop: 2 * scale,
          }}
        >
          Stand a chance to get rewarded
        </Text>
      </View>

      <Pressable
        accessibilityHint="Opens flats and heels in Search"
        accessibilityLabel="Visit now"
        accessibilityRole="button"
        className="absolute flex-row items-center justify-center rounded-xs bg-brand-primary active:opacity-70"
        hitSlop={8}
        onPress={onVisitNow}
        style={{
          height: 24 * scale,
          left: 235 * scale,
          top: 92 * scale,
          width: 92 * scale,
        }}
      >
        <Text
          className="font-montserrat-medium text-neutral-0"
          style={{ fontSize: 12 * scale, lineHeight: 16 * scale }}
        >
          Visit now
        </Text>
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/home/deal-arrow.svg")}
          style={{
            height: 16 * scale,
            marginLeft: 4 * scale,
            tintColor: colors.neutral[0],
            width: 16 * scale,
          }}
        />
      </Pressable>
    </View>
  );
}
