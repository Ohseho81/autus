/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 KRATON Viral Velocity
 * 고객 추천/확산 속도 측정 시스템
 * 한 명의 만족한 고객이 다른 고객을 끌어오는 '관계의 확장 속도' 측정
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA GENERATORS
// ============================================

const generateViralMetrics = () => ({
  viralCoefficient: 1.32,
  avgReferrals: 2.4,
  referralConversionRate: 0.68,
  organicGrowthRate: 0.15,
  paidGrowthRate: 0.08,
  wordOfMouthScore: 87,
  nps: 72,
  totalReferrals: 156,
  successfulReferrals: 106,
  pendingReferrals: 23,
  monthlyNewFromReferral: 34,
  referralLTV: 4200000,
  acquisitionCost: 0,
});

const generateReferralChain = () => [
  {
    id: 'REF-001',
    source: { name: '김서연', id: 'STU-0234', joinDate: '2023-06' },
    referrals: [
      { name: '박지민', id: 'STU-0567', status: 'active', joinDate: '2024-01', ltv: 1280000 },
      { name: '이하은', id: 'STU-0891', status: 'active', joinDate: '2024-03', ltv: 960000 },
      { name: '최준서', id: 'STU-1023', status: 'pending', joinDate: null, ltv: 0 },
    ],
    totalLTV: 2240000,
    chainDepth: 2,
  },
  {
    id: 'REF-002',
    source: { name: '오연우', id: 'STU-2013', joinDate: '2024-03' },
    referrals: [
      { name: '강예은', id: 'STU-2156', status: 'active', joinDate: '2024-06', ltv: 640000 },
    ],
    totalLTV: 640000,
    chainDepth: 1,
  },
  {
    id: 'REF-003',
    source: { name: '장민호', id: 'STU-1567', joinDate: '2023-09' },
    referrals: [
      { name: '윤서아', id: 'STU-1789', status: 'active', joinDate: '2024-02', ltv: 1120000 },
      { name: '한지우', id: 'STU-1890', status: 'active', joinDate: '2024-04', ltv: 800000 },
      { name: '임도윤', id: 'STU-2001', status: 'active', joinDate: '2024-05', ltv: 640000 },
      { name: '송하린', id: 'STU-2234', status: 'pending', joinDate: null, ltv: 0 },
    ],
    totalLTV: 2560000,
    chainDepth: 3,
  },
];

const generateViralTrend = () => {
  const data = [];
  let coefficient = 0.8;
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    coefficient += (Math.random() * 0.1 - 0.02);
    data.push({
      month: date.toLocaleDateString('ko-KR', { month: 'short' }),
      coefficient: Math.max(0.5, coefficient),
      referrals: Math.floor(8 + Math.random() * 20),
      conversions: Math.floor(5 + Math.random() * 15),
    });
  }
  return data;
};

const generateTopReferrers = () => [
  { rank: 1, name: '장민호', referrals: 4, conversions: 3, ltv: 2560000, badge: '🥇' },
  { rank: 2, name: '김서연', referrals: 3, conversions: 2, ltv: 2240000, badge: '🥈' },
  { rank: 3, name: '박지훈', referrals: 3, conversions: 3, ltv: 1920000, badge: '🥉' },
  { rank: 4, name: '이수민', referrals: 2, conversions: 2, ltv: 1280000, badge: '' },
  { rank: 5, name: '최유진', referrals: 2, conversions: 1, ltv: 640000, badge: '' },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (value) => {
  if (value >= 1e6) return `₩${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `₩${(value / 1e3).toFixed(0)}K`;
  return `₩${value.toLocaleString()}`;
};

// ============================================
// SUB COMPONENTS
// ============================================

// Viral Coefficient Gauge
const ViralGauge = memo(function ViralGauge({ coefficient }) {
  const isViral = coefficient >= 1;
  const percentage = Math.min((coefficient / 2) * 100, 100);
  
  return (
    <div className="relative w-48 h-48">
      {/* Background Circle */}
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <motion.circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={isViral ? '#10b981' : '#f59e0b'}
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ strokeDashoffset: 283 }}
          animate={{ strokeDashoffset: 283 - (283 * percentage / 100) }}
          style={{ strokeDasharray: 283 }}
          transition={{ duration: 1.5 }}
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${isViral ? 'text-emerald-400' : 'text-yellow-400'}`}>
          {coefficient.toFixed(2)}
        </span>
        <span className="text-gray-400 text-sm">Viral Coefficient</span>
        {isViral && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-emerald-400 text-xs mt-1"
          >
            🚀 Viral Growth!
          </motion.span>
        )}
      </div>
    </div>
  );
});

