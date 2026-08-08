import { fireEvent, render } from "@testing-library/react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { DATE_RANGE_LABELS } from "@/features/merchant-dashboard/dashboard-format";
import { MerchantHeader } from "@/features/merchant-dashboard/merchant-header";
import type {
  DateRange,
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
  dateRange: DateRange = "7d",
  onDateRangeChange = jest.fn(),
) => ({
  onDateRangeChange,
  screen: render(
    <MerchantHeader
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      onOpenNavigation={jest.fn()}
      onOpenNotifications={jest.fn()}
      session={session}
    />,
  ),
});

describe("header date range menu", () => {
  it("stays closed until the trigger is pressed", () => {
    const { screen } = renderHeader();

    expect(screen.queryByTestId("header-date-range-menu")).toBeNull();
    expect(
      screen.getByTestId("header-date-range").props.accessibilityState.expanded,
    ).toBe(false);
  });

  it("opens anchored to the trigger with every range", () => {
    const { screen } = renderHeader();
    fireEvent.press(screen.getByTestId("header-date-range"));

    expect(screen.getByTestId("header-date-range-menu")).toBeTruthy();
    for (const [range, label] of Object.entries(DATE_RANGE_LABELS)) {
      expect(screen.getByTestId(`menu-item-${range}`)).toBeTruthy();
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("marks only the current range as selected", () => {
    const { screen } = renderHeader("30d");
    fireEvent.press(screen.getByTestId("header-date-range"));

    expect(
      screen.getByTestId("menu-item-30d").props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId("menu-item-7d").props.accessibilityState.selected,
    ).toBe(false);
  });

  it("reports the selection to the dashboard and closes", () => {
    const onDateRangeChange = jest.fn();
    const { screen } = renderHeader("7d", onDateRangeChange);
    fireEvent.press(screen.getByTestId("header-date-range"));
    fireEvent.press(screen.getByTestId("menu-item-90d"));

    // The range lives in the dashboard, not the menu — it reports upward.
    expect(onDateRangeChange).toHaveBeenCalledWith("90d");
    expect(screen.queryByTestId("header-date-range-menu")).toBeNull();
  });

  it("closes when the backdrop is pressed", () => {
    const { screen } = renderHeader();
    fireEvent.press(screen.getByTestId("header-date-range"));

    fireEvent.press(screen.getByLabelText("Close menu"));
    expect(screen.queryByTestId("header-date-range-menu")).toBeNull();
  });

  it("labels the trigger with the range currently in effect", () => {
    const { screen } = renderHeader("mtd");

    expect(
      screen.getByLabelText(`Date range ${DATE_RANGE_LABELS.mtd}`),
    ).toBeTruthy();
  });
});
