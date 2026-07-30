import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/design-tokens";

const CONTROL_ICONS = {
  filter: require("@/assets/icons/home/sort-filter-5.svg"),
  sort: require("@/assets/icons/home/sort-filter-2.svg"),
} as const;

type CatalogOptionsTriggerProps = {
  accessibilityHint: string;
  active: boolean;
  kind: keyof typeof CONTROL_ICONS;
  label: string;
  onPress: () => void;
};

export function CatalogOptionsTrigger({
  accessibilityHint,
  active,
  kind,
  label,
  onPress,
}: CatalogOptionsTriggerProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={`${label} products`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`h-[38px] cursor-pointer flex-row items-center rounded-pill border px-sm ${
        active
          ? "border-brand-primary/40 bg-brand-socialSurface"
          : "border-neutral-200 bg-neutral-0"
      }`}
      focusable
      hitSlop={5}
      onPress={onPress}
      style={({ pressed }) => ({
        elevation: pressed ? 1 : 2,
        shadowColor: colors.ink.footer,
        shadowOffset: { height: pressed ? 1 : 2, width: 0 },
        shadowOpacity: pressed ? 0.06 : 0.09,
        shadowRadius: pressed ? 3 : 7,
        transform: pressed ? [{ scale: 0.97 }] : undefined,
      })}
      testID="catalog-options-trigger"
    >
      <View
        className={`h-[24px] w-[24px] items-center justify-center rounded-pill ${
          active ? "bg-brand-primary/10" : "bg-neutral-75"
        }`}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={CONTROL_ICONS[kind]}
          style={{
            height: kind === "filter" ? 15 : 14,
            tintColor: active ? colors.brand.primary : colors.neutral[700],
            width: kind === "filter" ? 16 : 14,
          }}
        />
      </View>

      <Text
        className={`ml-xs font-montserrat-medium text-xs ${
          active ? "text-brand-primary" : "text-neutral-700"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
