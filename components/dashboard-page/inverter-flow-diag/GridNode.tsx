import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";

type GridNodeData = Node<
  {
    isActive?: boolean;
    power?: number;
  },
  "grid"
>;

const handleStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  width: 12,
  height: 12,
  right: -6,
};

function GridNode({ data }: NodeProps<GridNodeData>) {
  const isActive = data.isActive || false;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "var(--card, #ffffff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: "14px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          padding: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={isActive ? "/power-lines.gif" : "/power-grid.png"}
          alt="Grid"
          style={{ width: 60, height: 60, objectFit: "contain" }}
        />
      </div>
      <span
        style={{
          marginTop: 6,
          fontSize: 19,
          fontWeight: 600,
          color: "var(--card-foreground, #334155)",
          lineHeight: 1.2,
        }}
      >
        Grid
      </span>
      <span
        style={{
          marginTop: 4,
          fontSize: 19,
          fontWeight: 800,
          color: "var(--card-foreground, #334155)",
          lineHeight: 1.2,
        }}
      >
        {data.power || 0} kW
      </span>
      <Handle type="source" position={Position.Right} style={{ ...handleStyle, top: "40%" }} />
    </div>
  );
}

export default memo(GridNode);
