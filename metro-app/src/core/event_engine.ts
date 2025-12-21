// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Event Engine
// Maps events to physics, generates events on station visits
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  EventCategory, 
  MetroEvent, 
  PhysicsDelta, 
  EntityState,
  Station 
} from './types';

// Default delta ranges for each category
const CATEGORY_DELTAS: Record<EventCategory, { min: PhysicsDelta; max: PhysicsDelta }> = {
  Init: {
    min: { dt: 0, dE: 0, dS: 0, dR: 0 },
    max: { dt: 1, dE: 0.1, dS: 0.05, dR: 0.02 },
  },
  Progress: {
    min: { dt: 1, dE: -0.02, dS: 0.01, dR: 0 },
    max: { dt: 3, dE: -0.05, dS: 0.03, dR: 0.01 },
  },
  Delay: {
    min: { dt: 3, dE: -0.05, dS: 0.05, dR: 0.02 },
    max: { dt: 8, dE: -0.1, dS: 0.1, dR: 0.05 },
  },
  Discovery: {
    min: { dt: 1, dE: 0.05, dS: -0.02, dR: -0.02 },
    max: { dt: 2, dE: 0.15, dS: 0.02, dR: 0 },
  },
  Collision: {
    min: { dt: 3, dE: -0.1, dS: 0.1, dR: 0.05 },
    max: { dt: 8, dE: -0.2, dS: 0.2, dR: 0.15 },
  },
  Decision: {
    min: { dt: 2, dE: -0.05, dS: 0.02, dR: 0.02 },
    max: { dt: 5, dE: -0.1, dS: 0.08, dR: 0.08 },
  },
  Validation: {
    min: { dt: 1, dE: 0.02, dS: -0.05, dR: -0.03 },
    max: { dt: 3, dE: 0.08, dS: 0, dR: 0 },
  },
  Shock: {
    min: { dt: 2, dE: -0.15, dS: 0.15, dR: 0.1 },
    max: { dt: 10, dE: -0.3, dS: 0.3, dR: 0.25 },
  },
  Deal: {
    min: { dt: 2, dE: 0.05, dS: 0.02, dR: -0.02 },
    max: { dt: 5, dE: 0.15, dS: 0.05, dR: 0.02 },
  },
  Org: {
    min: { dt: 1, dE: -0.02, dS: 0.03, dR: 0.01 },
    max: { dt: 4, dE: -0.05, dS: 0.08, dR: 0.03 },
  },
  External: {
    min: { dt: 0, dE: -0.1, dS: 0.1, dR: 0.05 },
    max: { dt: 5, dE: -0.2, dS: 0.2, dR: 0.15 },
  },
  EndAbort: {
    min: { dt: 5, dE: -0.2, dS: 0.15, dR: 0.1 },
    max: { dt: 15, dE: -0.4, dS: 0.3, dR: 0.2 },
  },
};

let eventCounter = 0;

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `EVT_${Date.now()}_${++eventCounter}`;
}

/**
 * Interpolate between min and max based on context factor (0-1)
 */
function interpolateDelta(
  min: PhysicsDelta,
  max: PhysicsDelta,
  factor: number
): PhysicsDelta {
  const f = Math.max(0, Math.min(1, factor));
  return {
    dt: min.dt + (max.dt - min.dt) * f,
    dE: min.dE + (max.dE - min.dE) * f,
    dS: min.dS + (max.dS - min.dS) * f,
    dR: min.dR + (max.dR - min.dR) * f,
  };
}

/**
 * Calculate context factor based on entity state
 */
function calcContextFactor(state: EntityState): number {
  // Higher factor when entity is stressed (high S, high R, low E)
  return (state.S + state.R + (1 - state.E)) / 3;
}

/**
 * Generate physics delta for a category based on context
 */
export function generateDelta(
  category: EventCategory,
  state: EntityState
): PhysicsDelta {
  const range = CATEGORY_DELTAS[category];
  const factor = calcContextFactor(state);
  return interpolateDelta(range.min, range.max, factor);
}

/**
 * Emit event when entity visits a station
 */
