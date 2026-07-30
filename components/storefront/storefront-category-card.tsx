import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { StorefrontCategory } from "@/constants/storefront-data";

type StorefrontCategoryCardProps = {
  category: StorefrontCategory;
  onPress: () => void;
  showLabel?: boolean;
  width: number;
};

export function StorefrontCategoryCard({
  category,
  onPress,
  showLabel = false,
  width,
}: StorefrontCategoryCardProps) {
  return (
    <Pressable
      accessibilityHint={`Shows ${category.name} products`}
      accessibilityLabel={category.name}
      accessibilityRole="button"
      className="overflow-hidden bg-brand-socialSurface active:opacity-80"
      onPress={onPress}
      style={{ width }}
      testID="motion-card"
    >
      <View
        style={{ aspectRatio: 325 / 386.89, width: "100%" }}
        testID="motion-image-frame"
      >
        <Image
          accessible={false}
          contentFit="cover"
          recyclingKey={category.id}
          source={category.image}
          style={{ height: "100%", width: "100%" }}
          transition={140}
        />
      </View>
      {showLabel ? (
        <View className="absolute inset-x-0 bottom-0 bg-neutral-1000/45 px-sm py-[10px]">
          <Text className="font-montserrat-bold text-xs uppercase tracking-[1.4px] text-neutral-0">
            {category.name}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
