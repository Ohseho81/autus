/**
 * ============================================================================
 * AUTUS Event Ledger (DB-backed)
 *
 * Append-only event ledger backed by Supabase `events` table.
 * Extends the in-memory fact_ledger.ts pattern with persistent storage,
 * idempotency guarantees, and DB-level sequence tracking.
 *
 * Rules:
 *   - INSERT only. Never UPDATE or DELETE rows.
 *   - Idempotency: duplicate idempotency_key is silently skipped.
 *   - Tier auto-classified from outcome_rules.
 *   - Sequence numbers are monotonically increasing per fetch.
 * ============================================================================
 */

import { supabase } from '../../supabase/client';

// ============================================================================
// Outcome Rules (embedded, mirrors outcome_rules.json)
// ============================================================================

interface OutcomeRuleEntry {
  tier: 'S' | 'A' | 'TERMINAL';
  weight: number;
  process?: string;
  terminal?: boolean;
}

const OUTCOME_RULES: Record<string, OutcomeRuleEntry> = {
  'renewal.failed': {
    tier: 'S',
    weight: -1.0,
    process: 'retention_process',
  },
  'attendance.drop': {
    tier: 'S',
    weight: -0.5,
    process: 'recovery_process',
  },
  'notification.ignored': {
    tier: 'S',
    weight: -0.3,
    process: 'engagement_process',
  },
  'renewal.succeeded': {
    tier: 'A',
    weight: 1.0,
  },
  'attendance.normal': {
    tier: 'A',
    weight: 0.3,
  },
  'notification.read': {
    tier: 'A',
    weight: 0.2,
  },
  'churn.finalized': {
    tier: 'TERMINAL',
    weight: -2.0,
    terminal: true,
  },
  'teacher.changed': {
    tier: 'TERMINAL',
    weight: 0,
    terminal: true,
  },
};

// ============================================================================
// Types
// ============================================================================

/** Domain-level fact (matches the in-memory OutcomeFact interface). */
export interface OutcomeFact {
  id: string;
  outcome_type: string;       // e.g. 'renewal.failed'
  entity_id: string;
  entity_type: string;        // 'student', 'parent', etc.
  weight: number;
  tier: 'S' | 'A' | 'TERMINAL';
  metadata?: Record<string, unknown>;
  occurred_at: string;
  idempotency_key?: string;
}

/** Row shape of the Supabase `events` table. */
export interface EventRow {
  id: string;
  event_type: string;
  event_category: string;     // maps to tier
  entity_id: string;
  entity_type: string;
  state_from: string | null;
  state_to: string | null;
  payload: Record<string, unknown>;
  actor_type: string | null;
  source: string | null;
  severity: string | null;
  occurred_at: string;
  created_at?: string;
}

/** Ledger entry with sequence tracking. */
export interface LedgerEntry {
  fact: OutcomeFact;
  sequence: number;
  created_at: string;
}

/** Result of an append operation. */
export interface AppendResult {
  success: boolean;
  fact: OutcomeFact | null;
  skipped: boolean;            // true when idempotency_key already exists
  error?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function classifyTier(outcomeType: string): OutcomeRuleEntry | null {
  return OUTCOME_RULES[outcomeType] ?? null;
}

/**
 * Deterministic ID generator.
 * Combines timestamp + random suffix to avoid collisions without crypto deps.
 */
function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 11);
  return `evt_${ts}_${rand}`;
}

/**
 * Map an OutcomeFact to the Supabase `events` table insert shape.
 */
function factToEventInsert(fact: OutcomeFact): Omit<EventRow, 'created_at'> {
  return {
    id: fact.id,
    event_type: fact.outcome_type,
    event_category: fact.tier,
    entity_id: fact.entity_id,
    entity_type: fact.entity_type,
    state_from: null,
    state_to: fact.tier === 'TERMINAL' ? 'terminated' : null,
    payload: {
      weight: fact.weight,
      idempotency_key: fact.idempotency_key ?? null,
      ...(fact.metadata ?? {}),
    },
    actor_type: 'system',
    source: 'event_ledger',
    severity: fact.tier === 'S' ? 'critical' : fact.tier === 'TERMINAL' ? 'info' : 'low',
    occurred_at: fact.occurred_at,
  };
}

/**
 * Map a Supabase `events` row back to an OutcomeFact.
 */
function eventRowToFact(row: EventRow): OutcomeFact {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const { weight, idempotency_key, ...metadata } = payload;

  return {
    id: row.id,
    outcome_type: row.event_type,
    entity_id: row.entity_id,
    entity_type: row.entity_type,
    weight: typeof weight === 'number' ? weight : 0,
    tier: (row.event_category as 'S' | 'A' | 'TERMINAL') ?? 'A',
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    occurred_at: row.occurred_at,
    idempotency_key: typeof idempotency_key === 'string' ? idempotency_key : undefined,
  };
}

// ============================================================================
// EventLedgerDB
// ============================================================================

