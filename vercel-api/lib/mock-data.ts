// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - Mock 데이터 생성기
// ═══════════════════════════════════════════════════════════════════════════════

import { generateUUID as _generateUUID } from './api-utils';

// Re-export for convenience
export const generateUUID = _generateUUID;
import type {
  CustomerBrief,
  TemperatureZone,
  AlertLevel,
  VoiceStage,
  WeatherType,
  ThreatLevel,
  HeartbeatRhythm,
  MarketTrend,
  Alert,
  Action,
  Threat,
  MapCustomer,
  MapCompetitor,
  MapZone,
  WeatherDay,
  Opportunity,
  Vulnerability,
  Goal,
  NetworkNode,
  NetworkEdge,
  Influencer,
  NetworkCluster,
  FunnelStage,
  Scenario,
  VoiceBrief,
  Resonance,
} from './types-views';

// ─────────────────────────────────────────────────────────────────────
// 한국 이름 생성기
// ─────────────────────────────────────────────────────────────────────

const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
const FIRST_NAMES = ['민수', '서연', '지훈', '수빈', '예준', '지아', '도윤', '서준', '하윤', '시우'];

export function generateKoreanName(): string {
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  return `${lastName}${firstName}`;
}

// ─────────────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────────────

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getTemperatureZone(temp: number): TemperatureZone {
  if (temp < 30) return 'critical';
  if (temp < 50) return 'warning';
  if (temp < 70) return 'normal';
  if (temp < 85) return 'good';
  return 'excellent';
}

