/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 업무 실행기 v7 - Work Executor
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 업무 실행기 = 객관화 + 구체화 + 표준화 + 예측 + 실행 + 측정 + 개선
 *
 * 워크플로우: 선형 + 부분 순환
 * [이벤트 입력] → [이벤트 정의] → [6W 명확화] → [9단계 실행] → [결과]
 *                                                     ↓
 *                                               [반복 이벤트만]
 *                                                     ↓
 *                                               [자동 재실행]
 */

import React, { useState, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 업무 실행기 7기능 정의
// ═══════════════════════════════════════════════════════════════════════════════

const EXECUTOR_FUNCTIONS = {
  objectify: { name: '객관화', icon: '🎯', desc: '모호함 → 명확함', color: '#8B5CF6' },
  specify: { name: '구체화', icon: '📋', desc: '6W로 상세화', color: '#3B82F6' },
  standardize: { name: '표준화', icon: '📐', desc: '글로벌 프레임워크', color: '#10B981' },
  predict: { name: '예측', icon: '🔮', desc: '미래 결과값', color: '#F97316' },
  execute: { name: '실행', icon: '⚡', desc: '실제 작동', color: '#EF4444' },
  measure: { name: '측정', icon: '📊', desc: '결과 수집', color: '#06B6D4' },
  improve: { name: '개선', icon: '🔄', desc: '자동 최적화', color: '#EC4899' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 다중 회사 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const COMPANIES = {
  allthatbasket: {
    id: 'allthatbasket',
    name: '올댓바스켓',
    icon: '🏀',
    industry: '교육서비스업',
    industryIcon: '📚',
    marketGrowth: 5,
    companyGrowth: -3,
    color: '#F97316',
    members: [
      { id: 'ceo', name: '오세호', role: '대표', department: '경영', skills: ['전략', '의사결정', '리더십'], color: '#F97316' },
      { id: 'coo', name: '김민수', role: 'COO', department: '운영', skills: ['운영관리', '프로세스', '효율화'], color: '#3B82F6' },
      { id: 'cmo', name: '이지현', role: 'CMO', department: '마케팅', skills: ['브랜딩', '캠페인', '콘텐츠'], color: '#EC4899' },
      { id: 'coach1', name: '박성준', role: '수석코치', department: '코칭', skills: ['농구지도', '선수육성', '프로그램'], color: '#10B981' },
      { id: 'coach2', name: '최영호', role: '코치', department: '코칭', skills: ['유소년지도', '기초훈련'], color: '#10B981' },
      { id: 'cs', name: '정수연', role: 'CS담당', department: '고객서비스', skills: ['상담', 'CRM', '회원관리'], color: '#06B6D4' },
      { id: 'dev', name: '한동훈', role: '개발', department: 'IT', skills: ['시스템', '데이터', '자동화'], color: '#8B5CF6' },
    ],
    missions: [
      { title: '휴면고객 재활성화', desc: '30일+ 미방문 회원 복귀 유도', impact: '매출 +15% 예상', color: '#EF4444' },
      { title: '재등록률 향상', desc: '만료 예정 회원 리텐션', impact: '이탈율 -20% 예상', color: '#3B82F6' },
      { title: '신규 회원 확보', desc: '체험 → 정규 전환 극대화', impact: '전환율 +25% 예상', color: '#10B981' },
    ],
    roleAssignments: {
      '휴면고객 재활성화': [
        { memberId: 'cmo', task: '재활성화 캠페인 기획', deadline: '1주차' },
        { memberId: 'cs', task: '타겟 고객 리스트 추출', deadline: '1일차' },
        { memberId: 'dev', task: '자동 발송 시스템 설정', deadline: '3일차' },
        { memberId: 'coach1', task: '복귀 혜택 프로그램 설계', deadline: '1주차' },
      ],
      '재등록률 향상': [
        { memberId: 'cs', task: '만료 예정 회원 분석', deadline: '1일차' },
        { memberId: 'cmo', task: '리텐션 혜택 설계', deadline: '3일차' },
        { memberId: 'coach1', task: '맞춤 프로그램 제안', deadline: '1주차' },
        { memberId: 'ceo', task: '할인 정책 최종 승인', deadline: '3일차' },
      ],
      '신규 회원 확보': [
        { memberId: 'cmo', task: '체험 마케팅 캠페인', deadline: '1주차' },
        { memberId: 'coach2', task: '체험 프로그램 운영', deadline: '상시' },
        { memberId: 'cs', task: '체험 → 정규 전환 상담', deadline: '체험 후' },
        { memberId: 'coo', task: '수용 인원 조정', deadline: '2일차' },
      ],
    },
  },
  groton: {
    id: 'groton',
    name: '그로튼',
    icon: '🎓',
    industry: '교육서비스업',
    industryIcon: '📚',
    marketGrowth: 8,
    companyGrowth: 12,
    color: '#3B82F6',
    members: [
      { id: 'ceo', name: '김대표', role: '대표', department: '경영', skills: ['전략', '투자', '네트워킹'], color: '#3B82F6' },
      { id: 'coo', name: '박운영', role: 'COO', department: '운영', skills: ['운영관리', '스케줄링', '품질관리'], color: '#10B981' },
      { id: 'cmo', name: '최마케팅', role: 'CMO', department: '마케팅', skills: ['디지털마케팅', 'SNS', '브랜딩'], color: '#EC4899' },
      { id: 'teacher1', name: '이선생', role: '수석강사', department: '교육', skills: ['커리큘럼', '강의', '멘토링'], color: '#8B5CF6' },
      { id: 'teacher2', name: '정강사', role: '강사', department: '교육', skills: ['1:1지도', '학습관리'], color: '#8B5CF6' },
      { id: 'cs', name: '한상담', role: '상담팀장', department: '고객서비스', skills: ['학부모상담', '등록관리'], color: '#06B6D4' },
      { id: 'dev', name: '오개발', role: '개발', department: 'IT', skills: ['LMS', '데이터분석', '자동화'], color: '#F97316' },
    ],
    missions: [
      { title: '수강생 이탈 방지', desc: '학습 중단 위험 학생 관리', impact: '이탈율 -25% 예상', color: '#EF4444' },
      { title: '상위반 전환율 향상', desc: '레벨업 테스트 통과율 증가', impact: '전환율 +30% 예상', color: '#3B82F6' },
      { title: '학부모 만족도 향상', desc: '정기 상담 및 피드백 강화', impact: 'NPS +20 예상', color: '#10B981' },
    ],
    roleAssignments: {
      '수강생 이탈 방지': [
        { memberId: 'teacher1', task: '위험 학생 조기 발견', deadline: '상시' },
        { memberId: 'cs', task: '학부모 긴급 상담', deadline: '즉시' },
        { memberId: 'dev', task: '학습 데이터 분석 리포트', deadline: '주간' },
        { memberId: 'cmo', task: '재등록 혜택 안내', deadline: '1주차' },
      ],
      '상위반 전환율 향상': [
        { memberId: 'teacher1', task: '레벨업 특강 운영', deadline: '월간' },
        { memberId: 'teacher2', task: '1:1 보충 지도', deadline: '상시' },
        { memberId: 'cs', task: '상위반 혜택 안내', deadline: '테스트 후' },
        { memberId: 'ceo', task: '장학 혜택 승인', deadline: '3일차' },
      ],
      '학부모 만족도 향상': [
        { memberId: 'cs', task: '정기 상담 스케줄링', deadline: '월초' },
        { memberId: 'teacher1', task: '학습 리포트 작성', deadline: '주간' },
        { memberId: 'cmo', task: '뉴스레터 발송', deadline: '격주' },
        { memberId: 'dev', task: '학부모 앱 기능 개선', deadline: '분기' },
      ],
    },
  },
  thedoi: {
    id: 'thedoi',
    name: '더도이',
    icon: '🍽️',
    industry: 'F&B',
    industryIcon: '🍴',
    marketGrowth: 3,
    companyGrowth: 7,
    color: '#10B981',
    members: [
      { id: 'ceo', name: '도이대표', role: '대표', department: '경영', skills: ['메뉴개발', '투자', '브랜딩'], color: '#10B981' },
      { id: 'coo', name: '김총괄', role: 'COO', department: '운영', skills: ['매장관리', '인력운영', '원가관리'], color: '#3B82F6' },
      { id: 'cmo', name: '박마케팅', role: 'CMO', department: '마케팅', skills: ['SNS마케팅', '프로모션', '브랜딩'], color: '#EC4899' },
      { id: 'chef', name: '최셰프', role: '총주방장', department: '주방', skills: ['메뉴개발', '품질관리', '조리'], color: '#F97316' },
      { id: 'hall', name: '이매니저', role: '홀매니저', department: '서비스', skills: ['고객응대', '예약관리', '클레임처리'], color: '#8B5CF6' },
      { id: 'purchase', name: '정구매', role: '구매담당', department: '구매', skills: ['식자재', '원가절감', '거래처관리'], color: '#06B6D4' },
      { id: 'dev', name: '한개발', role: '개발', department: 'IT', skills: ['POS', '예약시스템', '데이터'], color: '#6B7280' },
    ],
    missions: [
      { title: '재방문율 향상', desc: '단골 고객 확보 및 유지', impact: '재방문 +20% 예상', color: '#EF4444' },
      { title: '객단가 상승', desc: '세트메뉴/사이드 판매 증가', impact: '객단가 +15% 예상', color: '#3B82F6' },
      { title: '배달 매출 확대', desc: '배달앱 순위 및 리뷰 개선', impact: '배달매출 +30% 예상', color: '#10B981' },
    ],
    roleAssignments: {
      '재방문율 향상': [
        { memberId: 'cmo', task: '멤버십 프로그램 기획', deadline: '2주차' },
        { memberId: 'hall', task: '단골 고객 응대 매뉴얼', deadline: '1주차' },
        { memberId: 'dev', task: '포인트 적립 시스템', deadline: '3주차' },
        { memberId: 'chef', task: '시즌 메뉴 개발', deadline: '월간' },
      ],
      '객단가 상승': [
        { memberId: 'chef', task: '세트메뉴 구성', deadline: '1주차' },
        { memberId: 'hall', task: '업셀링 화법 교육', deadline: '3일차' },
        { memberId: 'cmo', task: '세트메뉴 프로모션', deadline: '1주차' },
        { memberId: 'ceo', task: '가격 정책 승인', deadline: '2일차' },
      ],
      '배달 매출 확대': [
        { memberId: 'cmo', task: '배달앱 광고 집행', deadline: '상시' },
        { memberId: 'chef', task: '배달 전용 메뉴 개발', deadline: '2주차' },
        { memberId: 'coo', task: '배달 패키징 개선', deadline: '1주차' },
        { memberId: 'dev', task: '리뷰 관리 자동화', deadline: '2주차' },
      ],
    },
  },
};

// 현재 선택된 회사 데이터 (기본값: 올댓바스켓)
const getCompanyData = (companyId) => COMPANIES[companyId] || COMPANIES.allthatbasket;

// 역할 자동 배정 함수 (회사별)
const assignRoles = (missionType, companyId = 'allthatbasket') => {
  const company = getCompanyData(companyId);
  const assignmentData = company.roleAssignments || {};

  const assignments = assignmentData[missionType] || [
    { memberId: 'ceo', task: '미션 검토 및 승인', deadline: '1일차' },
    { memberId: 'coo', task: '실행 계획 수립', deadline: '3일차' },
  ];

  // member 객체를 포함한 배열 반환
  return assignments.map(a => ({
    ...a,
    member: company.members.find(m => m.id === a.memberId) || {
      id: a.memberId,
      name: '미지정',
      role: '-',
      department: '-',
      color: '#6B7280',
    },
  }));
};

// ═══════════════════════════════════════════════════════════════════════════════
// 결과물(Artifact) 시스템 - 객관화
// ═══════════════════════════════════════════════════════════════════════════════
// 모호함: "결과가 남아야 한다"
// 명확함: 유형별 산출물 정의 + 저장 구조 + 추적 가능

const ARTIFACT_TYPES = {
  document: {
    id: 'document',
    name: '문서',
    icon: '📄',
    color: '#3B82F6',
    desc: '실행계획서, PR/FAQ, 보고서',
    outputs: ['실행계획서', '캠페인 메시지', '결과 보고서'],
  },
  data: {
    id: 'data',
    name: '데이터',
    icon: '📊',
    color: '#10B981',
    desc: '타겟 리스트, 측정 지표, 분석 결과',
    outputs: ['타겟 고객 리스트', '성과 지표 데이터', '세그먼트 분석'],
  },
  config: {
    id: 'config',
    name: '설정',
    icon: '⚙️',
    color: '#F97316',
    desc: '트리거 조건, 자동화 룰, 알림 설정',
    outputs: ['자동 실행 트리거', '발송 스케줄', '조건부 로직'],
  },
  record: {
    id: 'record',
    name: '기록',
    icon: '📝',
    color: '#8B5CF6',
    desc: '실행 로그, 담당자 배정, 히스토리',
    outputs: ['실행 이력', '담당자 배정표', '변경 로그'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 지속/개선 판단 시스템 - 객관화
// ═══════════════════════════════════════════════════════════════════════════════
// 모호함: "지속할지 개선할지"
// 명확함: 달성률 기반 판단 + 자동 액션 연결

const LIFECYCLE_DECISIONS = {
  continue: {
    id: 'continue',
    name: '지속',
    korean: '현행 유지',
    icon: '▶️',
    color: '#10B981',
    condition: '목표 달성률 ≥ 100%',
    threshold: { min: 100, max: Infinity },
    action: '동일 조건으로 계속 실행',
    nextStep: 'keep_running',
  },
  improve: {
    id: 'improve',
    name: '개선',
    korean: '부분 수정',
    icon: '🔧',
    color: '#F59E0B',
    condition: '목표 달성률 70~99%',
    threshold: { min: 70, max: 99 },
    action: '변수 조정 후 재실행',
    nextStep: 'adjust_and_retry',
  },
  redesign: {
    id: 'redesign',
    name: '재설계',
    korean: '전면 수정',
    icon: '🔄',
    color: '#EF4444',
    condition: '목표 달성률 < 70%',
    threshold: { min: 0, max: 69 },
    action: '6W부터 재검토',
    nextStep: 'back_to_6w',
  },
  stop: {
    id: 'stop',
    name: '종료',
    korean: '업무 종료',
    icon: '⏹️',
    color: '#6B7280',
    condition: '목적 달성 또는 환경 변화',
    threshold: null,
    action: '업무 아카이브',
    nextStep: 'archive',
  },
};

// 판단 주기 정의
const REVIEW_CYCLES = [
  { id: 'weekly', name: '주간', days: 7, icon: '📅' },
  { id: 'monthly', name: '월간', days: 30, icon: '📆' },
  { id: 'quarterly', name: '분기', days: 90, icon: '🗓️' },
];

// 달성률 → 판단 결과 자동 산출 함수
const evaluatePerformance = (achievementRate) => {
  if (achievementRate >= 100) return LIFECYCLE_DECISIONS.continue;
  if (achievementRate >= 70) return LIFECYCLE_DECISIONS.improve;
  return LIFECYCLE_DECISIONS.redesign;
};

// 결과물 생성 함수
const generateArtifacts = (eventText, sixWAnswers, prediction, assignments) => {
  const timestamp = new Date().toISOString();
  const missionId = `MISSION-${Date.now()}`;

  return {
    id: missionId,
    createdAt: timestamp,
    version: 1,
    mission: eventText,
    status: 'active', // active | paused | completed | archived

    // 📄 문서 산출물
    documents: {
      executionPlan: {
        title: `${eventText} 실행계획서`,
        content: {
          objective: sixWAnswers.why,
          target: sixWAnswers.who,
          method: sixWAnswers.how,
          channel: sixWAnswers.where,
          timing: sixWAnswers.when,
          offering: sixWAnswers.what,
        },
        createdAt: timestamp,
      },
    },

    // 📊 데이터 산출물
    data: {
      targetList: {
        segmentId: sixWAnswers.who,
        estimatedCount: Math.floor(Math.random() * 100) + 50, // 실제 연동 시 DB 조회
        extractedAt: timestamp,
      },
      prediction: {
        current: prediction.current,
        predicted: prediction.predicted,
        changeRate: prediction.change,
        calculatedAt: timestamp,
      },
    },

    // ⚙️ 설정 산출물
    config: {
      trigger: {
        type: sixWAnswers.when,
        enabled: true,
        createdAt: timestamp,
      },
      automation: {
        channel: sixWAnswers.where,
        method: sixWAnswers.how,
        active: true,
      },
    },

    // 📝 기록 산출물
    records: {
      assignments: assignments.map(a => ({
        memberId: a.member.id,
        memberName: a.member.name,
        task: a.task,
        deadline: a.deadline,
        status: 'pending',
      })),
      changelog: [
        { action: 'created', timestamp, by: 'system' },
      ],
    },

    // 📈 성과 측정 (초기값)
    performance: {
      target: 100, // 목표 달성률 (%)
      current: 0,  // 현재 달성률 (%)
      decision: null, // 판단 결과
      reviewCycle: 'weekly',
      nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8대 외부환경 요소
// ═══════════════════════════════════════════════════════════════════════════════

const EXTERNAL_FACTORS = [
  { id: 'competition', name: '경쟁', icon: '⚔️', range: [-5, 2], desc: '신규 진입자, 가격 변화' },
  { id: 'economy', name: '경제', icon: '💰', range: [-3, 3], desc: '금리, 소비심리지수' },
  { id: 'technology', name: '기술', icon: '🔧', range: [-1, 5], desc: '신기술 도입 가능성' },
  { id: 'society', name: '사회', icon: '👥', range: [-2, 4], desc: '트렌드 부합도' },
  { id: 'policy', name: '정책', icon: '📜', range: [-4, 2], desc: '규제 변화' },
  { id: 'season', name: '계절', icon: '🌸', range: [-3, 5], desc: '시즌 영향도' },
  { id: 'trend', name: '트렌드', icon: '📈', range: [-2, 4], desc: '검색량 변화' },
  { id: 'customer', name: '고객', icon: '🎯', range: [-2, 3], desc: '행동 변화' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 글로벌 표준 워크플로우 9단계
// ═══════════════════════════════════════════════════════════════════════════════

const GLOBAL_WORKFLOW = [
  {
    id: 'sense',
    phase: 1,
    name: 'SENSE',
    korean: '감지',
    icon: '👁️',
    color: '#8B5CF6',
    leader: 'Ray Dalio',
    company: 'Bridgewater',
    principle: '약한 신호 포착',
    executorFunction: 'predict', // 예측
    systemRecommendation: {
      title: '📊 외부 환경 분석 결과',
      description: '8대 외부요인 기반 미래 결과값 예측',
    },
  },
  {
    id: 'analyze',
    phase: 2,
    name: 'ANALYZE',
    korean: '분석',
    icon: '🔬',
    color: '#3B82F6',
    leader: 'Elon Musk',
    company: 'Tesla/SpaceX',
    principle: '제1원리 사고',
    executorFunction: 'specify', // 구체화
    systemRecommendation: {
      title: '🔬 근본 원인 분석',
      description: '물리법칙 수준으로 분해한 결과',
    },
  },
  {
    id: 'strategize',
    phase: 3,
    name: 'STRATEGIZE',
    korean: '전략',
    icon: '♟️',
    color: '#10B981',
    leader: 'Peter Thiel',
    company: 'PayPal/Palantir',
    principle: '독점 가능성',
    executorFunction: 'standardize', // 표준화
    systemRecommendation: {
      title: '♟️ 경쟁 분석 및 포지셔닝',
      description: 'Zero to One 프레임워크 적용 결과',
    },
  },
  {
    id: 'design',
    phase: 4,
    name: 'DESIGN',
    korean: '설계',
    icon: '📝',
    color: '#F97316',
    leader: 'Jeff Bezos',
    company: 'Amazon',
    principle: 'Working Backwards',
    executorFunction: 'standardize', // 표준화
    systemRecommendation: {
      title: '📝 PR/FAQ 초안',
      description: '출시 보도자료 자동 생성 결과',
    },
  },
  {
    id: 'build',
    phase: 5,
    name: 'BUILD',
    korean: '구축',
    icon: '🔨',
    color: '#EC4899',
    leader: 'Jeff Bezos',
    company: 'Amazon',
    principle: 'Two-Pizza Team',
    executorFunction: 'execute', // 실행
    systemRecommendation: {
      title: '🔨 최소 필요 자원',
      description: 'Two-Pizza Team 기준 산정',
    },
  },
  {
    id: 'launch',
    phase: 6,
    name: 'LAUNCH',
    korean: '출시',
    icon: '🚀',
    color: '#EF4444',
    leader: 'Reid Hoffman',
    company: 'LinkedIn',
    principle: 'MVP Rule',
    executorFunction: 'execute', // 실행
    systemRecommendation: {
      title: '🚀 MVP 범위 제안',
      description: '부끄럽지 않으면 너무 늦은 것',
    },
  },
  {
    id: 'measure',
    phase: 7,
    name: 'MEASURE',
    korean: '측정',
    icon: '📊',
    color: '#06B6D4',
    leader: 'Andy Grove',
    company: 'Intel',
    principle: 'OKR & Input Metrics',
    executorFunction: 'measure', // 측정
    systemRecommendation: {
      title: '📊 핵심 지표 제안',
      description: 'Input/Output 지표 매핑',
    },
  },
  {
    id: 'learn',
    phase: 8,
    name: 'LEARN',
    korean: '학습',
    icon: '🧠',
    color: '#8B5CF6',
    leader: 'Ray Dalio',
    company: 'Bridgewater',
    principle: 'Blameless Post-Mortem',
    executorFunction: 'improve', // 개선
    systemRecommendation: {
      title: '🧠 개선점 자동 도출',
      description: '시스템이 왜 이것을 허용했나?',
    },
  },
  {
    id: 'scale',
    phase: 9,
    name: 'SCALE',
    korean: '확장',
    icon: '📈',
    color: '#10B981',
    leader: 'Jeff Bezos',
    company: 'Amazon',
    principle: 'Flywheel Effect',
    executorFunction: 'improve', // 개선
    systemRecommendation: {
      title: '📈 확장 시나리오',
      description: '플라이휠 구조 제안',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 6W 질문 템플릿 (미션별 연동)
// ═══════════════════════════════════════════════════════════════════════════════

// 미션별 6W 프리셋
const MISSION_6W_PRESETS = {
  '휴면고객 재활성화': {
    who: {
      default: 'dormant_30',
      options: [
        { id: 'dormant_30', label: '30일+ 휴면', desc: '30일 이상 미방문 고객', recommended: true },
        { id: 'dormant_60', label: '60일+ 휴면', desc: '60일 이상 미방문 고객' },
        { id: 'dormant_90', label: '90일+ 휴면', desc: '90일 이상 장기 휴면' },
        { id: 'churned', label: '이탈 고객', desc: '등록 만료 후 미재등록' },
      ],
    },
    what: {
      default: 'comeback_offer',
      options: [
        { id: 'comeback_offer', label: '복귀 혜택', desc: '1회 무료 수업 or 할인', recommended: true },
        { id: 'new_program', label: '신규 프로그램 안내', desc: '새로운 클래스 소개' },
        { id: 'personal_consult', label: '1:1 상담 제안', desc: '맞춤 상담 예약' },
        { id: 'event_invite', label: '특별 이벤트 초대', desc: '시즌 이벤트 참여 기회' },
      ],
    },
    when: {
      default: 'trigger',
      options: [
        { id: 'trigger', label: '휴면 전환 시', desc: '30일 도달 시 자동 발송', recommended: true },
        { id: 'immediate', label: '즉시 일괄', desc: '현재 휴면 고객 전체 발송' },
        { id: 'weekly', label: '주간 배치', desc: '매주 월요일 신규 휴면자' },
        { id: 'scheduled', label: '특정 일시', desc: '지정한 날짜/시간에 발송' },
      ],
    },
    where: {
      default: 'kakao',
      options: [
        { id: 'kakao', label: '카카오톡', desc: '알림톡 (높은 도달률)', recommended: true },
        { id: 'call', label: '전화 상담', desc: '담당자 직접 연락' },
        { id: 'sms', label: 'SMS', desc: '문자 메시지' },
        { id: 'multi', label: '멀티 채널', desc: '카카오 → SMS → 전화 순차' },
      ],
    },
    how: {
      default: 'hybrid',
      options: [
        { id: 'hybrid', label: 'AI 생성 + 검토', desc: 'AI가 초안 → 담당자 확인', recommended: true },
        { id: 'auto', label: '완전 자동', desc: 'AI가 생성 및 발송' },
        { id: 'template', label: '템플릿 사용', desc: '검증된 복귀 메시지 템플릿' },
        { id: 'personal', label: '개인화 작성', desc: '고객별 맞춤 메시지' },
      ],
    },
    why: {
      default: 'reactivation',
      options: [
        { id: 'reactivation', label: '복귀 유도', desc: '휴면 고객 재방문', recommended: true },
        { id: 'prevent_churn', label: '이탈 방지', desc: '완전 이탈 전 마지막 기회' },
        { id: 'win_back', label: '관계 회복', desc: '떠난 고객과 관계 재구축' },
        { id: 'feedback', label: '이탈 원인 파악', desc: '휴면 사유 조사' },
      ],
    },
  },
  '재등록률 향상': {
    who: {
      default: 'expiring_30',
      options: [
        { id: 'expiring_30', label: '30일 내 만료', desc: '등록 만료 30일 전', recommended: true },
        { id: 'expiring_14', label: '14일 내 만료', desc: '등록 만료 14일 전' },
        { id: 'expiring_7', label: '7일 내 만료', desc: '등록 만료 임박' },
        { id: 'just_expired', label: '방금 만료', desc: '만료 후 7일 이내' },
      ],
    },
    what: {
      default: 'early_renewal',
      options: [
        { id: 'early_renewal', label: '조기 재등록 혜택', desc: '10% 할인 + 보강권', recommended: true },
        { id: 'long_term', label: '장기 등록 혜택', desc: '6개월 이상 추가 할인' },
        { id: 'progress_report', label: '성장 리포트', desc: '지금까지의 발전 현황' },
        { id: 'next_level', label: '다음 레벨 안내', desc: '상위 프로그램 소개' },
      ],
    },
    when: {
      default: 'trigger_30d',
      options: [
        { id: 'trigger_30d', label: '만료 30일 전', desc: '자동 리마인드 시작', recommended: true },
        { id: 'trigger_14d', label: '만료 14일 전', desc: '본격 재등록 안내' },
        { id: 'trigger_7d', label: '만료 7일 전', desc: '마지막 혜택 안내' },
        { id: 'periodic', label: '주기적 리마인드', desc: '30일, 14일, 7일 순차' },
      ],
    },
    where: {
      default: 'kakao',
      options: [
        { id: 'kakao', label: '카카오톡', desc: '알림톡 + 친구톡', recommended: true },
        { id: 'in_person', label: '현장 상담', desc: '수업 종료 후 안내' },
        { id: 'call', label: '전화 상담', desc: '담당 코치 연락' },
        { id: 'multi', label: '멀티 터치', desc: '메시지 → 현장 → 전화' },
      ],
    },
    how: {
      default: 'template',
      options: [
        { id: 'template', label: '검증된 템플릿', desc: '높은 전환률 메시지', recommended: true },
        { id: 'personalized', label: '개인화 메시지', desc: '학습 성과 기반 맞춤' },
        { id: 'auto', label: 'AI 자동', desc: 'AI가 최적 시점에 발송' },
        { id: 'coach_direct', label: '코치 직접', desc: '담당 코치가 작성/발송' },
      ],
    },
    why: {
      default: 'retention',
      options: [
        { id: 'retention', label: '회원 유지', desc: '기존 회원 지속 등록', recommended: true },
        { id: 'ltv_increase', label: 'LTV 향상', desc: '고객 생애 가치 증대' },
        { id: 'relationship', label: '관계 강화', desc: '장기 회원과 유대' },
        { id: 'upsell', label: '업셀', desc: '더 긴 기간/높은 프로그램' },
      ],
    },
  },
  '신규 회원 확보': {
    who: {
      default: 'trial_completed',
      options: [
        { id: 'trial_completed', label: '체험 완료 고객', desc: '체험 수업 참여자', recommended: true },
        { id: 'trial_booked', label: '체험 예약 고객', desc: '체험 예약 but 미방문' },
        { id: 'inquiry', label: '문의 고객', desc: '상담 문의한 잠재 고객' },
        { id: 'referral', label: '추천 받은 고객', desc: '기존 회원 추천' },
      ],
    },
    what: {
      default: 'first_signup',
      options: [
        { id: 'first_signup', label: '첫 등록 혜택', desc: '등록금 할인 + 유니폼', recommended: true },
        { id: 'trial_special', label: '체험 특가', desc: '무료 체험 or 50% 할인' },
        { id: 'friend_benefit', label: '친구 동반 혜택', desc: '함께 등록 시 추가 할인' },
        { id: 'level_test', label: '레벨 테스트', desc: '무료 실력 진단 + 상담' },
      ],
    },
    when: {
      default: 'post_trial',
      options: [
        { id: 'post_trial', label: '체험 직후', desc: '체험 종료 24시간 내', recommended: true },
        { id: 'trial_day', label: '체험 당일', desc: '체험 수업 직후 현장' },
        { id: 'next_day', label: '익일', desc: '체험 다음 날 오전' },
        { id: 'weekly', label: '주간 리마인드', desc: '미등록 시 주 1회' },
      ],
    },
    where: {
      default: 'in_person',
      options: [
        { id: 'in_person', label: '현장 상담', desc: '체험 후 바로 상담', recommended: true },
        { id: 'kakao', label: '카카오톡', desc: '체험 후 알림톡' },
        { id: 'call', label: '전화', desc: '상담 예약 전화' },
        { id: 'multi', label: '현장 + 후속', desc: '현장 → 카카오 → 전화' },
      ],
    },
    how: {
      default: 'coach_direct',
      options: [
        { id: 'coach_direct', label: '코치 직접 상담', desc: '체험 담당 코치가 안내', recommended: true },
        { id: 'manager', label: '관리자 상담', desc: '전문 상담사 연결' },
        { id: 'auto_followup', label: '자동 후속', desc: 'AI 후속 메시지 발송' },
        { id: 'parent_meeting', label: '학부모 미팅', desc: '학부모 대상 상담' },
      ],
    },
    why: {
      default: 'acquisition',
      options: [
        { id: 'acquisition', label: '신규 확보', desc: '체험 → 정규 전환', recommended: true },
        { id: 'conversion', label: '전환율 향상', desc: '체험 전환율 50% 목표' },
        { id: 'growth', label: '회원 수 성장', desc: '월 신규 10명 목표' },
        { id: 'community', label: '커뮤니티 확장', desc: '활발한 학원 분위기' },
      ],
    },
  },
};

// 기본 6W 템플릿 (미션 매칭 안 될 때)
const DEFAULT_6W = {
  who: {
    options: [
      { id: 'all', label: '전체 고객', desc: '모든 활성 고객 대상' },
      { id: 'segment', label: '특정 세그먼트', desc: '조건에 맞는 고객군' },
      { id: 'individual', label: '개별 고객', desc: '특정 고객 지정' },
    ],
  },
  what: {
    options: [
      { id: 'message', label: '메시지 발송', desc: '안내/홍보 메시지' },
      { id: 'benefit', label: '혜택 제공', desc: '할인/쿠폰/포인트' },
      { id: 'event', label: '이벤트', desc: '행사/프로모션' },
    ],
  },
  when: {
    options: [
      { id: 'immediate', label: '즉시', desc: '지금 바로 실행' },
      { id: 'scheduled', label: '예약', desc: '특정 날짜/시간' },
      { id: 'trigger', label: '트리거', desc: '조건 충족 시' },
    ],
  },
  where: {
    options: [
      { id: 'kakao', label: '카카오톡', desc: '알림톡/친구톡' },
      { id: 'sms', label: 'SMS', desc: '문자 메시지' },
      { id: 'call', label: '전화', desc: '직접 연락' },
    ],
  },
  how: {
    options: [
      { id: 'auto', label: '자동', desc: '시스템 자동 실행' },
      { id: 'manual', label: '수동', desc: '담당자 직접 실행' },
      { id: 'hybrid', label: '하이브리드', desc: '자동 + 검토' },
    ],
  },
  why: {
    options: [
      { id: 'growth', label: '성장', desc: '매출/회원 증가' },
      { id: 'retention', label: '유지', desc: '기존 고객 유지' },
      { id: 'engagement', label: '참여', desc: '고객 활성화' },
    ],
  },
};

const generate6WQuestions = (eventText) => {
  // 미션에 맞는 프리셋 찾기
  const preset = MISSION_6W_PRESETS[eventText] || null;

  const questions = [
    {
      id: 'who',
      label: 'WHO',
      korean: '누구에게',
      question: preset ? `"${eventText}"의 대상은?` : '이 이벤트의 대상은 누구인가요?',
      options: preset?.who?.options || DEFAULT_6W.who.options,
      defaultValue: preset?.who?.default,
    },
    {
      id: 'what',
      label: 'WHAT',
      korean: '무엇을',
      question: preset ? `"${eventText}"에서 제공할 것은?` : '무엇을 제공하나요?',
      options: preset?.what?.options || DEFAULT_6W.what.options,
      defaultValue: preset?.what?.default,
    },
    {
      id: 'when',
      label: 'WHEN',
      korean: '언제',
      question: preset ? `"${eventText}" 실행 시점은?` : '언제 실행하나요?',
      options: preset?.when?.options || DEFAULT_6W.when.options,
      defaultValue: preset?.when?.default,
    },
    {
      id: 'where',
      label: 'WHERE',
      korean: '어디서',
      question: preset ? `"${eventText}" 전달 채널은?` : '어떤 채널로 전달하나요?',
      options: preset?.where?.options || DEFAULT_6W.where.options,
      defaultValue: preset?.where?.default,
    },
    {
      id: 'how',
      label: 'HOW',
      korean: '어떻게',
      question: preset ? `"${eventText}" 실행 방식은?` : '어떻게 실행하나요?',
      options: preset?.how?.options || DEFAULT_6W.how.options,
      defaultValue: preset?.how?.default,
    },
    {
      id: 'why',
      label: 'WHY',
      korean: '왜',
      question: preset ? `"${eventText}"의 목적은?` : '이 이벤트의 목적은 무엇인가요?',
      options: preset?.why?.options || DEFAULT_6W.why.options,
      defaultValue: preset?.why?.default,
    },
  ];

  return questions;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 미래 결과값 예측 함수
// ═══════════════════════════════════════════════════════════════════════════════

const predictFutureValue = (currentValue, factorValues, months = 3) => {
  // R(t+n) = R(t) × (1 + Σ(기울기_i))^n
  const totalSlope = Object.values(factorValues).reduce((sum, val) => sum + (val / 100), 0);
  const predictedValue = currentValue * Math.pow(1 + totalSlope / 12, months);

  return {
    current: currentValue,
    predicted: Math.round(predictedValue),
    change: Math.round(((predictedValue - currentValue) / currentValue) * 100),
    slope: Math.round(totalSlope * 100) / 100,
    months,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOP 3 이벤트 예시 생성
// ═══════════════════════════════════════════════════════════════════════════════

const generateTopEvents = (sixWAnswers) => {
  const who = sixWAnswers.who;

  const eventSuggestions = {
    dormant: [
      { title: '컴백 웰컴 쿠폰', roi: 2440, desc: '30일 미방문 고객 10% 할인' },
      { title: '신규 프로그램 안내', roi: 1850, desc: '최신 프로그램 소개 + 체험권' },
      { title: '1:1 재등록 상담', roi: 3200, desc: '개인 맞춤 상담 예약' },
    ],
    premium: [
      { title: 'VIP 전용 혜택', roi: 1920, desc: '프리미엄 고객 특별 할인' },
      { title: '얼리버드 이벤트', roi: 2100, desc: '신규 런칭 우선 참여' },
      { title: '멤버십 업그레이드', roi: 2800, desc: '다음 등급 혜택 미리보기' },
    ],
    new: [
      { title: '첫 구매 할인', roi: 1650, desc: '신규 가입 고객 웰컴 쿠폰' },
      { title: '온보딩 가이드', roi: 1200, desc: '서비스 이용 방법 안내' },
      { title: '친구 추천 리워드', roi: 2400, desc: '추천인/피추천인 혜택' },
    ],
    all: [
      { title: '시즌 프로모션', roi: 1800, desc: '전 고객 대상 할인 이벤트' },
      { title: '감사 이벤트', roi: 1400, desc: '고객 감사 포인트 지급' },
      { title: '신규 서비스 런칭', roi: 2200, desc: '새로운 기능/서비스 안내' },
    ],
  };

  return eventSuggestions[who] || eventSuggestions.all;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUSUnified() {
  // ─────────────────────────────────────────────────────────────────────────────
  // 상태 관리
  // ─────────────────────────────────────────────────────────────────────────────

  // Phase 0: 이벤트 입력
  const [step, setStep] = useState('input'); // 'input' | '6w' | 'workflow' | 'result'
  const [selectedCompany, setSelectedCompany] = useState('allthatbasket'); // 회사 선택
  const [eventText, setEventText] = useState('');
  const [eventType, setEventType] = useState(''); // 'onetime' | 'recurring'

  // 현재 선택된 회사 데이터
  const currentCompany = useMemo(() => getCompanyData(selectedCompany), [selectedCompany]);

  // 6W 답변
  const [sixWAnswers, setSixWAnswers] = useState({});
  const [current6WIndex, setCurrent6WIndex] = useState(0);

  // 외부환경 분석
  const [factorValues, setFactorValues] = useState(() => {
    const initial = {};
    EXTERNAL_FACTORS.forEach(f => { initial[f.id] = 0; });
    return initial;
  });

  // 워크플로우
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseAnswers, setPhaseAnswers] = useState({});
  const [executedPhases, setExecutedPhases] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // 예측값
  const [baseRevenue, setBaseRevenue] = useState(10000000);

  // 결과물 & 성과 관리
  const [missionArtifact, setMissionArtifact] = useState(null);
  const [performanceRate, setPerformanceRate] = useState(0); // 달성률 시뮬레이션용
  const [selectedDecision, setSelectedDecision] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 계산
  // ─────────────────────────────────────────────────────────────────────────────

  const sixWQuestions = useMemo(() => generate6WQuestions(eventText), [eventText]);
  const topEvents = useMemo(() => generateTopEvents(sixWAnswers), [sixWAnswers]);
  const prediction = useMemo(
    () => predictFutureValue(baseRevenue, factorValues, 3),
    [baseRevenue, factorValues]
  );

  const completedSixW = useMemo(() => {
    return Object.keys(sixWAnswers).length;
  }, [sixWAnswers]);

  const currentWorkflow = GLOBAL_WORKFLOW[currentPhase];

  // ─────────────────────────────────────────────────────────────────────────────
  // 핸들러
  // ─────────────────────────────────────────────────────────────────────────────

  const handleEventSubmit = useCallback(() => {
    if (eventText.trim()) {
      // 시스템이 이벤트 유형 자동 판단
      const autoEventType = eventText.includes('생일') || eventText.includes('재등록') || eventText.includes('휴면')
        ? 'recurring' : 'onetime';
      setEventType(autoEventType);
      setStep('6w');
    }
  }, [eventText]);

  const handle6WSelect = useCallback((questionId, optionId) => {
    setSixWAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }, []);

  const handleNext6W = useCallback(() => {
    if (current6WIndex < sixWQuestions.length - 1) {
      setCurrent6WIndex(prev => prev + 1);
    } else {
      setStep('workflow');
    }
  }, [current6WIndex, sixWQuestions.length]);

  const handlePrev6W = useCallback(() => {
    if (current6WIndex > 0) {
      setCurrent6WIndex(prev => prev - 1);
    }
  }, [current6WIndex]);

  // 6W 진입 시 기본값 자동 선택
  React.useEffect(() => {
    if (step === '6w' && sixWQuestions[current6WIndex]) {
      const currentQuestion = sixWQuestions[current6WIndex];
      // 이미 답변이 없고 defaultValue가 있으면 자동 선택
      if (!sixWAnswers[currentQuestion.id] && currentQuestion.defaultValue) {
        setSixWAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: currentQuestion.defaultValue,
        }));
      }
    }
  }, [step, current6WIndex, sixWQuestions, sixWAnswers]);

  const handleFactorChange = useCallback((factorId, value) => {
    setFactorValues(prev => ({ ...prev, [factorId]: value }));
  }, []);

  const handlePhaseSelect = useCallback((questionId, optionId) => {
    setPhaseAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }, []);

  const nextPhase = useCallback(() => {
    if (currentPhase < GLOBAL_WORKFLOW.length - 1) {
      setExecutedPhases(prev => [...prev, currentPhase]);
      setCurrentPhase(prev => prev + 1);
    } else {
      // 워크플로우 완료 → 결과물 생성
      const artifact = generateArtifacts(eventText, sixWAnswers, prediction, assignRoles(eventText));
      setMissionArtifact(artifact);
      setPerformanceRate(0);
      setSelectedDecision(null);
      setStep('result');
    }
  }, [currentPhase, eventText, sixWAnswers, prediction]);

  const prevPhase = useCallback(() => {
    if (currentPhase > 0) {
      setCurrentPhase(prev => prev - 1);
    }
  }, [currentPhase]);

  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    for (let i = 0; i <= GLOBAL_WORKFLOW.length; i++) {
      setCurrentPhase(Math.min(i, GLOBAL_WORKFLOW.length - 1));
      setExecutedPhases(prev => [...prev, i]);
      await new Promise(r => setTimeout(r, 400));
    }
    setIsRunning(false);
    // 워크플로우 완료 → 결과물 생성
    const artifact = generateArtifacts(eventText, sixWAnswers, prediction, assignRoles(eventText));
    setMissionArtifact(artifact);
    setPerformanceRate(0);
    setSelectedDecision(null);
    setStep('result');
  }, [eventText, sixWAnswers, prediction]);

  const resetAll = useCallback(() => {
    setStep('input');
    setEventText('');
    setEventType('');
    setSixWAnswers({});
    setCurrent6WIndex(0);
    setCurrentPhase(0);
    setPhaseAnswers({});
    setExecutedPhases([]);
    setMissionArtifact(null);
    setPerformanceRate(0);
    setSelectedDecision(null);
    EXTERNAL_FACTORS.forEach(f => {
      setFactorValues(prev => ({ ...prev, [f.id]: 0 }));
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 렌더링
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%)',
      color: '#F8FAFC',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* 헤더 */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #2D2D3D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            AUTUS 업무 실행기 v7
          </h1>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
            객관화 → 구체화 → 표준화 → 예측 → 실행 → 측정 → 개선
          </p>
        </div>

        {/* 진행 상태 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {Object.entries(EXECUTOR_FUNCTIONS).map(([key, func]) => (
            <div key={key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: `${func.color}15`,
              borderRadius: 20,
              fontSize: 11,
              color: func.color,
            }}>
              <span>{func.icon}</span>
              <span>{func.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: 이벤트 입력 */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {step === 'input' && (
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 40,
        }}>
          {/* 회사 정보 + 시장 현황 */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #F9731620, #EF444410)',
            borderRadius: 16,
            border: '1px solid #F9731640',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              {/* 회사 선택 & 정보 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 36 }}>{currentCompany.icon}</span>
                  <div>
                    {/* 회사 선택 드롭다운 */}
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        setEventText(''); // 회사 변경 시 미션 초기화
                      }}
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: currentCompany.color,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                        marginBottom: 4,
                      }}
                    >
                      {Object.values(COMPANIES).map(company => (
                        <option
                          key={company.id}
                          value={company.id}
                          style={{ background: '#1A1A2E', color: 'white' }}
                        >
                          {company.icon} {company.name}
                        </option>
                      ))}
                    </select>
                    <div>
                      <span style={{
                        padding: '4px 12px',
                        background: '#8B5CF620',
                        borderRadius: 20,
                        fontSize: 12,
                        color: '#8B5CF6',
                        fontWeight: 500,
                      }}>
                        {currentCompany.industryIcon} {currentCompany.industry}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 시장 현황 */}
              <div style={{
                display: 'flex',
                gap: 16,
              }}>
                <div style={{
                  padding: 16,
                  background: '#0A0A0F80',
                  borderRadius: 12,
                  textAlign: 'center',
                  minWidth: 120,
                }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>시장 성장률</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>
                    {currentCompany.marketGrowth >= 0 ? '+' : ''}{currentCompany.marketGrowth}%
                  </div>
                  <div style={{ fontSize: 10, color: '#10B981' }}>▲ 매년 성장</div>
                </div>
                <div style={{
                  padding: 16,
                  background: '#0A0A0F80',
                  borderRadius: 12,
                  textAlign: 'center',
                  minWidth: 120,
                }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{currentCompany.name} 성장률</div>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: currentCompany.companyGrowth >= 0 ? '#10B981' : '#EF4444',
                  }}>
                    {currentCompany.companyGrowth >= 0 ? '+' : ''}{currentCompany.companyGrowth}%
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: currentCompany.companyGrowth >= 0 ? '#10B981' : '#EF4444',
                  }}>
                    {currentCompany.companyGrowth >= 0 ? '▲ 상승 추세' : '▼ 하향 추세'}
                  </div>
                </div>
                {(() => {
                  const gap = currentCompany.companyGrowth - currentCompany.marketGrowth;
                  const isPositive = gap >= 0;
                  return (
                    <div style={{
                      padding: 16,
                      background: isPositive ? '#10B98120' : '#EF444420',
                      borderRadius: 12,
                      textAlign: 'center',
                      minWidth: 120,
                      border: `1px solid ${isPositive ? '#10B98140' : '#EF444440'}`,
                    }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>GAP</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: isPositive ? '#10B981' : '#EF4444' }}>
                        {isPositive ? '+' : ''}{gap}%p
                      </div>
                      <div style={{ fontSize: 10, color: isPositive ? '#10B981' : '#EF4444' }}>
                        {isPositive ? '✅ 양호' : '⚠️ 위험 신호'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 메인 입력 영역 */}
          <div style={{
            padding: 32,
            background: 'linear-gradient(135deg, #8B5CF620, #3B82F610)',
            borderRadius: 24,
            border: '1px solid #8B5CF640',
            marginBottom: 24,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: 40 }}>🎯</span>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '12px 0 8px' }}>
                1️⃣ 객관화 - 미션 선택
              </h2>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                실행할 미션을 선택하거나 직접 입력하세요
              </p>
            </div>

            {/* 회사별 대표 미션 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 20,
            }}>
              {currentCompany.missions.map((mission, idx) => {
                const icons = ['🔥', '📈', '🎯'];
                return (
                <button
                  key={`mission_${idx}`}
                  onClick={() => setEventText(mission.title)}
                  style={{
                    padding: 20,
                    background: eventText === mission.title ? `${mission.color}20` : '#0F0F18',
                    border: eventText === mission.title
                      ? `2px solid ${mission.color}`
                      : '2px solid #2D2D3D',
                    borderRadius: 16,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{icons[idx] || '📌'}</div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: eventText === mission.title ? mission.color : '#F8FAFC',
                    marginBottom: 6,
                  }}>
                    {mission.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                    {mission.desc}
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    background: `${mission.color}20`,
                    borderRadius: 20,
                    fontSize: 11,
                    color: mission.color,
                    display: 'inline-block',
                  }}>
                    💡 {mission.impact}
                  </div>
                </button>
                );
              })}
            </div>

            {/* 직접 입력 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, display: 'block' }}>
                또는 직접 입력
              </label>
              <input
                type="text"
                value={eventText}
                onChange={(e) => setEventText(e.target.value)}
                placeholder="실행하고 싶은 업무를 자유롭게 입력하세요..."
                style={{
                  width: '100%',
                  padding: 14,
                  background: '#0F0F18',
                  border: '2px solid #2D2D3D',
                  borderRadius: 12,
                  color: '#F8FAFC',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            </div>

            {/* 다음 버튼 */}
            <button
              onClick={handleEventSubmit}
              disabled={!eventText.trim()}
              style={{
                width: '100%',
                padding: 16,
                background: eventText.trim()
                  ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                  : '#2D2D3D',
                border: 'none',
                borderRadius: 12,
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                cursor: eventText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              미션 실행 시작 →
            </button>
          </div>

          {/* 표준 워크플로우 미리보기 - 상세 9단계 */}
          <div style={{
            padding: 24,
            background: '#0F0F18',
            borderRadius: 16,
            border: '1px solid #1E1E2E',
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#9CA3AF' }}>
              📐 글로벌 표준 9단계 워크플로우
            </h3>

            {/* 전체 흐름 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 20,
              padding: 12,
              background: '#0A0A0F',
              borderRadius: 10,
            }}>
              <span style={{ padding: '4px 10px', background: '#8B5CF620', borderRadius: 6, fontSize: 11 }}>
                🎯 입력
              </span>
              <span style={{ color: '#4B5563', fontSize: 10 }}>→</span>
              <span style={{ padding: '4px 10px', background: '#3B82F620', borderRadius: 6, fontSize: 11 }}>
                📋 6W
              </span>
              <span style={{ color: '#4B5563', fontSize: 10 }}>→</span>
              <span style={{ padding: '4px 10px', background: '#10B98120', borderRadius: 6, fontSize: 11 }}>
                📐 9단계
              </span>
              <span style={{ color: '#4B5563', fontSize: 10 }}>→</span>
              <span style={{ padding: '4px 10px', background: '#F9731620', borderRadius: 6, fontSize: 11 }}>
                ✅ 결과
              </span>
              {eventType === 'recurring' && (
                <>
                  <span style={{ color: '#4B5563', fontSize: 10 }}>→</span>
                  <span style={{ padding: '4px 10px', background: '#EC489920', borderRadius: 6, fontSize: 11 }}>
                    🔄 반복
                  </span>
                </>
              )}
            </div>

            {/* 9단계 상세 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}>
              {GLOBAL_WORKFLOW.map((phase) => (
                <div
                  key={phase.id}
                  style={{
                    padding: 12,
                    background: `${phase.color}10`,
                    borderRadius: 10,
                    border: `1px solid ${phase.color}30`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{phase.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: phase.color }}>
                      {phase.phase}. {phase.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280' }}>
                    {phase.korean} · {phase.leader}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: '#4B5563',
                    marginTop: 4,
                    fontStyle: 'italic',
                  }}>
                    "{phase.principle}"
                  </div>
                </div>
              ))}
            </div>

            {/* 업무 실행기 7기능 매핑 */}
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#0A0A0F',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
                ⚡ 업무 실행기 7기능이 자동 적용됩니다
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(EXECUTOR_FUNCTIONS).map(([key, func]) => (
                  <span
                    key={key}
                    style={{
                      padding: '3px 8px',
                      background: `${func.color}15`,
                      borderRadius: 4,
                      fontSize: 10,
                      color: func.color,
                    }}
                  >
                    {func.icon} {func.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: 6W 구체화 */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {step === '6w' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 73px)' }}>
          {/* 좌측: 6W 진행 상황 */}
          <div style={{
            width: 280,
            borderRight: '1px solid #2D2D3D',
            padding: 16,
            overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#9CA3AF' }}>
              📋 2️⃣ 구체화 - 6W 정의
            </h3>

            {/* 입력된 이벤트 */}
            <div style={{
              padding: 12,
              background: '#8B5CF620',
              borderRadius: 10,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: '#8B5CF6', marginBottom: 4 }}>입력된 이벤트</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{eventText}</div>
              <div style={{
                fontSize: 11,
                color: eventType === 'recurring' ? '#10B981' : '#F97316',
                marginTop: 4,
              }}>
                {eventType === 'recurring' ? '🔄 반복성' : '📌 단발성'}
              </div>
            </div>

            {/* 6W 리스트 */}
            {sixWQuestions.map((q, idx) => {
              const isActive = idx === current6WIndex;
              const isCompleted = sixWAnswers[q.id];

              return (
                <div
                  key={q.id}
                  onClick={() => setCurrent6WIndex(idx)}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: isActive ? '#3B82F620' : 'transparent',
                    borderRadius: 10,
                    border: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isCompleted ? '#10B981' : '#2D2D3D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'white',
                    }}>
                      {isCompleted ? '✓' : q.label.charAt(0)}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#3B82F6' : '#F8FAFC' }}>
                        {q.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        {q.korean}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 진행률 */}
            <div style={{
              padding: 16,
              background: '#0F0F18',
              borderRadius: 12,
              marginTop: 16,
            }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>구체화 진행률</div>
              <div style={{
                height: 8,
                background: '#2D2D3D',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(completedSixW / 6) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3B82F6, #10B981)',
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, textAlign: 'center' }}>
                {completedSixW} / 6
              </div>
            </div>
          </div>

          {/* 중앙: 현재 질문 */}
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{
              maxWidth: 700,
              margin: '0 auto',
            }}>
              {/* 현재 질문 헤더 */}
              <div style={{
                padding: 24,
                background: 'linear-gradient(135deg, #3B82F620, transparent)',
                borderRadius: 16,
                border: '1px solid #3B82F640',
                marginBottom: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: '#3B82F630',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#3B82F6',
                  }}>
                    {sixWQuestions[current6WIndex].label}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, color: '#3B82F6', marginBottom: 4 }}>
                      {current6WIndex + 1} / 6
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                      {sixWQuestions[current6WIndex].question}
                    </h2>
                    <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                      {sixWQuestions[current6WIndex].korean}
                    </div>
                  </div>
                </div>
              </div>

              {/* 옵션 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sixWQuestions[current6WIndex].options.map((opt, idx) => {
                  const isSelected = sixWAnswers[sixWQuestions[current6WIndex].id] === opt.id;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handle6WSelect(sixWQuestions[current6WIndex].id, opt.id)}
                      style={{
                        padding: 20,
                        background: isSelected ? '#3B82F620' : '#0F0F18',
                        border: isSelected ? '2px solid #3B82F6' : '2px solid #1E1E2E',
                        borderRadius: 12,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: isSelected ? '#3B82F6' : '#2D2D3D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'white',
                        }}>
                          {isSelected ? '✓' : idx + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <span style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: isSelected ? '#3B82F6' : '#F8FAFC',
                            }}>
                              {opt.label}
                            </span>
                            {opt.recommended && (
                              <span style={{
                                padding: '2px 8px',
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                borderRadius: 12,
                                fontSize: 10,
                                fontWeight: 700,
                                color: 'white',
                                letterSpacing: '0.5px',
                              }}>
                                추천
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                            {opt.desc}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* 직접 입력 */}
                <button
                  style={{
                    padding: 20,
                    background: '#0F0F18',
                    border: '2px dashed #2D2D3D',
                    borderRadius: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#6B7280',
                    fontSize: 14,
                  }}
                >
                  ✏️ 직접 입력...
                </button>
              </div>

              {/* 네비게이션 */}
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button
                  onClick={handlePrev6W}
                  disabled={current6WIndex === 0}
                  style={{
                    flex: 1,
                    padding: 14,
                    background: '#1E1E2E',
                    border: 'none',
                    borderRadius: 10,
                    color: current6WIndex === 0 ? '#4B5563' : '#9CA3AF',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: current6WIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ← 이전
                </button>
                <button
                  onClick={handleNext6W}
                  disabled={!sixWAnswers[sixWQuestions[current6WIndex].id]}
                  style={{
                    flex: 1,
                    padding: 14,
                    background: sixWAnswers[sixWQuestions[current6WIndex].id]
                      ? 'linear-gradient(135deg, #3B82F6, #10B981)'
                      : '#2D2D3D',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: sixWAnswers[sixWQuestions[current6WIndex].id] ? 'pointer' : 'not-allowed',
                  }}
                >
                  {current6WIndex === sixWQuestions.length - 1 ? '워크플로우 시작 →' : '다음 →'}
                </button>
              </div>
            </div>
          </div>

          {/* 우측: TOP 3 이벤트 & 예측 */}
          <div style={{
            width: 320,
            borderLeft: '1px solid #2D2D3D',
            padding: 16,
            overflowY: 'auto',
          }}>
            {/* WHO 선택 시 TOP 3 이벤트 표시 */}
            {sixWAnswers.who && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#9CA3AF' }}>
                  🏆 TOP 3 추천 이벤트
                </h3>
                {topEvents.map((event, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 16,
                      background: idx === 0 ? '#F9731620' : '#0F0F18',
                      borderRadius: 12,
                      border: idx === 0 ? '1px solid #F9731640' : '1px solid #1E1E2E',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: idx === 0 ? '#F97316' : '#2D2D3D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'white',
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{event.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                      {event.desc}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: '#10B98120',
                      borderRadius: 6,
                      fontSize: 11,
                      color: '#10B981',
                    }}>
                      예상 ROI: {event.roi}%
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6W 요약 */}
            <div style={{
              padding: 16,
              background: '#0F0F18',
              borderRadius: 12,
              border: '1px solid #1E1E2E',
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#9CA3AF' }}>
                📋 6W 현재 상태
              </h3>
              {sixWQuestions.map(q => {
                const answer = sixWAnswers[q.id];
                const option = q.options.find(o => o.id === answer);

                return (
                  <div
                    key={q.id}
                    style={{
                      padding: 10,
                      background: answer ? '#10B98110' : '#1A1A24',
                      borderRadius: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{q.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: answer ? '#10B981' : '#4B5563' }}>
                        {option ? option.label : '미선택'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: 9단계 워크플로우 */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {step === 'workflow' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 73px)' }}>
          {/* 좌측: 9단계 네비게이션 */}
          <div style={{
            width: 280,
            borderRight: '1px solid #2D2D3D',
            padding: 16,
            overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#9CA3AF' }}>
              📐 3️⃣ 표준화 - 글로벌 9단계
            </h3>

            {GLOBAL_WORKFLOW.map((phase, idx) => {
              const isActive = idx === currentPhase;
              const isExecuted = executedPhases.includes(idx);
              const funcInfo = EXECUTOR_FUNCTIONS[phase.executorFunction];

              return (
                <div
                  key={phase.id}
                  onClick={() => !isRunning && setCurrentPhase(idx)}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: isActive ? `${phase.color}20` : 'transparent',
                    borderRadius: 10,
                    border: isActive ? `2px solid ${phase.color}` : '2px solid transparent',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    opacity: isRunning && !isActive ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isExecuted ? '#10B981' : `${phase.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      {isExecuted ? '✓' : phase.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: phase.color }}>
                        {phase.phase}. {phase.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#6B7280' }}>
                        {phase.korean} · {phase.leader}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 6px',
                      background: `${funcInfo.color}20`,
                      borderRadius: 4,
                      fontSize: 9,
                      color: funcInfo.color,
                    }}>
                      {funcInfo.name}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* 전체 실행 버튼 */}
            <button
              onClick={runWorkflow}
              disabled={isRunning}
              style={{
                width: '100%',
                padding: 14,
                marginTop: 16,
                background: isRunning ? '#2D2D3D' : 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              {isRunning ? '⚡ 실행 중...' : '🚀 전체 워크플로우 실행'}
            </button>
          </div>

          {/* 중앙: 현재 단계 */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {/* 단계 헤더 */}
            <div style={{
              padding: 24,
              background: `linear-gradient(135deg, ${currentWorkflow.color}20, transparent)`,
              borderRadius: 16,
              border: `1px solid ${currentWorkflow.color}40`,
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: `${currentWorkflow.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}>
                  {currentWorkflow.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: currentWorkflow.color, marginBottom: 4 }}>
                    PHASE {currentWorkflow.phase} / 9
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                    {currentWorkflow.name} ({currentWorkflow.korean})
                  </h2>
                  <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                    {currentWorkflow.leader} ({currentWorkflow.company}) · "{currentWorkflow.principle}"
                  </div>
                </div>
                <div style={{
                  padding: '8px 16px',
                  background: `${EXECUTOR_FUNCTIONS[currentWorkflow.executorFunction].color}20`,
                  borderRadius: 20,
                  fontSize: 13,
                  color: EXECUTOR_FUNCTIONS[currentWorkflow.executorFunction].color,
                }}>
                  {EXECUTOR_FUNCTIONS[currentWorkflow.executorFunction].icon} {EXECUTOR_FUNCTIONS[currentWorkflow.executorFunction].name}
                </div>
              </div>
            </div>

            {/* 시스템 추천 (먼저 표시) */}
            <div style={{
              padding: 20,
              background: 'linear-gradient(135deg, #10B98115, #10B98105)',
              borderRadius: 12,
              border: '1px solid #10B98130',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#10B981' }}>
                  시스템 추천
                </h3>
                <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 'auto' }}>자동 생성됨</span>
              </div>

              <div style={{
                padding: 16,
                background: '#0A0A0F80',
                borderRadius: 10,
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                  {currentWorkflow.systemRecommendation.title}
                </h4>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                  {currentWorkflow.systemRecommendation.description}
                </p>

                {/* SENSE 단계일 때 미래 결과값 예측 */}
                {currentWorkflow.id === 'sense' && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 12,
                    }}>
                      <div style={{
                        padding: 12,
                        background: '#1A1A24',
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>현재 매출</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC' }}>
                          ₩{(prediction.current / 10000).toLocaleString()}만
                        </div>
                      </div>
                      <div style={{
                        padding: 12,
                        background: prediction.change >= 0 ? '#10B98120' : '#EF444420',
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>3개월 후 예측</div>
                        <div style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: prediction.change >= 0 ? '#10B981' : '#EF4444',
                        }}>
                          ₩{(prediction.predicted / 10000).toLocaleString()}만
                          <span style={{ fontSize: 12, marginLeft: 4 }}>
                            ({prediction.change >= 0 ? '+' : ''}{prediction.change}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 사용자 입력/선택 영역 */}
            <div style={{
              padding: 20,
              background: '#0F0F18',
              borderRadius: 12,
              border: '1px solid #1E1E2E',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>✏️</span>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                  사용자 선택/입력
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => handlePhaseSelect(currentWorkflow.id, 'approve')}
                  style={{
                    padding: 16,
                    background: phaseAnswers[currentWorkflow.id] === 'approve'
                      ? `${currentWorkflow.color}20` : '#1A1A24',
                    border: phaseAnswers[currentWorkflow.id] === 'approve'
                      ? `2px solid ${currentWorkflow.color}` : '2px solid #2D2D3D',
                    borderRadius: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: phaseAnswers[currentWorkflow.id] === 'approve'
                        ? currentWorkflow.color : '#2D2D3D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: 'white',
                    }}>
                      ✓
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC' }}>
                        시스템 추천 승인
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        추천된 내용을 그대로 적용합니다
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handlePhaseSelect(currentWorkflow.id, 'modify')}
                  style={{
                    padding: 16,
                    background: phaseAnswers[currentWorkflow.id] === 'modify'
                      ? '#F9731620' : '#1A1A24',
                    border: phaseAnswers[currentWorkflow.id] === 'modify'
                      ? '2px solid #F97316' : '2px solid #2D2D3D',
                    borderRadius: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: phaseAnswers[currentWorkflow.id] === 'modify'
                        ? '#F97316' : '#2D2D3D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: 'white',
                    }}>
                      ✎
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC' }}>
                        수정하여 적용
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        일부 내용을 수정합니다
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 네비게이션 */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={prevPhase}
                disabled={currentPhase === 0 || isRunning}
                style={{
                  flex: 1,
                  padding: 14,
                  background: '#1E1E2E',
                  border: 'none',
                  borderRadius: 10,
                  color: currentPhase === 0 ? '#4B5563' : '#9CA3AF',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: currentPhase === 0 || isRunning ? 'not-allowed' : 'pointer',
                }}
              >
                ← 이전 단계
              </button>
              <button
                onClick={nextPhase}
                disabled={isRunning}
                style={{
                  flex: 1,
                  padding: 14,
                  background: `linear-gradient(135deg, ${currentWorkflow.color}, ${currentWorkflow.color}CC)`,
                  border: 'none',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                }}
              >
                {currentPhase === GLOBAL_WORKFLOW.length - 1 ? '완료 →' : '다음 단계 →'}
              </button>
            </div>
          </div>

          {/* 우측: 8대 외부환경 & 예측 */}
          <div style={{
            width: 340,
            borderLeft: '1px solid #2D2D3D',
            padding: 16,
            overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#9CA3AF' }}>
              🔮 4️⃣ 예측 - 미래 결과값
            </h3>

            {/* 예측 결과 */}
            <div style={{
              padding: 20,
              background: 'linear-gradient(135deg, #8B5CF620, #3B82F610)',
              borderRadius: 12,
              marginBottom: 16,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6B7280' }}>3개월 후 예측 매출</div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: prediction.change >= 0 ? '#10B981' : '#EF4444',
                }}>
                  ₩{(prediction.predicted / 10000).toLocaleString()}만
                </div>
                <div style={{
                  fontSize: 14,
                  color: prediction.change >= 0 ? '#10B981' : '#EF4444',
                }}>
                  {prediction.change >= 0 ? '▲' : '▼'} {Math.abs(prediction.change)}%
                </div>
              </div>

              <div style={{
                padding: 12,
                background: '#0A0A0F60',
                borderRadius: 8,
                fontSize: 12,
                color: '#9CA3AF',
              }}>
                📐 R(t+n) = R(t) × (1 + Σ기울기)^n
                <br />
                기울기 합계: {prediction.slope}%/월
              </div>
            </div>

            {/* 8대 외부환경 요소 */}
            <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#6B7280' }}>
              📊 8대 외부환경 요소
            </h4>

            {EXTERNAL_FACTORS.map(factor => (
              <div
                key={factor.id}
                style={{
                  padding: 12,
                  background: '#0F0F18',
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{factor.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{factor.name}</span>
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: factorValues[factor.id] > 0 ? '#10B981' : factorValues[factor.id] < 0 ? '#EF4444' : '#6B7280',
                  }}>
                    {factorValues[factor.id] > 0 ? '+' : ''}{factorValues[factor.id]}%
                  </span>
                </div>
                <input
                  type="range"
                  min={factor.range[0]}
                  max={factor.range[1]}
                  value={factorValues[factor.id]}
                  onChange={(e) => handleFactorChange(factor.id, parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: `linear-gradient(to right, #EF4444, #6B7280, #10B981)`,
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ fontSize: 10, color: '#4B5563', marginTop: 4 }}>
                  {factor.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 4: 결과 */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {step === 'result' && (
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 40,
        }}>
          {/* 완료 헤더 */}
          <div style={{
            padding: 40,
            background: 'linear-gradient(135deg, #10B98130, #10B98110)',
            borderRadius: 24,
            border: '1px solid #10B98150',
            textAlign: 'center',
            marginBottom: 32,
          }}>
            <span style={{ fontSize: 64 }}>✅</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: '16px 0 8px' }}>
              업무 실행 완료!
            </h2>
            <p style={{ fontSize: 15, color: '#9CA3AF' }}>
              "{eventText}" 이벤트가 성공적으로 설정되었습니다
            </p>
          </div>

          {/* 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            {/* 6W 요약 */}
            <div style={{
              padding: 24,
              background: '#0F0F18',
              borderRadius: 16,
              border: '1px solid #1E1E2E',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#3B82F6' }}>
                📋 6W 정의
              </h3>
              {sixWQuestions.map(q => {
                const answer = sixWAnswers[q.id];
                const option = q.options.find(o => o.id === answer);
                return (
                  <div key={q.id} style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{q.label}: </span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{option?.label || '-'}</span>
                  </div>
                );
              })}
            </div>

            {/* 예측 결과 */}
            <div style={{
              padding: 24,
              background: '#0F0F18',
              borderRadius: 16,
              border: '1px solid #1E1E2E',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#8B5CF6' }}>
                🔮 예측 결과
              </h3>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#6B7280' }}>현재 → 3개월 후</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  ₩{(prediction.current / 10000).toLocaleString()}만 → ₩{(prediction.predicted / 10000).toLocaleString()}만
                </div>
              </div>
              <div style={{
                padding: 8,
                background: prediction.change >= 0 ? '#10B98120' : '#EF444420',
                borderRadius: 8,
                textAlign: 'center',
                color: prediction.change >= 0 ? '#10B981' : '#EF4444',
                fontWeight: 600,
              }}>
                {prediction.change >= 0 ? '+' : ''}{prediction.change}% 변화 예상
              </div>
            </div>

            {/* 실행 상태 */}
            <div style={{
              padding: 24,
              background: '#0F0F18',
              borderRadius: 16,
              border: '1px solid #1E1E2E',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#10B981' }}>
                ⚡ 실행 상태
              </h3>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#6B7280' }}>워크플로우</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>9단계 완료</div>
              </div>
              <div style={{
                padding: 8,
                background: eventType === 'recurring' ? '#8B5CF620' : '#F9731620',
                borderRadius: 8,
                textAlign: 'center',
                fontSize: 12,
                color: eventType === 'recurring' ? '#8B5CF6' : '#F97316',
              }}>
                {eventType === 'recurring' ? '🔄 트리거 대기 중' : '📌 1회 실행 예약됨'}
              </div>
            </div>
          </div>

          {/* 업무 실행기 7기능 상태 */}
          <div style={{
            padding: 24,
            background: '#0F0F18',
            borderRadius: 16,
            border: '1px solid #1E1E2E',
            marginBottom: 32,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#9CA3AF' }}>
              ⚡ 업무 실행기 7기능 상태
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {Object.entries(EXECUTOR_FUNCTIONS).map(([key, func]) => (
                <div
                  key={key}
                  style={{
                    textAlign: 'center',
                    padding: 16,
                    background: `${func.color}15`,
                    borderRadius: 12,
                    flex: 1,
                    margin: '0 4px',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{func.icon}</span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: func.color, marginTop: 8 }}>
                    {func.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#10B981', marginTop: 4 }}>✓ 완료</div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* 조직 구성원 역할 배정 */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #0F0F18, #1a1a2e)',
            borderRadius: 16,
            border: '1px solid #F9731640',
            marginBottom: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>👥</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: currentCompany.color, margin: 0 }}>
                  {currentCompany.name} 팀 역할 배정
                </h3>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0' }}>
                  "{eventText}" 미션 수행을 위한 담당자 배정
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 12
            }}>
              {assignRoles(eventText, selectedCompany).map((assignment, idx) => (
                <div
                  key={assignment.member?.id || idx}
                  style={{
                    padding: 16,
                    background: `${assignment.member?.color || '#6B7280'}10`,
                    borderRadius: 12,
                    border: `1px solid ${assignment.member?.color || '#6B7280'}30`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* 순서 뱃지 */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: assignment.member?.color || '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'white',
                  }}>
                    {idx + 1}
                  </div>

                  {/* 담당자 정보 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${assignment.member?.color || '#6B7280'}, ${assignment.member?.color || '#6B7280'}80)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'white',
                    }}>
                      {assignment.member?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{assignment.member?.name || '미지정'}</div>
                      <div style={{ fontSize: 11, color: assignment.member?.color || '#6B7280' }}>
                        {assignment.member?.role || '-'} · {assignment.member?.department || '-'}
                      </div>
                    </div>
                  </div>

                  {/* 배정된 업무 */}
                  <div style={{
                    padding: 10,
                    background: '#0A0A12',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>담당 업무</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#E5E7EB' }}>
                      {assignment.task}
                    </div>
                  </div>

                  {/* 마감일 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      📅 마감: {assignment.deadline}
                    </div>
                    <div style={{
                      fontSize: 10,
                      padding: '4px 8px',
                      background: '#10B98120',
                      color: '#10B981',
                      borderRadius: 4,
                      fontWeight: 500,
                    }}>
                      대기 중
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 전체 일정 요약 */}
            <div style={{
              marginTop: 20,
              padding: 16,
              background: '#0A0A12',
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>총 배정 인원</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#F97316' }}>
                  {assignRoles(eventText).length}명
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #1E1E2E', paddingLeft: 20, marginLeft: 20 }}>
                <div style={{ fontSize: 12, color: '#6B7280' }}>예상 완료일</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>
                  {(() => {
                    const today = new Date();
                    today.setDate(today.getDate() + 14);
                    return `${today.getMonth() + 1}/${today.getDate()}`;
                  })()}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #1E1E2E', paddingLeft: 20, marginLeft: 20 }}>
                <div style={{ fontSize: 12, color: '#6B7280' }}>미션 타입</div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: eventType === 'recurring' ? '#8B5CF6' : '#F97316'
                }}>
                  {eventType === 'recurring' ? '🔄 반복 미션' : '📌 단발성 미션'}
                </div>
              </div>
              <button style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                📧 담당자에게 알림 전송
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* 📦 결과물(Artifact) 목록 - 객관화: 산출물 저장 & 추적 */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #0F0F18, #1a1a2e)',
            borderRadius: 16,
            border: '1px solid #3B82F640',
            marginBottom: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>📦</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#3B82F6', margin: 0 }}>
                  생성된 결과물 (Artifacts)
                </h3>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0' }}>
                  업무 실행으로 생성된 산출물 · 저장 및 추적 가능
                </p>
              </div>
              {missionArtifact && (
                <div style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  background: '#10B98120',
                  borderRadius: 20,
                  fontSize: 11,
                  color: '#10B981',
                  fontWeight: 600,
                }}>
                  ID: {missionArtifact.id}
                </div>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}>
              {Object.entries(ARTIFACT_TYPES).map(([key, type]) => (
                <div
                  key={key}
                  style={{
                    padding: 16,
                    background: `${type.color}10`,
                    borderRadius: 12,
                    border: `1px solid ${type.color}30`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{type.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: type.color }}>
                      {type.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
                    {type.desc}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {type.outputs.map((output, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '6px 10px',
                          background: '#0A0A12',
                          borderRadius: 6,
                          fontSize: 11,
                          color: '#E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{output}</span>
                        <span style={{ color: '#10B981', fontSize: 10 }}>✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 저장 버튼 */}
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#0A0A12',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                💾 결과물은 자동 저장되며, 언제든 조회할 수 있습니다
              </div>
              <button style={{
                padding: '8px 16px',
                background: '#3B82F6',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                📥 JSON 내보내기
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* 🔄 지속/개선 판단 시스템 - 객관화: 달성률 기반 자동 판단 */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #0F0F18, #1a1a2e)',
            borderRadius: 16,
            border: '1px solid #F59E0B40',
            marginBottom: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>🔄</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B', margin: 0 }}>
                  업무 수명주기 관리
                </h3>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0' }}>
                  성과 측정 → 판단 → 다음 액션 자동 연결
                </p>
              </div>
            </div>

            {/* 성과 달성률 시뮬레이터 */}
            <div style={{
              padding: 20,
              background: '#0A0A12',
              borderRadius: 12,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>📊 목표 달성률 (시뮬레이션)</span>
                <span style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: performanceRate >= 100 ? '#10B981' : performanceRate >= 70 ? '#F59E0B' : '#EF4444',
                }}>
                  {performanceRate}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                value={performanceRate}
                onChange={(e) => {
                  const rate = parseInt(e.target.value);
                  setPerformanceRate(rate);
                  setSelectedDecision(evaluatePerformance(rate));
                }}
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: '#EF4444' }}>0%</span>
                <span style={{ fontSize: 10, color: '#EF4444' }}>70%</span>
                <span style={{ fontSize: 10, color: '#F59E0B' }}>100%</span>
                <span style={{ fontSize: 10, color: '#10B981' }}>150%</span>
              </div>
            </div>

            {/* 판단 옵션 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 16,
            }}>
              {Object.entries(LIFECYCLE_DECISIONS).map(([key, decision]) => {
                const isRecommended = selectedDecision?.id === decision.id;
                const isSelected = selectedDecision?.id === decision.id;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDecision(decision)}
                    style={{
                      padding: 16,
                      background: isSelected ? `${decision.color}20` : '#0A0A12',
                      borderRadius: 12,
                      border: isSelected ? `2px solid ${decision.color}` : '2px solid #1E1E2E',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                    }}
                  >
                    {isRecommended && (
                      <div style={{
                        position: 'absolute',
                        top: -8,
                        right: 8,
                        padding: '2px 8px',
                        background: decision.color,
                        borderRadius: 10,
                        fontSize: 9,
                        fontWeight: 700,
                        color: 'white',
                      }}>
                        AI 추천
                      </div>
                    )}
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{decision.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: decision.color, marginBottom: 4 }}>
                      {decision.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
                      {decision.korean}
                    </div>
                    <div style={{
                      fontSize: 10,
                      padding: '4px 8px',
                      background: '#1E1E2E',
                      borderRadius: 4,
                      color: '#6B7280',
                    }}>
                      {decision.condition}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 선택된 판단 결과 */}
            {selectedDecision && (
              <div style={{
                padding: 16,
                background: `${selectedDecision.color}15`,
                borderRadius: 12,
                border: `1px solid ${selectedDecision.color}40`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{selectedDecision.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: selectedDecision.color }}>
                      판단: {selectedDecision.name} ({selectedDecision.korean})
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {selectedDecision.condition}
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: 12,
                  background: '#0A0A12',
                  borderRadius: 8,
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>다음 액션</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDecision.action}</div>
                </div>
                <button
                  onClick={() => {
                    if (selectedDecision.nextStep === 'back_to_6w') {
                      setStep('6w');
                      setCurrent6WIndex(0);
                    } else if (selectedDecision.nextStep === 'archive') {
                      alert('업무가 아카이브 되었습니다.');
                      resetAll();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: 14,
                    background: `linear-gradient(135deg, ${selectedDecision.color}, ${selectedDecision.color}CC)`,
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {selectedDecision.nextStep === 'keep_running' && '▶️ 현행 유지하며 계속 실행'}
                  {selectedDecision.nextStep === 'adjust_and_retry' && '🔧 변수 조정 후 재실행'}
                  {selectedDecision.nextStep === 'back_to_6w' && '🔄 6W부터 재검토 시작'}
                  {selectedDecision.nextStep === 'archive' && '⏹️ 업무 종료 및 아카이브'}
                </button>
              </div>
            )}

            {/* 검토 주기 설정 */}
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#0A0A12',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                🗓️ 성과 검토 주기
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {REVIEW_CYCLES.map(cycle => (
                  <button
                    key={cycle.id}
                    style={{
                      padding: '6px 12px',
                      background: cycle.id === 'weekly' ? '#F59E0B20' : '#1E1E2E',
                      border: cycle.id === 'weekly' ? '1px solid #F59E0B' : '1px solid #2D2D3D',
                      borderRadius: 6,
                      color: cycle.id === 'weekly' ? '#F59E0B' : '#6B7280',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {cycle.icon} {cycle.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 다음 액션 */}
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={resetAll}
              style={{
                flex: 1,
                padding: 16,
                background: '#1E1E2E',
                border: 'none',
                borderRadius: 12,
                color: '#9CA3AF',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              ← 새 이벤트 만들기
            </button>
            <button
              style={{
                flex: 1,
                padding: 16,
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                borderRadius: 12,
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📊 대시보드에서 모니터링 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
