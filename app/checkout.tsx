import { Image } from "expo-image";
import { useRouter } from "expo-router";
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

import { ScrollReveal } from "@/components/animated/scroll-reveal";
import { AddressCard } from "@/components/checkout/address-card";
import { AddressEditorModal } from "@/components/checkout/address-editor-modal";
import { CheckoutItem } from "@/components/checkout/checkout-item";
import {
  getCheckoutSavings,
  getCheckoutSubtotal,
  MOCK_CHECKOUT_ITEMS,
  MOCK_DELIVERY_ADDRESS,
  type CheckoutAddress,
} from "@/constants/checkout-data";
import { spacing } from "@/constants/design-tokens";
import { formatPhilippinePeso } from "@/constants/product-details-data";
import {
  getResponsiveContentWidth,
  isDesktopWeb,
} from "@/constants/responsive";

const FIGMA_CONTENT_WIDTH = 331;
const FIGMA_HORIZONTAL_INSET = 22;

type AddressEditorMode = "add" | "edit";

export default function CheckoutScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const [selectedAddress, setSelectedAddress] = useState<CheckoutAddress>(
    MOCK_DELIVERY_ADDRESS,
  );
  const [addressEditorMode, setAddressEditorMode] =
    useState<AddressEditorMode>("edit");
  const [addressEditorVisible, setAddressEditorVisible] = useState(false);

  const desktopWeb = isDesktopWeb(width);
  const contentWidth = getResponsiveContentWidth({
    desktopMax: 1180,
    mobileGutter: FIGMA_HORIZONTAL_INSET,
    mobileMax: FIGMA_CONTENT_WIDTH,
    width,
  });
  const mainColumnWidth = desktopWeb
    ? Math.min(760, contentWidth * 0.66)
    : contentWidth;
  const summaryWidth = desktopWeb
    ? contentWidth - mainColumnWidth - spacing.xl
    : contentWidth;
  const addressGap = 12;
  const addAddressWidth = desktopWeb
    ? 112
    : Math.min(78, Math.max(62, contentWidth * 0.24));
  const subtotal = useMemo(() => getCheckoutSubtotal(MOCK_CHECKOUT_ITEMS), []);
  const savings = useMemo(() => getCheckoutSavings(MOCK_CHECKOUT_ITEMS), []);
  const totalQuantity = useMemo(
    () => MOCK_CHECKOUT_ITEMS.reduce((total, item) => total + item.quantity, 0),
    [],
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

    router.replace("/(tabs)/home");
  };

  const openAddressEditor = (mode: AddressEditorMode) => {
    setAddressEditorMode(mode);
    setAddressEditorVisible(true);
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
            <View className="h-[62px] border-b border-neutral-200 bg-neutral-25">
              <View className="h-full items-center justify-center">
                <Pressable
                  accessibilityHint="Returns to the previous screen"
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                  className="absolute left-[14px] h-[44px] w-[44px] items-center justify-center active:opacity-60"
                  hitSlop={4}
                  onPress={goBack}
                >
                  <Image
                    accessible={false}
                    contentFit="contain"
                    source={require("@/assets/icons/checkout/back.svg")}
                    style={{ height: 21, width: 11 }}
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
          ) : null}

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              alignItems: "center",
              paddingBottom: desktopWeb ? spacing.xxl : spacing.xl,
            }}
            decelerationRate="normal"
            directionalLockEnabled
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            showsVerticalScrollIndicator
          >
            <View
              className={desktopWeb ? "pt-xl" : "pt-[17px]"}
              style={{ width: contentWidth }}
            >
              {desktopWeb ? (
                <View className="mb-lg">
                  <Text
                    accessibilityRole="header"
                    className="font-montserrat-bold text-display tracking-[-0.8px] text-neutral-1000"
                  >
                    Checkout
                  </Text>
                  <Text className="mt-xs font-montserrat-regular text-sm text-neutral-600">
                    Confirm delivery details and review your order.
                  </Text>
                </View>
              ) : null}

              <View className={desktopWeb ? "flex-row items-start gap-xl" : ""}>
                <View style={{ width: mainColumnWidth }}>
                  <View className="flex-row items-center">
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={require("@/assets/icons/checkout/location.svg")}
                      style={{ height: 17, width: 14 }}
                    />
                    <Text className="ml-[8px] font-montserrat-semibold text-md text-neutral-1000">
                      Delivery Address
                    </Text>
                  </View>

                  <View
                    className="mt-[11px] flex-row"
                    style={{ gap: addressGap }}
                  >
                    <AddressCard
                      address={selectedAddress}
                      onEdit={() => openAddressEditor("edit")}
                    />
                    <Pressable
                      accessibilityHint="Opens a temporary new-address form"
                      accessibilityLabel="Add delivery address"
                      accessibilityRole="button"
                      className="h-[79px] items-center justify-center rounded-[6px] bg-neutral-0 shadow-sm active:opacity-70"
                      onPress={() => openAddressEditor("add")}
                      style={{ width: addAddressWidth }}
                    >
                      <Image
                        accessible={false}
                        contentFit="contain"
                        source={require("@/assets/icons/checkout/add.svg")}
                        style={{ height: 25, width: 25 }}
                      />
                    </Pressable>
                  </View>

                  <Text
                    accessibilityRole="header"
                    className="mt-[27px] font-montserrat-semibold text-md text-neutral-1000"
                  >
                    Shopping List
                  </Text>

                  <View className="mt-[10px] gap-[14px]">
                    {MOCK_CHECKOUT_ITEMS.map((item, index) => (
                      <ScrollReveal key={item.id} staggerIndex={index}>
                        <CheckoutItem item={item} width={mainColumnWidth} />
                      </ScrollReveal>
                    ))}
                  </View>
                </View>

                <ScrollReveal style={{ width: summaryWidth }}>
                  <View
                    accessible
                    accessibilityLabel={`Order summary. ${totalQuantity} items. Subtotal ${formatPhilippinePeso(subtotal)}. Savings ${formatPhilippinePeso(savings)}. Delivery is free. Total ${formatPhilippinePeso(subtotal)}.`}
                    className={`rounded-[6px] border border-neutral-200 bg-neutral-0 shadow-sm ${
                      desktopWeb
                        ? "px-lg py-lg"
                        : "mt-[14px] px-[12px] py-[14px]"
                    }`}
                    style={{ width: summaryWidth }}
                  >
                    <Text
                      accessibilityRole="header"
                      className="font-montserrat-semibold text-md text-neutral-1000"
                    >
                      Order Summary
                    </Text>
                    <View className="mt-[12px] flex-row justify-between">
                      <Text className="font-montserrat-regular text-xs text-neutral-600">
                        Subtotal ({totalQuantity} items)
                      </Text>
                      <Text className="font-montserrat-medium text-xs text-neutral-1000">
                        {formatPhilippinePeso(subtotal)}
                      </Text>
                    </View>
                    <View className="mt-[8px] flex-row justify-between">
                      <Text className="font-montserrat-regular text-xs text-neutral-600">
                        You save
                      </Text>
                      <Text className="font-montserrat-medium text-xs text-feedback-success">
                        −{formatPhilippinePeso(savings)}
                      </Text>
                    </View>
                    <View className="mt-[8px] flex-row justify-between">
                      <Text className="font-montserrat-regular text-xs text-neutral-600">
                        Delivery
                      </Text>
                      <Text className="font-montserrat-medium text-xs text-feedback-success">
                        Free
                      </Text>
                    </View>
                    <View className="my-[12px] h-px bg-neutral-300" />
                    <View className="flex-row items-center justify-between">
                      <Text className="font-montserrat-semibold text-sm text-neutral-1000">
                        Total
                      </Text>
                      <Text className="font-montserrat-bold text-md text-brand-primary">
                        {formatPhilippinePeso(subtotal)}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityHint="Opens the Place Order screen"
                      accessibilityLabel="Continue to place order"
                      accessibilityRole="button"
                      className="mt-[14px] h-[48px] items-center justify-center rounded-[5px] bg-brand-primary active:opacity-80"
                      onPress={() => router.push("/place-order")}
                    >
                      <Text className="font-montserrat-semibold text-sm text-neutral-0">
                        Place Order
                      </Text>
                    </Pressable>
                  </View>
                </ScrollReveal>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      <AddressEditorModal
        address={addressEditorMode === "edit" ? selectedAddress : null}
        mode={addressEditorMode}
        onClose={() => setAddressEditorVisible(false)}
        onSave={(address) => {
          setSelectedAddress(address);
          setAddressEditorVisible(false);
        }}
        visible={addressEditorVisible}
      />
    </>
  );
}
