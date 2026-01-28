/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🤖 AUTUS AI 추천 로직 설계
 * 
 * 핵심 원칙:
 * 1. 투명성 - 왜 이 추천인지 설명
 * 2. 행동 가능성 - 바로 실행할 수 있는 추천
 * 3. 개인화 - 역할/상황에 맞는 추천
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { MotivationRole } from '../motivation';

// ═══════════════════════════════════════════════════════════════════════════════
// 추천 타입
// ═══════════════════════════════════════════════════════════════════════════════

export type RecommendationType = 
  | 'action'              // 행동 추천
  | 'timing'              // 타이밍 추천  
  | 'content'             // 콘텐츠 추천
  | 'target'              // 대상 추천
  | 'prediction'          // 예측 기반 추천
  | 'optimization';       // 최적화 추천

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  targetRole: MotivationRole;
  
  // 내용
  title: string;
  description: string;
  reasoning: string;          // 왜 이 추천인지
  confidence: number;         // 0-100 신뢰도
  
  // 액션
  actionLabel: string;
  actionUrl?: string;
  actionData?: Record<string, unknown>;
  
  // 예상 효과
  expectedOutcome?: string;
  expectedImpact?: 'high' | 'medium' | 'low';
  
  // 만료
  expiresAt?: Date;
  
  // 피드백
  wasHelpful?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 추천 트리거 조건
// ═══════════════════════════════════════════════════════════════════════════════

export interface RecommendationTrigger {
  id: string;
  name: string;
  description: string;
  conditions: TriggerCondition[];
  recommendation: Omit<Recommendation, 'id'>;
}

export interface TriggerCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 역할별 추천 규칙
// ═══════════════════════════════════════════════════════════════════════════════

// 🔨 선생님 추천 규칙
export const TEACHER_RECOMMENDATIONS: RecommendationTrigger[] = [
  {
    id: 'risk_student_talk',
    name: '관심 필요 학생 대화',
    description: '온도가 낮은 학생과 대화 추천',
    conditions: [
      { field: 'student.temperature', operator: 'lt', value: 50 },
      { field: 'student.lastContact', operator: 'gt', value: 3 }, // 3일 이상 접촉 없음
    ],
    recommendation: {
      type: 'action',
      priority: 'high',
      targetRole: 'EXECUTOR',
      title: '{studentName}와(과) 5분 대화하기',
      description: '온도가 {temperature}°예요. 간단한 대화로 상태를 확인해보세요.',
      reasoning: '최근 {lastContact}일간 개별 대화가 없었고, 온도가 떨어지고 있어요.',
      confidence: 85,
      actionLabel: '대화 후 기록하기',
      actionUrl: '/quick-tag?student={studentId}',
      expectedOutcome: '대화 후 온도 +5~10° 예상',
      expectedImpact: 'high',
    },
  },
  {
    id: 'parent_update',
    name: '학부모 업데이트',
    description: '좋은 소식을 학부모에게 전달',
    conditions: [
      { field: 'student.recentPositive', operator: 'eq', value: true },
      { field: 'parent.lastMessage', operator: 'gt', value: 7 }, // 7일 이상 연락 없음
    ],
    recommendation: {
      type: 'action',
      priority: 'medium',
      targetRole: 'EXECUTOR',
      title: '{studentName} 어머니께 좋은 소식 전하기',
      description: '최근 {positiveEvent}! 어머니께 알려드리면 좋겠어요.',
      reasoning: '학부모 연락이 {lastMessage}일간 없었고, 좋은 소식이 있어요.',
      confidence: 90,
      actionLabel: '메시지 보내기',
      actionUrl: '/messages/new?parent={parentId}',
      expectedOutcome: '학부모 만족도 상승, 재등록율 +10%',
      expectedImpact: 'medium',
    },
  },
  {
    id: 'record_reminder',
    name: '기록 리마인더',
    description: '오늘 기록이 없을 때',
    conditions: [
      { field: 'teacher.todayRecords', operator: 'eq', value: 0 },
      { field: 'time.hour', operator: 'gt', value: 17 }, // 오후 5시 이후
    ],
    recommendation: {
      type: 'timing',
      priority: 'medium',
      targetRole: 'EXECUTOR',
      title: '오늘 기록 아직 안 하셨어요!',
      description: '🔥 {streak}일 연속 기록 중! 오늘도 기록해서 유지하세요.',
      reasoning: '연속 기록이 끊기면 다시 시작하기 어려워요.',
      confidence: 95,
      actionLabel: '지금 기록하기',
      actionUrl: '/quick-tag',
      expectedOutcome: '연속 기록 유지 → 케어 품질 향상',
      expectedImpact: 'medium',
    },
  },
  {
    id: 'birthday_reminder',
    name: '생일 축하',
    description: '학생 생일 알림',
    conditions: [
      { field: 'student.birthday', operator: 'eq', value: 'today' },
    ],
    recommendation: {
      type: 'timing',
      priority: 'high',
      targetRole: 'EXECUTOR',
      title: '🎂 {studentName} 오늘 생일이에요!',
      description: '수업 시작 전 축하해주세요. 작은 관심이 큰 차이를 만들어요.',
      reasoning: '생일 축하 경험은 학생의 학원 만족도에 큰 영향을 줘요.',
      confidence: 100,
      actionLabel: '축하 기록하기',
      actionUrl: '/quick-tag?student={studentId}&tag=birthday',
      expectedOutcome: '학생 만족도 상승, 온도 +5~15°',
      expectedImpact: 'high',
    },
  },
];

