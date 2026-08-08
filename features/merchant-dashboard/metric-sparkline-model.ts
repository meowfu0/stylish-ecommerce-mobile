/** Shared by both sparkline renderers so they describe a trend identically. */
export function sparklineLabel(pointCount: number, positive: boolean) {
  if (pointCount === 0) return "Trend data unavailable";
  return `${positive ? "Upward" : "Downward"} trend across ${pointCount} points`;
}

/**
 * A zero-height domain would collapse the curve onto one edge, so a flat or
 * single-point series is given room around its value. Falls back to a unit of
 * padding when the values themselves are zero.
 */
export function sparklineDomain(values: readonly number[]): [number, number] {
  if (values.length === 0) return [0, 1];

  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const spread = highest - lowest;
  const padding = spread > 0 ? spread * 0.12 : Math.abs(highest) * 0.12 || 1;

  return [lowest - padding, highest + padding];
}
