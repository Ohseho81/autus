export type GaugeState = {
  stability: number;
  pressure: number;
  drag: number;
  momentum: number;
  volatility: number;
  recovery: number;
};

export type DashboardStateResponse = {
  gauges: GaugeState;
  updated_at: string;
};

export type Point = { x: number; y: number };

export type StationKind =
  | "align" | "acquire" | "commit" | "build" | "verify" | "deploy" | "lock";

export type RouteStation = {
  id: string;
  x: number;
  y: number;
  kind: StationKind;
};

export type AlternateTrigger = "risk" | "delay" | "info";

export type AlternateRoute = {
  trigger: AlternateTrigger;
  route: Point[];
};

export type RouteResponse = {
  destination: Point;
  current_station: RouteStation;
  next_station: RouteStation;
  primary_route: Point[];
  alternates: AlternateRoute[];
  ttl_ms: number;
  updated_at: string;
};

export type MotionKind = "orbit" | "stream" | "pulse";

export type Motion = {
  motion_id: string;
  kind: MotionKind;
  path: Point[];
  intensity: number;
  ttl_ms: number;
};

export type MotionsResponse = {
  motions: Motion[];
  updated_at: string;
};

export type ActionType = "hold" | "push" | "drift";

export type ApplyActionRequest = {
  action: ActionType;
  client_ts: string;
};
