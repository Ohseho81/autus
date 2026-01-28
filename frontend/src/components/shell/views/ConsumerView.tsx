/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS ConsumerView - 소비자 뷰
 * "신뢰와 에너지를 공급받는다."
 * 
 * 연결된 API: /api/rewards
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
import { RewardsPanel } from '../../panels';

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

type ViewState = 'rewards' | 'proof' | 'signal' | 'confidence' | 'progress';

const ConsumerView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('rewards'); // 기본: Rewards
  const nodeId = 'consumer-demo'; // TODO: 실제 node_id로 교체
  const nodeName = '김학생'; // TODO: 실제 이름으로 교체

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
  // Tab Navigation
  // ─────────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'rewards', label: '🎁 V-포인트', active: viewState === 'rewards' },
    { id: 'proof', label: '✓ 품질증명', active: viewState === 'proof' },
    { id: 'progress', label: '📊 진행현황', active: viewState === 'progress' },
    { id: 'signal', label: '📢 신호', active: viewState === 'signal' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
    // Rewards (기본)
    if (viewState === 'rewards') {
      return <RewardsPanel nodeId={nodeId} nodeName={nodeName} />;
    }

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

    // 품질 증명 화면
    return (
      <ProofResultCard
        proof={MOCK_PROOF}
        onViewRecords={handleViewRecords}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewState(tab.id as ViewState)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab.active
                ? 'bg-green-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default ConsumerView;
