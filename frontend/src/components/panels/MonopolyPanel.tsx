/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👑 Monopoly Panel - C-Level Console
 * 3대 독점 체제 통합 모니터링
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { monopolyApi, goalsApi, churnApi } from '../../api/autus';

interface MonopolyPanelProps {
  orgId: string;
}

interface MonopolyData {
  data_monopoly: {
    total_nodes: number;
    active_relationships: number;
    data_points_collected: number;
    ai_insights_generated: number;
  };
  value_monopoly: {
    total_revenue: number;
    recurring_revenue: number;
    v_index: number;
    growth_rate: number;
  };
  network_monopoly: {
    total_customers: number;
    viral_coefficient: number;
    referral_rate: number;
    network_value: number;
  };
  overall_score: number;
  trend: 'up' | 'down' | 'stable';
}

interface GoalSummary {
  total: number;
  achieved: number;
  on_track: number;
  at_risk: number;
  behind: number;
  avg_progress: number;
}

interface ChurnRisk {
  total_at_risk: number;
  critical_count: number;
  estimated_loss: number;
}

// Mock data for demo
const MOCK_MONOPOLY: MonopolyData = {
  data_monopoly: {
    total_nodes: 1247,
    active_relationships: 4892,
    data_points_collected: 58432,
    ai_insights_generated: 342,
  },
  value_monopoly: {
    total_revenue: 127500000,
    recurring_revenue: 112000000,
    v_index: 85.2,
    growth_rate: 12.5,
  },
  network_monopoly: {
    total_customers: 856,
    viral_coefficient: 1.34,
    referral_rate: 23.5,
    network_value: 2450000000,
  },
  overall_score: 78.5,
  trend: 'up',
};

export default function MonopolyPanel({ orgId }: MonopolyPanelProps) {
  const [monopolyData, setMonopolyData] = useState<MonopolyData | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [churnRisk, setChurnRisk] = useState<ChurnRisk | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      // Monopoly API 호출 (실패 시 Mock 사용)
      try {
        const monopolyResult = await monopolyApi.getStatus(orgId);
        if (monopolyResult.data) {
          setMonopolyData(monopolyResult.data);
        } else {
          setMonopolyData(MOCK_MONOPOLY);
        }
      } catch {
        setMonopolyData(MOCK_MONOPOLY);
      }

      // Goals Summary
      try {
        const goalsResult = await goalsApi.getList(orgId);
        if (goalsResult.data?.summary) {
          setGoalSummary(goalsResult.data.summary);
        }
      } catch {
        setGoalSummary({
          total: 4,
          achieved: 1,
          on_track: 2,
          at_risk: 1,
          behind: 0,
          avg_progress: 64,
        });
      }

      // Churn Risk
      try {
        const churnResult = await churnApi.analyze(orgId);
        if (churnResult.data) {
          setChurnRisk(churnResult.data);
        }
      } catch {
        setChurnRisk({
          total_at_risk: 12,
          critical_count: 3,
          estimated_loss: 5400000,
        });
      }
    } catch (error) {
      console.error('Failed to load monopoly data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const data = monopolyData || MOCK_MONOPOLY;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl p-6 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              👑 Monopoly Dashboard
              <span className="text-sm font-normal text-amber-400">3대 독점 체제</span>
            </h2>
            <p className="text-slate-400 mt-1">
              데이터 · 가치 · 네트워크 독점 현황
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-amber-400">
              {data.overall_score}
              <span className="text-xl text-slate-400">/100</span>
            </div>
            <div className={`text-sm ${data.trend === 'up' ? 'text-green-400' : data.trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
              {data.trend === 'up' ? '📈 상승 중' : data.trend === 'down' ? '📉 하락 중' : '➡️ 유지'}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Monopolies */}
      <div className="grid grid-cols-3 gap-4">
        {/* Data Monopoly */}
        <div className="bg-slate-800/80 rounded-xl p-5 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🗄️</span>
            <h3 className="text-lg font-bold text-purple-400">데이터 독점</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">총 노드</span>
              <span className="text-white font-medium">{data.data_monopoly.total_nodes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">관계 수</span>
              <span className="text-white font-medium">{data.data_monopoly.active_relationships.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">데이터 포인트</span>
              <span className="text-white font-medium">{data.data_monopoly.data_points_collected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">AI 인사이트</span>
              <span className="text-purple-400 font-medium">{data.data_monopoly.ai_insights_generated}</span>
            </div>
          </div>
        </div>

        {/* Value Monopoly */}
        <div className="bg-slate-800/80 rounded-xl p-5 border border-green-500/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h3 className="text-lg font-bold text-green-400">가치 독점</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">월 매출</span>
              <span className="text-white font-medium">₩{(data.value_monopoly.total_revenue / 10000).toLocaleString()}만</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">반복 매출</span>
              <span className="text-white font-medium">₩{(data.value_monopoly.recurring_revenue / 10000).toLocaleString()}만</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">V-Index</span>
              <span className="text-green-400 font-bold">{data.value_monopoly.v_index}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">성장률</span>
              <span className="text-green-400 font-medium">+{data.value_monopoly.growth_rate}%</span>
            </div>
          </div>
        </div>

        {/* Network Monopoly */}
        <div className="bg-slate-800/80 rounded-xl p-5 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🌐</span>
            <h3 className="text-lg font-bold text-blue-400">네트워크 독점</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">총 고객</span>
              <span className="text-white font-medium">{data.network_monopoly.total_customers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">바이럴 계수</span>
              <span className={`font-bold ${data.network_monopoly.viral_coefficient > 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                {data.network_monopoly.viral_coefficient}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">추천율</span>
              <span className="text-white font-medium">{data.network_monopoly.referral_rate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">네트워크 가치</span>
              <span className="text-blue-400 font-medium">₩{(data.network_monopoly.network_value / 100000000).toFixed(1)}억</span>
            </div>
          </div>
        </div>
      </div>

      {/* Goals & Risks Summary */}
      <div className="grid grid-cols-2 gap-4">
        {/* Goals Summary */}
        {goalSummary && (
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🎯 목표 현황
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">평균 진행률</span>
                  <span className="text-white">{goalSummary.avg_progress}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                    style={{ width: `${goalSummary.avg_progress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="p-2 bg-green-500/20 rounded">
                <div className="text-green-400 font-bold">{goalSummary.achieved}</div>
                <div className="text-slate-500 text-xs">달성</div>
              </div>
              <div className="p-2 bg-blue-500/20 rounded">
                <div className="text-blue-400 font-bold">{goalSummary.on_track}</div>
                <div className="text-slate-500 text-xs">순조</div>
              </div>
              <div className="p-2 bg-yellow-500/20 rounded">
                <div className="text-yellow-400 font-bold">{goalSummary.at_risk}</div>
                <div className="text-slate-500 text-xs">주의</div>
              </div>
              <div className="p-2 bg-red-500/20 rounded">
                <div className="text-red-400 font-bold">{goalSummary.behind}</div>
                <div className="text-slate-500 text-xs">지연</div>
              </div>
            </div>
          </div>
        )}

        {/* Churn Risk Summary */}
        {churnRisk && (
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🚨 이탈 위험 요약
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-yellow-400">{churnRisk.total_at_risk}</div>
                <div className="text-slate-400 text-sm">위험 고객</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">{churnRisk.critical_count}</div>
                <div className="text-slate-400 text-sm">긴급</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">
                  ₩{(churnRisk.estimated_loss / 10000).toLocaleString()}만
                </div>
                <div className="text-slate-400 text-sm">예상 손실</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
