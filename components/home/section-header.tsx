import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/design-tokens";

type SectionHeaderProps = {
  subtitle: string;
  title: string;
  tone: "deal" | "trending";
  width: number;
  onViewAll: () => void;
};

export function SectionHeader({
  subtitle,
  title,
  tone,
  width,
  onViewAll,
}: SectionHeaderProps) {
  const isDeal = tone === "deal";
  const backgroundColor = isDeal
    ? colors.brand.blue
    : colors.brand.trending;

  return (
    <View
      className="h-[60px] flex-row items-center justify-between rounded-sm px-[8px]"
      style={{ backgroundColor, width }}
    >
      <View className="flex-1">
        <Text className="font-montserrat-medium text-md text-neutral-0">
          {title}
        </Text>
        <View className="mt-[2px] flex-row items-center">
          <Image
            accessible={false}
            contentFit="contain"
            source={
              isDeal
                ? require("@/assets/icons/home/deal-clock.svg")
                : require("@/assets/icons/home/deal-calendar.svg")
            }
            style={{ height: 16, width: 16 }}
          />
          <Text
            className="ml-[4px] font-montserrat-regular text-xs text-neutral-0"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityHint={`Opens all ${title.toLowerCase()}`}
        accessibilityLabel={`View all ${title}`}
        accessibilityRole="button"
        className="h-[32px] flex-row items-center rounded-xs border border-neutral-0 px-[10px] active:opacity-70"
        onPress={onViewAll}
      >
        <Text className="font-montserrat-semibold text-xs text-neutral-0">
          View all
        </Text>
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/home/deal-arrow.svg")}
          style={{ height: 16, tintColor: colors.neutral[0], width: 16 }}
        />
      </Pressable>
    </View>
  );
}
