/**
 * Route Navigation Canvas Component
 * Semantic Neutrality Compliant
 * 
 * - L0 (Self) = Center with pulse ring + crosshair
 * - L1 = Primary stations (bright)
 * - L2 = Secondary stations (dim)
 * - Lines = Connections with flow particles
 * - Shadow Fields = Hatch pattern only (no color judgment)
 * - L3 = Background noise field
 * 
 * NO TEXT RENDERING
 */

import React, { useEffect, useRef } from "react";
import type { RouteNavResponse, Station, Line, ShadowField, Point } from "../api/routeTypes";
import "../styles/physics.css";

type Props = {
  data: RouteNavResponse;
  width?: number;
  height?: number;
};

export function RouteNavCanvas({ data, width = 380, height = 380 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef<number>(0);
  const patternRef = useRef<CanvasPattern | null>(null);

  // Create hatch pattern (once)
  const createHatchPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
    const size = 8;
    const offscreen = document.createElement("canvas");
    offscreen.width = size;
    offscreen.height = size;
    const octx = offscreen.getContext("2d");
    if (!octx) return null;

    octx.strokeStyle = "rgba(180, 180, 170, 0.18)";
    octx.lineWidth = 1;
    octx.beginPath();
    octx.moveTo(0, size);
    octx.lineTo(size, 0);
    octx.stroke();

    return ctx.createPattern(offscreen, "repeat");
  };

  // Convert normalized coords to canvas coords
  const toCanvas = (p: Point): { x: number; y: number } => {
    const scale = 0.38;
    return {
      x: (p.x * scale + 0.5) * width,
      y: (p.y * scale + 0.5) * height,
    };
  };

  // Get station by ID
  const getStation = (id: string): Station | undefined => {
    if (id === "L0") {
      return {
        id: "L0",
        layer: 0,
        position: data.self_position,
        mass: 2.0,
        shadow_intensity: 0,
      };
    }
    return [...data.l1_stations, ...data.l2_stations].find((s) => s.id === id);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create hatch pattern
    if (!patternRef.current) {
      patternRef.current = createHatchPattern(ctx);
    }

    const render = () => {
      tRef.current += 1;
      const t = tRef.current;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = "#08090d";
      ctx.fillRect(0, 0, width, height);

      // L3 Field (background noise)
      drawL3Field(ctx, data.l3_field_density, t);

      // Shadow Fields (hatch pattern)
      data.shadow_fields.forEach((sf) => {
        const station = getStation(sf.station_id);
        if (station) {
          drawShadowField(ctx, station.position, sf);
        }
      });

      // Lines
      data.lines.forEach((line) => {
        const from = getStation(line.from_station);
        const to = getStation(line.to_station);
        if (from && to) {
          const isActive =
            data.active_route.includes(line.from_station) &&
            data.active_route.includes(line.to_station);
          drawLine(ctx, from.position, to.position, line, isActive, t);
        }
      });

      // L2 Stations
      data.l2_stations.forEach((s) => {
        drawStation(ctx, s, data.active_route.includes(s.id));
      });

      // L1 Stations
      data.l1_stations.forEach((s) => {
        drawStation(ctx, s, data.active_route.includes(s.id));
      });

      // L0 (Self)
      drawSelf(ctx, data.self_position, t);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [data, width, height]);

  // L3 Field - background noise particles
  const drawL3Field = (ctx: CanvasRenderingContext2D, density: number, t: number) => {
    const count = Math.floor(density * 80);
    ctx.fillStyle = "rgba(180, 180, 170, 0.025)";

    for (let i = 0; i < count; i++) {
      const seed = i * 1000;
      const x = ((Math.sin(seed + t * 0.008) + 1) / 2) * width;
      const y = ((Math.cos(seed * 1.3 + t * 0.006) + 1) / 2) * height;
      const size = 1 + Math.sin(seed * 0.7) + 1;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Shadow Field - hatch pattern only, no color judgment
  const drawShadowField = (
    ctx: CanvasRenderingContext2D,
    position: Point,
    sf: ShadowField
  ) => {
    const pos = toCanvas(position);
    const radius = sf.radius * (width / 400);

    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

    if (patternRef.current) {
      ctx.fillStyle = patternRef.current;
      ctx.globalAlpha = sf.intensity * 0.5;
      ctx.fill();
    }

    ctx.strokeStyle = `rgba(180, 180, 170, ${sf.intensity * 0.15})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  };

  // Line with flow particle
  const drawLine = (
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    line: Line,
    isActive: boolean,
    t: number
  ) => {
    const p1 = toCanvas(from);
    const p2 = toCanvas(to);

    const alpha = isActive ? 0.35 : 0.1;
    ctx.strokeStyle = `rgba(180, 180, 170, ${alpha})`;
    ctx.lineWidth = isActive ? 2 : 1;

    if (line.delay > 0.3) {
      ctx.setLineDash([5, 5 * line.delay]);
    }

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flow particle
    if (line.flow_rate > 0.2) {
      const progress = (t * line.flow_rate * 0.015) % 1;
      const px = p1.x + (p2.x - p1.x) * progress;
      const py = p1.y + (p2.y - p1.y) * progress;

      ctx.beginPath();
      ctx.arc(px, py, 2 + line.flow_rate * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 180, 170, ${0.15 + line.flow_rate * 0.25})`;
      ctx.fill();
    }
  };

  // Station node
  const drawStation = (
    ctx: CanvasRenderingContext2D,
    station: Station,
    isActive: boolean
  ) => {
    const pos = toCanvas(station.position);
    const size = 3 + station.mass * 4;

    const layerAlpha = station.layer === 1 ? 0.65 : 0.45;
    const alpha = isActive ? layerAlpha + 0.2 : layerAlpha;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180, 180, 170, ${alpha})`;
    ctx.fill();

    if (isActive) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180, 180, 170, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  // L0 (Self) - center with pulse ring + crosshair
  const drawSelf = (ctx: CanvasRenderingContext2D, position: Point, t: number) => {
    const pos = toCanvas(position);

    // Pulse ring
    const pulseSize = 18 + Math.sin(t * 0.04) * 3;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pulseSize, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180, 180, 170, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180, 180, 170, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Core
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180, 180, 170, 0.8)";
    ctx.fill();

    // Crosshair
    ctx.strokeStyle = "rgba(180, 180, 170, 0.2)";
    ctx.lineWidth = 1;

    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.moveTo(pos.x + dir * 20, pos.y);
      ctx.lineTo(pos.x + dir * 28, pos.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y + dir * 20);
      ctx.lineTo(pos.x, pos.y + dir * 28);
      ctx.stroke();
    });
  };

  return (
    <div className="routeWrap">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="routeCanvas"
      />
    </div>
  );
}
