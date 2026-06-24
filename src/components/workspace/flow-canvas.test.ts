import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeAutoLayout,
  FlowCanvas,
  type FlowCanvasProps,
} from "@/components/workspace/flow-canvas";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import type { Screen, ScreenState, SpecDocument } from "@/lib/spec/schema";

type ReactFlowProps = {
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  onNodesChange?: (changes: unknown[]) => void;
  onNodeDragStop?: (event: unknown, node: ReactFlowProps["nodes"][number]) => void;
};

let latestReactFlowProps: ReactFlowProps | undefined;
const fitView = vi.fn();

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    ReactFlowProvider: ({ children }: { children: unknown }) => children,
    ReactFlow: (props: ReactFlowProps) => {
      latestReactFlowProps = props;
      return createElement(
        "div",
        { "data-testid": "react-flow" },
        props.nodes.map((node) =>
          createElement("span", {
            key: node.id,
            "data-testid": `node-${node.id}`,
            "data-x": node.position.x,
            "data-y": node.position.y,
          }),
        ),
      );
    },
    useReactFlow: () => ({
      fitView,
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomTo: vi.fn(),
    }),
    useViewport: () => ({ zoom: 1 }),
  };
});

function makeScreen(id: string, nextIds: string[] = []): Screen {
  return {
    id,
    name: id,
    description: "",
    entryConditions: [],
    primaryActions: [],
    requiredData: [],
    nextScreenIds: nextIds,
    cta: "",
    qaCriteria: [],
    evidence: {
      type: "original",
      reviewStatus: "confirmed",
      sourceId: "s1",
      sourceExcerpt: "x",
      rationale: null,
    },
    position: { x: 0, y: 0 },
  };
}

function makeState(id: string, screenId: string): ScreenState {
  return {
    id,
    screenId,
    name: id,
    kind: "default",
    description: "",
    evidence: {
      type: "original",
      reviewStatus: "confirmed",
      sourceId: "s1",
      sourceExcerpt: "x",
      rationale: null,
    },
  };
}

function makeDocument(
  screens: Screen[] = [makeScreen("a")],
  states: ScreenState[] = [],
): SpecDocument {
  return {
    ...structuredClone(demoSpecDocument),
    screens,
    states,
  };
}

function renderFlow(overrides: Partial<FlowCanvasProps> = {}) {
  const props: FlowCanvasProps = {
    document: makeDocument(),
    selectedScreenId: "a",
    onSelect: vi.fn(),
    ...overrides,
  };
  return render(createElement(FlowCanvas, props));
}

