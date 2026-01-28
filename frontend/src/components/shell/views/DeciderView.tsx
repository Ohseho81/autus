/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS DeciderView - 결정자(K5~K7) 뷰 / C-Level
 * "결정만 한다. 과정·설계·자동화는 보이지 않는다."
 * 
 * 연결된 API: /api/monopoly, /api/goals
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { 
  TopDecisionCard, 
  AssetStatusCard,
  FutureScenarioCard,
  type Decision 
} from '../../cards';
import { MonopolyPanel } from '../../panels';

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

type ViewState = 'decision' | 'asset' | 'scenario' | 'monopoly';

const DeciderView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('monopoly'); // 기본: Monopoly
  const [pendingDecisions] = useState([MOCK_DECISION]);
  const orgId = 'demo-org'; // TODO: 실제 org_id로 교체

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
  // Tab Navigation
  // ─────────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'monopoly', label: '👑 Monopoly', active: viewState === 'monopoly' },
    { id: 'decision', label: '⚖️ 결정', active: viewState === 'decision' },
    { id: 'asset', label: '📊 자산화', active: viewState === 'asset' },
    { id: 'scenario', label: '🔮 시나리오', active: viewState === 'scenario' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
    // Monopoly 대시보드 (기본)
    if (viewState === 'monopoly') {
      return <MonopolyPanel orgId={orgId} />;
    }

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

    // 결정 화면
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
                ? 'bg-amber-500 text-white'
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

export default DeciderView;
