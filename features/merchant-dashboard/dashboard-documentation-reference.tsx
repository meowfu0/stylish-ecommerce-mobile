import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  appliedSecurityRules,
  responsiveRules,
} from "@/features/merchant-dashboard/dashboard-documentation-data";
import {
  BulletList,
  DocumentationSection,
} from "@/features/merchant-dashboard/dashboard-documentation-primitives";
import { formatPeso } from "@/features/merchant-dashboard/dashboard-format";
import { merchantNavigationItems } from "@/features/merchant-dashboard/merchant-navigation";
import { MerchantPermissionMatrix } from "@/features/merchant-dashboard/merchant-permission-matrix";

export function PermissionMatrixSection() {
  return (
    <DocumentationSection
      description="Every cell is resolved from the shared merchant role-to-permission map."
      title="Role × permission matrix"
    >
      <View style={styles.roleCallout}>
        <StylishText
          style={styles.roleCalloutText}
          unstyled
          variant="bodySmall"
        >
          Roles are never selectable in the product. This matrix is design
          documentation only.
        </StylishText>
      </View>
      <MerchantPermissionMatrix />
    </DocumentationSection>
  );
}

export function NavigationModelSection() {
  return (
    <DocumentationSection
      description="Section order, nested pages, permission gates, and badges come from the production navigation model."
      title="Navigation model"
    >
      <View style={styles.navigationGrid}>
        {merchantNavigationItems.map((item) => (
          <View key={item.label} style={styles.navigationCard}>
            <View style={styles.navigationHeading}>
              <StylishText
                style={styles.navigationTitle}
                unstyled
                variant="label"
              >
                {item.label}
              </StylishText>
              {item.badge ? (
                <View style={styles.badge}>
                  <StylishText
                    style={styles.badgeText}
                    unstyled
                    variant="caption"
                  >
                    Badge {item.badge}
                  </StylishText>
                </View>
              ) : null}
            </View>
            <StylishText
              style={styles.navigationMeta}
              unstyled
              variant="caption"
            >
              {item.permission
                ? `Requires ${item.permission}`
                : "Always available"}
            </StylishText>
            {item.children ? (
              <StylishText
                style={styles.navigationChildren}
                unstyled
                variant="caption"
              >
                {item.children
                  .map((child) =>
                    child.badge
                      ? `${child.label} (badge ${child.badge})`
                      : child.label,
                  )
                  .join(" · ")}
              </StylishText>
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.navigationRule}>
        <StylishText
          style={styles.navigationRuleText}
          unstyled
          variant="bodySmall"
        >
          Sections a role cannot read are hidden from navigation, while actions
          that are visible but unavailable render disabled with the reason in
          the title attribute.
        </StylishText>
      </View>
    </DocumentationSection>
  );
}

export function ResponsiveRulesSection() {
  return (
    <DocumentationSection
      description="Responsive behavior and the data-safety contract applied to every documented state."
      title="Responsive and applied rules"
    >
      <View style={styles.rulePair}>
        <RuleCard
          description="Behavior at each target viewport."
          title="Breakpoints"
        >
          <View style={styles.breakpointList}>
            {responsiveRules.map((rule) => (
              <View key={rule.frame} style={styles.breakpointRow}>
                <StylishText
                  style={styles.breakpointFrame}
                  unstyled
                  variant="label"
                >
                  {rule.frame}
                </StylishText>
                <StylishText
                  style={styles.breakpointBehavior}
                  unstyled
                  variant="bodySmall"
                >
                  {rule.behavior}
                </StylishText>
              </View>
            ))}
          </View>
        </RuleCard>
        <RuleCard
          description={`Constraints baked into the components. Example: 489900 centavos renders as ${formatPeso(489900, { decimals: false })}.`}
          title="Applied data and security rules"
        >
          <BulletList items={appliedSecurityRules} success />
        </RuleCard>
      </View>
    </DocumentationSection>
  );
}

function RuleCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <StylishText
          accessibilityRole="header"
          aria-level={3}
          style={styles.ruleTitle}
          unstyled
          variant="headingSmall"
        >
          {title}
        </StylishText>
        <StylishText style={styles.ruleDescription} unstyled variant="caption">
          {description}
        </StylishText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.brand.pinkSoft,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 18,
  },
  breakpointBehavior: {
    color: colors.neutral[550],
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  breakpointFrame: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    lineHeight: 20,
    width: 104,
  },
  breakpointList: { gap: spacing.sm },
  breakpointRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  navigationCard: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexBasis: 300,
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 0,
    padding: spacing.md,
  },
  navigationChildren: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  navigationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  navigationHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  navigationMeta: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  navigationRule: {
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  navigationRuleText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  navigationTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
  roleCallout: {
    backgroundColor: colors.feedback.warningSoft,
    borderColor: colors.feedback.warning,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  roleCalloutText: {
    color: colors.feedback.warning,
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    lineHeight: 22,
  },
  ruleCard: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexBasis: 420,
    flexGrow: 1,
    gap: spacing.md,
    minWidth: 0,
    padding: 20,
  },
  ruleDescription: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  ruleHeader: { gap: spacing.xxs },
  rulePair: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  ruleTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 26,
  },
});
