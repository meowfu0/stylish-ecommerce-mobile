import { Image } from "expo-image";
import { Text, View } from "react-native";

import type { CheckoutLineItem } from "@/constants/checkout-data";
import {
  getCheckoutDiscountPercent,
  getCheckoutItemTotal,
} from "@/constants/checkout-data";
import { formatPhilippinePeso } from "@/constants/product-details-data";

const FILLED_STAR = require("@/assets/icons/home/product-3.svg");
const EMPTY_STAR = require("@/assets/icons/home/product-9.svg");

type CheckoutItemProps = {
  item: CheckoutLineItem;
  width: number;
};

export function CheckoutItem({ item, width }: CheckoutItemProps) {
  const horizontalPadding = 10;
  const imageWidth = Math.min(
    130,
    Math.max(104, (width - horizontalPadding * 2) * 0.42),
  );
  const imageHeight = (imageWidth * 125) / 130;
  const itemTotal = getCheckoutItemTotal(item);
  const discountPercent = getCheckoutDiscountPercent(item);
  const filledStars = Math.floor(item.rating);

  return (
    <View
      accessible
      accessibilityLabel={`${item.title}. Variants ${item.variants.join(", ")}. Rated ${item.rating} out of 5. Price ${formatPhilippinePeso(item.price)}. ${discountPercent} percent off. Quantity ${item.quantity}. Item total ${formatPhilippinePeso(itemTotal)}.`}
      className="min-h-[191px] rounded-[6px] bg-neutral-0 px-[10px] pb-[8px] pt-[10px] shadow-sm"
      style={{ width }}
      testID="motion-card"
    >
      <View className="flex-row">
        <View
          style={{
            borderRadius: 4,
            height: imageHeight,
            overflow: "hidden",
            width: imageWidth,
          }}
          testID="motion-image-frame"
        >
          <Image
            accessible={false}
            contentFit="cover"
            recyclingKey={item.id}
            source={item.image}
            style={{ height: "100%", width: "100%" }}
            transition={120}
          />
        </View>

        <View className="ml-[8px] min-w-0 flex-1 pt-[4px]">
          <Text
            className="font-montserrat-semibold text-sm text-neutral-1000"
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <View className="mt-[4px] flex-row flex-wrap items-center gap-[5px]">
            <Text className="font-montserrat-medium text-xs text-neutral-1000">
              Variations :
            </Text>
            {item.variants.map((variant) => (
              <View
                className="h-[17px] min-w-[39px] items-center justify-center rounded-[2px] border border-neutral-300 px-[5px]"
                key={variant}
              >
                <Text className="font-montserrat-medium text-micro text-neutral-1000">
                  {variant}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-[7px] flex-row items-center">
            <Text className="mr-[4px] font-montserrat-medium text-xs text-neutral-1000">
              {item.rating.toFixed(1)}
            </Text>
            {[0, 1, 2, 3, 4].map((star) => (
              <Image
                accessible={false}
                contentFit="contain"
                key={star}
                source={star < filledStars ? FILLED_STAR : EMPTY_STAR}
                style={{ height: 13, width: 13 }}
              />
            ))}
          </View>

          <View className="mt-[7px] flex-row items-center">
            <View className="h-[29px] min-w-[84px] items-center justify-center rounded-[4px] border border-neutral-300 px-[8px]">
              <Text className="font-montserrat-semibold text-md text-neutral-1000">
                {formatPhilippinePeso(item.price)}
              </Text>
            </View>
            <View className="ml-[10px]">
              <Text className="font-montserrat-medium text-[8px] leading-[12px] text-brand-primary">
                up to {discountPercent}% off
              </Text>
              <Text className="font-montserrat-medium text-xs text-neutral-400 line-through">
                {formatPhilippinePeso(item.oldPrice)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="mt-[10px] h-px bg-neutral-300" />
      <View className="mt-[7px] flex-row items-center justify-between px-[2px]">
        <Text className="font-montserrat-medium text-xs text-neutral-1000">
          Total Order ({item.quantity}) :
        </Text>
        <Text className="font-montserrat-semibold text-xs text-neutral-1000">
          {formatPhilippinePeso(itemTotal)}
        </Text>
      </View>
    </View>
  );
}
