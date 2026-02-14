import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";

type InverterNodeData = Node<
  {
    nodeSize?: {
      iconSize: number;
      padding: number;
      borderRadius: number;
      labelFontSize: number;
      valueFontSize: number;
      labelMarginTop: number;
      valueMarginTop: number;
    };
  },
  "inverter"
>;

const handleLeft: CSSProperties = {
  background: "transparent",
  border: "none",
  width: 12,
  height: 12,
  left: -6,
};

const handleRight: CSSProperties = {
  background: "transparent",
  border: "none",
  width: 12,
  height: 12,
  right: -6,
};

function InverterNode({ data }: NodeProps<InverterNodeData>) {
  const ns = data.nodeSize || {
    iconSize: 60,
    padding: 14,
    borderRadius: 14,
    labelFontSize: 19,
    valueFontSize: 19,
    labelMarginTop: 6,
    valueMarginTop: 4,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="grid-input"
        style={{ ...handleLeft, top: "30%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="solar-input"
        style={{ ...handleLeft, top: "60%" }}
      />
      <div
        style={{
          background: "var(--card, #ffffff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: ns.borderRadius,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          padding: ns.padding,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/solar-inverter.png"
          alt="Inverter"
          style={{
            width: ns.iconSize,
            height: ns.iconSize,
            objectFit: "contain",
          }}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="home-output"
        style={{ ...handleRight, top: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="battery-output"
        style={{ ...handleRight, top: "60%" }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="battery-input"
        style={{ ...handleRight, top: "70%" }}
      />
    </div>
  );
}

export default memo(InverterNode);
