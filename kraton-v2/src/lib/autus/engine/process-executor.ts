/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTUS Process Executor
 *
 * S-Tier OutcomeFact가 트리거한 자동화 워크플로우를 실행.
 *
 * Processes:
 *   retention_process : renewal.failed   -> send_reminder(0d) -> call_attempt(3d) -> escalate_owner(7d)
 *   recovery_process  : attendance.drop  -> send_concern(0d)  -> coach_contact(1d) -> offer_makeup(3d)
 *   engagement_process: notification.ignored -> channel_switch(0d) -> personal_contact(3d)
 *
 * Process state is persisted in the `automation_logs` table via Supabase.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '../../supabase/client';
import { policyEngine } from '../factory/policy-engine';
import type { ProcessDefinition, ProcessStep } from '../factory/policy-engine';

// ═══════════════════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export type ProcessStatus = 'active' | 'completed' | 'failed' | 'timeout';

export interface ProcessInstance {
  id: string;
  process_name: string;
  entity_id: string;
  trigger_event_id: string;
  current_step: number;
  status: ProcessStatus;
  steps_completed: string[];
  started_at: string;
  next_step_due: string;
  updated_at?: string;
}

export interface StepResult {
  process_instance_id: string;
  step_index: number;
  action: string;
  success: boolean;
  executed_at: string;
  error?: string;
}

