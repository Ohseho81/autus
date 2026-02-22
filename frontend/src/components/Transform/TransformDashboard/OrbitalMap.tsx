import React from 'react';
import type { Slot } from './types';
import { COLORS } from './types';
import { getStatus, getStatusColor, formatTime, getDirectionLabel } from './helpers';
import { styles } from './styles';

interface OrbitalMapProps {
  slots: Slot[];
  nodePositions: { x: number; y: number }[];
  selectedId: number | null;
  onSelectNode: (id: number) => void;
  onDeselectNode: () => void;
}

export const OrbitalMap: React.FC<OrbitalMapProps> = ({
  slots,
  nodePositions,
  selectedId,
  onSelectNode,
  onDeselectNode,
}) => {
  return (
    <div
      style={styles.mapContainer}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.node') && !target.closest('.core')) {
          onDeselectNode();
        }
      }}
    >
      <div style={styles.bgGrid} />

      {/* Orbital Rings */}
      <div style={{ ...styles.orbitalRing, width: '250px', height: '250px' }} />
      <div style={{ ...styles.orbitalRing, width: '450px', height: '450px', borderStyle: 'dashed', opacity: 0.5 }} />

      {/* Connections SVG */}
      <svg style={styles.connectionsSvg} viewBox="0 0 500 500">
        {slots.map((slot, i) => {
          const pos = nodePositions[i];
          const status = getStatus(slot.resonance);
          const isSelected = selectedId === slot.id;
          const isDimmed = selectedId !== null && !isSelected;
          return (
            <line
              key={slot.id}
              x1={250}
              y1={250}
              x2={pos.x}
              y2={pos.y}
              stroke={getStatusColor(status)}
              strokeWidth={Math.max(1.5, slot.resonance / 40)}
              opacity={isDimmed ? 0.1 : 0.6}
              style={{
                transition: 'all 0.5s ease',
                filter: isSelected ? `drop-shadow(0 0 8px ${getStatusColor(status)})` : 'none'
              }}
            />
          );
        })}
      </svg>

      {/* Nodes Container */}
      <div style={styles.nodesContainer}>
        {slots.map((slot, i) => {
          const pos = nodePositions[i];
          const status = getStatus(slot.resonance);
          const isSelected = selectedId === slot.id;
          const isDimmed = selectedId !== null && !isSelected;

          return (
            <div
              key={slot.id}
              className="node"
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                transform: `translate(-50%, -50%) ${isDimmed ? 'scale(0.8)' : ''}`,
                cursor: 'pointer',
                transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                zIndex: isSelected ? 20 : 10,
                opacity: isDimmed ? 0.3 : 1,
                pointerEvents: isDimmed ? 'none' : 'auto',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(slot.id);
              }}
            >
              <div
                style={{
                  position: 'relative',
                  padding: '14px 18px',
                  backgroundColor: 'rgba(18, 18, 26, 0.7)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  border: isSelected ? `1px solid ${COLORS.cyan}` : '1px solid rgba(255,255,255,0.1)',
                  minWidth: '100px',
                  textAlign: 'center',
                  transition: 'all 0.4s ease',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isSelected ? `0 0 30px rgba(0,212,255,0.3)` : 'none',
                }}
              >
                {/* Status Glow */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(status),
                    border: '2px solid #12121a',
                    boxShadow: `0 0 12px ${getStatusColor(status)}`,
                    animation: status === 'red' ? 'pulse 2s infinite' : 'none',
                  }}
                />
                <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{slot.name}</div>
                <div style={{ fontSize: '11px', color: COLORS.gray400, marginTop: '2px' }}>{formatTime(slot.lastContact)}</div>
                <div style={{
                  fontSize: '10px',
                  marginTop: '6px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: slot.direction === 'closer' ? COLORS.green : slot.direction === 'further' ? COLORS.red : COLORS.gray400,
                }}>
                  {getDirectionLabel(slot.direction)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Core */}
      <div
        className="core"
        style={styles.core}
        onClick={onDeselectNode}
      >
        <span style={styles.coreLabel}>나</span>
      </div>
    </div>
  );
};

export default OrbitalMap;
