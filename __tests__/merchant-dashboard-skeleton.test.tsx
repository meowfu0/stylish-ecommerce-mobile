import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { spacing } from "@/constants/design-tokens";
import { resolveGridColumns } from "@/features/merchant-dashboard/dashboard-grid";
import {
  metricGridGap,
  metricMinCardWidth,
} from "@/features/merchant-dashboard/dashboard-overview-sections";
import { DashboardLoadingState } from "@/features/merchant-dashboard/dashboard-states";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const layout = (screen: ReturnType<typeof render>, width: number) =>
  fireEvent(screen.getByTestId("dashboard-skeleton-metrics"), "layout", {
    nativeEvent: { layout: { width } },
  });

const cardCount = (screen: ReturnType<typeof render>) =>
  (screen.getByTestId("dashboard-skeleton-metrics").props.children as unknown[])
    .length;

describe("DashboardLoadingState", () => {
  it("announces itself as busy for assistive technology", () => {
    const screen = render(<DashboardLoadingState />);
    const root = screen.getByTestId("dashboard-state-loading");

    expect(root.props.accessibilityState.busy).toBe(true);
    expect(root.props.accessibilityLabel).toBe(
      "Loading your merchant dashboard.",
    );
  });

  it("lays placeholders on the real metric grid, not its own", () => {
    const screen = render(<DashboardLoadingState />);
    layout(screen, 1192);

    // Same hook, gap and minimum width the loaded MetricsSection uses, so the
    // column count can never diverge between the two.
    const columns = resolveGridColumns({
      count: 4,
      gap: metricGridGap,
      minItemWidth: metricMinCardWidth,
      rowWidth: 1192,
    });
    expect(columns).toBe(4);
    expect(cardCount(screen)).toBe(4);
  });

  it("drops to fewer columns exactly where the real grid does", () => {
    // Four cards balance across rows rather than leaving an orphan, so a width
    // that fits three still lays out 2 + 2.
    for (const [rowWidth, expected] of [
      [1192, 4],
      [786, 2],
      [520, 2],
      [318, 1],
    ] as const) {
      expect(
        resolveGridColumns({
          count: 4,
          gap: metricGridGap,
          minItemWidth: metricMinCardWidth,
          rowWidth,
        }),
      ).toBe(expected);
    }
  });

  it("uses the content column's own gap so sections do not shift", () => {
    const screen = render(<DashboardLoadingState />);
    const style = StyleSheet.flatten(
      screen.getByTestId("dashboard-state-loading").props.style,
    );

    // `contentColumn` in dashboard-overview-content uses a 20px gap.
    expect(style.gap).toBe(20);
  });

  it("keeps the metric row on the shared grid gap", () => {
    const screen = render(<DashboardLoadingState />);
    const style = StyleSheet.flatten(
      screen.getByTestId("dashboard-skeleton-metrics").props.style,
    );

    expect(style.gap).toBe(metricGridGap);
    expect(metricGridGap).toBe(spacing.sm);
  });
});
