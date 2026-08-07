import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import {
  actionItems,
  chartSeries,
  dashboardMetrics,
  pipelineStages,
} from "@/features/merchant-dashboard/dashboard-data";
import { useResponsiveGrid } from "@/features/merchant-dashboard/dashboard-grid";
import {
  buildMonotoneLinePoints,
  type ChartPoint,
  DashboardLineChart,
  defaultCurveSamplesPerSegment,
  projectValue,
} from "@/features/merchant-dashboard/dashboard-line-chart";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  SectionHeading,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type {
  ChartCadence,
  MerchantSession,
  Metric,
  PipelineStage,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  formatPeso,
  greetingFor,
} from "@/features/merchant-dashboard/dashboard-format";

export function WelcomeBanner({
  mobile,
  session,
}: {
  mobile: boolean;
  session: MerchantSession;
}) {
  return (
    <DashboardCard
      style={[styles.welcomeCard, mobile && styles.welcomeCardMobile]}
      testID="dashboard-welcome"
    >
      <View pointerEvents="none" style={styles.welcomeBlueGlow} />
      <View pointerEvents="none" style={styles.welcomePinkGlow} />
      <View
        style={[styles.welcomeContent, mobile && styles.welcomeContentMobile]}
      >
        <View style={styles.welcomeBadges}>
          {session.verified ? (
            <StatusChip
              icon="check-decagram-outline"
              label="Verified merchant"
              tone="pink"
            />
          ) : null}
          <StatusChip
            label={`Store status: ${session.storeStatus}`}
            tone={session.storeStatus === "active" ? "green" : "warning"}
          />
        </View>
        <StylishText
          accessibilityRole="header"
          style={styles.welcomeTitle}
          unstyled
          variant="headingLarge"
        >
          {greetingFor()}, {session.displayName}
        </StylishText>
        <StylishText
          style={styles.welcomeDescription}
          unstyled
          variant="bodySmall"
        >
          Here&apos;s what&apos;s happening with {session.merchantName} today.
        </StylishText>
      </View>
      <View
        style={[styles.welcomeActions, mobile && styles.welcomeActionsMobile]}
      >
        <DashboardButton icon="open-in-new" label="View Storefront" />
        <DashboardButton
          disabled={!can(session, "products.write")}
          icon="plus"
          label="Add Product"
          title="Your role cannot create products."
          tone="primary"
        />
      </View>
    </DashboardCard>
  );
}

const metricGridGap = spacing.sm;
/** Below this a card can no longer show a compact peso value in full. */
const metricMinCardWidth = 250;

export function MetricsSection({
  metrics = dashboardMetrics,
}: {
  metrics?: readonly Metric[];
}) {
  const grid = useResponsiveGrid({
    count: metrics.length,
    gap: metricGridGap,
    minItemWidth: metricMinCardWidth,
  });

  return (
    <View
      accessibilityLabel="Merchant performance metrics"
      onLayout={grid.onLayout}
      style={styles.metricsGrid}
      testID="dashboard-metrics-grid"
    >
      {metrics.map((metric) => (
        <MetricCard
          key={metric.key}
          metric={metric}
          style={grid.itemStyle}
        />
      ))}
    </View>
  );
}

function MetricCard({
  metric,
  style,
}: {
  metric: Metric;
  style?: StyleProp<ViewStyle>;
}) {
  const positive = metric.changePercent >= 0;
  const [comparisonValue, ...comparisonWords] = metric.comparison.split(" ");
  const displayValue =
    metric.valueCentavos === undefined
      ? metric.value
      : formatPeso(metric.valueCentavos, { compact: true });

  return (
    <DashboardCard style={[styles.metricCard, style]}>
      <StylishText style={styles.metricLabel} unstyled variant="label">
        {metric.label.toUpperCase()}
      </StylishText>
      <View style={styles.metricBody}>
        <View style={styles.metricCopy}>
          <StylishText
            numberOfLines={1}
            style={styles.metricValue}
            unstyled
            variant="priceLarge"
          >
            {displayValue}
          </StylishText>
          <View style={styles.metricChangeRow}>
            <DashboardIcon
              color={
                positive ? colors.feedback.success : colors.feedback.danger
              }
              name={positive ? "arrow-up" : "arrow-down"}
              size={14}
            />
            <StylishText
              style={[
                styles.metricChange,
                !positive && styles.metricChangeNegative,
              ]}
              unstyled
              variant="caption"
            >
              {positive ? "Up" : "Down"} {Math.abs(metric.changePercent)}%
            </StylishText>
          </View>
          <View style={styles.metricComparisonRow}>
            <StylishText
              numberOfLines={1}
              style={styles.metricComparisonValue}
              unstyled
              variant="caption"
            >
              {comparisonValue}
            </StylishText>
            <StylishText
              style={styles.metricComparison}
              unstyled
              variant="caption"
            >
              {comparisonWords.join(" ")}
            </StylishText>
          </View>
        </View>
        <Sparkline
          data={metric.sparkline}
          metricKey={metric.key}
          positive={positive}
        />
      </View>
    </DashboardCard>
  );
}

