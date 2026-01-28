/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Owner Cockpit
 * 👑 오너용 전략적 명령 센터
 * autus-ai.com API 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleContext } from '../../../contexts/RoleContext';
import { useBreakpoint } from '../../../hooks/useResponsive';
import { useReducedMotion, useAccessibleTabs } from '../../../hooks/useAccessibility';
import { useAcademyData } from '../../../hooks/useAcademyData';
import { TrafficLight, StatusBadge } from '../../shared/StatusIndicator';
import { TemperatureDisplay } from '../../shared/TemperatureDisplay';
import { ResponsiveCard, CardGrid } from '../../shared/RoleBasedLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface InternalGauges {
  temperature: { average: number; distribution: Record<string, number> };
  students: { current: number; target: number; change: number };
  revenue: { current: number; target: number; change: number };
  goalAchievement: number;
}

interface ExternalGauges {
  weather: { tomorrow: string; sigma: number };
  threats: { count: number; critical: number };
  competitionRank: number;
  tideDirection: 'rising' | 'falling' | 'stable';
}

interface OverallStatus {
  overall: 'good' | 'caution' | 'warning' | 'critical';
  assessment: string;
}

interface PendingDecision {
  id: string;
  title: string;
  description: string;
  options: { id: string; label: string; recommended: boolean }[];
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  requester: string;
}

interface Alert {
  id: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  date: string;
  type: 'meeting' | 'deadline' | 'event' | 'weather';
  hasWarning: boolean;
}

