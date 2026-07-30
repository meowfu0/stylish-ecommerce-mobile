import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
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

const FIGMA_FRAME = {
  height: 812,
  logoHeight: 100,
  logoWidth: 275,
  loadingCenterOffset: 164,
  loadingHeight: 18,
  loadingWidth: 42,
} as const;

const LOGO_ASPECT_RATIO = FIGMA_FRAME.logoWidth / FIGMA_FRAME.logoHeight;
const SPLASH_DISPLAY_DURATION = 900;

export default function SplashScreen() {
  const { height, width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const logoProgress = useSharedValue(reduceMotion ? 1 : 0);
  const isDesktopWeb = Platform.OS === "web" && width >= 1024;

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoProgress.value,
    transform: [
      {
        translateY: interpolate(logoProgress.value, [0, 1], [18, 0]),
      },
      {
        scale: interpolate(logoProgress.value, [0, 1], [0.96, 1]),
      },
    ],
  }));

  useEffect(() => {
    logoProgress.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: 420,
          easing: Easing.out(Easing.cubic),
        });
  }, [logoProgress, reduceMotion]);

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    if (isDesktopWeb) {
      router.replace("/(tabs)/home");
      return;
    }

    const transitionTimer = setTimeout(() => {
      router.replace("/onboarding");
    }, SPLASH_DISPLAY_DURATION);

    return () => clearTimeout(transitionTimer);
  }, [isDesktopWeb, pathname, router]);

  const logoWidth = Math.min(
    FIGMA_FRAME.logoWidth,
    Math.max(0, width - spacing.lg * 2),
  );
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const verticalScale = Math.min(1, height / FIGMA_FRAME.height);
  const loadingOffset = FIGMA_FRAME.loadingCenterOffset * verticalScale;

  if (isDesktopWeb) {
    return <View className="flex-1 bg-neutral-25" />;
  }

  return (
    <View className="flex-1 bg-neutral-0">
      <StatusBar hidden />

      <SafeAreaView className="flex-1 bg-neutral-0">
        <View className="relative flex-1 overflow-hidden">
          <View
            style={[
              styles.logoContainer,
              {
                height: logoHeight,
                transform: [
                  { translateX: -logoWidth / 2 },
                  { translateY: -logoHeight / 2 },
                ],
                width: logoWidth,
              },
            ]}
          >
            <Animated.View style={[styles.fill, logoAnimatedStyle]}>
              <Image
                accessibilityLabel="Stylish"
                accessibilityRole="image"
                accessible
                contentFit="contain"
                source={require("@/assets/images/stylish-logo.svg")}
                style={styles.fill}
              />
            </Animated.View>
          </View>

          <View
            accessibilityLabel="Loading Stylish"
            accessibilityRole="progressbar"
            accessible
            className="absolute left-1/2 top-1/2 h-[18px] w-[42px]"
            style={{
              transform: [
                { translateX: -FIGMA_FRAME.loadingWidth / 2 },
                { translateY: loadingOffset - FIGMA_FRAME.loadingHeight / 2 },
              ],
            }}
          >
            <Image
              accessible={false}
              contentFit="contain"
              source={require("@/assets/images/splash-loading.svg")}
              style={styles.loadingImage}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    height: "100%",
    width: "100%",
  },
  loadingImage: {
    height: "100%",
    width: "100%",
  },
  logoContainer: {
    left: "50%",
    position: "absolute",
    top: "50%",
  },
});
