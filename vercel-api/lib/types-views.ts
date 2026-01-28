// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 11개 뷰 API 공통 타입
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// 공통 Enums
// ─────────────────────────────────────────────────────────────────────

export type StatusLevel = 'green' | 'yellow' | 'red';
export type AlertLevel = 'critical' | 'warning' | 'info';
export type TemperatureZone = 'critical' | 'warning' | 'normal' | 'good' | 'excellent';
export type ThreatLevel = 'high' | 'medium' | 'low';
export type Trend = 'improving' | 'stable' | 'declining';
export type MarketTrend = 'rising' | 'falling' | 'stable';
export type VoiceStage = 'request' | 'wish' | 'complaint' | 'churn_signal';
export type WeatherType = 'sunny' | 'cloudy' | 'partly_cloudy' | 'rainy' | 'storm';
export type HeartbeatRhythm = 'normal' | 'elevated' | 'spike' | 'critical';

// ─────────────────────────────────────────────────────────────────────
// 공통 스키마
// ─────────────────────────────────────────────────────────────────────

export interface CustomerBrief {
  id: string;
  name: string;
  temperature: number;
  temperatureZone: TemperatureZone;
  churnProbability: number;
}

export interface VoiceBrief {
  id: string;
  customerId: string;
  customerName: string;
  stage: VoiceStage;
  category: string;
  content: string;
  createdAt: string;
  daysUnresolved: number;
}

export interface ExternalEvent {
  id: string;
  name: string;
  category: string;
  type: 'threat' | 'opportunity' | 'neutral';
  date: string;
  sigmaImpact: number;
  description: string;
}

export interface Alert {
  id: string;
  level: AlertLevel;
  category: 'customer' | 'external' | 'voice' | 'task';
  title: string;
  description: string;
  relatedId?: string;
  createdAt: string;
}

export interface Threat {
  id: string;
  name: string;
  category: string;
  severity: AlertLevel | 'low';
  eta: number;
  etaDate: string;
  sigmaImpact: number;
  affectedCustomers: number;
  description: string;
  source?: string;
  detectedAt: string;
}

