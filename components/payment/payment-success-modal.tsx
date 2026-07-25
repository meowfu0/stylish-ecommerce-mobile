import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/design-tokens";

const FIGMA_FRAME_HEIGHT = 852;
const FIGMA_MODAL_TOP = 260;
const FIGMA_MODAL_WIDTH = 331;
const FIGMA_MODAL_HEIGHT = 201;
const FIGMA_HORIZONTAL_INSET = 22;
const FIGMA_PAYMENT_BUTTON_TOP_AFTER_SAFE_AREA = 608;
const READY_DELAY_MS = 900;

type PaymentSuccessModalProps = {
  onContinue: () => void;
  onHome: () => void;
};

export function PaymentSuccessModal({
  onContinue,
  onHome,
}: PaymentSuccessModalProps) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const overlayProgress = useSharedValue(reduceMotion ? 1 : 0);
  const modalProgress = useSharedValue(reduceMotion ? 1 : 0);
  const [canContinue, setCanContinue] = useState(false);

  const modalWidth = Math.min(
    FIGMA_MODAL_WIDTH,
    Math.max(0, width - FIGMA_HORIZONTAL_INSET * 2),
  );
  const scale = modalWidth / FIGMA_MODAL_WIDTH;
  const modalHeight = FIGMA_MODAL_HEIGHT * scale;
  const modalLeft = (width - modalWidth) / 2;
  const modalTop = Math.max(
    insets.top + 130,
    Math.min(
      (height / FIGMA_FRAME_HEIGHT) * FIGMA_MODAL_TOP,
      height - insets.bottom - modalHeight - 136,
    ),
  );
  const paymentButtonWidth = Math.min(309, Math.max(0, width - 66));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(overlayProgress.value, [0, 1], [0, 0.6]),
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalProgress.value,
    transform: [
      {
        scale: interpolate(modalProgress.value, [0, 1], [0.94, 1]),
      },
      {
        translateY: interpolate(modalProgress.value, [0, 1], [8, 0]),
      },
    ],
  }));

  useEffect(() => {
    overlayProgress.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
        });
    modalProgress.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });

    const readyTimer = setTimeout(() => {
      setCanContinue(true);
      AccessibilityInfo.announceForAccessibility(
        "Payment completed successfully. Continue to order confirmation or Home.",
      );
    }, READY_DELAY_MS);

    return () => clearTimeout(readyTimer);
  }, [modalProgress, overlayProgress, reduceMotion]);

  return (
    <View className="absolute inset-0" pointerEvents="auto">
      <Animated.View
        className="absolute inset-0"
        pointerEvents="none"
        style={[
          { backgroundColor: colors.overlay.paymentSuccess },
          overlayStyle,
        ]}
      />

      <Animated.View
        className="absolute overflow-hidden rounded-[6px] bg-neutral-0"
        style={[
          {
            height: modalHeight,
            left: modalLeft,
            top: modalTop,
            width: modalWidth,
          },
          modalStyle,
        ]}
      >
        <Pressable
          accessibilityHint={
            canContinue
              ? "Opens the Order Confirmation screen"
              : "Available after the confirmation animation"
          }
          accessibilityLabel="Payment completed successfully"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          className="h-full w-full"
          disabled={!canContinue}
          onPress={onContinue}
        >
          <View
            className="absolute"
            style={{
              height: 84.7382 * scale,
              left: 122.94 * scale,
              top: 44.74 * scale,
              width: 85.1274 * scale,
            }}
          >
            <Image
              accessible={false}
              contentFit="fill"
              source={require("@/assets/icons/payment-success/success-badge.svg")}
              style={{ height: "100%", width: "100%" }}
            />
          </View>

          <View
            className="absolute"
            style={{
              height: 30.5 * scale,
              left: 144.6 * scale,
              top: 72.2 * scale,
              transform: [{ rotate: "4.93deg" }],
              width: 43.8284 * scale,
            }}
          >
            <Image
              accessible={false}
              contentFit="fill"
              source={require("@/assets/icons/payment-success/success-check.svg")}
              style={{ height: "100%", width: "100%" }}
            />
          </View>

          <Image
            accessible={false}
            contentFit="fill"
            source={require("@/assets/icons/payment-success/success-dot-large.svg")}
            style={{
              height: 13.0366 * scale,
              left: 78.45 * scale,
              position: "absolute",
              top: 37.42 * scale,
              width: 13.0965 * scale,
            }}
          />
          <Image
            accessible={false}
            contentFit="fill"
            source={require("@/assets/icons/payment-success/success-dot-large.svg")}
            style={{
              height: 13.0366 * scale,
              left: 218.45 * scale,
              position: "absolute",
              top: 62.42 * scale,
              width: 13.0965 * scale,
            }}
          />
          <Image
            accessible={false}
            contentFit="fill"
            source={require("@/assets/icons/payment-success/success-dot-small.svg")}
            style={{
              height: 6.5183 * scale,
              left: 168.23 * scale,
              position: "absolute",
              top: 26.21 * scale,
              width: 6.5483 * scale,
            }}
          />
          <Image
            accessible={false}
            contentFit="fill"
            source={require("@/assets/icons/payment-success/success-dot-medium.svg")}
            style={{
              height: 10.2431 * scale,
              left: 95.35 * scale,
              position: "absolute",
              top: 117.33 * scale,
              width: 10.2901 * scale,
            }}
          />
          <Image
            accessible={false}
            contentFit="fill"
            source={require("@/assets/icons/payment-success/success-dot-small.svg")}
            style={{
              height: 6.5183 * scale,
              left: 92.23 * scale,
              position: "absolute",
              top: 76.21 * scale,
              width: 6.5483 * scale,
            }}
          />
          <Image
            accessible={false}
            contentFit="fill"
            source={require("@/assets/icons/payment-success/success-dot-small.svg")}
            style={{
              height: 6.5183 * scale,
              left: 202.23 * scale,
              position: "absolute",
              top: 106.21 * scale,
              width: 6.5483 * scale,
            }}
          />

          <Text
            accessibilityLiveRegion="polite"
            className="absolute left-0 right-0 text-center font-montserrat-semibold text-sm text-neutral-900"
            style={{
              lineHeight: 27 * scale,
              top: 149 * scale,
            }}
          >
            Payment completed successfully.
          </Text>
        </Pressable>
      </Animated.View>

      <Pressable
        accessibilityHint="Opens the Order Confirmation screen"
        accessibilityLabel="Continue to Order Confirmation"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canContinue }}
        disabled={!canContinue}
        onPress={onContinue}
        style={{
          height: 59,
          left: (width - paymentButtonWidth) / 2,
          position: "absolute",
          top: insets.top + FIGMA_PAYMENT_BUTTON_TOP_AFTER_SAFE_AREA,
          width: paymentButtonWidth,
        }}
      />

      <Pressable
        accessibilityHint="Returns to the Home screen"
        accessibilityLabel="Home"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canContinue }}
        disabled={!canContinue}
        onPress={onHome}
        style={{
          bottom: 0,
          height: 58 + insets.bottom,
          left: 0,
          position: "absolute",
          width: width / 5,
        }}
      />
    </View>
  );
}
