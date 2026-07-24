import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
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
  const router = useRouter();

  useEffect(() => {
    const transitionTimer = setTimeout(() => {
      router.replace("/onboarding");
    }, SPLASH_DISPLAY_DURATION);

    return () => clearTimeout(transitionTimer);
  }, [router]);

  const logoWidth = Math.min(
    FIGMA_FRAME.logoWidth,
    Math.max(0, width - spacing.lg * 2),
  );
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const verticalScale = Math.min(1, height / FIGMA_FRAME.height);
  const loadingOffset = FIGMA_FRAME.loadingCenterOffset * verticalScale;

  return (
    <View className="flex-1 bg-neutral-0">
      <StatusBar hidden />

      <SafeAreaView className="flex-1 bg-neutral-0">
        <View className="relative flex-1 overflow-hidden">
          <Image
            accessibilityLabel="Stylish"
            accessibilityRole="image"
            accessible
            contentFit="contain"
            source={require("@/assets/images/stylish-logo.svg")}
            style={[
              styles.logo,
              {
                height: logoHeight,
                transform: [
                  { translateX: -logoWidth / 2 },
                  { translateY: -logoHeight / 2 },
                ],
                width: logoWidth,
              },
            ]}
          />

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
  loadingImage: {
    height: "100%",
    width: "100%",
  },
  logo: {
    left: "50%",
    position: "absolute",
    top: "50%",
  },
});
