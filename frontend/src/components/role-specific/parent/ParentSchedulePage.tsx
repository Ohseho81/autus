/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Parent Schedule Page
 * 학부모 일정 페이지 - 자녀 수업 일정 및 상담 예약
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleEvent {
  id: string;
  title: string;
  type: 'class' | 'exam' | 'consultation' | 'event' | 'holiday';
  date: Date;
  time?: string;
  endTime?: string;
  description?: string;
  teacher?: string;
  location?: string;
}

interface ConsultationSlot {
  id: string;
  date: Date;
  time: string;
  teacher: string;
  available: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const CHILD_INFO = {
  name: '김민수',
  grade: '중학교 2학년',
  subjects: ['수학', '영어'],
};

// Generate this month's events
const generateEvents = (): ScheduleEvent[] => {
  const now = new Date();
  const events: ScheduleEvent[] = [];
  
  // Regular classes (Mon, Wed, Fri)
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
    const day = date.getDay();
    
    if (day === 1 || day === 3 || day === 5) { // Mon, Wed, Fri
      events.push({
        id: `class-${i}-math`,
        title: '수학 수업',
        type: 'class',
        date,
        time: '16:00',
        endTime: '17:30',
        teacher: '김선생님',
        location: '201호',
      });
    }
    
    if (day === 2 || day === 4) { // Tue, Thu
      events.push({
        id: `class-${i}-eng`,
        title: '영어 수업',
        type: 'class',
        date,
        time: '18:00',
        endTime: '19:30',
        teacher: '박선생님',
        location: '302호',
      });
    }
  }
  
  // Special events
  events.push({
    id: 'exam-1',
    title: '수학 모의고사',
    type: 'exam',
    date: new Date(now.getFullYear(), now.getMonth(), 25),
    time: '14:00',
    description: '이번 달 학습 내용 평가',
  });
  
  events.push({
    id: 'holiday-1',
    title: '설날 연휴',
    type: 'holiday',
    date: new Date(now.getFullYear(), now.getMonth(), 28),
    description: '학원 휴무',
  });
  
  return events;
};

const EVENTS = generateEvents();

