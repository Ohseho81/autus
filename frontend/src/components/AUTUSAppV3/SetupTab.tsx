import React from 'react';
import type { Connector } from './types';
import { CSS } from './styles';

interface SetupTabProps {
  connectors: Connector[];
  devices: Connector[];
  webServices: Connector[];
  toggleConnector: (id: string) => void;
  setDevices: React.Dispatch<React.SetStateAction<Connector[]>>;
  setWebServices: React.Dispatch<React.SetStateAction<Connector[]>>;
  connectAllWeb: () => void;
  showToast: (msg: string) => void;
}

export const SetupTab: React.FC<SetupTabProps> = ({ connectors, devices, webServices, toggleConnector, setDevices, setWebServices, connectAllWeb, showToast }) => (
  <div>
    {/* Devices */}
    <div style={{ fontSize: 13, color: CSS.text2, margin: '0 0 10px' }}>📷 디바이스 권한</div>
    {devices.map(d => (
      <div
        key={d.id}
        onClick={() => {
          setDevices(prev => prev.map(x => x.id === d.id ? {...x, on: !x.on} : x));
          showToast(d.on ? `${d.name} 권한 해제됨` : `${d.name} 권한 허용됨!`);
        }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 14,
          background: CSS.bg2,
          borderRadius: 10,
          marginBottom: 8,
          border: `1px solid ${CSS.border}`,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{d.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
            <div style={{ fontSize: 11, color: CSS.text3 }}>{d.desc}</div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: d.on ? CSS.success : CSS.text3 }}>
          {d.on ? '✅ 허용됨' : '허용하기 →'}
        </span>
      </div>
    ))}

    {/* Web Services */}
    <div style={{ fontSize: 13, color: CSS.text2, margin: '20px 0 10px' }}>🌐 웹 서비스 연결</div>
    <div style={{
      background: CSS.bg2,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      border: `1px solid ${CSS.accent}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: CSS.accent }}>🌐 모든 서비스 한번에 연결</div>
        <div style={{ fontSize: 11, color: CSS.text3, marginTop: 2 }}>GPT Atlas 방식 - 한 번의 동의로 모든 권한</div>
      </div>
      <button
        onClick={connectAllWeb}
        style={{
          padding: '8px 16px',
          background: CSS.accent,
          border: 'none',
          borderRadius: 10,
          color: '#000',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        전체 연결
      </button>
    </div>
    {webServices.map(w => (
      <div
        key={w.id}
        onClick={() => {
          setWebServices(prev => prev.map(x => x.id === w.id ? {...x, on: !x.on} : x));
          showToast(w.on ? `${w.name} 연결 해제됨` : `${w.name} 연결됨!`);
        }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 14,
          background: CSS.bg2,
          borderRadius: 10,
          marginBottom: 8,
          border: `1px solid ${CSS.border}`,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{w.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
            <div style={{ fontSize: 11, color: CSS.text3 }}>{w.desc}</div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: w.on ? CSS.success : CSS.text3 }}>
          {w.on ? '✅ 연결됨' : '연결하기 →'}
        </span>
      </div>
    ))}

    {/* Connectors */}
    <div style={{ fontSize: 13, color: CSS.text2, margin: '20px 0 10px' }}>🔗 데이터 연결</div>
    {connectors.map(c => (
      <div
        key={c.id}
        onClick={() => toggleConnector(c.id)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 14,
          background: CSS.bg2,
          borderRadius: 10,
          marginBottom: 8,
          border: `1px solid ${CSS.border}`,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{c.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: CSS.text3 }}>{c.desc}</div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: c.on ? CSS.success : CSS.text3 }}>
          {c.on ? '✅ 연결됨' : '연결하기 →'}
        </span>
      </div>
    ))}

    {/* Settings */}
    <div style={{ fontSize: 13, color: CSS.text2, margin: '20px 0 10px' }}>⚙️ 설정</div>
    {[
      { name: '일일 발화 제한', desc: '하루 최대 알림', val: '3회' },
      { name: '자율 수준', desc: 'L0: 알림만', val: 'L0' },
    ].map((s, i) => (
      <div
        key={i}
        onClick={() => showToast(`${s.name} 설정 (개발 예정)`)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 14,
          background: CSS.bg2,
          borderRadius: 10,
          marginBottom: 8,
          border: `1px solid ${CSS.border}`,
          cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
          <div style={{ fontSize: 11, color: CSS.text3 }}>{s.desc}</div>
        </div>
        <span style={{ color: CSS.accent, fontWeight: 600, fontSize: 13 }}>{s.val} →</span>
      </div>
    ))}
  </div>
);
