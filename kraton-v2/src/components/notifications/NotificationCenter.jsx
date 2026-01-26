/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔔 NOTIFICATION CENTER - 알림 센터 UI
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import notificationService, { NOTIFICATION_TYPES } from '../../lib/notifications';

// ============================================
// NOTIFICATION ICONS
// ============================================
const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.RISK_ALERT]: '🚨',
  [NOTIFICATION_TYPES.PAYMENT]: '💳',
  [NOTIFICATION_TYPES.ATTENDANCE]: '📋',
  [NOTIFICATION_TYPES.REPORT]: '📊',
  [NOTIFICATION_TYPES.MESSAGE]: '💬',
  [NOTIFICATION_TYPES.SCHEDULE]: '📅',
  [NOTIFICATION_TYPES.SYSTEM]: '⚙️',
};

const NOTIFICATION_COLORS = {
  [NOTIFICATION_TYPES.RISK_ALERT]: 'red',
  [NOTIFICATION_TYPES.PAYMENT]: 'emerald',
  [NOTIFICATION_TYPES.ATTENDANCE]: 'blue',
  [NOTIFICATION_TYPES.REPORT]: 'purple',
  [NOTIFICATION_TYPES.MESSAGE]: 'cyan',
  [NOTIFICATION_TYPES.SCHEDULE]: 'orange',
  [NOTIFICATION_TYPES.SYSTEM]: 'gray',
};

// ============================================
// NOTIFICATION ITEM
// ============================================
const NotificationItem = memo(function NotificationItem({ notification, onRead, onAction }) {
  const icon = NOTIFICATION_ICONS[notification.type] || '🔔';
  const color = NOTIFICATION_COLORS[notification.type] || 'gray';
  const timeAgo = getTimeAgo(notification.createdAt);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={() => onRead(notification.id)}
      className={`p-4 border-b border-gray-700/50 hover:bg-gray-800/50 cursor-pointer transition-colors ${
        !notification.read ? 'bg-gray-800/30' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}-500/20 flex items-center justify-center shrink-0`}>
          <span className="text-xl">{icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
              {notification.title}
            </p>
            {!notification.read && (
              <span className="w-2 h-2 bg-cyan-500 rounded-full shrink-0 mt-2" />
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-gray-500 text-xs mt-2">{timeAgo}</p>
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// NOTIFICATION BELL
// ============================================
export const NotificationBell = memo(function NotificationBell({ onClick }) {
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(({ unreadCount }) => {
      setUnreadCount(unreadCount);
    });
    return unsubscribe;
  }, []);
  
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-400 hover:text-white transition-colors"
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </button>
  );
});

// ============================================
// NOTIFICATION CENTER PANEL
// ============================================
export const NotificationPanel = memo(function NotificationPanel({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(({ notifications }) => {
      setNotifications(notifications);
    });
    
    // Initial load
    setNotifications(notificationService.getNotifications());
    
    return unsubscribe;
  }, []);
  
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;
  
  const handleMarkAsRead = useCallback((id) => {
    notificationService.markAsRead(id);
  }, []);
  
  const handleMarkAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);
  
  const handleClear = useCallback(() => {
    notificationService.clear();
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="absolute right-0 top-full mt-2 w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">알림</h3>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
            >
              모두 읽음
            </button>
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              전체 삭제
            </button>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'all', label: '전체' },
            { id: 'unread', label: '안 읽음' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          <AnimatePresence>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                />
              ))
            ) : (
              <div className="p-8 text-center">
                <span className="text-4xl">🔔</span>
                <p className="text-gray-500 mt-2">알림이 없습니다</p>
              </div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-gray-700">
          <button className="w-full py-2 text-sm text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
            모든 알림 보기 →
          </button>
        </div>
      </motion.div>
    </>
  );
});

// ============================================
// TOAST NOTIFICATION
// ============================================
export const NotificationToast = memo(function NotificationToast({ notification, onDismiss }) {
  const icon = NOTIFICATION_ICONS[notification.type] || '🔔';
  const color = NOTIFICATION_COLORS[notification.type] || 'gray';
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl max-w-sm"
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center shrink-0`}>
          <span className="text-xl">{icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium">{notification.title}</p>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{notification.message}</p>
        </div>
        
        <button
          onClick={() => onDismiss(notification.id)}
          className="text-gray-500 hover:text-white shrink-0"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
});

// ============================================
// TOAST CONTAINER
// ============================================
export const ToastContainer = memo(function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(({ notifications }) => {
      // Show toast for new notifications
      const newNotifications = notifications.filter(n => 
        !n.read && Date.now() - new Date(n.createdAt).getTime() < 1000
      );
      
      setToasts(prev => [
        ...prev.filter(t => !newNotifications.find(n => n.id === t.id)),
        ...newNotifications,
      ]);
    });
    
    return unsubscribe;
  }, []);
  
  const handleDismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            notification={toast}
            onDismiss={handleDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

// ============================================
// HOOK: useNotifications
// ============================================
export function useNotifications() {
  const [state, setState] = useState({
    notifications: [],
    unreadCount: 0,
  });
  
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setState);
    
    // Initial state
    setState({
      notifications: notificationService.getNotifications(),
      unreadCount: notificationService.unreadCount,
    });
    
    return unsubscribe;
  }, []);
  
  return {
    ...state,
    add: notificationService.add.bind(notificationService),
    markAsRead: notificationService.markAsRead.bind(notificationService),
    markAllAsRead: notificationService.markAllAsRead.bind(notificationService),
    clear: notificationService.clear.bind(notificationService),
    requestPermission: notificationService.requestPermission.bind(notificationService),
  };
}

// ============================================
// HELPER: Time Ago
// ============================================
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return '방금 전';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
  
  return date.toLocaleDateString('ko-KR');
}

export default NotificationPanel;
