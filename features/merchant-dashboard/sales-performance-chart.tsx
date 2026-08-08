import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  buildMonotoneLinePoints,
  niceAxis,
  projectValue,
  toChartSegments,
} from "@/features/merchant-dashboard/dashboard-line-chart";
import {
  formatCount,
  formatPeso,
} from "@/features/merchant-dashboard/dashboard-format";
import {
  AXIS_TICK_COUNT,
  normalizeSalesPoint,
  plotHeightFor,
} from "@/features/merchant-dashboard/sales-chart-model";
import type { SalesPoint } from "@/features/merchant-dashboard/dashboard-types";

/**
 * The Sales Performance plot: dual axes, gridlines, a filled revenue curve and
 * two secondary series, all derived from the supplied points.
 *
 * Nothing here is measured off a design: the axes come from the data through
 * `niceAxis`, the plot height comes from the measured width, and the point
 * geometry comes from `buildMonotoneLinePoints`. A series that grows past
 * today's numbers gets a taller axis rather than a clipped line.
 */

/**
 * Axis gutters shrink before the plot does. On a phone-width card the full
 * desktop gutters would leave barely a hundred pixels to draw in, so the
 * labels tighten first and the plot keeps the space it needs to stay legible.
 */
export function axisWidthsFor(width: number) {
  if (width < 360) return { count: 26, money: 44 };
  if (width < 520) return { count: 32, money: 52 };
  return { count: 44, money: 64 };
}
/** Keeps a stroke sitting on the axis maximum fully inside the plot box. */
const PLOT_TOP_INSET = 3;
const REVENUE_STROKE = 2.5;
const SERIES_STROKE = 2;
const TOOLTIP_WIDTH = 172;
const X_LABEL_WIDTH = 58;

/** Shows every label when they fit, then thins them out rather than colliding. */
export function labelStrideFor(width: number, count: number) {
  if (count <= 1 || width <= 0) return 1;
  return Math.max(1, Math.ceil((count * X_LABEL_WIDTH) / width));
}

const maxOf = (points: SalesPoint[], read: (point: SalesPoint) => number) =>
  points.reduce((highest, point) => Math.max(highest, read(point)), 0);

