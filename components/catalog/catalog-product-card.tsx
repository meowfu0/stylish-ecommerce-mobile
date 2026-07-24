import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { TrendingCatalogProduct } from "@/constants/trending-products-data";

type CatalogProductCardProps = {
  imageSize: "short" | "tall";
  onPress: () => void;
  product: TrendingCatalogProduct;
  width: number;
};

const FIGMA_CARD_WIDTH = 164;
const FIGMA_CARD_HEIGHT = {
  short: 245,
  tall: 305,
} as const;
const FIGMA_IMAGE_HEIGHT = {
  short: 136,
  tall: 196,
} as const;
const FILLED_STAR = require("@/assets/icons/home/product-3.svg");
const EMPTY_STAR = require("@/assets/icons/home/product-9.svg");

export function CatalogProductCard({
  imageSize,
  onPress,
  product,
  width,
}: CatalogProductCardProps) {
  const scale = width / FIGMA_CARD_WIDTH;

  return (
    <Pressable
      accessibilityHint="Opens product details"
      accessibilityLabel={`${product.title}. ${product.description}. ${product.price}. Rated ${product.rating} out of 5 from ${product.reviewCount} reviews`}
      accessibilityRole="button"
      className="overflow-hidden rounded-sm bg-neutral-0 shadow-sm active:opacity-80"
      onPress={onPress}
      style={{ height: FIGMA_CARD_HEIGHT[imageSize] * scale, width }}
    >
      <Image
        accessible={false}
        contentFit="cover"
        recyclingKey={product.id}
        source={product.image}
        style={{
          borderTopLeftRadius: 8 * scale,
          borderTopRightRadius: 8 * scale,
          height: FIGMA_IMAGE_HEIGHT[imageSize] * scale,
          width,
        }}
        transition={120}
      />

      <View
        className="flex-1"
        style={{
          paddingBottom: 5 * scale,
          paddingHorizontal: 8 * scale,
          paddingTop: 4 * scale,
        }}
      >
        <Text
          className="font-montserrat-medium text-neutral-1000"
          numberOfLines={1}
          style={{ fontSize: 16 * scale, lineHeight: 20 * scale }}
        >
          {product.title}
        </Text>
        <Text
          className="font-montserrat-regular text-neutral-1000"
          numberOfLines={2}
          style={{ fontSize: 10 * scale, lineHeight: 16 * scale }}
        >
          {product.description}
        </Text>

        <View className="mt-auto">
          <Text
            className="font-montserrat-medium text-neutral-1000"
            style={{ fontSize: 12 * scale, lineHeight: 16 * scale }}
          >
            {product.price}
          </Text>
          <View className="flex-row items-center">
            {[0, 1, 2, 3].map((star) => (
              <Image
                accessible={false}
                contentFit="contain"
                key={star}
                source={FILLED_STAR}
                style={{ height: 12 * scale, width: 12 * scale }}
              />
            ))}
            <Image
              accessible={false}
              contentFit="contain"
              source={EMPTY_STAR}
              style={{ height: 12 * scale, width: 12 * scale }}
            />
            <Text
              className="font-montserrat-regular text-neutral-425"
              numberOfLines={1}
              style={{
                fontSize: 10 * scale,
                lineHeight: 16 * scale,
                marginLeft: 4 * scale,
              }}
            >
              {product.reviewCount}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
