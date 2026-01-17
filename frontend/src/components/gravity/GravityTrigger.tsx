/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Gravity Trigger Component
 * Event Type Override + K10 Ritual Protocol UI
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type EventType = 'TASK' | 'PAYMENT' | 'CONTRACT' | 'REGULATORY' | 'CONSTITUTION';

export interface DecisionInput {
  decision_id: string;
  actor: string;
  event_type: EventType;
  M: number;
  I: number;
  R: number;
  T: number;
  action: string;
  component: string;
  reason?: string;
}

export interface DecisionOutput {
  decision_id: string;
  event_type: EventType;
  omega: number;
  k_raw: number;
  k_final: number;
  min_k_applied: number | null;
  allowed: boolean;
  gate: { components: string[]; actions: string[] };
  message: string;
  human_final_approval_required: boolean;
  ritual_required: boolean;
  ritual_id: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:8000/api/gravity';

export async function evaluateDecision(payload: DecisionInput): Promise<DecisionOutput> {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`EVALUATE_FAILED: ${await res.text()}`);
  return res.json();
}

export async function ritualEnter(decision_id: string, actor: string, reason: string) {
  const res = await fetch(`${API_BASE}/ritual/enter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision_id, actor, reason }),
  });
  if (!res.ok) throw new Error(`RITUAL_ENTER_FAILED: ${await res.text()}`);
  return res.json() as Promise<{ decision_id: string; ritual_id: string; message: string }>;
}

export async function ritualFinalize(
  decision_id: string,
  actor: string,
  ritual_id: string,
  approval_statement: string
) {
  const res = await fetch(`${API_BASE}/ritual/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision_id,
      actor,
      ritual_id,
      human_final_approval: true,
      approval_statement,
    }),
  });
  if (!res.ok) throw new Error(`RITUAL_FINALIZE_FAILED: ${await res.text()}`);
  return res.json() as Promise<{ decision_id: string; finalized: boolean; message: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const EVENT_TYPE_CONFIG: Record<EventType, { color: string; icon: string; name: string; minK: number | string }> = {
  TASK: { color: '#10B981', icon: '✅', name: '일반 업무', minK: 1 },
  PAYMENT: { color: '#F59E0B', icon: '💳', name: '결제/지급', minK: 5 },
  CONTRACT: { color: '#3B82F6', icon: '📝', name: '계약/서명', minK: 6 },
  REGULATORY: { color: '#8B5CF6', icon: '⚖️', name: '규제/세무', minK: 6 },
  CONSTITUTION: { color: '#EF4444', icon: '🏛️', name: '헌법/원칙', minK: '10 (강제)' },
};

const K_COLORS: Record<number, string> = {
  1: '#22C55E', 2: '#84CC16', 3: '#EAB308', 4: '#F97316',
  5: '#F59E0B', 6: '#EF4444', 7: '#DC2626', 8: '#B91C1C',
  9: '#991B1B', 10: '#7F1D1D',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function GravityTrigger() {
  // Form State
  const [decisionId, setDecisionId] = useState('D-2026-0001');
  const [actor, setActor] = useState('Seho');
  const [eventType, setEventType] = useState<EventType>('CONTRACT');
  const [M, setM] = useState(6);
  const [I, setI] = useState(4);
  const [R, setR] = useState(7);
  const [T, setT] = useState(3);
  const [action, setAction] = useState('APPROVE');
  const [component, setComponent] = useState('ContractView');
  
  // Result State
  const [result, setResult] = useState<DecisionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ritualId, setRitualId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Event Type 변경 시 기본값 조정
  const handleEventTypeChange = useCallback((type: EventType) => {
    setEventType(type);
    
    // 기본 action/component 설정
    switch (type) {
      case 'TASK':
        setAction('EXECUTE');
        setComponent('TaskCard');
        break;
      case 'PAYMENT':
        setAction('REQUEST_APPROVAL');
        setComponent('PortfolioView');
        break;
      case 'CONTRACT':
        setAction('APPROVE');
        setComponent('ContractView');
        break;
      case 'REGULATORY':
        setAction('REQUEST_LEGAL');
        setComponent('CompliancePanel');
        break;
      case 'CONSTITUTION':
        setAction('EDIT_CONSTITUTION');
        setComponent('PrincipleEditor');
        setR(10); // 헌법은 비가역
        break;
    }
  }, []);

  // Evaluate
  const handleEvaluate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRitualId(null);

    try {
      const res = await evaluateDecision({
        decision_id: decisionId,
        actor,
        event_type: eventType,
        M, I, R, T,
        action,
        component,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Ritual Enter
  const handleRitualEnter = async () => {
    if (!result) return;
    setLoading(true);
    
    try {
      const res = await ritualEnter(
        result.decision_id,
        actor,
        '지금부터 헌법을 변경합니다. (K10 의식 진입)'
      );
      setRitualId(res.ritual_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Ritual Finalize
  const handleRitualFinalize = async () => {
    if (!result || !ritualId) return;
    setLoading(true);
    
    try {
      const res = await ritualFinalize(
        result.decision_id,
        actor,
        ritualId,
        '이 결정의 책임은 인간에게 있습니다. (Human Final Approval)'
      );
      alert(res.message);
      setRitualId(null);
      setResult(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">⚖️ Gravity Trigger (Event Override + K10 Ritual)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">의사결정 평가</h2>
          
          {/* Event Type Selector */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Event Type</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(EVENT_TYPE_CONFIG) as EventType[]).map(type => {
                const config = EVENT_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => handleEventTypeChange(type)}
                    className={`p-3 rounded-lg text-center transition-all ${
                      eventType === type ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: `${config.color}20`, borderLeft: `4px solid ${config.color}` }}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <p className="text-xs mt-1">{config.name}</p>
                    <p className="text-[10px] text-gray-400">min K: {config.minK}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* M, I, R, T Sliders */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'M (Money/Resource)', value: M, set: setM },
              { label: 'I (Impact/Influence)', value: I, set: setI },
              { label: 'R (Risk/Reversibility)', value: R, set: setR },
              { label: 'T (Time Pressure)', value: T, set: setT, min: 1 },
            ].map(({ label, value, set, min }) => (
              <div key={label}>
                <label className="block text-sm text-gray-400 mb-1">
                  {label}: <span className="text-white font-bold">{value}</span>
                </label>
                <input
                  type="range"
                  min={min ?? 0}
                  max={10}
                  value={value}
                  onChange={e => set(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Action & Component */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Action</label>
              <input
                type="text"
                value={action}
                onChange={e => setAction(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Component</label>
              <input
                type="text"
                value={component}
                onChange={e => setComponent(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg"
              />
            </div>
          </div>

          {/* Evaluate Button */}
          <button
            onClick={handleEvaluate}
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? '평가 중...' : '평가 실행 (Evaluate)'}
          </button>
        </div>

        {/* Result Panel */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">평가 결과</h2>
          
          {error && (
            <div className="p-4 bg-red-900/30 rounded-lg text-red-400 mb-4">
              ⚠️ {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Omega & K */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <p className="text-3xl font-bold text-blue-400">{result.omega}</p>
                  <p className="text-xs text-gray-400">Ω (Omega)</p>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <p className="text-3xl font-bold text-gray-400">{result.k_raw}</p>
                  <p className="text-xs text-gray-400">K (Raw)</p>
                </div>
                <div 
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: `${K_COLORS[result.k_final]}30` }}
                >
                  <p className="text-3xl font-bold" style={{ color: K_COLORS[result.k_final] }}>
                    K{result.k_final}
                  </p>
                  <p className="text-xs text-gray-400">K (Final)</p>
                </div>
              </div>

              {/* Override Info */}
              {result.min_k_applied && (
                <div className="p-3 bg-amber-900/30 rounded-lg">
                  <span className="text-amber-400">⚡ min_k 적용: K{result.min_k_applied}</span>
                  <span className="text-gray-400 text-sm ml-2">
                    ({EVENT_TYPE_CONFIG[result.event_type].name} 최소 요구)
                  </span>
                </div>
              )}

              {/* Status */}
              <div className={`p-4 rounded-lg ${result.allowed ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{result.allowed ? '✅' : '🚫'}</span>
                  <div>
                    <p className={result.allowed ? 'text-green-400' : 'text-red-400'}>
                      {result.message}
                    </p>
                    {result.human_final_approval_required && (
                      <p className="text-sm text-amber-400">👤 인간 최종 승인 필요</p>
                    )}
                    {result.ritual_required && (
                      <p className="text-sm text-purple-400">🏛️ K10 의식(Ritual) 필요</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gate Policy */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold mb-2">Gate Policy (K{result.k_final})</h3>
                <div className="text-sm">
                  <p className="text-gray-400">
                    Components: {result.gate.components.join(', ')}
                  </p>
                  <p className="text-gray-400">
                    Actions: {result.gate.actions.join(', ')}
                  </p>
                </div>
              </div>

              {/* K10 Ritual Panel */}
              {result.ritual_required && (
                <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-500">
                  <h3 className="text-lg font-semibold text-purple-400 mb-3">🏛️ K10 Ritual Protocol</h3>
                  
                  {!ritualId ? (
                    <div>
                      <p className="text-sm text-gray-300 mb-3">
                        헌법/원칙 변경을 위해서는 2단계 의식이 필요합니다.
                      </p>
                      <button
                        onClick={handleRitualEnter}
                        disabled={loading}
                        className="w-full py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold"
                      >
                        Step 1: 의식 진입 (Enter Ritual)
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="p-3 bg-gray-800 rounded-lg mb-3">
                        <p className="text-sm text-gray-400">Ritual ID:</p>
                        <p className="text-purple-300 font-mono">{ritualId}</p>
                        <p className="text-xs text-gray-500 mt-1">10분 내 완료 필요</p>
                      </div>
                      <button
                        onClick={handleRitualFinalize}
                        disabled={loading}
                        className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold"
                      >
                        Step 2: 최종 확정 (Finalize with Human Approval)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!result && !error && (
            <div className="text-center text-gray-500 py-8">
              의사결정을 평가하려면 좌측 폼을 작성하고 "평가 실행"을 클릭하세요.
            </div>
          )}
        </div>
      </div>

      {/* Formula Reference */}
      <div className="mt-6 p-4 bg-gray-800 rounded-xl">
        <h3 className="font-semibold mb-2">Gravity Formula</h3>
        <div className="font-mono text-sm text-gray-400">
          Ω = (M × I × R) / T → K Level
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Event Override: CONTRACT/REGULATORY → min K6 | CONSTITUTION → force K10
        </div>
      </div>
    </div>
  );
}

export default GravityTrigger;
