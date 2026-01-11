import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read?: boolean;
}

interface AlertFeedProps {
  alerts: Alert[];
  maxVisible?: number;
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

const alertStyles = {
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'ℹ️',
    text: 'text-blue-400',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: '⚠️',
    text: 'text-yellow-400',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '🚨',
    text: 'text-red-400',
  },
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: '✅',
    text: 'text-green-400',
  },
};

/**
 * 알림 피드 컴포넌트
 * 실시간 알림을 타임라인 형태로 표시
 */
export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  maxVisible = 5,
  onDismiss,
  onMarkRead,
}) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredAlerts = alerts
    .filter((alert) => filter === 'all' || alert.type === filter)
    .slice(0, maxVisible);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <h3 className="font-semibold text-white flex items-center gap-2">
          🔔 알림
          {alerts.filter((a) => !a.read).length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {alerts.filter((a) => !a.read).length}
            </span>
          )}
        </h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-700"
        >
          <option value="all">전체</option>
          <option value="error">오류</option>
          <option value="warning">경고</option>
          <option value="info">정보</option>
          <option value="success">성공</option>
        </select>
      </div>

      {/* 알림 목록 */}
      <div className="max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-3xl mb-2">📭</div>
              새로운 알림이 없습니다
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const style = alertStyles[alert.type];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 border-b border-gray-700/30 ${style.bg} ${
                    !alert.read ? 'bg-opacity-100' : 'bg-opacity-50'
                  }`}
                  onClick={() => onMarkRead?.(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-medium ${style.text}`}>
                          {alert.title}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {alert.message}
                      </p>
                    </div>
                    {onDismiss && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(alert.id);
                        }}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AlertFeed;
