"use client";

import dagre from "dagre";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
  type OnNodesChange,
} from "@xyflow/react";
import {
  ArrowCounterClockwise,
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

const SCREEN_W = 180;
const SCREEN_H = 92;
const STATE_W = 138;
const STATE_H = 70;
const KEYBOARD_MOVE_STEP = 24;

type FlowPosition = { x: number; y: number };
type FlowPositions = Record<string, FlowPosition>;
type FlowNodeData = {
  screenId: string;
  nodeType: "screen" | "state";
  label: React.ReactNode;
};
type FlowNode = Node<FlowNodeData>;

export interface FlowCanvasProps {
  document: SpecDocument;
  selectedScreenId: string;
  onSelect: (id: string) => void;
  onPositionUpdate?: (id: string, position: FlowPosition, nodeType: "screen" | "state") => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onRecompile?: () => void;
  onAutoLayout?: (positions: FlowPositions) => void;
  onUndoLayout?: () => void;
}

export function computeAutoLayout(
  screens: Screen[],
  states: ScreenState[] = [],
): FlowPositions {
  if (screens.length === 0 && states.length === 0) return {};

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "LR",
    nodesep: 80,
    ranksep: 160,
    marginx: 48,
    marginy: 48,
    acyclicer: "greedy",
  });

  const sortedScreens = [...screens].sort((a, b) => a.id.localeCompare(b.id));
  const sortedStates = [...states].sort((a, b) => a.id.localeCompare(b.id));
  const screenKeys = new Map(
    sortedScreens.map((screen) => [screen.id, `screen:${screen.id}`]),
  );

  for (const screen of sortedScreens) {
    graph.setNode(`screen:${screen.id}`, {
      id: screen.id,
      width: SCREEN_W,
      height: SCREEN_H,
    });
  }

  for (const state of sortedStates) {
    graph.setNode(`state:${state.id}`, {
      id: state.id,
      width: STATE_W,
      height: STATE_H,
    });
  }

  const screenEdges = sortedScreens
    .flatMap((screen) =>
      screen.nextScreenIds
        .filter((nextId) => screenKeys.has(nextId))
        .map((nextId) => [`screen:${screen.id}`, `screen:${nextId}`] as const),
    )
    .sort(([sourceA, targetA], [sourceB, targetB]) =>
      `${sourceA}:${targetA}`.localeCompare(`${sourceB}:${targetB}`),
    );
  const stateEdges = sortedStates
    .filter((state) => screenKeys.has(state.screenId))
    .map(
      (state) =>
        [`screen:${state.screenId}`, `state:${state.id}`] as const,
    )
    .sort(([sourceA, targetA], [sourceB, targetB]) =>
      `${sourceA}:${targetA}`.localeCompare(`${sourceB}:${targetB}`),
    );

  for (const [source, target] of [...screenEdges, ...stateEdges]) {
    graph.setEdge(source, target);
  }

  dagre.layout(graph);

  const positions: FlowPositions = {};
  for (const key of graph.nodes().sort()) {
    const layoutNode = graph.node(key) as {
      id: string;
      width: number;
      height: number;
      x: number;
      y: number;
    };
    positions[layoutNode.id] = {
      x: layoutNode.x - layoutNode.width / 2,
      y: layoutNode.y - layoutNode.height / 2,
    };
  }

  return positions;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ZoomControls({ onFitView }: { onFitView: () => void }) {
  const flow = useReactFlow();
  const { zoom } = useViewport();

  return (
    <div className="zoom-pill" aria-label="캔버스 확대 축소">
      <button type="button" aria-label="축소" onClick={() => flow.zoomOut()}>
        <Minus size={14} />
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="확대" onClick={() => flow.zoomIn()}>
        <Plus size={14} />
      </button>
      <button
        type="button"
        aria-label="100%"
        title="실제 크기 (100%)"
        onClick={() => flow.zoomTo(1)}
      >
        <Equals size={12} />
      </button>
      <button
        type="button"
        aria-label="전체 맞춤"
        title="전체 화면 맞춤"
        onClick={onFitView}
      >
        <ArrowsOut size={14} />
      </button>
    </div>
  );
}