// Viral Metrics Cards
const ViralMetrics = memo(function ViralMetrics({ metrics }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">추천 전환율</span>
          <span className="text-xl">🎯</span>
        </div>
        <p className="text-2xl font-bold text-cyan-400">
          {(metrics.referralConversionRate * 100).toFixed(0)}%
        </p>
        <p className="text-gray-500 text-xs">추천 → 등록</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">이번 달 추천 등록</span>
          <span className="text-xl">👥</span>
        </div>
        <p className="text-2xl font-bold text-purple-400">{metrics.monthlyNewFromReferral}명</p>
        <p className="text-gray-500 text-xs">신규 학생</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">NPS</span>
          <span className="text-xl">📊</span>
        </div>
        <p className={`text-2xl font-bold ${metrics.nps >= 50 ? 'text-emerald-400' : 'text-yellow-400'}`}>
          {metrics.nps}
        </p>
        <p className="text-gray-500 text-xs">추천 의향 지수</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">추천 LTV</span>
          <span className="text-xl">💰</span>
        </div>
        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.referralLTV)}</p>
        <p className="text-gray-500 text-xs">추천 고객 총 가치</p>
      </div>
    </div>
  );
});

// Viral Trend Chart
const ViralTrendChart = memo(function ViralTrendChart({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const maxCoeff = Math.max(...data.map(d => d.coefficient));
    const minCoeff = Math.min(...data.map(d => d.coefficient));

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + ((height - padding * 2) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Viral threshold line (coefficient = 1.0)
    const thresholdY = height - padding - ((1.0 - minCoeff) / (maxCoeff - minCoeff)) * (height - padding * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, thresholdY);
    ctx.lineTo(width - padding, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#ef4444';
    ctx.font = '10px system-ui';
    ctx.fillText('Viral Threshold (1.0)', padding + 5, thresholdY - 5);

    // Area fill
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.coefficient - minCoeff) / (maxCoeff - minCoeff)) * (height - padding * 2);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.coefficient - minCoeff) / (maxCoeff - minCoeff)) * (height - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.coefficient - minCoeff) / (maxCoeff - minCoeff)) * (height - padding * 2);
      
      ctx.fillStyle = d.coefficient >= 1 ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px system-ui';
    data.forEach((d, i) => {
      if (i % 2 === 0) {
        const x = padding + ((width - padding * 2) * i) / (data.length - 1);
        ctx.fillText(d.month, x - 10, height - 10);
      }
    });

  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={200}
      className="w-full rounded-xl"
    />
  );
});

