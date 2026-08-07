import { Image } from "expo-image";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";

import { VeloriLogo } from "@/components/brand/velori-logo";
import { DESKTOP_WEB_BREAKPOINT } from "@/constants/responsive";

type HomeHeaderProps = {
  onMenuPress: () => void;
  onProfilePress: () => void;
};

export function HomeHeader({ onMenuPress, onProfilePress }: HomeHeaderProps) {
  const { width } = useWindowDimensions();

  if (Platform.OS === "web" && width >= DESKTOP_WEB_BREAKPOINT) {
    return null;
  }

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
        accessibilityRole="header"
        className="absolute left-1/2 items-center justify-center"
        style={{ transform: [{ translateX: -55 }] }}
      >
        <VeloriLogo testID="home-header-brand-logo" width={110} />
      </View>

      <Pressable
        accessibilityHint="Opens your profile and account details"
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
