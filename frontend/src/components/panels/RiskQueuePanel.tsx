/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 Risk Queue Panel - FSD Console
 * R(t) 기반 이탈 예측 관리
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { riskApi, shieldApi } from '../../api/autus';

interface RiskQueuePanelProps {
  orgId: string;
  onRiskAction?: (riskId: string, action: string) => void;
}

interface RiskItem {
  id: string;
  target_node: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  signals: string[];
  suggested_action: string;
  predicted_churn_days?: number;
  estimated_value?: number;
  status: string;
  created_at: string;
  node?: {
    id: string;
    name: string;
    node_type: string;
    meta?: any;
  };
}

interface RiskStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

const PRIORITY_CONFIG = {
  CRITICAL: { color: 'bg-red-500', textColor: 'text-red-400', label: '긴급' },
  HIGH: { color: 'bg-orange-500', textColor: 'text-orange-400', label: '높음' },
  MEDIUM: { color: 'bg-yellow-500', textColor: 'text-yellow-400', label: '보통' },
  LOW: { color: 'bg-blue-500', textColor: 'text-blue-400', label: '낮음' },
};

export default function RiskQueuePanel({ orgId, onRiskAction }: RiskQueuePanelProps) {
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [stats, setStats] = useState<RiskStats | null>(null);
  const [totalLoss, setTotalLoss] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH'>('all');
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);

  // 위험 목록 로드
  const loadRisks = useCallback(async () => {
    try {
      const minPriority = filter === 'all' ? 'LOW' : filter;
      const result = await riskApi.getList(orgId, 'open', minPriority);
      
      if (result.risks) {
        setRisks(result.risks);
        setStats(result.stats);
        setTotalLoss(result.total_estimated_loss || 0);
      }
    } catch (error) {
      console.error('Failed to load risks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, filter]);

  useEffect(() => {
    loadRisks();
  }, [loadRisks]);

  // 위험도 재계산
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const result = await riskApi.recalculate(orgId);
      if (result.success) {
        alert(`${result.processed}명 분석 완료, 고위험 ${result.high_risk_count}명`);
        loadRisks();
      }
    } catch (error) {
      console.error('Recalculate failed:', error);
      alert('재계산 실패');
    } finally {
      setIsRecalculating(false);
    }
  };

  // 위험 상태 업데이트
  const handleAction = async (riskId: string, action: 'resolve' | 'escalate' | 'dismiss') => {
    try {
      const result = await riskApi.updateStatus(riskId, action, {
        notes: action === 'resolve' ? '수동 해결' : action === 'dismiss' ? '오탐 처리' : '에스컬레이션',
      });
      
      if (result.success) {
        loadRisks();
        onRiskAction?.(riskId, action);
        setSelectedRisk(null);
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('작업 실패');
    }
  };

  // Active Shield 발동
  const handleActivateShield = async (risk: RiskItem) => {
    try {
      const result = await shieldApi.activate(orgId, risk.target_node, [
        '긍정 리포트 발송',
        '담당자 알림',
      ]);
      
      if (result.success) {
        alert('🛡️ Active Shield 발동!');
        loadRisks();
      }
    } catch (error) {
      console.error('Shield activation failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🚨 Risk Queue
          <span className="text-sm font-normal text-slate-400">이탈 위험 관리</span>
        </h2>
        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isRecalculating
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isRecalculating ? '분석 중...' : '🔄 재계산'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="text-center p-3 bg-red-500/20 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-xs text-slate-400">긴급</div>
          </div>
          <div className="text-center p-3 bg-orange-500/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-400">{stats.high}</div>
            <div className="text-xs text-slate-400">높음</div>
          </div>
          <div className="text-center p-3 bg-yellow-500/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{stats.medium}</div>
            <div className="text-xs text-slate-400">보통</div>
          </div>
          <div className="text-center p-3 bg-blue-500/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{stats.low}</div>
            <div className="text-xs text-slate-400">낮음</div>
          </div>
          <div className="text-center p-3 bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-white">
              ₩{(totalLoss / 10000).toFixed(0)}만
            </div>
            <div className="text-xs text-slate-400">예상 손실</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'CRITICAL', 'HIGH'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {f === 'all' ? '전체' : f === 'CRITICAL' ? '긴급만' : '높음+'}
          </button>
        ))}
      </div>

      {/* Risk List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {risks.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            ✅ 현재 위험 항목이 없습니다
          </div>
        ) : (
          risks.map(risk => {
            const config = PRIORITY_CONFIG[risk.priority];
            return (
              <div
                key={risk.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedRisk?.id === risk.id
                    ? 'bg-slate-700 border-blue-500'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}
                onClick={() => setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${config.color}`}>
                      {config.label}
                    </span>
                    <div>
                      <div className="font-medium text-white">
                        {risk.node?.name || risk.target_node}
                      </div>
                      <div className="text-sm text-slate-400">
                        위험도 {risk.risk_score}점 | D-{risk.predicted_churn_days || '?'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">
                      ₩{((risk.estimated_value || 0) / 10000).toFixed(0)}만
                    </div>
                    <div className="text-xs text-slate-500">예상 손실</div>
                  </div>
                </div>

                {/* Signals */}
                {risk.signals && risk.signals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {risk.signals.map((signal, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions (expanded) */}
                {selectedRisk?.id === risk.id && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="text-sm text-slate-400 mb-3">
                      💡 권장 조치: {risk.suggested_action}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleActivateShield(risk); }}
                        className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium"
                      >
                        🛡️ Active Shield
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleAction(risk.id, 'resolve'); }}
                        className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
                      >
                        ✓ 해결
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleAction(risk.id, 'escalate'); }}
                        className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
                      >
                        ⬆️ 에스컬레이션
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleAction(risk.id, 'dismiss'); }}
                        className="py-2 px-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