// ⚙️ 실장 추천 규칙
export const MANAGER_RECOMMENDATIONS: RecommendationTrigger[] = [
  {
    id: 'unresolved_risk',
    name: '미조치 경고',
    description: '24시간 이상 미조치 학생',
    conditions: [
      { field: 'riskStudent.hoursUnresolved', operator: 'gt', value: 24 },
    ],
    recommendation: {
      type: 'action',
      priority: 'critical',
      targetRole: 'OPERATOR',
      title: '⚠️ {count}명 24시간 이상 미조치',
      description: '빠른 조치가 필요해요. 담당 선생님에게 알림을 보낼까요?',
      reasoning: '24시간 이상 미조치 시 이탈 확률이 2배 증가해요.',
      confidence: 90,
      actionLabel: '담당자 알림',
      actionUrl: '/risk-queue?status=pending',
      expectedOutcome: '이탈 방지, 팀 대응 속도 향상',
      expectedImpact: 'high',
    },
  },
  {
    id: 'teacher_support',
    name: '선생님 지원',
    description: '기록률 낮은 선생님 지원',
    conditions: [
      { field: 'teacher.weeklyRecordRate', operator: 'lt', value: 50 },
    ],
    recommendation: {
      type: 'target',
      priority: 'medium',
      targetRole: 'OPERATOR',
      title: '{teacherName} 선생님 지원이 필요해요',
      description: '이번 주 기록률이 {recordRate}%예요. 어려움이 있는지 확인해보세요.',
      reasoning: '기록률이 낮으면 학생 케어 품질도 떨어져요.',
      confidence: 80,
      actionLabel: '메시지 보내기',
      actionUrl: '/messages/new?teacher={teacherId}',
      expectedOutcome: '선생님 기록률 향상 → 전체 케어 품질 향상',
      expectedImpact: 'medium',
    },
  },
  {
    id: 'churn_prevention',
    name: '이탈 예방',
    description: '이탈 예측 학생 조치',
    conditions: [
      { field: 'prediction.churnProbability', operator: 'gt', value: 70 },
    ],
    recommendation: {
      type: 'prediction',
      priority: 'critical',
      targetRole: 'OPERATOR',
      title: '🚨 {studentName} 이탈 확률 {probability}%',
      description: 'AI가 {reason}으로 이탈 가능성이 높다고 판단했어요.',
      reasoning: '비슷한 패턴의 학생 중 {similarChurnRate}%가 이탈했어요.',
      confidence: 75,
      actionLabel: '먼저 챙기기 시작',
      actionUrl: '/students/{studentId}/shield',
      expectedOutcome: '이탈 방지 시 예상 매출 유지 ₩{monthlyValue}',
      expectedImpact: 'high',
    },
  },
];

