import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS - 단일 통합 시스템
 *
 * 🏛️ CONSTITUTION (불변 헌법):
 * - K1: 승격은 점수로만 (Score ≥ Threshold)
 * - K2: 사용자 의견은 신호 (Decision = Formula)
 * - K3: Proof 없으면 결과 없음 (5종 필수)
 * - K4: Core는 즉각 반응 안함 (24시간 대기)
 * - K5: Standard는 극소수 (≤10%)
 *
 * 원리 1:1 매핑:
 * - Amazon: 고객 이벤트 → OutcomeFact → 정책 매칭
 * - Tesla: Shadow → Confidence → Promotion
 * - Palantir: Blast Radius → 승인 → Immutable Log
 *
 * 물리 엔진:
 * - V = (M - T) × (1 + s)^t (자산 공식)
 * - 6 Physics Laws: Gravity, Momentum, Entropy, Synergy, Friction, Resonance
 * - 9 Motion Types: MINT, BURN, TRANSFER, STAKE, UNSTAKE, REWARD, PENALTY, SYNC, OBSERVE
 *
 * 역할별 뷰:
 * - Owner: 결정한다 (Blast Radius 보고, Kill/승인)
 * - Manager: 제안한다 (Shadow 정책 등록, 모니터링)
 * - Staff: 기록한다 (이벤트 발생)
 * - Customer: 응답한다 (선택지만)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTITUTION (K1-K5 불변 헌법) - core/kernel 연동
// ═══════════════════════════════════════════════════════════════════════════════

const CONSTITUTION = {
  K1: {
    id: 'K1', name: 'PROMOTION_BY_SCORE_ONLY',
    rule: 'Score ≥ Threshold 일 때만 승격 가능',
    forbidden: ['좋아 보인다', '대표가 원한다', '급하다'],
    enforce: (score, threshold) => score >= threshold,
  },
  K2: {
    id: 'K2', name: 'USER_INPUT_IS_SIGNAL',
    rule: '사용자 피드백 = 입력값, 판단 = 공식',
    enforce: ({ userSignal, failureRate, reuseRate, riskScore }) => (
      userSignal * 0.25 + (100 - failureRate) * 0.25 + reuseRate * 0.25 + (100 - riskScore) * 0.25
    ),
  },
  K3: {
    id: 'K3', name: 'NO_PROOF_NO_RESULT',
    rule: 'Proof Pack 5종 미완성 → 자동 탈락',
    requiredProofs: ['INPUT_LOG', 'PROCESS_TRACE', 'OUTPUT_HASH', 'TIMESTAMP', 'VALIDATOR_SIG'],
    enforce: (proofs) => CONSTITUTION.K3.requiredProofs.every(p => proofs[p] != null),
  },
  K4: {
    id: 'K4', name: 'CORE_NEVER_REACTS_DIRECTLY',
    rule: '모든 변화는: 입력 → 대기 → 평가 → 적용',
    minWaitPeriod: 24 * 60 * 60 * 1000, // 24h
    allowedHotfix: ['SECURITY_CRITICAL', 'LEGAL_COMPLIANCE'],
    enforce: (changeType, requestedAt, currentTime) => {
      if (CONSTITUTION.K4.allowedHotfix.includes(changeType)) return { allowed: true, reason: 'HOTFIX' };
      const waited = currentTime - requestedAt;
      return waited >= CONSTITUTION.K4.minWaitPeriod
        ? { allowed: true, reason: 'WAIT_PASSED' }
        : { allowed: false, reason: `${Math.ceil((CONSTITUTION.K4.minWaitPeriod - waited) / 3600000)}h 남음` };
    },
  },
  K5: {
    id: 'K5', name: 'STANDARD_IS_RARE',
    rule: 'Standard ≤ 10% of total',
    maxRatio: 0.10,
    enforce: (total, standard) => ({
      allowed: (standard / total) <= 0.10,
      ratio: (standard / total * 100).toFixed(1) + '%',
    }),
  },
};

// Quality Score 공식 (core/kernel 연동)
const QUALITY_SCORE = {
  thresholds: { EXPERIMENTAL: 0, STABLE: 60, STANDARD: 85 },
  calculate: ({ userSatisfaction, reuseRate, failureRate, outcomeImpact }) => (
    userSatisfaction * 0.4 + reuseRate * 0.2 + (100 - failureRate) * 0.2 + outcomeImpact * 0.2
  ),
};

// Value Formula: V = (M - T) × (1 + s)^t
const VALUE_FORMULA = {
  calculate: (mint, tax, synergy, time) => (mint - tax) * Math.pow(1 + synergy, time),
};

// 6 Physics Laws
const PHYSICS_LAWS = {
  GRAVITY: '노드 간 인력',
  MOMENTUM: '변화 저항 (관성)',
  ENTROPY: '무질서도 증가',
  SYNERGY: '협업 효과',
  FRICTION: '실행 저항',
  RESONANCE: '패턴 증폭',
};

