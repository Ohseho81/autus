/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👑 Monopoly Dashboard API
 * C-Level Console - 3대 독점 체제 통합 모니터링
 * 
 * - 인지 독점 (Perception)
 * - 판단 독점 (Judgment)
 * - 구조 독점 (Structure)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { captureError } from '../../../lib/monitoring';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase environment variables not configured');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 });
  }

  try {
    // 병렬로 모든 데이터 조회
    const [
      vIndexResult,
      perceptionResult,
      judgmentResult,
      structureResult,
      eventsResult,
    ] = await Promise.all([
      // 1. V-Index 계산
      calculateOrgVIndex(orgId),
      
      // 2. 인지 독점 데이터
      getPerceptionData(orgId),
      
      // 3. 판단 독점 데이터
      getJudgmentData(orgId),
      
      // 4. 구조 독점 데이터
      getStructureData(orgId),
      
      // 5. 최근 이벤트
      getRecentEvents(orgId),
    ]);

    // 6. 글로벌 데이터 (한국 + 필리핀)
    const globalData = {
      korea: {
        v_index: vIndexResult.v_index,
        currency: 'KRW',
      },
      philippines: {
        v_index: Math.round(vIndexResult.v_index * 0.018), // PHP 환산
        currency: 'PHP',
      },
    };

    return NextResponse.json({
      v_index: vIndexResult,
      perception: perceptionResult,
      judgment: judgmentResult,
      structure: structureResult,
      global: globalData,
      recent_events: eventsResult,
      timestamp: new Date().toISOString(),
    });

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error, { context: 'monopoly.GET' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// V-Index 계산
async function calculateOrgVIndex(orgId: string) {
  const supabase = getSupabase();
  // 최근 12개월 재무 데이터 조회
  const { data: financials } = await supabase
    .from('financial_transactions')
    .select('type, amount')
    .eq('org_id', orgId)
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  // 활성 학생 수
  const { data: students } = await supabase
    .from('relational_nodes')
    .select('id')
    .eq('org_id', orgId)
    .eq('node_type', 'student')
    .eq('status', 'active');

  // 위험 학생 수
  const { data: risks } = await supabase
    .from('risk_queue')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'open');

  // M (매출) 계산
  const totalMint = financials
    ?.filter(f => f.type === 'revenue')
    .reduce((sum, f) => sum + f.amount, 0) || 285000000;

  // T (비용) 계산
  const totalTax = financials
    ?.filter(f => f.type !== 'revenue')
    .reduce((sum, f) => sum + f.amount, 0) || 180000000;

  // s (만족도) 계산
  const activeStudents = students?.length || 100;
  const riskStudents = risks?.length || 5;
  const satisfaction = Math.max(0.1, (activeStudents - riskStudents * 2) / activeStudents);

  // t (시간) - 12개월
  const months = 12;

  // V = (M - T) × (1 + s)^t
  const netValue = totalMint - totalTax;
  const compoundMultiplier = Math.pow(1 + satisfaction, months);
  const vIndex = netValue * compoundMultiplier;

  return {
    v_index: Math.round(vIndex),
    net_value: netValue,
    compound_multiplier: compoundMultiplier,
    breakdown: {
      mint: totalMint,
      tax: totalTax,
      satisfaction: Math.round(satisfaction * 100) / 100,
      time_months: months,
    },
    prediction: {
      v_3months: Math.round(netValue * Math.pow(1 + satisfaction, months + 3)),
      v_6months: Math.round(netValue * Math.pow(1 + satisfaction, months + 6)),
      v_12months: Math.round(netValue * Math.pow(1 + satisfaction, months + 12)),
    },
  };
}

// 인지 독점 데이터
async function getPerceptionData(orgId: string) {
  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: recentTags } = await supabase
    .from('interaction_logs')
    .select('*')
    .eq('org_id', orgId)
    .eq('interaction_type', 'quick_tag')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  const tagsToday = recentTags?.length || 12;

  // 긍정/부정 비율
  const positiveTags = recentTags?.filter(t => t.vectorized_data?.emotion_delta > 0).length || 8;
  const negativeTags = recentTags?.filter(t => t.vectorized_data?.emotion_delta < 0).length || 4;

  return {
    tags_today: tagsToday,
    tag_rate: `${tagsToday} tags/day`,
    positive_ratio: tagsToday > 0 ? Math.round((positiveTags / tagsToday) * 100) : 50,
    negative_ratio: tagsToday > 0 ? Math.round((negativeTags / tagsToday) * 100) : 50,
    recent_tags: recentTags?.slice(0, 5).map(t => ({
      id: t.id,
      target: t.target_id,
      emotion: t.vectorized_data?.emotion_delta || 0,
      time: t.created_at,
    })) || [],
  };
}