const CONSULTATION_SLOTS: ConsultationSlot[] = [
  { id: 'c1', date: new Date(Date.now() + 86400000 * 2), time: '14:00', teacher: '김선생님', available: true },
  { id: 'c2', date: new Date(Date.now() + 86400000 * 2), time: '15:00', teacher: '김선생님', available: false },
  { id: 'c3', date: new Date(Date.now() + 86400000 * 3), time: '14:00', teacher: '김선생님', available: true },
  { id: 'c4', date: new Date(Date.now() + 86400000 * 3), time: '16:00', teacher: '박선생님', available: true },
  { id: 'c5', date: new Date(Date.now() + 86400000 * 4), time: '15:00', teacher: '김선생님', available: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Component
// ─────────────────────────────────────────────────────────────────────────────

function Calendar({ 
  selectedDate, 
  onSelectDate,
  events 
}: { 
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: ScheduleEvent[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    
    return days;
  };
  
  const days = getDaysInMonth(currentMonth);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  
  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getDate() === day && 
             eDate.getMonth() === currentMonth.getMonth() &&
             eDate.getFullYear() === currentMonth.getFullYear();
    });
  };
  
  const isSelected = (day: number) => {
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === currentMonth.getMonth() &&
           selectedDate.getFullYear() === currentMonth.getFullYear();
  };
  
  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === currentMonth.getMonth() &&
           today.getFullYear() === currentMonth.getFullYear();
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          ◀
        </button>
        <h3 className="font-bold text-slate-800">
          {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
        </h3>
        <button 
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          ▶
        </button>
      </div>
      
      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, idx) => (
          <div 
            key={day} 
            className={`text-center text-xs font-medium py-1 ${
              idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          
          const dayEvents = getEventsForDay(day);
          const hasClass = dayEvents.some(e => e.type === 'class');
          const hasExam = dayEvents.some(e => e.type === 'exam');
          const hasHoliday = dayEvents.some(e => e.type === 'holiday');
          
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm
                transition-colors
                ${isSelected(day) ? 'bg-orange-500 text-white' : 
                  isToday(day) ? 'bg-orange-100 text-orange-700' :
                  hasHoliday ? 'bg-red-50 text-red-500' :
                  'hover:bg-slate-100 text-slate-700'}
              `}
            >
              <span>{day}</span>
              {/* Event Dots */}
              {dayEvents.length > 0 && !isSelected(day) && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasClass && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                  {hasExam && <span className="w-1 h-1 rounded-full bg-red-500" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> 수업
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> 시험
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-300" /> 휴무
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Card
// ─────────────────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: ScheduleEvent }) {
  const typeStyles = {
    class: { icon: '📚', bg: 'bg-blue-50 border-blue-200' },
    exam: { icon: '📝', bg: 'bg-red-50 border-red-200' },
    consultation: { icon: '💬', bg: 'bg-green-50 border-green-200' },
    event: { icon: '🎉', bg: 'bg-purple-50 border-purple-200' },
    holiday: { icon: '🏖️', bg: 'bg-slate-50 border-slate-200' },
  };
  
  const style = typeStyles[event.type];

  return (
    <div className={`p-3 rounded-xl border ${style.bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{style.icon}</span>
        <div className="flex-1">
          <div className="font-medium text-slate-800">{event.title}</div>
          {event.time && (
            <div className="text-sm text-slate-500">
              {event.time}{event.endTime && ` - ${event.endTime}`}
            </div>
          )}
          {event.teacher && (
            <div className="text-sm text-slate-500">{event.teacher}</div>
          )}
          {event.location && (
            <div className="text-xs text-slate-400">{event.location}</div>
          )}
          {event.description && (
            <div className="text-sm text-slate-600 mt-1">{event.description}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultation Booking Modal
// ─────────────────────────────────────────────────────────────────────────────

function ConsultationModal({ 
  onClose,
  onBook
}: { 
  onClose: () => void;
  onBook: (slotId: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Group slots by date
  const groupedSlots: Record<string, ConsultationSlot[]> = {};
  CONSULTATION_SLOTS.forEach(slot => {
    const dateKey = slot.date.toLocaleDateString('ko-KR');
    if (!groupedSlots[dateKey]) groupedSlots[dateKey] = [];
    groupedSlots[dateKey].push(slot);
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[80vh] overflow-y-auto"
        initial={reducedMotion ? {} : { y: 300 }}
        animate={{ y: 0 }}
        exit={reducedMotion ? {} : { y: 300 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
        
        <h2 className="text-lg font-bold text-slate-800 mb-4">💬 상담 예약</h2>
        
        <div className="space-y-4">
          {Object.entries(groupedSlots).map(([date, slots]) => (
            <div key={date}>
              <div className="text-sm font-medium text-slate-500 mb-2">{date}</div>
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => slot.available && setSelectedSlot(slot.id)}
                    disabled={!slot.available}
                    className={`
                      p-3 rounded-xl text-center transition-colors
                      ${!slot.available 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                        : selectedSlot === slot.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-orange-100'
                      }
                    `}
                  >
                    <div className="font-medium">{slot.time}</div>
                    <div className="text-xs">{slot.teacher}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => selectedSlot && onBook(selectedSlot)}
          disabled={!selectedSlot}
          className={`
            w-full mt-6 py-3 rounded-xl font-medium transition-colors
            ${selectedSlot
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          예약하기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ParentSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  
  // Get events for selected date
  const selectedDateEvents = EVENTS.filter(e => {
    const eDate = new Date(e.date);
    return eDate.toDateString() === selectedDate.toDateString();
  });
  
  // Upcoming events (next 7 days)
  const now = new Date();
  const upcomingEvents = EVENTS
    .filter(e => {
      const eDate = new Date(e.date);
      const diff = eDate.getTime() - now.getTime();
      return diff > 0 && diff < 7 * 86400000;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const handleBook = (slotId: string) => {
    // In real app, would call API
    alert('상담이 예약되었습니다!');
    setShowConsultationModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto p-4">
          <h1 className="text-xl font-bold text-slate-800">📅 {CHILD_INFO.name}의 일정</h1>
          <p className="text-sm text-slate-500">{CHILD_INFO.subjects.join(', ')} 수업</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Calendar */}
        <Calendar 
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          events={EVENTS}
        />
        
        {/* Selected Date Events */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-3">
            {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </h3>
          
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDateEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2">📭</div>
              <div>이 날은 일정이 없어요</div>
            </div>
          )}
        </div>
        
        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-3">⏰ 다가오는 일정</h3>
          
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <div className="text-center min-w-[50px]">
                    <div className="text-xs text-slate-500">
                      {new Date(event.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">{event.title}</div>
                    {event.time && <div className="text-xs text-slate-500">{event.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-400 text-sm">
              다가오는 일정이 없어요
            </div>
          )}
        </div>
        
        {/* Consultation Booking Button */}
        <button
          onClick={() => setShowConsultationModal(true)}
          className="w-full py-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          💬 상담 예약하기
        </button>
      </div>
      
      {/* Consultation Modal */}
      <AnimatePresence>
        {showConsultationModal && (
          <ConsultationModal
            onClose={() => setShowConsultationModal(false)}
            onBook={handleBook}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ParentSchedulePage;
