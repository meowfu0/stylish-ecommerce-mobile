import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/constants/design-tokens";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { dashboardNotifications } from "@/features/merchant-dashboard/dashboard-data";
import {
  MerchantHeader,
  notificationLabel,
} from "@/features/merchant-dashboard/merchant-header";
import type {
  DashboardNotification,
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
  displayName: "Vince",
  email: "owner@example.com",
  merchantHandle: "lumiere",
  merchantName: "Lumière",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

const renderHeader = (
  notifications?: readonly DashboardNotification[],
  onOpenNotifications = jest.fn(),
) => ({
  onOpenNotifications,
  screen: render(
    <MerchantHeader
      dateRange="7d"
      notifications={notifications}
      onDateRangeChange={jest.fn()}
      onOpenNavigation={jest.fn()}
      onOpenNotifications={onOpenNotifications}
      session={session}
    />,
  ),
});

describe("header notifications dropdown", () => {
  it("stays closed until the bell is pressed", () => {
    const { screen } = renderHeader();

    expect(screen.queryByTestId("header-notifications-menu")).toBeNull();
    expect(
      screen.getByTestId("header-notifications").props.accessibilityState
        .expanded,
    ).toBe(false);
  });

  it("opens with the heading, unread count, and every row", () => {
    const { screen } = renderHeader();
    fireEvent.press(screen.getByTestId("header-notifications"));

    expect(screen.getByTestId("header-notifications-menu")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("3 unread")).toBeTruthy();
    for (const item of dashboardNotifications) {
      expect(screen.getByText(item.message)).toBeTruthy();
    }
  });

  it("closes on a second press of the bell", () => {
    const { screen } = renderHeader();
    fireEvent.press(screen.getByTestId("header-notifications"));
    fireEvent.press(screen.getByTestId("header-notifications"));

    expect(screen.queryByTestId("header-notifications-menu")).toBeNull();
  });

  it("closes when the backdrop is pressed", () => {
    const { screen } = renderHeader();
    fireEvent.press(screen.getByTestId("header-notifications"));

    fireEvent.press(screen.getByLabelText("Close menu"));
    expect(screen.queryByTestId("header-notifications-menu")).toBeNull();
  });

  it("marks unread rows with the brand dot and an Unread label", () => {
    const { screen } = renderHeader();
    fireEvent.press(screen.getByTestId("header-notifications"));

    const unreadDot = StyleSheet.flatten(
      screen.getByTestId("notification-dot-fulfillment").props.style,
    );
    const readDot = StyleSheet.flatten(
      screen.getByTestId("notification-dot-publication").props.style,
    );

    expect(unreadDot.backgroundColor).toBe(colors.brand.primary);
    expect(readDot.backgroundColor).not.toBe(colors.brand.primary);
    expect(screen.getByText("10 minutes ago · Unread")).toBeTruthy();
    // A read row shows its time without the Unread suffix.
    expect(screen.getByText("Yesterday")).toBeTruthy();
  });

  it("derives the badge and heading from the same data", () => {
    const { screen } = renderHeader([
      { key: "a", message: "One", time: "now", unread: true },
      { key: "b", message: "Two", time: "earlier", unread: false },
    ]);

    expect(screen.getByLabelText(notificationLabel(1))).toBeTruthy();
    fireEvent.press(screen.getByTestId("header-notifications"));
    expect(screen.getByText("1 unread")).toBeTruthy();
  });

  it("reports an empty inbox without inventing rows", () => {
    const { screen } = renderHeader([]);
    fireEvent.press(screen.getByTestId("header-notifications"));

    expect(screen.getByText("0 unread")).toBeTruthy();
    expect(screen.getByText("You're all caught up.")).toBeTruthy();
  });

  it("hands off to the existing notification surface", () => {
    const onOpenNotifications = jest.fn();
    const { screen } = renderHeader(undefined, onOpenNotifications);
    fireEvent.press(screen.getByTestId("header-notifications"));
    fireEvent.press(screen.getByTestId("notifications-see-all"));

    expect(onOpenNotifications).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("header-notifications-menu")).toBeNull();
  });
});
