import { Pressable, Text, View } from "react-native";

import type { ProductSizeOption } from "@/constants/product-details-data";

type SizeSelectorProps = {
  onChange: (size: string) => void;
  options: readonly ProductSizeOption[];
  selectedSize: string;
};

export function SizeSelector({
  onChange,
  options,
  selectedSize,
}: SizeSelectorProps) {
  return (
    <View
      accessibilityLabel="Available shoe sizes"
      accessibilityRole="radiogroup"
      className="flex-row flex-wrap gap-[8px]"
    >
      {options.map((option) => {
        const selected = selectedSize === option.label;

        return (
          <Pressable
            accessibilityLabel={`${option.label}${option.disabled ? ", unavailable" : ""}`}
            accessibilityRole="radio"
            accessibilityState={{
              checked: selected,
              disabled: option.disabled,
            }}
            className={`h-[32px] min-w-[50px] items-center justify-center rounded-[4px] border px-[8px] active:opacity-70 ${
              selected
                ? "border-brand-primary bg-brand-primary"
                : option.disabled
                  ? "border-neutral-300 bg-neutral-150"
                  : "border-brand-primary bg-transparent"
            }`}
            disabled={option.disabled}
            key={option.label}
            onPress={() => onChange(option.label)}
          >
            <Text
              className={`font-montserrat-semibold text-xs ${
                selected
                  ? "text-neutral-0"
                  : option.disabled
                    ? "text-neutral-400"
                    : "text-brand-primary"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
