import type { PropsWithChildren } from "react";
import { cssInterop } from "nativewind";
import {
  Platform,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MOTION_DURATION = 380;
const STAGGER_INTERVAL = 55;
const MAX_STAGGER_INDEX = 7;
const StyledAnimatedView = cssInterop(Animated.View, {
  className: "style",
}) as typeof Animated.View;
const useBrowserLayoutEffect =
  Platform.OS === "web" && typeof window !== "undefined"
    ? useLayoutEffect
    : useEffect;

type RevealDirection = "backward" | "forward";

type ScrollRevealProps = PropsWithChildren<{
  className?: string;
  disabled?: boolean;
  onLayout?: ViewProps["onLayout"];
  staggerIndex?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function ScrollReveal({
  children,
  className,
  disabled = false,
  onLayout,
  staggerIndex = 0,
  style,
}: ScrollRevealProps) {
  const elementRef = useRef<Animated.View>(null);
  const reduceMotion = useReducedMotion();
  const isWeb = Platform.OS === "web";
  const normalizedStagger = Math.min(
    MAX_STAGGER_INDEX,
    Math.max(0, staggerIndex),
  );
  const nativeProgress = useSharedValue(
    reduceMotion || disabled || isWeb ? 1 : 0,
  );
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [direction, setDirection] = useState<RevealDirection>("forward");

  const nativeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nativeProgress.value,
    transform: [{ translateY: (1 - nativeProgress.value) * 20 }],
  }));

  useEffect(() => {
    if (isWeb || disabled || reduceMotion) {
      nativeProgress.value = 1;
      return;
    }

    nativeProgress.value = withDelay(
      normalizedStagger * STAGGER_INTERVAL,
      withTiming(1, {
        duration: MOTION_DURATION,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }),
    );
  }, [disabled, isWeb, nativeProgress, normalizedStagger, reduceMotion]);

  useBrowserLayoutEffect(() => {
    if (!isWeb || disabled || reduceMotion) {
      setReady(true);
      setVisible(true);
      return;
    }

    const element = elementRef.current as unknown as Element | null;

    if (!element || typeof IntersectionObserver === "undefined") {
      setReady(true);
      setVisible(true);
      return;
    }

    const initialRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    setDirection(
      initialRect.top >= viewportHeight / 2 ? "forward" : "backward",
    );
    setVisible(
      initialRect.bottom >= 0 && initialRect.top <= viewportHeight * 0.94,
    );
    setReady(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }

        const rootTop = entry.rootBounds?.top ?? 0;
        const rootBottom = entry.rootBounds?.bottom ?? window.innerHeight;
        const enteringFromBelow = entry.boundingClientRect.top > rootTop;

        if (entry.isIntersecting) {
          setDirection(enteringFromBelow ? "forward" : "backward");
          setVisible(true);
          return;
        }

        setDirection(
          entry.boundingClientRect.top >= rootBottom ? "forward" : "backward",
        );
        setVisible(false);
      },
      {
        rootMargin: "24px 0px -8% 0px",
        threshold: 0.08,
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled, isWeb, reduceMotion]);

  return (
    <StyledAnimatedView
      className={className}
      onLayout={onLayout}
      ref={elementRef}
      style={[style, isWeb ? undefined : nativeAnimatedStyle]}
      testID={
        isWeb
          ? `scroll-reveal:${ready ? "ready" : "pending"}:${
              visible ? "visible" : "hidden"
            }:${direction}:${normalizedStagger}`
          : undefined
      }
    >
      {children}
    </StyledAnimatedView>
  );
}
