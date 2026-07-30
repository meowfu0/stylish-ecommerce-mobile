import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isDesktopWeb } from "@/constants/responsive";

const FIGMA_FRAME = {
  width: 390,
  buttonWidth: 280,
  copyWidth: 320,
} as const;

export default function GetStartedScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const widthScale = Math.min(1, width / FIGMA_FRAME.width);
  const buttonWidth = FIGMA_FRAME.buttonWidth * widthScale;
  const copyWidth = FIGMA_FRAME.copyWidth * widthScale;
  const desktopWeb = isDesktopWeb(width);

  const openHome = () => {
    router.replace("/(tabs)/home");
  };

  return (
    <View className="flex-1 bg-neutral-1000">
      <StatusBar style="light" translucent />

      <Image
        accessible={false}
        contentFit="cover"
        contentPosition="center"
        source={require("@/assets/images/get-started-background.jpg")}
        style={StyleSheet.absoluteFillObject}
      />

      <View
        accessibilityElementsHidden
        className="absolute inset-0 bg-neutral-1000/40"
        importantForAccessibility="no-hide-descendants"
      />

      <SafeAreaView className="flex-1">
        <View
          className={`flex-1 ${
            desktopWeb
              ? "mx-auto w-full max-w-[1280px] items-start justify-center px-[72px]"
              : "items-center justify-end"
          }`}
        >
          <Text
            accessibilityRole="header"
            className={`font-montserrat-bold text-neutral-0 ${
              desktopWeb
                ? "max-w-[680px] text-left text-[56px] leading-[64px]"
                : "text-center text-heroTitle"
            }`}
            style={desktopWeb ? undefined : { width: copyWidth }}
          >
            Authentic style, made easy.
          </Text>

          <Text
            className={`mt-[12px] font-montserrat-regular text-neutral-0 ${
              desktopWeb
                ? "max-w-[560px] text-left text-lg leading-[30px]"
                : "text-center text-xs"
            }`}
            style={desktopWeb ? undefined : { width: copyWidth }}
          >
            Discover products you’ll love and shop them in just a few taps.
          </Text>

          <Pressable
            accessibilityHint="Opens the Home screen"
            accessibilityLabel="Get Started"
            accessibilityRole="button"
            className="mt-[30px] h-[55px] cursor-pointer items-center justify-center rounded-xs bg-brand-primary active:opacity-80"
            onPress={openHome}
            style={{ width: desktopWeb ? 220 : buttonWidth }}
          >
            <Text className="font-montserrat-semibold text-authButton text-neutral-0">
              Get Started
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
