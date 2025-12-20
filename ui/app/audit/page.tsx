'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemState } from '../providers/StateProvider';

export default function AuditPage() {
  const router = useRouter();
  const { state, lockAudit } = useSystemState();
  const [showAnimation, setShowAnimation] = useState(true);
  const [timestamp] = useState(new Date().toISOString());

  // ═══════════════════════════════════════════════════════════════════════════════
  // 진입 조건 검증 + Lock
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // localStorage에서 복원 시도
    const savedAuditId = typeof window !== 'undefined' 
      ? localStorage.getItem('autus.lastAuditId') 
      : null;
    
    if (!state.auditId && !savedAuditId) {
      router.replace('/solar');
      return;
    }

    // Audit Lock — 이 페이지에서 나갈 수 없음
    const auditId = state.auditId || savedAuditId || '';
    lockAudit(auditId);
    
    // 애니메이션 종료
    const timer = setTimeout(() => setShowAnimation(false), 1500);
    return () => clearTimeout(timer);
  }, [state.auditId, router, lockAudit]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 완전 잠금 (키보드, 마우스 이벤트 차단)
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    function preventNavigation(e: KeyboardEvent) {
      // F5, Ctrl+R, Alt+Left, Backspace 등 차단
      if (
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r') ||
        (e.altKey && e.key === 'ArrowLeft') ||
        (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement))
      ) {
        e.preventDefault();
      }
    }

    function preventContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    window.addEventListener('keydown', preventNavigation);
    window.addEventListener('contextmenu', preventContextMenu);
    
    return () => {
      window.removeEventListener('keydown', preventNavigation);
      window.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  // 표시할 Audit ID
  const displayAuditId = state.auditId || 
    (typeof window !== 'undefined' ? localStorage.getItem('autus.lastAuditId') : null) || 
    'UNKNOWN';

  // ═══════════════════════════════════════════════════════════════════════════════
  // UI (Terminal State)
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 성공 애니메이션 */}
      {showAnimation && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          zIndex: 100,
          animation: 'fadeOut 1.5s ease-out forwards',
        }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: '#00ff88',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'scaleIn 0.5s ease-out',
            boxShadow: '0 0 100px rgba(0,255,136,0.5)',
          }}>
            <span style={{ fontSize: 64, color: '#000' }}>✓</span>
          </div>
        </div>
      )}

      {/* 성공 아이콘 */}
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(0,255,136,0.1)',
        border: '3px solid #00ff88',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
      }}>
        <span style={{ fontSize: 56, color: '#00ff88' }}>✓</span>
      </div>

      {/* 상태 */}
      <div style={{
        fontSize: 36,
        fontWeight: 800,
        color: '#fff',
        marginBottom: 12,
        letterSpacing: 2,
      }}>
        RECOVERED
      </div>

      {/* Audit ID */}
      <div style={{
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace',
        marginBottom: 48,
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
      }}>
        AUDIT: {displayAuditId}
      </div>

      {/* 불가역성 메시지 */}
      <div style={{
        fontSize: 14,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 1.8,
        padding: '0 24px',
      }}>
        이 결정은 기록되었습니다.<br />
        번복하거나 수정할 수 없습니다.
      </div>

      {/* 하단 정보 */}
      <div style={{
        position: 'absolute',
        bottom: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* 타임스탬프 */}
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.2)',
          fontFamily: 'monospace',
        }}>
          {timestamp}
        </div>
        
        {/* Immutable badge */}
        <div style={{
          fontSize: 10,
          color: 'rgba(0,255,136,0.5)',
          fontFamily: 'monospace',
          padding: '4px 12px',
          border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 4,
        }}>
          IMMUTABLE
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }
        @keyframes scaleIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
