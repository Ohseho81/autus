/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌤️ 예보 뷰 (Forecast View) - AUTUS 2.0
 * 날씨 + 레이더 통합
 * "앞으로 뭐가 올까?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, AlertTriangle, Sparkles, ChevronRight, Plus, Calendar } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface WeatherDay {
  date: string;
  day: string;
  weather: 'sunny' | 'cloudy' | 'rainy' | 'storm';
  sigma: number;
  event?: string;
}

interface Threat {
  id: string;
  name: string;
  severity: 'high' | 'medium' | 'low';
  eta: number;
  impact: number;
  description?: string;
}

interface Opportunity {
  id: string;
  name: string;
  potential: 'high' | 'medium' | 'low';
  eta: number;
  impact: number;
  description?: string;
}

interface ForecastData {
  forecast: WeatherDay[];
  summary: { avgSigma: number; worstDay: string; eventCount: number };
  threats: Threat[];
  opportunities: Opportunity[];
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA: ForecastData = {
  forecast: [
    { date: '1/28', day: '화', weather: 'sunny', sigma: 0.95 },
    { date: '1/29', day: '수', weather: 'cloudy', sigma: 0.90 },
    { date: '1/30', day: '목', weather: 'cloudy', sigma: 0.85 },
    { date: '1/31', day: '금', weather: 'rainy', sigma: 0.75, event: '시험전날' },
    { date: '2/1', day: '토', weather: 'storm', sigma: 0.60, event: '중간고사' },
    { date: '2/2', day: '일', weather: 'cloudy', sigma: 0.80 },
    { date: '2/3', day: '월', weather: 'sunny', sigma: 0.95 },
  ],
  summary: { avgSigma: 0.83, worstDay: '2/1', eventCount: 2 },
  threats: [
    { id: 't1', name: 'D학원 프로모션', severity: 'high', eta: 3, impact: -15, description: '50% 할인 캠페인 예정' },
    { id: 't2', name: '중간고사 스트레스', severity: 'medium', eta: 5, impact: -10, description: '이탈 위험 증가 예상' },
  ],
  opportunities: [
    { id: 'o1', name: 'C학원 강사 퇴사', potential: 'high', eta: 7, impact: 10, description: '인기 강사 3명 이직' },
  ],
};

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  storm: '⛈️',
};

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const WeekTimeline: React.FC<{ forecast: WeatherDay[]; onDayClick: (date: string) => void }> = ({ 
  forecast, onDayClick 
}) => (
  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
    <div className="text-xs text-slate-400 mb-3">7일 타임라인</div>
    <div className="grid grid-cols-7 gap-2">
      {forecast.map((day, i) => (
        <motion.div
          key={day.date}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.05, y: -5 }}
          onClick={() => onDayClick(day.date)}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            day.sigma < 0.7 
              ? 'bg-red-500/10 border-red-500/50' 
              : day.sigma < 0.85 
                ? 'bg-amber-500/10 border-amber-500/50' 
                : 'bg-slate-800/50 border-slate-700/50'
          }`}
        >
          <div className="text-xs text-slate-400">{day.date}</div>
          <div className="text-[10px] text-slate-500">{day.day}</div>
          <div className="text-2xl my-1">{WEATHER_ICONS[day.weather]}</div>
          <div className={`text-sm font-bold ${
            day.sigma < 0.7 ? 'text-red-400' : day.sigma < 0.85 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {day.sigma.toFixed(2)}
          </div>
          {day.event && (
            <div className="text-[9px] text-red-400 mt-1 truncate">{day.event}</div>
          )}
        </motion.div>
      ))}
    </div>
  </div>
);

