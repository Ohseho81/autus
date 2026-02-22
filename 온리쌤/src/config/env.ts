/**
 * env.ts
 * 환경 변수 중앙 관리 및 타입 검증
 * - process.env 직접 접근 제거
 * - 런타임 검증으로 누락된 환경변수 조기 발견
 * - TypeScript 타입 안전성 보장
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 Environment Variable Schema
// ═══════════════════════════════════════════════════════════════════════════════

interface EnvConfig {
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
  };

  // Payment
  payment: {
    toss: {
      clientKey: string;
      secretKey: string;
    };
    portone: {
      storeId: string;
      channelKey: string;
      kakaoPayChannel: string;
    };
    payssam: {
      apiKeyPayment: string;
      apiKeySearch: string;
      partnerId: string;
    };
  };

  // Messaging
  messaging: {
    kakao: {
      apiKey: string;
      senderKey: string;
      openbuilderId: string;
      openbuilderApiKey: string;
      blockIds: {
        attend: string;
        absent: string;
        makeupSelect: string;
        makeupConfirm: string;
      };
    };
    solapi: {
      apiKey: string;
      apiSecret: string;
      pfId: string;
    };
    slack: {
      webhookUrl: string;
      botToken: string;
    };
  };

  // External Services
  services: {
    google: {
      clientId: string;
      webClientId: string;
    };
    smartfit: {
      apiUrl: string;
      apiKey: string;
    };
  };

  // App Config
  app: {
    apiUrl: string;
    webUrl: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 Environment Variable Loader
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 환경변수 가져오기 (required)
 * 누락 시 개발 환경에서는 경고, 프로덕션에서는 에러
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;

  if (!value) {
    const message = `❌ Missing required environment variable: ${key}`;
    if (__DEV__) {
      console.warn(message);
      return ''; // 개발 환경에서는 빈 문자열 반환
    } else {
      throw new Error(message); // 프로덕션에서는 에러
    }
  }

  return value;
};

/**
 * 환경변수 가져오기 (optional)
 */
const getOptionalEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🌍 Environment Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export const env: EnvConfig = {
  // Supabase
  supabase: {
    url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'https://pphzvnaedmzcvpxjulti.supabase.co'),
    anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'your-anon-key'),
  },

  // Payment
  payment: {
    toss: {
      clientKey: getEnvVar('EXPO_PUBLIC_TOSS_CLIENT_KEY'),
      secretKey: getEnvVar('EXPO_PUBLIC_TOSS_SECRET_KEY'),
    },
    portone: {
      storeId: getEnvVar('EXPO_PUBLIC_PORTONE_STORE_ID', 'store-xxx'),
      channelKey: getEnvVar('EXPO_PUBLIC_PORTONE_CHANNEL_KEY', 'channel-xxx'),
      kakaoPayChannel: getEnvVar('EXPO_PUBLIC_PORTONE_KAKAOPAY_CHANNEL', 'channel-kakaopay'),
    },
    payssam: {
      apiKeyPayment: getOptionalEnvVar('EXPO_PUBLIC_PAYSSAM_API_KEY_PAYMENT'),
      apiKeySearch: getOptionalEnvVar('EXPO_PUBLIC_PAYSSAM_API_KEY_SEARCH'),
      partnerId: getOptionalEnvVar('EXPO_PUBLIC_PAYSSAM_PARTNER_ID'),
    },
  },

  // Messaging
  messaging: {
    kakao: {
      apiKey: getEnvVar('EXPO_PUBLIC_KAKAO_API_KEY'),
      senderKey: getEnvVar('EXPO_PUBLIC_KAKAO_SENDER_KEY'),
      openbuilderId: getOptionalEnvVar('KAKAO_OPENBUILDER_BOT_ID'),
      openbuilderApiKey: getOptionalEnvVar('KAKAO_OPENBUILDER_API_KEY'),
      blockIds: {
        attend: getOptionalEnvVar('KAKAO_BLOCK_ATTEND'),
        absent: getOptionalEnvVar('KAKAO_BLOCK_ABSENT'),
        makeupSelect: getOptionalEnvVar('KAKAO_BLOCK_MAKEUP_SELECT'),
        makeupConfirm: getOptionalEnvVar('KAKAO_BLOCK_MAKEUP_CONFIRM'),
      },
    },
    solapi: {
      apiKey: getEnvVar('EXPO_PUBLIC_SOLAPI_API_KEY'),
      apiSecret: getEnvVar('EXPO_PUBLIC_SOLAPI_API_SECRET'),
      pfId: getEnvVar('EXPO_PUBLIC_SOLAPI_PFID'),
    },
    slack: {
      webhookUrl: getEnvVar('EXPO_PUBLIC_SLACK_WEBHOOK_URL'),
      botToken: getEnvVar('EXPO_PUBLIC_SLACK_BOT_TOKEN'),
    },
  },

  // External Services
  services: {
    google: {
      clientId: getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
      webClientId: getEnvVar('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
    },
    smartfit: {
      apiUrl: getOptionalEnvVar('EXPO_PUBLIC_SMARTFIT_API_URL'),
      apiKey: getOptionalEnvVar('EXPO_PUBLIC_SMARTFIT_API_KEY'),
    },
  },

  // App Config
  app: {
    apiUrl: getOptionalEnvVar('EXPO_PUBLIC_API_URL', 'https://api.autus.ai/v1'),
    webUrl: getOptionalEnvVar('EXPO_PUBLIC_WEB_URL', 'https://onlyssam.app'),
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 Validation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 필수 환경변수 검증
 */
export const validateEnv = (): boolean => {
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return false;
  }

  if (__DEV__) {
    console.log('✅ All required environment variables are set');
  }

  return true;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 Export
// ═══════════════════════════════════════════════════════════════════════════════

export default env;
