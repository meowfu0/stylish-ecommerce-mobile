import { useRouter } from "expo-router";

import { OnboardingStepScreen } from "@/components/onboarding/choose-products-onboarding-screen";

const PAYMENT_DESCRIPTION =
  "Pay securely using your preferred payment method and complete your order with ease.";

export default function PaymentOnboardingScreen() {
  const router = useRouter();

  const goToPreviousStep = () => {
    router.replace("/onboarding");
  };

  const skipOnboarding = () => {
    router.replace("/sign-in");
  };

  const showNextStep = () => {
    router.push("/onboarding-order");
  };

  return (
    <OnboardingStepScreen
      description={PAYMENT_DESCRIPTION}
      image={require("@/assets/images/onboarding-make-payment-desktop.jpg")}
      imageLabel="A customer completing a secure card payment on her phone"
      onContinue={showNextStep}
      onPrevious={goToPreviousStep}
      onSkip={skipOnboarding}
      step={2}
      title="Make Payment"
    />
  );
}