const ThreatCard: React.FC<{ threat: Threat; onAction: () => void }> = ({ threat, onAction }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="p-3 bg-red-500/10 rounded-lg border border-red-500/30"
  >
    <div className="flex items-start gap-2">
      <span className={`w-2 h-2 mt-1.5 rounded-full ${
        threat.severity === 'high' ? 'bg-red-500' : threat.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-500'
      }`} />
      <div className="flex-1">
        <div className="text-sm font-medium">{threat.name}</div>
        <div className="text-[10px] text-slate-400">
          ETA {threat.eta}일 · 영향 {threat.impact}%
        </div>
        {threat.description && (
          <div className="text-[10px] text-slate-500 mt-1">{threat.description}</div>
        )}
      </div>
    </div>
    <div className="flex gap-2 mt-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="text-[10px] px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-600/50"
      >
        상세
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAction}
        className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
      >
        대응 전략
      </motion.button>
    </div>
  </motion.div>
);

const OpportunityCard: React.FC<{ opportunity: Opportunity; onAction: () => void }> = ({ opportunity, onAction }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30"
  >
    <div className="flex items-start gap-2">
      <span className={`w-2 h-2 mt-1.5 rounded-full ${
        opportunity.potential === 'high' ? 'bg-emerald-500' : opportunity.potential === 'medium' ? 'bg-blue-500' : 'bg-slate-500'
      }`} />
      <div className="flex-1">
        <div className="text-sm font-medium">{opportunity.name}</div>
        <div className="text-[10px] text-slate-400">
          ETA {opportunity.eta}일 · 영향 +{opportunity.impact}%
        </div>
        {opportunity.description && (
          <div className="text-[10px] text-slate-500 mt-1">{opportunity.description}</div>
        )}
      </div>
    </div>
    <div className="flex gap-2 mt-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="text-[10px] px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-600/50"
      >
        상세
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAction}
        className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
      >
        기회 활용
      </motion.button>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface ForecastViewProps {
  onNavigate?: (view: string, params?: any) => void;
}

export function ForecastView({ onNavigate = () => {} }: ForecastViewProps) {
  const [data] = useState<ForecastData>(MOCK_DATA);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const handleDayClick = (date: string) => {
    console.log('Day clicked:', date);
    // TODO: Show day detail modal
  };

  const handleCreateAction = (type: 'threat' | 'opportunity', id: string) => {
    onNavigate('actions', { create: true, source: type, sourceId: id });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
            <Cloud size={20} />
          </div>
          <div>
            <div className="text-lg font-bold">예보</div>
            <div className="text-[10px] text-slate-500">날씨 + 위협/기회 감지</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            {['week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as 'week' | 'month')}
                className={`px-3 py-1 text-xs rounded ${
                  period === p ? 'bg-blue-500 text-white' : 'text-slate-400'
                }`}
              >
                {p === 'week' ? '이번주' : '이번달'}
              </button>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50"
          >
            <Plus size={16} />
          </motion.button>
        </div>
      </div>

      {/* Week Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <WeekTimeline forecast={data.forecast} onDayClick={handleDayClick} />
      </motion.div>

      {/* Threats & Opportunities */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Threats */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-400" size={14} />
            <span className="text-xs font-medium">다가오는 위협</span>
            <span className="ml-auto text-xs text-red-400">{data.threats.length}건</span>
          </div>
          <div className="space-y-3">
            {data.threats.map((threat) => (
              <ThreatCard 
                key={threat.id} 
                threat={threat} 
                onAction={() => handleCreateAction('threat', threat.id)}
              />
            ))}
          </div>
        </motion.div>

        {/* Opportunities */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-emerald-400" size={14} />
            <span className="text-xs font-medium">포착된 기회</span>
            <span className="ml-auto text-xs text-emerald-400">{data.opportunities.length}건</span>
          </div>
          <div className="space-y-3">
            {data.opportunities.map((opportunity) => (
              <OpportunityCard 
                key={opportunity.id} 
                opportunity={opportunity} 
                onAction={() => handleCreateAction('opportunity', opportunity.id)}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
      >
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">📊 요약:</span>
            <span>평균 σ <span className="font-bold text-amber-400">{data.summary.avgSigma}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">최악</span>
            <span className="font-bold text-red-400">{data.summary.worstDay}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">이벤트</span>
            <span className="font-bold">{data.summary.eventCount}건</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ForecastView;
