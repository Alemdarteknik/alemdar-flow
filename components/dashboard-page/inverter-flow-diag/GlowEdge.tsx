import { memo } from "react";
import { BaseEdge, getSmoothStepPath, getBezierPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

const GlowEdge = memo(function GlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  animated,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 30,
  });

  return (
    <>
      <defs>
        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base edge line */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />

      {/* Animated glowing dot — only when animated */}
      {animated && (
        <circle r="5" fill="#6964f7" filter={`url(#glow-${id})`}>
          <animateMotion dur="3.0s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
});

export default GlowEdge;
