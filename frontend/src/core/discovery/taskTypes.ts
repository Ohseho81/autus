// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Discovery System - 업무 타입 및 솔루션
// ═══════════════════════════════════════════════════════════════════════════════
//
// 4. 업무 타입 - 그에 대한 솔루션
//
// ═══════════════════════════════════════════════════════════════════════════════

import { KScale } from '../schema';
import { UserType } from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// 업무 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type TaskType =
  // 전략 업무 (K7~K10)
  | 'SYSTEM_DESIGN'         // 시스템 설계
  | 'STRATEGIC_PLANNING'    // 전략 기획
  | 'GOVERNANCE'            // 거버넌스
  | 'CONSTITUTIONAL'        // 헌법/원칙 변경
  | 'CAPITAL_ALLOCATION'    // 자본 배분
  
  // 관리 업무 (K4~K6)
  | 'ORGANIZATIONAL_CHANGE' // 조직 변경
  | 'POLICY_MAKING'         // 정책 수립
  | 'RESOURCE_PLANNING'     // 자원 계획
  | 'RISK_MANAGEMENT'       // 리스크 관리
  | 'COMPLIANCE'            // 규정 준수
  
  // 전문 업무 (K3~K5)
  | 'TECHNICAL'             // 기술 업무
  | 'RESEARCH'              // 연구
  | 'DEVELOPMENT'           // 개발
  | 'ANALYSIS'              // 분석
  | 'QUALITY_CONTROL'       // 품질 관리
  
  // 협업 업무 (K2~K4)
  | 'TEAM_COORDINATION'     // 팀 조정
  | 'PARTNERSHIP'           // 파트너십
  | 'SALES'                 // 영업
  | 'CUSTOMER_SUCCESS'      // 고객 성공
  | 'COMMUNICATION'         // 커뮤니케이션
  
  // 실행 업무 (K1~K3)
  | 'IMPLEMENTATION'        // 구현
  | 'DELIVERY'              // 딜리버리
  | 'DAILY_OPERATIONS'      // 일상 운영
  | 'SUPPORT'               // 지원
  | 'MAINTENANCE'           // 유지보수
  
  // 위기/전환 업무
  | 'CRISIS_RESPONSE'       // 위기 대응
  | 'TURNAROUND'            // 턴어라운드
  | 'TRANSFORMATION'        // 트랜스포메이션
  | 'RECOVERY'              // 회복
  | 'INNOVATION';           // 혁신

// ═══════════════════════════════════════════════════════════════════════════════
// 업무 타입 프로필
// ═══════════════════════════════════════════════════════════════════════════════

export interface TaskTypeProfile {
  type: TaskType;
  name: string;
  nameKo: string;
  
  /** 필요 K 범위 */
  requiredK: { min: KScale; max: KScale };
  
  /** 특성 */
  characteristics: {
    complexity: 'low' | 'medium' | 'high' | 'extreme';
    irreversibility: 'low' | 'medium' | 'high' | 'extreme';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    collaboration: 'solo' | 'small_team' | 'cross_functional' | 'organization_wide';
  };
  
  /** 최적 사용자 타입 */
  optimalUserTypes: UserType[];
  
  /** 솔루션 전략 */
  solution: TaskSolution;
}

export interface TaskSolution {
  /** 접근 방식 */
  approach: string;
  approachKo: string;
  
  /** 핵심 단계 */
  steps: SolutionStep[];
  
  /** 필요 자원 */
  requiredResources: string[];
  
  /** 성공 지표 */
  successMetrics: string[];
  
  /** 위험 요소 */
  riskFactors: string[];
  
  /** 시간 프레임 */
  timeframe: {
    minimum: string;
    typical: string;
    maximum: string;
  };
  
  /** 자동화 가능성 */
  automationPotential: 'none' | 'partial' | 'high' | 'full';
  
  /** AUTUS 지원 기능 */
  autusFeatures: string[];
}

export interface SolutionStep {
  order: number;
  name: string;
  nameKo: string;
  description: string;
  requiredK: KScale;
  automatable: boolean;
  checkpoints: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 업무 타입별 프로필 및 솔루션
// ═══════════════════════════════════════════════════════════════════════════════

export const TASK_TYPE_PROFILES: Record<TaskType, TaskTypeProfile> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 전략 업무 (K7~K10)
  // ═══════════════════════════════════════════════════════════════════════════
  
