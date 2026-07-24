import {
  Montserrat_600SemiBold,
  Montserrat_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/montserrat";
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
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ headerShown: true, presentation: "modal", title: "Modal" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
