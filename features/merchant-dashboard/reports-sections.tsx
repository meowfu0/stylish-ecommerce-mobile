import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  InventoryOverview,
  TopProducts,
} from "@/features/merchant-dashboard/dashboard-commerce-sections";
import {
  DATE_RANGE_LABELS,
  formatCount,
} from "@/features/merchant-dashboard/dashboard-format";
import { useResponsiveGrid } from "@/features/merchant-dashboard/dashboard-grid";
import {
  MetricsSection,
  SalesPerformance,
} from "@/features/merchant-dashboard/dashboard-overview-sections";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  SectionHeading,
} from "@/features/merchant-dashboard/dashboard-primitives";
import { FilterSelect } from "@/features/merchant-dashboard/dashboard-table";
import type {
  DateRange,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  type OrderReport,
  REPORT_LOCATIONS,
  type ReportsWorkspaceSnapshot,
} from "@/features/merchant-dashboard/staff-reports-demo-data";

/**
 * The Reports workspace.
 *
 * Almost nothing here is new: the metric cards, the Recharts sales chart, Top
 * Products and the Inventory distribution bar are the dashboard's own
 * components, fed report fixtures through the props they already accept. That
 * keeps one chart architecture — and one platform split — rather than a second
 * set of report-only visuals.
 */

export const ALL_LOCATIONS = "All locations";
const TILE_MIN_WIDTH = 150;

export type ReportFilters = {
  dateRange: DateRange;
  locationName?: string;
};

export const emptyReportFilters: ReportFilters = { dateRange: "7d" };

/** Percentages behind the order-status bar, guarded against an empty report. */
export function orderStatusShares(report: OrderReport) {
  const total = report.statuses.reduce(
    (running, status) => running + status.count,
    0,
  );
  return report.statuses.map((status) => ({
    ...status,
    share: total > 0 ? status.count / total : 0,
  }));
}

export function fulfillmentRate(report: OrderReport) {
  return report.total > 0 ? report.fulfilled / report.total : 0;
}

export function ReportsContent({
  compact,
  filters,
  onExport,
  onFiltersChange,
  reports,
  session,
}: {
  compact: boolean;
  filters: ReportFilters;
  onExport?: () => void;
  onFiltersChange: (filters: ReportFilters) => void;
  reports: ReportsWorkspaceSnapshot;
  session: MerchantSession;
}) {
  const setFilter = (next: Partial<ReportFilters>) =>
    onFiltersChange({ ...filters, ...next });

  return (
    <>
      <DashboardCard testID="reports-header">
        <SectionHeading
          action={
            <DashboardButton
              icon="download-outline"
              label="Export"
              onPress={onExport}
              testID="reports-export"
            />
          }
          description={`${DATE_RANGE_LABELS[filters.dateRange]}${
            filters.locationName ? ` · ${filters.locationName}` : ""
          }`}
          title="Reports"
        />
        <View style={styles.notice}>
          <DashboardIcon
            color={colors.feedback.info}
            name="flask-outline"
            size={14}
          />
          <StylishText style={styles.noticeText} unstyled variant="caption">
            Figures come from demo data, and Export is not wired to a report
            service yet.
          </StylishText>
        </View>
        <View style={styles.controls}>
          <FilterSelect
            label="Date range"
            onChange={(next) =>
              setFilter({
                dateRange:
                  (Object.keys(DATE_RANGE_LABELS) as DateRange[]).find(
                    (range) => DATE_RANGE_LABELS[range] === next,
                  ) ?? "7d",
              })
            }
            options={Object.values(DATE_RANGE_LABELS)}
            testID="reports-range-filter"
            value={DATE_RANGE_LABELS[filters.dateRange]}
          />
          <FilterSelect
            label="Location"
            onChange={(next) =>
              setFilter({
                locationName: REPORT_LOCATIONS.find(
                  (location) => location === next,
                ),
              })
            }
            options={[ALL_LOCATIONS, ...REPORT_LOCATIONS]}
            testID="reports-location-filter"
            value={filters.locationName ?? ALL_LOCATIONS}
          />
        </View>
      </DashboardCard>

      {/* The dashboard's own metric cards and sparklines, fed report figures. */}
      <MetricsSection metrics={reports.metrics} />

      {/* The existing Sales Performance card: same Recharts-on-web/native split,
          same Daily/Weekly/Monthly control, driven by the report series. */}
      <SalesPerformance
        dateRange={filters.dateRange}
        salesSeries={reports.series}
      />

      <View style={[styles.pairedGrid, compact && styles.stackedGrid]}>
        <TopProducts products={reports.products} />
        <InventoryOverview session={session} summary={reports.inventory} />
      </View>

      <OrderReportCard compact={compact} report={reports.orders} />
    </>
  );
}