  SYSTEM_DESIGN: {
    type: 'SYSTEM_DESIGN',
    name: 'System Design',
    nameKo: '시스템 설계',
    requiredK: { min: 7, max: 10 },
    characteristics: {
      complexity: 'extreme',
      irreversibility: 'high',
      urgency: 'low',
      collaboration: 'cross_functional',
    },
    optimalUserTypes: ['ARCHITECT', 'STRATEGIST'],
    solution: {
      approach: 'Structured decomposition with stakeholder alignment',
      approachKo: '이해관계자 정렬과 함께하는 구조적 분해',
      steps: [
        {
          order: 1,
          name: 'Requirement Analysis',
          nameKo: '요구사항 분석',
          description: '모든 이해관계자의 요구사항 수집 및 충돌 해결',
          requiredK: 7,
          automatable: false,
          checkpoints: ['이해관계자 목록 완성', '요구사항 우선순위화'],
        },
        {
          order: 2,
          name: 'Architecture Design',
          nameKo: '아키텍처 설계',
          description: '시스템 구조 및 인터페이스 정의',
          requiredK: 8,
          automatable: false,
          checkpoints: ['컴포넌트 다이어그램', '인터페이스 명세'],
        },
        {
          order: 3,
          name: 'Validation',
          nameKo: '검증',
          description: '설계 검토 및 시뮬레이션',
          requiredK: 7,
          automatable: true,
          checkpoints: ['설계 리뷰 완료', '시뮬레이션 통과'],
        },
        {
          order: 4,
          name: 'Documentation',
          nameKo: '문서화',
          description: '설계 문서 및 결정 근거 기록',
          requiredK: 6,
          automatable: true,
          checkpoints: ['설계 문서', '결정 로그'],
        },
      ],
      requiredResources: ['시스템 분석가', '도메인 전문가', '이해관계자 시간'],
      successMetrics: ['요구사항 충족률', '확장성 점수', '유지보수성 점수'],
      riskFactors: ['범위 변경', '기술 부채', '이해관계자 충돌'],
      timeframe: { minimum: '2주', typical: '1~2개월', maximum: '6개월' },
      automationPotential: 'partial',
      autusFeatures: ['K-Scale 검증', '이해관계자 매핑', '결정 추적'],
    },
  },
  
  STRATEGIC_PLANNING: {
    type: 'STRATEGIC_PLANNING',
    name: 'Strategic Planning',
    nameKo: '전략 기획',
    requiredK: { min: 8, max: 10 },
    characteristics: {
      complexity: 'extreme',
      irreversibility: 'extreme',
      urgency: 'low',
      collaboration: 'organization_wide',
    },
    optimalUserTypes: ['ARCHITECT', 'STRATEGIST', 'COMMANDER'],
    solution: {
      approach: 'Vision-driven cascading with scenario planning',
      approachKo: '비전 중심 캐스케이딩과 시나리오 플래닝',
      steps: [
        {
          order: 1,
          name: 'Environmental Scan',
          nameKo: '환경 스캔',
          description: '외부 환경 및 내부 역량 분석',
          requiredK: 7,
          automatable: true,
          checkpoints: ['SWOT 분석', '트렌드 보고서'],
        },
        {
          order: 2,
          name: 'Vision Setting',
          nameKo: '비전 설정',
          description: '3~5년 비전 및 목표 정의',
          requiredK: 9,
          automatable: false,
          checkpoints: ['비전 선언문', '핵심 목표 정의'],
        },
        {
          order: 3,
          name: 'Strategy Formulation',
          nameKo: '전략 수립',
          description: '전략적 이니셔티브 정의',
          requiredK: 8,
          automatable: false,
          checkpoints: ['전략 맵', '이니셔티브 목록'],
        },
        {
          order: 4,
          name: 'Resource Allocation',
          nameKo: '자원 배분',
          description: '예산 및 인력 배분',
          requiredK: 8,
          automatable: true,
          checkpoints: ['예산 계획', '인력 계획'],
        },
      ],
      requiredResources: ['경영진 시간', '전략 분석팀', '외부 데이터'],
      successMetrics: ['목표 달성률', '시장 점유율', 'ROI'],
      riskFactors: ['시장 변동', '실행력 부족', '자원 제약'],
      timeframe: { minimum: '1개월', typical: '3개월', maximum: '6개월' },
      automationPotential: 'partial',
      autusFeatures: ['시나리오 시뮬레이션', '인과관계 분석', 'K-Scale 가이드'],
    },
  },
  
