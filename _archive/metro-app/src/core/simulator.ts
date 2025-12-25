// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Simulator
// Time compression, ghost lines, reroute generation
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  EntityState, 
  Station, 
  Line, 
  MetroModel, 
  PhysicsDelta,
  TimeCompression,
  PNR_THRESHOLD
} from './types';
import {
  calcMovementDelta,
  calcPNR,
  applyDelta,
  calcDistance,
  isCritical,
  forecastState
} from './physics_kernel';

/**
 * Create new entity at starting station
 */
export function createEntity(
  entityId: string,
  startStation: Station,
  lineId: string,
  color: string = '#00A84D'
): EntityState {
  return {
    entity_id: entityId,
    t: 0,
    E: 1.0,
    S: 0.1,
    R: 0.0,
    current_station_id: startStation.station_id,
    current_line_id: lineId,
    path_history: [startStation.station_id],
    color,
    is_critical: false,
  };
}

/**
 * Move entity to next station
 */
export function moveEntity(
  entity: EntityState,
  fromStation: Station,
  toStation: Station,
  isTransfer: boolean = false
): { entity: EntityState; delta: PhysicsDelta } {
  const distance = calcDistance(fromStation.x, fromStation.y, toStation.x, toStation.y);
  const delta = calcMovementDelta(distance / 50, isTransfer, entity.S); // Normalize distance
  
  const newEntity: EntityState = {
    ...applyDelta(entity, delta),
    current_station_id: toStation.station_id,
    path_history: [...entity.path_history, toStation.station_id],
  };
  
  newEntity.is_critical = isCritical(
    calcPNR(newEntity.E, newEntity.S, newEntity.R, newEntity.t)
  );
  
  return { entity: newEntity, delta };
}

/**
 * Get next stations from current position
 */
export function getNextStations(
  model: MetroModel,
  currentStationId: string,
  currentLineId: string
): Station[] {
  const line = model.lines.find(l => l.line_id === currentLineId);
  if (!line) return [];
  
  const idx = line.path_station_ids.indexOf(currentStationId);
  if (idx === -1) return [];
  
  const nextIds: string[] = [];
  
  // Forward direction
  if (idx < line.path_station_ids.length - 1) {
    nextIds.push(line.path_station_ids[idx + 1]);
  }
  
  // Backward direction
  if (idx > 0) {
    nextIds.push(line.path_station_ids[idx - 1]);
  }
  
  // Circular line wrap-around
  if (line.is_circular) {
    if (idx === 0) {
      nextIds.push(line.path_station_ids[line.path_station_ids.length - 1]);
    }
    if (idx === line.path_station_ids.length - 1) {
      nextIds.push(line.path_station_ids[0]);
    }
  }
  
  return nextIds
    .map(id => model.stations.find(s => s.station_id === id))
    .filter((s): s is Station => s !== undefined);
}

/**
 * Find shortest path between two stations (BFS)
 */
export function findPath(
  model: MetroModel,
  startId: string,
  endId: string
): string[] {
  const visited = new Set<string>();
  const queue: { stationId: string; path: string[] }[] = [
    { stationId: startId, path: [startId] }
  ];
  
  while (queue.length > 0) {
    const { stationId, path } = queue.shift()!;
    
    if (stationId === endId) {
      return path;
    }
    
    if (visited.has(stationId)) continue;
    visited.add(stationId);
    
    // Get all connected stations across all lines
    const station = model.stations.find(s => s.station_id === stationId);
    if (!station) continue;
    
    const connectedLines = station.is_transfer 
      ? station.transfer_lines || [] 
      : model.lines
          .filter(l => l.path_station_ids.includes(stationId))
          .map(l => l.line_id);
    
    for (const lineId of connectedLines) {
      const nextStations = getNextStations(model, stationId, lineId);
      for (const next of nextStations) {
        if (!visited.has(next.station_id)) {
          queue.push({
            stationId: next.station_id,
            path: [...path, next.station_id]
          });
        }
      }
    }
  }
  
  return []; // No path found
}

/**
 * Generate alternative route when current route is critical
 */
export function generateReroute(
  model: MetroModel,
  entity: EntityState,
  targetStationId: string
): string[] {
  // Find current station
  const currentStation = model.stations.find(
    s => s.station_id === entity.current_station_id
  );
  if (!currentStation) return [];
  
  // Find all possible routes
  const directPath = findPath(model, entity.current_station_id, targetStationId);
  
  // If entity is critical, find alternative that avoids recent path
  if (entity.is_critical && directPath.length > 2) {
    // Try to find path avoiding last few visited stations
    const avoidSet = new Set(entity.path_history.slice(-3));
    
    // Simple alternative: find path through a different transfer station
    const transferStations = model.stations.filter(
      s => s.is_transfer && !avoidSet.has(s.station_id)
    );
    
    for (const transfer of transferStations) {
      const pathToTransfer = findPath(
        model, 
        entity.current_station_id, 
        transfer.station_id
      );
      const pathFromTransfer = findPath(
        model,
        transfer.station_id,
        targetStationId
      );
      
      if (pathToTransfer.length > 0 && pathFromTransfer.length > 0) {
        const altPath = [...pathToTransfer, ...pathFromTransfer.slice(1)];
        // Return if alternative is not too much longer
        if (altPath.length <= directPath.length * 1.5) {
          return altPath;
        }
      }
    }
  }
  
  return directPath;
}

/**
 * Simulate multiple time steps
 */
