// =============================================================================
// AUTUS v1.0 - Telegram Bot Client
// 카카오 알림톡 승인 전까지 Telegram Bot API로 운영자 알림 발송
// fetch() 직접 사용 (서버리스 최적, npm 패키지 불필요)
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TelegramResult {
  ok: boolean;
  message_id?: number;
  error_description?: string;
}

export interface AbsentAlertPayload {
  student_name?: string;
  encounter_title?: string;
  time?: string;
  [key: string]: unknown;
}

export interface OverduePaymentPayload {
  student_name?: string;
  amount?: number;
  date?: string;
  [key: string]: unknown;
}

export interface ConsultationPayload {
  student_name?: string;
  type?: string;
  date?: string;
  [key: string]: unknown;
}

export interface EscalationPayload {
  student_name?: string;
  severity?: string;
  reason?: string;
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// Core: Send Telegram Message
// -----------------------------------------------------------------------------

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: string = 'Markdown',
): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { ok: false, error_description: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });

  const data = await response.json();

  if (data.ok) {
    return { ok: true, message_id: data.result?.message_id };
  }

  return {
    ok: false,
    error_description: data.description || 'Unknown Telegram API error',
  };
}

// -----------------------------------------------------------------------------
// Message Formatters (한국어 + 이모지, parse_mode: 'Markdown')
// -----------------------------------------------------------------------------

export function formatAbsentAlert(payload: AbsentAlertPayload): string {
  const name = payload.student_name ?? '(알 수 없음)';
  const title = payload.encounter_title ?? '(미지정)';
  const time = payload.time ?? '(미지정)';
  return `🔴 *결석 알림*\n학생: ${name}\n수업: ${title}\n시간: ${time}`;
}

export function formatOverduePayment(payload: OverduePaymentPayload): string {
  const name = payload.student_name ?? '(알 수 없음)';
  const amount = payload.amount != null ? payload.amount.toLocaleString() : '(미지정)';
  const date = payload.date ?? '(미지정)';
  return `💰 *미납 알림*\n학생: ${name}\n금액: ${amount}원\n기한: ${date}`;
}

export function formatConsultation(payload: ConsultationPayload): string {
  const name = payload.student_name ?? '(알 수 없음)';
  const type = payload.type ?? '(미지정)';
  const date = payload.date ?? '(미지정)';
  return `📋 *상담 예약*\n학생: ${name}\n유형: ${type}\n일시: ${date}`;
}

export function formatEscalation(payload: EscalationPayload): string {
  const name = payload.student_name ?? '(알 수 없음)';
  const severity = payload.severity ?? '(미지정)';
  const reason = payload.reason ?? '(미지정)';
  return `🚨 *긴급 에스컬레이션*\n학생: ${name}\n심각도: ${severity}\n사유: ${reason}`;
}

export function formatDefault(payload: Record<string, unknown>): string {
  return `📢 *알림*\n${JSON.stringify(payload, null, 2)}`;
}

// -----------------------------------------------------------------------------
// Template Router
// -----------------------------------------------------------------------------

export function formatByTemplate(
  template: string | undefined,
  payload: Record<string, unknown>,
): string {
  switch (template) {
    case 'absence_notification':
      return formatAbsentAlert(payload as AbsentAlertPayload);
    case 'overdue_payment':
      return formatOverduePayment(payload as OverduePaymentPayload);
    case 'consultation':
      return formatConsultation(payload as ConsultationPayload);
    case 'escalation':
      return formatEscalation(payload as EscalationPayload);
    default:
      return formatDefault(payload);
  }
}
