import React from 'react';
import type { Node, LayerId } from './types';
import { LAYERS } from './data';
import { CSS } from './styles';
import { fmt, pColor } from './utils';

interface TrinityTabProps {
  nodes: Record<string, Node>;
  nodeFilter: 'active' | 'all' | 'danger';
  setNodeFilter: (f: 'active' | 'all' | 'danger') => void;
  showToast: (msg: string) => void;
}

export const TrinityTab: React.FC<TrinityTabProps> = ({ nodes, nodeFilter, setNodeFilter, showToast }) => (
  <div>
    {/* Goal Card */}
    <div
      onClick={() => showToast('Me 탭에서 목표를 수정할 수 있습니다')}
      style={{
        background: `linear-gradient(135deg, ${CSS.bg2}, ${CSS.bg3})`,
        borderRadius: 14,
        padding: 20,
        textAlign: 'center',
        marginBottom: 15,
        border: `1px solid ${CSS.border}`,
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 12, color: CSS.text3, marginBottom: 8 }}>현재 목표</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: CSS.accent }}>12개월 내 PMF 달성</div>
    </div>

    {/* Filters */}
    <div style={{ display: 'flex', gap: 8, marginBottom: 15, overflowX: 'auto' }}>
      {[
        { id: 'active', label: '활성 노드' },
        { id: 'all', label: '전체 36개' },
        { id: 'danger', label: '위험만' },
      ].map(f => (
        <button
          key={f.id}
          onClick={() => setNodeFilter(f.id as typeof nodeFilter)}
          style={{
            padding: '6px 14px',
            background: nodeFilter === f.id ? CSS.accent : CSS.bg2,
            border: `1px solid ${nodeFilter === f.id ? CSS.accent : CSS.border}`,
            borderRadius: 15,
            fontSize: 12,
            color: nodeFilter === f.id ? '#000' : CSS.text,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>

    {/* Nodes by Layer */}
    {(Object.entries(LAYERS) as [LayerId, typeof LAYERS[LayerId]][]).map(([lid, layer]) => {
      let layerNodes = layer.ids.map(id => nodes[id]);

      if (nodeFilter === 'active') {
        layerNodes = layerNodes.filter(n => n.active);
      } else if (nodeFilter === 'danger') {
        layerNodes = layerNodes.filter(n => n.state !== 'IGNORABLE');
      }

      if (layerNodes.length === 0 && nodeFilter !== 'all') return null;
      if (nodeFilter === 'all') layerNodes = layer.ids.map(id => nodes[id]);

      const activeInLayer = layer.ids.filter(id => nodes[id].active).length;

      return (
        <div key={lid}>
          <div style={{ fontSize: 13, color: CSS.text2, margin: '15px 0 10px' }}>
            {layer.name} ({nodeFilter === 'all' ? layer.ids.length : activeInLayer}/{layer.ids.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 15 }}>
            {layerNodes.map(n => (
              <div
                key={n.id}
                onClick={() => showToast(`${n.icon} ${n.name}: ${fmt(n)} (압력 ${(n.pressure*100).toFixed(0)}%)`)}
                style={{
                  background: n.state === 'IRREVERSIBLE' ? 'rgba(255,59,59,0.05)' : CSS.bg2,
                  borderRadius: 8,
                  padding: '10px 6px',
                  textAlign: 'center',
                  border: `1px solid ${n.state === 'IRREVERSIBLE' ? CSS.danger : n.state === 'PRESSURING' ? CSS.warning : CSS.border}`,
                  cursor: 'pointer',
                  opacity: !n.active && nodeFilter === 'all' ? 0.35 : 1,
                }}
              >
                <div style={{ fontSize: 18 }}>{n.icon}</div>
                <div style={{ fontSize: 11, color: CSS.text2, margin: '3px 0' }}>{n.name}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(n)}</div>
                <div style={{ height: 3, background: CSS.bg3, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: pColor(n.pressure), width: `${n.pressure * 100}%`, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);
