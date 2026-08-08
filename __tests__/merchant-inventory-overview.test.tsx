import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/constants/design-tokens";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { InventoryOverview } from "@/features/merchant-dashboard/dashboard-commerce-sections";
import { loadDashboardSnapshot } from "@/features/merchant-dashboard/dashboard-data-source";
import type { DashboardSectionLoaders } from "@/features/merchant-dashboard/dashboard-data-source";
import type {
  InventorySummary,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const session: MerchantSession = {
  defaultLocation: "Lumière Makati Warehouse",
  displayName: "Owner",
  email: "owner@example.com",
  merchantHandle: "lumiere",
  merchantName: "Lumière",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

const summary: InventorySummary = {
  inStock: 431,
  lowStock: 12,
  outOfStock: 3,
  totalActiveVariants: 486,
};

const grow = (screen: ReturnType<typeof render>, key: string) => {
  const node = screen.queryByTestId(`inventory-stock-segment-${key}`);
  return node
    ? (StyleSheet.flatten(node.props.style).flexGrow as number)
    : null;
};

describe("InventoryOverview", () => {
  it("renders the supplied counts and location rather than fixed copy", () => {
    const screen = render(
      <InventoryOverview session={session} summary={summary} />,
    );

    // Total appears once; each stock state appears in its card and its legend.
    expect(screen.getAllByText("486")).toHaveLength(1);
    expect(screen.getAllByText("431")).toHaveLength(2);
    expect(screen.getAllByText("12")).toHaveLength(2);
    expect(screen.getAllByText("3")).toHaveLength(2);
    expect(
      screen.getByText("Default location: Lumière Makati Warehouse"),
    ).toBeTruthy();
  });

  it("sizes each stock segment from its own count", () => {
    const screen = render(
      <InventoryOverview session={session} summary={summary} />,
    );

    expect(grow(screen, "inStock")).toBe(431);
    expect(grow(screen, "lowStock")).toBe(12);
    expect(grow(screen, "outOfStock")).toBe(3);
  });

  it("re-sizes when the counts change instead of holding fixed widths", () => {
    const screen = render(
      <InventoryOverview
        session={session}
        summary={{
          inStock: 10,
          lowStock: 40,
          outOfStock: 50,
          totalActiveVariants: 100,
        }}
      />,
    );

    expect(grow(screen, "inStock")).toBe(10);
    expect(grow(screen, "lowStock")).toBe(40);
    expect(grow(screen, "outOfStock")).toBe(50);
  });

  it("omits empty segments and never divides by zero", () => {
    const screen = render(
      <InventoryOverview
        session={session}
        summary={{
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
          totalActiveVariants: 0,
        }}
      />,
    );

    expect(grow(screen, "inStock")).toBeNull();
    expect(grow(screen, "lowStock")).toBeNull();
    expect(grow(screen, "outOfStock")).toBeNull();
    // The empty track still renders, so the bar does not vanish.
    expect(screen.getByTestId("inventory-stock-bar")).toBeTruthy();
  });

  it("handles large counts without clipping the value", () => {
    const screen = render(
      <InventoryOverview
        session={session}
        summary={{
          inStock: 1_240_880,
          lowStock: 0,
          outOfStock: 4,
          totalActiveVariants: 1_240_884,
        }}
      />,
    );

    expect(screen.getByText("1,240,884")).toBeTruthy();
    expect(grow(screen, "lowStock")).toBeNull();
    expect(grow(screen, "outOfStock")).toBe(4);
  });

  it("keys the legend with round dots in the feedback colours", () => {
    const screen = render(
      <InventoryOverview session={session} summary={summary} />,
    );
    const expected = {
      inStock: colors.feedback.success,
      lowStock: colors.feedback.warning,
      outOfStock: colors.feedback.danger,
    };

    for (const [key, color] of Object.entries(expected)) {
      const style = StyleSheet.flatten(
        screen.getByTestId(`inventory-legend-dot-${key}`).props.style,
      );
      expect(style.width).toBe(style.height);
      expect(style.borderRadius).toBeGreaterThanOrEqual(style.width / 2);
      expect(style.backgroundColor).toBe(color);
    }
  });

  it("tints only the warning and danger cards, and draws their borders", () => {
    const screen = render(
      <InventoryOverview session={session} summary={summary} />,
    );
    const warning = StyleSheet.flatten(
      screen.getByTestId("inventory-stat-warning").props.style,
    );
    const danger = StyleSheet.flatten(
      screen.getByTestId("inventory-stat-danger").props.style,
    );

    expect(warning.backgroundColor).toBe(colors.feedback.warningSoft);
    expect(danger.backgroundColor).toBe(colors.feedback.dangerSoft);
    // A width without a style collapses to nothing on web.
    expect(warning.borderStyle).toBe("solid");
    expect(danger.borderStyle).toBe("solid");
    expect(warning.borderColor).not.toBe(colors.neutral[200]);
    expect(danger.borderColor).not.toBe(colors.neutral[200]);
  });

  it("disables the Manage Inventory action for a role that cannot adjust stock", () => {
    const screen = render(
      <InventoryOverview
        session={{ ...session, permissions: [] }}
        summary={summary}
      />,
    );

    expect(
      screen.getByTestId("inventory-manage-button").props.accessibilityState
        .disabled,
    ).toBe(true);
  });
});

describe("inventory analytics contract", () => {
  it("normalizes a malformed inventory payload into zeroed counts", async () => {
    const loaders = {
      activity: async () => [],
      catalog: async () => [],
      inventory: async () => ({ summary: { inStock: "431", lowStock: 12 } }),
      metrics: async () => [],
      orders: async () => ({ pipelineStages: [] }),
      sales: async () => ({}),
    } as unknown as DashboardSectionLoaders;

    const { snapshot } = await loadDashboardSnapshot(loaders);

    expect(snapshot.inventorySummary).toEqual({
      inStock: 0,
      lowStock: 12,
      outOfStock: 0,
      totalActiveVariants: 0,
    });
  });

  it("zeroes the summary when the inventory region returns nothing usable", async () => {
    const loaders = {
      activity: async () => [],
      catalog: async () => [],
      inventory: async () => [],
      metrics: async () => [],
      orders: async () => ({ pipelineStages: [] }),
      sales: async () => ({}),
    } as unknown as DashboardSectionLoaders;

    const { snapshot } = await loadDashboardSnapshot(loaders);

    expect(snapshot.inventorySummary.totalActiveVariants).toBe(0);
  });
});
