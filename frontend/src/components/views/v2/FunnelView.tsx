/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 퍼널 뷰 (Funnel View) - AUTUS 2.0
 * 전환율 분석
 * "전환율 병목은?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface FunnelStage {
  id: string;
  name: string;
  count: number;
  percentage: number;
  dropoffRate: number;
  isBottleneck?: boolean;
}

interface FunnelData {
  stages: FunnelStage[];
  summary: {
    totalConversion: number;
    bottleneck: string;
    bottleneckDropoff: number;
    potentialRevenue: number;
  };
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA: FunnelData = {
  stages: [
    { id: 's1', name: '인지', count: 500, percentage: 100, dropoffRate: 0 },
    { id: 's2', name: '관심', count: 200, percentage: 40, dropoffRate: 60 },
    { id: 's3', name: '체험', count: 80, percentage: 16, dropoffRate: 60, isBottleneck: true },
    { id: 's4', name: '등록', count: 40, percentage: 8, dropoffRate: 50 },
    { id: 's5', name: '3개월', count: 35, percentage: 7, dropoffRate: 12.5 },
    { id: 's6', name: '6개월', count: 30, percentage: 6, dropoffRate: 14.3 },
  ],
  summary: {
    totalConversion: 6,
    bottleneck: '관심 → 체험',
    bottleneckDropoff: 60,
    potentialRevenue: 2400,
  },
};

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const FunnelBar: React.FC<{ stage: FunnelStage; maxCount: number; index: number }> = ({ stage, maxCount, index }) => {
  const widthPercent = (stage.count / maxCount) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      <div className="flex items-center gap-3 mb-1">
        <span className="w-16 text-xs text-slate-400">{stage.name}</span>
        <div className="flex-1 h-8 bg-slate-800/50 rounded-lg overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${widthPercent}%` }}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
            className={`h-full rounded-lg ${
              stage.isBottleneck 
                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
          />
          {stage.isBottleneck && (
            <AlertTriangle className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400" size={14} />
          )}
        </div>
        <div className="w-20 text-right">
          <span className="text-sm font-bold">{stage.count}명</span>
          <span className="text-xs text-slate-500 ml-1">{stage.percentage}%</span>
        </div>
      </div>
      
      {stage.dropoffRate > 0 && index > 0 && (
        <div className="ml-16 text-[10px] text-red-400 flex items-center gap-1 mb-2">
          <span>↓ {stage.dropoffRate}% 이탈</span>
          {stage.isBottleneck && <span className="text-red-400 font-bold">⚠️ 병목</span>}
        </div>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface FunnelViewProps {
  onNavigate?: (view: string, params?: any) => void;
}

export function FunnelView({ onNavigate = () => {} }: FunnelViewProps) {
  const [data] = useState<FunnelData>(MOCK_DATA);
  const maxCount = Math.max(...data.stages.map(s => s.count));

  const handleStageClick = (stageId: string) => {
    console.log('Stage clicked:', stageId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Target size={20} />
          </div>
          <div>
            <div className="text-lg font-bold">퍼널</div>
            <div className="text-[10px] text-slate-500">전환율 분석</div>
          </div>
        </div>
        
        <select className="bg-slate-800/50 rounded-lg px-2 py-1 text-sm border border-slate-700/50">
          <option>전환 분석</option>
          <option>시간대별</option>
          <option>채널별</option>
        </select>
      </div>

      {/* Funnel Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 mb-4"
      >
        <div className="text-xs text-slate-400 mb-4">전환 퍼널</div>
        <div className="space-y-1">
          {data.stages.map((stage, i) => (
            <FunnelBar key={stage.id} stage={stage} maxCount={maxCount} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
      >
        <div className="text-xs text-slate-400 mb-3">📊 분석 요약</div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">전체 전환율:</span>
            <span className="text-lg font-bold text-blue-400">{data.summary.totalConversion}%</span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-400" size={14} />
              <span className="text-sm">병목 구간:</span>
            </div>
            <span className="text-sm text-red-400 font-bold">
              {data.summary.bottleneck} ({data.summary.bottleneckDropoff}% 이탈)
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={14} />
              <span className="text-sm">개선 기회:</span>
            </div>
            <span className="text-sm text-emerald-400">
              체험 전환율 10% 상승 시 → 연 매출 +₩{data.summary.potentialRevenue}만
            </span>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 text-xs py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50"
          >
            관심 단계 리드 보기
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 text-xs py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          >
            체험 전환 전략
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 text-xs py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50"
          >
            상세 분석
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default FunnelView;
