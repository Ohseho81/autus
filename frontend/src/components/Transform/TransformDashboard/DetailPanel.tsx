import React from 'react';
import type { Slot, Todo } from './types';
import { COLORS } from './types';
import { getStatus, getStatusColor, formatTime } from './helpers';
import { styles } from './styles';

interface DetailPanelProps {
  selectedSlot: Slot | null;
  todos: Todo[];
  impactFactors: {
    volatility: number;
    pressure: number;
    momentum: number;
    m2c: number;
  };
  envSummary: {
    stability: number;
    opportunity: number;
    risk: 'low' | 'medium' | 'high' | 'critical';
    region: string | null;
  };
  identityImpact: {
    entropyDelta: number;
    energyDelta: number;
    momentumDelta: number;
  };
  onSetDirection: (dir: 'closer' | 'maintain' | 'further') => void;
  onToggleAction: (slotId: number, actionIndex: number) => void;
  onToggleTodo: (id: string) => void;
  onRemoveTodo: (id: string) => void;
  onClearTodos: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedSlot,
  todos,
  impactFactors,
  envSummary,
  identityImpact,
  onSetDirection,
  onToggleAction,
  onToggleTodo,
  onRemoveTodo,
  onClearTodos,
}) => {
  return (
    <div style={styles.rightPanel}>
      <div style={styles.panelContent}>
        {!selectedSlot ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>&#9678;</div>
            <div style={styles.emptyTitle}>관계를 선택하세요</div>
            <div style={styles.emptyDesc}>
              12개의 노드 중 하나를 클릭하면<br />
              관계의 본질과 해야 할 일이 표시됩니다.
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={styles.detailHeader}>
              <div style={styles.detailTitle}>SELECTED RELATIONSHIP</div>
              <div style={styles.detailName}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(getStatus(selectedSlot.resonance))
                }} />
                {selectedSlot.name}
              </div>
              <div style={styles.detailMeta}>
                {selectedSlot.role} &middot; {formatTime(selectedSlot.lastContact)}
              </div>
            </div>

            {/* Quick Stats */}
            <div style={styles.quickStats}>
              <div style={styles.quickStat}>
                <div style={{ ...styles.quickStatValue, color: getStatusColor(getStatus(selectedSlot.resonance)) }}>
                  {selectedSlot.resonance}
                </div>
                <div style={styles.quickStatLabel}>RESONANCE</div>
              </div>
              <div style={styles.quickStat}>
                <div style={{ ...styles.quickStatValue, color: selectedSlot.noise >= 0.2 ? COLORS.red : COLORS.white }}>
                  {Math.round(selectedSlot.noise * 100)}%
                </div>
                <div style={styles.quickStatLabel}>NOISE</div>
              </div>
              <div style={{ ...styles.quickStat, borderRight: 'none' }}>
                <div style={styles.quickStatValue}>
                  {selectedSlot.direction === 'closer' ? '\u2192' : selectedSlot.direction === 'further' ? '\u2190' : '\u2022'}
                </div>
                <div style={styles.quickStatLabel}>DIRECTION</div>
              </div>
            </div>

            {/* HE NEEDS */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={{ ...styles.sectionIcon, backgroundColor: 'rgba(168, 85, 247, 0.2)' }}>&#127919;</div>
                <span style={styles.sectionTitle}>HE NEEDS</span>
              </div>
              <div style={styles.tagsContainer}>
                {selectedSlot.heNeeds.map((item, i) => (
                  <span key={i} style={styles.tag}>{item}</span>
                ))}
              </div>
            </div>

            {/* I NEED */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={{ ...styles.sectionIcon, backgroundColor: 'rgba(0, 212, 255, 0.2)' }}>&#128142;</div>
                <span style={styles.sectionTitle}>I NEED</span>
              </div>
              <div style={styles.tagsContainer}>
                {selectedSlot.iNeed.map((item, i) => (
                  <span key={i} style={styles.tag}>{item}</span>
                ))}
              </div>
            </div>

            {/* ENVIRONMENT */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={{ ...styles.sectionIcon, backgroundColor: 'rgba(255, 204, 0, 0.2)' }}>&#127757;</div>
                <span style={styles.sectionTitle}>ENVIRONMENT</span>
              </div>
              <div style={styles.tagsContainer}>
                {selectedSlot.environment.map((item, i) => (
                  <span key={i} style={styles.tag}>{item}</span>
                ))}
              </div>
            </div>

            {/* EXTERNAL FORCES (#map 연동) */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={{ ...styles.sectionIcon, backgroundColor: 'rgba(0, 212, 255, 0.2)' }}>&#128202;</div>
                <span style={styles.sectionTitle}>EXTERNAL FORCES</span>
                <span style={{
                  fontSize: '9px',
                  color: COLORS.cyan,
                  marginLeft: 'auto',
                  padding: '2px 6px',
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                  borderRadius: '4px'
                }}>
                  from #map
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ fontSize: '10px', color: COLORS.gray600, marginBottom: '4px' }}>VOLATILITY</div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: impactFactors.volatility < 0.3 ? COLORS.green :
                           impactFactors.volatility < 0.5 ? COLORS.yellow : COLORS.red
                  }}>
                    {Math.round(impactFactors.volatility * 100)}%
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ fontSize: '10px', color: COLORS.gray600, marginBottom: '4px' }}>PRESSURE</div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: impactFactors.pressure > 0 ? COLORS.green :
                           impactFactors.pressure > -0.3 ? COLORS.yellow : COLORS.red
                  }}>
                    {impactFactors.pressure > 0 ? '+' : ''}{(impactFactors.pressure * 100).toFixed(0)}%
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ fontSize: '10px', color: COLORS.gray600, marginBottom: '4px' }}>MOMENTUM</div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: impactFactors.momentum > 0 ? COLORS.green :
                           impactFactors.momentum > -0.2 ? COLORS.yellow : COLORS.red
                  }}>
                    {impactFactors.momentum > 0 ? '\u2191' : impactFactors.momentum < 0 ? '\u2193' : '\u2192'}
                    {Math.abs(impactFactors.momentum * 100).toFixed(0)}%
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ fontSize: '10px', color: COLORS.gray600, marginBottom: '4px' }}>IDENTITY &Delta;</div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: identityImpact.entropyDelta < 0 ? COLORS.green : COLORS.yellow
                  }}>
                    E:{identityImpact.entropyDelta > 0 ? '+' : ''}{(identityImpact.entropyDelta * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              {envSummary.region && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0, 212, 255, 0.05)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: COLORS.gray400
                }}>
                  &#128205; 선택된 지역: <span style={{ color: COLORS.cyan, fontWeight: 600 }}>{envSummary.region}</span>
                </div>
              )}
            </div>

            {/* ACTIONS */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>&#9889; ACTIONS</span>
              </div>
              {selectedSlot.actions.map((action, i) => {
                const isAdded = todos.some(t => t.text === action.text && t.source === selectedSlot.name);
                return (
                  <div
                    key={i}
                    style={{
                      ...styles.actionItem,
                      backgroundColor: isAdded ? 'rgba(0, 255, 135, 0.1)' : 'rgba(255,255,255,0.03)',
                      borderColor: isAdded ? 'rgba(0, 255, 135, 0.3)' : 'rgba(255,255,255,0.05)',
                    }}
                    onClick={() => onToggleAction(selectedSlot.id, i)}
                  >
                    <div style={{
                      ...styles.actionCheck,
                      backgroundColor: isAdded ? COLORS.green : 'transparent',
                      borderColor: isAdded ? COLORS.green : 'rgba(255,255,255,0.2)',
                      color: isAdded ? '#000' : 'transparent',
                    }}>
                      {isAdded && '\u2713'}
                    </div>
                    <div style={styles.actionText}>{action.text}</div>
                    <div style={styles.actionImpact}>{action.impact}</div>
                  </div>
                );
              })}
            </div>

            {/* DIRECTION */}
            <div style={{ ...styles.section, borderBottom: 'none' }}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>&#129517; DIRECTION</span>
              </div>
              <div style={styles.directionButtons}>
                {(['further', 'maintain', 'closer'] as const).map((dir) => {
                  const isActive = selectedSlot.direction === dir;
                  let bgColor = 'transparent';
                  let borderColor = 'rgba(255,255,255,0.1)';
                  let textColor = COLORS.gray400;

                  if (isActive) {
                    if (dir === 'further') {
                      bgColor = 'rgba(255, 71, 87, 0.1)';
                      borderColor = COLORS.red;
                      textColor = COLORS.red;
                    } else if (dir === 'closer') {
                      bgColor = 'rgba(0, 255, 135, 0.1)';
                      borderColor = COLORS.green;
                      textColor = COLORS.green;
                    } else {
                      bgColor = 'rgba(0, 212, 255, 0.1)';
                      borderColor = COLORS.cyan;
                      textColor = COLORS.cyan;
                    }
                  }

                  return (
                    <button
                      key={dir}
                      style={{
                        ...styles.directionBtn,
                        backgroundColor: bgColor,
                        borderColor: borderColor,
                        color: textColor,
                      }}
                      onClick={() => onSetDirection(dir)}
                    >
                      {dir === 'further' ? '\u2190 멀어지기' : dir === 'closer' ? '가까워지기 \u2192' : '유지'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TODO Section */}
      <div style={styles.todoSection}>
        <div style={styles.todoHeader}>
          <div style={styles.todoTitle}>
            &#128203; TODAY&apos;S TODO
            <span style={styles.todoCount}>
              {todos.filter(t => !t.completed).length}
            </span>
          </div>
          <button style={styles.todoClear} onClick={onClearTodos}>
            모두 지우기
          </button>
        </div>

        <div style={styles.todoList}>
          {todos.length === 0 ? (
            <div style={styles.todoEmpty}>
              액션을 클릭하면 여기에 추가됩니다
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                style={{
                  ...styles.todoItem,
                  opacity: todo.completed ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    ...styles.todoCheckbox,
                    backgroundColor: todo.completed ? COLORS.green : 'transparent',
                    borderColor: todo.completed ? COLORS.green : 'rgba(255,255,255,0.2)',
                    color: todo.completed ? '#000' : 'transparent',
                  }}
                  onClick={() => onToggleTodo(todo.id)}
                >
                  {todo.completed && '\u2713'}
                </div>
                <div style={styles.todoInfo}>
                  <div style={{
                    ...styles.todoText,
                    textDecoration: todo.completed ? 'line-through' : 'none',
                  }}>{todo.text}</div>
                  <div style={styles.todoSource}>{todo.source} &middot; {todo.impact}</div>
                </div>
                <button
                  style={styles.todoRemove}
                  onClick={() => onRemoveTodo(todo.id)}
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailPanel;
