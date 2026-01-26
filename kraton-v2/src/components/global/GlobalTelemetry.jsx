/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌏 KRATON Global Telemetry
 * 필리핀 클락 - 한국 본사 통합 대시보드
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA
// ============================================

const generateGlobalData = () => ({
  korea: {
    code: 'KR',
    name: '한국 본사',
    flag: '🇰🇷',
    currency: 'KRW',
    timezone: 'KST (UTC+9)',
    status: 'operational',
    metrics: {
      revenue: 2850000000,
      revenueGrowth: 0.12,
      students: 1245,
      teachers: 48,
      sIndexAvg: 0.72,
      churnRate: 0.08,
      vIndex: 2690000000,
      tSaved: 542,
    },
    costs: {
      labor: 850000000,
      facility: 320000000,
      marketing: 180000000,
      tax: 425000000,
      taxRate: 0.25,
    },
    nodes: 156,
    activeRelations: 892,
    riskNodes: 12,
  },
  philippines: {
    code: 'PH',
    name: '클락 PEZA Hub',
    flag: '🇵🇭',
    currency: 'PHP',
    timezone: 'PHT (UTC+8)',
    status: 'operational',
    metrics: {
      revenue: 45000000, // PHP
      revenueGrowth: 0.28,
      students: 0, // 운영 센터
      teachers: 0,
      operators: 24,
      sIndexAvg: 0.85,
      churnRate: 0.02,
      vIndex: 38500000,
      tSaved: 305,
    },
    costs: {
      labor: 12000000, // PHP
      facility: 8500000,
      marketing: 2500000,
      tax: 0, // PEZA 면세
      taxRate: 0,
    },
    pezaBenefits: {
      incomeTaxHoliday: 4, // years remaining
      dutyFree: true,
      vatExempt: true,
      taxSavings: 11250000, // PHP
    },
    nodes: 45,
    activeRelations: 128,
    riskNodes: 2,
  },
  exchangeRate: 24.5, // PHP to KRW
});

const generateVCurveHistory = () => {
  const data = [];
  let krV = 2500000000;
  let phV = 35000000;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    krV *= (1 + (Math.random() * 0.02 - 0.005));
    phV *= (1 + (Math.random() * 0.03 - 0.005));
    
    data.push({
      date: date.toISOString().split('T')[0],
      kr: krV,
      ph: phV,
      phKrw: phV * 24.5,
      total: krV + (phV * 24.5),
    });
  }
  return data;
};

