/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📅 CALENDAR PAGE - 일정 관리
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
// EVENT TYPES
// ============================================
const EVENT_TYPES = {
  class: { label: '수업', color: 'cyan', icon: '📚' },
  consultation: { label: '상담', color: 'purple', icon: '💬' },
  test: { label: '시험', color: 'orange', icon: '📝' },
  event: { label: '행사', color: 'emerald', icon: '🎉' },
  holiday: { label: '휴원', color: 'red', icon: '🏖️' },
};

// ============================================
// MOCK DATA
// ============================================
const MOCK_EVENTS = [
  { id: 1, title: '수학 A반', type: 'class', date: '2024-01-24', time: '14:00', duration: 90, teacher: '김선생' },
  { id: 2, title: '김민수 학부모 상담', type: 'consultation', date: '2024-01-24', time: '16:00', duration: 30, teacher: '박선생' },
  { id: 3, title: '영어 B반', type: 'class', date: '2024-01-24', time: '18:00', duration: 90, teacher: '이선생' },
  { id: 4, title: '월말 테스트', type: 'test', date: '2024-01-25', time: '10:00', duration: 120, teacher: '전체' },
  { id: 5, title: '설 연휴', type: 'holiday', date: '2024-01-26', endDate: '2024-01-28' },
  { id: 6, title: '국어 A반', type: 'class', date: '2024-01-29', time: '14:00', duration: 90, teacher: '최선생' },
  { id: 7, title: '신학기 OT', type: 'event', date: '2024-02-01', time: '14:00', duration: 60 },
];

// ============================================
// CALENDAR HEADER
// ============================================
const CalendarHeader = memo(function CalendarHeader({ currentDate, onPrev, onNext, onToday, view, onViewChange }) {
  const monthYear = currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-white">{monthYear}</h2>
        <div className="flex gap-1">
          <button
            onClick={onPrev}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            ←
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1 text-sm text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
          >
            오늘
          </button>
          <button
            onClick={onNext}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            →
          </button>
        </div>
      </div>
      
      <div className="flex gap-2">
        {['month', 'week', 'day'].map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {v === 'month' ? '월' : v === 'week' ? '주' : '일'}
          </button>
        ))}
      </div>
    </div>
  );
});

