import { useState } from "react";
import type { LayoutChangeEvent, ViewStyle } from "react-native";

/**
 * Shared wrapping-grid maths for the dashboard's tile rows. Columns come from
 * how many items actually fit at their minimum readable width, so a row needs
 * no hand-tuned screen breakpoints and never carries a width from the design.
 */

export type GridInput = {
  count: number;
  gap: number;
  minItemWidth: number;
  rowWidth: number;
};

/**
 * Packs as many items per row as fit, then evens out the rows so a trailing
 * row is never left with a single stranded tile (seven items become 4 + 3
 * rather than 5 + 2).
 */
export function resolveGridColumns({
  count,
  gap,
  minItemWidth,
  rowWidth,
}: GridInput) {
  if (count <= 0) return 1;
  // Before measurement, assume one row; the first layout pass corrects it.
  if (rowWidth <= 0) return count;

  const fits = Math.floor((rowWidth + gap) / (minItemWidth + gap));
  const columns = Math.max(1, Math.min(count, fits));
  const rows = Math.ceil(count / columns);

  return Math.ceil(count / rows);
}

/** Divides the measured row, minus its gaps, into equal columns. */
export function gridItemWidth({
  columns,
  gap,
  rowWidth,
}: {
  columns: number;
  gap: number;
  rowWidth: number;
}) {
  if (rowWidth <= 0 || columns <= 0) return undefined;
  return (rowWidth - gap * (columns - 1)) / columns;
}

export type ResponsiveGrid = {
  columns: number;
  itemStyle: ViewStyle | undefined;
  onLayout: (event: LayoutChangeEvent) => void;
  rowWidth: number;
};

export function useResponsiveGrid({
  count,
  gap,
  minItemWidth,
}: Omit<GridInput, "rowWidth">): ResponsiveGrid {
  const [rowWidth, setRowWidth] = useState(0);
  const columns = resolveGridColumns({ count, gap, minItemWidth, rowWidth });
  const itemWidth = gridItemWidth({ columns, gap, rowWidth });

  return {
    columns,
    itemStyle:
      itemWidth === undefined
        ? undefined
        : { flexBasis: itemWidth, flexGrow: 0, maxWidth: itemWidth },
    onLayout: (event) => setRowWidth(event.nativeEvent.layout.width),
    rowWidth,
  };
}