function createFlowNodes(
  document: SpecDocument,
  selectedScreenId: string,
  positionOverrides: FlowPositions = {},
): FlowNode[] {
  const stateCountByScreen = new Map<string, number>();
  for (const state of document.states) {
    stateCountByScreen.set(
      state.screenId,
      (stateCountByScreen.get(state.screenId) ?? 0) + 1,
    );
  }

  const screenNodes: FlowNode[] = document.screens.map((screen) => ({
    id: screen.id,
    position: positionOverrides[screen.id] ?? screen.position,
    className: `screen-node ${selectedScreenId === screen.id ? "selected" : ""}`,
    ariaLabel: `${screen.name} 화면. 방향 버튼으로 위치를 이동할 수 있습니다.`,
    data: {
      screenId: screen.id,
      nodeType: "screen",
      label: (
        <>
          <strong>{screen.name}</strong>
          <span>{screen.description}</span>
          <div className="node-meta">
            <Briefcase size={13} />
            {stateCountByScreen.get(screen.id) ?? 1}
          </div>
        </>
      ),
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const statesByScreen = new Map<string, ScreenState[]>();
  for (const state of document.states) {
    const siblings = statesByScreen.get(state.screenId) ?? [];
    siblings.push(state);
    statesByScreen.set(state.screenId, siblings);
  }
  for (const siblings of statesByScreen.values()) {
    siblings.sort((a, b) => a.id.localeCompare(b.id));
  }

  const stateNodes: FlowNode[] = document.states.map((state) => {
    const siblings = statesByScreen.get(state.screenId) ?? [];
    const siblingIndex = siblings.findIndex((candidate) => candidate.id === state.id);
    const isPrimarySelectedState =
      selectedScreenId === state.screenId && siblingIndex === 0;

    return {
      id: state.id,
      position:
        positionOverrides[state.id] ??
        state.position ??
        statePosition(state, siblingIndex, document.screens),
      className: `state-node ${isPrimarySelectedState ? "selected" : ""}`,
      ariaLabel: `${state.name} 상태. 방향 버튼으로 위치를 이동할 수 있습니다.`,
      data: {
        screenId: state.screenId,
        nodeType: "state",
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

  return [...screenNodes, ...stateNodes];
}

function createFlowEdges(document: SpecDocument): Edge[] {
  const screenIds = new Set(document.screens.map((screen) => screen.id));
  const screenEdges: Edge[] = document.screens.flatMap((screen) =>
    screen.nextScreenIds
      .filter((nextId) => screenIds.has(nextId))
      .map((nextId) => ({
        id: `${screen.id}-${nextId}`,
        source: screen.id,
        target: nextId,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#879399" },
        style: { stroke: "#879399", strokeWidth: 1.2 },
      })),
  );
  const stateEdges: Edge[] = document.states
    .filter((state) => screenIds.has(state.screenId))
    .map((state) => ({
      id: `${state.screenId}-${state.id}`,
      source: state.screenId,
      target: state.id,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#aab3b7" },
      style: { stroke: "#aab3b7", strokeWidth: 1 },
    }));

  return [...screenEdges, ...stateEdges];
}

function documentNodeSignature(document: SpecDocument) {
  return [
    ...document.screens.map((screen) => `screen:${screen.id}`),
    ...document.states.map((state) => `state:${state.id}:${state.screenId}`),
  ]
    .sort()
    .join("|");
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
  onUndoLayout,
}: FlowCanvasProps) {
  const flow = useReactFlow();
  const layoutPositionsRef = useRef<FlowPositions>({});
  const signatureRef = useRef(documentNodeSignature(document));
  const draggingRef = useRef(false);
  const [nodes, setNodes] = useState<FlowNode[]>(() =>
    createFlowNodes(document, selectedScreenId),
  );
  const [fitRequest, setFitRequest] = useState(0);
  const edges = useMemo(() => createFlowEdges(document), [document]);

  useEffect(() => {
    if (draggingRef.current) return;
    const nextSignature = documentNodeSignature(document);
    if (signatureRef.current !== nextSignature) {
      signatureRef.current = nextSignature;
      layoutPositionsRef.current = {};
    }
    setNodes(
      createFlowNodes(
        document,
        selectedScreenId,
        layoutPositionsRef.current,
      ),
    );
  }, [document, selectedScreenId]);

  useEffect(() => {
    if (fitRequest === 0) return;
    void flow.fitView({
      padding: 0.25,
      duration: prefersReducedMotion() ? 0 : 300,
    });
  }, [fitRequest, flow]);

  const handleNodesChange: OnNodesChange<FlowNode> = useCallback((changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  function handleFitView() {
    void flow.fitView({
      padding: 0.25,
      duration: prefersReducedMotion() ? 0 : 300,
    });
  }

  function handleAutoLayout() {
    const positions = computeAutoLayout(document.screens, document.states);
    layoutPositionsRef.current = positions;
    setNodes(createFlowNodes(document, selectedScreenId, positions));
    onAutoLayout?.(positions);
    setFitRequest((request) => request + 1);
  }

  function handleUndoLayout() {
    layoutPositionsRef.current = {};
    onUndoLayout?.();
    setFitRequest((request) => request + 1);
  }

  function moveSelectedScreen(delta: FlowPosition) {
    const selectedNode = nodes.find(
      (node) =>
        node.id === selectedScreenId && node.data.nodeType === "screen",
    );
    if (!selectedNode) return;

    const nextPosition = {
      x: selectedNode.position.x + delta.x,
      y: selectedNode.position.y + delta.y,
    };
    layoutPositionsRef.current = {
      ...layoutPositionsRef.current,
      [selectedNode.id]: nextPosition,
    };
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, position: nextPosition }
          : node,
      ),
    );
    onPositionUpdate?.(selectedScreenId, nextPosition, "screen");
  }

  return (
    <div className="flow-section">
      <div className="flow-toolbar">
        <h2>화면 흐름도</h2>
        <div className="flow-toolbar-right">
          {!collapsed && (
            <>
              <div className="flow-position-controls" aria-label="선택 화면 위치 이동">
                <button
                  type="button"
                  aria-label="선택 화면 왼쪽으로 이동"
                  title="선택 화면 왼쪽으로 이동"
                  onClick={() => moveSelectedScreen({ x: -KEYBOARD_MOVE_STEP, y: 0 })}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="선택 화면 위로 이동"
                  title="선택 화면 위로 이동"
                  onClick={() => moveSelectedScreen({ x: 0, y: -KEYBOARD_MOVE_STEP })}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="선택 화면 아래로 이동"
                  title="선택 화면 아래로 이동"
                  onClick={() => moveSelectedScreen({ x: 0, y: KEYBOARD_MOVE_STEP })}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="선택 화면 오른쪽으로 이동"
                  title="선택 화면 오른쪽으로 이동"
                  onClick={() => moveSelectedScreen({ x: KEYBOARD_MOVE_STEP, y: 0 })}
                >
                  →
                </button>
              </div>
              {onUndoLayout && (
                <button
                  type="button"
                  className="button button--sm"
                  aria-label="자동 정렬 실행 취소"
                  onClick={handleUndoLayout}
                >
                  <ArrowCounterClockwise size={14} />
                  <span className="flow-action-label">실행 취소</span>
                </button>
              )}
              {onAutoLayout && (
                <button
                  type="button"
                  className="button button--sm"
                  title="왼쪽→오른쪽 자동 정렬"
                  onClick={handleAutoLayout}
                >
                  <TreeStructure size={14} />
                  <span className="flow-action-label">자동 정렬</span>
                </button>
              )}
              <ZoomControls onFitView={handleFitView} />
            </>
          )}
          {onToggleCollapse && (
            <button
              type="button"
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
            <button type="button" className="button" onClick={onRecompile}>
              다시 정리하기
            </button>
          )}
        </div>
      ) : null}
      <div className={`flow-canvas${nodes.length === 0 ? " flow-canvas--hidden" : ""}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => onSelect(node.data.screenId)}
          onNodeDragStart={() => {
            draggingRef.current = true;
          }}
          onNodeDragStop={(_, node) => {
            draggingRef.current = false;
            layoutPositionsRef.current = {
              ...layoutPositionsRef.current,
              [node.id]: node.position,
            };
            onPositionUpdate?.(node.id, node.position, node.data.nodeType);
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

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowBoard {...props} />
    </ReactFlowProvider>
  );
}