// Referral Chain Visualization
const ReferralChain = memo(function ReferralChain({ chain }) {
  return (
    <div className="space-y-4">
      {chain.map(item => (
        <div key={item.id} className="p-4 bg-gray-800/50 rounded-xl">
          {/* Source */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
              <span className="text-cyan-400 font-bold">
                {item.source.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{item.source.name}</p>
              <p className="text-gray-500 text-xs">{item.source.id} · {item.source.joinDate}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-cyan-400 font-mono">{formatCurrency(item.totalLTV)}</p>
              <p className="text-gray-500 text-xs">총 창출 가치</p>
            </div>
          </div>

          {/* Referrals */}
          <div className="ml-6 pl-4 border-l-2 border-gray-700 space-y-2">
            {item.referrals.map((ref, idx) => (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className={`w-2 h-2 rounded-full ${
                  ref.status === 'active' ? 'bg-emerald-400' : 'bg-yellow-400'
                }`} />
                <span className="text-gray-300">{ref.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  ref.status === 'active' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {ref.status === 'active' ? '등록 완료' : '대기 중'}
                </span>
                {ref.ltv > 0 && (
                  <span className="text-gray-500 text-xs ml-auto">
                    {formatCurrency(ref.ltv)}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

// Top Referrers Leaderboard
const TopReferrers = memo(function TopReferrers({ referrers }) {
  return (
    <div className="space-y-2">
      {referrers.map(r => (
        <div
          key={r.rank}
          className={`p-3 rounded-xl flex items-center justify-between ${
            r.rank <= 3 ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30' : 'bg-gray-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl w-8">{r.badge || `#${r.rank}`}</span>
            <div>
              <p className="text-white font-medium">{r.name}</p>
              <p className="text-gray-500 text-xs">{r.conversions}/{r.referrals} 전환</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-cyan-400 font-mono">{formatCurrency(r.ltv)}</p>
            <p className="text-gray-500 text-xs">창출 가치</p>
          </div>
        </div>
      ))}
    </div>
  );
});

// Growth Source Breakdown
const GrowthBreakdown = memo(function GrowthBreakdown({ metrics }) {
  const sources = [
    { label: '추천/입소문', value: metrics.organicGrowthRate + 0.12, color: 'emerald' },
    { label: '유료 마케팅', value: metrics.paidGrowthRate, color: 'blue' },
    { label: '직접 유입', value: 0.05, color: 'purple' },
  ];
  const total = sources.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-3">
      {sources.map(source => (
        <div key={source.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">{source.label}</span>
            <span className={`text-${source.color}-400`}>
              {((source.value / total) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(source.value / total) * 100}%` }}
              transition={{ duration: 1 }}
              className={`h-full bg-${source.color}-500 rounded-full`}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function ViralVelocity() {
  const [metrics] = useState(generateViralMetrics);
  const [chains] = useState(generateReferralChain);
  const [trend] = useState(generateViralTrend);
  const [topReferrers] = useState(generateTopReferrers);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🚀</span>
              Viral Velocity
            </h1>
            <p className="text-gray-400 mt-1">고객 추천/확산 속도 측정 시스템</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-xl">
              <span className="text-emerald-400">
                이번 달 추천 등록 <span className="font-bold">{metrics.monthlyNewFromReferral}명</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Viral Gauge */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6 flex flex-col items-center">
            <ViralGauge coefficient={metrics.viralCoefficient} />
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">
                1명이 평균 <span className="text-cyan-400 font-bold">{metrics.avgReferrals}명</span> 추천
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Coefficient ≥ 1.0 = 자연 성장
              </p>
            </div>
          </div>

          <div className="col-span-2 bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="text-emerald-400">📈</span>
              Viral Coefficient Trend (12개월)
            </h3>
            <ViralTrendChart data={trend} />
          </div>
        </div>

        {/* Metrics */}
        <ViralMetrics metrics={metrics} />

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Referral Chains */}
          <div className="col-span-2 bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="text-cyan-400">🔗</span>
              Referral Chain (추천 네트워크)
            </h3>
            <div className="max-h-[400px] overflow-y-auto">
              <ReferralChain chain={chains} />
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Top Referrers */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-yellow-400">🏆</span>
                Top Referrers
              </h3>
              <TopReferrers referrers={topReferrers} />
            </div>

            {/* Growth Breakdown */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-purple-400">📊</span>
                성장 원천 분석
              </h3>
              <GrowthBreakdown metrics={metrics} />
            </div>

            {/* Viral Stats */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30 p-4">
              <h3 className="text-emerald-400 font-medium mb-3 flex items-center gap-2">
                <span>💡</span>
                Viral Insight
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-white">
                  현재 <span className="text-emerald-400 font-bold">67%</span>의 신규 고객이 추천으로 유입
                </p>
                <p className="text-white">
                  추천 고객의 LTV가 직접 유입 대비 <span className="text-cyan-400 font-bold">42% 높음</span>
                </p>
                <p className="text-white">
                  추천 고객 획득 비용: <span className="text-emerald-400 font-bold">₩0</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
