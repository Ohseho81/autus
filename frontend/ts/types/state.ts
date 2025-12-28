/**
 * AUTUS Type Definitions (정본)
 * ============================
 * 
 * 공유 타입 정의
 * 
 * Version: 1.0.0
 * Status: LOCKED
 */

// ================================================================
// ENUMS
// ================================================================

export type UIMode = 'SIM' | 'LIVE';
export type NodeType = 'POTENTIAL' | 'KINETIC' | 'STABLE' | 'CRITICAL';
export type EntityType = 'SELF' | 'GOAL' | 'L1' | 'L2';
export type Horizon = 'H1' | 'D1' | 'D7' | 'D30' | 'D180';

// ================================================================
// MEASURE
// ================================================================

export interface Measure {
  M: number;           // Mass [0, ∞)
  E: number;           // Energy [0, 1]
  dE_dt: number;       // Energy rate
  sigma: number;       // Entropy [0, 1]
  leak: number;        // Loss rate [0, 1]
  pressure: number;    // 1 - leak [0, 1]
  volume: number;      // Goal radius [0.01, 1]
  density: number;     // E * pressure / volume
  stability: number;   // 1 - sigma [0, 1]
  recovery: number;    // Recovery rate
  node_type: NodeType;
}

// ================================================================
// FORECAST
// ================================================================

export interface Trajectory {
  samples: number[];
  confidence: number;
}

export interface Forecast {
  horizon: Horizon;
  trajectory: Trajectory;
}

// ================================================================
// GRAPH
// ================================================================

export interface GraphNode {
  id: string;
  mass: number;
  sigma: number;
  density: number;
  type: EntityType;
  layer: number;
  position?: { x: number; y: number; z: number };
}

export interface GraphEdge {
  a: string;
  b: string;
  flow: number;
  sigma: number;
}

export interface Graph {
  anchor_node_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ================================================================
// UI STATE
// ================================================================

export interface UIState {
  mode: UIMode;
  page: 1 | 2 | 3;
  hud_visible: boolean;
}

// ================================================================
// DRAFT
// ================================================================

export interface DraftPage1 {
  mass_modifier: number;       // [-0.5, 0.5]
  volume_override: number;     // [0.3, 0.9]
  horizon_override: Horizon;
}

export interface DraftPage2 {
  mass_filter: number;         // [0, 1]
  flow_filter: number;         // [0, 1]
  sigma_filter: number;        // [0, 1]
  virtual_anchor_shift: [number, number];
  ops?: NodeOperation[];
}

export interface NodeOperation {
  node_id: string;
  op: 'resize' | 'delete' | 'add';
  delta?: number;
}

export interface DraftPage3 {
  allocations: {
    N: number;
    NE: number;
    E: number;
    SE: number;
    S: number;
    SW: number;
    W: number;
    NW: number;
  };
}

export interface Draft {
  page1: DraftPage1;
  page2: DraftPage2;
  page3: DraftPage3;
}

// ================================================================
// REPLAY
// ================================================================

export interface ReplayMarker {
  id: string;
  t_ms: number;
  hash: string;
  mode: UIMode;
}

export interface Replay {
  last_marker_id: string | null;
  markers: ReplayMarker[];
}

// ================================================================
// AUTUS STATE (Complete)
// ================================================================

export interface AutusState {
  version: string;
  session_id: string;
  t_ms: number;
  
  measure: Measure;
  forecast: Forecast;
  graph: Graph;
  ui: UIState;
  draft: Draft;
  replay: Replay;
}

// ================================================================
// API TYPES
// ================================================================

export interface DraftUpdateRequest {
  page: 1 | 2 | 3;
  updates: Partial<DraftPage1> | Partial<DraftPage2> | Partial<DraftPage3>;
}

export interface CommitRequest {
  confirm: boolean;
  commit_message?: string;
}

export interface StateResponse {
  success: boolean;
  state: AutusState;
}

export interface CommitResponse {
  success: boolean;
  mode: UIMode;
  marker_id: string;
  hash: string;
}

// ================================================================
// DEFAULT STATE
// ================================================================

export const DEFAULT_STATE: AutusState = {
  version: 'autus.state.v1',
  session_id: '',
  t_ms: 0,
  
  measure: {
    M: 1.0,
    E: 0.5,
    dE_dt: 0.0,
    sigma: 0.3,
    leak: 0.1,
    pressure: 0.9,
    volume: 0.5,
    density: 0.9,
    stability: 0.7,
    recovery: 0.1,
    node_type: 'POTENTIAL',
  },
  
  forecast: {
    horizon: 'D1',
    trajectory: {
      samples: [0, 0, 0, 0],
      confidence: 0.5,
    },
  },
  
  graph: {
    anchor_node_id: 'SELF',
    nodes: [
      { id: 'SELF', mass: 1.0, sigma: 0.3, density: 0.9, type: 'SELF', layer: 0 },
    ],
    edges: [],
  },
  
  ui: {
    mode: 'SIM',
    page: 1,
    hud_visible: false,
  },
  
  draft: {
    page1: { mass_modifier: 0, volume_override: 0.5, horizon_override: 'D1' },
    page2: { mass_filter: 0, flow_filter: 0, sigma_filter: 1, virtual_anchor_shift: [0, 0] },
    page3: {
      allocations: {
        N: 0.125, NE: 0.125, E: 0.125, SE: 0.125,
        S: 0.125, SW: 0.125, W: 0.125, NW: 0.125,
      },
    },
  },
  
  replay: {
    last_marker_id: null,
    markers: [],
  },
};
