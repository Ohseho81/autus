/**
 * 카카오 알림톡 서비스 테스트
 * 템플릿 빌딩, 전화번호 포맷팅, 발송 로직 검증
 */

// Mock __DEV__
(global as any).__DEV__ = true;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock env
jest.mock('../config/env', () => ({
  env: {
    messaging: {
      kakao: {
        apiKey: 'test-kakao-api-key',
        senderKey: 'test-sender-key',
      },
      solapi: {
        apiKey: 'test-solapi-key',
        apiSecret: 'test-solapi-secret',
        pfId: 'test-pfid',
      },
    },
  },
}));

// Mock api-endpoints
jest.mock('../config/api-endpoints', () => ({
  EXTERNAL_APIS: {
    kakao: {
      alimtalk: 'https://api-alimtalk.kakao.com/v3/',
    },
    solapi: {
      base: 'https://api.solapi.com',
      endpoints: {
        sendMessage: '/messages/v4/send',
      },
    },
  },
  WEB_URLS: {
    parent: {
      attendance: 'https://onlyssam.app/attendance',
      schedule: 'https://onlyssam.app/schedule',
      payment: 'https://onlyssam.app/payment',
      feedback: (id: string) => `https://onlyssam.app/feedback/${id}`,
      download: 'https://onlyssam.app/download',
    },
  },
}));

// Mock supabase
const mockInsertFn = jest.fn().mockResolvedValue({ error: null });
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: mockInsertFn,
    })),
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock Buffer for signature generation
(global as any).Buffer = {
  from: (str: string) => ({
    toString: () => 'mocked-signature',
  }),
};

import {
  sendAlimtalk,
  sendAttendanceNotification,
  sendLessonReminder,
  sendPaymentReminder,
  sendFeedbackNotification,
  ALIMTALK_TEMPLATES,
} from '../services/kakaoAlimtalk';
import type { AlimtalkTemplateCode } from '../services/kakaoAlimtalk';