export function emitStationEvent(
  entity: EntityState,
  station: Station,
  category?: EventCategory
): MetroEvent {
  // Determine category based on station properties if not provided
  const eventCategory = category || determineCategory(station, entity);
  const delta = generateDelta(eventCategory, entity);
  
  return {
    event_id: generateEventId(),
    station_id: station.station_id,
    entity_id: entity.entity_id,
    category: eventCategory,
    delta,
    timestamp: Date.now(),
    meta: {
      station_label: station.label,
      is_transfer: station.is_transfer,
    },
  };
}

/**
 * Determine event category based on station and entity state
 */
function determineCategory(station: Station, entity: EntityState): EventCategory {
  // If station has explicit category, use it
  if (station.category) {
    return station.category;
  }
  
  // Exit stations trigger EndAbort
  if (station.is_exit) {
    return 'EndAbort';
  }
  
  // Transfer stations trigger Decision
  if (station.is_transfer) {
    return 'Decision';
  }
  
  // First station is Init
  if (entity.path_history.length === 0) {
    return 'Init';
  }
  
  // Based on entity state
  if (entity.R > 0.7) {
    return 'Shock';
  }
  
  if (entity.S > 0.6) {
    return 'Delay';
  }
  
  if (entity.E < 0.3) {
    return 'Collision';
  }
  
  // Default to Progress
  return 'Progress';
}

/**
 * Create collision event between two entities
 */
export function emitCollisionEvent(
  entity1: EntityState,
  entity2: EntityState,
  station: Station
): MetroEvent[] {
  const baseDelta = CATEGORY_DELTAS.Collision;
  const factor = 0.7; // Collision is always somewhat severe
  const delta = interpolateDelta(baseDelta.min, baseDelta.max, factor);
  
  return [
    {
      event_id: generateEventId(),
      station_id: station.station_id,
      entity_id: entity1.entity_id,
      category: 'Collision',
      delta,
      timestamp: Date.now(),
      meta: {
        collision_with: entity2.entity_id,
        station_label: station.label,
      },
    },
    {
      event_id: generateEventId(),
      station_id: station.station_id,
      entity_id: entity2.entity_id,
      category: 'Collision',
      delta,
      timestamp: Date.now(),
      meta: {
        collision_with: entity1.entity_id,
        station_label: station.label,
      },
    },
  ];
}

/**
 * Create external shock event (global or regional)
 */
export function emitExternalEvent(
  entities: EntityState[],
  magnitude: number = 0.5
): MetroEvent[] {
  const baseDelta = CATEGORY_DELTAS.External;
  const delta = interpolateDelta(baseDelta.min, baseDelta.max, magnitude);
  
  return entities.map(entity => ({
    event_id: generateEventId(),
    station_id: entity.current_station_id,
    entity_id: entity.entity_id,
    category: 'External' as EventCategory,
    delta,
    timestamp: Date.now(),
    meta: {
      type: 'external_shock',
      magnitude,
    },
  }));
}

/**
 * Create abort event
 */
export function emitAbortEvent(
  entity: EntityState,
  station: Station
): MetroEvent {
  const baseDelta = CATEGORY_DELTAS.EndAbort;
  const factor = calcContextFactor(entity);
  const delta = interpolateDelta(baseDelta.min, baseDelta.max, factor);
  
  return {
    event_id: generateEventId(),
    station_id: station.station_id,
    entity_id: entity.entity_id,
    category: 'EndAbort',
    delta,
    timestamp: Date.now(),
    meta: {
      reason: 'user_abort',
      final_state: { E: entity.E, S: entity.S, R: entity.R },
    },
  };
}

/**
 * Get all events for replay
 */
export function filterEventsByEntity(
  events: MetroEvent[],
  entityId: string
): MetroEvent[] {
  return events.filter(e => e.entity_id === entityId);
}

/**
 * Get events at specific station
 */
export function filterEventsByStation(
  events: MetroEvent[],
  stationId: string
): MetroEvent[] {
  return events.filter(e => e.station_id === stationId);
}
