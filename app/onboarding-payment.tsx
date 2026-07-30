import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TypewriterText } from "@/components/animated/typewriter-text";
import { DesktopOnboardingScreen } from "@/components/onboarding/desktop-onboarding-screen";
import { spacing } from "@/constants/design-tokens";
import { isDesktopWeb } from "@/constants/responsive";

const FIGMA_FRAME = {
  height: 812,
  width: 375,
  headerTop: 45,
  headerWidth: 345,
  illustrationHeight: 233.333,
  illustrationTop: 225,
  illustrationWidth: 350,
  titleTop: 492,
  bodyGap: 10,
  bodyWidth: 340,
  footerBottom: 22,
  footerHorizontalOffset: 6,
  footerWidth: 345,
} as const;

const PAYMENT_DESCRIPTION =
  "Pay securely using your preferred payment method and complete your order with ease.";

export default function PaymentOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const widthScale = Math.min(1, width / FIGMA_FRAME.width);
  const heightScale = Math.min(1, height / FIGMA_FRAME.height);
  const headerWidth = FIGMA_FRAME.headerWidth * widthScale;
  const illustrationWidth = FIGMA_FRAME.illustrationWidth * widthScale;
  const illustrationHeight =
    (illustrationWidth / FIGMA_FRAME.illustrationWidth) *
    FIGMA_FRAME.illustrationHeight;
  const illustrationTop = Math.max(
    insets.top + spacing.xxl,
    FIGMA_FRAME.illustrationTop * heightScale,
  );
  const titleTop = Math.max(
    illustrationTop + illustrationHeight + spacing.sm,
    FIGMA_FRAME.titleTop * heightScale,
  );
  const bodyWidth = Math.min(
    FIGMA_FRAME.bodyWidth * widthScale,
    width - spacing.md * 2,
  );
  const footerWidth = FIGMA_FRAME.footerWidth * widthScale;
  const footerBottom = Math.max(
    spacing.md,
    insets.bottom - spacing.sm,
    FIGMA_FRAME.footerBottom * heightScale,
  );

  const goToPreviousStep = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/onboarding");
  };

  const skipOnboarding = () => {
    router.replace("/sign-in");
  };

  const showNextStep = () => {
    router.push("/onboarding-order");
  };

  if (isDesktopWeb(width)) {
    return (
      <DesktopOnboardingScreen
        description={PAYMENT_DESCRIPTION}
        image={require("@/assets/images/onboarding-make-payment.svg")}
        imageLabel="Customers completing a secure mobile payment"
        nextLabel="Continue"
        onNext={showNextStep}
        onPrevious={goToPreviousStep}
        onSkip={skipOnboarding}
        step={2}
        title="Make Payment"
      />
    );
  }

  return (
    <View className="flex-1 bg-neutral-0">
      <StatusBar style="dark" />

      <View
        className="absolute flex-row items-start justify-between"
        style={{
          left: (width - headerWidth) / 2,
          top: Math.max(insets.top + 1, FIGMA_FRAME.headerTop * heightScale),
          width: headerWidth,
        }}
      >
        <Text
          accessibilityLabel="Onboarding step 2 of 3"
          accessibilityRole="header"
          className="font-montserrat-semibold text-action text-neutral-1000"
        >
          2<Text className="text-neutral-450">/3</Text>
        </Text>

        <Pressable
          accessibilityHint="Closes onboarding and opens Sign In"
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

      <Image
        accessibilityLabel="Customers completing a secure mobile payment"
        accessibilityRole="image"
        accessible
        contentFit="contain"
        source={require("@/assets/images/onboarding-make-payment.svg")}
        style={{
          height: illustrationHeight,
          left: (width - illustrationWidth) / 2,
          position: "absolute",
          top: illustrationTop,
          width: illustrationWidth,
        }}
      />

      <View
        className="absolute left-0 right-0 items-center"
        style={{ top: titleTop }}
      >
        <TypewriterText
          className="font-montserrat-extrabold text-onboardingTitle text-center text-neutral-1000"
          text="Make Payment"
        />

        <Text
          className="font-montserrat-semibold text-onboardingBody text-center tracking-[0.28px] text-neutral-400"
          style={{
            marginTop: FIGMA_FRAME.bodyGap * heightScale,
            width: bodyWidth,
          }}
        >
          {PAYMENT_DESCRIPTION}
        </Text>
      </View>

      <View
        className="absolute h-[27px] flex-row items-center justify-between"
        style={{
          bottom: footerBottom,
          left:
            (width - footerWidth) / 2 +
            FIGMA_FRAME.footerHorizontalOffset * widthScale,
          width: footerWidth,
        }}
      >
        <Pressable
          accessibilityHint="Returns to onboarding step 1 of 3"
          accessibilityLabel="Previous"
          accessibilityRole="button"
          className="h-[27px] w-[44px] justify-center active:opacity-60"
          hitSlop={12}
          onPress={goToPreviousStep}
        >
          <Text className="font-montserrat-semibold text-action text-center text-neutral-300">
            Prev
          </Text>
        </Pressable>

        <View
          accessibilityLabel="Page 2 of 3"
          accessible
          className="h-[10px] w-[80px] flex-row items-center gap-[10px]"
        >
          <View className="h-[10px] w-[10px] rounded-pill bg-ink-primary/20" />
          <View className="h-[8px] w-[40px] rounded-pill bg-ink-primary" />
          <View className="h-[10px] w-[10px] rounded-pill bg-ink-primary/20" />
        </View>

        <Pressable
          accessibilityHint="Opens onboarding step 3 of 3"
          accessibilityLabel="Next"
          accessibilityRole="button"
          className="h-[27px] w-[65px] items-center justify-center active:opacity-60"
          hitSlop={12}
          onPress={showNextStep}
        >
          <Text className="font-montserrat-semibold text-action text-center text-brand-primary">
            Next
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
