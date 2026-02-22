/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📱 카카오 알림톡 서비스
 * 온리쌤 - 학부모 알림 자동화
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 사전 준비:
 * 1. 카카오 비즈니스 채널 개설
 * 2. 알림톡 발신 프로필 등록
 * 3. 메시지 템플릿 검수 승인
 * 4. API 키 발급
 */

import { supabase } from '../lib/supabase';
import { env } from '../config/env';
import { EXTERNAL_APIS, WEB_URLS } from '../config/api-endpoints';

// ═══════════════════════════════════════════════════════════════
// 환경 변수
// ═══════════════════════════════════════════════════════════════

const KAKAO_API_KEY = env.messaging.kakao.apiKey;
const KAKAO_SENDER_KEY = env.messaging.kakao.senderKey;
const ALIMTALK_API_URL = EXTERNAL_APIS.kakao.alimtalk;

// 또는 서드파티 서비스 사용 (NHN Cloud, Solapi 등)
const USE_THIRD_PARTY = true;
const SOLAPI_API_KEY = env.messaging.solapi.apiKey;
const SOLAPI_API_SECRET = env.messaging.solapi.apiSecret;
const SOLAPI_PFID = env.messaging.solapi.pfId; // 발신 프로필 ID

// ═══════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════

export type AlimtalkTemplateCode =
  | 'ATB_ATTENDANCE'      // 출석 알림
  | 'ATB_LESSON_REMIND'   // 수업 리마인더
  | 'ATB_PAYMENT_DUE'     // 결제 안내
  | 'ATB_FEEDBACK'        // 피드백 알림
  | 'ATB_WELCOME';        // 가입 환영

export interface AlimtalkRecipient {
  phone: string;          // 수신자 전화번호 (01012345678)
  name?: string;          // 수신자 이름
}

export interface AlimtalkVariable {
  [key: string]: string;  // 템플릿 변수
}

export interface AlimtalkRequest {
  templateCode: AlimtalkTemplateCode;
  recipient: AlimtalkRecipient;
  variables: AlimtalkVariable;
}

export interface AlimtalkButton {
  name: string;
  type: string;
  url?: string;
  [key: string]: unknown;
}

export interface AlimtalkResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// 메시지 템플릿 정의
// ═══════════════════════════════════════════════════════════════

export const ALIMTALK_TEMPLATES: Record<AlimtalkTemplateCode, {
  title: string;
  content: string;
  buttons?: { name: string; type: string; urlMobile?: string }[];
}> = {
  ATB_ATTENDANCE: {
    title: '출석 알림',
    content: `[온리쌤] 출석 알림

안녕하세요, #{parentName}님!

#{studentName} 학생이 출석했습니다.

📍 장소: #{location}
🕐 시간: #{checkInTime}
🏀 수업: #{lessonName}

오늘도 즐거운 농구 수업 되세요! 🏀`,
    buttons: [
      { name: '출석 현황 보기', type: 'WL', urlMobile: WEB_URLS.parent.attendance }
    ]
  },

  ATB_LESSON_REMIND: {
    title: '수업 리마인더',
    content: `[온리쌤] 수업 알림

안녕하세요, #{parentName}님!

#{studentName} 학생의 수업이 1시간 후 시작됩니다.

🏀 수업: #{lessonName}
📍 장소: #{location}
🕐 시간: #{lessonTime}
👨‍🏫 코치: #{coachName}

준비물을 챙겨주세요!`,
    buttons: [
      { name: '수업 일정 보기', type: 'WL', urlMobile: WEB_URLS.parent.schedule }
    ]
  },

  ATB_PAYMENT_DUE: {
    title: '결제 안내',
    content: `[온리쌤] 수강권 안내

안녕하세요, #{parentName}님!

#{studentName} 학생의 잔여 수업이 #{remainingLessons}회 남았습니다.

지속적인 성장을 위해 수강권 연장을 권장드립니다.

💳 추천 패키지: #{recommendedPackage}
💰 금액: #{packagePrice}원

문의: #{academyPhone}`,
    buttons: [
      { name: '수강권 결제하기', type: 'WL', urlMobile: WEB_URLS.parent.payment },
      { name: '문의하기', type: 'WL', urlMobile: 'tel:#{academyPhone}' }
    ]
  },

  ATB_FEEDBACK: {
    title: '레슨 피드백',
    content: `[온리쌤] 레슨 피드백

안녕하세요, #{parentName}님!

#{studentName} 학생의 오늘 레슨 피드백이 등록되었습니다.

🏀 수업: #{lessonName}
📅 일시: #{lessonDate}
👨‍🏫 코치: #{coachName}

📝 코치 코멘트:
#{coachComment}

앱에서 영상 피드백과 상세 평가를 확인하세요!`,
    buttons: [
      { name: '피드백 상세 보기', type: 'WL', urlMobile: `${WEB_URLS.parent.feedback('#{feedbackId}')}` }
    ]
  },

  ATB_WELCOME: {
    title: '가입 환영',
    content: `[온리쌤] 가입을 환영합니다!

안녕하세요, #{parentName}님!

#{studentName} 학생의 온리쌤 등록이 완료되었습니다.

🏀 소속: #{academyName}
📱 학생 QR코드가 앱에서 발급되었습니다.

첫 수업 전 앱 설치를 완료해주세요!`,
    buttons: [
      { name: '앱 다운로드', type: 'WL', urlMobile: WEB_URLS.parent.download }
    ]
  },
};

