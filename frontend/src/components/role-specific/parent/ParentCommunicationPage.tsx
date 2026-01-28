/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Parent Communication Page
 * 학부모 소통 페이지 - 선생님과의 메시지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  content: string;
  sender: 'parent' | 'teacher' | 'system';
  senderName?: string;
  timestamp: Date;
  read: boolean;
  type: 'text' | 'voice' | 'notification';
  voiceCategory?: 'praise' | 'request' | 'wish' | 'question';
  status?: 'pending' | 'processing' | 'completed';
}

interface VoiceHistoryItem {
  id: string;
  content: string;
  category: 'praise' | 'request' | 'wish' | 'question';
  submittedAt: Date;
  status: 'pending' | 'processing' | 'completed';
  response?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    content: '안녕하세요, 김민수 학부모님! 이번 주 민수의 학습 현황에 대해 말씀드릴게요.',
    sender: 'teacher',
    senderName: '김선생님',
    timestamp: new Date(Date.now() - 86400000 * 2),
    read: true,
    type: 'text',
  },
  {
    id: '2',
    content: '민수가 최근 수학 방정식 파트에서 눈에 띄는 성장을 보여주고 있어요. 특히 문제 풀이 속도가 많이 빨라졌습니다. 😊',
    sender: 'teacher',
    senderName: '김선생님',
    timestamp: new Date(Date.now() - 86400000 * 2 + 60000),
    read: true,
    type: 'text',
  },
  {
    id: '3',
    content: '감사합니다 선생님! 집에서도 많이 칭찬해주고 있어요.',
    sender: 'parent',
    timestamp: new Date(Date.now() - 86400000),
    read: true,
    type: 'text',
  },
  {
    id: '4',
    content: '[음성 메시지] 민수가 요즘 학원 가는 걸 즐거워해요. 선생님 덕분인 것 같아요!',
    sender: 'parent',
    timestamp: new Date(Date.now() - 43200000),
    read: true,
    type: 'voice',
    voiceCategory: 'praise',
    status: 'completed',
  },
  {
    id: '5',
    content: '칭찬 감사합니다! 민수도 열심히 하고 있어요. 앞으로도 잘 지켜볼게요! 🙂',
    sender: 'teacher',
    senderName: '김선생님',
    timestamp: new Date(Date.now() - 3600000),
    read: false,
    type: 'text',
  },
];

const VOICE_HISTORY: VoiceHistoryItem[] = [
  {
    id: 'v1',
    content: '민수가 요즘 학원 가는 걸 즐거워해요!',
    category: 'praise',
    submittedAt: new Date(Date.now() - 43200000),
    status: 'completed',
    response: '감사합니다! 민수도 열심히 하고 있어요.',
  },
  {
    id: 'v2',
    content: '숙제 양을 조금 줄여주실 수 있을까요?',
    category: 'request',
    submittedAt: new Date(Date.now() - 86400000 * 3),
    status: 'completed',
    response: '검토 후 조정하겠습니다.',
  },
  {
    id: 'v3',
    content: '다음 시험 일정이 궁금합니다.',
    category: 'question',
    submittedAt: new Date(Date.now() - 3600000),
    status: 'processing',
  },
];

