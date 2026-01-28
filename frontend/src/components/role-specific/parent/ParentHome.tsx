/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Parent Home
 * 👨‍👩‍👧 학부모용 자녀 현황 화면
 * autus-ai.com API 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleContext } from '../../../contexts/RoleContext';
import { useBreakpoint } from '../../../hooks/useResponsive';
import { useReducedMotion } from '../../../hooks/useAccessibility';
import { autusCloud } from '../../../api/autus-cloud';
import { ResponsiveCard } from '../../shared/RoleBasedLayout';
import { TemperatureDisplay } from '../../shared/TemperatureDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChildData {
  id: string;
  name: string;
  photo?: string;
  grade: string;
  className: string;
  status: 'good' | 'normal' | 'attention';
  statusText: string;
  temperature: number;
  metrics: {
    attendance: number;
    homework: number;
    gradeChange: number;
  };
}

interface DayActivity {
  date: Date;
  dayName: string;
  attended: boolean;
  homeworkDone: boolean;
  isFuture: boolean;
}

interface TeacherMessage {
  from: string;
  content: string;
  timestamp: string;
}

interface ParentDashboardData {
  child: ChildData;
  weekActivity: DayActivity[];
  latestMessage: TeacherMessage;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockData: ParentDashboardData = {
  child: {
    id: '1',
    name: '김민준',
    grade: '중학교 2학년',
    className: '수학 A반',
    status: 'good',
    statusText: '좋아요',
    temperature: 72,
    metrics: {
      attendance: 98,
      homework: 85,
      gradeChange: 12,
    },
  },
  weekActivity: [
    { date: new Date('2026-01-21'), dayName: '월', attended: true, homeworkDone: true, isFuture: false },
    { date: new Date('2026-01-22'), dayName: '화', attended: true, homeworkDone: true, isFuture: false },
    { date: new Date('2026-01-23'), dayName: '수', attended: true, homeworkDone: false, isFuture: false },
    { date: new Date('2026-01-24'), dayName: '목', attended: false, homeworkDone: false, isFuture: false },
    { date: new Date('2026-01-25'), dayName: '금', attended: true, homeworkDone: true, isFuture: false },
    { date: new Date('2026-01-26'), dayName: '토', attended: false, homeworkDone: false, isFuture: false },
    { date: new Date('2026-01-27'), dayName: '일', attended: false, homeworkDone: false, isFuture: true },
  ],
  latestMessage: {
    from: '박선생님',
    content: '민준이가 이번 주 수학 시험에서 좋은 성적을 받았습니다. 집중력이 많이 좋아졌어요! 칭찬 부탁드려요 😊',
    timestamp: '오늘 오전 10:30',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ParentHome() {
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();
  const [data] = useState<ParentDashboardData>(mockData);
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  return (
    <div 
      className="min-h-screen pb-24"
      style={{ backgroundColor: '#fffaf5' }}
    >
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-slate-700">
            👨‍👩‍👧 {data.child.name} 보호자님
          </h1>
          <p className="text-sm text-slate-500">오늘도 좋은 하루 되세요</p>
        </div>
        <button
          className="p-2 rounded-full bg-white shadow-sm min-w-[44px] min-h-[44px]"
          aria-label="설정"
        >
          ⚙️
        </button>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-4">
        {/* Child Profile Card */}
        <ChildProfileCard child={data.child} />

        {/* Week Activity & Message */}
        <div className="grid grid-cols-1 gap-4">
          <WeekActivityCard activity={data.weekActivity} />
          <TeacherMessageCard message={data.latestMessage} />
        </div>

        {/* Voice Input Section */}
        <VoiceInputSection 
          isOpen={showVoiceInput}
          onToggle={() => setShowVoiceInput(!showVoiceInput)}
        />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Child Profile Card
// ─────────────────────────────────────────────────────────────────────────────

function ChildProfileCard({ child }: { child: ChildData }) {
  const reducedMotion = useReducedMotion();

  const statusEmoji = {
    good: '😊',
    normal: '😐',
    attention: '😟',
  };

  const statusColor = {
    good: '#22c55e',
    normal: '#eab308',
    attention: '#ef4444',
  };

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100"
    >
      {/* Child Info */}
      <div className="flex items-center gap-4 mb-6">
        <div 
          className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-2xl text-white font-bold"
        >
          {child.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{child.name}</h2>
          <p className="text-sm text-slate-500">{child.grade} • {child.className}</p>
        </div>
      </div>

      {/* Status Display */}
      <div className="flex flex-col items-center mb-6">
        <motion.span
          className="text-6xl mb-2"
          animate={reducedMotion ? {} : { scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {statusEmoji[child.status]}
        </motion.span>
        <span 
          className="text-2xl font-bold"
          style={{ color: statusColor[child.status] }}
        >
          {child.statusText}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox 
          icon="📚" 
          label="출석" 
          value={`${child.metrics.attendance}%`}
          color="#22c55e"
        />
        <StatBox 
          icon="📝" 
          label="숙제" 
          value={`${child.metrics.homework}%`}
          color={child.metrics.homework >= 80 ? '#22c55e' : '#eab308'}
        />
        <StatBox 
          icon="📈" 
          label="성적" 
          value={`+${child.metrics.gradeChange}점`}
          color="#3b82f6"
        />
      </div>
    </motion.div>
  );
}

function StatBox({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: string; 
  label: string; 
  value: string;
  color: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className="font-bold text-lg" style={{ color }}>{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Week Activity Card
// ─────────────────────────────────────────────────────────────────────────────

function WeekActivityCard({ activity }: { activity: DayActivity[] }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
      <h3 className="text-sm font-medium text-slate-600 mb-3">📅 이번 주 활동</h3>
      <div className="flex justify-between">
        {activity.map((day, index) => (
          <div 
            key={index}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-xs text-slate-400">{day.dayName}</span>
            <div 
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-lg
                ${day.isFuture 
                  ? 'bg-slate-100 text-slate-400' 
                  : day.attended && day.homeworkDone
                    ? 'bg-emerald-100 text-emerald-600'
                    : day.attended
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-slate-100 text-slate-400'
                }
              `}
            >
              {day.isFuture 
                ? '📅' 
                : day.attended && day.homeworkDone
                  ? '✅'
                  : day.attended
                    ? '⭕'
                    : '—'
              }
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 mt-3 text-xs text-slate-400">
        <span>✅ 출석+숙제</span>
        <span>⭕ 출석만</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher Message Card
// ─────────────────────────────────────────────────────────────────────────────

function TeacherMessageCard({ message }: { message: TeacherMessage }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-600">💬 선생님 메시지</h3>
        <span className="text-xs text-slate-400">{message.timestamp}</span>
      </div>
      
      {/* Chat Bubble Style */}
      <div className="bg-blue-50 rounded-2xl rounded-tl-none p-4 relative">
        <p className="text-sm text-slate-700 leading-relaxed">{message.content}</p>
        <p className="text-xs text-slate-400 mt-2">- {message.from}</p>
      </div>

      <button 
        className="w-full mt-3 py-3 bg-orange-100 text-orange-600 rounded-xl font-medium hover:bg-orange-200 transition-colors min-h-[48px]"
      >
        답장하기
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Input Section
// ─────────────────────────────────────────────────────────────────────────────

function VoiceInputSection({ 
  isOpen, 
  onToggle 
}: { 
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const emotions = [
    { id: 'praise', icon: '😊', label: '칭찬하고 싶어요' },
    { id: 'request', icon: '🙏', label: '요청드려요' },
    { id: 'hope', icon: '💭', label: '바라는 점이 있어요' },
    { id: 'question', icon: '❓', label: '궁금한 게 있어요' },
  ];

  return (
    <motion.div 
      className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100"
      layout={!reducedMotion}
    >
      <h3 className="text-sm font-medium text-slate-600 mb-3">
        💬 학원에 전할 말씀이 있으신가요?
      </h3>

      {/* Quick Emotion Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {emotions.map((emotion) => (
          <button
            key={emotion.id}
            onClick={() => setSelectedEmotion(emotion.id)}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-xl text-left
              transition-all min-h-[52px]
              ${selectedEmotion === emotion.id
                ? 'bg-orange-100 border-2 border-orange-400'
                : 'bg-slate-50 border-2 border-transparent hover:bg-orange-50'
              }
            `}
          >
            <span className="text-xl">{emotion.icon}</span>
            <span className="text-sm font-medium text-slate-700">{emotion.label}</span>
          </button>
        ))}
      </div>

      {/* Text Input */}
      <AnimatePresence>
        {selectedEmotion && (
          <motion.div
            initial={reducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
            className="space-y-3"
          >
            <textarea
              placeholder="내용을 입력해 주세요..."
              className="w-full p-4 bg-slate-50 rounded-xl resize-none h-24 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <div className="flex gap-2">
              <button
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors min-h-[48px]"
              >
                보내기
              </button>
              <button
                onClick={() => setSelectedEmotion(null)}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors min-h-[48px]"
              >
                취소
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Or text input directly */}
      {!selectedEmotion && (
        <button
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-orange-300 hover:text-orange-400 transition-colors min-h-[48px]"
        >
          직접 입력하기...
        </button>
      )}
    </motion.div>
  );
}

export default ParentHome;
