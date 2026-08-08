import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { SALES_SERIES } from "@/features/merchant-dashboard/sales-chart-model";

import { salesSeries } from "@/features/merchant-dashboard/dashboard-data";
import { loadDashboardSnapshot } from "@/features/merchant-dashboard/dashboard-data-source";
import { niceAxis } from "@/features/merchant-dashboard/dashboard-line-chart";
import { SalesPerformance } from "@/features/merchant-dashboard/dashboard-overview-sections";
import {
  plotHeightFor,
  salesChartSummary,
  salesTotals,
} from "@/features/merchant-dashboard/sales-chart-model";
import {
  axisWidthsFor,
  labelStrideFor,
} from "@/features/merchant-dashboard/sales-performance-chart";
import type {
  DashboardSectionLoaders,
  DashboardSnapshot,
} from "@/features/merchant-dashboard/dashboard-data-source";
import type { SalesPoint } from "@/features/merchant-dashboard/dashboard-types";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const layout = (screen: ReturnType<typeof render>, width: number) =>
  fireEvent(screen.getByTestId("dashboard-sales-chart"), "layout", {
    nativeEvent: { layout: { width } },
  });

describe("sales chart axes", () => {
  it("derives readable ticks that cover the data", () => {
    // Daily revenue peaks at ₱83,975, so the axis has to reach ₱100,000.
    expect(niceAxis(8_397_500)).toEqual({
      maximum: 10_000_000,
      ticks: [0, 2_500_000, 5_000_000, 7_500_000, 10_000_000],
    });
    expect(niceAxis(53)).toEqual({ maximum: 60, ticks: [0, 15, 30, 45, 60] });
  });

  it("grows the axis instead of clipping when the data grows", () => {
    const weekly = niceAxis(312);
    const monthly = niceAxis(1_355);

    expect(weekly.maximum).toBeGreaterThanOrEqual(312);
    expect(monthly.maximum).toBeGreaterThanOrEqual(1_355);
  });

  it("stays finite for zero, empty, and unusable maxima", () => {
    for (const input of [0, Number.NaN, Number.POSITIVE_INFINITY, -50]) {
      const axis = niceAxis(input);
      expect(axis.maximum).toBeGreaterThan(0);
      expect(axis.ticks.every(Number.isFinite)).toBe(true);
    }
  });
});

describe("sales chart totals", () => {
  it("sums the plotted points rather than reusing a fixed figure", () => {
    const totals = salesTotals(salesSeries.daily);

    expect(totals.revenue).toBe(
      salesSeries.daily.reduce((sum, point) => sum + point.revenue, 0),
    );
    expect(totals.orders).toBe(293);
    expect(totals.peak?.label).toBe("Jul 31");
  });

  it("reports zeroes for an empty series without inventing a peak", () => {
    expect(salesTotals([])).toEqual({
      orders: 0,
      peak: null,
      refunds: 0,
      revenue: 0,
    });
  });

  it("names the range, granularity, totals, and peak for screen readers", () => {
    const summary = salesChartSummary({
      cadence: "daily",
      points: salesSeries.daily,
      rangeLabel: "Last 7 days",
      totals: salesTotals(salesSeries.daily),
    });

    expect(summary).toContain("Last 7 days");
    expect(summary).toContain("daily intervals");
    expect(summary).toContain("293 orders");
    expect(summary).toContain("Jul 31");
    expect(summary).not.toContain("undefined");
  });
});

describe("sales chart responsiveness", () => {
  it("gives the plot more height as the card gets wider", () => {
    expect(plotHeightFor(360)).toBe(260);
    expect(plotHeightFor(600)).toBe(300);
    expect(plotHeightFor(980)).toBe(330);
    expect(plotHeightFor(360)).toBeLessThan(plotHeightFor(980));
  });

  it("thins x labels only when they would not fit", () => {
    expect(labelStrideFor(640, 7)).toBe(1);
    expect(labelStrideFor(240, 30)).toBeGreaterThan(1);
    expect(labelStrideFor(0, 7)).toBe(1);
  });

  it("tightens the axis gutters before squeezing the plot", () => {
    const narrow = axisWidthsFor(232);
    const wide = axisWidthsFor(1190);

    expect(narrow.money).toBeLessThan(wide.money);
    expect(narrow.count).toBeLessThan(wide.count);
    // A 272px card must still leave the plot the majority of its width.
    expect(232 - narrow.money - narrow.count).toBeGreaterThan(116);
  });
});

