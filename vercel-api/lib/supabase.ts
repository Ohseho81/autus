// ============================================
// AUTUS Supabase Client
// ============================================

import { createClient } from '@supabase/supabase-js';

// Types
export interface User {
  id: string;
  email: string;
  role_id: 'owner' | 'director' | 'teacher' | 'staff' | 'parent' | 'student';
  affiliation_map: Record<string, string>;
  base_capacity: number;
  pain_point_top1: string | null;
  sync_orbit: number;
  current_energy: number;
}

export interface Organism {
  id: string;
  user_id: string;
  name: string;
  type: 'teacher' | 'student' | 'parent' | 'branch' | 'class';
  emoji: string;
  // Legacy terms
  mint: number;
  tax: number;
  synergy: number;
  // New terms (v2.3) - optional for backward compatibility
  motions?: number;
  threats?: number;
  relations?: number;
  base?: number;
  interactionExponent?: number;
  interaction_exponent?: number; // snake_case version
  // Common fields
  value_v: number;
  entropy: number;
  velocity: number;
  friction: number;
  sync_rate: number;
  status: 'urgent' | 'warning' | 'stable' | 'opportunity';
  urgency: number;
}

export interface UsageLog {
  id: string;
  task_id: string;
  solution_id: string;
  user_id: string;
  before_m: number;
  before_t: number;
  before_s: number;
  after_m: number;
  after_t: number;
  after_s: number;
  effectiveness_score: number;
  v_growth: number;
  duration_minutes: number;
}

export interface RewardCard {
  id: string;
  user_id: string;
  card_type: string;
  title: string;
  icon: string;
  message: string;
  actions: { label: string; type: string; requires_approval: boolean }[];
  is_read: boolean;
  is_acted: boolean;
}

// Lazy initialization to avoid build-time errors
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
let _supabaseClient: ReturnType<typeof createClient> | null = null;

// Client (Server-side with service role)
export const supabaseAdmin = (() => {
  if (!_supabaseAdmin && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return _supabaseAdmin;
})();

// Client (Client-side with anon key)
export const supabaseClient = (() => {
  if (!_supabaseClient && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    _supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _supabaseClient;
})();

// Helper to get admin client (throws at runtime if not configured)
export function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// ============================================
// Database Functions
// ============================================

export const db = {
  // Users
  async getUser(userId: string): Promise<User | null> {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) return null;
    return data;
  },

  async updateUserKernel(userId: string, updates: Partial<User>): Promise<boolean> {
    const client = getSupabaseAdmin();
    const { error } = await client
      .from('users')
      .update(updates)
      .eq('id', userId);
    
    return !error;
  },

  // Organisms
  async getOrganisms(userId: string): Promise<Organism[]> {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('organisms')
      .select('*')
      .eq('user_id', userId)
      .order('urgency', { ascending: false });
    
    if (error) return [];
    return data;
  },

  async getOrganism(organismId: string): Promise<Organism | null> {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('organisms')
      .select('*')
      .eq('id', organismId)
      .single();
    
    if (error) return null;
    return data;
  },

  async updateOrganism(organismId: string, updates: Partial<Organism>): Promise<boolean> {
    const client = getSupabaseAdmin();
    const { error } = await client
      .from('organisms')
      .update(updates)
      .eq('id', organismId);
    
    return !error;
  },

  // Usage Logs
  async createUsageLog(log: Omit<UsageLog, 'id'>): Promise<UsageLog | null> {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('usage_logs')
      .insert(log)
      .select()
      .single();
    
    if (error) return null;
    return data;
  },

  async getSolutionRanking(taskId?: string) {
    const client = getSupabaseAdmin();
    let query = client
      .from('solution_ranking')
      .select('*');
    
    if (taskId) {
      query = query.eq('task_id', taskId);
    }
    
    const { data, error } = await query.order('avg_score', { ascending: false });
    
    if (error) return [];
    return data;
  },

  // Reward Cards
  async createRewardCard(card: Omit<RewardCard, 'id'>): Promise<RewardCard | null> {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('reward_cards')
      .insert(card)
      .select()
      .single();
    
    if (error) return null;
    return data;
  },

  async getUnreadRewards(userId: string): Promise<RewardCard[]> {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('reward_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data;
  },

  // V Leaderboard
  async getLeaderboard(limit = 10) {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('v_leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(limit);
    
    if (error) return [];
    return data;
  },

  // Standards
  async getStandard(taskId: string) {
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('standards')
      .select('*, solutions(*)')
      .eq('task_id', taskId)
      .single();
    
    if (error) return null;
    return data;
  }
};
