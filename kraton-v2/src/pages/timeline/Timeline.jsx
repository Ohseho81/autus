/**
 * Timeline.jsx
 * 타임라인 - Gantt 스타일 액션 기록
 * 
 * 시간순 이벤트 흐름 시각화
 * Truth Mode: 횟수 표시
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../components/ui/GlassCard';
import TruthModeToggle from '../../components/ui/TruthModeToggle';

// Mock 데이터
const MOCK_EVENTS = [
  { id: 1, type: 'risk', title: '김민수 퇴원 위험 감지', time: '10:32', date: '오늘', state: 6, auto: true },
  { id: 2, type: 'action', title: '학부모 알림톡 발송', time: '10:33', date: '오늘', state: 5, auto: true },
  { id: 3, type: 'consultation', title: '1:1 상담 예약', time: '10:45', date: '오늘', state: 4, auto: false },
  { id: 4, type: 'feedback', title: '학부모 피드백 수신', time: '14:20', date: '오늘', state: 3, auto: false },
  { id: 5, type: 'resolved', title: '위험 상황 해결', time: '15:30', date: '오늘', state: 2, auto: false },
  { id: 6, type: 'card', title: '성장 카드 발송', time: '09:00', date: '어제', state: 2, auto: true },
  { id: 7, type: 'payment', title: '수강료 결제 완료', time: '11:30', date: '어제', state: 2, auto: false },
  { id: 8, type: 'risk', title: '이지은 출석률 하락', time: '14:00', date: '어제', state: 4, auto: true },
];

const EVENT_TYPES = {
  risk: { icon: '🚨', color: 'red', label: '위험 감지' },
  action: { icon: '⚡', color: 'orange', label: '액션 실행' },
  consultation: { icon: '💬', color: 'blue', label: '상담' },
  feedback: { icon: '📝', color: 'purple', label: '피드백' },
  resolved: { icon: '✅', color: 'emerald', label: '해결' },
  card: { icon: '🎴', color: 'cyan', label: '카드 발송' },
  payment: { icon: '💰', color: 'yellow', label: '결제' },
};

const STATE_COLORS = {
  1: 'bg-emerald-500',
  2: 'bg-blue-500',
  3: 'bg-yellow-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
  6: 'bg-red-700',
};

export default function Timeline() {
  const [truthMode, setTruthMode] = useState(false);
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 통계
  const stats = {
    total: events.length,
    auto: events.filter(e => e.auto).length,
    manual: events.filter(e => !e.auto).length,
    byType: Object.keys(EVENT_TYPES).reduce((acc, type) => {
      acc[type] = events.filter(e => e.type === type).length;
      return acc;
    }, {}),
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  // 날짜별 그룹화
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            타임라인
          </h1>
          <p className="text-gray-500 mt-1">액션 기록 & 이벤트 흐름</p>
        </div>
        <TruthModeToggle enabled={truthMode} onToggle={() => setTruthMode(!truthMode)} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <GlassCard className="p-4">
          <p className="text-xs text-gray-500 uppercase">총 이벤트</p>
          {truthMode ? (
            <p className="text-3xl font-bold font-mono text-white mt-2">{stats.total}</p>
          ) : (
            <p className="text-2xl mt-2">📊 {stats.total}건</p>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="cyan">
          <p className="text-xs text-gray-500 uppercase">자동 실행</p>
          {truthMode ? (
            <p className="text-3xl font-bold font-mono text-cyan-400 mt-2">{stats.auto}</p>
          ) : (
            <p className="text-2xl mt-2">⚡ {stats.auto}건</p>
          )}
          {truthMode && (
            <p className="text-xs text-gray-500 mt-1">
              {((stats.auto / stats.total) * 100).toFixed(1)}% 자동화
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="purple">
          <p className="text-xs text-gray-500 uppercase">수동 처리</p>
          {truthMode ? (
            <p className="text-3xl font-bold font-mono text-purple-400 mt-2">{stats.manual}</p>
          ) : (
            <p className="text-2xl mt-2">👋 {stats.manual}건</p>
          )}
        </GlassCard>

        <GlassCard className="p-4" glowColor="emerald">
          <p className="text-xs text-gray-500 uppercase">해결 완료</p>
          {truthMode ? (
            <p className="text-3xl font-bold font-mono text-emerald-400 mt-2">{stats.byType.resolved || 0}</p>
          ) : (
            <p className="text-2xl mt-2">✅ {stats.byType.resolved || 0}건</p>
          )}
        </GlassCard>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          전체
        </button>
        {Object.entries(EVENT_TYPES).map(([type, config]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              filter === type 
                ? `bg-${config.color}-600 text-white` 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {config.icon} {config.label}
            {truthMode && (
              <span className="ml-1 px-1.5 py-0.5 bg-black/30 rounded text-xs">
                {stats.byType[type] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-lg font-bold text-gray-400">{date}</span>
              <div className="flex-1 h-px bg-gray-800" />
              {truthMode && (
                <span className="text-sm text-gray-500">{dateEvents.length}건</span>
              )}
            </div>

            {/* Events */}
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-800" />

              <AnimatePresence>
                {dateEvents.map((event, index) => {
                  const typeConfig = EVENT_TYPES[event.type];
                  const stateColor = STATE_COLORS[event.state];

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative flex items-start gap-4 mb-4 pl-2"
                    >
                      {/* Node */}
                      <div className={`
                        relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                        bg-gray-900 border-2 border-${typeConfig.color}-500
                        ${selectedEvent === event.id ? 'ring-2 ring-white/50' : ''}
                      `}>
                        <span className="text-lg">{typeConfig.icon}</span>
                      </div>

                      {/* Content */}
                      <GlassCard 
                        className="flex-1 p-4 cursor-pointer"
                        hoverable
                        onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{event.title}</h4>
                              {event.auto && (
                                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                                  AUTO
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {event.time}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${stateColor}`} />
                            <span className="text-xs text-gray-500">S{event.state}</span>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {selectedEvent === event.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 pt-4 border-t border-gray-800"
                            >
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">이벤트 타입</p>
                                  <p className="text-white">{typeConfig.label}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">실행 방식</p>
                                  <p className="text-white">{event.auto ? '자동' : '수동'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">상태 변화</p>
                                  <p className="text-white">State {event.state}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">해당 유형의 이벤트가 없습니다</p>
        </div>
      )}
    </div>
  );
}
