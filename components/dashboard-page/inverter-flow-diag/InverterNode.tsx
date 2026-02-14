import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { CSSProperties } from "react";

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

function InverterNode() {
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
          borderRadius: "14px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          padding: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/solar-inverter.png"
          alt="Inverter"
          style={{ width: 60, height: 60, objectFit: "contain" }}
        />
      </div>
      {/* <span
        style={{
          marginTop: 6,
          fontSize: 15,
          fontWeight: 600,
          color: "var(--card-foreground, #334155)",
          lineHeight: 1.2,
        }}
      >
        Inverter
      </span> */}
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
