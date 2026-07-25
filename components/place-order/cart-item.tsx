import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { PlaceOrderProduct } from "@/constants/place-order-data";

type CartItemProps = {
  contentWidth: number;
  onQuantityPress: () => void;
  onSizePress: () => void;
  product: PlaceOrderProduct;
  quantity: number;
  selectedSize: string;
};

type SelectorProps = {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  value: string;
};

function Selector({
  accessibilityLabel,
  label,
  onPress,
  value,
}: SelectorProps) {
  return (
    <Pressable
      accessibilityHint={`Opens ${label.toLowerCase()} options`}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="h-[25px] min-w-0 flex-1 flex-row items-center rounded-[4px] bg-neutral-150 px-[6px] active:opacity-65"
      onPress={onPress}
    >
      <Text className="font-montserrat-regular text-sm text-neutral-1000">
        {label}
      </Text>
      <Text
        className="ml-[8px] flex-1 text-right font-montserrat-medium text-sm text-neutral-1000"
        numberOfLines={1}
      >
        {value}
      </Text>
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/icons/place-order/dropdown.svg")}
        style={{ height: 6, marginLeft: 8, width: 11 }}
      />
    </Pressable>
  );
}

export function CartItem({
  contentWidth,
  onQuantityPress,
  onSizePress,
  product,
  quantity,
  selectedSize,
}: CartItemProps) {
  const imageWidth = Math.min(
    123,
    Math.max(104, Math.ceil(contentWidth * 0.35)),
  );
  const imageHeight = Math.round((imageWidth * 153) / 123);

  return (
    <View className="flex-row" style={{ width: contentWidth }}>
      <Image
        accessibilityLabel={product.imageLabel}
        contentFit="cover"
        recyclingKey={product.id}
        source={product.image}
        style={{
          borderRadius: 4,
          height: imageHeight,
          width: imageWidth,
        }}
        transition={120}
      />

      <View className="ml-[18px] min-w-0 flex-1 pt-[7px]">
        <Text
          className="font-montserrat-semibold text-md text-neutral-1000"
          numberOfLines={2}
        >
          {product.title}
        </Text>
        <Text
          className="mt-[5px] font-montserrat-regular text-[13px] leading-[17px] text-neutral-1000"
          numberOfLines={2}
        >
          {product.subtitle}
        </Text>

        <View className="mt-[10px] flex-row gap-[12px]">
          <Selector
            accessibilityLabel={`Selected size ${selectedSize}`}
            label="Size"
            onPress={onSizePress}
            value={selectedSize}
          />
          <Selector
            accessibilityLabel={`Selected quantity ${quantity}`}
            label="Qty"
            onPress={onQuantityPress}
            value={String(quantity)}
          />
        </View>

        <View className="mt-[10px] flex-row flex-wrap items-center">
          <Text className="font-montserrat-regular text-[13px] leading-[20px] text-neutral-1000">
            Delivery by
          </Text>
          <Text className="ml-[6px] font-montserrat-semibold text-sm text-neutral-1000">
            {product.deliveryDate}
          </Text>
        </View>
      </View>
    </View>
  );
}
