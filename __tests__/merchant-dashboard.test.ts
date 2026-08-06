import {
  can,
  merchantPermissions,
  rolePermissions,
} from "@/features/merchant-dashboard/dashboard-access";
import {
  activityEvents,
  lowStockAlerts,
  recentOrders,
  topProducts,
} from "@/features/merchant-dashboard/dashboard-data";
import {
  appliedSecurityRules,
  dashboardStateFrames,
  sidebarFrames,
} from "@/features/merchant-dashboard/dashboard-documentation-data";
import { formatPeso } from "@/features/merchant-dashboard/dashboard-format";
import { merchantNavigationItems } from "@/features/merchant-dashboard/merchant-navigation";
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

  it("documents every dashboard and sidebar state once", () => {
    expect(dashboardStateFrames.map((frame) => frame.state)).toEqual(
      DASHBOARD_STATES,
    );
    expect(new Set(dashboardStateFrames.map((frame) => frame.id)).size).toBe(9);
    expect(sidebarFrames).toHaveLength(7);
    expect(new Set(sidebarFrames.map((frame) => frame.id)).size).toBe(7);
    expect(
      dashboardStateFrames.every((frame) => frame.trigger.length > 0),
    ).toBe(true);
    expect(sidebarFrames.every((frame) => frame.thumb.length > 0)).toBe(true);
  });

  it("uses the complete shared access-control and navigation models", () => {
    expect(Object.keys(rolePermissions)).toHaveLength(7);
    expect(merchantPermissions).toHaveLength(14);
    expect(merchantNavigationItems.map((item) => item.label)).toEqual([
      "Overview",
      "Catalog",
      "Inventory",
      "Orders",
      "Fulfillment",
      "Promotions",
      "Reviews",
      "Staff & Permissions",
      "Reports",
      "Merchant Profile",
      "Settings",
    ]);
    expect(appliedSecurityRules).toHaveLength(9);
    expect(appliedSecurityRules).toEqual([
      "Permissions come from the backend.",
      "Merchant and user context comes from the backend; a merchant ID is never typed or displayed.",
      "Users can never type or invent a role.",
      "No payment credentials and no sensitive customer data.",
      "No raw audit payloads, tokens, authorization headers, internal IDs, or storage paths.",
      "Inventory movement internals stay inside the Inventory section.",
      "Integer Philippine centavos in application logic; formatted Philippine pesos in the UI.",
      "Loading is always distinguishable from empty.",
      "Errors describe impact and recovery, never technology.",
    ]);
  });
});
