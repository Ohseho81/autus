/**
 * 🗺️ ProcessHub - AUTUS 전체 맵 네비게이션
 *
 * 모든 ProcessMap과 Dashboard를 한 곳에서 접근
 */

import React from 'react';

// ============================================
// 페이지 정의
// ============================================

const PAGES = [
  {
    category: '🏀 최종본',
    items: [
      {
        hash: '#final',
        title: '올댓바스켓 업무 프로세스',
        emoji: '🏀',
        description: '고객 상단 + 4역할 데이터 흐름 + 실시간 동기화',
        status: 'FINAL',
      },
    ],
  },
  {
    category: '🔒 Internal Only',
    items: [
      {
        hash: '#autus',
        title: 'AUTUS Internal',
        emoji: '🔒',
        description: 'Fact Ledger + VV + Shadow + Loops',
        status: 'NEW',
      },
    ],
  },
  {
    category: 'Core Maps',
    items: [
      {
        hash: '#flow',
        title: 'Living Flow Graph',
        emoji: '🌊',
        description: 'Sankey 흐름 + 펄스 애니메이션 + AI 제안',
        status: 'NEW',
      },
      {
        hash: '#editor',
        title: 'Interactive Node Editor',
        emoji: '🎛️',
        description: '노드 드래그 + 역할 설정 + 실시간 V',
        status: 'FINAL',
      },
      {
        hash: '#processv10',
        title: '고객 중심 World Map',
        emoji: '🎯',
        description: '고객 → 로그 → 생산자 → 재등록',
        status: 'FINAL',
      },
      {
        hash: '#processv9',
        title: 'Master World Map',
        emoji: '🌍',
        description: 'Outcome Layer + Force Layer + Execution Layer',
        status: 'FINAL',
      },
      {
        hash: '#decision',
        title: 'Decision Dashboard',
        emoji: '📊',
        description: 'OutcomeFact → DecisionCard 실시간 처리',
        status: 'FINAL',
      },
    ],
  },
  {
    category: 'Evolution Maps',
    items: [
      {
        hash: '#processv8',
        title: 'State Machine',
        emoji: '🔄',
        description: 'C1-C6 계약 메커니즘 상태 전이',
        status: 'COMPLETE',
      },
      {
        hash: '#processv7',
        title: '비가역 노드 타임테이블',
        emoji: '📅',
        description: '18개월 투자 계획',
        status: 'COMPLETE',
      },
      {
        hash: '#processv6',
        title: 'Evolution Map',
        emoji: '📈',
        description: 'Lv.1 Tool → Lv.3 Partner',
        status: 'COMPLETE',
      },
    ],
  },
  {
    category: 'Analysis Maps',
    items: [
      {
        hash: '#processv5',
        title: '고객 & 노드 맵',
        emoji: '👥',
        description: '고객-생산자 관계 분석',
        status: 'COMPLETE',
      },
      {
        hash: '#processv4',
        title: 'Force 기반 맵',
        emoji: '⚡',
        description: '11개 Force 상호작용',
        status: 'COMPLETE',
      },
      {
        hash: '#processv3',
        title: '특성 기반 맵',
        emoji: '🧬',
        description: '시스템 특성 분석',
        status: 'COMPLETE',
      },
      {
        hash: '#processv2',
        title: '모션 기반 맵',
        emoji: '🎬',
        description: '프로세스 흐름 애니메이션',
        status: 'COMPLETE',
      },
      {
        hash: '#process',
        title: 'Original Map',
        emoji: '📋',
        description: '초기 프로세스 맵',
        status: 'LEGACY',
      },
    ],
  },
];

// ============================================
// 메인 컴포넌트
// ============================================

