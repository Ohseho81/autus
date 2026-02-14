/**
 * AUTUS #transform - Control Deck v5
 * ===================================
 * "You do not need to manage the world.
 *  You need to align your true 12."
 *
 * Features:
 * - 원형 레이아웃 (12 노드 + 중앙 Core)
 * - 공명 기반 연결선
 * - HE NEEDS / I NEED / ENVIRONMENT
 * - TODO 연동
 * - Direction 설정
 * - #map 환경 데이터 연동
 */

import React, { useState, useMemo } from 'react';
import { useEnvironmentStore, selectEnvironmentSummary, selectImpactFactors } from '../../../store/useEnvironmentStore';
import type { Slot, Todo } from './types';
import { COLORS, INITIAL_SLOTS } from './types';
import { getStatus } from './helpers';
import { styles } from './styles';
import { OrbitalMap } from './OrbitalMap';
import { DetailPanel } from './DetailPanel';

// ============================================
// MAIN COMPONENT
// ============================================
export const TransformDashboard: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>(INITIAL_SLOTS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);

  // #map 환경 데이터 연동
  const envSummary = useEnvironmentStore(selectEnvironmentSummary);
  const impactFactors = useEnvironmentStore(selectImpactFactors);
  const getImpactOnIdentity = useEnvironmentStore(s => s.getImpactOnIdentity);

  // 환경 변화에 따른 Identity 영향 계산
  const identityImpact = useMemo(() => getImpactOnIdentity(), [getImpactOnIdentity, impactFactors]);

  const stats = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0 };
    let totalResonance = 0;
    slots.forEach(s => {
      counts[getStatus(s.resonance)]++;
      totalResonance += s.resonance;
    });

    // 기본 안정성 계산
    const baseStability = Math.round(totalResonance / 12 * 0.9 + 10);

    // 환경 영향 반영 (+-15% 범위)
    const envModifier = (envSummary.stability - 50) / 50 * 15;
    const stability = Math.max(0, Math.min(100, Math.round(baseStability + envModifier)));

    return { counts, stability, envImpact: envModifier };
  }, [slots, envSummary.stability]);

  const selectedSlot = useMemo(() =>
    slots.find(s => s.id === selectedId) || null
  , [slots, selectedId]);

  const nodePositions = useMemo(() => {
    const centerX = 250;
    const centerY = 250;
    return slots.map((slot, i) => {
      const baseRadius = 180;
      const radiusOffset = (100 - slot.resonance) * 0.5;
      const radius = baseRadius + radiusOffset;
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    });
  }, [slots]);

  const selectNode = (id: number) => setSelectedId(id);
  const deselectNode = () => setSelectedId(null);

  const setDirection = (dir: 'closer' | 'maintain' | 'further') => {
    if (selectedId) {
      setSlots(prev => prev.map(s =>
        s.id === selectedId ? { ...s, direction: dir } : s
      ));
    }
  };

  const toggleAction = (slotId: number, actionIndex: number) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    const action = slot.actions[actionIndex];

    const existingIndex = todos.findIndex(t =>
      t.text === action.text && t.source === slot.name
    );

    if (existingIndex >= 0) {
      setTodos(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setTodos(prev => [{
        id: `${Date.now()}`,
        text: action.text,
        source: slot.name,
        impact: action.impact,
        completed: false
      }, ...prev]);
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const clearTodos = () => setTodos([]);

  return (
    <div style={styles.container}>
      {/* LEFT: UNIVERSE MAP */}
      <div style={styles.leftPanel}>
        {/* Header */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={styles.logo}>온리쌤</span>
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <span style={{ ...styles.statDot, backgroundColor: COLORS.green, boxShadow: `0 0 10px ${COLORS.green}` }} />
                <span>{stats.counts.green} stable</span>
              </div>
              <div style={styles.statItem}>
                <span style={{ ...styles.statDot, backgroundColor: COLORS.yellow, boxShadow: `0 0 10px ${COLORS.yellow}` }} />
                <span>{stats.counts.yellow} watch</span>
              </div>
              <div style={styles.statItem}>
                <span style={{ ...styles.statDot, backgroundColor: COLORS.red, boxShadow: `0 0 10px ${COLORS.red}` }} />
                <span>{stats.counts.red} urgent</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* 환경 지표 (#map 연동) */}
            <div style={{
              display: 'flex',
              gap: '16px',
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: COLORS.gray600, letterSpacing: '1px' }}>ENV</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: envSummary.risk === 'low' ? COLORS.green :
                         envSummary.risk === 'medium' ? COLORS.yellow :
                         envSummary.risk === 'high' ? '#ff9500' : COLORS.red
                }}>
                  {envSummary.risk.toUpperCase()}
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: COLORS.gray600, letterSpacing: '1px' }}>M2C</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.cyan }}>
                  {impactFactors.m2c.toFixed(2)}x
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: COLORS.gray600, letterSpacing: '1px' }}>OPP</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.green }}>
                  {envSummary.opportunity}
                </div>
              </div>
            </div>

            {/* STABILITY 스코어 */}
            <div style={{ textAlign: 'right' }}>
              <div style={styles.stabilityLabel}>STABILITY</div>
              <div style={{
                ...styles.stabilityValue,
                color: stats.stability >= 70 ? COLORS.green :
                       stats.stability >= 45 ? COLORS.yellow : COLORS.red
              }}>
                {stats.stability}
                {stats.envImpact !== 0 && (
                  <span style={{
                    fontSize: '12px',
                    color: stats.envImpact > 0 ? COLORS.green : COLORS.red,
                    marginLeft: '4px'
                  }}>
                    {stats.envImpact > 0 ? '+' : ''}{Math.round(stats.envImpact)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Map Container */}
        <OrbitalMap
          slots={slots}
          nodePositions={nodePositions}
          selectedId={selectedId}
          onSelectNode={selectNode}
          onDeselectNode={deselectNode}
        />
      </div>

      {/* RIGHT: PANEL */}
      <DetailPanel
        selectedSlot={selectedSlot}
        todos={todos}
        impactFactors={impactFactors}
        envSummary={envSummary}
        identityImpact={identityImpact}
        onSetDirection={setDirection}
        onToggleAction={toggleAction}
        onToggleTodo={toggleTodo}
        onRemoveTodo={removeTodo}
        onClearTodos={clearTodos}
      />

      {/* Keyframe Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default TransformDashboard;
