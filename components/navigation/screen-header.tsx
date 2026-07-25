import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

type ScreenHeaderProps = {
  backHint?: string;
  contentWidth?: number;
  onBack: () => void;
  rightAction?: ReactNode;
  showDivider?: boolean;
  title: string;
  titleSize?: "action" | "md";
};

export function ScreenHeader({
  backHint = "Returns to the previous screen",
  contentWidth,
  onBack,
  rightAction,
  showDivider = true,
  title,
  titleSize = "action",
}: ScreenHeaderProps) {
  const { width } = useWindowDimensions();
  const resolvedWidth =
    contentWidth ?? Math.min(349, Math.max(0, width - 44));

  return (
    <View
      className={`h-[62px] items-center justify-center bg-neutral-25 ${
        showDivider ? "border-b border-neutral-200" : ""
      }`}
    >
      <View
        className="h-full items-center justify-center"
        style={{ width: resolvedWidth }}
      >
        <Pressable
          accessibilityHint={backHint}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="absolute left-[-14px] h-[44px] w-[44px] items-center justify-center active:opacity-60"
          hitSlop={4}
          onPress={onBack}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={require("@/assets/icons/place-order/back.svg")}
            style={{ height: 21, width: 11 }}
          />
        </Pressable>

        <Text
          accessibilityRole="header"
          className={`font-montserrat-semibold text-neutral-1000 ${
            titleSize === "action" ? "text-action" : "text-md"
          }`}
        >
          {title}
        </Text>

        {rightAction ? (
          <View className="absolute right-[-10px]">{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
}
