/**
 * 🏭 AUTUS Brand OS Factory
 *
 * AUTUS는 보이지 않는다.
 * Brand OS만 보인다.
 *
 * 아마존 → 고객 행동 학습 → 추천
 * 테슬라 → 운전 데이터 학습 → 자율주행
 * 팔란티어 → 패턴 학습 → 예측
 *
 * AUTUS → Intervention 학습 → 자동화
 */

// ============================================
// Brand OS 정의
// ============================================
const BRAND_OS_REGISTRY = {
  allthatbasket: {
    id: 'allthatbasket',
    name: '올댓바스켓',
    domain: '교육/스포츠',
    language: {
      member: '선수',
      attendance: '출석',
      payment: '수강료',
      class: '수업',
      coach: '코치',
      owner: '원장'
    },
    facts: ['출석', '결제', '수업시작', '수업종료', '등록', '해지'],
    interventions: ['보강배정', '할인승인', '코치교체', '리마인드발송'],
    shadowRules: [
      { id: 'ATB-001', name: '결제 실패 안내', trigger: 'payment_failed' },
      { id: 'ATB-002', name: '연속 결석 알림', trigger: 'consecutive_absent >= 2' }
    ]
  },

  groton: {
    id: 'groton',
    name: '그로튼',
    domain: '헬스/피트니스',
    language: {
      member: '회원',
      attendance: '방문',
      payment: '회비',
      class: '세션',
      coach: '트레이너',
      owner: '센터장'
    },
    facts: ['방문', '결제', '세션시작', '세션종료', '등록', '해지'],
    interventions: ['일정변경', '환불승인', '트레이너교체', '리마인드발송'],
    shadowRules: [
      { id: 'GRT-001', name: '결제 실패 안내', trigger: 'payment_failed' },
      { id: 'GRT-002', name: '장기 미방문 알림', trigger: 'days_since_visit >= 7' }
    ]
  }
};

// ============================================
// Brand OS Factory
// ============================================
export class BrandOSFactory {

  /**
   * 새 Brand OS 생성
   */
  static create(config) {
    const { id, name, domain, language, facts, interventions } = config;

    // 필수 검증
    if (!id || !name || !domain) {
      throw new Error('Brand OS requires: id, name, domain');
    }

    // 기본 Shadow Rules 생성
    const shadowRules = [
      { id: `${id.toUpperCase()}-001`, name: '결제 실패 안내', trigger: 'payment_failed', mode: 'shadow' },
      { id: `${id.toUpperCase()}-002`, name: '이탈 위험 알림', trigger: 'risk_score >= 70', mode: 'shadow' }
    ];

    const brandOS = {
      id,
      name,
      domain,
      language: language || BRAND_OS_REGISTRY.allthatbasket.language,
      facts: facts || ['출석', '결제', '등록', '해지'],
      interventions: interventions || ['리마인드발송'],
      shadowRules,
      createdAt: new Date().toISOString(),

      // Shadow Learning 상태
      learning: {
        totalInterventions: 0,
        shadowExecutions: 0,
        approvedRules: 0,
        autoRules: 0
      }
    };

    // Registry에 등록
    BRAND_OS_REGISTRY[id] = brandOS;

    return brandOS;
  }

  /**
   * Brand OS 조회
   */
  static get(id) {
    return BRAND_OS_REGISTRY[id] || null;
  }

  /**
   * 전체 Brand OS 목록
   */
  static list() {
    return Object.values(BRAND_OS_REGISTRY);
  }

  /**
   * Brand OS 언어 변환
   */
  static translate(brandId, key) {
    const brand = BRAND_OS_REGISTRY[brandId];
    return brand?.language[key] || key;
  }
}

// ============================================
// Shadow Learning Engine
// ============================================
export class ShadowLearning {

  constructor(brandId) {
    this.brandId = brandId;
    this.brand = BrandOSFactory.get(brandId);
    this.interventionLog = [];
    this.shadowCandidates = new Map();
  }

