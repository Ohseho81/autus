import React from "react";
import type { ActionType } from "../api/types";
import "../styles/physics.css";

type Props = {
  disabled?: boolean;
  onAction: (action: ActionType) => void;
};

export function ActionBar({ disabled = false, onAction }: Props) {
  return (
    <div className="actionBar">
      <button disabled={disabled} onClick={() => onAction("hold")}>Hold</button>
      <button disabled={disabled} onClick={() => onAction("push")}>Push</button>
      <button disabled={disabled} onClick={() => onAction("drift")}>Drift</button>
    </div>
  );
}
