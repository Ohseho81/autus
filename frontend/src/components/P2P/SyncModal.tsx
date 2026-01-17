/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔗 SyncModal — P2P 동기화 모달
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ledger HEAD 불일치 시 표시되는 4가지 상태:
 * - OK: 동기화 완료
 * - AHEAD: 내가 앞섬
 * - BEHIND: 내가 뒤처짐
 * - FORK: 분기 감지
 * 
 * 원칙:
 * - 판단 금지 ("오류", "문제" 사용 X)
 * - 사실만 진술
 * - 기본 선택: 무시/거절
 * - 자동 병합 금지
 */
import React, { useEffect } from 'react';
import type { SyncStatus } from '../../lib/p2p';

interface SyncModalProps {
  visible: boolean;
  status: SyncStatus;
  peerName: string;
  peerId: string;
  myHead: string;
  peerHead: string;
  myBlockCount: number;
  peerBlockCount: number;
  difference: number;
  forkPoint?: string;
  onClose: () => void;
  onIgnore?: () => void;
  onSendSync?: () => void;
  onRequestBlocks?: () => void;
}

const STATUS_CONFIG: Record<SyncStatus, {
  icon: string;
  title: string;
  color: string;
  bgColor: string;
  autoClose: number | null;
}> = {
  ok: {
    icon: '✓',
    title: 'SYNC OK',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    autoClose: 3000,
  },
  ahead: {
    icon: '⚠',
    title: 'HEAD MISMATCH',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    autoClose: null,
  },
  behind: {
    icon: '⚠',
    title: 'HEAD MISMATCH',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    autoClose: null,
  },
  fork: {
    icon: '🔴',
    title: 'FORK DETECTED',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    autoClose: null,
  },
};

