import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { StorefrontProduct } from "@/constants/storefront-data";

type StorefrontProductCardProps = {
  onPress: () => void;
  product: StorefrontProduct;
  width: number;
};

export function StorefrontProductCard({
  onPress,
  product,
  width,
}: StorefrontProductCardProps) {
  return (
    <Pressable
      accessibilityHint="Opens product details"
      accessibilityLabel={`${product.title}. ${product.description}. ${product.price}`}
      accessibilityRole="button"
      className="overflow-hidden rounded-sm bg-neutral-0 active:opacity-80"
      onPress={onPress}
      style={{ width }}
      testID="motion-card"
    >
      <View
        className="overflow-hidden bg-brand-socialSurface"
        style={{ aspectRatio: 325 / 416.66, width: "100%" }}
        testID="motion-image-frame"
      >
        <Image
          accessible={false}
          contentFit="cover"
          recyclingKey={product.id}
          source={product.image}
          style={{ height: "100%", width: "100%" }}
          transition={140}
        />
      </View>

      <View className="min-h-[72px] flex-row items-start justify-between px-xs pb-sm pt-md">
        <View className="flex-1 pr-xs">
          <Text
            className="font-montserrat-semibold text-sm text-neutral-900"
            numberOfLines={1}
          >
            {product.title}
          </Text>
          <Text className="mt-xxs font-montserrat-regular text-xs text-neutral-600">
            {product.price}
          </Text>
        </View>
        <View
          accessibilityLabel="Available in the Stylish brand color"
          accessibilityRole="image"
          className="mt-xxs h-[14px] w-[14px] rounded-pill bg-brand-primary"
        />
      </View>
    </Pressable>
  );
}
