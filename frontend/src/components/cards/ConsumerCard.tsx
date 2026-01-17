/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS ConsumerCard - 소비자 전용 카드
 * "신뢰와 에너지를 공급받는다."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { 
  BaseCard, 
  CardInfoRow, 
  CardAlert, 
  CardActions, 
  CardButton,
} from './BaseCard';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProofResult {
  id: string;
  title: string;
  matchRate: number;        // 도면 일치율 (0-100)
  changeHistory: 'all_recorded' | 'partial' | 'none';
  status: 'normal' | 'delayed' | 'issue';
  lastUpdated: string;
}

interface ConsumerCardProps {
  proof: ProofResult;
  onViewRecords?: () => void;
  onContact?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ProofResultCard - 품질 증명 카드 (ENGINE A)
// ═══════════════════════════════════════════════════════════════════════════════

export function ProofResultCard({
  proof,
  onViewRecords,
  onContact,
}: ConsumerCardProps) {
  const statusConfig = {
    normal: { label: '정상', color: 'text-green-400', bg: 'bg-green-500/10', icon: '✅' },
    delayed: { label: '지연', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: '⏳' },
    issue: { label: '문제 발생', color: 'text-red-400', bg: 'bg-red-500/10', icon: '⚠️' },
  };

  const historyConfig = {
    all_recorded: { label: '모두 기록됨', color: 'text-green-400' },
    partial: { label: '일부 기록', color: 'text-amber-400' },
    none: { label: '기록 없음', color: 'text-red-400' },
  };

  const status = statusConfig[proof.status];
  const history = historyConfig[proof.changeHistory];

  return (
    <BaseCard 
      type="proof"
      title={proof.title}
    >
      {/* 도면 일치율 */}
      <div className="text-center py-4">
        <div className="text-4xl font-bold text-white mb-1">
          {proof.matchRate}%
        </div>
        <div className="text-sm text-gray-400">도면 일치율</div>
      </div>

      {/* 일치율 바 */}
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            proof.matchRate >= 95 ? 'bg-green-500' :
            proof.matchRate >= 80 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${proof.matchRate}%` }}
        />
      </div>

      {/* 변경 이력 */}
      <CardInfoRow 
        label="변경 이력" 
        value={<span className={history.color}>{history.label}</span>} 
      />

      {/* 현재 상태 */}
      <div className={`flex items-center justify-center gap-2 p-4 rounded-xl ${status.bg}`}>
        <span className="text-2xl">{status.icon}</span>
        <span className={`text-lg font-semibold ${status.color}`}>
          현재 상태: {status.label}
        </span>
      </div>

      {/* 마지막 업데이트 */}
      <p className="text-xs text-gray-500 text-center">
        마지막 업데이트: {proof.lastUpdated}
      </p>

      {/* 액션 버튼 */}
      {onViewRecords && (
        <CardButton variant="primary" onClick={onViewRecords} fullWidth>
          기록 보기
        </CardButton>
      )}
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SignalInputCard - 신호 입력 카드
// ═══════════════════════════════════════════════════════════════════════════════

type SignalType = 'urge' | 'inquiry' | 'payment';

interface SignalInputCardProps {
  onSignal: (type: SignalType, message?: string) => void;
  currentStatus?: string;
}

export function SignalInputCard({ onSignal, currentStatus }: SignalInputCardProps) {
  const signals: Array<{
    type: SignalType;
    label: string;
    icon: string;
    color: string;
  }> = [
    { type: 'urge', label: '재촉', icon: '⏰', color: 'bg-amber-500 hover:bg-amber-600' },
    { type: 'inquiry', label: '문의', icon: '💬', color: 'bg-blue-500 hover:bg-blue-600' },
    { type: 'payment', label: '결제', icon: '💳', color: 'bg-green-500 hover:bg-green-600' },
  ];

  return (
    <BaseCard 
      type="info"
      title="요청하기"
      subtitle={currentStatus}
    >
      <p className="text-sm text-gray-400 text-center mb-4">
        요청 상태를 선택하세요
      </p>

      <CardActions variant="grid">
        {signals.map((signal) => (
          <button
            key={signal.type}
            onClick={() => onSignal(signal.type)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl
              text-white font-medium transition-all
              ${signal.color}
            `}
          >
            <span className="text-2xl">{signal.icon}</span>
            <span className="text-sm">{signal.label}</span>
          </button>
        ))}
      </CardActions>
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ConfidenceCard - 선택 확신 카드 (ENGINE B)
// ═══════════════════════════════════════════════════════════════════════════════

interface ConfidenceCardProps {
  message: string;
  confidenceLevel: number;
  verifiedItems?: string[];
  onAcknowledge?: () => void;
}

export function ConfidenceCard({
  message,
  confidenceLevel,
  verifiedItems = [],
  onAcknowledge,
}: ConfidenceCardProps) {
  return (
    <BaseCard 
      type="success"
      title="검증 완료"
    >
      <div className="text-center py-4">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-lg text-white font-medium">{message}</p>
        <p className="text-sm text-gray-400 mt-2">
          신뢰도: {confidenceLevel}%
        </p>
      </div>

      {verifiedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">검증된 항목:</p>
          {verifiedItems.map((item, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-2 text-sm text-green-400"
            >
              <span>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {onAcknowledge && (
        <CardButton variant="primary" onClick={onAcknowledge} fullWidth>
          확인
        </CardButton>
      )}
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ProgressCard - 진행 상태 카드
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
}

interface ProgressCardProps {
  title: string;
  steps: ProgressStep[];
  estimatedCompletion?: string;
}

export function ProgressCard({
  title,
  steps,
  estimatedCompletion,
}: ProgressCardProps) {
  const currentStep = steps.findIndex(s => s.status === 'current');
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <BaseCard 
      type="info"
      title={title}
    >
      {/* 진행률 바 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">진행률</span>
          <span className="text-white font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 단계 목록 */}
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div 
            key={step.id}
            className="flex items-start gap-3"
          >
            {/* 상태 아이콘 */}
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs
              ${step.status === 'completed' ? 'bg-green-500 text-white' :
                step.status === 'current' ? 'bg-blue-500 text-white animate-pulse' :
                'bg-gray-600 text-gray-400'
              }
            `}>
              {step.status === 'completed' ? '✓' : idx + 1}
            </div>
            
            {/* 단계 정보 */}
            <div className="flex-1">
              <p className={`text-sm ${
                step.status === 'pending' ? 'text-gray-500' : 'text-white'
              }`}>
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-gray-500">{step.timestamp}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {estimatedCompletion && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-center">
          <p className="text-xs text-gray-400">예상 완료</p>
          <p className="text-sm text-white font-medium">{estimatedCompletion}</p>
        </div>
      )}
    </BaseCard>
  );
}

export default ProofResultCard;
