import React from 'react';
import type { Node } from './types';
import { VALUES, BOUNDARIES } from './data';
import { CSS } from './styles';

interface MeTabProps {
  nodes: Record<string, Node>;
  activeCount: number;
  showToast: (msg: string) => void;
  onEditNodes: () => void;
}

export const MeTab: React.FC<MeTabProps> = ({ nodes, activeCount, showToast, onEditNodes }) => {
  const activeNodes = Object.values(nodes).filter(n => n.active);

  return (
    <div>
      {/* Goal */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🎯 목표</div>
        <div style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: CSS.accent, marginBottom: 10 }}>12개월 내 PMF 달성</div>
          <button
            onClick={() => showToast('목표 수정 (개발 예정)')}
            style={{
              width: '100%',
              padding: 10,
              background: CSS.bg3,
              border: `1px solid ${CSS.border}`,
              borderRadius: 10,
              color: CSS.text,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            목표 수정
          </button>
        </div>
      </div>

      {/* Active Nodes */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>📦 활성 노드 ({activeCount}/36)</div>
        <div style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {activeNodes.map(n => (
              <span key={n.id} style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>
                {n.icon} {n.name}
              </span>
            ))}
          </div>
          <button
            onClick={onEditNodes}
            style={{
              width: '100%',
              padding: 10,
              marginTop: 10,
              background: CSS.bg3,
              border: `1px solid ${CSS.border}`,
              borderRadius: 10,
              color: CSS.text,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            노드 편집
          </button>
        </div>
      </div>

      {/* Identity */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🎭 정체성</div>
        <div
          onClick={() => showToast('정체성 편집 (개발 예정)')}
          style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}`, cursor: 'pointer' }}
        >
          <div>나는 <span style={{ color: CSS.accent, fontWeight: 600 }}>초기 스타트업 창업자</span>입니다</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <span style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>유형: 창업자</span>
            <span style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>단계: 초기</span>
            <span style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>산업: 테크</span>
          </div>
        </div>
      </div>

      {/* Values */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>💎 가치 우선순위</div>
        <div
          onClick={() => showToast('가치 편집 (개발 예정)')}
          style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}`, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {VALUES.map((v, i) => (
              <span key={v} style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  background: CSS.accent,
                  color: '#000',
                  borderRadius: '50%',
                  fontSize: 10,
                  marginRight: 4,
                }}>{i + 1}</span>
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Boundaries */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🚫 경계</div>
        <div
          onClick={() => showToast('경계 편집 (개발 예정)')}
          style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}`, cursor: 'pointer' }}
        >
          <div style={{ fontSize: 12, color: CSS.danger, marginBottom: 8, fontWeight: 600 }}>절대 안 함</div>
          {BOUNDARIES.never.map(b => (
            <div key={b} style={{ padding: '4px 0', fontSize: 13 }}>⛔ {b}</div>
          ))}
          <div style={{ fontSize: 12, color: CSS.warning, margin: '10px 0 8px', fontWeight: 600 }}>한계선</div>
          {BOUNDARIES.limits.map(b => (
            <div key={b} style={{ padding: '4px 0', fontSize: 13 }}>📊 {b}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
