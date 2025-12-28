import { useCallback, useEffect, useState, useRef } from "react";
import { getPhysicsView, applyAction, resetState, submitSelfcheck, ApiError } from "../api/physics";
import type { PhysicsViewResponse, SelfcheckSubmitRequest } from "../api/viewTypes";
import type { ApplyActionResponse } from "../api/physics";
import { SelfcheckPanel } from "./SelfcheckPanel";
import { ReplayViewer } from "./ReplayViewer";
import "../styles/physics.css";

export function PhysicsView() {
  const [view, setView] = useState<PhysicsViewResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfcheckWindow, setSelfcheckWindow] = useState<number>(0);
  const [lastAction, setLastAction] = useState<ApplyActionResponse | null>(null);
  const [selfcheckKey, setSelfcheckKey] = useState<number>(0); // For resetting SelfcheckPanel
  const [showReplay, setShowReplay] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef<number>(0);

  // Fetch view with error handling
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await getPhysicsView();
      setView(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("서버 연결 실패");
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    // Auto-refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Action handler with feedback
  const onAction = useCallback(async (actionId: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await applyAction({ 
        action: actionId as "hold" | "push" | "drift", 
        client_ts: new Date().toISOString() 
      });
      setLastAction(result);
      setSelfcheckWindow(60); // Start 60s window
      setSelfcheckKey(prev => prev + 1); // Reset SelfcheckPanel
      await refresh();
      
      // Clear last action feedback after 3 seconds
      setTimeout(() => setLastAction(null), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Action 실패");
      }
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  // Selfcheck submit handler
  const onSelfcheckSubmit = useCallback(async (data: Omit<SelfcheckSubmitRequest, "client_ts">) => {
    try {
      setError(null);
      await submitSelfcheck({
        ...data,
        client_ts: new Date().toISOString(),
      });
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        // Window closed error is expected
        if (err.message.includes("window_closed")) {
          setSelfcheckWindow(0);
        } else {
          setError(err.message);
        }
      } else {
        setError("Selfcheck 실패");
      }
      throw err; // Re-throw for SelfcheckPanel to handle
    }
  }, [refresh]);

  // Reset handler
  const onReset = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await resetState();
      setLastAction(null);
      setSelfcheckWindow(0);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Reset 실패");
      }
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  // Selfcheck countdown
  useEffect(() => {
    if (selfcheckWindow <= 0) return;
    const timer = setInterval(() => {
      setSelfcheckWindow((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [selfcheckWindow]);

  // Canvas rendering
  useEffect(() => {
    if (!view || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      tRef.current += 1;
      drawPhysicsMap(ctx, canvas.width, canvas.height, view, tRef.current);
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [view]);

  // Loading state
  if (!view && !error) {
    return <div className="loading">Loading…</div>;
  }

  // Error state
  if (error && !view) {
    return (
      <div className="errorScreen">
        <div className="errorMessage">{error}</div>
        <button onClick={refresh}>다시 시도</button>
      </div>
    );
  }

  if (!view) return null;

  return (
    <div className="physicsView">
      {/* Header */}
      <div className="viewHeader">
        <div className="stability">{Math.round(view.gauges.stability * 100)}%</div>
        <div className="headerRight">
          <button className="historyBtn" onClick={() => setShowReplay(true)}>
            ⏱
          </button>
          <button className="resetBtn" onClick={onReset} disabled={busy}>
            RESET
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="errorBanner">{error}</div>
      )}

      {/* Action Feedback */}
      {lastAction && (
        <div className={`actionFeedback ${lastAction.advanced ? "advanced" : ""}`}>
          {lastAction.advanced 
            ? `→ ${lastAction.current_station}` 
            : `${lastAction.action} (${Math.round(lastAction.progress * 100)}%)`}
        </div>
      )}

      {/* Selfcheck Panel - shows after action */}
      {selfcheckWindow > 0 && (
        <SelfcheckPanel
          key={selfcheckKey}
          windowRemaining={selfcheckWindow}
          onSubmit={onSelfcheckSubmit}
          disabled={busy}
        />
      )}

      {/* Gauges */}
      <div className="gauges">
        <GaugeRow label="Stability" value={view.gauges.stability} />
        <GaugeRow label="Pressure" value={view.gauges.pressure} />
        <GaugeRow label="Drag" value={view.gauges.drag} />
        <GaugeRow label="Momentum" value={view.gauges.momentum} />
        <GaugeRow label="Volatility" value={view.gauges.volatility} />
        <GaugeRow label="Recovery" value={view.gauges.recovery} />
      </div>

      {/* Route Progress */}
      <div className="routeProgress">
        <span className="routeLabel">Route</span>
        <span className="routePath">
          {view.route.current_station.id} → {view.route.next_station.id} → Origin
        </span>
      </div>

      {/* Canvas Map */}
      <div className="mapContainer">
        <canvas ref={canvasRef} width={380} height={380} className="physicsCanvas" />
      </div>

      {/* Actions */}
      <div className="actions">
        {view.actions.map((action) => (
          <button
            key={action.id}
            disabled={busy}
            onClick={() => onAction(action.id)}
            className={lastAction?.action === action.id ? "active" : ""}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Replay Viewer Modal */}
      <ReplayViewer isOpen={showReplay} onClose={() => setShowReplay(false)} />
    </div>
  );
}

// Gauge Row Component
function GaugeRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
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

// Canvas Drawing Function
function drawPhysicsMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  view: PhysicsViewResponse,
  t: number
) {
  const { route, motions, render } = view;
  const cx = width / 2;
  const cy = height / 2;

  // Clear
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#08090d";
  ctx.fillRect(0, 0, width, height);

  // Helper: to canvas coords
  const toCanvas = (p: { x: number; y: number }) => ({
    x: (p.x * 0.4 + 0.5) * width,
    y: (-p.y * 0.4 + 0.5) * height,  // Y 반전 (위가 +)
  });

  // Draw route lines
  ctx.strokeStyle = `rgba(180, 180, 170, ${render.line_opacity})`;
  ctx.lineWidth = render.line_width;

  if (route.primary_route.length >= 2) {
    ctx.beginPath();
    const p0 = toCanvas(route.primary_route[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < route.primary_route.length; i++) {
      const pi = toCanvas(route.primary_route[i]);
      ctx.lineTo(pi.x, pi.y);
    }
    ctx.stroke();
  }

  // Draw alternates (dashed)
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = `rgba(180, 180, 170, ${render.line_opacity * 0.5})`;
  for (const alt of route.alternates) {
    if (alt.route.length >= 2) {
      ctx.beginPath();
      const p0 = toCanvas(alt.route[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < alt.route.length; i++) {
        const pi = toCanvas(alt.route[i]);
        ctx.lineTo(pi.x, pi.y);
      }
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // Draw motions
  for (const m of motions.motions) {
    const alpha = 0.05 + m.intensity * 0.2;
    ctx.strokeStyle = `rgba(180, 180, 170, ${alpha})`;
    ctx.lineWidth = 2;

    const shift = ((t * render.motion_speed * 0.02) % 1);
    const k = Math.max(2, Math.floor(m.path.length * 0.65));
    const start = Math.floor(shift * (m.path.length - k));
    const slice = m.path.slice(start, start + k);

    if (slice.length >= 2) {
      ctx.beginPath();
      const p0 = toCanvas(slice[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < slice.length; i++) {
        const pi = toCanvas(slice[i]);
        ctx.lineTo(pi.x, pi.y);
      }
      ctx.stroke();

      // Head dot
      const head = toCanvas(slice[slice.length - 1]);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 180, 170, ${alpha + 0.1})`;
      ctx.fill();
    }
  }

  // Draw destination (Origin)
  const dest = toCanvas(route.destination);
  ctx.strokeStyle = `rgba(180, 180, 170, 0.5)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(dest.x, dest.y, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(180, 180, 170, 0.18)`;
  ctx.beginPath();
  ctx.arc(dest.x, dest.y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw current station (filled)
  const cur = toCanvas({ x: route.current_station.x, y: route.current_station.y });
  ctx.fillStyle = `rgba(180, 180, 170, ${render.node_opacity})`;
  ctx.beginPath();
  ctx.arc(cur.x, cur.y, 7, 0, Math.PI * 2);
  ctx.fill();
  // Pulse ring
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.05);
  ctx.strokeStyle = `rgba(180, 180, 170, ${0.3 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cur.x, cur.y, 10 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();

  // Draw next station (outline)
  const nxt = toCanvas({ x: route.next_station.x, y: route.next_station.y });
  ctx.strokeStyle = `rgba(180, 180, 170, 0.4)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(nxt.x, nxt.y, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Draw origin crosshair
  ctx.strokeStyle = `rgba(180, 180, 170, 0.3)`;
  ctx.lineWidth = 1;
  const ch = 24;
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 16, cy);
    ctx.lineTo(cx + dir * ch, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + dir * 16);
    ctx.lineTo(cx, cy + dir * ch);
    ctx.stroke();
  });

  // Origin ring
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(180, 180, 170, 0.5)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Origin core
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(180, 180, 170, 0.8)`;
  ctx.fill();
}


