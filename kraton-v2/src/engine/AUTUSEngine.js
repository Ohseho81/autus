/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS ENGINE - 핵심 가치 엔진
 *
 * 흉내가 아닌 실제 동작하는 엔진
 *
 * Amazon: 고객 이벤트 → OutcomeFact → 프로세스 자동 생성
 * Tesla:  Shadow 관찰 → 신뢰도 축적 → 자동 Promotion
 * Palantir: 상태 전이 → Blast Radius 계산 → Immutable Log
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. IMMUTABLE LOG (Palantir 핵심)
// ═══════════════════════════════════════════════════════════════════════════════

class ImmutableLog {
  constructor() {
    this._log = [];
    this._sealed = new WeakSet(); // 봉인된 엔트리 추적
  }

  append(entry) {
    const sealed = Object.freeze({
      ...entry,
      _id: crypto.randomUUID(),
      _ts: Date.now(),
      _seq: this._log.length,
    });
    this._sealed.add(sealed);
    this._log.push(sealed);
    return sealed;
  }

  // 수정/삭제 불가 - 조회만 가능
  query(filter = {}) {
    return this._log.filter(entry => {
      return Object.entries(filter).every(([key, value]) => entry[key] === value);
    });
  }

  getAll() {
    return [...this._log]; // 복사본 반환
  }

  getBySeq(seq) {
    return this._log[seq];
  }

