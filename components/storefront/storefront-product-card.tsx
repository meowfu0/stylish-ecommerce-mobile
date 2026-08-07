import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/design-tokens";
import type { StorefrontProduct } from "@/constants/storefront-data";

type StorefrontProductCardProps = {
  isSaved: boolean;
  onPress: () => void;
  onToggleSaved: () => void;
  product: StorefrontProduct;
  width: number;
};

export function StorefrontProductCard({
  isSaved,
  onPress,
  onToggleSaved,
  product,
  width,
}: StorefrontProductCardProps) {
  return (
    <View
      className="overflow-hidden rounded-sm bg-neutral-0 active:opacity-80"
      style={{ width }}
      testID="motion-card"
    >
      <Pressable
        accessibilityHint="Opens product details"
        accessibilityLabel={`${product.title}. ${product.description}. ${product.price}`}
        accessibilityRole="button"
        onPress={onPress}
      >
        <View
          className="overflow-hidden bg-brand-editorialSurface"
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
            accessibilityLabel="Available in the Velori brand color"
            accessibilityRole="image"
            className="mt-xxs h-[14px] w-[14px] rounded-pill bg-brand-primary"
          />
        </View>
      </Pressable>

      <View
        className="absolute left-[12px] top-[12px] bg-neutral-0 px-[10px] py-[4px]"
        pointerEvents="none"
      >
        <Text className="font-montserrat-bold text-micro uppercase leading-[15px] tracking-[1.3px] text-ink-editorialBadge">
          {product.badge}
        </Text>
      </View>

      <Pressable
        accessibilityHint={
          isSaved
            ? "Removes this product from your saved items"
            : "Adds this product to your saved items"
        }
        accessibilityLabel={
          isSaved
            ? `Remove ${product.title} from wishlist`
            : `Save ${product.title} to wishlist`
        }
        accessibilityRole="button"
        accessibilityState={{ selected: isSaved }}
        className="absolute right-[12px] top-[12px] h-[36px] w-[36px] cursor-pointer items-center justify-center bg-neutral-0/90 active:scale-95 active:bg-neutral-0"
        hitSlop={6}
        onPress={onToggleSaved}
      >
        <MaterialIcons
          color={isSaved ? colors.brand.editorialAccent : colors.ink.footer}
          name={isSaved ? "favorite" : "favorite-border"}
          size={19}
        />
      </Pressable>
    </View>
  );
}
