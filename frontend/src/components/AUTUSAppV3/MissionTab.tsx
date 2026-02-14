import React from 'react';
import { INITIAL_MISSIONS } from './data';
import { CSS } from './styles';

interface MissionTabProps {
  missionFilter: 'active' | 'done' | 'ignored';
  setMissionFilter: (f: 'active' | 'done' | 'ignored') => void;
  showToast: (msg: string) => void;
}

export const MissionTab: React.FC<MissionTabProps> = ({ missionFilter, setMissionFilter, showToast }) => {
  const missions = missionFilter === 'active' ? INITIAL_MISSIONS : [];

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 15, overflowX: 'auto' }}>
        {[
          { id: 'active', label: '활성 (3)' },
          { id: 'done', label: '완료 (12)' },
          { id: 'ignored', label: '무시 (5)' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setMissionFilter(f.id as typeof missionFilter)}
            style={{
              padding: '6px 14px',
              background: missionFilter === f.id ? CSS.accent : CSS.bg2,
              border: `1px solid ${missionFilter === f.id ? CSS.accent : CSS.border}`,
              borderRadius: 15,
              fontSize: 12,
              color: missionFilter === f.id ? '#000' : CSS.text,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {missions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: CSS.text3 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          미션이 없습니다
        </div>
      ) : (
        missions.map(m => (
          <div
            key={m.id}
            onClick={() => showToast(`${m.icon} ${m.title}: ${m.progress}% 완료`)}
            style={{
              background: CSS.bg2,
              borderRadius: 10,
              padding: 14,
              marginBottom: 10,
              border: `1px solid ${CSS.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.icon} {m.title}</span>
                <span style={{ fontSize: 10, padding: '2px 6px', background: CSS.bg3, borderRadius: 6, color: CSS.text2, marginLeft: 6 }}>{m.type}</span>
              </div>
              <div style={{ fontSize: 12, color: CSS.accent }}>{m.status}</div>
            </div>
            <div style={{ height: 5, background: CSS.bg3, borderRadius: 3, marginBottom: 5 }}>
              <div style={{ height: '100%', background: CSS.accent, borderRadius: 3, width: `${m.progress}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: CSS.text3 }}>
              <span>{m.progress}% 완료</span>
              <span>{m.eta}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12 }}>
              {m.steps.map((s, i) => (
                <div key={i} style={{ padding: '4px 0', color: s.s === 'done' ? CSS.success : s.s === 'active' ? CSS.accent : CSS.text2 }}>
                  {s.s === 'done' ? '✅' : s.s === 'active' ? '🔄' : '⬜'} {s.t}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
