/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔬 현미경 뷰 (Microscope View) - AUTUS 2.0
 * 고객 상세 분석
 * "이 고객 상세는?"
 * 
 * 버튼 연동:
 * - ← 뒤로: 이전 페이지
 * - [타임라인]: 타임라인 뷰 (customerId)
 * - TSEL 항목: 상세 모달
 * - σ 요인 항목: 상세 모달
 * - Voice [처리]: Voice 처리 모달
 * - [이 전략 실행]: 액션 생성 + 액션 뷰
 * - [다른 전략 보기]: 전략 목록 모달
 * - [상담 예약]: 캘린더 모달
 * - [메시지 보내기]: 메시지 모달
 * - [이탈 방지 모드]: 이탈방지 모달
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, ArrowLeft, User, Calendar, Phone, MessageSquare, 
  AlertTriangle, Brain, ChevronRight, Heart, TrendingDown
} from 'lucide-react';
import { useModal } from './modals';
import { RoleId, hasPermission } from './config/roles';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface CustomerDetail {
  id: string;
  name: string;
  grade: string;
  class: string;
  teacher: string;
  monthsEnrolled: number;
  churnProbability: number;
  temperature: number;
  temperatureChange: number;
  tsel: { t: number; s: number; e: number; l: number };
  sigmaFactors: Array<{ factor: string; impact: number }>;
  recentVoice?: { stage: string; content: string; date: string; processed: boolean };
  aiRecommendation: { strategy: string; expectedEffect: number; tips: string[] };
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_CUSTOMER: CustomerDetail = {
  id: 'c1',
  name: '김민수',
  grade: '중2',
  class: 'A반',
  teacher: '박강사',
  monthsEnrolled: 8,
  churnProbability: 42,
  temperature: 38,
  temperatureChange: -12,
  tsel: { t: 52, s: 35, e: 60, l: 25 },
  sigmaFactors: [
    { factor: '숙제 미제출 3회', impact: -10 },
    { factor: '"비용" Voice', impact: -15 },
    { factor: '중간고사 스트레스', impact: -5 },
  ],
  recentVoice: { stage: '바람', content: '학원비가 좀 부담이...', date: '1/20', processed: false },
  aiRecommendation: {
    strategy: '가치 재인식 상담',
    expectedEffect: 15,
    tips: ['가격 대비 가치 강조', '성적 향상 데이터 제시'],
  },
};

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const TemperatureGauge: React.FC<{ temperature: number; change: number }> = ({ temperature, change }) => {
  const getColor = (temp: number) => {
    if (temp >= 70) return { color: '#10b981', label: '양호' };
    if (temp >= 50) return { color: '#f59e0b', label: '주의' };
    return { color: '#ef4444', label: '위험' };
  };
  
  const { color, label } = getColor(temperature);
  const dashOffset = ((100 - temperature) / 100) * 283;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#334155" strokeWidth="10" />
        <circle 
          cx="60" cy="60" r="45" 
          fill="none" 
          stroke={color} 
          strokeWidth="10"
          strokeDasharray="283"
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="55" textAnchor="middle" fill={color} fontSize="24" fontWeight="bold">{temperature}°</text>
        <text x="60" y="72" textAnchor="middle" fill={color} fontSize="12">{label}</text>
        {change !== 0 && (
          <text x="60" y="90" textAnchor="middle" fill={change < 0 ? '#ef4444' : '#10b981'} fontSize="11">
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}°
          </text>
        )}
      </svg>
    </div>
  );
};

