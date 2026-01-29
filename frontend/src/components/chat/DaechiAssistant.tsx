/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💬 대치동 AI 어시스턴트 - 챗봇 기반 학원 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 핵심 UX:
 *   "청담수학 연동해줘" → 인증번호 → 끝 (2단계, 30초)
 * 
 * 기존 앱: 설정 → 학원관리 → 학원추가 → 검색 → 선택 → 정보입력 → 인증 → 완료 (7단계)
 * 대치동앱: 대화 한마디 → 인증 → 완료 (2단계)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, CheckCircle, Loader2, Calendar, 
  BookOpen, Clock, UserCheck, School, X, Mic, MicOff,
  Sparkles, ChevronDown
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'text' | 'verification' | 'success' | 'schedule' | 'loading';
    academy?: AcademyInfo;
    schedule?: ScheduleInfo[];
  };
}

interface AcademyInfo {
  id: string;
  name: string;
  type: string;
  location: string;
  phone?: string;
}

interface ScheduleInfo {
  studentName: string;
  className: string;
  schedule: string;
  teacher: string;
}

type ConversationState = 
  | 'idle'
  | 'detecting_intent'
  | 'waiting_verification'
  | 'verifying'
  | 'success'
  | 'error';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data - 대치동 학원 DB
// ═══════════════════════════════════════════════════════════════════════════════

const ACADEMY_DATABASE: Record<string, AcademyInfo> = {
  '청담수학': { id: 'cd-math', name: '청담수학', type: '수학', location: '대치동 은마아파트 상가' },
  '대치영어': { id: 'dc-eng', name: '대치영어학원', type: '영어', location: '대치동 래미안' },
  '시대인재': { id: 'sd-all', name: '시대인재', type: '종합', location: '대치역 3번출구' },
  '메가스터디': { id: 'mega', name: '메가스터디 대치', type: '종합', location: '대치동 학원가' },
  '대성학원': { id: 'ds', name: '대성학원', type: '종합', location: '대치동' },
  '강남대성': { id: 'gnds', name: '강남대성', type: '재수', location: '대치동' },
  '이투스': { id: 'etoos', name: '이투스247', type: '종합', location: '대치역' },
  '올댓바스켓': { id: 'atb', name: '올댓바스켓', type: '농구', location: '강남구' },
};

