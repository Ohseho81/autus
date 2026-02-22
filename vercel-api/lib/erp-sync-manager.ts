// =============================================================================
// AUTUS v1.0 - ERP Sync Manager
// Unified interface for all ERP integrations
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import {
  ERPProvider,
  StudentData,
  SyncResult,
  SyncRequest,
  AcademyIntegration,
} from './types-erp';
import { DataMapper, hashStudentData, validateStudentData, calculateRiskScore, getRiskBand } from './data-mapper';

// -----------------------------------------------------------------------------
// ERP Sync Manager Class
// -----------------------------------------------------------------------------

export class ERPSyncManager {
  private supabase;
  private academyId: string;
  
  constructor(academyId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.academyId = academyId;
  }
  
  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------
  
  /**
   * Get all active integrations for this academy
   */
  async getIntegrations(): Promise<AcademyIntegration[]> {
    const { data, error } = await this.supabase
      .from('academy_integrations')
      .select('*')
      .eq('academy_id', this.academyId)
      .eq('status', 'active');
    
    if (error) throw new Error(`Failed to get integrations: ${error.message}`);
    return data || [];
  }
  
  /**
   * Add or update an integration
   */
  async upsertIntegration(integration: Partial<AcademyIntegration>): Promise<AcademyIntegration> {
    const { data, error } = await this.supabase
      .from('academy_integrations')
      .upsert({
        academy_id: this.academyId,
        ...integration,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'academy_id,provider' })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to upsert integration: ${error.message}`);
    return data;
  }
  
  /**
   * Sync all active integrations
   */
  async syncAll(): Promise<SyncResult[]> {
    const integrations = await this.getIntegrations();

    // Run all provider syncs in parallel instead of sequentially
    const settled = await Promise.allSettled(
      integrations.map(integration =>
        this.syncProvider(integration.provider as ERPProvider)
      )
    );

    return settled.map((outcome, i) => {
      if (outcome.status === 'fulfilled') {
        return outcome.value;
      }
      const error = outcome.reason;
      return {
        academy_id: this.academyId,
        provider: integrations[i].provider as ERPProvider,
        status: 'error' as const,
        total_records: 0,
        synced_records: 0,
        created_records: 0,
        updated_records: 0,
        skipped_records: 0,
        failed_records: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        errors: [{ message: error?.message || 'Unknown error' }],
      };
    });
  }
  
  /**
   * Sync specific provider
   */
  async syncProvider(provider: ERPProvider, request?: SyncRequest): Promise<SyncResult> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/sync/${provider}?academy_id=${this.academyId}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data as SyncResult;
  }
  
  /**
   * Sync students from external data
   */
  async syncStudents(students: StudentData[]): Promise<SyncResult> {
    const startedAt = new Date().toISOString();
    let synced = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { record_id?: string; message: string }[] = [];
    
    for (const student of students) {
      try {
        // Validate
        const validation = validateStudentData(student);
        if (!validation.valid) {
          errors.push({ record_id: student.external_id, message: validation.errors.join(', ') });
          continue;
        }
        
        // Calculate risk
        const riskScore = calculateRiskScore(student);
        const riskBand = getRiskBand(riskScore);
        
        // Add risk to student data
        const studentWithRisk = {
          ...student,
          risk_score: riskScore,
          risk_band: riskBand,
          confidence_score: 0.75,
        };
        
        // Check existing
        const { data: existing } = await this.supabase
          .from('students')
          .select('id, metadata')
          .eq('academy_id', this.academyId)
          .eq('external_id', student.external_id)
          .single();
        
        const hash = hashStudentData(student);
        
        if (existing) {
          if (existing.metadata?.hash === hash) {
            skipped++;
            continue;
          }
          
          await this.supabase
            .from('students')
            .update({
              ...studentWithRisk,
              metadata: { ...student.metadata, hash },
            })
            .eq('id', existing.id);
          
          updated++;
        } else {
          await this.supabase
            .from('students')
            .insert({
              ...studentWithRisk,
              metadata: { ...student.metadata, hash },
            });
          
          created++;
        }
        
        synced++;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push({ record_id: student.external_id, message: error.message });
      }
    }
    
    const result: SyncResult = {
      academy_id: this.academyId,
      provider: students[0]?.provider || 'unknown' as ERPProvider,
      status: errors.length === 0 ? 'success' : (synced > 0 ? 'success' : 'error'),
      total_records: students.length,
      synced_records: synced,
      created_records: created,
      updated_records: updated,
      skipped_records: skipped,
      failed_records: errors.length,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      errors: errors.length > 0 ? errors : undefined,
    };
    
    // Log sync
    await this.logSync(result);
    
    return result;
  }
  
  /**
   * Get sync history
   */
  async getSyncHistory(limit = 20): Promise<any[]> {
    const { data } = await this.supabase
      .from('sync_logs')
      .select('*')
      .eq('academy_id', this.academyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  }
  
  /**
   * Get students with risk filter
   */
  async getStudents(options?: {
    riskBand?: string;
    provider?: ERPProvider;
    limit?: number;
  }): Promise<StudentData[]> {
    let query = this.supabase
      .from('students')
      .select('*')
      .eq('academy_id', this.academyId);
    
    if (options?.riskBand) {
      query = query.eq('risk_band', options.riskBand);
    }
    
    if (options?.provider) {
      query = query.eq('provider', options.provider);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data } = await query.order('risk_score', { ascending: false });
    return data || [];
  }
  
  /**
   * Get risk summary
   */
  async getRiskSummary(): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    avgRisk: number;
  }> {
    const { data: students } = await this.supabase
      .from('students')
      .select('risk_score, risk_band')
      .eq('academy_id', this.academyId);
    
    if (!students || students.length === 0) {
      return { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRisk: 0 };
    }
    
    return {
      total: students.length,
      critical: students.filter(s => s.risk_band === 'critical').length,
      high: students.filter(s => s.risk_band === 'high').length,
      medium: students.filter(s => s.risk_band === 'medium').length,
      low: students.filter(s => s.risk_band === 'low').length,
      avgRisk: Math.round(students.reduce((a, b) => a + (b.risk_score || 0), 0) / students.length),
    };
  }
  
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  
  private async logSync(result: SyncResult) {
    await this.supabase.from('sync_logs').insert({
      academy_id: this.academyId,
      provider: result.provider,
      total_records: result.total_records,
      synced_records: result.synced_records,
      status: result.status,
      error: result.errors?.map(e => e.message).join('; '),
    });
    
    // Update integration last sync time
    await this.supabase
      .from('academy_integrations')
      .update({ synced_at: new Date().toISOString() })
      .eq('academy_id', this.academyId)
      .eq('provider', result.provider);
  }
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Create sync manager instance
 */
export function createSyncManager(academyId: string): ERPSyncManager {
  return new ERPSyncManager(academyId);
}

/**
 * Quick sync for academy
 */
export async function quickSync(academyId: string): Promise<SyncResult[]> {
  const manager = new ERPSyncManager(academyId);
  return manager.syncAll();
}

/**
 * Get risk summary for academy
 */
export async function getRiskSummary(academyId: string) {
  const manager = new ERPSyncManager(academyId);
  return manager.getRiskSummary();
}

export default ERPSyncManager;
