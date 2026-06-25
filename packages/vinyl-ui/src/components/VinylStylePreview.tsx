import React, { useMemo } from "react";
import { deriveVinylLabelColor } from "../lib/colors";

interface Props {
  styleName: string;
  active?: boolean;
  onClick?: () => void;
  color?: string;
  labelColor?: string;
}

export default function VinylStylePreview({
  styleName,
  active,
  onClick,
  color = "#6eb5d4",
  labelColor: propLabelColor,
}: Props) {
  const labelColor = useMemo(() => {
    if (propLabelColor) return propLabelColor;
    return deriveVinylLabelColor(color);
  }, [color, propLabelColor]);

  return (
    <button
      onClick={onClick}
      className={`relative w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
        active ? "border-blue-500 ring-2 ring-blue-500/20" : "border-transparent hover:border-white/20"
      }`}
      style={{ background: "rgba(0,0,0,0.2)" }}
    >
      <div 
        className={`sd-vinyl-stage sd-vinyl-style-${styleName} sd-vinyl-stage--visible`}
        style={{ 
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) scale(0.6)",
          margin: 0,
          "--vinyl-size": "120px",
          pointerEvents: "none"
        } as React.CSSProperties}
      >
        <div className="sd-vinyl-group">
          <div
            className="sd-vinyl-disc"
            style={{
              ["--vinyl-color" as string]: color,
              ["--vinyl-label-color" as string]: labelColor,
            }}
          >
            <div className="sd-vinyl-grooves" aria-hidden />
            <div className="sd-vinyl-grooves sd-vinyl-grooves--fine" aria-hidden />
            <div className="sd-vinyl-sheen" aria-hidden />
            <div className="sd-vinyl-center" />
            <div className="sd-vinyl-hole" />
          </div>
        </div>
      </div>
      
      {active && (
        <div className="absolute inset-0 bg-blue-500/5 flex items-center justify-center">
          <div className="absolute bottom-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}
