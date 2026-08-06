import { useRouter } from "expo-router";

import { OnboardingStepScreen } from "@/components/onboarding/choose-products-onboarding-screen";
import { markOnboardingCompleted } from "@/stores/onboarding-storage";

const ORDER_DESCRIPTION =
  "Track your order easily and receive your purchases safely at your selected address.";

export default function OrderOnboardingScreen() {
  const router = useRouter();

  const goToPreviousStep = () => {
    router.replace("/onboarding-payment");
  };

  const completeOnboarding = async () => {
    try {
      await markOnboardingCompleted();
    } catch {
      // Navigation remains available if device storage is temporarily unavailable.
    }

    router.replace("/sign-in");
  };

  return (
    <OnboardingStepScreen
      continueLabel="Get Started"
      description={ORDER_DESCRIPTION}
      image={require("@/assets/images/onboarding-get-your-order-desktop.jpg")}
      imageLabel="A customer receiving a delivery at her selected address"
      onContinue={completeOnboarding}
      onPrevious={goToPreviousStep}
      step={3}
      title="Get Your Order"
    />
  );
}
