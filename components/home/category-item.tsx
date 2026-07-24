import { Image } from "expo-image";
import { Pressable, Text } from "react-native";

import type { HomeCategory } from "@/constants/home-data";

type CategoryItemProps = {
  category: HomeCategory;
  onPress: () => void;
};

export function CategoryItem({ category, onPress }: CategoryItemProps) {
  return (
    <Pressable
      accessibilityHint={`Opens products in ${category.name}`}
      accessibilityLabel={category.name}
      accessibilityRole="button"
      className="w-[56px] items-center active:opacity-70"
      onPress={onPress}
    >
      <Image
        accessibilityLabel={category.imageLabel}
        accessibilityRole="image"
        contentFit="cover"
        source={category.image}
        style={{ borderRadius: 28, height: 56, width: 56 }}
      />
      <Text
        className="mt-[1px] font-montserrat-regular text-micro text-[#21003D]"
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}
