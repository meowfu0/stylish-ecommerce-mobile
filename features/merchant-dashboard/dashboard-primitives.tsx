import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";

export type DashboardIconName = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

export function DashboardIcon({
  color = colors.neutral[550],
  name,
  size = 18,
}: {
  color?: string;
  name: DashboardIconName;
  size?: number;
}) {
  return (
    <MaterialCommunityIcons
      accessibilityElementsHidden
      color={color}
      importantForAccessibility="no-hide-descendants"
      name={name}
      size={size}
    />
  );
}

export function DashboardCard({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

export function DashboardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View className="st-shimmer" style={[styles.skeleton, style]} />;
}

export function SectionHeading({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <StylishText
          accessibilityRole="header"
          style={styles.sectionTitle}
          unstyled
          variant="headingSmall"
        >
          {title}
        </StylishText>
        {description ? (
          <StylishText
            style={styles.sectionDescription}
            unstyled
            variant="caption"
          >
            {description}
          </StylishText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function DashboardButton({
  disabled = false,
  icon,
  label,
  onPress,
  title,
  tone = "secondary",
}: {
  disabled?: boolean;
  icon?: DashboardIconName;
  label: string;
  onPress?: () => void;
  title?: string;
  tone?: "primary" | "secondary" | "quiet";
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityHint={disabled ? title : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55 focus-visible:ring-offset-2"
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.button,
        tone === "primary" && styles.buttonPrimary,
        tone === "primary" && hovered && !disabled && styles.buttonPrimaryHover,
        tone === "secondary" && styles.buttonSecondary,
        tone === "quiet" && styles.buttonQuiet,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      {icon ? (
        <DashboardIcon
          color={tone === "primary" ? colors.neutral[0] : colors.ink.primary}
          name={icon}
          size={18}
        />
      ) : null}
      <StylishText
        style={[
          styles.buttonLabel,
          tone === "primary" && styles.buttonLabelPrimary,
        ]}
        unstyled
        variant="button"
      >
        {label}
      </StylishText>
    </Pressable>
  );
}

export function StatusChip({
  icon,
  label,
  tone = "neutral",
}: {
  icon?: DashboardIconName;
  label: string;
  tone?: "blue" | "danger" | "green" | "neutral" | "pink" | "warning";
}) {
  const toneStyle = {
    blue: styles.chipBlue,
    danger: styles.chipDanger,
    green: styles.chipGreen,
    neutral: styles.chipNeutral,
    pink: styles.chipPink,
    warning: styles.chipWarning,
  }[tone];
  const toneTextStyle = {
    blue: styles.chipTextBlue,
    danger: styles.chipTextDanger,
    green: styles.chipTextGreen,
    neutral: styles.chipTextNeutral,
    pink: styles.chipTextPink,
    warning: styles.chipTextWarning,
  }[tone];

  return (
    <View style={[styles.chip, toneStyle]}>
      {icon ? (
        <DashboardIcon
          color={(toneTextStyle as { color: string }).color}
          name={icon}
          size={14}
        />
      ) : null}
      <StylishText
        style={[styles.chipText, toneTextStyle]}
        unstyled
        variant="caption"
      >
        {label}
      </StylishText>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  buttonLabelPrimary: { color: colors.neutral[0] },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonPrimary: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
    borderWidth: 1,
    shadowColor: colors.brand.primary,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  buttonPrimaryHover: {
    backgroundColor: colors.brand.primaryHover,
    borderColor: colors.brand.primaryHover,
  },
  buttonQuiet: { backgroundColor: "transparent" },
  buttonSecondary: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderWidth: 1,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: colors.ink.primary,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 24,
    paddingHorizontal: spacing.xs,
  },
  chipBlue: {
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
  },
  chipDanger: {
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.brand.pinkSoft,
  },
  chipGreen: {
    backgroundColor: colors.feedback.successSoft,
    borderColor: colors.feedback.successSoft,
  },
  chipNeutral: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[200],
  },
  chipPink: {
    backgroundColor: colors.brand.socialSurface,
    borderColor: colors.brand.pinkSoft,
  },
  chipText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  chipTextBlue: { color: colors.feedback.info },
  chipTextDanger: { color: colors.feedback.danger },
  chipTextGreen: { color: colors.feedback.success },
  chipTextNeutral: { color: colors.neutral[550] },
  chipTextPink: { color: colors.feedback.danger },
  chipTextWarning: { color: colors.feedback.warning },
  chipWarning: {
    backgroundColor: colors.feedback.warningSoft,
    borderColor: colors.feedback.warningSoft,
  },
  sectionDescription: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeading: {
    alignItems: "flex-start",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  sectionHeadingCopy: { flex: 1, gap: 4 },
  sectionTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  skeleton: {
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    opacity: 0.7,
  },
});
