/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👑 Monopoly Dashboard V2 - C-Level Console
 * 3대 독점 체제 통합 모니터링
 * 
 * V = (M - T) × (1 + s)^t
 * R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
 * P = (M × I × A) / R
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock 데이터
const MOCK_DATA = {
  v_index: {
    v_index: 3630000000,
    net_value: 105000000,
    compound_multiplier: 34.57,
    breakdown: { mint: 285000000, tax: 180000000, satisfaction: 0.82, time_months: 12 },
    prediction: { v_3months: 4200000000, v_6months: 4850000000, v_12months: 6500000000 },
  },
  perception: {
    tags_today: 24,
    tag_rate: '24 tags/day',
    positive_ratio: 67,
    negative_ratio: 33,
    recent_tags: [
      { id: 1, target: '김민수', emotion: 15, time: '10분 전' },
      { id: 2, target: '이서연', emotion: 20, time: '25분 전' },
      { id: 3, target: '박지훈', emotion: -12, time: '40분 전' },
    ],
  },
  judgment: {
    accuracy: 87,
    active_predictions: 3,
    resolved_predictions: 15,
    avg_response_time: '4.2시간',
    by_priority: { critical: 1, high: 1, medium: 1 },
  },
  structure: {
    sync_latency: '2.5s',
    nodes_connected: 2,
    automation_rate: 85,
    workflows_active: 6,
  },
  global: {
    korea: { v_index: 3630000000, currency: 'KRW' },
    philippines: { v_index: 65340000, currency: 'PHP' },
  },
  recent_events: [
    { id: 1, action: 'quick_tag', content: '학생 태깅: 감정 +15', delta_v: 0.1, time: new Date(Date.now() - 5 * 60 * 1000).toISOString(), role: 'optimus' },
    { id: 2, action: 'risk_resolve', content: '위험 해결: 박지훈', delta_v: 0.2, time: new Date(Date.now() - 15 * 60 * 1000).toISOString(), role: 'fsd' },
    { id: 3, action: 'chemistry_match', content: '궁합 매칭: 85점', delta_v: 0.15, time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), role: 'fsd' },
  ],
};

// V-Index 카드 컴포넌트
const VIndexCard = memo(function VIndexCard({ data }) {
  const growthPct = Math.round((data.prediction.v_3months - data.v_index) / data.v_index * 100);
  
  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 rounded-2xl border border-purple-500/30 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">Total V-Index</p>
          <motion.p
            key={data.v_index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-white mt-2"
          >
            ₩{(data.v_index / 1e9).toFixed(2)}B
          </motion.p>
          <p className="text-emerald-400 text-sm mt-2 flex items-center gap-1">
            <span>↑</span>
            <span>+{growthPct}% 예상 (3개월)</span>
          </p>
        </div>
        
        <div className="text-right space-y-1">
          <p className="text-gray-500 text-xs font-mono">V = (M - T) × (1 + s)^t</p>
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-gray-400">
              M: <span className="text-white">₩{(data.breakdown.mint / 1e6).toFixed(0)}M</span>
            </p>
            <p className="text-gray-400">
              T: <span className="text-white">₩{(data.breakdown.tax / 1e6).toFixed(0)}M</span>
            </p>
            <p className="text-gray-400">
              s: <span className="text-emerald-400">{(data.breakdown.satisfaction * 100).toFixed(1)}%</span>
            </p>
            <p className="text-gray-400">
              t: <span className="text-white">{data.breakdown.time_months}개월</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* 예측 바 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { label: '3개월', value: data.prediction.v_3months },
          { label: '6개월', value: data.prediction.v_6months },
          { label: '12개월', value: data.prediction.v_12months },
        ].map(pred => (
          <div key={pred.label} className="text-center">
            <p className="text-xs text-gray-500">{pred.label}</p>
            <p className="text-sm font-bold text-purple-400">₩{(pred.value / 1e9).toFixed(2)}B</p>
          </div>
        ))}
      </div>
    </div>
  );
});

