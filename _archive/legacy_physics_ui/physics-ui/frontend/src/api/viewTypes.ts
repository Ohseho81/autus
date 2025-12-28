// Unified Physics View Types

export type GaugeState = {
  stability: number;
  pressure: number;
  drag: number;
  momentum: number;
  volatility: number;
  recovery: number;
};

export type Point = { x: number; y: number };

export type RouteStation = {
  id: string;
  x: number;
  y: number;
  kind: string;
};

export type AlternateRoute = {
  trigger: string;
  route: Point[];
};

export type RouteData = {
  destination: Point;
  current_station: RouteStation;
  next_station: RouteStation;
  primary_route: Point[];
  alternates: AlternateRoute[];
};

export type Motion = {
  motion_id: string;
  kind: string;
  path: Point[];
  intensity: number;
  ttl_ms: number;
};

export type MotionsData = {
  motions: Motion[];
};

export type ActionOption = {
  id: string;
  label: string;
};

export type RenderParams = {
  line_opacity: number;
  line_width: number;
  node_opacity: number;
  node_glow: number;
  motion_speed: number;
  motion_noise: number;
  field_density: number;
  field_turbulence: number;
  shadow_hatch_density: number;
  shadow_blur: number;
};

export type PhysicsViewResponse = {
  gauges: GaugeState;
  route: RouteData;
  motions: MotionsData;
  actions: ActionOption[];
  render: RenderParams;
  updated_at: string;
};

export type SelfcheckSubmitRequest = {
  alignment: number;
  clarity: number;
  friction: number;
  momentum: number;
  confidence: number;
  recovery: number;
  client_ts: string;
};

export type SelfcheckSubmitResponse = {
  ok: boolean;
  window_remaining_sec: number;
};


