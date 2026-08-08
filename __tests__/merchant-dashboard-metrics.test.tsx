import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import {
  buildMonotoneLinePoints,
  chartDomain,
  monotoneTangents,
  projectValue,
  toChartSegments,
} from "@/features/merchant-dashboard/dashboard-line-chart";
import { resolveGridColumns } from "@/features/merchant-dashboard/dashboard-grid";
import { MetricsSection } from "@/features/merchant-dashboard/dashboard-overview-sections";
import type { Metric } from "@/features/merchant-dashboard/dashboard-types";

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const centavoMetric: Metric = {
  changePercent: 12.4,
  comparison: "₱1,000 vs previous 7 days",
  key: "gross-sales",
  label: "Gross sales",
  // Deliberately in raw centavos: the trend must project from the data range,
  // not from a scale factor tuned to the design fixture.
  sparkline: [4200000, 4800000, 3900000, 5500000, 5100000, 6700000, 7200000],
  value: "₱72,000",
  valueCentavos: 7200000,
};

const countMetric: Metric = {
  changePercent: -2.3,
  comparison: "12 vs previous 7 days",
  key: "orders",
  label: "Orders",
  sparkline: [8, 7, 9, 6, 5, 4, 3],
  value: "3",
};

function layoutSparkline(
  screen: ReturnType<typeof render>,
  key: string,
  size: { height: number; width: number },
) {
  fireEvent(screen.getByTestId(`metric-sparkline-${key}`), "layout", {
    nativeEvent: { layout: { ...size, x: 0, y: 0 } },
  });
}

function segmentTops(screen: ReturnType<typeof render>, key: string): number[] {
  const line = screen.getByTestId(`metric-sparkline-line-${key}`);
  const segments = line.props.children as { props: { style: ViewStyle } }[];

  return segments.map(
    (segment) => StyleSheet.flatten(segment.props.style).top as number,
  );
}

describe("metric card responsiveness", () => {
  it("picks four, two, then one column as the row narrows", () => {
    const columnsAt = (rowWidth: number) =>
      resolveGridColumns({ count: 4, gap: 12, minItemWidth: 250, rowWidth });

    expect(columnsAt(1240)).toBe(4);
    expect(columnsAt(1052)).toBe(4);
    // Three would fit, but 3 + 1 is worse than an even 2 + 2.
    expect(columnsAt(820)).toBe(2);
    expect(columnsAt(552)).toBe(2);
    expect(columnsAt(342)).toBe(1);
  });

  it("divides the measured row instead of using a fixed card width", () => {
    const screen = render(<MetricsSection />);

    fireEvent(screen.getByTestId("dashboard-metrics-grid"), "layout", {
      nativeEvent: { layout: { height: 160, width: 1236, x: 0, y: 0 } },
    });

    const cards = screen.getAllByText(/Gross sales|Orders|Net earnings/i);
    expect(cards.length).toBeGreaterThan(0);

    // 1236 row, four columns, three 12px gaps -> 300 each.
    const grid = screen.getByTestId("dashboard-metrics-grid");
    const card = grid.props.children[0];
    expect(StyleSheet.flatten(card.props.style)).toMatchObject({
      flexBasis: 300,
      maxWidth: 300,
    });
  });

  it("renders whatever metrics it is handed rather than the fixture", () => {
    const screen = render(<MetricsSection metrics={[countMetric]} />);

    expect(screen.getByText("ORDERS")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.queryByText("GROSS SALES")).toBeNull();
  });
});

describe("metric trend chart", () => {
  it("plots centavo-scale data inside the measured box", () => {
    const screen = render(<MetricsSection metrics={[centavoMetric]} />);
    layoutSparkline(screen, "gross-sales", { height: 62, width: 112 });

    const tops = segmentTops(screen, "gross-sales");

    expect(tops.length).toBeGreaterThan(0);
    tops.forEach((top) => {
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(62);
    });
  });

  it("reprojects the same series when the card resizes", () => {
    const screen = render(<MetricsSection metrics={[centavoMetric]} />);

    layoutSparkline(screen, "gross-sales", { height: 62, width: 112 });
    const narrow = segmentTops(screen, "gross-sales");

    layoutSparkline(screen, "gross-sales", { height: 120, width: 260 });
    const wide = segmentTops(screen, "gross-sales");

    expect(wide).not.toEqual(narrow);
    wide.forEach((top) => expect(top).toBeLessThanOrEqual(120));
  });

  it("renders nothing until the box has been measured", () => {
    const screen = render(<MetricsSection metrics={[centavoMetric]} />);

    expect(
      screen.queryByTestId("metric-sparkline-line-gross-sales"),
    ).toBeNull();
  });
});

describe("line chart engine", () => {
  it("derives the plotted range from the values", () => {
    expect(chartDomain([5, 10, 15])).toEqual({ maximum: 15, minimum: 5 });
    expect(chartDomain([])).toEqual({ maximum: 1, minimum: 0 });
  });

  it("centers a flat series instead of dividing by a zero range", () => {
    expect(
      projectValue({
        bottom: 60,
        height: 60,
        maximum: 4,
        minimum: 4,
        value: 4,
      }),
    ).toBe(30);
  });

  it("keeps a monotone curve from overshooting its own points", () => {
    const values = [10, 40, 20, 50];
    const points = buildMonotoneLinePoints({
      bottom: 100,
      height: 100,
      maximum: 50,
      minimum: 10,
      values,
      width: 300,
    });

    expect(points.length).toBeGreaterThan(values.length);
    points.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(300);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(100);
    });
    expect(points[points.length - 1].x).toBe(300);
  });

  it("survives degenerate series", () => {
    expect(monotoneTangents([7])).toEqual([0]);
    expect(
      buildMonotoneLinePoints({
        bottom: 50,
        height: 50,
        maximum: 1,
        minimum: 0,
        values: [],
        width: 100,
      }),
    ).toEqual([]);
    expect(
      buildMonotoneLinePoints({
        bottom: 50,
        height: 50,
        maximum: 3,
        minimum: 3,
        values: [3],
        width: 100,
      }),
    ).toEqual([
      { x: 0, y: 25 },
      { x: 100, y: 25 },
    ]);
    expect(toChartSegments([])).toEqual([]);
  });

  it("turns points into positive-length segments", () => {
    const segments = toChartSegments([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0].length).toBeCloseTo(5);
    expect(segments[0].left).toBe(0);
    expect(segments[0].top).toBe(0);
  });
});
