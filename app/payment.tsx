import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatPlaceOrderPrice } from "@/constants/place-order-data";

const CONTENT_WIDTH = 349;

export default function PaymentScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { coupon, quantity, size, total } = useLocalSearchParams<{
    coupon?: string | string[];
    quantity?: string | string[];
    size?: string | string[];
    total?: string | string[];
  }>();
  const contentWidth = Math.min(CONTENT_WIDTH, Math.max(0, width - 44));
  const routeTotal = Array.isArray(total) ? total[0] : total;
  const routeSize = Array.isArray(size) ? size[0] : size;
  const routeQuantity = Array.isArray(quantity) ? quantity[0] : quantity;
  const routeCoupon = Array.isArray(coupon) ? coupon[0] : coupon;
  const numericTotal = Number(routeTotal);
  const formattedTotal = formatPlaceOrderPrice(
    Number.isFinite(numericTotal) ? numericTotal : 0,
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-25" edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View className="h-[62px] items-center justify-center border-b border-neutral-200">
        <View
          className="h-full items-center justify-center"
          style={{ width: contentWidth }}
        >
          <Pressable
            accessibilityHint="Returns to Place Order"
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className="absolute left-[-14px] h-[44px] w-[44px] items-center justify-center active:opacity-60"
            hitSlop={4}
            onPress={() => router.back()}
          >
            <Image
              accessible={false}
              contentFit="contain"
              source={require("@/assets/icons/place-order/back.svg")}
              style={{ height: 21, width: 11 }}
            />
          </Pressable>
          <Text
            accessibilityRole="header"
            className="font-montserrat-semibold text-md text-neutral-1000"
          >
            Payment
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center px-[22px] pt-xl">
        <View
          className="rounded-md bg-neutral-0 p-lg shadow-sm"
          style={{ width: contentWidth }}
        >
          <Text className="font-montserrat-semibold text-lg text-neutral-1000">
            Order ready
          </Text>
          <Text className="mt-[8px] font-montserrat-regular text-sm text-neutral-600">
            Payment methods are not connected yet. This screen confirms that
            the frontend navigation is ready for the next Figma payment flow.
          </Text>

          <View className="my-lg h-px bg-neutral-200" />
          <View className="flex-row justify-between">
            <Text className="font-montserrat-regular text-xs text-neutral-600">
              Size
            </Text>
            <Text className="font-montserrat-semibold text-xs text-neutral-1000">
              {routeSize ?? "42"}
            </Text>
          </View>
          <View className="mt-[10px] flex-row justify-between">
            <Text className="font-montserrat-regular text-xs text-neutral-600">
              Quantity
            </Text>
            <Text className="font-montserrat-semibold text-xs text-neutral-1000">
              {routeQuantity ?? "1"}
            </Text>
          </View>
          <View className="mt-[10px] flex-row justify-between">
            <Text className="font-montserrat-regular text-xs text-neutral-600">
              Coupon
            </Text>
            <Text className="font-montserrat-semibold text-xs text-neutral-1000">
              {routeCoupon ?? "None"}
            </Text>
          </View>
          <View className="mt-lg flex-row items-center justify-between">
            <Text className="font-montserrat-semibold text-sm text-neutral-1000">
              Total
            </Text>
            <Text className="font-montserrat-bold text-lg text-brand-primary">
              {formattedTotal}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
