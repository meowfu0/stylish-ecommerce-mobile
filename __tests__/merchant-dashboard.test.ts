import {
  can,
  merchantPermissions,
  normalizeMerchantRole,
  resolveMerchantPermissions,
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
import {
  dashboardSectionLabels,
  defaultDashboardSectionLoaders,
  loadDashboardSnapshot,
} from "@/features/merchant-dashboard/dashboard-data-source";
import {
  findMerchantNavigationTarget,
  merchantNavigationItems,
  navigationRequiresActiveStore,
  resolveMerchantNavigationAccess,
  visibleMerchantNavigationItems,
} from "@/features/merchant-dashboard/merchant-navigation";
import {
  resolveDashboardDataState,
  resolveDashboardState,
} from "@/features/merchant-dashboard/dashboard-state-model";
import {
  DASHBOARD_SECTION_KEYS,
  DASHBOARD_STATES,
  type MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import { AuthRequestError } from "@/services/auth/auth-error";

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
      "refreshing",
      "error",
      "permission-denied",
      "session-expired",
      "inactive",
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
      DASHBOARD_STATES.filter((state) => state !== "ready"),
    );
    expect(new Set(dashboardStateFrames.map((frame) => frame.id)).size).toBe(8);
    expect(sidebarFrames).toHaveLength(7);
    expect(new Set(sidebarFrames.map((frame) => frame.id)).size).toBe(7);
    expect(
      dashboardStateFrames.every((frame) => frame.trigger.length > 0),
    ).toBe(true);
    expect(sidebarFrames.every((frame) => frame.thumb.length > 0)).toBe(true);
  });

  it("resolves session, lifecycle, permission, and data states in priority order", () => {
    expect(
      resolveDashboardState({
        authStatus: "restoring",
        dataState: "ready",
        session: catalogSession,
      }),
    ).toBe("loading");
    expect(
      resolveDashboardState({
        authReason: "session-expired",
        authStatus: "unauthenticated",
        dataState: "ready",
        session: catalogSession,
      }),
    ).toBe("session-expired");
    expect(
      resolveDashboardState({
        authStatus: "authenticated",
        dataState: "ready",
        requiredPermission: "inventory.read",
        session: catalogSession,
      }),
    ).toBe("permission-denied");
    expect(
      resolveDashboardState({
        authStatus: "authenticated",
        dataState: "refreshing",
        session: catalogSession,
      }),
    ).toBe("refreshing");
  });

  it("keeps account and profile sections reachable while the store is inactive", () => {
    const inactiveSession: MerchantSession = {
      ...catalogSession,
      permissions: rolePermissions["Merchant Owner"],
      role: "Merchant Owner",
      storeStatus: "inactive",
    };

    expect(
      resolveDashboardState({
        authStatus: "authenticated",
        dataState: "ready",
        session: inactiveSession,
      }),
    ).toBe("inactive");
    expect(
      resolveDashboardState({
        authStatus: "authenticated",
        dataState: "ready",
        requiresActiveStore: false,
        session: inactiveSession,
      }),
    ).toBe("ready");
    expect(
      navigationRequiresActiveStore(
        findMerchantNavigationTarget("merchant-profile"),
      ),
    ).toBe(false);
    expect(
      navigationRequiresActiveStore(findMerchantNavigationTarget("orders")),
    ).toBe(true);
  });

  it("disables selling destinations but not profile ones when inactive", () => {
    const access = resolveMerchantNavigationAccess({
      permissions: rolePermissions["Merchant Owner"],
      storeStatus: "inactive",
    });
    const disabled = access
      .filter((entry) => entry.disabled)
      .map((entry) => entry.item.label);

    expect(disabled).toEqual([
      "Overview",
      "Catalog",
      "Inventory",
      "Orders",
      "Fulfillment",
      "Promotions",
      "Reviews",
      "Reports",
    ]);
    expect(
      resolveMerchantNavigationAccess({
        permissions: rolePermissions["Merchant Owner"],
        storeStatus: "active",
      }).every((entry) => !entry.disabled),
    ).toBe(true);
  });

  it("separates first load, refresh, partial failure, and total failure", () => {
    const base = {
      failedSectionCount: 0,
      hasCatalog: true,
      hasSnapshot: false,
      loading: false,
      sectionCount: 6,
    };

    expect(resolveDashboardDataState({ ...base, loading: true })).toBe(
      "loading",
    );
    // A reload with data already on screen refreshes instead of re-skeletoning.
    expect(
      resolveDashboardDataState({ ...base, hasSnapshot: true, loading: true }),
    ).toBe("refreshing");
    expect(resolveDashboardDataState(base)).toBe("ready");
    expect(resolveDashboardDataState({ ...base, hasCatalog: false })).toBe(
      "empty",
    );
    expect(resolveDashboardDataState({ ...base, failedSectionCount: 2 })).toBe(
      "partial",
    );
    expect(resolveDashboardDataState({ ...base, failedSectionCount: 6 })).toBe(
      "error",
    );
    // A total failure after a good load keeps the dashboard rather than erroring.
    expect(
      resolveDashboardDataState({
        ...base,
        failedSectionCount: 6,
        hasSnapshot: true,
      }),
    ).toBe("partial");
  });

  it("reports which dashboard regions failed without failing the whole load", async () => {
    const result = await loadDashboardSnapshot({
      ...defaultDashboardSectionLoaders,
      activity: async () => {
        throw new Error("unavailable");
      },
      sales: async () => [],
    });

    expect(result.failedSections).toEqual(["activity"]);
    expect(result.snapshot.hasCatalog).toBe(true);
    // No sales history must never be reported as loaded chart data.
    expect(result.snapshot.hasSalesHistory).toBe(false);
  });

  it("surfaces an expired session instead of reporting a service error", async () => {
    await expect(
      loadDashboardSnapshot({
        ...defaultDashboardSectionLoaders,
        metrics: async () => {
          throw new AuthRequestError(
            "session-expired",
            "Your session has expired. Please sign in again.",
            401,
          );
        },
      }),
    ).rejects.toBeInstanceOf(AuthRequestError);
  });

  it("labels every independently loaded dashboard region", () => {
    expect(DASHBOARD_SECTION_KEYS).toHaveLength(6);
    expect(
      DASHBOARD_SECTION_KEYS.every(
        (key) => dashboardSectionLabels[key].length > 0,
      ),
    ).toBe(true);
  });

  it("defaults unknown backend roles to no merchant permissions", () => {
    const unknownRole = normalizeMerchantRole("invented_role");

    expect(unknownRole).toBeUndefined();
    expect(resolveMerchantPermissions(undefined, unknownRole)).toEqual([]);
  });

  it("uses backend permission keys when available", () => {
    expect(
      resolveMerchantPermissions(
        ["merchant.catalog.read", "merchant.inventory.adjust"],
        "Merchant Owner",
      ),
    ).toEqual(["products.read", "inventory.adjust"]);
    expect(resolveMerchantPermissions([], "Merchant Owner")).toEqual([]);
  });

  it("centralizes route permissions and filters navigation", () => {
    const visible = visibleMerchantNavigationItems(
      rolePermissions["Catalog Staff"],
    );

    expect(visible.map((item) => item.label)).toEqual(["Overview", "Catalog"]);
    expect(findMerchantNavigationTarget("staff-permissions")).toMatchObject({
      label: "Staff & Permissions",
      permission: "staff.manage",
    });
  });

  it.each([
    [
      "Merchant Owner",
      [
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
      ],
    ],
    [
      "Merchant Administrator",
      [
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
      ],
    ],
    [
      "Manager",
      [
        "Overview",
        "Catalog",
        "Inventory",
        "Orders",
        "Fulfillment",
        "Promotions",
        "Reviews",
        "Reports",
        "Merchant Profile",
      ],
    ],
    ["Catalog Staff", ["Overview", "Catalog"]],
    ["Inventory Staff", ["Overview", "Inventory"]],
    ["Fulfillment Staff", ["Overview", "Inventory", "Orders", "Fulfillment"]],
    ["Support Staff", ["Overview", "Orders"]],
  ] as const)("shows only authorized navigation for %s", (role, labels) => {
    const visible = visibleMerchantNavigationItems(rolePermissions[role]);

    expect(visible.map((item) => item.label)).toEqual(labels);
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
