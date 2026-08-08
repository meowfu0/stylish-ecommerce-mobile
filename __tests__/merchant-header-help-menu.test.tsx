import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type {
  DashboardNotification,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  badgeCount,
  MerchantHeader,
  notificationLabel,
} from "@/features/merchant-dashboard/merchant-header";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

// Renders a host node carrying the glyph size, so the tests can compare what
// the bell and the Help control actually draw.
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ name, size }: { name: string; size: number }) =>
    require("react").createElement("Icon", { size, testID: `icon-${name}` }),
}));

// The header hides controls by width, so these tests drive the viewport rather
// than inheriting the preset's phone-sized default. `mock`-prefixed so jest
// allows the factory to close over it.
let mockWidth = 1440;
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ fontScale: 1, height: 900, scale: 2, width: mockWidth }),
}));

const session: MerchantSession = {
  defaultLocation: "Makati Warehouse",
  displayName: "vinceee",
  email: "vinceee@postmanfashion.ph",
  merchantHandle: "merchant:m1",
  merchantId: "m1",
  merchantName: "Postman Fashion",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

const notifications: DashboardNotification[] = [
  { key: "a", message: "One", time: "now", unread: true },
  { key: "b", message: "Two", time: "earlier", unread: true },
  { key: "c", message: "Three", time: "yesterday", unread: false },
];

function renderHeader(width = 1440) {
  mockWidth = width;
  return render(
    <MerchantHeader
      dateRange="7d"
      notifications={notifications}
      onDateRangeChange={jest.fn()}
      onOpenNavigation={jest.fn()}
      onOpenNotifications={jest.fn()}
      session={session}
    />,
  );
}

afterEach(() => {
  mockWidth = 1440;
});

describe("bell and help as a matched pair", () => {
  it("gives both controls the same 46x46 box", () => {
    const screen = renderHeader();
    const bell = StyleSheet.flatten(
      screen.getByTestId("header-notifications").props.style,
    );
    const help = StyleSheet.flatten(
      screen.getByTestId("header-help").props.style,
    );

    expect(bell.height).toBe(help.height);
    expect(bell.width).toBe(help.width);
    // The doc's floor, and the app's own touch-target rule.
    expect(bell.height).toBeGreaterThanOrEqual(44);
    expect(bell.width).toBeGreaterThanOrEqual(44);
  });

  it("centres the glyph in both", () => {
    const screen = renderHeader();

    [
      screen.getByTestId("header-notifications"),
      screen.getByTestId("header-help"),
    ].forEach((control) => {
      const style = StyleSheet.flatten(control.props.style);
      expect(style.alignItems).toBe("center");
      expect(style.justifyContent).toBe("center");
    });
  });

  it("draws both glyphs at the same size", () => {
    const screen = renderHeader();

    // The bell and the question mark are a matched pair in the design, so one
    // glyph size — no per-icon fudging that reads as one being smaller.
    // The icons are hidden from the accessibility tree by design, so the
    // query has to opt in to reach them.
    const glyph = (name: string) =>
      screen.getByTestId(name, { includeHiddenElements: true }).props.size;

    expect(glyph("icon-bell-outline")).toBe(glyph("icon-help-circle-outline"));
  });

  it("centres both slots on the row rather than letting them stretch", () => {
    const screen = renderHeader();

    [
      screen.getByTestId("header-notifications-slot"),
      screen.getByTestId("header-help-slot"),
    ].forEach((slot) => {
      const style = StyleSheet.flatten(slot.props.style);
      expect(style.alignSelf).toBe("center");
      expect(style.height).toBe(style.width);
    });
  });

  it("spaces every topbar action by the same step", () => {
    const screen = renderHeader();
    const row = StyleSheet.flatten(
      screen.getByTestId("merchant-header-row").props.style,
    );

    expect(row.gap).toBeGreaterThan(0);
    expect(row.alignItems).toBe("center");
  });

  it("keeps the badge out of the layout flow so the box cannot widen", () => {
    const screen = renderHeader();
    const badge = StyleSheet.flatten(
      screen.getByTestId("header-notifications-badge").props.style,
    );

    expect(badge.position).toBe("absolute");
    // Inside the 46px button, so it is never clipped by the header row.
    expect(badge.top).toBeGreaterThan(0);
    expect(badge.right).toBeGreaterThan(0);
    expect(badge.top + badge.height).toBeLessThanOrEqual(46);
  });

  it("derives the badge from unread items and caps it at 9+", () => {
    const screen = renderHeader();

    expect(screen.getByTestId("header-notifications-badge")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(badgeCount(9)).toBe("9");
    expect(badgeCount(10)).toBe("9+");
    expect(badgeCount(240)).toBe("9+");
  });

  it("labels the unread count as a sentence", () => {
    expect(notificationLabel(0)).toBe("Notifications, none unread");
    expect(notificationLabel(1)).toBe("Notifications, 1 unread");
    expect(renderHeader().getByLabelText(notificationLabel(2))).toBeTruthy();
  });
});

describe("help menu", () => {
  it("is labelled for assistive technology and reports its state", () => {
    const screen = renderHeader();
    const help = screen.getByTestId("header-help");

    expect(help.props.accessibilityRole).toBe("button");
    expect(help.props.accessibilityLabel).toBe("Open help menu");
    expect(help.props.accessibilityState.expanded).toBe(false);
  });

  it("opens on press and closes on a second press", () => {
    const screen = renderHeader();

    fireEvent.press(screen.getByTestId("header-help"));
    expect(screen.getByTestId("header-help-menu")).toBeTruthy();
    expect(
      screen.getByTestId("header-help").props.accessibilityState.expanded,
    ).toBe(true);

    fireEvent.press(screen.getByTestId("header-help"));
    expect(screen.queryByTestId("header-help-menu")).toBeNull();
  });

  it("offers every destination the design asks for", () => {
    const screen = renderHeader();
    fireEvent.press(screen.getByTestId("header-help"));

    [
      "Help Center",
      "Getting Started",
      "Orders & Fulfillment Help",
      "Catalog & Inventory Help",
      "Contact Support",
    ].forEach((label) => expect(screen.getByText(label)).toBeTruthy());
  });

  it("opens the shared Help & Support dialog rather than a second one", () => {
    const screen = renderHeader();

    fireEvent.press(screen.getByTestId("header-help"));
    fireEvent.press(screen.getByText("Orders & Fulfillment Help"));

    expect(screen.getByTestId("help-support")).toBeTruthy();
    // The menu gets out of the way once it has done its job.
    expect(screen.queryByTestId("header-help-menu")).toBeNull();
  });

  it("lands on the subject the entry named", () => {
    const screen = renderHeader();

    fireEvent.press(screen.getByTestId("header-help"));
    fireEvent.press(screen.getByText("Catalog & Inventory Help"));

    // The catalog section's first question opens, so the dialog is not a wall
    // of collapsed rows the merchant has to hunt through.
    expect(screen.getByTestId("help-answer-adjust")).toBeTruthy();
  });

  it("puts the contact channels first for Contact Support", () => {
    const screen = renderHeader();

    fireEvent.press(screen.getByTestId("header-help"));
    fireEvent.press(screen.getByText("Contact Support"));

    expect(screen.getByTestId("help-support-contact")).toBeTruthy();
    // Rendered once, wherever it sits.
    expect(screen.getAllByTestId("help-support-contact")).toHaveLength(1);
  });
});

describe("responsive header controls", () => {
  it("keeps the pair together from tablet upward", () => {
    [768, 1024, 1440].forEach((width) => {
      const screen = renderHeader(width);

      expect(screen.getByTestId("header-notifications")).toBeTruthy();
      expect(screen.getByTestId("header-help")).toBeTruthy();
      screen.unmount();
    });
  });

  it("drops Help on a phone, where the drawer carries it instead", () => {
    const screen = renderHeader(390);

    // The bell and the profile trigger still fit; a fifth control would not.
    expect(screen.getByTestId("header-notifications")).toBeTruthy();
    expect(screen.getByTestId("header-account")).toBeTruthy();
    expect(screen.queryByTestId("header-help")).toBeNull();
  });

  it("keeps the bell the same size at every width", () => {
    const sizes = [390, 768, 1440].map((width) => {
      const screen = renderHeader(width);
      const style = StyleSheet.flatten(
        screen.getByTestId("header-notifications").props.style,
      );
      screen.unmount();
      return `${style.width}x${style.height}`;
    });

    expect(new Set(sizes).size).toBe(1);
  });
});

describe("only one header popover at a time", () => {
  it("closes Notifications when Help opens", () => {
    const screen = renderHeader();

    fireEvent.press(screen.getByTestId("header-notifications"));
    expect(screen.getByTestId("header-notifications-menu")).toBeTruthy();

    fireEvent.press(screen.getByTestId("header-help"));
    expect(screen.queryByTestId("header-notifications-menu")).toBeNull();
    expect(screen.getByTestId("header-help-menu")).toBeTruthy();
  });

  it("closes Help when Notifications opens", () => {
    const screen = renderHeader();

    fireEvent.press(screen.getByTestId("header-help"));
    expect(screen.getByTestId("header-help-menu")).toBeTruthy();

    fireEvent.press(screen.getByTestId("header-notifications"));
    expect(screen.queryByTestId("header-help-menu")).toBeNull();
    expect(screen.getByTestId("header-notifications-menu")).toBeTruthy();
  });

  it("closes whichever popover is open when the date menu opens", () => {
    const screen = renderHeader();

    fireEvent.press(screen.getByTestId("header-help"));
    fireEvent.press(screen.getByTestId("header-date-range"));

    expect(screen.queryByTestId("header-help-menu")).toBeNull();
    expect(screen.getByTestId("header-date-range-menu")).toBeTruthy();
  });

  it("closes whichever popover is open when the account menu opens", () => {
    const screen = renderHeader();

    fireEvent.press(screen.getByTestId("header-notifications"));
    fireEvent.press(screen.getByTestId("header-account"));

    expect(screen.queryByTestId("header-notifications-menu")).toBeNull();
    expect(screen.getByTestId("header-account-menu")).toBeTruthy();
  });

  it("never reports two triggers as expanded", () => {
    const screen = renderHeader();
    fireEvent.press(screen.getByTestId("header-help"));

    const expanded = [
      "header-help",
      "header-notifications",
      "header-date-range",
      "header-account",
    ].filter(
      (testID) =>
        screen.getByTestId(testID).props.accessibilityState?.expanded === true,
    );

    expect(expanded).toEqual(["header-help"]);
  });
});
