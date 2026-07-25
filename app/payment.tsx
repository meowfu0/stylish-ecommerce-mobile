import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import type { BottomNavigationRoute } from "@/components/navigation/bottom-navigation";
import { PaymentMethodScreen } from "@/components/payment/payment-method-screen";
import {
  MOCK_PAYMENT_METHODS,
  MOCK_PAYMENT_ORDER_AMOUNT,
  type PaymentMethod,
  type PaymentSummary,
} from "@/constants/payment-data";

const TAB_DESTINATIONS = {
  cart: "/(tabs)/cart",
  home: "/(tabs)/home",
  search: "/(tabs)/search",
  settings: "/(tabs)/settings",
  wishlist: "/(tabs)/wishlist",
} as const;

export default function PaymentScreen() {
  const router = useRouter();
  const { total } = useLocalSearchParams<{
    total?: string | string[];
  }>();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    MOCK_PAYMENT_METHODS[0],
  );

  const routeTotal = Array.isArray(total) ? total[0] : total;
  const parsedOrderAmount = Number(routeTotal);
  const orderAmount = Number.isFinite(parsedOrderAmount)
    ? parsedOrderAmount
    : MOCK_PAYMENT_ORDER_AMOUNT;

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

  const continueToSuccess = (summary: PaymentSummary) => {
    router.push({
      pathname: "/payment-success",
      params: {
        methodId: selectedMethod.id,
        method: selectedMethod.label,
        orderAmount: String(summary.orderAmount),
        total: String(summary.total),
      },
    });
  };

  return (
    <PaymentMethodScreen
      onBack={goBack}
      onContinue={continueToSuccess}
      onNavigate={openTab}
      onSelectMethod={setSelectedMethod}
      orderAmount={orderAmount}
      selectedMethod={selectedMethod}
    />
  );
}
