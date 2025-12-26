import React, { useCallback, useEffect, useState } from "react";
import { DashboardGauges } from "../components/DashboardGauges";
import { RouteMapCanvas } from "../components/RouteMapCanvas";
import { ActionBar } from "../components/ActionBar";
import { applyAction, getDashboardState, getRoute, getMotions } from "../api/physics";
import type { DashboardStateResponse, RouteResponse, MotionsResponse, ActionType } from "../api/types";

export function PhysicsScreen() {
  const [dashboard, setDashboard] = useState<DashboardStateResponse | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [motions, setMotions] = useState<MotionsResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [d, r, m] = await Promise.all([getDashboardState(), getRoute(), getMotions()]);
    setDashboard(d);
    setRoute(r);
    setMotions(m);
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

  if (!dashboard || !route || !motions) {
    return <div style={{ color: "rgba(180,180,170,0.6)", padding: 16 }}>Loading…</div>;
  }

  return (
    <div className="physicsScreen">
      <div className="topPanel">
        <div className="goalHeader">
          <div className="goalDot" />
          <div className="goalStability">{Math.round(dashboard.gauges.stability * 100)}%</div>
        </div>
        <DashboardGauges gauges={dashboard.gauges} />
      </div>
      <div className="centerPanel">
        <RouteMapCanvas route={route} motions={motions.motions} width={360} height={360} />
      </div>
      <div className="bottomPanel">
        <ActionBar disabled={busy} onAction={onAction} />
      </div>
    </div>
  );
}
