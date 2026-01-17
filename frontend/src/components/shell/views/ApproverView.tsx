/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS ApproverView - 승인자(K7+) 뷰
 * "책임 없는 승인을 가능하게 한다."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { 
  ApprovalStatusCard, 
  AuditReplayCard,
  SafetyStatusCard,
  type ApprovalTarget 
} from '../../cards';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_TARGET: ApprovalTarget = {
  id: 'APR-001',
  title: 'A동 3층 골조 검사',
  legalCompliance: true,
  matchRate: 99.7,
  status: 'COMPLIANT',
  checklistItems: [
    { id: '1', label: '철근 배근 검사', passed: true },
    { id: '2', label: '콘크리트 강도 시험', passed: true },
    { id: '3', label: '도면 일치 확인', passed: true },
    { id: '4', label: '안전 점검 완료', passed: true },
  ],
  documents: [
    { id: 'D1', name: '검사 보고서', generated: true },
    { id: 'D2', name: '품질 인증서', generated: true },
    { id: 'D3', name: '사진 증빙', generated: true },
  ],
};

const MOCK_AUDIT_LOGS = [
  { id: '1', timestamp: '2024-01-15 14:30', action: '도면 검토 완료', actor: '시스템', details: '자동 검증' },
  { id: '2', timestamp: '2024-01-15 14:25', action: '품질 검사 완료', actor: '김검사', details: '현장 확인' },
  { id: '3', timestamp: '2024-01-15 14:00', action: '안전 점검 완료', actor: '이안전', details: '' },
];

const MOCK_SAFETY_METRICS = [
  { id: '1', label: '철근 간격', value: 198, threshold: 200, unit: 'mm', status: 'safe' as const },
  { id: '2', label: '콘크리트 강도', value: 28, threshold: 24, unit: 'MPa', status: 'safe' as const },
  { id: '3', label: '피복 두께', value: 42, threshold: 40, unit: 'mm', status: 'safe' as const },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

type ViewState = 'approval' | 'audit' | 'safety';

const ApproverView: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('approval');

  const handleApprove = async (targetId: string) => {
    console.log('Approved:', targetId);
    // 승인 완료 후 감사 로그 표시
    setViewState('audit');
  };

  const handleReject = (targetId: string, reason: string) => {
    console.log('Rejected:', targetId, reason);
  };

  const handleRequestRevision = (targetId: string) => {
    console.log('Revision requested:', targetId);
  };

  const handleExportPDF = () => {
    console.log('Export PDF');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // 감사 재현 화면
  if (viewState === 'audit') {
    return (
      <AuditReplayCard
        approvalId="APR-001"
        approvalDate="2024-01-15 14:35"
        logs={MOCK_AUDIT_LOGS}
        complianceStatus="COMPLIANT"
        onExportPDF={handleExportPDF}
        onReplayTimeline={() => setViewState('safety')}
      />
    );
  }

  // 안전 상태 화면 (ENGINE B)
  if (viewState === 'safety') {
    return (
      <SafetyStatusCard
        metrics={MOCK_SAFETY_METRICS}
        overallStatus="SAFE"
        lastInspection="2024-01-15 14:00"
      />
    );
  }

  // 기본 - 승인 화면
  return (
    <ApprovalStatusCard
      target={MOCK_TARGET}
      onApprove={handleApprove}
      onReject={handleReject}
      onRequestRevision={handleRequestRevision}
    />
  );
};

export default ApproverView;
