import type { ReactNode } from "react";
import { Text, View } from "react-native";

type StorefrontSectionHeaderProps = {
  action?: ReactNode;
  centered?: boolean;
  compact?: boolean;
  eyebrow: string;
  stacked?: boolean;
  title: string;
};

export function StorefrontSectionHeader({
  action,
  centered = false,
  compact = false,
  eyebrow,
  stacked = false,
  title,
}: StorefrontSectionHeaderProps) {
  return (
    <View
      className={`relative ${
        stacked
          ? "items-start gap-sm"
          : centered
            ? "flex-row items-end justify-center"
            : "flex-row items-end justify-between"
      }`}
    >
      <View className={centered ? "items-center" : "items-start"}>
        <Text className="font-montserrat-bold text-micro uppercase tracking-[1.8px] text-brand-primary">
          {eyebrow}
        </Text>
        <Text
          accessibilityRole="header"
          className={`mt-xs font-serif text-neutral-900 ${
            compact ? "text-xl" : "text-[36px] leading-[42px]"
          }`}
        >
          {title}
        </Text>
      </View>
      {action ? (
        <View
          className={
            stacked
              ? "self-end"
              : centered
                ? "absolute bottom-0 right-0"
                : ""
          }
        >
          {action}
        </View>
      ) : null}
    </View>
  );
}
