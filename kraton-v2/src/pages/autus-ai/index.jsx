/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTUS-AI.COM - 메인 포털
 *
 * 1-12-144 계층 구조
 * 각 회사 현황
 * 디지털 트윈 - 돈의 흐름
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';

// 1-12-144 계층 구조 데이터
const AUTUS_HIERARCHY = {
  core: {
    id: 'AUTUS_CORE',
    name: 'AUTUS Core',
    description: 'Claude/MoltBot이 전적으로 구축',
    status: 'ACTIVE',
    kernel: {
      laws: ['K1', 'K2', 'K3', 'K4', 'K5'],
      discardRate: 0.92,
      qualityScore: 87.3,
    },
  },

  // 12개 도메인
  domains: [
    {
      id: 'DOMAIN_SPORTS',
      name: '스포츠/교육',
      color: '#FF6B35',
      products: [
        { id: 'ATB', name: '올댓바스켓', status: 'LIVE', revenue: 2450000, users: 127 },
        { id: 'ATF', name: '올댓풋볼', status: 'PLANNING', revenue: 0, users: 0 },
        { id: 'ATS', name: '올댓수영', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_FITNESS',
      name: '피트니스',
      color: '#4ECDC4',
      products: [
        { id: 'SMF', name: '스마트핏', status: 'LIVE', revenue: 8750000, users: 342 },
        { id: 'GYM', name: '짐매니저', status: 'DEV', revenue: 0, users: 45 },
      ],
    },
    {
      id: 'DOMAIN_WELLNESS',
      name: '웰니스',
      color: '#95E1D3',
      products: [
        { id: 'MND', name: '마인드풀', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_EDUCATION',
      name: '교육/학원',
      color: '#F38181',
      products: [
        { id: 'EDU', name: '에듀매니저', status: 'DEV', revenue: 0, users: 23 },
      ],
    },
    {
      id: 'DOMAIN_RETAIL',
      name: '리테일',
      color: '#AA96DA',
      products: [
        { id: 'SHP', name: '샵매니저', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_FNB',
      name: 'F&B',
      color: '#FCBAD3',
      products: [
        { id: 'RST', name: '레스토핏', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_BEAUTY',
      name: '뷰티/살롱',
      color: '#FFE66D',
      products: [
        { id: 'BTY', name: '뷰티매니저', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_MEDICAL',
      name: '의료/클리닉',
      color: '#6C5CE7',
      products: [
        { id: 'MED', name: '클리닉매니저', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_REALESTATE',
      name: '부동산',
      color: '#00B894',
      products: [
        { id: 'RES', name: '프롭매니저', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_LEGAL',
      name: '법률/회계',
      color: '#0984E3',
      products: [
        { id: 'LAW', name: '로펌매니저', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_CREATIVE',
      name: '크리에이티브',
      color: '#E17055',
      products: [
        { id: 'CRT', name: '크리에이터허브', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
    {
      id: 'DOMAIN_LOGISTICS',
      name: '물류/운송',
      color: '#636E72',
      products: [
        { id: 'LOG', name: '로지매니저', status: 'PLANNING', revenue: 0, users: 0 },
      ],
    },
  ],
};

// 돈의 흐름 데이터
const MONEY_FLOW = {
  totalRevenue: 11200000,
  monthlyGrowth: 0.23,
  streams: [
    { from: 'ATB', to: 'CORE', amount: 245000, type: 'LICENSE' },
    { from: 'SMF', to: 'CORE', amount: 875000, type: 'LICENSE' },
    { from: 'EXTERNAL', to: 'ATB', amount: 2450000, type: 'SUBSCRIPTION' },
    { from: 'EXTERNAL', to: 'SMF', amount: 8750000, type: 'SUBSCRIPTION' },
  ],
};

export default function AutusAIPortal() {
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [viewMode, setViewMode] = useState('hierarchy'); // hierarchy | flow | status
  const [animatedRevenue, setAnimatedRevenue] = useState(0);

  useEffect(() => {
    // 매출 애니메이션
    const target = MONEY_FLOW.totalRevenue;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedRevenue(target);
        clearInterval(timer);
      } else {
        setAnimatedRevenue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  // 전체 제품 수 계산
  const totalProducts = AUTUS_HIERARCHY.domains.reduce(
    (acc, d) => acc + d.products.length, 0
  );
  const liveProducts = AUTUS_HIERARCHY.domains.reduce(
    (acc, d) => acc + d.products.filter(p => p.status === 'LIVE').length, 0
  );
  const totalUsers = AUTUS_HIERARCHY.domains.reduce(
    (acc, d) => acc + d.products.reduce((a, p) => a + p.users, 0), 0
  );

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>◉</span>
          <span style={styles.logoText}>AUTUS</span>
          <span style={styles.logoAI}>.AI</span>
        </div>
        <div style={styles.tagline}>
          "사람의 판단이 개입되는 순간, 시스템은 오염된다"
        </div>
      </header>

      {/* 뷰 모드 탭 */}
      <nav style={styles.tabs}>
        {[
          { id: 'hierarchy', label: '1-12-144', icon: '🏛️' },
          { id: 'flow', label: '돈의 흐름', icon: '💰' },
          { id: 'status', label: '회사 현황', icon: '📊' },
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(viewMode === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setViewMode(tab.id)}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 메인 콘텐츠 */}
      <main style={styles.main}>
        {viewMode === 'hierarchy' && (
          <HierarchyView
            data={AUTUS_HIERARCHY}
            selectedDomain={selectedDomain}
            onSelectDomain={setSelectedDomain}
          />
        )}
        {viewMode === 'flow' && (
          <MoneyFlowView
            data={MONEY_FLOW}
            animatedRevenue={animatedRevenue}
          />
        )}
        {viewMode === 'status' && (
          <CompanyStatusView
            domains={AUTUS_HIERARCHY.domains}
          />
        )}
      </main>

      {/* 하단 통계 바 */}
      <footer style={styles.footer}>
        <div style={styles.stat}>
          <span style={styles.statValue}>1</span>
          <span style={styles.statLabel}>Core</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>12</span>
          <span style={styles.statLabel}>Domains</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{totalProducts}</span>
          <span style={styles.statLabel}>Products</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{liveProducts}</span>
          <span style={styles.statLabel}>Live</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{totalUsers.toLocaleString()}</span>
          <span style={styles.statLabel}>Users</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>₩{(animatedRevenue / 10000).toFixed(0)}만</span>
          <span style={styles.statLabel}>Revenue</span>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1-12-144 계층 뷰
// ═══════════════════════════════════════════════════════════════
function HierarchyView({ data, selectedDomain, onSelectDomain }) {
  return (
    <div style={hierarchyStyles.container}>
      {/* Core (1) */}
      <div style={hierarchyStyles.coreSection}>
        <div style={hierarchyStyles.coreNode}>
          <div style={hierarchyStyles.coreIcon}>◉</div>
          <div style={hierarchyStyles.coreInfo}>
            <h2 style={hierarchyStyles.coreName}>{data.core.name}</h2>
            <p style={hierarchyStyles.coreDesc}>{data.core.description}</p>
            <div style={hierarchyStyles.kernelStats}>
              <span style={hierarchyStyles.kernelBadge}>
                5 Laws: {data.core.kernel.laws.join(', ')}
              </span>
              <span style={hierarchyStyles.kernelBadge}>
                Discard: {(data.core.kernel.discardRate * 100).toFixed(0)}%
              </span>
              <span style={hierarchyStyles.kernelBadge}>
                Q-Score: {data.core.kernel.qualityScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connector line */}
      <div style={hierarchyStyles.connector}>
        <div style={hierarchyStyles.connectorLine}></div>
        <div style={hierarchyStyles.connectorLabel}>12 Domains</div>
      </div>

      {/* Domains (12) */}
      <div style={hierarchyStyles.domainsGrid}>
        {data.domains.map(domain => (
          <div
            key={domain.id}
            style={{
              ...hierarchyStyles.domainCard,
              borderColor: domain.color,
              backgroundColor: selectedDomain === domain.id ? `${domain.color}15` : 'white',
            }}
            onClick={() => onSelectDomain(
              selectedDomain === domain.id ? null : domain.id
            )}
          >
            <div
              style={{
                ...hierarchyStyles.domainHeader,
                backgroundColor: domain.color,
              }}
            >
              <span style={hierarchyStyles.domainName}>{domain.name}</span>
              <span style={hierarchyStyles.productCount}>
                {domain.products.length}
              </span>
            </div>

            {/* Products (144 total across all domains) */}
            {selectedDomain === domain.id && (
              <div style={hierarchyStyles.productsList}>
                {domain.products.map(product => (
                  <div key={product.id} style={hierarchyStyles.productItem}>
                    <span style={hierarchyStyles.productName}>{product.name}</span>
                    <span style={{
                      ...hierarchyStyles.productStatus,
                      backgroundColor: getStatusColor(product.status),
                    }}>
                      {product.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 돈의 흐름 뷰 (디지털 트윈)
// ═══════════════════════════════════════════════════════════════
function MoneyFlowView({ data, animatedRevenue }) {
  return (
    <div style={flowStyles.container}>
      {/* 총 매출 카드 */}
      <div style={flowStyles.totalCard}>
        <h2 style={flowStyles.totalLabel}>Total Monthly Revenue</h2>
        <div style={flowStyles.totalValue}>
          ₩{animatedRevenue.toLocaleString()}
        </div>
        <div style={flowStyles.growth}>
          <span style={flowStyles.growthIcon}>↑</span>
          {(data.monthlyGrowth * 100).toFixed(0)}% vs last month
        </div>
      </div>

      {/* 흐름 다이어그램 */}
      <div style={flowStyles.diagram}>
        {/* 외부 수익 */}
        <div style={flowStyles.column}>
          <h3 style={flowStyles.columnTitle}>External</h3>
          <div style={flowStyles.externalBox}>
            <div style={flowStyles.externalLabel}>고객 구독료</div>
            <div style={flowStyles.externalValue}>
              ₩{(11200000).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 화살표 */}
        <div style={flowStyles.arrowColumn}>
          <div style={flowStyles.arrow}>→</div>
          <div style={flowStyles.arrowLabel}>Subscription</div>
        </div>

        {/* 파생상품들 */}
        <div style={flowStyles.column}>
          <h3 style={flowStyles.columnTitle}>Products</h3>
          {[
            { name: '스마트핏', revenue: 8750000, color: '#4ECDC4' },
            { name: '올댓바스켓', revenue: 2450000, color: '#FF6B35' },
          ].map(product => (
            <div
              key={product.name}
              style={{
                ...flowStyles.productBox,
                borderLeftColor: product.color,
              }}
            >
              <div style={flowStyles.productName}>{product.name}</div>
              <div style={flowStyles.productRevenue}>
                ₩{product.revenue.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* 화살표 */}
        <div style={flowStyles.arrowColumn}>
          <div style={flowStyles.arrow}>→</div>
          <div style={flowStyles.arrowLabel}>License 10%</div>
        </div>

        {/* Core */}
        <div style={flowStyles.column}>
          <h3 style={flowStyles.columnTitle}>AUTUS Core</h3>
          <div style={flowStyles.coreBox}>
            <div style={flowStyles.coreLabel}>라이센스 수익</div>
            <div style={flowStyles.coreValue}>
              ₩{(1120000).toLocaleString()}
            </div>
            <div style={flowStyles.coreNote}>
              (총 매출의 10%)
            </div>
          </div>
        </div>
      </div>

      {/* 흐름 상세 */}
      <div style={flowStyles.streamsList}>
        <h3 style={flowStyles.streamsTitle}>실시간 거래 흐름</h3>
        {data.streams.map((stream, idx) => (
          <div key={idx} style={flowStyles.streamItem}>
            <span style={flowStyles.streamFrom}>{stream.from}</span>
            <span style={flowStyles.streamArrow}>→</span>
            <span style={flowStyles.streamTo}>{stream.to}</span>
            <span style={flowStyles.streamAmount}>
              ₩{stream.amount.toLocaleString()}
            </span>
            <span style={flowStyles.streamType}>{stream.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 회사 현황 뷰
// ═══════════════════════════════════════════════════════════════
function CompanyStatusView({ domains }) {
  const allProducts = domains.flatMap(d =>
    d.products.map(p => ({ ...p, domain: d.name, domainColor: d.color }))
  );

  const statusOrder = { LIVE: 0, DEV: 1, PLANNING: 2 };
  const sorted = [...allProducts].sort((a, b) =>
    statusOrder[a.status] - statusOrder[b.status]
  );

  return (
    <div style={statusStyles.container}>
      <div style={statusStyles.grid}>
        {sorted.map(product => (
          <div
            key={product.id}
            style={{
              ...statusStyles.card,
              borderTopColor: product.domainColor,
            }}
          >
            <div style={statusStyles.cardHeader}>
              <span style={statusStyles.productId}>{product.id}</span>
              <span style={{
                ...statusStyles.statusBadge,
                backgroundColor: getStatusColor(product.status),
              }}>
                {product.status}
              </span>
            </div>

            <h3 style={statusStyles.productName}>{product.name}</h3>
            <p style={statusStyles.domain}>{product.domain}</p>

            <div style={statusStyles.metrics}>
              <div style={statusStyles.metric}>
                <span style={statusStyles.metricValue}>
                  {product.users.toLocaleString()}
                </span>
                <span style={statusStyles.metricLabel}>Users</span>
              </div>
              <div style={statusStyles.metric}>
                <span style={statusStyles.metricValue}>
                  ₩{(product.revenue / 10000).toFixed(0)}만
                </span>
                <span style={statusStyles.metricLabel}>Revenue</span>
              </div>
            </div>

            {product.status === 'LIVE' && (
              <div style={statusStyles.liveIndicator}>
                <span style={statusStyles.liveDot}></span>
                운영 중
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════
function getStatusColor(status) {
  switch (status) {
    case 'LIVE': return '#00B894';
    case 'DEV': return '#FDCB6E';
    case 'PLANNING': return '#B2BEC3';
    default: return '#DFE6E9';
  }
}

// ═══════════════════════════════════════════════════════════════
// 스타일
// ═══════════════════════════════════════════════════════════════
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0F',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '24px',
    textAlign: 'center',
    borderBottom: '1px solid #1a1a2e',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  logoIcon: {
    fontSize: '32px',
    color: '#FF6B35',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: '700',
    letterSpacing: '2px',
  },
  logoAI: {
    fontSize: '28px',
    fontWeight: '300',
    color: '#4ECDC4',
  },
  tagline: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
  },
  tabs: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    borderBottom: '1px solid #1a1a2e',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    color: 'white',
  },
  tabIcon: {
    fontSize: '16px',
  },
  main: {
    padding: '24px',
    minHeight: 'calc(100vh - 250px)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    padding: '20px',
    borderTop: '1px solid #1a1a2e',
    backgroundColor: '#0D0D12',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#4ECDC4',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
};

const hierarchyStyles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  coreSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  coreNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    border: '2px solid #FF6B35',
  },
  coreIcon: {
    fontSize: '48px',
    color: '#FF6B35',
  },
  coreInfo: {},
  coreName: {
    margin: '0 0 4px 0',
    fontSize: '24px',
    fontWeight: '700',
  },
  coreDesc: {
    margin: '0 0 12px 0',
    color: '#888',
    fontSize: '14px',
  },
  kernelStats: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  kernelBadge: {
    padding: '4px 12px',
    backgroundColor: '#252540',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#4ECDC4',
  },
  connector: {
    textAlign: 'center',
    padding: '16px 0',
  },
  connectorLine: {
    width: '2px',
    height: '30px',
    backgroundColor: '#333',
    margin: '0 auto',
  },
  connectorLabel: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#666',
  },
  domainsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  domainCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '2px solid',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  domainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    color: 'white',
  },
  domainName: {
    fontWeight: '600',
    fontSize: '14px',
  },
  productCount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
  },
  productsList: {
    padding: '12px',
  },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
  },
  productName: {
    color: '#333',
    fontSize: '13px',
  },
  productStatus: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    color: 'white',
    fontWeight: '600',
  },
};

const flowStyles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  totalCard: {
    textAlign: 'center',
    padding: '32px',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    marginBottom: '32px',
  },
  totalLabel: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  totalValue: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#4ECDC4',
  },
  growth: {
    marginTop: '8px',
    color: '#00B894',
    fontSize: '14px',
  },
  growthIcon: {
    marginRight: '4px',
  },
  diagram: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '24px',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    marginBottom: '24px',
  },
  column: {
    flex: 1,
    textAlign: 'center',
  },
  columnTitle: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#888',
  },
  externalBox: {
    padding: '20px',
    backgroundColor: '#252540',
    borderRadius: '12px',
  },
  externalLabel: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
  },
  externalValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FF6B35',
  },
  arrowColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '40px',
  },
  arrow: {
    fontSize: '24px',
    color: '#4ECDC4',
  },
  arrowLabel: {
    fontSize: '10px',
    color: '#666',
    marginTop: '4px',
  },
  productBox: {
    padding: '16px',
    backgroundColor: '#252540',
    borderRadius: '8px',
    borderLeft: '4px solid',
    marginBottom: '8px',
    textAlign: 'left',
  },
  productName: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  productRevenue: {
    fontSize: '16px',
    color: '#4ECDC4',
  },
  coreBox: {
    padding: '20px',
    backgroundColor: '#FF6B35',
    borderRadius: '12px',
  },
  coreLabel: {
    fontSize: '12px',
    opacity: 0.8,
    marginBottom: '8px',
  },
  coreValue: {
    fontSize: '20px',
    fontWeight: '700',
  },
  coreNote: {
    fontSize: '11px',
    opacity: 0.7,
    marginTop: '4px',
  },
  streamsList: {
    padding: '20px',
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
  },
  streamsTitle: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#888',
  },
  streamItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #252540',
  },
  streamFrom: {
    padding: '4px 8px',
    backgroundColor: '#252540',
    borderRadius: '4px',
    fontSize: '12px',
  },
  streamArrow: {
    color: '#4ECDC4',
  },
  streamTo: {
    padding: '4px 8px',
    backgroundColor: '#252540',
    borderRadius: '4px',
    fontSize: '12px',
  },
  streamAmount: {
    marginLeft: 'auto',
    fontWeight: '600',
    color: '#4ECDC4',
  },
  streamType: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
  },
};

const statusStyles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: '20px',
    borderTop: '4px solid',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  productId: {
    fontSize: '12px',
    color: '#666',
    fontFamily: 'monospace',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
  },
  productName: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    fontWeight: '600',
  },
  domain: {
    margin: '0 0 16px 0',
    fontSize: '13px',
    color: '#888',
  },
  metrics: {
    display: 'flex',
    gap: '24px',
  },
  metric: {
    flex: 1,
  },
  metricValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: '700',
    color: '#4ECDC4',
  },
  metricLabel: {
    fontSize: '11px',
    color: '#666',
    textTransform: 'uppercase',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #252540',
    fontSize: '12px',
    color: '#00B894',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#00B894',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
};