const generateDataFlowEvents = () => [
  { id: 1, from: 'KR', to: 'PH', type: 'data_sync', size: '2.4MB', time: '2분 전', status: 'success' },
  { id: 2, from: 'PH', to: 'KR', type: 'report', size: '856KB', time: '5분 전', status: 'success' },
  { id: 3, from: 'KR', to: 'PH', type: 'config', size: '12KB', time: '15분 전', status: 'success' },
  { id: 4, from: 'PH', to: 'KR', type: 'metrics', size: '1.2MB', time: '30분 전', status: 'success' },
  { id: 5, from: 'KR', to: 'GLOBAL', type: 'backup', size: '45MB', time: '1시간 전', status: 'success' },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (value, currency = 'KRW') => {
  if (currency === 'KRW') {
    if (value >= 1e9) return `₩${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `₩${(value / 1e6).toFixed(1)}M`;
    return `₩${value.toLocaleString()}`;
  } else {
    if (value >= 1e6) return `₱${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `₱${(value / 1e3).toFixed(0)}K`;
    return `₱${value.toLocaleString()}`;
  }
};

const formatPercent = (value, showSign = true) => {
  const formatted = (value * 100).toFixed(1);
  if (showSign && value > 0) return `+${formatted}%`;
  return `${formatted}%`;
};

// ============================================
// SUB COMPONENTS
// ============================================

// 지역 상태 카드
const RegionCard = memo(function RegionCard({ region, data, exchangeRate, selected, onClick }) {
  const isKorea = region === 'korea';
  const krwValue = isKorea ? data.metrics.vIndex : data.metrics.vIndex * exchangeRate;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
        selected
          ? 'bg-cyan-500/20 border-cyan-500/50'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{data.flag}</span>
          <div>
            <h3 className="text-white font-bold text-lg">{data.name}</h3>
            <p className="text-gray-500 text-xs">{data.timezone}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs ${
          data.status === 'operational' 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          ● {data.status === 'operational' ? 'Operational' : 'Warning'}
        </div>
      </div>

      {/* V-Index */}
      <div className="mb-4 p-3 bg-gray-900/50 rounded-xl">
        <p className="text-gray-500 text-xs mb-1">V-Index</p>
        <p className="text-2xl font-bold text-cyan-400">{formatCurrency(krwValue)}</p>
        {!isKorea && (
          <p className="text-gray-500 text-xs">= {formatCurrency(data.metrics.vIndex, 'PHP')}</p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 bg-gray-900/30 rounded-lg text-center">
          <p className="text-emerald-400 font-mono">{formatPercent(data.metrics.revenueGrowth)}</p>
          <p className="text-gray-600 text-xs">매출 성장</p>
        </div>
        <div className="p-2 bg-gray-900/30 rounded-lg text-center">
          <p className={`font-mono ${data.metrics.churnRate < 0.1 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {formatPercent(data.metrics.churnRate, false)}
          </p>
          <p className="text-gray-600 text-xs">이탈률</p>
        </div>
        <div className="p-2 bg-gray-900/30 rounded-lg text-center">
          <p className="text-purple-400 font-mono">{data.nodes}</p>
          <p className="text-gray-600 text-xs">활성 노드</p>
        </div>
        <div className="p-2 bg-gray-900/30 rounded-lg text-center">
          <p className={`font-mono ${data.riskNodes > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
            {data.riskNodes}
          </p>
          <p className="text-gray-600 text-xs">위험 노드</p>
        </div>
      </div>

      {/* PEZA Benefits (Philippines only) */}
      {data.pezaBenefits && (
        <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30">
          <p className="text-emerald-400 text-xs font-medium mb-2">🏛️ PEZA Benefits Active</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500">소득세 면제</p>
              <p className="text-white">{data.pezaBenefits.incomeTaxHoliday}년 남음</p>
            </div>
            <div>
              <p className="text-gray-500">세금 절감</p>
              <p className="text-emerald-400">{formatCurrency(data.pezaBenefits.taxSavings * exchangeRate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tax Info (Korea) */}
      {isKorea && (
        <div className="p-3 bg-gray-900/30 rounded-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">법인세율</span>
            <span className="text-yellow-400">{formatPercent(data.costs.taxRate, false)}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-gray-500">예상 세금</span>
            <span className="text-red-400">{formatCurrency(data.costs.tax)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
});

// Global V-Curve Chart
const GlobalVCurve = memo(function GlobalVCurve({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const padding = 50;
    const maxV = Math.max(...data.map(d => d.total));
    const minV = Math.min(...data.map(d => d.total));

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + ((height - padding * 2) * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Korea area
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.kr - minV) / (maxV - minV)) * (height - padding * 2);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();

    // Philippines area (stacked)
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.kr - minV) / (maxV - minV)) * (height - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    data.slice().reverse().forEach((d, i) => {
      const x = padding + ((width - padding * 2) * (data.length - 1 - i)) / (data.length - 1);
      const y = height - padding - ((d.total - minV) / (maxV - minV)) * (height - padding * 2);
      ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.fill();

    // Total line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.total - minV) / (maxV - minV)) * (height - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Latest point
    const lastData = data[data.length - 1];
    const lastX = width - padding;
    const lastY = height - padding - ((lastData.total - minV) / (maxV - minV)) * (height - padding * 2);
    
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Legend
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(width - 150, 20, 12, 12);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Korea', width - 130, 30);

    ctx.fillStyle = '#a855f7';
    ctx.fillRect(width - 150, 40, 12, 12);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Philippines', width - 130, 50);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(width - 150, 60, 12, 12);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Total', width - 130, 70);

  }, [data]);

  return (
    <canvas 
      ref={canvasRef}
      width={800}
      height={300}
      className="w-full rounded-xl"
    />
  );
});

// Data Flow Visualization
const DataFlowMap = memo(function DataFlowMap({ events }) {
  return (
    <div className="relative h-48 bg-gray-900/50 rounded-xl overflow-hidden">
      {/* World Map Background (simplified) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <span className="text-[100px]">🗺️</span>
      </div>

      {/* Korea Node */}
      <div className="absolute left-[60%] top-[30%]">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 rounded-full bg-blue-500/30 border-2 border-blue-500 flex items-center justify-center"
        >
          <span className="text-xl">🇰🇷</span>
        </motion.div>
        <p className="text-xs text-gray-400 mt-1 text-center">Korea</p>
      </div>

      {/* Philippines Node */}
      <div className="absolute left-[55%] top-[55%]">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="w-12 h-12 rounded-full bg-purple-500/30 border-2 border-purple-500 flex items-center justify-center"
        >
          <span className="text-xl">🇵🇭</span>
        </motion.div>
        <p className="text-xs text-gray-400 mt-1 text-center">Clark</p>
      </div>

      {/* Connection Line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <motion.line
          x1="65%"
          y1="38%"
          x2="60%"
          y2="58%"
          stroke="url(#flowGradient)"
          strokeWidth="2"
          strokeDasharray="5,5"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </svg>

      {/* Data Flow Indicator */}
      <motion.div
        className="absolute w-3 h-3 bg-cyan-400 rounded-full"
        animate={{
          left: ['65%', '60%'],
          top: ['38%', '58%'],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
});

// Data Flow Events
const DataFlowEvents = memo(function DataFlowEvents({ events }) {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {events.map(event => (
        <div 
          key={event.id}
          className="p-2 bg-gray-800/50 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{event.from === 'KR' ? '🇰🇷' : event.from === 'PH' ? '🇵🇭' : '🌐'}</span>
            <span className="text-gray-600">→</span>
            <span className="text-sm">{event.to === 'KR' ? '🇰🇷' : event.to === 'PH' ? '🇵🇭' : '🌐'}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] ${
              event.type === 'data_sync' ? 'bg-blue-500/20 text-blue-400' :
              event.type === 'report' ? 'bg-purple-500/20 text-purple-400' :
              event.type === 'metrics' ? 'bg-cyan-500/20 text-cyan-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {event.type}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{event.size}</span>
            <span>{event.time}</span>
            <span className="text-emerald-400">✓</span>
          </div>
        </div>
      ))}
    </div>
  );
});

// Consolidated Financials
const ConsolidatedFinancials = memo(function ConsolidatedFinancials({ korea, philippines, exchangeRate }) {
  const phKrw = {
    revenue: philippines.metrics.revenue * exchangeRate,
    vIndex: philippines.metrics.vIndex * exchangeRate,
    laborCost: philippines.costs.labor * exchangeRate,
    taxSavings: philippines.pezaBenefits.taxSavings * exchangeRate,
  };

  const consolidated = {
    totalRevenue: korea.metrics.revenue + phKrw.revenue,
    totalVIndex: korea.metrics.vIndex + phKrw.vIndex,
    totalTax: korea.costs.tax, // Philippines = 0 due to PEZA
    taxSavings: phKrw.taxSavings,
    effectiveTaxRate: korea.costs.tax / (korea.metrics.revenue + phKrw.revenue),
  };

  return (
    <div className="space-y-4">
      <h4 className="text-white font-medium flex items-center gap-2">
        <span className="text-emerald-400">📊</span>
        연결 재무 (Consolidated)
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-800/50 rounded-xl">
          <p className="text-gray-500 text-xs">총 매출</p>
          <p className="text-xl font-bold text-white">{formatCurrency(consolidated.totalRevenue)}</p>
          <div className="mt-2 flex gap-2 text-[10px]">
            <span className="text-blue-400">KR: {formatCurrency(korea.metrics.revenue)}</span>
            <span className="text-purple-400">PH: {formatCurrency(phKrw.revenue)}</span>
          </div>
        </div>

        <div className="p-3 bg-gray-800/50 rounded-xl">
          <p className="text-gray-500 text-xs">총 V-Index</p>
          <p className="text-xl font-bold text-cyan-400">{formatCurrency(consolidated.totalVIndex)}</p>
          <div className="mt-2 flex gap-2 text-[10px]">
            <span className="text-blue-400">KR: {formatCurrency(korea.metrics.vIndex)}</span>
            <span className="text-purple-400">PH: {formatCurrency(phKrw.vIndex)}</span>
          </div>
        </div>
      </div>

      {/* Tax Optimization */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30">
        <h5 className="text-emerald-400 text-sm font-medium mb-3">💰 세무 최적화 효과</h5>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-gray-500 text-xs">실효 세율</p>
            <p className="text-lg font-bold text-emerald-400">
              {formatPercent(consolidated.effectiveTaxRate, false)}
            </p>
            <p className="text-[10px] text-gray-600">vs 25% 법정</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">PEZA 절감</p>
            <p className="text-lg font-bold text-emerald-400">
              {formatCurrency(consolidated.taxSavings)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">실제 납부</p>
            <p className="text-lg font-bold text-yellow-400">
              {formatCurrency(consolidated.totalTax)}
            </p>
          </div>
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="p-3 bg-gray-800/50 rounded-xl">
        <p className="text-gray-400 text-xs mb-2">인건비 비교 (동일 업무 기준)</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-400">🇰🇷 한국</span>
              <span className="text-white">{formatCurrency(korea.costs.labor / korea.metrics.teachers)}/인</span>
            </div>
            <div className="h-2 bg-blue-500/30 rounded-full" style={{ width: '100%' }} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-purple-400">🇵🇭 클락</span>
              <span className="text-white">{formatCurrency(phKrw.laborCost / philippines.metrics.operators)}/인</span>
            </div>
            <div className="h-2 bg-purple-500/30 rounded-full" style={{ width: '35%' }} />
          </div>
        </div>
        <p className="text-emerald-400 text-xs mt-2 text-right">
          인건비 65% 절감 효과
        </p>
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function GlobalTelemetry() {
  const [globalData] = useState(generateGlobalData);
  const [vCurveHistory] = useState(generateVCurveHistory);
  const [dataFlowEvents] = useState(generateDataFlowEvents);
  const [selectedRegion, setSelectedRegion] = useState('korea');
  const [isLive, setIsLive] = useState(true);

  // Consolidated metrics
  const consolidated = useMemo(() => {
    const phKrwVIndex = globalData.philippines.metrics.vIndex * globalData.exchangeRate;
    return {
      totalVIndex: globalData.korea.metrics.vIndex + phKrwVIndex,
      totalNodes: globalData.korea.nodes + globalData.philippines.nodes,
      totalRelations: globalData.korea.activeRelations + globalData.philippines.activeRelations,
      totalRiskNodes: globalData.korea.riskNodes + globalData.philippines.riskNodes,
      avgSIndex: (globalData.korea.metrics.sIndexAvg + globalData.philippines.metrics.sIndexAvg) / 2,
    };
  }, [globalData]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🌏</span>
              Global Telemetry
            </h1>
            <p className="text-gray-400 mt-1">
              필리핀 클락 - 한국 본사 통합 대시보드
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-gray-800 rounded-xl text-sm">
              <span className="text-gray-500">환율: </span>
              <span className="text-cyan-400 font-mono">₩{globalData.exchangeRate}/₱</span>
            </div>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                isLive 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {isLive ? '● Live' : '○ Paused'}
            </button>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">Global V-Index</p>
            <p className="text-2xl font-bold text-cyan-400">{formatCurrency(consolidated.totalVIndex)}</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">Total Nodes</p>
            <p className="text-2xl font-bold text-purple-400">{consolidated.totalNodes}</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">Active Relations</p>
            <p className="text-2xl font-bold text-blue-400">{consolidated.totalRelations}</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">Avg s-Index</p>
            <p className="text-2xl font-bold text-emerald-400">{formatPercent(consolidated.avgSIndex, false)}</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">Risk Nodes</p>
            <p className={`text-2xl font-bold ${consolidated.totalRiskNodes > 10 ? 'text-red-400' : 'text-emerald-400'}`}>
              {consolidated.totalRiskNodes}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Region Cards */}
          <div className="space-y-4">
            <RegionCard
              region="korea"
              data={globalData.korea}
              exchangeRate={globalData.exchangeRate}
              selected={selectedRegion === 'korea'}
              onClick={() => setSelectedRegion('korea')}
            />
            <RegionCard
              region="philippines"
              data={globalData.philippines}
              exchangeRate={globalData.exchangeRate}
              selected={selectedRegion === 'philippines'}
              onClick={() => setSelectedRegion('philippines')}
            />
          </div>

          {/* V-Curve & Data Flow */}
          <div className="col-span-2 space-y-4">
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-cyan-400">📈</span>
                Global V-Curve (30D)
              </h3>
              <GlobalVCurve data={vCurveHistory} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <span className="text-purple-400">🔗</span>
                  Data Flow Map
                </h3>
                <DataFlowMap events={dataFlowEvents} />
              </div>

              <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <span className="text-blue-400">📡</span>
                  Sync Events
                </h3>
                <DataFlowEvents events={dataFlowEvents} />
              </div>
            </div>
          </div>
        </div>

        {/* Consolidated Financials */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <ConsolidatedFinancials
            korea={globalData.korea}
            philippines={globalData.philippines}
            exchangeRate={globalData.exchangeRate}
          />
        </div>
      </div>
    </div>
  );
}
