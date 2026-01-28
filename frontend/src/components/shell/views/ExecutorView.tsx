/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS ExecutorView - 실행자(K1~K2) 뷰 / Optimus
 * "생각하지 않게 한다. 다음 행동만 보여준다."
 * 
 * 연결된 API: /api/quick-tag
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { 
  NextActionCard, 
  AutoReportCard, 
  RiskAlertCard,
  TaskDeletedCard,
  type NextAction 
} from '../../cards';
import { QuickTagPanel } from '../../panels';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data (실제 구현에서는 API 연동)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_ACTIONS: NextAction[] = [
  {
    id: '1',
    task: '철근 배근 (구간 A)',
    standard: '200mm 간격',
    status: 'in_progress',
    warning: '간격 230mm 감지 - 조정 필요',
    metadata: {
      location: 'A동 3층',
      priority: 'high',
    },
  },
  {
    id: '2',
    task: '콘크리트 타설 준비',
    standard: 'KS F 4009 기준',
    status: 'pending',
    metadata: {
      location: 'A동 2층',
      deadline: '14:00',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

type ViewState = 'quicktag' | 'action' | 'report' | 'risk' | 'deleted';

const ExecutorView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('quicktag'); // 기본: Quick Tag
  const [currentAction, setCurrentAction] = useState<NextAction>(MOCK_ACTIONS[0]);
  const [riskAlert, setRiskAlert] = useState<{
    type: 'mistake' | 'safety';
    message: string;
  } | null>(null);
  
  const orgId = 'demo-org'; // TODO: 실제 org_id로 교체
  const taggerId = 'user-optimus'; // TODO: 실제 user_id로 교체

  // 위험 경고 시뮬레이션 (ENGINE B)
  useEffect(() => {
    if (currentAction.warning) {
      setRiskAlert({
        type: 'safety',
        message: currentAction.warning,
      });
      setViewState('risk');
    }
  }, [currentAction]);

  const handleContinue = async (actionId: string) => {
    console.log('Continue action:', actionId);
    // API 호출 후 다음 작업으로 이동
    setViewState('action');
    setRiskAlert(null);
  };

  const handleComplete = async (actionId: string) => {
    console.log('Complete action:', actionId);
    // 완료 후 자동 보고서 생성
    setViewState('report');
  };

  const handleReportConfirm = () => {
    // 다음 작업으로 이동
    const nextIndex = MOCK_ACTIONS.findIndex(a => a.id === currentAction.id) + 1;
    if (nextIndex < MOCK_ACTIONS.length) {
      setCurrentAction(MOCK_ACTIONS[nextIndex]);
    }
    setViewState('action');
  };

  const handleRiskAcknowledge = () => {
    setRiskAlert(null);
    setViewState('action');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Tab Navigation
  // ─────────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'quicktag', label: '⚡ Quick Tag', active: viewState === 'quicktag' },
    { id: 'action', label: '📋 작업', active: viewState === 'action' },
    { id: 'report', label: '📄 보고서', active: viewState === 'report' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
    // Quick Tag (기본)
    if (viewState === 'quicktag') {
      return (
        <QuickTagPanel
          orgId={orgId}
          taggerId={taggerId}
          onTagCreated={(result) => {
            if (result.risk_triggered) {
              // 위험 감지 시 알림
              console.log('Risk triggered:', result);
            }
          }}
        />
      );
    }

    // 위험 경고 화면
    if (viewState === 'risk' && riskAlert) {
      return (
        <RiskAlertCard
          riskType={riskAlert.type}
          message={riskAlert.message}
          suggestion="기준에 맞게 간격을 조정한 후 계속하세요"
          onAcknowledge={handleRiskAcknowledge}
        />
      );
    }

    // 자동 보고서 화면
    if (viewState === 'report') {
      return (
        <AutoReportCard
          reportId="RPT-001"
          photoCount={6}
          workDuration="2시간 15분"
          autoGenerated={true}
          onConfirm={handleReportConfirm}
        />
      );
    }

    // 업무 삭제 알림 화면
    if (viewState === 'deleted') {
      return (
        <TaskDeletedCard
          taskName="일일 점검 보고서 작성"
          reason="자동화 시스템으로 대체되었습니다"
          onConfirm={() => setViewState('action')}
        />
      );
    }

    // 다음 작업 화면
    return (
      <NextActionCard
        action={currentAction}
        onContinue={handleContinue}
        onComplete={handleComplete}
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
                ? 'bg-purple-500 text-white'
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

export default ExecutorView;
