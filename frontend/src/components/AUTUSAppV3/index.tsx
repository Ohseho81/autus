/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS App V2.1 - Mobile-First Design
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import type { TabId, Node } from './types';
import { INITIAL_NODES, INITIAL_CONNECTORS, DEVICES, WEB_SERVICES } from './data';
import { CSS } from './styles';
import { fmt } from './utils';
import { HomeTab } from './HomeTab';
import { MissionTab } from './MissionTab';
import { TrinityTab } from './TrinityTab';
import { SetupTab } from './SetupTab';
import { MeTab } from './MeTab';

export default function AUTUSAppV3() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [nodes, setNodes] = useState<Record<string, Node>>(INITIAL_NODES);
  const [connectors, setConnectors] = useState(INITIAL_CONNECTORS);
  const [devices, setDevices] = useState(DEVICES);
  const [webServices, setWebServices] = useState(WEB_SERVICES);
  const [nodeFilter, setNodeFilter] = useState<'active' | 'all' | 'danger'>('active');
  const [missionFilter, setMissionFilter] = useState<'active' | 'done' | 'ignored'>('active');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const sortedNodes = useMemo(() =>
    Object.values(nodes).sort((a, b) => b.pressure - a.pressure),
    [nodes]
  );

  const topNode = sortedNodes[0];
  const dangerNodes = sortedNodes.filter(n => n.state !== 'IGNORABLE').slice(0, 5);
  const activeCount = Object.values(nodes).filter(n => n.active).length;

  const toggleConnector = (id: string) => {
    setConnectors(prev => prev.map(c => c.id === id ? {...c, on: !c.on} : c));
    const c = connectors.find(x => x.id === id);
    showToast(c?.on ? `${c.name} 연결 해제됨` : `${c?.name} 연결됨`);
  };

  const toggleNode = (id: string) => {
    setNodes(prev => ({...prev, [id]: {...prev[id], active: !prev[id].active}}));
  };

  const connectAllWeb = () => {
    setWebServices(prev => prev.map(w => ({...w, on: true})));
    showToast('🎉 모든 웹 서비스가 연결되었습니다!');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab Content
  // ═══════════════════════════════════════════════════════════════════════════

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            topNode={topNode}
            dangerNodes={dangerNodes}
            onShowModal={() => setShowModal(true)}
            showToast={showToast}
          />
        );
      case 'mission':
        return (
          <MissionTab
            missionFilter={missionFilter}
            setMissionFilter={setMissionFilter}
            showToast={showToast}
          />
        );
      case 'trinity':
        return (
          <TrinityTab
            nodes={nodes}
            nodeFilter={nodeFilter}
            setNodeFilter={setNodeFilter}
            showToast={showToast}
          />
        );
      case 'setup':
        return (
          <SetupTab
            connectors={connectors}
            devices={devices}
            webServices={webServices}
            toggleConnector={toggleConnector}
            setDevices={setDevices}
            setWebServices={setWebServices}
            connectAllWeb={connectAllWeb}
            showToast={showToast}
          />
        );
      case 'me':
        return (
          <MeTab
            nodes={nodes}
            activeCount={activeCount}
            showToast={showToast}
            onEditNodes={() => setShowEditModal('nodes')}
          />
        );
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: CSS.bg,
      color: CSS.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 15px 15px',
        borderBottom: `1px solid ${CSS.border}`,
        position: 'sticky',
        top: 0,
        background: CSS.bg,
        zIndex: 100,
      }}>
        <h1 style={{ fontSize: 19, color: CSS.accent, margin: 0 }}>AUTUS v2.1</h1>
        <span style={{ fontSize: 11, color: CSS.text3 }}>{activeCount}/36 노드</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 15, paddingBottom: 90, overflowY: 'auto' }}>
        {renderTab()}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: CSS.bg2,
        borderTop: `1px solid ${CSS.border}`,
        display: 'flex',
        zIndex: 1000,
      }}>
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'mission', icon: '📋', label: 'Mission' },
          { id: 'trinity', icon: '△', label: 'Trinity' },
          { id: 'setup', icon: '⚙️', label: 'Setup' },
          { id: 'me', icon: '👤', label: 'Me' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            style={{
              flex: 1,
              padding: '12px 5px 20px',
              textAlign: 'center',
              background: 'none',
              border: 'none',
              color: activeTab === tab.id ? CSS.accent : CSS.text3,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', fontSize: 19 }}>{tab.icon}</span>
            <small style={{ fontSize: 10 }}>{tab.label}</small>
          </button>
        ))}
      </div>

      {/* Mission Modal */}
      {showModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <div style={{
            background: CSS.bg2,
            width: '100%',
            maxWidth: 480,
            maxHeight: '85vh',
            borderRadius: '20px 20px 0 0',
            padding: 16,
            overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, background: CSS.border, borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 28 }}>{topNode.state === 'IRREVERSIBLE' ? '🔴' : '🟡'}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{topNode.name} {fmt(topNode)}</div>
              <div style={{ fontSize: 13, color: CSS.text2, marginTop: 6 }}>
                현재: {fmt(topNode)} | 압력: {(topNode.pressure*100).toFixed(0)}%
              </div>
            </div>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>어떻게 하시겠습니까?</div>

            {[
              { id: 'ignore', name: '❌ 무시', desc: '지금은 조치하지 않습니다', meta: ['💰 ₩0', '⏱️ 0분'], warn: '⚠️ 압력 상승', recommended: false },
              { id: 'auto', name: '🤖 자동화', desc: 'AUTUS가 자동으로 최적화', meta: ['💰 ₩0', '⏱️ 3일'], warn: '📈 개선', recommended: true },
              { id: 'out', name: '👥 외주', desc: '전문가에게 분석 의뢰', meta: ['💰 ₩300,000', '⏱️ 7일'], warn: '📈 큰 개선', recommended: false },
              { id: 'direct', name: '📋 지시', desc: '팀원에게 검토 지시', meta: ['💰 ₩0', '⏱️ 1일'], warn: '📈 소폭 개선', recommended: false },
            ].map(action => (
              <div
                key={action.id}
                onClick={() => {
                  if (action.id === 'ignore') {
                    showToast('무시됨 - 압력이 계속 상승합니다');
                  } else {
                    showToast('미션이 생성되었습니다!');
                    setActiveTab('mission');
                  }
                  setShowModal(false);
                }}
                style={{
                  background: action.recommended ? 'rgba(0,212,255,0.05)' : CSS.bg,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 8,
                  border: `1px solid ${action.recommended ? CSS.accent : CSS.border}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{action.name}</span>
                  {action.recommended && (
                    <span style={{ fontSize: 10, padding: '2px 6px', background: CSS.accent, color: '#000', borderRadius: 8 }}>⭐ 추천</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: CSS.text2, marginBottom: 8 }}>{action.desc}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: CSS.text3, flexWrap: 'wrap' }}>
                  {action.meta.map((m, i) => <span key={i}>{m}</span>)}
                  <span style={{ color: action.id === 'ignore' ? CSS.danger : CSS.success }}>{action.warn}</span>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                padding: 12,
                background: CSS.bg3,
                border: `1px solid ${CSS.border}`,
                borderRadius: 10,
                color: CSS.text,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Edit Nodes Modal */}
      {showEditModal === 'nodes' && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <div style={{
            background: CSS.bg2,
            width: '100%',
            maxWidth: 480,
            maxHeight: '85vh',
            borderRadius: '20px 20px 0 0',
            padding: 16,
            overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, background: CSS.border, borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>활성 노드 선택 (36개)</div>
            </div>
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {Object.values(nodes).map(n => (
                <label
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${CSS.border}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={n.active}
                    onChange={() => toggleNode(n.id)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>{n.icon}</span>
                  <span style={{ flex: 1 }}>{n.name}</span>
                  <span style={{ fontSize: 12, color: CSS.text3 }}>{n.layer}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => {
                showToast('저장되었습니다');
                setShowEditModal(null);
              }}
              style={{
                width: '100%',
                padding: 12,
                background: CSS.accent,
                border: 'none',
                borderRadius: 10,
                color: '#000',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 12,
              }}
            >
              저장
            </button>
            <button
              onClick={() => setShowEditModal(null)}
              style={{
                width: '100%',
                padding: 12,
                background: CSS.bg3,
                border: `1px solid ${CSS.border}`,
                borderRadius: 10,
                color: CSS.text,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: CSS.bg3,
          color: CSS.text,
          padding: '12px 20px',
          borderRadius: 10,
          fontSize: 14,
          zIndex: 3000,
        }}>
          {toast}
        </div>
      )}

      {/* Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(255,59,59,0.2); }
          50% { box-shadow: 0 0 20px rgba(255,59,59,0.4); }
        }
      `}</style>
    </div>
  );
}
