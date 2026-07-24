import { Image } from "expo-image";
import { Text, View } from "react-native";

import type { HomeProduct } from "@/constants/home-data";

type ProductCardProps = {
  product: HomeProduct;
  variant?: "featured" | "trending";
};

const FILLED_STAR = require("@/assets/icons/home/product-3.svg");
const EMPTY_STAR = require("@/assets/icons/home/product-9.svg");

export function ProductCard({
  product,
  variant = "featured",
}: ProductCardProps) {
  const compact = variant === "trending";
  const cardWidth = compact ? 142 : 170;
  const cardHeight = compact ? 186 : 241;
  const imageHeight = compact ? 100 : 124;

  return (
    <View
      accessibilityLabel={`${product.title}. ${product.description}. ${product.price}, was ${product.originalPrice}, ${product.discount}${
        product.rating ? `, rated ${product.rating} out of 5` : ""
      }`}
      accessibilityRole="summary"
      accessible
      className="overflow-hidden rounded-[6px] bg-neutral-0"
      style={{ height: cardHeight, width: cardWidth }}
    >
      <Image
        accessible={false}
        contentFit="cover"
        source={product.image}
        style={{
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          height: imageHeight,
          width: cardWidth,
        }}
      />

      <View className="flex-1 px-[4px] pb-[3px] pt-[4px]">
        <Text
          className="font-montserrat-medium text-xs text-neutral-1000"
          numberOfLines={compact ? 1 : 1}
        >
          {product.title}
        </Text>
        <Text
          className="font-montserrat-regular text-micro text-neutral-1000"
          numberOfLines={2}
        >
          {product.description}
        </Text>

        <View className="mt-auto">
          <Text className="font-montserrat-medium text-xs text-neutral-1000">
            {product.price}
          </Text>
          <View className="flex-row items-center">
            <Text className="font-montserrat-regular text-micro text-neutral-475 line-through">
              {product.originalPrice}
            </Text>
            <Text className="ml-[8px] font-montserrat-regular text-micro text-brand-discount">
              {product.discount}
            </Text>
          </View>

          {!compact && product.rating ? (
            <View className="mt-[1px] flex-row items-center">
              {[0, 1, 2, 3].map((star) => (
                <Image
                  accessible={false}
                  contentFit="contain"
                  key={star}
                  source={FILLED_STAR}
                  style={{ height: 11, width: 12 }}
                />
              ))}
              <Image
                accessible={false}
                contentFit="contain"
                source={EMPTY_STAR}
                style={{ height: 11, width: 12 }}
              />
              <Text className="ml-[4px] font-montserrat-regular text-micro text-neutral-425">
                {product.reviewCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
