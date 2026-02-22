/**
 * ═══════════════════════════════════════════════════════════════
 * Telegram Client 테스트
 * Phase 3: 몰트봇 텔레그램 연동
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendTelegramMessage,
  formatAbsentAlert,
  formatOverduePayment,
  formatConsultation,
  formatEscalation,
  formatDefault,
  formatByTemplate,
} from '../telegram';

describe('Telegram Client', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ═══════════════════════════════════════════════════════════════
  // sendTelegramMessage
  // ═══════════════════════════════════════════════════════════════

  describe('sendTelegramMessage', () => {
    it('토큰 미설정 시 ok:false를 반환해야 한다', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;

      const result = await sendTelegramMessage('123', 'hello');

      expect(result.ok).toBe(false);
      expect(result.error_description).toBe('TELEGRAM_BOT_TOKEN not configured');
    });

    it('성공 시 ok:true와 message_id를 반환해야 한다', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          ok: true,
          result: { message_id: 42 },
        }),
      });
      global.fetch = mockFetch;

      const result = await sendTelegramMessage('123456', 'Hello world');

      expect(result.ok).toBe(true);
      expect(result.message_id).toBe(42);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-bot-token/sendMessage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '123456',
            text: 'Hello world',
            parse_mode: 'Markdown',
          }),
        },
      );
    });

    it('Telegram API 실패 시 ok:false와 에러 메시지를 반환해야 한다', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          ok: false,
          description: 'Bad Request: chat not found',
        }),
      });
      global.fetch = mockFetch;

      const result = await sendTelegramMessage('invalid', 'test');

      expect(result.ok).toBe(false);
      expect(result.error_description).toBe('Bad Request: chat not found');
    });

    it('parse_mode를 커스텀 지정할 수 있어야 한다', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';

      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 1 } }),
      });
      global.fetch = mockFetch;

      await sendTelegramMessage('123', 'test', 'HTML');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.parse_mode).toBe('HTML');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Formatters
  // ═══════════════════════════════════════════════════════════════

  describe('formatAbsentAlert', () => {
    it('결석 알림 메시지를 포맷해야 한다', () => {
      const result = formatAbsentAlert({
        student_name: '김민준',
        encounter_title: '초5,6부',
        time: '14:00',
      });

      expect(result).toContain('🔴');
      expect(result).toContain('*결석 알림*');
      expect(result).toContain('김민준');
      expect(result).toContain('초5,6부');
      expect(result).toContain('14:00');
    });

    it('누락된 필드는 기본값으로 표시해야 한다', () => {
      const result = formatAbsentAlert({});

      expect(result).toContain('(알 수 없음)');
      expect(result).toContain('(미지정)');
    });
  });

  describe('formatOverduePayment', () => {
    it('미납 알림 메시지를 포맷해야 한다', () => {
      const result = formatOverduePayment({
        student_name: '이서연',
        amount: 150000,
        date: '2025-02-01',
      });

      expect(result).toContain('💰');
      expect(result).toContain('*미납 알림*');
      expect(result).toContain('이서연');
      expect(result).toContain('150,000');
      expect(result).toContain('2025-02-01');
    });
  });

  describe('formatConsultation', () => {
    it('상담 예약 메시지를 포맷해야 한다', () => {
      const result = formatConsultation({
        student_name: '박지훈',
        type: '학부모 상담',
        date: '2025-03-15 10:00',
      });

      expect(result).toContain('📋');
      expect(result).toContain('*상담 예약*');
      expect(result).toContain('박지훈');
      expect(result).toContain('학부모 상담');
      expect(result).toContain('2025-03-15 10:00');
    });
  });

  describe('formatEscalation', () => {
    it('에스컬레이션 메시지를 포맷해야 한다', () => {
      const result = formatEscalation({
        student_name: '최수현',
        severity: '높음',
        reason: '3회 연속 결석',
      });

      expect(result).toContain('🚨');
      expect(result).toContain('*긴급 에스컬레이션*');
      expect(result).toContain('최수현');
      expect(result).toContain('높음');
      expect(result).toContain('3회 연속 결석');
    });
  });

  describe('formatDefault', () => {
    it('기본 알림 메시지를 포맷해야 한다', () => {
      const result = formatDefault({ key: 'value' });

      expect(result).toContain('📢');
      expect(result).toContain('*알림*');
      expect(result).toContain('"key"');
      expect(result).toContain('"value"');
    });
  });

  describe('formatByTemplate', () => {
    it('absence_notification 템플릿을 라우팅해야 한다', () => {
      const result = formatByTemplate('absence_notification', { student_name: '테스트' });
      expect(result).toContain('결석 알림');
    });

    it('overdue_payment 템플릿을 라우팅해야 한다', () => {
      const result = formatByTemplate('overdue_payment', { student_name: '테스트' });
      expect(result).toContain('미납 알림');
    });

    it('consultation 템플릿을 라우팅해야 한다', () => {
      const result = formatByTemplate('consultation', { student_name: '테스트' });
      expect(result).toContain('상담 예약');
    });

    it('escalation 템플릿을 라우팅해야 한다', () => {
      const result = formatByTemplate('escalation', { student_name: '테스트' });
      expect(result).toContain('긴급 에스컬레이션');
    });

    it('알 수 없는 템플릿은 기본 포맷을 사용해야 한다', () => {
      const result = formatByTemplate('unknown_template', { data: 123 });
      expect(result).toContain('📢');
    });

    it('undefined 템플릿은 기본 포맷을 사용해야 한다', () => {
      const result = formatByTemplate(undefined, { data: 123 });
      expect(result).toContain('📢');
    });
  });
});
