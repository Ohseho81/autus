/**
 * AUTUS 소상공인 통합 대시보드 v2.0
 * ==================================
 * 
 * 완전 통합:
 * - 3개 업종 (교육/음식점/사우나)
 * - Ontology 시각화
 * - AI 에이전트 패널
 * - 실시간 스트림
 * - 헥사곤 Physics 맵
 * 
 * 벤치마킹:
 * - Palantir Foundry (Ontology)
 * - Tableau (시각화)
 * - Power BI (KPI 카드)
 * - Snowflake (자연어 쿼리)
 */

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';

// ============================================================
// 1. 상수 및 설정
// ============================================================

const API_BASE = 'http://localhost:8000';

const INDUSTRIES: Record<string, { 
  name: string; 
  emoji: string; 
  color: string;
  gradient: string;
  icon: string;
}> = {
  education: { 
    name: '교육서비스', 
    emoji: '🎓', 
    color: '#3b82f6',
    gradient: 'from-blue-500 to-indigo-600',
    icon: 'M12 14l9-5-9-5-9 5 9 5z'
  },
  restaurant: { 
    name: '음식점', 
    emoji: '🍽️', 
    color: '#ef4444',
    gradient: 'from-red-500 to-orange-500',
    icon: 'M3 3h18v18H3V3z'
  },
  sauna: { 
    name: '사우나', 
    emoji: '🧖', 
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-500',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10'
  },
};

const AGENTS: Record<string, { name: string; emoji: string; color: string }> = {
  analyzer: { name: '분석', emoji: '📊', color: '#3b82f6' },
  predictor: { name: '예측', emoji: '🔮', color: '#8b5cf6' },
  detector: { name: '탐지', emoji: '🔍', color: '#ef4444' },
  optimizer: { name: '최적화', emoji: '⚙️', color: '#10b981' },
  coach: { name: '코칭', emoji: '💬', color: '#f59e0b' },
};

const PHYSICS: Record<string, { name: string; color: string; angle: number }> = {
  FINANCIAL_HEALTH: { name: '재무건전성', color: '#3b82f6', angle: 0 },
  CAPITAL_RISK: { name: '자본위험', color: '#ef4444', angle: 60 },
  COMPLIANCE_IQ: { name: '규정준수', color: '#10b981', angle: 120 },
  CONTROL_ENV: { name: '통제환경', color: '#f59e0b', angle: 180 },
  REPUTATION: { name: '평판', color: '#8b5cf6', angle: 240 },
  STAKEHOLDER: { name: '이해관계자', color: '#ec4899', angle: 300 },
};

// ============================================================
// 2. 타입 정의
// ============================================================

interface KPI {
  id: string;
  label: string;
  value: number;
  unit?: string;
  format?: string;
  change?: number;
  icon: string;
}

interface ChartDataItem {
  day: string;
  value: number;
  target: number;
}

interface Alert {
  type: 'critical' | 'warning' | 'info';
  message: string;
}

interface AgentResult {
  insights: string[];
  recommendations: { action: string; impact: string }[];
}

interface QueryResult {
  answer: string;
  data: { label: string; value: number }[];
}

interface LiveEvent {
  id: number;
  type: string;
  time: string;
  message: string;
}

// ============================================================
// 3. 시뮬레이션 데이터 (API 대체)
// ============================================================

