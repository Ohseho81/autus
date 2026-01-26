/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 KRATON Performance Analytics
 * 전체 성과 분석 대시보드 - CEO 의사결정 지원
 * 조직의 모든 핵심 지표를 한눈에 파악
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA GENERATORS
// ============================================

const generateOverallMetrics = () => ({
  // Revenue
  monthlyRevenue: 285000000,
  revenueGrowth: 0.12,
  yearlyRevenue: 3420000000,
  
  // V-Index
  totalVIndex: 3630000000,
  vIndexGrowth: 0.18,
  
  // Students
  totalStudents: 245,
  newStudents: 34,
  churnedStudents: 8,
  netGrowth: 26,
  
  // Satisfaction
  avgSIndex: 0.72,
  sIndexTrend: 0.05,
  nps: 72,
  
  // Efficiency
  automationRate: 0.73,
  savedHours: 542,
  costReduction: 0.15,
  
  // Staff
  totalTeachers: 15,
  avgTeacherLoad: 16.3,
  topPerformerRate: 0.4,
});

const generateRevenueData = () => {
  const data = [];
  let revenue = 220000000;
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    revenue *= (1 + (Math.random() * 0.08 - 0.02));
    data.push({
      month: date.toLocaleDateString('ko-KR', { month: 'short' }),
      revenue: revenue,
      target: revenue * 0.95,
      vIndex: revenue * 1.2,
    });
  }
  return data;
};

const generateDepartmentPerformance = () => [
  { name: '수학반', students: 85, revenue: 98000000, sIndex: 0.78, growth: 0.15, color: 'cyan' },
  { name: '영어반', students: 72, revenue: 82000000, sIndex: 0.71, growth: 0.08, color: 'purple' },
  { name: '과학반', students: 48, revenue: 55000000, sIndex: 0.75, growth: 0.22, color: 'emerald' },
  { name: '국어반', students: 40, revenue: 50000000, sIndex: 0.68, growth: 0.05, color: 'yellow' },
];

const generateTeacherRanking = () => [
  { rank: 1, name: '김선생', students: 22, sIndex: 0.85, retention: 0.98, revenue: 25000000 },
  { rank: 2, name: '이선생', students: 20, sIndex: 0.82, retention: 0.95, revenue: 23000000 },
  { rank: 3, name: '박선생', students: 18, sIndex: 0.78, retention: 0.94, revenue: 21000000 },
  { rank: 4, name: '최선생', students: 17, sIndex: 0.75, retention: 0.92, revenue: 19000000 },
  { rank: 5, name: '정선생', students: 15, sIndex: 0.72, retention: 0.90, revenue: 17000000 },
];