/**
 * Trend line for one metric card. It measures its own box and normalizes the
 * series against its own range, so any unit the analytics API returns —
 * centavos, order counts, percentages — plots correctly without tuning.
 */
function Sparkline({
  data,
  metricKey,
  positive,
}: {
  data: readonly number[];
  metricKey: string;
  positive: boolean;
}) {
  const [size, setSize] = useState({ height: 0, width: 0 });
  const values = data.filter((value) => Number.isFinite(value));

  return (
    <View
      accessibilityLabel={
        values.length > 0
          ? `${positive ? "Upward" : "Downward"} trend across ${values.length} points`
          : "Trend data unavailable"
      }
      accessibilityRole="image"
      onLayout={(event) => {
        const { height, width } = event.nativeEvent.layout;
        setSize({ height, width });
      }}
      style={styles.sparkline}
      testID={`metric-sparkline-${metricKey}`}
    >
      <DashboardLineChart
        color={positive ? colors.feedback.success : colors.feedback.danger}
        height={size.height}
        testID={`metric-sparkline-line-${metricKey}`}
        values={[...values]}
        width={size.width}
      />
    </View>
  );
}

type SalesChartDataKey = "orders" | "refunds" | "revenue";

const chartPlotBottom = 150;
const chartPlotHeight = 140;
const chartCurveSamplesPerSegment = defaultCurveSamplesPerSegment;

function chartPointY(value: number, maximum: number) {
  return projectValue({
    bottom: chartPlotBottom,
    height: chartPlotHeight,
    maximum,
    minimum: 0,
    value,
  });
}

function buildMonotoneChartPoints({
  chartWidth,
  dataKey,
  maximum,
  samplesPerSegment = chartCurveSamplesPerSegment,
}: {
  chartWidth: number;
  dataKey: SalesChartDataKey;
  maximum: number;
  samplesPerSegment?: number;
}): ChartPoint[] {
  return buildMonotoneLinePoints({
    bottom: chartPlotBottom,
    height: chartPlotHeight,
    maximum,
    minimum: 0,
    samplesPerSegment,
    values: chartSeries.map((point) => point[dataKey]),
    width: chartWidth,
  });
}