export interface TriggerEvent {
  id: string;
  outcome_type: string;
  entity_id: string;
  org_id?: string;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Action Channel Mapping
// ═══════════════════════════════════════════════════════════════════════════

const ACTION_CHANNEL_MAP: Record<string, string> = {
  send_reminder: 'kakao',
  send_concern: 'kakao',
  call_attempt: 'phone',
  coach_contact: 'phone',
  personal_contact: 'phone',
  escalate_owner: 'escalation',
  channel_switch: 'system',
  offer_makeup: 'shadow',
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper: Date arithmetic
// ═══════════════════════════════════════════════════════════════════════════

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════════════════════
// Process Executor Class
// ═══════════════════════════════════════════════════════════════════════════

export class ProcessExecutor {
  // ─────────────────────────────────────────────────────────────────────────
  // Start a Process
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start an automated process triggered by an S-Tier outcome.
   *
   * Creates a process instance record in `automation_logs` and
   * immediately executes the first step (delay=0).
   *
   * @param processName - e.g. 'retention_process'
   * @param entityId - the entity (student/parent) this process targets
   * @param triggerEvent - the event that triggered this process
   */
  async startProcess(
    processName: string,
    entityId: string,
    triggerEvent: TriggerEvent,
  ): Promise<ProcessInstance> {
    // Validate process exists in policy
    const processDef = policyEngine.getProcess(processName);

    const now = new Date();
    const firstStep = processDef.steps[0];

    const instance: ProcessInstance = {
      id: crypto.randomUUID(),
      process_name: processName,
      entity_id: entityId,
      trigger_event_id: triggerEvent.id,
      current_step: 0,
      status: 'active',
      steps_completed: [],
      started_at: now.toISOString(),
      next_step_due: addDays(now, firstStep.delay).toISOString(),
    };

    // Persist to automation_logs
    if (supabase) {
      const { error } = await supabase.from('automation_logs').insert({
        id: instance.id,
        action_type: 'process_started',
        entity_type: 'process_instance',
        entity_id: entityId,
        metadata: {
          process_name: processName,
          trigger_event_id: triggerEvent.id,
          trigger_outcome: triggerEvent.outcome_type,
          current_step: instance.current_step,
          status: instance.status,
          steps_completed: instance.steps_completed,
          next_step_due: instance.next_step_due,
          process_definition: processDef,
        },
        created_at: instance.started_at,
      });

      if (error) {
        throw new Error(
          `[ProcessExecutor] Failed to persist process instance: ${error.message}`,
        );
      }
    }

    // Execute first step if delay is 0
    if (firstStep.delay === 0) {
      await this.executeStepAction(instance, processDef, 0);
    }

    return instance;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Execute Next Step
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Execute the next pending step for a process instance.
   *
   * Reads the instance state from `automation_logs`, determines the next
   * step, executes its action, and updates the record.
   *
   * @param processInstanceId - the process instance ID
   */
  async executeNextStep(processInstanceId: string): Promise<StepResult> {
    const instance = await this.getProcessInstance(processInstanceId);

    if (!instance) {
      throw new Error(
        `[ProcessExecutor] Process instance not found: ${processInstanceId}`,
      );
    }

    if (instance.status !== 'active') {
      throw new Error(
        `[ProcessExecutor] Process ${processInstanceId} is not active (status: ${instance.status})`,
      );
    }

    const processDef = policyEngine.getProcess(instance.process_name);
    const stepIndex = instance.current_step;

    if (stepIndex >= processDef.steps.length) {
      // All steps completed without resolution -> fail
      await this.completeProcess(processInstanceId, 'failure');
      return {
        process_instance_id: processInstanceId,
        step_index: stepIndex,
        action: 'process_exhausted',
        success: false,
        executed_at: nowISO(),
        error: 'All steps exhausted without success outcome',
      };
    }

    return this.executeStepAction(instance, processDef, stepIndex);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Execute a Specific Step Action (private)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Execute a specific action within a process step.
   *
   * Action implementations:
   *   send_reminder / send_concern : Insert notification event (kakao)
   *   call_attempt / coach_contact / personal_contact : Insert notification event (phone)
   *   escalate_owner : Insert escalation event
   *   channel_switch : Update notification channel preference
   *   offer_makeup : Insert shadow request (makeup.requested)
   */
  private async executeStepAction(
    instance: ProcessInstance,
    processDef: ProcessDefinition,
    stepIndex: number,
  ): Promise<StepResult> {
    const step = processDef.steps[stepIndex];
    const channel = ACTION_CHANNEL_MAP[step.action] ?? 'system';

    let success = false;
    let error: string | undefined;

    try {
      success = await this.executeAction(
        step.action,
        instance.entity_id,
        channel,
        instance,
      );
    } catch (err) {
      success = false;
      error =
        err instanceof Error ? err.message : 'Unknown action execution error';
    }

    const result: StepResult = {
      process_instance_id: instance.id,
      step_index: stepIndex,
      action: step.action,
      success,
      executed_at: nowISO(),
      error,
    };

    // Update instance state
    const updatedStepsCompleted = [...instance.steps_completed, step.action];
    const nextStepIndex = stepIndex + 1;
    const isLastStep = nextStepIndex >= processDef.steps.length;

    let nextStepDue: string;
    if (isLastStep) {
      // After last step, set timeout boundary for success outcome detection
      nextStepDue = addDays(
        new Date(instance.started_at),
        processDef.max_days,
      ).toISOString();
    } else {
      nextStepDue = addDays(
        new Date(),
        processDef.steps[nextStepIndex].delay,
      ).toISOString();
    }

    // Persist step result and updated state
    if (supabase) {
      // Log the step execution
      await supabase.from('automation_logs').insert({
        action_type: 'step_executed',
        entity_type: 'process_step',
        entity_id: instance.entity_id,
        metadata: {
          process_instance_id: instance.id,
          process_name: instance.process_name,
          step_index: stepIndex,
          action: step.action,
          channel,
          success,
          error,
        },
        created_at: result.executed_at,
      });

      // Update the process instance record
      const { error: updateError } = await supabase
        .from('automation_logs')
        .update({
          metadata: {
            process_name: instance.process_name,
            trigger_event_id: instance.trigger_event_id,
            current_step: nextStepIndex,
            status: 'active',
            steps_completed: updatedStepsCompleted,
            next_step_due: nextStepDue,
          },
        })
        .eq('id', instance.id);

      if (updateError) {
        console.error(
          `[ProcessExecutor] Failed to update instance: ${updateError.message}`,
        );
      }
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Action Implementations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Execute a specific action by type.
   *
   * Each action inserts an appropriate event/notification into the system.
   */
  private async executeAction(
    action: string,
    entityId: string,
    channel: string,
    instance: ProcessInstance,
  ): Promise<boolean> {
    if (!supabase) {
      console.warn(
        `[ProcessExecutor] Supabase not configured. Skipping action: ${action}`,
      );
      return false;
    }

    switch (action) {
      // ── Notification actions (kakao) ──────────────────────────────────
      case 'send_reminder':
        return this.insertNotificationEvent(entityId, 'kakao', {
          type: 'renewal_reminder',
          process_instance_id: instance.id,
          message: '재등록 안내 알림',
        });

      case 'send_concern':
        return this.insertNotificationEvent(entityId, 'kakao', {
          type: 'attendance_concern',
          process_instance_id: instance.id,
          message: '출석 관련 안내 알림',
        });

      // ── Notification actions (phone) ──────────────────────────────────
      case 'call_attempt':
        return this.insertNotificationEvent(entityId, 'phone', {
          type: 'call_attempt',
          process_instance_id: instance.id,
          message: '전화 연락 시도',
        });

      case 'coach_contact':
        return this.insertNotificationEvent(entityId, 'phone', {
          type: 'coach_contact',
          process_instance_id: instance.id,
          message: '코치 직접 연락',
        });

      case 'personal_contact':
        return this.insertNotificationEvent(entityId, 'phone', {
          type: 'personal_contact',
          process_instance_id: instance.id,
          message: '개인 연락 (채널 전환 후)',
        });

      // ── Escalation ────────────────────────────────────────────────────
      case 'escalate_owner':
        return this.insertEscalationEvent(entityId, instance);

      // ── Channel switch ────────────────────────────────────────────────
      case 'channel_switch':
        return this.updateNotificationChannel(entityId, instance);

      // ── Shadow request ────────────────────────────────────────────────
      case 'offer_makeup':
        return this.insertShadowRequest(entityId, 'makeup.requested', {
          process_instance_id: instance.id,
          auto_generated: true,
          reason: '결석 복귀 프로세스에 의한 자동 보강 제안',
        });

      default:
        console.warn(`[ProcessExecutor] Unknown action: ${action}`);
        return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Action Helpers (private)
  // ─────────────────────────────────────────────────────────────────────────

  private async insertNotificationEvent(
    entityId: string,
    channel: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('automation_logs').insert({
      action_type: 'notification_sent',
      entity_type: 'notification',
      entity_id: entityId,
      metadata: {
        ...metadata,
        channel,
        sent_at: nowISO(),
      },
      created_at: nowISO(),
    });

    if (error) {
      console.error(
        `[ProcessExecutor] Failed to insert notification: ${error.message}`,
      );
      return false;
    }

    return true;
  }

  private async insertEscalationEvent(
    entityId: string,
    instance: ProcessInstance,
  ): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('automation_logs').insert({
      action_type: 'escalation',
      entity_type: 'escalation',
      entity_id: entityId,
      metadata: {
        process_instance_id: instance.id,
        process_name: instance.process_name,
        escalated_to: 'owner',
        reason: `Process ${instance.process_name} escalated after step ${instance.current_step}`,
        escalated_at: nowISO(),
      },
      created_at: nowISO(),
    });

    if (error) {
      console.error(
        `[ProcessExecutor] Failed to insert escalation: ${error.message}`,
      );
      return false;
    }

    return true;
  }

  private async updateNotificationChannel(
    entityId: string,
    instance: ProcessInstance,
  ): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('automation_logs').insert({
      action_type: 'channel_switch',
      entity_type: 'preference',
      entity_id: entityId,
      metadata: {
        process_instance_id: instance.id,
        previous_channel: 'kakao',
        new_channel: 'phone',
        reason: '알림 무응답으로 인한 채널 전환',
        switched_at: nowISO(),
      },
      created_at: nowISO(),
    });

    if (error) {
      console.error(
        `[ProcessExecutor] Failed to log channel switch: ${error.message}`,
      );
      return false;
    }

    return true;
  }

  private async insertShadowRequest(
    entityId: string,
    category: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from('automation_logs').insert({
      action_type: 'shadow_request',
      entity_type: 'shadow',
      entity_id: entityId,
      metadata: {
        ...metadata,
        category,
        status: 'pending',
        created_at: nowISO(),
      },
      created_at: nowISO(),
    });

    if (error) {
      console.error(
        `[ProcessExecutor] Failed to insert shadow request: ${error.message}`,
      );
      return false;
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Check Due Steps
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check all active processes for steps that are due for execution.
   *
   * This should be called periodically (e.g. by a cron job or scheduler)
   * to advance processes whose next step delay has elapsed.
   */
  async checkDueSteps(): Promise<StepResult[]> {
    const activeProcesses = await this.getAllActiveProcesses();
    const now = new Date();
    const results: StepResult[] = [];

    for (const instance of activeProcesses) {
      const nextDue = new Date(instance.next_step_due);

      if (nextDue <= now) {
        const processDef = policyEngine.getProcess(instance.process_name);

        // Check if process has timed out
        const maxEndDate = addDays(
          new Date(instance.started_at),
          processDef.max_days,
        );

        if (now > maxEndDate) {
          await this.completeProcess(instance.id, 'failure');
          results.push({
            process_instance_id: instance.id,
            step_index: instance.current_step,
            action: 'timeout',
            success: false,
            executed_at: nowISO(),
            error: `Process timed out after ${processDef.max_days} days`,
          });
          continue;
        }

        // Execute next step if there are remaining steps
        if (instance.current_step < processDef.steps.length) {
          try {
            const result = await this.executeNextStep(instance.id);
            results.push(result);
          } catch (err) {
            results.push({
              process_instance_id: instance.id,
              step_index: instance.current_step,
              action: processDef.steps[instance.current_step]?.action ?? 'unknown',
              success: false,
              executed_at: nowISO(),
              error:
                err instanceof Error
                  ? err.message
                  : 'Unknown error during step execution',
            });
          }
        }
      }
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Complete a Process
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Complete a process instance with a final outcome.
   *
   * @param processInstanceId - the instance to complete
   * @param outcome - 'success' or 'failure'
   */
  async completeProcess(
    processInstanceId: string,
    outcome: 'success' | 'failure',
  ): Promise<void> {
    const status: ProcessStatus =
      outcome === 'success' ? 'completed' : 'failed';

    if (supabase) {
      // Get existing instance to preserve metadata
      const { data: existing } = await supabase
        .from('automation_logs')
        .select('metadata')
        .eq('id', processInstanceId)
        .single();

      const existingMeta =
        (existing?.metadata as Record<string, unknown>) ?? {};

      const { error } = await supabase
        .from('automation_logs')
        .update({
          metadata: {
            ...existingMeta,
            status,
            completed_at: nowISO(),
            outcome,
          },
        })
        .eq('id', processInstanceId);

      if (error) {
        throw new Error(
          `[ProcessExecutor] Failed to complete process: ${error.message}`,
        );
      }

      // Log completion event
      await supabase.from('automation_logs').insert({
        action_type: 'process_completed',
        entity_type: 'process_instance',
        entity_id: processInstanceId,
        metadata: {
          process_instance_id: processInstanceId,
          process_name: existingMeta.process_name,
          outcome,
          status,
          completed_at: nowISO(),
        },
        created_at: nowISO(),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Query Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get active process instances for a specific entity.
   */
  async getActiveProcesses(entityId: string): Promise<ProcessInstance[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('action_type', 'process_started')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        `[ProcessExecutor] Failed to query processes: ${error.message}`,
      );
      return [];
    }

    return (data ?? [])
      .map((row) => this.parseProcessInstance(row))
      .filter(
        (instance): instance is ProcessInstance =>
          instance !== null && instance.status === 'active',
      );
  }

  /**
   * Get all active process instances across all entities.
   */
  async getAllActiveProcesses(): Promise<ProcessInstance[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('action_type', 'process_started')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        `[ProcessExecutor] Failed to query all processes: ${error.message}`,
      );
      return [];
    }

    return (data ?? [])
      .map((row) => this.parseProcessInstance(row))
      .filter(
        (instance): instance is ProcessInstance =>
          instance !== null && instance.status === 'active',
      );
  }

  /**
   * Get a single process instance by ID.
   */
  private async getProcessInstance(
    instanceId: string,
  ): Promise<ProcessInstance | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.parseProcessInstance(data);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Parse Helper
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Parse an automation_logs row into a ProcessInstance.
   */
  private parseProcessInstance(
    row: Record<string, unknown>,
  ): ProcessInstance | null {
    const meta = row.metadata as Record<string, unknown> | null;

    if (!meta || !meta.process_name) {
      return null;
    }

    return {
      id: row.id as string,
      process_name: meta.process_name as string,
      entity_id: row.entity_id as string,
      trigger_event_id: (meta.trigger_event_id as string) ?? '',
      current_step: (meta.current_step as number) ?? 0,
      status: (meta.status as ProcessStatus) ?? 'active',
      steps_completed: (meta.steps_completed as string[]) ?? [],
      started_at: row.created_at as string,
      next_step_due: (meta.next_step_due as string) ?? '',
      updated_at: row.updated_at as string | undefined,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════

export const processExecutor = new ProcessExecutor();