const simulateKPIs = (industry: string): { primary: KPI[] } => {
  const base: Record<string, { primary: KPI[] }> = {
    education: {
      primary: [
        { id: 'students', label: '재학생', value: 127 + Math.floor(Math.random() * 20), unit: '명', change: 8, icon: '👨‍🎓' },
        { id: 'revenue', label: '월 수강료', value: 31750000 + Math.floor(Math.random() * 2000000), format: 'currency', change: 12, icon: '💰' },
        { id: 'attendance', label: '출석률', value: 94.2 + Math.random() * 2, unit: '%', change: 2.1, icon: '✅' },
        { id: 'satisfaction', label: '만족도', value: 4.7 + Math.random() * 0.2, unit: '/5', change: 0.2, icon: '⭐' },
      ],
    },
    restaurant: {
      primary: [
        { id: 'sales', label: '오늘 매출', value: 2847000 + Math.floor(Math.random() * 500000), format: 'currency', change: 15, icon: '💰' },
        { id: 'orders', label: '주문', value: 89 + Math.floor(Math.random() * 20), unit: '건', change: 7, icon: '📝' },
        { id: 'avg', label: '객단가', value: 31989 + Math.floor(Math.random() * 5000), format: 'currency', change: 5, icon: '🧾' },
        { id: 'turnover', label: '회전율', value: 4.2 + Math.random() * 0.5, unit: '회', change: 0.3, icon: '🔄' },
      ],
    },
    sauna: {
      primary: [
        { id: 'revenue', label: '오늘 매출', value: 1523000 + Math.floor(Math.random() * 300000), format: 'currency', change: 9, icon: '💰' },
        { id: 'visitors', label: '이용객', value: 142 + Math.floor(Math.random() * 30), unit: '명', change: 11, icon: '👥' },
        { id: 'utilization', label: '가동률', value: 67.5 + Math.random() * 10, unit: '%', change: 3, icon: '📊' },
        { id: 'energy', label: '에너지비용', value: 890000 + Math.floor(Math.random() * 100000), format: 'currency', change: -5, icon: '⚡' },
      ],
    },
  };
  return base[industry] || base.restaurant;
};

const simulateChartData = (): ChartDataItem[] => {
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  return days.map((day) => ({
    day,
    value: (1000000 + Math.random() * 2000000),
    target: 2500000,
  }));
};

const simulateAlerts = (industry: string): Alert[] => {
  const alerts: Record<string, Alert[]> = {
    education: [
      { type: 'warning', message: '수학 심화반 정원 초과 임박 (19/20)' },
      { type: 'info', message: '3명 수강료 미납 (₩750,000)' },
    ],
    restaurant: [
      { type: 'critical', message: '삼겹살 재고 2일분 남음' },
      { type: 'warning', message: '카드 결제 오류 2건' },
    ],
    sauna: [
      { type: 'warning', message: '건식사우나 온도 센서 점검 필요' },
      { type: 'info', message: '전기료 전주 대비 12% 증가' },
    ],
  };
  return alerts[industry] || [];
};

// ============================================================
// 4. 컴포넌트: KPI 카드
// ============================================================

const KPICard = memo(({ kpi, color }: { kpi: KPI; color: string }) => {
  const formatValue = (val: number, format?: string): string => {
    if (format === 'currency') return `₩${Math.round(val).toLocaleString()}`;
    if (typeof val === 'number') return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return String(val);
  };
  
  const isPositive = (kpi.change || 0) >= 0;
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 backdrop-blur border border-slate-700/50 hover:border-slate-600 transition-all group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-400 text-sm">{kpi.label}</span>
        <span className="text-2xl group-hover:scale-110 transition-transform">{kpi.icon}</span>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">
          {formatValue(kpi.value, kpi.format)}
        </span>
        {kpi.unit && <span className="text-slate-400 text-sm">{kpi.unit}</span>}
      </div>
      
      {kpi.change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          <span>{isPositive ? '▲' : '▼'}</span>
          <span>{Math.abs(kpi.change)}%</span>
          <span className="text-slate-500">vs 지난주</span>
        </div>
      )}
      
      {/* 미니 스파크라인 */}
      <div className="mt-3 flex items-end gap-0.5 h-6">
        {[...Array(7)].map((_, i) => (
          <div 
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{ 
              height: `${30 + Math.random() * 70}%`,
              backgroundColor: color,
              opacity: 0.3 + (i / 7) * 0.7
            }}
          />
        ))}
      </div>
    </div>
  );
});

KPICard.displayName = 'KPICard';

// ============================================================
// 5. 컴포넌트: 바 차트
// ============================================================

