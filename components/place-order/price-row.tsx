import { Pressable, Text, View } from "react-native";

type PriceRowProps = {
  detailLabel?: string;
  label: string;
  labelTone?: "default" | "muted" | "tertiary";
  onDetailPress?: () => void;
  onValuePress?: () => void;
  size?: "default" | "summary";
  value?: string;
  valueTone?: "accent" | "default" | "muted" | "success" | "tertiary";
};

const labelToneClasses = {
  default: "text-neutral-1000",
  muted: "text-neutral-400",
  tertiary: "text-neutral-650",
} as const;

const valueToneClasses = {
  accent: "text-brand-primary",
  default: "text-neutral-1000",
  muted: "text-neutral-400",
  success: "text-feedback-success",
  tertiary: "text-neutral-650",
} as const;

export function PriceRow({
  detailLabel,
  label,
  labelTone = "default",
  onDetailPress,
  onValuePress,
  size = "default",
  value,
  valueTone = "default",
}: PriceRowProps) {
  const summary = size === "summary";

  return (
    <View
      className={`flex-row items-center ${
        summary ? "min-h-[42px]" : "min-h-[32px]"
      }`}
    >
      <Text
        className={`${
          summary
            ? "font-montserrat-medium text-action"
            : "font-montserrat-regular text-sm"
        } ${labelToneClasses[labelTone]}`}
      >
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
            className={`text-right font-montserrat-semibold ${
              summary ? "text-md" : "text-sm"
            } ${valueToneClasses[valueTone]}`}
          >
            {value}
          </Text>
        </Pressable>
      ) : value ? (
        <Text
          accessibilityLabel={`${label}: ${value}`}
          className={`pl-[12px] text-right ${
            summary
              ? "font-montserrat-medium text-md"
              : "font-montserrat-semibold text-sm"
          } ${valueToneClasses[valueTone]}`}
        >
          {value}
        </Text>
      ) : null}
    </View>
  );
}
