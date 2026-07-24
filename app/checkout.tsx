import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "@/constants/design-tokens";
import {
  formatPhilippinePeso,
  getProductDetails,
} from "@/constants/product-details-data";
import { useCartStore } from "@/stores/cart-store";

const FIGMA_CONTENT_WIDTH = 343;

export default function CheckoutScreen() {
  const router = useRouter();
  const { productId, size } = useLocalSearchParams<{
    productId?: string | string[];
    size?: string | string[];
  }>();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const cartItems = useCartStore((state) => state.items);
  const selectedProductId = Array.isArray(productId)
    ? productId[0]
    : productId;
  const selectedSize = Array.isArray(size) ? size[0] : size;
  const product = getProductDetails(selectedProductId);
  const contentWidth = Math.min(
    FIGMA_CONTENT_WIDTH,
    Math.max(0, width - spacing.md * 2),
  );

  const checkoutItems = useMemo(
    () =>
      selectedProductId
        ? [
            {
              id: product.id,
              image: product.gallery[0].image,
              price: product.price,
              quantity: 1,
              size: selectedSize || "7 UK",
              title: product.title,
            },
          ]
        : cartItems,
    [cartItems, product, selectedProductId, selectedSize],
  );

  const total = checkoutItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
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

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <View className="h-[56px] items-center justify-center">
          <View
            className="h-full flex-row items-center"
            style={{ width: contentWidth }}
          >
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              className="h-[44px] w-[44px] items-start justify-center active:opacity-60"
              hitSlop={4}
              onPress={() => router.back()}
            >
              <Image
                accessible={false}
                contentFit="contain"
                source={require("@/assets/icons/product-details/back.svg")}
                style={{ height: 20, width: 20 }}
              />
            </Pressable>
            <Text
              accessibilityRole="header"
              className="font-montserrat-semibold text-lg text-neutral-1000"
            >
              Checkout
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: spacing.lg,
          }}
          decelerationRate="normal"
          showsVerticalScrollIndicator={false}
        >
          <View
            className="rounded-md bg-neutral-0 p-md shadow-sm"
            style={{ width: contentWidth }}
          >
            <Text className="font-montserrat-semibold text-md text-neutral-1000">
              Order summary
            </Text>

            {checkoutItems.length === 0 ? (
              <Text className="mt-md font-montserrat-regular text-sm text-neutral-600">
                Your cart is empty.
              </Text>
            ) : (
              checkoutItems.map((item) => (
                <View
                  className="mt-md flex-row border-b border-neutral-200 pb-md"
                  key={`${item.id}-${item.size}`}
                >
                  <Image
                    accessibilityLabel={item.title}
                    contentFit="cover"
                    source={item.image}
                    style={{ borderRadius: 8, height: 76, width: 76 }}
                  />
                  <View className="ml-[12px] flex-1">
                    <Text
                      className="font-montserrat-semibold text-sm text-neutral-1000"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text className="mt-[4px] font-montserrat-regular text-xs text-neutral-475">
                      Size {item.size} · Qty {item.quantity}
                    </Text>
                    <Text className="mt-[8px] font-montserrat-semibold text-sm text-brand-primary">
                      {formatPhilippinePeso(item.price * item.quantity)}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <View className="mt-md flex-row items-center justify-between">
              <Text className="font-montserrat-semibold text-md text-neutral-1000">
                Total
              </Text>
              <Text className="font-montserrat-bold text-lg text-brand-primary">
                {formatPhilippinePeso(total)}
              </Text>
            </View>
          </View>

          <View
            className="mt-md rounded-md bg-neutral-0 p-md shadow-sm"
            style={{ width: contentWidth }}
          >
            <Text className="font-montserrat-semibold text-sm text-neutral-1000">
              Delivery and payment
            </Text>
            <Text className="mt-[8px] font-montserrat-regular text-xs text-neutral-600">
              Delivery addresses and payment methods will be connected when the
              backend checkout flow is added.
            </Text>
          </View>

          <Pressable
            accessibilityHint="Payment is not connected yet"
            accessibilityLabel="Continue to payment"
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            className="mt-lg h-[52px] items-center justify-center rounded-input bg-neutral-300"
            disabled
            style={{ width: contentWidth }}
          >
            <Text className="font-montserrat-semibold text-sm text-neutral-0">
              Continue to Payment
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
