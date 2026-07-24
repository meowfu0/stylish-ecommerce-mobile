import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabDestinationScreenProps = {
  title: string;
};

export function TabDestinationScreen({ title }: TabDestinationScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <StatusBar style="dark" />
      <View className="px-md pt-lg">
        <Text
          accessibilityRole="header"
          className="font-montserrat-semibold text-xl text-neutral-1000"
        >
          {title}
        </Text>
      </View>
    </SafeAreaView>
  );
}