const generateKPIProgress = () => [
  { name: '월 매출', current: 285, target: 300, unit: 'M', progress: 0.95 },
  { name: '신규 등록', current: 34, target: 40, unit: '명', progress: 0.85 },
  { name: '유지율', current: 92, target: 95, unit: '%', progress: 0.97 },
  { name: 's-Index', current: 72, target: 80, unit: '%', progress: 0.90 },
  { name: '자동화율', current: 73, target: 80, unit: '%', progress: 0.91 },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (value) => {
  if (value >= 1e9) return `₩${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `₩${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `₩${(value / 1e3).toFixed(0)}K`;
  return `₩${value.toLocaleString()}`;
};

const formatPercent = (value, showSign = true) => {
  const formatted = (value * 100).toFixed(1);
  if (showSign && value > 0) return `+${formatted}%`;
  return `${formatted}%`;
};

// ============================================
// SUB COMPONENTS
// ============================================

// Executive Summary Cards
const ExecutiveSummary = memo(function ExecutiveSummary({ metrics }) {
  const cards = [
    {
      title: '월 매출',
      value: formatCurrency(metrics.monthlyRevenue),
      change: metrics.revenueGrowth,
      icon: '💰',
      color: 'emerald',
    },
    {
      title: 'V-Index',
      value: formatCurrency(metrics.totalVIndex),
      change: metrics.vIndexGrowth,
      icon: '💎',
      color: 'cyan',
    },
    {
      title: '재원생',
      value: `${metrics.totalStudents}명`,
      change: metrics.netGrowth / metrics.totalStudents,
      subtext: `+${metrics.newStudents} / -${metrics.churnedStudents}`,
      icon: '👨‍🎓',
      color: 'purple',
    },
    {
      title: '평균 만족도',
      value: `${(metrics.avgSIndex * 100).toFixed(0)}%`,
      change: metrics.sIndexTrend,
      icon: '😊',
      color: 'yellow',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(card => (
        <motion.div
          key={card.title}
          whileHover={{ scale: 1.02 }}
          className={`p-5 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-${card.color}-500/50 transition-colors`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">{card.title}</span>
            <span className="text-2xl">{card.icon}</span>
          </div>
          <p className={`text-2xl font-bold text-${card.color}-400`}>{card.value}</p>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-sm ${card.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(card.change)}
            </span>
            {card.subtext && (
              <span className="text-gray-500 text-xs">{card.subtext}</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
});

// Revenue Chart
const RevenueChart = memo(function RevenueChart({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const padding = 50;
    const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.vIndex)));
    const minVal = Math.min(...data.map(d => d.revenue)) * 0.9;

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

    // Revenue bars
    const barWidth = (width - padding * 2) / data.length / 2;
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1) - barWidth / 2;
      const barHeight = ((d.revenue - minVal) / (maxVal - minVal)) * (height - padding * 2);
      const y = height - padding - barHeight;

      ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);
    });

    // V-Index line
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      const y = height - padding - ((d.vIndex - minVal) / (maxVal - minVal)) * (height - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px system-ui';
    data.forEach((d, i) => {
      const x = padding + ((width - padding * 2) * i) / (data.length - 1);
      ctx.fillText(d.month, x - 15, height - 15);
    });

    // Legend
    ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
    ctx.fillRect(width - 140, 15, 12, 12);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('매출', width - 120, 25);

    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(width - 140, 35, 12, 12);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('V-Index', width - 120, 45);

  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={250}
      className="w-full rounded-xl"
    />
  );
});

// Department Performance
const DepartmentPerformance = memo(function DepartmentPerformance({ departments }) {
  return (
    <div className="space-y-3">
      {departments.map(dept => (
        <div key={dept.name} className="p-3 bg-gray-800/50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full bg-${dept.color}-400`} />
              <span className="text-white font-medium">{dept.name}</span>
            </div>
            <span className={`text-sm ${dept.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(dept.growth)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-gray-500">학생</p>
              <p className="text-white">{dept.students}명</p>
            </div>
            <div>
              <p className="text-gray-500">매출</p>
              <p className="text-cyan-400">{formatCurrency(dept.revenue)}</p>
            </div>
            <div>
              <p className="text-gray-500">만족도</p>
              <p className={dept.sIndex >= 0.7 ? 'text-emerald-400' : 'text-yellow-400'}>
                {(dept.sIndex * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

// Teacher Ranking
const TeacherRanking = memo(function TeacherRanking({ teachers }) {
  return (
    <div className="space-y-2">
      {teachers.map(t => (
        <div
          key={t.rank}
          className={`p-3 rounded-xl flex items-center justify-between ${
            t.rank <= 3 ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30' : 'bg-gray-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg w-8 text-center">
              {t.rank === 1 ? '🥇' : t.rank === 2 ? '🥈' : t.rank === 3 ? '🥉' : `#${t.rank}`}
            </span>
            <div>
              <p className="text-white font-medium">{t.name}</p>
              <p className="text-gray-500 text-xs">{t.students}명 담당</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <p className={t.sIndex >= 0.8 ? 'text-emerald-400' : 'text-white'}>{(t.sIndex * 100).toFixed(0)}%</p>
              <p className="text-gray-600">만족도</p>
            </div>
            <div className="text-center">
              <p className={t.retention >= 0.95 ? 'text-emerald-400' : 'text-white'}>{(t.retention * 100).toFixed(0)}%</p>
              <p className="text-gray-600">유지율</p>
            </div>
            <div className="text-center">
              <p className="text-cyan-400">{formatCurrency(t.revenue)}</p>
              <p className="text-gray-600">매출</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

// KPI Progress
const KPIProgress = memo(function KPIProgress({ kpis }) {
  return (
    <div className="space-y-4">
      {kpis.map(kpi => (
        <div key={kpi.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-sm">{kpi.name}</span>
            <span className="text-white text-sm">
              {kpi.current}{kpi.unit} / {kpi.target}{kpi.unit}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${kpi.progress * 100}%` }}
              transition={{ duration: 1 }}
              className={`h-full rounded-full ${
                kpi.progress >= 0.95 ? 'bg-emerald-500' :
                kpi.progress >= 0.8 ? 'bg-cyan-500' :
                kpi.progress >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

// Efficiency Metrics
const EfficiencyMetrics = memo(function EfficiencyMetrics({ metrics }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 bg-gray-900/50 rounded-xl text-center">
        <p className="text-2xl font-bold text-cyan-400">{(metrics.automationRate * 100).toFixed(0)}%</p>
        <p className="text-gray-500 text-xs">자동화율</p>
      </div>
      <div className="p-3 bg-gray-900/50 rounded-xl text-center">
        <p className="text-2xl font-bold text-purple-400">{metrics.savedHours}h</p>
        <p className="text-gray-500 text-xs">절감 시간</p>
      </div>
      <div className="p-3 bg-gray-900/50 rounded-xl text-center">
        <p className="text-2xl font-bold text-emerald-400">{(metrics.costReduction * 100).toFixed(0)}%</p>
        <p className="text-gray-500 text-xs">비용 절감</p>
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function PerformanceAnalytics() {
  const [metrics] = useState(generateOverallMetrics);
  const [revenueData] = useState(generateRevenueData);
  const [departments] = useState(generateDepartmentPerformance);
  const [teachers] = useState(generateTeacherRanking);
  const [kpis] = useState(generateKPIProgress);
  const [period, setPeriod] = useState('month');

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📊</span>
              Performance Analytics
            </h1>
            <p className="text-gray-400 mt-1">전체 성과 분석 대시보드</p>
          </div>
          <div className="flex items-center gap-2">
            {['week', 'month', 'quarter', 'year'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  period === p
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {p === 'week' ? '주간' : p === 'month' ? '월간' : p === 'quarter' ? '분기' : '연간'}
              </button>
            ))}
          </div>
        </div>

        {/* Executive Summary */}
        <ExecutiveSummary metrics={metrics} />

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="text-emerald-400">📈</span>
              매출 & V-Index 추이 (12개월)
            </h3>
            <RevenueChart data={revenueData} />
          </div>

          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="text-purple-400">🎯</span>
              KPI 달성률
            </h3>
            <KPIProgress kpis={kpis} />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Department Performance */}
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="text-cyan-400">🏢</span>
              부서별 성과
            </h3>
            <DepartmentPerformance departments={departments} />
          </div>

          {/* Teacher Ranking */}
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="text-yellow-400">🏆</span>
              선생님 성과 TOP 5
            </h3>
            <TeacherRanking teachers={teachers} />
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Efficiency */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-emerald-400">⚡</span>
                운영 효율성
              </h3>
              <EfficiencyMetrics metrics={metrics} />
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30 p-4">
              <h3 className="text-cyan-400 font-medium mb-3 flex items-center gap-2">
                <span>💡</span>
                Key Insights
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-white">
                  • 수학반이 <span className="text-emerald-400">+15%</span> 가장 높은 성장
                </p>
                <p className="text-white">
                  • 김선생 <span className="text-cyan-400">98%</span> 유지율로 1위
                </p>
                <p className="text-white">
                  • 자동화로 월 <span className="text-purple-400">542시간</span> 절감
                </p>
                <p className="text-white">
                  • NPS <span className="text-yellow-400">72점</span> (업계 평균 45점)
                </p>
              </div>
            </div>

            {/* YoY Comparison */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-3">전년 대비</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">매출</span>
                  <span className="text-emerald-400">+24%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">학생 수</span>
                  <span className="text-emerald-400">+18%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">만족도</span>
                  <span className="text-emerald-400">+8%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">이탈률</span>
                  <span className="text-emerald-400">-3%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