/** The one genuinely new card: order outcomes and their distribution. */
export function OrderReportCard({
  compact,
  report,
}: {
  compact: boolean;
  report: OrderReport;
}) {
  const shares = useMemo(() => orderStatusShares(report), [report]);
  const rate = fulfillmentRate(report);
  const tiles = [
    { key: "total", label: "Total orders", value: formatCount(report.total) },
    {
      key: "fulfilled",
      label: "Fulfilled",
      value: formatCount(report.fulfilled),
    },
    {
      key: "cancelled",
      label: "Cancelled",
      value: formatCount(report.cancelled),
    },
    {
      key: "time",
      label: "Avg. fulfilment",
      value: `${report.averageFulfillmentHours.toFixed(1)} h`,
    },
  ];
  const grid = useResponsiveGrid({
    count: tiles.length,
    gap: spacing.sm,
    minItemWidth: TILE_MIN_WIDTH,
  });

  return (
    <DashboardCard testID="order-report">
      <SectionHeading
        description={`${(rate * 100).toFixed(1)}% of orders in this range were fulfilled.`}
        title="Order report"
      />
      <View style={styles.body}>
        <View onLayout={grid.onLayout} style={styles.tileGrid}>
          {tiles.map((tile) => (
            <View key={tile.key} style={[styles.tile, grid.itemStyle]}>
              <StylishText
                numberOfLines={1}
                style={styles.tileLabel}
                unstyled
                variant="caption"
              >
                {tile.label}
              </StylishText>
              <StylishText style={styles.tileValue} unstyled variant="price">
                {tile.value}
              </StylishText>
            </View>
          ))}
        </View>

        {/* Segments grow with their share, so an all-zero report shows an empty
            track rather than a missing bar. */}
        <View style={styles.bar}>
          {shares.map((status, index) => (
            <View
              key={status.label}
              style={{
                backgroundColor: statusColour(index),
                flexGrow: status.count,
              }}
            />
          ))}
        </View>

        <View style={[styles.legend, compact && styles.legendCompact]}>
          {shares.map((status, index) => (
            <View key={status.label} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: statusColour(index) },
                ]}
              />
              <StylishText
                numberOfLines={1}
                style={styles.legendLabel}
                unstyled
                variant="caption"
              >
                {status.label}
              </StylishText>
              <StylishText
                style={styles.legendCount}
                unstyled
                variant="caption"
              >
                {formatCount(status.count)}
              </StylishText>
            </View>
          ))}
        </View>
      </View>
    </DashboardCard>
  );
}

/** Existing feedback tokens only; the sequence tracks the order lifecycle. */
function statusColour(index: number) {
  return [
    colors.brand.primary,
    colors.feedback.info,
    colors.brand.blue,
    colors.feedback.warning,
    colors.feedback.rating,
    colors.feedback.success,
    colors.neutral[400],
  ][index % 7];
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.neutral[150],
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    height: 10,
    overflow: "hidden",
  },
  body: { gap: spacing.md, padding: spacing.lg },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  legendCompact: { gap: spacing.xs },
  legendCount: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    lineHeight: 16,
  },
  legendDot: {
    borderRadius: borderRadius.pill,
    flexShrink: 0,
    height: 8,
    width: 8,
  },
  legendItem: { alignItems: "center", flexDirection: "row", gap: spacing.xxs },
  legendLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  notice: {
    alignItems: "center",
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  noticeText: {
    color: colors.feedback.info,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  pairedGrid: { flexDirection: "row", gap: spacing.lg },
  stackedGrid: { flexDirection: "column" },
  tile: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xxs,
    padding: spacing.sm,
  },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tileLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  tileValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
});