// ═══════════════════════════════════════════════════════════════
// 알림톡 발송 함수
// ═══════════════════════════════════════════════════════════════

/**
 * 알림톡 발송 (Solapi 사용)
 */
export async function sendAlimtalk(request: AlimtalkRequest): Promise<AlimtalkResponse> {
  const { templateCode, recipient, variables } = request;
  const template = ALIMTALK_TEMPLATES[templateCode];

  if (!template) {
    return { success: false, error: '템플릿을 찾을 수 없습니다.' };
  }

  // 템플릿 변수 치환
  let content = template.content;
  Object.entries(variables).forEach(([key, value]) => {
    content = content.replace(new RegExp(`#{${key}}`, 'g'), value);
  });

  try {
    if (USE_THIRD_PARTY) {
      // Solapi API 사용
      return await sendViaSolapi({
        to: formatPhoneNumber(recipient.phone),
        content,
        templateCode,
        buttons: template.buttons,
      });
    } else {
      // 카카오 직접 API 사용
      return await sendViaKakao({
        to: formatPhoneNumber(recipient.phone),
        content,
        templateCode,
        buttons: template.buttons,
      });
    }
  } catch (error: unknown) {
    if (__DEV__) console.error('알림톡 발송 실패:', error);

    const errorMessage = error instanceof Error ? error.message : '알림톡 발송 실패';

    // 발송 실패 로그 저장
    await logAlimtalkResult({
      templateCode,
      phone: recipient.phone,
      success: false,
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Solapi API로 알림톡 발송
 */
async function sendViaSolapi(params: {
  to: string;
  content: string;
  templateCode: string;
  buttons?: AlimtalkButton[];
}): Promise<AlimtalkResponse> {
  const timestamp = Date.now().toString();
  const signature = await generateSolapiSignature(timestamp);

  const response = await fetch(`${EXTERNAL_APIS.solapi.base}${EXTERNAL_APIS.solapi.endpoints.sendMessage}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${timestamp}, salt=${timestamp}, signature=${signature}`,
    },
    body: JSON.stringify({
      message: {
        to: params.to,
        from: SOLAPI_PFID,
        kakaoOptions: {
          pfId: SOLAPI_PFID,
          templateId: params.templateCode,
          buttons: params.buttons,
        },
        text: params.content,
      },
    }),
  });

  const result = await response.json();

  if (result.statusCode === '2000' || result.groupId) {
    await logAlimtalkResult({
      templateCode: params.templateCode as AlimtalkTemplateCode,
      phone: params.to,
      success: true,
      messageId: result.groupId,
    });
    return { success: true, messageId: result.groupId };
  }

  throw new Error(result.message || '발송 실패');
}

/**
 * 카카오 직접 API로 알림톡 발송
 */
async function sendViaKakao(params: {
  to: string;
  content: string;
  templateCode: string;
  buttons?: AlimtalkButton[];
}): Promise<AlimtalkResponse> {
  const response = await fetch(`${ALIMTALK_API_URL}send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
    },
    body: JSON.stringify({
      senderKey: KAKAO_SENDER_KEY,
      templateCode: params.templateCode,
      recipientList: [{
        recipientNo: params.to,
        content: params.content,
        buttons: params.buttons,
      }],
    }),
  });

  const result = await response.json();

  if (result.successfulSendCount > 0) {
    await logAlimtalkResult({
      templateCode: params.templateCode as AlimtalkTemplateCode,
      phone: params.to,
      success: true,
      messageId: result.requestId,
    });
    return { success: true, messageId: result.requestId };
  }

  throw new Error(result.failureMessage || '발송 실패');
}

// ═══════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════

/**
 * 전화번호 포맷팅 (010-1234-5678 -> 01012345678)
 */
function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Solapi 서명 생성
 */
async function generateSolapiSignature(timestamp: string): Promise<string> {
  // Node.js 환경에서는 crypto 사용, React Native에서는 expo-crypto
  const message = `${timestamp}${SOLAPI_API_SECRET}`;

  // 간단한 구현 (실제로는 HMAC-SHA256 사용)
  // React Native에서는 expo-crypto나 react-native-crypto 사용
  return Buffer.from(message).toString('base64');
}

/**
 * 알림톡 발송 로그 저장
 */
async function logAlimtalkResult(params: {
  templateCode: AlimtalkTemplateCode;
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
}) {
  try {
    await supabase.from('alimtalk_logs').insert({
      template_code: params.templateCode,
      phone: params.phone,
      success: params.success,
      message_id: params.messageId,
      error: params.error,
      sent_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    if (__DEV__) console.error('알림톡 로그 저장 실패:', e);
  }
}

// ═══════════════════════════════════════════════════════════════
// 편의 함수 (특정 시나리오용)
// ═══════════════════════════════════════════════════════════════

/**
 * 출석 알림 발송
 * (AUTUS Spec: 잔여회수 정보 제거됨)
 */
export async function sendAttendanceNotification(params: {
  parentPhone: string;
  parentName: string;
  studentName: string;
  location: string;
  checkInTime: string;
  lessonName: string;
}): Promise<AlimtalkResponse> {
  return sendAlimtalk({
    templateCode: 'ATB_ATTENDANCE',
    recipient: { phone: params.parentPhone, name: params.parentName },
    variables: {
      parentName: params.parentName,
      studentName: params.studentName,
      location: params.location,
      checkInTime: params.checkInTime,
      lessonName: params.lessonName,
    },
  });
}

/**
 * 수업 리마인더 발송
 */
export async function sendLessonReminder(params: {
  parentPhone: string;
  parentName: string;
  studentName: string;
  lessonName: string;
  location: string;
  lessonTime: string;
  coachName: string;
}): Promise<AlimtalkResponse> {
  return sendAlimtalk({
    templateCode: 'ATB_LESSON_REMIND',
    recipient: { phone: params.parentPhone, name: params.parentName },
    variables: {
      parentName: params.parentName,
      studentName: params.studentName,
      lessonName: params.lessonName,
      location: params.location,
      lessonTime: params.lessonTime,
      coachName: params.coachName,
    },
  });
}

/**
 * 결제 안내 발송
 */
export async function sendPaymentReminder(params: {
  parentPhone: string;
  parentName: string;
  studentName: string;
  remainingLessons: number;
  recommendedPackage: string;
  packagePrice: number;
  academyPhone: string;
}): Promise<AlimtalkResponse> {
  return sendAlimtalk({
    templateCode: 'ATB_PAYMENT_DUE',
    recipient: { phone: params.parentPhone, name: params.parentName },
    variables: {
      parentName: params.parentName,
      studentName: params.studentName,
      remainingLessons: params.remainingLessons.toString(),
      recommendedPackage: params.recommendedPackage,
      packagePrice: params.packagePrice.toLocaleString(),
      academyPhone: params.academyPhone,
    },
  });
}

/**
 * 피드백 알림 발송
 */
export async function sendFeedbackNotification(params: {
  parentPhone: string;
  parentName: string;
  studentName: string;
  lessonName: string;
  lessonDate: string;
  coachName: string;
  coachComment: string;
  feedbackId: string;
}): Promise<AlimtalkResponse> {
  return sendAlimtalk({
    templateCode: 'ATB_FEEDBACK',
    recipient: { phone: params.parentPhone, name: params.parentName },
    variables: {
      parentName: params.parentName,
      studentName: params.studentName,
      lessonName: params.lessonName,
      lessonDate: params.lessonDate,
      coachName: params.coachName,
      coachComment: params.coachComment.substring(0, 100), // 최대 100자
      feedbackId: params.feedbackId,
    },
  });
}

export default {
  sendAlimtalk,
  sendAttendanceNotification,
  sendLessonReminder,
  sendPaymentReminder,
  sendFeedbackNotification,
  ALIMTALK_TEMPLATES,
};
