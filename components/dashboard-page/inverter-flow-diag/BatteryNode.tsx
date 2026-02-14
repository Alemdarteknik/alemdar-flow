import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";

type BatteryNodeData = Node<
  {
    isCharging?: boolean;
    isDischarging?: boolean;
    isDarkMode?: boolean;
    power?: number;
    percentage?: number;
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
  "battery"
>;

const handleStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  width: 12,
  height: 12,
  left: -6,
};

function BatteryNode({ data }: NodeProps<BatteryNodeData>) {
  const isCharging = data.isCharging || false;
  const isDischarging = data.isDischarging || false;
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

  const getImageSrc = (): string => {
    if (isDischarging) return "/energy.gif";
    if (isCharging) return "/charging.gif";
    return isDarkMode ? "/battery-status-dark.png" : "/battery-status.png";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="charge"
        style={{ ...handleStyle, top: "40%" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="discharge"
        style={{ ...handleStyle, top: "40%" }}
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
          src={getImageSrc()}
          alt="Battery"
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
        Battery
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
        {data.power || 0}
        <span
          style={{
            fontWeight: 400,
            fontSize: ns.valueFontSize - 2,
          }}
        >
          kW
        </span>
      </span>
      <span
        style={{
          marginTop: ns.valueMarginTop,
          fontSize: ns.valueFontSize - 2,
          fontWeight: 800,
          color: "#21c55e",
          lineHeight: 1.2,
        }}
      >
        {data.percentage || 0}
        <span
          style={{
            fontWeight: 800,
            fontSize: ns.valueFontSize - 2,
          }}
        >
          %
        </span>
      </span>
    </div>
  );
}

export default memo(BatteryNode);
