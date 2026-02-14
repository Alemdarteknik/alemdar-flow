import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";

type HomeNodeData = Node<
  {
    isPowered?: boolean;
    power?: number;
  },
  "home"
>;

const handleStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  width: 12,
  height: 12,
  left: -6,
};

function HomeNode({ data }: NodeProps<HomeNodeData>) {
  const isPowered = data.isPowered || false;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ ...handleStyle, top: "40%" }} />
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
          src={isPowered ? "/power.gif" : "/house.png"}
          alt="Home"
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
        Home
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
    </div>
  );
}

export default memo(HomeNode);
