/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Spec Templates
 * 업종별 스펙 템플릿 저장소
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// 공통 상태 머신 (모든 업종 공유)
export const COMMON_STATE_MACHINE = {
  states: {
    S0: { name: 'idle', label: '대기', color: '#6B7280' },
    S1: { name: 'intake', label: '접수', color: '#3B82F6' },
    S2: { name: 'eligible', label: '적격', color: '#8B5CF6' },
    S3: { name: 'approval', label: '승인', color: '#F59E0B' },
    S4: { name: 'intervention', label: '개입', color: '#EF4444' },
    S5: { name: 'monitor', label: '모니터', color: '#10B981' },
    S6: { name: 'stable', label: '안정', color: '#06B6D4' },
    S7: { name: 'shadow', label: '섀도우', color: '#EC4899' },
    S8: { name: 'liability', label: '리스크', color: '#DC2626' },
    S9: { name: 'closed', label: '종료', color: '#64748B' },
  },
  transitions: [
    { trigger: 'S-Tier', from: ['S0', 'S6', 'S5'], to: 'S1' },
    { trigger: 'eligible', from: ['S1'], to: 'S2' },
    { trigger: 'need_approval', from: ['S2'], to: 'S3' },
    { trigger: 'auto_apply', from: ['S2'], to: 'S4' },
    { trigger: 'approved', from: ['S3'], to: 'S4' },
    { trigger: 'deferred', from: ['S3'], to: 'S1' },
    { trigger: 'monitor_start', from: ['S4'], to: 'S5' },
    { trigger: 'recovered', from: ['S5'], to: 'S6' },
    { trigger: 'need_shadow', from: ['S5'], to: 'S7' },
    { trigger: 'kill', from: ['S6', 'S5', 'S4'], to: 'S0' },
    { trigger: 'Terminal', from: ['*'], to: 'S9' },
  ],
};

// 공통 권한 템플릿
export const COMMON_PERMISSIONS = {
  owner: ['view_all', 'approve', 'kill', 'reassign', 'change_policy', 'view_logs'],
  manager: ['view_all', 'propose', 'notify', 'view_logs'],
  staff: ['view_assigned', 'mark_status', 'propose', 'notify_limited'],
  customer: ['view_own', 'respond_notifications'],
};