  get length() {
    return this._log.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. OUTCOME FACT (Amazon 핵심 - 고객 이벤트가 사실로 변환)
// ═══════════════════════════════════════════════════════════════════════════════

const OUTCOME_TIERS = {
  S: { priority: 1, autoProcess: true, ttlHours: 48 },    // 즉시 프로세스 생성
  A: { priority: 2, autoProcess: false, ttlHours: 168 },  // 모니터링
  Terminal: { priority: 0, autoProcess: true, ttlHours: 0 }, // 종료 상태
};

const OUTCOME_TYPES = {
  // S-Tier: 즉시 대응 필요
  'attendance.drop': { tier: 'S', weight: -1.0, generates: ['reassign_coach', 'apply_makeup', 'reduce_capacity'] },
  'renewal.failed': { tier: 'S', weight: -1.5, generates: ['notify_parent', 'apply_discount', 'change_timeslot'] },
  'notification.ignored': { tier: 'S', weight: -0.5, generates: ['change_channel', 'reduce_frequency'] },
  'payment.failed': { tier: 'S', weight: -2.0, generates: ['retry_payment', 'suspend_contract'] },
  'complaint.received': { tier: 'S', weight: -1.0, generates: ['escalate', 'compensate', 'investigate'] },

  // A-Tier: 모니터링
  'attendance.normal': { tier: 'A', weight: 0.5, generates: [] },
  'renewal.succeeded': { tier: 'A', weight: 1.0, generates: [] },
  'notification.read': { tier: 'A', weight: 0.2, generates: [] },
  'feedback.positive': { tier: 'A', weight: 0.8, generates: [] },

  // Terminal: 종료
  'churn.finalized': { tier: 'Terminal', weight: -3.0, generates: ['close_contract', 'archive'] },
  'contract.expired': { tier: 'Terminal', weight: 0, generates: ['archive'] },
};

class OutcomeFactEngine {
  constructor(log) {
    this.log = log;
    this.subscribers = [];
  }

  // 이벤트를 OutcomeFact로 변환
  createFact(eventType, context) {
    const typeInfo = OUTCOME_TYPES[eventType];
    if (!typeInfo) {
      throw new Error(`Unknown outcome type: ${eventType}`);
    }

    const fact = this.log.append({
      type: 'OUTCOME_FACT',
      eventType,
      tier: typeInfo.tier,
      weight: typeInfo.weight,
      context,
      generates: typeInfo.generates,
      processedBy: [],
    });

    // 구독자에게 알림
    this.notify(fact);

    return fact;
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify(fact) {
    this.subscribers.forEach(cb => cb(fact));
  }

  // VV (Velocity of Value) 계산 - 7일 윈도우
  calculateVV(contractId, windowDays = 7) {
    const cutoff = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
    const facts = this.log.query({ type: 'OUTCOME_FACT' })
      .filter(f => f.context?.contractId === contractId && f._ts >= cutoff);

    if (facts.length < 10) {
      return { value: null, status: 'gray', samples: facts.length };
    }

    const sum = facts.reduce((acc, f) => acc + (f.weight || 0), 0);
    const value = sum / facts.length;

    let status;
    if (value >= 0.5) status = 'green';
    else if (value >= -0.2) status = 'yellow';
    else status = 'red';

    return { value, status, samples: facts.length };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. POLICY ENGINE (Tesla FSD 핵심 - Shadow → Promotion)
// ═══════════════════════════════════════════════════════════════════════════════

const POLICY_MODES = {
  shadow: { execute: false, observe: true },
  candidate: { execute: false, observe: true },
  promoted: { execute: true, observe: true },
  killed: { execute: false, observe: false },
};

class PolicyEngine {
  constructor(log) {
    this.log = log;
    this.policies = new Map();
    this.observations = new Map(); // policyId → observations[]
  }

  // 정책 등록
  register(policy) {
    const registered = {
      ...policy,
      id: policy.id || crypto.randomUUID(),
      mode: policy.mode || 'shadow',
      confidence: 0,
      observationCount: 0,
      correctPredictions: 0,
      createdAt: Date.now(),
    };
    this.policies.set(registered.id, registered);
    this.observations.set(registered.id, []);

    this.log.append({
      type: 'POLICY_REGISTERED',
      policyId: registered.id,
      trigger: policy.trigger,
      action: policy.action,
      mode: registered.mode,
    });

    return registered;
  }

  // OutcomeFact에 반응
  onOutcomeFact(fact) {
    const matchedPolicies = Array.from(this.policies.values())
      .filter(p => p.trigger === fact.eventType && p.mode !== 'killed');

    matchedPolicies.forEach(policy => {
      if (policy.mode === 'promoted') {
        this.execute(policy, fact);
      } else {
        this.observe(policy, fact);
      }
    });

    return matchedPolicies;
  }

  // Shadow 관찰 (Tesla 핵심)
  observe(policy, fact) {
    const prediction = this.predict(policy, fact);
    const observation = {
      factId: fact._id,
      prediction,
      predictedAt: Date.now(),
      actual: null, // 나중에 채워짐
      correct: null,
    };

    this.observations.get(policy.id).push(observation);
    policy.observationCount++;

    this.log.append({
      type: 'POLICY_OBSERVED',
      policyId: policy.id,
      factId: fact._id,
      prediction,
      mode: policy.mode,
    });

    // 신뢰도 재계산
    this.recalculateConfidence(policy);

    // 자동 승격 체크
    this.checkPromotion(policy);

    return observation;
  }

  // 예측 (단순 규칙 기반)
  predict(policy, fact) {
    // 실제로는 ML 모델 또는 규칙 엔진
    return {
      action: policy.action,
      expectedOutcome: policy.expectedOutcome || 'positive',
      confidence: policy.confidence,
    };
  }

  // 실제 결과 기록 (나중에 호출됨)
  recordActual(policyId, factId, actualOutcome) {
    const observations = this.observations.get(policyId);
    const obs = observations?.find(o => o.factId === factId);
    if (obs) {
      obs.actual = actualOutcome;
      obs.correct = obs.prediction.expectedOutcome === actualOutcome;

      const policy = this.policies.get(policyId);
      if (obs.correct) {
        policy.correctPredictions++;
      }

      this.recalculateConfidence(policy);
      this.checkPromotion(policy);
    }
  }

  // 신뢰도 계산 (Tesla 핵심)
  recalculateConfidence(policy) {
    const observations = this.observations.get(policy.id);
    const evaluated = observations.filter(o => o.actual !== null);

    if (evaluated.length === 0) {
      policy.confidence = 0;
      return;
    }

    const correct = evaluated.filter(o => o.correct).length;
    policy.confidence = correct / evaluated.length;
  }

  // 자동 승격 (Tesla 핵심)
  checkPromotion(policy) {
    const PROMOTION_THRESHOLD = 0.9;
    const MIN_OBSERVATIONS = 50;
    const CANDIDATE_THRESHOLD = 0.7;
    const MIN_CANDIDATE_OBS = 20;

    if (policy.mode === 'shadow') {
      if (policy.confidence >= CANDIDATE_THRESHOLD && policy.observationCount >= MIN_CANDIDATE_OBS) {
        this.promote(policy.id, 'candidate');
      }
    } else if (policy.mode === 'candidate') {
      if (policy.confidence >= PROMOTION_THRESHOLD && policy.observationCount >= MIN_OBSERVATIONS) {
        this.promote(policy.id, 'promoted');
      }
    }
  }

  // 승격
  promote(policyId, newMode) {
    const policy = this.policies.get(policyId);
    const oldMode = policy.mode;
    policy.mode = newMode;
    policy.promotedAt = Date.now();

    this.log.append({
      type: 'POLICY_PROMOTED',
      policyId,
      from: oldMode,
      to: newMode,
      confidence: policy.confidence,
      observations: policy.observationCount,
    });

    return policy;
  }

  // Kill Switch (Amazon 핵심)
  kill(policyId, reason) {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    policy.mode = 'killed';
    policy.killedAt = Date.now();
    policy.killReason = reason;

    this.log.append({
      type: 'POLICY_KILLED',
      policyId,
      reason,
      confidence: policy.confidence,
      observations: policy.observationCount,
    });

    return policy;
  }

  // 정책 실행
  execute(policy, fact) {
    this.log.append({
      type: 'POLICY_EXECUTED',
      policyId: policy.id,
      factId: fact._id,
      action: policy.action,
      context: fact.context,
    });

    // 실제 실행 로직은 외부에서 처리
    return {
      policyId: policy.id,
      action: policy.action,
      executed: true,
    };
  }

  getPolicy(id) {
    return this.policies.get(id);
  }

  getAllPolicies() {
    return Array.from(this.policies.values());
  }

  getPoliciesByMode(mode) {
    return this.getAllPolicies().filter(p => p.mode === mode);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STATE MACHINE (Palantir 핵심 - 상태 전이 + Blast Radius)
// ═══════════════════════════════════════════════════════════════════════════════

const STATES = {
  S0: { name: 'idle', allowedTransitions: ['S1'] },
  S1: { name: 'intake', allowedTransitions: ['S2', 'S9'] },
  S2: { name: 'eligible', allowedTransitions: ['S3', 'S4'] },
  S3: { name: 'approval', allowedTransitions: ['S4', 'S1'] },
  S4: { name: 'intervention', allowedTransitions: ['S5'] },
  S5: { name: 'monitor', allowedTransitions: ['S6', 'S7', 'S9'] },
  S6: { name: 'stable', allowedTransitions: ['S0', 'S1'] },
  S7: { name: 'shadow', allowedTransitions: ['S5', 'S8'] },
  S8: { name: 'liability', allowedTransitions: ['S9'] },
  S9: { name: 'closed', allowedTransitions: [] },
};

class StateMachine {
  constructor(log, contractStore) {
    this.log = log;
    this.contractStore = contractStore; // 계약 저장소 참조
  }

  // 전이 가능 여부 확인
  canTransition(fromState, toState) {
    const state = STATES[fromState];
    return state && state.allowedTransitions.includes(toState);
  }

  // Blast Radius 계산 (Palantir 핵심)
  calculateBlastRadius(contractId, newState) {
    const contract = this.contractStore.get(contractId);
    if (!contract) return null;

    // 같은 시간대의 다른 계약들
    const sameSlot = this.contractStore.getBySlot(contract.slotId);

    // 같은 강사의 다른 계약들
    const sameProducer = this.contractStore.getByProducer(contract.producerId);

    // 같은 고객의 다른 계약들
    const sameCustomer = this.contractStore.getByCustomer(contract.customerId);

    // 영향받는 고유 계약들
    const affected = new Set([...sameSlot, ...sameProducer]);
    affected.delete(contractId);

    // 매출 영향 계산
    const revenueImpact = Array.from(affected)
      .map(id => this.contractStore.get(id))
      .reduce((sum, c) => sum + (c?.monthlyValue || 0), 0);

    // 상태별 영향도 가중치
    const stateWeight = {
      S4: 1.5,  // 개입 상태는 영향 크게
      S5: 1.2,  // 모니터링도 영향 있음
      S6: 0.5,  // 안정은 영향 적음
      S9: 2.0,  // 종료는 영향 큼
    };

    return {
      contractId,
      transition: { from: contract.state, to: newState },
      affectedContracts: Array.from(affected),
      affectedCount: affected.size,
      uniqueCustomers: new Set(
        Array.from(affected).map(id => this.contractStore.get(id)?.customerId)
      ).size,
      revenueImpact: revenueImpact * (stateWeight[newState] || 1),
      riskLevel: affected.size > 10 ? 'high' : affected.size > 5 ? 'medium' : 'low',
    };
  }

  // 상태 전이 실행
  transition(contractId, newState, actor, reason) {
    const contract = this.contractStore.get(contractId);
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    const fromState = contract.state;
    if (!this.canTransition(fromState, newState)) {
      throw new Error(`Invalid transition: ${fromState} → ${newState}`);
    }

    // Blast Radius 계산
    const blastRadius = this.calculateBlastRadius(contractId, newState);

    // 전이 실행
    contract.state = newState;
    contract.stateHistory = contract.stateHistory || [];
    contract.stateHistory.push({
      from: fromState,
      to: newState,
      at: Date.now(),
      actor,
      reason,
    });

    // 불변 로그에 기록
    this.log.append({
      type: 'STATE_TRANSITION',
      contractId,
      from: fromState,
      to: newState,
      actor,
      reason,
      blastRadius: {
        affectedCount: blastRadius.affectedCount,
        revenueImpact: blastRadius.revenueImpact,
        riskLevel: blastRadius.riskLevel,
      },
    });

    return { contract, blastRadius };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CONTRACT STORE (인메모리 계약 저장소)
// ═══════════════════════════════════════════════════════════════════════════════

class ContractStore {
  constructor() {
    this.contracts = new Map();
    this.bySlot = new Map();      // slotId → contractIds[]
    this.byProducer = new Map();  // producerId → contractIds[]
    this.byCustomer = new Map();  // customerId → contractIds[]
  }

  add(contract) {
    const id = contract.id || crypto.randomUUID();
    const stored = { ...contract, id, state: contract.state || 'S0' };

    this.contracts.set(id, stored);

    // 인덱스 업데이트
    this._addToIndex(this.bySlot, stored.slotId, id);
    this._addToIndex(this.byProducer, stored.producerId, id);
    this._addToIndex(this.byCustomer, stored.customerId, id);

    return stored;
  }

  _addToIndex(index, key, id) {
    if (!key) return;
    if (!index.has(key)) {
      index.set(key, []);
    }
    index.get(key).push(id);
  }

  get(id) {
    return this.contracts.get(id);
  }

  getBySlot(slotId) {
    return this.bySlot.get(slotId) || [];
  }

  getByProducer(producerId) {
    return this.byProducer.get(producerId) || [];
  }

  getByCustomer(customerId) {
    return this.byCustomer.get(customerId) || [];
  }

  getAll() {
    return Array.from(this.contracts.values());
  }

  getByState(state) {
    return this.getAll().filter(c => c.state === state);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AUTUS ENGINE (통합 엔진)
// ═══════════════════════════════════════════════════════════════════════════════

class AUTUSEngine {
  constructor() {
    this.log = new ImmutableLog();
    this.contracts = new ContractStore();
    this.outcomeFacts = new OutcomeFactEngine(this.log);
    this.policies = new PolicyEngine(this.log);
    this.stateMachine = new StateMachine(this.log, this.contracts);

    // OutcomeFact → Policy 연결
    this.outcomeFacts.subscribe(fact => {
      this.policies.onOutcomeFact(fact);
      this._checkStateTransitions(fact);
    });

    this.log.append({
      type: 'ENGINE_INITIALIZED',
      version: '1.0.0',
    });
  }

  // S-Tier OutcomeFact → 자동 상태 전이
  _checkStateTransitions(fact) {
    if (fact.tier !== 'S') return;

    const contractId = fact.context?.contractId;
    if (!contractId) return;

    const contract = this.contracts.get(contractId);
    if (!contract) return;

    // S-Tier 발생 시 intake(S1) 상태로 전이
    if (['S0', 'S5', 'S6'].includes(contract.state)) {
      try {
        this.stateMachine.transition(contractId, 'S1', 'system', `S-Tier Trigger: ${fact.eventType}`);
      } catch (e) {
        console.error('Auto transition failed:', e.message);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  // 계약 생성
  createContract(data) {
    return this.contracts.add(data);
  }

  // 이벤트 발생 (Amazon: Customer Event → OutcomeFact)
  emitEvent(eventType, context) {
    return this.outcomeFacts.createFact(eventType, context);
  }

  // 정책 등록 (Tesla: Shadow Policy)
  registerPolicy(policy) {
    return this.policies.register(policy);
  }

  // 정책 Kill (Amazon: Kill Culture)
  killPolicy(policyId, reason) {
    return this.policies.kill(policyId, reason);
  }

  // 상태 전이 (Palantir: State Transition)
  transitionState(contractId, newState, actor, reason) {
    return this.stateMachine.transition(contractId, newState, actor, reason);
  }

  // Blast Radius 미리보기
  previewBlastRadius(contractId, newState) {
    return this.stateMachine.calculateBlastRadius(contractId, newState);
  }

  // VV 계산
  getVV(contractId) {
    return this.outcomeFacts.calculateVV(contractId);
  }

  // 로그 조회
  getLogs(filter) {
    return this.log.query(filter);
  }

  // 전체 상태 스냅샷
  getSnapshot() {
    return {
      contracts: this.contracts.getAll(),
      policies: this.policies.getAllPolicies(),
      logs: this.log.getAll(),
      stats: {
        totalContracts: this.contracts.getAll().length,
        policiesByMode: {
          shadow: this.policies.getPoliciesByMode('shadow').length,
          candidate: this.policies.getPoliciesByMode('candidate').length,
          promoted: this.policies.getPoliciesByMode('promoted').length,
          killed: this.policies.getPoliciesByMode('killed').length,
        },
        totalLogs: this.log.length,
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  AUTUSEngine,
  ImmutableLog,
  OutcomeFactEngine,
  PolicyEngine,
  StateMachine,
  ContractStore,
  OUTCOME_TYPES,
  STATES,
  POLICY_MODES,
};

export default AUTUSEngine;