interface OwnerDashboardData {
  internal: InternalGauges;
  external: ExternalGauges;
  status: OverallStatus;
  decisions: PendingDecision[];
  alerts: Alert[];
  schedule: ScheduleItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockData: OwnerDashboardData = {
  internal: {
    temperature: { 
      average: 65, 
      distribution: { good: 45, normal: 35, warning: 15, danger: 5 } 
    },
    students: { current: 132, target: 150, change: 5 },
    revenue: { current: 4200, target: 5000, change: 8.5 },
    goalAchievement: 84,
  },
  external: {
    weather: { tomorrow: '폭풍 예보', sigma: 2.3 },
    threats: { count: 2, critical: 1 },
    competitionRank: 3,
    tideDirection: 'rising',
  },
  status: {
    overall: 'caution',
    assessment: '안정적이나 위협 접근 중',
  },
  decisions: [
    {
      id: '1',
      title: 'D학원 대응 전략 승인',
      description: '경쟁학원 확장에 대한 방어 전략',
      options: [
        { id: 'a', label: '적극 대응', recommended: true },
        { id: 'b', label: '관망', recommended: false },
        { id: 'c', label: '차별화 강화', recommended: false },
      ],
      priority: 'high',
      deadline: '2026-01-30',
      requester: '관리자',
    },
    {
      id: '2',
      title: '마케팅 예산 200만원 승인',
      description: '1월 신규 등록 캠페인',
      options: [
        { id: 'a', label: '승인', recommended: true },
        { id: 'b', label: '축소 승인 (150만)', recommended: false },
        { id: 'c', label: '보류', recommended: false },
      ],
      priority: 'medium',
      requester: '마케팅팀',
    },
    {
      id: '3',
      title: '강사 충원 검토',
      description: '수학 과목 강사 1명 추가 채용',
      options: [
        { id: 'a', label: '채용 진행', recommended: false },
        { id: 'b', label: '파트타임 우선', recommended: true },
        { id: 'c', label: '보류', recommended: false },
      ],
      priority: 'low',
      requester: '인사팀',
    },
  ],
  alerts: [
    { id: '1', message: '토요일 폭풍 예보 - 수업 조정 필요', severity: 'critical', timestamp: '10분 전' },
    { id: '2', message: 'D학원 할인 이벤트 시작', severity: 'warning', timestamp: '1시간 전' },
    { id: '3', message: '미승인 결재 3건', severity: 'info', timestamp: '2시간 전' },
  ],
  schedule: [
    { id: '1', title: '월례 회의', date: '01/28', type: 'meeting', hasWarning: false },
    { id: '2', title: '결산 마감', date: '01/31', type: 'deadline', hasWarning: false },
    { id: '3', title: '토요일 수업', date: '02/01', type: 'event', hasWarning: true },
    { id: '4', title: '설날 연휴', date: '02/10', type: 'event', hasWarning: false },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OwnerCockpit() {
  const { theme } = useRoleContext();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const [alertExpanded, setAlertExpanded] = useState(false);

  // autus-ai.com API 연동
  const orgId = 'demo-org'; // TODO: 실제 org_id로 변경
  const { 
    dashboard, 
    students, 
    risks, 
    goals, 
    averageTemperature,
    atRiskCount,
    loading, 
    error,
    refresh 
  } = useAcademyData({ orgId, autoFetch: true, refreshInterval: 60000 });

  // API 데이터를 컴포넌트 형식으로 변환
  const data = useMemo<OwnerDashboardData>(() => {
    if (!dashboard) return mockData;
    
    return {
      internal: {
        temperature: { 
          average: averageTemperature, 
          distribution: { good: 45, normal: 35, warning: 15, danger: 5 } 
        },
        students: { 
          current: dashboard.totalStudents || mockData.internal.students.current, 
          target: 150, 
          change: 5 
        },
        revenue: { 
          current: dashboard.revenue || mockData.internal.revenue.current, 
          target: dashboard.revenueTarget || 5000, 
          change: 8.5 
        },
        goalAchievement: goals.length > 0 
          ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
          : mockData.internal.goalAchievement,
      },
      external: {
        weather: mockData.external.weather,
        threats: { count: atRiskCount, critical: risks.filter(r => r.priority === 'CRITICAL').length },
        competitionRank: mockData.external.competitionRank,
        tideDirection: mockData.external.tideDirection,
      },
      status: {
        overall: atRiskCount > 5 ? 'warning' : atRiskCount > 2 ? 'caution' : 'good',
        assessment: atRiskCount > 5 
          ? '주의가 필요한 상황입니다' 
          : atRiskCount > 2 
            ? '안정적이나 위협 접근 중'
            : '안정적인 상태입니다',
      },
      decisions: mockData.decisions,
      alerts: risks.slice(0, 3).map((risk, idx) => ({
        id: risk.id,
        message: `${risk.targetName}: ${risk.factors[0] || '주의 필요'}`,
        severity: risk.priority === 'CRITICAL' ? 'critical' : 'warning',
        timestamp: new Date(risk.createdAt).toLocaleString('ko-KR'),
      })),
      schedule: mockData.schedule,
    };
  }, [dashboard, students, risks, goals, averageTemperature, atRiskCount]);

  // Current date/time
  const now = new Date();
  const greeting = now.getHours() < 12 ? '좋은 아침입니다' : now.getHours() < 18 ? '안녕하세요' : '수고하셨습니다';

  return (
    <div 
      className={`
        min-h-screen
        ${theme.mode === 'dark' ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950' : ''}
      `}
      style={{
        background: theme.mode === 'dark' 
          ? 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)' 
          : undefined,
      }}
    >
      {/* Header */}
      <header className="px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-medium opacity-80">
            👑 대표님, {greeting}
          </h1>
          <p className="text-sm opacity-50">
            {now.toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}
          </p>
        </div>
        <button
          className="p-3 rounded-xl hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px]"
          aria-label="설정"
        >
          ⚙️
        </button>
      </header>

      {/* Alert Banner */}
      <AlertBanner 
        alerts={data.alerts} 
        expanded={alertExpanded}
        onToggle={() => setAlertExpanded(!alertExpanded)}
      />

      {/* Main Content */}
      <main className="px-4 md:px-6 lg:px-8 py-4 space-y-6">
        {/* Gauges Section */}
        <GaugesSection 
          internal={data.internal}
          external={data.external}
          status={data.status}
        />

        {/* Metrics & Decisions */}
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <KeyMetricsPanel internal={data.internal} />
          <DecisionQueue decisions={data.decisions} />
        </div>

        {/* Schedule Bar */}
        <ScheduleBar schedule={data.schedule} />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Alert Banner Component
// ─────────────────────────────────────────────────────────────────────────────

function AlertBanner({ 
  alerts, 
  expanded, 
  onToggle 
}: { 
  alerts: Alert[]; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');

  if (criticalAlerts.length === 0) return null;

  return (
    <div 
      className="mx-4 md:mx-6 lg:mx-8 rounded-xl overflow-hidden"
      role="alert"
      aria-live="polite"
    >
      <button
        onClick={onToggle}
        className={`
          w-full px-4 py-3 flex items-center gap-3
          ${criticalAlerts[0].severity === 'critical' 
            ? 'bg-red-500/20 border border-red-500/30 text-red-400' 
            : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
          }
          hover:opacity-90 transition-opacity
          min-h-[48px]
        `}
        aria-expanded={expanded}
      >
        <span className="text-xl animate-pulse">
          {criticalAlerts[0].severity === 'critical' ? '🚨' : '⚠️'}
        </span>
        <span className="flex-1 text-left font-medium truncate">
          {criticalAlerts[0].message}
        </span>
        {criticalAlerts.length > 1 && (
          <span className="text-xs opacity-70">
            +{criticalAlerts.length - 1}건
          </span>
        )}
        <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            className="bg-white/5 border-t border-white/10"
          >
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-0"
              >
                <span>
                  {alert.severity === 'critical' && '🔴'}
                  {alert.severity === 'warning' && '🟠'}
                  {alert.severity === 'info' && '🔵'}
                </span>
                <span className="flex-1">{alert.message}</span>
                <span className="text-xs opacity-50">{alert.timestamp}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauges Section
// ─────────────────────────────────────────────────────────────────────────────

function GaugesSection({
  internal,
  external,
  status,
}: {
  internal: InternalGauges;
  external: ExternalGauges;
  status: OverallStatus;
}) {
  const { isMobile, isTablet } = useBreakpoint();
  const { theme } = useRoleContext();

  return (
    <div 
      className={`
        grid gap-4
        ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}
      `}
    >
      {/* Internal Gauges */}
      <ResponsiveCard padding="md" className="space-y-4">
        <h2 className="text-sm font-medium opacity-70 flex items-center gap-2">
          🔨 내부 지표
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <GaugeItem 
            icon="🌡️" 
            label="평균 온도" 
            value={`${internal.temperature.average}°`}
            subValue={`양호 ${internal.temperature.distribution.good}%`}
          />
          <GaugeItem 
            icon="📈" 
            label="재원생" 
            value={`${internal.students.current}명`}
            subValue={`목표의 ${Math.round(internal.students.current / internal.students.target * 100)}%`}
            trend={internal.students.change}
          />
          <GaugeItem 
            icon="💰" 
            label="매출" 
            value={`${internal.revenue.current}만`}
            subValue={`목표의 ${Math.round(internal.revenue.current / internal.revenue.target * 100)}%`}
            trend={internal.revenue.change}
          />
          <GaugeItem 
            icon="🎯" 
            label="목표 달성" 
            value={`${internal.goalAchievement}%`}
            subValue="전체 목표"
          />
        </div>
      </ResponsiveCard>

      {/* Status Light */}
      <ResponsiveCard padding="md" className="flex flex-col items-center justify-center">
        <TrafficLight 
          status={status.overall === 'good' ? 'good' : status.overall === 'caution' ? 'caution' : 'warning'}
          size="lg"
        />
        <p className="mt-4 text-center font-medium">{status.assessment}</p>
        <button
          className="mt-3 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm min-h-[44px]"
          aria-label="상세 분석 보기"
        >
          상세 분석 →
        </button>
      </ResponsiveCard>

      {/* External Gauges */}
      <ResponsiveCard padding="md" className="space-y-4">
        <h2 className="text-sm font-medium opacity-70 flex items-center gap-2">
          🌍 외부 환경
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <GaugeItem 
            icon="🌤️" 
            label="내일 날씨" 
            value={external.weather.tomorrow}
            subValue={`σ ${external.weather.sigma}`}
            warning={external.weather.sigma > 2}
          />
          <GaugeItem 
            icon="📡" 
            label="위협" 
            value={`${external.threats.count}건`}
            subValue={external.threats.critical > 0 ? `긴급 ${external.threats.critical}건` : '모니터링'}
            warning={external.threats.critical > 0}
          />
          <GaugeItem 
            icon="🏆" 
            label="경쟁 순위" 
            value={`#${external.competitionRank}`}
            subValue="지역 내"
          />
          <GaugeItem 
            icon="🌊" 
            label="시장 조류" 
            value={external.tideDirection === 'rising' ? '상승' : external.tideDirection === 'falling' ? '하락' : '안정'}
            subValue={external.tideDirection === 'rising' ? '↑' : external.tideDirection === 'falling' ? '↓' : '→'}
          />
        </div>
      </ResponsiveCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauge Item
// ─────────────────────────────────────────────────────────────────────────────

function GaugeItem({
  icon,
  label,
  value,
  subValue,
  trend,
  warning,
}: {
  icon: string;
  label: string;
  value: string;
  subValue: string;
  trend?: number;
  warning?: boolean;
}) {
  return (
    <div 
      className={`
        p-3 rounded-xl
        ${warning ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs opacity-60">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold">{value}</span>
        {trend !== undefined && (
          <span className={`text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <span className="text-xs opacity-50">{subValue}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Metrics Panel
// ─────────────────────────────────────────────────────────────────────────────

function KeyMetricsPanel({ internal }: { internal: InternalGauges }) {
  const metrics = [
    { 
      label: '재원', 
      current: internal.students.current, 
      target: internal.students.target, 
      unit: '명',
      icon: '👥'
    },
    { 
      label: '매출', 
      current: internal.revenue.current, 
      target: internal.revenue.target, 
      unit: '만원',
      icon: '💰'
    },
    { 
      label: '이익률', 
      current: 32, 
      target: 35, 
      unit: '%',
      icon: '📈'
    },
    { 
      label: '점유율', 
      current: 8.8, 
      target: 10, 
      unit: '%',
      icon: '🥧'
    },
  ];

  return (
    <ResponsiveCard padding="md" className="space-y-4">
      <h2 className="text-sm font-medium opacity-70">📊 핵심 지표</h2>
      <div className="space-y-3">
        {metrics.map((metric) => {
          const percentage = Math.round(metric.current / metric.target * 100);
          return (
            <div key={metric.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{metric.icon}</span>
                  {metric.label}
                </span>
                <span>
                  <strong>{metric.current}</strong>
                  <span className="opacity-50">/{metric.target}{metric.unit}</span>
                  <span className="ml-2 text-xs opacity-50">({percentage}%)</span>
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    percentage >= 90 ? 'bg-emerald-500' :
                    percentage >= 70 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, percentage)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision Queue
// ─────────────────────────────────────────────────────────────────────────────

function DecisionQueue({ decisions }: { decisions: PendingDecision[] }) {
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);

  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-slate-500',
  };

  return (
    <ResponsiveCard padding="md" className="space-y-4">
      <h2 className="text-sm font-medium opacity-70 flex items-center justify-between">
        <span>📋 결재 대기</span>
        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
          {decisions.length}건
        </span>
      </h2>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {decisions.map((decision) => (
          <div
            key={decision.id}
            className={`
              p-3 rounded-lg bg-white/5 border-l-4 ${priorityColors[decision.priority]}
              hover:bg-white/10 transition-colors cursor-pointer
            `}
            onClick={() => setSelectedDecision(selectedDecision === decision.id ? null : decision.id)}
            role="button"
            aria-expanded={selectedDecision === decision.id}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-medium">{decision.title}</h3>
                <p className="text-xs opacity-50 mt-0.5">{decision.requester}</p>
              </div>
              {decision.deadline && (
                <span className="text-xs opacity-50 whitespace-nowrap">
                  ~{decision.deadline.slice(5)}
                </span>
              )}
            </div>

            {/* Expanded Options */}
            <AnimatePresence>
              {selectedDecision === decision.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 pt-3 border-t border-white/10 space-y-2"
                >
                  <p className="text-sm opacity-70">{decision.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {decision.options.map((option) => (
                      <button
                        key={option.id}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-medium
                          ${option.recommended 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-white/5 hover:bg-white/10'
                          }
                          min-h-[44px] flex items-center gap-1
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle decision
                        }}
                      >
                        {option.recommended && <span>⭐</span>}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Bar
// ─────────────────────────────────────────────────────────────────────────────

function ScheduleBar({ schedule }: { schedule: ScheduleItem[] }) {
  const typeIcons = {
    meeting: '👥',
    deadline: '⏰',
    event: '📅',
    weather: '🌤️',
  };

  return (
    <ResponsiveCard padding="sm" className="overflow-hidden">
      <h2 className="text-sm font-medium opacity-70 px-2 mb-3">📅 이번 주 일정</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {schedule.map((item) => (
          <div
            key={item.id}
            className={`
              flex-shrink-0 px-4 py-3 rounded-lg min-w-[120px]
              ${item.hasWarning 
                ? 'bg-amber-500/20 border border-amber-500/30' 
                : 'bg-white/5'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span>{typeIcons[item.type]}</span>
              {item.hasWarning && <span className="text-amber-400">⚠️</span>}
            </div>
            <p className="font-medium mt-1 text-sm">{item.title}</p>
            <p className="text-xs opacity-50">{item.date}</p>
          </div>
        ))}
      </div>
    </ResponsiveCard>
  );
}

export default OwnerCockpit;
