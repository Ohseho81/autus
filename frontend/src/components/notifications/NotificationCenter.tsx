/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔔 NotificationCenter - 알림 센터 UI
 * 
 * 인앱 알림 표시, 관리, 설정 UI
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import type { NotificationType, NotificationPriority } from '../../core/notifications/notification-config';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  icon: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: Date;
  readAt?: Date;
  celebrationTrigger?: boolean;
}

interface NotificationCenterProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onAction: (notification: Notification) => void;
  onClear: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 데이터
// ═══════════════════════════════════════════════════════════════════════════════

export const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'risk_alert',
    priority: 'critical',
    title: '🥶 김민수 학생 관심 필요',
    body: '온도가 36°로 떨어졌어요. 어머니가 비용 고민 언급',
    icon: '🚨',
    actionLabel: '확인하기',
    actionUrl: '/students/1',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    type: 'praise',
    priority: 'medium',
    title: '✨ 선생님 효과!',
    body: '이서연 학생 온도가 +15° 올랐어요. 선생님 덕분이에요!',
    icon: '📈',
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    readAt: new Date(),
    celebrationTrigger: true,
  },
  {
    id: '3',
    type: 'milestone',
    priority: 'high',
    title: '🔥 15일 연속 달성!',
    body: '대단해요! 꾸준함이 실력이에요.',
    icon: '🔥',
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    celebrationTrigger: true,
  },
  {
    id: '4',
    type: 'report',
    priority: 'medium',
    title: '📊 이번 주 리포트',
    body: '이번 주 기록 12건, 효과 확인 5명',
    icon: '📊',
    actionLabel: '확인하기',
    actionUrl: '/reports/weekly',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    readAt: new Date(),
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function NotificationCenter({
  notifications = SAMPLE_NOTIFICATIONS,
  isOpen,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onAction,
  onClear,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || !n.readAt
  );

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const getTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금';
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical': return 'border-red-500/50 bg-red-500/5';
      case 'high': return 'border-orange-500/50 bg-orange-500/5';
      case 'medium': return 'border-blue-500/30 bg-slate-800/50';
      case 'low': return 'border-slate-700/50 bg-slate-800/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 알림 패널 */}
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-hidden flex flex-col animate-slideIn">
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              🔔 알림
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* 필터 + 모두 읽음 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filter === 'unread' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                안 읽음 ({unreadCount})
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                모두 읽음
              </button>
            )}
          </div>
        </div>

        {/* 알림 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <span className="text-4xl mb-2">🔕</span>
              <p>알림이 없어요</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-2 ${getPriorityColor(notification.priority)} ${
                    !notification.readAt ? 'bg-blue-500/5' : ''
                  }`}
                  onClick={() => {
                    if (!notification.readAt) {
                      onMarkRead(notification.id);
                    }
                    if (notification.actionUrl) {
                      onAction(notification);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* 아이콘 */}
                    <div className="text-2xl flex-shrink-0">{notification.icon}</div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-medium text-sm ${!notification.readAt ? 'text-white' : 'text-slate-300'}`}>
                          {notification.title}
                        </h3>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {notification.body}
                      </p>

                      {/* 액션 버튼 */}
                      {notification.actionLabel && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction(notification);
                          }}
                          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                        >
                          {notification.actionLabel} →
                        </button>
                      )}
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClear(notification.id);
                      }}
                      className="text-slate-600 hover:text-slate-400 flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>

                  {/* 읽지 않음 표시 */}
                  {!notification.readAt && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 설정 */}
        <div className="p-4 border-t border-slate-800">
          <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-400 transition-colors">
            ⚙️ 알림 설정
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.2s ease-out;
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
// 알림 벨 버튼 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
