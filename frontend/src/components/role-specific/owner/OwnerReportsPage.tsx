/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Owner Reports Page
 * 오너 전용 경영 리포트 페이지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface KPIMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  change: number;
  changeLabel: string;
  target?: number;
  status: 'good' | 'warning' | 'danger';
}

interface ReportSection {
  id: string;
  title: string;
  icon: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const KPI_METRICS: KPIMetric[] = [
  { id: 'revenue', label: '월 매출', value: 4200, unit: '만원', change: 8, changeLabel: '전월 대비', target: 5000, status: 'warning' },
  { id: 'students', label: '재원생', value: 132, unit: '명', change: 5, changeLabel: '전월 대비', target: 150, status: 'good' },
  { id: 'retention', label: '유지율', value: 94, unit: '%', change: 2, changeLabel: '전월 대비', target: 95, status: 'good' },
  { id: 'margin', label: '이익률', value: 32, unit: '%', change: -3, changeLabel: '전월 대비', target: 35, status: 'warning' },
  { id: 'share', label: '시장점유', value: 8.8, unit: '%', change: 0.5, changeLabel: '전분기 대비', target: 10, status: 'warning' },
  { id: 'satisfaction', label: '만족도', value: 4.5, unit: '/5', change: 0.2, changeLabel: '전월 대비', status: 'good' },
];

const REVENUE_TREND = [
  { month: '9월', revenue: 3800, cost: 2600 },
  { month: '10월', revenue: 3950, cost: 2700 },
  { month: '11월', revenue: 4100, cost: 2750 },
  { month: '12월', revenue: 4300, cost: 2900 },
  { month: '1월', revenue: 4200, cost: 2850 },
];

const RISK_STUDENTS = [
  { name: '김민수', temperature: 32, ltv: 180, riskFactors: ['성적하락', '출석불량'] },
  { name: '정하늘', temperature: 38, ltv: 150, riskFactors: ['비용민감'] },
  { name: '이서연', temperature: 45, ltv: 120, riskFactors: ['숙제미제출'] },
];

const COMPETITOR_SUMMARY = [
  { name: 'A학원', share: 12.5, change: -0.3, threat: 'low' },
  { name: 'B학원', share: 10.2, change: 1.2, threat: 'high' },
  { name: 'C학원', share: 9.1, change: 0.1, threat: 'medium' },
];

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card Component
// ─────────────────────────────────────────────────────────────────────────────

function KPICard({ metric }: { metric: KPIMetric }) {
  const statusColors = {
    good: 'border-green-400',
    warning: 'border-amber-400',
    danger: 'border-red-400',
  };
  
  const progress = metric.target ? (metric.value / metric.target) * 100 : null;

  return (
    <div className={`bg-slate-800/50 rounded-xl p-4 border-l-4 ${statusColors[metric.status]}`}>
      <div className="text-sm text-slate-400 mb-1">{metric.label}</div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-white">{metric.value.toLocaleString()}</span>
        <span className="text-sm text-slate-400 mb-1">{metric.unit}</span>
      </div>
      
      <div className={`text-xs mt-1 ${metric.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change)}% {metric.changeLabel}
      </div>
      
      {progress !== null && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>목표 대비</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                progress >= 90 ? 'bg-green-500' : progress >= 70 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Revenue Chart Component
// ─────────────────────────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: typeof REVENUE_TREND }) {
  const maxValue = Math.max(...data.map(d => d.revenue));
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h3 className="text-white font-medium mb-4">📈 매출/비용 추이</h3>
      
      <div className="h-48 flex items-end gap-2">
        {data.map((item, idx) => (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
            {/* Bars */}
            <div className="w-full flex gap-1 items-end h-36">
              <motion.div
                className="flex-1 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${(item.revenue / maxValue) * 100}%` }}
                transition={{ delay: idx * 0.1 }}
              />
              <motion.div
                className="flex-1 bg-slate-600 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${(item.cost / maxValue) * 100}%` }}
                transition={{ delay: idx * 0.1 }}
              />
            </div>
            <span className="text-xs text-slate-400">{item.month}</span>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500" /> 매출
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-slate-600" /> 비용
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk Students Card
// ─────────────────────────────────────────────────────────────────────────────

function RiskStudentsCard({ students }: { students: typeof RISK_STUDENTS }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h3 className="text-white font-medium mb-4">⚠️ 이탈 위험 학생 (LTV 기준)</h3>
      
      <div className="space-y-3">
        {students.map(student => (
          <div key={student.name} className="flex items-center gap-3 p-3 bg-red-900/30 rounded-lg">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
              ${student.temperature < 40 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}
            `}>
              {student.temperature}°
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">{student.name}</div>
              <div className="flex gap-1 mt-1">
                {student.riskFactors.map(f => (
                  <span key={f} className="text-xs px-2 py-0.5 bg-red-500/30 text-red-300 rounded-full">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-amber-400 font-bold">{student.ltv}만</div>
              <div className="text-xs text-slate-400">예상 LTV</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-slate-400 text-center">
        총 잠재 손실: {students.reduce((sum, s) => sum + s.ltv, 0)}만원
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Competitor Summary Card
// ─────────────────────────────────────────────────────────────────────────────

function CompetitorCard({ competitors }: { competitors: typeof COMPETITOR_SUMMARY }) {
  const threatColors = {
    low: 'text-green-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h3 className="text-white font-medium mb-4">🏆 경쟁사 현황</h3>
      
      <div className="space-y-3">
        {competitors.map((comp, idx) => (
          <div key={comp.name} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400">
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="text-white text-sm">{comp.name}</div>
            </div>
            <div className="text-right">
              <div className="text-white font-medium">{comp.share}%</div>
              <div className={`text-xs ${comp.change > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {comp.change > 0 ? '↑' : '↓'} {Math.abs(comp.change)}%
              </div>
            </div>
            <span className={`text-xs ${threatColors[comp.threat as keyof typeof threatColors]}`}>
              {comp.threat === 'high' ? '위협' : comp.threat === 'medium' ? '주의' : '안정'}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
        <div className="text-xs text-slate-400 mb-1">우리 학원</div>
        <div className="flex items-center justify-between">
          <span className="text-amber-400 font-bold text-lg">8.8%</span>
          <span className="text-xs text-green-400">↑ 0.5% (4위)</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OwnerReportsPage() {
  const [reportPeriod, setReportPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  
  const sections: ReportSection[] = [
    { id: 'executive', title: '경영 요약', icon: '📊' },
    { id: 'financial', title: '재무 분석', icon: '💰' },
    { id: 'competitive', title: '경쟁 분석', icon: '🏆' },
    { id: 'risk', title: '리스크 분석', icon: '⚠️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 pb-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">📊 경영 리포트</h1>
              <p className="text-sm text-slate-400">전략적 의사결정을 위한 데이터</p>
            </div>
            
            {/* Period Selector */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              {(['month', 'quarter', 'year'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setReportPeriod(period)}
                  className={`
                    px-4 py-2 rounded-lg text-sm transition-colors
                    ${reportPeriod === period ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}
                  `}
                >
                  {period === 'month' ? '월간' : period === 'quarter' ? '분기' : '연간'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* KPI Grid */}
        <div>
          <h2 className="text-white font-medium mb-3">📈 핵심 지표</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {KPI_METRICS.map(metric => (
              <KPICard key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
        
        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-4">
          <RevenueChart data={REVENUE_TREND} />
          <CompetitorCard competitors={COMPETITOR_SUMMARY} />
        </div>
        
        {/* Risk Analysis */}
        <div className="grid md:grid-cols-2 gap-4">
          <RiskStudentsCard students={RISK_STUDENTS} />
          
          {/* Strategic Recommendations */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4">💡 전략 권고사항</h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-400 font-medium mb-1">
                  <span>⚡</span> 긴급
                </div>
                <div className="text-sm text-slate-300">
                  B학원 점유율 급상승 - 마케팅 대응 필요
                </div>
              </div>
              
              <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-blue-400 font-medium mb-1">
                  <span>📌</span> 중요
                </div>
                <div className="text-sm text-slate-300">
                  이탈 위험 학생 3명 - 개별 상담 권장
                </div>
              </div>
              
              <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                  <span>✨</span> 기회
                </div>
                <div className="text-sm text-slate-300">
                  신규 아파트 입주 예정 - 홍보 시점 검토
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Export Options */}
        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors">
            📄 PDF 다운로드
          </button>
          <button className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors">
            📊 Excel 내보내기
          </button>
          <button className="py-3 px-6 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors">
            📧 이메일 발송
          </button>
        </div>
      </div>
    </div>
  );
}

export default OwnerReportsPage;
