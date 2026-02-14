import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";

type GridNodeData = Node<
  {
    isActive?: boolean;
    power?: number;
    isDarkMode?: boolean;
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
  const isDarkMode = data.isDarkMode || false;
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
      }}
    >
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
          src={
            isActive
              ? "/power-lines.gif"
              : isDarkMode
                ? "/power-grid-dark.png"
                : "/power-grid.png"
          }
          alt="Grid"
          style={{
            width: ns.iconSize,
            height: ns.iconSize,
            objectFit: "contain",
          }}
        />
      </div>
      <span
        style={{
          marginTop: ns.labelMarginTop,
          fontSize: ns.labelFontSize,
          fontWeight: 600,
          color: "var(--card-foreground, #334155)",
          lineHeight: 1.2,
        }}
      >
        Grid
      </span>
      <span
        style={{
          marginTop: ns.valueMarginTop,
          fontSize: ns.valueFontSize,
          fontWeight: 800,
          color: "var(--card-foreground, #334155)",
          lineHeight: 1.2,
        }}
      >
        {data.power || 0}{" "}
        <span
          style={{
            fontWeight: 400,
            fontSize: ns.valueFontSize - 2,
          }}
        >
          kW
        </span>
      </span>
      <Handle
        type="source"
        position={Position.Right}
        style={{ ...handleStyle, top: "40%" }}
      />
    </div>
  );
}

export default memo(GridNode);