export function simulateSteps(
  entity: EntityState,
  model: MetroModel,
  targetStationId: string,
  steps: number,
  timeCompression: TimeCompression = 1
): { entity: EntityState; deltas: PhysicsDelta[] }[] {
  const results: { entity: EntityState; deltas: PhysicsDelta[] }[] = [];
  let currentEntity = entity;
  
  const path = findPath(model, entity.current_station_id, targetStationId);
  if (path.length === 0) return results;
  
  for (let i = 0; i < Math.min(steps, path.length - 1); i++) {
    const fromStation = model.stations.find(s => s.station_id === path[i])!;
    const toStation = model.stations.find(s => s.station_id === path[i + 1])!;
    
    // Check if this is a transfer
    const isTransfer = fromStation.is_transfer && 
      fromStation.transfer_lines?.some(l => 
        model.lines.find(line => line.line_id === l)?.path_station_ids.includes(toStation.station_id)
      );
    
    const { entity: newEntity, delta } = moveEntity(
      currentEntity,
      fromStation,
      toStation,
      isTransfer
    );
    
    // Apply time compression
    const compressedDelta = {
      ...delta,
      dt: delta.dt / timeCompression,
    };
    
    results.push({
      entity: newEntity,
      deltas: [compressedDelta],
    });
    
    currentEntity = newEntity;
  }
  
  return results;
}

/**
 * Forecast entity state at target station
 */
export function forecastAtStation(
  entity: EntityState,
  model: MetroModel,
  targetStationId: string
): EntityState | null {
  const path = findPath(model, entity.current_station_id, targetStationId);
  if (path.length === 0) return null;
  
  const deltas: PhysicsDelta[] = [];
  
  for (let i = 0; i < path.length - 1; i++) {
    const fromStation = model.stations.find(s => s.station_id === path[i])!;
    const toStation = model.stations.find(s => s.station_id === path[i + 1])!;
    
    const distance = calcDistance(fromStation.x, fromStation.y, toStation.x, toStation.y);
    const isTransfer = fromStation.is_transfer;
    
    deltas.push(calcMovementDelta(distance / 50, isTransfer, entity.S));
  }
  
  return forecastState(entity, deltas);
}

/**
 * Get ghost trail (history visualization data)
 */
export function getGhostTrail(
  entity: EntityState,
  model: MetroModel,
  maxLength: number = 10
): { x: number; y: number; opacity: number }[] {
  const trail: { x: number; y: number; opacity: number }[] = [];
  const history = entity.path_history.slice(-maxLength);
  
  history.forEach((stationId, idx) => {
    const station = model.stations.find(s => s.station_id === stationId);
    if (station) {
      trail.push({
        x: station.x,
        y: station.y,
        opacity: (idx + 1) / history.length * 0.6,
      });
    }
  });
  
  return trail;
}

/**
 * Detect stable loop (circular path with improving metrics)
 */
export function detectStableLoop(
  entity: EntityState,
  model: MetroModel
): { isLoop: boolean; stations: string[] } {
  const history = entity.path_history;
  if (history.length < 5) {
    return { isLoop: false, stations: [] };
  }
  
  // Check for repeated sequence
  const recent = history.slice(-10);
  const seen = new Map<string, number>();
  
  for (let i = 0; i < recent.length; i++) {
    const id = recent[i];
    if (seen.has(id)) {
      // Found a repeat - check if it's a complete loop
      const loopStart = seen.get(id)!;
      const loopStations = recent.slice(loopStart, i + 1);
      
      if (loopStations.length >= 3) {
        return { isLoop: true, stations: loopStations };
      }
    }
    seen.set(id, i);
  }
  
  return { isLoop: false, stations: [] };
}

/**
 * AI recommendation for next transfer (rule-based phase 1)
 */
export function recommendTransfer(
  entity: EntityState,
  model: MetroModel,
  targetStationId: string
): { lineId: string; reason: string; forecast: EntityState } | null {
  const currentStation = model.stations.find(
    s => s.station_id === entity.current_station_id
  );
  
  if (!currentStation?.is_transfer) return null;
  
  const transfer = model.transfers.find(
    t => t.station_id === currentStation.station_id
  );
  
  if (!transfer) return null;
  
  let bestOption: { lineId: string; reason: string; forecast: EntityState } | null = null;
  let bestPNR = Infinity;
  
  for (const lineId of transfer.options) {
    // Simulate taking this line
    const line = model.lines.find(l => l.line_id === lineId);
    if (!line) continue;
    
    // Apply switch cost
    const afterSwitch = applyDelta(entity, transfer.switch_cost);
    const newEntity = { ...afterSwitch, current_line_id: lineId };
    
    // Forecast to target
    const forecast = forecastAtStation(newEntity, model, targetStationId);
    if (!forecast) continue;
    
    const pnr = calcPNR(forecast.E, forecast.S, forecast.R, forecast.t);
    
    if (pnr < bestPNR) {
      bestPNR = pnr;
      bestOption = {
        lineId,
        reason: `Minimizes PNR to ${(pnr * 100).toFixed(1)}%`,
        forecast,
      };
    }
  }
  
  return bestOption;
}

/**
 * Export current state to JSON
 */
export function exportState(
  model: MetroModel,
  entities: EntityState[],
  events: unknown[]
): string {
  return JSON.stringify({
    timestamp: Date.now(),
    model,
    entities,
    events,
  }, null, 2);
}
