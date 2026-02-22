/**
 * slack.ts
 * 슬랙 알림 서비스
 * - 내부 운영 알림 (코치/관리자용)
 * - 일일/주간/월간 리포트
 * - 긴급 알림 (미납, 이탈 위험 등)
 */

import { supabase } from '../lib/supabase';
import { env } from '../config/env';
import { EXTERNAL_APIS } from '../config/api-endpoints';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  unfurl_links?: boolean;
}

export interface SlackBlockElement {
  type: string;
  [key: string]: unknown;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions' | 'image';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: 'plain_text' | 'mrkdwn';
    text: string;
  }>;
  accessory?: SlackBlockElement;
  elements?: SlackBlockElement[];
  image_url?: string;
  alt_text?: string;
}

export interface SlackAttachment {
  color?: string;
  pretext?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
}

export type SlackChannel =
  | 'general'        // 전체 공지
  | 'attendance'     // 출석 알림
  | 'payment'        // 결제 알림
  | 'coach'          // 코치 전용
  | 'alert'          // 긴급 알림
  | 'report';        // 리포트

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ 설정
// ═══════════════════════════════════════════════════════════════════════════════

const SLACK_WEBHOOK_URL = env.messaging.slack.webhookUrl;
const SLACK_BOT_TOKEN = env.messaging.slack.botToken;

// 채널 ID 매핑 (실제 슬랙 채널 ID로 교체 필요)
const CHANNEL_IDS: Record<SlackChannel, string> = {
  general: '#onlyssam-general',
  attendance: '#os-attendance',
  payment: '#os-payment',
  coach: '#os-coach',
  alert: '#os-alert',
  report: '#os-report',
};

// 브랜드 색상
const COLORS = {
  primary: '#2ED573',
  warning: '#FFD700',
  danger: '#FF6B6B',
  info: '#74B9FF',
  orange: '#FF6B35',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 API 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Webhook으로 메시지 전송 (간단한 알림용)
 */
const sendWebhook = async (message: SlackMessage): Promise<boolean> => {
  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error: unknown) {
    if (__DEV__) console.error('슬랙 Webhook 전송 실패:', error);
    return false;
  }
};

/**
 * Bot API로 메시지 전송 (고급 기능용)
 */
const sendBotMessage = async (
  channel: string,
  message: Omit<SlackMessage, 'channel'>
): Promise<{ success: boolean; ts?: string; error?: string }> => {
  try {
    const response = await fetch(`${EXTERNAL_APIS.slack.base}${EXTERNAL_APIS.slack.endpoints.postMessage}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        ...message,
      }),
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true, ts: data.ts };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error: unknown) {
    if (__DEV__) console.error('슬랙 Bot 메시지 전송 실패:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏀 온리쌤 알림 함수들
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 출석 알림 (실시간)
 */
export const notifyAttendance = async (params: {
  studentName: string;
  coachName: string;
  lessonName: string;
  location: string;
  time: string;
  remainingLessons: number;
}) => {
  const message: SlackMessage = {
    text: `🏀 ${params.studentName} 학생 출석`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🏀 출석 알림*\n${params.studentName} 학생이 출석했습니다.`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*수업*\n${params.lessonName}` },
          { type: 'mrkdwn', text: `*코치*\n${params.coachName}` },
          { type: 'mrkdwn', text: `*장소*\n${params.location}` },
          { type: 'mrkdwn', text: `*시간*\n${params.time}` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `잔여 수업: *${params.remainingLessons}회*` },
        ],
      },
    ],
  };

  return await sendWebhook(message);
};

/**
 * 결제 완료 알림
 */
export const notifyPaymentSuccess = async (params: {
  studentName: string;
  parentName: string;
  packageName: string;
  amount: number;
  lessonCount: number;
}) => {
  const message: SlackMessage = {
    text: `💳 결제 완료: ${params.studentName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💳 결제 완료',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*학생*\n${params.studentName}` },
          { type: 'mrkdwn', text: `*결제자*\n${params.parentName}` },
          { type: 'mrkdwn', text: `*상품*\n${params.packageName}` },
          { type: 'mrkdwn', text: `*금액*\n₩${params.amount.toLocaleString()}` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `수업권 ${params.lessonCount}회 충전됨 ✅` },
        ],
      },
    ],
  };

  return await sendWebhook(message);
};

/**
 * 미납 알림 (긴급)
 */
export const notifyPaymentOverdue = async (params: {
  studentName: string;
  parentPhone: string;
  dueDate: string;
  amount: number;
  daysOverdue: number;
}) => {
  const urgencyEmoji = params.daysOverdue >= 14 ? '🚨' : '⚠️';

  const message: SlackMessage = {
    text: `${urgencyEmoji} 미납 알림: ${params.studentName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${urgencyEmoji} 미납 알림`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${params.studentName}* 학생의 수업료가 *${params.daysOverdue}일* 연체되었습니다.`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*미납 금액*\n₩${params.amount.toLocaleString()}` },
          { type: 'mrkdwn', text: `*납부 기한*\n${params.dueDate}` },
          { type: 'mrkdwn', text: `*연락처*\n${params.parentPhone}` },
          { type: 'mrkdwn', text: `*연체일*\n${params.daysOverdue}일` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📞 연락하기' },
            url: `tel:${params.parentPhone}`,
          },
        ],
      },
    ],
  };

  return await sendBotMessage(CHANNEL_IDS.alert, message);
};

/**
 * 코치 출퇴근 알림
 */