export interface Action {
  id: string;
  priority: number;
  priorityLevel: AlertLevel | 'low';
  title: string;
  context: string;
  category: 'consultation' | 'follow_up' | 'marketing' | 'defense';
  customerId?: string;
  customerName?: string;
  assignedTo?: string;
  assignedName?: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  aiRecommended: boolean;
  expectedEffect?: {
    temperatureChange: number;
    churnReduction: number;
  };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Cockpit Types
// ─────────────────────────────────────────────────────────────────────

export interface CockpitSummary {
  status: {
    level: StatusLevel;
    label: string;
    updatedAt: string;
  };
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
    weatherForecast: WeatherType;
    weatherLabel: string;
    threatCount: number;
    opportunityCount: number;
    competitionScore: string;
    marketTrend: number;
    heartbeatAlert: boolean;
    heartbeatKeyword: string;
  };
  alertSummary: {
    critical: number;
    warning: number;
    info: number;
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2. Map Types
// ─────────────────────────────────────────────────────────────────────

export interface MapCustomer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  temperature: number;
  temperatureZone: TemperatureZone;
  distanceMeters: number;
  nearestCompetitor?: string;
  nearestCompetitorDistance?: number;
}

export interface MapCompetitor {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  threatLevel: ThreatLevel;
  customerCount?: number;
  priceLevel?: ThreatLevel;
  recentActivity?: string;
  affectedCustomers: number;
}

export interface MapZone {
  id: string;
  type: 'threat' | 'opportunity' | 'neutral';
  name: string;
  description: string;
  polygon: number[][];
  customerCount: number;
  avgTemperature: number;
  suggestedAction?: string;
}

// ─────────────────────────────────────────────────────────────────────
// 3. Weather Types
// ─────────────────────────────────────────────────────────────────────

export interface WeatherDay {
  date: string;
  dayOfWeek: string;
  weather: WeatherType;
  sigma: number;
  sigmaChange: number;
  events: Array<{
    id: string;
    name: string;
    category: string;
    sigmaImpact: number;
  }>;
  affectedCount: number;
}

// ─────────────────────────────────────────────────────────────────────
// 4. Radar Types
// ─────────────────────────────────────────────────────────────────────

export interface Opportunity {
  id: string;
  name: string;
  category: string;
  potential: ThreatLevel;
  eta: number;
  sigmaImpact: number;
  potentialCustomers: number;
  description: string;
  suggestedAction?: string;
}

export interface Vulnerability {
  type: string;
  label: string;
  customerCount: number;
  riskLevel: ThreatLevel;
  customers: CustomerBrief[];
}

// ─────────────────────────────────────────────────────────────────────
// 5. Scoreboard Types
// ─────────────────────────────────────────────────────────────────────

export interface CompetitorComparison {
  competitor: {
    id: string;
    name: string;
  };
  metrics: Array<{
    metric: string;
    label: string;
    ourValue: number;
    theirValue: number;
    result: 'win' | 'lose' | 'tie';
    difference: number;
  }>;
  summary: {
    wins: number;
    losses: number;
    ties: number;
    overallResult: 'winning' | 'losing' | 'tied';
  };
}

export interface Goal {
  metric: string;
  label: string;
  current: number;
  target: number;
  progress: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  gap: number;
  trend: Trend;
}

// ─────────────────────────────────────────────────────────────────────
// 6. Tide Types
// ─────────────────────────────────────────────────────────────────────

export interface TideData {
  trend: MarketTrend;
  trendLabel: string;
  changePercent: number;
  data: Array<{
    date: string;
    value: number;
  }>;
  causes: Array<{
    factor: string;
    impact: number;
    isPositive?: boolean;
  }>;
}

// ─────────────────────────────────────────────────────────────────────
// 7. Heartbeat Types
// ─────────────────────────────────────────────────────────────────────

export interface HeartbeatData {
  rhythm: HeartbeatRhythm;
  rhythmLabel: string;
  timeline: Array<{
    timestamp: string;
    intensity: number;
  }>;
  keywords: Array<{
    keyword: string;
    count: number;
    trend: MarketTrend;
    sentiment: number;
  }>;
}

export interface Resonance {
  id: string;
  externalKeyword: string;
  internalKeyword: string;
  correlation: number;
  severity: AlertLevel | 'low';
  affectedCustomers: CustomerBrief[];
  suggestedAction?: string;
}

// ─────────────────────────────────────────────────────────────────────
// 8. Microscope Types
// ─────────────────────────────────────────────────────────────────────

export interface CustomerDetail {
  id: string;
  name: string;
  photo?: string;
  grade?: string;
  class?: string;
  tenure: number;
  stage: string;
  executor?: {
    id: string;
    name: string;
  };
  payer?: {
    id: string;
    name: string;
    phone?: string;
  };
}

export interface TSELScore {
  score: number;
  zone: TemperatureZone;
  factors: Array<{
    id: string;
    name: string;
    score: number;
    status: 'good' | 'neutral' | 'bad';
  }>;
}

export interface SigmaBreakdown {
  sigma: number;
  sigmaLabel: string;
  breakdown: {
    internal: {
      score: number;
      weight: number;
      factors: Array<{
        id: string;
        name: string;
        value: number;
        impact: number;
      }>;
    };
    voice: {
      score: number;
      weight: number;
      currentStage?: VoiceStage;
      recentVoices: number;
    };
    external: {
      score: number;
      weight: number;
      factors: Array<{
        id: string;
        name: string;
        impact: number;
      }>;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────
// 9. Network Types
// ─────────────────────────────────────────────────────────────────────

export interface NetworkNode {
  id: string;
  name: string;
  temperature: number;
  temperatureZone: TemperatureZone;
  referralCount: number;
  isInfluencer: boolean;
  size: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: 'referral' | 'family' | 'friend';
}

export interface Influencer {
  id: string;
  name: string;
  referralCount: number;
  temperature: number;
  temperatureZone: TemperatureZone;
  connectedCustomers: CustomerBrief[];
  riskLevel: ThreatLevel | 'critical';
  cascadeRisk: number;
}

export interface NetworkCluster {
  id: string;
  name: string;
  memberCount: number;
  avgTemperature: number;
  healthStatus: 'healthy' | 'at_risk' | 'critical';
  keyMembers: CustomerBrief[];
}

// ─────────────────────────────────────────────────────────────────────
// 10. Funnel Types
// ─────────────────────────────────────────────────────────────────────

export interface FunnelStage {
  id: string;
  name: string;
  count: number;
  percentage: number;
  conversionRate?: number;
  dropoffRate?: number;
}

export interface DropoffAnalysis {
  fromStage: string;
  toStage: string;
  dropoffRate: number;
  dropoffCount: number;
  reasons: Array<{
    reason: string;
    percentage: number;
    count: number;
  }>;
  droppedCustomers: CustomerBrief[];
  suggestedActions: Array<{
    action: string;
    expectedImprovement: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────
// 11. Crystal Types
// ─────────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'threat' | 'opportunity' | 'strategy';
  assumptions: Array<{
    variable: string;
    change: number;
  }>;
  prediction: {
    customerCount: number;
    revenue: number;
    churnRate: number;
  };
  roi: number;
  isRecommended: boolean;
  createdAt: string;
}

export interface SimulationResult {
  scenario: {
    id: string;
    name: string;
  };
  timeline: Array<{
    month: number;
    customerCount: number;
    revenue: number;
    churnRate: number;
  }>;
  finalState: {
    customerCount: number;
    customerChange: number;
    revenue: number;
    revenueChange: number;
  };
  investment: number;
  expectedReturn: number;
  roi: number;
  confidence: number;
}

export interface ExecutionPlan {
  scenarioId: string;
  scenarioName: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    suggestedAssignee?: string;
    dueDate?: string;
    expectedEffect?: Record<string, number>;
  }>;
  milestones: Array<{
    week: number;
    target: string;
    kpi: string;
  }>;
}
