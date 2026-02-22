/**
 * constants.ts
 * 매직 넘버 및 상수 중앙 관리
 * - 타임아웃, 페이지네이션, 제한값 등
 * - 하드코딩된 숫자를 제거하고 의미있는 이름으로 관리
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ⏱️ Timeouts (milliseconds)
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMEOUTS = {
  /** API 요청 타임아웃 */
  API_REQUEST: 10000, // 10초

  /** 파일 업로드 타임아웃 */
  FILE_UPLOAD: 30000, // 30초

  /** 짧은 작업 타임아웃 (PG 처리 등) */
  SHORT_OPERATION: 100, // 0.1초

  /** 중간 작업 타임아웃 (로딩 스피너 등) */
  MEDIUM_OPERATION: 500, // 0.5초

  /** 긴 작업 타임아웃 (동기화 등) */
  LONG_OPERATION: 1000, // 1초

  /** 네트워크 요청 타임아웃 */
  NETWORK: 3000, // 3초

  /** UI 피드백 표시 시간 */
  UI_FEEDBACK: 3000, // 3초

  /** Toast 메시지 표시 시간 */
  TOAST_DURATION: 3000, // 3초

  /** 자동 리프레시 딜레이 */
  AUTO_REFRESH: 300, // 0.3초

  /** 입력 디바운스 */
  INPUT_DEBOUNCE: 300, // 0.3초

  /** 검색 디바운스 */
  SEARCH_DEBOUNCE: 500, // 0.5초

  /** 자동 저장 디바운스 */
  AUTO_SAVE_DEBOUNCE: 2000, // 2초

  /** 스플래시 화면 최소 표시 시간 */
  SPLASH_MIN_DURATION: 2000, // 2초

  /** 화면 전환 애니메이션 */
  SCREEN_TRANSITION: 300, // 0.3초
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 Pagination
// ═══════════════════════════════════════════════════════════════════════════════

