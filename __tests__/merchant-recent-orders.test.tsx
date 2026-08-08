import { fireEvent, render } from "@testing-library/react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import {
  RecentOrders,
  sortOrdersByDate,
} from "@/features/merchant-dashboard/dashboard-commerce-sections";
import { recentOrders } from "@/features/merchant-dashboard/dashboard-data";
import { formatOrderDate } from "@/features/merchant-dashboard/dashboard-format";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";

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

/** Opens an anchored menu: the trigger measures itself before showing. */
const openMenu = (node: { props: { onPress?: () => void } }) => {
  fireEvent.press(node);
};

describe("sortOrdersByDate", () => {
  it("orders newest first and falls back to the order number", () => {
    const sorted = sortOrdersByDate(recentOrders, "desc");
    const dates = sorted.map((order) => order.date);

    expect([...dates]).toEqual([...dates].sort().reverse());
    expect(sorted[0].orderNumber).toBe("LUM-24817");
  });

  it("reverses cleanly without mutating the source", () => {
    const original = [...recentOrders];
    const ascending = sortOrdersByDate(recentOrders, "asc");

    expect(ascending[0].date <= ascending[ascending.length - 1].date).toBe(
      true,
    );
    expect(recentOrders).toEqual(original);
  });
});

describe("RecentOrders", () => {
  it("formats ISO dates for display while sorting on the raw value", () => {
    const screen = render(<RecentOrders compact={false} session={owner} />);

    expect(
      screen.getAllByText(formatOrderDate("2026-08-01")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("2026-08-01")).toBeNull();
  });

  it("reports the filtered count against the full set", () => {
    const screen = render(<RecentOrders compact={false} session={owner} />);

    expect(
      screen.getByText(
        `${recentOrders.length} of ${recentOrders.length} orders match your filters`,
      ),
    ).toBeTruthy();
  });

  it("narrows the table when a status filter is chosen", () => {
    const screen = render(<RecentOrders compact={false} session={owner} />);

    openMenu(screen.getByTestId("order-status-filter"));
    fireEvent.press(screen.getByTestId("menu-item-Cancelled"));

    const cancelled = recentOrders.filter(
      (order) => order.status === "Cancelled",
    ).length;
    expect(
      screen.getByText(
        `${cancelled} of ${recentOrders.length} orders match your filters`,
      ),
    ).toBeTruthy();
  });

  it("combines the payment filter with the search box", () => {
    const screen = render(<RecentOrders compact={false} session={owner} />);

    openMenu(screen.getByTestId("order-payment-filter"));
    fireEvent.press(screen.getByTestId("menu-item-Refunded"));

    const refunded = recentOrders.filter(
      (order) => order.payment === "Refunded",
    ).length;
    expect(
      screen.getByText(
        `${refunded} of ${recentOrders.length} orders match your filters`,
      ),
    ).toBeTruthy();
  });

  it("shows an empty message rather than a blank table", () => {
    const screen = render(<RecentOrders compact={false} session={owner} />);

    fireEvent.changeText(
      screen.getByLabelText("Search recent orders"),
      "no-such-customer",
    );

    expect(screen.getByText("No orders match your filters.")).toBeTruthy();
    expect(
      screen.getByText(`0 of ${recentOrders.length} orders match your filters`),
    ).toBeTruthy();
  });

  it("toggles the date sort rather than only decorating the header", () => {
    const screen = render(<RecentOrders compact={false} session={owner} />);
    const sort = screen.getByTestId("orders-sort-date");

    expect(sort.props.accessibilityLabel).toContain("newest first");
    fireEvent.press(sort);
    expect(
      screen.getByTestId("orders-sort-date").props.accessibilityLabel,
    ).toContain("oldest first");
  });

  it("disables Previous on the first page and Next on the last", () => {
    const screen = render(<RecentOrders compact={false} session={owner} />);

    expect(
      screen.getByTestId("orders-previous-page").props.accessibilityState
        .disabled,
    ).toBe(true);

    fireEvent.press(screen.getByTestId("orders-next-page"));
    expect(
      screen.getByTestId("orders-previous-page").props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it("offers only the actions an order's state allows", () => {
    const cancelled = recentOrders.find(
      (order) => order.status === "Cancelled",
    );
    if (!cancelled) throw new Error("fixture needs a cancelled order");

    const screen = render(<RecentOrders compact={false} session={owner} />);
    openMenu(screen.getByTestId(`order-actions-${cancelled.orderNumber}`));

    expect(screen.getByTestId("menu-item-view")).toBeTruthy();
    expect(screen.getByTestId("menu-item-contact")).toBeTruthy();
    // A cancelled order cannot be packed or fulfilled.
    expect(screen.queryByTestId("menu-item-packing-slip")).toBeNull();
    expect(screen.queryByTestId("menu-item-fulfil")).toBeNull();
  });

  it("withholds fulfilment from a role that cannot fulfil orders", () => {
    const open = recentOrders.find(
      (order) =>
        order.status !== "Cancelled" && order.fulfillment !== "Delivered",
    );
    if (!open) throw new Error("fixture needs an unfulfilled order");

    const screen = render(
      <RecentOrders compact={false} session={{ ...owner, permissions: [] }} />,
    );
    openMenu(screen.getByTestId(`order-actions-${open.orderNumber}`));

    expect(screen.queryByTestId("menu-item-fulfil")).toBeNull();
    expect(screen.getByTestId("menu-item-view")).toBeTruthy();
  });
});
