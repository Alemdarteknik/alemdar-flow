import { useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  MarkerType,
  Background,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import InverterNode from "./InverterNode";
import GridNode from "./GridNode";
import SolarNode from "./SolarNode";
import HomeNode from "./HomeNode";
import BatteryNode from "./BatteryNode";

const nodeTypes = {
  inverter: InverterNode,
  grid: GridNode,
  solar: SolarNode,
  home: HomeNode,
  battery: BatteryNode,
};

const nodeStyle = {
  background: "transparent",
  border: "none",
  borderRadius: "0",
  boxShadow: "none",
  padding: "0",
  color: "var(--card-foreground, #334155)",
};

const edgeStyle = { stroke: "#808080", strokeWidth: 2 };
const markerEnd = { type: MarkerType.ArrowClosed, color: "#808080" };

interface BuildNodesParams {
  isGridActive: boolean;
  isSolarGenerating: boolean;
  isHomePowered: boolean;
  isBatteryCharging: boolean;
  isBatteryDischarging: boolean;
  gridPower: number;
  solarPower: number;
  homePower: number;
  batteryPower: number;
}

function buildNodes({
  isGridActive,
  isSolarGenerating,
  isHomePowered,
  isBatteryCharging,
  isBatteryDischarging,
  gridPower,
  solarPower,
  homePower,
  batteryPower,
}: BuildNodesParams): Node[] {
  return [
    {
      id: "grid",
      type: "grid",
      draggable: false,
      data: { isActive: isGridActive, power: gridPower },
      position: { x: 0, y: -50 },
      style: { ...nodeStyle },
    },
    {
      id: "solar",
      type: "solar",
      draggable: false,
      data: { isGenerating: isSolarGenerating, power: solarPower },
      position: { x: 0, y: 210 },
      style: { ...nodeStyle },
    },
    {
      id: "inverter",
      type: "inverter",
      draggable: false,
      data: {},
      position: { x: 300, y: 95 },
      style: { ...nodeStyle },
    },
    {
      id: "home",
      type: "home",
      draggable: false,
      data: { isPowered: isHomePowered, power: homePower },
      position: { x: 620, y: -50 },
      style: { ...nodeStyle },
    },
    {
      id: "battery",
      type: "battery",
      draggable: false,
      data: {
        isCharging: isBatteryCharging,
        isDischarging: isBatteryDischarging,
        power: batteryPower,
      },
      position: { x: 620, y: 210 },
      style: { ...nodeStyle },
    },
  ];
}

interface BuildEdgesParams {
  isGridActive: boolean;
  isSolarGenerating: boolean;
  isHomePowered: boolean;
  isBatteryCharging: boolean;
  isBatteryDischarging: boolean;
}

function buildEdges({
  isGridActive,
  isSolarGenerating,
  isHomePowered,
  isBatteryCharging,
  isBatteryDischarging,
}: BuildEdgesParams): Edge[] {
  const edges: Edge[] = [
    {
      id: "grid-inverter",
      source: "grid",
      target: "inverter",
      targetHandle: "grid-input",
      type: "smoothstep",
      animated: isGridActive,
      style: edgeStyle,
      markerEnd,
    },
    {
      id: "solar-inverter",
      source: "solar",
      target: "inverter",
      targetHandle: "solar-input",
      type: "smoothstep",
      animated: isSolarGenerating,
      style: edgeStyle,
      markerEnd,
    },
    {
      id: "inverter-home",
      source: "inverter",
      sourceHandle: "home-output",
      target: "home",
      type: "smoothstep",
      animated: isHomePowered,
      style: edgeStyle,
      markerEnd,
    },
  ];

  if (isBatteryCharging && !isBatteryDischarging) {
    edges.push({
      id: "inverter-battery",
      source: "inverter",
      sourceHandle: "battery-output",
      target: "battery",
      targetHandle: "charge",
      animated: true,
      type: "smoothstep",
      style: edgeStyle,
      markerEnd,
    });
  }

  if (isBatteryDischarging && !isBatteryCharging) {
    edges.push({
      id: "battery-inverter",
      source: "battery",
      sourceHandle: "discharge",
      target: "inverter",
      targetHandle: "battery-input",
      animated: true,
      type: "smoothstep",
      style: { ...edgeStyle, strokeDasharray: "5,5" },
      markerEnd,
    });
  }

  return edges;
}

export interface InverterFlowDiagramProps {
  /** Animate grid → inverter edge & show grid GIF */
  isGridActive?: boolean;
  /** Animate solar → inverter edge & show solar GIF */
  isSolarGenerating?: boolean;
  /** Animate inverter → home edge & show home GIF */
  isHomePowered?: boolean;
  /** Animate inverter → battery edge & show battery charging GIF */
  isBatteryCharging?: boolean;
  /** Animate battery → inverter discharge edge & show battery discharge GIF */
  isBatteryDischarging?: boolean;
  /** kW value displayed under grid node */
  gridPower?: number;
  /** kW value displayed under solar node */
  solarPower?: number;
  /** kW value displayed under home node */
  homePower?: number;
  /** kW value displayed under battery node */
  batteryPower?: number;
  /** Optional style for the container div */
  style?: React.CSSProperties;
  /** Optional className for the container div */
  className?: string;
}

function InverterFlowDiagram({
  isGridActive = false,
  isSolarGenerating = false,
  isHomePowered = false,
  isBatteryCharging = false,
  isBatteryDischarging = false,
  gridPower = 0,
  solarPower = 0,
  homePower = 0,
  batteryPower = 0,
  style,
  className,
}: InverterFlowDiagramProps) {
  const nodes = useMemo(
    () =>
      buildNodes({
        isGridActive,
        isSolarGenerating,
        isHomePowered,
        isBatteryCharging,
        isBatteryDischarging,
        gridPower,
        solarPower,
        homePower,
        batteryPower,
      }),
    [
      isGridActive,
      isSolarGenerating,
      isHomePowered,
      isBatteryCharging,
      isBatteryDischarging,
      gridPower,
      solarPower,
      homePower,
      batteryPower,
    ],
  );

  const edges = useMemo(
    () =>
      buildEdges({
        isGridActive,
        isSolarGenerating,
        isHomePowered,
        isBatteryCharging,
        isBatteryDischarging,
      }),
    [
      isGridActive,
      isSolarGenerating,
      isHomePowered,
      isBatteryCharging,
      isBatteryDischarging,
    ],
  );

  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    >
      <ReactFlowProvider>
        <FlowInner nodes={nodes} edges={edges} />
      </ReactFlowProvider>
    </div>
  );
}

function FlowInner({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const { fitView } = useReactFlow();

  const onInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [fitView]);

  // Re-center whenever nodes or edges change
  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.2 }), 50);
    return () => clearTimeout(timer);
  }, [nodes, edges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      onInit={onInit}
      minZoom={0.1}
      maxZoom={1}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      proOptions={{ hideAttribution: true }}
    />
  );
}

export default InverterFlowDiagram;
