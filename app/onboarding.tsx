import { useRouter } from "expo-router";
import { useState } from "react";

import { OnboardingStepScreen } from "@/components/onboarding/choose-products-onboarding-screen";
import { markOnboardingCompleted } from "@/stores/onboarding-storage";

type OnboardingStep = 1 | 2 | 3;

const ONBOARDING_STEPS = {
  1: {
    continueLabel: "Continue",
    description:
      "Browse our collection, discover products you love, and choose the perfect items that match your style.",
    image: require("@/assets/images/onboarding-choose-products-desktop.jpg"),
    imageLabel: "A customer choosing clothing in a fashion store",
    title: "Choose Products",
  },
  2: {
    continueLabel: "Continue",
    description:
      "Pay securely using your preferred payment method and complete your order with ease.",
    image: require("@/assets/images/onboarding-make-payment-desktop.jpg"),
    imageLabel: "A customer completing a secure card payment on her phone",
    title: "Make Payment",
  },
  3: {
    continueLabel: "Get Started",
    description:
      "Track your order easily and receive your purchases safely at your selected address.",
    image: require("@/assets/images/onboarding-get-your-order-desktop.jpg"),
    imageLabel: "A customer receiving a delivery at her selected address",
    title: "Get Your Order",
  },
} as const satisfies Record<
  OnboardingStep,
  {
    continueLabel: string;
    description: string;
    image: number;
    imageLabel: string;
    title: string;
  }
>;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const content = ONBOARDING_STEPS[step];

  const skipOnboarding = () => {
    router.replace("/sign-in");
  };

  const showPreviousStep = () => {
    setStep((step - 1) as OnboardingStep);
  };

  const showNextStep = async () => {
    if (step < 3) {
      setStep((step + 1) as OnboardingStep);
      return;
    }

    try {
      await markOnboardingCompleted();
    } catch {
      // Navigation remains available if device storage is temporarily unavailable.
    }

    router.replace("/sign-in");
  };

  return (
    <OnboardingStepScreen
      continueLabel={content.continueLabel}
      description={content.description}
      image={content.image}
      imageLabel={content.imageLabel}
      onContinue={showNextStep}
      onPrevious={step > 1 ? showPreviousStep : undefined}
      onSkip={step < 3 ? skipOnboarding : undefined}
      step={step}
      title={content.title}
    />
  );
}
