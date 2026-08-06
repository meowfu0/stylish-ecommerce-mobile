import { Image } from "expo-image";
import { View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { colors } from "@/constants/design-tokens";

type HomeSearchBarProps = {
  autoFocus?: boolean;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  value: string;
  width: number;
};

export function HomeSearchBar({
  autoFocus = false,
  onChangeText,
  onSubmitEditing,
  value,
  width,
}: HomeSearchBarProps) {
  return (
    <View
      accessibilityLabel="Search any product"
      accessibilityRole="search"
      className="h-[40px] flex-row items-center overflow-hidden rounded-[6px] bg-neutral-0 px-md shadow-sm"
      style={{ width }}
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/icons/home/search-1.svg")}
        style={{ height: 20, width: 20 }}
      />
      <StylishTextInput
        accessibilityLabel="Product search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        className="ml-[10px] flex-1 p-0 font-montserrat-regular text-sm text-neutral-1000 focus:outline-none"
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder="Search any Product..."
        placeholderTextColor={colors.neutral[350]}
        returnKeyType="search"
        selectionColor={colors.brand.primary}
        value={value}
      />
      <View className="h-[24px] w-[24px] items-center justify-center">
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/home/search-3.svg")}
          style={{ height: 19, width: 14 }}
        />
      </View>
    </View>
  );
}
