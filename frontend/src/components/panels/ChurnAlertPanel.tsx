/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ Churn Alert Panel - FSD Console
 * 이탈 위험 알림 및 방어 전략
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { churnApi, notifyApi, shieldApi } from '../../api/autus';

interface ChurnAlertPanelProps {
  orgId: string;
  onAlertAction?: (nodeId: string, action: string) => void;
}

interface ChurnAnalysis {
  summary: {
    total_analyzed: number;
    at_risk_count: number;
    critical_count: number;
    total_risk_value: number;
  };
  risk_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  top_risks: Array<{
    node_id: string;
    name: string;
    sigma: number;
    risk_level: string;
    predicted_churn_days: number;
    estimated_value: number;
    primary_factors: string[];
  }>;
  recommended_actions: Array<{
    type: string;
    target_count: number;
    description: string;
    priority: string;
  }>;
}

// Mock data
const MOCK_CHURN: ChurnAnalysis = {
  summary: {
    total_analyzed: 245,
    at_risk_count: 18,
    critical_count: 4,
    total_risk_value: 8100000,
  },
  risk_distribution: {
    critical: 4,
    high: 6,
    medium: 8,
    low: 227,
  },
  top_risks: [
    { node_id: 'n1', name: '김민수', sigma: 0.52, risk_level: 'critical', predicted_churn_days: 14, estimated_value: 2700000, primary_factors: ['출석 저조', '성적 하락'] },
    { node_id: 'n2', name: '이지은', sigma: 0.61, risk_level: 'critical', predicted_churn_days: 21, estimated_value: 1800000, primary_factors: ['학부모 불만'] },
    { node_id: 'n3', name: '박준혁', sigma: 0.68, risk_level: 'high', predicted_churn_days: 35, estimated_value: 1350000, primary_factors: ['참여도 감소'] },
    { node_id: 'n4', name: '최서연', sigma: 0.72, risk_level: 'high', predicted_churn_days: 42, estimated_value: 900000, primary_factors: ['비용 부담'] },
  ],
  recommended_actions: [
    { type: 'call_parent', target_count: 4, description: '학부모 상담 전화', priority: 'critical' },
    { type: 'send_report', target_count: 8, description: '긍정 리포트 발송', priority: 'high' },
    { type: 'discount_offer', target_count: 3, description: '재등록 할인 제안', priority: 'medium' },
  ],
};

const RISK_COLORS = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
};

export default function ChurnAlertPanel({ orgId, onAlertAction }: ChurnAlertPanelProps) {
  const [analysis, setAnalysis] = useState<ChurnAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    try {
      const result = await churnApi.analyze(orgId);
      if (result.data) {
        setAnalysis(result.data);
      } else {
        setAnalysis(MOCK_CHURN);
      }
    } catch {
      setAnalysis(MOCK_CHURN);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  // 방어 액션 실행
  const handleDefendAction = async (nodeId: string, nodeName: string) => {
    setIsActivating(nodeId);
    try {
      // Shield 발동
      await shieldApi.activate(orgId, nodeId, ['긍정 리포트 발송', '담당자 알림']);
      
      // 알림 발송
      await notifyApi.send({
        org_id: orgId,
        type: 'risk_alert',
        recipients: ['fsd', 'optimus'],
        message: `🛡️ ${nodeName} 학생 방어 조치 시작`,
        priority: 'high',
      });

      alert(`🛡️ ${nodeName} 학생 방어 조치 시작!`);
      onAlertAction?.(nodeId, 'defend');
    } catch (error) {
      console.error('Defend action failed:', error);
      alert('방어 조치 실행 실패');
    } finally {
      setIsActivating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const data = analysis || MOCK_CHURN;

  return (
    <div className="bg-slate-800/80 rounded-xl p-6 border border-red-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          ⚠️ 이탈 위험 알림
          <span className="text-sm font-normal text-slate-400">Retention Defense</span>
        </h2>
        <button
          onClick={loadAnalysis}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
        >
          🔄 새로고침
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 bg-slate-700/50 rounded-lg">
          <div className="text-2xl font-bold text-white">{data.summary.total_analyzed}</div>
          <div className="text-xs text-slate-400">분석 대상</div>
        </div>
        <div className="text-center p-3 bg-yellow-500/20 rounded-lg">
          <div className="text-2xl font-bold text-yellow-400">{data.summary.at_risk_count}</div>
          <div className="text-xs text-slate-400">위험 고객</div>
        </div>
        <div className="text-center p-3 bg-red-500/20 rounded-lg">
          <div className="text-2xl font-bold text-red-400">{data.summary.critical_count}</div>
          <div className="text-xs text-slate-400">긴급</div>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded-lg">
          <div className="text-xl font-bold text-red-400">
            ₩{(data.summary.total_risk_value / 10000).toLocaleString()}만
          </div>
          <div className="text-xs text-slate-400">예상 손실</div>
        </div>
      </div>

      {/* Risk Distribution Bar */}
      <div className="mb-6">
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-700">
          {data.risk_distribution.critical > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(data.risk_distribution.critical / data.summary.total_analyzed) * 100}%` }}
            />
          )}
          {data.risk_distribution.high > 0 && (
            <div
              className="bg-orange-500"
              style={{ width: `${(data.risk_distribution.high / data.summary.total_analyzed) * 100}%` }}
            />
          )}
          {data.risk_distribution.medium > 0 && (
            <div
              className="bg-yellow-500"
              style={{ width: `${(data.risk_distribution.medium / data.summary.total_analyzed) * 100}%` }}
            />
          )}
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>긴급 {data.risk_distribution.critical}</span>
          <span>높음 {data.risk_distribution.high}</span>
          <span>보통 {data.risk_distribution.medium}</span>
          <span className="text-green-400">정상 {data.risk_distribution.low}</span>
        </div>
      </div>

      {/* Top Risks */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-3">🚨 긴급 대응 필요</h3>
        <div className="space-y-2">
          {data.top_risks.map(risk => {
            const colors = RISK_COLORS[risk.risk_level as keyof typeof RISK_COLORS] || RISK_COLORS.medium;
            return (
              <div
                key={risk.node_id}
                className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${colors.text}`}>{risk.name}</span>
                      <span className="text-slate-400 text-sm">σ={risk.sigma}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {risk.primary_factors.map((factor, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">D-{risk.predicted_churn_days}</div>
                    <div className={`font-bold ${colors.text}`}>
                      ₩{(risk.estimated_value / 10000).toFixed(0)}만
                    </div>
                    <button
                      onClick={() => handleDefendAction(risk.node_id, risk.name)}
                      disabled={isActivating === risk.node_id}
                      className={`mt-2 px-3 py-1 rounded text-xs font-medium transition-all ${
                        isActivating === risk.node_id
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                      {isActivating === risk.node_id ? '실행 중...' : '🛡️ 방어'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Actions */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">💡 권장 조치</h3>
        <div className="grid grid-cols-3 gap-2">
          {data.recommended_actions.map((action, i) => (
            <button
              key={i}
              className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left transition-all"
            >
              <div className="text-white font-medium text-sm">{action.description}</div>
              <div className="text-slate-400 text-xs">{action.target_count}명 대상</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
