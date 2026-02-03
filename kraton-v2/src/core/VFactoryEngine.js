/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS V-Factory Engine
 *
 * Owner의 V 목표를 Producer App 내부 구조로 분해하고,
 * 역할별 V 기여도를 추적하여 최고 효율을 달성하는 엔진
 *
 * 핵심 원칙:
 * - Amazon: Working Backwards (V 목표 → 필요 활동 역산)
 * - Tesla: First Principles (물리적 한계까지 최적화)
 * - Palantir: Ontology (모든 데이터 연결/추적)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 물리 법칙 (변경 불가)
// ═══════════════════════════════════════════════════════════════════════════════

export const PHYSICS = Object.freeze({
  // V = (M - T) × (1 + s)^t
  // M: Mint (생성), T: Tax (비용), s: synergy, t: time

  // 시간당 최대 처리량 (물리적 한계)
  MAX_EVENTS_PER_HOUR_PER_PERSON: 12,  // 5분에 1건
  MAX_DECISIONS_PER_DAY_PER_OWNER: 20, // 집중력 한계
  MAX_AUTOMATION_RATE: 0.85,           // 15%는 인간 필요

  // 효율 저하 요인
  CONTEXT_SWITCH_COST: 0.15,           // 문맥 전환 비용 15%
  COMMUNICATION_OVERHEAD: 0.10,         // 커뮤니케이션 오버헤드 10%
  APPROVAL_DELAY_COST_PER_HOUR: 0.02,  // 승인 대기 비용/시간

  // 시너지 범위
  MIN_SYNERGY: -0.3,  // 최악의 역시너지
  MAX_SYNERGY: 0.5,   // 최대 시너지
});

// ═══════════════════════════════════════════════════════════════════════════════
// V-Factory Class
// ═══════════════════════════════════════════════════════════════════════════════

