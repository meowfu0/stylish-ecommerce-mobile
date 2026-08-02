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

import { SplashLoadingDots } from "@/components/animated/splash-loading-dots";
import {
  STYLISH_LOGO_ASPECT_RATIO,
  StylishLogo,
} from "@/components/brand/stylish-logo";
import { colors, spacing } from "@/constants/design-tokens";
import { hasCompletedOnboarding } from "@/stores/onboarding-storage";
import {
  destinationForWorkspace,
  workspacesFromAuthContext,
} from "@/services/auth/auth-workspaces";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";

const MAX_DESKTOP_LOGO_WIDTH = 217;
const MAX_MOBILE_LOGO_WIDTH = 180;
const SPLASH_DISPLAY_DURATION = 1_600;
const REDUCED_MOTION_DISPLAY_DURATION = 900;

export default function SplashScreen() {
  const { height, width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const authReason = useAuthSessionStore((state) => state.reason);
  const authStatus = useAuthSessionStore((state) => state.status);
  const authUser = useAuthSessionStore((state) => state.user);
  const selectWorkspace = useAuthWorkspaceStore(
    (state) => state.selectWorkspace,
  );
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

    let active = true;
    if (authStatus === "restoring") {
      return;
    }

    const completionState = hasCompletedOnboarding();
    const transitionTimer = setTimeout(
      () => {
        void completionState.then((onboardingCompleted) => {
          if (!active) {
            return;
          }

          if (authStatus === "authenticated" && authUser) {
            const workspaces = workspacesFromAuthContext(authUser);
            if (workspaces.length === 1) {
              selectWorkspace(workspaces[0]);
              router.replace(destinationForWorkspace(workspaces[0]));
              return;
            }

            router.replace("/auth/choose-workspace");
            return;
          }

          if (!onboardingCompleted) {
            router.replace("/onboarding");
            return;
          }

          router.replace(
            authReason === "session-expired"
              ? { pathname: "/sign-in", params: { reason: "session-expired" } }
              : "/sign-in",
          );
        });
      },
      reduceMotion ? REDUCED_MOTION_DISPLAY_DURATION : SPLASH_DISPLAY_DURATION,
    );

    return () => {
      active = false;
      clearTimeout(transitionTimer);
    };
  }, [
    authReason,
    authStatus,
    authUser,
    pathname,
    reduceMotion,
    router,
    selectWorkspace,
  ]);

  const responsiveLogoWidth = isDesktopWeb
    ? Math.min(MAX_DESKTOP_LOGO_WIDTH, width * 0.18)
    : Math.min(MAX_MOBILE_LOGO_WIDTH, Math.max(0, width - spacing.xxl));
  const logoWidth = Math.max(0, responsiveLogoWidth);
  const logoHeight = logoWidth / STYLISH_LOGO_ASPECT_RATIO;
  const contentGap = isDesktopWeb
    ? Math.min(spacing.xxl, Math.max(spacing.xl, height * 0.054))
    : spacing.xl;
  const pinkGlowSize = isDesktopWeb
    ? Math.min(421, width * 0.33)
    : Math.min(280, width * 0.75);
  const blueGlowSize = isDesktopWeb
    ? Math.min(461, width * 0.35)
    : Math.min(300, width * 0.8);
  const glowBlur = isDesktopWeb ? 90 : 56;
  const dotSize = isDesktopWeb ? 10 : 8;
  const dotGap = isDesktopWeb ? 10 : 8;

  return (
    <View className="flex-1 bg-neutral-0">
      <StatusBar hidden />

      <SafeAreaView className="flex-1">
        <View className="relative flex-1 overflow-hidden">
          <View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                backgroundColor: colors.brand.pinkSoft,
                filter:
                  Platform.OS === "web"
                    ? `blur(${glowBlur}px)`
                    : [{ blur: glowBlur }],
                height: pinkGlowSize,
                left: -pinkGlowSize * 0.34,
                opacity: 0.24,
                top: -pinkGlowSize * 0.3,
                width: pinkGlowSize,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                backgroundColor: colors.brand.blueSoft,
                bottom: -blueGlowSize * 0.32,
                filter:
                  Platform.OS === "web"
                    ? `blur(${glowBlur}px)`
                    : [{ blur: glowBlur }],
                height: blueGlowSize,
                opacity: 0.32,
                right: -blueGlowSize * 0.26,
                width: blueGlowSize,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[styles.content, { rowGap: contentGap }]}
          >
            <Animated.View
              style={[
                { height: logoHeight, width: logoWidth },
                logoAnimatedStyle,
              ]}
            >
              <StylishLogo testID="splash-brand-logo" width={logoWidth} />
            </Animated.View>
            <SplashLoadingDots gap={dotGap} size={dotSize} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    borderRadius: 9999,
    position: "absolute",
  },
});
