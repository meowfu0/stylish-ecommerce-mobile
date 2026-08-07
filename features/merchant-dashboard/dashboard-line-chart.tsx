import { StyleSheet, View } from "react-native";

/**
 * The dashboard's line rendering. Points are always derived from the supplied
 * values and the measured box, so a series can arrive from the analytics API
 * in any unit or range without carrying layout constants with it.
 *
 * Lines are drawn with rotated views rather than a vector library: the project
 * ships no SVG or charting dependency, and adding a native one for two line
 * charts is not warranted.
 */

export type ChartPoint = { x: number; y: number };

export const defaultCurveSamplesPerSegment = 12;

/** Fritsch-Carlson tangents, so an interpolated curve never overshoots. */
export function monotoneTangents(values: number[]) {
  if (values.length < 2) return values.map(() => 0);

  const slopes = values.slice(0, -1).map((value, index) => {
    return values[index + 1] - value;
  });
  const tangents = new Array<number>(values.length).fill(0);

  tangents[0] = slopes[0];
  tangents[tangents.length - 1] = slopes[slopes.length - 1];

  for (let index = 1; index < values.length - 1; index += 1) {
    const previous = slopes[index - 1];
    const next = slopes[index];

    tangents[index] =
      previous * next <= 0 ? 0 : (2 * previous * next) / (previous + next);
  }

  return tangents;
}

/**
 * Maps a value onto the plot box. A flat series sits on the baseline instead
 * of dividing by a zero range.
 */
export function projectValue({
  bottom,
  height,
  maximum,
  minimum,
  value,
}: {
  bottom: number;
  height: number;
  maximum: number;
  minimum: number;
  value: number;
}) {
  const range = maximum - minimum;
  if (range <= 0) return bottom - height / 2;
  return bottom - ((value - minimum) / range) * height;
}

export function buildMonotoneLinePoints({
  bottom,
  height,
  maximum,
  minimum,
  samplesPerSegment = defaultCurveSamplesPerSegment,
  values,
  width,
}: {
  bottom: number;
  height: number;
  maximum: number;
  minimum: number;
  samplesPerSegment?: number;
  values: number[];
  width: number;
}): ChartPoint[] {
  if (width <= 0 || values.length === 0) return [];

  const project = (value: number) =>
    projectValue({ bottom, height, maximum, minimum, value });

  if (values.length === 1) {
    return [
      { x: 0, y: project(values[0]) },
      { x: width, y: project(values[0]) },
    ];
  }

  const tangents = monotoneTangents(values);
  const step = width / (values.length - 1);
  const points: ChartPoint[] = [];

  for (let index = 0; index < values.length - 1; index += 1) {
    const start = values[index];
    const end = values[index + 1];
    const lowest = Math.min(start, end);
    const highest = Math.max(start, end);

    for (let sample = 0; sample < samplesPerSegment; sample += 1) {
      const progress = sample / samplesPerSegment;
      const progressSquared = progress * progress;
      const progressCubed = progressSquared * progress;
      const interpolated =
        (2 * progressCubed - 3 * progressSquared + 1) * start +
        (progressCubed - 2 * progressSquared + progress) * tangents[index] +
        (-2 * progressCubed + 3 * progressSquared) * end +
        (progressCubed - progressSquared) * tangents[index + 1];

      points.push({
        x: (index + progress) * step,
        y: project(Math.min(highest, Math.max(lowest, interpolated))),
      });
    }
  }

  points.push({ x: width, y: project(values[values.length - 1]) });

  return points;
}

export type ChartSegment = {
  angle: number;
  left: number;
  length: number;
  top: number;
};

export function toChartSegments(points: ChartPoint[]): ChartSegment[] {
  return points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const deltaX = next.x - point.x;
    const deltaY = next.y - point.y;

    return {
      angle: Math.atan2(deltaY, deltaX) * (180 / Math.PI),
      left: point.x,
      length: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
      top: point.y,
    };
  });
}

/** Derives the plotted range from the data, with optional padding. */
export function chartDomain(values: number[], padRatio = 0) {
  if (values.length === 0) return { maximum: 1, minimum: 0 };

  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const pad = (highest - lowest) * padRatio;

  return { maximum: highest + pad, minimum: lowest - pad };
}

export function DashboardLineChart({
  color,
  dashed = false,
  height,
  samplesPerSegment,
  strokeWidth = 2,
  testID,
  values,
  width,
}: {
  color: string;
  dashed?: boolean;
  height: number;
  samplesPerSegment?: number;
  strokeWidth?: number;
  testID?: string;
  values: number[];
  width: number;
}) {
  if (width <= 0 || height <= 0 || values.length === 0) return null;

  const { maximum, minimum } = chartDomain(values);
  const inset = strokeWidth / 2;
  const points = buildMonotoneLinePoints({
    bottom: height - inset,
    height: Math.max(0, height - strokeWidth),
    maximum,
    minimum,
    samplesPerSegment,
    values,
    width,
  });

  return (
    <View pointerEvents="none" style={styles.layer} testID={testID}>
      {toChartSegments(points).map((segment, index) => (
        <View
          key={`${testID ?? "line"}-${index}`}
          style={[
            styles.segment,
            { height: strokeWidth },
            dashed
              ? { borderTopColor: color, borderTopWidth: strokeWidth }
              : { backgroundColor: color },
            {
              left: segment.left,
              top: segment.top,
              transform: [{ rotate: `${segment.angle}deg` }],
              width: segment.length,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  segment: {
    position: "absolute",
    transformOrigin: "left center",
  },
});
