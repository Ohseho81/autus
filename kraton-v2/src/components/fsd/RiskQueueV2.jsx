/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 Risk Queue V2 - FSD Console
 * R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 상태 설정
const PRIORITY_CONFIG = {
  CRITICAL: { label: 'CRITICAL', color: 'red', emoji: '🔴', bg: 'bg-red-500/20', border: 'border-red-500' },
  HIGH: { label: 'HIGH', color: 'orange', emoji: '🟠', bg: 'bg-orange-500/20', border: 'border-orange-500' },
  MEDIUM: { label: 'MEDIUM', color: 'yellow', emoji: '🟡', bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
  LOW: { label: 'LOW', color: 'green', emoji: '🟢', bg: 'bg-green-500/20', border: 'border-green-500' },
};

// Mock 데이터
const MOCK_RISKS = [
  {
    id: 'r1',
    target_node: 's1',
    priority: 'CRITICAL',
    risk_score: 85,
    signals: ['강한 부정 감정 (-18)', '유대 관계 냉각', '비용 언급'],
    suggested_action: '즉시 1:1 상담 예약',
    predicted_churn_days: 14,
    estimated_value: 2700000,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    node: { id: 's1', name: '정현우', node_type: 'student', meta: { grade: '중1', class: 'A반' } },
    meta: {
      contributing_factors: [
        { factor: 'payment', weight: 0.4, impact: -15 },
        { factor: 'attendance', weight: 0.3, impact: -8 },
      ],
      auto_actuation: [{ action: '긍정 리포트 자동 발송', status: 'pending' }],
    },
  },
  {
    id: 'r2',
    target_node: 's3',
    priority: 'HIGH',
    risk_score: 72,
    signals: ['성적 하락', '출석률 감소'],
    suggested_action: '담당 선생님 특별 케어 요청',
    predicted_churn_days: 28,
    estimated_value: 1800000,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    node: { id: 's3', name: '박지훈', node_type: 'student', meta: { grade: '중3', class: 'B반' } },
    meta: {
      contributing_factors: [
        { factor: 'grade', weight: 0.5, impact: -12 },
        { factor: 'attendance', weight: 0.3, impact: -6 },
      ],
    },
  },
  {
    id: 'r3',
    target_node: 's5',
    priority: 'MEDIUM',
    risk_score: 55,
    signals: ['참여도 감소'],
    suggested_action: '학부모 앱 푸시 알림',
    predicted_churn_days: 45,
    estimated_value: 900000,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    node: { id: 's5', name: '윤재민', node_type: 'student', meta: { grade: '중2', class: 'C반' } },
    meta: {
      contributing_factors: [
        { factor: 'engagement', weight: 0.6, impact: -8 },
      ],
    },
  },
];

// 통계 카드 컴포넌트
const StatCard = memo(function StatCard({ label, count, color, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        p-3 rounded-xl text-center transition-all flex-1
        ${isActive
          ? `bg-${color}-600/30 border-2 border-${color}-500`
          : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'}
      `}
    >
      <p className={`text-2xl font-bold text-${color}-400`}>{count}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </button>
  );
});

// 위험 카드 컴포넌트
const RiskCard = memo(function RiskCard({ risk, onClick }) {
  const config = PRIORITY_CONFIG[risk.priority] || PRIORITY_CONFIG.LOW;
  const timeAgo = getTimeAgo(risk.created_at);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={`
        p-4 rounded-xl cursor-pointer transition-all
        bg-gray-800/50 hover:bg-gray-800 border-l-4
        ${config.border}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${config.bg} text-${config.color}-400`}>
                {config.label}
              </span>
              <span className="text-white font-medium">{risk.node?.name || 'Unknown'}</span>
              <span className="text-gray-500 text-sm">
                {risk.node?.meta?.grade} {risk.node?.meta?.class}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {risk.signals?.slice(0, 2).join(' · ') || '위험 신호 감지'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-lg font-mono text-white">{risk.risk_score}%</p>
          <p className="text-xs text-gray-500">{risk.predicted_churn_days}일 예상</p>
        </div>
      </div>

      {/* 자동 실행 예정 */}
      {risk.meta?.auto_actuation?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-cyan-400 text-sm">
            <span>🤖</span>
            <span>{risk.meta.auto_actuation[0].action}</span>
            <span className="text-gray-500">예정</span>
          </div>
        </div>
      )}
      
      {/* 시간 */}
      <div className="mt-2 text-right">
        <span className="text-xs text-gray-600">{timeAgo}</span>
      </div>
    </motion.div>
  );
});

// 상세 모달 컴포넌트
const DetailModal = memo(function DetailModal({ risk, onClose, onAction }) {
  if (!risk) return null;
  
  const config = PRIORITY_CONFIG[risk.priority] || PRIORITY_CONFIG.LOW;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-2xl border border-gray-700 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{risk.node?.name || 'Unknown'}</h3>
            <p className="text-gray-500">
              {risk.node?.meta?.grade} {risk.node?.meta?.class}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-lg font-bold ${config.bg} text-${config.color}-400`}>
            {config.emoji} {risk.priority}
          </span>
        </div>

        {/* 위험도 게이지 */}
        <div className="p-4 bg-gray-800/50 rounded-xl mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-500 text-sm">위험도</span>
            <span className="text-white font-bold">{risk.risk_score}%</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${risk.risk_score}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full bg-${config.color}-500 rounded-full`}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-500">예상 이탈: {risk.predicted_churn_days}일</span>
            <span className="text-gray-500">R(t) 공식 적용</span>
          </div>
        </div>

        {/* 위험 신호 */}
        <div className="p-4 bg-gray-800/50 rounded-xl mb-4">
          <p className="text-sm text-gray-500 mb-2">위험 신호</p>
          <div className="flex flex-wrap gap-2">
            {risk.signals?.map((signal, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-sm"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>

        {/* 기여 요인 */}
        {risk.meta?.contributing_factors?.length > 0 && (
          <div className="p-4 bg-gray-800/50 rounded-xl mb-4">
            <p className="text-sm text-gray-500 mb-2">기여 요인</p>
            <div className="space-y-2">
              {risk.meta.contributing_factors.map((f, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-400 capitalize">{f.factor}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${f.impact < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, Math.abs(f.impact) * 5)}%` }}
                      />
                    </div>
                    <span className={`text-sm ${f.impact < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {f.impact > 0 ? '+' : ''}{f.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 예상 손실 가치 */}
        <div className="p-4 bg-gray-800/50 rounded-xl mb-6">
          <p className="text-sm text-gray-500 mb-1">예상 손실 가치</p>
          <p className="text-2xl font-bold text-white">
            ₩{risk.estimated_value?.toLocaleString()}
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2">
          <button
            onClick={() => onAction(risk.id, 'call')}
            className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium transition-all"
          >
            📞 지금 전화
          </button>
          <button
            onClick={() => onAction(risk.id, 'schedule')}
            className="w-full py-3 bg-orange-600/50 hover:bg-orange-600 rounded-xl text-orange-300 font-medium transition-all"
          >
            📅 상담 예약
          </button>
          <button
            onClick={() => onAction(risk.id, 'auto')}
            className="w-full py-3 bg-cyan-600/50 hover:bg-cyan-600 rounded-xl text-cyan-300 font-medium transition-all"
          >
            🤖 자동 대응 실행
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onAction(risk.id, 'resolve')}
              className="py-3 bg-emerald-600/50 hover:bg-emerald-600 rounded-xl text-emerald-300 font-medium transition-all"
            >
              ✅ 해결됨
            </button>
            <button
              onClick={() => onAction(risk.id, 'dismiss')}
              className="py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 font-medium transition-all"
            >
              ❌ 오탐 처리
            </button>
          </div>
        </div>
      </motion.div>
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
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

// 메인 컴포넌트
export default function RiskQueueV2({ orgId = 'demo' }) {
  const [risks, setRisks] = useState(MOCK_RISKS);
  const [stats, setStats] = useState({ critical: 1, high: 1, medium: 1, low: 0, total: 3 });
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [filter, setFilter] = useState('all');

  // 통계 계산
  useEffect(() => {
    setStats({
      critical: risks.filter(r => r.priority === 'CRITICAL').length,
      high: risks.filter(r => r.priority === 'HIGH').length,
      medium: risks.filter(r => r.priority === 'MEDIUM').length,
      low: risks.filter(r => r.priority === 'LOW').length,
      total: risks.length,
    });
  }, [risks]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    // Mock 재계산
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRecalculating(false);
  };

  const handleAction = useCallback((riskId, action) => {
    console.log(`Action: ${action} for risk ${riskId}`);
    
    if (action === 'resolve' || action === 'dismiss') {
      setRisks(prev => prev.filter(r => r.id !== riskId));
    }
    
    setSelectedRisk(null);
  }, []);

  // 필터링된 위험 목록
  const filteredRisks = risks.filter(r => {
    if (filter === 'all') return true;
    return r.priority === filter.toUpperCase();
  });

  // 총 예상 손실
  const totalEstimatedLoss = filteredRisks.reduce((sum, r) => sum + (r.estimated_value || 0), 0);

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🚨 Risk Queue
            <span className="text-xs text-gray-500 font-normal">FSD Console</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
          </p>
        </div>
        
        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${isRecalculating
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30'}
          `}
        >
          {isRecalculating ? '⏳ 계산 중...' : '🔄 재계산'}
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <StatCard
          label="CRITICAL"
          count={stats.critical}
          color="red"
          isActive={filter === 'critical'}
          onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}
        />
        <StatCard
          label="HIGH"
          count={stats.high}
          color="orange"
          isActive={filter === 'high'}
          onClick={() => setFilter(filter === 'high' ? 'all' : 'high')}
        />
        <StatCard
          label="MEDIUM"
          count={stats.medium}
          color="yellow"
          isActive={filter === 'medium'}
          onClick={() => setFilter(filter === 'medium' ? 'all' : 'medium')}
        />
        <StatCard
          label="TOTAL"
          count={stats.total}
          color="gray"
          isActive={filter === 'all'}
          onClick={() => setFilter('all')}
        />
      </div>

      {/* 총 예상 손실 */}
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <span className="text-red-400 text-sm">⚠️ 총 예상 손실 가치</span>
          <span className="text-2xl font-bold text-red-400">
            ₩{totalEstimatedLoss.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Risk List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <span className="animate-spin inline-block mr-2">⏳</span>
            로딩 중...
          </div>
        ) : filteredRisks.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">✨</span>
            <p className="text-gray-500 mt-2">현재 위험 학생 없음</p>
          </div>
        ) : (
          filteredRisks.map((risk, index) => (
            <RiskCard
              key={risk.id}
              risk={risk}
              onClick={() => setSelectedRisk(risk)}
            />
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRisk && (
          <DetailModal
            risk={selectedRisk}
            onClose={() => setSelectedRisk(null)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
