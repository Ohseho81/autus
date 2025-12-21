/**
 * AUTUS E-Data Schema v1.0
 * Node / Link / Metric / Label 통합 스키마
 */

export type TwinState = {
  time: number;
  energy: number;    // 0..1
  flow: number;      // 0..1
  risk: number;      // 0..1
  entropy: number;   // 0..1
  pressure: number;  // 0..1
};

export type GlobeNode = {
  id: string;
  kind: "city" | "org" | "system" | "asset" | "person";
  lat: number;         // -90..90
  lon: number;         // -180..180
  weight: number;      // 0..1 (size)
  energy?: number;     // 0..1 (glow)
  risk?: number;       // 0..1 (alert)
  tags?: string[];     // clustering
  label?: LabelRef;
};

export type GlobeLink = {
  id: string;
  a: string;           // nodeId
  b: string;           // nodeId
  strength: number;    // 0..1 (thickness/opacity)
  flow?: number;       // 0..1 (speed)
  kind?: "data" | "money" | "work" | "policy";
};

export type Metric = {
  key: string;
  value: number;
  unit?: string;
  trend?: number;      // -1..+1
  risk?: number;       // 0..1
};

export type PanelBlock = {
  id: string;
  title: string;
  metrics: Metric[];
  priority: 0 | 1 | 2 | 3;
};

export type LabelRef = {
  text: string;
  level: "L1" | "L2" | "L3";
  anchor: "node" | "frame" | "panel";
  align?: "left" | "right";
};

export type GlobeData = {
  nodes: GlobeNode[];
  links: GlobeLink[];
  panels: PanelBlock[];
};

// 검증 함수
export function validateGlobeData(data: unknown): data is GlobeData {
  if (!data || typeof data !== 'object') return false;
  const d = data as GlobeData;
  return Array.isArray(d.nodes) && Array.isArray(d.links) && Array.isArray(d.panels);
}