const TSELChart: React.FC<{ tsel: CustomerDetail['tsel'] }> = ({ tsel }) => {
  const labels = { t: '신뢰', s: '만족', e: '참여', l: '충성' };
  const colors = { t: '#3b82f6', s: '#10b981', e: '#f59e0b', l: '#ef4444' };

  return (
    <div className="grid grid-cols-4 gap-2">
      {Object.entries(tsel).map(([key, value]) => (
        <div key={key} className="text-center">
          <div className="text-xs text-slate-400 mb-1">{key.toUpperCase()}</div>
          <div className="relative h-20 bg-slate-800 rounded-lg overflow-hidden">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${value}%` }}
              className="absolute bottom-0 w-full rounded-lg"
              style={{ backgroundColor: colors[key as keyof typeof colors] }}
            />
          </div>
          <div className="text-sm font-bold mt-1">{value}</div>
          <div className="text-[9px] text-slate-500">{labels[key as keyof typeof labels]}</div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface MicroscopeViewProps {
  customerId?: string;
  role?: RoleId;
  onNavigate?: (view: string, params?: any) => void;
  onBack?: () => void;
}

export function MicroscopeView({ customerId, role = 'owner', onNavigate = () => {}, onBack }: MicroscopeViewProps) {
  const [customer] = useState<CustomerDetail>(MOCK_CUSTOMER);
  const [searchQuery, setSearchQuery] = useState('');
  const { openModal } = useModal();
  
  const canCreateAction = hasPermission(role, 'canCreateAction');

  // ───────────────────────────────────────────────────────────────────
  // Button Handlers (설계 문서 기반)
  // ───────────────────────────────────────────────────────────────────

  // [타임라인] 클릭 → 타임라인 뷰
  const handleTimelineClick = () => {
    onNavigate('timeline', { customerId: customer.id });
  };

  // [이 전략 실행] 클릭 → 액션 생성 후 액션 뷰
  const handleExecuteStrategy = () => {
    if (!canCreateAction) return;
    
    openModal({
      type: 'action-create',
      data: {
        customerId: customer.id,
        suggestedTitle: `${customer.name} - ${customer.aiRecommendation.strategy}`,
        source: 'ai-recommendation',
      },
      onConfirm: (actionData) => {
        console.log('Action created:', actionData);
        onNavigate('actions', { actionId: actionData.id });
      },
    });
  };

  // [다른 전략 보기] 클릭 → 전략 목록 모달
  const handleShowStrategies = () => {
    openModal({
      type: 'strategy-list',
      data: { customerId: customer.id, customerName: customer.name },
      onConfirm: (strategy) => {
        if (canCreateAction) {
          openModal({
            type: 'action-create',
            data: {
              customerId: customer.id,
              suggestedTitle: `${customer.name} - ${strategy.name}`,
            },
            onConfirm: () => onNavigate('actions'),
          });
        }
      },
    });
  };

  // [상담 예약] 클릭 → 캘린더 모달
  const handleScheduleConsultation = () => {
    openModal({
      type: 'calendar',
      data: { customerId: customer.id, customerName: customer.name },
      onConfirm: (datetime) => {
        console.log('Consultation scheduled:', datetime);
      },
    });
  };

  // [메시지 보내기] 클릭 → 메시지 모달
  const handleSendMessage = () => {
    openModal({
      type: 'message',
      data: { customerId: customer.id, customerName: customer.name },
      onConfirm: (message) => {
        console.log('Message sent:', message);
      },
    });
  };

  // [이탈 방지 모드] 클릭 → 이탈방지 모달
  const handleChurnPrevention = () => {
    openModal({
      type: 'churn-prevent',
      data: {
        customerId: customer.id,
        customerName: customer.name,
        temperature: customer.temperature,
        churnProbability: customer.churnProbability,
      },
      onConfirm: (strategy) => {
        console.log('Churn prevention strategy:', strategy);
        if (canCreateAction) {
          onNavigate('actions', { create: true, customerId: customer.id });
        }
      },
    });
  };

  // Voice [처리] 클릭 → Voice 처리 모달
  const handleProcessVoice = () => {
    if (!customer.recentVoice) return;
    
    openModal({
      type: 'voice-process',
      data: {
        voiceId: 'v1',
        customerId: customer.id,
        customerName: customer.name,
        content: customer.recentVoice.content,
        date: customer.recentVoice.date,
        currentStatus: customer.recentVoice.processed ? 'resolved' : 'pending',
      },
      onConfirm: ({ status, notes }) => {
        console.log('Voice processed:', status, notes);
      },
    });
  };

  // TSEL 항목 클릭 → 상세 모달
  const handleTSELClick = (factor: 't' | 's' | 'e' | 'l') => {
    openModal({
      type: 'tsel-detail',
      data: { customerId: customer.id, factor, value: customer.tsel[factor] },
    });
  };

  // σ 요인 항목 클릭 → 상세 모달
  const handleSigmaClick = (factorIndex: number) => {
    const factor = customer.sigmaFactors[factorIndex];
    openModal({
      type: 'sigma-detail',
      data: { customerId: customer.id, factor },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50"
            >
              <ArrowLeft size={16} />
            </motion.button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Search size={20} />
          </div>
          <div>
            <div className="text-lg font-bold">현미경</div>
            <div className="text-[10px] text-slate-500">고객 상세 분석</div>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="고객 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-slate-800/50 rounded-lg text-sm border border-slate-700/50 focus:border-blue-500/50 outline-none w-40"
          />
        </div>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="text-lg font-bold">{customer.name}</div>
              <div className="text-xs text-slate-400">
                {customer.grade} · {customer.class} · {customer.teacher} 담당
              </div>
              <div className="text-xs text-slate-500">{customer.monthsEnrolled}개월 재원</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">이탈 확률</div>
            <div className={`text-2xl font-bold ${customer.churnProbability > 40 ? 'text-red-400' : customer.churnProbability > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {customer.churnProbability}%
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left - Temperature & AI */}
        <div className="col-span-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
          >
            <TemperatureGauge temperature={customer.temperature} change={customer.temperatureChange} />
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={handleTimelineClick}
              className="w-full mt-3 text-center text-[10px] text-blue-400 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20"
            >
              타임라인 보기 <ChevronRight size={10} className="inline" />
            </motion.button>
          </motion.div>

          {/* AI Recommendation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <Brain className="text-purple-400" size={14} />
              <span className="text-xs font-medium">AI 추천</span>
            </div>
            <div className="text-sm font-bold mb-1">{customer.aiRecommendation.strategy}</div>
            <div className="text-xs text-slate-400 mb-2">예상 효과: +{customer.aiRecommendation.expectedEffect}°</div>
            <div className="text-[10px] text-slate-500 mb-3">
              팁: {customer.aiRecommendation.tips.join(', ')}
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExecuteStrategy}
                disabled={!canCreateAction}
                className={`flex-1 text-[10px] py-1.5 rounded ${
                  canCreateAction 
                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                    : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                }`}
              >
                이 전략 실행
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShowStrategies}
                className="text-[10px] py-1.5 px-2 rounded bg-slate-700/50 hover:bg-slate-600/50"
              >
                다른 전략
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Right - TSEL & Factors */}
        <div className="col-span-8 space-y-4">
          {/* TSEL */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
          >
            <div className="text-xs text-slate-400 mb-3">TSEL 관계 지수</div>
            <TSELChart tsel={customer.tsel} />
          </motion.div>

          {/* Sigma Factors */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
          >
            <div className="text-xs text-slate-400 mb-3">σ 영향 요인</div>
            <div className="space-y-2">
              {customer.sigmaFactors.map((sf, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                  <span className="text-sm">• {sf.factor}</span>
                  <span className="text-xs text-red-400">{sf.impact}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Voice */}
          {customer.recentVoice && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="text-amber-400" size={14} />
                <span className="text-xs font-medium">최근 Voice</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px]">
                  {customer.recentVoice.stage}
                </span>
                <span>"{customer.recentVoice.content}"</span>
                <span className="text-xs text-slate-500">{customer.recentVoice.date}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={handleProcessVoice}
                  className="text-[10px] px-3 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                >
                  처리
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Action Buttons - 설계 문서 기반 버튼 연동 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3 mt-4"
      >
        {/* [📅 상담 예약] → 캘린더 모달 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleScheduleConsultation}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400"
        >
          <Calendar size={16} />
          <span className="text-sm">상담 예약</span>
        </motion.button>
        
        {/* [💬 메시지 보내기] → 메시지 모달 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSendMessage}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400"
        >
          <MessageSquare size={16} />
          <span className="text-sm">메시지 보내기</span>
        </motion.button>
        
        {/* [🚨 이탈 방지 모드] → 이탈방지 모달 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleChurnPrevention}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-red-500/20 rounded-xl border border-red-500/30 text-red-400"
        >
          <AlertTriangle size={16} />
          <span className="text-sm">이탈 방지 모드</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

export default MicroscopeView;
