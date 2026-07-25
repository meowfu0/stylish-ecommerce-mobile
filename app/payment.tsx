import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BottomNavigation,
  type BottomNavigationRoute,
} from "@/components/navigation/bottom-navigation";
import { ScreenHeader } from "@/components/navigation/screen-header";
import { PaymentOption } from "@/components/payment/payment-option";
import { PriceRow } from "@/components/place-order/price-row";
import {
  calculatePaymentSummary,
  formatPaymentPrice,
  MOCK_PAYMENT_METHODS,
  MOCK_PAYMENT_ORDER_AMOUNT,
  type PaymentMethod,
} from "@/constants/payment-data";

const FIGMA_CONTENT_WIDTH = 309;
const FIGMA_HORIZONTAL_INSET = 33;

const TAB_DESTINATIONS = {
  cart: "/(tabs)/cart",
  home: "/(tabs)/home",
  search: "/(tabs)/search",
  settings: "/(tabs)/settings",
  wishlist: "/(tabs)/wishlist",
} as const;

export default function PaymentScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const { total } = useLocalSearchParams<{
    total?: string | string[];
  }>();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    MOCK_PAYMENT_METHODS[0],
  );

  const contentWidth = Math.min(
    FIGMA_CONTENT_WIDTH,
    Math.max(0, width - FIGMA_HORIZONTAL_INSET * 2),
  );
  const routeTotal = Array.isArray(total) ? total[0] : total;
  const parsedOrderAmount = Number(routeTotal);
  const orderAmount = Number.isFinite(parsedOrderAmount)
    ? parsedOrderAmount
    : MOCK_PAYMENT_ORDER_AMOUNT;
  const summary = useMemo(
    () => calculatePaymentSummary(orderAmount),
    [orderAmount],
  );

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [
      {
        translateY: interpolate(entranceProgress.value, [0, 1], [10, 0]),
      },
    ],
  }));

  useEffect(() => {
    entranceProgress.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
  }, [entranceProgress, reduceMotion]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/place-order");
  };

  const openTab = (route: BottomNavigationRoute) => {
    router.push(TAB_DESTINATIONS[route]);
  };

  const continueToSuccess = () => {
    router.push({
      pathname: "/order-success",
      params: {
        method: selectedMethod.label,
        total: String(summary.total),
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-25" edges={["top"]}>
      <StatusBar style="dark" />

      <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <ScreenHeader
          backHint="Returns to Place Order"
          onBack={goBack}
          title="Checkout"
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ alignItems: "center", paddingBottom: 24 }}
          decelerationRate="normal"
          directionalLockEnabled
          showsVerticalScrollIndicator={false}
        >
          <View className="pt-[7px]" style={{ width: contentWidth }}>
            <PriceRow
              label="Order"
              labelTone="muted"
              size="summary"
              value={formatPaymentPrice(summary.orderAmount)}
              valueTone="muted"
            />
            <PriceRow
              label="Shipping"
              labelTone="muted"
              size="summary"
              value={formatPaymentPrice(summary.shippingFee)}
              valueTone="muted"
            />
            <PriceRow
              label="Total"
              labelTone="tertiary"
              size="summary"
              value={formatPaymentPrice(summary.total)}
              valueTone="tertiary"
            />

            <View className="mt-[13px] h-[1.5px] bg-neutral-300" />

            <Text
              accessibilityRole="header"
              className="mt-[26px] font-montserrat-medium text-action leading-[27px] text-neutral-900"
            >
              Payment
            </Text>

            <View
              accessibilityLabel="Payment methods"
              className="mt-[10px] gap-[25px]"
            >
              {MOCK_PAYMENT_METHODS.map((method) => (
                <PaymentOption
                  key={method.id}
                  method={method}
                  onSelect={setSelectedMethod}
                  selected={method.id === selectedMethod.id}
                />
              ))}
            </View>

            <Pressable
              accessibilityHint="Opens the frontend-only Order Success screen"
              accessibilityLabel={`Continue with ${selectedMethod.label}`}
              accessibilityRole="button"
              className="mt-[25px] h-[59px] items-center justify-center rounded-sm bg-brand-primary active:opacity-80"
              onPress={continueToSuccess}
            >
              <Text className="font-montserrat-bold text-[22px] leading-[22px] text-neutral-0">
                Continue
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        <BottomNavigation
          activeRoute="cart"
          onNavigate={openTab}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
