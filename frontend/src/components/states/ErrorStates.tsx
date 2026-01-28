/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ❌ ErrorStates - 에러 상태 UI
 * 
 * 에러 발생 시 사용자 친화적인 UI
 * - 에러 유형별 다른 메시지
 * - 복구 방법 안내
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 에러 타입
// ═══════════════════════════════════════════════════════════════════════════════

export type ErrorType = 
  | 'network'           // 네트워크 에러
  | 'server'            // 서버 에러
  | 'auth'              // 인증 에러
  | 'permission'        // 권한 에러
  | 'not_found'         // 찾을 수 없음
  | 'validation'        // 입력 에러
  | 'timeout'           // 시간 초과
  | 'unknown';          // 알 수 없는 에러

export interface ErrorConfig {
  type: ErrorType;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  recoverable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 에러 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  network: {
    type: 'network',
    icon: '📡',
    title: '인터넷 연결을 확인해주세요',
    description: '네트워크에 연결되어 있지 않은 것 같아요.',
    actionLabel: '다시 시도',
    recoverable: true,
  },
  
  server: {
    type: 'server',
    icon: '🔧',
    title: '서버에 문제가 생겼어요',
    description: '잠시 후 다시 시도해주세요. 곧 해결할게요!',
    actionLabel: '다시 시도',
    recoverable: true,
  },
  
  auth: {
    type: 'auth',
    icon: '🔐',
    title: '다시 로그인해주세요',
    description: '로그인이 만료되었어요.',
    actionLabel: '로그인',
    recoverable: true,
  },
  
  permission: {
    type: 'permission',
    icon: '🚫',
    title: '접근 권한이 없어요',
    description: '이 페이지를 볼 수 있는 권한이 없어요.',
    actionLabel: '돌아가기',
    recoverable: false,
  },
  
  not_found: {
    type: 'not_found',
    icon: '🔍',
    title: '페이지를 찾을 수 없어요',
    description: '주소가 잘못되었거나 삭제된 페이지예요.',
    actionLabel: '홈으로',
    recoverable: false,
  },
  
  validation: {
    type: 'validation',
    icon: '⚠️',
    title: '입력을 확인해주세요',
    description: '입력한 정보가 올바르지 않아요.',
    actionLabel: '확인',
    recoverable: true,
  },
  
  timeout: {
    type: 'timeout',
    icon: '⏱️',
    title: '시간이 너무 오래 걸려요',
    description: '네트워크가 느리거나 서버가 바쁜 것 같아요.',
    actionLabel: '다시 시도',
    recoverable: true,
  },
  
  unknown: {
    type: 'unknown',
    icon: '😥',
    title: '문제가 생겼어요',
    description: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
    actionLabel: '다시 시도',
    recoverable: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ErrorState 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorStateProps {
  type: ErrorType;
  customTitle?: string;
  customDescription?: string;
  errorCode?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  fullPage?: boolean;
}

export default function ErrorState({
  type,
  customTitle,
  customDescription,
  errorCode,
  onAction,
  onSecondaryAction,
  secondaryActionLabel = '문의하기',
  fullPage = false,
}: ErrorStateProps) {
  const config = ERROR_CONFIGS[type];

  const content = (
    <div className="text-center">
      {/* 아이콘 */}
      <div className="text-6xl mb-6">{config.icon}</div>

      {/* 타이틀 */}
      <h2 className="text-xl font-bold text-white mb-2">
        {customTitle || config.title}
      </h2>

      {/* 설명 */}
      <p className="text-slate-400 mb-6 max-w-sm mx-auto">
        {customDescription || config.description}
      </p>

      {/* 에러 코드 */}
      {errorCode && (
        <p className="text-xs text-slate-600 mb-4 font-mono">
          오류 코드: {errorCode}
        </p>
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onAction && (
          <button
            onClick={onAction}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors"
          >
            {config.actionLabel}
          </button>
        )}
        
        {onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-800/50 rounded-xl border border-slate-700/50">
      {content}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 특수 에러 페이지들
// ═══════════════════════════════════════════════════════════════════════════════

export function NotFoundPage({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4">
      <div className="text-center">
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <h2 className="text-xl text-slate-300 mb-2">페이지를 찾을 수 없어요</h2>
        <p className="text-slate-500 mb-8">
          주소가 잘못되었거나 삭제된 페이지예요.
        </p>
        <button
          onClick={onGoHome}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold transition-all"
        >
          🏠 홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export function ServerErrorPage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/10 to-slate-900 p-4">
      <div className="text-center">
        <div className="text-8xl mb-6">🔧</div>
        <h1 className="text-4xl font-bold text-white mb-4">500</h1>
        <h2 className="text-xl text-slate-300 mb-2">서버에 문제가 생겼어요</h2>
        <p className="text-slate-500 mb-8">
          저희가 빠르게 해결하고 있어요. 잠시만 기다려주세요!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors"
          >
            🔄 다시 시도
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
          >
            🏠 홈으로
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthRequiredPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 p-4">
      <div className="text-center">
        <div className="text-8xl mb-6">🔐</div>
        <h2 className="text-xl text-slate-300 mb-2">로그인이 필요해요</h2>
        <p className="text-slate-500 mb-8">
          이 페이지를 보려면 먼저 로그인해주세요.
        </p>
        <button
          onClick={onLogin}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold transition-all"
        >
          🚀 로그인하기
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 인라인 에러 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
}

export function InlineError({ message, onDismiss }: InlineErrorProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
      <span className="text-red-400">⚠️</span>
      <span className="text-red-200 text-sm flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-300"
        >
          ×
        </button>
      )}
    </div>
  );
}
