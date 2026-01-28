/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🍞 ToastNotification - 토스트 알림
 * 
 * 실시간 인앱 알림을 화면 상단/하단에 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import type { NotificationType, NotificationPriority } from '../../core/notifications/notification-config';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface Toast {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body?: string;
  icon: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  celebrationTrigger?: boolean;
}

interface ToastNotificationProps {
  toast: Toast;
  position?: 'top' | 'bottom';
  onDismiss: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 단일 토스트 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function ToastNotification({
  toast,
  position = 'top',
  onDismiss,
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 등장 애니메이션
    setTimeout(() => setIsVisible(true), 10);

    // 자동 사라짐
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  const getPriorityStyles = () => {
    switch (toast.priority) {
      case 'critical':
        return 'bg-gradient-to-r from-red-900 to-red-800 border-red-500/50';
      case 'high':
        return 'bg-gradient-to-r from-orange-900 to-orange-800 border-orange-500/50';
      case 'medium':
        return 'bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600';
      case 'low':
        return 'bg-slate-800 border-slate-700';
    }
  };

  const getTypeIcon = () => {
    switch (toast.type) {
      case 'risk_alert': return '🚨';
      case 'action_required': return '⚡';
      case 'praise': return '👏';
      case 'milestone': return '🏆';
      case 'reminder': return '⏰';
      case 'report': return '📊';
      case 'message': return '💬';
      default: return '🔔';
    }
  };

  return (
    <div
      className={`
        max-w-sm w-full p-4 rounded-xl border shadow-lg backdrop-blur-sm
        transform transition-all duration-300
        ${getPriorityStyles()}
        ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : 
          position === 'top' ? '-translate-y-4 opacity-0' : 'translate-y-4 opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div className="text-2xl flex-shrink-0">
          {toast.icon || getTypeIcon()}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white">{toast.title}</h4>
          {toast.body && (
            <p className="text-sm text-slate-300 mt-0.5 line-clamp-2">{toast.body}</p>
          )}
          
          {/* 액션 버튼 */}
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={() => {
                toast.onAction?.();
                handleDismiss();
              }}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              {toast.actionLabel} →
            </button>
          )}
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-white flex-shrink-0"
        >
          ×
        </button>
      </div>

      {/* 진행 바 (자동 사라짐 표시) */}
      {toast.duration && toast.duration > 0 && (
        <div className="mt-3 h-0.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/30 rounded-full"
            style={{
              animation: `shrink ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 토스트 컨테이너 (여러 토스트 관리)
// ═══════════════════════════════════════════════════════════════════════════════

interface ToastContainerProps {
  toasts: Toast[];
  position?: 'top' | 'bottom';
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

export function ToastContainer({
  toasts,
  position = 'top',
  onDismiss,
  maxVisible = 3,
}: ToastContainerProps) {
  const visibleToasts = toasts.slice(0, maxVisible);

  return (
    <div
      className={`
        fixed z-50 left-1/2 -translate-x-1/2 
        flex flex-col gap-2 px-4
        ${position === 'top' ? 'top-4' : 'bottom-20'}
      `}
    >
      {visibleToasts.map(toast => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          position={position}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 토스트 Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  // 편의 메서드
  const success = (title: string, body?: string) => {
    addToast({
      type: 'milestone',
      priority: 'medium',
      title,
      body,
      icon: '✅',
      duration: 3000,
    });
  };

  const error = (title: string, body?: string) => {
    addToast({
      type: 'system',
      priority: 'high',
      title,
      body,
      icon: '❌',
      duration: 5000,
    });
  };

  const warning = (title: string, body?: string) => {
    addToast({
      type: 'risk_alert',
      priority: 'high',
      title,
      body,
      icon: '⚠️',
      duration: 5000,
    });
  };

  const info = (title: string, body?: string) => {
    addToast({
      type: 'system',
      priority: 'low',
      title,
      body,
      icon: 'ℹ️',
      duration: 4000,
    });
  };

  return {
    toasts,
    addToast,
    dismissToast,
    clearAll,
    success,
    error,
    warning,
    info,
    ToastContainerComponent: () => (
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    ),
  };
}
