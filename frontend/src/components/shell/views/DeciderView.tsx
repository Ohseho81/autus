/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS DeciderView - 결정자(K5~K7) 뷰
 * "결정만 한다. 과정·설계·자동화는 보이지 않는다."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { 
  TopDecisionCard, 
  AssetStatusCard,
  FutureScenarioCard,
  type Decision 
} from '../../cards';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DECISION: Decision = {
  id: 'DEC-001',
  title: '추가 공사 승인',
  impact: {
    ifDelayed: '비용 +12%, 일정 +18일',
    ifApproved: '예상 절감 효과 15%',
    ifRejected: '대안 설계 필요',
  },
  irreversibleSeconds: 36 * 3600, // 36시간
  priority: 'high',
  context: '현장 상황 변경으로 인한 설계 변경 요청',
};

const MOCK_ASSET_STATUS = {
  totalTasks: 570,
  automatedTasks: 342,
  deletedTasks: 85,
  assetizationIndex: 75,
  peopleIndependence: false,
};

const MOCK_SCENARIO = {
  id: 'SCN-001',
  ifContinue: '3개월 후 인력 부족으로 일정 지연 예상',
  ifChange: '지금 인력 2명 추가 시 일정 준수 가능',
  confidenceLevel: 82,
  recommendedAction: '사전 인력 확보 검토',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

type ViewState = 'decision' | 'asset' | 'scenario';

const DeciderView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('decision');
  const [pendingDecisions] = useState([MOCK_DECISION]);

  const handleApprove = async (decisionId: string) => {
    console.log('Approved:', decisionId);
    // 승인 후 다음 결정 또는 시나리오 표시
    setViewState('scenario');
  };

  const handleHold = async (decisionId: string) => {
    console.log('Held:', decisionId);
    // 보류 처리
  };

  const handleReject = async (decisionId: string) => {
    console.log('Rejected:', decisionId);
    // 거부 처리
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // 미래 시나리오 화면 (ENGINE B)
  if (viewState === 'scenario') {
    return (
      <FutureScenarioCard
        scenario={MOCK_SCENARIO}
        onAccept={() => setViewState('asset')}
        onDismiss={() => setViewState('decision')}
      />
    );
  }

  // 자산화 현황 화면 (ENGINE A)
  if (viewState === 'asset') {
    return (
      <AssetStatusCard
        status={MOCK_ASSET_STATUS}
        onViewDetails={() => setViewState('decision')}
      />
    );
  }

  // 기본 - 결정 화면
  if (pendingDecisions.length > 0) {
    return (
      <TopDecisionCard
        decision={pendingDecisions[0]}
        onApprove={handleApprove}
        onHold={handleHold}
        onReject={handleReject}
      />
    );
  }

  // 대기 중인 결정이 없을 때
  return (
    <AssetStatusCard
      status={MOCK_ASSET_STATUS}
      onViewDetails={() => console.log('View details')}
    />
  );
};

export default DeciderView;