export class VFactory {
  constructor(config) {
    this.name = config.name || 'Unnamed App';
    this.industry = config.industry || 'default';

    // Owner의 V 목표
    this.vTarget = {
      monthly: config.vTarget?.monthly || 10000000,  // 월 1천만원
      margin: config.vTarget?.margin || 0.3,          // 마진 30%
    };

    // 역할 구조
    this.roles = new Map();
    this.members = new Map();

    // 프로세스 파이프라인
    this.pipelines = new Map();

    // 실시간 메트릭
    this.metrics = {
      input: {},   // 입력 메트릭
      process: {}, // 처리 메트릭
      output: {},  // 출력 메트릭
    };

    // 히스토리
    this.history = [];

    // 기본 역할 구조 설정
    this._initializeDefaultStructure();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AMAZON: Working Backwards - V 목표에서 역산
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * V 목표를 역할별 필요 활동량으로 분해
   * Amazon: "고객에게 필요한 것 → 그것을 만들기 위해 필요한 것"
   */
  workBackwards() {
    const monthlyV = this.vTarget.monthly;
    const workingDays = 22;
    const workingHours = 8;

    // Step 1: 일일 V 목표
    const dailyV = monthlyV / workingDays;

    // Step 2: 시간당 V 목표
    const hourlyV = dailyV / workingHours;

    // Step 3: 역할별 V 할당 (기여도 기반)
    const roleAllocation = {};
    let totalContribution = 0;

    for (const [roleId, role] of this.roles) {
      totalContribution += role.vContribution;
    }

    for (const [roleId, role] of this.roles) {
      const share = role.vContribution / totalContribution;
      const roleHourlyV = hourlyV * share;

      // 해당 역할의 평균 V per event
      const avgVPerEvent = role.avgVPerEvent || 10000;

      // 필요한 시간당 이벤트 수
      const requiredEventsPerHour = roleHourlyV / avgVPerEvent;

      // 물리적 한계 체크 (Tesla First Principles)
      const membersInRole = this._getMembersInRole(roleId).length;
      const maxCapacity = membersInRole * PHYSICS.MAX_EVENTS_PER_HOUR_PER_PERSON;

      roleAllocation[roleId] = {
        share: (share * 100).toFixed(1) + '%',
        hourlyVTarget: Math.round(roleHourlyV),
        requiredEventsPerHour: requiredEventsPerHour.toFixed(1),
        currentCapacity: maxCapacity,
        utilizationRequired: ((requiredEventsPerHour / maxCapacity) * 100).toFixed(1) + '%',
        bottleneck: requiredEventsPerHour > maxCapacity,
        gap: requiredEventsPerHour > maxCapacity
          ? Math.ceil((requiredEventsPerHour - maxCapacity) / PHYSICS.MAX_EVENTS_PER_HOUR_PER_PERSON)
          : 0,
      };
    }

    return {
      target: {
        monthly: monthlyV,
        daily: Math.round(dailyV),
        hourly: Math.round(hourlyV),
      },
      roleAllocation,
      bottlenecks: Object.entries(roleAllocation)
        .filter(([_, v]) => v.bottleneck)
        .map(([k, v]) => ({ role: k, additionalMembersNeeded: v.gap })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TESLA: First Principles - 물리적 한계까지 최적화
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 현재 구조의 이론적 최대 V 계산
   * Tesla: "물리 법칙이 허용하는 한계까지"
   */
  calculateTheoreticalMax() {
    let maxHourlyV = 0;

    for (const [roleId, role] of this.roles) {
      const members = this._getMembersInRole(roleId);
      const maxEvents = members.length * PHYSICS.MAX_EVENTS_PER_HOUR_PER_PERSON;
      const avgV = role.avgVPerEvent || 10000;

      // 자동화 적용
      const automationBoost = 1 + (role.automationRate || 0);

      // 효율 저하 요인 적용
      const efficiency = 1
        - PHYSICS.CONTEXT_SWITCH_COST * (role.contextSwitchFrequency || 0.5)
        - PHYSICS.COMMUNICATION_OVERHEAD * (role.communicationLoad || 0.5);

      maxHourlyV += maxEvents * avgV * automationBoost * efficiency;
    }

    // 시너지 효과
    const synergy = this._calculateSynergy();
    maxHourlyV *= (1 + synergy);

    return {
      hourly: Math.round(maxHourlyV),
      daily: Math.round(maxHourlyV * 8),
      monthly: Math.round(maxHourlyV * 8 * 22),
      synergy: (synergy * 100).toFixed(1) + '%',
      utilizationToReachTarget: ((this.vTarget.monthly / (maxHourlyV * 8 * 22)) * 100).toFixed(1) + '%',
    };
  }

  /**
   * 병목 지점 식별 및 최적화 제안
   */
  identifyBottlenecks() {
    const bottlenecks = [];

    // 1. 역할별 처리량 vs 용량
    for (const [roleId, role] of this.roles) {
      const members = this._getMembersInRole(roleId);
      const capacity = members.length * PHYSICS.MAX_EVENTS_PER_HOUR_PER_PERSON;
      const currentLoad = role.currentEventsPerHour || 0;
      const utilization = currentLoad / capacity;

      if (utilization > 0.85) {
        bottlenecks.push({
          type: 'CAPACITY',
          roleId,
          severity: utilization > 0.95 ? 'CRITICAL' : 'WARNING',
          utilization: (utilization * 100).toFixed(1) + '%',
          suggestion: utilization > 0.95
            ? `${Math.ceil((currentLoad - capacity * 0.8) / PHYSICS.MAX_EVENTS_PER_HOUR_PER_PERSON)}명 추가 필요`
            : '자동화 확대 또는 프로세스 단순화 권장',
        });
      }
    }

    // 2. 승인 대기 병목
    for (const [pipelineId, pipeline] of this.pipelines) {
      const approvalStage = pipeline.stages.find(s => s.requiresApproval);
      if (approvalStage && approvalStage.avgWaitTime > 4) { // 4시간 이상 대기
        bottlenecks.push({
          type: 'APPROVAL_DELAY',
          pipelineId,
          stageId: approvalStage.id,
          severity: approvalStage.avgWaitTime > 24 ? 'CRITICAL' : 'WARNING',
          avgWaitTime: approvalStage.avgWaitTime + 'h',
          costPerHour: PHYSICS.APPROVAL_DELAY_COST_PER_HOUR,
          suggestion: '승인 권한 위임 또는 자동 승인 규칙 추가',
        });
      }
    }

    // 3. 자동화 기회
    for (const [roleId, role] of this.roles) {
      if ((role.automationRate || 0) < 0.5 && role.repeatableTaskRatio > 0.6) {
        bottlenecks.push({
          type: 'AUTOMATION_OPPORTUNITY',
          roleId,
          severity: 'INFO',
          currentAutomation: ((role.automationRate || 0) * 100).toFixed(0) + '%',
          potentialGain: ((role.repeatableTaskRatio - (role.automationRate || 0)) * 100).toFixed(0) + '%',
          suggestion: '반복 작업 자동화로 ' + ((role.repeatableTaskRatio - (role.automationRate || 0)) * role.currentEventsPerHour * (role.avgVPerEvent || 10000)).toLocaleString() + '원/시간 추가 가능',
        });
      }
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PALANTIR: Ontology - 모든 데이터 연결/추적
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * V 기여도 추적 (누가, 무엇을, 얼마나)
   */
  trackVContribution(event) {
    const contribution = {
      id: `VC_${Date.now()}`,
      timestamp: Date.now(),
      eventId: event.id,
      eventType: event.type,

      // 누가
      roleId: event.roleId,
      memberId: event.memberId,

      // 무엇을
      action: event.action,
      inputValue: event.inputValue || 0,

      // 얼마나
      vCreated: 0,
      vComponents: {
        directValue: 0,      // 직접 창출 가치
        enabledValue: 0,     // 간접 기여 가치
        preventedLoss: 0,    // 손실 방지 가치
      },
    };

    // V 계산
    contribution.vComponents = this._calculateVComponents(event);
    contribution.vCreated =
      contribution.vComponents.directValue +
      contribution.vComponents.enabledValue +
      contribution.vComponents.preventedLoss;

    // 역할 메트릭 업데이트
    this._updateRoleMetrics(contribution);

    // 히스토리 저장
    this.history.push(contribution);

    return contribution;
  }

  /**
   * 실시간 대시보드 데이터
   */
  getDashboardData() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    const hourlyEvents = this.history.filter(h => h.timestamp > hourAgo);
    const dailyEvents = this.history.filter(h => h.timestamp > dayAgo);

    // 역할별 V 집계
    const vByRole = {};
    for (const [roleId] of this.roles) {
      const roleEvents = dailyEvents.filter(e => e.roleId === roleId);
      vByRole[roleId] = {
        total: roleEvents.reduce((sum, e) => sum + e.vCreated, 0),
        count: roleEvents.length,
        avg: roleEvents.length > 0
          ? Math.round(roleEvents.reduce((sum, e) => sum + e.vCreated, 0) / roleEvents.length)
          : 0,
      };
    }

    // 시간대별 V (24시간)
    const hourlyV = Array.from({ length: 24 }, (_, i) => {
      const hourStart = dayAgo + i * 3600000;
      const hourEnd = hourStart + 3600000;
      const events = this.history.filter(h => h.timestamp >= hourStart && h.timestamp < hourEnd);
      return {
        hour: i,
        v: events.reduce((sum, e) => sum + e.vCreated, 0),
        count: events.length,
      };
    });

    // 현재 효율성
    const theoreticalMax = this.calculateTheoreticalMax();
    const currentHourlyV = hourlyEvents.reduce((sum, e) => sum + e.vCreated, 0);
    const efficiency = theoreticalMax.hourly > 0
      ? currentHourlyV / theoreticalMax.hourly
      : 0;

    return {
      target: this.vTarget,
      current: {
        hourly: currentHourlyV,
        daily: dailyEvents.reduce((sum, e) => sum + e.vCreated, 0),
        projected: {
          monthly: Math.round(currentHourlyV * 8 * 22),
        },
      },
      efficiency: {
        current: isNaN(efficiency) ? '0%' : (efficiency * 100).toFixed(1) + '%',
        theoretical: theoreticalMax,
      },
      byRole: vByRole,
      timeline: hourlyV,
      bottlenecks: this.identifyBottlenecks(),
    };
  }

  /**
   * V 기여 그래프 (Ontology)
   */
  getVOntology() {
    const nodes = [];
    const edges = [];

    // Owner 노드
    nodes.push({
      id: 'owner',
      type: 'OWNER',
      label: 'Owner',
      vTarget: this.vTarget.monthly,
    });

    // App 노드
    nodes.push({
      id: 'app',
      type: 'APP',
      label: this.name,
      vActual: this.history.reduce((sum, h) => sum + h.vCreated, 0),
    });

    edges.push({ from: 'owner', to: 'app', label: 'V Target', value: this.vTarget.monthly });

    // 역할 노드
    for (const [roleId, role] of this.roles) {
      const roleV = this.history
        .filter(h => h.roleId === roleId)
        .reduce((sum, h) => sum + h.vCreated, 0);

      nodes.push({
        id: roleId,
        type: 'ROLE',
        label: role.name,
        vContribution: role.vContribution,
        vActual: roleV,
      });

      edges.push({ from: 'app', to: roleId, label: 'V Share', value: roleV });

      // 멤버 노드
      const members = this._getMembersInRole(roleId);
      for (const member of members) {
        const memberV = this.history
          .filter(h => h.memberId === member.id)
          .reduce((sum, h) => sum + h.vCreated, 0);

        nodes.push({
          id: member.id,
          type: 'MEMBER',
          label: member.name,
          roleId,
          vActual: memberV,
        });

        edges.push({ from: roleId, to: member.id, label: 'V', value: memberV });
      }
    }

    return { nodes, edges };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal Methods
  // ─────────────────────────────────────────────────────────────────────────────

  _initializeDefaultStructure() {
    // 기본 역할 구조
    this.roles.set('manager', {
      id: 'manager',
      name: '관리자',
      vContribution: 0.3,  // V의 30% 기여
      avgVPerEvent: 15000,
      automationRate: 0.4,
      repeatableTaskRatio: 0.7,
      currentEventsPerHour: 0,
      contextSwitchFrequency: 0.6,
      communicationLoad: 0.7,
    });

    this.roles.set('producer', {
      id: 'producer',
      name: '생산자',
      vContribution: 0.5,  // V의 50% 기여
      avgVPerEvent: 20000,
      automationRate: 0.2,
      repeatableTaskRatio: 0.8,
      currentEventsPerHour: 0,
      contextSwitchFrequency: 0.3,
      communicationLoad: 0.4,
    });

    this.roles.set('system', {
      id: 'system',
      name: '시스템',
      vContribution: 0.2,  // V의 20% 기여
      avgVPerEvent: 5000,
      automationRate: 0.9,
      repeatableTaskRatio: 0.95,
      currentEventsPerHour: 0,
      contextSwitchFrequency: 0,
      communicationLoad: 0,
    });

    // 기본 파이프라인
    this.pipelines.set('main', {
      id: 'main',
      name: '메인 파이프라인',
      stages: [
        { id: 'unified', name: '일체화', requiresApproval: false, avgProcessTime: 0.5, avgWaitTime: 0 },
        { id: 'automated', name: '자동화', requiresApproval: false, avgProcessTime: 0.2, avgWaitTime: 0 },
        { id: 'approved', name: '승인화', requiresApproval: true, avgProcessTime: 0.1, avgWaitTime: 2 },
        { id: 'tasked', name: '업무화', requiresApproval: false, avgProcessTime: 1, avgWaitTime: 0 },
      ],
    });

    // 기본 멤버 (시범 운영용)
    this.members.set('manager-1', { id: 'manager-1', name: '관리자1', roleId: 'manager' });
    this.members.set('producer-1', { id: 'producer-1', name: '코치1', roleId: 'producer' });
    this.members.set('producer-2', { id: 'producer-2', name: '코치2', roleId: 'producer' });
    this.members.set('system-1', { id: 'system-1', name: 'AUTUS', roleId: 'system' });
  }

  _getMembersInRole(roleId) {
    return Array.from(this.members.values()).filter(m => m.roleId === roleId);
  }

  _calculateSynergy() {
    // 역할 간 시너지 계산
    const roleCount = this.roles.size;
    if (roleCount <= 1) return 0;

    // 커뮤니케이션 복잡도에 따른 시너지/역시너지
    const connections = (roleCount * (roleCount - 1)) / 2;
    const baseSynergy = 0.1; // 협업 기본 시너지
    const overheadPerConnection = 0.02;

    return Math.max(
      PHYSICS.MIN_SYNERGY,
      Math.min(PHYSICS.MAX_SYNERGY, baseSynergy - (connections * overheadPerConnection))
    );
  }

  _calculateVComponents(event) {
    const role = this.roles.get(event.roleId);
    if (!role) return { directValue: 0, enabledValue: 0, preventedLoss: 0 };

    // 직접 가치: 이벤트 완료로 인한 직접 수익
    const directValue = event.inputValue || (role.avgVPerEvent * (0.8 + Math.random() * 0.4));

    // 간접 가치: 다른 역할의 업무를 가능하게 함
    const enabledValue = directValue * 0.2 * (1 - role.automationRate);

    // 손실 방지: 문제 해결로 인한 손실 방지
    const preventedLoss = event.isPainResolution ? directValue * 0.5 : 0;

    return {
      directValue: Math.round(directValue),
      enabledValue: Math.round(enabledValue),
      preventedLoss: Math.round(preventedLoss),
    };
  }

  _updateRoleMetrics(contribution) {
    const role = this.roles.get(contribution.roleId);
    if (!role) return;

    // 시간당 이벤트 수 업데이트 (이동 평균)
    const now = Date.now();
    const hourAgo = now - 3600000;
    const recentEvents = this.history.filter(h =>
      h.roleId === contribution.roleId && h.timestamp > hourAgo
    );

    role.currentEventsPerHour = recentEvents.length;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  addMember(member) {
    this.members.set(member.id, member);
    return this;
  }

  setVTarget(monthly, margin = 0.3) {
    this.vTarget = { monthly, margin };
    return this;
  }

  updateRoleConfig(roleId, config) {
    const role = this.roles.get(roleId);
    if (role) {
      Object.assign(role, config);
    }
    return this;
  }

  // 최적화 제안 생성
  getOptimizationSuggestions() {
    const backwards = this.workBackwards();
    const bottlenecks = this.identifyBottlenecks();
    const theoretical = this.calculateTheoreticalMax();

    const suggestions = [];

    // 병목 해결 제안
    for (const bn of bottlenecks) {
      if (bn.severity === 'CRITICAL') {
        suggestions.push({
          priority: 'HIGH',
          type: bn.type,
          description: bn.suggestion,
          expectedImpact: bn.type === 'CAPACITY'
            ? `+${Math.round(PHYSICS.MAX_EVENTS_PER_HOUR_PER_PERSON * (this.roles.get(bn.roleId)?.avgVPerEvent || 10000))}/시간`
            : bn.type === 'APPROVAL_DELAY'
              ? `-${(bn.avgWaitTime * PHYSICS.APPROVAL_DELAY_COST_PER_HOUR * 100).toFixed(0)}% 비용 절감`
              : 'N/A',
        });
      }
    }

    // V 목표 달성을 위한 제안
    if (backwards.bottlenecks.length > 0) {
      for (const bn of backwards.bottlenecks) {
        suggestions.push({
          priority: 'HIGH',
          type: 'HIRING',
          description: `${bn.role} 역할에 ${bn.additionalMembersNeeded}명 추가 필요`,
          expectedImpact: `V 목표 달성 가능`,
        });
      }
    }

    // 자동화 제안
    const autoOpps = bottlenecks.filter(bn => bn.type === 'AUTOMATION_OPPORTUNITY');
    for (const opp of autoOpps) {
      suggestions.push({
        priority: 'MEDIUM',
        type: 'AUTOMATION',
        description: `${opp.roleId} 역할 자동화 확대`,
        expectedImpact: opp.suggestion,
      });
    }

    return suggestions;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory 인스턴스 관리
// ═══════════════════════════════════════════════════════════════════════════════

let factoryInstance = null;

export function getVFactory(config = {}) {
  if (!factoryInstance) {
    factoryInstance = new VFactory(config);
  }
  return factoryInstance;
}

export function createVFactory(config) {
  factoryInstance = new VFactory(config);
  return factoryInstance;
}

export default VFactory;
