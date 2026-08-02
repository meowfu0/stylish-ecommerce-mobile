import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  type LayoutChangeEvent,
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

import { BottomCheckoutBar } from "@/components/place-order/bottom-checkout-bar";
import { CartItem } from "@/components/place-order/cart-item";
import { PriceRow } from "@/components/place-order/price-row";
import {
  SelectionSheet,
  type SelectionSheetOption,
} from "@/components/place-order/selection-sheet";
import { spacing } from "@/constants/design-tokens";
import {
  calculatePlaceOrderTotals,
  formatPlaceOrderPrice,
  MOCK_PLACE_ORDER_COUPONS,
  MOCK_PLACE_ORDER_PRODUCT,
  type PlaceOrderCoupon,
} from "@/constants/place-order-data";
import {
  getResponsiveContentWidth,
  isDesktopWeb,
} from "@/constants/responsive";

const FIGMA_CONTENT_WIDTH = 349;
const FIGMA_HORIZONTAL_INSET = 22;

type OpenSheet = "coupon" | "quantity" | "size" | null;

const sizeOptions: readonly SelectionSheetOption[] =
  MOCK_PLACE_ORDER_PRODUCT.sizes.map((size) => ({
    label: `Size ${size}`,
    value: size,
  }));

const quantityOptions: readonly SelectionSheetOption[] =
  MOCK_PLACE_ORDER_PRODUCT.quantities.map((quantity) => ({
    label: `Quantity ${quantity}`,
    value: String(quantity),
  }));

const couponOptions: readonly SelectionSheetOption[] = [
  {
    description: "Continue without a coupon.",
    label: "No coupon",
    value: "none",
  },
  ...MOCK_PLACE_ORDER_COUPONS.map((coupon) => ({
    description: coupon.description,
    label: coupon.code,
    value: coupon.id,
  })),
];

