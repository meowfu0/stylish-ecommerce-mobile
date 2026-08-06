import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Animated, StyleSheet } from "react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import {
  MetricsSection,
  SalesPerformance,
} from "@/features/merchant-dashboard/dashboard-overview-sections";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";
import { merchantNavigationItems } from "@/features/merchant-dashboard/merchant-navigation";
import { SidebarPressable as WebSidebarPressable } from "@/features/merchant-dashboard/sidebar-pressable.web";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const ownerSession: MerchantSession = {
  defaultLocation: "Lumière Makati Warehouse",
  displayName: "Owner",
  email: "owner@example.com",
  merchantHandle: "merchant-workspace",
  merchantName: "Lumière",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

let timingSpy: jest.SpiedFunction<typeof Animated.timing>;

beforeAll(() => {
  timingSpy = jest.spyOn(Animated, "timing").mockImplementation(
    (value, configuration) =>
      ({
        reset: jest.fn(),
        start: (callback?: (result: { finished: boolean }) => void) => {
          (value as Animated.Value).setValue(configuration.toValue as number);
          callback?.({ finished: true });
        },
        stop: jest.fn(),
      }) as ReturnType<typeof Animated.timing>,
  );
});

afterAll(() => timingSpy.mockRestore());

describe("merchant dashboard layout regressions", () => {
  it("normalizes the web button into a horizontal flex row", () => {
    const screen = render(
      <WebSidebarPressable
        accessibilityLabel="Test row"
        style={{
          alignItems: "center",
          flexDirection: "row",
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        Test row
      </WebSidebarPressable>,
    );
    const output = screen.toJSON();

    if (!output || Array.isArray(output)) {
      throw new Error("Expected one web sidebar button");
    }

    expect(output.type).toBe("button");
    expect(output.props.style).toMatchObject({
      alignItems: "center",
      display: "flex",
      flexDirection: "row",
      paddingBottom: 8,
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 8,
    });
  });

  it("renders compact metric money without splitting the value", () => {
    const screen = render(<MetricsSection mobile={false} />);

    expect(screen.getByText("₱486.3K")).toBeTruthy();
    expect(screen.getByText("₱413.3K")).toBeTruthy();
    expect(screen.getByText("₱1.5K")).toBeTruthy();
  });

  it("renders revenue, orders, and refunds as separate chart series", () => {
    const screen = render(<SalesPerformance />);

    fireEvent(screen.getByTestId("dashboard-sales-chart"), "layout", {
      nativeEvent: { layout: { width: 640 } },
    });

    expect(screen.getByTestId("chart-series-revenue")).toBeTruthy();
    expect(screen.getByTestId("chart-series-revenue-area")).toBeTruthy();
    expect(screen.getByTestId("chart-series-orders")).toBeTruthy();
    expect(screen.getByTestId("chart-series-refunds")).toBeTruthy();
    expect(
      screen.getByTestId("chart-series-revenue-area").props.children.length,
    ).toBeGreaterThan(7);
  });

  it("keeps expanded sidebar rows horizontal", () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const overviewStyle = StyleSheet.flatten(
      screen.getByLabelText("Overview").props.style,
    );
    const productStyle = StyleSheet.flatten(
      screen.getByLabelText("Products").props.style,
    );

    expect(overviewStyle).toMatchObject({
      alignItems: "center",
      flexDirection: "row",
      width: "100%",
    });
    expect(productStyle.flexDirection).toBe("row");
  });

  it("keeps row accessories compact for one, two, and three digit badges", () => {
    const product = merchantNavigationItems
      .find((item) => item.label === "Catalog")
      ?.children?.find((item) => item.label === "Products");
    const orders = merchantNavigationItems.find(
      (item) => item.label === "Orders",
    );
    const reviews = merchantNavigationItems.find(
      (item) => item.label === "Reviews",
    );
    const originalProductBadge = product?.badge;
    const originalOrdersBadge = orders?.badge;
    const originalReviewsBadge = reviews?.badge;

    if (product) product.badge = 7;
    if (orders) orders.badge = 18;
    if (reviews) reviews.badge = 128;

    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    if (product) product.badge = originalProductBadge;
    if (orders) orders.badge = originalOrdersBadge;
    if (reviews) reviews.badge = originalReviewsBadge;

    ["7", "18", "128"].forEach((value) => {
      expect(screen.getByText(value)).toBeTruthy();
    });
    screen.getAllByTestId("sidebar-count-badge").forEach((badge) => {
      expect(StyleSheet.flatten(badge.props.style)).toMatchObject({
        flexShrink: 0,
        height: 20,
        minWidth: 22,
      });
    });
  });

  it("truncates long workspace and navigation labels without moving accessories", () => {
    const longSession = {
      ...ownerSession,
      merchantName: "Lumière International Fashion Marketplace",
    };
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={longSession}
      />,
    );

    expect(screen.getByText(longSession.merchantName).props.numberOfLines).toBe(
      1,
    );
    expect(screen.getByText("Staff & Permissions").props.numberOfLines).toBe(1);
    expect(
      StyleSheet.flatten(screen.getByLabelText("Catalog").props.style),
    ).toMatchObject({ flexDirection: "row", width: "100%" });
  });

  it("uses centered 44 pixel controls in the collapsed rail", () => {
    const screen = render(
      <MerchantSidebar onToggleRail={jest.fn()} rail session={ownerSession} />,
    );
    const overviewStyle = StyleSheet.flatten(
      screen.getByLabelText("Overview").props.style,
    );

    expect(overviewStyle).toMatchObject({
      alignSelf: "center",
      flexDirection: "row",
      height: 44,
      justifyContent: "center",
      width: 44,
    });
  });

  it("toggles Catalog and Inventory independently", async () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const catalog = screen.getByLabelText("Catalog");
    const inventory = screen.getByLabelText("Inventory");

    expect(catalog.props.accessibilityState.expanded).toBe(true);
    expect(inventory.props.accessibilityState.expanded).toBe(true);
    expect(screen.getByLabelText("Products")).toBeTruthy();
    expect(screen.getByLabelText("Stock Levels")).toBeTruthy();

    fireEvent.press(catalog);

    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(false);
    expect(
      screen.getByLabelText("Inventory").props.accessibilityState.expanded,
    ).toBe(true);
    expect(screen.getByLabelText("Stock Levels")).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByLabelText("Products")).toBeNull();
    });

    fireEvent.press(screen.getByLabelText("Catalog"));

    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(true);
    await waitFor(() => {
      expect(screen.getByLabelText("Products")).toBeTruthy();
    });
  });

  it("opens the active child group and marks the active branch", () => {
    const screen = render(
      <MerchantSidebar
        activeItemLabel="Products"
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const product = screen.getByLabelText("Products");

    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(true);
    expect(product.props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(product.props.style).backgroundColor).toBe(
      "#FCF3F6",
    );
  });

  it("expands the sidebar before opening a rail group", () => {
    const onToggleRail = jest.fn();
    const screen = render(
      <MerchantSidebar
        onToggleRail={onToggleRail}
        rail
        session={ownerSession}
      />,
    );

    expect(screen.queryByLabelText("Products")).toBeNull();
    fireEvent.press(screen.getByLabelText("Catalog"));
    expect(onToggleRail).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Products")).toBeNull();
  });

  it("renders unauthorized destinations as disabled locked rows", () => {
    const catalogSession: MerchantSession = {
      ...ownerSession,
      permissions: rolePermissions["Catalog Staff"],
      role: "Catalog Staff",
    };
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={catalogSession}
      />,
    );
    const inventory = screen.getByLabelText("Inventory");
    const inventoryStyle = StyleSheet.flatten(inventory.props.style);

    expect(inventory.props.accessibilityState.disabled).toBe(true);
    expect(inventory.props.accessibilityHint).toBe(
      "Your role doesn't include access to this section",
    );
    expect(inventoryStyle.opacity).toBe(0.6);
  });

  it("uses the pink keyboard ring on all sidebar controls", () => {
    const screen = render(
      <MerchantSidebar
        onClose={jest.fn()}
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const expectedRing =
      "focus-visible:ring-[2px] focus-visible:ring-brand-primary";

    [
      "Collapse sidebar",
      "Current workspace Lumière, Merchant Owner",
      "Overview",
      "Catalog",
      "Products",
      "View Storefront",
      "Close navigation",
    ].forEach((label) => {
      expect(screen.getByLabelText(label).props.className).toContain(
        expectedRing,
      );
    });
    expect(
      screen.getByLabelText("Merchant sections").props.className,
    ).toContain("focus-visible:ring-inset focus-visible:ring-brand-primary");
  });
});
