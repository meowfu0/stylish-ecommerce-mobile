import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StylishText } from "@/components/typography/stylish-text";
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
          <StylishText
            accessibilityRole="header"
            className={`text-neutral-0 ${
              desktopWeb ? "max-w-[680px] text-left" : "text-center"
            }`}
            style={desktopWeb ? undefined : { width: copyWidth }}
            variant="hero-title"
          >
            Authentic style, made easy.
          </StylishText>

          <StylishText
            className={`mt-[12px] text-neutral-0 ${
              desktopWeb ? "max-w-[560px] text-left" : "text-center"
            }`}
            style={desktopWeb ? undefined : { width: copyWidth }}
            variant="body"
          >
            Discover products you’ll love and shop them in just a few taps.
          </StylishText>

          <Pressable
            accessibilityHint="Opens the Home screen"
            accessibilityLabel="Get Started"
            accessibilityRole="button"
            className="mt-[30px] h-[55px] cursor-pointer items-center justify-center rounded-xs bg-brand-primary active:opacity-80"
            onPress={openHome}
            style={{ width: desktopWeb ? 220 : buttonWidth }}
          >
            <StylishText className="text-neutral-0" variant="button">
              Get Started
            </StylishText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
