"use client";

import { useMemo } from "react";
import {
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
} from "@xyflow/react";
import {
  ArrowsOut,
  Briefcase,
  CaretDown,
  CaretUp,
  Equals,
  Minus,
  Plus,
  TreeStructure,
} from "@phosphor-icons/react";
import type { Screen, ScreenState, SpecDocument } from "@/lib/spec/schema";

export function computeAutoLayout(
  screens: Screen[],
  _states: ScreenState[],
): Record<string, { x: number; y: number }> {
  if (screens.length === 0) return {};

  const NODE_W = 170;
  const NODE_H = 90;
  const H_GAP = 80;
  const V_GAP = 50;

  const outgoing = new Map<string, string[]>();
  const incomingCount = new Map<string, number>(screens.map((s) => [s.id, 0]));

  for (const screen of screens) {
    const nexts = screen.nextScreenIds.filter((id) => screens.some((s) => s.id === id));
    outgoing.set(screen.id, nexts);
  }
  for (const screen of screens) {
    for (const nextId of (outgoing.get(screen.id) ?? [])) {
      incomingCount.set(nextId, (incomingCount.get(nextId) ?? 0) + 1);
    }
  }

  const layer = new Map<string, number>();
  const queue: string[] = [];

  for (const screen of screens) {
    if ((incomingCount.get(screen.id) ?? 0) === 0) {
      queue.push(screen.id);
      layer.set(screen.id, 0);
    }
  }

  let qi = 0;
  while (qi < queue.length) {
    const id = queue[qi++];
    const l = layer.get(id) ?? 0;
    for (const nextId of (outgoing.get(id) ?? [])) {
      if ((layer.get(nextId) ?? -1) < l + 1) {
        layer.set(nextId, l + 1);
        queue.push(nextId);
      }
    }
  }

  let maxLayer = 0;
  for (const screen of screens) {
    if (!layer.has(screen.id)) {
      layer.set(screen.id, ++maxLayer);
    } else {
      maxLayer = Math.max(maxLayer, layer.get(screen.id)!);
    }
  }

  const byLayer = new Map<number, string[]>();
  for (const [id, l] of layer) {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const [l, ids] of byLayer) {
    const x = l * (NODE_W + H_GAP) + 60;
    const totalH = ids.length * NODE_H + (ids.length - 1) * V_GAP;
    const startY = -totalH / 2 + 300;
    ids.forEach((id, i) => {
      positions[id] = { x, y: startY + i * (NODE_H + V_GAP) };
    });
  }

  return positions;
}

function ZoomControls({
  onFitView,
}: {
  onFitView: () => void;
}) {
  const flow = useReactFlow();
  const { zoom } = useViewport();

  return (
    <div className="zoom-pill" aria-label="캔버스 확대 축소">
      <button aria-label="축소" onClick={() => flow.zoomOut()}>
        <Minus size={14} />
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button aria-label="확대" onClick={() => flow.zoomIn()}>
        <Plus size={14} />
      </button>
      <button aria-label="100%" title="실제 크기 (100%)" onClick={() => flow.zoomTo(1)}>
        <Equals size={12} />
      </button>
      <button aria-label="전체 맞춤" title="전체 화면 맞춤" onClick={onFitView}>
        <ArrowsOut size={14} />
      </button>
    </div>
  );
}

