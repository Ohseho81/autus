/**
 * Route Navigation Types
 * Semantic Neutrality Compliant
 */

export type Point = {
  x: number;
  y: number;
};

export type Station = {
  id: string;
  layer: 0 | 1 | 2;
  position: Point;
  mass: number;
  shadow_intensity: number;
};

export type Line = {
  id: string;
  from_station: string;
  to_station: string;
  flow_rate: number;
  delay: number;
};

export type ShadowField = {
  station_id: string;
  radius: number;
  intensity: number;
};

export type RouteNavResponse = {
  self_position: Point;
  l1_stations: Station[];
  l2_stations: Station[];
  l3_field_density: number;
  lines: Line[];
  shadow_fields: ShadowField[];
  active_route: string[];
  updated_at: string;
};
