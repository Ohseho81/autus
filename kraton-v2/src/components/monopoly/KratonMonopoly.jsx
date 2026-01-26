/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ KRATON Monopoly System
 * 독점 체제 완성 - 3대 핵심 모듈 통합
 * 
 * 1. [인지 독점] Perception - 관계 데이터 라벨링 고도화
 * 2. [판단 독점] Prediction - 이탈 예측 엔진 (FSD Physics)
 * 3. [구조 독점] Pipeline - 글로벌 데이터 통합 인프라
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// PHYSICS FORMULAS
// ============================================

/**
 * 가중치 누적 이탈 위험도 계산
 * R(t) = Σ(w_i × ΔM_i) / s(t)^α
 * - 최근 데이터일수록 가중치 높음
 * - 성과(M) 하락세가 뚜렷할수록 위험 급증
 * - 만족도(s)가 낮을수록 위험 가속
 */
const calculateChurnRisk = (interactions, currentS) => {
  if (!interactions.length) return 0;
  
  const alpha = 1.5; // 만족도 가중치
  let weightedSum = 0;
  
  interactions.forEach((interaction, idx) => {
    const weight = Math.pow(1.2, idx); // 최근 데이터 가중치
    const deltaM = interaction.mChange || 0;
    weightedSum += weight * Math.abs(deltaM);
  });
  
  const risk = weightedSum / Math.pow(Math.max(currentS, 0.1), alpha);
  return Math.min(Math.max(risk / 100, 0), 1); // Normalize to 0-1
};

/**
 * V-Index 계산
 * V = (M - T) × (1 + s)^t
 */
const calculateVIndex = (revenue, cost, sIndex, months) => {
  const profit = revenue - cost;
  return profit * Math.pow(1 + sIndex, months / 12);
};

// ============================================
// MOCK DATA
// ============================================

const generateMonopolyMetrics = () => ({
  // 인지 독점
  perception: {
    dailyTags: 847,
    uniqueInsights: 156,
    psychSwitches: 23,
    dataQuality: 0.94,
  },
  // 판단 독점
  prediction: {
    accuracy: 0.87,
    prevented: 12,
    totalSaved: 45600000,
    activePredictions: 8,
  },
  // 구조 독점
  pipeline: {
    krNodes: 156,
    phNodes: 45,
    syncLatency: 0.8, // seconds
    crossBorderFlow: 125000000, // KRW equivalent
  },
});

const generateLiveInteractions = () => [
  { id: 1, time: '방금', teacher: '이선생', student: '오연우', tags: ['s:-20', 'M:-10'], insight: '목소리 떨림 감지', risk: 'high' },
  { id: 2, time: '5분 전', teacher: '김선생', student: '박지민', tags: ['s:+15', 'M:+5'], insight: '적극적 질문', risk: 'low' },
  { id: 3, time: '12분 전', teacher: '박선생', student: '김민지', tags: ['비용 언급'], insight: '재정적 압박 신호', risk: 'medium' },
  { id: 4, time: '20분 전', teacher: '최선생', student: '이준혁', tags: ['s:-5'], insight: '집중력 저하', risk: 'low' },
];

const generatePredictions = () => [
  { id: 'PRED-001', student: '오연우', riskScore: 0.82, daysToChurn: 14, shadowAction: '긍정 리포트 발송 예정', status: 'critical' },
  { id: 'PRED-002', student: '김민지', riskScore: 0.65, daysToChurn: 28, shadowAction: '할인 프로모션 준비', status: 'warning' },
  { id: 'PRED-003', student: '이준혁', riskScore: 0.48, daysToChurn: 45, shadowAction: '담당 변경 검토', status: 'watch' },
];

const generateGlobalFlow = () => ({
  korea: { revenue: 285000000, cost: 180000000, sIndex: 0.72, vIndex: 2690000000 },
  clark: { revenue: 45000000, cost: 20000000, sIndex: 0.85, vIndex: 943000000, taxSaved: 11250000 },
  syncEvents: [
    { from: 'PH', to: 'KR', type: 'perception', amount: '2.4MB', time: '실시간' },
    { from: 'KR', to: 'PH', type: 'command', amount: '12KB', time: '실시간' },
    { from: 'PH', to: 'KR', type: 'v_delta', amount: '₩125M', time: '5분 전' },
  ],
});

// ============================================
// VECTOR TAG SYSTEM
// ============================================