const CHILD_INFO = {
  name: '김민수',
  teacher: '김선생님',
};

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble Component
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isParent = message.sender === 'parent';
  const isSystem = message.sender === 'system';
  
  const categoryIcons = {
    praise: '😊',
    request: '🙏',
    wish: '💭',
    question: '❓',
  };
  
  if (isSystem) {
    return (
      <div className="text-center py-2">
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }
  
  return (
    <div className={`flex ${isParent ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] ${isParent ? 'order-2' : 'order-1'}`}>
        {/* Sender Name */}
        {!isParent && (
          <div className="text-xs text-slate-500 mb-1 ml-1">
            {message.senderName}
          </div>
        )}
        
        {/* Bubble */}
        <div className={`
          px-4 py-3 rounded-2xl
          ${isParent 
            ? 'bg-orange-500 text-white rounded-br-sm' 
            : 'bg-white text-slate-700 rounded-bl-sm shadow-sm'
          }
        `}>
          {/* Voice Badge */}
          {message.type === 'voice' && message.voiceCategory && (
            <div className={`
              inline-flex items-center gap-1 text-xs mb-1 px-2 py-0.5 rounded-full
              ${isParent ? 'bg-white/20' : 'bg-orange-100 text-orange-600'}
            `}>
              <span>{categoryIcons[message.voiceCategory]}</span>
              <span>음성 메시지</span>
            </div>
          )}
          
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        
        {/* Timestamp & Status */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-slate-400 ${isParent ? 'justify-end mr-1' : 'ml-1'}`}>
          <span>
            {message.timestamp.toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {isParent && !message.read && <span className="text-orange-500">●</span>}
          {isParent && message.read && <span>✓✓</span>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice History Item
// ─────────────────────────────────────────────────────────────────────────────

function VoiceHistoryCard({ item }: { item: VoiceHistoryItem }) {
  const categoryStyles = {
    praise: { icon: '😊', bg: 'bg-green-50 border-green-200', text: '칭찬' },
    request: { icon: '🙏', bg: 'bg-blue-50 border-blue-200', text: '요청' },
    wish: { icon: '💭', bg: 'bg-purple-50 border-purple-200', text: '바람' },
    question: { icon: '❓', bg: 'bg-amber-50 border-amber-200', text: '질문' },
  };
  
  const statusStyles = {
    pending: { text: '접수됨', color: 'text-slate-500' },
    processing: { text: '확인중', color: 'text-blue-500' },
    completed: { text: '답변 완료', color: 'text-green-500' },
  };
  
  const style = categoryStyles[item.category];
  const status = statusStyles[item.status];
  
  return (
    <div className={`p-4 rounded-2xl border ${style.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{style.icon}</span>
          <span className="text-sm font-medium text-slate-600">{style.text}</span>
        </div>
        <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
      </div>
      
      <p className="text-sm text-slate-700 mb-2">{item.content}</p>
      
      {item.response && (
        <div className="p-2 bg-white/50 rounded-lg mt-2">
          <div className="text-xs text-slate-500 mb-1">선생님 답변:</div>
          <p className="text-sm text-slate-600">{item.response}</p>
        </div>
      )}
      
      <div className="text-xs text-slate-400 mt-2">
        {item.submittedAt.toLocaleDateString('ko-KR')}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Input Modal
// ─────────────────────────────────────────────────────────────────────────────

function VoiceInputModal({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void;
  onSubmit: (category: string, content: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const categories = [
    { id: 'praise', icon: '😊', label: '칭찬하고 싶어요', color: 'bg-green-100 text-green-700 border-green-300' },
    { id: 'request', icon: '🙏', label: '요청드려요', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'wish', icon: '💭', label: '바라는 점이 있어요', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { id: 'question', icon: '❓', label: '궁금한 게 있어요', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  ];
  
  const handleSubmit = () => {
    if (selectedCategory && content.trim()) {
      onSubmit(selectedCategory, content);
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8"
        initial={reducedMotion ? {} : { y: 300 }}
        animate={{ y: 0 }}
        exit={reducedMotion ? {} : { y: 300 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
        
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          💬 선생님께 전할 말씀
        </h2>
        
        {/* Category Selection */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                p-3 rounded-xl border-2 text-left transition-all
                ${selectedCategory === cat.id 
                  ? cat.color + ' border-current' 
                  : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
                }
              `}
            >
              <span className="text-2xl">{cat.icon}</span>
              <div className="text-sm font-medium mt-1">{cat.label}</div>
            </button>
          ))}
        </div>
        
        {/* Content Input */}
        <div className="relative mb-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="내용을 입력하세요..."
            className="w-full p-4 border-2 rounded-xl resize-none h-28 text-sm focus:border-orange-400 focus:ring-0"
          />
          
          {/* Voice Record Button */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`
              absolute bottom-3 right-3 p-2 rounded-full transition-colors
              ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}
            `}
          >
            🎤
          </button>
        </div>
        
        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedCategory || !content.trim()}
          className={`
            w-full py-3 rounded-xl font-medium transition-colors
            ${selectedCategory && content.trim()
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          보내기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ParentCommunicationPage() {
  const [activeTab, setActiveTab] = useState<'messages' | 'voice'>('messages');
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputText,
      sender: 'parent',
      timestamp: new Date(),
      read: false,
      type: 'text',
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
  };
  
  const handleVoiceSubmit = (category: string, content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content: `[음성 메시지] ${content}`,
      sender: 'parent',
      timestamp: new Date(),
      read: false,
      type: 'voice',
      voiceCategory: category as Message['voiceCategory'],
      status: 'pending',
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto p-4">
          <h1 className="text-xl font-bold text-slate-800">💬 {CHILD_INFO.teacher}과 대화</h1>
          <p className="text-sm text-slate-500">{CHILD_INFO.name} 담당 선생님</p>
        </div>
        
        {/* Tabs */}
        <div className="max-w-lg mx-auto flex">
          <button
            onClick={() => setActiveTab('messages')}
            className={`
              flex-1 py-3 text-sm font-medium transition-colors
              ${activeTab === 'messages'
                ? 'text-orange-600 border-b-2 border-orange-500'
                : 'text-slate-500 hover:text-slate-700'
              }
            `}
          >
            💬 메시지
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`
              flex-1 py-3 text-sm font-medium transition-colors
              ${activeTab === 'voice'
                ? 'text-orange-600 border-b-2 border-orange-500'
                : 'text-slate-500 hover:text-slate-700'
              }
            `}
          >
            🎤 음성 기록
          </button>
        </div>
      </div>
      
      {/* Content */}
      {activeTab === 'messages' ? (
        <>
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
            {/* Date Separator */}
            <div className="text-center py-2">
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
            </div>
            
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Bar */}
          <div className="bg-white border-t p-4">
            <div className="max-w-lg mx-auto flex items-center gap-2">
              <button
                onClick={() => setShowVoiceInput(true)}
                className="p-3 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
              >
                🎤
              </button>
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-3 bg-slate-100 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-orange-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className={`
                  p-3 rounded-full transition-colors
                  ${inputText.trim()
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-slate-200 text-slate-400'
                  }
                `}
              >
                ➤
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Voice History */
        <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-3">
          {VOICE_HISTORY.map(item => (
            <VoiceHistoryCard key={item.id} item={item} />
          ))}
          
          {VOICE_HISTORY.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-2">🎤</div>
              <div>아직 보낸 음성이 없어요</div>
            </div>
          )}
          
          {/* New Voice Button */}
          <button
            onClick={() => setShowVoiceInput(true)}
            className="w-full py-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            🎤 새 음성 메시지 보내기
          </button>
        </div>
      )}
      
      {/* Voice Input Modal */}
      <AnimatePresence>
        {showVoiceInput && (
          <VoiceInputModal
            onClose={() => setShowVoiceInput(false)}
            onSubmit={handleVoiceSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ParentCommunicationPage;
