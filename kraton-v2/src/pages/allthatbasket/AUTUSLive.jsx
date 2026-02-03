import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AUTUSEngine, { OUTCOME_TYPES, STATES } from '../../engine/AUTUSEngine';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS LIVE - 실제 엔진 기반 대시보드
 *
 * 흉내가 아닌 진짜 동작:
 * 1. 이벤트 → OutcomeFact → 정책 매칭 → 상태 전이
 * 2. Shadow 관찰 → 신뢰도 축적 → 자동 Promotion
 * 3. 상태 전이 → Blast Radius 계산 → 승인 필요
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// 엔진 인스턴스 (싱글톤)
const engine = new AUTUSEngine();

// 초기 데이터 시딩
function seedInitialData() {
  // 계약 생성
  const contracts = [
    { customerId: 'PARENT_001', producerId: 'COACH_A', slotId: 'MON_1800', monthlyValue: 150000 },
    { customerId: 'PARENT_002', producerId: 'COACH_A', slotId: 'MON_1800', monthlyValue: 150000 },
    { customerId: 'PARENT_003', producerId: 'COACH_A', slotId: 'MON_1900', monthlyValue: 180000 },
    { customerId: 'PARENT_004', producerId: 'COACH_B', slotId: 'TUE_1800', monthlyValue: 150000 },
    { customerId: 'PARENT_005', producerId: 'COACH_B', slotId: 'TUE_1800', monthlyValue: 150000 },
    { customerId: 'PARENT_006', producerId: 'COACH_B', slotId: 'WED_1700', monthlyValue: 200000 },
    { customerId: 'PARENT_007', producerId: 'COACH_C', slotId: 'WED_1800', monthlyValue: 150000 },
    { customerId: 'PARENT_008', producerId: 'COACH_C', slotId: 'THU_1800', monthlyValue: 150000 },
  ];
  contracts.forEach(c => engine.createContract(c));

  // 정책 등록 (Shadow 모드로 시작)
  const policies = [
    { trigger: 'attendance.drop', action: 'reassign_coach', expectedOutcome: 'positive', name: '출석급락 → 강사교체' },
    { trigger: 'renewal.failed', action: 'apply_discount', expectedOutcome: 'positive', name: '갱신실패 → 할인적용' },
    { trigger: 'notification.ignored', action: 'change_channel', expectedOutcome: 'positive', name: '알림무시 → 채널변경' },
    { trigger: 'payment.failed', action: 'retry_payment', expectedOutcome: 'positive', name: '결제실패 → 재시도' },
  ];
  policies.forEach(p => engine.registerPolicy(p));
}

// 초기 시딩 실행
if (engine.contracts.getAll().length === 0) {
  seedInitialData();
}

