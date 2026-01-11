// ═══════════════════════════════════════════════════════════════════════════
// AUTUS Physics Map - Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export type ScaleLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export type KeymanType = 'Hub' | 'Sink' | 'Source' | 'Broker' | 'Bottleneck';

export type Rank = 'Sovereign' | 'Archon' | 'Validator' | 'Operator' | 'Terminal';

export type FlowType = 
  | 'trade' 
  | 'investment' 
  | 'aid' 
  | 'remittance' 
  | 'salary' 
  | 'tax' 
  | 'dividend' 
  | 'loan' 
  | 'payment';

// ─────────────────────────────────────────────────────────────────────────────
// Node Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScaleNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  value: number;
  ki_score: number;
  rank: Rank | string;
  type: string;
  sector: string;
  active?: boolean;
  
  // Optional fields
  level?: ScaleLevel;
  bounds?: [number, number, number, number];
  parent_id?: string;
  children_ids?: string[];
  total_mass?: number;
  total_flow?: number;
  node_count?: number;
  top_keyman_id?: string;
  keyman_types?: KeymanType[];
  
  // Economics fields
  m2c?: number;
  roi?: number;
}

export interface PersonNode extends ScaleNode {
  title: string;
  flag: string;
  region: string;
  desc?: string;
  connections: number;
  inflow: number;
  outflow: number;
  s_person_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Flow {
  id: string;
  source_id: string;
  target_id: string;
  source_lat: number;
  source_lng: number;
  target_lat: number;
  target_lng: number;
  amount: number;
  type?: FlowType | string;
  flow_type?: FlowType;
  active?: boolean;
  timestamp?: string;
  description?: string;
  confidence?: number;
}

export interface FlowPath {
  nodes: string[];
  flows: Flow[];
  total_amount: number;
  bottleneck_id?: string;
  bottleneck_flow?: number;
}

export interface FlowStats {
  node_id: string;
  total_inflow: number;
  total_outflow: number;
  net_flow: number;
  flow_count: number;
  top_source?: string;
  top_target?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface MapBounds {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyman Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KeymanScore {
  person_id: string;
  name: string;
  sector: string;
  connections: number;
  total_flow: number;
  inflow: number;
  outflow: number;
  real_value: number;
  c_norm: number;
  f_norm: number;
  rv_norm: number;
  ki_score: number;
  ki_rank: number;
  keyman_types: KeymanType[];
  network_impact: number;
  rank: Rank;
}

export interface KeymanImpact {
  person_id: string;
  network_impact_percentage: string;
  removed_flows_count?: number;
  lost_amount?: number;
  affected_nodes_count?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TooltipData {
  x: number;
  y: number;
  node?: ScaleNode;
  flow?: Flow;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cluster Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ClusterData {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  polygon: [number, number][];
  nodeCount: number;
  totalValue: number;
  avgM2C?: number;
  color?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const RANK_COLORS: Record<Rank, [number, number, number]> = {
  'Sovereign': [255, 215, 0],
  'Archon': [192, 192, 192],
  'Validator': [205, 127, 50],
  'Operator': [65, 105, 225],
  'Terminal': [128, 128, 128],
};

export const FLOW_TYPE_COLORS: Record<FlowType, [number, number, number, number]> = {
  trade: [0, 255, 255, 180],
  investment: [255, 215, 0, 180],
  aid: [0, 255, 0, 180],
  remittance: [255, 165, 0, 180],
  tax: [255, 0, 0, 180],
  salary: [0, 191, 255, 180],
  dividend: [148, 0, 211, 180],
  loan: [255, 20, 147, 180],
  payment: [192, 192, 192, 180],
};

export const SCALE_LABELS: Record<ScaleLevel, string> = {
  'L0': 'World',
  'L1': 'Country',
  'L2': 'City',
  'L3': 'District',
  'L4': 'Block',
};