export const PAGINATION = {
  /** 기본 페이지 크기 */
  DEFAULT_PAGE_SIZE: 20,

  /** 작은 리스트 페이지 크기 */
  SMALL_PAGE_SIZE: 10,

  /** 큰 리스트 페이지 크기 */
  LARGE_PAGE_SIZE: 50,

  /** 무한 스크롤 한계 */
  MAX_ITEMS: 1000,

  /** 검색 결과 제한 */
  SEARCH_RESULT_LIMIT: 50,

  /** 최근 항목 표시 개수 */
  RECENT_ITEMS_LIMIT: 5,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ Validation Rules
// ═══════════════════════════════════════════════════════════════════════════════

export const VALIDATION = {
  /** 최대 메시지 길이 */
  MAX_MESSAGE_LENGTH: 1000,

  /** 최대 코멘트 길이 */
  MAX_COMMENT_LENGTH: 500,

  /** 최소 코멘트 길이 */
  MIN_COMMENT_LENGTH: 10,

  /** 최대 이름 길이 */
  MAX_NAME_LENGTH: 50,

  /** 최소 이름 길이 */
  MIN_NAME_LENGTH: 2,

  /** 최대 파일 크기 (bytes) - 10MB */
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  /** 최대 비디오 크기 (bytes) - 100MB */
  MAX_VIDEO_SIZE: 100 * 1024 * 1024,

  /** 최대 이미지 크기 (bytes) - 5MB */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,

  /** 허용 이미지 확장자 */
  ALLOWED_IMAGE_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],

  /** 허용 비디오 확장자 */
  ALLOWED_VIDEO_EXTENSIONS: ['mp4', 'mov', 'avi', 'mkv'],

  /** 전화번호 최소 길이 */
  MIN_PHONE_LENGTH: 10,

  /** 전화번호 최대 길이 */
  MAX_PHONE_LENGTH: 11,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔢 Business Rules
// ═══════════════════════════════════════════════════════════════════════════════

export const BUSINESS_RULES = {
  /** 결제 만료 알림 D-Day */
  PAYMENT_EXPIRY_WARNING_DAYS: 14, // 14일 전

  /** 수업 리마인더 알림 시간 (시간) */
  LESSON_REMINDER_HOURS: 1, // 1시간 전

  /** 수업 리마인더 알림 시간 (일) */
  LESSON_REMINDER_DAYS: 1, // 1일 전

  /** 출석 체크 유효 시간 (분) */
  ATTENDANCE_CHECK_WINDOW_MINUTES: 30, // 전후 30분

  /** 수업 취소 가능 시간 (시간) */
  LESSON_CANCEL_DEADLINE_HOURS: 24, // 24시간 전

  /** 보충수업 슬롯 조회 개수 */
  MAKEUP_SLOTS_LIMIT: 5,

  /** 미납 연체 경고 기준 (일) */
  PAYMENT_OVERDUE_WARNING_DAYS: 14, // 14일

  /** 이탈 위험 판단 기준 (주) */
  CHURN_RISK_WEEKS: 2, // 2주 미출석

  /** 만료 예정 수업권 기준 (일) */
  EXPIRING_CREDITS_DAYS: 7, // 7일 내
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 UI Constants
// ═══════════════════════════════════════════════════════════════════════════════

export const UI = {
  /** 기본 패딩 */
  DEFAULT_PADDING: 16,

  /** 작은 패딩 */
  SMALL_PADDING: 8,

  /** 큰 패딩 */
  LARGE_PADDING: 24,

  /** 기본 마진 */
  DEFAULT_MARGIN: 16,

  /** 리스트 아이템 높이 */
  LIST_ITEM_HEIGHT: 64,

  /** 헤더 높이 */
  HEADER_HEIGHT: 56,

  /** 탭 바 높이 */
  TAB_BAR_HEIGHT: 60,

  /** 버튼 높이 */
  BUTTON_HEIGHT: 48,

  /** 입력 필드 높이 */
  INPUT_HEIGHT: 44,

  /** 아이콘 크기 */
  ICON_SIZE: 24,

  /** 아바타 크기 */
  AVATAR_SIZE: 40,

  /** 썸네일 크기 */
  THUMBNAIL_SIZE: 80,

  /** 애니메이션 지속 시간 */
  ANIMATION_DURATION: 300,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 QR Code
// ═══════════════════════════════════════════════════════════════════════════════

export const QR_CODE = {
  /** QR 코드 크기 */
  SIZE: 200,

  /** QR 코드 여백 */
  MARGIN: 2,

  /** QR 코드 에러 정정 레벨 */
  ERROR_CORRECTION_LEVEL: 'M' as const,

  /** QR 코드 유효 기간 (일) */
  VALIDITY_DAYS: 365, // 1년
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 Notification
// ═══════════════════════════════════════════════════════════════════════════════

export const NOTIFICATION = {
  /** 알림 최대 표시 개수 */
  MAX_DISPLAY_COUNT: 99,

  /** 알림 자동 삭제 기간 (일) */
  AUTO_DELETE_DAYS: 30,

  /** 푸시 알림 채널 ID */
  CHANNEL_ID: 'onlyssam-notifications',

  /** 푸시 알림 채널 이름 */
  CHANNEL_NAME: '온리쌤 알림',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎥 Video
// ═══════════════════════════════════════════════════════════════════════════════

export const VIDEO = {
  /** 최대 녹화 시간 (초) */
  MAX_RECORDING_DURATION: 300, // 5분

  /** 비디오 품질 */
  QUALITY: 'high' as const,

  /** 비디오 압축 비율 */
  COMPRESSION_RATIO: 0.8,

  /** 썸네일 생성 시간 (초) */
  THUMBNAIL_TIME: 1.0,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🏀 Lesson Packages (온리쌤 수업권)
// ═══════════════════════════════════════════════════════════════════════════════

export const LESSON_PACKAGES = {
  /** 체험 수업 */
  TRIAL: {
    id: 'trial',
    name: '체험 수업',
    lessonCount: 1,
    price: 30000,
  },

  /** 기본반 4회 */
  BASIC_4: {
    id: 'basic_4',
    name: '기본반 4회',
    lessonCount: 4,
    price: 160000,
    pricePerLesson: 40000,
  },

  /** 정규반 8회 */
  STANDARD_8: {
    id: 'standard_8',
    name: '정규반 8회',
    lessonCount: 8,
    price: 280000,
    pricePerLesson: 35000,
  },

  /** 집중반 12회 */
  INTENSIVE_12: {
    id: 'intensive_12',
    name: '집중반 12회',
    lessonCount: 12,
    price: 360000,
    pricePerLesson: 30000,
  },

  /** 월정액 무제한 */
  MONTHLY_UNLIMITED: {
    id: 'monthly',
    name: '월정액 무제한',
    lessonCount: -1,
    price: 450000,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 Analytics
// ═══════════════════════════════════════════════════════════════════════════════

export const ANALYTICS = {
  /** V-Index 갱신 주기 (초) */
  V_INDEX_REFRESH_INTERVAL: 300, // 5분

  /** 대시보드 자동 새로고침 (초) */
  DASHBOARD_AUTO_REFRESH: 60, // 1분

  /** 출석률 계산 기간 (일) */
  ATTENDANCE_RATE_PERIOD_DAYS: 30, // 30일
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 Export All
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  TIMEOUTS,
  PAGINATION,
  VALIDATION,
  BUSINESS_RULES,
  UI,
  QR_CODE,
  NOTIFICATION,
  VIDEO,
  LESSON_PACKAGES,
  ANALYTICS,
} as const;
