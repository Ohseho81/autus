/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📭 EmptyStates - 빈 상태 UI
 * 
 * 데이터가 없을 때 표시하는 친근한 UI
 * - 상황에 맞는 메시지
 * - 다음 행동 유도
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 빈 상태 타입
// ═══════════════════════════════════════════════════════════════════════════════

export type EmptyStateType = 
  | 'no_students'           // 학생 없음
  | 'no_risk_queue'         // 관심 필요 학생 없음 (좋은 것!)
  | 'no_records'            // 기록 없음
  | 'no_notifications'      // 알림 없음
  | 'no_messages'           // 메시지 없음
  | 'no_badges'             // 뱃지 없음
  | 'no_homework'           // 숙제 없음
  | 'no_decisions'          // 결정 대기 없음
  | 'no_reports'            // 리포트 없음
  | 'no_search_results'     // 검색 결과 없음
  | 'first_time'            // 처음 사용
  | 'loading_failed'        // 로딩 실패
  | 'coming_soon';          // 준비 중

export interface EmptyStateConfig {
  type: EmptyStateType;
  icon: string;
  title: string;
  description: string;
  isPositive?: boolean;     // 좋은 상태인지 (예: 관심 필요 없음)
  actionLabel?: string;
  actionUrl?: string;
  secondaryAction?: {
    label: string;
    url: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 빈 상태 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const EMPTY_STATES: Record<EmptyStateType, EmptyStateConfig> = {
  no_students: {
    type: 'no_students',
    icon: '🎒',
    title: '학생이 없어요',
    description: '학생을 등록하면 여기서 관리할 수 있어요.',
    actionLabel: '학생 등록하기',
    actionUrl: '/students/new',
  },
  
  no_risk_queue: {
    type: 'no_risk_queue',
    icon: '✨',
    title: '모든 학생이 안정적이에요!',
    description: '관심 필요 학생이 없어요. 잘 관리하고 계시네요!',
    isPositive: true,
  },
  
  no_records: {
    type: 'no_records',
    icon: '📝',
    title: '아직 기록이 없어요',
    description: '첫 번째 기록을 남겨보세요! 30초면 돼요.',
    actionLabel: '기록하기',
    actionUrl: '/quick-tag',
  },
  
  no_notifications: {
    type: 'no_notifications',
    icon: '🔕',
    title: '알림이 없어요',
    description: '새로운 알림이 오면 여기서 확인할 수 있어요.',
  },
  
  no_messages: {
    type: 'no_messages',
    icon: '💬',
    title: '메시지가 없어요',
    description: '선생님 또는 학부모님과 대화를 시작해보세요.',
    actionLabel: '메시지 보내기',
    actionUrl: '/messages/new',
  },
  
  no_badges: {
    type: 'no_badges',
    icon: '🎖️',
    title: '아직 뱃지가 없어요',
    description: '미션을 완료하면 멋진 뱃지를 받을 수 있어요!',
    actionLabel: '미션 보기',
    actionUrl: '/missions',
  },
  
  no_homework: {
    type: 'no_homework',
    icon: '🎉',
    title: '오늘 숙제 끝!',
    description: '숙제가 없어요. 잘했어!',
    isPositive: true,
  },
  
  no_decisions: {
    type: 'no_decisions',
    icon: '✅',
    title: '결정할 사항이 없어요',
    description: '모든 결정이 처리되었어요.',
    isPositive: true,
  },
  
  no_reports: {
    type: 'no_reports',
    icon: '📊',
    title: '리포트가 아직 없어요',
    description: '데이터가 쌓이면 리포트가 생성돼요.',
  },
  
  no_search_results: {
    type: 'no_search_results',
    icon: '🔍',
    title: '검색 결과가 없어요',
    description: '다른 키워드로 검색해보세요.',
  },
  
  first_time: {
    type: 'first_time',
    icon: '👋',
    title: '처음 오셨군요!',
    description: '먼저 간단한 설정을 해볼까요?',
    actionLabel: '시작하기',
    actionUrl: '/onboarding',
  },
  
  loading_failed: {
    type: 'loading_failed',
    icon: '😵',
    title: '데이터를 불러오지 못했어요',
    description: '잠시 후 다시 시도해주세요.',
    actionLabel: '다시 시도',
  },
  
  coming_soon: {
    type: 'coming_soon',
    icon: '🚧',
    title: '준비 중이에요',
    description: '이 기능은 곧 출시됩니다!',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EmptyState 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface EmptyStateProps {
  type: EmptyStateType;
  customTitle?: string;
  customDescription?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({
  type,
  customTitle,
  customDescription,
  onAction,
  onSecondaryAction,
  size = 'md',
}: EmptyStateProps) {
  const config = EMPTY_STATES[type];

  const sizeClasses = {
    sm: {
      container: 'py-6 px-4',
      icon: 'text-3xl',
      title: 'text-sm',
      description: 'text-xs',
      button: 'py-1.5 px-3 text-xs',
    },
    md: {
      container: 'py-12 px-6',
      icon: 'text-5xl',
      title: 'text-lg',
      description: 'text-sm',
      button: 'py-2 px-4 text-sm',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'text-6xl',
      title: 'text-xl',
      description: 'text-base',
      button: 'py-3 px-6 text-base',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={`${sizes.container} text-center`}>
      {/* 아이콘 */}
      <div className={`${sizes.icon} mb-4 ${config.isPositive ? 'animate-bounce' : ''}`}>
        {config.icon}
      </div>

      {/* 타이틀 */}
      <h3 className={`font-semibold ${sizes.title} ${
        config.isPositive ? 'text-green-400' : 'text-white'
      } mb-2`}>
        {customTitle || config.title}
      </h3>

      {/* 설명 */}
      <p className={`text-slate-400 ${sizes.description} mb-4 max-w-xs mx-auto`}>
        {customDescription || config.description}
      </p>

      {/* 긍정 상태 표시 */}
      {config.isPositive && (
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-xs mb-4">
          <span>✨</span>
          <span>좋아요!</span>
        </div>
      )}

      {/* 액션 버튼 */}
      {config.actionLabel && (
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={onAction}
            className={`${sizes.button} bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors`}
          >
            {config.actionLabel}
          </button>
          
          {config.secondaryAction && (
            <button
              onClick={onSecondaryAction}
              className={`${sizes.button} bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors`}
            >
              {config.secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 특수 Empty State 컴포넌트들
// ═══════════════════════════════════════════════════════════════════════════════

export function NoRiskQueueState() {
  return (
    <div className="p-8 text-center bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/30">
      <div className="text-5xl mb-4">🎉</div>
      <h3 className="text-lg font-semibold text-green-400 mb-2">
        모든 학생이 안정적이에요!
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        관심 필요 학생이 없어요. 잘 관리하고 계시네요!
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full">
        <span className="text-green-400">🛡️</span>
        <span className="text-green-300 text-sm">이탈 위험 0%</span>
      </div>
    </div>
  );
}

export function FirstTimeState({ onStart }: { onStart: () => void }) {
  return (
    <div className="p-8 text-center bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30">
      <div className="text-5xl mb-4 animate-wave">👋</div>
      <h3 className="text-lg font-semibold text-white mb-2">
        처음 오셨군요!
      </h3>
      <p className="text-slate-400 text-sm mb-6">
        1분이면 시작할 수 있어요. 같이 해볼까요?
      </p>
      <button
        onClick={onStart}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold transition-all"
      >
        🚀 시작하기
      </button>
      
      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-20deg); }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export function LoadingFailedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-8 text-center">
      <div className="text-5xl mb-4">😵</div>
      <h3 className="text-lg font-semibold text-white mb-2">
        데이터를 불러오지 못했어요
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        네트워크 상태를 확인하고 다시 시도해주세요.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
      >
        🔄 다시 시도
      </button>
    </div>
  );
}
