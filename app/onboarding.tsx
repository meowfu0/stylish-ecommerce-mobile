import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/constants/design-tokens";

const FIGMA_FRAME = {
  height: 812,
  width: 375,
  headerTop: 45,
  horizontalInset: 17,
  illustrationSize: 300,
  illustrationTop: 177,
  titleGap: 15,
  bodyGap: 10,
  bodyWidth: 340,
  indicatorBottom: 31,
  nextBottom: 24,
} as const;

const ONBOARDING_COPY =
  "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.";

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const widthScale = Math.min(1, width / FIGMA_FRAME.width);
  const heightScale = Math.min(1, height / FIGMA_FRAME.height);
  const illustrationSize = Math.min(
    FIGMA_FRAME.illustrationSize * widthScale,
    width - spacing.xl * 2,
  );
  const illustrationTop = Math.max(
    insets.top + spacing.xl,
    FIGMA_FRAME.illustrationTop * heightScale,
  );
  const bodyWidth = Math.min(
    FIGMA_FRAME.bodyWidth * widthScale,
    width - spacing.md * 2,
  );
  const indicatorBottom = Math.max(spacing.md, insets.bottom - spacing.xxs + 1);
  const nextBottom = Math.max(
    spacing.xs,
    indicatorBottom - (FIGMA_FRAME.indicatorBottom - FIGMA_FRAME.nextBottom),
  );

  const skipOnboarding = () => {
    router.replace("/home");
  };

  const showNextStep = () => {
    router.push("/onboarding-payment");
  };

  return (
    <View className="flex-1 bg-neutral-0">
      <StatusBar style="dark" />

      <View
        className="absolute flex-row items-start justify-between"
        style={{
          left: FIGMA_FRAME.horizontalInset,
          right: FIGMA_FRAME.horizontalInset,
          top: Math.max(insets.top + 1, FIGMA_FRAME.headerTop * heightScale),
        }}
      >
        <Text
          accessibilityLabel="Onboarding step 1 of 3"
          accessibilityRole="header"
          className="font-montserrat-semibold text-action text-neutral-1000"
        >
          1<Text className="text-neutral-450">/3</Text>
        </Text>

        <Pressable
          accessibilityHint="Closes onboarding and opens the main app"
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
          className="active:opacity-60"
          hitSlop={12}
          onPress={skipOnboarding}
        >
          <Text className="font-montserrat-semibold text-action text-neutral-1000">
            Skip
          </Text>
        </Pressable>
      </View>

      <View
        className="absolute left-0 right-0 items-center"
        style={{ top: illustrationTop }}
      >
        <Image
          accessibilityLabel="People choosing clothing in a fashion shop"
          accessibilityRole="image"
          accessible
          contentFit="contain"
          source={require("@/assets/images/onboarding-choose-products.svg")}
          style={{ height: illustrationSize, width: illustrationSize }}
        />

        <Text
          accessibilityRole="header"
          className="font-montserrat-extrabold text-onboardingTitle text-center text-neutral-1000"
          style={{ marginTop: FIGMA_FRAME.titleGap * heightScale }}
        >
          Choose Products
        </Text>

        <Text
          className="font-montserrat-semibold text-onboardingBody text-center tracking-[0.28px] text-neutral-400"
          style={{
            marginTop: FIGMA_FRAME.bodyGap * heightScale,
            width: bodyWidth,
          }}
        >
          {ONBOARDING_COPY}
        </Text>
      </View>

      <View
        accessibilityLabel="Page 1 of 3"
        accessible
        className="absolute left-0 right-0 h-[10px] flex-row items-center justify-center gap-[10px]"
        style={{ bottom: indicatorBottom }}
      >
        <View className="h-[8px] w-[40px] rounded-pill bg-ink-primary" />
        <View className="h-[10px] w-[10px] rounded-pill bg-ink-primary/20" />
        <View className="h-[10px] w-[10px] rounded-pill bg-ink-primary/20" />
      </View>

      <Pressable
        accessibilityHint="Opens onboarding step 2 of 3"
        accessibilityLabel="Next"
        accessibilityRole="button"
        className="absolute right-[17px] active:opacity-60"
        hitSlop={12}
        onPress={showNextStep}
        style={{ bottom: nextBottom }}
      >
        <Text className="font-montserrat-semibold text-action text-brand-primary">
          Next
        </Text>
      </Pressable>
    </View>
  );
}
