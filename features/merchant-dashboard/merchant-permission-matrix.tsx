import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  merchantPermissions,
  rolePermissions,
} from "@/features/merchant-dashboard/dashboard-access";
import { DashboardIcon } from "@/features/merchant-dashboard/dashboard-primitives";
import type { MerchantRole } from "@/features/merchant-dashboard/dashboard-types";

const roles = Object.keys(rolePermissions) as MerchantRole[];

export function MerchantPermissionMatrix() {
  return (
    <View
      accessibilityLabel="Merchant roles and permissions"
      style={styles.cards}
    >
      {roles.map((role) => (
        <View key={role} style={styles.card}>
          <StylishText style={styles.role} unstyled variant="label">
            {role}
          </StylishText>
          <View style={styles.permissionList}>
            {merchantPermissions.map((permission) => {
              const granted = rolePermissions[role].includes(permission);
              return (
                <View key={permission} style={styles.permissionRow}>
                  <DashboardIcon
                    color={
                      granted ? colors.feedback.success : colors.neutral[400]
                    }
                    name={
                      granted ? "check-circle-outline" : "minus-circle-outline"
                    }
                    size={16}
                  />
                  <StylishText
                    style={styles.permission}
                    unstyled
                    variant="caption"
                  >
                    {permission} — {granted ? "Granted" : "Withheld"}
                  </StylishText>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cards: { gap: spacing.md },
  permission: {
    color: colors.neutral[550],
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  permissionList: { gap: spacing.xs },
  permissionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  role: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
});