export function formatDate(daysFromNow: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

export function formatDateTime(): string {
  return new Date().toISOString();
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
export function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  return DAY_NAMES[date.getDay()];
}

// ─────────────────────────────────────────────────────────────────────
// Customer Mock
// ─────────────────────────────────────────────────────────────────────

export function generateCustomerBrief(): CustomerBrief {
  const temperature = randomInt(25, 95);
  return {
    id: generateUUID(),
    name: generateKoreanName(),
    temperature,
    temperatureZone: getTemperatureZone(temperature),
    churnProbability: temperature < 50 ? randomFloat(0.3, 0.7) : randomFloat(0.05, 0.25),
  };
}

export function generateCustomerBriefs(count: number): CustomerBrief[] {
  return Array.from({ length: count }, generateCustomerBrief);
}

// ─────────────────────────────────────────────────────────────────────
// Alert Mock
// ─────────────────────────────────────────────────────────────────────

const ALERT_TITLES = {
  critical: [
    '{name} 온도 {temp}° 위험',
    '긴급: {name} 이탈 신호 감지',
    '외부 위협: 경쟁사 프로모션 시작',
  ],
  warning: [
    '{name} 온도 하락 중',
    '미해결 Voice {count}건',
    '결제 지연: {name}',
  ],
  info: [
    '신규 등록: {name}',
    '상담 일정 알림',
    '주간 리포트 생성 완료',
  ],
};

export function generateAlert(level?: AlertLevel): Alert {
  const alertLevel = level || randomChoice<AlertLevel>(['critical', 'warning', 'info']);
  const customer = generateCustomerBrief();
  const titleTemplate = randomChoice(ALERT_TITLES[alertLevel]);
  
  return {
    id: generateUUID(),
    level: alertLevel,
    category: randomChoice(['customer', 'external', 'voice', 'task']),
    title: titleTemplate
      .replace('{name}', customer.name)
      .replace('{temp}', String(customer.temperature))
      .replace('{count}', String(randomInt(1, 5))),
    description: `상세 정보: ${customer.name}, 온도 ${customer.temperature}°, 이탈확률 ${(customer.churnProbability * 100).toFixed(0)}%`,
    relatedId: customer.id,
    createdAt: formatDateTime(),
  };
}

export function generateAlerts(count: number): Alert[] {
  return Array.from({ length: count }, () => generateAlert());
}

// ─────────────────────────────────────────────────────────────────────
// Action Mock
// ─────────────────────────────────────────────────────────────────────

const ACTION_TITLES = [
  '{name} 학부모 상담',
  '{name} 재등록 유도',
  '{name} 불만 해소',
  '{name} 성적 상담',
  '경쟁사 방어 마케팅',
];

export function generateAction(priority: number): Action {
  const customer = generateCustomerBrief();
  return {
    id: generateUUID(),
    priority,
    priorityLevel: priority <= 2 ? 'critical' : priority <= 5 ? 'warning' : 'info',
    title: randomChoice(ACTION_TITLES).replace('{name}', customer.name),
    context: `온도 ${customer.temperature}°, 비용 민감, 이탈확률 ${(customer.churnProbability * 100).toFixed(0)}%`,
    category: randomChoice(['consultation', 'follow_up', 'marketing', 'defense']),
    customerId: customer.id,
    customerName: customer.name,
    assignedTo: generateUUID(),
    assignedName: generateKoreanName(),
    dueDate: formatDate(randomInt(1, 7)),
    status: randomChoice(['pending', 'in_progress', 'completed']),
    aiRecommended: Math.random() > 0.3,
    expectedEffect: {
      temperatureChange: randomInt(5, 20),
      churnReduction: randomFloat(0.1, 0.3),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Map Mock
// ─────────────────────────────────────────────────────────────────────

const BASE_LAT = 37.5665;
const BASE_LNG = 126.978;

export function generateMapCustomer(): MapCustomer {
  const customer = generateCustomerBrief();
  const distance = randomInt(100, 3000);
  return {
    id: customer.id,
    name: customer.name,
    lat: BASE_LAT + randomFloat(-0.02, 0.02),
    lng: BASE_LNG + randomFloat(-0.02, 0.02),
    temperature: customer.temperature,
    temperatureZone: customer.temperatureZone,
    distanceMeters: distance,
    nearestCompetitor: `${randomChoice(['A', 'B', 'C', 'D', 'E'])}학원`,
    nearestCompetitorDistance: randomInt(50, 500),
  };
}

const COMPETITOR_NAMES = ['A학원', 'B학원', 'C학원', 'D학원', 'E영어학원', 'F수학학원'];

export function generateMapCompetitor(): MapCompetitor {
  return {
    id: generateUUID(),
    name: randomChoice(COMPETITOR_NAMES),
    lat: BASE_LAT + randomFloat(-0.015, 0.015),
    lng: BASE_LNG + randomFloat(-0.015, 0.015),
    distanceMeters: randomInt(200, 1500),
    threatLevel: randomChoice<ThreatLevel>(['high', 'medium', 'low']),
    customerCount: randomInt(50, 200),
    priceLevel: randomChoice<ThreatLevel>(['high', 'medium', 'low']),
    recentActivity: randomChoice(['프로모션 진행 중', '신규 오픈', '강사 영입', '없음']),
    affectedCustomers: randomInt(0, 15),
  };
}

export function generateMapZone(): MapZone {
  return {
    id: generateUUID(),
    type: randomChoice(['threat', 'opportunity', 'neutral']),
    name: `${randomChoice(['북쪽', '남쪽', '동쪽', '서쪽'])} ${randomChoice(['위험', '기회', '중립'])} 지역`,
    description: '고객 밀집 지역, 경쟁사 인접',
    polygon: [[BASE_LAT, BASE_LNG], [BASE_LAT + 0.01, BASE_LNG], [BASE_LAT + 0.01, BASE_LNG + 0.01]],
    customerCount: randomInt(5, 25),
    avgTemperature: randomInt(40, 80),
    suggestedAction: '방어 마케팅 필요',
  };
}

// ─────────────────────────────────────────────────────────────────────
// Weather Mock
// ─────────────────────────────────────────────────────────────────────

const EVENT_NAMES = ['중간고사', '기말고사', '방학 시작', '개학', '학부모 상담 주간', '경쟁사 프로모션'];

export function generateWeatherDay(daysFromNow: number): WeatherDay {
  const sigma = randomFloat(0.5, 1.0);
  const date = formatDate(daysFromNow);
  const hasEvent = Math.random() > 0.7;
  
  return {
    date,
    dayOfWeek: getDayOfWeek(date),
    weather: sigma > 0.85 ? 'sunny' : sigma > 0.7 ? 'partly_cloudy' : sigma > 0.55 ? 'cloudy' : sigma > 0.4 ? 'rainy' : 'storm',
    sigma,
    sigmaChange: randomFloat(-0.1, 0.1),
    events: hasEvent ? [{
      id: generateUUID(),
      name: randomChoice(EVENT_NAMES),
      category: 'exam',
      sigmaImpact: randomFloat(-0.2, 0.1),
    }] : [],
    affectedCount: hasEvent ? randomInt(10, 50) : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Radar Mock
// ─────────────────────────────────────────────────────────────────────

const THREAT_NAMES = ['D학원 프로모션', 'C학원 강사 영입', '신규 경쟁사 오픈', '교육 정책 변경', '경기 침체'];

export function generateThreat(): Threat {
  const eta = randomInt(1, 14);
  return {
    id: generateUUID(),
    name: randomChoice(THREAT_NAMES),
    category: randomChoice(['competition', 'market', 'policy', 'internal']),
    severity: randomChoice<AlertLevel | 'low'>(['critical', 'warning', 'info', 'low']),
    eta,
    etaDate: formatDate(eta),
    sigmaImpact: randomFloat(-0.2, -0.05),
    affectedCustomers: randomInt(3, 20),
    description: '경쟁사 할인 프로모션으로 인한 이탈 위험',
    source: '시장 모니터링',
    detectedAt: formatDateTime(),
  };
}

export function generateOpportunity(): Opportunity {
  return {
    id: generateUUID(),
    name: randomChoice(['C학원 강사 퇴사', '인근 학원 폐업', '신학기 특수', '교육열 상승']),
    category: 'competition',
    potential: randomChoice<ThreatLevel>(['high', 'medium', 'low']),
    eta: randomInt(1, 14),
    sigmaImpact: randomFloat(0.05, 0.2),
    potentialCustomers: randomInt(5, 30),
    description: '경쟁사 이탈 고객 유치 기회',
    suggestedAction: '적극적 마케팅 캠페인 실행',
  };
}

export function generateVulnerability(): Vulnerability {
  const customers = generateCustomerBriefs(randomInt(3, 10));
  return {
    type: randomChoice(['cost_sensitive', 'competitor_adjacent', 'grade_declining', 'engagement_low']),
    label: randomChoice(['비용 민감', '경쟁사 인접', '성적 하락', '참여도 저하']),
    customerCount: customers.length,
    riskLevel: randomChoice<ThreatLevel>(['high', 'medium', 'low']),
    customers,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Scoreboard Mock
// ─────────────────────────────────────────────────────────────────────

export function generateGoal(): Goal {
  const current = randomInt(80, 150);
  const target = randomInt(120, 180);
  const progress = Math.round((current / target) * 100);
  
  return {
    metric: randomChoice(['customerCount', 'revenue', 'avgTemperature', 'churnRate']),
    label: randomChoice(['재원수', '매출', '평균 온도', '이탈률']),
    current,
    target,
    progress,
    status: progress >= 100 ? 'achieved' : progress >= 80 ? 'on_track' : progress >= 60 ? 'at_risk' : 'behind',
    gap: target - current,
    trend: randomChoice<'improving' | 'stable' | 'declining'>(['improving', 'stable', 'declining']),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Heartbeat Mock
// ─────────────────────────────────────────────────────────────────────

const KEYWORDS = ['사교육비', '비용', '가격', '성적', '강사', '시간표', '숙제', '학원비'];

export function generateHeartbeatTimeline(hours: number = 24): Array<{ timestamp: string; intensity: number }> {
  const result = [];
  const now = new Date();
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
    result.push({
      timestamp,
      intensity: randomInt(20, 80) + (Math.random() > 0.9 ? randomInt(20, 40) : 0),
    });
  }
  
  return result;
}

export function generateKeywordStats() {
  return {
    keyword: randomChoice(KEYWORDS),
    count: randomInt(5, 50),
    trend: randomChoice<MarketTrend>(['rising', 'stable', 'falling']),
    sentiment: randomFloat(-1, 1),
  };
}

export function generateVoiceBrief(): VoiceBrief {
  const customer = generateCustomerBrief();
  return {
    id: generateUUID(),
    customerId: customer.id,
    customerName: customer.name,
    stage: randomChoice<VoiceStage>(['request', 'wish', 'complaint', 'churn_signal']),
    category: randomChoice(['비용', '강사', '시간', '성적']),
    content: '수업료가 너무 비싼 것 같아요.',
    createdAt: formatDateTime(),
    daysUnresolved: randomInt(0, 7),
  };
}

export function generateResonance(): Resonance {
  return {
    id: generateUUID(),
    externalKeyword: '사교육비',
    internalKeyword: '비용',
    correlation: randomFloat(0.6, 0.95),
    severity: randomChoice<AlertLevel | 'low'>(['critical', 'warning', 'info', 'low']),
    affectedCustomers: generateCustomerBriefs(randomInt(2, 8)),
    suggestedAction: '가치 재인식 상담 실시',
  };
}

// ─────────────────────────────────────────────────────────────────────
// Network Mock
// ─────────────────────────────────────────────────────────────────────

export function generateNetworkNode(): NetworkNode {
  const customer = generateCustomerBrief();
  const referralCount = randomInt(0, 8);
  
  return {
    id: customer.id,
    name: customer.name,
    temperature: customer.temperature,
    temperatureZone: customer.temperatureZone,
    referralCount,
    isInfluencer: referralCount >= 3,
    size: 10 + referralCount * 5,
  };
}

export function generateNetworkEdge(sourceId: string, targetId: string): NetworkEdge {
  return {
    source: sourceId,
    target: targetId,
    type: randomChoice(['referral', 'family', 'friend']),
  };
}

export function generateInfluencer(): Influencer {
  const customer = generateCustomerBrief();
  const referralCount = randomInt(3, 10);
  
  return {
    id: customer.id,
    name: customer.name,
    referralCount,
    temperature: customer.temperature,
    temperatureZone: customer.temperatureZone,
    connectedCustomers: generateCustomerBriefs(referralCount),
    riskLevel: customer.temperature < 40 ? 'critical' : customer.temperature < 60 ? 'high' : 'medium',
    cascadeRisk: referralCount,
  };
}

export function generateNetworkCluster(): NetworkCluster {
  const members = generateCustomerBriefs(randomInt(5, 15));
  const avgTemp = Math.round(members.reduce((sum, m) => sum + m.temperature, 0) / members.length);
  
  return {
    id: generateUUID(),
    name: `${randomChoice(['A', 'B', 'C', 'D'])}반 그룹`,
    memberCount: members.length,
    avgTemperature: avgTemp,
    healthStatus: avgTemp > 70 ? 'healthy' : avgTemp > 50 ? 'at_risk' : 'critical',
    keyMembers: members.slice(0, 3),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Funnel Mock
// ─────────────────────────────────────────────────────────────────────

const FUNNEL_STAGES = ['인지', '관심', '체험', '등록', '3개월', '6개월', '1년+'];

export function generateFunnelStages(): FunnelStage[] {
  let count = 500;
  
  return FUNNEL_STAGES.map((name, index) => {
    const prevCount = count;
    count = Math.round(count * randomFloat(0.6, 0.9));
    
    return {
      id: `stage_${index}`,
      name,
      count,
      percentage: Math.round((count / 500) * 100),
      conversionRate: index > 0 ? Math.round((count / prevCount) * 100) : undefined,
      dropoffRate: index > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : undefined,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// Crystal Mock
// ─────────────────────────────────────────────────────────────────────

export function generateScenario(): Scenario {
  return {
    id: generateUUID(),
    name: randomChoice(['적극 방어', '현상 유지', '공격적 확장', '비용 절감']),
    description: '경쟁사 프로모션에 대응하는 방어 전략',
    type: randomChoice(['threat', 'opportunity', 'strategy']),
    assumptions: [
      { variable: 'sigma', change: randomFloat(-0.15, 0.15) },
      { variable: 'churnRate', change: randomFloat(-0.1, 0.1) },
    ],
    prediction: {
      customerCount: randomInt(120, 160),
      revenue: randomInt(30000000, 50000000),
      churnRate: randomFloat(0.03, 0.12),
    },
    roi: randomFloat(1.5, 4.0),
    isRecommended: Math.random() > 0.7,
    createdAt: formatDateTime(),
  };
}
