/**
 * Goal Sliders Component
 * Semantic Neutrality Compliant
 * 
 * - 3 axis sliders (E, F, R)
 * - Time horizon selector
 * - Delta display (numbers only)
 * - No value judgments
 */

import React, { useState, useCallback } from "react";
import type { GoalCoordinate, TimeHorizon, DeltaGoal } from "../api/goalTypes";
import "../styles/goal.css";

type Props = {
  initialCoordinate?: GoalCoordinate;
  initialHorizon?: TimeHorizon;
  delta?: DeltaGoal | null;
  onSet: (coordinate: GoalCoordinate, horizon: TimeHorizon) => void;
  disabled?: boolean;
};

const HORIZONS: { value: TimeHorizon; label: string }[] = [
  { value: "1day", label: "1D" },
  { value: "1week", label: "1W" },
  { value: "1month", label: "1M" },
  { value: "1year", label: "1Y" },
];

function SliderRow({
  axis,
  value,
  onChange,
  disabled,
}: {
  axis: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="sliderRow">
      <div className="sliderAxis">{axis}</div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="sliderInput"
      />
      <div className="sliderValue">{value.toFixed(0)}</div>
    </div>
  );
}

export function GoalSliders({
  initialCoordinate = { energy: 50, flow: 50, risk: 50 },
  initialHorizon = "1week",
  delta,
  onSet,
  disabled = false,
}: Props) {
  const [coordinate, setCoordinate] = useState<GoalCoordinate>(initialCoordinate);
  const [horizon, setHorizon] = useState<TimeHorizon>(initialHorizon);

  const handleAxisChange = useCallback((axis: keyof GoalCoordinate, value: number) => {
    setCoordinate((prev) => ({ ...prev, [axis]: value }));
  }, []);

  const formatDelta = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(1);

  return (
    <div className="goalSliders">
      <div className="goalHeader">
        <div className="goalTitle">S*</div>
        <select
          value={horizon}
          onChange={(e) => setHorizon(e.target.value as TimeHorizon)}
          disabled={disabled}
          className="horizonSelect"
        >
          {HORIZONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sliders">
        <SliderRow
          axis="E"
          value={coordinate.energy}
          onChange={(v) => handleAxisChange("energy", v)}
          disabled={disabled}
        />
        <SliderRow
          axis="F"
          value={coordinate.flow}
          onChange={(v) => handleAxisChange("flow", v)}
          disabled={disabled}
        />
        <SliderRow
          axis="R"
          value={coordinate.risk}
          onChange={(v) => handleAxisChange("risk", v)}
          disabled={disabled}
        />
      </div>

      <button
        className="setButton"
        onClick={() => onSet(coordinate, horizon)}
        disabled={disabled}
      >
        SET
      </button>

      {delta && (
        <div className="deltaDisplay">
          <span className="deltaLabel">Δ</span>
          <span className="deltaValues">
            E {formatDelta(delta.d_energy)}  F {formatDelta(delta.d_flow)}  R {formatDelta(delta.d_risk)}
          </span>
        </div>
      )}
    </div>
  );
}