// 업종별 스펙 템플릿
export const INDUSTRY_SPECS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 농구학원
  // ═══════════════════════════════════════════════════════════════════════════
  basketball_academy: {
    spec_version: 'autus-ui-spec.v1',
    brand_id: 'basketball_academy',
    industry: { name: '농구학원', icon: '🏀', color: '#F97316' },

    principles: {
      no_free_text: true,
      decision_first: true,
      exception_first: true,
      outcome_fact_only_triggers_process: true,
    },

    ontology: {
      Customer: { label: '고객', subtypes: ['학부모', '학생'] },
      Producer: { label: '강사', subtypes: ['코치', '지점'] },
      TimeSlot: { label: '시간대' },
      Contract: { label: '수강계약' },
    },

    outcome_facts: [
      { id: 'renewal.failed', tier: 'S', label: '갱신실패', weight: -1.0 },
      { id: 'attendance.drop', tier: 'S', label: '출석급락', weight: -0.5 },
      { id: 'notification.ignored', tier: 'S', label: '알림무시', weight: -0.3 },
      { id: 'renewal.succeeded', tier: 'A', label: '갱신성공', weight: 1.0 },
      { id: 'attendance.normal', tier: 'A', label: '출석정상', weight: 0.2 },
      { id: 'churn.finalized', tier: 'Terminal', label: '이탈확정', weight: -2.0 },
    ],

    decision_cards: [
      {
        id: 'D_ATTENDANCE_DROP',
        trigger: 'attendance.drop',
        deadline_hours: 48,
        options: ['강사재배치', '용량축소', '보강정책', '슬롯해지'],
      },
      {
        id: 'D_RENEWAL_FAILED',
        trigger: 'renewal.failed',
        deadline_hours: 72,
        options: ['학부모연락', '할인정책', '시간변경', '계약해지'],
      },
      {
        id: 'D_NOTIFICATION_IGNORED',
        trigger: 'notification.ignored',
        deadline_hours: 24,
        options: ['채널변경', '빈도축소', '학부모연락'],
      },
    ],

    roles: ['원장', '관리자', '강사', '학부모'],

    metrics: {
      vv_7d: { window: 7, min_samples: 10 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 요식업
  // ═══════════════════════════════════════════════════════════════════════════
  restaurant: {
    spec_version: 'autus-ui-spec.v1',
    brand_id: 'restaurant',
    industry: { name: '요식업', icon: '🍽️', color: '#EF4444' },

    principles: {
      no_free_text: true,
      decision_first: true,
      exception_first: true,
      outcome_fact_only_triggers_process: true,
    },

    ontology: {
      Customer: { label: '고객', subtypes: ['일반', 'VIP', '단체'] },
      Producer: { label: '직원', subtypes: ['셰프', '홀매니저', '서버'] },
      TimeSlot: { label: '예약시간' },
      Contract: { label: '예약건' },
    },

    outcome_facts: [
      { id: 'noshow', tier: 'S', label: '노쇼', weight: -1.5 },
      { id: 'complaint', tier: 'S', label: '컴플레인', weight: -1.0 },
      { id: 'bad_review', tier: 'S', label: '악성리뷰', weight: -0.8 },
      { id: 'visit_completed', tier: 'A', label: '방문완료', weight: 0.5 },
      { id: 'good_review', tier: 'A', label: '좋은리뷰', weight: 1.0 },
      { id: 'customer_lost', tier: 'Terminal', label: '고객이탈', weight: -2.0 },
    ],

    decision_cards: [
      {
        id: 'D_NOSHOW',
        trigger: 'noshow',
        deadline_hours: 24,
        options: ['블랙리스트', '예약금도입', '리마인더강화', '무시'],
      },
      {
        id: 'D_COMPLAINT',
        trigger: 'complaint',
        deadline_hours: 4,
        options: ['즉시보상', '사과연락', '직원교육', '에스컬레이션'],
      },
      {
        id: 'D_BAD_REVIEW',
        trigger: 'bad_review',
        deadline_hours: 12,
        options: ['공개답변', '개인연락', '보상제안', '내부검토'],
      },
    ],

    roles: ['사장', '매니저', '셰프', '서버'],

    metrics: {
      satisfaction_7d: { window: 7, min_samples: 20 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 이커머스
  // ═══════════════════════════════════════════════════════════════════════════
  ecommerce: {
    spec_version: 'autus-ui-spec.v1',
    brand_id: 'ecommerce',
    industry: { name: '이커머스', icon: '🛒', color: '#8B5CF6' },

    principles: {
      no_free_text: true,
      decision_first: true,
      exception_first: true,
      outcome_fact_only_triggers_process: true,
    },

    ontology: {
      Customer: { label: '고객', subtypes: ['일반', '프리미엄', '휴면'] },
      Producer: { label: '셀러', subtypes: ['직매입', '위탁', '입점'] },
      TimeSlot: { label: '배송권역' },
      Contract: { label: '주문' },
    },

    outcome_facts: [
      { id: 'cart.abandon', tier: 'S', label: '장바구니포기', weight: -0.5 },
      { id: 'return.request', tier: 'S', label: '반품요청', weight: -1.0 },
      { id: 'delivery.delay', tier: 'S', label: '배송지연', weight: -0.8 },
      { id: 'purchase.completed', tier: 'A', label: '구매완료', weight: 1.0 },
      { id: 'review.positive', tier: 'A', label: '긍정리뷰', weight: 0.5 },
      { id: 'customer.churned', tier: 'Terminal', label: '고객이탈', weight: -2.0 },
    ],

    decision_cards: [
      {
        id: 'D_CART_ABANDON',
        trigger: 'cart.abandon',
        deadline_hours: 24,
        options: ['쿠폰발송', '리타겟팅', '가격조정', '무시'],
      },
      {
        id: 'D_RETURN_REQUEST',
        trigger: 'return.request',
        deadline_hours: 48,
        options: ['즉시승인', '검수후승인', '거부', '부분환불'],
      },
      {
        id: 'D_DELIVERY_DELAY',
        trigger: 'delivery.delay',
        deadline_hours: 12,
        options: ['고객연락', '보상쿠폰', '배송사연락', '에스컬레이션'],
      },
    ],

    roles: ['운영팀', 'CS팀', '물류팀', '마케팅팀'],

    metrics: {
      conversion_7d: { window: 7, min_samples: 100 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SaaS
  // ═══════════════════════════════════════════════════════════════════════════
  saas: {
    spec_version: 'autus-ui-spec.v1',
    brand_id: 'saas',
    industry: { name: 'SaaS', icon: '💻', color: '#3B82F6' },

    principles: {
      no_free_text: true,
      decision_first: true,
      exception_first: true,
      outcome_fact_only_triggers_process: true,
    },

    ontology: {
      Customer: { label: '고객사', subtypes: ['Trial', 'Starter', 'Pro', 'Enterprise'] },
      Producer: { label: '담당자', subtypes: ['CSM', 'AE', 'Support'] },
      TimeSlot: { label: '빌링사이클' },
      Contract: { label: '구독' },
    },

    outcome_facts: [
      { id: 'usage.drop', tier: 'S', label: '사용량급락', weight: -1.0 },
      { id: 'ticket.surge', tier: 'S', label: '티켓폭증', weight: -0.8 },
      { id: 'payment.failed', tier: 'S', label: '결제실패', weight: -1.5 },
      { id: 'feature.adopted', tier: 'A', label: '기능활성화', weight: 0.5 },
      { id: 'subscription.renewed', tier: 'A', label: '구독갱신', weight: 1.0 },
      { id: 'subscription.cancelled', tier: 'Terminal', label: '구독해지', weight: -2.0 },
    ],

    decision_cards: [
      {
        id: 'D_USAGE_DROP',
        trigger: 'usage.drop',
        deadline_hours: 72,
        options: ['온보딩재시작', 'CSM미팅', '플랜다운그레이드', '해지방어'],
      },
      {
        id: 'D_PAYMENT_FAILED',
        trigger: 'payment.failed',
        deadline_hours: 24,
        options: ['재결제요청', '유예기간', '플랜중지', '해지'],
      },
      {
        id: 'D_TICKET_SURGE',
        trigger: 'ticket.surge',
        deadline_hours: 4,
        options: ['긴급지원', '담당자배정', '상위티어에스컬레이션', '자동응답'],
      },
    ],

    roles: ['CEO', 'CSM', 'AE', 'Support'],

    metrics: {
      health_score: { window: 30, min_samples: 50 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 피트니스
  // ═══════════════════════════════════════════════════════════════════════════
  fitness: {
    spec_version: 'autus-ui-spec.v1',
    brand_id: 'fitness',
    industry: { name: '피트니스', icon: '💪', color: '#10B981' },

    principles: {
      no_free_text: true,
      decision_first: true,
      exception_first: true,
      outcome_fact_only_triggers_process: true,
    },

    ontology: {
      Customer: { label: '회원', subtypes: ['일반', 'PT', '그룹'] },
      Producer: { label: '트레이너', subtypes: ['PT', '그룹강사', '매니저'] },
      TimeSlot: { label: '수업시간' },
      Contract: { label: '멤버십' },
    },

    outcome_facts: [
      { id: 'visit.drop', tier: 'S', label: '출석급락', weight: -1.0 },
      { id: 'membership.expiring', tier: 'S', label: '멤버십만료임박', weight: -0.5 },
      { id: 'pt.noshow', tier: 'S', label: 'PT노쇼', weight: -0.8 },
      { id: 'visit.regular', tier: 'A', label: '정기출석', weight: 0.5 },
      { id: 'membership.renewed', tier: 'A', label: '멤버십갱신', weight: 1.0 },
      { id: 'member.churned', tier: 'Terminal', label: '회원이탈', weight: -2.0 },
    ],

    decision_cards: [
      {
        id: 'D_VISIT_DROP',
        trigger: 'visit.drop',
        deadline_hours: 48,
        options: ['리마인더', '트레이너배정', '이벤트초대', '연락'],
      },
      {
        id: 'D_MEMBERSHIP_EXPIRING',
        trigger: 'membership.expiring',
        deadline_hours: 168,
        options: ['갱신할인', '업그레이드제안', '연락', '무시'],
      },
      {
        id: 'D_PT_NOSHOW',
        trigger: 'pt.noshow',
        deadline_hours: 2,
        options: ['즉시연락', '노쇼기록', '트레이너교체', '페널티'],
      },
    ],

    roles: ['대표', '매니저', '트레이너', '회원'],

    metrics: {
      retention_30d: { window: 30, min_samples: 20 },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 병/의원
  // ═══════════════════════════════════════════════════════════════════════════
  clinic: {
    spec_version: 'autus-ui-spec.v1',
    brand_id: 'clinic',
    industry: { name: '병/의원', icon: '🏥', color: '#EC4899' },

    principles: {
      no_free_text: true,
      decision_first: true,
      exception_first: true,
      outcome_fact_only_triggers_process: true,
    },

    ontology: {
      Customer: { label: '환자', subtypes: ['신환', '재진', 'VIP'] },
      Producer: { label: '의료진', subtypes: ['의사', '간호사', '상담사'] },
      TimeSlot: { label: '진료시간' },
      Contract: { label: '진료예약' },
    },

    outcome_facts: [
      { id: 'appointment.noshow', tier: 'S', label: '예약노쇼', weight: -1.0 },
      { id: 'treatment.incomplete', tier: 'S', label: '치료중단', weight: -1.5 },
      { id: 'review.negative', tier: 'S', label: '부정리뷰', weight: -0.8 },
      { id: 'appointment.completed', tier: 'A', label: '진료완료', weight: 0.5 },
      { id: 'treatment.completed', tier: 'A', label: '치료완료', weight: 1.0 },
      { id: 'patient.lost', tier: 'Terminal', label: '환자이탈', weight: -2.0 },
    ],

    decision_cards: [
      {
        id: 'D_APPOINTMENT_NOSHOW',
        trigger: 'appointment.noshow',
        deadline_hours: 24,
        options: ['재예약권유', '노쇼정책적용', '사유확인', '무시'],
      },
      {
        id: 'D_TREATMENT_INCOMPLETE',
        trigger: 'treatment.incomplete',
        deadline_hours: 72,
        options: ['리마인더', '상담사연결', '할인제안', '기록'],
      },
      {
        id: 'D_REVIEW_NEGATIVE',
        trigger: 'review.negative',
        deadline_hours: 12,
        options: ['공개답변', '개인연락', '보상제안', '내부검토'],
      },
    ],

    roles: ['원장', '실장', '상담사', '간호사'],

    metrics: {
      revisit_rate: { window: 30, min_samples: 50 },
    },
  },
};

// 스펙 내보내기
export function exportSpec(industryId) {
  const spec = INDUSTRY_SPECS[industryId];
  if (!spec) return null;

  return {
    ...spec,
    state_machine: COMMON_STATE_MACHINE,
    permissions: COMMON_PERMISSIONS,
  };
}

// 모든 업종 목록
export function getIndustryList() {
  return Object.entries(INDUSTRY_SPECS).map(([id, spec]) => ({
    id,
    name: spec.industry.name,
    icon: spec.industry.icon,
    color: spec.industry.color,
    ontologyCount: Object.keys(spec.ontology).length,
    outcomeCount: spec.outcome_facts.length,
    cardCount: spec.decision_cards.length,
  }));
}

export default {
  COMMON_STATE_MACHINE,
  COMMON_PERMISSIONS,
  INDUSTRY_SPECS,
  exportSpec,
  getIndustryList,
};
