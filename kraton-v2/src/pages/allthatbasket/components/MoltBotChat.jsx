/**
 * 🤖 MoltBot 채팅 컴포넌트 - 올댓바스켓 학부모 상담
 * ClawdBot 기반 AI 상담 인터페이스
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Calendar, CreditCard, Video, HelpCircle } from 'lucide-react';

// 빠른 질문 버튼
const QUICK_QUESTIONS = [
  { id: 'schedule', icon: Calendar, text: '이번주 수업 일정' },
  { id: 'payment', icon: CreditCard, text: '수강료 납부 확인' },
  { id: 'video', icon: Video, text: '최근 수업 영상' },
  { id: 'progress', icon: Sparkles, text: '아이 성장 리포트' },
];

// 자동 응답 (실제 구현시 API 연동)
const AUTO_RESPONSES = {
  schedule: `이번 주 수업 일정입니다:

📅 **목요일 (1/30)** 16:00-17:30
   주니어 드리블 마스터 | 박코치 | A코트

📅 **토요일 (2/1)** 10:00-11:30
   주니어 드리블 마스터 | 박코치 | B코트

다음 수업까지 2일 남았습니다! 🏀`,

  payment: `💳 수강료 납부 현황

✅ **2024년 1월** - 450,000원 (결제 완료)
⏳ **2024년 2월** - 450,000원 (마감일: 2/5)

2월 수강료 납부가 5일 남았습니다.
결제하시겠어요?`,

  video: `🎬 최근 수업 영상

📹 **1/27 (월) 드리블 훈련**
   "크로스오버 기초" - 박코치
   [영상 보기]

📹 **1/25 (토) 슈팅 연습**
   "레이업 자세 교정" - 박코치
   [영상 보기]

민준이가 크로스오버 동작이 많이 좋아졌어요! 👏`,

  progress: `📊 **김민준 성장 리포트**

🏀 **V-Index**: 1,847 (+12% ↑)
   - 출석률: 95%
   - 스킬 점수: 85점
   - 경기 성과: 80점

💪 **강점**
   - 드리블 기술 향상 중
   - 팀워크 우수

📈 **다음 목표**
   - 슈팅 정확도 개선
   - 수비 포지셔닝

민준이가 꾸준히 성장하고 있어요! 🌟`,

  default: `안녕하세요! 올댓바스켓 MoltBot입니다 🏀

무엇을 도와드릴까요?

• 수업 일정 확인
• 수강료 납부
• 수업 영상 시청
• 아이 성장 리포트
• 코치 상담 예약

궁금한 점을 자유롭게 물어보세요!`,
};

// 메시지 컴포넌트
const Message = ({ message, isBot }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}
  >
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isBot ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gray-600'
      }`}
    >
      {isBot ? <Bot size={16} className="text-white" /> : <User size={16} className="text-white" />}
    </div>
    <div
      className={`max-w-[80%] p-3 rounded-2xl ${
        isBot
          ? 'bg-white/10 text-white rounded-tl-sm'
          : 'bg-purple-500/30 text-white rounded-tr-sm'
      }`}
    >
      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
      <p className="text-xs text-gray-400 mt-1">
        {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  </motion.div>
);

// 타이핑 인디케이터
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex gap-3"
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
      <Bot size={16} className="text-white" />
    </div>
    <div className="bg-white/10 p-3 rounded-2xl rounded-tl-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  </motion.div>
);

export default function MoltBotChat({ studentName = '김민준' }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: AUTO_RESPONSES.default,
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      text,
      isBot: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // 타이핑 표시
    setIsTyping(true);

    // 응답 생성 (실제 구현시 API 호출)
    setTimeout(() => {
      let response = AUTO_RESPONSES.default;

      // 키워드 매칭
      const lowerText = text.toLowerCase();
      if (lowerText.includes('일정') || lowerText.includes('수업')) {
        response = AUTO_RESPONSES.schedule;
      } else if (lowerText.includes('결제') || lowerText.includes('납부') || lowerText.includes('수강료')) {
        response = AUTO_RESPONSES.payment;
      } else if (lowerText.includes('영상') || lowerText.includes('비디오')) {
        response = AUTO_RESPONSES.video;
      } else if (lowerText.includes('성장') || lowerText.includes('리포트') || lowerText.includes('진도')) {
        response = AUTO_RESPONSES.progress;
      }

      const botMessage = {
        id: Date.now() + 1,
        text: response,
        isBot: true,
        timestamp: new Date(),
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, botMessage]);
    }, 1500);
  };

  const handleQuickQuestion = (id) => {
    const question = QUICK_QUESTIONS.find((q) => q.id === id);
    if (question) {
      handleSend(question.text);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              MoltBot
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                온라인
              </span>
            </h3>
            <p className="text-xs text-gray-400">올댓바스켓 AI 상담</p>
          </div>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="p-3 border-b border-white/10 overflow-x-auto">
        <div className="flex gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q.id}
              onClick={() => handleQuickQuestion(q.id)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300 whitespace-nowrap hover:bg-purple-500/30 transition-colors"
            >
              <q.icon size={14} />
              {q.text}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} isBot={message.isBot} />
        ))}
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          MoltBot은 AI 기반 상담 서비스입니다
        </p>
      </div>
    </div>
  );
}
