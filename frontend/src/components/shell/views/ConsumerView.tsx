/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS ConsumerView - 소비자 뷰
 * "신뢰와 에너지를 공급받는다."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { 
  ProofResultCard, 
  SignalInputCard,
  ConfidenceCard,
  ProgressCard,
  type ProofResult 
} from '../../cards';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_PROOF: ProofResult = {
  id: 'PRF-001',
  title: 'A동 3층 시공',
  matchRate: 99.7,
  changeHistory: 'all_recorded',
  status: 'normal',
  lastUpdated: '2024-01-15 14:30',
};

const MOCK_PROGRESS_STEPS = [
  { id: '1', label: '계약 완료', status: 'completed' as const, timestamp: '2024-01-01' },
  { id: '2', label: '착공', status: 'completed' as const, timestamp: '2024-01-10' },
  { id: '3', label: '기초 공사', status: 'completed' as const, timestamp: '2024-01-20' },
  { id: '4', label: '골조 공사', status: 'current' as const },
  { id: '5', label: '마감 공사', status: 'pending' as const },
  { id: '6', label: '준공', status: 'pending' as const },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

type ViewState = 'proof' | 'signal' | 'confidence' | 'progress';

const ConsumerView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('proof');

  const handleViewRecords = () => {
    console.log('View records');
    setViewState('progress');
  };

  const handleSignal = (type: 'urge' | 'inquiry' | 'payment', message?: string) => {
    console.log('Signal sent:', type, message);
    // 신호 전송 후 확인 화면
    setViewState('confidence');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // 신호 입력 화면
  if (viewState === 'signal') {
    return (
      <SignalInputCard
        onSignal={handleSignal}
        currentStatus="진행 중"
      />
    );
  }

  // 확신 화면 (ENGINE B)
  if (viewState === 'confidence') {
    return (
      <ConfidenceCard
        message="이 선택은 안전합니다"
        confidenceLevel={95}
        verifiedItems={[
          '도면 일치 확인',
          '안전 기준 충족',
          '법적 요건 준수',
        ]}
        onAcknowledge={() => setViewState('proof')}
      />
    );
  }

  // 진행 상태 화면
  if (viewState === 'progress') {
    return (
      <ProgressCard
        title="프로젝트 진행 현황"
        steps={MOCK_PROGRESS_STEPS}
        estimatedCompletion="2024년 6월"
      />
    );
  }

  // 기본 - 품질 증명 화면
  return (
    <ProofResultCard
      proof={MOCK_PROOF}
      onViewRecords={handleViewRecords}
    />
  );
};

export default ConsumerView;
