import { Image } from "expo-image";
import { Pressable, Text } from "react-native";

type FilterButtonProps = {
  onPress: () => void;
};

export function FilterButton({ onPress }: FilterButtonProps) {
  return (
    <Pressable
      accessibilityHint="Opens product filtering options"
      accessibilityLabel="Filter products"
      accessibilityRole="button"
      className="h-[24px] flex-row items-center rounded-[6px] bg-neutral-0 px-[8px] shadow-sm active:opacity-70"
      hitSlop={6}
      onPress={onPress}
    >
      <Text className="font-montserrat-regular text-xs text-neutral-1000">
        Filter
      </Text>
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/icons/home/sort-filter-5.svg")}
        style={{ height: 16, marginLeft: 4, width: 16 }}
      />
    </Pressable>
  );
}