export class EventLedgerDB {
  /**
   * Internal sequence counter.
   * Tracks the highest sequence number observed so far.
   * Sequence is derived from row ordering (occurred_at + id) rather than
   * a dedicated DB column so the `events` table stays schema-compatible.
   */
  private sequenceCounter = 0;

  // --------------------------------------------------------------------------
  // appendFact
  // --------------------------------------------------------------------------

  /**
   * Append an OutcomeFact to the persistent ledger.
   *
   * - Auto-classifies tier and weight from outcome_rules.
   * - Checks idempotency_key before insert to prevent duplicates.
   * - Never performs UPDATE or DELETE.
   *
   * @param fact  Partial fact. `id`, `tier`, and `weight` will be auto-populated
   *              if the outcome_type is recognized in OUTCOME_RULES.
   */
  async appendFact(
    fact: Omit<OutcomeFact, 'id' | 'tier' | 'weight'> & {
      tier?: 'S' | 'A' | 'TERMINAL';
      weight?: number;
    },
  ): Promise<AppendResult> {
    try {
      // --- Idempotency check ---
      if (fact.idempotency_key) {
        const duplicate = await this.checkIdempotency(fact.idempotency_key);
        if (duplicate) {
          return { success: true, fact: duplicate, skipped: true };
        }
      }

      // --- Auto-classify from outcome_rules ---
      const rule = classifyTier(fact.outcome_type);
      const tier = fact.tier ?? rule?.tier ?? 'A';
      const weight = fact.weight ?? rule?.weight ?? 0;

      const fullFact: OutcomeFact = {
        id: generateId(),
        outcome_type: fact.outcome_type,
        entity_id: fact.entity_id,
        entity_type: fact.entity_type,
        weight,
        tier,
        metadata: fact.metadata,
        occurred_at: fact.occurred_at || new Date().toISOString(),
        idempotency_key: fact.idempotency_key,
      };

      // --- INSERT only ---
      const insertData = factToEventInsert(fullFact);
      const { error } = await supabase.from('events').insert(insertData);

      if (error) {
        // Unique constraint violation on idempotency_key means a race-condition
        // duplicate. Treat as an idempotent success.
        if (error.code === '23505' && fact.idempotency_key) {
          const existing = await this.checkIdempotency(fact.idempotency_key);
          return { success: true, fact: existing, skipped: true };
        }
        return { success: false, fact: null, error: error.message };
      }

      this.sequenceCounter += 1;

      return { success: true, fact: fullFact, skipped: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, fact: null, error: message };
    }
  }

  // --------------------------------------------------------------------------
  // getUnprocessedTriggers
  // --------------------------------------------------------------------------