// 독점 카드 컴포넌트
const MonopolyCard = memo(function MonopolyCard({ title, emoji, description, children, borderColor = 'gray' }) {
  return (
    <div className={`bg-gray-800/50 rounded-2xl border border-${borderColor}-500/30 p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{emoji}</span>
        <div>
          <h3 className="text-white font-bold">{title}</h3>
          <p className="text-gray-500 text-xs">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
});

// 라이브 피드 아이템
const LiveFeedItem = memo(function LiveFeedItem({ event, index }) {
  const timeAgo = getTimeAgo(event.time);
  const roleColors = {
    optimus: 'cyan',
    fsd: 'purple',
    c_level: 'yellow',
  };
  const color = roleColors[event.role] || 'gray';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl text-sm"
    >
      <span className={`text-${event.delta_v > 0 ? 'emerald' : 'red'}-400`}>
        {event.delta_v > 0 ? '↑' : '↓'}
      </span>
      <span className={`px-2 py-0.5 rounded text-xs bg-${color}-900/30 text-${color}-400`}>
        {event.role}
      </span>
      <span className="text-gray-400 flex-1 truncate">{event.content}</span>
      <span className="text-gray-600 text-xs whitespace-nowrap">{timeAgo}</span>
    </motion.div>
  );
});

// 시간 경과 계산
function getTimeAgo(dateString) {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return new Date(dateString).toLocaleDateString('ko-KR');
}

// 메인 컴포넌트
export default function MonopolyDashboardV2({ orgId = 'demo' }) {
  const [data, setData] = useState(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 데이터 갱신 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      // 실시간 업데이트 시뮬레이션
      setData(prev => ({
        ...prev,
        v_index: {
          ...prev.v_index,
          v_index: prev.v_index.v_index + Math.floor(Math.random() * 1000000),
        },
        perception: {
          ...prev.perception,
          tags_today: prev.perception.tags_today + (Math.random() > 0.7 ? 1 : 0),
        },
      }));
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSyncing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-pulse">👑</span>
          <p className="text-gray-500 mt-4">Loading Monopoly System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            👑 Monopoly Dashboard
            <span className="text-sm font-normal text-gray-500">C-Level</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm">3대 독점 체제 통합 모니터링</p>
        </div>
        
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${isSyncing
              ? 'bg-gray-700 text-gray-500'
              : 'bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30'}
          `}
        >
          {isSyncing ? '⏳ 동기화 중...' : '🔄 글로벌 동기화'}
        </button>
      </div>

      {/* V-Index Overview */}
      <VIndexCard data={data.v_index} />

      {/* 3 Monopoly Grid */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        {/* 인지 독점 */}
        <MonopolyCard
          title="인지 독점"
          emoji="👁️"
          description="Perception Monopoly"
          borderColor="cyan"
        >
          <div className="space-y-4">
            <div>
              <p className="text-gray-500 text-sm">Vector Tag</p>
              <p className="text-2xl font-bold text-cyan-400">{data.perception.tag_rate}</p>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-emerald-900/20 rounded-lg text-center">
                <p className="text-emerald-400 font-bold">{data.perception.positive_ratio}%</p>
                <p className="text-xs text-gray-500">긍정</p>
              </div>
              <div className="flex-1 p-2 bg-red-900/20 rounded-lg text-center">
                <p className="text-red-400 font-bold">{data.perception.negative_ratio}%</p>
                <p className="text-xs text-gray-500">부정</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <p className="text-gray-500 text-sm mb-2">최근 태그</p>
              <div className="space-y-2">
                {data.perception.recent_tags.map((tag) => (
                  <div key={tag.id} className="text-xs text-gray-400 flex items-center gap-2">
                    <span>{tag.emotion > 0 ? '😊' : '😟'}</span>
                    <span>{tag.target}</span>
                    <span className={tag.emotion > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {tag.emotion > 0 ? '+' : ''}{tag.emotion}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MonopolyCard>

        {/* 판단 독점 */}
        <MonopolyCard
          title="판단 독점"
          emoji="🎯"
          description="Judgment Monopoly"
          borderColor="purple"
        >
          <div className="space-y-4">
            <div>
              <p className="text-gray-500 text-sm">FSD 예측 정확도</p>
              <p className="text-2xl font-bold text-emerald-400">{data.judgment.accuracy}%</p>
            </div>
            
            <div>
              <p className="text-gray-500 text-sm">활성 예측</p>
              <p className="text-xl font-bold text-white">{data.judgment.active_predictions}건</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-red-900/20 rounded-lg text-center">
                <p className="text-red-400 font-bold text-sm">{data.judgment.by_priority.critical}</p>
                <p className="text-xs text-gray-600">CRITICAL</p>
              </div>
              <div className="p-2 bg-orange-900/20 rounded-lg text-center">
                <p className="text-orange-400 font-bold text-sm">{data.judgment.by_priority.high}</p>
                <p className="text-xs text-gray-600">HIGH</p>
              </div>
              <div className="p-2 bg-yellow-900/20 rounded-lg text-center">
                <p className="text-yellow-400 font-bold text-sm">{data.judgment.by_priority.medium}</p>
                <p className="text-xs text-gray-600">MEDIUM</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 font-mono">
                R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
              </p>
            </div>
          </div>
        </MonopolyCard>

        {/* 구조 독점 */}
        <MonopolyCard
          title="구조 독점"
          emoji="🌐"
          description="Structure Monopoly"
          borderColor="yellow"
        >
          <div className="space-y-4">
            <div>
              <p className="text-gray-500 text-sm">Global Sync Latency</p>
              <p className="text-2xl font-bold text-yellow-400">{data.structure.sync_latency}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-900/50 rounded-lg text-center">
                <p className="text-white font-bold">{data.structure.nodes_connected}</p>
                <p className="text-xs text-gray-500">노드</p>
              </div>
              <div className="p-2 bg-gray-900/50 rounded-lg text-center">
                <p className="text-emerald-400 font-bold">{data.structure.automation_rate}%</p>
                <p className="text-xs text-gray-500">자동화</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <div className="text-center">
                  <p className="text-2xl">🇰🇷</p>
                  <p className="text-white font-bold text-xs mt-1">
                    ₩{(data.global.korea.v_index / 1e9).toFixed(2)}B
                  </p>
                </div>
                <div className="flex items-center text-gray-600">
                  <span>⟷</span>
                </div>
                <div className="text-center">
                  <p className="text-2xl">🇵🇭</p>
                  <p className="text-white font-bold text-xs mt-1">
                    ₱{(data.global.philippines.v_index / 1e6).toFixed(1)}M
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MonopolyCard>
      </div>

      {/* Physics Engine */}
      <div className="mt-6 bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔬</span>
          <h3 className="text-white font-bold">KRATON Physics Engine</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-900/50 rounded-xl">
            <p className="text-gray-500 text-sm mb-2">이탈 위험도</p>
            <code className="text-cyan-400 text-sm">
              R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
            </code>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-xl">
            <p className="text-gray-500 text-sm mb-2">V-Index</p>
            <code className="text-purple-400 text-sm">
              V = (M - T) × (1 + s)^t
            </code>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-xl">
            <p className="text-gray-500 text-sm mb-2">퍼포먼스</p>
            <code className="text-emerald-400 text-sm">
              P = (M × I × A) / R
            </code>
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="mt-6 bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Live Feed
        </h3>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {data.recent_events.map((event, i) => (
            <LiveFeedItem key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