export const SyncModal: React.FC<SyncModalProps> = ({
  visible,
  status,
  peerName,
  peerId,
  myHead,
  peerHead,
  myBlockCount,
  peerBlockCount,
  difference,
  forkPoint,
  onClose,
  onIgnore,
  onSendSync,
  onRequestBlocks,
}) => {
  const config = STATUS_CONFIG[status];

  // 자동 닫기 (OK 상태)
  useEffect(() => {
    if (visible && config.autoClose) {
      const timer = setTimeout(onClose, config.autoClose);
      return () => clearTimeout(timer);
    }
  }, [visible, config.autoClose, onClose]);

  if (!visible) return null;

  const shortHash = (hash: string) => hash.slice(0, 6) + '...';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div 
        style={{ ...styles.modal, borderColor: config.color }}
        onClick={e => e.stopPropagation()}
      >
        {/* Peer Info */}
        <div style={styles.peerInfo}>
          <span style={styles.peerIcon}>🔗</span>
          <span style={styles.peerName}>Peer: {peerName || peerId.slice(0, 8)}</span>
        </div>

        {/* Status Icon */}
        <div 
          style={{
            ...styles.statusIcon,
            background: config.bgColor,
            color: config.color,
          }}
        >
          {config.icon}
        </div>

        {/* Status Title */}
        <div style={{ ...styles.statusTitle, color: config.color }}>
          {config.title}
        </div>

        {/* Content by Status */}
        {status === 'ok' && (
          <div style={styles.okContent}>
            <div style={styles.hashRow}>
              <span style={styles.hashLabel}>Head:</span>
              <span style={styles.hashValue}>{shortHash(myHead)}</span>
            </div>
            <div style={styles.hashRow}>
              <span style={styles.hashLabel}>Blocks:</span>
              <span style={styles.hashValue}>{myBlockCount} = {peerBlockCount}</span>
            </div>
          </div>
        )}

        {status === 'ahead' && (
          <>
            <div style={styles.hashComparison}>
              <div style={styles.hashRow}>
                <span style={styles.hashLabel}>나:</span>
                <span style={styles.hashValue}>{shortHash(myHead)} (Block #{myBlockCount})</span>
              </div>
              <div style={styles.hashRow}>
                <span style={styles.hashLabel}>Peer:</span>
                <span style={styles.hashValue}>{shortHash(peerHead)} (Block #{peerBlockCount})</span>
              </div>
            </div>
            <div style={styles.messageBox}>
              <p>상대방이 {difference}개 블록 뒤처져 있습니다.</p>
              <p>동기화를 제안할 수 있습니다.</p>
            </div>
            <div style={styles.buttons}>
              <button style={styles.btnSecondary} onClick={onIgnore}>무시</button>
              <button style={styles.btnPrimary} onClick={onSendSync}>동기화 제안 보내기</button>
            </div>
          </>
        )}

        {status === 'behind' && (
          <>
            <div style={styles.hashComparison}>
              <div style={styles.hashRow}>
                <span style={styles.hashLabel}>나:</span>
                <span style={styles.hashValue}>{shortHash(myHead)} (Block #{myBlockCount})</span>
              </div>
              <div style={styles.hashRow}>
                <span style={styles.hashLabel}>Peer:</span>
                <span style={styles.hashValue}>{shortHash(peerHead)} (Block #{peerBlockCount})</span>
              </div>
            </div>
            <div style={styles.messageBox}>
              <p>내 Ledger가 {difference}개 블록 뒤처져 있습니다.</p>
              <p>상대방의 블록을 받으시겠습니까?</p>
            </div>
            <div style={styles.buttons}>
              <button style={styles.btnSecondary} onClick={onIgnore}>거절</button>
              <button style={styles.btnPrimary} onClick={onRequestBlocks}>블록 요청</button>
            </div>
          </>
        )}

        {status === 'fork' && (
          <>
            <div style={styles.forkDiagram}>
              <div style={styles.forkLine}>
                <span>분기점: Block #{forkPoint?.slice(0, 6)}</span>
              </div>
              <div style={styles.forkBranches}>
                <div style={styles.forkBranch}>
                  <span>나:</span>
                  <span>...→ #{myBlockCount - 2} → #{myBlockCount - 1} → #{myBlockCount}</span>
                </div>
                <div style={styles.forkBranch}>
                  <span>Peer:</span>
                  <span>...→ #{peerBlockCount - 1} → #{peerBlockCount}</span>
                </div>
              </div>
            </div>
            <div style={{ ...styles.messageBox, borderColor: config.color }}>
              <p>서로 다른 결정이 기록되었습니다.</p>
              <p>수동 검토가 필요합니다.</p>
              <p style={styles.warning}>자동 병합은 지원되지 않습니다.</p>
            </div>
            <div style={styles.buttons}>
              <button style={styles.btnSecondary} onClick={onClose}>닫기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#111827',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '360px',
    width: '100%',
    border: '2px solid',
  },
  peerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  peerIcon: {
    fontSize: '16px',
  },
  peerName: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  statusIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    margin: '0 auto 16px',
  },
  statusTitle: {
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '1px',
    marginBottom: '20px',
  },
  okContent: {
    textAlign: 'center',
  },
  hashComparison: {
    marginBottom: '16px',
  },
  hashRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  hashLabel: {
    color: '#6b7280',
    fontSize: '13px',
  },
  hashValue: {
    color: '#d1d5db',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  messageBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#d1d5db',
    lineHeight: 1.6,
  },
  warning: {
    color: '#9ca3af',
    fontSize: '12px',
    marginTop: '8px',
  },
  forkDiagram: {
    background: 'rgba(239, 68, 68, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  forkLine: {
    color: '#ef4444',
    marginBottom: '12px',
  },
  forkBranches: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    color: '#9ca3af',
  },
  forkBranch: {
    display: 'flex',
    gap: '8px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
  },
  btnSecondary: {
    flex: 1,
    padding: '14px',
    fontSize: '14px',
    fontWeight: 600,
    background: 'transparent',
    border: '1px solid #374151',
    borderRadius: '12px',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  btnPrimary: {
    flex: 1,
    padding: '14px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#f59e0b',
    border: 'none',
    borderRadius: '12px',
    color: '#0a0f1a',
    cursor: 'pointer',
  },
};

export default SyncModal;
