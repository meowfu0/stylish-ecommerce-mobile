import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { formatPlaceOrderPrice } from "@/constants/place-order-data";

type BottomCheckoutBarProps = {
  onProceed: () => void;
  onViewDetails: () => void;
  total: number;
};

export function BottomCheckoutBar({
  onProceed,
  onViewDetails,
  total,
}: BottomCheckoutBarProps) {
  const { width } = useWindowDimensions();
  const compact = width < 350;
  const contentWidth = Math.min(349, Math.max(0, width - 44));

  return (
    <View className="min-h-[112px] items-center rounded-t-[24px] border border-neutral-200 bg-neutral-50 pb-md pt-[20px]">
      <View
        className="flex-row items-center gap-[14px]"
        style={{ width: contentWidth }}
      >
        <View className={compact ? "w-[92px]" : "w-[108px]"}>
          <Text
            accessibilityLabel={`Order total ${formatPlaceOrderPrice(total)}`}
            className="font-montserrat-semibold text-md text-neutral-1000"
            numberOfLines={1}
          >
            {formatPlaceOrderPrice(total)}
          </Text>
          <Pressable
            accessibilityHint="Scrolls to the order payment details"
            accessibilityLabel="View order details"
            accessibilityRole="button"
            className="mt-[6px] self-start active:opacity-60"
            onPress={onViewDetails}
          >
            <Text className="font-montserrat-semibold text-xs text-brand-primary">
              View Details
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityHint="Opens the frontend-only Payment screen"
          accessibilityLabel={`Proceed to payment for ${formatPlaceOrderPrice(total)}`}
          accessibilityRole="button"
          className="h-[52px] min-w-0 flex-1 items-center justify-center rounded-[5px] bg-brand-primary px-[10px] active:opacity-80"
          onPress={onProceed}
        >
          <Text
            className="text-center font-montserrat-semibold text-md text-neutral-0"
            numberOfLines={1}
          >
            Proceed to Payment
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
