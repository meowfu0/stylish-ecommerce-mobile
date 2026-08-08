import { fireEvent, render, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import {
  HEADER_ICON_SIZE,
  ICON_BUTTON_SIZE,
  MerchantHeader,
  MerchantHeaderSkeleton,
  notificationLabel,
} from "@/features/merchant-dashboard/merchant-header";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const session: MerchantSession = {
  defaultLocation: "Lumière Makati Warehouse",
  displayName: "Althea",
  email: "althea@example.com",
  merchantHandle: "lumiere",
  merchantName: "Lumière",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

describe("MerchantHeaderSkeleton", () => {
  it("shows placeholders without inventing user information", () => {
    const screen = render(<MerchantHeaderSkeleton />);

    expect(screen.getByTestId("merchant-header-skeleton")).toBeTruthy();
    // Nothing that could be mistaken for a real identity or figure.
    expect(screen.queryByText("Althea")).toBeNull();
    expect(screen.queryByText("Merchant Owner")).toBeNull();
    expect(screen.queryByText(/unread/i)).toBeNull();
  });

  it("carries no interactive controls while loading", () => {
    const screen = render(<MerchantHeaderSkeleton />);

    expect(screen.queryByTestId("header-notifications")).toBeNull();
    expect(screen.queryByTestId("header-date-range")).toBeNull();
  });
});

describe("notification bell sizing", () => {
  const bellStyles = () => {
    const screen = render(
      <MerchantHeader
        dateRange="7d"
        onDateRangeChange={jest.fn()}
        onOpenNavigation={jest.fn()}
        onOpenNotifications={jest.fn()}
        session={session}
      />,
    );
    const button = screen.getByTestId("header-notifications");
    return {
      button: StyleSheet.flatten(
        typeof button.props.style === "function"
          ? button.props.style({ pressed: false })
          : button.props.style,
      ),
      screen,
    };
  };

  it("gives the bell a square button large enough to sit with the other controls", () => {
    const { button } = bellStyles();

    expect(button.width).toBe(button.height);
    // Larger than the 44 it used to be, without becoming oversized.
    expect(button.height).toBeGreaterThanOrEqual(46);
    expect(button.height).toBeLessThanOrEqual(52);
  });

  it("sits on the bell's shoulder without swamping it", () => {
    const { screen } = bellStyles();
    const style = StyleSheet.flatten(
      screen.getByTestId("header-notifications-badge").props.style,
    );

    // The glyph is centred in the button, so these are its bounds.
    const glyphStart = (ICON_BUTTON_SIZE - HEADER_ICON_SIZE) / 2;
    const glyphEnd = glyphStart + HEADER_ICON_SIZE;
    const badgeLeft = ICON_BUTTON_SIZE - style.right - style.height;
    const badgeBottom = style.top + style.height;

    expect(style.borderStyle).toBe("solid");
    // Small relative to the bell rather than a frozen pixel count.
    expect(style.height).toBeLessThan(HEADER_ICON_SIZE);
    // Wholly inside the button, so the header row can never clip it and the
    // button cannot widen away from the Help control.
    expect(style.top).toBeGreaterThan(0);
    expect(badgeBottom).toBeLessThanOrEqual(ICON_BUTTON_SIZE);
    // Against the glyph's top-right corner, not floating out in the padding.
    expect(badgeLeft).toBeLessThan(glyphEnd);
    expect(badgeBottom).toBeGreaterThan(glyphStart);
  });

  it("still opens the notification dropdown", () => {
    const { screen } = bellStyles();

    expect(
      screen.getByTestId("header-notifications").props.accessibilityState
        .expanded,
    ).toBe(false);
    expect(screen.getByLabelText(notificationLabel(3))).toBeTruthy();
  });
});

describe("account dropdown", () => {
  const openAccountMenu = () => {
    const screen = render(
      <MerchantHeader
        dateRange="7d"
        onDateRangeChange={jest.fn()}
        onOpenNavigation={jest.fn()}
        onOpenNotifications={jest.fn()}
        session={session}
      />,
    );
    fireEvent.press(screen.getByTestId("header-account"));
    return screen;
  };

  it("offers exactly the four options the approved design lists", () => {
    const screen = openAccountMenu();

    expect(screen.getByTestId("menu-item-account-profile")).toBeTruthy();
    expect(screen.getByTestId("menu-item-switch-workspace")).toBeTruthy();
    expect(screen.getByTestId("menu-item-view-storefront")).toBeTruthy();
    expect(screen.getByTestId("menu-item-sign-out")).toBeTruthy();
  });

  it("carries no profile summary: no name, email or role inside the menu", () => {
    const screen = openAccountMenu();
    const menu = screen.getByTestId("header-account-menu");

    // The trigger beside it already shows these; repeating them is what the
    // design removed.
    expect(within(menu).queryByText(session.email)).toBeNull();
    expect(within(menu).queryByText(session.displayName)).toBeNull();
    expect(within(menu).queryByText(session.role)).toBeNull();
  });

  it("toggles closed when the avatar is pressed again", () => {
    const screen = openAccountMenu();
    const trigger = screen.getByTestId("header-account");

    expect(trigger.props.accessibilityState.expanded).toBe(true);
    fireEvent.press(trigger);
    expect(
      screen.getByTestId("header-account").props.accessibilityState.expanded,
    ).toBe(false);
  });

  it("uses the shared anchored menu rather than a second dropdown system", () => {
    const screen = openAccountMenu();

    // DashboardMenu owns the dismissing backdrop, so this is what proves the
    // account menu is not a bespoke popover any more.
    expect(screen.getByLabelText("Close menu")).toBeTruthy();
    expect(
      screen.getByLabelText(`Account options for ${session.displayName}`),
    ).toBeTruthy();
  });

  it("keeps Sign out in the same treatment as the other rows", () => {
    const screen = openAccountMenu();
    const labels = ["account-profile", "switch-workspace", "sign-out"].map(
      (key) =>
        StyleSheet.flatten(
          within(screen.getByTestId(`menu-item-${key}`)).getByTestId(
            "stylish-type-caption",
          ).props.style,
        ).color,
    );

    // The reference gives Sign out no danger colour of its own.
    expect(new Set(labels).size).toBe(1);
  });
});
