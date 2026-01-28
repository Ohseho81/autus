/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Offline Indicator
 * 오프라인 상태 표시 및 큐 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleContext } from '../../contexts/RoleContext';
import { useReducedMotion } from '../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useOnlineStatus
// ─────────────────────────────────────────────────────────────────────────────

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePendingActions (for queued offline actions)
// ─────────────────────────────────────────────────────────────────────────────

interface PendingAction {
  id: string;
  type: string;
  data: unknown;
  timestamp: Date;
}

export function usePendingActions() {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  // Load from localStorage
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('autus-pending-actions');
    if (saved) {
      try {
        setPendingActions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse pending actions:', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('autus-pending-actions', JSON.stringify(pendingActions));
  }, [pendingActions]);

  const addAction = (type: string, data: unknown) => {
    const action: PendingAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
    };
    setPendingActions((prev) => [...prev, action]);
    return action.id;
  };

  const removeAction = (id: string) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
  };

  const clearActions = () => {
    setPendingActions([]);
  };

  return {
    pendingActions,
    pendingCount: pendingActions.length,
    addAction,
    removeAction,
    clearActions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline Indicator Component
// ─────────────────────────────────────────────────────────────────────────────

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { pendingCount } = usePendingActions();
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();

  const [showDetails, setShowDetails] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  // Track when coming back online
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Don't render if online and no pending actions and not just reconnected
  if (isOnline && pendingCount === 0 && !showReconnected) {
    return null;
  }

  return (
    <AnimatePresence>
      {/* Offline Banner */}
      {!isOnline && (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { y: -100, opacity: 0 }}
          animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100]"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-amber-500 text-amber-950 px-4 py-3 flex items-center justify-center gap-3">
            <span className="text-xl">📴</span>
            <span className="font-medium">오프라인 상태입니다</span>
            {pendingCount > 0 && (
              <button
                onClick={() => setShowDetails(true)}
                className="
                  px-3 py-1 bg-amber-600/30 rounded-full text-sm font-medium
                  hover:bg-amber-600/50 transition-colors
                  min-h-[32px]
                "
                aria-label={`대기 중인 작업 ${pendingCount}개 보기`}
              >
                대기 중 {pendingCount}건
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Reconnected Toast */}
      {showReconnected && (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { y: -100, opacity: 0 }}
          animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100]"
          role="status"
          aria-live="polite"
        >
          <div className="bg-emerald-500 text-white px-4 py-3 flex items-center justify-center gap-3">
            <span className="text-xl">✅</span>
            <span className="font-medium">다시 연결되었습니다</span>
            {pendingCount > 0 && (
              <span className="text-sm opacity-80">
                {pendingCount}개 작업 동기화 중...
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Pending Count Badge (when online but has pending) */}
      {isOnline && !showReconnected && pendingCount > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={() => setShowDetails(true)}
          className={`
            fixed top-4 right-4 z-[90]
            px-3 py-2 rounded-full
            ${theme.mode === 'dark' ? 'bg-amber-500 text-amber-950' : 'bg-amber-500 text-white'}
            shadow-lg
            flex items-center gap-2
            min-h-[44px]
          `}
          aria-label={`동기화 대기 중 ${pendingCount}개`}
        >
          <span className="animate-spin">🔄</span>
          <span className="font-medium text-sm">{pendingCount}</span>
        </motion.button>
      )}

      {/* Details Modal */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDetails(false)}
        >
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            className={`
              w-full max-w-md rounded-2xl p-6
              ${theme.mode === 'dark' ? 'bg-slate-800' : 'bg-white'}
              shadow-xl
            `}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="offline-dialog-title"
            aria-modal="true"
          >
            <h2 
              id="offline-dialog-title" 
              className="text-lg font-bold mb-4 flex items-center gap-2"
            >
              <span>📋</span>
              대기 중인 작업
            </h2>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {pendingCount === 0 ? (
                <p className="text-center py-8 opacity-50">
                  대기 중인 작업이 없습니다
                </p>
              ) : (
                <p className="text-sm opacity-70 mb-4">
                  인터넷에 연결되면 자동으로 동기화됩니다.
                </p>
              )}
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className={`
                w-full mt-4 py-3 rounded-xl font-medium
                ${theme.mode === 'dark' 
                  ? 'bg-white/10 hover:bg-white/20' 
                  : 'bg-slate-100 hover:bg-slate-200'
                }
                transition-colors
                min-h-[48px]
              `}
            >
              닫기
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OfflineIndicator;
