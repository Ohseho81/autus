/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🤝 DelegateModal — 결정 위임 모달
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 결정을 다른 사용자에게 위임:
 * - 위임 요청 전송
 * - 위임 수락/거절
 * - 위임 완료 시 Synergy 보너스
 */
import React, { useState } from 'react';

interface DelegateModalProps {
  visible: boolean;
  mode: 'send' | 'receive';
  decision: {
    id: string;
    text: string;
    delta: number;
  };
  peer?: {
    id: string;
    name: string;
  };
  availablePeers?: Array<{
    id: string;
    name: string;
    lastSeen: string;
    synergyBonus: number;
  }>;
  onClose: () => void;
  onDelegate?: (peerId: string) => void;
  onAcceptDelegate?: () => void;
  onRejectDelegate?: () => void;
}

export const DelegateModal: React.FC<DelegateModalProps> = ({
  visible,
  mode,
  decision,
  peer,
  availablePeers = [],
  onClose,
  onDelegate,
  onAcceptDelegate,
  onRejectDelegate,
}) => {
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {mode === 'send' ? (
          // 위임 보내기
          <>
            <div style={styles.header}>
              <span style={styles.headerIcon}>🤝</span>
              <h2 style={styles.title}>결정 위임</h2>
            </div>

            <div style={styles.decisionCard}>
              <div style={styles.decisionText}>{decision.text}</div>
              <div style={styles.decisionMeta}>+{decision.delta}V</div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>누구에게 위임할까요?</div>
              
              {availablePeers.length === 0 ? (
                <div style={styles.emptyPeers}>
                  <span style={styles.emptyIcon}>👤</span>
                  <p>연결된 피어가 없습니다</p>
                  <p style={styles.emptyHint}>QR 스캔으로 피어를 추가하세요</p>
                </div>
              ) : (
                <div style={styles.peerList}>
                  {availablePeers.map(p => (
                    <button
                      key={p.id}
                      style={{
                        ...styles.peerItem,
                        borderColor: selectedPeer === p.id ? '#10b981' : 'transparent',
                        background: selectedPeer === p.id ? 'rgba(16,185,129,0.1)' : '#1f2937',
                      }}
                      onClick={() => setSelectedPeer(p.id)}
                    >
                      <div style={styles.peerAvatar}>👤</div>
                      <div style={styles.peerInfo}>
                        <div style={styles.peerName}>{p.name}</div>
                        <div style={styles.peerMeta}>
                          마지막 연결: {new Date(p.lastSeen).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={styles.synergyBonus}>
                        +{(p.synergyBonus * 100).toFixed(0)}% s
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.notice}>
              <span style={styles.noticeIcon}>💡</span>
              <span>위임 수락 시 양쪽 모두 Synergy 보너스를 받습니다</span>
            </div>

            <div style={styles.buttons}>
              <button style={styles.btnSecondary} onClick={onClose}>취소</button>
              <button 
                style={{
                  ...styles.btnPrimary,
                  opacity: selectedPeer ? 1 : 0.5,
                }}
                disabled={!selectedPeer}
                onClick={() => selectedPeer && onDelegate?.(selectedPeer)}
              >
                위임 요청
              </button>
            </div>
          </>
        ) : (
          // 위임 받기
          <>
            <div style={styles.header}>
              <span style={styles.headerIcon}>📩</span>
              <h2 style={styles.title}>위임 요청</h2>
            </div>

            <div style={styles.fromPeer}>
              <span style={styles.fromLabel}>From:</span>
              <span style={styles.fromName}>{peer?.name || peer?.id?.slice(0, 8)}</span>
            </div>

            <div style={styles.decisionCard}>
              <div style={styles.decisionText}>{decision.text}</div>
              <div style={styles.decisionMeta}>+{decision.delta}V</div>
            </div>

            <div style={styles.rewardInfo}>
              <div style={styles.rewardRow}>
                <span>수락 시 보상</span>
                <span style={styles.rewardValue}>+{Math.round(decision.delta * 0.5)}V</span>
              </div>
              <div style={styles.rewardRow}>
                <span>Synergy 보너스</span>
                <span style={styles.rewardValue}>+2%</span>
              </div>
            </div>

            <div style={styles.buttons}>
              <button style={styles.btnSecondary} onClick={onRejectDelegate}>거절</button>
              <button style={styles.btnPrimary} onClick={onAcceptDelegate}>수락</button>
            </div>

            <div style={styles.disclaimer}>
              * 거절해도 페널티 없음
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
    maxWidth: '380px',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  decisionCard: {
    background: '#1f2937',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  decisionText: {
    fontSize: '15px',
    lineHeight: 1.5,
    marginBottom: '8px',
    whiteSpace: 'pre-line',
  },
  decisionMeta: {
    fontSize: '14px',
    color: '#10b981',
    fontWeight: 600,
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '12px',
  },
  emptyPeers: {
    textAlign: 'center',
    padding: '24px',
    color: '#6b7280',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '12px',
    display: 'block',
  },
  emptyHint: {
    fontSize: '12px',
    marginTop: '8px',
  },
  peerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  peerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  peerAvatar: {
    fontSize: '24px',
  },
  peerInfo: {
    flex: 1,
  },
  peerName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#f3f4f6',
  },
  peerMeta: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px',
  },
  synergyBonus: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: 600,
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '4px 8px',
    borderRadius: '8px',
  },
  notice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'rgba(6, 182, 212, 0.1)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#06b6d4',
    marginBottom: '20px',
  },
  noticeIcon: {
    fontSize: '14px',
  },
  fromPeer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  fromLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  fromName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#f3f4f6',
  },
  rewardInfo: {
    background: 'rgba(16, 185, 129, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  rewardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
  },
  rewardValue: {
    color: '#10b981',
    fontWeight: 600,
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
    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
    border: 'none',
    borderRadius: '12px',
    color: '#0a0f1a',
    cursor: 'pointer',
  },
  disclaimer: {
    marginTop: '16px',
    fontSize: '11px',
    color: '#4b5563',
    textAlign: 'center',
  },
};

export default DelegateModal;
