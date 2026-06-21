"use client";

import { useMemo } from "react";
import {
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { Briefcase, Minus, Plus } from "@phosphor-icons/react";
import type { Screen, ScreenState, SpecDocument } from "@/lib/spec/schema";

function FlowBoard({
  document,
  selectedScreenId,
  onSelect,
}: {
  document: SpecDocument;
  selectedScreenId: string;
  onSelect: (id: string) => void;
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

  return (
    <div className="flow-section">
      <div className="flow-toolbar">
        <h2>화면 흐름도</h2>
        <div className="zoom-pill" aria-label="캔버스 확대 축소">
          <button aria-label="축소" onClick={() => flow.zoomOut()}>
            <Minus size={14} />
          </button>
          <span>{Math.round(flow.getZoom() * 100)}%</span>
          <button aria-label="확대" onClick={() => flow.zoomIn()}>
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div className="flow-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.5}
          maxZoom={1.8}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => {
            const screenId = node.data.screenId;
            if (typeof screenId === "string") onSelect(screenId);
          }}
          proOptions={{ hideAttribution: true }}
        >
        </ReactFlow>
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
