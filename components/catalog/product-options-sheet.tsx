import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { isDesktopWeb } from "@/constants/responsive";

const SHEET_MOTION_DURATION = 240;
const SELECTION_MOTION_DURATION = 180;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const styles = StyleSheet.create({
  optionRow: {
    alignItems: "center",
    borderLeftWidth: 3,
    flexDirection: "row",
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  optionText: {
    flex: 1,
    marginLeft: spacing.sm,
    minWidth: 0,
  },
  radio: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexShrink: 0,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  radioDot: {
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.pill,
    height: 8,
    width: 8,
  },
});

export type ProductOption<Value extends string> = {
  description: string;
  label: string;
  value: Value;
};

type ProductOptionRowProps<Value extends string> = {
  onPress: () => void;
  option: ProductOption<Value>;
  reduceMotion: boolean;
  selected: boolean;
};

function ProductOptionRow<Value extends string>({
  onPress,
  option,
  reduceMotion,
  selected,
}: ProductOptionRowProps<Value>) {
  const selectionProgress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selectionProgress.value = reduceMotion
      ? selected
        ? 1
        : 0
      : withTiming(selected ? 1 : 0, {
          duration: SELECTION_MOTION_DURATION,
          easing: Easing.out(Easing.cubic),
        });
  }, [reduceMotion, selected, selectionProgress]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      [colors.neutral[0], colors.brand.socialSurface],
    ),
    borderLeftColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      ["transparent", colors.brand.primary],
    ),
  }));
  const radioStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      [colors.neutral[300], colors.brand.primary],
    ),
  }));
  const radioDotStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
    transform: [
      {
        scale: interpolate(selectionProgress.value, [0, 1], [0.45, 1]),
      },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityLabel={`${option.label}. ${option.description}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className="cursor-pointer active:opacity-75"
      focusable
      onPress={onPress}
      style={[styles.optionRow, rowStyle]}
      testID="catalog-option-row"
    >
      <Animated.View style={[styles.radio, radioStyle]}>
        <Animated.View style={[styles.radioDot, radioDotStyle]} />
      </Animated.View>

      <View style={styles.optionText}>
        <Text
          className={`font-montserrat-semibold text-sm ${
            selected ? "text-brand-primary" : "text-neutral-900"
          }`}
        >
          {option.label}
        </Text>
        <Text className="mt-[2px] font-montserrat-regular text-xs text-neutral-550">
          {option.description}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

type ProductOptionsSheetProps<Value extends string> = {
  onClose: () => void;
  onSelect: (value: Value) => void;
  options: readonly ProductOption<Value>[];
  selectedValue: Value;
  title: string;
  visible: boolean;
};

export function ProductOptionsSheet<Value extends string>({
  onClose,
  onSelect,
  options,
  selectedValue,
  title,
  visible,
}: ProductOptionsSheetProps<Value>) {
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const desktopWeb = isDesktopWeb(width);
  const animationProgress = useSharedValue(visible ? 1 : 0);
  const closeButtonRef = useRef<View>(null);
  const [mounted, setMounted] = useState(visible);

  const sheetWidth = desktopWeb
    ? Math.min(448, Math.max(0, width - 48))
    : width;
  const sheetMaxHeight = Math.max(
    0,
    Math.min(desktopWeb ? 560 : 590, height - (desktopWeb ? 64 : 12)),
  );

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [mounted, visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (visible) {
      if (reduceMotion) {
        animationProgress.value = 1;
        return;
      }

      animationProgress.value = 0;
      animationProgress.value = withTiming(1, {
        duration: SHEET_MOTION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (reduceMotion) {
      animationProgress.value = 0;
      setMounted(false);
      return;
    }

    animationProgress.value = withTiming(
      0,
      {
        duration: SHEET_MOTION_DURATION,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      },
    );
  }, [animationProgress, mounted, reduceMotion, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const focusTimer = setTimeout(
      () => {
        AccessibilityInfo.announceForAccessibility(
          `${title}. ${options.length} options available.`,
        );
        const focusableCloseButton = closeButtonRef.current as unknown as {
          focus?: () => void;
        } | null;
        focusableCloseButton?.focus?.();
      },
      reduceMotion ? 0 : SHEET_MOTION_DURATION,
    );

    return () => clearTimeout(focusTimer);
  }, [options.length, reduceMotion, title, visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: animationProgress.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: animationProgress.value,
    transform: [
      {
        translateY: interpolate(
          animationProgress.value,
          [0, 1],
          [desktopWeb ? 12 : 28, 0],
        ),
      },
      {
        scale: interpolate(
          animationProgress.value,
          [0, 1],
          [desktopWeb ? 0.97 : 0.99, 1],
        ),
      },
    ],
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      <View
        className={`flex-1 ${
          desktopWeb
            ? "items-center justify-center px-lg"
            : "items-center justify-end"
        }`}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, backdropStyle]}
        >
          <BlurView
            blurReductionFactor={3}
            experimentalBlurMethod={
              Platform.OS === "android" ? "dimezisBlurView" : "none"
            }
            intensity={desktopWeb ? 24 : 18}
            style={StyleSheet.absoluteFillObject}
            tint="dark"
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: colors.ink.footer,
                opacity: 0.42,
              },
            ]}
          />
        </Animated.View>

        <Pressable
          accessibilityLabel={`Dismiss ${title}`}
          accessibilityRole="button"
          className="absolute inset-0 cursor-pointer"
          onPress={onClose}
        />

        <Animated.View
          className={`overflow-hidden bg-neutral-0 ${
            desktopWeb
              ? "rounded-lg border border-neutral-200 shadow-lg"
              : "rounded-t-lg shadow-lg"
          }`}
          pointerEvents={visible ? "auto" : "none"}
          style={[
            {
              elevation: 16,
              maxHeight: sheetMaxHeight,
              shadowColor: colors.ink.footer,
              shadowOffset: { height: 12, width: 0 },
              shadowOpacity: 0.18,
              shadowRadius: 28,
              width: sheetWidth,
            },
            sheetStyle,
          ]}
        >
          <SafeAreaView
            accessibilityLabel={title}
            accessibilityViewIsModal
            edges={desktopWeb ? [] : ["bottom"]}
            style={{ flexShrink: 1 }}
          >
            {!desktopWeb ? (
              <View className="items-center pb-xs pt-sm">
                <View className="h-[4px] w-[38px] rounded-pill bg-neutral-300" />
              </View>
            ) : null}

            <View className="flex-row items-center justify-between px-lg pb-sm pt-md">
              <View className="min-w-0 flex-1 pr-md">
                <Text
                  accessibilityRole="header"
                  className="font-montserrat-semibold text-lg text-neutral-900"
                >
                  {title}
                </Text>
                <Text className="mt-[3px] font-montserrat-regular text-xs text-neutral-550">
                  Choose the option that works best for you.
                </Text>
              </View>

              <Pressable
                accessibilityLabel={`Close ${title}`}
                accessibilityRole="button"
                className="h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-pill bg-neutral-75 active:bg-neutral-200"
                focusable
                hitSlop={5}
                onPress={onClose}
                ref={closeButtonRef}
                testID="catalog-options-close"
              >
                <MaterialIcons
                  color={colors.neutral[700]}
                  name="close"
                  size={20}
                />
              </Pressable>
            </View>

            <View className="mx-lg h-px bg-neutral-200" />

            <ScrollView
              bounces={false}
              contentContainerStyle={{
                paddingBottom: desktopWeb ? 20 : 12,
                paddingHorizontal: 16,
                paddingTop: 12,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
            >
              <View
                accessibilityRole="radiogroup"
                className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0"
              >
                {options.map((option, index) => (
                  <View key={option.value}>
                    {index > 0 ? (
                      <View className="ml-[52px] h-px bg-neutral-200" />
                    ) : null}
                    <ProductOptionRow
                      onPress={() => {
                        onSelect(option.value);
                        onClose();
                      }}
                      option={option}
                      reduceMotion={reduceMotion}
                      selected={option.value === selectedValue}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}