// 9 Motion Types
const MOTION_TYPES = {
  MINT: '가치 생성', BURN: '가치 소멸', TRANSFER: '가치 이동',
  STAKE: '가치 고정', UNSTAKE: '가치 해제', REWARD: '보상',
  PENALTY: '페널티', SYNC: '동기화', OBSERVE: '관찰',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE (인라인 - 단순화)
// ═══════════════════════════════════════════════════════════════════════════════

const createEngine = () => {
  // Immutable Log (K3: Proof 포함)
  const log = [];
  const appendLog = (entry) => {
    // K3: ProofPack 자동 생성
    const proofPack = {
      INPUT_LOG: JSON.stringify(entry),
      PROCESS_TRACE: `${entry.type}@${Date.now()}`,
      OUTPUT_HASH: btoa(JSON.stringify(entry)).slice(0, 16),
      TIMESTAMP: new Date().toISOString(),
      VALIDATOR_SIG: `SIG_${Math.random().toString(36).slice(2, 10)}`,
    };

    const sealed = Object.freeze({
      ...entry,
      _id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      _ts: Date.now(),
      _seq: log.length,
      _proof: proofPack,
      _k3Valid: CONSTITUTION.K3.enforce(proofPack),
    });
    log.push(sealed);
    return sealed;
  };

  // Pending Changes Queue (K4: 24시간 대기)
  const pendingChanges = [];
  const queueChange = (change) => {
    pendingChanges.push({
      ...change,
      requestedAt: Date.now(),
      status: 'pending',
    });
    return pendingChanges[pendingChanges.length - 1];
  };

  const processQueue = () => {
    const now = Date.now();
    return pendingChanges.map(change => {
      const result = CONSTITUTION.K4.enforce(change.type, change.requestedAt, now);
      change.k4Result = result;
      if (result.allowed && change.status === 'pending') {
        change.status = 'ready';
      }
      return change;
    });
  };

  // Contracts
  const contracts = new Map();
  const addContract = (data) => {
    const id = data.id || `C_${Date.now()}`;
    const contract = { ...data, id, state: 'S0', stateHistory: [], tier: 'EXPERIMENTAL' };
    contracts.set(id, contract);
    return contract;
  };

  // Policies
  const policies = new Map();
  const observations = new Map();

  // Module Tiers (K5: Standard ≤ 10%)
  const moduleTiers = { total: 0, standard: 0 };

  const addPolicy = (data) => {
    const id = data.id || `P_${Date.now()}`;
    const policy = {
      ...data,
      id,
      mode: 'shadow', // 항상 Shadow로 시작 (Tesla 원리)
      tier: 'EXPERIMENTAL', // K5: 시작은 EXPERIMENTAL
      confidence: 0,
      observationCount: 0,
      correctCount: 0,
      createdAt: Date.now(),
      // K1: Quality Score 추적
      qualityMetrics: {
        userSatisfaction: 50,
        reuseRate: 0,
        failureRate: 50,
        outcomeImpact: 0,
      },
      qualityScore: 25, // 초기값
    };
    policies.set(id, policy);
    observations.set(id, []);
    moduleTiers.total++;
    appendLog({ type: 'POLICY_CREATED', policyId: id, trigger: data.trigger, mode: 'shadow', tier: 'EXPERIMENTAL' });
    return policy;
  };

  // OutcomeFact 생성 (Amazon 원리)
  const OUTCOME_TYPES = {
    'attendance.drop': { tier: 'S', weight: -1.0 },
    'renewal.failed': { tier: 'S', weight: -1.5 },
    'notification.ignored': { tier: 'S', weight: -0.5 },
    'payment.failed': { tier: 'S', weight: -2.0 },
    'attendance.normal': { tier: 'A', weight: 0.5 },
    'renewal.succeeded': { tier: 'A', weight: 1.0 },
    'churn.finalized': { tier: 'Terminal', weight: -3.0 },
  };

  const emitEvent = (eventType, context) => {
    const typeInfo = OUTCOME_TYPES[eventType] || { tier: 'A', weight: 0 };
    const fact = appendLog({
      type: 'OUTCOME_FACT',
      eventType,
      tier: typeInfo.tier,
      weight: typeInfo.weight,
      context,
    });

    // 정책 매칭
    const matched = Array.from(policies.values()).filter(
      p => p.trigger === eventType && p.mode !== 'killed'
    );

    matched.forEach(policy => {
      if (policy.mode === 'promoted') {
        // 실행
        appendLog({ type: 'POLICY_EXECUTED', policyId: policy.id, factId: fact._id });
      } else {
        // Shadow 관찰 (Tesla 원리)
        observe(policy, fact);
      }
    });

    // S-Tier면 상태 전이 트리거
    if (typeInfo.tier === 'S' && context.contractId) {
      const contract = contracts.get(context.contractId);
      if (contract && ['S0', 'S5', 'S6'].includes(contract.state)) {
        // S1(접수)로 자동 전이
        transitionState(context.contractId, 'S1', 'system', `S-Tier: ${eventType}`);
      }
    }

    return fact;
  };

  // Shadow 관찰 (Tesla 원리)
  const observe = (policy, fact) => {
    const obs = {
      factId: fact._id,
      prediction: policy.action,
      ts: Date.now(),
      actual: null,
    };
    observations.get(policy.id).push(obs);
    policy.observationCount++;
    appendLog({ type: 'POLICY_OBSERVED', policyId: policy.id, factId: fact._id });

    // 자동 승격 체크
    checkPromotion(policy);
  };

  // 실제 결과 기록
  const recordActual = (policyId, factId, wasCorrect) => {
    const policy = policies.get(policyId);
    if (!policy) return;

    const obs = observations.get(policyId)?.find(o => o.factId === factId);
    if (obs) {
      obs.actual = wasCorrect ? 'correct' : 'wrong';
      if (wasCorrect) policy.correctCount++;
      policy.confidence = policy.observationCount > 0
        ? policy.correctCount / policy.observationCount
        : 0;
      checkPromotion(policy);
    }
  };

  // 승격 체크 (Tesla 원리 + K1 Quality Score + K5 Standard Limit)
  const checkPromotion = (policy) => {
    // Quality Score 재계산
    policy.qualityScore = QUALITY_SCORE.calculate(policy.qualityMetrics);

    // K1: Score로만 승격
    const stableThreshold = QUALITY_SCORE.thresholds.STABLE;
    const standardThreshold = QUALITY_SCORE.thresholds.STANDARD;

    if (policy.mode === 'shadow' && policy.confidence >= 0.7 && policy.observationCount >= 20) {
      // K1: Quality Score 60 이상이어야 candidate
      if (CONSTITUTION.K1.enforce(policy.qualityScore, stableThreshold)) {
        policy.mode = 'candidate';
        policy.tier = 'STABLE';
        appendLog({ type: 'POLICY_PROMOTED', policyId: policy.id, to: 'candidate', qualityScore: policy.qualityScore });
      }
    } else if (policy.mode === 'candidate' && policy.confidence >= 0.9 && policy.observationCount >= 50) {
      // K1: Quality Score 85 이상이어야 promoted
      // K5: Standard 비율 체크
      const k5Result = CONSTITUTION.K5.enforce(moduleTiers.total, moduleTiers.standard + 1);
      if (CONSTITUTION.K1.enforce(policy.qualityScore, standardThreshold) && k5Result.allowed) {
        policy.mode = 'promoted';
        policy.tier = 'STANDARD';
        moduleTiers.standard++;
        appendLog({ type: 'POLICY_PROMOTED', policyId: policy.id, to: 'promoted', qualityScore: policy.qualityScore, k5: k5Result });
      } else if (!k5Result.allowed) {
        appendLog({ type: 'PROMOTION_BLOCKED', policyId: policy.id, reason: 'K5_LIMIT', ratio: k5Result.ratio });
      }
    }
  };

  // 강제 승격 (Owner 권한)
  const forcePromote = (policyId) => {
    const policy = policies.get(policyId);
    if (!policy) return;
    if (policy.mode === 'shadow') policy.mode = 'candidate';
    else if (policy.mode === 'candidate') policy.mode = 'promoted';
    appendLog({ type: 'POLICY_FORCE_PROMOTED', policyId, to: policy.mode, by: 'owner' });
    return policy;
  };

  // Kill (Amazon 원리)
  const killPolicy = (policyId, reason) => {
    const policy = policies.get(policyId);
    if (!policy) return;
    policy.mode = 'killed';
    policy.killedAt = Date.now();
    policy.killReason = reason;
    appendLog({ type: 'POLICY_KILLED', policyId, reason, by: 'owner' });
    return policy;
  };

  // 상태 전이 (Palantir 원리)
  const STATES = {
    S0: { name: '대기', next: ['S1'] },
    S1: { name: '접수', next: ['S2', 'S9'] },
    S2: { name: '적격', next: ['S3', 'S4'] },
    S3: { name: '승인대기', next: ['S4', 'S1'] },
    S4: { name: '개입', next: ['S5'] },
    S5: { name: '모니터', next: ['S6', 'S7', 'S9'] },
    S6: { name: '안정', next: ['S0', 'S1'] },
    S7: { name: '섀도우', next: ['S5'] },
    S9: { name: '종료', next: [] },
  };

  // Blast Radius 계산 (Palantir 원리)
  const calculateBlastRadius = (contractId, newState) => {
    const contract = contracts.get(contractId);
    if (!contract) return null;

    // 같은 슬롯, 같은 강사의 계약들
    const affected = Array.from(contracts.values()).filter(c =>
      c.id !== contractId &&
      (c.slotId === contract.slotId || c.producerId === contract.producerId)
    );

    const revenueImpact = affected.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);

    return {
      from: contract.state,
      to: newState,
      affectedCount: affected.length,
      affectedContracts: affected.map(c => c.id),
      uniqueCustomers: new Set(affected.map(c => c.customerId)).size,
      revenueImpact,
      riskLevel: affected.length > 10 ? 'high' : affected.length > 5 ? 'medium' : 'low',
    };
  };

  const transitionState = (contractId, newState, actor, reason) => {
    const contract = contracts.get(contractId);
    if (!contract) return null;

    const stateInfo = STATES[contract.state];
    if (!stateInfo?.next.includes(newState)) {
      return { error: `Invalid transition: ${contract.state} → ${newState}` };
    }

    const blastRadius = calculateBlastRadius(contractId, newState);
    const oldState = contract.state;
    contract.state = newState;
    contract.stateHistory.push({ from: oldState, to: newState, at: Date.now(), actor, reason });

    appendLog({
      type: 'STATE_TRANSITION',
      contractId,
      from: oldState,
      to: newState,
      actor,
      reason,
      blastRadius: { affected: blastRadius.affectedCount, revenue: blastRadius.revenueImpact },
    });

    return { contract, blastRadius };
  };

  // VV 계산
  const calculateVV = (contractId, days = 7) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const facts = log.filter(
      l => l.type === 'OUTCOME_FACT' && l.context?.contractId === contractId && l._ts >= cutoff
    );
    if (facts.length < 5) return { value: null, status: 'gray', samples: facts.length };
    const sum = facts.reduce((acc, f) => acc + (f.weight || 0), 0);
    const value = sum / facts.length;
    const status = value >= 0.5 ? 'green' : value >= -0.2 ? 'yellow' : 'red';
    return { value, status, samples: facts.length };
  };

  // Quality Score 업데이트
  const updateQualityMetrics = (policyId, metrics) => {
    const policy = policies.get(policyId);
    if (!policy) return;
    policy.qualityMetrics = { ...policy.qualityMetrics, ...metrics };
    policy.qualityScore = QUALITY_SCORE.calculate(policy.qualityMetrics);
    checkPromotion(policy);
    return policy;
  };

  // Value 계산
  const calculateValue = (mint, tax, synergy, time) => VALUE_FORMULA.calculate(mint, tax, synergy, time);

  return {
    // Data
    getContracts: () => Array.from(contracts.values()),
    getContract: (id) => contracts.get(id),
    getPolicies: () => Array.from(policies.values()),
    getPolicy: (id) => policies.get(id),
    getLogs: () => [...log],
    getStates: () => STATES,
    getOutcomeTypes: () => OUTCOME_TYPES,

    // Constitution
    getConstitution: () => CONSTITUTION,
    getModuleTiers: () => ({ ...moduleTiers }),
    getQualityThresholds: () => QUALITY_SCORE.thresholds,
    getPendingChanges: () => processQueue(),
    getPhysicsLaws: () => PHYSICS_LAWS,
    getMotionTypes: () => MOTION_TYPES,

    // Actions
    addContract,
    addPolicy,
    emitEvent,
    recordActual,
    forcePromote,
    killPolicy,
    calculateBlastRadius,
    transitionState,
    calculateVV,
    updateQualityMetrics,
    calculateValue,
    queueChange,
  };
};

