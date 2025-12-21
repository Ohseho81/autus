// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Zustand Store
// Global state management for metro simulation
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import {
  MetroModel,
  EntityState,
  MetroEvent,
  Mission,
  VisibilityLevel,
  FeatureFlags,
  TimeCompression,
  DEFAULT_FEATURE_FLAGS,
  Station,
} from '../core/types';
import {
  createEntity,
  moveEntity,
  findPath,
  generateReroute,
  recommendTransfer,
  detectStableLoop,
} from '../core/simulator';
import {
  emitStationEvent,
  emitCollisionEvent,
  emitAbortEvent,
  emitExternalEvent,
} from '../core/event_engine';
import {
  detectCollision,
  calcPNR,
} from '../core/physics_kernel';

interface MetroState {
  // Data
  model: MetroModel | null;
  entities: EntityState[];
  events: MetroEvent[];
  missions: Mission[];
  activeMission: Mission | null;
  
  // UI State
  selectedStationId: string | null;
  selectedEntityId: string | null;
  visibilityLevel: VisibilityLevel;
  timeCompression: TimeCompression;
  featureFlags: FeatureFlags;
  showDevOverlay: boolean;
  devOverlayOpacity: number;
  
  // Computed
  isSimulating: boolean;
  reroutePath: string[];
  stableLoop: { isLoop: boolean; stations: string[] };
  
  // Actions
  setModel: (model: MetroModel) => void;
  addEntity: (startStationId: string, lineId: string, color?: string) => void;
  removeEntity: (entityId: string) => void;
  moveEntityTo: (entityId: string, targetStationId: string) => void;
  selectStation: (stationId: string | null) => void;
  selectEntity: (entityId: string | null) => void;
  setVisibilityLevel: (level: VisibilityLevel) => void;
  setTimeCompression: (tc: TimeCompression) => void;
  toggleFeature: (feature: keyof FeatureFlags) => void;
  toggleDevOverlay: () => void;
  setDevOverlayOpacity: (opacity: number) => void;
  
  // Simulation
  stepSimulation: () => void;
  startMission: (mission: Mission) => void;
  endMission: () => void;
  triggerAbort: (entityId: string) => void;
  triggerExternalShock: (magnitude: number) => void;
  
  // Export
  exportToJSON: () => string;
}

let entityCounter = 0;

