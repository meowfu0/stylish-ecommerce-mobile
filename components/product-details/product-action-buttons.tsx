import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

type ProductActionButtonsProps = {
  addedToCart: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
};

export function ProductActionButtons({
  addedToCart,
  onAddToCart,
  onBuyNow,
}: ProductActionButtonsProps) {
  return (
    <View className="flex-row gap-[12px]">
      <Pressable
        accessibilityHint="Adds the selected size to your temporary cart"
        accessibilityLabel={addedToCart ? "Add another to cart" : "Add to cart"}
        accessibilityRole="button"
        className="h-[52px] flex-1 flex-row items-center justify-center rounded-input bg-brand-primary px-[12px] shadow-sm active:opacity-80"
        onPress={onAddToCart}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/product-details/add-cart.svg")}
          style={{ height: 22, width: 22 }}
        />
        <Text
          className="ml-[8px] font-montserrat-semibold text-sm text-neutral-0"
          numberOfLines={1}
        >
          {addedToCart ? "Added to Cart" : "Add to Cart"}
        </Text>
      </Pressable>

      <Pressable
        accessibilityHint="Opens checkout for the selected size"
        accessibilityLabel="Buy now"
        accessibilityRole="button"
        className="h-[52px] flex-1 flex-row items-center justify-center rounded-input bg-brand-discount px-[12px] shadow-sm active:opacity-80"
        onPress={onBuyNow}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/product-details/buy-now.svg")}
          style={{ height: 22, width: 22 }}
        />
        <Text
          className="ml-[8px] font-montserrat-semibold text-sm text-neutral-0"
          numberOfLines={1}
        >
          Buy Now
        </Text>
      </Pressable>
    </View>
  );
}
