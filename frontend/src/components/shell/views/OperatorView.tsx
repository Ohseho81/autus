/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS OperatorView - 운영자(K3~K5) 뷰 / FSD
 * "관리의 기준을 설명에서 증거로 바꾼다."
 * 
 * 연결된 API: /api/risks, /api/churn
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { 
  ConflictCard, 
  PressureHeatmapCard,
  PlanRealityCard,
  TaskRedefinitionCard,
  type Conflict 
} from '../../cards';
import { RiskQueuePanel, ChurnAlertPanel } from '../../panels';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_CONFLICT: Conflict = {
  id: 'CNF-001',
  source: 'A공정 지연',
  target: 'B공정 대기',
  impact: '일정 +3일',
  severity: 'medium',
  recommendations: [
    { id: 'R1', action: '장비 1대 이동', effort: 'low' },
    { id: 'R2', action: '인력 2명 조정', effort: 'medium' },
    { id: 'R3', action: '야간 작업 투입', effort: 'high' },
  ],
};

const MOCK_PRESSURE_POINTS = [
  { id: '1', area: 'A동 3층', type: 'schedule' as const, pressure: 85 },
  { id: '2', area: 'B동 외장', type: 'resource' as const, pressure: 62 },
  { id: '3', area: '설비팀', type: 'personnel' as const, pressure: 45 },
];

const MOCK_COMPARISONS = [
  { metric: '공정률', planned: '45%', actual: '42%', variance: -3 },
  { metric: '인력', planned: 50, actual: 48, variance: -4 },
  { metric: '자재', planned: '100%', actual: '95%', variance: -5 },
  { metric: '비용', planned: '5억', actual: '5.2억', variance: 4 },
];

const MOCK_MODULES = [
  { id: 'M1', name: '일일 점검', taskCount: 15, status: 'auto' as const },
  { id: 'M2', name: '안전 보고', taskCount: 8, status: 'semi_auto' as const, recommendation: 'automate' as const },
  { id: 'M3', name: '자재 발주', taskCount: 12, status: 'manual' as const, recommendation: 'unify' as const },
  { id: 'M4', name: '중복 점검', taskCount: 5, status: 'manual' as const, recommendation: 'delete' as const },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

type ViewState = 'risk' | 'churn' | 'conflict' | 'pressure' | 'compare' | 'redefinition';

const OperatorView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('risk'); // 기본: Risk Queue
  const [hasConflict] = useState(true);
  const orgId = 'demo-org'; // TODO: 실제 org_id로 교체

  const handlePrepare = async (conflictId: string, recommendationId: string) => {
    console.log('Prepare:', conflictId, recommendationId);
    setViewState('pressure');
  };

  const handleEscalate = (conflictId: string) => {
    console.log('Escalate:', conflictId);
    // 상위 결정자에게 전달
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Tab Navigation
  // ─────────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'risk', label: '🚨 Risk Queue', active: viewState === 'risk' },
    { id: 'churn', label: '⚠️ 이탈 알림', active: viewState === 'churn' },
    { id: 'conflict', label: '⚡ 충돌', active: viewState === 'conflict' },
    { id: 'pressure', label: '🔥 압력맵', active: viewState === 'pressure' },
    { id: 'redefinition', label: '📋 업무재정의', active: viewState === 'redefinition' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
    // Risk Queue (기본)
    if (viewState === 'risk') {
      return <RiskQueuePanel orgId={orgId} />;
    }

    // Churn Alert
    if (viewState === 'churn') {
      return <ChurnAlertPanel orgId={orgId} />;
    }

    // 압력 히트맵 (ENGINE B)
    if (viewState === 'pressure') {
      return (
        <PressureHeatmapCard
          points={MOCK_PRESSURE_POINTS}
          onPointClick={(id) => {
            console.log('Point clicked:', id);
            setViewState('compare');
          }}
        />
      );
    }

    // Plan vs Reality 비교
    if (viewState === 'compare') {
      return (
        <PlanRealityCard
          comparisons={MOCK_COMPARISONS}
          period="2024년 1월 2주차"
        />
      );
    }

    // 업무 재정의 매트릭스 (ENGINE A)
    if (viewState === 'redefinition') {
      return (
        <TaskRedefinitionCard
          totalTasks={570}
          modules={MOCK_MODULES}
          onUnify={(id) => console.log('Unify:', id)}
          onDelete={(id) => console.log('Delete:', id)}
          onAutomate={(id) => console.log('Automate:', id)}
        />
      );
    }

    // 충돌 감지 화면
    if (hasConflict) {
      return (
        <ConflictCard
          conflict={MOCK_CONFLICT}
          onPrepare={handlePrepare}
          onEscalate={handleEscalate}
        />
      );
    }

    // 충돌 없을 때 - 압력 히트맵
    return (
      <PressureHeatmapCard
        points={MOCK_PRESSURE_POINTS}
        onPointClick={(id) => console.log('Point clicked:', id)}
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
                ? 'bg-blue-500 text-white'
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

export default OperatorView;
