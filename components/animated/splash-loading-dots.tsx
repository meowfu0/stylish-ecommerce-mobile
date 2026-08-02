import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/design-tokens";

const DOT_COLORS = [
  colors.brand.primary,
  colors.brand.blue,
  colors.brand.primary,
] as const;
const DOT_STAGGER = 140;
const DOT_RISE_DURATION = 240;
const DOT_FALL_DURATION = 340;
const DOT_REST_DURATION = 180;

type SplashLoadingDotProps = {
  color: string;
  delay: number;
  reduceMotion: boolean;
  size: number;
};

function SplashLoadingDot({
  color,
  delay,
  reduceMotion,
  size,
}: SplashLoadingDotProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);

    if (reduceMotion) {
      progress.value = 0;
      return;
    }

    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: DOT_RISE_DURATION,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, {
            duration: DOT_FALL_DURATION,
            easing: Easing.inOut(Easing.cubic),
          }),
          withDelay(DOT_REST_DURATION, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );

    return () => cancelAnimation(progress);
  }, [delay, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        opacity: 0.42,
        transform: [{ translateY: 0 }, { scale: 1 }],
      };
    }

    return {
      opacity: interpolate(progress.value, [0, 1], [0.28, 1]),
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [0, -7]) },
        { scale: interpolate(progress.value, [0, 1], [0.86, 1.18]) },
      ],
    };
  });

  return (
    <Animated.View
      accessible={false}
      style={[
        styles.dot,
        {
          backgroundColor: color,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        animatedStyle,
      ]}
    />
  );
}

type SplashLoadingDotsProps = {
  gap?: number;
  size?: number;
};

export function SplashLoadingDots({
  gap = 10,
  size = 10,
}: SplashLoadingDotsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <View
      accessibilityLabel="Loading Stylish"
      accessibilityRole="progressbar"
      accessibilityValue={{ text: "Loading" }}
      accessible
      style={[styles.container, { columnGap: gap, height: size + 8 }]}
    >
      {DOT_COLORS.map((color, index) => (
        <SplashLoadingDot
          color={color}
          delay={index * DOT_STAGGER}
          key={`${color}-${index}`}
          reduceMotion={reduceMotion}
          size={size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  dot: {
    flexShrink: 0,
  },
});