const VECTOR_TAGS = [
  // Satisfaction (s) tags
  { id: 's+20', label: '매우 만족', icon: '😊', color: 'emerald', delta: '+20' },
  { id: 's+10', label: '만족', icon: '🙂', color: 'green', delta: '+10' },
  { id: 's-10', label: '불만족', icon: '😐', color: 'yellow', delta: '-10' },
  { id: 's-20', label: '매우 불만', icon: '😟', color: 'red', delta: '-20' },
  // Mass (M) tags
  { id: 'M+15', label: '성과 향상', icon: '📈', color: 'cyan', delta: '+15' },
  { id: 'M+5', label: '소폭 향상', icon: '↗️', color: 'blue', delta: '+5' },
  { id: 'M-5', label: '소폭 하락', icon: '↘️', color: 'orange', delta: '-5' },
  { id: 'M-15', label: '성과 하락', icon: '📉', color: 'red', delta: '-15' },
  // Psychological switches
  { id: 'psych_praise', label: '칭찬 반응', icon: '👏', color: 'purple', type: 'psych' },
  { id: 'psych_compete', label: '경쟁 자극', icon: '🏆', color: 'yellow', type: 'psych' },
  { id: 'psych_fear', label: '불안 신호', icon: '⚠️', color: 'red', type: 'psych' },
  { id: 'psych_cost', label: '비용 민감', icon: '💰', color: 'orange', type: 'psych' },
];

// ============================================
// SUB COMPONENTS
// ============================================