describe("computeAutoLayout", () => {
  it("returns empty object for an empty graph", () => {
    expect(computeAutoLayout([], [])).toEqual({});
  });

  it("assigns later layers to downstream screens", () => {
    const screens = [
      makeScreen("a", ["b"]),
      makeScreen("b", ["c"]),
      makeScreen("c"),
    ];
    const result = computeAutoLayout(screens, []);

    expect(result.a.x).toBeLessThan(result.b.x);
    expect(result.b.x).toBeLessThan(result.c.x);
  });

  it("includes state nodes in the layout", () => {
    const result = computeAutoLayout(
      [makeScreen("screen")],
      [makeState("loading", "screen"), makeState("error", "screen")],
    );

    expect(Object.keys(result).sort()).toEqual(["error", "loading", "screen"]);
  });

  it("is deterministic for cycles, branches, and orphan screens", () => {
    const screens = [
      makeScreen("orphan"),
      makeScreen("b", ["a", "leaf"]),
      makeScreen("a", ["b", "leaf"]),
      makeScreen("leaf"),
    ];
    const states = [makeState("a-error", "a"), makeState("orphan-empty", "orphan")];

    expect(computeAutoLayout(screens, states)).toEqual(
      computeAutoLayout([...screens].reverse(), [...states].reverse()),
    );
  });

  it("does not overlap screen or state nodes", () => {
    const screens = [
      makeScreen("root", ["left", "right"]),
      makeScreen("left", ["root"]),
      makeScreen("right"),
      makeScreen("orphan"),
    ];
    const states = [
      makeState("root-loading", "root"),
      makeState("root-error", "root"),
      makeState("right-empty", "right"),
    ];
    const positions = computeAutoLayout(screens, states);
    const boxes = [
      ...screens.map((item) => ({ id: item.id, width: 180, height: 92 })),
      ...states.map((item) => ({ id: item.id, width: 138, height: 70 })),
    ];

    for (let index = 0; index < boxes.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < boxes.length; otherIndex += 1) {
        const a = boxes[index];
        const b = boxes[otherIndex];
        const aPos = positions[a.id];
        const bPos = positions[b.id];
        const overlaps =
          aPos.x < bPos.x + b.width &&
          aPos.x + a.width > bPos.x &&
          aPos.y < bPos.y + b.height &&
          aPos.y + a.height > bPos.y;

        expect(overlaps, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });
});

describe("FlowCanvas", () => {
  beforeEach(() => {
    latestReactFlowProps = undefined;
    fitView.mockClear();
  });

  it("updates controlled node positions live and persists only on drag stop", () => {
    const onPositionUpdate = vi.fn();
    renderFlow({ onPositionUpdate });

    act(() => {
      latestReactFlowProps?.onNodesChange?.([
        {
          id: "a",
          type: "position",
          position: { x: 80, y: 120 },
          dragging: true,
        },
      ]);
    });

    expect(screen.getByTestId("node-a")).toHaveAttribute("data-x", "80");
    expect(screen.getByTestId("node-a")).toHaveAttribute("data-y", "120");
    expect(onPositionUpdate).not.toHaveBeenCalled();

    act(() => {
      const node = latestReactFlowProps?.nodes.find((candidate) => candidate.id === "a");
      if (node) latestReactFlowProps?.onNodeDragStop?.({}, node);
    });

    expect(onPositionUpdate).toHaveBeenCalledTimes(1);
    expect(onPositionUpdate).toHaveBeenCalledWith("a", { x: 80, y: 120 }, "screen");
  });

  it("uses a saved state-node position after remounting", () => {
    const state = {
      ...makeState("loading", "a"),
      position: { x: 320, y: 180 },
    };
    renderFlow({ document: makeDocument([makeScreen("a")], [state]) });

    expect(screen.getByTestId("node-loading")).toHaveAttribute("data-x", "320");
    expect(screen.getByTestId("node-loading")).toHaveAttribute("data-y", "180");
  });

  it("auto-layouts screens and states, then fits the updated graph", async () => {
    const onAutoLayout = vi.fn();
    renderFlow({
      document: makeDocument(
        [makeScreen("a", ["b"]), makeScreen("b")],
        [makeState("a-error", "a")],
      ),
      onAutoLayout,
    });

    fireEvent.click(screen.getByRole("button", { name: "자동 정렬" }));

    expect(onAutoLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        a: expect.any(Object),
        b: expect.any(Object),
        "a-error": expect.any(Object),
      }),
    );
    await waitFor(() => expect(fitView).toHaveBeenCalled());
  });

  it("clears the local layout when the visible undo button is used", () => {
    const onUndoLayout = vi.fn();
    const document = makeDocument();
    const props: FlowCanvasProps = {
      document,
      selectedScreenId: "a",
      onSelect: vi.fn(),
      onAutoLayout: vi.fn(),
      onUndoLayout,
    };
    const view = render(createElement(FlowCanvas, props));

    fireEvent.click(screen.getByRole("button", { name: "자동 정렬" }));
    expect(screen.getByTestId("node-a")).toHaveAttribute("data-x", "48");

    fireEvent.click(screen.getByRole("button", { name: "자동 정렬 실행 취소" }));
    view.rerender(
      createElement(FlowCanvas, {
        ...props,
        document: structuredClone(document),
      }),
    );

    expect(onUndoLayout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("node-a")).toHaveAttribute("data-x", "0");
  });

  it("provides keyboard-operable alternatives for moving the selected screen", () => {
    const onPositionUpdate = vi.fn();
    renderFlow({ onPositionUpdate });

    fireEvent.click(
      screen.getByRole("button", { name: "선택 화면 오른쪽으로 이동" }),
    );

    expect(screen.getByTestId("node-a")).toHaveAttribute("data-x", "24");
    expect(onPositionUpdate).toHaveBeenCalledWith("a", { x: 24, y: 0 }, "screen");
  });
});
