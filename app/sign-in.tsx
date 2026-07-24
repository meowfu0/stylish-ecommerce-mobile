import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-0">
      <StatusBar style="dark" />

      <View className="flex-1 px-lg pt-xl">
        <Text
          accessibilityRole="header"
          className="font-montserrat-extrabold text-onboardingTitle text-neutral-1000"
        >
          Sign In
        </Text>
      </View>
    </SafeAreaView>
  );
}
