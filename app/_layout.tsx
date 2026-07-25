import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import { Poppins_400Regular } from "@expo-google-fonts/poppins";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

import "../global.css";

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
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Poppins_400Regular,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={ONBOARDING_TRANSITION} />
        <Stack.Screen
          name="onboarding-payment"
          options={ONBOARDING_TRANSITION}
        />
        <Stack.Screen name="onboarding-order" options={ONBOARDING_TRANSITION} />
        <Stack.Screen name="sign-in" options={ONBOARDING_TRANSITION} />
        <Stack.Screen name="forgot-password" options={ONBOARDING_TRANSITION} />
        <Stack.Screen name="sign-up" options={ONBOARDING_TRANSITION} />
        <Stack.Screen name="get-started" options={ONBOARDING_TRANSITION} />
        <Stack.Screen
          name="(tabs)"
          options={{ ...ONBOARDING_TRANSITION, headerShown: false }}
        />
        <Stack.Screen
          name="checkout"
          options={ONBOARDING_TRANSITION}
        />
        <Stack.Screen name="place-order" options={ONBOARDING_TRANSITION} />
        <Stack.Screen name="payment" options={ONBOARDING_TRANSITION} />
        <Stack.Screen name="order-success" options={ONBOARDING_TRANSITION} />
        <Stack.Screen name="profile" options={ONBOARDING_TRANSITION} />
        <Stack.Screen
          name="modal"
          options={{ headerShown: true, presentation: "modal", title: "Modal" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
