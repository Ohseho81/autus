/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 올댓바스켓 학부모 앱 - 대치동 스타일
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Design System:
 * - Primary Gradient: #667eea → #764ba2
 * - Background: #F5F6F8
 * - Card: #FFFFFF with shadow
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, CreditCard, Video, MessageCircle,
  Home, User, ChevronLeft, Play, Bell
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Child {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  program: string;
  level: string;
}

interface ScheduleItem {
  id: string;
  date: string;
  dayOfWeek: string;
  time: string;
  program: string;
  coach: string;
  court: string;
}

interface PaymentInfo {
  currentMonth: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paidAt?: string;
  qrStatus: 'active' | 'inactive';
  qrExpiresAt?: string;
  lessonsRemaining: number;
  lessonsTotal: number;
}

interface VideoItem {
  id: string;
  title: string;
  coach: string;
  date: string;
  duration: string;
  skillTags: string[];
  viewed: boolean;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: string;
  quickReplies?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Design Tokens
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  primary: '#667eea',
  primaryDark: '#764ba2',
  background: '#F5F6F8',
  white: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: '#E5E7EB',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const mockChildren: Child[] = [
  { id: '1', name: '김민준', grade: '초3', avatar: '🏀', program: '주니어 드리블', level: '중급' },
  { id: '2', name: '김서연', grade: '초1', avatar: '⛹️', program: '키즈 농구', level: '초급' },
];

const mockSchedule: ScheduleItem[] = [
  { id: '1', date: '2026-01-29', dayOfWeek: '목', time: '16:00 - 17:30', program: '주니어 드리블 마스터', coach: '박코치', court: 'A코트' },
  { id: '2', date: '2026-01-31', dayOfWeek: '토', time: '10:00 - 11:30', program: '주니어 드리블 마스터', coach: '박코치', court: 'B코트' },
  { id: '3', date: '2026-02-03', dayOfWeek: '화', time: '16:00 - 17:30', program: '주니어 드리블 마스터', coach: '박코치', court: 'A코트' },
];

const mockPayment: PaymentInfo = {
  currentMonth: '2026년 2월',
  amount: 320000,
  status: 'paid',
  paidAt: '2026-01-25',
  qrStatus: 'active',
  qrExpiresAt: '2026-02-28',
  lessonsRemaining: 8,
  lessonsTotal: 8,
};

const mockVideos: VideoItem[] = [
  { id: '1', title: '크로스오버 드리블 연습', coach: '박코치', date: '2026-01-27', duration: '0:45', skillTags: ['드리블', '크로스오버'], viewed: false },
  { id: '2', title: '레이업 슛 기초', coach: '박코치', date: '2026-01-24', duration: '1:12', skillTags: ['슈팅', '레이업'], viewed: true },
  { id: '3', title: '수비 자세 교정', coach: '김코치', date: '2026-01-22', duration: '0:38', skillTags: ['수비', '풋워크'], viewed: true },
];

const initialChatMessages: ChatMessage[] = [
  {
    id: '1',
    type: 'bot',
    content: '안녕하세요! 올댓바스켓 몰트봇입니다 🏀\n무엇을 도와드릴까요?',
    timestamp: '10:00',
    quickReplies: ['수업 일정 확인', '결제 상태', '코치 상담 요청', '영상 보기'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

interface ParentAppDaechiProps {
  onBack?: () => void;
}

const ParentAppDaechi: React.FC<ParentAppDaechiProps> = ({ onBack }) => {
  const [selectedChild, setSelectedChild] = useState(mockChildren[0].id);
  const [activeTab, setActiveTab] = useState<'schedule' | 'payment' | 'videos' | 'chat'>('schedule');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChildData = mockChildren.find(c => c.id === selectedChild);
  const unwatchedVideos = mockVideos.filter(v => !v.viewed).length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate bot response
    setTimeout(() => {
      let botResponse: ChatMessage;

      if (message.includes('일정') || message.includes('수업')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `${selectedChildData?.name} 학생의 다가오는 수업:\n\n📅 1/29(목) 16:00-17:30\n🏀 주니어 드리블 마스터\n👨‍🏫 박코치 · A코트`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (message.includes('결제') || message.includes('상태')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '✅ 2월 수강료 정상 결제!\n\n💳 320,000원\n📅 결제일: 2026-01-25\n🎫 QR: 활성화됨\n남은 수업: 8회',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (message.includes('상담') || message.includes('코치')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '코치 상담을 원하시는군요! 📞\n\n상담 가능 시간:\n- 평일 14:00-16:00\n- 토요일 12:00-13:00',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          quickReplies: ['상담 예약하기', '나중에 하기'],
        };
      } else if (message.includes('영상')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `🎬 새 영상 ${unwatchedVideos}개!\n\n'영상' 탭에서 확인하세요.`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        };
      } else {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '네, 알겠습니다! 더 도움이 필요하시면 말씀해주세요 😊',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          quickReplies: ['수업 일정 확인', '결제 상태', '코치 상담 요청'],
        };
      }

      setChatMessages(prev => [...prev, botResponse]);
    }, 600);
  };

  const tabs = [
    { id: 'schedule' as const, label: '일정', icon: Calendar },
    { id: 'payment' as const, label: '결제', icon: CreditCard },
    { id: 'videos' as const, label: '영상', icon: Video },
    { id: 'chat' as const, label: '채팅', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen" style={{ background: colors.background }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="text-white" size={24} />
            </button>
          )}
          <span className="text-2xl">🏀</span>
          <span className="text-xl font-bold text-white">올댓바스켓</span>
        </div>

        {/* Child Selector */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {mockChildren.map(child => (
            <motion.button
              key={child.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedChild(child.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[180px] transition-all ${
                child.id === selectedChild
                  ? 'bg-white/30 shadow-lg'
                  : 'bg-white/15 hover:bg-white/20'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-2xl">
                {child.avatar}
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">{child.name}</div>
                <div className="text-sm text-white/70">{child.grade} · {child.level}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all relative ${
              activeTab === tab.id ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.id === 'videos' && unwatchedVideos > 0 && (
              <span className="absolute top-2 right-1/4 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {unwatchedVideos}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        <AnimatePresence mode="wait">
          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Mini Calendar */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">📅 1월 5주차</h3>
                <div className="flex justify-between">
                  {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => (
                    <div key={d} className="text-center">
                      <div className="text-xs text-gray-400 mb-1">{d}</div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        i === 3
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium'
                          : 'text-gray-600'
                      }`}>
                        {[27, 28, 29, 30, 31, 1, 2][i]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule List */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">🏀 다가오는 수업</h3>
                <div className="space-y-3">
                  {mockSchedule.map(item => (
                    <div key={item.id} className="flex items-center py-3 border-b border-gray-100 last:border-0">
                      <div className="w-14 text-center">
                        <div className="text-2xl font-bold text-indigo-600">{item.date.split('-')[2]}</div>
                        <div className="text-xs text-gray-400">{item.dayOfWeek}</div>
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="font-medium text-gray-800">{item.time}</div>
                        <div className="text-sm text-gray-500">{item.program}</div>
                        <div className="text-xs text-gray-400">{item.coach} · {item.court}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* QR Banner */}
              <div
                className="rounded-2xl p-5 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <div className="text-white">
                  <div className="text-sm opacity-80">출석 QR 상태</div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    <span className="text-green-300">●</span> 활성화됨
                  </div>
                  <div className="text-xs opacity-70 mt-1">{mockPayment.qrExpiresAt}까지 유효</div>
                </div>
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl">
                  📱
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">💳 {mockPayment.currentMonth} 수강료</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">결제 금액</span>
                    <span className="font-semibold">{mockPayment.amount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">결제 상태</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">결제 완료</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">결제일</span>
                    <span className="font-semibold">{mockPayment.paidAt}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-gray-500">남은 수업</span>
                    <span className="font-semibold">{mockPayment.lessonsRemaining} / {mockPayment.lessonsTotal}회</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(mockPayment.lessonsRemaining / mockPayment.lessonsTotal) * 100}%`,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Alert Banner */}
              {unwatchedVideos > 0 && (
                <div
                  className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <span className="text-white font-medium">🎬 새로운 연습 영상이 도착했어요!</span>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{unwatchedVideos}개</span>
                </div>
              )}

              {/* Video List */}
              <div className="space-y-3">
                {mockVideos.map(video => (
                  <motion.div
                    key={video.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white rounded-xl p-3 shadow-sm flex gap-3 relative"
                  >
                    {!video.viewed && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">NEW</span>
                    )}
                    <div className="w-24 h-18 rounded-lg bg-gray-200 flex items-center justify-center relative">
                      <Play size={24} className="text-gray-400" />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 rounded">
                        {video.duration}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{video.title}</div>
                      <div className="text-sm text-gray-500">{video.coach} · {video.date}</div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {video.skillTags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm"
              style={{ height: 'calc(100vh - 300px)' }}
            >
              {/* Messages */}
              <div className="h-full flex flex-col">
                <div className="flex-1 p-4 overflow-y-auto">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`mb-4 ${msg.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block max-w-[85%] px-4 py-3 rounded-2xl ${
                        msg.type === 'bot'
                          ? 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          : 'bg-indigo-600 text-white rounded-br-sm'
                      }`}>
                        {msg.content.split('\n').map((line, i) => (
                          <React.Fragment key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</React.Fragment>
                        ))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{msg.timestamp}</div>
                      {msg.quickReplies && (
                        <div className="flex flex-wrap gap-2 mt-2 justify-start">
                          {msg.quickReplies.map((reply, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendMessage(reply)}
                              className="px-3 py-1.5 border border-indigo-500 text-indigo-600 rounded-full text-sm hover:bg-indigo-50 transition-colors"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 flex gap-2">
                  <input
                    type="text"
                    placeholder="메시지를 입력하세요..."
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage(inputValue)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  >
                    ➤
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 pb-6 z-50">
        <div className="flex justify-around">
          {[
            { icon: Home, label: '홈' },
            { icon: Calendar, label: '일정' },
            { icon: MessageCircle, label: '상담' },
            { icon: User, label: '내정보' },
          ].map((item, i) => (
            <button key={i} className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400">
              <item.icon size={22} />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ParentAppDaechi;
