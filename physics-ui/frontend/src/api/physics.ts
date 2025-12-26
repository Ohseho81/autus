import { httpJson } from "./client";
import type {
  DashboardStateResponse,
  RouteResponse,
  MotionsResponse,
  ApplyActionRequest,
} from "./types";

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
