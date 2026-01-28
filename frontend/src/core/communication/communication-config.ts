/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💬 AUTUS 학부모↔선생님 소통 시스템
 * 
 * 핵심 원칙:
 * 1. 비대칭 소통 - 선생님은 자주, 학부모는 편하게
 * 2. 템플릿 기반 - 빠르고 일관된 소통
 * 3. 자동화 - 정기 리포트 자동 발송
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 메시지 타입
// ═══════════════════════════════════════════════════════════════════════════════

export type MessageType = 
  | 'praise'              // 칭찬 메시지
  | 'update'              // 상태 업데이트
  | 'concern'             // 우려 사항
  | 'request'             // 요청/안내
  | 'report'              // 리포트
  | 'celebration'         // 축하
  | 'reminder'            // 리마인더
  | 'reply';              // 답장

export type MessageCategory = 
  | 'academic'            // 학업 관련
  | 'behavior'            // 행동/태도
  | 'attendance'          // 출결
  | 'payment'             // 비용
  | 'general';            // 일반

// ═══════════════════════════════════════════════════════════════════════════════
// 메시지 템플릿
// ═══════════════════════════════════════════════════════════════════════════════

export interface MessageTemplate {
  id: string;
  type: MessageType;
  category: MessageCategory;
  name: string;
  description: string;
  subject: string;
  body: string;
  placeholders: string[];
  emoji?: string;
  autoSuggestConditions?: string[];
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 👏 칭찬 메시지
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'praise_general',
    type: 'praise',
    category: 'general',
    name: '일반 칭찬',
    description: '아이의 좋은 점을 전달',
    subject: '{childName}가 오늘 정말 잘했어요!',
    body: `어머니 안녕하세요, {teacherName}입니다.

오늘 {childName}가 수업에서 정말 잘했어요! {praiseDetail}

이런 모습을 보면 정말 뿌듯해요. 어머니 덕분입니다. 😊

앞으로도 {childName}를 잘 케어하겠습니다.`,
    placeholders: ['childName', 'teacherName', 'praiseDetail'],
    emoji: '👏',
  },
  {
    id: 'praise_improvement',
    type: 'praise',
    category: 'academic',
    name: '성적 향상',
    description: '성적이 올랐을 때',
    subject: '🎉 {childName} 성적이 올랐어요!',
    body: `어머니 안녕하세요, {teacherName}입니다.

좋은 소식 전해드려요! 📈

{childName}의 {subject} 점수가 {beforeScore}점 → {afterScore}점으로 {improvement}점 올랐어요!

{childName}가 정말 열심히 한 결과예요. 집에서도 많이 칭찬해주세요! 💪

계속 이 기세로 달려보겠습니다!`,
    placeholders: ['childName', 'teacherName', 'subject', 'beforeScore', 'afterScore', 'improvement'],
    emoji: '📈',
    autoSuggestConditions: ['score_improved > 10'],
  },
  {
    id: 'praise_attitude',
    type: 'praise',
    category: 'behavior',
    name: '태도 칭찬',
    description: '학습 태도가 좋을 때',
    subject: '{childName}의 학습 태도가 정말 좋아요!',
    body: `어머니 안녕하세요, {teacherName}입니다.

{childName}가 요즘 수업 태도가 정말 좋아졌어요!

{attitudeDetail}

이런 태도라면 성적도 금방 따라올 거예요. 앞으로가 정말 기대됩니다! ⭐`,
    placeholders: ['childName', 'teacherName', 'attitudeDetail'],
    emoji: '⭐',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 업데이트/리포트
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'weekly_report',
    type: 'report',
    category: 'general',
    name: '주간 리포트',
    description: '매주 자동 발송되는 리포트',
    subject: '📊 {childName}의 이번 주 리포트',
    body: `어머니 안녕하세요, {teacherName}입니다.

이번 주 {childName}의 학습 현황을 알려드려요.

📅 출석: {attendance}
📝 숙제: {homework}
📊 테스트: {testScore}

{summary}

{teacherComment}

다음 주도 화이팅! 💪`,
    placeholders: ['childName', 'teacherName', 'attendance', 'homework', 'testScore', 'summary', 'teacherComment'],
    emoji: '📊',
  },
  {
    id: 'progress_update',
    type: 'update',
    category: 'academic',
    name: '학습 진행 상황',
    description: '학습 진도 업데이트',
    subject: '{childName} 학습 진행 상황 알려드려요',
    body: `어머니 안녕하세요, {teacherName}입니다.

{childName}의 현재 학습 진행 상황을 공유드려요.

📚 현재 단원: {currentUnit}
📈 진도: {progress}
🎯 다음 목표: {nextGoal}

{additionalComment}

궁금하신 점 있으시면 언제든 말씀해주세요!`,
    placeholders: ['childName', 'teacherName', 'currentUnit', 'progress', 'nextGoal', 'additionalComment'],
    emoji: '📚',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ 우려/관심 필요
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'concern_attendance',
    type: 'concern',
    category: 'attendance',
    name: '출결 관련',
    description: '출결에 문제가 있을 때',
    subject: '{childName} 출결 관련 안내드려요',
    body: `어머니 안녕하세요, {teacherName}입니다.

{childName} 관련해서 말씀드릴 게 있어요.

최근 {attendanceIssue}

혹시 집에서 힘든 일이 있거나, 학원에서 불편한 점이 있는지 궁금해요.
제가 도울 수 있는 일이 있으면 말씀해주세요.

{childName}가 즐겁게 다닐 수 있도록 함께 고민해보면 좋겠습니다. 🙏`,
    placeholders: ['childName', 'teacherName', 'attendanceIssue'],
    emoji: '⚠️',
    autoSuggestConditions: ['late_count >= 3', 'absent_count >= 2'],
  },
  {
    id: 'concern_academic',
    type: 'concern',
    category: 'academic',
    name: '학업 관련',
    description: '학업에 어려움이 있을 때',
    subject: '{childName} 학습 관련 상담 요청드려요',
    body: `어머니 안녕하세요, {teacherName}입니다.

{childName} 학습 관련해서 말씀드릴 게 있어요.

{academicConcern}

{childName}가 어려워하는 부분을 함께 해결하고 싶어요.
짧게라도 상담 시간을 가지면 좋겠는데, 가능하실까요?

편하신 시간 알려주시면 제가 맞출게요. 🙏`,
    placeholders: ['childName', 'teacherName', 'academicConcern'],
    emoji: '📝',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎂 축하
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'birthday',
    type: 'celebration',
    category: 'general',
    name: '생일 축하',
    description: '아이 생일 축하',
    subject: '🎂 {childName} 생일 축하해요!',
    body: `어머니 안녕하세요, {teacherName}입니다.

오늘 {childName} 생일이죠? 🎂🎉

{childName}의 생일을 진심으로 축하드려요!
오늘 수업에서 {childName}에게 작은 축하를 해줬어요.

{childName}가 건강하고 행복하게 자라길 바랍니다. 💝

생일 축하합니다!`,
    placeholders: ['childName', 'teacherName'],
    emoji: '🎂',
    autoSuggestConditions: ['is_birthday'],
  },
  {
    id: 'achievement',
    type: 'celebration',
    category: 'academic',
    name: '성취 축하',
    description: '특별한 성취가 있을 때',
    subject: '🏆 {childName}가 대단한 일을 해냈어요!',
    body: `어머니 안녕하세요, {teacherName}입니다.

정말 기쁜 소식 전해드려요! 🎉

{childName}가 {achievement}!!

정말 대단하지 않나요? 저도 너무 자랑스러워요. 💪

집에서도 많이 칭찬해주세요. {childName}의 노력이 빛을 발하고 있어요! ⭐`,
    placeholders: ['childName', 'teacherName', 'achievement'],
    emoji: '🏆',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📢 안내/요청
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'reminder_payment',
    type: 'reminder',
    category: 'payment',
    name: '수강료 안내',
    description: '수강료 납부 안내',
    subject: '📋 {month}월 수강료 안내드려요',
    body: `어머니 안녕하세요, {teacherName}입니다.

{month}월 수강료 안내드려요.

💰 수강료: {amount}원
📅 납부 기한: {dueDate}

항상 {childName}에게 관심 가져주셔서 감사합니다.
궁금하신 점 있으시면 언제든 연락주세요!`,
    placeholders: ['month', 'teacherName', 'amount', 'dueDate', 'childName'],
    emoji: '📋',
  },
  {
    id: 'schedule_change',
    type: 'request',
    category: 'general',
    name: '일정 변경',
    description: '수업 일정 변경 안내',
    subject: '📅 수업 일정 변경 안내',
    body: `어머니 안녕하세요, {teacherName}입니다.

{childName} 수업 일정 변경 안내드려요.

📅 변경 전: {beforeSchedule}
📅 변경 후: {afterSchedule}
📝 사유: {reason}

불편을 드려 죄송합니다. 🙏
문의사항 있으시면 언제든 연락주세요!`,
    placeholders: ['teacherName', 'childName', 'beforeSchedule', 'afterSchedule', 'reason'],
    emoji: '📅',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 소통 플로우 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface CommunicationFlow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: FlowStep[];
  autoEnabled: boolean;
}

