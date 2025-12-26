import React, { useCallback, useEffect, useState } from "react";
import { DashboardGauges } from "../components/DashboardGauges";
import { RouteNavCanvas } from "../components/RouteNavCanvas";
import { ActionBar } from "../components/ActionBar";
import { applyAction, getDashboardState, getMotions } from "../api/physics";
import { httpJson } from "../api/client";
import type { DashboardStateResponse, MotionsResponse, ActionType } from "../api/types";
import type { RouteNavResponse } from "../api/routeTypes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function PhysicsScreen() {
  const [dashboard, setDashboard] = useState<DashboardStateResponse | null>(null);
  const [routeNav, setRouteNav] = useState<RouteNavResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [d, r] = await Promise.all([
      getDashboardState(),
      httpJson<RouteNavResponse>(`${API_BASE}/nav/route`),
    ]);
    setDashboard(d);
    setRouteNav(r);
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

  if (!dashboard || !routeNav) {
    return <div style={{ color: "rgba(180,180,170,0.6)", padding: 16 }}>Loading…</div>;
  }

  return (
    <div className="physicsScreen">
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
      
      <div className="centerPanel">
        <RouteNavCanvas data={routeNav} width={360} height={360} />
      </div>
      
      <div className="routeInfo">
        <span className="routePath">{routeNav.active_route.join(" → ")}</span>
      </div>
      
      <div className="bottomPanel">
        <ActionBar disabled={busy} onAction={onAction} />
      </div>
    </div>
  );
}
