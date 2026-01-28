/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💬 Praise Notification - 칭찬 알림 (학부모/학생용)
 * 도파민 트리거: 인정/칭찬 = 사회적 보상
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';

export interface PraiseMessage {
  id: string;
  from: string;
  fromRole: 'teacher' | 'principal' | 'system';
  message: string;
  studentName?: string;
  timestamp: Date;
  isRead?: boolean;
}

interface PraiseNotificationProps {
  message: PraiseMessage;
  onClose?: () => void;
  onReply?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export default function PraiseNotification({
  message,
  onClose,
  onReply,
  autoHide = false,
  autoHideDelay = 5000,
}: PraiseNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showReaction, setShowReaction] = useState(false);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onClose]);

  if (!isVisible) return null;

  const roleIcons = {
    teacher: '🧑‍🏫',
    principal: '👑',
    system: '🤖',
  };

  const handleReaction = (emoji: string) => {
    setShowReaction(true);
    // TODO: API 호출
    setTimeout(() => setShowReaction(false), 1500);
  };

  return (
    <div className="relative">
      {/* 알림 카드 */}
      <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl p-4 shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{roleIcons[message.fromRole]}</span>
            <div>
              <div className="font-medium text-white">{message.from}</div>
              <div className="text-xs text-slate-400">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* 메시지 */}
        <div className="bg-white/10 rounded-lg p-3 mb-3">
          <p className="text-white leading-relaxed">{message.message}</p>
        </div>

        {/* 학생 이름 (있는 경우) */}
        {message.studentName && (
          <div className="text-sm text-pink-300 mb-3">
            💝 {message.studentName}에 대한 칭찬이에요!
          </div>
        )}

        {/* 반응 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReaction('❤️')}
            className="flex-1 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <span>❤️</span>
            <span>좋아요</span>
          </button>
          {onReply && (
            <button
              onClick={onReply}
              className="flex-1 py-2 bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-sm flex items-center justify-center gap-1"
            >
              <span>💬</span>
              <span>답장하기</span>
            </button>
          )}
        </div>
      </div>

      {/* 반응 애니메이션 */}
      {showReaction && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-4xl animate-bounce">❤️</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 칭찬 알림 리스트
// ─────────────────────────────────────────────────────────────────────────────

interface PraiseListProps {
  messages: PraiseMessage[];
  onMessageClick?: (message: PraiseMessage) => void;
}

export function PraiseList({ messages, onMessageClick }: PraiseListProps) {
  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>💬</span>
          <span>칭찬 메시지</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-pink-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
      </div>

      {/* 메시지 리스트 */}
      {messages.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <div className="text-4xl mb-2">💝</div>
          <div>아직 칭찬 메시지가 없어요</div>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => onMessageClick?.(msg)}
              className={`
                w-full p-3 rounded-lg text-left transition-colors
                ${msg.isRead 
                  ? 'bg-slate-800/50 border border-slate-700' 
                  : 'bg-pink-500/10 border border-pink-500/30'
                }
                hover:bg-slate-700
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {msg.fromRole === 'teacher' ? '🧑‍🏫' : msg.fromRole === 'principal' ? '👑' : '🤖'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{msg.from}</span>
                    <span className="text-xs text-slate-500">
                      {msg.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 truncate">{msg.message}</p>
                </div>
                {!msg.isRead && (
                  <span className="w-2 h-2 bg-pink-500 rounded-full" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