  /**
   * Intervention 기록 (학습 입력)
   *
   * 아마존이 클릭을 기록하듯,
   * 테슬라가 조향을 기록하듯,
   * AUTUS는 Intervention을 기록한다.
   */
  recordIntervention(intervention) {
    const record = {
      id: `INT-${Date.now()}`,
      brandId: this.brandId,
      ...intervention,
      recordedAt: new Date().toISOString()
    };

    this.interventionLog.push(record);
    this.analyzePattern(record);

    return record;
  }

  /**
   * 패턴 분석 (학습)
   */
  analyzePattern(intervention) {
    const { trigger, action, actorRole } = intervention;
    const key = `${trigger}:${action}`;

    if (!this.shadowCandidates.has(key)) {
      this.shadowCandidates.set(key, {
        trigger,
        action,
        count: 0,
        successCount: 0,
        actors: new Set(),
        firstSeen: new Date().toISOString()
      });
    }

    const candidate = this.shadowCandidates.get(key);
    candidate.count++;
    candidate.actors.add(actorRole);
    candidate.lastSeen = new Date().toISOString();

    // Shadow Rule 후보 검토
    this.evaluateShadowCandidate(key, candidate);
  }

  /**
   * Shadow Rule 후보 평가
   *
   * 조건: 30회 이상 실행 + 70% 성공률
   */
  evaluateShadowCandidate(key, candidate) {
    if (candidate.count >= 30) {
      const successRate = candidate.successCount / candidate.count;

      if (successRate >= 0.7) {
        return {
          ready: true,
          rule: {
            id: `SHADOW-${Date.now()}`,
            brandId: this.brandId,
            trigger: candidate.trigger,
            action: candidate.action,
            mode: 'shadow',
            stats: {
              executions: candidate.count,
              successRate: Math.round(successRate * 100),
              actors: Array.from(candidate.actors)
            }
          }
        };
      }
    }

    return { ready: false, remaining: 30 - candidate.count };
  }

  /**
   * Shadow → Approval 승급 요청
   */
  requestApproval(ruleId) {
    return {
      type: 'approval_card',
      ruleId,
      brandId: this.brandId,
      question: '이 규칙을 승인하시겠습니까?',
      options: ['승인', '보류', '거절'],
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Approval → Auto 승급
   */
  promoteToAuto(ruleId, decision) {
    if (decision === '승인') {
      return {
        ruleId,
        newMode: 'auto',
        promotedAt: new Date().toISOString()
      };
    }
    return null;
  }

  /**
   * 학습 통계
   */
  getStats() {
    return {
      brandId: this.brandId,
      totalInterventions: this.interventionLog.length,
      shadowCandidates: this.shadowCandidates.size,
      readyForApproval: Array.from(this.shadowCandidates.entries())
        .filter(([_, c]) => c.count >= 30)
        .length
    };
  }
}

// ============================================
// AUTUS Core (비가시 레이어)
// ============================================
export class AUTUSCore {

  constructor() {
    this.brandEngines = new Map();
  }

  /**
   * Brand OS 초기화
   */
  initBrand(brandId) {
    if (!this.brandEngines.has(brandId)) {
      const engine = new ShadowLearning(brandId);
      this.brandEngines.set(brandId, engine);
    }
    return this.brandEngines.get(brandId);
  }

  /**
   * Fact 수신 (SoR → SoL)
   */
  receiveFact(brandId, fact) {
    const engine = this.initBrand(brandId);

    // Fact는 기록만 (학습 대상 아님)
    return {
      type: 'fact',
      brandId,
      ...fact,
      receivedAt: new Date().toISOString()
    };
  }

  /**
   * Intervention 수신 (학습 대상)
   */
  receiveIntervention(brandId, intervention) {
    const engine = this.initBrand(brandId);
    return engine.recordIntervention(intervention);
  }

  /**
   * 전체 학습 현황
   */
  getLearningStatus() {
    const status = {};

    for (const [brandId, engine] of this.brandEngines) {
      status[brandId] = engine.getStats();
    }

    return status;
  }
}

// ============================================
// Export
// ============================================
export default {
  BrandOSFactory,
  ShadowLearning,
  AUTUSCore,
  BRAND_OS_REGISTRY
};