export default function AUTUSLive() {
  const [snapshot, setSnapshot] = useState(() => engine.getSnapshot());
  const [selectedContract, setSelectedContract] = useState(null);
  const [blastRadiusPreview, setBlastRadiusPreview] = useState(null);
  const [eventLog, setEventLog] = useState([]);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const intervalRef = useRef(null);

  // 스냅샷 업데이트
  const refreshSnapshot = useCallback(() => {
    setSnapshot(engine.getSnapshot());
  }, []);

  // 이벤트 발생
  const emitEvent = useCallback((eventType, contractId) => {
    const contract = engine.contracts.get(contractId);
    if (!contract) return;

    const fact = engine.emitEvent(eventType, {
      contractId,
      customerId: contract.customerId,
      producerId: contract.producerId,
      slotId: contract.slotId,
    });

    setEventLog(prev => [{
      id: Date.now(),
      type: eventType,
      tier: OUTCOME_TYPES[eventType]?.tier,
      contractId,
      ts: new Date().toLocaleTimeString(),
    }, ...prev].slice(0, 30));

    refreshSnapshot();
  }, [refreshSnapshot]);

  // 자동 시뮬레이션
  useEffect(() => {
    if (autoSimulate) {
      intervalRef.current = setInterval(() => {
        const contracts = engine.contracts.getAll();
        if (contracts.length === 0) return;

        const randomContract = contracts[Math.floor(Math.random() * contracts.length)];
        const eventTypes = Object.keys(OUTCOME_TYPES);
        const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        emitEvent(randomEvent, randomContract.id);
      }, 2000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoSimulate, emitEvent]);

  // 상태 전이
  const handleTransition = useCallback((contractId, newState) => {
    try {
      const result = engine.transitionState(contractId, newState, 'owner', 'Manual transition');
      setBlastRadiusPreview(null);
      refreshSnapshot();
    } catch (e) {
      alert(e.message);
    }
  }, [refreshSnapshot]);

  // Blast Radius 미리보기
  const previewTransition = useCallback((contractId, newState) => {
    const preview = engine.previewBlastRadius(contractId, newState);
    setBlastRadiusPreview(preview);
  }, []);

  // 정책 Kill
  const handleKillPolicy = useCallback((policyId) => {
    engine.killPolicy(policyId, 'Manual kill by owner');
    refreshSnapshot();
  }, [refreshSnapshot]);

  // 정책 강제 승격 (테스트용)
  const handleForcePromote = useCallback((policyId) => {
    const policy = engine.policies.getPolicy(policyId);
    if (policy.mode === 'shadow') {
      engine.policies.promote(policyId, 'candidate');
    } else if (policy.mode === 'candidate') {
      engine.policies.promote(policyId, 'promoted');
    }
    refreshSnapshot();
  }, [refreshSnapshot]);

  const { contracts, policies, stats } = snapshot;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 100%)',
      color: '#F8FAFC',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>⚡</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>AUTUS Live Engine</h1>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>실제 동작하는 핵심 엔진</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Stat label="계약" value={stats.totalContracts} color="#3B82F6" />
            <Stat label="섀도우" value={stats.policiesByMode.shadow} color="#6B7280" />
            <Stat label="후보" value={stats.policiesByMode.candidate} color="#F59E0B" />
            <Stat label="승격" value={stats.policiesByMode.promoted} color="#10B981" />
            <Stat label="폐기" value={stats.policiesByMode.killed} color="#EF4444" />
          </div>

          {/* Auto Simulate Toggle */}
          <button
            onClick={() => setAutoSimulate(!autoSimulate)}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: autoSimulate ? '#10B981' : 'rgba(255,255,255,0.1)',
              border: 'none', color: 'white', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {autoSimulate ? '● LIVE' : '○ 시작'}
          </button>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: 16 }}>
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 1. CONTRACTS + STATE MACHINE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12, padding: 16,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📋</span> 계약 & 상태
          </h2>

          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {contracts.map(contract => (
              <ContractCard
                key={contract.id}
                contract={contract}
                selected={selectedContract?.id === contract.id}
                onSelect={() => setSelectedContract(contract)}
                onEmitEvent={emitEvent}
                onPreviewTransition={previewTransition}
                onTransition={handleTransition}
                vv={engine.getVV(contract.id)}
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 2. POLICIES (Tesla Shadow → Promotion) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12, padding: 16,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🚗</span> 정책 파이프라인 (Tesla FSD)
          </h2>

          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {['shadow', 'candidate', 'promoted', 'killed'].map(mode => (
              <div key={mode} style={{
                flex: 1, padding: 8, borderRadius: 6, textAlign: 'center',
                background: getModeColor(mode) + '20',
                border: `1px solid ${getModeColor(mode)}40`,
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: getModeColor(mode) }}>
                  {stats.policiesByMode[mode]}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{getModeLabel(mode)}</div>
              </div>
            ))}
          </div>

          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {policies.map(policy => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                onKill={handleKillPolicy}
                onForcePromote={handleForcePromote}
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 3. EVENT LOG + BLAST RADIUS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12, padding: 16,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {/* Blast Radius Preview */}
          {blastRadiusPreview && (
            <div style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
              borderRadius: 12, padding: 16,
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>
                💥 Blast Radius
              </h3>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
              }}>
                <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{blastRadiusPreview.affectedCount}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>영향 계약</div>
                </div>
                <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{blastRadiusPreview.uniqueCustomers}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>영향 고객</div>
                </div>
                <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {(blastRadiusPreview.revenueImpact / 10000).toFixed(0)}만
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>매출영향</div>
                </div>
              </div>
              <div style={{
                marginTop: 12, padding: 8, borderRadius: 8,
                background: blastRadiusPreview.riskLevel === 'high' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)',
                textAlign: 'center', fontSize: 12, fontWeight: 600,
              }}>
                리스크: {blastRadiusPreview.riskLevel.toUpperCase()}
              </div>
            </div>
          )}

          {/* Event Log */}
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📜</span> Immutable Log
            </h3>
            <div style={{
              background: '#0D1117', borderRadius: 8, padding: 12,
              fontFamily: 'monospace', fontSize: 11,
              maxHeight: 300, overflow: 'auto',
            }}>
              {eventLog.map(log => (
                <div key={log.id} style={{ marginBottom: 4 }}>
                  <span style={{ color: '#6B7280' }}>[{log.ts}]</span>
                  {' '}
                  <span style={{ color: getTierColor(log.tier) }}>{log.tier}</span>
                  {' '}
                  <span style={{ color: '#93C5FD' }}>{log.type}</span>
                  {' '}
                  <span style={{ color: '#6B7280' }}>{log.contractId?.slice(0, 8)}</span>
                </div>
              ))}
              {eventLog.length === 0 && (
                <div style={{ opacity: 0.4, textAlign: 'center', padding: 20 }}>
                  이벤트를 발생시키면 여기에 기록됩니다
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.6 }}>{label}</div>
    </div>
  );
}

