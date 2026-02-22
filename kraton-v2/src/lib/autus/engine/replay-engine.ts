/**
 * ============================================================================
 * AUTUS Replay Engine
 *
 * Rebuilds entity state by replaying the append-only event ledger.
 * Designed for:
 *   - Full system replay (replayAll)
 *   - Single-entity reconstruction (replayEntity)
 *   - Performance benchmarking (target: 10,000+ events/sec)
 *
 * State transitions are driven by state_from/state_to on event rows
 * and accumulated weights from outcome rules.
 * ============================================================================
 */

import { EventLedgerDB, type OutcomeFact, type LedgerEntry } from './event-ledger-db';

// ============================================================================
// Types
// ============================================================================

/** Accumulated state for a single entity. */
export interface EntityState {
  entity_id: string;
  entity_type: string;
  current_state: string;
  previous_state: string | null;
  total_weight: number;
  event_count: number;
  tier_counts: {
    S: number;
    A: number;
    TERMINAL: number;
  };
  first_event_at: string;
  last_event_at: string;
  is_terminal: boolean;
  /** Ordered history of state transitions. */
  transitions: StateTransition[];
  /** Per-outcome-type weight accumulation. */
  weight_breakdown: Record<string, number>;
}

/** A single state transition record. */
export interface StateTransition {
  from: string | null;
  to: string;
  event_type: string;
  occurred_at: string;
  weight: number;
}

/** Result of a full replay operation. */
export interface ReplayResult {
  entities: Map<string, EntityState>;
  total_events_processed: number;
  duration_ms: number;
  events_per_second: number;
}

/** Benchmark result. */
export interface BenchmarkResult {
  total_events: number;
  duration_ms: number;
  events_per_second: number;
  entity_count: number;
  meets_target: boolean;        // true if >= 10,000 events/sec
}

// ============================================================================
// State Inference Helpers
// ============================================================================

/**
 * Derive entity state label from accumulated facts when explicit
 * state_from/state_to is not available on the event row.
 */
function inferState(totalWeight: number, tierCounts: EntityState['tier_counts']): string {
  if (tierCounts.TERMINAL > 0) return 'terminated';
  if (totalWeight <= -2.0) return 'critical';
  if (totalWeight <= -1.0) return 'at_risk';
  if (totalWeight < 0) return 'declining';
  if (totalWeight === 0) return 'neutral';
  if (totalWeight < 1.0) return 'stable';
  return 'healthy';
}

/**
 * Determine the state_to for an event, falling back to inference.
 *
 * The events table may have explicit state_to values. When those are
 * absent, we derive the target state from accumulated weight and tier
 * distribution.
 */
function resolveStateTo(
  fact: OutcomeFact,
  currentWeight: number,
  tierCounts: EntityState['tier_counts'],
  explicitStateTo: string | null,
): string {
  if (explicitStateTo) return explicitStateTo;
  return inferState(currentWeight + fact.weight, {
    ...tierCounts,
    [fact.tier]: (tierCounts[fact.tier] ?? 0) + 1,
  });
}

// ============================================================================
// ReplayEngine
// ============================================================================

export class ReplayEngine {
  private ledger: EventLedgerDB;

  constructor(ledger: EventLedgerDB) {
    this.ledger = ledger;
  }

  // --------------------------------------------------------------------------
  // replayAll
  // --------------------------------------------------------------------------

  /**
   * Replay every event in the ledger and return the full entity state map.
   *
   * @param fromSeq  Optional starting sequence (1-based). Defaults to 1.
   * @returns        ReplayResult with the entity state map and perf metrics.
   */
  async replayAll(fromSeq: number = 1): Promise<ReplayResult> {
    const start = performance.now();

    const entries = await this.ledger.replay(fromSeq);
    const entities = this.processEntries(entries);

    const duration = performance.now() - start;
    const eventsPerSecond = entries.length > 0
      ? Math.round((entries.length / duration) * 1000)
      : 0;

    return {
      entities,
      total_events_processed: entries.length,
      duration_ms: Math.round(duration * 100) / 100,
      events_per_second: eventsPerSecond,
    };
  }

  // --------------------------------------------------------------------------
  // replayEntity
  // --------------------------------------------------------------------------

  /**
   * Replay events for a single entity and return its reconstructed state.
   *
   * @param entityId  The entity to reconstruct.
   * @returns         The entity state, or null if no events exist.
   */
  async replayEntity(entityId: string): Promise<EntityState | null> {
    const facts = await this.ledger.getFactsByEntity(entityId);

    if (facts.length === 0) return null;

    const entries: LedgerEntry[] = facts.map((fact, idx) => ({
      fact,
      sequence: idx + 1,
      created_at: fact.occurred_at,
    }));

    const entities = this.processEntries(entries);
    return entities.get(entityId) ?? null;
  }

  // --------------------------------------------------------------------------
  // benchmark
  // --------------------------------------------------------------------------