describe("SalesPerformance", () => {
  it("plots every series and totals them from the data", () => {
    const screen = render(<SalesPerformance salesSeries={salesSeries} />);
    layout(screen, 720);

    expect(screen.getByTestId("chart-series-revenue")).toBeTruthy();
    expect(screen.getByTestId("chart-series-revenue-area")).toBeTruthy();
    expect(screen.getByTestId("chart-series-orders")).toBeTruthy();
    expect(screen.getByTestId("chart-series-refunds")).toBeTruthy();
    // ₱484,275 total, formatted without centavos.
    expect(screen.getByText("₱484,275")).toBeTruthy();
    expect(screen.getByText("293")).toBeTruthy();
  });

  it("switches to a different dataset per granularity", () => {
    const screen = render(<SalesPerformance salesSeries={salesSeries} />);
    layout(screen, 720);
    expect(screen.getByText("Jul 25")).toBeTruthy();

    fireEvent.press(screen.getByText("Monthly"));
    layout(screen, 720);

    // Monthly is its own series, not the daily points with a new caption.
    expect(screen.queryByText("Jul 25")).toBeNull();
    expect(screen.getByText("Feb")).toBeTruthy();
    expect(screen.getByText("Last 7 days · monthly view")).toBeTruthy();
  });

  it("keys every series with a round dot, including dashed refunds", () => {
    const screen = render(<SalesPerformance salesSeries={salesSeries} />);

    for (const series of SALES_SERIES) {
      const swatch = screen.getByTestId(`sales-legend-swatch-${series.id}`);
      const style = StyleSheet.flatten(swatch.props.style);

      // Square box plus a pill radius is a circle; a line sample would be
      // wider than it is tall and would not carry a background colour.
      expect(style.width).toBe(style.height);
      expect(style.borderRadius).toBeGreaterThanOrEqual(style.width / 2);
      expect(style.backgroundColor).toBe(series.color);
      expect(style.borderTopWidth).toBeUndefined();
    }
  });

  it("names the selected range instead of a fixed caption", () => {
    const screen = render(
      <SalesPerformance dateRange="90d" salesSeries={salesSeries} />,
    );

    expect(screen.getByText("Last 90 days · daily view")).toBeTruthy();
  });

  it("shows the empty state rather than plotting an empty series", () => {
    const screen = render(
      <SalesPerformance
        salesSeries={{ daily: [], monthly: [], weekly: [] }}
      />,
    );

    expect(screen.getByText("No sales data for this range yet")).toBeTruthy();
    expect(screen.queryByTestId("chart-series-revenue")).toBeNull();
  });

  it("opens a tooltip with formatted values for the pressed interval", () => {
    const screen = render(<SalesPerformance salesSeries={salesSeries} />);
    layout(screen, 720);

    fireEvent.press(
      screen.getByLabelText(
        "Jul 29: revenue ₱68,400.00, 42 orders, refunds ₱1,670.00",
      ),
    );

    expect(screen.getByText("₱68,400.00")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("₱1,670.00")).toBeTruthy();
  });

  it("renders partial analytics rows without crashing or showing undefined", () => {
    const partial = [
      { label: "Aug 1", orders: 4, refunds: 0, revenue: 120_000 },
      { label: "Aug 2" },
      { label: "Aug 3", orders: 9, refunds: 5_000, revenue: 310_000 },
    ] as unknown as SalesPoint[];
    const screen = render(
      <SalesPerformance
        salesSeries={{ daily: partial, monthly: [], weekly: [] }}
      />,
    );
    layout(screen, 720);

    expect(screen.getByTestId("chart-series-revenue")).toBeTruthy();
    expect(screen.queryByText(/undefined|NaN/)).toBeNull();
  });
});

describe("sales analytics contract", () => {
  it("normalizes a malformed sales payload into a usable series", async () => {
    const loaders = {
      activity: async () => [],
      catalog: async () => [{ id: "p1" }],
      inventory: async () => [],
      metrics: async () => [],
      orders: async () => ({ pipelineStages: [] }),
      sales: async () => ({
        daily: [
          { label: "Aug 1", orders: "4", refunds: null, revenue: 120_000 },
          "not-a-point",
        ],
      }),
    } as unknown as DashboardSectionLoaders;

    const { snapshot } = await loadDashboardSnapshot(loaders);
    const point = snapshot.salesSeries.daily[0];

    expect(snapshot.salesSeries.daily).toHaveLength(1);
    expect(point).toEqual({
      label: "Aug 1",
      orders: 0,
      refunds: 0,
      revenue: 120_000,
    });
    expect(snapshot.salesSeries.weekly).toEqual([]);
    expect(snapshot.hasSalesHistory).toBe(true);
  });

  it("reports no sales history when every cadence is empty", async () => {
    const loaders = {
      activity: async () => [],
      catalog: async () => [],
      inventory: async () => [],
      metrics: async () => [],
      orders: async () => ({ pipelineStages: [] }),
      sales: async () => ({}),
    } as unknown as DashboardSectionLoaders;

    const { snapshot }: { snapshot: DashboardSnapshot } =
      await loadDashboardSnapshot(loaders);

    expect(snapshot.hasSalesHistory).toBe(false);
    expect(snapshot.salesSeries.daily).toEqual([]);
  });
});
