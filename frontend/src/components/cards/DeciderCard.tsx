/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS DeciderCard - 결정자(K5~K7) 전용 카드
 * "결정만 한다. 과정·설계·자동화는 보이지 않는다."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { 
  BaseCard, 
  CardInfoRow, 
  CardAlert, 
  CardActions, 
  CardButton,
  CardTimer,
} from './BaseCard';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Decision {
  id: string;
  title: string;
  impact: {
    ifDelayed: string;      // "비용 +12%, 일정 +18일"
    ifApproved?: string;    // "예상 절감 효과"
    ifRejected?: string;    // "대안 필요"
  };
  irreversibleSeconds: number;  // 비가역까지 남은 시간 (초)
  priority: 'normal' | 'high' | 'critical';
  context?: string;
}

interface DeciderCardProps {
  decision: Decision;
  onApprove: (decisionId: string) => void;
  onHold: (decisionId: string) => void;
  onReject: (decisionId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TopDecisionCard - Top-1 결정 카드
// ═══════════════════════════════════════════════════════════════════════════════

export function TopDecisionCard({
  decision,
  onApprove,
  onHold,
  onReject,
}: DeciderCardProps) {
  const [timeLeft, setTimeLeft] = useState(decision.irreversibleSeconds);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // 타이머 카운트다운
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAction = async (action: 'approve' | 'hold' | 'reject') => {
    setIsLoading(action);
    try {
      switch (action) {
        case 'approve':
          await onApprove(decision.id);
          break;
        case 'hold':
          await onHold(decision.id);
          break;
        case 'reject':
          await onReject(decision.id);
          break;
      }
    } finally {
      setIsLoading(null);
    }
  };

  const isCriticalTime = timeLeft < 3600; // 1시간 미만
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  return (
    <BaseCard 
      type="decision"
      title={decision.title}
      priority={decision.priority}
    >
      {/* 지연 시 영향 */}
      <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
        <p className="text-sm text-gray-400 mb-1">미루면:</p>
        <p className="text-amber-400 font-semibold">{decision.impact.ifDelayed}</p>
      </div>

      {/* 비가역 타이머 */}
      <div className={`
        flex items-center justify-between p-4 rounded-xl
        ${isCriticalTime ? 'bg-red-500/20 border border-red-500/50' : 'bg-gray-700/50'}
      `}>
        <span className="text-sm text-gray-300">비가역까지 남은 시간</span>
        <span className={`
          font-mono font-bold text-xl
          ${isCriticalTime ? 'text-red-400 animate-pulse' : 'text-white'}
        `}>
          {hours > 0 ? `${hours}시간 ` : ''}{minutes}분
        </span>
      </div>

      {/* 추가 컨텍스트 */}
      {decision.context && (
        <p className="text-sm text-gray-400 italic">
          "{decision.context}"
        </p>
      )}

      {/* 액션 버튼 */}
      <CardActions variant="grid">
        <CardButton 
          variant="primary" 
          onClick={() => handleAction('approve')}
          loading={isLoading === 'approve'}
        >
          승인
        </CardButton>
        <CardButton 
          variant="secondary" 
          onClick={() => handleAction('hold')}
          loading={isLoading === 'hold'}
        >
          보류
        </CardButton>
        <CardButton 
          variant="danger" 
          onClick={() => handleAction('reject')}
          loading={isLoading === 'reject'}
        >
          거부
        </CardButton>
      </CardActions>
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AssetStatusCard - 디지털 자산화 상태 카드 (ENGINE A)
// ═══════════════════════════════════════════════════════════════════════════════

interface AssetStatus {
  totalTasks: number;
  automatedTasks: number;
  deletedTasks: number;
  assetizationIndex: number;  // 0-100%
  peopleIndependence: boolean; // 사람 없이 돌아가는가?
}

interface AssetStatusCardProps {
  status: AssetStatus;
  onViewDetails?: () => void;
}

export function AssetStatusCard({ status, onViewDetails }: AssetStatusCardProps) {
  const automationRate = Math.round((status.automatedTasks / status.totalTasks) * 100);
  const deletionRate = Math.round((status.deletedTasks / status.totalTasks) * 100);

  return (
    <BaseCard 
      type="info"
      title="디지털 자산화 현황"
    >
      {/* 주요 지표 */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-gray-700/50 rounded-xl">
          <div className="text-2xl font-bold text-blue-400">{status.totalTasks}</div>
          <div className="text-xs text-gray-400">전체 업무</div>
        </div>
        <div className="p-3 bg-gray-700/50 rounded-xl">
          <div className="text-2xl font-bold text-green-400">{automationRate}%</div>
          <div className="text-xs text-gray-400">자동화</div>
        </div>
        <div className="p-3 bg-gray-700/50 rounded-xl">
          <div className="text-2xl font-bold text-amber-400">{deletionRate}%</div>
          <div className="text-xs text-gray-400">삭제</div>
        </div>
      </div>

      {/* 자산화 지수 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">자산화 지수</span>
          <span className="font-bold text-white">{status.assetizationIndex}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${status.assetizationIndex}%` }}
          />
        </div>
      </div>

      {/* 핵심 질문 */}
      <div className={`
        p-4 rounded-xl text-center
        ${status.peopleIndependence 
          ? 'bg-green-500/10 border border-green-500/30' 
          : 'bg-amber-500/10 border border-amber-500/30'
        }
      `}>
        <p className="text-sm text-gray-400 mb-1">
          "이 조직은 사람이 빠져도 돌아가는가?"
        </p>
        <p className={`font-bold text-lg ${
          status.peopleIndependence ? 'text-green-400' : 'text-amber-400'
        }`}>
          {status.peopleIndependence ? '✅ YES' : '⚠️ NOT YET'}
        </p>
      </div>

      {onViewDetails && (
        <CardButton variant="ghost" onClick={onViewDetails} fullWidth>
          상세 보기
        </CardButton>
      )}
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FutureScenarioCard - Top-1 미래 시나리오 카드 (ENGINE B)
// ═══════════════════════════════════════════════════════════════════════════════

interface FutureScenario {
  id: string;
  ifContinue: string;   // "이대로 가면 X"
  ifChange: string;     // "지금 바꾸면 Y"
  confidenceLevel: number;  // 0-100%
  recommendedAction?: string;
}

interface FutureScenarioCardProps {
  scenario: FutureScenario;
  onAccept?: () => void;
  onDismiss?: () => void;
}

export function FutureScenarioCard({ 
  scenario, 
  onAccept, 
  onDismiss 
}: FutureScenarioCardProps) {
  return (
    <BaseCard 
      type="info"
      title="미래 시나리오"
      subtitle={`신뢰도 ${scenario.confidenceLevel}%`}
    >
      {/* 현재 경로 */}
      <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
        <p className="text-xs text-amber-400 mb-1">이대로 가면</p>
        <p className="text-white font-medium">{scenario.ifContinue}</p>
      </div>

      {/* 대안 경로 */}
      <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
        <p className="text-xs text-green-400 mb-1">지금 바꾸면</p>
        <p className="text-white font-medium">{scenario.ifChange}</p>
      </div>

      {/* 권장 조치 */}
      {scenario.recommendedAction && (
        <CardAlert type="info" message={`💡 ${scenario.recommendedAction}`} />
      )}

      {(onAccept || onDismiss) && (
        <CardActions>
          {onAccept && (
            <CardButton variant="primary" onClick={onAccept} fullWidth>
              반영하기
            </CardButton>
          )}
          {onDismiss && (
            <CardButton variant="ghost" onClick={onDismiss}>
              나중에
            </CardButton>
          )}
        </CardActions>
      )}
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DecisionLogCard - 결정 로그 카드 (읽기 전용)
// ═══════════════════════════════════════════════════════════════════════════════

interface DecisionLogEntry {
  id: string;
  title: string;
  decision: 'approved' | 'rejected' | 'held';
  timestamp: string;
  decidedBy: string;
}

interface DecisionLogCardProps {
  entries: DecisionLogEntry[];
  onViewAll?: () => void;
}

export function DecisionLogCard({ entries, onViewAll }: DecisionLogCardProps) {
  const decisionLabels = {
    approved: { text: '승인', color: 'text-green-400' },
    rejected: { text: '거부', color: 'text-red-400' },
    held: { text: '보류', color: 'text-amber-400' },
  };

  return (
    <BaseCard type="info" title="결정 이력">
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {entries.slice(0, 5).map((entry) => (
          <div 
            key={entry.id}
            className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-sm text-white truncate">{entry.title}</p>
              <p className="text-xs text-gray-400">{entry.timestamp}</p>
            </div>
            <span className={`text-sm font-medium ${decisionLabels[entry.decision].color}`}>
              {decisionLabels[entry.decision].text}
            </span>
          </div>
        ))}
      </div>

      {onViewAll && entries.length > 5 && (
        <CardButton variant="ghost" onClick={onViewAll} fullWidth>
          전체 보기 ({entries.length}건)
        </CardButton>
      )}
    </BaseCard>
  );
}

export default TopDecisionCard;
