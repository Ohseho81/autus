/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72³ Laplacian Simulator
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * X(t+1) = f(X(t), U(t), θ)
 * 
 * 학원 도메인 시뮬레이터
 * - 6가지 시나리오 비교
 * - 실시간 상태 예측
 * - 이벤트 감지 (CRITICAL, WARNING)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 파라미터 (학습 가능)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PARAMS = {
  loyaltyDecay: 0.02,        // 충성도 자연 감소
  retentionDecay: 0.01,      // 강사 근속 자연 감소
  baseChurn: 0.03,           // 기본 이탈률
  baseNewRate: 0.05,         // 기본 신규 유입률
  feeRate: 0.025,            // 결제 수수료율
  cacBase: 45000,            // 기본 CAC
  referralRate: 0.02,        // 추천율
  loyaltyWarning: 0.70,      // 충성도 경고 임계값
  loyaltyCritical: 0.60,     // 충성도 위험 임계값
  dependencyWarning: 0.40,   // 의존도 경고 임계값
  dependencyCritical: 0.55,  // 의존도 위험 임계값
};

// ═══════════════════════════════════════════════════════════════════════════════
// 상태 업데이트 함수 (차분 방정식)
// ═══════════════════════════════════════════════════════════════════════════════

interface State {
  cash: number;
  income: number;
  expense: number;
  customers: number;
  teachers: number;
  loyalty: number;
  retention: number;
  dependency: number;
  competition: number;
  referral: number;
  cac: number;
  avgRevenue?: number;
  month?: number;
}

interface Action {
  teacherSalary?: number;
  marketing?: number;
  service?: number;
  hireTeacher?: number;
}

interface Params {
  loyaltyDecay: number;
  retentionDecay: number;
  baseChurn: number;
  baseNewRate: number;
  feeRate: number;
  cacBase: number;
  referralRate: number;
  loyaltyWarning: number;
  loyaltyCritical: number;
  dependencyWarning: number;
  dependencyCritical: number;
}

interface SimEvent {
  t: number;
  type: 'CRITICAL' | 'WARNING';
  desc: string;
}

