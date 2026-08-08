import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Animated, StyleSheet } from "react-native";

import { VELORI_LOGO_ASPECT_RATIO } from "@/components/brand/velori-logo";
import { colors } from "@/constants/design-tokens";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { salesSeries } from "@/features/merchant-dashboard/dashboard-data";
import { DashboardOverviewContent } from "@/features/merchant-dashboard/dashboard-overview-content";
import {
  MetricsSection,
  SalesPerformance,
} from "@/features/merchant-dashboard/dashboard-overview-sections";
import {
  DashboardBlockingState,
  DashboardLoadingState,
  DashboardStateBanner,
} from "@/features/merchant-dashboard/dashboard-states";
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
    const screen = render(<MetricsSection />);

    expect(screen.getByText("₱486.3K")).toBeTruthy();
    expect(screen.getByText("₱413.3K")).toBeTruthy();
    expect(screen.getByText("₱1.5K")).toBeTruthy();
  });

  it("renders revenue, orders, and refunds as separate chart series", () => {
    const screen = render(<SalesPerformance salesSeries={salesSeries} />);

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

  it("sizes the expanded brand lockup fluidly rather than at a fixed width", () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const logo = StyleSheet.flatten(
      screen.getByTestId("merchant-sidebar-brand-logo").props.style,
    );

    // A cap plus the artwork's own ratio, so the lockup tracks the sidebar
    // width instead of restating a pixel size copied from a screenshot.
    expect(logo.width).toBe("100%");
    expect(logo.maxWidth).toBe(144);
    expect(logo.aspectRatio).toBeCloseTo(VELORI_LOGO_ASPECT_RATIO, 4);
    expect(logo.flexShrink).toBe(1);
    expect(logo.height).toBeUndefined();
  });

  it("shows only the compact mark in the rail and keeps it inside the header", () => {
    const screen = render(
      <MerchantSidebar onToggleRail={jest.fn()} rail session={ownerSession} />,
    );

    expect(screen.queryByTestId("merchant-sidebar-brand-logo")).toBeNull();
    const region = StyleSheet.flatten(
      screen.getByTestId("merchant-sidebar-brand-region").props.style,
    );
    const mark = StyleSheet.flatten(
      screen.getByTestId("merchant-sidebar-brand-mark").props.style,
    );
    const collapse = StyleSheet.flatten(
      screen.getByLabelText("Expand sidebar").props.style,
    );

    expect(region.flexDirection).toBe("column");
    expect(region.justifyContent).toBe("center");
    // The stacked mark, gap and collapse control have to fit the header height
    // the rail shares with the expanded sidebar, or the mark reads as clipped.
    expect(mark.height + region.gap + collapse.height).toBeLessThanOrEqual(
      region.height,
    );
  });

  it("outlines the workspace card only while the cursor is over it", () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const card = screen.getByTestId("merchant-sidebar-workspace-card");
    const resting = StyleSheet.flatten(card.props.style);

    expect(resting.borderColor).toBe("transparent");
    expect(resting.backgroundColor).toBe(colors.neutral[50]);

    fireEvent(card, "hoverIn");
    const hovered = StyleSheet.flatten(
      screen.getByTestId("merchant-sidebar-workspace-card").props.style,
    );

    expect(hovered.borderColor).toBe(colors.neutral[200]);
    expect(hovered.backgroundColor).toBe(colors.neutral[0]);
    // The resting card reserves the border width, so revealing the outline
    // must not change the box and nudge the navigation below it.
    expect(hovered.borderWidth).toBe(resting.borderWidth);
  });

  it("keeps expanded sidebar rows horizontal", () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    fireEvent.press(screen.getByLabelText("Catalog"));
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
    fireEvent.press(screen.getByLabelText("Catalog"));
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

  it("starts collapsed and uses one open accordion group", async () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const catalog = screen.getByLabelText("Catalog");
    const inventory = screen.getByLabelText("Inventory");

    expect(catalog.props.accessibilityState.expanded).toBe(false);
    expect(inventory.props.accessibilityState.expanded).toBe(false);
    expect(screen.queryByLabelText("Products")).toBeNull();
    expect(screen.queryByLabelText("Stock Levels")).toBeNull();

    fireEvent.press(catalog);

    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(true);
    expect(
      screen.getByLabelText("Inventory").props.accessibilityState.expanded,
    ).toBe(false);
    await waitFor(() => {
      expect(screen.getByLabelText("Products")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Inventory"));

    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(false);
    expect(
      screen.getByLabelText("Inventory").props.accessibilityState.expanded,
    ).toBe(true);
    await waitFor(() => {
      expect(screen.queryByLabelText("Products")).toBeNull();
      expect(screen.getByLabelText("Stock Levels")).toBeTruthy();
    });
  });

  it("keeps an active child branch highlighted without auto-expanding it", async () => {
    const screen = render(
      <MerchantSidebar
        activeItemLabel="Products"
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );

    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(false);
    expect(screen.queryByLabelText("Products")).toBeNull();
    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.selected,
    ).toBe(true);
    expect(
      StyleSheet.flatten(screen.getByLabelText("Catalog").props.style)
        .backgroundColor,
    ).toBe("#FCF3F6");

    fireEvent.press(screen.getByLabelText("Catalog"));
    await waitFor(() => {
      expect(screen.getByLabelText("Products")).toBeTruthy();
    });
    const product = screen.getByLabelText("Products");

    expect(product.props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(product.props.style).backgroundColor).toBe(
      "#FCF3F6",
    );
  });

  it("enables navigation scrolling only when its content overflows", () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const collapsedNavigation = screen.getByLabelText("Merchant sections");

    expect(collapsedNavigation.props.scrollEnabled).toBe(false);
    expect(collapsedNavigation.props.showsVerticalScrollIndicator).toBe(false);
    expect(collapsedNavigation.props.className).toContain(
      "merchant-sidebar-nav--static",
    );
    expect(collapsedNavigation.props.className).not.toContain("st-scroll");

    fireEvent(collapsedNavigation, "layout", {
      nativeEvent: { layout: { height: 500 } },
    });
    fireEvent(collapsedNavigation, "contentSizeChange", 0, 400);
    fireEvent.press(screen.getByLabelText("Catalog"));
    const fittingNavigation = screen.getByLabelText("Merchant sections");

    expect(fittingNavigation.props.scrollEnabled).toBe(false);
    expect(fittingNavigation.props.className).toContain(
      "merchant-sidebar-nav--static",
    );

    fireEvent(fittingNavigation, "contentSizeChange", 0, 650);
    const overflowingNavigation = screen.getByLabelText("Merchant sections");

    expect(overflowingNavigation.props.scrollEnabled).toBe(true);
    expect(overflowingNavigation.props.showsVerticalScrollIndicator).toBe(true);
    expect(overflowingNavigation.props.className).toContain(
      "merchant-sidebar-nav--scrollable",
    );
    expect(overflowingNavigation.props.className).toContain("st-scroll");
  });

  it("starts with Catalog and Inventory collapsed and no scroll affordance", () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const navigation = screen.getByLabelText("Merchant sections");

    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(false);
    expect(
      screen.getByLabelText("Inventory").props.accessibilityState.expanded,
    ).toBe(false);
    expect(screen.queryByLabelText("Products")).toBeNull();
    expect(screen.queryByLabelText("Stock Levels")).toBeNull();
    expect(navigation.props.scrollEnabled).toBe(false);
    expect(navigation.props.showsVerticalScrollIndicator).toBe(false);
  });

  it("carries no trailing nav padding that would fake an overflow", () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const content = StyleSheet.flatten(
      screen.getByLabelText("Merchant sections").props.contentContainerStyle,
    );

    // Row height plus the utility region's border and top padding already
    // separate the last row; extra spacing here is pure scroll range.
    expect(content.paddingBottom).toBeUndefined();
    expect(content.gap).toBeUndefined();
  });

  it("scrolls only past the point where content exceeds the viewport", () => {
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={ownerSession}
      />,
    );
    const measure = (contentHeight: number) => {
      const navigation = screen.getByLabelText("Merchant sections");
      fireEvent(navigation, "layout", {
        nativeEvent: { layout: { height: 500 } },
      });
      fireEvent(navigation, "contentSizeChange", 0, contentHeight);
      return screen.getByLabelText("Merchant sections").props.scrollEnabled;
    };

    expect(measure(500)).toBe(false);
    expect(measure(501)).toBe(false);
    expect(measure(560)).toBe(true);
    // Collapsing back below the viewport must retire the scrollbar again.
    expect(measure(500)).toBe(false);
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

  it("hides destinations that the backend-resolved role cannot read", () => {
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
    expect(screen.queryByLabelText("Inventory")).toBeNull();
    expect(screen.queryByLabelText("Orders")).toBeNull();
    expect(screen.getByLabelText("Catalog")).toBeTruthy();
  });

  it("renders distinct loading, partial, refreshing, and chart-empty states", () => {
    const loading = render(<DashboardLoadingState />);
    expect(loading.getByTestId("dashboard-state-loading")).toBeTruthy();
    expect(loading.queryByText("No sales data for this range yet")).toBeNull();
    loading.unmount();

    const partial = render(
      <DashboardStateBanner
        failedSections={["sales", "activity"]}
        state="partial"
      />,
    );
    expect(
      partial.getByText("Some dashboard information couldn’t be loaded"),
    ).toBeTruthy();
    partial.unmount();

    const refreshing = render(<DashboardStateBanner state="refreshing" />);
    expect(refreshing.getByText("Refreshing your dashboard")).toBeTruthy();
    refreshing.unmount();

    const salesEmpty = render(<SalesPerformance empty />);
    expect(
      salesEmpty.getByText("No sales data for this range yet"),
    ).toBeTruthy();
    expect(salesEmpty.queryByTestId("chart-series-revenue")).toBeNull();
  });

  it("names the sections that could not be loaded and offers a retry", () => {
    const onRetry = jest.fn();
    const screen = render(
      <DashboardStateBanner
        failedSections={["sales", "activity"]}
        onRetry={onRetry}
        state="partial"
      />,
    );

    expect(
      screen.getByText(
        "Sales performance and Recent activity could not be loaded right now. Everything else below is up to date, and orders and inventory actions still work normally.",
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps working sections and replaces only the failed ones", () => {
    const screen = render(
      <DashboardOverviewContent
        compactOrders={false}
        failedSections={["sales"]}
        hasSalesHistory
        mobile={false}
        paired
        session={ownerSession}
        state="partial"
      />,
    );

    expect(
      screen.getByTestId("dashboard-section-unavailable-sales"),
    ).toBeTruthy();
    expect(screen.queryByTestId("dashboard-sales-chart")).toBeNull();
    // Unaffected regions keep rendering real data.
    expect(screen.getByText("₱486.3K")).toBeTruthy();
  });

  it("shows the sales empty state without inventing chart points", () => {
    const screen = render(
      <DashboardOverviewContent
        compactOrders={false}
        hasSalesHistory={false}
        mobile={false}
        paired
        session={ownerSession}
        state="ready"
      />,
    );

    expect(screen.getByText("No sales data for this range yet")).toBeTruthy();
    expect(screen.queryByTestId("chart-series-revenue")).toBeNull();
  });

  it("disables selling navigation while the merchant is inactive", () => {
    const inactiveSession: MerchantSession = {
      ...ownerSession,
      storeStatus: "inactive",
    };
    const screen = render(
      <MerchantSidebar
        onToggleRail={jest.fn()}
        rail={false}
        session={inactiveSession}
      />,
    );

    expect(
      screen.getByLabelText("Orders").props.accessibilityState.disabled,
    ).toBe(true);
    expect(screen.getByLabelText("Orders").props.accessibilityHint).toBe(
      "Selling is paused for this merchant, so this section is unavailable",
    );
    // Account and profile work stays reachable.
    expect(
      screen.getByLabelText("Merchant Profile").props.accessibilityState
        .disabled,
    ).toBe(false);
    expect(
      screen.getByLabelText("Settings").props.accessibilityState.disabled,
    ).toBe(false);
  });

  it("renders safe recovery actions for restricted and inactive states", () => {
    const denied = render(
      <DashboardBlockingState
        deniedSection="Staff & Permissions"
        requiredPermission="staff.manage"
        session={ownerSession}
        state="permission-denied"
      />,
    );

    expect(
      denied.getByText("You don’t have permission to view this section."),
    ).toBeTruthy();
    expect(denied.getByText("Return to Overview")).toBeTruthy();
    denied.unmount();

    const inactive = render(
      <DashboardBlockingState session={ownerSession} state="inactive" />,
    );
    expect(inactive.getByText("Contact Support")).toBeTruthy();
    expect(inactive.getByText("Review Merchant Profile")).toBeTruthy();
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

    fireEvent.press(screen.getByLabelText("Catalog"));
    const navigation = screen.getByLabelText("Merchant sections");
    fireEvent(navigation, "layout", {
      nativeEvent: { layout: { height: 300 } },
    });
    fireEvent(navigation, "contentSizeChange", 0, 600);

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
