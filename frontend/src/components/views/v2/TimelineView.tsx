/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📅 타임라인 뷰 (Timeline View) - AUTUS 2.0
 * 고객 히스토리 추적
 * "어떻게 변해왔나?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, TrendingDown, TrendingUp, MessageSquare, BookOpen, AlertTriangle, CheckCircle, Brain } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  date: string;
  type: 'voice' | 'academic' | 'attendance' | 'registration' | 'consultation';
  level: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description?: string;
  tempChange: number;
  relatedActionId?: string;
}

interface TemperaturePoint {
  date: string;
  temperature: number;
}

interface Customer {
  id: string;
  name: string;
  grade: string;
  class: string;
}

interface TimelineData {
  customer: Customer;
  temperatureHistory: TemperaturePoint[];
  events: TimelineEvent[];
  pattern?: string;
  insight?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA: TimelineData = {
  customer: { id: 'c1', name: '김민수', grade: '중2', class: 'A반' },
  temperatureHistory: [
    { date: '10월', temperature: 85 },
    { date: '11월', temperature: 78 },
    { date: '12월', temperature: 62 },
    { date: '1월', temperature: 38 },
  ],
  events: [
    { id: 'e1', date: '1/20', type: 'voice', level: 'warning', title: 'Voice "비용 부담"', description: '"학원비가 좀 부담이 되네요..."', tempChange: -8 },
    { id: 'e2', date: '1/10', type: 'academic', level: 'critical', title: '숙제 미제출 3회 연속', tempChange: -5 },
    { id: 'e3', date: '12/15', type: 'academic', level: 'warning', title: '성적 하락 (B→C)', tempChange: -7 },
    { id: 'e4', date: '11/01', type: 'registration', level: 'success', title: '정상 등록', description: '첫 등록일', tempChange: 0 },
  ],
  pattern: '"성적 하락 → 숙제 미제출 → 비용 Voice" 연쇄',
  insight: '성적 관련 케어가 비용 불만 선행 요인',
};

const CUSTOMERS: Customer[] = [
  { id: 'c1', name: '김민수', grade: '중2', class: 'A반' },
  { id: 'c2', name: '이서연', grade: '중1', class: 'B반' },
  { id: 'c3', name: '박지훈', grade: '중3', class: 'A반' },
];

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const TemperatureChart: React.FC<{ history: TemperaturePoint[] }> = ({ history }) => {
  const maxTemp = 100;
  const minTemp = 0;
  const height = 150;
  const width = 300;
  const padding = 20;
  
  const points = history.map((p, i) => ({
    x: padding + (i / (history.length - 1)) * (width - 2 * padding),
    y: height - padding - ((p.temperature - minTemp) / (maxTemp - minTemp)) * (height - 2 * padding),
    temp: p.temperature,
    label: p.date,
  }));
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  const getColor = (temp: number) => {
    if (temp >= 70) return '#10b981';
    if (temp >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
      <div className="text-xs text-slate-400 mb-2">온도 변화 추이</div>
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((temp) => {
          const y = height - padding - ((temp - minTemp) / (maxTemp - minTemp)) * (height - 2 * padding);
          return (
            <g key={temp}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4" />
              <text x={padding - 5} y={y + 4} fill="#64748b" fontSize="8" textAnchor="end">{temp}°</text>
            </g>
          );
        })}
        
        {/* Path */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#tempGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />
        
        <defs>
          <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r="6"
              fill={getColor(p.temp)}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            />
            <text x={p.x} y={height - 5} fill="#94a3b8" fontSize="9" textAnchor="middle">{p.label}</text>
            <text x={p.x} y={p.y - 10} fill={getColor(p.temp)} fontSize="10" fontWeight="bold" textAnchor="middle">{p.temp}°</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const EventItem: React.FC<{ 
  event: TimelineEvent; 
  onViewDetail: () => void;
  onViewAction: () => void;
}> = ({ event, onViewDetail, onViewAction }) => {
  const icons = {
    voice: MessageSquare,
    academic: BookOpen,
    attendance: Calendar,
    registration: CheckCircle,
    consultation: Brain,
  };
  const Icon = icons[event.type] || AlertTriangle;
  
  const levelColors = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3"
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${levelColors[event.level]}`} />
        <div className="w-0.5 h-full bg-slate-700 mt-1" />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500">{event.date}</span>
          <Icon size={12} className="text-slate-400" />
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{event.title}</span>
            <span className={`text-xs ${event.tempChange < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {event.tempChange > 0 ? '+' : ''}{event.tempChange}°
            </span>
          </div>
          {event.description && (
            <div className="text-xs text-slate-400 mt-1">"{event.description}"</div>
          )}
          <div className="flex gap-2 mt-2">
            <button 
              onClick={onViewDetail}
              className="text-[10px] px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-600/50"
            >
              {event.type === 'voice' ? 'Voice 상세' : '상세 보기'}
            </button>
            {event.relatedActionId && (
              <button 
                onClick={onViewAction}
                className="text-[10px] px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              >
                관련 액션
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface TimelineViewProps {
  customerId?: string;
  onNavigate?: (view: string, params?: any) => void;
}

export function TimelineView({ customerId, onNavigate = () => {} }: TimelineViewProps) {
  const [data] = useState<TimelineData>(MOCK_DATA);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(MOCK_DATA.customer);
  const [period, setPeriod] = useState<'3m' | '6m' | '1y'>('3m');
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);

  const handleEventDetail = (eventId: string) => {
    console.log('View event detail:', eventId);
  };

  const handleViewAction = (eventId: string) => {
    onNavigate('actions', { filter: 'customer', customerId: selectedCustomer.id });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-lg font-bold">타임라인</div>
            <div className="text-[10px] text-slate-500">고객 히스토리</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Customer Select */}
          <div className="relative">
            <button
              onClick={() => setShowCustomerSelect(!showCustomerSelect)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg text-sm"
            >
              {selectedCustomer.name}
              <ChevronDown size={14} />
            </button>
            {showCustomerSelect && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-1 w-48 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-10"
              >
                {CUSTOMERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setShowCustomerSelect(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 ${
                      c.id === selectedCustomer.id ? 'bg-slate-700/50' : ''
                    }`}
                  >
                    {c.name} <span className="text-slate-500">{c.grade} {c.class}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          
          {/* Period Select */}
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            {(['3m', '6m', '1y'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-1 text-xs rounded ${
                  period === p ? 'bg-violet-500 text-white' : 'text-slate-400'
                }`}
              >
                {p === '3m' ? '3개월' : p === '6m' ? '6개월' : '1년'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Temperature Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <TemperatureChart history={data.temperatureHistory} />
      </motion.div>

      {/* Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
      >
        <div className="text-xs text-slate-400 mb-3">📍 주요 이벤트</div>
        <div className="space-y-0">
          {data.events.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              onViewDetail={() => handleEventDetail(event.id)}
              onViewAction={() => handleViewAction(event.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* Pattern & Insight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
      >
        {data.pattern && (
          <div className="flex items-start gap-2 mb-2">
            <span className="text-sm">📊</span>
            <div>
              <span className="text-xs text-slate-400">패턴 분석: </span>
              <span className="text-sm">{data.pattern}</span>
            </div>
          </div>
        )}
        {data.insight && (
          <div className="flex items-start gap-2">
            <Brain size={14} className="text-purple-400 mt-0.5" />
            <div>
              <span className="text-xs text-slate-400">AI 인사이트: </span>
              <span className="text-sm text-purple-300">{data.insight}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default TimelineView;
