/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;










/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;










/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;










/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;










/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;




















/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;










/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;










/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;










/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;










/**
 * AUTUS Local Agent - Dashboard Screen
 * ======================================
 * 
 * 메인 대시보드 화면
 * 
 * 표시 정보:
 * - SQ 통계 요약
 * - 티어 분포 차트
 * - 승급 가능 노드
 * - 이탈 위험 노드
 * - 빠른 액션 버튼
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';

// Types
interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  moneyTotal: number;
  synergyScore: number;
  entropyScore: number;
  sqScore: number;
  tier: string;
}

interface Statistics {
  totalNodes: number;
  avgSQ: number;
  totalMoney: number;
  tierDistribution: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  iron: '#8B8B8B',
  steel: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  sovereign: '#9B59B6',
};

const TIER_LABELS: Record<string, string> = {
  iron: 'Iron',
  steel: 'Steel',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  sovereign: 'Sovereign',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
//                              MOCK DATA (테스트용)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_STATS: Statistics = {
  totalNodes: 47,
  avgSQ: 58.3,
  totalMoney: 14500000,
  tierDistribution: {
    iron: 8,
    steel: 12,
    gold: 15,
    platinum: 8,
    diamond: 3,
    sovereign: 1,
  },
};

const MOCK_UPGRADE_CANDIDATES = [
  { node: { id: '1', name: '김영희 학부모', sqScore: 48, tier: 'steel' }, reason: 'Gold 승급까지 2% 이내' },
  { node: { id: '2', name: '이철수 학부모', sqScore: 72, tier: 'gold' }, reason: 'Platinum 승급까지 3% 이내' },
];

const MOCK_CHURN_RISKS = [
  { node: { id: '3', name: '박민수 학부모', sqScore: 25, tier: 'iron' }, reason: '통화 시간 과다 (45분)' },
  { node: { id: '4', name: '최지연 학부모', sqScore: 30, tier: 'iron' }, reason: '시너지 저하 (출석률 60%)' },
];

// ═══════════════════════════════════════════════════════════════════════════
//                              COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, subtitle, color = '#333' }) => (
  <View style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// 티어 분포 바
const TierDistributionBar: React.FC<{
  distribution: Record<string, number>;
  total: number;
}> = ({ distribution, total }) => {
  const tiers = ['iron', 'steel', 'gold', 'platinum', 'diamond', 'sovereign'];
  
  return (
    <View style={styles.tierBarContainer}>
      <View style={styles.tierBar}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          const width = total > 0 ? (count / total) * 100 : 0;
          
          if (width === 0) return null;
          
          return (
            <View
              key={tier}
              style={[
                styles.tierSegment,
                { width: `${width}%`, backgroundColor: TIER_COLORS[tier] },
              ]}
            />
          );
        })}
      </View>
      
      <View style={styles.tierLegend}>
        {tiers.map((tier) => {
          const count = distribution[tier] || 0;
          if (count === 0) return null;
          
          return (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendText}>{TIER_LABELS[tier]} ({count})</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 노드 카드
const NodeCard: React.FC<{
  node: { id: string; name: string; sqScore: number; tier: string };
  reason: string;
  type: 'upgrade' | 'risk';
  onPress?: () => void;
}> = ({ node, reason, type, onPress }) => (
  <TouchableOpacity
    style={[
      styles.nodeCard,
      type === 'risk' && styles.nodeCardRisk,
    ]}
    onPress={onPress}
  >
    <View style={styles.nodeCardHeader}>
      <Text style={styles.nodeCardName}>{node.name}</Text>
      <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[node.tier] }]}>
        <Text style={styles.tierBadgeText}>{TIER_LABELS[node.tier]}</Text>
      </View>
    </View>
    <Text style={styles.nodeCardSQ}>SQ: {node.sqScore.toFixed(1)}</Text>
    <Text style={styles.nodeCardReason}>{reason}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics>(MOCK_STATS);
  const [upgradeCandidates, setUpgradeCandidates] = useState(MOCK_UPGRADE_CANDIDATES);
  const [churnRisks, setChurnRisks] = useState(MOCK_CHURN_RISKS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: 실제 데이터 로드
    // const newStats = await sqService.getStatistics();
    // const newUpgrades = await sqService.getUpgradeCandidates();
    // const newRisks = await sqService.getChurnRisks();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    
    setRefreshing(false);
  }, []);

  const formatMoney = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AUTUS</Text>
        <Text style={styles.headerSubtitle}>인맥 최적화 대시보드</Text>
      </View>

      {/* 통계 요약 */}
      <View style={styles.statsRow}>
        <StatCard
          title="총 노드"
          value={stats.totalNodes}
          subtitle="명"
        />
        <StatCard
          title="평균 SQ"
          value={stats.avgSQ.toFixed(1)}
          color={stats.avgSQ >= 60 ? '#2ECC71' : stats.avgSQ >= 40 ? '#F39C12' : '#E74C3C'}
        />
        <StatCard
          title="총 수익"
          value={formatMoney(stats.totalMoney)}
          color="#3498DB"
        />
      </View>

      {/* 티어 분포 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>티어 분포</Text>
        <TierDistributionBar
          distribution={stats.tierDistribution}
          total={stats.totalNodes}
        />
      </View>

      {/* 승급 가능 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 승급 가능 노드</Text>
        {upgradeCandidates.length > 0 ? (
          upgradeCandidates.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="upgrade"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>승급 가능한 노드가 없습니다</Text>
        )}
      </View>

      {/* 이탈 위험 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ 이탈 위험 노드</Text>
        {churnRisks.length > 0 ? (
          churnRisks.map(({ node, reason }) => (
            <NodeCard
              key={node.id}
              node={node}
              reason={reason}
              type="risk"
            />
          ))
        ) : (
          <Text style={styles.emptyText}>이탈 위험 노드가 없습니다 ✓</Text>
        )}
      </View>

      {/* 빠른 액션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ 빠른 액션</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 전체 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📱 일괄 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 데이터 수집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  tierBarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  tierBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECF0F1',
  },
  tierSegment: {
    height: '100%',
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  nodeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  nodeCardRisk: {
    borderLeftColor: '#E74C3C',
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nodeCardSQ: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nodeCardReason: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDC3C7',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DashboardScreen;

























