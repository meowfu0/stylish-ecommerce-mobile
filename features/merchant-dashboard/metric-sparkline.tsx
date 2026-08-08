import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/constants/design-tokens";
import { DashboardLineChart } from "@/features/merchant-dashboard/dashboard-line-chart";
import { sparklineLabel } from "@/features/merchant-dashboard/metric-sparkline-model";

/**
 * Trend line for one metric card, drawn with React Native primitives.
 *
 * The web build resolves `metric-sparkline.web.tsx` instead, which draws the
 * same series with Recharts. Both share their props, colours and accessible
 * label, so the two platforms describe the trend identically.
 *
 * The box is measured rather than assumed and the series is normalized against
 * its own range, so any unit the analytics API returns — centavos, order
 * counts, percentages — plots correctly without tuning.
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
  const [size, setSize] = useState({ height: 0, width: 0 });
  const values = data.filter((value) => Number.isFinite(value));

  return (
    <View
      accessibilityLabel={sparklineLabel(values.length, positive)}
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

const styles = StyleSheet.create({
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
