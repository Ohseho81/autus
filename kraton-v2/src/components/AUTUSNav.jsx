/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Navigation Component
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 모든 AUTUS 페이지에서 공유하는 네비게이션 바
 */

import React from 'react';

const NAV_ITEMS = [
  { hash: '#ops', label: '운영', icon: '📊', desc: '시범 운영 대시보드', role: 'all' },
  { hash: '#vfactory', label: 'V-Factory', icon: '🏭', desc: 'V 목표 & 역산', role: 'owner' },
  { hash: '#producer', label: '워크플로우', icon: '🔧', desc: '이벤트 흐름 설계', role: 'producer' },
  { hash: '#flowtune', label: '플로우튜닝', icon: '⚡', desc: '플로우 최적화', role: 'manager' },
  { hash: '#live', label: '라이브', icon: '📡', desc: '실시간 모니터링', role: 'all' },
];

export default function AUTUSNav({ currentHash, minimal = false }) {
  const current = window.location.hash.toLowerCase();

  if (minimal) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 100,
      }}>
        <button
          onClick={() => window.location.hash = '#ops'}
          style={{
            width: 50, height: 50, borderRadius: '50%',
            background: '#F97316',
            border: 'none',
            color: 'white',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="AUTUS 대시보드"
        >
          🏀
        </button>
      </div>
    );
  }

  return (
    <nav style={{
      background: '#0D0D12',
      borderBottom: '1px solid #1E1E2E',
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      overflowX: 'auto',
    }}>
      {/* Logo */}
      <a
        href="#ops"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 8px',
          textDecoration: 'none',
          marginRight: 16,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #F97316, #EF4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          🏀
        </div>
        <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 14 }}>
          AUTUS
        </span>
      </a>

      {/* Nav Items */}
      {NAV_ITEMS.map(item => {
        const isActive = current === item.hash;

        return (
          <a
            key={item.hash}
            href={item.hash}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderRadius: 8,
              background: isActive ? '#F9731620' : 'transparent',
              border: isActive ? '1px solid #F9731650' : '1px solid transparent',
              color: isActive ? '#F97316' : '#6B7280',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            title={item.desc}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        );
      })}

      {/* Status Indicator */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: '#10B98120',
        borderRadius: 20,
        fontSize: 11,
        color: '#10B981',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#10B981',
        }} />
        시범 운영중
      </div>
    </nav>
  );
}

// 역할별 필터링된 네비게이션
export function AUTUSNavFiltered({ role = 'all' }) {
  const current = window.location.hash.toLowerCase();
  const filteredItems = NAV_ITEMS.filter(
    item => item.role === 'all' || item.role === role
  );

  return (
    <nav style={{
      background: '#0D0D12',
      borderBottom: '1px solid #1E1E2E',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      {filteredItems.map(item => {
        const isActive = current === item.hash;

        return (
          <a
            key={item.hash}
            href={item.hash}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: isActive ? '#F9731620' : 'transparent',
              color: isActive ? '#F97316' : '#6B7280',
              textDecoration: 'none',
              fontSize: 12,
            }}
          >
            {item.icon} {item.label}
          </a>
        );
      })}
    </nav>
  );
}