// 👑 원장 추천 규칙
export const OWNER_RECOMMENDATIONS: RecommendationTrigger[] = [
  {
    id: 'goal_at_risk',
    name: '목표 달성 위험',
    description: '분기 목표 달성 위험 시',
    conditions: [
      { field: 'goal.achievementRate', operator: 'lt', value: 80 },
      { field: 'goal.daysRemaining', operator: 'lt', value: 30 },
    ],
    recommendation: {
      type: 'prediction',
      priority: 'high',
      targetRole: 'OWNER',
      title: '⚠️ 분기 목표 달성 위험',
      description: '현재 추세대로면 목표 {target}명 대비 {predicted}명 예상',
      reasoning: '남은 기간 대비 등록 속도가 느려요.',
      confidence: 80,
      actionLabel: '시뮬레이션 보기',
      actionUrl: '/analytics/simulation',
      expectedOutcome: '조치 시 목표 달성 가능성 +20%',
      expectedImpact: 'high',
    },
  },
  {
    id: 'decision_followup',
    name: '결정 후속 조치',
    description: '과거 결정 결과 확인',
    conditions: [
      { field: 'decision.daysAfter', operator: 'eq', value: 30 },
    ],
    recommendation: {
      type: 'timing',
      priority: 'medium',
      targetRole: 'OWNER',
      title: '📊 "{decisionTitle}" 결과 확인',
      description: '30일 전 결정의 결과를 확인해보세요.',
      reasoning: '결정 → 결과 확인은 판단력 향상에 필수예요.',
      confidence: 95,
      actionLabel: '결과 보기',
      actionUrl: '/decisions/{decisionId}/result',
      expectedOutcome: '의사결정 품질 향상',
      expectedImpact: 'medium',
    },
  },
];

// 👨‍👩‍👧 학부모 추천 규칙
export const PARENT_RECOMMENDATIONS: RecommendationTrigger[] = [
  {
    id: 'praise_child',
    name: '칭찬 권장',
    description: '아이가 잘했을 때 칭찬 권장',
    conditions: [
      { field: 'child.recentAchievement', operator: 'eq', value: true },
    ],
    recommendation: {
      type: 'content',
      priority: 'medium',
      targetRole: 'PARENT',
      title: '💪 {childName}을(를) 칭찬해주세요!',
      description: '최근 {achievement}! 칭찬은 아이의 자신감을 키워요.',
      reasoning: '성과 직후 칭찬이 가장 효과적이에요.',
      confidence: 90,
      actionLabel: '칭찬 메시지 보내기',
      actionUrl: '/messages/new?child={childId}',
      expectedOutcome: '아이 자신감 향상, 학습 동기 증가',
      expectedImpact: 'medium',
    },
  },
  {
    id: 'counseling_suggest',
    name: '상담 제안',
    description: '상담이 필요할 때',
    conditions: [
      { field: 'child.temperature', operator: 'lt', value: 60 },
      { field: 'lastCounseling', operator: 'gt', value: 30 },
    ],
    recommendation: {
      type: 'action',
      priority: 'high',
      targetRole: 'PARENT',
      title: '선생님과 상담을 추천드려요',
      description: '최근 {childName}의 학습 상태에 대해 선생님과 이야기해보세요.',
      reasoning: '마지막 상담 후 {daysSince}일이 지났고, 아이 상태가 불안정해요.',
      confidence: 75,
      actionLabel: '상담 신청',
      actionUrl: '/counseling/request',
      expectedOutcome: '아이 상태 파악, 맞춤 케어 가능',
      expectedImpact: 'high',
    },
  },
];