function ContractCard({ contract, selected, onSelect, onEmitEvent, onPreviewTransition, onTransition, vv }) {
  const stateInfo = STATES[contract.state];
  const stateColor = getStateColor(contract.state);

  return (
    <div
      onClick={onSelect}
      style={{
        padding: 12, marginBottom: 8, borderRadius: 8,
        background: selected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
        border: selected ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{contract.customerId}</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>{contract.producerId} · {contract.slotId}</div>
        </div>
        <div style={{
          padding: '4px 8px', borderRadius: 6,
          background: stateColor + '30',
          color: stateColor,
          fontSize: 11, fontWeight: 600,
        }}>
          {contract.state} {stateInfo?.name}
        </div>
      </div>

      {/* VV Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, opacity: 0.5 }}>VV:</span>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: vv.status === 'green' ? '#10B981' :
                     vv.status === 'yellow' ? '#F59E0B' :
                     vv.status === 'red' ? '#EF4444' : '#6B7280',
        }} />
        <span style={{ fontSize: 11, opacity: 0.7 }}>
          {vv.value !== null ? vv.value.toFixed(2) : 'N/A'} ({vv.samples}samples)
        </span>
      </div>

      {selected && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Event Triggers */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>이벤트 발생:</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(OUTCOME_TYPES).slice(0, 6).map(([type, info]) => (
                <button
                  key={type}
                  onClick={(e) => { e.stopPropagation(); onEmitEvent(type, contract.id); }}
                  style={{
                    padding: '4px 8px', borderRadius: 4,
                    background: getTierColor(info.tier) + '20',
                    border: `1px solid ${getTierColor(info.tier)}40`,
                    color: getTierColor(info.tier),
                    fontSize: 10, cursor: 'pointer',
                  }}
                >
                  {type.split('.')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* State Transitions */}
          <div>
            <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>상태 전이:</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {stateInfo?.allowedTransitions.map(nextState => (
                <button
                  key={nextState}
                  onMouseEnter={() => onPreviewTransition(contract.id, nextState)}
                  onClick={(e) => { e.stopPropagation(); onTransition(contract.id, nextState); }}
                  style={{
                    padding: '4px 8px', borderRadius: 4,
                    background: getStateColor(nextState) + '20',
                    border: `1px solid ${getStateColor(nextState)}40`,
                    color: getStateColor(nextState),
                    fontSize: 10, cursor: 'pointer',
                  }}
                >
                  → {nextState}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyCard({ policy, onKill, onForcePromote }) {
  const modeColor = getModeColor(policy.mode);

  return (
    <div style={{
      padding: 12, marginBottom: 8, borderRadius: 8,
      background: modeColor + '10',
      border: `1px solid ${modeColor}30`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{
          padding: '4px 8px', borderRadius: 4,
          background: modeColor + '30',
          color: modeColor,
          fontSize: 10, fontWeight: 600,
        }}>
          {getModeLabel(policy.mode)}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {policy.mode !== 'promoted' && policy.mode !== 'killed' && (
            <button
              onClick={() => onForcePromote(policy.id)}
              style={{
                padding: '4px 8px', borderRadius: 4,
                background: '#10B981', border: 'none',
                color: 'white', fontSize: 10, cursor: 'pointer',
              }}
            >
              ⬆️
            </button>
          )}
          {policy.mode !== 'killed' && (
            <button
              onClick={() => onKill(policy.id)}
              style={{
                padding: '4px 8px', borderRadius: 4,
                background: '#EF4444', border: 'none',
                color: 'white', fontSize: 10, cursor: 'pointer',
              }}
            >
              💀
            </button>
          )}
        </div>
      </div>

      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{policy.name}</div>
      <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 8 }}>
        트리거: {policy.trigger} → {policy.action}
      </div>

      {/* Confidence Bar */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
          <span>신뢰도</span>
          <span>{(policy.confidence * 100).toFixed(1)}%</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
          <div style={{
            width: `${policy.confidence * 100}%`,
            height: '100%', borderRadius: 2,
            background: policy.confidence >= 0.9 ? '#10B981' :
                       policy.confidence >= 0.7 ? '#F59E0B' : '#6B7280',
          }} />
        </div>
      </div>

      <div style={{ fontSize: 10, opacity: 0.5 }}>
        관찰: {policy.observationCount}회 | 정확: {policy.correctPredictions}회
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getStateColor(state) {
  const colors = {
    S0: '#6B7280', S1: '#3B82F6', S2: '#8B5CF6', S3: '#F59E0B',
    S4: '#EF4444', S5: '#10B981', S6: '#06B6D4', S7: '#EC4899',
    S8: '#DC2626', S9: '#64748B',
  };
  return colors[state] || '#6B7280';
}

function getModeColor(mode) {
  const colors = { shadow: '#6B7280', candidate: '#F59E0B', promoted: '#10B981', killed: '#EF4444' };
  return colors[mode] || '#6B7280';
}

function getModeLabel(mode) {
  const labels = { shadow: '섀도우', candidate: '후보', promoted: '승격', killed: '폐기' };
  return labels[mode] || mode;
}

function getTierColor(tier) {
  const colors = { S: '#EF4444', A: '#F59E0B', Terminal: '#6B7280' };
  return colors[tier] || '#6B7280';
}