// Monopoly Status Header
const MonopolyStatus = memo(function MonopolyStatus({ metrics }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Perception */}
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">👁️</span>
          <span className="text-purple-400 font-medium">인지 독점</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">일일 태그</p>
            <p className="text-white font-bold">{metrics.perception.dailyTags}</p>
          </div>
          <div>
            <p className="text-gray-500">심리 스위치</p>
            <p className="text-purple-400 font-bold">{metrics.perception.psychSwitches}</p>
          </div>
        </div>
      </div>

      {/* Prediction */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🎯</span>
          <span className="text-cyan-400 font-medium">판단 독점</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">예측 정확도</p>
            <p className="text-white font-bold">{(metrics.prediction.accuracy * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-gray-500">이탈 방지</p>
            <p className="text-emerald-400 font-bold">{metrics.prediction.prevented}명</p>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🌐</span>
          <span className="text-emerald-400 font-medium">구조 독점</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">글로벌 노드</p>
            <p className="text-white font-bold">{metrics.pipeline.krNodes + metrics.pipeline.phNodes}</p>
          </div>
          <div>
            <p className="text-gray-500">동기화 지연</p>
            <p className="text-emerald-400 font-bold">{metrics.pipeline.syncLatency}초</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// Vector Tag Input (Quick-Tag UI)
const VectorTagInput = memo(function VectorTagInput({ onTag }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [student, setStudent] = useState('');

  const handleTagClick = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag.id) 
        ? prev.filter(t => t !== tag.id)
        : [...prev, tag.id]
    );
  };

  const handleSubmit = () => {
    if (student && selectedTags.length > 0) {
      onTag({ student, tags: selectedTags });
      setSelectedTags([]);
      setStudent('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Student Input */}
      <input
        type="text"
        value={student}
        onChange={(e) => setStudent(e.target.value)}
        placeholder="학생 이름 입력..."
        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none"
      />

      {/* Tag Grid */}
      <div className="grid grid-cols-4 gap-2">
        {VECTOR_TAGS.map(tag => (
          <motion.button
            key={tag.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTagClick(tag)}
            className={`p-2 rounded-xl border transition-all text-center ${
              selectedTags.includes(tag.id)
                ? `bg-${tag.color}-500/30 border-${tag.color}-500`
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
            }`}
          >
            <span className="text-lg block">{tag.icon}</span>
            <span className="text-xs text-gray-400">{tag.label}</span>
            {tag.delta && (
              <span className={`text-[10px] ${tag.delta.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                {tag.delta}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!student || selectedTags.length === 0}
        className={`w-full p-3 rounded-xl font-medium transition-colors ${
          student && selectedTags.length > 0
            ? 'bg-purple-500 text-white hover:bg-purple-600'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        👁️ 인지 데이터 저장
      </button>
    </div>
  );
});

// Live Interaction Feed
const LiveInteractionFeed = memo(function LiveInteractionFeed({ interactions }) {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {interactions.map(item => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-3 rounded-xl border ${
            item.risk === 'high' ? 'bg-red-500/10 border-red-500/30' :
            item.risk === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-gray-800/50 border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-white text-sm">{item.teacher} → {item.student}</span>
            <span className="text-gray-500 text-xs">{item.time}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                {tag}
              </span>
            ))}
            <span className="text-gray-400 text-xs ml-auto">{item.insight}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

// Prediction Engine Display
const PredictionEngine = memo(function PredictionEngine({ predictions }) {
  return (
    <div className="space-y-3">
      {predictions.map(pred => (
        <div
          key={pred.id}
          className={`p-4 rounded-xl border ${
            pred.status === 'critical' ? 'bg-red-500/10 border-red-500/30' :
            pred.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-gray-800/50 border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                pred.status === 'critical' ? 'bg-red-500 animate-pulse' :
                pred.status === 'warning' ? 'bg-yellow-500' : 'bg-gray-500'
              }`} />
              <span className="text-white font-medium">{pred.student}</span>
            </div>
            <span className={`text-lg font-bold ${
              pred.riskScore > 0.7 ? 'text-red-400' :
              pred.riskScore > 0.5 ? 'text-yellow-400' : 'text-emerald-400'
            }`}>
              {(pred.riskScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              예상 이탈: <span className="text-red-400">{pred.daysToChurn}일</span>
            </span>
            <span className="text-cyan-400 text-xs">🤖 {pred.shadowAction}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

// Global Flow Visualization
const GlobalFlowViz = memo(function GlobalFlowViz({ flow }) {
  const totalV = flow.korea.vIndex + flow.clark.vIndex * 24.5;
  
  return (
    <div className="space-y-4">
      {/* Nodes */}
      <div className="grid grid-cols-2 gap-4">
        {/* Korea */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span>🇰🇷</span>
            <span className="text-blue-400 font-medium">한국 본사</span>
          </div>
          <p className="text-white font-bold text-lg">₩{(flow.korea.vIndex / 1e9).toFixed(2)}B</p>
          <p className="text-gray-500 text-xs">V-Index</p>
        </div>

        {/* Clark */}
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span>🇵🇭</span>
            <span className="text-purple-400 font-medium">Clark Hub</span>
          </div>
          <p className="text-white font-bold text-lg">₩{((flow.clark.vIndex * 24.5) / 1e9).toFixed(2)}B</p>
          <p className="text-emerald-400 text-xs">Tax Saved: ₩{(flow.clark.taxSaved / 1e6).toFixed(0)}M</p>
        </div>
      </div>

      {/* Sync Events */}
      <div className="space-y-1">
        {flow.syncEvents.map((event, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-800/50 rounded-lg">
            <span className="text-gray-400">
              {event.from === 'PH' ? '🇵🇭' : '🇰🇷'} → {event.to === 'PH' ? '🇵🇭' : '🇰🇷'}
            </span>
            <span className={`px-2 py-0.5 rounded ${
              event.type === 'perception' ? 'bg-purple-500/20 text-purple-400' :
              event.type === 'v_delta' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-cyan-500/20 text-cyan-400'
            }`}>
              {event.type}
            </span>
            <span className="text-gray-500">{event.amount}</span>
            <span className="text-emerald-400">{event.time}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30 text-center">
        <p className="text-gray-400 text-sm">통합 V-Index</p>
        <p className="text-3xl font-bold text-emerald-400">₩{(totalV / 1e9).toFixed(2)}B</p>
      </div>
    </div>
  );
});

// Physics Formula Display
const PhysicsFormula = memo(function PhysicsFormula() {
  return (
    <div className="p-4 bg-gray-900/80 rounded-xl border border-purple-500/30">
      <h4 className="text-purple-400 font-medium mb-3">🔬 KRATON Physics Engine</h4>
      
      <div className="space-y-4 font-mono text-sm">
        {/* Risk Formula */}
        <div>
          <p className="text-gray-500 text-xs mb-1">이탈 위험도</p>
          <p className="text-cyan-400">
            R(t) = Σ(w<sub>i</sub> × ΔM<sub>i</sub>) / s(t)<sup>α</sup>
          </p>
        </div>

        {/* V-Index Formula */}
        <div>
          <p className="text-gray-500 text-xs mb-1">V-Index 계산</p>
          <p className="text-emerald-400">
            V = (M - T) × (1 + s)<sup>t</sup>
          </p>
        </div>

        {/* Performance Formula */}
        <div>
          <p className="text-gray-500 text-xs mb-1">퍼포먼스 공식</p>
          <p className="text-yellow-400">
            P = (M × I × A) / R
          </p>
        </div>
      </div>
    </div>
  );
});

// Monopoly Moat Indicator
const MoatIndicator = memo(function MoatIndicator() {
  const moats = [
    { name: '관계 데이터', level: 85, color: 'purple' },
    { name: '예측 알고리즘', level: 78, color: 'cyan' },
    { name: '글로벌 파이프', level: 72, color: 'emerald' },
  ];

  return (
    <div className="p-4 bg-gray-800/50 rounded-xl">
      <h4 className="text-white font-medium mb-3">🏰 기술적 해자 (Moat)</h4>
      <div className="space-y-3">
        {moats.map(moat => (
          <div key={moat.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{moat.name}</span>
              <span className={`text-${moat.color}-400`}>{moat.level}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${moat.level}%` }}
                transition={{ duration: 1 }}
                className={`h-full bg-${moat.color}-500 rounded-full`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function KratonMonopoly() {
  const [metrics] = useState(generateMonopolyMetrics);
  const [interactions, setInteractions] = useState(generateLiveInteractions);
  const [predictions] = useState(generatePredictions);
  const [globalFlow] = useState(generateGlobalFlow);

  // Handle new tag
  const handleNewTag = useCallback((data) => {
    const newInteraction = {
      id: Date.now(),
      time: '방금',
      teacher: '나',
      student: data.student,
      tags: data.tags,
      insight: 'AI 분석 중...',
      risk: data.tags.some(t => t.includes('-')) ? 'medium' : 'low',
    };
    setInteractions(prev => [newInteraction, ...prev.slice(0, 3)]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🏛️</span>
              KRATON Monopoly System
            </h1>
            <p className="text-gray-400 mt-1">독점 체제 - 인지 · 판단 · 구조</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/50 rounded-xl"
            >
              <span className="text-purple-400">⚡ 실시간 독점 가동 중</span>
            </motion.div>
          </div>
        </div>

        {/* Monopoly Status */}
        <MonopolyStatus metrics={metrics} />

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Column 1: Perception (인지 독점) */}
          <div className="space-y-4">
            <div className="bg-gray-800/30 rounded-xl border border-purple-500/30 p-4">
              <h3 className="text-purple-400 font-medium mb-4 flex items-center gap-2">
                <span>👁️</span> Vector Tagging
                <span className="ml-auto text-gray-500 text-xs">Quick-Tag UI</span>
              </h3>
              <VectorTagInput onTag={handleNewTag} />
            </div>

            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <span className="text-purple-400">📡</span> Live Feed
              </h3>
              <LiveInteractionFeed interactions={interactions} />
            </div>
          </div>

          {/* Column 2: Prediction (판단 독점) */}
          <div className="space-y-4">
            <div className="bg-gray-800/30 rounded-xl border border-cyan-500/30 p-4">
              <h3 className="text-cyan-400 font-medium mb-4 flex items-center gap-2">
                <span>🎯</span> FSD Prediction Engine
                <span className="ml-auto text-emerald-400 text-xs">
                  정확도 {(metrics.prediction.accuracy * 100).toFixed(0)}%
                </span>
              </h3>
              <PredictionEngine predictions={predictions} />
            </div>

            <PhysicsFormula />
          </div>

          {/* Column 3: Pipeline (구조 독점) */}
          <div className="space-y-4">
            <div className="bg-gray-800/30 rounded-xl border border-emerald-500/30 p-4">
              <h3 className="text-emerald-400 font-medium mb-4 flex items-center gap-2">
                <span>🌐</span> Global Pipeline
                <span className="ml-auto text-cyan-400 text-xs">
                  {metrics.pipeline.syncLatency}s 동기화
                </span>
              </h3>
              <GlobalFlowViz flow={globalFlow} />
            </div>

            <MoatIndicator />
          </div>
        </div>

        {/* Bottom: Monopoly Value */}
        <div className="bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-emerald-500/10 rounded-xl border border-purple-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">🏛️ KRATON 독점 가치</h3>
              <p className="text-gray-400 text-sm">
                타사가 복제할 수 없는 데이터 자산 · 예측 알고리즘 · 글로벌 인프라
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">추정 독점 가치</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                ₩12.8B
              </p>
              <p className="text-emerald-400 text-xs">+₩2.4B/년 복리 성장</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
