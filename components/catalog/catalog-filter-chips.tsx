import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";

import type { CatalogFilterChip } from "@/constants/catalog-options";
import { colors } from "@/constants/design-tokens";

type CatalogFilterChipsProps = {
  chips: readonly CatalogFilterChip[];
  onRemove: (chip: CatalogFilterChip) => void;
};

export function CatalogFilterChips({
  chips,
  onRemove,
}: CatalogFilterChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`${chips.length} active filters`}
      className="flex-row flex-wrap gap-xs"
    >
      {chips.map((chip) => (
        <Pressable
          accessibilityLabel={`Remove ${chip.label} filter`}
          accessibilityRole="button"
          className="min-h-[34px] cursor-pointer flex-row items-center rounded-pill border border-brand-primary/30 bg-brand-socialSurface px-sm active:opacity-70"
          focusable
          key={chip.id}
          onPress={() => onRemove(chip)}
          testID="catalog-filter-chip"
        >
          <Text
            className="font-montserrat-medium text-xs text-brand-primary"
            numberOfLines={1}
          >
            {chip.label}
          </Text>
          <MaterialIcons
            color={colors.brand.primary}
            name="close"
            size={14}
            style={{ marginLeft: 5 }}
          />
        </Pressable>
      ))}
    </View>
  );
}
