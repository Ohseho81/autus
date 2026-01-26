/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💬 MESSAGE CENTER - 메시지 센터
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
  },
};

// ============================================
// MESSAGE TYPES
// ============================================
const MESSAGE_TYPES = {
  announcement: { label: '공지', color: 'purple', icon: '📢' },
  message: { label: '메시지', color: 'cyan', icon: '💬' },
  notice: { label: '알림', color: 'orange', icon: '🔔' },
  report: { label: '리포트', color: 'emerald', icon: '📊' },
};

// ============================================
// MOCK DATA
// ============================================
const MOCK_MESSAGES = [
  {
    id: 1,
    type: 'announcement',
    title: '설 연휴 휴원 안내',
    content: '2024년 1월 26일 ~ 28일 설 연휴로 휴원합니다. 즐거운 명절 보내세요!',
    sender: '학원',
    date: '2024-01-24',
    read: false,
    pinned: true,
  },
  {
    id: 2,
    type: 'message',
    title: '김민수 학부모님께',
    content: '이번 주 수학 테스트에서 우수한 성적을 거두었습니다. 앞으로도 꾸준히 노력해주세요.',
    sender: '박선생님',
    recipient: '김민수 학부모',
    date: '2024-01-23',
    read: true,
  },
  {
    id: 3,
    type: 'notice',
    title: '출결 알림',
    content: '김민수 학생이 14:02에 출석 체크되었습니다.',
    sender: '시스템',
    date: '2024-01-24',
    read: true,
  },
  {
    id: 4,
    type: 'report',
    title: '주간 리포트',
    content: '1월 3주차 학습 리포트가 생성되었습니다.',
    sender: '시스템',
    date: '2024-01-22',
    read: false,
    attachment: true,
  },
  {
    id: 5,
    type: 'message',
    title: '상담 요청',
    content: '진로 상담을 요청드립니다. 시간 되실 때 연락 부탁드립니다.',
    sender: '이지은 학부모',
    date: '2024-01-21',
    read: true,
  },
];

// ============================================
// MESSAGE LIST ITEM
// ============================================
const MessageItem = memo(function MessageItem({ message, isSelected, onClick }) {
  const type = MESSAGE_TYPES[message.type];
  
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: 4 }}
      className={`p-4 border-b border-gray-700/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500' : 'hover:bg-gray-800/50'
      } ${!message.read ? 'bg-gray-800/30' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-${type.color}-500/20 flex items-center justify-center shrink-0`}>
          <span className="text-xl">{type.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {message.pinned && <span className="text-yellow-400">📌</span>}
            {!message.read && <span className="w-2 h-2 bg-cyan-500 rounded-full" />}
            <span className={`text-xs px-2 py-0.5 rounded-full bg-${type.color}-500/20 text-${type.color}-400`}>
              {type.label}
            </span>
          </div>
          <p className={`font-medium truncate ${message.read ? 'text-gray-300' : 'text-white'}`}>
            {message.title}
          </p>
          <p className="text-gray-500 text-sm truncate mt-1">{message.content}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span>{message.sender}</span>
            <span>·</span>
            <span>{message.date}</span>
            {message.attachment && <span>📎</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// MESSAGE DETAIL
// ============================================
const MessageDetail = memo(function MessageDetail({ message, onReply, onDelete }) {
  if (!message) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <span className="text-6xl">💬</span>
          <p className="mt-4">메시지를 선택하세요</p>
        </div>
      </div>
    );
  }
  
  const type = MESSAGE_TYPES[message.type];
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm bg-${type.color}-500/20 text-${type.color}-400`}>
              {type.icon} {type.label}
            </span>
            {message.pinned && (
              <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                📌 고정됨
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
              📌
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
              🗑️
            </button>
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">{message.title}</h2>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>보낸 사람: {message.sender}</span>
          {message.recipient && <span>받는 사람: {message.recipient}</span>}
          <span>{message.date}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
        
        {message.attachment && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📎</span>
              <div className="flex-1">
                <p className="text-white font-medium">첨부파일</p>
                <p className="text-gray-500 text-sm">weekly_report_jan_w3.pdf (2.4MB)</p>
              </div>
              <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors">
                다운로드
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Reply */}
      {message.type === 'message' && (
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="답장을 입력하세요..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
            <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================
// COMPOSE MESSAGE MODAL
// ============================================
const ComposeModal = memo(function ComposeModal({ isOpen, onClose, onSend }) {
  const [form, setForm] = useState({
    type: 'message',
    recipients: '',
    title: '',
    content: '',
  });
  
  if (!isOpen) return null;
  
  const handleSend = () => {
    onSend(form);
    onClose();
    setForm({ type: 'message', recipients: '', title: '', content: '' });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-gray-700"
      >
        <h3 className="text-xl font-bold text-white mb-4">✍️ 메시지 작성</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">유형</label>
            <div className="flex gap-2">
              {Object.entries(MESSAGE_TYPES).slice(0, 2).map(([key, { label, icon, color }]) => (
                <button
                  key={key}
                  onClick={() => setForm({ ...form, type: key })}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                    form.type === key
                      ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">받는 사람</label>
            <input
              type="text"
              value={form.recipients}
              onChange={(e) => setForm({ ...form, recipients: e.target.value })}
              placeholder={form.type === 'announcement' ? '전체' : '이름 또는 반 입력'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="메시지 제목"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="메시지 내용을 입력하세요"
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSend}
            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            전송
          </button>
        </div>
      </motion.div>
    </div>
  );
});

// ============================================
// MAIN MESSAGE CENTER
// ============================================
export default function MessageCenter() {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCompose, setShowCompose] = useState(false);
  
  const selectedMessage = messages.find(m => m.id === selectedId);
  
  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages;
    if (filter === 'unread') return messages.filter(m => !m.read);
    return messages.filter(m => m.type === filter);
  }, [messages, filter]);
  
  const handleSelectMessage = (id) => {
    setSelectedId(id);
    // Mark as read
    setMessages(messages.map(m => 
      m.id === id ? { ...m, read: true } : m
    ));
  };
  
  const handleSendMessage = (data) => {
    const newMessage = {
      id: Date.now(),
      ...data,
      sender: '나',
      date: new Date().toISOString().split('T')[0],
      read: true,
    };
    setMessages([newMessage, ...messages]);
  };
  
  const unreadCount = messages.filter(m => !m.read).length;
  
  return (
    <div className="max-w-7xl mx-auto p-6 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white`}>💬 메시지 센터</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `읽지 않은 메시지 ${unreadCount}개` : '새 메시지가 없습니다'}
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
        >
          ✍️ 새 메시지
        </button>
      </div>
      
      {/* Main Content */}
      <div className="flex gap-6 h-[calc(100%-80px)]">
        {/* Sidebar */}
        <div className="w-96 bg-gray-800/50 rounded-2xl border border-gray-700/50 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: '전체' },
                { id: 'unread', label: `안 읽음 (${unreadCount})` },
                { id: 'announcement', label: '📢 공지' },
                { id: 'message', label: '💬 메시지' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filter === f.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Message List */}
          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length > 0 ? (
              filteredMessages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isSelected={selectedId === message.id}
                  onClick={() => handleSelectMessage(message.id)}
                />
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                메시지가 없습니다
              </div>
            )}
          </div>
        </div>
        
        {/* Message Detail */}
        <div className="flex-1 bg-gray-800/50 rounded-2xl border border-gray-700/50 flex flex-col overflow-hidden">
          <MessageDetail message={selectedMessage} />
        </div>
      </div>
      
      {/* Compose Modal */}
      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onSend={handleSendMessage}
      />
    </div>
  );
}
