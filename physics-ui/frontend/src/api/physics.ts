import { httpJson } from "./client";
import type {
  DashboardStateResponse,
  RouteResponse,
  MotionsResponse,
  ApplyActionRequest,
} from "./types";
import type { RouteNavResponse } from "./routeTypes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function getDashboardState(): Promise<DashboardStateResponse> {
  return httpJson(`${API_BASE}/dashboard/state`);
}

export function getRoute(): Promise<RouteResponse> {
  return httpJson(`${API_BASE}/nav/route`);
}

export function getMotions(): Promise<MotionsResponse> {
  return httpJson(`${API_BASE}/physics/motions`);
}

export function applyAction(payload: ApplyActionRequest): Promise<void> {
  return httpJson(`${API_BASE}/action/apply`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Route Navigation API
export function getRouteNav(): Promise<RouteNavResponse> {
  return httpJson(`${API_BASE}/nav/route`);
}

export function resetRouteNav(): Promise<{ ok: boolean }> {
  return httpJson(`${API_BASE}/nav/reset`, {
    method: "POST",
  });
}