function FlowBoard({
  document,
  selectedScreenId,
  onSelect,
  onPositionUpdate,
  collapsed,
  onToggleCollapse,
  onRecompile,
  onAutoLayout,
}: {
  document: SpecDocument;
  selectedScreenId: string;
  onSelect: (id: string) => void;
  onPositionUpdate?: (screenId: string, pos: { x: number; y: number }) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onRecompile?: () => void;
  onAutoLayout?: () => void;
}) {
  const flow = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const screenNodes: Node[] = document.screens.map((screen) => ({
      id: screen.id,
      position: screen.position,
      className: `screen-node ${selectedScreenId === screen.id ? "selected" : ""}`,
      data: {
        screenId: screen.id,
        label: (
          <>
            <strong>{screen.name}</strong>
            <span>{screen.description}</span>
            <div className="node-meta">
              <Briefcase size={13} />
              {document.states.filter((state) => state.screenId === screen.id).length || 1}
            </div>
          </>
        ),
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    const stateNodes: Node[] = document.states.map((state) => {
      const siblings = document.states.filter(
        (candidate) => candidate.screenId === state.screenId,
      );
      const siblingIndex = siblings.findIndex((candidate) => candidate.id === state.id);
      const isPrimarySelectedState =
        selectedScreenId === state.screenId && siblingIndex === 0;
      return {
        id: state.id,
        position: statePosition(state, siblingIndex, document.screens),
        className: `state-node ${isPrimarySelectedState ? "selected" : ""}`,
        data: {
          screenId: state.screenId,
          label: (
            <>
              <strong>{state.name}</strong>
              <span>{state.description}</span>
            </>
          ),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const screenEdges: Edge[] = document.screens.flatMap((screen) =>
      screen.nextScreenIds.map((nextId) => ({
        id: `${screen.id}-${nextId}`,
        source: screen.id,
        target: nextId,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#879399" },
        style: { stroke: "#879399", strokeWidth: 1.2 },
      })),
    );
    const stateEdges: Edge[] = document.states.map((state) => ({
      id: `${state.screenId}-${state.id}`,
      source: state.screenId,
      target: state.id,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#aab3b7" },
      style: { stroke: "#aab3b7", strokeWidth: 1 },
    }));

    return { nodes: [...screenNodes, ...stateNodes], edges: [...screenEdges, ...stateEdges] };
  }, [document, selectedScreenId]);

  function handleFitView() {
    flow.fitView({ padding: 0.25, duration: 300 });
  }

  return (
    <div className="flow-section">
      <div className="flow-toolbar">
        <h2>화면 흐름도</h2>
        <div className="flow-toolbar-right">
          {!collapsed && (
            <>
              {onAutoLayout && (
                <button
                  className="button button--sm"
                  title="왼쪽→오른쪽 자동 정렬"
                  onClick={onAutoLayout}
                >
                  <TreeStructure size={14} />
                  자동 정렬
                </button>
              )}
              <ZoomControls onFitView={handleFitView} />
            </>
          )}
          {onToggleCollapse && (
            <button
              className="canvas-toggle-btn"
              aria-label={collapsed ? "캔버스 펼치기" : "캔버스 접기"}
              onClick={onToggleCollapse}
            >
              {collapsed ? <CaretDown size={14} /> : <CaretUp size={14} />}
            </button>
          )}
        </div>
      </div>
      {nodes.length === 0 ? (
        <div className="canvas-empty">
          <p>화면이 없어요.</p>
          {onRecompile && (
            <button className="button" onClick={onRecompile}>
              다시 정리하기
            </button>
          )}
        </div>
      ) : null}
      <div className={`flow-canvas${nodes.length === 0 ? " flow-canvas--hidden" : ""}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => {
            const screenId = node.data.screenId;
            if (typeof screenId === "string") onSelect(screenId);
          }}
          onNodeDragStop={(_, node) => {
            const screenId = node.data.screenId;
            if (typeof screenId === "string") {
              onPositionUpdate?.(screenId, node.position);
            }
          }}
          proOptions={{ hideAttribution: true }}
        />
      </div>
    </div>
  );
}

function statePosition(state: ScreenState, siblingIndex: number, screens: Screen[]) {
  const parent = screens.find((screen) => screen.id === state.screenId);
  return {
    x: (parent?.position.x ?? 130) + 245,
    y: (parent?.position.y ?? 170) - 145 + Math.max(0, siblingIndex) * 92,
  };
}

export function FlowCanvas(props: Parameters<typeof FlowBoard>[0]) {
  return (
    <ReactFlowProvider>
      <FlowBoard {...props} />
    </ReactFlowProvider>
  );
}
