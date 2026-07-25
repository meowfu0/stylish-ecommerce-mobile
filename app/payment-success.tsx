import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

import { PaymentMethodScreen } from "@/components/payment/payment-method-screen";
import { PaymentSuccessModal } from "@/components/payment/payment-success-modal";
import {
  MOCK_PAYMENT_METHODS,
  MOCK_PAYMENT_ORDER_AMOUNT,
  MOCK_PAYMENT_SHIPPING_FEE,
} from "@/constants/payment-data";

function getRouteValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { method, methodId, orderAmount, total } = useLocalSearchParams<{
    method?: string | string[];
    methodId?: string | string[];
    orderAmount?: string | string[];
    total?: string | string[];
  }>();

  const selectedMethod = useMemo(() => {
    const routeMethodId = getRouteValue(methodId);

    return (
      MOCK_PAYMENT_METHODS.find(
        (paymentMethod) => paymentMethod.id === routeMethodId,
      ) ?? MOCK_PAYMENT_METHODS[0]
    );
  }, [methodId]);

  const resolvedOrderAmount = useMemo(() => {
    const parsedOrderAmount = Number(getRouteValue(orderAmount));

    if (Number.isFinite(parsedOrderAmount)) {
      return parsedOrderAmount;
    }

    const parsedTotal = Number(getRouteValue(total));
    return Number.isFinite(parsedTotal)
      ? Math.max(0, parsedTotal - MOCK_PAYMENT_SHIPPING_FEE)
      : MOCK_PAYMENT_ORDER_AMOUNT;
  }, [orderAmount, total]);

  const continueToOrderConfirmation = () => {
    router.replace({
      pathname: "/order-success",
      params: {
        method: getRouteValue(method) ?? selectedMethod.label,
        total: getRouteValue(total),
      },
    });
  };

  return (
    <View className="flex-1 bg-neutral-25">
      <View
        accessibilityElementsHidden
        className="flex-1"
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <PaymentMethodScreen
          animateEntrance={false}
          interactionEnabled={false}
          onBack={() => undefined}
          onContinue={() => undefined}
          onNavigate={() => undefined}
          onSelectMethod={() => undefined}
          orderAmount={resolvedOrderAmount}
          selectedMethod={selectedMethod}
        />
      </View>

      <PaymentSuccessModal
        onContinue={continueToOrderConfirmation}
        onHome={() => router.replace("/(tabs)/home")}
      />
    </View>
  );
}