export const notifyCoachClockIn = async (params: {
  coachName: string;
  location: string;
  time: string;
  todayLessons: number;
  type: 'in' | 'out';
  workHours?: number;
  studentsAttended?: number;
}) => {
  const isClockIn = params.type === 'in';

  const message: SlackMessage = {
    text: `${isClockIn ? '🟢' : '🔴'} ${params.coachName} 코치 ${isClockIn ? '출근' : '퇴근'}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${isClockIn ? '🟢 출근' : '🔴 퇴근'}*\n${params.coachName} 코치님이 ${isClockIn ? '출근' : '퇴근'}하셨습니다.`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*장소*\n${params.location}` },
          { type: 'mrkdwn', text: `*시간*\n${params.time}` },
          ...(isClockIn
            ? [{ type: 'mrkdwn' as const, text: `*오늘 레슨*\n${params.todayLessons}개` }]
            : [
                { type: 'mrkdwn' as const, text: `*근무 시간*\n${params.workHours}시간` },
                { type: 'mrkdwn' as const, text: `*출석 학생*\n${params.studentsAttended}명` },
              ]),
        ],
      },
    ],
  };

  return await sendWebhook(message);
};

/**
 * 일일 리포트
 */
export const sendDailyReport = async (params: {
  date: string;
  totalStudents: number;
  attendanceRate: number;
  revenue: number;
  newStudents: number;
  expiringCredits: number;
  coaches: Array<{
    name: string;
    lessons: number;
    students: number;
  }>;
}) => {
  const coachSummary = params.coaches
    .map((c) => `• ${c.name}: ${c.lessons}레슨, ${c.students}명`)
    .join('\n');

  const message: SlackMessage = {
    text: `📊 일일 리포트 (${params.date})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 일일 리포트 (${params.date})`,
          emoji: true,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*총 학생*\n${params.totalStudents}명` },
          { type: 'mrkdwn', text: `*출석률*\n${params.attendanceRate}%` },
          { type: 'mrkdwn', text: `*매출*\n₩${params.revenue.toLocaleString()}` },
          { type: 'mrkdwn', text: `*신규 등록*\n${params.newStudents}명` },
        ],
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*👨‍🏫 코치별 현황*\n${coachSummary}`,
        },
      },
      ...(params.expiringCredits > 0
        ? [
            {
              type: 'context' as const,
              elements: [
                {
                  type: 'mrkdwn' as const,
                  text: `⚠️ 7일 내 만료 예정 수업권: ${params.expiringCredits}건`,
                },
              ],
            },
          ]
        : []),
    ],
  };

  return await sendBotMessage(CHANNEL_IDS.report, message);
};

/**
 * 주간 리포트
 */
export const sendWeeklyReport = async (params: {
  weekRange: string;
  totalRevenue: number;
  revenueChange: number;
  totalLessons: number;
  avgAttendanceRate: number;
  topCoach: { name: string; students: number };
  newStudents: number;
  churnRisk: number;
}) => {
  const revenueChangeText =
    params.revenueChange >= 0
      ? `📈 +${params.revenueChange}%`
      : `📉 ${params.revenueChange}%`;

  const message: SlackMessage = {
    text: `📈 주간 리포트 (${params.weekRange})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📈 주간 리포트`,
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [{ type: 'plain_text', text: params.weekRange }],
      },
      { type: 'divider' },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*💰 매출*\n₩${params.totalRevenue.toLocaleString()}\n${revenueChangeText}`,
          },
          {
            type: 'mrkdwn',
            text: `*📚 총 레슨*\n${params.totalLessons}회`,
          },
          {
            type: 'mrkdwn',
            text: `*✅ 평균 출석률*\n${params.avgAttendanceRate}%`,
          },
          {
            type: 'mrkdwn',
            text: `*🆕 신규 등록*\n${params.newStudents}명`,
          },
        ],
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🏆 *이주의 MVP 코치*: ${params.topCoach.name} (${params.topCoach.students}명 지도)`,
        },
      },
      ...(params.churnRisk > 0
        ? [
            {
              type: 'context' as const,
              elements: [
                {
                  type: 'mrkdwn' as const,
                  text: `⚠️ 이탈 위험 학생: ${params.churnRisk}명 (2주 이상 미출석)`,
                },
              ],
            },
          ]
        : []),
    ],
  };

  return await sendBotMessage(CHANNEL_IDS.report, message);
};

/**
 * 긴급 알림 (이탈 위험, 시스템 오류 등)
 */
export const sendUrgentAlert = async (params: {
  type: 'churn_risk' | 'system_error' | 'payment_issue' | 'capacity_full';
  title: string;
  message: string;
  details?: Record<string, string>;
}) => {
  const typeEmoji = {
    churn_risk: '🚨',
    system_error: '❌',
    payment_issue: '💳',
    capacity_full: '📢',
  };

  const fields = params.details
    ? Object.entries(params.details).map(([key, value]) => ({
        type: 'mrkdwn' as const,
        text: `*${key}*\n${value}`,
      }))
    : [];

  const slackMessage: SlackMessage = {
    text: `${typeEmoji[params.type]} ${params.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${typeEmoji[params.type]} ${params.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: params.message,
        },
      },
      ...(fields.length > 0
        ? [
            {
              type: 'section' as const,
              fields,
            },
          ]
        : []),
    ],
  };

  return await sendBotMessage(CHANNEL_IDS.alert, slackMessage);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 Export
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  notifyAttendance,
  notifyPaymentSuccess,
  notifyPaymentOverdue,
  notifyCoachClockIn,
  sendDailyReport,
  sendWeeklyReport,
  sendUrgentAlert,
  CHANNEL_IDS,
};
