import { StyleSheet, Text, type TextProps } from "react-native";

import { typography } from "@/constants/design-tokens";
import { useThemeColor } from "@/hooks/use-theme-color";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  return (
    <Text
      style={[
        { color },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
  },
  defaultSemiBold: {
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
  },
  title: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.display,
    letterSpacing: typography.letterSpacing.display,
    lineHeight: typography.lineHeight.display,
  },
  subtitle: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.headingSmall,
    lineHeight: typography.lineHeight.headingSmall,
  },
  link: {
    color: "#0a7ea4",
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.link,
    lineHeight: typography.lineHeight.link,
  },
});
