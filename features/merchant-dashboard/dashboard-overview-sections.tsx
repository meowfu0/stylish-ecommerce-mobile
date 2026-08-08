import { useRouter } from "expo-router";
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
  dashboardMetrics,
  pipelineStages,
} from "@/features/merchant-dashboard/dashboard-data";
import { emptySalesSeries } from "@/features/merchant-dashboard/dashboard-data-source";
import { useResponsiveGrid } from "@/features/merchant-dashboard/dashboard-grid";
import {
  presentStoreStatus,
  STOREFRONT_ROUTE,
} from "@/features/merchant-dashboard/merchant-store-status";
import { MetricSparkline } from "@/features/merchant-dashboard/metric-sparkline";
import {
  SALES_SERIES,
  salesChartSummary,
  salesTotals,
} from "@/features/merchant-dashboard/sales-chart-model";
import { SalesPerformanceChart } from "@/features/merchant-dashboard/sales-performance-chart";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  SectionHeading,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type {
  ChartCadence,
  DateRange,
  MerchantSession,
  Metric,
  PipelineStage,
  SalesSeries,
} from "@/features/merchant-dashboard/dashboard-types";
import { CHART_CADENCES } from "@/features/merchant-dashboard/dashboard-types";
import {
  DATE_RANGE_LABELS,
  formatCount,
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
  const router = useRouter();
  const storeStatus = presentStoreStatus(session);

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
            // Label, icon and tone come from the shared status map, so the
            // welcome card, the sidebar chip and the profile all agree.
            icon={storeStatus.icon}
            label={`Store status: ${storeStatus.shortLabel}`}
            tone={storeStatus.tone}
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
        <DashboardButton
          disabled={!storeStatus.canViewStorefront}
          label="View Storefront"
          onPress={() => router.push(STOREFRONT_ROUTE)}
          testID="welcome-view-storefront"
          title={storeStatus.disabledReason}
          trailingIcon="open-in-new"
        />
        <DashboardButton
          disabled={!can(session, "products.write")}
          icon="plus"
          label="Add Product"
          testID="welcome-add-product"
          title="Your role cannot create products."
          tone="primary"
        />
      </View>
    </DashboardCard>
  );
}

/**
 * Metric grid geometry. Exported so the loading skeleton can lay its
 * placeholders out on the same grid and the cards do not jump when the real
 * metrics arrive.
 */
export const metricGridGap = spacing.sm;
/** Below this a card can no longer show a compact peso value in full. */
export const metricMinCardWidth = 250;

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
        <MetricCard key={metric.key} metric={metric} style={grid.itemStyle} />
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
        <MetricSparkline
          data={metric.sparkline}
          metricKey={metric.key}
          positive={positive}
        />
      </View>
    </DashboardCard>
  );
}

export function SalesPerformance({
  dateRange = "7d",
  empty = false,
  salesSeries = emptySalesSeries,
}: {
  dateRange?: DateRange;
  empty?: boolean;
  salesSeries?: SalesSeries;
}) {
  const [cadence, setCadence] = useState<ChartCadence>("daily");
  // Granularity selects a different dataset rather than relabelling one series,
  // which is also the shape the analytics endpoint will return per interval.
  const points = salesSeries[cadence] ?? [];
  const showEmpty = empty || points.length === 0;
  const totals = salesTotals(points);
  const rangeLabel = DATE_RANGE_LABELS[dateRange];

  const cadenceControl = (
    <View style={styles.segmentedControl}>
      {CHART_CADENCES.map((item) => (
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
        description={`${rangeLabel} · ${cadence} view`}
        title="Sales performance"
      />
      <View style={styles.chartContent}>
        {/* Legend and plot read the same series definitions, so a colour can
            never say one thing here and another in the chart. */}
        <View style={styles.legend}>
          {SALES_SERIES.map((series) => (
            <LegendItem
              color={series.color}
              key={series.id}
              label={series.label}
              note={series.note}
              testID={`sales-legend-swatch-${series.id}`}
            />
          ))}
        </View>

        {showEmpty ? (
          <View
            accessibilityLabel={`Sales chart has no data for ${rangeLabel}.`}
            accessibilityRole="image"
            accessible
            style={[styles.chart, styles.chartEmptySurface]}
            testID="dashboard-sales-chart"
          >
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
          </View>
        ) : (
          <SalesPerformanceChart
            accessibilityLabel={salesChartSummary({
              cadence,
              points,
              rangeLabel,
              totals,
            })}
            points={points}
            testID="dashboard-sales-chart"
          />
        )}

        {!showEmpty ? (
          <View style={styles.chartTotals}>
            <ChartTotal
              label="Revenue"
              value={formatPeso(totals.revenue, { decimals: false })}
            />
            <ChartTotal label="Orders" value={formatCount(totals.orders)} />
            <ChartTotal
              label="Refunds"
              value={formatPeso(totals.refunds, { decimals: false })}
            />
          </View>
        ) : null}
      </View>
    </DashboardCard>
  );
}

/**
 * One legend entry. The swatch is a filled dot for every series, including the
 * dashed refunds line: the reference identifies series by colour alone, and a
 * dot reads as a colour key rather than as a sample of the stroke.
 */
function LegendItem({
  color,
  label,
  note,
  testID,
}: {
  color: string;
  label: string;
  note: string;
  testID?: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[styles.legendSwatch, { backgroundColor: color }]}
        testID={testID}
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
    height: 10,
    width: 10,
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
  // Decorative only, behind everything, and clipped by the card's own
  // `overflow: hidden`. Sits nearer the lower-right corner so it reads as a
  // corner wash rather than a shape drifting under the heading.
  welcomeBlueGlow: {
    backgroundColor: colors.feedback.infoSoft,
    borderRadius: borderRadius.pill,
    bottom: -96,
    height: 210,
    opacity: 0.85,
    position: "absolute",
    right: 96,
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
