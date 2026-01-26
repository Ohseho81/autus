/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS ROLE ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 3-Tier Internal Structure + 3 External Users + Absorbed Passive Modules
 * 
 * V = (M - T) × (1 + s)^t
 */

// ============================================
// INTERNAL ROLES (3 TIERS)
// ============================================
export const INTERNAL_TIERS = {
  C_LEVEL: {
    id: 'c_level',
    name: 'C-Level',
    role: 'Vision & Resource Director',
    subject: 'Owner / CEO',
    automationRate: 20,
    color: '#FFD700', // Gold
    icon: '👑',
    responsibilities: [
      '전체 V-나선 그래프 실시간 감독 및 방향 제시',
      '자원(예산·인력·AI 에이전트) 최종 배분 결정',
      '내부 리워드·인센티브 룰 설정 및 자동 지급 승인',
      '모든 외부 영향(Fight/Absorb/Ignore) 최종 결정',
      '조직 전체 External Impact Score 감독',
      'Bureaucracy Killer 실행 및 워크플로우 kill 승인',
    ],
    modules: ['external_impact_control', 'resource_allocation', 'reward_system'],
  },
  
  FSD: {
    id: 'fsd',
    name: 'FSD',
    role: 'Judgment & Allocation Lead',
    subject: '중간 관리자 / 판단 AI',
    automationRate: 80,
    color: '#00AAFF', // Blue
    icon: '🎯',
    responsibilities: [
      '내부 업무·인력·자원 배정 판단 및 자동화 트리거',
      '내부 churn·turnover·위험 예측 모델 실행',
      '내부 성과 평가·피드백 루프 자동화',
      '외부 영향 분석 판단 (경쟁·투자자·여론)',
      'Market & Ecosystem Judgment Module 실행',
      'Investor & Capital Judgment Module 실행',
    ],
    modules: ['market_judgment', 'investor_judgment', 'risk_prediction', 'allocation'],
    absorbedModules: [
      { name: 'Ecosystem Observer', target: 'Market & Ecosystem Judgment Module' },
      { name: 'Capital & Pressure Enabler', target: 'Investor & Capital Judgment Module' },
    ],
  },
  
  OPTIMUS: {
    id: 'optimus',
    name: 'Optimus',
    role: 'Execution Operator',
    subject: '실무자 / KRATON 에이전트',
    automationRate: 98,
    color: '#00CC66', // Green
    icon: '⚡',
    responsibilities: [
      '일상 내부 프로세스 자동 실행',
      'Customer Obsession Execution Team 운영',
      'Regulatory Execution Team 운영',
      'Supply Chain Execution Team 운영',
      'Public Opinion & Crisis Response Module 실행',
      'CSR & Social Impact Response Module 실행',
      'Investor Relations Execution Module 실행',
    ],
    modules: [
      'customer_obsession',
      'regulatory_execution',
      'supply_chain',
      'public_opinion',
      'csr_response',
      'investor_relations',
    ],
    absorbedModules: [
      { name: 'Opinion Shaper', target: 'Public Opinion & Crisis Response Module' },
      { name: 'Indirect Affected Party', target: 'CSR & Social Impact Response Module' },
      { name: 'Capital & Pressure Enabler (실행)', target: 'Investor Relations Execution Module' },
    ],
  },
};

// ============================================
// EXTERNAL ROLES (3 USERS)
// ============================================
export const EXTERNAL_USERS = {
  PRIMARY_CONSUMER: {
    id: 'primary_consumer',
    name: 'Primary Service Consumer',
    examples: '고객 / 사용자 / 학생',
    automationRate: 95,
    color: '#9B59B6', // Purple
    icon: '👩‍🎓',
    features: [
      '개인화 대시보드·실시간 상태 조회',
      '자동 채팅봇·문의 응대·피드백 설문',
      '추천·업셀·개인화 콘텐츠 제공',
      'churn 위험 알림·재참여 유도',
      'V값 기반 성과 공유 (예: 성적·출결 V-나선)',
    ],
    linkedModule: 'customer_obsession',
  },
  
  REGULATORY_PARTICIPANT: {
    id: 'regulatory_participant',
    name: 'Regulatory Participant',
    examples: '정부 담당자 / 행정 포털 사용자',
    automationRate: 80,
    color: '#E74C3C', // Red
    icon: '🏛️',
    features: [
      '자동 허가·보조금 신청 폼·서류 생성·제출',
      '실시간 준수 체크·보고서 자동 생성·제출',
      '규제 변화 알림·대응 가이드 제공',
      '감사·검사 데이터 자동 준비',
    ],
    linkedModule: 'regulatory_execution',
  },
  
  PARTNER_COLLABORATOR: {
    id: 'partner_collaborator',
    name: 'Partner Collaborator',
    examples: '공급자 / 파트너사 담당자',
    automationRate: 90,
    color: '#F39C12', // Orange
    icon: '🤝',
    features: [
      '공유 대시보드·실시간 재고·주문 상태 조회',
      '자동 계약·주문·결제 처리',
      '파트너십 성과 V값 공유·협력 추천',
      '지연·위험 자동 알림·대체 제안',
    ],
    linkedModule: 'supply_chain',
  },
};

