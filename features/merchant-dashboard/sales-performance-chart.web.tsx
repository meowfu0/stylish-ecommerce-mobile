import { useId, useState } from "react";
import { View } from "react-native";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { colors } from "@/constants/design-tokens";
import {
  formatCount,
  formatPeso,
} from "@/features/merchant-dashboard/dashboard-format";
import {
  normalizeSalesPoint,
  plotHeightFor,
} from "@/features/merchant-dashboard/sales-chart-model";
import type { SalesPoint } from "@/features/merchant-dashboard/dashboard-types";

/**
 * Web implementation of the Sales Performance plot, drawn with Recharts.
 *
 * Recharts renders DOM and SVG, so it only loads on web; `Platform`-suffixed
 * resolution sends iOS and Android to `sales-performance-chart.tsx`, which
 * draws the same series with React Native primitives. Both take the same props
 * and share `sales-chart-model` for their numbers.
 *
 * Every scale is left to Recharts to derive from the data — no fixed domain,
 * so a series larger than today's figures gets a taller axis, never a clipped
 * line.
 */

const AXIS_TICK = { fill: colors.neutral[550], fontSize: 12 };
const GRID_STROKE = colors.neutral[200];

type TooltipEntry = { dataKey?: string | number; value?: number };

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;

  // Read by key rather than by position: Recharts orders entries by render
  // order, and a missing series must show zero rather than another's value.
  const read = (key: string) =>
    payload.find((entry) => entry.dataKey === key)?.value ?? 0;

  return (
    <div
      style={{
        background: colors.neutral[0],
        border: `1px solid ${colors.neutral[200]}`,
        borderRadius: 10,
        boxShadow: "0 16px 40px -24px rgba(17,34,59,0.5)",
        minWidth: 168,
        padding: "10px 12px",
      }}
    >
      <p
        style={{
          color: colors.ink.primary,
          fontFamily: "Montserrat_600SemiBold",
          fontSize: 12,
          lineHeight: "18px",
          margin: "0 0 4px",
        }}
      >
        {label}
      </p>
      <TooltipRow label="Revenue" value={formatPeso(read("revenue"))} />
      <TooltipRow label="Orders" value={formatCount(read("orders"))} />
      <TooltipRow label="Refunds" value={formatPeso(read("refunds"))} />
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <p
      style={{
        color: colors.neutral[550],
        display: "flex",
        fontFamily: "Montserrat_400Regular",
        fontSize: 12,
        gap: 16,
        justifyContent: "space-between",
        lineHeight: "18px",
        margin: 0,
      }}
    >
      <span>{label}</span>
      <span style={{ color: colors.ink.primary }}>{value}</span>
    </p>
  );
}

export function SalesPerformanceChart({
  accessibilityLabel,
  points: rawPoints,
  testID,
}: {
  accessibilityLabel: string;
  points: SalesPoint[];
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  // Gradients live in the SVG document, so two charts on one page would collide
  // on a shared literal id.
  const gradientId = `velori-revenue-fill-${useId().replace(/:/g, "")}`;
  const points = rawPoints.map(normalizeSalesPoint);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      accessible
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      // The topmost axis tick is centred on the plot's top edge, so a little
      // headroom keeps it clear of the legend above.
      style={{ height: plotHeightFor(width), marginTop: 8, width: "100%" }}
      testID={testID}
    >
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart
          data={points}
          margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor={colors.brand.primary}
                stopOpacity={0.22}
              />
              <stop
                offset="100%"
                stopColor={colors.brand.primary}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          {/* Recharts keeps the first and last label and drops any in between
              that cannot hold the gap, so a narrow card thins its dates
              instead of running them together. */}
          <XAxis
            axisLine={{ stroke: GRID_STROKE }}
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={24}
            tick={AXIS_TICK}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(value: number) =>
              formatPeso(value, { compact: true })
            }
            tickLine={false}
            width={width < 420 ? 52 : 68}
            yAxisId="money"
          />
          <YAxis
            axisLine={false}
            orientation="right"
            tick={AXIS_TICK}
            tickFormatter={(value: number) => formatCount(value)}
            tickLine={false}
            width={width < 420 ? 30 : 42}
            yAxisId="count"
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: GRID_STROKE }}
          />

          <Area
            activeDot={{ r: 4, strokeWidth: 0 }}
            dataKey="revenue"
            dot={false}
            fill={`url(#${gradientId})`}
            stroke={colors.brand.primary}
            strokeWidth={2.5}
            type="monotone"
            yAxisId="money"
          />
          <Line
            dataKey="refunds"
            dot={false}
            stroke={colors.neutral[400]}
            strokeDasharray="5 4"
            strokeWidth={2}
            type="monotone"
            yAxisId="money"
          />
          <Line
            dataKey="orders"
            dot={{ fill: colors.brand.blue, r: 2.5, strokeWidth: 0 }}
            stroke={colors.brand.blue}
            strokeWidth={2}
            type="monotone"
            yAxisId="count"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </View>
  );
}