export default function ProcessHub() {
  const navigate = (hash) => {
    window.location.hash = hash;
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.logo}>🏀</div>
        <h1 style={styles.title}>AUTUS Process Hub</h1>
        <p style={styles.subtitle}>올댓바스켓 시스템 전체 맵</p>
      </header>

      {/* 핵심 개념 */}
      <div style={styles.conceptBox}>
        <div style={styles.conceptTitle}>핵심 개념</div>
        <div style={styles.conceptFlow}>
          <span style={styles.conceptItem}>👨‍👩‍👧 고객</span>
          <span style={styles.conceptArrow}>→</span>
          <span style={styles.conceptItem}>📋 로그 (10개)</span>
          <span style={styles.conceptArrow}>→</span>
          <span style={styles.conceptItem}>⚙️ 프로세스</span>
          <span style={styles.conceptArrow}>→</span>
          <span style={styles.conceptItem}>🏀 생산자</span>
          <span style={styles.conceptArrow}>→</span>
          <span style={styles.conceptItemHighlight}>✅ 재등록</span>
        </div>
      </div>

      {/* 페이지 그리드 */}
      {PAGES.map((category) => (
        <div key={category.category} style={styles.categorySection}>
          <h2 style={styles.categoryTitle}>{category.category}</h2>
          <div style={styles.pageGrid}>
            {category.items.map((page) => (
              <div
                key={page.hash}
                style={styles.pageCard}
                onClick={() => navigate(page.hash)}
              >
                <div style={styles.pageEmoji}>{page.emoji}</div>
                <div style={styles.pageContent}>
                  <div style={styles.pageTitle}>{page.title}</div>
                  <div style={styles.pageDescription}>{page.description}</div>
                </div>
                <div style={{
                  ...styles.pageStatus,
                  backgroundColor: getStatusColor(page.status),
                }}>
                  {page.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 파일 구조 */}
      <div style={styles.structureBox}>
        <div style={styles.structureTitle}>📁 파일 구조</div>
        <pre style={styles.structureCode}>
{`src/
├── contract/              ← Core 엔진 (불변)
│   ├── outcome_rules.json    OutcomeFact 10개
│   ├── synthesis_rules.json  전이 + 합성 매핑
│   └── outcomeEngine.js      프로세스 생성
│
├── brand/                 ← 브랜드 어댑터
│   ├── allthatbasket.adapter.js
│   └── DecisionCard.jsx
│
└── ProcessMap*.jsx        ← 시각화`}
        </pre>
      </div>

      {/* 푸터 */}
      <footer style={styles.footer}>
        <div style={styles.footerText}>
          AUTUS × 올댓바스켓
        </div>
        <div style={styles.footerSubtext}>
          고객 로그가 모든 것을 만든다
        </div>
      </footer>
    </div>
  );
}

// 상태 색상
function getStatusColor(status) {
  switch (status) {
    case 'NEW': return '#EC4899';
    case 'FINAL': return '#10B981';
    case 'COMPLETE': return '#3B82F6';
    case 'LEGACY': return '#9CA3AF';
    default: return '#F59E0B';
  }
}

// ============================================
// 스타일
// ============================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0F172A',
    padding: '32px',
    color: 'white',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '36px',
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: '16px',
    color: '#94A3B8',
    marginTop: '8px',
  },

  // 핵심 개념
  conceptBox: {
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
  },
  conceptTitle: {
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  conceptFlow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  conceptItem: {
    padding: '8px 16px',
    backgroundColor: '#334155',
    borderRadius: '8px',
    fontSize: '14px',
  },
  conceptArrow: {
    color: '#64748B',
  },
  conceptItemHighlight: {
    padding: '8px 16px',
    backgroundColor: '#10B981',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
  },

  // 카테고리
  categorySection: {
    marginBottom: '32px',
  },
  categoryTitle: {
    fontSize: '14px',
    color: '#64748B',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  pageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  pageCard: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #334155',
  },
  pageEmoji: {
    fontSize: '32px',
    flexShrink: 0,
  },
  pageContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  pageDescription: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  pageStatus: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // 파일 구조
  structureBox: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
  },
  structureTitle: {
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '16px',
  },
  structureCode: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#E2E8F0',
    margin: 0,
    lineHeight: 1.6,
  },

  // 푸터
  footer: {
    textAlign: 'center',
    paddingTop: '32px',
    borderTop: '1px solid #334155',
  },
  footerText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#F97316',
  },
  footerSubtext: {
    fontSize: '12px',
    color: '#64748B',
    marginTop: '4px',
  },
};
