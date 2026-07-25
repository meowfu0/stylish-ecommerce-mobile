import { Pressable, Text, View } from "react-native";

type PriceRowProps = {
  detailLabel?: string;
  label: string;
  onDetailPress?: () => void;
  onValuePress?: () => void;
  value?: string;
  valueTone?: "accent" | "default" | "success";
};

const valueToneClasses = {
  accent: "text-brand-primary",
  default: "text-neutral-1000",
  success: "text-feedback-success",
} as const;

export function PriceRow({
  detailLabel,
  label,
  onDetailPress,
  onValuePress,
  value,
  valueTone = "default",
}: PriceRowProps) {
  return (
    <View className="min-h-[32px] flex-row items-center">
      <Text className="font-montserrat-regular text-sm text-neutral-1000">
        {label}
      </Text>

      {detailLabel ? (
        <Pressable
          accessibilityLabel={`${detailLabel} about ${label}`}
          accessibilityRole="button"
          className="ml-[14px] min-h-[32px] justify-center px-[2px] active:opacity-60"
          onPress={onDetailPress}
        >
          <Text className="font-montserrat-semibold text-xs text-brand-primary">
            {detailLabel}
          </Text>
        </Pressable>
      ) : null}

      <View className="flex-1" />

      {value && onValuePress ? (
        <Pressable
          accessibilityLabel={`${label}: ${value}`}
          accessibilityRole="button"
          className="min-h-[32px] justify-center pl-[12px] active:opacity-60"
          onPress={onValuePress}
        >
          <Text
            className={`text-right font-montserrat-semibold text-sm ${valueToneClasses[valueTone]}`}
          >
            {value}
          </Text>
        </Pressable>
      ) : value ? (
        <Text
          accessibilityLabel={`${label}: ${value}`}
          className={`pl-[12px] text-right font-montserrat-semibold text-sm ${valueToneClasses[valueTone]}`}
        >
          {value}
        </Text>
      ) : null}
    </View>
  );
}
