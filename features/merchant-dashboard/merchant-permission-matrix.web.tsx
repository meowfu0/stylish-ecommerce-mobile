import type { CSSProperties } from "react";

import { colors } from "@/constants/design-tokens";
import {
  dashboardMatrixPermissions,
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
          Merchant permissions and the roles that receive each permission
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              style={{ ...styles.header, ...styles.stickyCorner }}
            >
              Permission
            </th>
            {roles.map((role) => (
              <th key={role} scope="col" style={styles.header}>
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dashboardMatrixPermissions.map((permission) => (
            <tr key={permission}>
              <th scope="row" style={styles.stickyPermission}>
                {permission}
              </th>
              {roles.map((role) => {
                const granted = rolePermissions[role].includes(permission);
                return (
                  <td key={role} style={styles.cell}>
                    <span style={granted ? styles.granted : styles.withheld}>
                      <span aria-hidden="true">{granted ? "✓" : "—"}</span>{" "}
                      {granted ? "Granted" : "None"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={styles.note}>
        Roles are never selectable in the product. This matrix is design
        documentation only.
      </p>
    </div>
  );
}

const border = `1px solid ${colors.neutral[200]}`;

const styles: Record<string, CSSProperties> = {
  cell: {
    borderBottom: border,
    minWidth: 136,
    padding: "14px 10px",
    textAlign: "left",
  },
  granted: { color: colors.feedback.success, fontSize: 12, fontWeight: 600 },
  header: {
    backgroundColor: colors.neutral[0],
    borderBottom: border,
    color: colors.ink.primary,
    fontSize: 11,
    fontWeight: 600,
    minWidth: 136,
    padding: "10px",
    position: "sticky",
    textAlign: "left",
    top: 0,
    zIndex: 2,
  },
  note: {
    color: colors.neutral[550],
    fontSize: 12,
    lineHeight: "18px",
    margin: 0,
    padding: "12px 24px 16px",
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
  stickyCorner: { left: 0, minWidth: 210, zIndex: 4 },
  stickyPermission: {
    backgroundColor: colors.neutral[0],
    borderBottom: border,
    borderRight: border,
    color: colors.ink.primary,
    fontSize: 13,
    fontWeight: 500,
    left: 0,
    minWidth: 210,
    padding: "14px 10px",
    position: "sticky",
    textAlign: "left",
    zIndex: 1,
  },
  table: {
    borderCollapse: "separate",
    borderSpacing: 0,
    fontFamily: "Montserrat_400Regular, Montserrat, Arial, sans-serif",
    minWidth: 1160,
    width: "100%",
  },
  withheld: { color: colors.neutral[400], fontSize: 12, fontWeight: 500 },
  wrapper: {
    backgroundColor: colors.neutral[0],
    border,
    borderRadius: 12,
    maxWidth: "100%",
    overflow: "auto",
    overscrollBehavior: "contain",
  },
};
