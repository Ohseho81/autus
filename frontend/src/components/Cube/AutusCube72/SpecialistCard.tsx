/**
 * AUTUS 72³ Specialist Card & StatBar Components
 */

import React from 'react';
import type { Phenomenon } from './types';
import { CODEBOOK, STATE_COLORS } from './types';

// ===================================================================
// StatBar
// ===================================================================

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>{label}</div>
    <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${value * 100}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
    </div>
    <div style={{ fontSize: '11px', color, fontWeight: 600, marginTop: '4px' }}>{(value * 100).toFixed(0)}%</div>
  </div>
);

// ===================================================================
// SpecialistCard
// ===================================================================

const SpecialistCard: React.FC<{
  phenomenon: Phenomenon;
  onAction: (type: keyof typeof CODEBOOK.ACTION_FORCE) => void;
  onClose: () => void;
}> = ({ phenomenon, onAction, onClose }) => {
  const { node, state, motion, hr, interpretation } = phenomenon;

  const categoryColors = {
    T: '#ffd700',
    B: '#00d4ff',
    L: '#00ff87',
  };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '360px',
      backgroundColor: 'rgba(10,10,20,0.98)',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: `linear-gradient(90deg, ${STATE_COLORS[state]}20, transparent)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: STATE_COLORS[state],
                boxShadow: `0 0 12px ${STATE_COLORS[state]}`,
              }} />
              <span style={{ fontSize: '18px', fontWeight: 600, color: STATE_COLORS[state] }}>{state}</span>
            </div>
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              fontFamily: 'monospace',
            }}>
              <div style={{ fontSize: '13px', color: '#fff', marginBottom: '6px' }}>
                [{node.x}, {node.y}, {node.z}]
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '22px',
            cursor: 'pointer',
          }}>×</button>
        </div>
      </div>

      {/* 72³ Interpretation */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '2px' }}>
          72³ 해석
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            borderLeft: `3px solid ${categoryColors[interpretation.nodeCategory]}`
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>WHO (Node)</div>
            <div style={{ fontSize: '13px', color: categoryColors[interpretation.nodeCategory], fontWeight: 600 }}>
              [{interpretation.nodeId}] {interpretation.nodeName}
            </div>
          </div>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            borderLeft: `3px solid ${(CODEBOOK.WHAT as any)[interpretation.motionDomain]?.color || '#00d4ff'}`
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>WHAT (Motion)</div>
            <div style={{ fontSize: '13px', color: (CODEBOOK.WHAT as any)[interpretation.motionDomain]?.color || '#00d4ff', fontWeight: 600 }}>
              [{interpretation.motionId}] {interpretation.motionName}
            </div>
          </div>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            borderLeft: `3px solid ${(CODEBOOK.HOW as any)[interpretation.workDomain]?.color || '#3b82f6'}`
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>HOW (Work)</div>
            <div style={{ fontSize: '13px', color: (CODEBOOK.HOW as any)[interpretation.workDomain]?.color || '#3b82f6', fontWeight: 600 }}>
              [{interpretation.workId}] {interpretation.workName}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          공명 점수: <span style={{ color: '#a855f7', fontWeight: 600 }}>{interpretation.resonance.toFixed(0)}%</span>
        </div>
      </div>

      {/* HR State */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '2px' }}>
          HR STATE
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <StatBar label="업무 부하" value={hr.workload} color="#ff9500" />
          <StatBar label="관계 밀도" value={hr.relation_density} color="#00d4ff" />
          <StatBar label="이탈 위험" value={hr.exit_risk} color="#ff2d55" />
        </div>
      </div>

      {/* Motion */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '2px' }}>
          MOTION
        </div>
        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#00d4ff' }}>{motion.velocity.toFixed(2)}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>속도</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#a855f7' }}>{motion.inertia.toFixed(2)}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>관성</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: motion.cpd ? '#ff2d55' : '#00ff87' }}>
              {motion.cpd ? 'YES' : 'NO'}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>CPD</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 20px', flex: 1 }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', letterSpacing: '2px' }}>
          개입 액션
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(CODEBOOK.ACTION_FORCE).map(([type, force]) => (
            <button
              key={type}
              onClick={() => onAction(type as keyof typeof CODEBOOK.ACTION_FORCE)}
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{force.label}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                  부하 {(force.workload * 100).toFixed(0)}%, 위험 {(force.exit_risk * 100).toFixed(0)}%
                </div>
              </div>
              <span style={{ color: '#00ff87', fontSize: '16px' }}>→</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
      }}>
        Attention: {phenomenon.attention_score.toFixed(4)}
      </div>
    </div>
  );
};

export default SpecialistCard;