function ChartSeriesLine({
  chartWidth,
  color,
  dashed = false,
  dataKey,
  maximum,
}: {
  chartWidth: number;
  color: string;
  dashed?: boolean;
  dataKey: SalesChartDataKey;
  maximum: number;
}) {
  if (chartWidth <= 0) return null;
  const points = buildMonotoneChartPoints({
    chartWidth,
    dataKey,
    maximum,
    samplesPerSegment: dashed ? 1 : chartCurveSamplesPerSegment,
  });

  return (
    <View
      pointerEvents="none"
      style={styles.chartSeriesLayer}
      testID={`chart-series-${dataKey}`}
    >
      {points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        const deltaX = next.x - point.x;
        const deltaY = next.y - point.y;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        return (
          <View
            key={`${dataKey}-${index}`}
            style={[
              styles.chartSeriesSegment,
              dashed
                ? styles.chartSeriesSegmentDashed
                : { backgroundColor: color },
              dashed && { borderTopColor: color },
              {
                left: point.x,
                top: point.y,
                transform: [{ rotate: `${angle}deg` }],
                width: length,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function RevenueArea({ chartWidth }: { chartWidth: number }) {
  if (chartWidth <= 0) return null;
  const points = buildMonotoneChartPoints({
    chartWidth,
    dataKey: "revenue",
    maximum: 100000,
  });

  return (
    <View
      pointerEvents="none"
      style={styles.chartSeriesLayer}
      testID="chart-series-revenue-area"
    >
      {points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        const top = Math.min(point.y, next.y);
        return (
          <View
            key={`revenue-area-${index}`}
            style={[
              styles.chartRevenueAreaSlice,
              {
                height: chartPlotBottom - top,
                left: point.x,
                top,
                width: Math.max(next.x - point.x + 1, 1),
              },
            ]}
          >
            <View style={styles.chartRevenueAreaBase} />
            <View style={styles.chartRevenueAreaMiddle} />
            <View style={styles.chartRevenueAreaTop} />
          </View>
        );
      })}
    </View>
  );
}

export function SalesPerformance({ empty = false }: { empty?: boolean }) {
  const [cadence, setCadence] = useState<ChartCadence>("daily");
  const [chartWidth, setChartWidth] = useState(0);
  const cadenceControl = (
    <View style={styles.segmentedControl}>
      {(["daily", "weekly", "monthly"] as ChartCadence[]).map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: cadence === item }}
          key={item}
          onPress={() => setCadence(item)}
          style={[
            styles.segmentButton,
            cadence === item && styles.segmentButtonActive,
          ]}
        >
          <StylishText
            style={[
              styles.segmentLabel,
              cadence === item && styles.segmentLabelActive,
            ]}
            unstyled
            variant="caption"
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </StylishText>
        </Pressable>
      ))}
    </View>
  );

  return (
    <DashboardCard style={styles.growCard} testID="dashboard-sales-performance">
      <SectionHeading
        action={cadenceControl}
        description="Last 7 days · daily view"
        title="Sales performance"
      />
      <View style={styles.chartContent}>
        <View style={styles.legend}>
          <LegendItem
            color={colors.brand.primary}
            label="Revenue"
            note="Gross revenue in pesos"
          />
          <LegendItem
            color={colors.brand.blue}
            label="Orders"
            note="Order count"
          />
          <LegendItem
            color={colors.neutral[400]}
            label="Refunds"
            note="Refunded value in pesos"
            variant="dashed"
          />
        </View>

        <View
          accessibilityLabel={
            empty
              ? "Sales chart has no data for this range."
              : "Revenue rose from 58,100 pesos to 83,975 pesos while orders rose from 32 to 53. Refunds remained below 2,000 pesos."
          }
          accessibilityRole="image"
          onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
          style={[styles.chart, empty && styles.chartEmptySurface]}
          testID="dashboard-sales-chart"
        >
          {!empty ? (
            <>
              {[0, 1, 2, 3].map((line) => (
                <View
                  key={line}
                  style={[styles.chartGridLine, { top: line * 52 }]}
                />
              ))}
              <RevenueArea chartWidth={chartWidth} />
              <ChartSeriesLine
                chartWidth={chartWidth}
                color={colors.brand.primary}
                dataKey="revenue"
                maximum={100000}
              />
              <ChartSeriesLine
                chartWidth={chartWidth}
                color={colors.brand.blue}
                dataKey="orders"
                maximum={60}
              />
              <ChartSeriesLine
                chartWidth={chartWidth}
                color={colors.neutral[400]}
                dashed
                dataKey="refunds"
                maximum={100000}
              />
            </>
          ) : null}
          {!empty ? (
            <View style={styles.chartLabels}>
              {chartSeries.map((point) => (
                <StylishText
                  key={point.label}
                  style={styles.chartLabel}
                  unstyled
                  variant="caption"
                >
                  {point.label}
                </StylishText>
              ))}
            </View>
          ) : null}
          {empty ? (
            <View style={styles.chartEmpty}>
              <DashboardIcon
                color={colors.neutral[400]}
                name="chart-line-variant"
                size={26}
              />
              <StylishText
                style={styles.chartEmptyTitle}
                unstyled
                variant="label"
              >
                No sales data for this range yet
              </StylishText>
              <StylishText
                style={styles.chartEmptyBody}
                unstyled
                variant="caption"
              >
                Once orders start coming in, revenue, orders, and refunds will
                appear here.
              </StylishText>
            </View>
          ) : null}
        </View>

        {!empty ? (
          <View style={styles.chartTotals}>
            <ChartTotal label="Revenue" value="₱486,275" />
            <ChartTotal label="Orders" value="318" />
            <ChartTotal label="Refunds" value="₱8,480" />
          </View>
        ) : null}
      </View>
    </DashboardCard>
  );
}

function LegendItem({
  color,
  label,
  note,
  variant = "line",
}: {
  color: string;
  label: string;
  note: string;
  variant?: "dashed" | "line";
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          variant === "dashed" && styles.legendSwatchDashed,
          variant === "dashed"
            ? { borderTopColor: color }
            : { backgroundColor: color },
        ]}
      />
      <StylishText style={styles.legendLabel} unstyled variant="caption">
        {label}
      </StylishText>
      <StylishText style={styles.legendNote} unstyled variant="caption">
        {note}
      </StylishText>
    </View>
  );
}