describe('카카오 알림톡 서비스', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('ALIMTALK_TEMPLATES', () => {
    it('5개의 템플릿이 모두 정의되어 있어야 한다', () => {
      const expectedCodes: AlimtalkTemplateCode[] = [
        'ATB_ATTENDANCE',
        'ATB_LESSON_REMIND',
        'ATB_PAYMENT_DUE',
        'ATB_FEEDBACK',
        'ATB_WELCOME',
      ];

      expectedCodes.forEach(code => {
        expect(ALIMTALK_TEMPLATES[code]).toBeDefined();
        expect(ALIMTALK_TEMPLATES[code].title).toBeTruthy();
        expect(ALIMTALK_TEMPLATES[code].content).toBeTruthy();
      });
    });

    it('ATB_ATTENDANCE 템플릿에 필수 변수가 포함되어야 한다', () => {
      const content = ALIMTALK_TEMPLATES.ATB_ATTENDANCE.content;
      expect(content).toContain('#{parentName}');
      expect(content).toContain('#{studentName}');
      expect(content).toContain('#{location}');
      expect(content).toContain('#{checkInTime}');
      expect(content).toContain('#{lessonName}');
    });

    it('ATB_PAYMENT_DUE 템플릿에 결제 관련 변수가 포함되어야 한다', () => {
      const content = ALIMTALK_TEMPLATES.ATB_PAYMENT_DUE.content;
      expect(content).toContain('#{remainingLessons}');
      expect(content).toContain('#{recommendedPackage}');
      expect(content).toContain('#{packagePrice}');
    });

    it('모든 템플릿에 버튼이 하나 이상 있어야 한다', () => {
      Object.values(ALIMTALK_TEMPLATES).forEach(template => {
        expect(template.buttons).toBeDefined();
        expect(template.buttons!.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('ATB_WELCOME 템플릿에 가입 관련 변수가 포함되어야 한다', () => {
      const content = ALIMTALK_TEMPLATES.ATB_WELCOME.content;
      expect(content).toContain('#{parentName}');
      expect(content).toContain('#{studentName}');
      expect(content).toContain('#{academyName}');
    });
  });

  describe('sendAlimtalk', () => {
    it('존재하지 않는 템플릿 코드는 에러를 반환해야 한다', async () => {
      const result = await sendAlimtalk({
        templateCode: 'INVALID_CODE' as AlimtalkTemplateCode,
        recipient: { phone: '010-1234-5678' },
        variables: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('템플릿을 찾을 수 없습니다');
    });

    it('Solapi API로 성공적으로 발송하면 success를 반환해야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '2000', groupId: 'grp_001' }),
      });

      const result = await sendAlimtalk({
        templateCode: 'ATB_ATTENDANCE',
        recipient: { phone: '010-1234-5678', name: '김부모' },
        variables: {
          parentName: '김부모',
          studentName: '김민수',
          location: '서울 농구코트',
          checkInTime: '16:00',
          lessonName: '초등반',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('grp_001');
    });

    it('Solapi API 발송 실패 시 에러를 반환해야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '4000', message: '잘못된 요청' }),
      });

      const result = await sendAlimtalk({
        templateCode: 'ATB_ATTENDANCE',
        recipient: { phone: '010-1234-5678' },
        variables: {
          parentName: '김부모',
          studentName: '김민수',
          location: '코트',
          checkInTime: '16:00',
          lessonName: '농구',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('네트워크 오류 시 에러를 반환해야 한다', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendAlimtalk({
        templateCode: 'ATB_ATTENDANCE',
        recipient: { phone: '010-1234-5678' },
        variables: {
          parentName: '김부모',
          studentName: '김민수',
          location: '코트',
          checkInTime: '16:00',
          lessonName: '농구',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('템플릿 변수가 올바르게 치환되어야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '2000', groupId: 'grp_002' }),
      });

      await sendAlimtalk({
        templateCode: 'ATB_ATTENDANCE',
        recipient: { phone: '01012345678' },
        variables: {
          parentName: '박부모',
          studentName: '박지훈',
          location: '강남 코트',
          checkInTime: '14:30',
          lessonName: '중등반',
        },
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const text = body.message.text;

      expect(text).toContain('박부모');
      expect(text).toContain('박지훈');
      expect(text).toContain('강남 코트');
      expect(text).toContain('14:30');
      expect(text).toContain('중등반');
      // 원본 변수 플레이스홀더가 없어야 한다
      expect(text).not.toContain('#{parentName}');
      expect(text).not.toContain('#{studentName}');
    });

    it('전화번호에서 하이픈이 제거되어야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '2000', groupId: 'grp_003' }),
      });

      await sendAlimtalk({
        templateCode: 'ATB_ATTENDANCE',
        recipient: { phone: '010-9876-5432' },
        variables: {
          parentName: '이부모',
          studentName: '이수진',
          location: '코트',
          checkInTime: '10:00',
          lessonName: '유아반',
        },
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.message.to).toBe('01098765432');
    });

    it('발송 성공 시 로그가 저장되어야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '2000', groupId: 'grp_004' }),
      });

      await sendAlimtalk({
        templateCode: 'ATB_WELCOME',
        recipient: { phone: '01011112222' },
        variables: {
          parentName: '최부모',
          studentName: '최시준',
          academyName: '온리농구',
        },
      });

      expect(mockInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          template_code: 'ATB_WELCOME',
          success: true,
          message_id: 'grp_004',
        }),
      );
    });
  });

  describe('sendAttendanceNotification', () => {
    it('출석 알림 편의 함수가 올바른 템플릿으로 호출해야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '2000', groupId: 'grp_attn' }),
      });

      const result = await sendAttendanceNotification({
        parentPhone: '010-1234-5678',
        parentName: '김부모',
        studentName: '김민수',
        location: '서울코트',
        checkInTime: '16:00',
        lessonName: '초등반',
      });

      expect(result.success).toBe(true);
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.message.kakaoOptions.templateId).toBe('ATB_ATTENDANCE');
    });
  });

  describe('sendLessonReminder', () => {
    it('수업 리마인더 편의 함수가 올바른 파라미터로 호출해야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '2000', groupId: 'grp_remind' }),
      });

      const result = await sendLessonReminder({
        parentPhone: '010-1234-5678',
        parentName: '김부모',
        studentName: '김민수',
        lessonName: '초등반',
        location: '서울코트',
        lessonTime: '16:00-17:00',
        coachName: '박코치',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendPaymentReminder', () => {
    it('결제 안내가 금액을 포맷팅해서 발송해야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '2000', groupId: 'grp_pay' }),
      });

      await sendPaymentReminder({
        parentPhone: '010-1234-5678',
        parentName: '김부모',
        studentName: '김민수',
        remainingLessons: 2,
        recommendedPackage: '10회 패키지',
        packagePrice: 300000,
        academyPhone: '02-1234-5678',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.message.text).toContain('300,000');
      expect(body.message.text).toContain('2');
    });
  });

  describe('sendFeedbackNotification', () => {
    it('피드백 코멘트가 100자로 잘려야 한다', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ statusCode: '2000', groupId: 'grp_fb' }),
      });

      const longComment = '가'.repeat(200); // 200자

      await sendFeedbackNotification({
        parentPhone: '010-1234-5678',
        parentName: '김부모',
        studentName: '김민수',
        lessonName: '초등반',
        lessonDate: '2026-02-14',
        coachName: '박코치',
        coachComment: longComment,
        feedbackId: 'fb_001',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const text = body.message.text;
      // 원본 200자가 아닌 100자가 포함되어야 한다
      const truncated = longComment.substring(0, 100);
      expect(text).toContain(truncated);
      expect(text).not.toContain(longComment);
    });
  });
});