  GOVERNANCE: {
    type: 'GOVERNANCE',
    name: 'Governance',
    nameKo: '거버넌스',
    requiredK: { min: 8, max: 10 },
    characteristics: {
      complexity: 'high',
      irreversibility: 'extreme',
      urgency: 'low',
      collaboration: 'organization_wide',
    },
    optimalUserTypes: ['GUARDIAN', 'ARCHITECT'],
    solution: {
      approach: 'Principle-based framework with checks and balances',
      approachKo: '견제와 균형을 갖춘 원칙 기반 프레임워크',
      steps: [
        {
          order: 1,
          name: 'Principle Definition',
          nameKo: '원칙 정의',
          description: '핵심 거버넌스 원칙 수립',
          requiredK: 9,
          automatable: false,
          checkpoints: ['원칙 문서', '이해관계자 합의'],
        },
        {
          order: 2,
          name: 'Structure Design',
          nameKo: '구조 설계',
          description: '위원회 및 의사결정 구조 정의',
          requiredK: 8,
          automatable: false,
          checkpoints: ['조직도', '권한 매트릭스'],
        },
        {
          order: 3,
          name: 'Process Codification',
          nameKo: '프로세스 문서화',
          description: '절차 및 프로세스 문서화',
          requiredK: 7,
          automatable: true,
          checkpoints: ['프로세스 문서', '체크리스트'],
        },
        {
          order: 4,
          name: 'Monitoring Setup',
          nameKo: '모니터링 구축',
          description: '감시 및 보고 체계 구축',
          requiredK: 6,
          automatable: true,
          checkpoints: ['대시보드', '보고 주기'],
        },
      ],
      requiredResources: ['법률 자문', '감사팀', '경영진 시간'],
      successMetrics: ['규정 준수율', '감사 결과', '투명성 점수'],
      riskFactors: ['규제 변경', '이해 충돌', '문화 저항'],
      timeframe: { minimum: '2개월', typical: '6개월', maximum: '1년' },
      automationPotential: 'high',
      autusFeatures: ['규제 자동 집행', '권한 검증', '감사 추적'],
    },
  },
  
  CONSTITUTIONAL: {
    type: 'CONSTITUTIONAL',
    name: 'Constitutional Change',
    nameKo: '헌법/원칙 변경',
    requiredK: { min: 10, max: 10 },
    characteristics: {
      complexity: 'extreme',
      irreversibility: 'extreme',
      urgency: 'low',
      collaboration: 'organization_wide',
    },
    optimalUserTypes: ['ARCHITECT', 'GUARDIAN'],
    solution: {
      approach: 'Multi-stakeholder consensus with irreversibility protocols',
      approachKo: '비가역성 프로토콜과 함께하는 다자간 합의',
      steps: [
        {
          order: 1,
          name: 'Need Assessment',
          nameKo: '필요성 평가',
          description: '변경 필요성 및 영향 분석',
          requiredK: 9,
          automatable: false,
          checkpoints: ['영향 분석 보고서', '필요성 증명'],
        },
        {
          order: 2,
          name: 'Draft Proposal',
          nameKo: '초안 작성',
          description: '변경 초안 및 근거 문서 작성',
          requiredK: 10,
          automatable: false,
          checkpoints: ['변경 초안', '근거 문서'],
        },
        {
          order: 3,
          name: 'Stakeholder Review',
          nameKo: '이해관계자 검토',
          description: '모든 이해관계자의 검토 및 피드백',
          requiredK: 10,
          automatable: false,
          checkpoints: ['검토 기록', '피드백 통합'],
        },
        {
          order: 4,
          name: 'Ritual Confirmation',
          nameKo: '의식적 확인',
          description: '최종 승인을 위한 의식적 절차',
          requiredK: 10,
          automatable: false,
          checkpoints: ['서명', '증인', '시간 버퍼'],
        },
      ],
      requiredResources: ['창시자/이사회', '법률 자문', '모든 이해관계자'],
      successMetrics: ['합의율', '실행 가능성', '지속 가능성'],
      riskFactors: ['분열', '실행 실패', '의도치 않은 결과'],
      timeframe: { minimum: '6개월', typical: '1년', maximum: '수년' },
      automationPotential: 'none',
      autusFeatures: ['Ritual Gate', '다중 승인', '영구 로그'],
    },
  },
  