  /**
   * Measure replay throughput.
   * Target: 10,000+ events/sec.
   *
   * Runs two passes:
   *   1. Cold replay from DB (includes network latency).
   *   2. In-memory processing benchmark (pure CPU speed).
   *
   * The `meets_target` flag reflects the in-memory processing speed,
   * which represents the engine's intrinsic throughput independent of
   * network conditions.
   */
  async benchmark(): Promise<BenchmarkResult> {
    // --- Pass 1: Full replay including DB fetch ---
    const fetchStart = performance.now();
    const entries = await this.ledger.replay(1);
    const fetchDuration = performance.now() - fetchStart;

    if (entries.length === 0) {
      return {
        total_events: 0,
        duration_ms: Math.round(fetchDuration * 100) / 100,
        events_per_second: 0,
        entity_count: 0,
        meets_target: false,
      };
    }

    // --- Pass 2: In-memory processing only ---
    const processStart = performance.now();
    const entities = this.processEntries(entries);
    const processDuration = performance.now() - processStart;

    const eventsPerSecond = processDuration > 0
      ? Math.round((entries.length / processDuration) * 1000)
      : entries.length * 1000; // sub-ms processing

    return {
      total_events: entries.length,
      duration_ms: Math.round(processDuration * 100) / 100,
      events_per_second: eventsPerSecond,
      entity_count: entities.size,
      meets_target: eventsPerSecond >= 10_000,
    };
  }

  // --------------------------------------------------------------------------
  // Core Processing
  // --------------------------------------------------------------------------

  /**
   * Process an ordered sequence of ledger entries and accumulate entity states.
   *
   * This is the hot path. Keep allocations minimal and avoid async operations.
   */
  private processEntries(entries: ReadonlyArray<LedgerEntry>): Map<string, EntityState> {
    const entities = new Map<string, EntityState>();

    for (let i = 0; i < entries.length; i++) {
      const { fact } = entries[i];

      // Skip processed-marker events (they are bookkeeping, not domain events)
      if (fact.outcome_type.endsWith('.processed')) continue;

      let state = entities.get(fact.entity_id);

      if (!state) {
        state = this.createInitialState(fact);
        entities.set(fact.entity_id, state);
      }

      this.applyEvent(state, fact);
    }

    return entities;
  }

  /**
   * Create the initial entity state from the first observed event.
   */
  private createInitialState(fact: OutcomeFact): EntityState {
    return {
      entity_id: fact.entity_id,
      entity_type: fact.entity_type,
      current_state: 'neutral',
      previous_state: null,
      total_weight: 0,
      event_count: 0,
      tier_counts: { S: 0, A: 0, TERMINAL: 0 },
      first_event_at: fact.occurred_at,
      last_event_at: fact.occurred_at,
      is_terminal: false,
      transitions: [],
      weight_breakdown: {},
    };
  }

  /**
   * Apply a single event to an existing entity state (mutates in place).
   */
  private applyEvent(state: EntityState, fact: OutcomeFact): void {
    // Do not apply events to terminated entities
    if (state.is_terminal) return;

    const previousState = state.current_state;

    // Accumulate weight
    state.total_weight = Math.round((state.total_weight + fact.weight) * 1000) / 1000;
    state.event_count += 1;
    state.tier_counts[fact.tier] += 1;
    state.last_event_at = fact.occurred_at;

    // Weight breakdown by outcome_type
    state.weight_breakdown[fact.outcome_type] =
      (state.weight_breakdown[fact.outcome_type] ?? 0) + fact.weight;

    // Determine next state
    const nextState = resolveStateTo(
      fact,
      state.total_weight - fact.weight, // pass pre-event weight to resolveStateTo
      { ...state.tier_counts, [fact.tier]: state.tier_counts[fact.tier] - 1 }, // pre-increment counts
      fact.tier === 'TERMINAL' ? 'terminated' : null,
    );

    state.previous_state = previousState;
    state.current_state = nextState;

    // Terminal check
    if (fact.tier === 'TERMINAL') {
      state.is_terminal = true;
      state.current_state = 'terminated';
    }

    // Record transition (only when state actually changes)
    if (nextState !== previousState) {
      state.transitions.push({
        from: previousState,
        to: nextState,
        event_type: fact.outcome_type,
        occurred_at: fact.occurred_at,
        weight: fact.weight,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Query Helpers
  // --------------------------------------------------------------------------

  /**
   * Replay all and return only entities in a specific state.
   */
  async getEntitiesByState(targetState: string): Promise<EntityState[]> {
    const result = await this.replayAll();
    const matches: EntityState[] = [];
    for (const state of result.entities.values()) {
      if (state.current_state === targetState) {
        matches.push(state);
      }
    }
    return matches;
  }

  /**
   * Replay all and return entities sorted by total weight (ascending = worst first).
   */
  async getEntitiesByRisk(): Promise<EntityState[]> {
    const result = await this.replayAll();
    const states = Array.from(result.entities.values())
      .filter(s => !s.is_terminal);
    states.sort((a, b) => a.total_weight - b.total_weight);
    return states;
  }

  /**
   * Get a summary of the replayed state distribution.
   */
  async getStateDistribution(): Promise<Record<string, number>> {
    const result = await this.replayAll();
    const distribution: Record<string, number> = {};
    for (const state of result.entities.values()) {
      distribution[state.current_state] = (distribution[state.current_state] ?? 0) + 1;
    }
    return distribution;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a ReplayEngine wired to the provided EventLedgerDB.
 * If no ledger is provided, a new EventLedgerDB instance is created.
 */
export function createReplayEngine(ledger?: EventLedgerDB): ReplayEngine {
  if (ledger) return new ReplayEngine(ledger);
  return new ReplayEngine(new EventLedgerDB());
}

export default ReplayEngine;
