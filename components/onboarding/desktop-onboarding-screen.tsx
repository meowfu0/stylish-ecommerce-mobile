import { Image } from "expo-image";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
              <Text className="font-montserrat-semibold text-sm uppercase tracking-[2px] text-brand-primary">
                Step {step} of 3
              </Text>

              <Pressable
                accessibilityHint="Closes onboarding and opens Sign In"
                accessibilityLabel="Skip onboarding"
                accessibilityRole="button"
                className="cursor-pointer px-sm py-xs active:opacity-60"
                hitSlop={8}
                onPress={onSkip}
              >
                <Text className="font-montserrat-semibold text-sm text-neutral-700">
                  Skip
                </Text>
              </Pressable>
            </View>

            <View className="flex-1 justify-center">
              <Text
                accessibilityRole="header"
                className="font-montserrat-bold text-[44px] leading-[52px] text-neutral-1000"
              >
                {title}
              </Text>
              <Text className="mt-lg max-w-[420px] font-montserrat-regular text-base leading-[26px] text-neutral-550">
                {description}
              </Text>
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
                    <Text className="font-montserrat-semibold text-sm text-neutral-700">
                      Previous
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityLabel={nextLabel}
                  accessibilityRole="button"
                  className="h-[52px] flex-1 cursor-pointer items-center justify-center rounded-xs bg-brand-primary active:opacity-80"
                  onPress={onNext}
                >
                  <Text className="font-montserrat-semibold text-base text-neutral-0">
                    {nextLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
