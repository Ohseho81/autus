/**
 * api-endpoints.ts
 * 모든 API 엔드포인트를 중앙 관리
 * - 하드코딩된 URL을 제거하고 단일 소스로 관리
 * - 환경별 설정 지원 (dev, staging, production)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 Base URLs
// ═══════════════════════════════════════════════════════════════════════════════

export const API_BASE_URLS = {
  /** AUTUS 백엔드 API (미사용 - 향후 연동 시) */
  autus: process.env.EXPO_PUBLIC_API_URL || 'https://api.autus.ai/v1',

  /** Supabase 프로젝트 URL */
  supabase: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pphzvnaedmzcvpxjulti.supabase.co',

  /** 온리쌤 웹사이트 */
  web: process.env.EXPO_PUBLIC_WEB_URL || 'https://onlyssam.app',

  /** 포트원 결제 */
  portone: 'https://portone.io',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 External Service APIs
// ═══════════════════════════════════════════════════════════════════════════════

export const EXTERNAL_APIS = {
  /** 토스페이먼츠 API */
  toss: {
    base: 'https://api.tosspayments.com/v1',
    endpoints: {
      confirmPayment: '/payments/confirm',
      getPayment: (paymentKey: string) => `/payments/${paymentKey}`,
      cancelPayment: (paymentKey: string) => `/payments/${paymentKey}/cancel`,
      issueBillingKey: '/billing/authorizations/card',
      chargeBilling: (billingKey: string) => `/billing/${billingKey}`,
      deleteBillingKey: (billingKey: string) => `/billing/authorizations/${billingKey}`,
    },
  },

  /** 카카오 알림톡 API */
  kakao: {
    alimtalk: 'https://api-alimtalk.kakao.com/v3',
    chatbot: {
      base: (botId: string) => `https://bot-api.kakao.com/v1/bots/${botId}`,
      send: (botId: string) => `https://bot-api.kakao.com/v1/bots/${botId}/send`,
    },
  },

  /** Solapi (문자/알림톡 서드파티) */
  solapi: {
    base: 'https://api.solapi.com',
    endpoints: {
      sendMessage: '/messages/v4/send',
    },
  },

  /** 구글 캘린더 API */
  google: {
    calendar: 'https://www.googleapis.com/calendar/v3',
    auth: {
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    },
    endpoints: {
      events: '/calendars/primary/events',
      getEvent: (eventId: string) => `/calendars/primary/events/${eventId}`,
    },
  },

  /** 슬랙 API */
  slack: {
    base: 'https://slack.com/api',
    endpoints: {
      postMessage: '/chat.postMessage',
    },
  },

  /** 결제선생(PaySSAM) API */
  payssam: {
    base: 'https://api.payssam.kr/v1',
    endpoints: {
      sendInvoice: '/invoices/send',
      getInvoice: (invoiceId: string) => `/invoices/${invoiceId}`,
      getPaymentStatus: (invoiceId: string) => `/invoices/${invoiceId}/status`,
      getPointBalance: '/points/balance',
      cancelInvoice: (invoiceId: string) => `/invoices/${invoiceId}/cancel`,
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 Deep Links & Web URLs
// ═══════════════════════════════════════════════════════════════════════════════

export const WEB_URLS = {
  /** 학부모용 웹 페이지 */
  parent: {
    attendance: `${API_BASE_URLS.web}/attendance`,
    schedule: `${API_BASE_URLS.web}/schedule`,
    payment: `${API_BASE_URLS.web}/payment`,
    feedback: (feedbackId: string) => `${API_BASE_URLS.web}/feedback/${feedbackId}`,
    download: `${API_BASE_URLS.web}/download`,
  },

  /** 포트원 결제 */
  portone: {
    checkout: `${API_BASE_URLS.portone}/v2/checkout`,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supabase Edge Function URL 생성
 */
export const getSupabaseFunctionUrl = (functionName: string): string => {
  return `${API_BASE_URLS.supabase}/functions/v1/${functionName}`;
};

/**
 * Supabase REST API URL 생성
 */
export const getSupabaseRestUrl = (table: string): string => {
  return `${API_BASE_URLS.supabase}/rest/v1/${table}`;
};

/**
 * 환경별 API URL 가져오기
 */
export const getApiUrl = (service: keyof typeof API_BASE_URLS): string => {
  return API_BASE_URLS[service];
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 Export Default
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  API_BASE_URLS,
  EXTERNAL_APIS,
  WEB_URLS,
  getSupabaseFunctionUrl,
  getSupabaseRestUrl,
  getApiUrl,
} as const;
