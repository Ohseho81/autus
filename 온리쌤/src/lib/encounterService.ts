/**
 * ===========================================================================
 * Encounter Service - Encounter Kernel + Presence Module
 * Architecture v3 - Encounter-based attendance tracking with IOO tracing
 * ===========================================================================
 *
 * Encounter = a single scheduled session instance
 * Presence  = a student's attendance status within an encounter
 *
 * Patterns:
 *   - PresenceOutbox for offline-first (AsyncStorage queue)
 *   - IOO trace logging for full audit trail
 *   - Optimistic UI updates
 *   - Idempotency via dedupe_key
 *   - Absent notification via action_queue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

// ===========================================================================
// Types
// ===========================================================================

export type PresenceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type EncounterStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

type IOOPhase = 'INPUT' | 'OPERATION' | 'OUTPUT';
type IOOResult = 'pending' | 'success' | 'failure' | 'skipped';
type ActionQueueStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export interface Encounter {
  id: string;
  org_id: string;
  encounter_type: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  coach_id: string;
  class_id: string;
  status: EncounterStatus;
  expected_count: number;
  actual_count: number;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, unknown> | null;
  legacy_session_id: string | null;
}

export interface PresenceRecord {
  id: string;
  encounter_id: string;
  subject_id: string;
  subject_type: string;
  status: PresenceStatus;
  recorded_by: string;
  recorded_at: string;
  source: string;
  dedupe_key: string;
  metadata: Record<string, unknown> | null;
}

export interface Student {
  id: string;
  name: string;
  avatar_url: string | null;
  metadata: Record<string, unknown> | null;
}

interface PresenceOutboxEntry {
  id: string;
  encounter_id: string;
  subject_id: string;
  status: PresenceStatus;
  recorded_by: string;
  trace_id: string;
  dedupe_key: string;
  created_at: string;
}

// ===========================================================================
// Utilities (local copies — same pattern as coachService.ts)
// ===========================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function checkNetworkConnection(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  } catch {
    if (__DEV__) {
      console.warn('[EncounterService] Failed to check network connection');
    }
    return false;
  }
}

// ===========================================================================
// IOO Trace Logger
// ===========================================================================

async function logIOOTrace(params: {
  trace_id: string;
  phase: IOOPhase;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  payload: Record<string, unknown>;
  result: IOOResult;
  error_message?: string;
  duration_ms?: number;
}): Promise<void> {
  try {
    const { error } = await supabase.from('ioo_trace').insert({
      id: generateUUID(),
      trace_id: params.trace_id,
      phase: params.phase,
      actor: params.actor,
      action: params.action,
      target_type: params.target_type,
      target_id: params.target_id,
      payload: params.payload,
      result: params.result,
      error_message: params.error_message ?? null,
      duration_ms: params.duration_ms ?? null,
    });

    if (error && __DEV__) {
      console.warn('[EncounterService] IOO trace insert failed:', error.message);
    }
  } catch (err: unknown) {
    if (__DEV__) {
      console.warn('[EncounterService] IOO trace logging error:', err);
    }
  }
}

// ===========================================================================
// PresenceOutbox — offline queue backed by AsyncStorage
// Same pattern as EventOutbox in coachService.ts
// ===========================================================================

const PRESENCE_OUTBOX_KEY = '@presence_outbox';

export const PresenceOutbox = {
  async getAll(): Promise<PresenceOutboxEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(PRESENCE_OUTBOX_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as PresenceOutboxEntry[];
    } catch {
      if (__DEV__) {
        console.warn('[PresenceOutbox] Failed to read outbox');
      }
      return [];
    }
  },

  async add(entry: PresenceOutboxEntry): Promise<void> {
    try {
      const current = await this.getAll();
      if (entry.dedupe_key && current.some((e) => e.dedupe_key === entry.dedupe_key)) {
        return;
      }
      current.push(entry);
      await AsyncStorage.setItem(PRESENCE_OUTBOX_KEY, JSON.stringify(current));
      if (__DEV__) {
        console.log('[PresenceOutbox] Enqueued entry:', entry.id);
      }
    } catch {
      if (__DEV__) {
        console.warn('[PresenceOutbox] Failed to enqueue entry');
      }
    }
  },

  async remove(entryId: string): Promise<void> {
    try {
      const current = await this.getAll();
      const filtered = current.filter((e) => e.id !== entryId);
      await AsyncStorage.setItem(PRESENCE_OUTBOX_KEY, JSON.stringify(filtered));
    } catch {
      if (__DEV__) {
        console.warn('[PresenceOutbox] Failed to remove entry:', entryId);
      }
    }
  },

  async count(): Promise<number> {
    const entries = await this.getAll();
    return entries.length;
  },

  async syncToServer(entry: PresenceOutboxEntry): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Log IOO OPERATION phase
      await logIOOTrace({
        trace_id: entry.trace_id,
        phase: 'OPERATION',
        actor: entry.recorded_by,
        action: 'record_presence_with_legacy',
        target_type: 'presence',
        target_id: entry.subject_id,
        payload: {
          encounter_id: entry.encounter_id,
          subject_id: entry.subject_id,
          status: entry.status,
          dedupe_key: entry.dedupe_key,
        },
        result: 'pending',
      });

      // Call the dual-write RPC
      const { error } = await supabase.rpc('record_presence_with_legacy', {
        p_encounter_id: entry.encounter_id,
        p_subject_id: entry.subject_id,
        p_status: entry.status,
        p_recorded_by: entry.recorded_by,
        p_source: 'mobile_app',
      });

      const durationMs = Date.now() - startTime;

      if (error) {
        await logIOOTrace({
          trace_id: entry.trace_id,
          phase: 'OUTPUT',
          actor: entry.recorded_by,
          action: 'record_presence_with_legacy',
          target_type: 'presence',
          target_id: entry.subject_id,
          payload: { encounter_id: entry.encounter_id, status: entry.status },
          result: 'failure',
          error_message: error.message,
          duration_ms: durationMs,
        });

        if (__DEV__) {
          console.warn('[PresenceOutbox] RPC failed:', error.message);
        }
        return false;
      }

      // Log IOO OUTPUT success
      await logIOOTrace({
        trace_id: entry.trace_id,
        phase: 'OUTPUT',
        actor: entry.recorded_by,
        action: 'record_presence_with_legacy',
        target_type: 'presence',
        target_id: entry.subject_id,
        payload: { encounter_id: entry.encounter_id, status: entry.status },
        result: 'success',
        duration_ms: durationMs,
      });

      // Remove from outbox on success
      await this.remove(entry.id);

      if (__DEV__) {
        console.log('[PresenceOutbox] Synced entry:', entry.id, `(${durationMs}ms)`);
      }
      return true;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown sync error';

      await logIOOTrace({
        trace_id: entry.trace_id,
        phase: 'OUTPUT',
        actor: entry.recorded_by,
        action: 'record_presence_with_legacy',
        target_type: 'presence',
        target_id: entry.subject_id,
        payload: { encounter_id: entry.encounter_id, status: entry.status },
        result: 'failure',
        error_message: errorMessage,
        duration_ms: durationMs,
      });

      if (__DEV__) {
        console.warn('[PresenceOutbox] Sync error:', errorMessage);
      }
      return false;
    }
  },
};

// ===========================================================================
// Action Queue Helper
// ===========================================================================

async function enqueueAction(params: {
  action_type: string;
  priority: number;
  payload: Record<string, unknown>;
  dedupe_key: string;
  trace_id: string;
  max_retries?: number;
  expires_at?: string | null;
}): Promise<void> {
  try {
    const entry: {
      id: string;
      action_type: string;
      priority: number;
      status: ActionQueueStatus;
      payload: Record<string, unknown>;
      retry_count: number;
      max_retries: number;
      next_retry_at: null;
      last_error: null;
      expires_at: string | null;
      dedupe_key: string;
      trace_id: string;
      result: null;
      processed_at: null;
    } = {
      id: generateUUID(),
      action_type: params.action_type,
      priority: params.priority,
      status: 'PENDING',
      payload: params.payload,
      retry_count: 0,
      max_retries: params.max_retries ?? 3,
      next_retry_at: null,
      last_error: null,
      expires_at: params.expires_at ?? null,
      dedupe_key: params.dedupe_key,
      trace_id: params.trace_id,
      result: null,
      processed_at: null,
    };

    const { error } = await supabase.from('action_queue').insert(entry);

    if (error) {
      if (__DEV__) {
        console.warn('[EncounterService] Failed to enqueue action:', error.message);
      }
    } else if (__DEV__) {
      console.log('[EncounterService] Enqueued action:', params.action_type);
    }
  } catch (err: unknown) {
    if (__DEV__) {
      console.warn('[EncounterService] Action enqueue error:', err);
    }
  }
}

// ===========================================================================
// Auth Helper
// ===========================================================================

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// ===========================================================================
// EncounterService
// ===========================================================================

export const EncounterService = {
  /**
   * Get today's encounters for a coach.
   * Falls back to the authenticated user's ID if coachId is not provided.
   */
  async getTodayEncounters(coachId?: string): Promise<Encounter[]> {
    try {
      const userId = coachId ?? (await getCurrentUserId());
      if (!userId) {
        if (__DEV__) {
          console.warn('[EncounterService] No coach ID available');
        }
        return [];
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('encounters')
        .select('*')
        .eq('coach_id', userId)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) {
        if (__DEV__) {
          console.warn('[EncounterService] Failed to fetch encounters:', error.message);
        }
        return [];
      }

      return (data as Encounter[]) ?? [];
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn('[EncounterService] getTodayEncounters error:', err);
      }
      return [];
    }
  },

  /**
   * Get students enrolled in the class associated with an encounter.
   * Looks up the encounter's class_id, then queries class_enrollments joined to students.
   */
  async getEncounterStudents(encounterId: string): Promise<Student[]> {
    try {
      // Fetch the encounter to determine class_id
      const { data: encounter, error: encounterError } = await supabase
        .from('encounters')
        .select('class_id')
        .eq('id', encounterId)
        .single();

      if (encounterError || !encounter) {
        if (__DEV__) {
          console.warn(
            '[EncounterService] Failed to fetch encounter for students:',
            encounterError?.message,
          );
        }
        return [];
      }

      // Fetch enrolled students via class_enrollments -> students join
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select('student:students(id, name, avatar_url, metadata)')
        .eq('class_id', encounter.class_id)
        .eq('status', 'ACTIVE');

      if (enrollmentError) {
        if (__DEV__) {
          console.warn(
            '[EncounterService] Failed to fetch enrolled students:',
            enrollmentError.message,
          );
        }
        return [];
      }

      if (!enrollments) return [];

      // Extract the nested student objects, filtering out nulls
      const students: Student[] = enrollments
        .map(
          (enrollment: Record<string, unknown>) =>
            enrollment.student as Student | null,
        )
        .filter((student: Student | null): student is Student => student !== null);

      return students;
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn('[EncounterService] getEncounterStudents error:', err);
      }
      return [];
    }
  },

  /**
   * Record presence for a subject in an encounter (CORE METHOD).
   *
   * Flow:
   *   1. Generate trace_id (UUID)
   *   2. Log IOO INPUT trace
   *   3. Enqueue to PresenceOutbox (offline support)
   *   4. If online, call record_presence_with_legacy RPC
   *   5. Log IOO OUTPUT trace
   *   6. If status === 'ABSENT' -> enqueue SEND_MESSAGE to action_queue
   */
  async recordPresence(
    encounterId: string,
    subjectId: string,
    status: PresenceStatus,
    coachId?: string,
  ): Promise<boolean> {
    const traceId = generateUUID();
    const dedupeKey = `presence:${encounterId}:${subjectId}:${Date.now()}`;
    const recordedBy = coachId ?? (await getCurrentUserId()) ?? 'unknown';

    if (__DEV__) {
      console.log('[EncounterService] recordPresence:', {
        encounterId,
        subjectId,
        status,
        traceId,
      });
    }

    // Step 1 & 2: Log IOO INPUT trace
    await logIOOTrace({
      trace_id: traceId,
      phase: 'INPUT',
      actor: recordedBy,
      action: 'record_presence',
      target_type: 'presence',
      target_id: subjectId,
      payload: {
        encounter_id: encounterId,
        subject_id: subjectId,
        status,
        dedupe_key: dedupeKey,
      },
      result: 'pending',
    });

    // Step 3: Enqueue to PresenceOutbox for offline support
    const outboxEntry: PresenceOutboxEntry = {
      id: generateUUID(),
      encounter_id: encounterId,
      subject_id: subjectId,
      status,
      recorded_by: recordedBy,
      trace_id: traceId,
      dedupe_key: dedupeKey,
      created_at: new Date().toISOString(),
    };

    await PresenceOutbox.add(outboxEntry);

    // Step 4 & 5: If online, sync immediately
    const isOnline = await checkNetworkConnection();

    if (isOnline) {
      const synced = await PresenceOutbox.syncToServer(outboxEntry);

      if (!synced) {
        if (__DEV__) {
          console.warn(
            '[EncounterService] Immediate sync failed; entry remains in outbox for retry',
          );
        }
        return false;
      }

      // Step 6: If ABSENT, enqueue a SEND_MESSAGE action for notification
      if (status === 'ABSENT') {
        const actionDedupeKey = `send_message:absent:${encounterId}:${subjectId}:${traceId}`;
        await enqueueAction({
          action_type: 'SEND_MESSAGE',
          priority: 5,
          payload: {
            encounter_id: encounterId,
            subject_id: subjectId,
            status,
            message_type: 'absence_notification',
          },
          dedupe_key: actionDedupeKey,
          trace_id: traceId,
          max_retries: 3,
        });
      }

      return true;
    }

    // Device is offline; the entry is already in the outbox
    if (__DEV__) {
      console.log('[EncounterService] Offline — presence queued for later sync');
    }
    return true;
  },

  /**
   * Start an encounter by updating its status to IN_PROGRESS.
   */
  async startEncounter(encounterId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('encounters')
        .update({
          status: 'IN_PROGRESS' as EncounterStatus,
          started_at: new Date().toISOString(),
        })
        .eq('id', encounterId);

      if (error) {
        if (__DEV__) {
          console.warn('[EncounterService] Failed to start encounter:', error.message);
        }
        return false;
      }

      if (__DEV__) {
        console.log('[EncounterService] Encounter started:', encounterId);
      }
      return true;
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn('[EncounterService] startEncounter error:', err);
      }
      return false;
    }
  },

  /**
   * End an encounter by updating its status to COMPLETED.
   */
  async endEncounter(encounterId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('encounters')
        .update({
          status: 'COMPLETED' as EncounterStatus,
          ended_at: new Date().toISOString(),
        })
        .eq('id', encounterId);

      if (error) {
        if (__DEV__) {
          console.warn('[EncounterService] Failed to end encounter:', error.message);
        }
        return false;
      }

      if (__DEV__) {
        console.log('[EncounterService] Encounter ended:', encounterId);
      }
      return true;
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn('[EncounterService] endEncounter error:', err);
      }
      return false;
    }
  },

  /**
   * Sync all pending presence records from the offline outbox.
   * Returns a summary with success and failure counts.
   */
  async syncOfflinePresence(): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    const isOnline = await checkNetworkConnection();
    if (!isOnline) {
      if (__DEV__) {
        console.log('[EncounterService] Cannot sync — device is offline');
      }
      return results;
    }

    const entries = await PresenceOutbox.getAll();
    if (entries.length === 0) {
      if (__DEV__) {
        console.log('[EncounterService] No pending presence records to sync');
      }
      return results;
    }

    if (__DEV__) {
      console.log(
        `[EncounterService] Syncing ${entries.length} pending presence record(s)`,
      );
    }

    for (const entry of entries) {
      const synced = await PresenceOutbox.syncToServer(entry);

      if (synced) {
        results.success += 1;

        // Enqueue absent notification that was deferred while offline
        if (entry.status === 'ABSENT') {
          const actionDedupeKey = `send_message:absent:${entry.encounter_id}:${entry.subject_id}:${entry.trace_id}`;
          await enqueueAction({
            action_type: 'SEND_MESSAGE',
            priority: 5,
            payload: {
              encounter_id: entry.encounter_id,
              subject_id: entry.subject_id,
              status: entry.status,
              message_type: 'absence_notification',
            },
            dedupe_key: actionDedupeKey,
            trace_id: entry.trace_id,
            max_retries: 3,
          });
        }
      } else {
        results.failed += 1;
      }
    }

    if (__DEV__) {
      console.log('[EncounterService] Sync complete:', results);
    }

    return results;
  },

  /**
   * Get the number of presence records pending in the offline outbox.
   */
  async getPendingPresenceCount(): Promise<number> {
    return PresenceOutbox.count();
  },

  /**
   * Create an optimistic presence record for immediate UI rendering.
   * This record is returned before the server confirms the write.
   */
  getOptimisticPresence(subjectId: string, status: PresenceStatus): PresenceRecord {
    return {
      id: generateUUID(),
      encounter_id: '',
      subject_id: subjectId,
      subject_type: 'student',
      status,
      recorded_by: '',
      recorded_at: new Date().toISOString(),
      source: 'mobile_app',
      dedupe_key: `optimistic:${subjectId}:${Date.now()}`,
      metadata: null,
    };
  },
};
