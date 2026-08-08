import { colors } from "@/constants/design-tokens";
import {
  formatCount,
  formatPeso,
} from "@/features/merchant-dashboard/dashboard-format";
import type { SalesPoint } from "@/features/merchant-dashboard/dashboard-types";

/**
 * Everything about the Sales Performance chart that is not drawing.
 *
 * The chart itself has two implementations — Recharts on web, and a React
 * Native renderer for iOS and Android, which cannot run Recharts because it
 * emits DOM and SVG. Both import this module, so the numbers, the spoken
 * summary and the series definitions can only ever agree.
 */

export const SALES_SERIES = [
  {
    color: colors.brand.primary,
    id: "revenue",
    label: "Revenue",
    note: "Gross revenue in pesos",
  },
  {
    color: colors.brand.blue,
    id: "orders",
    label: "Orders",
    note: "Order count",
  },
  {
    color: colors.neutral[400],
    id: "refunds",
    label: "Refunds",
    note: "Refunded value in pesos",
  },
] as const;

/** Reserved so a stroke sitting on the axis maximum is not half-clipped. */
export const AXIS_TICK_COUNT = 4;

const finite = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/**
 * Guards the render path. `loadDashboardSnapshot` already normalizes the
 * analytics payload, but points can also arrive straight through props, and one
 * missing field would otherwise poison both the totals and the curve geometry
 * with NaN.
 */
export function normalizeSalesPoint(point: SalesPoint): SalesPoint {
  return {
    ...point,
    label: typeof point?.label === "string" ? point.label : "",
    orders: finite(point?.orders),
    refunds: finite(point?.refunds),
    revenue: finite(point?.revenue),
  };
}

export type SalesChartTotals = {
  orders: number;
  peak: SalesPoint | null;
  refunds: number;
  revenue: number;
};

/** Totals come from the plotted points, so they can never drift from the curve. */
export function salesTotals(rawPoints: SalesPoint[]): SalesChartTotals {
  return rawPoints.map(normalizeSalesPoint).reduce<SalesChartTotals>(
    (totals, point) => ({
      orders: totals.orders + point.orders,
      peak:
        !totals.peak || point.revenue > totals.peak.revenue
          ? point
          : totals.peak,
      refunds: totals.refunds + point.refunds,
      revenue: totals.revenue + point.revenue,
    }),
    { orders: 0, peak: null, refunds: 0, revenue: 0 },
  );
}

/**
 * Chart height tracks the measured card width rather than a window breakpoint,
 * so the card is correct wherever it is placed — full width, beside the docked
 * notification drawer, or inside the narrower mobile column.
 */
export function plotHeightFor(width: number) {
  if (width < 420) return 260;
  if (width < 760) return 300;
  return 330;
}

/**
 * Text equivalent of the plot. Every figure is read from the same points the
 * curve is drawn from, so the spoken summary cannot drift from the picture.
 */
export function salesChartSummary({
  cadence,
  points,
  rangeLabel,
  totals,
}: {
  cadence: string;
  points: SalesPoint[];
  rangeLabel: string;
  totals: SalesChartTotals;
}) {
  if (points.length === 0) {
    return `Sales chart has no data for ${rangeLabel}.`;
  }

  const peak = totals.peak
    ? `Highest revenue was ${formatPeso(totals.peak.revenue)} on ${totals.peak.label}.`
    : "A highest revenue point is not available.";

  return (
    `Revenue, orders and refunds for ${rangeLabel}, ${cadence} intervals. ` +
    `Total revenue ${formatPeso(totals.revenue)} across ` +
    `${formatCount(totals.orders)} orders, with ` +
    `${formatPeso(totals.refunds)} refunded. ${peak}`
  );
}
