import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_FLOW_VERSION = 2;
const ONBOARDING_COMPLETED_KEY = `@stylish/onboarding-completed:v${ONBOARDING_FLOW_VERSION}`;
const COMPLETED_VALUE = "true";

export async function hasCompletedOnboarding() {
  try {
    return (
      (await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)) === COMPLETED_VALUE
    );
  } catch {
    return false;
  }
}

export async function markOnboardingCompleted() {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, COMPLETED_VALUE);
}
