import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import {
  gridItemWidth,
  resolveGridColumns,
} from "@/features/merchant-dashboard/dashboard-grid";
import {
  OrderPipeline,
  pipelineTotal,
} from "@/features/merchant-dashboard/dashboard-overview-sections";
import { pipelineStages } from "@/features/merchant-dashboard/dashboard-data";
import type { PipelineStage } from "@/features/merchant-dashboard/dashboard-types";

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const twoStages: PipelineStage[] = [
  { count: 4, key: "new", label: "New", tone: "pink" },
  { count: 1, key: "cancelled", label: "Cancelled", tone: "neutral" },
];

function layoutGrid(screen: ReturnType<typeof render>, width: number) {
  fireEvent(screen.getByTestId("dashboard-order-pipeline-grid"), "layout", {
    nativeEvent: { layout: { height: 96, width, x: 0, y: 0 } },
  });
}

function stageWidth(screen: ReturnType<typeof render>, key: string) {
  return StyleSheet.flatten(
    screen.getByTestId(`pipeline-stage-${key}`).props.style,
  ).flexBasis as number;
}

describe("order pipeline layout", () => {
  it("fills the measured row instead of leaving dead space", () => {
    const screen = render(<OrderPipeline />);
    layoutGrid(screen, 1180);

    // Seven stages, six 8px gaps -> (1180 - 48) / 7 = 161.71 each.
    const width = stageWidth(screen, "new");
    expect(width).toBeCloseTo((1180 - 8 * 6) / 7);
    // Every stage shares the same width, so the row ends flush.
    pipelineStages.forEach((stage) => {
      expect(stageWidth(screen, stage.key)).toBeCloseTo(width);
    });
    expect(width * 7 + 8 * 6).toBeCloseTo(1180);
  });

  it("keeps seven on one row only while they stay readable", () => {
    const columnsAt = (rowWidth: number) =>
      resolveGridColumns({ count: 7, gap: 8, minItemWidth: 112, rowWidth });

    expect(columnsAt(1180)).toBe(7);
    expect(columnsAt(840)).toBe(7);
    // Five would fit, but 4 + 3 wraps more evenly than 5 + 2.
    expect(columnsAt(720)).toBe(4);
    expect(columnsAt(480)).toBe(4);
    expect(columnsAt(360)).toBe(3);
    expect(columnsAt(240)).toBe(2);
    expect(columnsAt(180)).toBe(1);
  });

  it("never returns a width that overflows its row", () => {
    [1180, 840, 720, 480, 360, 240, 180].forEach((rowWidth) => {
      const columns = resolveGridColumns({
        count: 7,
        gap: 8,
        minItemWidth: 112,
        rowWidth,
      });
      const width = gridItemWidth({ columns, gap: 8, rowWidth }) as number;

      expect(width).toBeGreaterThan(0);
      expect(width * columns + 8 * (columns - 1)).toBeCloseTo(rowWidth);
    });
  });

  it("uses no width before the row has been measured", () => {
    const screen = render(<OrderPipeline />);

    expect(
      StyleSheet.flatten(screen.getByTestId("pipeline-stage-new").props.style)
        .flexBasis,
    ).toBeUndefined();
  });
});

describe("order pipeline data", () => {
  it("sums the range total from the stage counts", () => {
    expect(pipelineTotal(pipelineStages)).toBe(318);
    expect(pipelineTotal(twoStages)).toBe(5);
    expect(pipelineTotal([])).toBe(0);
  });

  it("renders the stages it is handed and derives their total", () => {
    const screen = render(<OrderPipeline stages={twoStages} />);

    expect(screen.getByText("5 orders in the current range")).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.queryByText("Processing")).toBeNull();
  });

  it("keeps the total in step with the counts rather than hardcoding it", () => {
    const screen = render(<OrderPipeline />);

    expect(screen.getByText("318 orders in the current range")).toBeTruthy();
    expect(screen.getByText("Ready to Ship")).toBeTruthy();
  });

  it("singularizes a one-order range", () => {
    const screen = render(
      <OrderPipeline
        stages={[{ count: 1, key: "new", label: "New", tone: "pink" }]}
      />,
    );

    expect(screen.getByText("1 order in the current range")).toBeTruthy();
  });

  it("navigates when View All Orders is pressed", () => {
    const onViewAllOrders = jest.fn();
    const screen = render(
      <OrderPipeline onViewAllOrders={onViewAllOrders} stages={twoStages} />,
    );

    fireEvent.press(screen.getByText("View All Orders"));
    expect(onViewAllOrders).toHaveBeenCalledTimes(1);
  });
});
