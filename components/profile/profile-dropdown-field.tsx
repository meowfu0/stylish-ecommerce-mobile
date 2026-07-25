import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/design-tokens";

type ProfileDropdownFieldProps = {
  disabled?: boolean;
  error?: string;
  expanded?: boolean;
  label: string;
  onPress: () => void;
  value: string;
};

export function ProfileDropdownField({
  disabled,
  error,
  expanded,
  label,
  onPress,
  value,
}: ProfileDropdownFieldProps) {
  return (
    <View>
      <Text className="font-montserrat-regular text-xs text-neutral-1000">
        {label}
      </Text>
      <Pressable
        accessibilityHint={error || "Opens a list of mock state options"}
        accessibilityLabel={`${label}, ${value}`}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded }}
        className="mt-[12px] h-[48px] flex-row items-center rounded-sm border bg-neutral-0 px-[16px] active:opacity-70"
        disabled={disabled}
        onPress={onPress}
        style={{
          borderColor: error ? colors.brand.primary : colors.neutral[300],
        }}
      >
        <Text className="flex-1 font-montserrat-medium text-xs text-neutral-1000">
          {value}
        </Text>
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/profile/dropdown.png")}
          style={{ height: 10, width: 20 }}
        />
      </Pressable>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-[4px] font-montserrat-medium text-[11px] leading-[14px] text-brand-primary"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