  CAPITAL_ALLOCATION: {
    type: 'CAPITAL_ALLOCATION',
    name: 'Capital Allocation',
    nameKo: '자본 배분',
    requiredK: { min: 8, max: 10 },
    characteristics: {
      complexity: 'high',
      irreversibility: 'high',
      urgency: 'medium',
      collaboration: 'cross_functional',
    },
    optimalUserTypes: ['ARCHITECT', 'STRATEGIST', 'GUARDIAN'],
    solution: {
      approach: 'Risk-adjusted return optimization with portfolio theory',
      approachKo: '포트폴리오 이론을 활용한 위험 조정 수익 최적화',
      steps: [
        {
          order: 1,
          name: 'Opportunity Assessment',
          nameKo: '기회 평가',
          description: '투자 기회 식별 및 평가',
          requiredK: 7,
          automatable: true,
          checkpoints: ['기회 목록', '초기 평가'],
        },
        {
          order: 2,
          name: 'Risk Analysis',
          nameKo: '위험 분석',
          description: '위험 요소 식별 및 정량화',
          requiredK: 8,
          automatable: true,
          checkpoints: ['위험 매트릭스', 'VaR 계산'],
        },
        {
          order: 3,
          name: 'Portfolio Optimization',
          nameKo: '포트폴리오 최적화',
          description: '최적 배분 결정',
          requiredK: 9,
          automatable: true,
          checkpoints: ['배분 계획', '시뮬레이션 결과'],
        },
        {
          order: 4,
          name: 'Approval & Execution',
          nameKo: '승인 및 실행',
          description: '최종 승인 및 실행',
          requiredK: 9,
          automatable: false,
          checkpoints: ['승인 서명', '실행 확인'],
        },
      ],
      requiredResources: ['재무팀', '위험관리팀', '경영진'],
      successMetrics: ['ROI', '위험 조정 수익률', '배분 효율성'],
      riskFactors: ['시장 변동', '유동성 위험', '집중 위험'],
      timeframe: { minimum: '2주', typical: '1개월', maximum: '3개월' },
      automationPotential: 'high',
      autusFeatures: ['자동 위험 계산', '시나리오 분석', '규제 체크'],
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 실행 업무 (K1~K3) - 예시
  // ═══════════════════════════════════════════════════════════════════════════
  
  DAILY_OPERATIONS: {
    type: 'DAILY_OPERATIONS',
    name: 'Daily Operations',
    nameKo: '일상 운영',
    requiredK: { min: 1, max: 3 },
    characteristics: {
      complexity: 'low',
      irreversibility: 'low',
      urgency: 'high',
      collaboration: 'small_team',
    },
    optimalUserTypes: ['EXECUTOR', 'CRAFTSMAN', 'SUPPORTER'],
    solution: {
      approach: 'Standardized procedures with continuous improvement',
      approachKo: '지속적 개선과 표준화된 절차',
      steps: [
        {
          order: 1,
          name: 'Daily Check',
          nameKo: '일일 점검',
          description: '시스템 및 태스크 상태 확인',
          requiredK: 1,
          automatable: true,
          checkpoints: ['상태 대시보드', '이상 알림'],
        },
        {
          order: 2,
          name: 'Task Execution',
          nameKo: '태스크 실행',
          description: '일상 업무 수행',
          requiredK: 1,
          automatable: true,
          checkpoints: ['완료 체크', '품질 확인'],
        },
        {
          order: 3,
          name: 'Issue Handling',
          nameKo: '이슈 처리',
          description: '발생 이슈 즉시 대응',
          requiredK: 2,
          automatable: false,
          checkpoints: ['이슈 로그', '해결 확인'],
        },
        {
          order: 4,
          name: 'Daily Report',
          nameKo: '일일 보고',
          description: '운영 현황 정리 및 보고',
          requiredK: 1,
          automatable: true,
          checkpoints: ['보고서 생성', '전달 확인'],
        },
      ],
      requiredResources: ['운영 매뉴얼', '모니터링 도구', '팀원'],
      successMetrics: ['처리율', '응답 시간', '품질 점수'],
      riskFactors: ['병목', '피로', '품질 저하'],
      timeframe: { minimum: '1일', typical: '1일', maximum: '1일' },
      automationPotential: 'high',
      autusFeatures: ['자동 태스크 분배', '실시간 모니터링', '이슈 에스컬레이션'],
    },
  },
  
  IMPLEMENTATION: {
    type: 'IMPLEMENTATION',
    name: 'Implementation',
    nameKo: '구현',
    requiredK: { min: 2, max: 4 },
    characteristics: {
      complexity: 'medium',
      irreversibility: 'medium',
      urgency: 'medium',
      collaboration: 'small_team',
    },
    optimalUserTypes: ['EXECUTOR', 'SPECIALIST', 'CRAFTSMAN'],
    solution: {
      approach: 'Iterative development with continuous testing',
      approachKo: '지속적 테스팅과 반복적 개발',
      steps: [
        {
          order: 1,
          name: 'Requirements Review',
          nameKo: '요구사항 검토',
          description: '구현 범위 및 요구사항 확인',
          requiredK: 3,
          automatable: false,
          checkpoints: ['요구사항 체크리스트', '명확성 확인'],
        },
        {
          order: 2,
          name: 'Implementation',
          nameKo: '구현 작업',
          description: '실제 구현 수행',
          requiredK: 2,
          automatable: false,
          checkpoints: ['코드/문서 완성', '셀프 리뷰'],
        },
        {
          order: 3,
          name: 'Testing',
          nameKo: '테스팅',
          description: '구현물 테스트',
          requiredK: 2,
          automatable: true,
          checkpoints: ['테스트 통과', '버그 수정'],
        },
        {
          order: 4,
          name: 'Deployment',
          nameKo: '배포',
          description: '완성물 배포/적용',
          requiredK: 3,
          automatable: true,
          checkpoints: ['배포 완료', '검증'],
        },
      ],
      requiredResources: ['개발 환경', '테스트 환경', '문서'],
      successMetrics: ['완료율', '품질 점수', '시간 준수율'],
      riskFactors: ['범위 확장', '기술 이슈', '품질 문제'],
      timeframe: { minimum: '1일', typical: '1~2주', maximum: '1개월' },
      automationPotential: 'partial',
      autusFeatures: ['진행 추적', '품질 게이트', '자동 배포'],
    },
  },
  
  // 위기 대응 업무
  CRISIS_RESPONSE: {
    type: 'CRISIS_RESPONSE',
    name: 'Crisis Response',
    nameKo: '위기 대응',
    requiredK: { min: 6, max: 9 },
    characteristics: {
      complexity: 'high',
      irreversibility: 'high',
      urgency: 'critical',
      collaboration: 'organization_wide',
    },
    optimalUserTypes: ['COMMANDER', 'ADAPTER', 'EXECUTOR'],
    solution: {
      approach: 'Rapid assessment and decisive action with parallel streams',
      approachKo: '병렬 스트림과 함께하는 빠른 평가 및 결단력 있는 행동',
      steps: [
        {
          order: 1,
          name: 'Immediate Assessment',
          nameKo: '즉각 평가',
          description: '상황 파악 및 심각도 평가',
          requiredK: 6,
          automatable: false,
          checkpoints: ['상황 보고서', '심각도 판정'],
        },
        {
          order: 2,
          name: 'Command Activation',
          nameKo: '지휘 체계 가동',
          description: '위기 대응팀 소집 및 지휘',
          requiredK: 7,
          automatable: false,
          checkpoints: ['팀 소집', '역할 배정'],
        },
        {
          order: 3,
          name: 'Parallel Actions',
          nameKo: '병렬 조치',
          description: '다중 대응 스트림 실행',
          requiredK: 6,
          automatable: false,
          checkpoints: ['조치 진행', '상황 업데이트'],
        },
        {
          order: 4,
          name: 'Stabilization',
          nameKo: '안정화',
          description: '상황 안정화 및 복구',
          requiredK: 5,
          automatable: false,
          checkpoints: ['안정화 확인', '복구 계획'],
        },
      ],
      requiredResources: ['위기 대응팀', '통신 채널', '예비 자원'],
      successMetrics: ['대응 시간', '피해 규모', '복구 시간'],
      riskFactors: ['정보 부족', '의사소통 실패', '자원 부족'],
      timeframe: { minimum: '즉시', typical: '시간~일', maximum: '주' },
      automationPotential: 'partial',
      autusFeatures: ['자동 에스컬레이션', '상황 대시보드', '의사결정 지원'],
    },
  },
  
  // 나머지 업무 타입들 (간략화)
  TRANSFORMATION: {
    type: 'TRANSFORMATION',
    name: 'Transformation',
    nameKo: '트랜스포메이션',
    requiredK: { min: 7, max: 9 },
    characteristics: { complexity: 'extreme', irreversibility: 'high', urgency: 'medium', collaboration: 'organization_wide' },
    optimalUserTypes: ['CATALYST', 'ARCHITECT', 'COMMANDER'],
    solution: {
      approach: 'Phased transformation with change management',
      approachKo: '변화 관리와 단계적 변환',
      steps: [
        { order: 1, name: 'Vision', nameKo: '비전', description: '변환 비전 정의', requiredK: 8, automatable: false, checkpoints: ['비전 문서'] },
        { order: 2, name: 'Design', nameKo: '설계', description: '변환 로드맵 설계', requiredK: 7, automatable: false, checkpoints: ['로드맵'] },
        { order: 3, name: 'Execute', nameKo: '실행', description: '단계적 실행', requiredK: 6, automatable: false, checkpoints: ['마일스톤'] },
        { order: 4, name: 'Embed', nameKo: '정착', description: '변화 정착', requiredK: 6, automatable: false, checkpoints: ['정착 확인'] },
      ],
      requiredResources: ['변화 관리팀', '경영진 후원', '교육'],
      successMetrics: ['채택률', '성과 지표', '문화 변화'],
      riskFactors: ['저항', '피로', '역행'],
      timeframe: { minimum: '6개월', typical: '1~2년', maximum: '수년' },
      automationPotential: 'partial',
      autusFeatures: ['진행 추적', '저항 감지', '영향 분석'],
    },
  },
  
  INNOVATION: {
    type: 'INNOVATION',
    name: 'Innovation',
    nameKo: '혁신',
    requiredK: { min: 5, max: 8 },
    characteristics: { complexity: 'high', irreversibility: 'medium', urgency: 'low', collaboration: 'cross_functional' },
    optimalUserTypes: ['CATALYST', 'SPECIALIST', 'VOLATILE'],
    solution: {
      approach: 'Experimentation with fast failure cycles',
      approachKo: '빠른 실패 사이클과 실험',
      steps: [
        { order: 1, name: 'Ideation', nameKo: '아이디어', description: '아이디어 생성', requiredK: 5, automatable: false, checkpoints: ['아이디어 풀'] },
        { order: 2, name: 'Prototype', nameKo: '프로토타입', description: '빠른 프로토타이핑', requiredK: 4, automatable: false, checkpoints: ['프로토타입'] },
        { order: 3, name: 'Test', nameKo: '테스트', description: '시장/사용자 테스트', requiredK: 4, automatable: false, checkpoints: ['테스트 결과'] },
        { order: 4, name: 'Scale', nameKo: '확대', description: '성공 시 확대', requiredK: 6, automatable: false, checkpoints: ['확대 결정'] },
      ],
      requiredResources: ['혁신팀', '예산', '실험 환경'],
      successMetrics: ['실험 수', '성공률', 'ROI'],
      riskFactors: ['자원 낭비', '핵심 사업 방해', '실패 공포'],
      timeframe: { minimum: '1개월', typical: '3~6개월', maximum: '1년' },
      automationPotential: 'partial',
      autusFeatures: ['아이디어 추적', '실험 관리', '결과 분석'],
    },
  },
  
  // 간략화된 나머지 타입들
  ORGANIZATIONAL_CHANGE: { type: 'ORGANIZATIONAL_CHANGE', name: 'Organizational Change', nameKo: '조직 변경', requiredK: { min: 6, max: 8 }, characteristics: { complexity: 'high', irreversibility: 'high', urgency: 'medium', collaboration: 'organization_wide' }, optimalUserTypes: ['ARCHITECT', 'CATALYST'], solution: { approach: 'Structured change management', approachKo: '체계적 변화 관리', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '1개월', typical: '3개월', maximum: '1년' }, automationPotential: 'partial', autusFeatures: [] } },
  POLICY_MAKING: { type: 'POLICY_MAKING', name: 'Policy Making', nameKo: '정책 수립', requiredK: { min: 6, max: 8 }, characteristics: { complexity: 'high', irreversibility: 'high', urgency: 'low', collaboration: 'cross_functional' }, optimalUserTypes: ['GUARDIAN', 'ARCHITECT'], solution: { approach: 'Evidence-based policy design', approachKo: '증거 기반 정책 설계', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '2주', typical: '1~2개월', maximum: '6개월' }, automationPotential: 'partial', autusFeatures: [] } },
  RESOURCE_PLANNING: { type: 'RESOURCE_PLANNING', name: 'Resource Planning', nameKo: '자원 계획', requiredK: { min: 5, max: 7 }, characteristics: { complexity: 'medium', irreversibility: 'medium', urgency: 'medium', collaboration: 'cross_functional' }, optimalUserTypes: ['SPECIALIST', 'MAINTAINER'], solution: { approach: 'Capacity-based planning', approachKo: '역량 기반 계획', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '1주', typical: '2~4주', maximum: '2개월' }, automationPotential: 'high', autusFeatures: [] } },
  RISK_MANAGEMENT: { type: 'RISK_MANAGEMENT', name: 'Risk Management', nameKo: '리스크 관리', requiredK: { min: 5, max: 7 }, characteristics: { complexity: 'high', irreversibility: 'medium', urgency: 'medium', collaboration: 'cross_functional' }, optimalUserTypes: ['GUARDIAN', 'STRATEGIST'], solution: { approach: 'Proactive risk identification and mitigation', approachKo: '선제적 위험 식별 및 완화', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '1주', typical: '월간', maximum: '분기' }, automationPotential: 'high', autusFeatures: [] } },
  COMPLIANCE: { type: 'COMPLIANCE', name: 'Compliance', nameKo: '규정 준수', requiredK: { min: 5, max: 7 }, characteristics: { complexity: 'medium', irreversibility: 'high', urgency: 'high', collaboration: 'organization_wide' }, optimalUserTypes: ['GUARDIAN', 'MAINTAINER'], solution: { approach: 'Systematic compliance framework', approachKo: '체계적 규정 준수 프레임워크', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '지속', typical: '지속', maximum: '지속' }, automationPotential: 'high', autusFeatures: [] } },
  TECHNICAL: { type: 'TECHNICAL', name: 'Technical', nameKo: '기술 업무', requiredK: { min: 3, max: 5 }, characteristics: { complexity: 'high', irreversibility: 'low', urgency: 'medium', collaboration: 'small_team' }, optimalUserTypes: ['SPECIALIST', 'CRAFTSMAN'], solution: { approach: 'Engineering excellence', approachKo: '엔지니어링 탁월함', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '시간', typical: '일~주', maximum: '월' }, automationPotential: 'partial', autusFeatures: [] } },
  RESEARCH: { type: 'RESEARCH', name: 'Research', nameKo: '연구', requiredK: { min: 4, max: 6 }, characteristics: { complexity: 'high', irreversibility: 'low', urgency: 'low', collaboration: 'solo' }, optimalUserTypes: ['STRATEGIST', 'SPECIALIST'], solution: { approach: 'Systematic investigation', approachKo: '체계적 조사', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '주', typical: '월', maximum: '분기' }, automationPotential: 'partial', autusFeatures: [] } },
  DEVELOPMENT: { type: 'DEVELOPMENT', name: 'Development', nameKo: '개발', requiredK: { min: 3, max: 5 }, characteristics: { complexity: 'medium', irreversibility: 'low', urgency: 'medium', collaboration: 'small_team' }, optimalUserTypes: ['SPECIALIST', 'CRAFTSMAN', 'EXECUTOR'], solution: { approach: 'Agile development', approachKo: '애자일 개발', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '일', typical: '스프린트', maximum: '분기' }, automationPotential: 'partial', autusFeatures: [] } },
  ANALYSIS: { type: 'ANALYSIS', name: 'Analysis', nameKo: '분석', requiredK: { min: 3, max: 5 }, characteristics: { complexity: 'medium', irreversibility: 'low', urgency: 'medium', collaboration: 'solo' }, optimalUserTypes: ['STRATEGIST', 'SPECIALIST'], solution: { approach: 'Data-driven analysis', approachKo: '데이터 기반 분석', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '시간', typical: '일', maximum: '주' }, automationPotential: 'high', autusFeatures: [] } },
  QUALITY_CONTROL: { type: 'QUALITY_CONTROL', name: 'Quality Control', nameKo: '품질 관리', requiredK: { min: 3, max: 5 }, characteristics: { complexity: 'medium', irreversibility: 'low', urgency: 'high', collaboration: 'small_team' }, optimalUserTypes: ['GUARDIAN', 'SPECIALIST'], solution: { approach: 'Statistical quality control', approachKo: '통계적 품질 관리', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '지속', typical: '지속', maximum: '지속' }, automationPotential: 'high', autusFeatures: [] } },
  TEAM_COORDINATION: { type: 'TEAM_COORDINATION', name: 'Team Coordination', nameKo: '팀 조정', requiredK: { min: 3, max: 5 }, characteristics: { complexity: 'medium', irreversibility: 'low', urgency: 'medium', collaboration: 'small_team' }, optimalUserTypes: ['CONNECTOR', 'EXECUTOR'], solution: { approach: 'Facilitative leadership', approachKo: '촉진적 리더십', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '지속', typical: '지속', maximum: '지속' }, automationPotential: 'partial', autusFeatures: [] } },
  PARTNERSHIP: { type: 'PARTNERSHIP', name: 'Partnership', nameKo: '파트너십', requiredK: { min: 4, max: 6 }, characteristics: { complexity: 'medium', irreversibility: 'medium', urgency: 'low', collaboration: 'cross_functional' }, optimalUserTypes: ['CONNECTOR', 'ARCHITECT'], solution: { approach: 'Win-win negotiation', approachKo: '윈윈 협상', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '주', typical: '월', maximum: '분기' }, automationPotential: 'partial', autusFeatures: [] } },
  SALES: { type: 'SALES', name: 'Sales', nameKo: '영업', requiredK: { min: 2, max: 4 }, characteristics: { complexity: 'medium', irreversibility: 'medium', urgency: 'high', collaboration: 'small_team' }, optimalUserTypes: ['CONNECTOR', 'EXECUTOR', 'ADAPTER'], solution: { approach: 'Consultative selling', approachKo: '컨설팅 영업', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '일', typical: '주~월', maximum: '분기' }, automationPotential: 'partial', autusFeatures: [] } },
  CUSTOMER_SUCCESS: { type: 'CUSTOMER_SUCCESS', name: 'Customer Success', nameKo: '고객 성공', requiredK: { min: 2, max: 4 }, characteristics: { complexity: 'medium', irreversibility: 'low', urgency: 'high', collaboration: 'small_team' }, optimalUserTypes: ['CONNECTOR', 'SUPPORTER'], solution: { approach: 'Proactive customer engagement', approachKo: '선제적 고객 참여', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '지속', typical: '지속', maximum: '지속' }, automationPotential: 'partial', autusFeatures: [] } },
  COMMUNICATION: { type: 'COMMUNICATION', name: 'Communication', nameKo: '커뮤니케이션', requiredK: { min: 2, max: 4 }, characteristics: { complexity: 'low', irreversibility: 'low', urgency: 'medium', collaboration: 'cross_functional' }, optimalUserTypes: ['CONNECTOR', 'CATALYST'], solution: { approach: 'Clear and consistent messaging', approachKo: '명확하고 일관된 메시징', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '지속', typical: '지속', maximum: '지속' }, automationPotential: 'partial', autusFeatures: [] } },
  DELIVERY: { type: 'DELIVERY', name: 'Delivery', nameKo: '딜리버리', requiredK: { min: 1, max: 3 }, characteristics: { complexity: 'low', irreversibility: 'low', urgency: 'high', collaboration: 'small_team' }, optimalUserTypes: ['EXECUTOR', 'CRAFTSMAN'], solution: { approach: 'Reliable execution', approachKo: '신뢰할 수 있는 실행', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '시간', typical: '일', maximum: '주' }, automationPotential: 'high', autusFeatures: [] } },
  SUPPORT: { type: 'SUPPORT', name: 'Support', nameKo: '지원', requiredK: { min: 1, max: 3 }, characteristics: { complexity: 'low', irreversibility: 'low', urgency: 'high', collaboration: 'small_team' }, optimalUserTypes: ['SUPPORTER', 'EXECUTOR'], solution: { approach: 'Responsive assistance', approachKo: '반응적 지원', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '분', typical: '시간', maximum: '일' }, automationPotential: 'high', autusFeatures: [] } },
  MAINTENANCE: { type: 'MAINTENANCE', name: 'Maintenance', nameKo: '유지보수', requiredK: { min: 1, max: 3 }, characteristics: { complexity: 'low', irreversibility: 'low', urgency: 'medium', collaboration: 'solo' }, optimalUserTypes: ['MAINTAINER', 'CRAFTSMAN'], solution: { approach: 'Preventive maintenance', approachKo: '예방적 유지보수', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '지속', typical: '지속', maximum: '지속' }, automationPotential: 'high', autusFeatures: [] } },
  TURNAROUND: { type: 'TURNAROUND', name: 'Turnaround', nameKo: '턴어라운드', requiredK: { min: 7, max: 9 }, characteristics: { complexity: 'extreme', irreversibility: 'high', urgency: 'critical', collaboration: 'organization_wide' }, optimalUserTypes: ['COMMANDER', 'ARCHITECT'], solution: { approach: 'Rapid restructuring', approachKo: '신속한 구조조정', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '월', typical: '분기', maximum: '년' }, automationPotential: 'partial', autusFeatures: [] } },
  RECOVERY: { type: 'RECOVERY', name: 'Recovery', nameKo: '회복', requiredK: { min: 4, max: 6 }, characteristics: { complexity: 'medium', irreversibility: 'low', urgency: 'high', collaboration: 'cross_functional' }, optimalUserTypes: ['PHOENIX', 'GUARDIAN', 'MAINTAINER'], solution: { approach: 'Systematic recovery', approachKo: '체계적 회복', steps: [], requiredResources: [], successMetrics: [], riskFactors: [], timeframe: { minimum: '주', typical: '월', maximum: '분기' }, automationPotential: 'partial', autusFeatures: [] } },
};

/**
 * 태스크 타입에 대한 솔루션 반환
 */
export function getSolutionForTaskType(taskType: TaskType): TaskSolution {
  return TASK_TYPE_PROFILES[taskType].solution;
}

/**
 * 사용자 타입에 최적화된 태스크 타입 목록 반환
 */
export function getOptimalTasksForUserType(userType: UserType): TaskType[] {
  return Object.values(TASK_TYPE_PROFILES)
    .filter(profile => profile.optimalUserTypes.includes(userType))
    .map(profile => profile.type);
}
