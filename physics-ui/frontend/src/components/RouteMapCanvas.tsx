import React, { useEffect, useMemo, useRef } from "react";
import type { RouteResponse, Point, Motion } from "../api/types";
import "../styles/physics.css";

type Props = {
  route: RouteResponse;
  motions: Motion[];
  width?: number;
  height?: number;
};

function toCanvas(p: Point, w: number, h: number): { x: number; y: number } {
  return { x: (p.x * 0.45 + 0.5) * w, y: (p.y * 0.45 + 0.5) * h };
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  w: number,
  h: number,
  dashed: boolean
) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.setLineDash(dashed ? [6, 6] : []);
  ctx.beginPath();
  const p0 = toCanvas(pts[0], w, h);
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < pts.length; i++) {
    const pi = toCanvas(pts[i], w, h);
    ctx.lineTo(pi.x, pi.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawDot(ctx: CanvasRenderingContext2D, p: Point, w: number, h: number, r: number) {
  const c = toCanvas(p, w, h);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function RouteMapCanvas({ route, motions, width = 360, height = 360 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef<number>(0);

  const scene = useMemo(() => ({ route, motions }), [route, motions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      tRef.current += 1;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0b0d12";
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(180,180,170,0.20)";
      drawPolyline(ctx, scene.route.primary_route, width, height, false);

      ctx.strokeStyle = "rgba(180,180,170,0.10)";
      for (const alt of scene.route.alternates ?? []) {
        drawPolyline(ctx, alt.route, width, height, true);
      }

      const dest = toCanvas(scene.route.destination, width, height);
      ctx.strokeStyle = "rgba(180,180,170,0.50)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dest.x, dest.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(180,180,170,0.18)";
      ctx.beginPath();
      ctx.arc(dest.x, dest.y, 5, 0, Math.PI * 2);
      ctx.fill();

      for (const m of scene.motions) {
        const alpha = 0.06 + m.intensity * 0.22;
        ctx.strokeStyle = `rgba(180,180,170,${alpha})`;
        ctx.lineWidth = 2;

        const shift = (tRef.current % 120) / 120;
        const k = Math.max(2, Math.floor(m.path.length * 0.65));
        const start = Math.floor(shift * (m.path.length - k));
        const slice = m.path.slice(start, start + k);

        drawPolyline(ctx, slice, width, height, false);

        if (slice.length > 0) {
          const head = slice[slice.length - 1];
          ctx.fillStyle = `rgba(180,180,170,${alpha + 0.1})`;
          drawDot(ctx, head, width, height, 2.5);
        }
      }

      ctx.fillStyle = "rgba(180,180,170,0.45)";
      drawDot(ctx, { x: scene.route.current_station.x, y: scene.route.current_station.y }, width, height, 6);

      const nxt = toCanvas({ x: scene.route.next_station.x, y: scene.route.next_station.y }, width, height);
      ctx.strokeStyle = "rgba(180,180,170,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nxt.x, nxt.y, 7, 0, Math.PI * 2);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scene, width, height]);

  return (
    <div className="routeWrap">
      <canvas ref={canvasRef} width={width} height={height} className="routeCanvas" />
    </div>
  );
}
