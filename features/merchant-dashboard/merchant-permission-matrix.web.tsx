import type { CSSProperties } from "react";

import { colors } from "@/constants/design-tokens";
import {
  merchantPermissions,
  rolePermissions,
} from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantRole } from "@/features/merchant-dashboard/dashboard-types";

const roles = Object.keys(rolePermissions) as MerchantRole[];

export function MerchantPermissionMatrix() {
  return (
    <div
      aria-label="Scrollable merchant role and permission matrix"
      className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55 focus-visible:ring-offset-2"
      role="region"
      style={styles.wrapper}
      tabIndex={0}
    >
      <table style={styles.table}>
        <caption style={styles.srOnly}>
          Merchant roles and the permissions granted to each role
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              style={{ ...styles.header, ...styles.stickyCorner }}
            >
              Role
            </th>
            {merchantPermissions.map((permission) => (
              <th key={permission} scope="col" style={styles.header}>
                {permission}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role}>
              <th scope="row" style={styles.stickyRole}>
                {role}
              </th>
              {merchantPermissions.map((permission) => {
                const granted = rolePermissions[role].includes(permission);
                return (
                  <td key={permission} style={styles.cell}>
                    <span
                      aria-hidden="true"
                      style={granted ? styles.granted : styles.withheld}
                    >
                      {granted ? "✓" : "—"}
                    </span>
                    <span style={styles.srOnly}>
                      {granted ? "Granted" : "Withheld"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const border = `1px solid ${colors.neutral[200]}`;

const styles: Record<string, CSSProperties> = {
  cell: {
    borderBottom: border,
    minWidth: 136,
    padding: 12,
    textAlign: "center",
  },
  granted: {
    color: colors.feedback.success,
    fontSize: 13,
    fontWeight: 600,
  },
  header: {
    backgroundColor: colors.neutral[50],
    borderBottom: border,
    color: colors.ink.primary,
    fontSize: 12,
    fontWeight: 700,
    minWidth: 136,
    padding: 12,
    position: "sticky",
    textAlign: "left",
    top: 0,
    zIndex: 2,
  },
  srOnly: {
    clip: "rect(0, 0, 0, 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    whiteSpace: "nowrap",
    width: 1,
  },
  stickyCorner: { left: 0, minWidth: 220, zIndex: 4 },
  stickyRole: {
    backgroundColor: colors.neutral[0],
    borderBottom: border,
    borderRight: border,
    color: colors.ink.primary,
    fontSize: 13,
    fontWeight: 600,
    left: 0,
    minWidth: 220,
    padding: 12,
    position: "sticky",
    textAlign: "left",
    zIndex: 1,
  },
  table: {
    borderCollapse: "separate",
    borderSpacing: 0,
    fontFamily: "Montserrat_400Regular, Montserrat, Arial, sans-serif",
    minWidth: 2124,
    width: "100%",
  },
  withheld: { color: colors.neutral[400], fontSize: 13 },
  wrapper: {
    backgroundColor: colors.neutral[0],
    border,
    borderRadius: 12,
    maxHeight: 560,
    maxWidth: "100%",
    overflow: "auto",
    overscrollBehavior: "contain",
  },
};
