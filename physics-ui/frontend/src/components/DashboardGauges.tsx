import React from "react";
import type { GaugeState } from "../api/types";
import "../styles/physics.css";

type Props = {
  gauges: GaugeState;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function GaugeRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div className="gaugeRow">
      <div className="gaugeLabel">{label}</div>
      <div className="gaugeBar">
        <div className="gaugeFill" style={{ width: `${pct}%` }} />
      </div>
      <div className="gaugePct">{pct}%</div>
    </div>
  );
}

export function DashboardGauges({ gauges }: Props) {
  return (
    <div className="dashboard">
      <GaugeRow label="Stability" value={gauges.stability} />
      <GaugeRow label="Pressure" value={gauges.pressure} />
      <GaugeRow label="Drag" value={gauges.drag} />
      <GaugeRow label="Momentum" value={gauges.momentum} />
      <GaugeRow label="Volatility" value={gauges.volatility} />
      <GaugeRow label="Recovery" value={gauges.recovery} />
    </div>
  );
}