function ChartTotal({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chartTotal}>
      <StylishText style={styles.chartTotalLabel} unstyled variant="caption">
        {label}
      </StylishText>
      <StylishText
        numberOfLines={1}
        style={styles.chartTotalValue}
        unstyled
        variant="label"
      >
        {value}
      </StylishText>
    </View>
  );
}

export function ActionRequired({ session }: { session: MerchantSession }) {
  return (
    <DashboardCard style={styles.growCard} testID="dashboard-action-required">
      <SectionHeading
        description="Sorted by severity so the blocking work stays on top."
        title="Action required"
      />
      <View style={styles.actionList}>
        {actionItems.map((item) => {
          const allowed = can(session, item.permission);
          const tone =
            item.severity === "critical"
              ? "danger"
              : item.severity === "warning"
                ? "warning"
                : "blue";
          return (
            <View key={item.key} style={styles.actionRow}>
              <View
                style={[
                  styles.actionIcon,
                  item.severity === "warning" && styles.actionIconWarning,
                  item.severity === "review" && styles.actionIconReview,
                ]}
              >
                <DashboardIcon
                  color={
                    item.severity === "critical"
                      ? colors.feedback.danger
                      : item.severity === "warning"
                        ? colors.feedback.warning
                        : colors.feedback.info
                  }
                  name={
                    item.severity === "critical"
                      ? "alert-circle-outline"
                      : item.severity === "warning"
                        ? "alert-outline"
                        : "information-outline"
                  }
                />
              </View>
              <View style={styles.actionCopy}>
                <StylishText
                  style={styles.actionLabel}
                  unstyled
                  variant="label"
                >
                  {item.label}
                </StylishText>
                <View style={styles.actionMeta}>
                  <StylishText
                    style={styles.actionCount}
                    unstyled
                    variant="caption"
                  >
                    {item.count}
                  </StylishText>
                  <StatusChip
                    label={
                      item.severity === "review"
                        ? "For review"
                        : item.severity.charAt(0).toUpperCase() +
                          item.severity.slice(1)
                    }
                    tone={tone}
                  />
                </View>
              </View>
              <Pressable
                accessibilityHint={
                  !allowed ? "Your role does not allow this action." : undefined
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: !allowed }}
                disabled={!allowed}
                style={[styles.inlineAction, !allowed && styles.disabledAction]}
              >
                <StylishText
                  style={styles.inlineActionLabel}
                  unstyled
                  variant="label"
                >
                  {item.action}
                </StylishText>
                <DashboardIcon name="arrow-right" size={16} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </DashboardCard>
  );
}

/** Resolved at render time; `styles` is created at the end of this module. */
function pipelineToneStyle(tone: PipelineStage["tone"]) {
  return {
    blue: styles.pipelineBlue,
    green: styles.pipelineGreen,
    neutral: undefined,
    pink: styles.pipelinePink,
    warning: styles.pipelineWarning,
  }[tone];
}

/** Smallest width that still shows "Ready to Ship" and a four-digit count. */
const pipelineMinStageWidth = 112;
const pipelineGap = spacing.xs;

export function pipelineTotal(stages: readonly PipelineStage[]) {
  return stages.reduce((total, stage) => total + stage.count, 0);
}

export function OrderPipeline({
  onViewAllOrders,
  stages = pipelineStages,
}: {
  onViewAllOrders?: () => void;
  stages?: readonly PipelineStage[];
}) {
  const grid = useResponsiveGrid({
    count: stages.length,
    gap: pipelineGap,
    minItemWidth: pipelineMinStageWidth,
  });
  const total = pipelineTotal(stages);

  return (
    <DashboardCard testID="dashboard-order-pipeline">
      <SectionHeading
        action={
          <Pressable
            accessibilityRole="button"
            onPress={onViewAllOrders}
            style={styles.headingAction}
          >
            <StylishText
              style={styles.headingActionLabel}
              unstyled
              variant="label"
            >
              View All Orders
            </StylishText>
            <DashboardIcon name="arrow-right" size={16} />
          </Pressable>
        }
        description={`${total.toLocaleString("en-PH")} ${
          total === 1 ? "order" : "orders"
        } in the current range`}
        title="Order pipeline"
      />
      {/* Padding lives on the wrapper so the measured row is the content box;
          measuring a padded view would size tiles against the wrong width. */}
      <View style={styles.pipelineContent}>
        <View
          onLayout={grid.onLayout}
          style={styles.pipelineRow}
          testID="dashboard-order-pipeline-grid"
        >
          {stages.map((stage) => (
            <View
              key={stage.key}
              style={[
                styles.pipelineStage,
                pipelineToneStyle(stage.tone),
                grid.itemStyle,
              ]}
              testID={`pipeline-stage-${stage.key}`}
            >
              <StylishText
                numberOfLines={1}
                style={styles.pipelineLabel}
                unstyled
                variant="caption"
              >
                {stage.label}
              </StylishText>
              <StylishText
                numberOfLines={1}
                style={styles.pipelineCount}
                unstyled
                variant="price"
              >
                {stage.count.toLocaleString("en-PH")}
              </StylishText>
            </View>
          ))}
        </View>
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  actionCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  actionCount: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    lineHeight: 16,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: colors.feedback.dangerSoft,
    borderRadius: borderRadius.input,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  actionIconReview: { backgroundColor: colors.feedback.infoSoft },
  actionIconWarning: { backgroundColor: colors.feedback.warningSoft },
  actionLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  actionList: { paddingHorizontal: spacing.lg },
  actionMeta: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  actionRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 88,
    paddingVertical: spacing.sm,
  },
  chart: {
    height: 190,
    marginTop: spacing.sm,
    overflow: "hidden",
    position: "relative",
  },
  chartContent: { flex: 1, padding: spacing.lg },
  chartEmpty: {
    alignItems: "center",
    backgroundColor: "transparent",
    bottom: spacing.lg,
    justifyContent: "center",
    left: spacing.lg,
    padding: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
  },
  chartEmptySurface: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chartEmptyBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  chartEmptyTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  chartGridLine: {
    backgroundColor: colors.neutral[200],
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  chartLabel: {
    color: colors.neutral[550],
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 9,
    lineHeight: 14,
    textAlign: "center",
  },
  chartLabels: {
    bottom: 0,
    flexDirection: "row",
    left: 0,
    position: "absolute",
    right: 0,
  },
  chartRevenueAreaBase: {
    backgroundColor: colors.brand.primary,
    bottom: 0,
    left: 0,
    opacity: 0.025,
    position: "absolute",
    right: 0,
    top: 0,
  },
  chartRevenueAreaMiddle: {
    backgroundColor: colors.brand.primary,
    height: "62%",
    left: 0,
    opacity: 0.04,
    position: "absolute",
    right: 0,
    top: 0,
  },
  chartRevenueAreaSlice: {
    overflow: "hidden",
    position: "absolute",
  },
  chartRevenueAreaTop: {
    backgroundColor: colors.brand.primary,
    height: "30%",
    left: 0,
    opacity: 0.05,
    position: "absolute",
    right: 0,
    top: 0,
  },
  chartSeriesLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  chartSeriesSegment: {
    height: 2,
    position: "absolute",
    transformOrigin: "left center",
  },
  chartSeriesSegmentDashed: {
    backgroundColor: "transparent",
    borderStyle: "dashed",
    borderTopWidth: 2,
    height: 0,
  },
  chartTotal: { flex: 1, gap: spacing.xxs },
  chartTotalLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  chartTotalValue: {
    color: colors.ink.primary,
    flexShrink: 0,
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    lineHeight: 20,
  },
  chartTotals: {
    borderTopColor: colors.neutral[200],
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  disabledAction: { opacity: 0.4 },
  growCard: { flex: 1, minWidth: 0 },
  headingAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
  },
  headingActionLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  inlineAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
    minHeight: 44,
  },
  inlineActionLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  legendLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  legendNote: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 16,
  },
  legendSwatch: {
    borderRadius: borderRadius.pill,
    flexShrink: 0,
    height: 2,
    width: 12,
  },
  legendSwatchDashed: {
    backgroundColor: "transparent",
    borderStyle: "dashed",
    borderTopWidth: 2,
    height: 0,
  },
  metricBody: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  metricCard: {
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: 0,
    padding: spacing.lg,
  },
  metricChange: {
    color: colors.feedback.success,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  metricChangeNegative: { color: colors.feedback.danger },
  metricChangeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
  },
  metricComparison: {
    color: colors.neutral[550],
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 16,
  },
  metricComparisonRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
  },
  metricComparisonValue: {
    color: colors.neutral[550],
    flexShrink: 0,
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    lineHeight: 16,
  },
  metricCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  metricLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    letterSpacing: 1.1,
    lineHeight: 16,
  },
  metricsGrid: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: metricGridGap,
  },
  metricValue: {
    color: colors.ink.primary,
    flexShrink: 0,
    fontFamily: "Montserrat_700Bold",
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.45,
    lineHeight: 34,
  },
  pipelineBlue: { backgroundColor: colors.feedback.infoSoft },
  pipelineContent: { padding: spacing.lg },
  pipelineCount: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  pipelineGreen: { backgroundColor: colors.feedback.successSoft },
  pipelineLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 10,
    lineHeight: 15,
  },
  pipelinePink: { backgroundColor: colors.feedback.dangerSoft },
  pipelineRow: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: pipelineGap,
  },
  pipelineStage: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    // Shares the measured row with its siblings rather than sitting at a
    // natural width inside a horizontally scrolling strip.
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 0,
    padding: spacing.sm,
  },
  pipelineWarning: { backgroundColor: colors.feedback.warningSoft },
  segmentButton: {
    alignItems: "center",
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.neutral[0],
    shadowColor: colors.ink.primary,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  segmentedControl: {
    alignSelf: "flex-end",
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.xxs,
  },
  segmentLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  segmentLabelActive: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
  },
  sparkline: {
    // Yields to the metric value rather than competing with it: never grows
    // past its basis, shrinks when the card is tight, and the trend line
    // reprojects itself onto whatever box it ends up with.
    flexBasis: 112,
    flexGrow: 0,
    flexShrink: 1,
    height: 62,
    minWidth: 56,
    overflow: "hidden",
    position: "relative",
  },
  welcomeActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
    position: "relative",
    zIndex: 2,
  },
  welcomeActionsMobile: {
    alignItems: "stretch",
    flexDirection: "column",
    width: "100%",
  },
  welcomeBadges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  welcomeBlueGlow: {
    backgroundColor: colors.feedback.infoSoft,
    borderRadius: borderRadius.pill,
    bottom: -80,
    height: 210,
    opacity: 0.85,
    position: "absolute",
    right: 180,
    width: 210,
    zIndex: 0,
  },
  welcomeCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "space-between",
    minHeight: 166,
    padding: spacing.xl,
    position: "relative",
  },
  welcomeCardMobile: {
    alignItems: "flex-start",
    flexDirection: "column",
    padding: spacing.md,
  },
  welcomeContent: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 240,
    paddingRight: spacing.lg,
    position: "relative",
    zIndex: 2,
  },
  welcomeContentMobile: { minWidth: 0, paddingRight: 0, width: "100%" },
  welcomeDescription: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  welcomePinkGlow: {
    backgroundColor: colors.brand.socialSurface,
    borderRadius: borderRadius.pill,
    height: 230,
    opacity: 0.85,
    position: "absolute",
    right: -70,
    top: -100,
    width: 230,
    zIndex: 0,
  },
  welcomeTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 30,
    letterSpacing: -0.45,
    lineHeight: 38,
  },
});