const MOCK_SCHEDULES: Record<string, ScheduleInfo[]> = {
  'cd-math': [
    { studentName: '서준', className: '수학 심화반', schedule: '매주 월/수/금 14:00', teacher: '김수현 선생님' },
  ],
  'dc-eng': [
    { studentName: '서준', className: '영어 독해반', schedule: '매주 화/목 16:00', teacher: '박영희 선생님' },
  ],
  'atb': [
    { studentName: '민준', className: 'A반 (주니어)', schedule: '매주 월/수/금 16:00', teacher: '심재혁 코치' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Intent Detection (간단한 규칙 기반)
// ═══════════════════════════════════════════════════════════════════════════════

interface DetectedIntent {
  type: 'link_academy' | 'check_schedule' | 'unknown';
  academy?: AcademyInfo;
  confidence: number;
}

const detectIntent = (text: string): DetectedIntent => {
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  
  // 연동 의도 감지
  const linkKeywords = ['연동', '추가', '등록', '연결', '싱크', 'sync'];
  const hasLinkIntent = linkKeywords.some(kw => normalized.includes(kw));
  
  // 학원 이름 감지
  for (const [name, info] of Object.entries(ACADEMY_DATABASE)) {
    if (normalized.includes(name.toLowerCase().replace(/\s+/g, ''))) {
      if (hasLinkIntent) {
        return { type: 'link_academy', academy: info, confidence: 0.95 };
      }
      return { type: 'check_schedule', academy: info, confidence: 0.8 };
    }
  }
  
  // 스케줄 확인 의도
  const scheduleKeywords = ['스케줄', '일정', '시간표', '언제'];
  if (scheduleKeywords.some(kw => normalized.includes(kw))) {
    return { type: 'check_schedule', confidence: 0.7 };
  }
  
  return { type: 'unknown', confidence: 0 };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isBot = message.type === 'bot';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isBot ? 'bg-gradient-to-br from-cyan-500 to-purple-500' : 'bg-gray-600'}
      `}>
        {isBot ? <Bot size={16} className="text-white" /> : <User size={16} className="text-white" />}
      </div>
      
      {/* Content */}
      <div className={`max-w-[80%] ${isBot ? '' : 'text-right'}`}>
        <div className={`
          rounded-2xl px-4 py-3
          ${isBot 
            ? 'bg-gray-800 text-white rounded-tl-sm' 
            : 'bg-cyan-600 text-white rounded-tr-sm'
          }
        `}>
          {/* Loading State */}
          {message.metadata?.type === 'loading' && (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>{message.content}</span>
            </div>
          )}
          
          {/* Verification Request */}
          {message.metadata?.type === 'verification' && (
            <div className="space-y-3">
              <p>{message.content}</p>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">📱 카카오톡으로 인증번호가 발송되었습니다.</p>
                <p className="text-sm text-cyan-400">인증번호 4자리를 입력해주세요</p>
              </div>
            </div>
          )}
          
          {/* Success with Schedule */}
          {message.metadata?.type === 'success' && message.metadata.schedule && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={18} />
                <span className="font-semibold">{message.content}</span>
              </div>
              
              {message.metadata.schedule.map((s, i) => (
                <div key={i} className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <UserCheck size={14} className="text-cyan-400" />
                    <span className="font-medium">{s.studentName}</span>
                    <span className="text-gray-400">-</span>
                    <span className="text-cyan-400">{s.className}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Calendar size={12} />
                    <span>{s.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <School size={12} />
                    <span>{s.teacher}</span>
                  </div>
                </div>
              ))}
              
              <p className="text-xs text-gray-400 mt-2">
                ✨ 스케줄이 자동으로 캘린더에 추가됩니다.
              </p>
            </div>
          )}
          
          {/* Normal Text */}
          {(!message.metadata?.type || message.metadata.type === 'text') && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-1 px-2">
          {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
};

const QuickActions: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
  const actions = [
    { icon: '🏫', label: '청담수학 연동해줘' },
    { icon: '📚', label: '대치영어 연동해줘' },
    { icon: '🏀', label: '올댓바스켓 연동해줘' },
    { icon: '📅', label: '이번 주 스케줄 알려줘' },
  ];
  
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {actions.map((action, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(action.label)}
          className="px-3 py-2 rounded-full bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 flex items-center gap-2 transition-colors"
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const DaechiAssistant: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}> = ({ isOpen = true, onClose, embedded = false }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: '안녕하세요! 대치동 AI 어시스턴트입니다. 🎓\n\n학원 연동, 스케줄 확인 등 무엇이든 물어보세요!',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<ConversationState>('idle');
  const [pendingAcademy, setPendingAcademy] = useState<AcademyInfo | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add message helper
  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date(),
    }]);
  }, []);

  // Process user input
  const processInput = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    addMessage({ type: 'user', content: text });
    setInput('');
    
    // Handle verification code
    if (state === 'waiting_verification') {
      if (/^\d{4}$/.test(text.trim())) {
        setState('verifying');
        addMessage({ 
          type: 'bot', 
          content: '인증 중입니다...', 
          metadata: { type: 'loading' } 
        });
        
        // Simulate verification
        await new Promise(r => setTimeout(r, 1500));
        
        // Remove loading message and add success
        setMessages(prev => prev.slice(0, -1));
        
        const schedules = pendingAcademy ? MOCK_SCHEDULES[pendingAcademy.id] || [] : [];
        addMessage({
          type: 'bot',
          content: `✅ ${pendingAcademy?.name} 연동 완료!`,
          metadata: { 
            type: 'success',
            academy: pendingAcademy || undefined,
            schedule: schedules.length > 0 ? schedules : [
              { studentName: '자녀', className: '기본반', schedule: '스케줄 확인 중', teacher: '담당 선생님' }
            ]
          }
        });
        
        setState('success');
        setPendingAcademy(null);
        return;
      } else {
        addMessage({ 
          type: 'bot', 
          content: '인증번호는 4자리 숫자입니다. 다시 입력해주세요.' 
        });
        return;
      }
    }
    
    // Detect intent
    setState('detecting_intent');
    
    // Simulate thinking
    await new Promise(r => setTimeout(r, 500));
    
    const intent = detectIntent(text);
    
    if (intent.type === 'link_academy' && intent.academy) {
      setPendingAcademy(intent.academy);
      setState('waiting_verification');
      
      addMessage({
        type: 'bot',
        content: `${intent.academy.name} 연동을 시작합니다.`,
        metadata: { type: 'verification', academy: intent.academy }
      });
    } else if (intent.type === 'check_schedule') {
      addMessage({
        type: 'bot',
        content: '📅 이번 주 스케줄입니다:\n\n' +
          '• 월/수/금 14:00 - 청담수학 (서준)\n' +
          '• 화/목 16:00 - 대치영어 (서준)\n' +
          '• 토 10:00 - 올댓바스켓 (민준)\n\n' +
          '다른 도움이 필요하시면 말씀해주세요!'
      });
      setState('idle');
    } else {
      addMessage({
        type: 'bot',
        content: '죄송합니다, 잘 이해하지 못했어요. 😅\n\n' +
          '다음과 같이 말씀해보세요:\n' +
          '• "청담수학 연동해줘"\n' +
          '• "이번 주 스케줄 알려줘"\n' +
          '• "올댓바스켓 추가해줘"'
      });
      setState('idle');
    }
  }, [state, pendingAcademy, addMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processInput(input);
  };

  const handleQuickAction = (text: string) => {
    processInput(text);
  };

  // Container styles
  const containerClass = embedded 
    ? 'h-full flex flex-col'
    : 'fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4';

  if (!isOpen && !embedded) return null;

  const chatContent = (
    <motion.div
      initial={embedded ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`
        ${embedded 
          ? 'h-full' 
          : 'w-full sm:max-w-lg bg-gray-900 sm:rounded-2xl overflow-hidden h-[90vh] sm:h-[600px]'
        }
        flex flex-col
      `}
      style={embedded ? {} : { border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white">대치동 AI 어시스턴트</h2>
            <p className="text-xs text-white/70">학원 연동 • 스케줄 관리</p>
          </div>
        </div>
        {!embedded && onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-white" />
          </button>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950">
        <AnimatePresence>
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Actions */}
      {state === 'idle' && messages.length <= 2 && (
        <QuickActions onSelect={handleQuickAction} />
      )}
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsListening(!isListening)}
            className={`p-3 rounded-full transition-colors ${
              isListening ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              state === 'waiting_verification' 
                ? '인증번호 4자리 입력...' 
                : '메시지를 입력하세요...'
            }
            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500"
          />
          
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 rounded-full bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </motion.div>
  );

  if (embedded) {
    return chatContent;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          {chatContent}
        </>
      )}
    </AnimatePresence>
  );
};

export default DaechiAssistant;