const updateState = (prev: State, action: Action, t: number, params: Params): State => {
  const s = { ...prev };
  const p = params;
  
  // 고객 동학
  const loyalty = s.loyalty;
  const competition = s.competition;
  const churnRate = p.baseChurn * (1 + (0.8 - loyalty) * 2) * (1 + competition);
  const churn = s.customers * churnRate;
  const referralNew = s.customers * s.referral * p.referralRate;
  const organicNew = s.customers * p.baseNewRate * (1 - competition * 0.5);
  const marketingBoost = (action.marketing || 0) * 0.03;
  const newCustomers = referralNew + organicNew + s.customers * marketingBoost;
  s.customers = Math.max(0, s.customers + newCustomers - churn);
  
  // 충성도 동학
  const deltaLoyalty = 
    -p.loyaltyDecay 
    - competition * 0.02 
    - s.dependency * 0.01 
    + (s.retention - 0.7) * 0.02 
    + (action.service || 0) * 0.03 
    + (action.teacherSalary || 0) * 0.02;
  s.loyalty = Math.max(0, Math.min(1, s.loyalty + deltaLoyalty));
  
  // 강사 동학
  s.retention = Math.max(0, Math.min(1, s.retention - p.retentionDecay + (action.teacherSalary || 0) * 0.05));
  s.dependency = Math.max(0, Math.min(1, s.dependency + 0.005 - (action.hireTeacher || 0) * 0.05));
  
  // 재무 동학
  if (!s.avgRevenue) s.avgRevenue = prev.income / Math.max(1, prev.customers);
  s.income = s.customers * s.avgRevenue;
  s.expense = prev.expense 
    + (action.teacherSalary || 0) * prev.expense * 0.05 
    + (action.marketing || 0) * 2000000 
    + (action.hireTeacher || 0) * 3000000;
  s.cash = s.cash + s.income * (1 - p.feeRate) - s.expense;
  
  // 경쟁 동학
  if (t === 1) s.competition = s.competition + 0.05;
  s.competition = Math.max(0, Math.min(1, s.competition * 0.98 + 0.002));
  
  // 추천율
  s.referral = 0.2 + s.loyalty * 0.3;
  
  return s;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 시뮬레이션 함수
// ═══════════════════════════════════════════════════════════════════════════════

const simulate = (
  initial: State, 
  T: number, 
  actions: Record<number, Action>, 
  params: Params
): { trajectory: State[]; events: SimEvent[] } => {
  const trajectory: State[] = [{ ...initial, month: 0 }];
  const events: SimEvent[] = [];
  let state = { ...initial };
  
  for (let t = 1; t <= T; t++) {
    const prev = { ...state };
    state = updateState(prev, actions[t] || {}, t, params);
    
    // 임계점 이벤트 감지
    if (prev.loyalty >= params.loyaltyCritical && state.loyalty < params.loyaltyCritical) {
      events.push({ t, type: 'CRITICAL', desc: '충성도 붕괴' });
      state.loyalty *= 0.92;
      state.customers *= 0.95;
    } else if (prev.loyalty >= params.loyaltyWarning && state.loyalty < params.loyaltyWarning) {
      events.push({ t, type: 'WARNING', desc: '충성도 경고' });
    }
    
    if (prev.dependency <= params.dependencyWarning && state.dependency > params.dependencyWarning) {
      events.push({ t, type: 'WARNING', desc: '의존도 경고' });
    }
    
    trajectory.push({ ...state, month: t });
  }
  
  return { trajectory, events };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 상태 판정
// ═══════════════════════════════════════════════════════════════════════════════

const determineState = (
  state: State, 
  params: Params
): { label: string; emoji: string; color: string } => {
  let c = 0, w = 0;
  
  if (state.loyalty < params.loyaltyCritical) c++; 
  else if (state.loyalty < params.loyaltyWarning) w++;
  
  if (state.dependency > params.dependencyCritical) c++; 
  else if (state.dependency > params.dependencyWarning) w++;
  
  if (c >= 2) return { label: 'COLLAPSED', emoji: '💀', color: '#dc2626' };
  if (c >= 1) return { label: 'CRITICAL', emoji: '🔴', color: '#dc2626' };
  if (w >= 2) return { label: 'PRESSURING', emoji: '🟡', color: '#f59e0b' };
  return { label: 'STABLE', emoji: '🟢', color: '#22c55e' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 포맷 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

const formatMoney = (v: number): string => 
  Math.abs(v) >= 1e8 
    ? `${(v / 1e8).toFixed(1)}억` 
    : Math.abs(v) >= 1e4 
      ? `${Math.round(v / 1e4)}만` 
      : v.toLocaleString();

const formatPct = (v: number): string => `${(v * 100).toFixed(0)}%`;

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface InputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
}

const Input: React.FC<InputProps> = ({ label, value, onChange, unit }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="w-20 text-xs text-gray-600">{label}</span>
    <input 
      type="number" 
      value={value} 
      onChange={e => onChange(+e.target.value || 0)} 
      className="flex-1 px-2 py-1 border rounded text-right text-sm" 
    />
    <span className="w-8 text-xs text-gray-400">{unit}</span>
  </div>
);

export default function LaplacianSimulator() {
  const [initial, setInitial] = useState<State>({
    cash: 23000000, 
    income: 52000000, 
    expense: 41000000, 
    customers: 127,
    teachers: 8, 
    loyalty: 0.78, 
    retention: 0.75, 
    dependency: 0.38,
    competition: 0.10, 
    referral: 0.35, 
    cac: 45000,
  });
  
  const [period, setPeriod] = useState(6);
  const [scenario, setScenario] = useState('none');
  
  const scenarios: Record<string, { name: string; actions: Record<number, Action> }> = {
    none: { name: '무액션', actions: {} },
    salary: { name: '강사 연봉 +10%', actions: { 1: { teacherSalary: 1.0 } } },
    marketing: { name: '마케팅 강화', actions: { 1: { marketing: 1.0 } } },
    service: { name: '서비스 개선', actions: { 1: { service: 1.0 } } },
    hire: { name: '강사 채용', actions: { 1: { hireTeacher: 1.0 } } },
    combo: { name: '종합 대응', actions: { 1: { teacherSalary: 0.8, service: 0.5, hireTeacher: 0.5 } } },
  };
  
  const results = useMemo(() => {
    const r: Record<string, ReturnType<typeof simulate>> = {};
    for (const [k, s] of Object.entries(scenarios)) {
      r[k] = simulate(initial, period, s.actions, DEFAULT_PARAMS);
    }
    return r;
  }, [initial, period]);
  
  const curr = results[scenario];
  const noAct = results.none;
  const final = curr.trajectory[period];
  const init = curr.trajectory[0];
  const state = determineState(final, DEFAULT_PARAMS);
  
  const chartData = curr.trajectory.map((s, i) => ({
    월: `${i}`,
    고객: Math.round(s.customers),
    충성도: Math.round(s.loyalty * 100),
    의존도: Math.round(s.dependency * 100),
  }));
  
  const compData = Object.entries(results).map(([k, r]) => {
    const f = r.trajectory[period];
    const st = determineState(f, DEFAULT_PARAMS);
    return { 
      name: scenarios[k].name, 
      충성도: Math.round(f.loyalty * 100), 
      color: st.color, 
      상태: st.label 
    };
  });
  
  return (
    <div className="min-h-full h-full bg-slate-900 text-white p-3 overflow-auto">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 mb-4 text-white">
          <h1 className="text-xl font-bold">AUTUS 72³ Laplacian Simulator</h1>
          <p className="text-sm opacity-80">X(t+1) = f(X(t), U(t), θ)</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 좌측: 입력 */}
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3 shadow">
              <h2 className="font-bold text-sm mb-3">📊 현재 상태</h2>
              <Input 
                label="현금" 
                value={initial.cash / 10000} 
                onChange={v => setInitial({...initial, cash: v * 10000})} 
                unit="만" 
              />
              <Input 
                label="매출" 
                value={initial.income / 10000} 
                onChange={v => setInitial({...initial, income: v * 10000})} 
                unit="만" 
              />
              <Input 
                label="비용" 
                value={initial.expense / 10000} 
                onChange={v => setInitial({...initial, expense: v * 10000})} 
                unit="만" 
              />
              <Input 
                label="학생" 
                value={initial.customers} 
                onChange={v => setInitial({...initial, customers: v})} 
                unit="명" 
              />
              <Input 
                label="충성도" 
                value={Math.round(initial.loyalty * 100)} 
                onChange={v => setInitial({...initial, loyalty: v / 100})} 
                unit="%" 
              />
              <Input 
                label="의존도" 
                value={Math.round(initial.dependency * 100)} 
                onChange={v => setInitial({...initial, dependency: v / 100})} 
                unit="%" 
              />
              <Input 
                label="경쟁" 
                value={Math.round(initial.competition * 100)} 
                onChange={v => setInitial({...initial, competition: v / 100})} 
                unit="%" 
              />
            </div>
            
            <div className="bg-white rounded-lg p-3 shadow">
              <h2 className="font-bold text-sm mb-3">⚙️ 설정</h2>
              <div className="flex gap-1 mb-3">
                {[3, 6, 12].map(m => (
                  <button 
                    key={m} 
                    onClick={() => setPeriod(m)} 
                    className={`flex-1 py-1 rounded text-sm ${
                      period === m ? 'bg-indigo-600 text-white' : 'bg-gray-100'
                    }`}
                  >
                    {m}개월
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                {Object.entries(scenarios).map(([k, s]) => (
                  <button 
                    key={k} 
                    onClick={() => setScenario(k)} 
                    className={`w-full text-left px-2 py-1 rounded text-sm ${
                      scenario === k 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* 우측: 결과 */}
          <div className="md:col-span-2 space-y-3">
            {/* 예측 결과 */}
            <div className="bg-white rounded-lg p-3 shadow">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-sm">{period}개월 후 예측</h2>
                <span 
                  className="px-2 py-0.5 rounded text-white text-xs font-bold" 
                  style={{ backgroundColor: state.color }}
                >
                  {state.emoji} {state.label}
                </span>
              </div>
              
              {/* 메트릭 카드 */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { 
                    label: '매출', 
                    val: formatMoney(final.income), 
                    chg: ((final.income - init.income) / init.income * 100).toFixed(1) 
                  },
                  { 
                    label: '학생', 
                    val: `${Math.round(final.customers)}명`, 
                    chg: ((final.customers - init.customers) / init.customers * 100).toFixed(1) 
                  },
                  { 
                    label: '충성도', 
                    val: formatPct(final.loyalty), 
                    chg: ((final.loyalty - init.loyalty) * 100).toFixed(1) 
                  },
                  { 
                    label: '의존도', 
                    val: formatPct(final.dependency), 
                    chg: ((final.dependency - init.dependency) * 100).toFixed(1) 
                  },
                ].map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-center">
                    <div className="text-xs text-gray-500">{m.label}</div>
                    <div className="font-bold">{m.val}</div>
                    <div className={`text-xs ${
                      parseFloat(m.chg) >= 0 
                        ? (m.label === '의존도' ? 'text-red-500' : 'text-green-500') 
                        : (m.label === '의존도' ? 'text-green-500' : 'text-red-500')
                    }`}>
                      {parseFloat(m.chg) > 0 ? '+' : ''}{m.chg}
                      {m.label === '충성도' || m.label === '의존도' ? '%p' : '%'}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 차트 */}
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="월" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="고객" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="충성도" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="의존도" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* 시나리오 비교 */}
            <div className="bg-white rounded-lg p-3 shadow">
              <h2 className="font-bold text-sm mb-2">🔄 시나리오 비교</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">시나리오</th>
                      <th className="text-right py-1">충성도</th>
                      <th className="text-right py-1">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compData.map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1">{r.name}</td>
                        <td className="text-right">{r.충성도}%</td>
                        <td className="text-right">
                          <span 
                            className="px-1 rounded text-white" 
                            style={{ backgroundColor: r.color, fontSize: 10 }}
                          >
                            {r.상태}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 이벤트 */}
            {curr.events.length > 0 && (
              <div className="bg-white rounded-lg p-3 shadow">
                <h2 className="font-bold text-sm mb-2">⚠️ 이벤트</h2>
                {curr.events.map((e, i) => (
                  <div 
                    key={i} 
                    className={`text-xs p-1 rounded mb-1 ${
                      e.type === 'CRITICAL' 
                        ? 'bg-red-50 text-red-700' 
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {e.type === 'CRITICAL' ? '🔴' : '🟡'} {e.t}개월 후: {e.desc}
                  </div>
                ))}
              </div>
            )}
            
            {/* 분석 */}
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
              <h2 className="font-bold text-sm mb-2 text-indigo-800">💡 분석</h2>
              <div className="text-xs text-gray-700">
                {scenario === 'none' ? (
                  <p>
                    무액션 시 충성도 {formatPct(init.loyalty)} → {formatPct(final.loyalty)} 
                    ({((final.loyalty - init.loyalty) * 100).toFixed(1)}%p). 
                    다른 시나리오를 선택해 비교하세요.
                  </p>
                ) : (
                  <p>
                    {scenarios[scenario].name} 실행 시 매출 
                    {formatMoney(final.income - noAct.trajectory[period].income)}/월 차이. 
                    충성도 {formatPct(final.loyalty)} vs {formatPct(noAct.trajectory[period].loyalty)} (무액션)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
