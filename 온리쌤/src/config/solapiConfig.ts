/**
 * Solapi 알림톡 설정
 *
 * 환경 변수 필요:
 * - SOLAPI_API_KEY: Solapi API Key
 * - SOLAPI_API_SECRET: Solapi API Secret
 * - KAKAO_PFID: 카카오 채널 ID
 * - SENDER_PHONE: 발신번호 (학원 전화번호)
 */

export const solapiConfig = {
  apiKey: process.env.SOLAPI_API_KEY || '',
  apiSecret: process.env.SOLAPI_API_SECRET || '',
  senderPhone: process.env.SENDER_PHONE || '',
  kakaoPfId: process.env.KAKAO_PFID || '',

  // API 엔드포인트
  apiUrl: 'https://api.solapi.com',

  // 옵션
  options: {
    // 알림톡 실패 시 SMS 대체 발송
    enableSmsFallback: true,

    // 타임아웃 (밀리초)
    timeout: 30000,

    // 재시도 설정
    retry: {
      maxAttempts: 3,
      delay: 1000, // 1초
    },
  },
};

/**
 * 설정 유효성 검증
 */
export function validateSolapiConfig(): boolean {
  const { apiKey, apiSecret, senderPhone, kakaoPfId } = solapiConfig;

  if (!apiKey || !apiSecret) {
    console.error('[Solapi] API Key or Secret is missing');
    return false;
  }

  if (!senderPhone) {
    console.error('[Solapi] Sender phone number is missing');
    return false;
  }

  if (!kakaoPfId) {
    console.error('[Solapi] Kakao PF ID is missing');
    return false;
  }

  return true;
}

/**
 * 전화번호 형식 정규화 (010-1234-5678 → 01012345678)
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * 개발 모드 확인
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

export default solapiConfig;