// ============================================
// ABSORBED PASSIVE MODULES
// ============================================
export const ABSORBED_MODULES = {
  OPINION_SHAPER: {
    id: 'opinion_shaper',
    originalName: 'Opinion Shaper',
    examples: '여론 / 미디어 / 소셜 유저 / 인플루언서',
    absorbedInto: 'OPTIMUS',
    targetModule: 'Public Opinion & Crisis Response Module',
    functions: [
      '실시간 X·뉴스·소셜 모니터링',
      '자동 반박·밈·PR 콘텐츠 생성·배포',
      'Owner 승인 대기 큐',
      '위기 대응 자동화',
    ],
  },
  
  ECOSYSTEM_OBSERVER: {
    id: 'ecosystem_observer',
    originalName: 'Ecosystem Observer',
    examples: '경쟁자 / 업계 분석가 / 커뮤니티',
    absorbedInto: 'FSD',
    targetModule: 'Market & Ecosystem Judgment Module',
    functions: [
      '자동 벤치마크·경쟁 분석',
      '업계·커뮤니티 동향 분석',
      '전략 리포트·경고 알림 생성',
      'Fight/Absorb/Ignore 추천',
    ],
  },
  
  CAPITAL_PRESSURE: {
    id: 'capital_pressure',
    originalName: 'Capital & Pressure Enabler',
    examples: '투자자 / 주주 / 금융기관',
    absorbedInto: 'FSD + OPTIMUS',
    targetModule: 'Investor & Capital Judgment + IR Execution',
    functions: [
      '투자자·주주·금융 압력 분석',
      '자동 IR 리포트·알림 생성',
      '투자자 커뮤니케이션 실행',
      'Owner 설득 전략 추천',
    ],
  },
  
  INDIRECT_AFFECTED: {
    id: 'indirect_affected',
    originalName: 'Indirect Affected Party',
    examples: '지역 주민 / 환경 단체 / 일반 대중',
    absorbedInto: 'OPTIMUS',
    targetModule: 'CSR & Social Impact Response Module',
    functions: [
      '뉴스·소셜·지역 영향 모니터링',
      '자동 CSR 보고서 생성',
      '사회적 대응·긍정 영향 전환 트리거',
      '지역 커뮤니티 대화 생성',
    ],
  },
};

// ============================================
// KRATON TWO-PIZZA TEAMS (OPTIMUS)
// ============================================
export const KRATON_TEAMS = {
  ATTENDANCE_WORKFLOW: {
    id: 'attendance_workflow',
    name: 'Attendance & Workflow Team',
    tier: 'OPTIMUS',
    functions: ['출결 자동 처리', '보고서 생성', '워크플로우 실행'],
  },
  CUSTOMER_OBSESSION: {
    id: 'customer_obsession',
    name: 'Customer Obsession Execution Team',
    tier: 'OPTIMUS',
    functions: ['고객 채팅봇', '설문 발송', '개인화 추천', '피드백 루프'],
  },
  REGULATORY: {
    id: 'regulatory',
    name: 'Regulatory Execution Team',
    tier: 'OPTIMUS',
    functions: ['규제 신청', '준수 체크', '보고서 자동 제출'],
  },
  SUPPLY_CHAIN: {
    id: 'supply_chain',
    name: 'Supply Chain Execution Team',
    tier: 'OPTIMUS',
    functions: ['주문·계약 자동 관리', '파트너 업데이트'],
  },
  PUBLIC_OPINION: {
    id: 'public_opinion',
    name: 'Public Opinion & Crisis Response Module',
    tier: 'OPTIMUS',
    functions: ['실시간 소셜 모니터링', '자동 반박·PR 생성', 'Owner 승인'],
    absorbedFrom: 'Opinion Shaper',
  },
  CSR_RESPONSE: {
    id: 'csr_response',
    name: 'CSR & Social Impact Response Module',
    tier: 'OPTIMUS',
    functions: ['지역·환경·대중 영향 모니터링', 'CSR 보고서', '사회적 대응'],
    absorbedFrom: 'Indirect Affected Party',
  },
  INVESTOR_RELATIONS: {
    id: 'investor_relations',
    name: 'Investor Relations Execution Module',
    tier: 'OPTIMUS',
    functions: ['자동 IR 리포트', '투자자 커뮤니케이션'],
    absorbedFrom: 'Capital & Pressure Enabler (실행)',
  },
};

// ============================================
// V-ENGINE INTEGRATION
// ============================================
export const V_ENGINE_INTEGRATION = {
  C_LEVEL: { type: 'supervision', description: '전체 V 감독' },
  FSD: { type: 'input', description: '판단 입력' },
  OPTIMUS: { type: 'feedback', description: '실행 결과 피드백' },
  EXTERNAL: { type: 'usage', description: '이용자 V 피드백' },
};

// ============================================
// LEGACY ROLE MAPPING (KRATON → AUTUS)
// ============================================
export const LEGACY_MAPPING = {
  owner: 'C_LEVEL',
  principal: 'FSD',
  teacher: 'OPTIMUS',
  student: 'PRIMARY_CONSUMER',
  parent: 'PRIMARY_CONSUMER',
};

export default {
  INTERNAL_TIERS,
  EXTERNAL_USERS,
  ABSORBED_MODULES,
  KRATON_TEAMS,
  V_ENGINE_INTEGRATION,
  LEGACY_MAPPING,
};