// ============================================
// CALENDAR GRID
// ============================================
const CalendarGrid = memo(function CalendarGrid({ currentDate, events, onDateClick, onEventClick }) {
  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const result = [];
    
    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      result.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      result.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month padding
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      result.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return result;
  }, [currentDate]);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };
  
  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-700/50">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div 
            key={day} 
            className={`py-3 text-center text-sm font-medium ${
              idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const isToday = date.getTime() === today.getTime();
          const dayEvents = getEventsForDate(date);
          const dayOfWeek = date.getDay();
          
          return (
            <div
              key={idx}
              onClick={() => onDateClick(date)}
              className={`min-h-[100px] p-2 border-b border-r border-gray-700/30 cursor-pointer transition-colors hover:bg-gray-700/30 ${
                !isCurrentMonth ? 'bg-gray-900/30' : ''
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday 
                  ? 'w-7 h-7 bg-cyan-500 text-white rounded-full flex items-center justify-center'
                  : !isCurrentMonth
                    ? 'text-gray-600'
                    : dayOfWeek === 0
                      ? 'text-red-400'
                      : dayOfWeek === 6
                        ? 'text-blue-400'
                        : 'text-gray-300'
              }`}>
                {date.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const eventType = EVENT_TYPES[event.type];
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={`px-2 py-1 rounded text-xs truncate bg-${eventType.color}-500/20 text-${eventType.color}-400 hover:bg-${eventType.color}-500/30 transition-colors`}
                    >
                      {event.time && <span className="opacity-70">{event.time} </span>}
                      {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 px-2">
                    +{dayEvents.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================
// EVENT SIDEBAR
// ============================================
const EventSidebar = memo(function EventSidebar({ selectedDate, events, onAddEvent }) {
  const dateStr = selectedDate?.toLocaleDateString('ko-KR', { 
    month: 'long', 
    day: 'numeric', 
    weekday: 'long' 
  });
  
  const dayEvents = selectedDate 
    ? events.filter(e => e.date === selectedDate.toISOString().split('T')[0])
    : [];
  
  return (
    <div className="w-80 bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {selectedDate ? dateStr : '날짜를 선택하세요'}
        </h3>
        <button
          onClick={onAddEvent}
          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
        >
          ➕
        </button>
      </div>
      
      {dayEvents.length > 0 ? (
        <div className="space-y-3">
          {dayEvents.map((event) => {
            const eventType = EVENT_TYPES[event.type];
            return (
              <div 
                key={event.id}
                className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{eventType.icon}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-${eventType.color}-500/20 text-${eventType.color}-400`}>
                    {eventType.label}
                  </span>
                </div>
                <p className="text-white font-medium">{event.title}</p>
                {event.time && (
                  <p className="text-gray-400 text-sm mt-1">
                    🕐 {event.time} ({event.duration}분)
                  </p>
                )}
                {event.teacher && (
                  <p className="text-gray-500 text-sm">👤 {event.teacher}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <span className="text-3xl">📅</span>
          <p className="mt-2">일정이 없습니다</p>
        </div>
      )}
      
      {/* Upcoming events */}
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-400 mb-3">다가오는 일정</h4>
        <div className="space-y-2">
          {events.slice(0, 5).map((event) => {
            const eventType = EVENT_TYPES[event.type];
            return (
              <div key={event.id} className="flex items-center gap-2 text-sm">
                <span>{eventType.icon}</span>
                <span className="text-gray-400">{event.date.slice(5)}</span>
                <span className="text-gray-300 truncate">{event.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// ============================================
// ADD EVENT MODAL
// ============================================
const AddEventModal = memo(function AddEventModal({ isOpen, onClose, onSave, selectedDate }) {
  const [form, setForm] = useState({
    title: '',
    type: 'class',
    date: selectedDate?.toISOString().split('T')[0] || '',
    time: '',
    duration: 60,
    teacher: '',
    description: '',
  });
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    onSave(form);
    onClose();
    setForm({ title: '', type: 'class', date: '', time: '', duration: 60, teacher: '', description: '' });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700"
      >
        <h3 className="text-xl font-bold text-white mb-4">📅 일정 추가</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">일정 제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="일정 제목을 입력하세요"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">유형</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EVENT_TYPES).map(([key, { label, icon, color }]) => (
                <button
                  key={key}
                  onClick={() => setForm({ ...form, type: key })}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors ${
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">날짜</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">시간</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">소요 시간 (분)</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">담당</label>
              <input
                type="text"
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                placeholder="담당자"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
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
            onClick={handleSave}
            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            저장
          </button>
        </div>
      </motion.div>
    </div>
  );
});

// ============================================
// MAIN CALENDAR PAGE
// ============================================
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const handlePrev = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNext = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };
  
  const handleAddEvent = (eventData) => {
    const newEvent = {
      id: Date.now(),
      ...eventData,
    };
    setEvents([...events, newEvent]);
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white`}>📅 일정 관리</h1>
          <p className="text-gray-500 mt-1">수업, 상담, 행사 일정을 관리합니다</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
        >
          + 일정 추가
        </button>
      </div>
      
      {/* Event Type Legend */}
      <div className="flex gap-4 mb-6">
        {Object.entries(EVENT_TYPES).map(([key, { label, icon, color }]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full bg-${color}-500`} />
            <span className="text-sm text-gray-400">{icon} {label}</span>
          </div>
        ))}
      </div>
      
      {/* Calendar Controls */}
      <CalendarHeader
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        view={view}
        onViewChange={setView}
      />
      
      {/* Calendar + Sidebar */}
      <div className="flex gap-6">
        <div className="flex-1">
          <CalendarGrid
            currentDate={currentDate}
            events={events}
            onDateClick={setSelectedDate}
            onEventClick={setSelectedEvent}
          />
        </div>
        <EventSidebar
          selectedDate={selectedDate}
          events={events}
          onAddEvent={() => setShowAddModal(true)}
        />
      </div>
      
      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddEvent}
        selectedDate={selectedDate}
      />
    </div>
  );
}
