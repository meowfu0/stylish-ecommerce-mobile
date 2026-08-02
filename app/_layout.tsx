import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import "react-native-reanimated";

import { DesktopWebHeader } from "@/components/web/desktop-web-header";
import { isDesktopWeb } from "@/constants/responsive";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { restoreAuthSession } from "@/services/auth/auth-session";
import { useAuthSessionStore } from "@/stores/auth-session-store";

import "../global.css";

SplashScreen.preventAutoHideAsync();

const ONBOARDING_TRANSITION = {
  animation: "fade_from_bottom" as const,
  animationDuration: 220,
  gestureEnabled: false,
};

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const authStatus = useAuthSessionStore((state) => state.status);
  const { width } = useWindowDimensions();
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    void restoreAuthSession();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && authStatus !== "restoring") {
      SplashScreen.hide();
    }
  }, [authStatus, fontError, fontsLoaded]);

  if ((!fontsLoaded && !fontError) || authStatus === "restoring") {
    return null;
  }

  const desktopWeb = isDesktopWeb(width);
  const isAuthRoute = [
    "/auth/choose-workspace",
    "/auth/reset-password",
    "/auth/verify-email",
    "/forgot-password",
    "/sign-in",
    "/sign-up",
  ].includes(pathname);
  const showDesktopHeader =
    desktopWeb &&
    pathname !== "/" &&
    pathname !== "/home" &&
    !isAuthRoute &&
    !pathname.startsWith("/merchant/") &&
    !pathname.startsWith("/onboarding") &&
    pathname !== "/get-started";

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <View className="flex-1 bg-neutral-50">
        {showDesktopHeader ? <DesktopWebHeader /> : null}

        <View className="min-h-0 flex-1">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={ONBOARDING_TRANSITION} />
            <Stack.Screen
              name="onboarding-payment"
              options={ONBOARDING_TRANSITION}
            />
            <Stack.Screen
              name="onboarding-order"
              options={ONBOARDING_TRANSITION}
            />
            <Stack.Screen name="sign-in" options={ONBOARDING_TRANSITION} />
            <Stack.Screen
              name="forgot-password"
              options={ONBOARDING_TRANSITION}
            />
            <Stack.Screen name="sign-up" options={ONBOARDING_TRANSITION} />
            <Stack.Screen
              name="auth/reset-password"
              options={ONBOARDING_TRANSITION}
            />
            <Stack.Screen
              name="auth/verify-email"
              options={ONBOARDING_TRANSITION}
            />
            <Stack.Screen name="get-started" options={ONBOARDING_TRANSITION} />
            <Stack.Protected guard={authStatus === "authenticated"}>
              <Stack.Screen
                name="auth/choose-workspace"
                options={ONBOARDING_TRANSITION}
              />
              <Stack.Screen
                name="(tabs)"
                options={{ ...ONBOARDING_TRANSITION, headerShown: false }}
              />
              <Stack.Screen name="checkout" options={ONBOARDING_TRANSITION} />
              <Stack.Screen
                name="place-order"
                options={ONBOARDING_TRANSITION}
              />
              <Stack.Screen name="payment" options={ONBOARDING_TRANSITION} />
              <Stack.Screen
                name="payment-success"
                options={ONBOARDING_TRANSITION}
              />
              <Stack.Screen
                name="order-success"
                options={ONBOARDING_TRANSITION}
              />
              <Stack.Screen name="profile" options={ONBOARDING_TRANSITION} />
              <Stack.Screen
                name="merchant/dashboard"
                options={{ ...ONBOARDING_TRANSITION, headerShown: false }}
              />
              <Stack.Screen
                name="merchant/dashboard-docs"
                options={{ ...ONBOARDING_TRANSITION, headerShown: false }}
              />
              <Stack.Screen
                name="modal"
                options={{
                  headerShown: true,
                  presentation: "modal",
                  title: "Modal",
                }}
              />
            </Stack.Protected>
          </Stack>
        </View>
      </View>
    </ThemeProvider>
  );
}