  /**
   * Retrieve S-Tier events that have not been marked as processed.
   *
   * Because the ledger is append-only, "processed" is tracked by checking
   * whether a corresponding process-creation event exists (convention:
   * event_type = '<original_type>.processed').
   *
   * Falls back to checking payload.processed for backwards compatibility.
   */
  async getUnprocessedTriggers(): Promise<OutcomeFact[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_category', 'S')
        .eq('source', 'event_ledger')
        .order('occurred_at', { ascending: true });

      if (error) {
        console.error('[EventLedgerDB] getUnprocessedTriggers error:', error.message);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Build a set of idempotency keys / IDs that have been processed.
      const processedKeys = new Set<string>();

      const { data: processedEvents } = await supabase
        .from('events')
        .select('payload')
        .eq('source', 'event_ledger')
        .like('event_type', '%.processed');

      if (processedEvents) {
        for (const pe of processedEvents) {
          const payload = pe.payload as Record<string, unknown> | null;
          if (payload?.original_event_id) {
            processedKeys.add(payload.original_event_id as string);
          }
          if (payload?.original_idempotency_key) {
            processedKeys.add(payload.original_idempotency_key as string);
          }
        }
      }

      const unprocessed: OutcomeFact[] = [];
      for (const row of data as EventRow[]) {
        if (processedKeys.has(row.id)) continue;
        const payload = row.payload as Record<string, unknown> | null;
        if (payload?.idempotency_key && processedKeys.has(payload.idempotency_key as string)) {
          continue;
        }
        // Check inline processed flag for backwards compatibility
        if (payload?.processed === true) continue;

        unprocessed.push(eventRowToFact(row));
      }

      return unprocessed;
    } catch (err) {
      console.error('[EventLedgerDB] getUnprocessedTriggers exception:', err);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // getFactsByEntity
  // --------------------------------------------------------------------------

  /**
   * Retrieve all facts for a given entity, ordered by occurrence time.
   */
  async getFactsByEntity(entityId: string): Promise<OutcomeFact[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('entity_id', entityId)
        .eq('source', 'event_ledger')
        .order('occurred_at', { ascending: true });

      if (error) {
        console.error('[EventLedgerDB] getFactsByEntity error:', error.message);
        return [];
      }

      return (data as EventRow[] | null)?.map(eventRowToFact) ?? [];
    } catch (err) {
      console.error('[EventLedgerDB] getFactsByEntity exception:', err);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // getRecentFacts
  // --------------------------------------------------------------------------

  /**
   * Retrieve the N most recent facts across all entities.
   */
  async getRecentFacts(limit: number = 50): Promise<OutcomeFact[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('source', 'event_ledger')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[EventLedgerDB] getRecentFacts error:', error.message);
        return [];
      }

      return (data as EventRow[] | null)?.map(eventRowToFact) ?? [];
    } catch (err) {
      console.error('[EventLedgerDB] getRecentFacts exception:', err);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // replay
  // --------------------------------------------------------------------------

  /**
   * Replay events from a given sequence number.
   *
   * Because the `events` table does not have a dedicated sequence column,
   * ordering is by `occurred_at ASC, id ASC` and sequence is derived
   * positionally. The `fromSeq` parameter is 1-based: sequence 1 is the
   * oldest event.
   *
   * @param fromSeq  1-based sequence to start replaying from (inclusive).
   * @returns        Ordered list of LedgerEntry objects.
   */
  async replay(fromSeq: number = 1): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('source', 'event_ledger')
        .order('occurred_at', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        console.error('[EventLedgerDB] replay error:', error.message);
        return [];
      }

      if (!data) return [];

      const entries: LedgerEntry[] = [];
      let seq = 0;

      for (const row of data as EventRow[]) {
        seq += 1;
        if (seq < fromSeq) continue;

        entries.push({
          fact: eventRowToFact(row),
          sequence: seq,
          created_at: row.created_at ?? row.occurred_at,
        });
      }

      // Update internal counter
      if (seq > this.sequenceCounter) {
        this.sequenceCounter = seq;
      }

      return entries;
    } catch (err) {
      console.error('[EventLedgerDB] replay exception:', err);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // markProcessed (append-only pattern)
  // --------------------------------------------------------------------------

  /**
   * Mark a fact as processed by appending a companion `.processed` event.
   * This preserves the append-only invariant: we never UPDATE the original row.
   */
  async markProcessed(factId: string, processName?: string): Promise<boolean> {
    try {
      const processedFact: Omit<OutcomeFact, 'id' | 'tier' | 'weight'> = {
        outcome_type: `${processName ?? 'unknown'}.processed`,
        entity_id: factId,
        entity_type: 'event',
        metadata: {
          original_event_id: factId,
          processed_at: new Date().toISOString(),
        },
        occurred_at: new Date().toISOString(),
        idempotency_key: `processed_${factId}`,
      };

      const result = await this.appendFact({
        ...processedFact,
        tier: 'A',
        weight: 0,
      });

      return result.success;
    } catch (err) {
      console.error('[EventLedgerDB] markProcessed exception:', err);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  /**
   * Compute ledger statistics.
   */
  async getStats(): Promise<{
    total: number;
    byTier: Record<string, number>;
    byType: Record<string, number>;
    unprocessedCount: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('event_type, event_category')
        .eq('source', 'event_ledger');

      if (error || !data) {
        return { total: 0, byTier: {}, byType: {}, unprocessedCount: 0 };
      }

      const byTier: Record<string, number> = { S: 0, A: 0, TERMINAL: 0 };
      const byType: Record<string, number> = {};

      for (const row of data) {
        const tier = (row as { event_category: string }).event_category;
        const type = (row as { event_type: string }).event_type;
        byTier[tier] = (byTier[tier] ?? 0) + 1;
        byType[type] = (byType[type] ?? 0) + 1;
      }

      const unprocessed = await this.getUnprocessedTriggers();

      return {
        total: data.length,
        byTier,
        byType,
        unprocessedCount: unprocessed.length,
      };
    } catch (err) {
      console.error('[EventLedgerDB] getStats exception:', err);
      return { total: 0, byTier: {}, byType: {}, unprocessedCount: 0 };
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /** Get the current sequence counter value. */
  getSequence(): number {
    return this.sequenceCounter;
  }

  /** Get the outcome rule for a given type (used by external callers). */
  static getOutcomeRule(outcomeType: string): OutcomeRuleEntry | null {
    return classifyTier(outcomeType);
  }

  /** List all known outcome types. */
  static getKnownOutcomeTypes(): string[] {
    return Object.keys(OUTCOME_RULES);
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  /**
   * Check whether an event with the given idempotency key already exists.
   * Returns the existing OutcomeFact if found, null otherwise.
   */
  private async checkIdempotency(key: string): Promise<OutcomeFact | null> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('source', 'event_ledger')
        .contains('payload', { idempotency_key: key })
        .limit(1);

      if (error || !data || data.length === 0) return null;

      return eventRowToFact(data[0] as EventRow);
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Singleton export (matches FactLedger pattern)
// ============================================================================

export const eventLedgerDB = new EventLedgerDB();

export default EventLedgerDB;
