/**
 * AUTUS 2.0 Demo Data Hook
 * ========================
 * 
 * 11개 뷰에 필요한 데이터를 Supabase에서 가져오거나 Mock 데이터 사용
 * 
 * 사용법:
 * const { data, loading, error, refetch } = useDemoData(orgId);
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Customer {
  id: string;
  name: string;
  grade?: string;
  class?: string;
  tenure?: number;
  executor?: { id: string; name: string };
  payer?: { id: string; name: string; phone?: string };
  temperature: {
    current: number;
    zone: 'critical' | 'warning' | 'normal' | 'good' | 'excellent';
    trend: 'declining' | 'stable' | 'improving';
    trendValue: number;
  };
  tsel: {
    trust: { score: number };
    satisfaction: { score: number };
    engagement: { score: number };
    loyalty: { score: number };
  };
  sigma: {
    total: number;
    factors: Array<{ name: string; impact: number }>;
  };
  churnPrediction: { probability: number; predictedDate?: string };
  voices: Array<{
    id: string;
    stage: string;
    content: string;
    status: string;
  }>;
  recommendation?: {
    strategyName: string;
    tips: string[];
    expectedEffect: { temperatureChange: number };
  };
}

export interface Alert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  time: string;
  customerId?: string;
}

export interface Action {
  id: string;
  priority: number;
  title: string;
  context: string;
  assignee?: string;
  customerId?: string;
}

export interface Competitor {
  id: string;
  name: string;
  threat: 'high' | 'medium' | 'low';
  location?: { lat: number; lng: number };
}

export interface WeatherDay {
  date: string;
  day: string;
  weather: 'sunny' | 'cloudy' | 'rainy' | 'storm';
  sigma: number;
  event?: string;
}

export interface Threat {
  id: string;
  name: string;
  severity: 'high' | 'medium' | 'low';
  eta: number;
  impact: number;
}

export interface Opportunity {
  id: string;
  name: string;
  potential: 'high' | 'medium' | 'low';
  eta: number;
  impact: number;
}

export interface NetworkNode {
  id: string;
  name: string;
  zone: 'critical' | 'warning' | 'normal' | 'good' | 'excellent';
}

export interface Influencer {
  name: string;
  referrals: number;
  temp: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  rate: number;
}

export interface Scenario {
  id: string;
  name: string;
  customers: number;
  revenue: number;
  churn: number;
  recommended: boolean;
}

export interface DemoData {
  // 조종석
  cockpit: {
    status: { level: 'green' | 'yellow' | 'red'; label: string };
    internal: {
      customerCount: number;
      avgTemperature: number;
      riskCount: number;
      warningCount: number;
      healthyCount: number;
    };
    external: {
      sigma: number;
      weatherLabel: string;
      threatCount: number;
      opportunityCount: number;
      heartbeatKeyword: string;
    };
    alerts: Alert[];
    actions: Action[];
  };
  // 고객 상세 (현미경)
  customers: Customer[];
  // 지도
  mapCustomers: Array<{ id: string; name: string; temp: number; zone: string }>;
  mapCompetitors: Competitor[];
  // 날씨
  weather: WeatherDay[];
  // 레이더
  threats: Threat[];
  opportunities: Opportunity[];
  // 스코어보드
  scoreCompetitors: Array<{ name: string; win: number; lose: number }>;
  scoreGoals: Array<{ name: string; current: number; target: number; progress: number }>;
  // 조류
  tide: {
    market: { trend: string; change: number };
    ours: { trend: string; change: number };
  };
  // 심전도
  heartbeat: {
    external: Array<{ word: string; count: number; trend: string }>;
    internal: Array<{ word: string; count: number; trend: string }>;
    resonance: { detected: boolean; external: string; internal: string; correlation: number };
  };
  // 네트워크
  network: {
    nodes: NetworkNode[];
    influencers: Influencer[];
    riskCluster: { name: string; count: number; avgTemp: number };
  };
  // 퍼널
  funnel: FunnelStage[];
  // 수정구
  scenarios: Scenario[];
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA (Fallback)
// ═══════════════════════════════════════════════════════════════════════════

const getMockData = (): DemoData => ({
  cockpit: {
    status: { level: 'yellow', label: '주의 필요' },
    internal: { customerCount: 132, avgTemperature: 68.5, riskCount: 3, warningCount: 8, healthyCount: 121 },
    external: { sigma: 0.85, weatherLabel: '토요일 중간고사', threatCount: 2, opportunityCount: 1, heartbeatKeyword: '사교육비' },
    alerts: [
      { id: 'a1', level: 'critical', title: '김민수 온도 38° 위험', time: '10분 전' },
      { id: 'a2', level: 'warning', title: 'D학원 프로모션 감지', time: '1시간 전' },
    ],
    actions: [
      { id: 'ac1', priority: 1, title: '김민수 학부모 상담', context: '온도 38°', assignee: '박강사', customerId: 'cust-001' },
      { id: 'ac2', priority: 2, title: 'D학원 대응 전략', context: '경쟁사 감지', assignee: '관리자' },
    ]
  },
  customers: [
    {
      id: 'cust-001', name: '김민수', grade: '중2', class: 'A반', tenure: 8,
      executor: { id: 'u1', name: '박강사' }, payer: { id: 'p1', name: '김민수 어머니', phone: '010-1234-5678' },
      temperature: { current: 38, zone: 'critical', trend: 'declining', trendValue: -12 },
      churnPrediction: { probability: 0.42 },
      tsel: { trust: { score: 52 }, satisfaction: { score: 35 }, engagement: { score: 60 }, loyalty: { score: 25 } },
      sigma: { total: 0.70, factors: [{ name: '숙제 미제출', impact: -0.10 }, { name: '비용 Voice', impact: -0.15 }] },
      voices: [{ id: 'v1', stage: '바람', content: '학원비 부담이...', status: 'pending' }],
      recommendation: { strategyName: '가치 재인식 상담', tips: ['가격 대비 가치 강조'], expectedEffect: { temperatureChange: 15 } }
    },
    {
      id: 'cust-002', name: '이서연', grade: '중1', class: 'B반', tenure: 14,
      executor: { id: 'u2', name: '김강사' }, payer: { id: 'p2', name: '이서연 어머니' },
      temperature: { current: 72, zone: 'good', trend: 'stable', trendValue: 2 },
      churnPrediction: { probability: 0.08 },
      tsel: { trust: { score: 75 }, satisfaction: { score: 68 }, engagement: { score: 80 }, loyalty: { score: 65 } },
      sigma: { total: 0.95, factors: [] },
      voices: [],
    },
    {
      id: 'cust-003', name: '박지훈', grade: '중3', class: 'A반', tenure: 24,
      executor: { id: 'u1', name: '박강사' }, payer: { id: 'p3', name: '박지훈 어머니' },
      temperature: { current: 45, zone: 'warning', trend: 'declining', trendValue: -8 },
      churnPrediction: { probability: 0.28 },
      tsel: { trust: { score: 55 }, satisfaction: { score: 42 }, engagement: { score: 50 }, loyalty: { score: 40 } },
      sigma: { total: 0.82, factors: [{ name: '성적 하락', impact: -0.08 }] },
      voices: [{ id: 'v2', stage: '속삭임', content: '성적이 안 올라서...', status: 'pending' }],
    },
    {
      id: 'cust-004', name: '최유진', grade: '중2', class: 'B반', tenure: 18,
      executor: { id: 'u2', name: '김강사' }, payer: { id: 'p4', name: '최유진 어머니' },
      temperature: { current: 85, zone: 'excellent', trend: 'improving', trendValue: 5 },
      churnPrediction: { probability: 0.02 },
      tsel: { trust: { score: 90 }, satisfaction: { score: 85 }, engagement: { score: 88 }, loyalty: { score: 82 } },
      sigma: { total: 1.0, factors: [] },
      voices: [],
    },
  ],
  mapCustomers: [
    { id: 'c1', name: '김민수', temp: 38, zone: 'critical' },
    { id: 'c2', name: '이서연', temp: 72, zone: 'good' },
    { id: 'c3', name: '박지훈', temp: 45, zone: 'warning' },
    { id: 'c4', name: '최유진', temp: 85, zone: 'excellent' },
  ],
  mapCompetitors: [
    { id: 'cp1', name: 'D학원', threat: 'high' },
    { id: 'cp2', name: 'E학원', threat: 'medium' },
  ],
  weather: [
    { date: '1/28', day: '화', weather: 'sunny', sigma: 0.95 },
    { date: '1/29', day: '수', weather: 'cloudy', sigma: 0.90 },
    { date: '1/30', day: '목', weather: 'cloudy', sigma: 0.85 },
    { date: '1/31', day: '금', weather: 'rainy', sigma: 0.75, event: '시험전날' },
    { date: '2/1', day: '토', weather: 'storm', sigma: 0.60, event: '중간고사' },
    { date: '2/2', day: '일', weather: 'cloudy', sigma: 0.80 },
    { date: '2/3', day: '월', weather: 'sunny', sigma: 0.95 },
  ],
  threats: [
    { id: 't1', name: 'D학원 프로모션', severity: 'high', eta: 3, impact: -15 },
    { id: 't2', name: '중간고사 스트레스', severity: 'medium', eta: 5, impact: -10 }
  ],
  opportunities: [
    { id: 'o1', name: 'C학원 강사 퇴사', potential: 'high', eta: 7, impact: 10 }
  ],
  scoreCompetitors: [
    { name: 'D학원', win: 1, lose: 2 },
    { name: 'E학원', win: 2, lose: 1 }
  ],
  scoreGoals: [
    { name: '재원수', current: 132, target: 150, progress: 88 },
    { name: '이탈률', current: 5, target: 3, progress: 60 }
  ],
  tide: { market: { trend: '썰물', change: -5.2 }, ours: { trend: '역류', change: 8.3 } },
  heartbeat: {
    external: [{ word: '사교육비', count: 45, trend: 'rising' }, { word: '학원비', count: 32, trend: 'stable' }],
    internal: [{ word: '비용', count: 8, trend: 'rising' }, { word: '성적', count: 5, trend: 'stable' }],
    resonance: { detected: true, external: '사교육비', internal: '비용', correlation: 0.85 }
  },
  network: {
    nodes: [
      { id: 'n1', name: '박지훈', zone: 'excellent' },
      { id: 'n2', name: '이서연', zone: 'good' },
      { id: 'n3', name: '김민수', zone: 'critical' },
      { id: 'n4', name: '최유진', zone: 'good' },
      { id: 'n5', name: '정하은', zone: 'warning' },
    ],
    influencers: [
      { name: '박지훈 어머니', referrals: 5, temp: 85 },
      { name: '최유진 어머니', referrals: 3, temp: 72 }
    ],
    riskCluster: { name: '북쪽 그룹', count: 4, avgTemp: 42 }
  },
  funnel: [
    { name: '인지', count: 500, rate: 100 },
    { name: '관심', count: 200, rate: 40 },
    { name: '체험', count: 80, rate: 16 },
    { name: '등록', count: 40, rate: 8 },
    { name: '3개월', count: 35, rate: 7 },
    { name: '6개월', count: 30, rate: 6 }
  ],
  scenarios: [
    { id: 's1', name: '현상 유지', customers: 125, revenue: 5200, churn: 8, recommended: false },
    { id: 's2', name: '적극 방어', customers: 140, revenue: 5800, churn: 4, recommended: true },
    { id: 's3', name: '확장 공격', customers: 160, revenue: 6500, churn: 6, recommended: false }
  ]
});

// ═══════════════════════════════════════════════════════════════════════════
// DATA FETCHER
// ═══════════════════════════════════════════════════════════════════════════

async function fetchDemoDataFromSupabase(orgId: string): Promise<DemoData | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    // 1. 조직 통계
    const { data: orgStats } = await supabase
      .from('organization_stats')
      .select('*')
      .eq('org_id', orgId)
      .single();

    // 2. 고객 + 온도
    const { data: customersRaw } = await supabase
      .from('customers')
      .select(`
        *,
        customer_temperatures(*),
        executor:users!customers_executor_id_fkey(id, name),
        payer:users!customers_payer_id_fkey(id, name, phone)
      `)
      .eq('org_id', orgId)
      .limit(50);

    // 3. 알림
    const { data: alertsRaw } = await supabase
      .from('alerts')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. 액션
    const { data: actionsRaw } = await supabase
      .from('actions')
      .select('*, assignee:users!actions_assignee_id_fkey(name)')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .limit(10);

    // 5. Voice
    const { data: voicesRaw } = await supabase
      .from('voices')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    // 6. 경쟁사
    const { data: competitorsRaw } = await supabase
      .from('competitors')
      .select('*')
      .eq('org_id', orgId);

    // 7. 외부 이벤트 (날씨용)
    const { data: eventsRaw } = await supabase
      .from('external_events')
      .select('*')
      .eq('org_id', orgId)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(7);

    // 8. 외부 여론 (심전도용)
    const { data: sentimentsRaw } = await supabase
      .from('external_sentiments')
      .select('*')
      .eq('org_id', orgId)
      .order('mention_count', { ascending: false })
      .limit(10);

    // 9. 시나리오 (수정구용)
    const { data: scenariosRaw } = await supabase
      .from('scenarios')
      .select('*')
      .eq('org_id', orgId)
      .order('is_recommended', { ascending: false });

    // 10. 리드 (퍼널용)
    const { data: leadsRaw } = await supabase
      .from('leads')
      .select('stage')
      .eq('org_id', orgId);

    // Transform data
    const customers: Customer[] = (customersRaw || []).map((c: any) => {
      const temp = c.customer_temperatures?.[0] || {};
      const customerVoices = (voicesRaw || []).filter((v: any) => v.customer_id === c.id);
      
      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        class: c.class,
        tenure: c.enrolled_at ? Math.floor((Date.now() - new Date(c.enrolled_at).getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0,
        executor: c.executor,
        payer: c.payer,
        temperature: {
          current: temp.temperature || 50,
          zone: temp.zone || 'normal',
          trend: temp.trend || 'stable',
          trendValue: temp.trend_value || 0,
        },
        tsel: {
          trust: { score: temp.trust_score || 50 },
          satisfaction: { score: temp.satisfaction_score || 50 },
          engagement: { score: temp.engagement_score || 50 },
          loyalty: { score: temp.loyalty_score || 50 },
        },
        sigma: {
          total: temp.sigma_total || 1.0,
          factors: [],
        },
        churnPrediction: {
          probability: temp.churn_probability || 0,
          predictedDate: temp.churn_predicted_date,
        },
        voices: customerVoices.map((v: any) => ({
          id: v.id,
          stage: v.stage,
          content: v.content,
          status: v.status,
        })),
      };
    });

    const formatTimeAgo = (date: string) => {
      const diff = Date.now() - new Date(date).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) return `${minutes}분 전`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}시간 전`;
      return `${Math.floor(hours / 24)}일 전`;
    };

    const alerts: Alert[] = (alertsRaw || []).map((a: any) => ({
      id: a.id,
      level: a.level,
      title: a.title,
      time: formatTimeAgo(a.created_at),
      customerId: a.customer_id,
    }));

    const actions: Action[] = (actionsRaw || []).map((a: any) => ({
      id: a.id,
      priority: a.priority,
      title: a.title,
      context: a.context || '',
      assignee: a.assignee?.name,
      customerId: a.customer_id,
    }));

    // Calculate status
    const riskCount = customers.filter(c => c.temperature.zone === 'critical').length;
    const warningCount = customers.filter(c => c.temperature.zone === 'warning').length;
    const healthyCount = customers.length - riskCount - warningCount;
    const avgTemp = customers.length > 0 
      ? customers.reduce((sum, c) => sum + c.temperature.current, 0) / customers.length 
      : 50;

    let statusLevel: 'green' | 'yellow' | 'red' = 'green';
    let statusLabel = '양호';
    if (riskCount > 0) { statusLevel = 'red'; statusLabel = '위험'; }
    else if (warningCount > 3) { statusLevel = 'yellow'; statusLabel = '주의 필요'; }

    // Build weather data from events
    const today = new Date();
    const weather: WeatherDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const event = (eventsRaw || []).find((e: any) => e.event_date === d.toISOString().split('T')[0]);
      
      weather.push({
        date: dateStr,
        day: days[d.getDay()],
        weather: event ? (event.sigma_impact < -0.2 ? 'storm' : event.sigma_impact < -0.1 ? 'rainy' : 'cloudy') : 'sunny',
        sigma: event ? Math.max(0.5, 1 + event.sigma_impact) : 0.95,
        event: event?.event_name,
      });
    }

    // Build funnel from leads
    const funnelCounts: Record<string, number> = {};
    (leadsRaw || []).forEach((l: any) => {
      funnelCounts[l.stage] = (funnelCounts[l.stage] || 0) + 1;
    });
    const totalLeads = Object.values(funnelCounts).reduce((a, b) => a + b, 0) || 500;
    const funnel: FunnelStage[] = [
      { name: '인지', count: funnelCounts['awareness'] || totalLeads, rate: 100 },
      { name: '관심', count: funnelCounts['interest'] || Math.floor(totalLeads * 0.4), rate: 40 },
      { name: '체험', count: funnelCounts['trial'] || Math.floor(totalLeads * 0.16), rate: 16 },
      { name: '등록', count: funnelCounts['registered'] || Math.floor(totalLeads * 0.08), rate: 8 },
      { name: '3개월', count: customers.filter(c => (c.tenure || 0) >= 3).length, rate: 7 },
      { name: '6개월', count: customers.filter(c => (c.tenure || 0) >= 6).length, rate: 6 },
    ];

    return {
      cockpit: {
        status: { level: statusLevel, label: statusLabel },
        internal: {
          customerCount: customers.length,
          avgTemperature: Math.round(avgTemp * 10) / 10,
          riskCount,
          warningCount,
          healthyCount,
        },
        external: {
          sigma: orgStats?.sigma_external || 0.85,
          weatherLabel: weather.find(w => w.event)?.event || '이벤트 없음',
          threatCount: (competitorsRaw || []).filter((c: any) => c.threat_level === 'high').length,
          opportunityCount: 1,
          heartbeatKeyword: (sentimentsRaw || [])[0]?.keyword || '없음',
        },
        alerts,
        actions,
      },
      customers,
      mapCustomers: customers.map(c => ({
        id: c.id,
        name: c.name,
        temp: c.temperature.current,
        zone: c.temperature.zone,
      })),
      mapCompetitors: (competitorsRaw || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        threat: c.threat_level || 'medium',
      })),
      weather,
      threats: (competitorsRaw || [])
        .filter((c: any) => c.threat_level === 'high')
        .map((c: any, i: number) => ({
          id: `t${i}`,
          name: `${c.name} 위협`,
          severity: 'high' as const,
          eta: 3 + i * 2,
          impact: -15 + i * 5,
        })),
      opportunities: [
        { id: 'o1', name: '신규 고객 유입 기회', potential: 'high' as const, eta: 7, impact: 10 }
      ],
      scoreCompetitors: (competitorsRaw || []).slice(0, 3).map((c: any) => ({
        name: c.name,
        win: Math.floor(Math.random() * 3) + 1,
        lose: Math.floor(Math.random() * 3) + 1,
      })),
      scoreGoals: [
        { name: '재원수', current: customers.length, target: 150, progress: Math.round(customers.length / 150 * 100) },
        { name: '이탈률', current: Math.round(riskCount / customers.length * 100) || 5, target: 3, progress: 60 }
      ],
      tide: { market: { trend: '썰물', change: -5.2 }, ours: { trend: '역류', change: 8.3 } },
      heartbeat: {
        external: (sentimentsRaw || []).slice(0, 2).map((s: any) => ({
          word: s.keyword,
          count: s.mention_count,
          trend: s.trend,
        })),
        internal: customers
          .flatMap(c => c.voices)
          .reduce((acc: any[], v) => {
            const existing = acc.find(a => a.word === v.stage);
            if (existing) existing.count++;
            else acc.push({ word: v.stage, count: 1, trend: 'stable' });
            return acc;
          }, [])
          .slice(0, 2),
        resonance: {
          detected: (sentimentsRaw || []).length > 0 && customers.some(c => c.voices.length > 0),
          external: (sentimentsRaw || [])[0]?.keyword || '',
          internal: customers.find(c => c.voices.length > 0)?.voices[0]?.stage || '',
          correlation: 0.85,
        },
      },
      network: {
        nodes: customers.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name,
          zone: c.temperature.zone,
        })),
        influencers: customers
          .filter(c => c.temperature.current > 70)
          .slice(0, 2)
          .map(c => ({
            name: `${c.name} 어머니`,
            referrals: Math.floor(Math.random() * 5) + 1,
            temp: c.temperature.current,
          })),
        riskCluster: {
          name: '위험 그룹',
          count: riskCount + warningCount,
          avgTemp: riskCount + warningCount > 0
            ? Math.round(customers.filter(c => ['critical', 'warning'].includes(c.temperature.zone))
                .reduce((sum, c) => sum + c.temperature.current, 0) / (riskCount + warningCount))
            : 50,
        },
      },
      funnel,
      scenarios: (scenariosRaw || []).length > 0
        ? (scenariosRaw || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            customers: s.predicted_customers,
            revenue: s.predicted_revenue / 10000,
            churn: Math.round(s.predicted_churn_rate * 100),
            recommended: s.is_recommended,
          }))
        : getMockData().scenarios,
    };
  } catch (error) {
    console.error('[useDemoData] Supabase fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseDemoDataResult {
  data: DemoData;
  loading: boolean;
  error: Error | null;
  isLive: boolean;
  refetch: () => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;
}

export function useDemoData(orgId?: string): UseDemoDataResult {
  const [data, setData] = useState<DemoData>(getMockData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured() || !orgId) {
      console.log('[useDemoData] Using mock data (Supabase not configured or no orgId)');
      setData(getMockData());
      setIsLive(false);
      setLoading(false);
      return;
    }

    try {
      const liveData = await fetchDemoDataFromSupabase(orgId);
      if (liveData) {
        setData(liveData);
        setIsLive(true);
        console.log('[useDemoData] Using live Supabase data');
      } else {
        setData(getMockData());
        setIsLive(false);
        console.log('[useDemoData] Falling back to mock data');
      }
    } catch (e) {
      setError(e as Error);
      setData(getMockData());
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCustomer = useCallback((id: string) => {
    return data.customers.find(c => c.id === id);
  }, [data.customers]);

  return {
    data,
    loading,
    error,
    isLive,
    refetch: fetchData,
    getCustomer,
  };
}

export default useDemoData;
