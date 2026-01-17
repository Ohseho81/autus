/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚖️ DecisionCompare — 결정 전/후 비교 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * What-If 분석: 결정에 따른 미래 V 비교
 * 
 * Features:
 * - Accept vs Reject 시나리오 비교
 * - 12개월 후 V 예측
 * - 차이 시각화
 * - 추천 표시
 */
import React, { useMemo } from 'react';

interface DecisionCompareProps {
  decisionText: string;
  currentV: number;
  currentM: number;
  currentT: number;
  currentS: number;
  delta: number;       // Accept 시 M 증가량
  sBoost?: number;     // Accept 시 s 증가량
  months?: number;     // 예측 기간
  onAccept?: () => void;
  onReject?: () => void;
}

interface Scenario {
  label: string;
  V: number;
  V12: number;
  growth: number;
  color: string;
  recommended: boolean;
}

export const DecisionCompare: React.FC<DecisionCompareProps> = ({
  decisionText,
  currentV,
  currentM,
  currentT,
  currentS,
  delta,
  sBoost = 0.02,
  months = 12,
  onAccept,
  onReject,
}) => {
  // 시나리오 계산
  const scenarios = useMemo((): { accept: Scenario; reject: Scenario } => {
    // Accept 시나리오
    const acceptM = currentM + delta;
    const acceptS = Math.min(1, currentS + sBoost);
    const acceptV = Math.round((acceptM - currentT) * Math.pow(1 + acceptS, 1));
    const acceptV12 = Math.round((acceptM - currentT) * Math.pow(1 + acceptS, months));
    
    // Reject 시나리오 (현상 유지)
    const rejectV = currentV;
    const rejectV12 = Math.round((currentM - currentT) * Math.pow(1 + currentS, months));
    
    const acceptGrowth = currentV > 0 ? ((acceptV12 - currentV) / currentV * 100) : 0;
    const rejectGrowth = currentV > 0 ? ((rejectV12 - currentV) / currentV * 100) : 0;
    
    return {
      accept: {
        label: '예',
        V: acceptV,
        V12: acceptV12,
        growth: acceptGrowth,
        color: '#10b981',
        recommended: acceptV12 > rejectV12,
      },
      reject: {
        label: '아니오',
        V: rejectV,
        V12: rejectV12,
        growth: rejectGrowth,
        color: '#6b7280',
        recommended: rejectV12 > acceptV12,
      },
    };
  }, [currentV, currentM, currentT, currentS, delta, sBoost, months]);

  const difference = scenarios.accept.V12 - scenarios.reject.V12;
  const maxV12 = Math.max(scenarios.accept.V12, scenarios.reject.V12);

  return (
    <div style={styles.container}>
      {/* 질문 */}
      <div style={styles.question}>
        <div style={styles.questionText}>{decisionText}</div>
        <div style={styles.deltaInfo}>+{delta}V · Synergy +{(sBoost * 100).toFixed(0)}%</div>
      </div>

      {/* 비교 카드 */}
      <div style={styles.compareGrid}>
        {/* Accept 시나리오 */}
        <div 
          style={{
            ...styles.scenarioCard,
            borderColor: scenarios.accept.recommended ? scenarios.accept.color : 'transparent',
          }}
        >
          {scenarios.accept.recommended && (
            <div style={styles.recommended}>추천</div>
          )}
          <div style={styles.scenarioLabel}>예</div>
          
          <div style={styles.vSection}>
            <div style={styles.vNow}>
              <span style={styles.vSmall}>지금</span>
              <span style={{ ...styles.vNumber, color: scenarios.accept.color }}>
                {scenarios.accept.V}
              </span>
            </div>
            <div style={styles.arrow}>→</div>
            <div style={styles.vFuture}>
              <span style={styles.vSmall}>{months}개월 후</span>
              <span style={{ ...styles.vNumberLarge, color: scenarios.accept.color }}>
                {scenarios.accept.V12}
              </span>
            </div>
          </div>
          
          <div style={styles.growthBar}>
            <div 
              style={{
                ...styles.growthFill,
                width: `${(scenarios.accept.V12 / maxV12) * 100}%`,
                background: `linear-gradient(90deg, ${scenarios.accept.color}, #06b6d4)`,
              }}
            />
          </div>
          
          <div style={{ ...styles.growth, color: scenarios.accept.color }}>
            +{scenarios.accept.growth.toFixed(0)}% 성장
          </div>
        </div>

        {/* Reject 시나리오 */}
        <div 
          style={{
            ...styles.scenarioCard,
            borderColor: scenarios.reject.recommended ? scenarios.reject.color : 'transparent',
          }}
        >
          {scenarios.reject.recommended && (
            <div style={{ ...styles.recommended, background: scenarios.reject.color }}>추천</div>
          )}
          <div style={styles.scenarioLabel}>아니오</div>
          
          <div style={styles.vSection}>
            <div style={styles.vNow}>
              <span style={styles.vSmall}>지금</span>
              <span style={{ ...styles.vNumber, color: scenarios.reject.color }}>
                {scenarios.reject.V}
              </span>
            </div>
            <div style={styles.arrow}>→</div>
            <div style={styles.vFuture}>
              <span style={styles.vSmall}>{months}개월 후</span>
              <span style={{ ...styles.vNumberLarge, color: scenarios.reject.color }}>
                {scenarios.reject.V12}
              </span>
            </div>
          </div>
          
          <div style={styles.growthBar}>
            <div 
              style={{
                ...styles.growthFill,
                width: `${(scenarios.reject.V12 / maxV12) * 100}%`,
                background: scenarios.reject.color,
              }}
            />
          </div>
          
          <div style={{ ...styles.growth, color: scenarios.reject.color }}>
            +{scenarios.reject.growth.toFixed(0)}% 성장
          </div>
        </div>
      </div>

      {/* 차이 요약 */}
      <div style={styles.summary}>
        <div style={styles.summaryIcon}>
          {difference > 0 ? '📈' : difference < 0 ? '📉' : '➡️'}
        </div>
        <div style={styles.summaryText}>
          {difference > 0 ? (
            <>
              <strong style={{ color: '#10b981' }}>예</strong>를 선택하면{' '}
              <strong style={{ color: '#10b981' }}>+{difference}V</strong> 더 성장
            </>
          ) : difference < 0 ? (
            <>
              <strong style={{ color: '#6b7280' }}>아니오</strong>를 선택하면{' '}
              <strong style={{ color: '#6b7280' }}>+{Math.abs(difference)}V</strong> 더 성장
            </>
          ) : (
            '두 선택의 결과가 동일합니다'
          )}
        </div>
      </div>

      {/* 버튼 */}
      <div style={styles.buttons}>
        <button 
          style={styles.btnReject}
          onClick={onReject}
        >
          아니오
        </button>
        <button 
          style={styles.btnAccept}
          onClick={onAccept}
        >
          예
        </button>
      </div>

      {/* 면책 */}
      <div style={styles.disclaimer}>
        * 예측은 현재 Synergy({(currentS * 100).toFixed(1)}%) 기준이며 실제와 다를 수 있습니다
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#0a0f1a',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '400px',
    margin: '0 auto',
  },
  question: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  questionText: {
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: 1.5,
    marginBottom: '8px',
    whiteSpace: 'pre-line',
  },
  deltaInfo: {
    fontSize: '14px',
    color: '#10b981',
    fontWeight: 500,
  },
  compareGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  scenarioCard: {
    position: 'relative',
    background: '#111827',
    borderRadius: '16px',
    padding: '16px',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  recommended: {
    position: 'absolute',
    top: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#10b981',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: '10px',
  },
  scenarioLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#9ca3af',
    marginBottom: '12px',
    textAlign: 'center',
  },
  vSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  vNow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  vFuture: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  vSmall: {
    fontSize: '10px',
    color: '#6b7280',
    marginBottom: '2px',
  },
  vNumber: {
    fontSize: '18px',
    fontWeight: 700,
  },
  vNumberLarge: {
    fontSize: '24px',
    fontWeight: 800,
  },
  arrow: {
    color: '#4b5563',
    fontSize: '14px',
  },
  growthBar: {
    height: '6px',
    background: '#1f2937',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  growthFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease-out',
  },
  growth: {
    fontSize: '12px',
    fontWeight: 600,
    textAlign: 'center',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: '#111827',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  summaryIcon: {
    fontSize: '24px',
  },
  summaryText: {
    fontSize: '14px',
    color: '#d1d5db',
    lineHeight: 1.4,
  },
  buttons: {
    display: 'flex',
    gap: '12px',
  },
  btnReject: {
    flex: 1,
    padding: '16px',
    fontSize: '16px',
    fontWeight: 600,
    background: 'transparent',
    border: '2px solid #374151',
    borderRadius: '12px',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  btnAccept: {
    flex: 1.2,
    padding: '16px',
    fontSize: '16px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
    border: 'none',
    borderRadius: '12px',
    color: '#0a0f1a',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
  },
  disclaimer: {
    marginTop: '16px',
    fontSize: '10px',
    color: '#4b5563',
    textAlign: 'center',
  },
};

export default DecisionCompare;
