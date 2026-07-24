import { Image } from "expo-image";
import { Pressable, Text } from "react-native";

type SortButtonProps = {
  onPress: () => void;
};

export function SortButton({ onPress }: SortButtonProps) {
  return (
    <Pressable
      accessibilityHint="Opens product sorting options"
      accessibilityLabel="Sort products"
      accessibilityRole="button"
      className="h-[24px] flex-row items-center rounded-[6px] bg-neutral-0 px-[8px] shadow-sm active:opacity-70"
      hitSlop={6}
      onPress={onPress}
    >
      <Text className="font-montserrat-regular text-xs text-neutral-1000">
        Sort
      </Text>
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/icons/home/sort-filter-2.svg")}
        style={{ height: 16, marginLeft: 4, width: 16 }}
      />
    </Pressable>
  );
}
