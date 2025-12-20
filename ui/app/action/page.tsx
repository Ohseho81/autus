'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemState } from '../providers/StateProvider';

export default function ActionPage() {
  const router = useRouter();
  const { state, executeAction } = useSystemState();
  const [executing, setExecuting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 진입 조건 검증
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // 조건 미충족 시 solar로 리다이렉트
    if (!state.canNavigateToAction && !state.canNavigateToAudit) {
      if (state.auditId) {
        // 이미 실행된 경우 audit으로
        router.replace('/audit');
      } else {
        router.replace('/solar');
      }
    }
    
    // RED 상태에서는 즉시 차단
    if (state.gate === 'RED') {
      router.replace('/solar');
    }
  }, [state.canNavigateToAction, state.canNavigateToAudit, state.auditId, state.gate, router]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 자동 실행 카운트다운
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (executing || !state.allowedAction) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleExecute();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [executing, state.allowedAction]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 액션 실행
  // ═══════════════════════════════════════════════════════════════════════════════
  async function handleExecute() {
    if (executing || !state.allowedAction) return;
    
    setExecuting(true);
    setError(null);

    // 화면 프리즈 효과
    document.body.style.transition = 'filter 0.3s';
    document.body.style.filter = 'brightness(0.5)';

    await new Promise(resolve => setTimeout(resolve, 300));

    const result = await executeAction(state.allowedAction);
    
    document.body.style.filter = 'brightness(1)';
    
    if (result.success) {
      // 성공 → audit으로 이동
      router.push('/audit');
    } else {
      // 실패 시 재시도 허용
      setExecuting(false);
      setCountdown(5);
      setError('실행 실패. 다시 시도합니다.');
    }
  }

  // 액션 라벨
  const actionLabels: Record<string, string> = {
    'RECOVER': '회복',
    'DEFRICTION': '비효율 제거',
    'SHOCK_DAMP': '충격 완화',
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // UI
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
    }}>
      {/* Gate 표시 */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        padding: '8px 20px',
        borderRadius: 6,
        fontWeight: 800,
        fontSize: 14,
        background: state.gate === 'GREEN' ? '#00ff88' :
                    state.gate === 'AMBER' || state.gate === 'YELLOW' ? '#ffaa00' : '#ff4444',
        color: state.gate === 'RED' ? '#fff' : '#000',
      }}>
        {state.gate}
      </div>

      {/* Risk 표시 */}
      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontFamily: 'monospace',
      }}>
        RISK: {state.risk}%
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ textAlign: 'center', maxWidth: 500, padding: '0 24px' }}>
        {/* Impact */}
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: '#00ff88',
          marginBottom: 16,
          textShadow: '0 0 60px rgba(0,255,136,0.4)',
        }}>
          -{state.risk}%
        </div>

        {/* Warning */}
        <div style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 48,
          lineHeight: 1.6,
        }}>
          {executing ? '실행 중...' : '지금 조치하지 않으면 손실 확정'}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 20px',
            marginBottom: 24,
            background: 'rgba(255,68,68,0.2)',
            border: '1px solid rgba(255,68,68,0.3)',
            borderRadius: 8,
            color: '#ff6666',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handleExecute}
          disabled={executing}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '24px 48px',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 1,
            background: executing ? '#333' : '#00ff88',
            color: executing ? '#666' : '#000',
            border: 'none',
            cursor: executing ? 'not-allowed' : 'pointer',
            marginBottom: 32,
          }}
        >
          {executing ? 'EXECUTING...' : (actionLabels[state.allowedAction || ''] || '지금 조치')}
        </button>

        {/* Countdown */}
        {!executing && countdown > 0 && (
          <div style={{
            fontSize: 96,
            fontWeight: 200,
            color: countdown <= 2 ? '#00ff88' : 'rgba(255,255,255,0.15)',
            fontFamily: 'monospace',
            transition: 'color 0.3s',
          }}>
            {countdown}
          </div>
        )}

        {/* Action type */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.2)',
          fontSize: 12,
          fontFamily: 'monospace',
        }}>
          ACTION: {state.allowedAction}
        </div>
      </div>
    </div>
  );
}
