import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/constants/design-tokens";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { LowStockAlerts } from "@/features/merchant-dashboard/dashboard-commerce-sections";
import { lowStockAlerts } from "@/features/merchant-dashboard/dashboard-data";
import type {
  InventoryAlert,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const owner: MerchantSession = {
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

const rowStyle = (screen: ReturnType<typeof render>, sku: string) =>
  StyleSheet.flatten(screen.getByTestId(`low-stock-${sku}`).props.style);

describe("LowStockAlerts", () => {
  it("renders each alert from data rather than fixed copy", () => {
    const screen = render(<LowStockAlerts session={owner} />);

    for (const alert of lowStockAlerts) {
      expect(screen.getByTestId(`low-stock-${alert.sku}`)).toBeTruthy();
      expect(screen.getByText(alert.name)).toBeTruthy();
      expect(
        screen.getByText(`${alert.variant} · SKU ${alert.sku}`),
      ).toBeTruthy();
      expect(screen.getAllByText(alert.location).length).toBeGreaterThan(0);
    }
  });

  it("divides every row except the last", () => {
    const screen = render(<LowStockAlerts session={owner} />);

    lowStockAlerts.slice(0, -1).forEach((alert) => {
      expect(rowStyle(screen, alert.sku).borderBottomWidth).toBe(1);
    });
    const last = lowStockAlerts[lowStockAlerts.length - 1];
    expect(rowStyle(screen, last.sku).borderBottomWidth).toBeUndefined();
  });

  it("gives every row the same four metric columns", () => {
    const screen = render(<LowStockAlerts session={owner} />);

    for (const label of ["ON HAND", "RESERVED", "AVAILABLE", "THRESHOLD"]) {
      expect(screen.getAllByText(label)).toHaveLength(lowStockAlerts.length);
    }
  });

  it("flags a depleted variant in the value and the badge", () => {
    const depleted: InventoryAlert[] = [
      { ...lowStockAlerts[0], available: 0, sku: "ZERO-1" },
    ];
    const screen = render(
      <LowStockAlerts alerts={depleted} session={owner} />,
    );

    expect(screen.getByText("Out of stock")).toBeTruthy();
    const zero = StyleSheet.flatten(screen.getByText("0").props.style);
    expect(zero.color).toBe(colors.feedback.danger);
  });

  it("keeps a stocked variant on the warning treatment", () => {
    const low: InventoryAlert[] = [
      { ...lowStockAlerts[0], available: 4, sku: "LOW-1" },
    ];
    const screen = render(<LowStockAlerts alerts={low} session={owner} />);

    expect(screen.getByText("Low stock")).toBeTruthy();
    const value = StyleSheet.flatten(screen.getByText("4").props.style);
    expect(value.color).not.toBe(colors.feedback.danger);
  });

  it("formats large counts without clipping them", () => {
    const large: InventoryAlert[] = [
      {
        ...lowStockAlerts[0],
        available: 0,
        onHand: 1_284_990,
        reorderThreshold: 250_000,
        reserved: 1_284_990,
        sku: "BIG-1",
      },
    ];
    const screen = render(<LowStockAlerts alerts={large} session={owner} />);

    expect(screen.getAllByText("1,284,990")).toHaveLength(2);
    expect(screen.getByText("250,000")).toBeTruthy();
  });

  it("disables Adjust Stock for a role that cannot adjust inventory", () => {
    const screen = render(
      <LowStockAlerts
        alerts={[lowStockAlerts[0]]}
        session={{ ...owner, permissions: [] }}
      />,
    );

    expect(
      screen.getByTestId(`low-stock-adjust-${lowStockAlerts[0].sku}`).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it("renders an empty alert list without crashing", () => {
    const screen = render(<LowStockAlerts alerts={[]} session={owner} />);

    expect(screen.getByTestId("dashboard-low-stock")).toBeTruthy();
    expect(screen.queryByText("ON HAND")).toBeNull();
  });
});
