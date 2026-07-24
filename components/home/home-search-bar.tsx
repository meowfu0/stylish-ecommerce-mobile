import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

type HomeSearchBarProps = {
  onPress: () => void;
  width: number;
};

export function HomeSearchBar({ onPress, width }: HomeSearchBarProps) {
  return (
    <Pressable
      accessibilityHint="Opens product search"
      accessibilityLabel="Search any product"
      accessibilityRole="search"
      className="h-[40px] flex-row items-center rounded-[6px] bg-neutral-0 px-md shadow-sm active:opacity-80"
      onPress={onPress}
      style={{ width }}
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/icons/home/search-1.svg")}
        style={{ height: 20, width: 20 }}
      />
      <Text
        className="ml-[10px] flex-1 font-montserrat-regular text-sm text-neutral-350"
        numberOfLines={1}
      >
        Search any Product...
      </Text>
      <View className="h-[24px] w-[24px] items-center justify-center">
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/home/search-3.svg")}
          style={{ height: 19, width: 14 }}
        />
      </View>
    </Pressable>
  );
}
