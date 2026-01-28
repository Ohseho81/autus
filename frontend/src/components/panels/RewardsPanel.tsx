/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎁 Rewards Panel - Consumer Console
 * V-포인트 적립/교환 현황
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { rewardsApi } from '../../api/autus';

interface RewardsPanelProps {
  nodeId: string;
  nodeName?: string;
}

interface RewardsData {
  current_points: number;
  total_earned: number;
  total_spent: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  next_tier_points: number;
  recent_activities: Array<{
    id: string;
    type: 'earn' | 'spend';
    amount: number;
    description: string;
    created_at: string;
  }>;
  available_rewards: Array<{
    id: string;
    name: string;
    cost: number;
    category: string;
  }>;
}

const TIER_CONFIG = {
  bronze: { label: '브론즈', color: 'text-amber-600', bgColor: 'bg-amber-600/20', icon: '🥉' },
  silver: { label: '실버', color: 'text-slate-300', bgColor: 'bg-slate-300/20', icon: '🥈' },
  gold: { label: '골드', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20', icon: '🥇' },
  platinum: { label: '플래티넘', color: 'text-cyan-300', bgColor: 'bg-cyan-300/20', icon: '💎' },
};

// Mock data for demo
const MOCK_REWARDS: RewardsData = {
  current_points: 12500,
  total_earned: 45000,
  total_spent: 32500,
  tier: 'gold',
  next_tier_points: 7500,
  recent_activities: [
    { id: '1', type: 'earn', amount: 500, description: '출석 보너스', created_at: '2026-01-24T09:00:00Z' },
    { id: '2', type: 'earn', amount: 1000, description: '테스트 만점', created_at: '2026-01-23T15:30:00Z' },
    { id: '3', type: 'spend', amount: 2000, description: '간식 교환', created_at: '2026-01-22T12:00:00Z' },
    { id: '4', type: 'earn', amount: 300, description: '숙제 완료', created_at: '2026-01-21T18:00:00Z' },
  ],
  available_rewards: [
    { id: 'r1', name: '음료 쿠폰', cost: 1000, category: 'food' },
    { id: 'r2', name: '문구 세트', cost: 2500, category: 'goods' },
    { id: 'r3', name: '수업 1회 무료', cost: 10000, category: 'service' },
    { id: 'r4', name: '학원 굿즈', cost: 5000, category: 'goods' },
  ],
};

export default function RewardsPanel({ nodeId, nodeName }: RewardsPanelProps) {
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRewards = useCallback(async () => {
    try {
      const result = await rewardsApi.getStatus(nodeId);
      if (result.data) {
        setRewards(result.data);
      } else {
        setRewards(MOCK_REWARDS);
      }
    } catch {
      setRewards(MOCK_REWARDS);
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  if (isLoading) {
    return (
      <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-slate-700 rounded mb-4"></div>
      </div>
    );
  }

  const data = rewards || MOCK_REWARDS;
  const tierConfig = TIER_CONFIG[data.tier];
  const progressToNextTier = ((data.total_earned - (data.total_earned - data.next_tier_points)) / data.next_tier_points) * 100;

  return (
    <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🎁 V-포인트
          {nodeName && <span className="text-sm font-normal text-slate-400">{nodeName}</span>}
        </h2>
        <span className={`px-3 py-1 rounded-full ${tierConfig.bgColor} ${tierConfig.color} font-medium`}>
          {tierConfig.icon} {tierConfig.label}
        </span>
      </div>

      {/* Points Summary */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 mb-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-2">
            {data.current_points.toLocaleString()}
            <span className="text-lg text-slate-400"> P</span>
          </div>
          <div className="text-sm text-slate-400">
            총 적립 {data.total_earned.toLocaleString()}P | 사용 {data.total_spent.toLocaleString()}P
          </div>
        </div>

        {/* Next Tier Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">다음 등급까지</span>
            <span className="text-white">{data.next_tier_points.toLocaleString()}P</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ width: `${Math.min(100, progressToNextTier)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Available Rewards */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-3">🛒 교환 가능 리워드</h3>
        <div className="grid grid-cols-2 gap-2">
          {data.available_rewards.map(reward => (
            <button
              key={reward.id}
              className={`p-3 rounded-lg border text-left transition-all ${
                data.current_points >= reward.cost
                  ? 'bg-slate-700 border-slate-600 hover:border-purple-500'
                  : 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
              }`}
              disabled={data.current_points < reward.cost}
            >
              <div className="text-white font-medium text-sm">{reward.name}</div>
              <div className="text-purple-400 text-sm">{reward.cost.toLocaleString()}P</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">📋 최근 활동</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {data.recent_activities.map(activity => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className={activity.type === 'earn' ? 'text-green-400' : 'text-red-400'}>
                  {activity.type === 'earn' ? '+' : '-'}
                </span>
                <span className="text-white text-sm">{activity.description}</span>
              </div>
              <div className="text-right">
                <div className={`font-medium ${activity.type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                  {activity.type === 'earn' ? '+' : '-'}{activity.amount.toLocaleString()}P
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(activity.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
