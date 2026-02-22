/**
 * Personal AI Factory - Service Layer
 * Supabase CRUD for 7 core tables
 */

import { supabase } from '../lib/supabase';
import { captureError } from '../lib/sentry';
import type {
  PersonalAI,
  LifeLog,
  Pattern,
  GrowthSnapshot,
  Connector,
  Permission,
  ActionLog,
  CreateLifeLogInput,
  CreatePatternInput,
  CreateConnectorInput,
  CreatePermissionInput,
  CreateActionLogInput,
} from '../types/personalAI';

class PersonalAIService {
  // ═══════════════════════════════════════════════════════════════
  // Personal AI
  // ═══════════════════════════════════════════════════════════════

  async getMyAI(): Promise<PersonalAI | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('personal_ai')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      captureError(new Error(`Error fetching AI: ${error.message}`), { code: error.code });
    }
    return data;
  }

  async createMyAI(displayName?: string): Promise<PersonalAI | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('personal_ai')
      .insert({
        owner_id: user.id,
        display_name: displayName,
      })
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error creating AI: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }

  async getOrCreateMyAI(displayName?: string): Promise<PersonalAI | null> {
    const existing = await this.getMyAI();
    if (existing) return existing;
    return this.createMyAI(displayName);
  }

  async updateMyAI(updates: Partial<Pick<PersonalAI, 'display_name' | 'status'>>): Promise<PersonalAI | null> {
    const ai = await this.getMyAI();
    if (!ai) return null;

    const { data, error } = await supabase
      .from('personal_ai')
      .update({ ...updates, last_active_at: new Date().toISOString() })
      .eq('id', ai.id)
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error updating AI: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // Life Log - Core Event Logging
  // ═══════════════════════════════════════════════════════════════

  async logEvent(eventType: string, rawData: Record<string, unknown> = {}, options?: {
    source?: string;
    context?: Record<string, unknown>;
    auto?: boolean;
  }): Promise<LifeLog | null> {
    const ai = await this.getOrCreateMyAI();
    if (!ai) return null;

    const { data, error } = await supabase
      .from('life_log')
      .insert({
        ai_id: ai.id,
        source: options?.source || 'app',
        event_type: eventType,
        raw_data: rawData,
        context: options?.context || {},
        auto: options?.auto ?? true,
      })
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error logging event: ${error.message}`), { code: error.code });
      return null;
    }

    // Update AI stats
    await supabase
      .from('personal_ai')
      .update({
        total_logs: ai.total_logs + 1,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', ai.id);

    return data;
  }

  async getRecentLogs(limit = 20): Promise<LifeLog[]> {
    const ai = await this.getMyAI();
    if (!ai) return [];

    const { data, error } = await supabase
      .from('life_log')
      .select('*')
      .eq('ai_id', ai.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      captureError(new Error(`Error fetching logs: ${error.message}`), { code: error.code });
      return [];
    }
    return data || [];
  }

  async getLogsByType(eventType: string, limit = 50): Promise<LifeLog[]> {
    const ai = await this.getMyAI();
    if (!ai) return [];

    const { data, error } = await supabase
      .from('life_log')
      .select('*')
      .eq('ai_id', ai.id)
      .eq('event_type', eventType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      captureError(new Error(`Error fetching logs by type: ${error.message}`), { code: error.code });
      return [];
    }
    return data || [];
  }

  async getLogsByDateRange(startDate: string, endDate: string): Promise<LifeLog[]> {
    const ai = await this.getMyAI();
    if (!ai) return [];

    const { data, error } = await supabase
      .from('life_log')
      .select('*')
      .eq('ai_id', ai.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      captureError(new Error(`Error fetching logs by date: ${error.message}`), { code: error.code });
      return [];
    }
    return data || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // Pattern
  // ═══════════════════════════════════════════════════════════════

  async createPattern(input: CreatePatternInput): Promise<Pattern | null> {
    const ai = await this.getMyAI();
    if (!ai) return null;

    const { data, error } = await supabase
      .from('pattern')
      .insert({
        ai_id: ai.id,
        ...input,
      })
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error creating pattern: ${error.message}`), { code: error.code });
      return null;
    }

    // Update AI stats
    await supabase
      .from('personal_ai')
      .update({ total_patterns: ai.total_patterns + 1 })
      .eq('id', ai.id);

    return data;
  }

  async getActivePatterns(): Promise<Pattern[]> {
    const ai = await this.getMyAI();
    if (!ai) return [];

    const { data, error } = await supabase
      .from('pattern')
      .select('*')
      .eq('ai_id', ai.id)
      .eq('is_active', true)
      .order('confidence', { ascending: false });

    if (error) {
      captureError(new Error(`Error fetching patterns: ${error.message}`), { code: error.code });
      return [];
    }
    return data || [];
  }

  async updatePattern(patternId: string, updates: Partial<Pattern>): Promise<Pattern | null> {
    const { data, error } = await supabase
      .from('pattern')
      .update({ ...updates, last_seen: new Date().toISOString() })
      .eq('id', patternId)
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error updating pattern: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // Growth Snapshot
  // ═══════════════════════════════════════════════════════════════

  async createSnapshot(signals: unknown[], windowSize = 10): Promise<GrowthSnapshot | null> {
    const ai = await this.getMyAI();
    if (!ai) return null;

    const { data, error } = await supabase
      .from('growth_snapshot')
      .insert({
        ai_id: ai.id,
        window_size: windowSize,
        signals,
      })
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error creating snapshot: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }

  async getRecentSnapshots(limit = 10): Promise<GrowthSnapshot[]> {
    const ai = await this.getMyAI();
    if (!ai) return [];

    const { data, error } = await supabase
      .from('growth_snapshot')
      .select('*')
      .eq('ai_id', ai.id)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) {
      captureError(new Error(`Error fetching snapshots: ${error.message}`), { code: error.code });
      return [];
    }
    return data || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // Connector
  // ═══════════════════════════════════════════════════════════════

  async addConnector(input: CreateConnectorInput): Promise<Connector | null> {
    const ai = await this.getMyAI();
    if (!ai) return null;

    const { data, error } = await supabase
      .from('connector')
      .insert({
        ai_id: ai.id,
        ...input,
      })
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error adding connector: ${error.message}`), { code: error.code });
      return null;
    }

    // Update AI stats
    await supabase
      .from('personal_ai')
      .update({ total_connections: ai.total_connections + 1 })
      .eq('id', ai.id);

    return data;
  }

  async getConnectors(): Promise<Connector[]> {
    const ai = await this.getMyAI();
    if (!ai) return [];

    const { data, error } = await supabase
      .from('connector')
      .select('*')
      .eq('ai_id', ai.id)
      .order('connected_at', { ascending: false });

    if (error) {
      captureError(new Error(`Error fetching connectors: ${error.message}`), { code: error.code });
      return [];
    }
    return data || [];
  }

  async updateConnector(connectorId: string, updates: Partial<Connector>): Promise<Connector | null> {
    const { data, error } = await supabase
      .from('connector')
      .update(updates)
      .eq('id', connectorId)
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error updating connector: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }

  async syncConnector(connectorId: string): Promise<boolean> {
    const { error } = await supabase
      .from('connector')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connectorId);

    return !error;
  }

  // ═══════════════════════════════════════════════════════════════
  // Permission
  // ═══════════════════════════════════════════════════════════════

  async setPermission(input: CreatePermissionInput): Promise<Permission | null> {
    const ai = await this.getMyAI();
    if (!ai) return null;

    const { data, error } = await supabase
      .from('permission')
      .upsert({
        ai_id: ai.id,
        ...input,
      }, { onConflict: 'ai_id,action' })
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error setting permission: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }

  async getPermissions(): Promise<Permission[]> {
    const ai = await this.getMyAI();
    if (!ai) return [];

    const { data, error } = await supabase
      .from('permission')
      .select('*')
      .eq('ai_id', ai.id);

    if (error) {
      captureError(new Error(`Error fetching permissions: ${error.message}`), { code: error.code });
      return [];
    }
    return data || [];
  }

  async checkPermission(action: string): Promise<Permission | null> {
    const ai = await this.getMyAI();
    if (!ai) return null;

    const { data, error } = await supabase
      .from('permission')
      .select('*')
      .eq('ai_id', ai.id)
      .eq('action', action)
      .single();

    if (error && error.code !== 'PGRST116') {
      captureError(new Error(`Error checking permission: ${error.message}`), { code: error.code });
    }
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // Action Log
  // ═══════════════════════════════════════════════════════════════

  async logAction(input: CreateActionLogInput): Promise<ActionLog | null> {
    const ai = await this.getMyAI();
    if (!ai) return null;

    const { data, error } = await supabase
      .from('action_log')
      .insert({
        ai_id: ai.id,
        ...input,
      })
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error logging action: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }

  async getRecentActions(limit = 20): Promise<ActionLog[]> {
    const ai = await this.getMyAI();
    if (!ai) return [];

    const { data, error } = await supabase
      .from('action_log')
      .select('*')
      .eq('ai_id', ai.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      captureError(new Error(`Error fetching actions: ${error.message}`), { code: error.code });
      return [];
    }
    return data || [];
  }

  async approveAction(actionId: string): Promise<ActionLog | null> {
    const { data, error } = await supabase
      .from('action_log')
      .update({
        status: 'approved',
        approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq('id', actionId)
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error approving action: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }

  async executeAction(actionId: string, result: Record<string, unknown>): Promise<ActionLog | null> {
    const { data, error } = await supabase
      .from('action_log')
      .update({
        status: 'executed',
        result,
        executed_at: new Date().toISOString(),
      })
      .eq('id', actionId)
      .select()
      .single();

    if (error) {
      captureError(new Error(`Error executing action: ${error.message}`), { code: error.code });
      return null;
    }
    return data;
  }
}

export const personalAIService = new PersonalAIService();
export default personalAIService;
