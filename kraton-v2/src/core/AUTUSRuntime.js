/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Runtime - 통합 런타임
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 모든 엔진을 연결하고 실제로 동작하게 하는 런타임
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        AUTUS Runtime                            │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  EventBus (통신) ←→ ConstitutionEnforcer (검증)                 │
 * │       ↓                                                         │
 * │  PainSignalEngine (분류) → VFactoryEngine (V 추적)              │
 * │       ↓                                                         │
 * │  Persistence (저장) ←→ Supabase/LocalStorage                    │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { EventBus, EventTypes } from './EventBus.js';
import { Persistence } from './Persistence.js';
import { ConstitutionEnforcer, CONSTITUTION } from './ConstitutionEnforcer.js';
import { VFactory, PHYSICS, createVFactory } from './VFactoryEngine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Pain Signal Engine (Inline - 학습형)
// ═══════════════════════════════════════════════════════════════════════════════

const PainSignalProcessor = {
  // 학습 가능한 가중치
  weights: {
    keywords: {
      // 높은 V 연관 키워드
      '환불': 0.8, '결제': 0.75, '취소': 0.7, '오류': 0.65, '안됨': 0.6,
      '급함': 0.55, '문제': 0.5, '실패': 0.5, '불만': 0.45,
      // 낮은 V 연관 키워드
      '문의': 0.3, '질문': 0.25, '궁금': 0.2, '어떻게': 0.15,
    },
    userHistory: new Map(), // userId -> { vCreated, totalInputs }
  },

  // 분류 임계값
  thresholds: {
    pain: 0.65,      // 이상이면 PAIN
    request: 0.30,   // 이상이면 REQUEST
    // 미만이면 NOISE
  },

  // 통계
  stats: {
    total: 0,
    pain: 0,
    request: 0,
    noise: 0,
    vCreated: 0,
    lastAdjustment: null,
  },

  /**
   * Pain Signal 분류
   */
  classify(input, userId = null) {
    this.stats.total++;

    let score = 0.3; // 기본 점수

    // 1. 키워드 분석
    const text = (input.text || input.message || '').toLowerCase();
    for (const [keyword, weight] of Object.entries(this.weights.keywords)) {
      if (text.includes(keyword)) {
        score += weight * 0.3; // 키워드당 최대 30% 영향
      }
    }

    // 2. 사용자 이력 반영
    if (userId && this.weights.userHistory.has(userId)) {
      const history = this.weights.userHistory.get(userId);
      const userVRate = history.vCreated / (history.totalInputs || 1);
      score += userVRate * 0.2; // 사용자 V 생성률 반영
    }

    // 3. 긴급도 반영
    if (input.urgent || input.priority === 'high') {
      score += 0.15;
    }

    // 4. 금액 관련 반영
    if (input.amount && input.amount > 10000) {
      score += Math.min(0.2, input.amount / 1000000); // 최대 20%
    }

    // 정규화
    score = Math.max(0, Math.min(1, score));

    // 분류
    let classification;
    if (score >= this.thresholds.pain) {
      classification = 'PAIN';
      this.stats.pain++;
    } else if (score >= this.thresholds.request) {
      classification = 'REQUEST';
      this.stats.request++;
    } else {
      classification = 'NOISE';
      this.stats.noise++;
    }

    const result = {
      id: `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input,
      userId,
      score,
      classification,
      timestamp: Date.now(),
      classified: true, // K2 준수
    };

    // 사용자 이력 업데이트
    if (userId) {
      if (!this.weights.userHistory.has(userId)) {
        this.weights.userHistory.set(userId, { vCreated: 0, totalInputs: 0 });
      }
      this.weights.userHistory.get(userId).totalInputs++;
    }

    return result;
  },

  /**
   * V 생성 피드백 (학습)
   */
  recordVCreation(signalId, vAmount, userId = null) {
    this.stats.vCreated += vAmount;

    // 사용자 이력 업데이트
    if (userId && this.weights.userHistory.has(userId)) {
      this.weights.userHistory.get(userId).vCreated += vAmount;
    }

    // 90% 필터 목표 자동 조정
    this._adjustThresholds();
  },

  /**
   * 임계값 자동 조정 (90% 필터 목표)
   */
  _adjustThresholds() {
    const total = this.stats.total;
    if (total < 100) return; // 최소 100건 이후 조정

    const noiseRate = this.stats.noise / total;
    const targetNoiseRate = CONSTITUTION.PAIN_SIGNAL.FILTER_TARGET; // 90%

    // 노이즈 비율이 목표보다 낮으면 임계값 상향
    if (noiseRate < targetNoiseRate - 0.05) {
      this.thresholds.pain = Math.min(0.85, this.thresholds.pain + 0.02);
      this.thresholds.request = Math.min(0.50, this.thresholds.request + 0.01);
    }
    // 노이즈 비율이 목표보다 높으면 임계값 하향
    else if (noiseRate > targetNoiseRate + 0.05) {
      this.thresholds.pain = Math.max(0.50, this.thresholds.pain - 0.02);
      this.thresholds.request = Math.max(0.20, this.thresholds.request - 0.01);
    }

    this.stats.lastAdjustment = Date.now();
  },

  getStats() {
    return {
      ...this.stats,
      thresholds: { ...this.thresholds },
      noiseRate: this.stats.total > 0
        ? ((this.stats.noise / this.stats.total) * 100).toFixed(1) + '%'
        : 'N/A',
      filterTarget: (CONSTITUTION.PAIN_SIGNAL.FILTER_TARGET * 100) + '%',
    };
  },

  /**
   * 상태 저장/복원
   */
  toJSON() {
    return {
      weights: {
        keywords: this.weights.keywords,
        userHistory: Array.from(this.weights.userHistory.entries()),
      },
      thresholds: this.thresholds,
      stats: this.stats,
    };
  },

  fromJSON(data) {
    if (data.weights) {
      this.weights.keywords = { ...this.weights.keywords, ...data.weights.keywords };
      if (data.weights.userHistory) {
        this.weights.userHistory = new Map(data.weights.userHistory);
      }
    }
    if (data.thresholds) {
      this.thresholds = { ...this.thresholds, ...data.thresholds };
    }
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Runtime Class
// ═══════════════════════════════════════════════════════════════════════════════

class AUTUSRuntimeClass {
  constructor() {
    this.vFactory = null;
    this.isRunning = false;
    this.startTime = null;

    // 실시간 메트릭
    this.metrics = {
      eventsProcessed: 0,
      vCreated: 0,
      painSignals: { pain: 0, request: 0, noise: 0 },
      constitutionViolations: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────────

  async init(config = {}) {
    if (this.isRunning) {
      console.warn('[Runtime] Already running');
      return this;
    }

    console.log('[Runtime] Initializing AUTUS...');

    // 1. Persistence 초기화
    await Persistence.init();

    // 2. 저장된 상태 복원
    await this._restoreState();

    // 3. V-Factory 초기화
    this.vFactory = createVFactory({
      name: config.appName || '온리쌤',
      industry: config.industry || 'education',
      vTarget: config.vTarget || { monthly: 10000000, margin: 0.3 },
    });

    // 4. Constitution Enforcer 초기화 (모든 이벤트 검증)
    await ConstitutionEnforcer.init();

    // 5. 이벤트 핸들러 등록
    this._registerEventHandlers();

    // 6. 자동 저장 타이머
    this._startAutoSave();

    this.isRunning = true;
    this.startTime = Date.now();

    console.log('[Runtime] AUTUS initialized successfully');
    EventBus.emit(EventTypes.SYSTEM_READY, { module: 'runtime' });

    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  _registerEventHandlers() {
    console.log('[Runtime] Registering event handlers...');

    // 사용자 입력 → Pain Signal 분류
    EventBus.on(EventTypes.USER_INPUT, async (event) => {
      console.log('[Runtime] USER_INPUT event received:', event);

      const classification = PainSignalProcessor.classify(
        event.payload,
        event.payload.userId
      );

      console.log('[Runtime] Classification result:', classification);

      // 분류 결과 이벤트 발행
      await EventBus.emit(EventTypes.PAIN_CLASSIFIED, {
        original: event.payload,
        ...classification,
      });

      this.metrics.painSignals[classification.classification.toLowerCase()]++;
      this.metrics.eventsProcessed++;

      return classification;
    });

    // Pain Signal 분류 완료 → 라우팅
    EventBus.on(EventTypes.PAIN_CLASSIFIED, async (event) => {
      const { classification, score, input, userId } = event.payload;

      if (classification === 'PAIN') {
        // Producer에게 전달
        await this._routeToPain(event.payload);
      } else if (classification === 'REQUEST') {
        // Manager에게 전달
        await this._routeToRequest(event.payload);
      }
      // NOISE는 기록만 하고 폐기
    });

    // V 생성 이벤트
    EventBus.on(EventTypes.V_CREATED, async (event) => {
      const { amount, roleId, memberId, source } = event.payload;

      // V-Factory에 기록
      this.vFactory.trackVContribution({
        id: event.id,
        type: 'V_CREATION',
        roleId,
        memberId,
        inputValue: amount,
        action: source,
        isPainResolution: event.payload.fromPain || false,
      });

      // Pain Signal 학습
      if (event.payload.signalId) {
        PainSignalProcessor.recordVCreation(
          event.payload.signalId,
          amount,
          event.payload.userId
        );
      }

      this.metrics.vCreated += amount;
      this.metrics.eventsProcessed++;

      // 영속성 저장
      await Persistence.appendLog('v_creation', {
        ...event.payload,
        timestamp: Date.now(),
      });
    });

    // 헌법 위반 이벤트
    EventBus.on(EventTypes.CONSTITUTION_VIOLATION, async (event) => {
      this.metrics.constitutionViolations++;

      await Persistence.appendLog('violations', {
        ...event.payload,
        timestamp: Date.now(),
      });

      console.warn('[Runtime] Constitution violation:', event.payload.violation);
    });

    // 승인 요청
    EventBus.on(EventTypes.APPROVAL_REQUIRED, async (event) => {
      await Persistence.save('approval_queue', {
        ...event.payload,
        status: 'pending',
        requestedAt: Date.now(),
      });
    });

    // 승인 완료
    EventBus.on(EventTypes.APPROVAL_GRANTED, async (event) => {
      const approval = await Persistence.loadOne('approval_queue', event.payload.approvalId);
      if (approval) {
        approval.status = 'approved';
        approval.approvedAt = Date.now();
        approval.approvedBy = event.payload.approvedBy;
        await Persistence.save('approval_queue', approval);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Routing
  // ─────────────────────────────────────────────────────────────────────────────

  async _routeToPain(signal) {
    console.log('[Runtime] Routing to PAIN queue:', signal);

    // PAIN → producer 역할에게 할당
    const saved = await Persistence.save('pain_queue', {
      ...signal,
      assignedTo: 'producer',
      status: 'pending',
      createdAt: Date.now(),
    });

    console.log('[Runtime] Saved to PAIN queue:', saved);
  }

  async _routeToRequest(signal) {
    // REQUEST → manager 역할에게 할당
    await Persistence.save('request_queue', {
      ...signal,
      assignedTo: 'manager',
      status: 'pending',
      createdAt: Date.now(),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // State Persistence
  // ─────────────────────────────────────────────────────────────────────────────

  async _restoreState() {
    try {
      const savedState = await Persistence.load('runtime_state');
      if (savedState.length > 0) {
        const state = savedState[0];

        // Pain Signal 상태 복원
        if (state.painSignal) {
          PainSignalProcessor.fromJSON(state.painSignal);
        }

        // 메트릭 복원
        if (state.metrics) {
          this.metrics = { ...this.metrics, ...state.metrics };
        }

        console.log('[Runtime] State restored');
      }
    } catch (error) {
      console.warn('[Runtime] No saved state found');
    }
  }

  async _saveState() {
    await Persistence.save('runtime_state', {
      _id: 'main',
      painSignal: PainSignalProcessor.toJSON(),
      metrics: this.metrics,
      savedAt: Date.now(),
    });
  }

  _startAutoSave() {
    // 5분마다 자동 저장
    setInterval(() => this._saveState(), 5 * 60 * 1000);

    // 페이지 종료 시 저장
    window.addEventListener('beforeunload', () => this._saveState());
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 사용자 입력 처리 (메인 진입점)
   */
  async processInput(input, userId = null) {
    console.log('[Runtime] processInput called:', input, userId);

    // K2 준수: 직접 실행 아님, 분류 필요
    const result = await EventBus.emit(EventTypes.USER_INPUT, {
      ...input,
      userId,
      source: 'user',
      executeDirectly: false,
      requiresClassification: true,
    });

    console.log('[Runtime] processInput result:', result);
    return result;
  }

  /**
   * V 생성 기록
   */
  async recordV(amount, options = {}) {
    return EventBus.emit(EventTypes.V_CREATED, {
      amount,
      roleId: options.roleId || 'system',
      memberId: options.memberId,
      source: options.source || 'manual',
      signalId: options.signalId,
      userId: options.userId,
      fromPain: options.fromPain || false,
      proof: options.proof || { type: 'manual_entry', timestamp: Date.now() },
    });
  }

  /**
   * 승인 요청
   */
  async requestApproval(action, options = {}) {
    return EventBus.emit(EventTypes.APPROVAL_REQUIRED, {
      action,
      requestedBy: options.requestedBy,
      reason: options.reason,
      priority: options.priority || 'normal',
    });
  }

  /**
   * 대시보드 데이터
   */
  getDashboardData() {
    return {
      runtime: {
        isRunning: this.isRunning,
        uptime: this.startTime ? Date.now() - this.startTime : 0,
        eventsProcessed: this.metrics.eventsProcessed,
      },
      v: this.vFactory?.getDashboardData() || {},
      painSignal: PainSignalProcessor.getStats(),
      constitution: ConstitutionEnforcer.getStats(),
      persistence: Persistence.getStats(),
      eventBus: EventBus.getStats(),
    };
  }

  /**
   * Pain Queue 조회
   */
  async getPainQueue() {
    return Persistence.load('pain_queue', {
      filter: q => q.status === 'pending',
    });
  }

  /**
   * Request Queue 조회
   */
  async getRequestQueue() {
    return Persistence.load('request_queue', {
      filter: q => q.status === 'pending',
    });
  }

  /**
   * Approval Queue 조회
   */
  async getApprovalQueue() {
    return Persistence.load('approval_queue', {
      filter: q => q.status === 'pending',
    });
  }

  /**
   * Pain 해결 처리
   */
  async resolvePain(painId, resolution) {
    const pain = await Persistence.loadOne('pain_queue', painId);
    if (!pain) throw new Error('Pain not found');

    pain.status = 'resolved';
    pain.resolution = resolution;
    pain.resolvedAt = Date.now();

    await Persistence.save('pain_queue', pain);

    // V 생성 이벤트 (해결로 인한 V)
    if (resolution.vCreated) {
      await this.recordV(resolution.vCreated, {
        source: 'pain_resolution',
        signalId: painId,
        userId: pain.userId,
        fromPain: true,
        proof: { type: 'pain_resolution', painId },
      });
    }

    return pain;
  }

  /**
   * 로그 조회
   */
  async getLogs(logType, options = {}) {
    return Persistence.load(`log_${logType}`, options);
  }

  /**
   * 로그 무결성 검증
   */
  async verifyLogs(logType) {
    return Persistence.verifyLogIntegrity(logType);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const AUTUSRuntime = new AUTUSRuntimeClass();

// React Hook
export function useAUTUS() {
  return {
    runtime: AUTUSRuntime,
    processInput: AUTUSRuntime.processInput.bind(AUTUSRuntime),
    recordV: AUTUSRuntime.recordV.bind(AUTUSRuntime),
    getDashboardData: AUTUSRuntime.getDashboardData.bind(AUTUSRuntime),
    getPainQueue: AUTUSRuntime.getPainQueue.bind(AUTUSRuntime),
    getRequestQueue: AUTUSRuntime.getRequestQueue.bind(AUTUSRuntime),
    resolvePain: AUTUSRuntime.resolvePain.bind(AUTUSRuntime),
  };
}

export default AUTUSRuntime;
