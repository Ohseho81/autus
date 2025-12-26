import React, { useCallback, useEffect, useState } from "react";
import { DashboardGauges } from "../components/DashboardGauges";
import { RouteNavCanvas } from "../components/RouteNavCanvas";
import { GoalSliders } from "../components/GoalSliders";
import { ActionBar } from "../components/ActionBar";
import { applyAction, getDashboardState } from "../api/physics";
import { httpJson } from "../api/client";
import type { DashboardStateResponse, ActionType } from "../api/types";
import type { RouteNavResponse } from "../api/routeTypes";
import type { GoalCoordinate, TimeHorizon, DeltaGoal, GoalResponse } from "../api/goalTypes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function PhysicsScreen() {
  const [dashboard, setDashboard] = useState<DashboardStateResponse | null>(null);
  const [routeNav, setRouteNav] = useState<RouteNavResponse | null>(null);
  const [goalDelta, setGoalDelta] = useState<DeltaGoal | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [d, r, g] = await Promise.all([
      getDashboardState(),
      httpJson<RouteNavResponse>(`${API_BASE}/nav/route`),
      httpJson<GoalResponse>(`${API_BASE}/goal/get`),
    ]);
    setDashboard(d);
    setRouteNav(r);
    setGoalDelta(g.delta);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const onAction = useCallback(async (action: ActionType) => {
    setBusy(true);
    try {
      await applyAction({ action, client_ts: new Date().toISOString() });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const onReset = useCallback(async () => {
    setBusy(true);
    try {
      await httpJson(`${API_BASE}/nav/reset`, { method: "POST" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const onGoalSet = useCallback(async (coordinate: GoalCoordinate, horizon: TimeHorizon) => {
    setBusy(true);
    try {
      const res = await httpJson<GoalResponse>(`${API_BASE}/goal/set`, {
        method: "POST",
        body: JSON.stringify({ coordinate, time_horizon: horizon }),
      });
      setGoalDelta(res.delta);
    } finally {
      setBusy(false);
    }
  }, []);

  if (!dashboard || !routeNav) {
    return <div style={{ color: "rgba(180,180,170,0.6)", padding: 16 }}>Loading…</div>;
  }

  return (
    <div className="physicsScreen">
      {/* Goal Sliders */}
      <div className="goalPanel">
        <GoalSliders
          delta={goalDelta}
          onSet={onGoalSet}
          disabled={busy}
        />
      </div>

      {/* Dashboard Gauges */}
      <div className="topPanel">
        <div className="goalHeader">
          <div className="goalDot" />
          <div className="goalStability">{Math.round(dashboard.gauges.stability * 100)}%</div>
          <button 
            className="resetBtn"
            onClick={onReset}
            disabled={busy}
          >
            RESET
          </button>
        </div>
        <DashboardGauges gauges={dashboard.gauges} />
      </div>
      
      {/* Route Navigation Canvas */}
      <div className="centerPanel">
        <RouteNavCanvas data={routeNav} width={360} height={360} />
      </div>
      
      {/* Route Path */}
      <div className="routeInfo">
        <span className="routePath">{routeNav.active_route.join(" → ")}</span>
      </div>
      
      {/* Action Bar */}
      <div className="bottomPanel">
        <ActionBar disabled={busy} onAction={onAction} />
      </div>
    </div>
  );
}
