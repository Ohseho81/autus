/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTUS 2.0 API CLIENT - 11개 뷰 전용
 * TypeScript / React
 * View 컴포넌트와 호환되는 API 구조
 * ═══════════════════════════════════════════════════════════════════════════
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const DEFAULT_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type StatusLevel = 'green' | 'yellow' | 'red' | 'critical';
export type TemperatureZone = 'excellent' | 'good' | 'normal' | 'warning' | 'critical';
export type VoiceStage = '바람' | '불만' | '이탈징후' | '퇴원예고';
export type WeatherType = 'sunny' | 'cloudy' | 'partly_cloudy' | 'rainy' | 'storm';
export type MarketTrend = '밀물' | '썰물' | '정체' | '역류' | 'rising' | 'falling';
export type HeartbeatRhythm = 'normal' | 'elevated' | 'warning' | 'critical' | 'spike';

export interface Alert {
  id: string;
  level: string;
  title: string;
  time: string;
  description?: string;
  customerId?: string;
}

export interface Action {
  id: string;
  priority: number;
  title: string;
  context: string;
  assignee: string;
  studentId?: string;
  customerId?: string;
  aiRecommended?: boolean;
}

export interface CustomerBrief {
  id: string;
  name: string;
  temperature: number;
  zone: TemperatureZone;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CockpitData {
  status: { level: StatusLevel; label: string; updatedAt: string };
  internal: { 
    customerCount: number; 
    avgTemperature: number; 
    riskCount: number; 
    warningCount: number; 
    healthyCount: number;
    pendingConsultations: number;
    unresolvedVoices: number;
    pendingTasks: number;
  };
  external: { 
    sigma: number; 
    weatherForecast: string;
    weatherLabel: string; 
    threatCount: number; 
    opportunityCount: number;
    competitionScore: string;
    marketTrend: number;
    heartbeatAlert: boolean;
    heartbeatKeyword?: string;
  };
  alertSummary: { critical: number; warning: number; info: number };
  alerts: Alert[];
  actions: Action[];
}

export interface CustomerLocation { 
  id: string; 
  name: string; 
  lat: number; 
  lng: number; 
  temp: number; 
  zone: string;
}

export interface Competitor { 
  id: string; 
  name: string; 
  lat: number; 
  lng: number; 
  threat: string;
}

export interface WeatherDay { 
  date: string; 
  day: string; 
  weather: string; 
  sigma: number; 
  event?: string;
}

export interface Threat { 
  id: string; 
  name: string; 
  severity: string; 
  eta: number; 
  impact: number;
}

export interface Opportunity { 
  id: string; 
  name: string; 
  potential: string; 
  eta: number; 
  impact: number;
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
  recommended?: boolean;
}

export interface CustomerDetail {
  id: string; 
  name: string; 
  grade: string; 
  class: string; 
  tenure: number;
  executor: { name: string }; 
  payer: { name: string; phone: string };
  temperature: { 
    current: number; 
    zone: string; 
    trend: string; 
    trendValue: number;
  };
  churnPrediction: { 
    probability: number; 
    predictedDate?: string;
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
  voices: Array<{ 
    id: string; 
    stage: string; 
    content: string; 
    status: string;
  }>;
  recommendation: { 
    strategyName: string; 
    tips: string[]; 
    expectedEffect: { temperatureChange: number };
  };
}

export interface NetworkGraph {
  nodes: Array<{ id: string; name: string; temp: number; zone: string }>;
  edges: Array<{ from: string; to: string; type: string; strength: number }>;
}

export interface HeartbeatWord {
  word: string;
  count: number;
  trend: string;
}

export interface TideData {
  trend: string;
  change: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA (for development and fallback)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_COCKPIT: CockpitData = {
  status: { level: 'yellow', label: '주의 필요', updatedAt: new Date().toISOString() },
  internal: { customerCount: 132, avgTemperature: 68.5, riskCount: 3, warningCount: 8, healthyCount: 121, pendingConsultations: 5, unresolvedVoices: 2, pendingTasks: 7 },
  external: { sigma: 0.85, weatherForecast: 'storm', weatherLabel: '토요일 중간고사', threatCount: 2, opportunityCount: 1, competitionScore: '우위', marketTrend: -5.2, heartbeatAlert: true, heartbeatKeyword: '사교육비' },
  alertSummary: { critical: 2, warning: 5, info: 3 },
  alerts: [
    { id: 'a1', level: 'critical', title: '김민수 온도 38° 위험', time: '10분 전', description: '급격한 온도 하락 감지' },
    { id: 'a2', level: 'warning', title: 'D학원 프로모션 감지', time: '1시간 전', description: '경쟁사 마케팅 활동 감지' },
  ],
  actions: [
    { id: 'ac1', priority: 1, title: '김민수 학부모 상담', context: '온도 38°', assignee: '박강사', studentId: 'cust-001', aiRecommended: true },
    { id: 'ac2', priority: 2, title: 'D학원 대응 전략', context: '경쟁사 감지', assignee: '관리자', aiRecommended: false },
  ],
};

const MOCK_ALERTS = MOCK_COCKPIT.alerts;
const MOCK_ACTIONS = MOCK_COCKPIT.actions;

const MOCK_CUSTOMERS: CustomerLocation[] = [
  { id: 'c1', name: '김민수', lat: 37.5665, lng: 126.9780, temp: 38, zone: 'critical' },
  { id: 'c2', name: '이서연', lat: 37.5700, lng: 126.9820, temp: 72, zone: 'good' },
  { id: 'c3', name: '박지훈', lat: 37.5630, lng: 126.9750, temp: 45, zone: 'warning' },
  { id: 'c4', name: '최유진', lat: 37.5680, lng: 126.9850, temp: 85, zone: 'excellent' },
];

const MOCK_COMPETITORS: Competitor[] = [
  { id: 'cp1', name: 'D학원', lat: 37.5620, lng: 126.9700, threat: 'high' },
  { id: 'cp2', name: 'E학원', lat: 37.5720, lng: 126.9900, threat: 'medium' },
];

const MOCK_WEATHER: WeatherDay[] = [
  { date: '1/28', day: '화', weather: 'sunny', sigma: 0.95 },
  { date: '1/29', day: '수', weather: 'cloudy', sigma: 0.90 },
  { date: '1/30', day: '목', weather: 'cloudy', sigma: 0.85 },
  { date: '1/31', day: '금', weather: 'rainy', sigma: 0.75, event: '시험전날' },
  { date: '2/1', day: '토', weather: 'storm', sigma: 0.60, event: '중간고사' },
  { date: '2/2', day: '일', weather: 'cloudy', sigma: 0.80 },
  { date: '2/3', day: '월', weather: 'sunny', sigma: 0.95 },
];

const MOCK_THREATS: Threat[] = [
  { id: 't1', name: 'D학원 프로모션', severity: 'high', eta: 3, impact: -15 },
  { id: 't2', name: '중간고사 스트레스', severity: 'medium', eta: 5, impact: -10 },
];

const MOCK_OPPORTUNITIES: Opportunity[] = [
  { id: 'o1', name: 'C학원 강사 퇴사', potential: 'high', eta: 7, impact: 10 },
];

const MOCK_FUNNEL: FunnelStage[] = [
  { name: '인지', count: 500, rate: 100 },
  { name: '관심', count: 200, rate: 40 },
  { name: '체험', count: 80, rate: 16 },
  { name: '등록', count: 40, rate: 8 },
  { name: '3개월', count: 35, rate: 7 },
  { name: '6개월', count: 30, rate: 6 },
];

const MOCK_SCENARIOS: Scenario[] = [
  { id: 's1', name: '현상 유지', customers: 125, revenue: 5200, churn: 8, recommended: false },
  { id: 's2', name: '적극 방어', customers: 140, revenue: 5800, churn: 4, recommended: true },
  { id: 's3', name: '확장 공격', customers: 160, revenue: 6500, churn: 6, recommended: false },
];

const MOCK_STUDENT: CustomerDetail = {
  id: 'cust-001', name: '김민수', grade: '중2', class: 'A반', tenure: 8,
  executor: { name: '박강사' }, payer: { name: '김민수 어머니', phone: '010-1234-5678' },
  temperature: { current: 38, zone: 'critical', trend: 'declining', trendValue: -12 },
  churnPrediction: { probability: 0.42 },
  tsel: { trust: { score: 52 }, satisfaction: { score: 35 }, engagement: { score: 60 }, loyalty: { score: 25 } },
  sigma: { total: 0.70, factors: [{ name: '숙제 미제출', impact: -0.10 }, { name: '비용 Voice', impact: -0.15 }] },
  voices: [{ id: 'v1', stage: '바람', content: '학원비 부담이...', status: 'pending' }],
  recommendation: { strategyName: '가치 재인식 상담', tips: ['가격 대비 가치 강조'], expectedEffect: { temperatureChange: 15 } },
};

const MOCK_HEARTBEAT = {
  external: [{ word: '사교육비', count: 45, trend: 'rising' }, { word: '학원비', count: 32, trend: 'stable' }],
  internal: [{ word: '비용', count: 8, trend: 'rising' }, { word: '성적', count: 5, trend: 'stable' }],
  resonances: [{ external: '사교육비', internal: '비용', correlation: 0.85 }],
  hasResonance: true,
  resonanceAlert: '외부 "사교육비" ↔ 내부 "비용" 공명 감지',
};

const MOCK_NETWORK = {
  nodes: [
    { id: 'n1', name: '박지훈', temp: 85, zone: 'excellent' },
    { id: 'n2', name: '이서연', temp: 72, zone: 'good' },
    { id: 'n3', name: '김민수', temp: 38, zone: 'critical' },
    { id: 'n4', name: '최유진', temp: 82, zone: 'good' },
    { id: 'n5', name: '정하은', temp: 48, zone: 'warning' },
  ],
  edges: [
    { from: 'n1', to: 'n2', type: 'referral', strength: 0.8 },
    { from: 'n2', to: 'n4', type: 'friend', strength: 0.6 },
  ],
  influencers: [
    { id: 'i1', name: '박지훈 어머니', referrals: 5, temp: 85 },
    { id: 'i2', name: '최유진 어머니', referrals: 3, temp: 72 },
  ],
  clusters: [{ name: '북쪽 그룹', count: 4, avgTemp: 42 }],
  riskCluster: { name: '북쪽 그룹', count: 4, avgTemp: 42 },
};

const MOCK_TIDE = {
  market: { trend: '썰물', change: -5.2 },
  ours: { trend: '역류', change: 8.3 },
  competitors: [
    { name: 'D학원', trend: -3.1 },
    { name: 'E학원', trend: 1.2 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS (View Component Compatible)
// ═══════════════════════════════════════════════════════════════════════════

// 1. Cockpit API
export const cockpitApi = {
  getSummary: async (_orgId?: string) => {
    try {
      return await fetchAPI<CockpitData>(`/cockpit/summary?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_COCKPIT;
    }
  },
  getAlerts: async (_filter?: string, _limit?: number, _orgId?: string) => {
    try {
      const data = await fetchAPI<any>(`/cockpit/alerts?org_id=${_orgId || DEFAULT_ORG_ID}`);
      return { alerts: data.alerts || data };
    } catch {
      return { alerts: MOCK_ALERTS };
    }
  },
  getActions: async (_filter?: string, _limit?: number, _orgId?: string) => {
    try {
      const data = await fetchAPI<any>(`/cockpit/actions?org_id=${_orgId || DEFAULT_ORG_ID}`);
      return { actions: data.actions || data };
    } catch {
      return { actions: MOCK_ACTIONS };
    }
  },
};

// 2. Map API
export const mapApi = {
  getCustomers: async (_radius?: number, _orgId?: string) => {
    try {
      const data = await fetchAPI<any>(`/map/customers?org_id=${_orgId || DEFAULT_ORG_ID}`);
      return { customers: data.customers || data };
    } catch {
      return { customers: MOCK_CUSTOMERS };
    }
  },
  getCompetitors: async (_radius?: number, _orgId?: string) => {
    try {
      const data = await fetchAPI<any>(`/map/competitors?org_id=${_orgId || DEFAULT_ORG_ID}`);
      return { competitors: data.competitors || data };
    } catch {
      return { competitors: MOCK_COMPETITORS };
    }
  },
  getZones: async (_orgId?: string) => ({ zones: [] as any[] }),
  getMarket: async (_radius?: number, _orgId?: string) => ({ market: {} as any }),
};

// 3. Weather API
export const weatherApi = {
  getForecast: async (_orgId?: string) => {
    try {
      return await fetchAPI<WeatherDay[]>(`/weather/forecast?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_WEATHER;
    }
  },
};

// 4. Radar API
export const radarApi = {
  getThreats: async (_orgId?: string) => {
    try {
      return await fetchAPI<Threat[]>(`/radar/threats?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_THREATS;
    }
  },
  getOpportunities: async (_orgId?: string) => {
    try {
      return await fetchAPI<Opportunity[]>(`/radar/opportunities?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_OPPORTUNITIES;
    }
  },
};

// 5. Score API  
export const scoreApi = {
  getCompetitors: async (_orgId?: string) => {
    try {
      return await fetchAPI<any[]>(`/score/competitors?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return [
        { name: 'D학원', win: 1, lose: 2 },
        { name: 'E학원', win: 2, lose: 1 },
      ];
    }
  },
  getGoals: async (_orgId?: string) => {
    try {
      return await fetchAPI<any[]>(`/score/goals?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return [
        { name: '재원수', current: 132, target: 150, progress: 88 },
        { name: '이탈률', current: 5, target: 3, progress: 60 },
      ];
    }
  },
};

// 6. Tide API
export const tideApi = {
  getMarket: async (_orgId?: string) => {
    try {
      return await fetchAPI<TideData>(`/tide/market?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_TIDE.market;
    }
  },
  getInternal: async (_orgId?: string) => {
    try {
      return await fetchAPI<TideData>(`/tide/internal?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_TIDE.ours;
    }
  },
  getCompetitors: async (_orgId?: string) => {
    return MOCK_TIDE.competitors;
  },
};

// 7. Heartbeat API
export const heartbeatApi = {
  getExternal: async (_orgId?: string) => {
    try {
      return await fetchAPI<HeartbeatWord[]>(`/heartbeat/external?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_HEARTBEAT.external;
    }
  },
  getVoice: async (_orgId?: string) => {
    try {
      return await fetchAPI<HeartbeatWord[]>(`/heartbeat/voice?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_HEARTBEAT.internal;
    }
  },
  getResonance: async (_orgId?: string) => {
    try {
      return await fetchAPI<any>(`/heartbeat/resonance?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return {
        resonances: MOCK_HEARTBEAT.resonances,
        hasResonance: MOCK_HEARTBEAT.hasResonance,
        resonanceAlert: MOCK_HEARTBEAT.resonanceAlert,
      };
    }
  },
};

// 8. Microscope API
export const microscopeApi = {
  getCustomer: async (customerId?: string) => {
    try {
      return await fetchAPI<CustomerDetail>(`/microscope/${customerId || 'cust-001'}`);
    } catch {
      return MOCK_STUDENT;
    }
  },
  getTSEL: async (customerId?: string) => {
    try {
      const data = await fetchAPI<CustomerDetail>(`/microscope/${customerId || 'cust-001'}`);
      return data.tsel;
    } catch {
      return MOCK_STUDENT.tsel;
    }
  },
  getRecommend: async (customerId?: string) => {
    try {
      const data = await fetchAPI<CustomerDetail>(`/microscope/${customerId || 'cust-001'}`);
      return data.recommendation;
    } catch {
      return MOCK_STUDENT.recommendation;
    }
  },
};

// 9. Network API
export const networkApi = {
  getGraph: async (_orgId?: string) => {
    try {
      return await fetchAPI<NetworkGraph>(`/network/graph?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return { nodes: MOCK_NETWORK.nodes, edges: MOCK_NETWORK.edges };
    }
  },
  getInfluencers: async (_orgId?: string) => {
    try {
      return await fetchAPI<any[]>(`/network/influencers?org_id=${_orgId || DEFAULT_ORG_ID}`);
    } catch {
      return MOCK_NETWORK.influencers;
    }
  },
  getClusters: async (_orgId?: string) => {
    return MOCK_NETWORK.clusters;
  },
  getRisk: async (_orgId?: string) => {
    return MOCK_NETWORK.riskCluster;
  },
};

// 10. Funnel API
export const funnelApi = {
  getStages: async (_orgId?: string) => {
    try {
      const data = await fetchAPI<any>(`/funnel/stages?org_id=${_orgId || DEFAULT_ORG_ID}`);
      return { stages: data.stages || data, summary: { total: MOCK_FUNNEL[0].count, converted: MOCK_FUNNEL[5].count } };
    } catch {
      return { stages: MOCK_FUNNEL, summary: { total: 500, converted: 30 } };
    }
  },
  getConversion: async (_orgId?: string) => {
    return { rate: 6, trend: 'stable' };
  },
  getBenchmark: async (_orgId?: string) => {
    return { industry: 5, ourRank: 2 };
  },
};

// 11. Crystal API
export const crystalApi = {
  getCurrent: async (_orgId?: string) => {
    try {
      const scenarios = await fetchAPI<Scenario[]>(`/crystal/scenarios?org_id=${_orgId || DEFAULT_ORG_ID}`);
      return { scenarios, recommended: scenarios.find(s => s.recommended) };
    } catch {
      return { scenarios: MOCK_SCENARIOS, recommended: MOCK_SCENARIOS[1] };
    }
  },
  getScenarios: async (_orgId?: string) => {
    try {
      const data = await fetchAPI<any>(`/crystal/scenarios?org_id=${_orgId || DEFAULT_ORG_ID}`);
      return { scenarios: data.scenarios || data };
    } catch {
      return { scenarios: MOCK_SCENARIOS };
    }
  },
  getRecommend: async (_orgId?: string) => {
    return MOCK_SCENARIOS.find(s => s.recommended) || MOCK_SCENARIOS[0];
  },
  simulate: async (_scenarioId: string, _orgId?: string) => {
    await new Promise(r => setTimeout(r, 1000)); // simulate delay
    const scenario = MOCK_SCENARIOS.find(s => s.id === _scenarioId) || MOCK_SCENARIOS[0];
    return { 
      success: true, 
      result: scenario,
      projections: { month1: scenario.customers, month2: scenario.customers + 5, month3: scenario.customers + 10 }
    };
  },
  createPlan: async (_scenarioId: string, _orgId?: string) => {
    return { success: true, planId: `plan-${Date.now()}` };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY API OBJECT (for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════

export const viewsApi = {
  cockpit: {
    summary: (orgId: string) => cockpitApi.getSummary(orgId),
  },
  map: {
    customers: (orgId: string) => mapApi.getCustomers(undefined, orgId).then(r => r.customers),
    competitors: (orgId: string) => mapApi.getCompetitors(undefined, orgId).then(r => r.competitors),
  },
  weather: {
    forecast: (orgId: string, _days = 7) => weatherApi.getForecast(orgId),
  },
  radar: {
    threats: (orgId: string) => radarApi.getThreats(orgId),
    opportunities: (orgId: string) => radarApi.getOpportunities(orgId),
  },
  score: {
    competitors: (orgId: string) => scoreApi.getCompetitors(orgId),
    goals: (orgId: string) => scoreApi.getGoals(orgId),
  },
  tide: {
    market: (orgId: string) => tideApi.getMarket(orgId),
    internal: (orgId: string) => tideApi.getInternal(orgId),
  },
  heartbeat: {
    external: (orgId: string) => heartbeatApi.getExternal(orgId),
    voice: (orgId: string) => heartbeatApi.getVoice(orgId),
    resonance: (orgId: string) => heartbeatApi.getResonance(orgId),
  },
  microscope: {
    detail: (customerId: string) => microscopeApi.getCustomer(customerId),
  },
  network: {
    graph: (orgId: string) => networkApi.getGraph(orgId),
    influencers: (orgId: string) => networkApi.getInfluencers(orgId),
  },
  funnel: {
    stages: (orgId: string) => funnelApi.getStages(orgId).then(r => r.stages),
  },
  crystal: {
    scenarios: (orgId: string) => crystalApi.getScenarios(orgId).then(r => r.scenarios),
    simulate: (orgId: string, scenarioId: string) => crystalApi.simulate(scenarioId, orgId),
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export function useViewsAPI<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);
  
  return { data, loading, error, refetch: fetch };
}

// Convenience hooks
export const useCockpit = (orgId?: string) => 
  useViewsAPI(() => cockpitApi.getSummary(orgId), [orgId]);

export const useMapData = (orgId?: string) => 
  useViewsAPI(async () => ({ 
    ...(await mapApi.getCustomers(undefined, orgId)), 
    ...(await mapApi.getCompetitors(undefined, orgId)) 
  }), [orgId]);

export const useWeather = (orgId?: string) => 
  useViewsAPI(() => weatherApi.getForecast(orgId), [orgId]);

export const useRadar = (orgId?: string) => 
  useViewsAPI(async () => ({ 
    threats: await radarApi.getThreats(orgId), 
    opportunities: await radarApi.getOpportunities(orgId) 
  }), [orgId]);

export const useTide = (orgId?: string) => 
  useViewsAPI(async () => ({ 
    market: await tideApi.getMarket(orgId), 
    ours: await tideApi.getInternal(orgId) 
  }), [orgId]);

export const useHeartbeat = (orgId?: string) => 
  useViewsAPI(async () => ({ 
    external: await heartbeatApi.getExternal(orgId), 
    internal: await heartbeatApi.getVoice(orgId), 
    resonance: await heartbeatApi.getResonance(orgId) 
  }), [orgId]);

export const useMicroscope = (customerId?: string) => 
  useViewsAPI(() => microscopeApi.getCustomer(customerId), [customerId]);

export const useNetwork = (orgId?: string) => 
  useViewsAPI(() => networkApi.getGraph(orgId), [orgId]);

export const useFunnel = (orgId?: string) => 
  useViewsAPI(() => funnelApi.getStages(orgId), [orgId]);

export const useScenarios = (orgId?: string) => 
  useViewsAPI(() => crystalApi.getScenarios(orgId), [orgId]);

export default viewsApi;
