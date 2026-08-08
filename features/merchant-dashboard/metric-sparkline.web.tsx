import { useId } from "react";
import { StyleSheet, View } from "react-native";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

import { colors } from "@/constants/design-tokens";
import {
  sparklineDomain,
  sparklineLabel,
} from "@/features/merchant-dashboard/metric-sparkline-model";

/**
 * Web trend line for one metric card, drawn with Recharts.
 *
 * Native resolves `metric-sparkline.tsx`, which draws the same series with
 * React Native primitives because Recharts emits DOM and SVG. Both take the
 * same props and share `metric-sparkline-model`, so the curve and its
 * accessible description agree across platforms.
 *
 * Geometry comes entirely from the supplied array — no fixed coordinates and
 * no fixed pixel size, so the curve reprojects itself onto whatever box the
 * card gives it.
 */
export function MetricSparkline({
  data,
  metricKey,
  positive,
}: {
  data: readonly number[];
  metricKey: string;
  positive: boolean;
}) {
  const values = data.filter((value) => Number.isFinite(value));
  const color = positive ? colors.feedback.success : colors.feedback.danger;
  // A lone reading has no segment to stroke, so Recharts would draw an empty
  // box. Repeating it renders the flat line the native chart already draws.
  const series = values.length === 1 ? [values[0], values[0]] : values;
  // Gradients live in the SVG document, so four cards on one row would collide
  // on a shared literal id.
  const gradientId = `velori-spark-${metricKey}-${useId().replace(/:/g, "")}`;

  return (
    <View
      accessibilityLabel={sparklineLabel(values.length, positive)}
      accessibilityRole="image"
      style={styles.sparkline}
      testID={`metric-sparkline-${metricKey}`}
    >
      {values.length > 0 ? (
        <View style={styles.fill} testID={`metric-sparkline-line-${metricKey}`}>
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart
              data={series.map((value, index) => ({ index, value }))}
              // Half the stroke on each edge, so the curve is never clipped
              // where it touches the top or bottom of its domain.
              margin={{ bottom: 2, left: 0, right: 0, top: 2 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={sparklineDomain(values)} hide />
              <Area
                dataKey="value"
                dot={false}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                stroke={color}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { height: "100%", width: "100%" },
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
});