// 싱글톤 엔진
const engine = createEngine();

// 초기 데이터
if (engine.getContracts().length === 0) {
  // 계약
  engine.addContract({ id: 'C001', customerId: '김민수', producerId: '박코치', slotId: '월1800', monthlyValue: 150000 });
  engine.addContract({ id: 'C002', customerId: '이영희', producerId: '박코치', slotId: '월1800', monthlyValue: 150000 });
  engine.addContract({ id: 'C003', customerId: '정호진', producerId: '박코치', slotId: '월1900', monthlyValue: 180000 });
  engine.addContract({ id: 'C004', customerId: '최수아', producerId: '김코치', slotId: '화1800', monthlyValue: 150000 });
  engine.addContract({ id: 'C005', customerId: '강지훈', producerId: '김코치', slotId: '화1800', monthlyValue: 150000 });

  // 정책 (Shadow로 시작)
  engine.addPolicy({ id: 'P001', name: '출석급락 → 강사교체', trigger: 'attendance.drop', action: 'reassign_coach' });
  engine.addPolicy({ id: 'P002', name: '갱신실패 → 할인제안', trigger: 'renewal.failed', action: 'apply_discount' });
  engine.addPolicy({ id: 'P003', name: '알림무시 → 채널변경', trigger: 'notification.ignored', action: 'change_channel' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUS() {
  const [role, setRole] = useState(null);
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  if (!role) {
    return <RoleSelector onSelect={setRole} />;
  }

  const View = {
    owner: OwnerView,
    manager: ManagerView,
    staff: StaffView,
    customer: CustomerView,
  }[role];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0F',
      color: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        borderBottom: '1px solid #1E1E2E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700 }}>AUTUS</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>{getRoleLabel(role)}</div>
          </div>
        </div>
        <button
          onClick={() => setRole(null)}
          style={{
            padding: '6px 12px', borderRadius: 6,
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#94A3B8', fontSize: 12, cursor: 'pointer',
          }}
        >
          역할 변경
        </button>
      </header>

      <View engine={engine} refresh={refresh} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

function RoleSelector({ onSelect }) {
  const roles = [
    { id: 'owner', label: '원장', icon: '👔', desc: '결정한다 (Kill, 승인)', color: '#F97316' },
    { id: 'manager', label: '관리자', icon: '💼', desc: '제안한다 (Shadow 등록)', color: '#3B82F6' },
    { id: 'staff', label: '코치', icon: '🏃', desc: '기록한다 (이벤트 발생)', color: '#10B981' },
    { id: 'customer', label: '학부모', icon: '👨‍👩‍👧', desc: '응답한다 (선택지만)', color: '#8B5CF6' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0A0F 0%, #1A1A2E 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#F8FAFC' }}>AUTUS</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.5, fontSize: 14 }}>역할을 선택하세요</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 400 }}>
        {roles.map(role => (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            style={{
              padding: 20, borderRadius: 16,
              background: '#1A1A2E',
              border: `2px solid ${role.color}40`,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = role.color}
            onMouseOut={e => e.currentTarget.style.borderColor = `${role.color}40`}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{role.icon}</div>
            <div style={{ fontWeight: 700, color: role.color, marginBottom: 4 }}>{role.label}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{role.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNER VIEW - 결정한다
// ═══════════════════════════════════════════════════════════════════════════════

function OwnerView({ engine, refresh }) {
  const [selectedContract, setSelectedContract] = useState(null);
  const [blastPreview, setBlastPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('decision'); // decision | constitution

  const contracts = engine.getContracts();
  const policies = engine.getPolicies();
  const logs = engine.getLogs().slice(-20).reverse();
  const moduleTiers = engine.getModuleTiers();
  const constitution = engine.getConstitution();

  const pendingApproval = policies.filter(p => p.mode === 'candidate');
  const canKill = policies.filter(p => p.mode !== 'killed' && p.confidence < 0.5 && p.observationCount > 10);
  const k5Status = CONSTITUTION.K5.enforce(moduleTiers.total || 1, moduleTiers.standard);

  return (
    <main style={{ padding: 20 }}>
      {/* 탭 전환 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'decision', label: '🎯 결정', color: '#F97316' },
          { id: 'constitution', label: '🏛️ 헌법', color: '#8B5CF6' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: activeTab === tab.id ? tab.color + '20' : 'transparent',
              border: activeTab === tab.id ? `1px solid ${tab.color}` : '1px solid #2E2E3E',
              color: activeTab === tab.id ? tab.color : '#94A3B8',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 핵심 지표 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="계약" value={contracts.length} color="#3B82F6" />
        <StatCard label="승인대기" value={pendingApproval.length} color="#F59E0B" />
        <StatCard label="Kill 대상" value={canKill.length} color="#EF4444" />
        <StatCard label="Standard" value={`${moduleTiers.standard}/${moduleTiers.total}`} color={k5Status.allowed ? '#10B981' : '#EF4444'} />
      </div>

      {/* 헌법 탭 */}
      {activeTab === 'constitution' && (
        <ConstitutionPanel engine={engine} />
      )}

      {/* 결정 탭 */}
      {activeTab === 'decision' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 좌: 정책 결정 */}
        <section>
          <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>🎯 정책 결정</h2>

          {/* 승인 대기 */}
          {pendingApproval.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#F59E0B', marginBottom: 8 }}>승인 대기 (Candidate)</div>
              {pendingApproval.map(policy => (
                <PolicyDecisionCard
                  key={policy.id}
                  policy={policy}
                  onPromote={() => { engine.forcePromote(policy.id); refresh(); }}
                  onKill={() => { engine.killPolicy(policy.id, '수동 폐기'); refresh(); }}
                />
              ))}
            </div>
          )}

          {/* Kill 추천 */}
          {canKill.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 8 }}>💀 Kill 추천 (신뢰도 낮음)</div>
              {canKill.map(policy => (
                <PolicyDecisionCard
                  key={policy.id}
                  policy={policy}
                  onKill={() => { engine.killPolicy(policy.id, '낮은 신뢰도'); refresh(); }}
                  showKillOnly
                />
              ))}
            </div>
          )}

          {pendingApproval.length === 0 && canKill.length === 0 && (
            <EmptyState text="결정할 항목이 없습니다" />
          )}
        </section>

        {/* 우: Blast Radius + Log */}
        <section>
          <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>💥 Blast Radius</h2>

          {/* 계약 선택 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {contracts.slice(0, 5).map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedContract(c);
                  if (c.state !== 'S9') {
                    const states = engine.getStates();
                    const nextStates = states[c.state]?.next || [];
                    if (nextStates.length > 0) {
                      setBlastPreview(engine.calculateBlastRadius(c.id, nextStates[0]));
                    }
                  }
                }}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: selectedContract?.id === c.id ? '#3B82F620' : '#1A1A2E',
                  border: selectedContract?.id === c.id ? '1px solid #3B82F6' : '1px solid #2E2E3E',
                  color: '#F8FAFC', fontSize: 12, cursor: 'pointer',
                }}
              >
                {c.customerId} ({c.state})
              </button>
            ))}
          </div>

          {/* Blast Radius 표시 */}
          {blastPreview && (
            <div style={{
              padding: 16, borderRadius: 12,
              background: 'linear-gradient(135deg, #EF444420, #F9731620)',
              border: '1px solid #EF444440',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                {blastPreview.from} → {blastPreview.to}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444' }}>{blastPreview.affectedCount}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>영향 계약</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{blastPreview.uniqueCustomers}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>영향 고객</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>
                    {(blastPreview.revenueImpact / 10000).toFixed(0)}만
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>매출 영향</div>
                </div>
              </div>
              <div style={{
                marginTop: 12, padding: 8, borderRadius: 6, textAlign: 'center',
                background: blastPreview.riskLevel === 'high' ? '#EF444430' : '#F59E0B30',
                fontSize: 12, fontWeight: 600,
              }}>
                리스크: {blastPreview.riskLevel.toUpperCase()}
              </div>
            </div>
          )}

          {/* Immutable Log */}
          <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📜 Immutable Log (K3 Proof 포함)</h2>
          <div style={{
            background: '#0D0D12', borderRadius: 8, padding: 12,
            maxHeight: 200, overflow: 'auto',
            fontFamily: 'monospace', fontSize: 11,
          }}>
            {logs.map(log => (
              <div key={log._id} style={{ marginBottom: 4 }}>
                <span style={{ color: '#6B7280' }}>[{log._seq}]</span>{' '}
                <span style={{ color: log._k3Valid ? '#10B981' : '#EF4444' }}>●</span>{' '}
                <span style={{ color: getLogColor(log.type) }}>{log.type}</span>{' '}
                <span style={{ color: '#94A3B8' }}>
                  {log.policyId || log.contractId || log.eventType || ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      )}
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTITUTION PANEL - 헌법 상태 표시
// ═══════════════════════════════════════════════════════════════════════════════

function ConstitutionPanel({ engine }) {
  const policies = engine.getPolicies();
  const moduleTiers = engine.getModuleTiers();
  const physicsLaws = engine.getPhysicsLaws();
  const motionTypes = engine.getMotionTypes();

  const k5Status = CONSTITUTION.K5.enforce(moduleTiers.total || 1, moduleTiers.standard);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* 좌: 5대 헌법 */}
      <section>
        <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>🏛️ 5대 헌법 (K1-K5)</h2>

        {Object.entries(CONSTITUTION).map(([key, law]) => (
          <div key={key} style={{
            padding: 12, borderRadius: 8, marginBottom: 8,
            background: '#1A1A2E', border: '1px solid #2E2E3E',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: '#8B5CF6' }}>{law.id}</span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{law.name}</span>
            </div>
            <div style={{ fontSize: 12, color: '#E2E8F0' }}>{law.rule}</div>
            {key === 'K5' && (
              <div style={{
                marginTop: 8, padding: 6, borderRadius: 4,
                background: k5Status.allowed ? '#10B98120' : '#EF444420',
                color: k5Status.allowed ? '#10B981' : '#EF4444',
                fontSize: 11, textAlign: 'center',
              }}>
                현재: {k5Status.ratio} (최대 10%)
              </div>
            )}
          </div>
        ))}

        {/* Quality Score 기준 */}
        <h2 style={{ fontSize: 14, opacity: 0.5, marginTop: 16, marginBottom: 12 }}>📊 Quality Score 기준</h2>
        <div style={{
          padding: 12, borderRadius: 8,
          background: '#1A1A2E', border: '1px solid #2E2E3E',
        }}>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>
            Q = 0.4×UserSatisfaction + 0.2×ReuseRate + 0.2×(100-FailureRate) + 0.2×OutcomeImpact
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TierBadge tier="EXPERIMENTAL" threshold={0} />
            <TierBadge tier="STABLE" threshold={60} />
            <TierBadge tier="STANDARD" threshold={85} />
          </div>
        </div>
      </section>

      {/* 우: Physics + Motion + Value */}
      <section>
        <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>⚛️ 6 Physics Laws</h2>
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 16,
          background: '#1A1A2E', border: '1px solid #2E2E3E',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {Object.entries(physicsLaws).map(([key, desc]) => (
              <div key={key} style={{
                padding: 8, borderRadius: 6, textAlign: 'center',
                background: '#0D0D12',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6' }}>{key}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>🔄 9 Motion Types</h2>
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 16,
          background: '#1A1A2E', border: '1px solid #2E2E3E',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(motionTypes).map(([key, desc]) => (
              <span key={key} style={{
                padding: '4px 8px', borderRadius: 4,
                background: '#10B98120', color: '#10B981',
                fontSize: 10, fontWeight: 600,
              }}>
                {key}
              </span>
            ))}
          </div>
        </div>

        <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>💰 자산 공식</h2>
        <div style={{
          padding: 16, borderRadius: 8,
          background: 'linear-gradient(135deg, #F59E0B20, #EF444420)',
          border: '1px solid #F59E0B40',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B', marginBottom: 8 }}>
            V = (M - T) × (1 + s)^t
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>
            M: Mint (생성) | T: Tax (소모) | s: Synergy | t: Time
          </div>
        </div>

        {/* 정책별 Quality Score */}
        <h2 style={{ fontSize: 14, opacity: 0.5, marginTop: 16, marginBottom: 12 }}>📈 정책 Quality Score</h2>
        <div style={{ maxHeight: 150, overflow: 'auto' }}>
          {policies.map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 8, borderRadius: 6, marginBottom: 4,
              background: '#0D0D12',
            }}>
              <span style={{ fontSize: 12 }}>{p.name?.slice(0, 15) || p.id}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TierBadge tier={p.tier} small />
                <span style={{
                  padding: '2px 6px', borderRadius: 4,
                  background: p.qualityScore >= 85 ? '#10B98130' :
                             p.qualityScore >= 60 ? '#F59E0B30' : '#6B728030',
                  color: p.qualityScore >= 85 ? '#10B981' :
                        p.qualityScore >= 60 ? '#F59E0B' : '#6B7280',
                  fontSize: 11, fontWeight: 600,
                }}>
                  Q:{p.qualityScore?.toFixed(0) || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TierBadge({ tier, threshold, small }) {
  const colors = {
    EXPERIMENTAL: '#6B7280',
    STABLE: '#F59E0B',
    STANDARD: '#10B981',
  };
  return (
    <span style={{
      padding: small ? '2px 6px' : '4px 10px', borderRadius: 4,
      background: colors[tier] + '20',
      color: colors[tier],
      fontSize: small ? 9 : 11, fontWeight: 600,
    }}>
      {tier} {threshold !== undefined && `≥${threshold}`}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGER VIEW - 제안한다
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerView({ engine, refresh }) {
  const [newPolicy, setNewPolicy] = useState({ name: '', trigger: 'attendance.drop', action: '' });

  const policies = engine.getPolicies();
  const outcomeTypes = engine.getOutcomeTypes();

  const handleAddPolicy = () => {
    if (!newPolicy.name || !newPolicy.action) return;
    engine.addPolicy(newPolicy);
    setNewPolicy({ name: '', trigger: 'attendance.drop', action: '' });
    refresh();
  };

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 좌: 정책 등록 */}
        <section>
          <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>➕ Shadow 정책 등록</h2>
          <div style={{
            padding: 16, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #2E2E3E',
          }}>
            <input
              placeholder="정책 이름"
              value={newPolicy.name}
              onChange={e => setNewPolicy(p => ({ ...p, name: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 8,
                background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                color: '#F8FAFC', fontSize: 13,
              }}
            />
            <select
              value={newPolicy.trigger}
              onChange={e => setNewPolicy(p => ({ ...p, trigger: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 8,
                background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                color: '#F8FAFC', fontSize: 13,
              }}
            >
              {Object.keys(outcomeTypes).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              placeholder="실행 액션"
              value={newPolicy.action}
              onChange={e => setNewPolicy(p => ({ ...p, action: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 12,
                background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                color: '#F8FAFC', fontSize: 13,
              }}
            />
            <button
              onClick={handleAddPolicy}
              style={{
                width: '100%', padding: '10px', borderRadius: 6,
                background: '#3B82F6', border: 'none',
                color: 'white', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Shadow로 등록 (Tesla 원리)
            </button>
          </div>

          <p style={{ marginTop: 12, fontSize: 11, opacity: 0.5 }}>
            * 새 정책은 항상 Shadow 모드로 시작합니다.<br/>
            * 신뢰도 70% + 20회 관찰 → Candidate<br/>
            * 신뢰도 90% + 50회 관찰 → Promoted (자동 실행)
          </p>
        </section>

        {/* 우: 정책 모니터링 */}
        <section>
          <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📊 정책 파이프라인</h2>

          {/* 모드별 통계 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['shadow', 'candidate', 'promoted', 'killed'].map(mode => (
              <div key={mode} style={{
                flex: 1, padding: 12, borderRadius: 8, textAlign: 'center',
                background: getModeColor(mode) + '20',
                border: `1px solid ${getModeColor(mode)}40`,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: getModeColor(mode) }}>
                  {policies.filter(p => p.mode === mode).length}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{getModeLabel(mode)}</div>
              </div>
            ))}
          </div>

          {/* 정책 목록 */}
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {policies.map(policy => (
              <PolicyMonitorCard key={policy.id} policy={policy} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF VIEW - 기록한다
// ═══════════════════════════════════════════════════════════════════════════════

function StaffView({ engine, refresh }) {
  const contracts = engine.getContracts();
  const outcomeTypes = engine.getOutcomeTypes();

  const handleEmit = (contractId, eventType) => {
    const contract = engine.getContract(contractId);
    engine.emitEvent(eventType, {
      contractId,
      customerId: contract.customerId,
      producerId: contract.producerId,
      slotId: contract.slotId,
    });
    refresh();
  };

  return (
    <main style={{ padding: 20 }}>
      <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📝 이벤트 기록</h2>
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
        고객 이벤트를 기록하면 OutcomeFact가 생성되고, 정책이 자동 매칭됩니다. (Amazon 원리)
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        {contracts.map(contract => {
          const vv = engine.calculateVV(contract.id);
          return (
            <div key={contract.id} style={{
              padding: 16, borderRadius: 12,
              background: '#1A1A2E', border: '1px solid #2E2E3E',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{contract.customerId}</div>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>
                    {contract.producerId} · {contract.slotId} · {contract.state}
                  </div>
                </div>
                <VVBadge vv={vv} />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(outcomeTypes).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => handleEmit(contract.id, type)}
                    style={{
                      padding: '6px 10px', borderRadius: 6,
                      background: getTierColor(info.tier) + '20',
                      border: `1px solid ${getTierColor(info.tier)}40`,
                      color: getTierColor(info.tier),
                      fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    {type.split('.')[1]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER VIEW - 응답한다
// ═══════════════════════════════════════════════════════════════════════════════

function CustomerView({ engine, refresh }) {
  const contracts = engine.getContracts();
  const myContract = contracts[0]; // 데모: 첫 번째 계약

  if (!myContract) {
    return <EmptyState text="등록된 계약이 없습니다" />;
  }

  const vv = engine.calculateVV(myContract.id);

  // 선택지 기반 응답 (No Free Text 원리)
  const responseOptions = [
    { label: '확인했습니다', action: 'ack' },
    { label: '보강 원합니다', action: 'request_makeup' },
    { label: '전화 부탁드립니다', action: 'request_call' },
  ];

  const handleResponse = (action) => {
    engine.emitEvent('notification.read', {
      contractId: myContract.id,
      customerId: myContract.customerId,
      response: action,
    });
    refresh();
  };

  return (
    <main style={{ padding: 20 }}>
      {/* 내 아이 상태 */}
      <div style={{
        padding: 20, borderRadius: 16,
        background: 'linear-gradient(135deg, #3B82F620, #8B5CF620)',
        border: '1px solid #3B82F640',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>내 아이</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{myContract.customerId}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>상태</div>
            <div style={{ fontWeight: 600 }}>{myContract.state}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>VV</div>
            <VVBadge vv={vv} />
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>코치</div>
            <div style={{ fontWeight: 600 }}>{myContract.producerId}</div>
          </div>
        </div>
      </div>

      {/* 응답 선택지 (No Free Text) */}
      <h2 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📩 알림 응답</h2>
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
        선택지를 눌러 응답하세요. (자유 입력 없음 - Palantir 원리)
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {responseOptions.map(opt => (
          <button
            key={opt.action}
            onClick={() => handleResponse(opt.action)}
            style={{
              padding: '16px 20px', borderRadius: 12,
              background: '#1A1A2E', border: '1px solid #2E2E3E',
              color: '#F8FAFC', fontSize: 14, cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, color }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12, textAlign: 'center',
      background: color + '10', border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.6 }}>{label}</div>
    </div>
  );
}

function PolicyDecisionCard({ policy, onPromote, onKill, showKillOnly }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8, marginBottom: 8,
      background: getModeColor(policy.mode) + '10',
      border: `1px solid ${getModeColor(policy.mode)}30`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{policy.name}</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>
            신뢰도: {(policy.confidence * 100).toFixed(0)}% · 관찰: {policy.observationCount}회
          </div>
        </div>
        <ModeBadge mode={policy.mode} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!showKillOnly && onPromote && (
          <button
            onClick={onPromote}
            style={{
              flex: 1, padding: '8px', borderRadius: 6,
              background: '#10B981', border: 'none',
              color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ⬆️ 승격
          </button>
        )}
        <button
          onClick={onKill}
          style={{
            flex: 1, padding: '8px', borderRadius: 6,
            background: '#EF4444', border: 'none',
            color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          💀 Kill
        </button>
      </div>
    </div>
  );
}

function PolicyMonitorCard({ policy }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8, marginBottom: 8,
      background: '#0D0D12', border: '1px solid #2E2E3E',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{policy.name}</div>
        <ModeBadge mode={policy.mode} />
      </div>
      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>
        트리거: {policy.trigger} → {policy.action}
      </div>
      {/* Confidence Bar */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
          <span>신뢰도</span>
          <span>{(policy.confidence * 100).toFixed(0)}%</span>
        </div>
        <div style={{ height: 4, background: '#2E2E3E', borderRadius: 2 }}>
          <div style={{
            width: `${policy.confidence * 100}%`,
            height: '100%', borderRadius: 2,
            background: policy.confidence >= 0.9 ? '#10B981' :
                       policy.confidence >= 0.7 ? '#F59E0B' : '#6B7280',
          }} />
        </div>
      </div>
      <div style={{ fontSize: 10, opacity: 0.5 }}>
        관찰: {policy.observationCount}회 · 정확: {policy.correctCount}회
      </div>
    </div>
  );
}

function ModeBadge({ mode }) {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 4,
      background: getModeColor(mode) + '30',
      color: getModeColor(mode),
      fontSize: 10, fontWeight: 600,
    }}>
      {getModeLabel(mode)}
    </span>
  );
}

function VVBadge({ vv }) {
  const color = vv.status === 'green' ? '#10B981' :
               vv.status === 'yellow' ? '#F59E0B' :
               vv.status === 'red' ? '#EF4444' : '#6B7280';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 4,
      background: color + '20',
      color: color,
      fontSize: 11, fontWeight: 600,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {vv.value !== null ? vv.value.toFixed(2) : 'N/A'}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{
      padding: 40, textAlign: 'center',
      background: '#1A1A2E', borderRadius: 12,
      border: '1px dashed #2E2E3E',
    }}>
      <div style={{ opacity: 0.4 }}>{text}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getRoleLabel(role) {
  return { owner: '원장', manager: '관리자', staff: '코치', customer: '학부모' }[role] || role;
}

function getModeColor(mode) {
  return { shadow: '#6B7280', candidate: '#F59E0B', promoted: '#10B981', killed: '#EF4444' }[mode] || '#6B7280';
}

function getModeLabel(mode) {
  return { shadow: '섀도우', candidate: '후보', promoted: '승격', killed: '폐기' }[mode] || mode;
}

function getTierColor(tier) {
  return { S: '#EF4444', A: '#F59E0B', Terminal: '#6B7280' }[tier] || '#6B7280';
}

function getLogColor(type) {
  if (type.includes('KILLED')) return '#EF4444';
  if (type.includes('PROMOTED')) return '#10B981';
  if (type.includes('OUTCOME')) return '#F59E0B';
  if (type.includes('TRANSITION')) return '#3B82F6';
  return '#6B7280';
}
