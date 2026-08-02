import {
  can,
  rolePermissions,
} from "@/features/merchant-dashboard/dashboard-access";
import {
  activityEvents,
  lowStockAlerts,
  recentOrders,
  topProducts,
} from "@/features/merchant-dashboard/dashboard-data";
import { formatPeso } from "@/features/merchant-dashboard/dashboard-format";
import {
  DASHBOARD_STATES,
  type MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";

const catalogSession: MerchantSession = {
  defaultLocation: "Lumière Makati Warehouse",
  displayName: "Celina",
  email: "catalog@example.com",
  merchantHandle: "opaque-workspace-key",
  merchantName: "Lumière",
  permissions: rolePermissions["Catalog Staff"],
  role: "Catalog Staff",
  storeStatus: "active",
  verified: true,
};

describe("merchant dashboard model", () => {
  it("keeps every required dashboard state reachable", () => {
    expect(DASHBOARD_STATES).toEqual([
      "loading",
      "ready",
      "empty",
      "partial",
      "error",
      "permission-denied",
      "session-expired",
      "suspended",
      "degraded",
    ]);
  });

  it("ships the complete Philippine marketplace fixtures", () => {
    expect(recentOrders).toHaveLength(14);
    expect(topProducts).toHaveLength(5);
    expect(lowStockAlerts).toHaveLength(4);
    expect(activityEvents).toHaveLength(6);
  });

  it("formats integer centavos only at render", () => {
    expect(formatPeso(489900, { decimals: false })).toContain("4,899");
  });

  it("gates actions against the resolved merchant role", () => {
    expect(can(catalogSession, "products.write")).toBe(true);
    expect(can(catalogSession, "inventory.adjust")).toBe(false);
    expect(can(catalogSession, "staff.manage")).toBe(false);
  });
});
