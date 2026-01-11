/**
 * AUTUS Supabase Client
 * =====================
 * 
 * Supabase 연결 및 데이터 관리
 * 
 * 설정:
 * 1. .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 추가
 * 2. Supabase 프로젝트에서 테이블 생성 (schema.sql 실행)
 */

import { createClient, SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface EntityRow {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NodeSnapshotRow {
  id: string;
  entity_id: string;
  period: string;
  values: Record<string, number>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LearningHistoryRow {
  id: string;
  entity_id: string;
  step: number;
  mse: number;
  mae: number;
  adjustments: unknown[];
  created_at: string;
}

export interface PredictionRow {
  id: string;
  entity_id: string;
  target_period: string;
  predicted_values: Record<string, number>;
  actual_values: Record<string, number> | null;
  mse: number | null;
  verified: boolean;
  created_at: string;
}

// ============================================
// Configuration
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate configuration
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ============================================
// Client
// ============================================

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isConfigured) {
    console.warn('[Supabase] Not configured. Using local storage fallback.');
    return null;
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  
  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return isConfigured;
}

// ============================================
// Error Helper
// ============================================

interface SupabaseError {
  data: null;
  error: Error;
}

function notConfiguredError(): SupabaseError {
  return { data: null, error: new Error('Supabase not configured') };
}

// ============================================
// Entity Operations
// ============================================

export async function createEntity(name: string, type: string, config: Record<string, unknown> = {}) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase
    .from('entities')
    .insert({ name, type, config })
    .select()
    .single();
}

export async function getEntity(id: string) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase
    .from('entities')
    .select('*')
    .eq('id', id)
    .single();
}

export async function listEntities(type?: string) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  let query = supabase.from('entities').select('*');
  if (type) query = query.eq('type', type);
  
  return query.order('created_at', { ascending: false });
}

// ============================================
// Snapshot Operations
// ============================================

export async function saveSnapshot(
  entityId: string,
  period: string,
  values: Record<string, number>,
  metadata: Record<string, unknown> = {}
) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  // Upsert: update if exists, insert if not
  return supabase
    .from('node_snapshots')
    .upsert(
      { entity_id: entityId, period, values, metadata },
      { onConflict: 'entity_id,period' }
    )
    .select()
    .single();
}

export async function getSnapshots(entityId: string, limit = 12) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase
    .from('node_snapshots')
    .select('*')
    .eq('entity_id', entityId)
    .order('period', { ascending: false })
    .limit(limit);
}

export async function getSnapshotByPeriod(entityId: string, period: string) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase
    .from('node_snapshots')
    .select('*')
    .eq('entity_id', entityId)
    .eq('period', period)
    .single();
}

// ============================================
// Learning Operations
// ============================================

export async function saveLearningStep(
  entityId: string,
  step: number,
  mse: number,
  mae: number,
  adjustments: unknown[]
) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase
    .from('learning_history')
    .insert({ entity_id: entityId, step, mse, mae, adjustments })
    .select()
    .single();
}

export async function getLearningHistory(entityId: string, limit = 100) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase
    .from('learning_history')
    .select('*')
    .eq('entity_id', entityId)
    .order('step', { ascending: false })
    .limit(limit);
}

// ============================================
// Prediction Operations
// ============================================

export async function savePrediction(
  entityId: string,
  targetPeriod: string,
  predictedValues: Record<string, number>
) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase
    .from('predictions')
    .insert({
      entity_id: entityId,
      target_period: targetPeriod,
      predicted_values: predictedValues,
      actual_values: null,
      mse: null,
      verified: false,
    })
    .select()
    .single();
}

export async function verifyPrediction(
  id: string,
  actualValues: Record<string, number>,
  mse: number
) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase
    .from('predictions')
    .update({ actual_values: actualValues, mse, verified: true })
    .eq('id', id)
    .select()
    .single();
}

export async function getPredictions(entityId: string, verified?: boolean) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  let query = supabase
    .from('predictions')
    .select('*')
    .eq('entity_id', entityId);
  
  if (verified !== undefined) {
    query = query.eq('verified', verified);
  }
  
  return query.order('target_period', { ascending: false });
}

// ============================================
// Auth Operations
// ============================================

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error('Supabase not configured') };
  
  return supabase.auth.signOut();
}

export async function getUser() {
  const supabase = getSupabase();
  if (!supabase) return notConfiguredError();
  
  return supabase.auth.getUser();
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const supabase = getSupabase();
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  
  return supabase.auth.onAuthStateChange(callback);
}

// ============================================
// Export Default
// ============================================

export default {
  getSupabase,
  isSupabaseConfigured,
  // Entities
  createEntity,
  getEntity,
  listEntities,
  // Snapshots
  saveSnapshot,
  getSnapshots,
  getSnapshotByPeriod,
  // Learning
  saveLearningStep,
  getLearningHistory,
  // Predictions
  savePrediction,
  verifyPrediction,
  getPredictions,
  // Auth
  signIn,
  signUp,
  signOut,
  getUser,
  onAuthStateChange,
};
