import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { DashboardCard } from "@/features/merchant-dashboard/dashboard-primitives";

export function DocumentationSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionCopy}>
        <StylishText
          accessibilityRole="header"
          aria-level={2}
          style={styles.sectionTitle}
          unstyled
          variant="headingMedium"
        >
          {title}
        </StylishText>
        {description ? (
          <StylishText
            style={styles.sectionDescription}
            unstyled
            variant="bodySmall"
          >
            {description}
          </StylishText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function DocumentationFrame({
  children,
  description,
  name,
  trigger,
}: {
  children: ReactNode;
  description: string;
  name: string;
  trigger?: string;
}) {
  return (
    <View style={styles.frameGroup}>
      <View style={styles.frameLabelRow}>
        <StylishText
          accessibilityRole="header"
          aria-level={3}
          style={styles.frameName}
          unstyled
          variant="label"
        >
          {name}
        </StylishText>
        <StylishText style={styles.frameDescription} unstyled variant="caption">
          {description}
        </StylishText>
      </View>
      <DashboardCard style={styles.frameCard}>
        <View style={styles.frameInset}>{children}</View>
      </DashboardCard>
      {trigger ? (
        <StylishText style={styles.trigger} unstyled variant="caption">
          Trigger: {trigger}
        </StylishText>
      ) : null}
    </View>
  );
}

export function DocumentationStage({
  children,
  height = 560,
  rail = false,
}: {
  children: ReactNode;
  height?: number;
  rail?: boolean;
}) {
  return (
    <View style={[styles.stage, { height, width: rail ? 84 : 272 }]}>
      {children}
    </View>
  );
}

export function BulletList({
  items,
  success = false,
}: {
  items: string[];
  success?: boolean;
}) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          {success ? (
            <StylishText
              accessibilityElementsHidden
              style={styles.check}
              unstyled
              variant="caption"
            >
              ✓
            </StylishText>
          ) : (
            <View style={styles.bullet} />
          )}
          <StylishText style={styles.bulletText} unstyled variant="bodySmall">
            {item}
          </StylishText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: {
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.pill,
    height: 5,
    marginTop: spacing.xs,
    width: 5,
  },
  bulletList: { gap: spacing.xs },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
  },
  bulletText: {
    color: colors.neutral[550],
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  check: {
    color: colors.feedback.success,
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    lineHeight: 20,
  },
  frameCard: { shadowOpacity: 0.08 },
  frameDescription: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  frameGroup: { gap: spacing.sm, minWidth: 0 },
  frameInset: {
    backgroundColor: colors.neutral[50],
    minWidth: 0,
    padding: 20,
    width: "100%",
  },
  frameLabelRow: { gap: spacing.xxs },
  frameName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  section: { gap: 20, minWidth: 0, width: "100%" },
  sectionCopy: { gap: spacing.xs },
  sectionDescription: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
    letterSpacing: -0.24,
    lineHeight: 30,
  },
  stage: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    maxWidth: "100%",
    overflow: "hidden",
  },
  trigger: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
});
