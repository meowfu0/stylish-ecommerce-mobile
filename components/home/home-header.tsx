import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

type HomeHeaderProps = {
  onMenuPress: () => void;
  onProfilePress: () => void;
};

export function HomeHeader({
  onMenuPress,
  onProfilePress,
}: HomeHeaderProps) {
  return (
    <View className="h-[56px] flex-row items-center justify-between px-md">
      <Pressable
        accessibilityLabel="Open menu"
        accessibilityRole="button"
        className="h-[40px] w-[40px] items-center justify-center rounded-pill bg-[#F2F2F2] active:opacity-70"
        hitSlop={4}
        onPress={onMenuPress}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/home/header-2.svg")}
          style={{ height: 12, width: 18 }}
        />
      </Pressable>

      <View
        accessibilityLabel="Stylish"
        accessibilityRole="header"
        accessible
        className="absolute left-1/2 flex-row items-center"
        style={{ transform: [{ translateX: -55 }] }}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/home/header-3.svg")}
          style={{ height: 32, width: 40 }}
        />
        <Text className="ml-[5px] font-serif text-action text-brand-blue">
          Stylish
        </Text>
      </View>

      <Pressable
        accessibilityHint="Opens Settings"
        accessibilityLabel="Open profile"
        accessibilityRole="button"
        className="active:opacity-70"
        hitSlop={4}
        onPress={onProfilePress}
      >
        <Image
          accessibilityLabel="Profile avatar"
          accessibilityRole="image"
          contentFit="cover"
          source={require("@/assets/images/home/profile-1.jpg")}
          style={{ borderRadius: 20, height: 40, width: 40 }}
        />
      </Pressable>
    </View>
  );
}