export function SalesPerformanceChart({
  accessibilityLabel,
  points: rawPoints,
  testID,
}: {
  accessibilityLabel: string;
  points: SalesPoint[];
  testID?: string;
}) {
  const [rootWidth, setRootWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = rawPoints.map(normalizeSalesPoint);

  // One measurement drives everything: the gutters are fixed-width flex
  // children, so the plot is exactly what is left over.
  const axisWidths = axisWidthsFor(rootWidth);
  const plotWidth = Math.max(
    0,
    rootWidth - axisWidths.money - axisWidths.count,
  );

  const money = niceAxis(
    Math.max(
      maxOf(points, (point) => point.revenue),
      maxOf(points, (point) => point.refunds),
    ),
    AXIS_TICK_COUNT,
  );
  const count = niceAxis(
    maxOf(points, (point) => point.orders),
    AXIS_TICK_COUNT,
  );
  const plotHeight = plotHeightFor(rootWidth);
  const plotSpan = Math.max(0, plotHeight - PLOT_TOP_INSET);

  const yFor = (value: number, maximum: number) =>
    projectValue({
      bottom: plotHeight,
      height: plotSpan,
      maximum,
      minimum: 0,
      value,
    });
  const xFor = (index: number) =>
    points.length > 1
      ? (index * plotWidth) / (points.length - 1)
      : plotWidth / 2;

  const linePoints = (read: (point: SalesPoint) => number, maximum: number) =>
    buildMonotoneLinePoints({
      bottom: plotHeight,
      height: plotSpan,
      maximum,
      minimum: 0,
      values: points.map(read),
      width: plotWidth,
    });

  const revenueCurve = linePoints((point) => point.revenue, money.maximum);
  const active = activeIndex === null ? null : (points[activeIndex] ?? null);
  const stride = labelStrideFor(plotWidth, points.length);

  return (
    <View
      onLayout={(event) => setRootWidth(event.nativeEvent.layout.width)}
      style={styles.root}
      testID={testID}
    >
      <View style={styles.plotRow}>
        <View
          style={[styles.axis, { height: plotHeight, width: axisWidths.money }]}
        >
          {money.ticks.map((tick) => (
            <AxisTick
              key={`money-${tick}`}
              align="right"
              label={formatPeso(tick, { compact: true })}
              top={yFor(tick, money.maximum)}
            />
          ))}
        </View>

        <View
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="image"
          accessible
          style={[styles.plot, { height: plotHeight }]}
          testID="dashboard-sales-plot"
        >
          {money.ticks.map((tick) => (
            <View
              key={`grid-${tick}`}
              pointerEvents="none"
              style={[styles.gridLine, { top: yFor(tick, money.maximum) }]}
            />
          ))}

          {plotWidth > 0 ? (
            <>
              <RevenueArea
                curve={revenueCurve}
                baseline={plotHeight}
                testID="chart-series-revenue-area"
              />
              <SeriesLine
                color={colors.neutral[400]}
                dashed
                points={linePoints((point) => point.refunds, money.maximum)}
                strokeWidth={SERIES_STROKE}
                testID="chart-series-refunds"
              />
              <SeriesLine
                color={colors.brand.primary}
                points={revenueCurve}
                strokeWidth={REVENUE_STROKE}
                testID="chart-series-revenue"
              />
              <SeriesLine
                color={colors.brand.blue}
                points={linePoints((point) => point.orders, count.maximum)}
                strokeWidth={SERIES_STROKE}
                testID="chart-series-orders"
              />

              {activeIndex !== null && active ? (
                <>
                  <View
                    pointerEvents="none"
                    style={[styles.activeRule, { left: xFor(activeIndex) }]}
                  />
                  <ActiveDot
                    color={colors.brand.blue}
                    left={xFor(activeIndex)}
                    top={yFor(active.orders, count.maximum)}
                  />
                  <ActiveDot
                    color={colors.brand.primary}
                    left={xFor(activeIndex)}
                    top={yFor(active.revenue, money.maximum)}
                  />
                </>
              ) : null}

              {points.map((point, index) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${point.label}: revenue ${formatPeso(point.revenue)}, ${formatCount(point.orders)} orders, refunds ${formatPeso(point.refunds)}`}
                  key={`hit-${point.label}-${index}`}
                  onHoverIn={() => setActiveIndex(index)}
                  onHoverOut={() => setActiveIndex(null)}
                  onPress={() =>
                    setActiveIndex((current) =>
                      current === index ? null : index,
                    )
                  }
                  style={[
                    styles.hitColumn,
                    {
                      left: (index * plotWidth) / points.length,
                      width: plotWidth / points.length,
                    },
                  ]}
                />
              ))}

              {active ? (
                <ChartTooltip
                  left={Math.min(
                    Math.max(0, xFor(activeIndex ?? 0) - TOOLTIP_WIDTH / 2),
                    Math.max(0, plotWidth - TOOLTIP_WIDTH),
                  )}
                  point={active}
                />
              ) : null}
            </>
          ) : null}
        </View>

        <View
          style={[styles.axis, { height: plotHeight, width: axisWidths.count }]}
        >
          {count.ticks.map((tick) => (
            <AxisTick
              key={`count-${tick}`}
              align="left"
              label={formatCount(tick)}
              top={yFor(tick, count.maximum)}
            />
          ))}
        </View>
      </View>

      <View style={styles.labelRow}>
        <View
          style={[
            styles.labelTrack,
            { marginLeft: axisWidths.money, marginRight: axisWidths.count },
          ]}
        >
          {points.map((point, index) =>
            index % stride === 0 || index === points.length - 1 ? (
              <StylishText
                key={`label-${point.label}-${index}`}
                numberOfLines={1}
                style={[
                  styles.xLabel,
                  {
                    left: Math.min(
                      Math.max(0, xFor(index) - X_LABEL_WIDTH / 2),
                      Math.max(0, plotWidth - X_LABEL_WIDTH),
                    ),
                  },
                ]}
                unstyled
                variant="caption"
              >
                {point.label}
              </StylishText>
            ) : null,
          )}
        </View>
      </View>
    </View>
  );
}

function AxisTick({
  align,
  label,
  top,
}: {
  align: "left" | "right";
  label: string;
  top: number;
}) {
  return (
    <StylishText
      numberOfLines={1}
      style={[
        styles.axisTick,
        { textAlign: align, top: top - 8 },
        align === "right" ? styles.axisTickRight : styles.axisTickLeft,
      ]}
      unstyled
      variant="caption"
    >
      {label}
    </StylishText>
  );
}

function SeriesLine({
  color,
  dashed = false,
  points,
  strokeWidth,
  testID,
}: {
  color: string;
  dashed?: boolean;
  points: { x: number; y: number }[];
  strokeWidth: number;
  testID: string;
}) {
  if (points.length < 2) return null;

  return (
    <View pointerEvents="none" style={styles.layer} testID={testID}>
      {toChartSegments(points).map((segment, index) => (
        <View
          key={`${testID}-${index}`}
          style={[
            styles.segment,
            { height: strokeWidth },
            dashed
              ? { borderTopColor: color, borderTopWidth: strokeWidth }
              : { backgroundColor: color, borderRadius: strokeWidth / 2 },
            {
              left: segment.left,
              top: segment.top - strokeWidth / 2,
              transform: [{ rotate: `${segment.angle}deg` }],
              width: segment.length,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Fills the band between the revenue curve and the baseline, one column per
 * curve sample.
 *
 * The fill is a single flat tint rather than a gradient. Without an SVG or
 * gradient dependency the only way to fade it is stacked bands, and because
 * each column has its own height those band edges trace curves that read as
 * extra data series. A flat, very light coral keeps the line dominant and says
 * nothing the data does not.
 */
function RevenueArea({
  baseline,
  curve,
  testID,
}: {
  baseline: number;
  curve: { x: number; y: number }[];
  testID: string;
}) {
  if (curve.length < 2) return null;

  return (
    <View pointerEvents="none" style={styles.layer} testID={testID}>
      {curve.slice(0, -1).map((point, index) => {
        const next = curve[index + 1];
        const top = Math.min(point.y, next.y);

        return (
          <View
            key={`${testID}-${index}`}
            style={[
              styles.areaSlice,
              {
                height: Math.max(0, baseline - top),
                left: point.x,
                top,
                // Exactly contiguous. Overlapping slices would double their
                // own alpha at every seam and stripe the fill vertically.
                width: Math.max(next.x - point.x, 0),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function ActiveDot({
  color,
  left,
  top,
}: {
  color: string;
  left: number;
  top: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.activeDot,
        { backgroundColor: color, left: left - 4, top: top - 4 },
      ]}
    />
  );
}

function ChartTooltip({ left, point }: { left: number; point: SalesPoint }) {
  return (
    <View pointerEvents="none" style={[styles.tooltip, { left }]}>
      <StylishText style={styles.tooltipTitle} unstyled variant="label">
        {point.label}
      </StylishText>
      <TooltipRow label="Revenue" value={formatPeso(point.revenue)} />
      <TooltipRow label="Orders" value={formatCount(point.orders)} />
      <TooltipRow label="Refunds" value={formatPeso(point.refunds)} />
    </View>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tooltipRow}>
      <StylishText style={styles.tooltipLabel} unstyled variant="caption">
        {label}
      </StylishText>
      <StylishText style={styles.tooltipValue} unstyled variant="caption">
        {value}
      </StylishText>
    </View>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    borderColor: colors.neutral[0],
    borderRadius: borderRadius.pill,
    borderStyle: "solid",
    borderWidth: 1.5,
    height: 8,
    position: "absolute",
    width: 8,
  },
  activeRule: {
    backgroundColor: colors.neutral[200],
    bottom: 0,
    position: "absolute",
    top: 0,
    width: 1,
  },
  axis: { flexShrink: 0, position: "relative" },
  axisTick: {
    color: colors.neutral[550],
    fontSize: 11,
    lineHeight: 16,
    position: "absolute",
  },
  axisTickLeft: { left: spacing.xs, right: 0 },
  axisTickRight: { left: 0, right: spacing.xs },
  gridLine: {
    backgroundColor: colors.neutral[200],
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  hitColumn: { bottom: 0, position: "absolute", top: 0 },
  labelRow: { flexDirection: "row", marginTop: spacing.xs },
  labelTrack: { flex: 1, height: 16, position: "relative" },
  layer: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  plot: { flex: 1, minWidth: 0, overflow: "visible", position: "relative" },
  plotRow: { flexDirection: "row" },
  // The topmost axis tick is centred on the plot's top edge, so it overhangs by
  // half its line height. This keeps it clear of the legend above.
  root: { paddingTop: 12, width: "100%" },
  areaSlice: {
    backgroundColor: colors.brand.primary,
    opacity: 0.1,
    position: "absolute",
  },
  segment: { position: "absolute", transformOrigin: "left center" },
  tooltip: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: 10,
    borderStyle: "solid",
    borderWidth: 1,
    elevation: 6,
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    position: "absolute",
    shadowColor: "#11223B",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    top: spacing.xs,
    width: TOOLTIP_WIDTH,
  },
  tooltipLabel: { color: colors.neutral[550], fontSize: 12, lineHeight: 18 },
  tooltipRow: { flexDirection: "row", justifyContent: "space-between" },
  tooltipTitle: {
    color: colors.ink.primary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  tooltipValue: { color: colors.ink.primary, fontSize: 12, lineHeight: 18 },
  xLabel: {
    color: colors.neutral[550],
    fontSize: 11,
    lineHeight: 16,
    position: "absolute",
    textAlign: "center",
    width: X_LABEL_WIDTH,
  },
});