const BarChart = memo(({ data, color, title }: { data: ChartDataItem[]; color: string; title: string }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 backdrop-blur border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col items-center flex-1 group">
            <div className="w-full flex flex-col items-center">
              <span className="text-xs text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                ₩{(item.value / 1000000).toFixed(1)}M
              </span>
              <div 
                className="w-full rounded-t transition-all group-hover:opacity-80"
                style={{ 
                  height: `${(item.value / maxValue) * 100}px`,
                  backgroundColor: color,
                  minHeight: '8px'
                }}
              />
            </div>
            <span className="text-xs text-slate-500 mt-2">{item.day}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 text-xs text-slate-400">
        <span>총 ₩{(data.reduce((a, b) => a + b.value, 0) / 1000000).toFixed(1)}M</span>
        <span>평균 ₩{(data.reduce((a, b) => a + b.value, 0) / data.length / 1000000).toFixed(2)}M/일</span>
      </div>
    </div>
  );
});

BarChart.displayName = 'BarChart';

// ============================================================
// 6. 컴포넌트: Physics 헥사곤
// ============================================================

const PhysicsHexagon = memo(({ industry }: { industry: string }) => {
  const [values] = useState(() => 
    Object.keys(PHYSICS).reduce((acc, key) => ({
      ...acc,
      [key]: 0.5 + Math.random() * 0.5
    }), {} as Record<string, number>)
  );
  
  const size = 120;
  const center = size;
  
  const getPoint = (angle: number, value: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    const r = (size - 20) * value;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad)
    };
  };
  
  const points = Object.entries(PHYSICS).map(([key, p]) => getPoint(p.angle, values[key]));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 backdrop-blur border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-2">🎯 Physics 상태</h3>
      
      <div className="flex justify-center">
        <svg width={size * 2} height={size * 2} className="overflow-visible">
          {/* 배경 육각형 */}
          {[1, 0.75, 0.5, 0.25].map((scale, i) => {
            const bgPoints = Object.values(PHYSICS).map(p => getPoint(p.angle, scale));
            const bgPath = bgPoints.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
            return (
              <path 
                key={i}
                d={bgPath}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
              />
            );
          })}
          
          {/* 축 라인 */}
          {Object.values(PHYSICS).map((p, i) => {
            const end = getPoint(p.angle, 1);
            return (
              <line 
                key={i}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="#334155"
                strokeWidth="1"
              />
            );
          })}
          
          {/* 값 영역 */}
          <path 
            d={pathD}
            fill={INDUSTRIES[industry]?.color || '#3b82f6'}
            fillOpacity="0.3"
            stroke={INDUSTRIES[industry]?.color || '#3b82f6'}
            strokeWidth="2"
          />
          
          {/* 점 */}
          {points.map((p, i) => (
            <circle 
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill={INDUSTRIES[industry]?.color || '#3b82f6'}
            />
          ))}
          
          {/* 라벨 */}
          {Object.entries(PHYSICS).map(([key, p], i) => {
            const labelPoint = getPoint(p.angle, 1.15);
            return (
              <text
                key={i}
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-slate-400"
              >
                {p.name}
              </text>
            );
          })}
        </svg>
      </div>
      
      {/* 범례 */}
      <div className="grid grid-cols-2 gap-1 mt-2">
        {Object.entries(PHYSICS).map(([key, p]) => (
          <div key={key} className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400">{p.name}</span>
            <span className="text-white ml-auto">{(values[key] * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
});

PhysicsHexagon.displayName = 'PhysicsHexagon';

// ============================================================
// 7. 컴포넌트: AI 에이전트 패널
// ============================================================

const AIAgentPanel = memo(({ industry }: { industry: string }) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleRun = async (agentType: string) => {
    setSelectedAgent(agentType);
    setLoading(true);
    
    // 시뮬레이션 결과
    await new Promise(r => setTimeout(r, 800));
    
    const results: Record<string, AgentResult> = {
      analyzer: {
        insights: ['매출이 전주 대비 12% 증가했습니다', '피크 시간은 12시~13시입니다'],
        recommendations: [{ action: '점심 인력 보강', impact: '대기 시간 -20%' }]
      },
      predictor: {
        insights: ['다음 주 매출 ₩18.5M 예상', '토요일 피크 예상'],
        recommendations: [{ action: '토요일 재고 확보', impact: '품절 방지' }]
      },
      detector: {
        insights: ['이상 거래 2건 감지', '패턴: 고액 현금 결제'],
        recommendations: [{ action: '거래 내역 검토', impact: '부정 방지' }]
      },
      optimizer: {
        insights: ['재고 최적화로 ₩500K/월 절감 가능'],
        recommendations: [{ action: 'EOQ 기반 주문', impact: '₩500K/월 절감' }]
      },
      coach: {
        insights: ['객단가가 업계 평균보다 높습니다', '고객 만족도 우수'],
        recommendations: [{ action: '프리미엄 메뉴 확대', impact: '매출 +15%' }]
      }
    };
    
    setResult(results[agentType]);
    setLoading(false);
  };
  
  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-4 backdrop-blur border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-4">🤖 AI 에이전트</h3>
      
      {/* 에이전트 버튼 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(AGENTS).map(([type, agent]) => (
          <button
            key={type}
            onClick={() => handleRun(type)}
            disabled={loading}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
              selectedAgent === type
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>{agent.emoji}</span>
            <span className="text-sm">{agent.name}</span>
          </button>
        ))}
      </div>
      
      {/* 결과 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="ml-2 text-slate-400">분석 중...</span>
        </div>
      )}
      
      {result && !loading && (
        <div className="space-y-3">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-blue-400 mb-2">💡 인사이트</div>
            {result.insights.map((insight, i) => (
              <div key={i} className="text-sm text-white mb-1">• {insight}</div>
            ))}
          </div>
          
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-green-400 mb-2">📌 추천</div>
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-white">{rec.action}</span>
                <span className="text-xs text-emerald-400">{rec.impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

AIAgentPanel.displayName = 'AIAgentPanel';

// ============================================================
// 8. 컴포넌트: 알림 패널
// ============================================================

const AlertPanel = memo(({ alerts }: { alerts: Alert[] }) => {
  const styles: Record<string, { bg: string; border: string; icon: string }> = {
    critical: { bg: 'bg-red-500/20', border: 'border-red-500/50', icon: '🔴' },
    warning: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: '🟡' },
    info: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: '🔵' },
  };
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 backdrop-blur border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-3">🔔 알림</h3>
      <div className="space-y-2">
        {alerts.map((alert, i) => {
          const style = styles[alert.type] || styles.info;
          return (
            <div key={i} className={`${style.bg} ${style.border} border rounded-lg p-3 flex items-start gap-2`}>
              <span>{style.icon}</span>
              <span className="text-sm text-slate-200">{alert.message}</span>
            </div>
          );
        })}
        {alerts.length === 0 && (
          <div className="text-center text-slate-500 py-4">
            알림이 없습니다
          </div>
        )}
      </div>
    </div>
  );
});

AlertPanel.displayName = 'AlertPanel';

// ============================================================
// 9. 컴포넌트: 자연어 쿼리
// ============================================================

const SmartQuery = memo(({ industry }: { industry: string }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  
  const suggestions: Record<string, string[]> = {
    education: ['이번 달 수강료 수입은?', '출석률 낮은 학생은?', '인기 강좌 순위'],
    restaurant: ['오늘 매출 상위 메뉴', '재고 부족 품목', '피크 시간대 분석'],
    sauna: ['시설별 가동률', '에너지 비용 추이', '예약 현황'],
  };
  
  const handleQuery = (q: string) => {
    setQuery(q);
    setResult({
      answer: `"${q}"에 대한 분석 결과입니다.`,
      data: [
        { label: '항목 1', value: Math.floor(Math.random() * 1000000) },
        { label: '항목 2', value: Math.floor(Math.random() * 500000) },
      ]
    });
  };
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 backdrop-blur border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-3">🔍 자연어 질의</h3>
      
      <div className="relative mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery(query)}
          placeholder="무엇이든 물어보세요..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => handleQuery(query)}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
        >
          검색
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {(suggestions[industry] || []).map((s, i) => (
          <button
            key={i}
            onClick={() => handleQuery(s)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs text-slate-300"
          >
            {s}
          </button>
        ))}
      </div>
      
      {result && (
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-white mb-2">{result.answer}</div>
          <div className="grid grid-cols-2 gap-2">
            {result.data.map((d, i) => (
              <div key={i} className="bg-slate-600/50 rounded p-2">
                <div className="text-xs text-slate-400">{d.label}</div>
                <div className="text-lg font-bold text-white">₩{d.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SmartQuery.displayName = 'SmartQuery';

// ============================================================
// 10. 컴포넌트: 실시간 피드
// ============================================================

const LiveFeed = memo(({ industry }: { industry: string }) => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const eventTypes = ['order', 'payment', 'alert'];
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      const newEvent: LiveEvent = {
        id: Date.now(),
        type,
        time: new Date().toLocaleTimeString('ko-KR'),
        message: type === 'order' ? `새 주문 ₩${(Math.random() * 100000 + 20000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` :
                 type === 'payment' ? `결제 완료 (카드)` :
                 `시스템 알림`
      };
      
      setEvents(prev => [newEvent, ...prev.slice(0, 9)]);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 backdrop-blur border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-3">⚡ 실시간</h3>
      <div ref={feedRef} className="space-y-2 max-h-48 overflow-y-auto">
        {events.map((event) => (
          <div 
            key={event.id}
            className="flex items-center gap-2 text-sm animate-pulse"
          >
            <span className="text-slate-500">{event.time}</span>
            <span className={
              event.type === 'order' ? 'text-green-400' :
              event.type === 'payment' ? 'text-blue-400' :
              'text-yellow-400'
            }>
              {event.message}
            </span>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center text-slate-500 py-4">
            대기 중...
          </div>
        )}
      </div>
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';

// ============================================================
// 11. 메인 대시보드
// ============================================================

export default function IntegratedDashboard() {
  const [industry, setIndustry] = useState('restaurant');
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const kpis = useMemo(() => simulateKPIs(industry), [industry, refreshKey]);
  const chartData = useMemo(() => simulateChartData(), [industry, refreshKey]);
  const alerts = useMemo(() => simulateAlerts(industry), [industry]);
  
  const currentIndustry = INDUSTRIES[industry];
  
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setRefreshKey(k => k + 1);
      setLoading(false);
    }, 500);
  }, []);
  
  return (
    <div className="min-h-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* 헤더 */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xl">
                A
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AUTUS 소상공인
                </h1>
                <p className="text-xs text-slate-400">Palantir 스타일 통합 대시보드</p>
              </div>
            </div>
            
            {/* 업종 선택 */}
            <div className="flex items-center gap-2">
              {Object.entries(INDUSTRIES).map(([key, ind]) => (
                <button
                  key={key}
                  onClick={() => setIndustry(key)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    industry === key 
                      ? `bg-gradient-to-r ${ind.gradient} text-white shadow-lg`
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{ind.emoji}</span>
                  <span className="hidden sm:inline">{ind.name}</span>
                </button>
              ))}
              
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all ml-2"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* 메인 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-6">
          {/* 1행: KPI */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span>{currentIndustry.emoji}</span>
              <span>주요 지표</span>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.primary.map((kpi) => (
                <KPICard key={kpi.id} kpi={kpi} color={currentIndustry.color} />
              ))}
            </div>
          </section>
          
          {/* 2행: 차트 + Physics + 피드 */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <BarChart 
              data={chartData} 
              color={currentIndustry.color}
              title="📈 주간 매출"
            />
            <PhysicsHexagon industry={industry} />
            <LiveFeed industry={industry} />
          </section>
          
          {/* 3행: AI + 쿼리 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AIAgentPanel industry={industry} />
            <SmartQuery industry={industry} />
          </section>
          
          {/* 4행: 알림 */}
          <section>
            <AlertPanel alerts={alerts} />
          </section>
        </div>
      </main>
      
      {/* 푸터 */}
      <footer className="bg-slate-900/50 border-t border-slate-800 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-slate-500">
            <div>AUTUS 소상공인 플랫폼 v2.0</div>
            <div className="flex items-center gap-4">
              <span>벤치마킹: Palantir · Tableau · Snowflake</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                실시간
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
