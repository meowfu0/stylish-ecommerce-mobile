import { Image } from "expo-image";
import { Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StylishText } from "@/components/typography/stylish-text";
import { spacing } from "@/constants/design-tokens";
import { getResponsiveContentWidth } from "@/constants/responsive";

type DesktopOnboardingScreenProps = {
  description: string;
  image: number;
  imageLabel: string;
  nextLabel: string;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip: () => void;
  step: 1 | 2 | 3;
  title: string;
};

export function DesktopOnboardingScreen({
  description,
  image,
  imageLabel,
  nextLabel,
  onNext,
  onPrevious,
  onSkip,
  step,
  title,
}: DesktopOnboardingScreenProps) {
  const { height, width } = useWindowDimensions();
  const contentWidth = getResponsiveContentWidth({
    desktopMax: 1180,
    mobileMax: 1180,
    width,
  });
  const cardHeight = Math.min(720, Math.max(580, height - spacing.xxl * 2));

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 items-center justify-center px-xl py-xl">
        <View
          className="flex-row overflow-hidden rounded-[24px] border border-neutral-150 bg-neutral-0 shadow-lg"
          style={{ height: cardHeight, width: contentWidth }}
        >
          <View className="w-[54%] items-center justify-center bg-brand-primary/10 px-xxl">
            <Image
              accessibilityLabel={imageLabel}
              accessibilityRole="image"
              accessible
              contentFit="contain"
              source={image}
              style={{
                height: Math.min(460, cardHeight * 0.72),
                width: "100%",
              }}
            />
          </View>

          <View className="w-[46%] px-[56px] py-[48px]">
            <View className="flex-row items-center justify-between">
              <StylishText
                className="tracking-[2px] text-brand-primary"
                variant="eyebrow"
              >
                Step {step} of 3
              </StylishText>

              <Pressable
                accessibilityHint="Closes onboarding and opens Sign In"
                accessibilityLabel="Skip onboarding"
                accessibilityRole="button"
                className="cursor-pointer px-sm py-xs active:opacity-60"
                hitSlop={8}
                onPress={onSkip}
              >
                <StylishText
                  className="text-neutral-700"
                  variant="navigation-strong"
                >
                  Skip
                </StylishText>
              </Pressable>
            </View>

            <View className="flex-1 justify-center">
              <StylishText
                accessibilityRole="header"
                className="max-w-[420px] text-neutral-1000"
                variant="page-title"
              >
                {title}
              </StylishText>
              <StylishText
                className="mt-lg max-w-[420px] text-neutral-550"
                variant="body"
              >
                {description}
              </StylishText>
            </View>

            <View>
              <View
                accessibilityLabel={`Page ${step} of 3`}
                accessible
                className="mb-xl flex-row items-center gap-[10px]"
              >
                {[1, 2, 3].map((indicator) => (
                  <View
                    className={`h-[8px] rounded-pill ${
                      indicator === step
                        ? "w-[40px] bg-ink-primary"
                        : "w-[8px] bg-ink-primary/20"
                    }`}
                    key={indicator}
                  />
                ))}
              </View>

              <View className="flex-row items-center gap-md">
                {onPrevious ? (
                  <Pressable
                    accessibilityLabel="Previous onboarding step"
                    accessibilityRole="button"
                    className="h-[52px] w-[132px] cursor-pointer items-center justify-center rounded-xs border border-neutral-250 bg-neutral-0 active:opacity-70"
                    onPress={onPrevious}
                  >
                    <StylishText
                      className="text-neutral-700"
                      variant="navigation-strong"
                    >
                      Previous
                    </StylishText>
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityLabel={nextLabel}
                  accessibilityRole="button"
                  className="h-[52px] flex-1 cursor-pointer items-center justify-center rounded-xs bg-brand-primary active:opacity-80"
                  onPress={onNext}
                >
                  <StylishText className="text-neutral-0" variant="button">
                    {nextLabel}
                  </StylishText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
