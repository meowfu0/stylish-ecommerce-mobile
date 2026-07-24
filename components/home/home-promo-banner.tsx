import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/design-tokens";

type HomePromoBannerProps = {
  onShopNow: () => void;
  width: number;
};

const FIGMA_WIDTH = 343;

export function HomePromoBanner({
  onShopNow,
  width,
}: HomePromoBannerProps) {
  const scale = width / FIGMA_WIDTH;

  return (
    <View
      style={{ height: 220 * scale, width }}
    >
      <View
        className="overflow-hidden rounded-md"
        style={{ height: 189 * scale, width }}
      >
        <Image
          accessibilityLabel="Woman holding colorful shopping bags"
          accessibilityRole="image"
          contentFit="cover"
          source={require("@/assets/images/home/promo-artwork.jpg")}
          style={{ height: "100%", width: "100%" }}
        />

        <View
          className="absolute"
          style={{ left: 14 * scale, top: 40 * scale }}
        >
          <Text
            className="font-montserrat-bold text-neutral-0"
            style={{ fontSize: 20 * scale, lineHeight: 22 * scale }}
          >
            50-40% OFF
          </Text>
          <Text
            className="font-montserrat-regular text-neutral-0"
            style={{
              fontSize: 12 * scale,
              lineHeight: 16 * scale,
              marginTop: 8 * scale,
            }}
          >
            Now in (product)
          </Text>
          <Text
            className="font-montserrat-regular text-neutral-0"
            style={{ fontSize: 12 * scale, lineHeight: 16 * scale }}
          >
            All colours
          </Text>
        </View>

        <Pressable
          accessibilityHint="Opens the current sale in Search"
          accessibilityLabel="Shop Now"
          accessibilityRole="button"
          className="absolute flex-row items-center justify-center rounded-[6px] border border-neutral-0 active:opacity-70"
          hitSlop={6}
          onPress={onShopNow}
          style={{
            height: 32 * scale,
            left: 14 * scale,
            top: 117 * scale,
            width: 100 * scale,
          }}
        >
          <Text
            className="font-montserrat-semibold text-neutral-0"
            style={{ fontSize: 12 * scale, lineHeight: 16 * scale }}
          >
            Shop Now
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

      <View
        accessibilityLabel="Promotion 1 of 5"
        accessible
        className="flex-row items-center justify-center"
        style={{ gap: 6 * scale, height: 31 * scale }}
      >
        {[0, 1, 2, 3, 4].map((dot) => (
          <View
            className="rounded-pill"
            key={dot}
            style={{
              backgroundColor:
                dot === 0 ? colors.brand.primary : colors.neutral[300],
              height: 8 * scale,
              opacity: dot === 0 ? 1 : 0.55,
              width: 8 * scale,
            }}
          />
        ))}
      </View>
    </View>
  );
}
