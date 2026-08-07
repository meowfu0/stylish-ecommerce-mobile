import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  VELORI_LOGO_ASPECT_RATIO,
  VeloriLogo,
} from "@/components/brand/velori-logo";
import { StylishText } from "@/components/typography/stylish-text";
import { ProgressIndicator } from "@/components/stylish/ProgressIndicator";
import { colors, spacing } from "@/constants/design-tokens";
import { isDesktopWeb } from "@/constants/responsive";

const DESKTOP_CONTENT_WIDTH = 1180;
const DESKTOP_CARD_HEIGHT = 682;
const DESKTOP_IMAGE_COLUMN_RATIO = 0.54;
const TABLET_BREAKPOINT = 768;

const CHOOSE_PRODUCTS_DESCRIPTION =
  "Browse our collection, discover products you love, and choose the perfect items that match your style.";

type OnboardingStepScreenProps = {
  continueLabel?: string;
  description: string;
  image: number;
  imageLabel: string;
  onContinue: () => Promise<void> | void;
  onPrevious?: () => void;
  onSkip?: () => void;
  step: 1 | 2 | 3;
  title: string;
};

export function OnboardingStepScreen({
  continueLabel = "Continue",
  description,
  image,
  imageLabel,
  onContinue,
  onPrevious,
  onSkip,
  step,
  title,
}: OnboardingStepScreenProps) {
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const desktop = isDesktopWeb(width);
  const tablet = width >= TABLET_BREAKPOINT;
  const twoColumn = desktop || tablet;

  const useStaticNativeMotion = reduceMotion || Platform.OS === "web";
  const headerProgress = useSharedValue(useStaticNativeMotion ? 1 : 0);
  const cardProgress = useSharedValue(useStaticNativeMotion ? 1 : 0);
  const imageProgress = useSharedValue(useStaticNativeMotion ? 1 : 0);
  const contentProgress = useSharedValue(useStaticNativeMotion ? 1 : 0);

  useEffect(() => {
    cancelAnimation(headerProgress);
    cancelAnimation(cardProgress);
    cancelAnimation(imageProgress);
    cancelAnimation(contentProgress);

    if (useStaticNativeMotion) {
      headerProgress.value = 1;
      cardProgress.value = 1;
      imageProgress.value = 1;
      contentProgress.value = 1;
      return;
    }

    const easing = Easing.bezier(0.22, 1, 0.36, 1);
    headerProgress.value = withTiming(1, { duration: 360, easing });
    cardProgress.value = withDelay(
      70,
      withTiming(1, { duration: 480, easing }),
    );
    imageProgress.value = withDelay(
      150,
      withTiming(1, { duration: 520, easing }),
    );
    contentProgress.value = withDelay(
      190,
      withTiming(1, { duration: 440, easing }),
    );

    return () => {
      cancelAnimation(headerProgress);
      cancelAnimation(cardProgress);
      cancelAnimation(imageProgress);
      cancelAnimation(contentProgress);
    };
  }, [
    cardProgress,
    contentProgress,
    headerProgress,
    imageProgress,
    useStaticNativeMotion,
  ]);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(headerProgress.value, [0, 1], [-10, 0]),
      },
    ],
  }));
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(cardProgress.value, [0, 1], [18, 0]) },
      { scale: interpolate(cardProgress.value, [0, 1], [0.992, 1]) },
    ],
  }));
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(imageProgress.value, [0, 1], [1.025, 1]) },
    ],
  }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          contentProgress.value,
          [0, 1],
          [twoColumn ? 14 : 0, 0],
        ),
      },
      {
        translateY: interpolate(
          contentProgress.value,
          [0, 1],
          [twoColumn ? 0 : 10, 0],
        ),
      },
    ],
  }));

  const horizontalPadding = desktop ? spacing.xl : tablet ? spacing.lg : 16;
  const contentWidth = Math.min(
    DESKTOP_CONTENT_WIDTH,
    Math.max(0, width - horizontalPadding * 2),
  );
  const cardHeight = desktop
    ? DESKTOP_CARD_HEIGHT
    : tablet
      ? Math.min(620, Math.max(520, height - 190))
      : undefined;
  const imageColumnWidth = twoColumn
    ? contentWidth * DESKTOP_IMAGE_COLUMN_RATIO
    : contentWidth;
  const imageInset = desktop ? 28 : tablet ? 18 : 12;
  const mobileImageHeight = Math.min(
    300,
    Math.max(220, (contentWidth - imageInset * 2) * 0.68),
  );
  const panelPadding = desktop ? 56 : tablet ? 28 : 24;
  const logoWidth = desktop ? 150 : tablet ? 138 : 124;
  const logoHeight = logoWidth / VELORI_LOGO_ASPECT_RATIO;
  const titleSize = desktop ? 40 : tablet ? 34 : 32;
  const titleLineHeight = desktop ? 48 : tablet ? 42 : 40;
  const descriptionSize = desktop ? 16 : 15;
  const descriptionLineHeight = desktop ? 26 : 24;
  const backgroundPinkSize = desktop ? 443 : Math.min(320, width * 0.8);
  const backgroundBlueSize = desktop ? 485 : Math.min(340, width * 0.86);
  const backgroundBlur = desktop ? 95 : 60;
  const previousButtonWidth = desktop ? 140 : tablet ? 124 : 104;
  const animationTestIdPrefix = `onboarding-step-${step}`;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View
        pointerEvents="none"
        style={[
          styles.backgroundGlow,
          {
            backgroundColor: colors.brand.pinkSoft,
            filter:
              Platform.OS === "web"
                ? `blur(${backgroundBlur}px)`
                : [{ blur: backgroundBlur }],
            height: backgroundPinkSize,
            left: -backgroundPinkSize * 0.34,
            opacity: 0.22,
            top: -backgroundPinkSize * 0.34,
            width: backgroundPinkSize,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.backgroundGlow,
          {
            backgroundColor: colors.brand.blueSoft,
            bottom: -backgroundBlueSize * 0.3,
            filter:
              Platform.OS === "web"
                ? `blur(${backgroundBlur}px)`
                : [{ blur: backgroundBlur }],
            height: backgroundBlueSize,
            opacity: 0.3,
            right: -backgroundBlueSize * 0.26,
            width: backgroundBlueSize,
          },
        ]}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: desktop ? spacing.xl : spacing.lg,
              paddingHorizontal: horizontalPadding,
              paddingTop: desktop ? spacing.xl : spacing.md,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.pageContent, { width: contentWidth }]}>
            <Animated.View
              style={[
                styles.header,
                { height: logoHeight, marginBottom: desktop ? 24 : 16 },
                headerAnimatedStyle,
              ]}
              testID={`${animationTestIdPrefix}-header`}
            >
              <VeloriLogo testID="onboarding-brand-logo" width={logoWidth} />

              {onSkip ? (
                <Pressable
                  accessibilityHint="Closes onboarding and opens Sign In"
                  accessibilityLabel="Skip onboarding"
                  accessibilityRole="button"
                  className="min-h-[44px] cursor-pointer items-center justify-center px-xxs active:opacity-60"
                  hitSlop={8}
                  onPress={onSkip}
                >
                  <StylishText
                    className="text-[#C81E3E] underline"
                    style={styles.skipText}
                    testID="onboarding-skip-label"
                    variant="navigation-strong"
                  >
                    Skip
                  </StylishText>
                </Pressable>
              ) : null}
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                {
                  height: cardHeight,
                  width: contentWidth,
                },
                cardAnimatedStyle,
              ]}
              testID={`${animationTestIdPrefix}-card`}
            >
              <View
                style={[
                  styles.cardInner,
                  { flexDirection: twoColumn ? "row" : "column" },
                ]}
              >
                <View
                  style={[
                    styles.imagePanel,
                    {
                      height: twoColumn ? "100%" : mobileImageHeight + 24,
                      padding: imageInset,
                      width: imageColumnWidth,
                    },
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.panelGlow,
                      styles.panelPinkGlow,
                      {
                        filter:
                          Platform.OS === "web" ? "blur(10px)" : [{ blur: 10 }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.panelGlow,
                      styles.panelBlueGlow,
                      {
                        filter:
                          Platform.OS === "web" ? "blur(12px)" : [{ blur: 12 }],
                      },
                    ]}
                  />

                  <Animated.View
                    style={[
                      styles.imageFrame,
                      { height: twoColumn ? undefined : mobileImageHeight },
                      imageAnimatedStyle,
                    ]}
                    testID={`${animationTestIdPrefix}-image-frame`}
                  >
                    <Image
                      accessibilityLabel={imageLabel}
                      accessibilityRole="image"
                      accessible
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      source={image}
                      style={styles.image}
                    />
                  </Animated.View>
                </View>

                <View
                  style={[
                    styles.copyPanel,
                    {
                      paddingHorizontal: panelPadding,
                      paddingVertical: desktop ? 48 : tablet ? 32 : 28,
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.copyContent,
                      {
                        rowGap: desktop ? 32 : 24,
                      },
                      contentAnimatedStyle,
                    ]}
                    testID={`${animationTestIdPrefix}-content`}
                  >
                    <View style={styles.textGroup}>
                      <StylishText
                        className="text-[#C81E3E]"
                        style={styles.stepLabel}
                        testID="onboarding-step-label"
                        variant="eyebrow"
                      >
                        Step {step} of 3
                      </StylishText>

                      <StylishText
                        accessibilityRole="header"
                        className="text-ink-primary"
                        style={{
                          fontSize: titleSize,
                          letterSpacing: desktop ? -0.8 : -0.64,
                          lineHeight: titleLineHeight,
                        }}
                        testID="onboarding-choose-products-title"
                        variant="page-title"
                      >
                        {title}
                      </StylishText>

                      <StylishText
                        className="text-neutral-550"
                        style={{
                          fontSize: descriptionSize,
                          lineHeight: descriptionLineHeight,
                          maxWidth: 420,
                        }}
                        testID="onboarding-choose-products-description"
                        variant="body"
                      >
                        {description}
                      </StylishText>
                    </View>

                    <ProgressIndicator current={step} total={3} />

                    <View style={styles.actions}>
                      {onPrevious ? (
                        <Pressable
                          accessibilityHint={`Returns to onboarding step ${step - 1} of 3`}
                          accessibilityLabel="Previous onboarding step"
                          accessibilityRole="button"
                          className="min-h-[56px] cursor-pointer items-center justify-center rounded-sm border border-neutral-350 bg-neutral-0 px-sm active:scale-[0.985] active:opacity-70"
                          onPress={onPrevious}
                          style={{ width: previousButtonWidth }}
                          testID="onboarding-previous-button"
                        >
                          <StylishText
                            className="text-ink-primary"
                            style={styles.continueText}
                            variant="button"
                          >
                            Previous
                          </StylishText>
                        </Pressable>
                      ) : null}

                      <Pressable
                        accessibilityHint={
                          step === 3
                            ? "Completes onboarding and opens Sign In"
                            : `Opens onboarding step ${step + 1} of 3`
                        }
                        accessibilityLabel={continueLabel}
                        accessibilityRole="button"
                        className="min-h-[56px] cursor-pointer items-center justify-center rounded-sm bg-brand-primary px-lg active:scale-[0.985] active:opacity-90"
                        onPress={onContinue}
                        style={[
                          styles.continueButton,
                          onPrevious
                            ? desktop
                              ? styles.desktopContinueButton
                              : styles.flexContinueButton
                            : styles.fullContinueButton,
                        ]}
                        testID="onboarding-continue-button"
                      >
                        <StylishText
                          className="text-neutral-0"
                          style={styles.continueText}
                          testID="onboarding-continue-label"
                          variant="button"
                        >
                          {continueLabel}
                        </StylishText>
                      </Pressable>
                    </View>
                  </Animated.View>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type ChooseProductsOnboardingScreenProps = Pick<
  OnboardingStepScreenProps,
  "onContinue" | "onSkip"
>;

export function ChooseProductsOnboardingScreen({
  onContinue,
  onSkip,
}: ChooseProductsOnboardingScreenProps) {
  return (
    <OnboardingStepScreen
      description={CHOOSE_PRODUCTS_DESCRIPTION}
      image={require("@/assets/images/onboarding-choose-products-desktop.jpg")}
      imageLabel="A customer choosing clothing in a fashion store"
      onContinue={onContinue}
      onSkip={onSkip}
      step={1}
      title="Choose Products"
    />
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    columnGap: 12,
    flexDirection: "row",
    width: "100%",
  },
  backgroundGlow: {
    borderRadius: 9999,
    position: "absolute",
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 24px 64px -40px rgba(17, 34, 59, 0.30)",
    overflow: "hidden",
  },
  cardInner: {
    flex: 1,
    overflow: "hidden",
  },
  continueButton: {
    alignSelf: "stretch",
    boxShadow: "0 6px 8px rgba(248, 55, 88, 0.48)",
  },
  continueText: {
    lineHeight: 16,
  },
  copyContent: {
    alignSelf: "stretch",
    width: "100%",
  },
  copyPanel: {
    flex: 1,
    justifyContent: "center",
  },
  desktopContinueButton: {
    width: 200,
  },
  flexContinueButton: {
    flex: 1,
  },
  fullContinueButton: {
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  imageFrame: {
    borderRadius: 16,
    flex: 1,
    overflow: "hidden",
    width: "100%",
  },
  imagePanel: {
    backgroundColor: colors.brand.socialSurface,
    overflow: "hidden",
    position: "relative",
  },
  pageContent: {
    alignItems: "stretch",
  },
  panelBlueGlow: {
    backgroundColor: colors.brand.blueSoft,
    bottom: -64,
    height: 300,
    left: "30%",
    opacity: 0.48,
    width: 300,
  },
  panelGlow: {
    borderRadius: 9999,
    position: "absolute",
  },
  panelPinkGlow: {
    backgroundColor: colors.brand.pinkSoft,
    height: 260,
    left: -60,
    opacity: 0.42,
    top: -60,
    width: 260,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    backgroundColor: colors.neutral[50],
    flex: 1,
    overflow: "hidden",
  },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  skipText: {
    fontSize: 16,
    lineHeight: 16,
  },
  stepLabel: {
    fontSize: 13,
    letterSpacing: 1.82,
    lineHeight: 20,
  },
  textGroup: {
    alignItems: "flex-start",
    rowGap: 16,
    width: "100%",
  },
});
