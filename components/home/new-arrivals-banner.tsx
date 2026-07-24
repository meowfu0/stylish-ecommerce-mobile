import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/design-tokens";

type NewArrivalsBannerProps = {
  onViewAll: () => void;
  width: number;
};

const FIGMA_WIDTH = 343;

export function NewArrivalsBanner({
  onViewAll,
  width,
}: NewArrivalsBannerProps) {
  const scale = width / FIGMA_WIDTH;

  return (
    <View
      className="overflow-hidden rounded-sm bg-neutral-0"
      style={{ height: 270 * scale, width }}
    >
      <Image
        accessibilityLabel="Hot Summer Sale collection"
        accessibilityRole="image"
        contentFit="cover"
        source={require("@/assets/images/home/new-arrivals-artwork-2.png")}
        style={{
          borderTopLeftRadius: 8 * scale,
          borderTopRightRadius: 8 * scale,
          height: 200 * scale,
          width,
        }}
      />

      <Text
        className="absolute font-montserrat-medium text-neutral-1000"
        style={{
          fontSize: 20 * scale,
          left: 8 * scale,
          lineHeight: 22 * scale,
          top: 208 * scale,
        }}
      >
        New Arrivals
      </Text>
      <Text
        className="absolute font-montserrat-regular text-neutral-1000"
        style={{
          fontSize: 16 * scale,
          left: 8 * scale,
          lineHeight: 20 * scale,
          top: 234 * scale,
        }}
      >
        Summer’ 25 Collections
      </Text>

      <Pressable
        accessibilityHint="Opens all new arrivals in Search"
        accessibilityLabel="View all new arrivals"
        accessibilityRole="button"
        className="absolute flex-row items-center justify-center rounded-xs bg-brand-primary active:opacity-70"
        hitSlop={8}
        onPress={onViewAll}
        style={{
          height: 28 * scale,
          right: 12 * scale,
          top: 226 * scale,
          width: 89 * scale,
        }}
      >
        <Text
          className="font-montserrat-semibold text-neutral-0"
          style={{ fontSize: 12 * scale, lineHeight: 16 * scale }}
        >
          View all
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