export interface FlowStep {
  order: number;
  action: string;
  delay?: number;         // 이전 단계 후 대기 시간 (ms)
  condition?: string;
  templateId?: string;
}

export const COMMUNICATION_FLOWS: CommunicationFlow[] = [
  {
    id: 'weekly_report_flow',
    name: '주간 리포트 발송',
    description: '매주 금요일 자동 리포트 발송',
    trigger: 'schedule:friday_18:00',
    steps: [
      { order: 1, action: 'generate_report', templateId: 'weekly_report' },
      { order: 2, action: 'send_message', delay: 0 },
    ],
    autoEnabled: true,
  },
  {
    id: 'positive_event_flow',
    name: '좋은 일 바로 알림',
    description: '좋은 일이 생기면 바로 알림',
    trigger: 'event:positive',
    steps: [
      { order: 1, action: 'detect_event', condition: 'score_up > 10 OR achievement' },
      { order: 2, action: 'select_template', templateId: 'praise_improvement' },
      { order: 3, action: 'send_message', delay: 1000 * 60 * 30 }, // 30분 후
    ],
    autoEnabled: true,
  },
  {
    id: 'concern_alert_flow',
    name: '우려 사항 알림',
    description: '문제가 감지되면 선생님에게 알림',
    trigger: 'event:concern',
    steps: [
      { order: 1, action: 'detect_issue', condition: 'late_count >= 3' },
      { order: 2, action: 'alert_teacher' },
      { order: 3, action: 'suggest_template', templateId: 'concern_attendance' },
      // 선생님이 직접 보내도록 (자동 발송 아님)
    ],
    autoEnabled: false,
  },
  {
    id: 'birthday_flow',
    name: '생일 축하 플로우',
    description: '생일에 자동 축하 메시지',
    trigger: 'event:birthday',
    steps: [
      { order: 1, action: 'check_birthday' },
      { order: 2, action: 'send_message', templateId: 'birthday', delay: 1000 * 60 * 60 * 9 }, // 오전 9시
    ],
    autoEnabled: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 소통 빈도 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface CommunicationFrequency {
  messageType: MessageType;
  minInterval: number;      // 최소 간격 (일)
  maxPerWeek: number;       // 주당 최대 횟수
  bestTimes: string[];      // 최적 발송 시간
}

export const COMMUNICATION_FREQUENCY: CommunicationFrequency[] = [
  {
    messageType: 'praise',
    minInterval: 1,
    maxPerWeek: 3,
    bestTimes: ['17:00', '18:00', '19:00'],
  },
  {
    messageType: 'report',
    minInterval: 7,
    maxPerWeek: 1,
    bestTimes: ['18:00'],
  },
  {
    messageType: 'concern',
    minInterval: 3,
    maxPerWeek: 2,
    bestTimes: ['10:00', '14:00'],
  },
  {
    messageType: 'reminder',
    minInterval: 7,
    maxPerWeek: 1,
    bestTimes: ['10:00'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getTemplateById(templateId: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find(t => t.id === templateId);
}

export function getTemplatesByType(type: MessageType): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter(t => t.type === type);
}

export function interpolateTemplate(
  template: MessageTemplate,
  data: Record<string, string>
): { subject: string; body: string } {
  const interpolate = (text: string) => {
    return text.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? `{${key}}`);
  };
  
  return {
    subject: interpolate(template.subject),
    body: interpolate(template.body),
  };
}

export function getSuggestedTemplates(
  conditions: Record<string, unknown>
): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter(template => {
    if (!template.autoSuggestConditions) return false;
    
    // 간단한 조건 매칭 (실제로는 더 복잡한 로직 필요)
    return template.autoSuggestConditions.some(cond => {
      if (cond === 'is_birthday' && conditions.isBirthday) return true;
      if (cond.includes('score_improved') && (conditions.scoreImproved as number) > 10) return true;
      if (cond.includes('late_count') && (conditions.lateCount as number) >= 3) return true;
      return false;
    });
  });
}
