import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/navigation/screen-header";
import { formatPaymentPrice } from "@/constants/payment-data";

const CONTENT_WIDTH = 309;

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { method, total } = useLocalSearchParams<{
    method?: string | string[];
    total?: string | string[];
  }>();
  const contentWidth = Math.min(CONTENT_WIDTH, Math.max(0, width - 66));
  const routeMethod = Array.isArray(method) ? method[0] : method;
  const routeTotal = Array.isArray(total) ? total[0] : total;
  const parsedTotal = Number(routeTotal);
  const formattedTotal = formatPaymentPrice(
    Number.isFinite(parsedTotal) ? parsedTotal : 0,
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/payment");
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-25" edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScreenHeader
        backHint="Returns to Payment Success"
        onBack={goBack}
        title="Order Confirmation"
      />

      <View className="flex-1 items-center justify-center px-[33px] pb-[62px]">
        <View
          className="items-center rounded-md bg-neutral-0 p-lg shadow-sm"
          style={{ width: contentWidth }}
        >
          <Text
            accessibilityRole="header"
            className="text-center font-montserrat-bold text-xl text-neutral-1000"
          >
            Order confirmed
          </Text>
          <Text className="mt-[10px] text-center font-montserrat-regular text-sm text-neutral-600">
            Your frontend demo order is ready. No real payment was processed.
          </Text>

          <View className="my-lg h-px w-full bg-neutral-200" />
          <View className="w-full flex-row justify-between">
            <Text className="font-montserrat-regular text-xs text-neutral-600">
              Payment method
            </Text>
            <Text className="font-montserrat-semibold text-xs text-neutral-1000">
              {routeMethod ?? "Visa"}
            </Text>
          </View>
          <View className="mt-[12px] w-full flex-row justify-between">
            <Text className="font-montserrat-regular text-xs text-neutral-600">
              Total
            </Text>
            <Text className="font-montserrat-bold text-sm text-brand-primary">
              {formattedTotal}
            </Text>
          </View>

          <Pressable
            accessibilityHint="Returns to the Home screen"
            accessibilityLabel="Continue shopping"
            accessibilityRole="button"
            className="mt-lg h-[52px] w-full items-center justify-center rounded-sm bg-brand-primary active:opacity-80"
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text className="font-montserrat-semibold text-md text-neutral-0">
              Continue Shopping
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
