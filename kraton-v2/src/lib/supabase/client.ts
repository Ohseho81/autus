// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ AUTUS Supabase Client
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 환경변수가 설정되지 않았습니다. Mock 모드로 실행됩니다.');
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================
// AUTH HELPERS
// ============================================

export const auth = {
  // 회원가입
  signUp: async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { data, error };
  },

  // 로그인
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // 로그아웃
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // 현재 사용자
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // 세션 가져오기
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // 비밀번호 재설정
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  },
};

// ============================================
// DATABASE HELPERS
// ============================================

export const db = {
  // Organizations
  organizations: {
    getAll: () => supabase.from('organizations').select('*'),
    getById: (id: string) => supabase.from('organizations').select('*').eq('id', id).single(),
    getBySlug: (slug: string) => supabase.from('organizations').select('*').eq('slug', slug).single(),
    create: (data: Database['public']['Tables']['organizations']['Insert']) =>
      supabase.from('organizations').insert(data).select().single(),
    update: (id: string, data: Database['public']['Tables']['organizations']['Update']) =>
      supabase.from('organizations').update(data).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('organizations').delete().eq('id', id),
  },

  // Users
  users: {
    getAll: (orgId: string) => supabase.from('users').select('*').eq('organization_id', orgId),
    getById: (id: string) => supabase.from('users').select('*').eq('id', id).single(),
    getByEmail: (email: string) => supabase.from('users').select('*').eq('email', email).single(),
    getByRole: (orgId: string, role: string) =>
      supabase.from('users').select('*').eq('organization_id', orgId).eq('role', role),
    create: (data: Database['public']['Tables']['users']['Insert']) =>
      supabase.from('users').insert(data).select().single(),
    update: (id: string, data: Database['public']['Tables']['users']['Update']) =>
      supabase.from('users').update(data).eq('id', id).select().single(),
    delete: (id: string) => supabase.from('users').delete().eq('id', id),
  },

  // Approval Codes
  approvalCodes: {
    create: (data: Database['public']['Tables']['approval_codes']['Insert']) =>
      supabase.from('approval_codes').insert(data).select().single(),
    verify: (code: string) =>
      supabase.from('approval_codes')
        .select('*')
        .eq('code', code)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single(),
    markUsed: (id: string, usedBy: string) =>
      supabase.from('approval_codes')
        .update({ is_used: true, used_by: usedBy, used_at: new Date().toISOString() })
        .eq('id', id),
  },

  // V-Nodes
  vNodes: {
    getAll: (orgId: string) => supabase.from('v_nodes').select('*').eq('organization_id', orgId),
    getById: (id: string) => supabase.from('v_nodes').select('*').eq('id', id).single(),
    getByTier: (orgId: string, tier: string) =>
      supabase.from('v_nodes').select('*').eq('organization_id', orgId).eq('tier', tier),
    getByType: (orgId: string, nodeType: string) =>
      supabase.from('v_nodes').select('*').eq('organization_id', orgId).eq('node_type', nodeType),
    create: (data: Database['public']['Tables']['v_nodes']['Insert']) =>
      supabase.from('v_nodes').insert(data).select().single(),
    update: (id: string, data: Database['public']['Tables']['v_nodes']['Update']) =>
      supabase.from('v_nodes').update(data).eq('id', id).select().single(),
    updateMint: (id: string, amount: number) =>
      supabase.rpc('update_node_mint', { node_id: id, mint_amount: amount }),
    updateBurn: (id: string, amount: number) =>
      supabase.rpc('update_node_burn', { node_id: id, burn_amount: amount }),
  },

  // V-Flows
  vFlows: {
    getRecent: (orgId: string, limit = 100) =>
      supabase.from('v_flows')
        .select('*')
        .eq('organization_id', orgId)
        .order('timestamp', { ascending: false })
        .limit(limit),
    getByNode: (nodeId: string) =>
      supabase.from('v_flows')
        .select('*')
        .or(`from_node_id.eq.${nodeId},to_node_id.eq.${nodeId}`)
        .order('timestamp', { ascending: false }),
    create: (data: Database['public']['Tables']['v_flows']['Insert']) =>
      supabase.from('v_flows').insert(data).select().single(),
  },

  // V-Snapshots
  vSnapshots: {
    getLatest: (orgId: string) =>
      supabase.from('v_snapshots')
        .select('*')
        .eq('organization_id', orgId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single(),
    getRange: (orgId: string, startDate: string, endDate: string) =>
      supabase.from('v_snapshots')
        .select('*')
        .eq('organization_id', orgId)
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate)
        .order('snapshot_date', { ascending: true }),
    create: (data: Database['public']['Tables']['v_snapshots']['Insert']) =>
      supabase.from('v_snapshots').insert(data).select().single(),
  },

  // Strategic Decisions (C-Level)
  strategicDecisions: {
    getAll: (orgId: string) =>
      supabase.from('strategic_decisions').select('*').eq('organization_id', orgId),
    getPending: (orgId: string) =>
      supabase.from('strategic_decisions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'pending'),
    create: (data: Database['public']['Tables']['strategic_decisions']['Insert']) =>
      supabase.from('strategic_decisions').insert(data).select().single(),
    update: (id: string, data: Database['public']['Tables']['strategic_decisions']['Update']) =>
      supabase.from('strategic_decisions').update(data).eq('id', id).select().single(),
    approve: (id: string, userId: string) =>
      supabase.from('strategic_decisions')
        .update({ status: 'approved', decided_by: userId, decided_at: new Date().toISOString() })
        .eq('id', id),
    execute: (id: string) =>
      supabase.from('strategic_decisions')
        .update({ status: 'executed', executed_at: new Date().toISOString() })
        .eq('id', id),
  },

  // Risk Predictions (FSD)
  riskPredictions: {
    getAll: (orgId: string) =>
      supabase.from('risk_predictions').select('*').eq('organization_id', orgId),
    getActive: (orgId: string) =>
      supabase.from('risk_predictions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('probability', { ascending: false }),
    getByType: (orgId: string, riskType: string) =>
      supabase.from('risk_predictions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('risk_type', riskType),
    create: (data: Database['public']['Tables']['risk_predictions']['Insert']) =>
      supabase.from('risk_predictions').insert(data).select().single(),
    update: (id: string, data: Database['public']['Tables']['risk_predictions']['Update']) =>
      supabase.from('risk_predictions').update(data).eq('id', id).select().single(),
    mitigate: (id: string) =>
      supabase.from('risk_predictions').update({ status: 'mitigated' }).eq('id', id),
  },

  // Crisis Responses (Optimus)
  crisisResponses: {
    getAll: (orgId: string) =>
      supabase.from('crisis_responses').select('*').eq('organization_id', orgId),
    getPending: (orgId: string) =>
      supabase.from('crisis_responses')
        .select('*')
        .eq('organization_id', orgId)
        .in('response_status', ['pending', 'analyzing', 'drafting'])
        .order('severity', { ascending: false }),
    create: (data: Database['public']['Tables']['crisis_responses']['Insert']) =>
      supabase.from('crisis_responses').insert(data).select().single(),
    update: (id: string, data: Database['public']['Tables']['crisis_responses']['Update']) =>
      supabase.from('crisis_responses').update(data).eq('id', id).select().single(),
    respond: (id: string, content: string, channel: string) =>
      supabase.from('crisis_responses')
        .update({
          response_content: content,
          response_channel: channel,
          response_status: 'responded',
          responded_at: new Date().toISOString(),
        })
        .eq('id', id),
    resolve: (id: string, outcome: string) =>
      supabase.from('crisis_responses')
        .update({ response_status: 'resolved', outcome, resolved_at: new Date().toISOString() })
        .eq('id', id),
  },

  // Execution Tasks (Optimus - KRATON Teams)
  executionTasks: {
    getAll: (orgId: string) =>
      supabase.from('execution_tasks').select('*').eq('organization_id', orgId),
    getQueued: (orgId: string) =>
      supabase.from('execution_tasks')
        .select('*')
        .eq('organization_id', orgId)
        .in('status', ['queued', 'assigned'])
        .order('priority', { ascending: false }),
    getByTeam: (orgId: string, team: string) =>
      supabase.from('execution_tasks')
        .select('*')
        .eq('organization_id', orgId)
        .eq('assigned_team', team),
    create: (data: Database['public']['Tables']['execution_tasks']['Insert']) =>
      supabase.from('execution_tasks').insert(data).select().single(),
    assign: (id: string, team: string) =>
      supabase.from('execution_tasks')
        .update({ assigned_team: team, status: 'assigned' })
        .eq('id', id),
    start: (id: string) =>
      supabase.from('execution_tasks')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', id),
    complete: (id: string, results: Record<string, unknown>) =>
      supabase.from('execution_tasks')
        .update({ status: 'completed', results, completed_at: new Date().toISOString() })
        .eq('id', id),
  },

  // Notifications
  notifications: {
    getUnread: (userId: string) =>
      supabase.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false }),
    markRead: (id: string) =>
      supabase.from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id),
    markAllRead: (userId: string) =>
      supabase.from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false),
    create: (data: Database['public']['Tables']['notifications']['Insert']) =>
      supabase.from('notifications').insert(data).select().single(),
  },
};

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export const realtime = {
  // V-Flow 실시간 구독
  subscribeToFlows: (orgId: string, callback: (payload: unknown) => void) => {
    return supabase
      .channel(`v_flows:${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'v_flows', filter: `organization_id=eq.${orgId}` },
        callback
      )
      .subscribe();
  },

  // 알림 실시간 구독
  subscribeToNotifications: (userId: string, callback: (payload: unknown) => void) => {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        callback
      )
      .subscribe();
  },

  // 위기 대응 실시간 구독
  subscribeToCrisis: (orgId: string, callback: (payload: unknown) => void) => {
    return supabase
      .channel(`crisis:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crisis_responses', filter: `organization_id=eq.${orgId}` },
        callback
      )
      .subscribe();
  },

  // 작업 큐 실시간 구독
  subscribeToTasks: (orgId: string, callback: (payload: unknown) => void) => {
    return supabase
      .channel(`tasks:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'execution_tasks', filter: `organization_id=eq.${orgId}` },
        callback
      )
      .subscribe();
  },

  // 구독 해제
  unsubscribe: (channel: ReturnType<typeof supabase.channel>) => {
    supabase.removeChannel(channel);
  },
};

// ============================================
// STORAGE HELPERS
// ============================================

export const storage = {
  // 파일 업로드
  upload: async (bucket: string, path: string, file: File) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    return { data, error };
  },

  // 파일 다운로드 URL
  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  // 파일 삭제
  remove: async (bucket: string, paths: string[]) => {
    const { data, error } = await supabase.storage.from(bucket).remove(paths);
    return { data, error };
  },

  // 파일 목록
  list: async (bucket: string, folder: string) => {
    const { data, error } = await supabase.storage.from(bucket).list(folder);
    return { data, error };
  },
};

export default supabase;
