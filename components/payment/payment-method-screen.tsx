import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
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
  type PaymentMethod,
  type PaymentSummary,
} from "@/constants/payment-data";
import {
  getResponsiveContentWidth,
  isDesktopWeb,
} from "@/constants/responsive";

const FIGMA_CONTENT_WIDTH = 309;
const FIGMA_HORIZONTAL_INSET = 33;

type PaymentMethodScreenProps = {
  animateEntrance?: boolean;
  interactionEnabled?: boolean;
  onBack: () => void;
  onContinue: (summary: PaymentSummary) => void;
  onNavigate: (route: BottomNavigationRoute) => void;
  onSelectMethod: (method: PaymentMethod) => void;
  orderAmount: number;
  selectedMethod: PaymentMethod;
};

export function PaymentMethodScreen({
  animateEntrance = true,
  interactionEnabled = true,
  onBack,
  onContinue,
  onNavigate,
  onSelectMethod,
  orderAmount,
  selectedMethod,
}: PaymentMethodScreenProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(
    reduceMotion || !animateEntrance ? 1 : 0,
  );
  const desktopWeb = isDesktopWeb(width);
  const contentWidth = getResponsiveContentWidth({
    desktopMax: 920,
    mobileGutter: FIGMA_HORIZONTAL_INSET,
    mobileMax: FIGMA_CONTENT_WIDTH,
    width,
  });
  const summaryWidth = desktopWeb ? 300 : contentWidth;
  const paymentWidth = desktopWeb
    ? contentWidth - summaryWidth - 32
    : contentWidth;
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
    entranceProgress.value =
      reduceMotion || !animateEntrance
        ? 1
        : withTiming(1, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
          });
  }, [animateEntrance, entranceProgress, reduceMotion]);

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-25"
      edges={desktopWeb ? [] : ["top"]}
    >
      <StatusBar style="dark" />

      <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <ScreenHeader
          backHint="Returns to Place Order"
          onBack={onBack}
          title="Checkout"
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: desktopWeb ? 48 : 24,
          }}
          decelerationRate="normal"
          directionalLockEnabled
          scrollEnabled={interactionEnabled}
          showsVerticalScrollIndicator={desktopWeb}
        >
          <View
            className={
              desktopWeb ? "flex-row items-start gap-xl pt-xl" : "pt-[7px]"
            }
            style={{ width: contentWidth }}
          >
            <View
              className={
                desktopWeb
                  ? "rounded-lg border border-neutral-200 bg-neutral-0 p-lg shadow-sm"
                  : ""
              }
              style={{ width: summaryWidth }}
            >
              {desktopWeb ? (
                <Text
                  accessibilityRole="header"
                  className="mb-lg font-serif text-[30px] leading-[36px] text-neutral-1000"
                >
                  Order summary
                </Text>
              ) : null}
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
            </View>

            <View
              className={
                desktopWeb
                  ? "rounded-lg border border-neutral-200 bg-neutral-0 p-lg shadow-sm"
                  : ""
              }
              style={{ width: paymentWidth }}
            >
              <Text
                accessibilityRole="header"
                className={`font-montserrat-medium text-neutral-900 ${
                  desktopWeb
                    ? "font-serif text-[30px] leading-[36px]"
                    : "mt-[26px] text-action leading-[27px]"
                }`}
              >
                Payment
              </Text>

              <View
                accessibilityLabel="Payment methods"
                className={`mt-lg ${desktopWeb ? "gap-sm" : "gap-[25px]"}`}
              >
                {MOCK_PAYMENT_METHODS.map((method) => (
                  <PaymentOption
                    disabled={!interactionEnabled}
                    key={method.id}
                    method={method}
                    onSelect={onSelectMethod}
                    selected={method.id === selectedMethod.id}
                  />
                ))}
              </View>

              <Pressable
                accessibilityHint="Opens the frontend-only Payment Success screen"
                accessibilityLabel={`Continue with ${selectedMethod.label}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !interactionEnabled }}
                className="mt-[25px] h-[59px] items-center justify-center rounded-sm bg-brand-primary active:opacity-80"
                disabled={!interactionEnabled}
                onPress={() => onContinue(summary)}
              >
                <Text className="font-montserrat-bold text-[22px] leading-[22px] text-neutral-0">
                  Continue
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {!desktopWeb ? (
          <BottomNavigation activeRoute="cart" onNavigate={onNavigate} />
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}
