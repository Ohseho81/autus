// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Type Definitions (LOCK SPEC)
// ═══════════════════════════════════════════════════════════════════════════════

// Event Categories (12 LOCKED)
export type EventCategory =
  | 'Init'
  | 'Progress'
  | 'Delay'
  | 'Discovery'
  | 'Collision'
  | 'Decision'
  | 'Validation'
  | 'Shock'
  | 'Deal'
  | 'Org'
  | 'External'
  | 'EndAbort';

// Shape mapping for categories (LOCKED)
export const CATEGORY_SHAPES: Record<EventCategory, string> = {
  Init: '●',
  Progress: '▶',
  Delay: '⏸',
  Discovery: '✦',
  Collision: '✖',
  Decision: '⬡',
  Validation: '✓',
  Shock: '⚡',
  Deal: '⬌',
  Org: '⬢',
  External: '◐',
  EndAbort: '⊘',
};

// Station definition
export interface Station {
  station_id: string;
  label: string;           // AUTUS event label
  x: number;
  y: number;
  is_transfer: boolean;
  transfer_lines?: string[];
  is_exit?: boolean;
  category?: EventCategory;
}

// Line definition
export interface Line {
  line_id: string;
  name: string;
  color_hex: string;
  path_station_ids: string[];
  is_circular?: boolean;
}

// Transfer station with switch costs
export interface Transfer {
  station_id: string;
  options: string[];  // line_ids
  switch_cost: PhysicsDelta;
}

// Physics delta (core state changes)
export interface PhysicsDelta {
  dt: number;   // time delta
  dE: number;   // energy delta
  dS: number;   // entropy delta
  dR: number;   // risk delta
}

// Entity state (rider on metro)
export interface EntityState {
  entity_id: string;
  t: number;      // time
  E: number;      // energy (0-1)
  S: number;      // entropy (0-1)
  R: number;      // risk (0-1)
  current_station_id: string;
  current_line_id: string;
  path_history: string[];  // station_ids
  color: string;
  is_critical: boolean;
}

// Event emitted during simulation
export interface MetroEvent {
  event_id: string;
  station_id: string;
  entity_id: string;
  category: EventCategory;
  delta: PhysicsDelta;
  timestamp: number;
  meta?: Record<string, unknown>;
}

// Mission definition
export interface Mission {
  mission_id: string;
  name: string;
  description: string;
  start_station_id: string;
  end_station_id?: string;
  target_state?: Partial<EntityState>;
  events: MetroEvent[];
}

// Complete Metro Model
export interface MetroModel {
  lines: Line[];
  stations: Station[];
  transfers: Transfer[];
}

// Visibility levels (LOCKED)
export type VisibilityLevel = 0 | 1 | 2 | 3 | 4;

// Feature flags
export interface FeatureFlags {
  multiEntity: boolean;
  collision: boolean;
  autoReroute: boolean;
  ghostLine: boolean;
  timeCompression: boolean;
  externalField: boolean;
  aiRecommend: boolean;
  entropyHeatmap: boolean;
  successLoopHighlight: boolean;
  exportEnabled: boolean;
  devOverlay: boolean;
}

// Default feature flags (ALL ON)
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  multiEntity: true,
  collision: true,
  autoReroute: true,
  ghostLine: true,
  timeCompression: true,
  externalField: true,
  aiRecommend: true,
  entropyHeatmap: true,
  successLoopHighlight: true,
  exportEnabled: true,
  devOverlay: import.meta.env.DEV,
};

// Time compression modes
export type TimeCompression = 1 | 10 | 100;

// PNR threshold
export const PNR_THRESHOLD = 0.7;