// 🎒 학생 추천 규칙
export const STUDENT_RECOMMENDATIONS: RecommendationTrigger[] = [
  {
    id: 'homework_reminder',
    name: '숙제 리마인더',
    description: '숙제 마감 임박',
    conditions: [
      { field: 'homework.dueHours', operator: 'lt', value: 3 },
      { field: 'homework.isCompleted', operator: 'eq', value: false },
    ],
    recommendation: {
      type: 'timing',
      priority: 'high',
      targetRole: 'STUDENT',
      title: '⏰ 숙제 마감 {hours}시간 전!',
      description: '지금 완료하면 +{xp} XP 받을 수 있어!',
      reasoning: '마감 전에 완료해야 보상을 받을 수 있어요.',
      confidence: 95,
      actionLabel: '숙제 하러 가기',
      actionUrl: '/homework/{homeworkId}',
      expectedOutcome: '숙제 완료, XP 획득, 연속 기록 유지',
      expectedImpact: 'high',
    },
  },
  {
    id: 'level_up_close',
    name: '레벨업 임박',
    description: '레벨업까지 조금 남았을 때',
    conditions: [
      { field: 'xp.toNextLevel', operator: 'lt', value: 50 },
    ],
    recommendation: {
      type: 'content',
      priority: 'medium',
      targetRole: 'STUDENT',
      title: '🎉 {xpNeeded} XP만 더 모으면 레벨업!',
      description: '오늘 숙제 하나만 더 하면 Level {nextLevel} 달성!',
      reasoning: '레벨업이 가까우면 동기부여가 높아져요.',
      confidence: 90,
      actionLabel: '지금 도전하기',
      actionUrl: '/missions',
      expectedOutcome: '레벨업 → 성취감 → 학습 동기 증가',
      expectedImpact: 'high',
    },
  },
  {
    id: 'dream_connection',
    name: '꿈 연결',
    description: '현재 학습과 꿈 연결',
    conditions: [
      { field: 'student.hasDream', operator: 'eq', value: true },
      { field: 'lesson.canConnectToDream', operator: 'eq', value: true },
    ],
    recommendation: {
      type: 'content',
      priority: 'low',
      targetRole: 'STUDENT',
      title: '💡 이거 알아? {dreamJob}도 이걸 써!',
      description: '지금 배우는 {subject}가 {dreamJob}에서 {usedFor}로 쓰여!',
      reasoning: '꿈과 연결하면 학습 의미가 생겨요.',
      confidence: 85,
      actionLabel: '더 알아보기',
      actionUrl: '/dream/connection',
      expectedOutcome: '학습 의미 부여 → 동기 증가',
      expectedImpact: 'medium',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// AI 추천 엔진 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface AIRecommendationConfig {
  // 추천 생성 설정
  maxRecommendationsPerDay: number;
  minConfidenceThreshold: number;
  
  // 우선순위 가중치
  priorityWeights: Record<RecommendationPriority, number>;
  
  // 피드백 학습
  feedbackLearningEnabled: boolean;
  feedbackDecayDays: number;
}

export const AI_RECOMMENDATION_CONFIG: AIRecommendationConfig = {
  maxRecommendationsPerDay: 10,
  minConfidenceThreshold: 70,
  
  priorityWeights: {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  },
  
  feedbackLearningEnabled: true,
  feedbackDecayDays: 30,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getRecommendationsForRole(role: MotivationRole): RecommendationTrigger[] {
  switch (role) {
    case 'EXECUTOR': return TEACHER_RECOMMENDATIONS;
    case 'OPERATOR': return MANAGER_RECOMMENDATIONS;
    case 'OWNER': return OWNER_RECOMMENDATIONS;
    case 'PARENT': return PARENT_RECOMMENDATIONS;
    case 'STUDENT': return STUDENT_RECOMMENDATIONS;
    default: return [];
  }
}

export function interpolateRecommendation(
  template: Recommendation,
  data: Record<string, unknown>
): Recommendation {
  const interpolate = (text: string) => {
    return text.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? `{${key}}`));
  };
  
  return {
    ...template,
    title: interpolate(template.title),
    description: interpolate(template.description),
    reasoning: interpolate(template.reasoning),
    expectedOutcome: template.expectedOutcome ? interpolate(template.expectedOutcome) : undefined,
    actionUrl: template.actionUrl ? interpolate(template.actionUrl) : undefined,
  };
}

export function sortRecommendationsByPriority(recommendations: Recommendation[]): Recommendation[] {
  const weights = AI_RECOMMENDATION_CONFIG.priorityWeights;
  return [...recommendations].sort((a, b) => {
    const weightA = weights[a.priority] * (a.confidence / 100);
    const weightB = weights[b.priority] * (b.confidence / 100);
    return weightB - weightA;
  });
}