export const useMetroStore = create<MetroState>((set, get) => ({
  // Initial state
  model: null,
  entities: [],
  events: [],
  missions: [],
  activeMission: null,
  
  selectedStationId: null,
  selectedEntityId: null,
  visibilityLevel: 2,
  timeCompression: 1,
  featureFlags: DEFAULT_FEATURE_FLAGS,
  showDevOverlay: false,
  devOverlayOpacity: 0.3,
  
  isSimulating: false,
  reroutePath: [],
  stableLoop: { isLoop: false, stations: [] },
  
  // Actions
  setModel: (model) => set({ model }),
  
  addEntity: (startStationId, lineId, color) => {
    const { model, entities, featureFlags } = get();
    if (!model) return;
    
    // Check multi-entity limit
    if (!featureFlags.multiEntity && entities.length >= 1) return;
    
    const station = model.stations.find(s => s.station_id === startStationId);
    if (!station) return;
    
    const entityId = `ENTITY_${++entityCounter}`;
    const newEntity = createEntity(
      entityId,
      station,
      lineId,
      color || `hsl(${Math.random() * 360}, 70%, 50%)`
    );
    
    // Emit init event
    const event = emitStationEvent(newEntity, station, 'Init');
    
    set(state => ({
      entities: [...state.entities, newEntity],
      events: [...state.events, event],
    }));
  },
  
  removeEntity: (entityId) => {
    set(state => ({
      entities: state.entities.filter(e => e.entity_id !== entityId),
      selectedEntityId: state.selectedEntityId === entityId ? null : state.selectedEntityId,
    }));
  },
  
  moveEntityTo: (entityId, targetStationId) => {
    const { model, entities, events, featureFlags } = get();
    if (!model) return;
    
    const entityIdx = entities.findIndex(e => e.entity_id === entityId);
    if (entityIdx === -1) return;
    
    const entity = entities[entityIdx];
    const fromStation = model.stations.find(s => s.station_id === entity.current_station_id);
    const toStation = model.stations.find(s => s.station_id === targetStationId);
    
    if (!fromStation || !toStation) return;
    
    // Move entity
    const isTransfer = fromStation.is_transfer && 
      model.transfers.some(t => t.station_id === fromStation.station_id);
    
    const { entity: movedEntity } = moveEntity(entity, fromStation, toStation, isTransfer);
    
    // Emit event
    const event = emitStationEvent(movedEntity, toStation);
    const newEvents = [event];
    
    // Check for collisions
    if (featureFlags.collision) {
      for (const other of entities) {
        if (other.entity_id !== entityId && 
            detectCollision(movedEntity, other)) {
          const collisionEvents = emitCollisionEvent(movedEntity, other, toStation);
          newEvents.push(...collisionEvents);
        }
      }
    }
    
    // Check for stable loop
    let stableLoop = { isLoop: false, stations: [] as string[] };
    if (featureFlags.successLoopHighlight) {
      stableLoop = detectStableLoop(movedEntity, model);
    }
    
    // Generate reroute if critical
    let reroutePath: string[] = [];
    if (featureFlags.autoReroute && movedEntity.is_critical) {
      // Find nearest exit
      const exits = model.stations.filter(s => s.is_exit);
      if (exits.length > 0) {
        reroutePath = generateReroute(model, movedEntity, exits[0].station_id);
      }
    }
    
    // Update state
    const newEntities = [...entities];
    newEntities[entityIdx] = movedEntity;
    
    set({
      entities: newEntities,
      events: [...events, ...newEvents],
      stableLoop,
      reroutePath,
    });
  },
  
  selectStation: (stationId) => set({ selectedStationId: stationId }),
  
  selectEntity: (entityId) => set({ selectedEntityId: entityId }),
  
  setVisibilityLevel: (level) => set({ visibilityLevel: level }),
  
  setTimeCompression: (tc) => set({ timeCompression: tc }),
  
  toggleFeature: (feature) => set(state => ({
    featureFlags: {
      ...state.featureFlags,
      [feature]: !state.featureFlags[feature],
    },
  })),
  
  toggleDevOverlay: () => set(state => ({ showDevOverlay: !state.showDevOverlay })),
  
  setDevOverlayOpacity: (opacity) => set({ devOverlayOpacity: opacity }),
  
  // Simulation
  stepSimulation: () => {
    const { model, entities, activeMission } = get();
    if (!model || !activeMission || entities.length === 0) return;
    
    // Auto-move first entity toward mission end
    const entity = entities[0];
    if (!entity || !activeMission.end_station_id) return;
    
    const path = findPath(model, entity.current_station_id, activeMission.end_station_id);
    if (path.length > 1) {
      get().moveEntityTo(entity.entity_id, path[1]);
    }
  },
  
  startMission: (mission) => {
    const { model } = get();
    if (!model) return;
    
    // Find start station
    const startStation = model.stations.find(
      s => s.station_id === mission.start_station_id
    );
    if (!startStation) return;
    
    // Find line that contains start station
    const line = model.lines.find(l => 
      l.path_station_ids.includes(mission.start_station_id)
    );
    if (!line) return;
    
    // Create entity at start
    get().addEntity(mission.start_station_id, line.line_id);
    
    set({
      activeMission: mission,
      isSimulating: true,
    });
  },
  
  endMission: () => {
    set({
      activeMission: null,
      isSimulating: false,
    });
  },
  
  triggerAbort: (entityId) => {
    const { model, entities, events } = get();
    if (!model) return;
    
    const entity = entities.find(e => e.entity_id === entityId);
    if (!entity) return;
    
    const station = model.stations.find(
      s => s.station_id === entity.current_station_id
    );
    if (!station) return;
    
    const event = emitAbortEvent(entity, station);
    
    set(state => ({
      events: [...state.events, event],
      entities: state.entities.map(e => 
        e.entity_id === entityId 
          ? { ...e, is_critical: true, R: Math.min(1, e.R + 0.3) }
          : e
      ),
    }));
  },
  
  triggerExternalShock: (magnitude) => {
    const { entities, events, featureFlags } = get();
    if (!featureFlags.externalField) return;
    
    const shockEvents = emitExternalEvent(entities, magnitude);
    
    set({
      events: [...events, ...shockEvents],
    });
  },
  
  // Export
  exportToJSON: () => {
    const { model, entities, events, activeMission } = get();
    return JSON.stringify({
      timestamp: Date.now(),
      model,
      entities,
      events,
      activeMission,
    }, null, 2);
  },
}));
