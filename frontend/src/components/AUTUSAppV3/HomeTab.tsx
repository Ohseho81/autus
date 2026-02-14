import React from 'react';
import type { Node } from './types';
import { CIRCUITS } from './data';
import { CSS } from './styles';
import { fmt, pColor } from './utils';

interface HomeTabProps {
  topNode: Node;
  dangerNodes: Node[];
  onShowModal: () => void;
  showToast: (msg: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ topNode, dangerNodes, onShowModal, showToast }) => (
  <div>
    {/* Top-1 Card */}
    <div
      onClick={onShowModal}
      style={{
        background: CSS.bg2,
        borderRadius: 12,
        padding: 20,
        marginBottom: 12,
        border: `1px solid ${topNode.state === 'IRREVERSIBLE' ? CSS.danger : CSS.warning}`,
        textAlign: 'center',
        cursor: 'pointer',
        animation: topNode.state === 'IRREVERSIBLE' ? 'pulse 2s infinite' : 'none',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>
        {topNode.state === 'IRREVERSIBLE' ? '🔴' : '🟡'}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
        {topNode.name} {fmt(topNode)}
      </div>
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: topNode.state === 'IRREVERSIBLE' ? 'rgba(255,59,59,0.15)' : 'rgba(255,165,0,0.15)',
        color: topNode.state === 'IRREVERSIBLE' ? CSS.danger : CSS.warning,
      }}>
        {topNode.state}
      </span>
      <div style={{ marginTop: 10, fontSize: 12, color: CSS.text3 }}>
        탭하여 미션 생성 →
      </div>
    </div>

    {/* Stats */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 15 }}>
      {[
        { val: '0.14', lbl: '평형점' },
        { val: '0.67', lbl: '안정성' },
        { val: String(dangerNodes.length), lbl: '위험' },
        { val: '3', lbl: '미션' },
      ].map((s, i) => (
        <div key={i} style={{
          background: CSS.bg2,
          borderRadius: 10,
          padding: '12px 8px',
          textAlign: 'center',
          border: `1px solid ${CSS.border}`,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: CSS.accent }}>{s.val}</div>
          <div style={{ fontSize: 10, color: CSS.text3, marginTop: 2 }}>{s.lbl}</div>
        </div>
      ))}
    </div>

    {/* Circuits */}
    <div style={{ fontSize: 13, color: CSS.text2, margin: '15px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
      🔌 핵심 회로
    </div>
    <div style={{ background: CSS.bg2, borderRadius: 12, padding: 15, marginBottom: 12, border: `1px solid ${CSS.border}` }}>
      {CIRCUITS.map(c => (
        <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${CSS.border}` }}>
          <div style={{ width: 70, fontSize: 12, color: CSS.text2 }}>{c.name}</div>
          <div style={{ flex: 1, height: 6, background: CSS.bg3, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${c.value * 100}%`,
              height: '100%',
              background: c.value > 0.5 ? CSS.danger : c.value > 0.3 ? CSS.warning : CSS.success,
              borderRadius: 3
            }} />
          </div>
          <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 600, color: pColor(c.value) }}>
            {c.value.toFixed(2)}
          </div>
        </div>
      ))}
    </div>

    {/* Danger Nodes */}
    <div style={{ fontSize: 13, color: CSS.text2, margin: '15px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
      ⚠️ 위험 노드
    </div>
    {dangerNodes.map(n => (
      <div
        key={n.id}
        onClick={() => showToast(`${n.icon} ${n.name}: 압력 ${(n.pressure*100).toFixed(0)}%`)}
        style={{
          background: CSS.bg2,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
          border: `1px solid ${n.state === 'IRREVERSIBLE' ? CSS.danger : CSS.warning}`,
          display: 'flex',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{n.icon}</span>
          <span style={{ fontWeight: 600 }}>{n.name}</span>
          <span style={{ color: CSS.text3, fontSize: 13 }}>{fmt(n)}</span>
        </div>
        <span style={{ fontWeight: 600, color: pColor(n.pressure) }}>{n.pressure.toFixed(2)}</span>
      </div>
    ))}
  </div>
);