// 판단 독점 데이터
async function getJudgmentData(orgId: string) {
  const supabase = getSupabase();
  // 활성 예측 (Risk Queue)
  const { data: predictions } = await supabase
    .from('risk_queue')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'open');

  // 해결된 예측 (정확도 계산용)
  const { data: resolved } = await supabase
    .from('risk_queue')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'resolved')
    .gte('resolved_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  // 정확도 추정 (실제로는 이탈 데이터와 비교)
  const accuracy = 87; // Mock

  return {
    accuracy,
    active_predictions: predictions?.length || 3,
    resolved_predictions: resolved?.length || 15,
    avg_response_time: '4.2시간',
    by_priority: {
      critical: predictions?.filter(p => p.priority === 'CRITICAL').length || 1,
      high: predictions?.filter(p => p.priority === 'HIGH').length || 1,
      medium: predictions?.filter(p => p.priority === 'MEDIUM').length || 1,
    },
  };
}

// 구조 독점 데이터
async function getStructureData(orgId: string) {
  const supabase = getSupabase();
  // 동기화 로그
  const { data: syncLogs } = await supabase
    .from('consolidation_logs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);

  // 평균 동기화 시간 계산
  const avgSyncTime = 2.5; // Mock

  return {
    sync_latency: `${avgSyncTime}s`,
    nodes_connected: 2, // 한국, 필리핀
    last_sync: syncLogs?.[0]?.created_at || new Date().toISOString(),
    automation_rate: 85,
    workflows_active: 6,
  };
}

// 최근 이벤트
async function getRecentEvents(orgId: string) {
  const supabase = getSupabase();
  const { data: events } = await supabase
    .from('immortal_events')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);

  return events?.map(e => ({
    id: e.id,
    action: e.action_type,
    content: e.content_redacted,
    delta_v: e.outcome_delta_v,
    time: e.created_at,
    role: e.role,
  })) || [
    { id: 1, action: 'quick_tag', content: '학생 태깅: 감정 +15', delta_v: 0.1, time: new Date(Date.now() - 5 * 60 * 1000).toISOString(), role: 'optimus' },
    { id: 2, action: 'risk_resolve', content: '위험 해결: 박지훈', delta_v: 0.2, time: new Date(Date.now() - 15 * 60 * 1000).toISOString(), role: 'fsd' },
    { id: 3, action: 'chemistry_match', content: '궁합 매칭: 85점', delta_v: 0.15, time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), role: 'fsd' },
  ];
}

// POST: 수동 동기화 트리거
export async function POST(request: NextRequest) {
  try {
    const { org_id, action } = await request.json();

    if (action === 'sync') {
      // n8n 웹훅 트리거
      if (process.env.N8N_WEBHOOK_URL) {
        await fetch(process.env.N8N_WEBHOOK_URL + '/global-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id, trigger: 'manual' }),
        });
      }

      return NextResponse.json({
        success: true,
        message: '글로벌 동기화가 시작되었습니다.',
      });
    }

    if (action === 'recalculate_v') {
      const vIndex = await calculateOrgVIndex(org_id);
      
      // Owner Console State 업데이트
      const supabase = getSupabase();
      await supabase
        .from('owner_console_state')
        .upsert({
          id: 'global_metrics',
          org_id,
          consolidated_v: vIndex.v_index,
          updated_at: new Date().toISOString(),
        });

      return NextResponse.json({
        success: true,
        v_index: vIndex,
        message: 'V-Index가 재계산되었습니다.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