export default function PlaceOrderScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const scrollRef = useRef<ScrollView>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [paymentDetailsY, setPaymentDetailsY] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedCoupon, setSelectedCoupon] = useState<PlaceOrderCoupon | null>(
    null,
  );
  const [selectedSize, setSelectedSize] = useState("42");

  const desktopWeb = isDesktopWeb(width);
  const contentWidth = getResponsiveContentWidth({
    desktopMax: 900,
    mobileGutter: FIGMA_HORIZONTAL_INSET,
    mobileMax: FIGMA_CONTENT_WIDTH,
    width,
  });
  const totals = useMemo(
    () =>
      calculatePlaceOrderTotals(
        MOCK_PLACE_ORDER_PRODUCT,
        quantity,
        selectedCoupon,
      ),
    [quantity, selectedCoupon],
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

    router.replace("/checkout");
  };

  const capturePaymentDetailsPosition = (event: LayoutChangeEvent) => {
    setPaymentDetailsY(event.nativeEvent.layout.y);
  };

  const scrollToPaymentDetails = () => {
    scrollRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, paymentDetailsY - spacing.md),
    });
  };

  const proceedToPayment = () => {
    router.push({
      pathname: "/payment",
      params: {
        coupon: selectedCoupon?.code ?? "None",
        quantity: String(quantity),
        size: selectedSize,
        total: String(totals.orderTotal),
      },
    });
  };

  return (
    <>
      <SafeAreaView
        className="flex-1 bg-neutral-25"
        edges={desktopWeb ? [] : ["top", "bottom"]}
      >
        <StatusBar style="dark" />

        <Animated.View style={[{ flex: 1 }, entranceStyle]}>
          {!desktopWeb ? (
            <View className="h-[62px] items-center justify-center bg-neutral-25">
              <View
                className="h-full items-center justify-center"
                style={{ width: contentWidth }}
              >
                <Pressable
                  accessibilityHint="Returns to the previous screen"
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                  className="absolute left-[-14px] h-[44px] w-[44px] items-center justify-center active:opacity-60"
                  hitSlop={4}
                  onPress={goBack}
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
                  Shopping Bag
                </Text>

                <Pressable
                  accessibilityHint={
                    isFavorite
                      ? "Removes this item from favorites"
                      : "Adds this item to favorites"
                  }
                  accessibilityLabel={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFavorite }}
                  className={`absolute right-[-10px] h-[44px] w-[44px] items-center justify-center rounded-pill border active:opacity-60 ${
                    isFavorite
                      ? "border-brand-primary bg-brand-socialSurface"
                      : "border-transparent"
                  }`}
                  hitSlop={4}
                  onPress={() => setIsFavorite((current) => !current)}
                >
                  <Image
                    accessible={false}
                    contentFit="contain"
                    source={require("@/assets/icons/place-order/favorite.svg")}
                    style={{ height: 16, width: 20 }}
                  />
                  {isFavorite ? (
                    <View className="absolute right-[7px] top-[7px] h-[6px] w-[6px] rounded-pill bg-brand-primary" />
                  ) : null}
                </Pressable>
              </View>
            </View>
          ) : null}

          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{
              alignItems: "center",
              paddingBottom: desktopWeb ? spacing.xxl : spacing.lg,
            }}
            decelerationRate="normal"
            directionalLockEnabled
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={desktopWeb}
          >
            <View
              className={`${
                desktopWeb
                  ? "my-xl rounded-lg border border-neutral-200 bg-neutral-0 p-[40px] shadow-sm"
                  : "pt-[5px]"
              }`}
              style={{ width: contentWidth }}
            >
              {desktopWeb ? (
                <View className="mb-lg">
                  <Text
                    accessibilityRole="header"
                    className="font-montserrat-bold text-display tracking-[-0.8px] text-neutral-1000"
                  >
                    Shopping bag
                  </Text>
                  <Text className="mt-xs font-montserrat-regular text-sm text-neutral-600">
                    Choose product options, apply a coupon, and review your
                    total.
                  </Text>
                </View>
              ) : null}
              <CartItem
                contentWidth={contentWidth}
                onQuantityPress={() => setOpenSheet("quantity")}
                onSizePress={() => setOpenSheet("size")}
                product={MOCK_PLACE_ORDER_PRODUCT}
                quantity={quantity}
                selectedSize={selectedSize}
              />

              <Pressable
                accessibilityHint="Opens temporary coupon choices"
                accessibilityLabel={
                  selectedCoupon
                    ? `Applied coupon ${selectedCoupon.code}. Change coupon`
                    : "Apply coupons"
                }
                accessibilityRole="button"
                className="mt-[54px] min-h-[44px] flex-row items-center active:opacity-65"
                onPress={() => setOpenSheet("coupon")}
              >
                <Image
                  accessible={false}
                  contentFit="contain"
                  source={require("@/assets/icons/place-order/coupon.svg")}
                  style={{ height: 20, width: 31 }}
                />
                <Text className="ml-[10px] font-montserrat-medium text-md text-neutral-1000">
                  Apply Coupons
                </Text>
                <Text className="ml-auto font-montserrat-semibold text-sm text-brand-primary">
                  {selectedCoupon?.code ?? "Select"}
                </Text>
              </Pressable>

              <View className="mt-[26px] h-px bg-neutral-300" />

              <View
                className="pt-[33px]"
                onLayout={capturePaymentDetailsPosition}
              >
                <Text
                  accessibilityRole="header"
                  className="font-montserrat-medium text-[17px] leading-[22px] text-neutral-1000"
                >
                  Order Payment Details
                </Text>

                <View className="mt-[22px]">
                  <PriceRow
                    label="Order Amounts"
                    value={formatPlaceOrderPrice(totals.subtotal)}
                  />
                  <PriceRow
                    detailLabel="Know More"
                    label="Convenience"
                    onDetailPress={() =>
                      Alert.alert(
                        "Convenience",
                        "Coupons are applied locally for this frontend preview. No payment service is connected.",
                      )
                    }
                    onValuePress={() => setOpenSheet("coupon")}
                    value={
                      selectedCoupon ? selectedCoupon.code : "Apply Coupon"
                    }
                    valueTone="accent"
                  />
                  {selectedCoupon ? (
                    <PriceRow
                      label="Coupon Discount"
                      onValuePress={() => setOpenSheet("coupon")}
                      value={`−${formatPlaceOrderPrice(totals.couponDiscount)}`}
                      valueTone="success"
                    />
                  ) : null}
                  <PriceRow
                    label="Delivery Fee"
                    value={
                      totals.deliveryFee === 0
                        ? "Free"
                        : formatPlaceOrderPrice(totals.deliveryFee)
                    }
                    valueTone={totals.deliveryFee === 0 ? "accent" : "default"}
                  />
                </View>
              </View>

              <View className="mt-[25px] h-px bg-neutral-300" />

              <View className="pt-[22px]">
                <PriceRow
                  label="Order Total"
                  value={formatPlaceOrderPrice(totals.orderTotal)}
                />
                <PriceRow
                  detailLabel="Details"
                  label="EMI Available"
                  onDetailPress={() =>
                    Alert.alert(
                      "EMI Details",
                      "Installment options are UI-only and will be connected when real payment support is added.",
                    )
                  }
                />
              </View>
            </View>
          </ScrollView>

          <BottomCheckoutBar
            onProceed={proceedToPayment}
            onViewDetails={scrollToPaymentDetails}
            total={totals.orderTotal}
          />
        </Animated.View>
      </SafeAreaView>

      <SelectionSheet
        onClose={() => setOpenSheet(null)}
        onSelect={setSelectedSize}
        options={sizeOptions}
        selectedValue={selectedSize}
        title="Select Size"
        visible={openSheet === "size"}
      />
      <SelectionSheet
        onClose={() => setOpenSheet(null)}
        onSelect={(value) => setQuantity(Number(value))}
        options={quantityOptions}
        selectedValue={String(quantity)}
        title="Select Quantity"
        visible={openSheet === "quantity"}
      />
      <SelectionSheet
        onClose={() => setOpenSheet(null)}
        onSelect={(value) =>
          setSelectedCoupon(
            MOCK_PLACE_ORDER_COUPONS.find((coupon) => coupon.id === value) ??
              null,
          )
        }
        options={couponOptions}
        selectedValue={selectedCoupon?.id ?? "none"}
        title="Select Coupon"
        visible={openSheet === "coupon"}
      />
    </>
  );
}
