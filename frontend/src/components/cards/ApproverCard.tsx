/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS ApproverCard - 승인자(K7+) 전용 카드
 * "책임 없는 승인을 가능하게 한다."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
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

export interface ApprovalTarget {
  id: string;
  title: string;
  legalCompliance: boolean;
  matchRate: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
  checklistItems: Array<{
    id: string;
    label: string;
    passed: boolean;
  }>;
  documents: Array<{
    id: string;
    name: string;
    generated: boolean;
  }>;
}

interface ApproverCardProps {
  target: ApprovalTarget;
  onApprove: (targetId: string) => void;
  onReject?: (targetId: string, reason: string) => void;
  onRequestRevision?: (targetId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ApprovalStatusCard - 승인 상태 카드 (ENGINE A + B)
// ═══════════════════════════════════════════════════════════════════════════════

export function ApprovalStatusCard({
  target,
  onApprove,
  onReject,
  onRequestRevision,
}: ApproverCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const allPassed = target.checklistItems.every(item => item.passed);
  const allDocumentsReady = target.documents.every(doc => doc.generated);
  const canApprove = target.status === 'COMPLIANT' && allPassed && allDocumentsReady;

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove(target.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    if (onReject && rejectReason.trim()) {
      onReject(target.id, rejectReason);
      setShowRejectModal(false);
    }
  };

  return (
    <BaseCard 
      type="approval"
      title={target.title}
      priority={target.status === 'NON_COMPLIANT' ? 'high' : 'normal'}
    >
      {/* 컴플라이언스 상태 */}
      <div className={`
        p-4 rounded-xl text-center
        ${target.status === 'COMPLIANT' 
          ? 'bg-green-500/10 border border-green-500/30' 
          : target.status === 'NON_COMPLIANT'
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-gray-500/10 border border-gray-500/30'
        }
      `}>
        <span className={`
          text-2xl font-bold
          ${target.status === 'COMPLIANT' ? 'text-green-400' :
            target.status === 'NON_COMPLIANT' ? 'text-red-400' : 'text-gray-400'
          }
        `}>
          {target.status}
        </span>
      </div>

      {/* 법적 기준 */}
      <CardInfoRow 
        label="법정 기준" 
        value={
          <span className={target.legalCompliance ? 'text-green-400' : 'text-red-400'}>
            {target.legalCompliance ? '충족' : '미충족'}
          </span>
        } 
      />

      {/* 도면 일치율 */}
      <CardInfoRow 
        label="도면 일치율" 
        value={`${target.matchRate}%`}
        highlight={target.matchRate < 95}
      />

      {/* 체크리스트 */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400">체크리스트:</p>
        <div className="space-y-1">
          {target.checklistItems.map((item) => (
            <div 
              key={item.id}
              className="flex items-center gap-2 text-sm"
            >
              <span className={item.passed ? 'text-green-400' : 'text-red-400'}>
                {item.passed ? '✓' : '✗'}
              </span>
              <span className={item.passed ? 'text-gray-300' : 'text-red-300'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 문서 상태 */}
      {!allDocumentsReady && (
        <CardAlert 
          type="warning" 
          message="일부 문서가 아직 준비되지 않았습니다" 
        />
      )}

      {/* 액션 버튼 */}
      <CardActions variant="vertical">
        <CardButton 
          variant="primary" 
          onClick={handleApprove}
          disabled={!canApprove}
          loading={isLoading}
          fullWidth
        >
          승인
        </CardButton>
        
        {onRequestRevision && !canApprove && (
          <CardButton 
            variant="secondary" 
            onClick={() => onRequestRevision(target.id)}
            fullWidth
          >
            수정 요청
          </CardButton>
        )}

        {onReject && (
          <CardButton 
            variant="ghost" 
            onClick={() => setShowRejectModal(true)}
          >
            반려
          </CardButton>
        )}
      </CardActions>

      {/* 반려 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-4">반려 사유</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 p-3 bg-gray-700 rounded-lg text-white resize-none"
              placeholder="반려 사유를 입력하세요..."
            />
            <div className="flex gap-2 mt-4">
              <CardButton variant="danger" onClick={handleReject} fullWidth>
                반려
              </CardButton>
              <CardButton variant="ghost" onClick={() => setShowRejectModal(false)}>
                취소
              </CardButton>
            </div>
          </div>
        </div>
      )}
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AuditReplayCard - 사후 감사 재현 카드
// ═══════════════════════════════════════════════════════════════════════════════

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

interface AuditReplayCardProps {
  approvalId: string;
  approvalDate: string;
  logs: AuditLog[];
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT';
  onExportPDF?: () => void;
  onReplayTimeline?: () => void;
}

export function AuditReplayCard({
  approvalId,
  approvalDate,
  logs,
  complianceStatus,
  onExportPDF,
  onReplayTimeline,
}: AuditReplayCardProps) {
  return (
    <BaseCard 
      type="info"
      title="승인 시점 기록 재현"
      subtitle={`승인일: ${approvalDate}`}
    >
      {/* 컴플라이언스 상태 */}
      <div className={`
        p-3 rounded-lg text-center
        ${complianceStatus === 'COMPLIANT' 
          ? 'bg-green-500/10 text-green-400' 
          : 'bg-red-500/10 text-red-400'
        }
      `}>
        승인 시점 상태: {complianceStatus}
      </div>

      {/* 로그 목록 */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        <p className="text-sm text-gray-400">변경 이력:</p>
        {logs.map((log) => (
          <div 
            key={log.id}
            className="p-3 bg-gray-700/30 rounded-lg text-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400">{log.timestamp}</span>
              <span className="text-xs text-gray-500">{log.actor}</span>
            </div>
            <p className="text-white">{log.action}</p>
            {log.details && (
              <p className="text-xs text-gray-400 mt-1">{log.details}</p>
            )}
          </div>
        ))}
      </div>

      {/* 액션 버튼 */}
      <CardActions>
        {onExportPDF && (
          <CardButton variant="primary" onClick={onExportPDF} fullWidth>
            PDF 출력
          </CardButton>
        )}
        {onReplayTimeline && (
          <CardButton variant="secondary" onClick={onReplayTimeline}>
            타임라인 재현
          </CardButton>
        )}
      </CardActions>
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ImmutableLogCard - 불변 로그 카드
// ═══════════════════════════════════════════════════════════════════════════════

interface ImmutableLog {
  hash: string;
  timestamp: string;
  action: string;
  verified: boolean;
}

interface ImmutableLogCardProps {
  logs: ImmutableLog[];
  blockchainVerified?: boolean;
}

export function ImmutableLogCard({ 
  logs, 
  blockchainVerified = false 
}: ImmutableLogCardProps) {
  return (
    <BaseCard 
      type={blockchainVerified ? 'success' : 'info'}
      title="불변 승인 로그"
      subtitle={blockchainVerified ? '블록체인 검증 완료' : '로컬 검증'}
    >
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {logs.map((log, idx) => (
          <div 
            key={idx}
            className="p-3 bg-gray-700/30 rounded-lg"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{log.timestamp}</span>
              <span className={`text-xs ${log.verified ? 'text-green-400' : 'text-amber-400'}`}>
                {log.verified ? '✓ 검증됨' : '⏳ 검증 중'}
              </span>
            </div>
            <p className="text-sm text-white">{log.action}</p>
            <p className="text-xs text-gray-500 font-mono truncate mt-1">
              Hash: {log.hash.substring(0, 16)}...
            </p>
          </div>
        ))}
      </div>
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SafetyStatusCard - 안전 상태 카드 (ENGINE B)
// ═══════════════════════════════════════════════════════════════════════════════

interface SafetyMetric {
  id: string;
  label: string;
  value: number;
  threshold: number;
  unit: string;
  status: 'safe' | 'warning' | 'danger';
}

interface SafetyStatusCardProps {
  metrics: SafetyMetric[];
  overallStatus: 'SAFE' | 'CAUTION' | 'DANGER';
  lastInspection: string;
}

export function SafetyStatusCard({
  metrics,
  overallStatus,
  lastInspection,
}: SafetyStatusCardProps) {
  const statusConfig = {
    SAFE: { label: '안전', color: 'text-green-400', bg: 'bg-green-500/10', icon: '✅' },
    CAUTION: { label: '주의', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: '⚠️' },
    DANGER: { label: '위험', color: 'text-red-400', bg: 'bg-red-500/10', icon: '🚨' },
  };

  const metricStatusColors = {
    safe: 'text-green-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  };

  const config = statusConfig[overallStatus];

  return (
    <BaseCard 
      type={overallStatus === 'DANGER' ? 'warning' : 'info'}
      title="안전 상태"
    >
      {/* 전체 상태 */}
      <div className={`p-4 rounded-xl text-center ${config.bg}`}>
        <span className="text-3xl mb-2 block">{config.icon}</span>
        <span className={`text-2xl font-bold ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* 개별 지표 */}
      <div className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.id} className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{metric.label}</span>
            <span className={`font-medium ${metricStatusColors[metric.status]}`}>
              {metric.value}{metric.unit}
              <span className="text-xs text-gray-500 ml-1">
                (기준: {metric.threshold}{metric.unit})
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* 마지막 점검 */}
      <p className="text-xs text-gray-500 text-center">
        마지막 점검: {lastInspection}
      </p>
    </BaseCard>
  );
}

export default ApprovalStatusCard;
