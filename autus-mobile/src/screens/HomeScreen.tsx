/**
 * AUTUS Mobile - Home Screen (최적화됨)
 * useMemo/useCallback + FlatList
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList,
  StyleSheet, 
  RefreshControl,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useAutusStore } from '../stores/autusStore';
import { theme } from '../constants/theme';
import { CIRCUITS } from '../constants/circuits';
import { 
  TopCard, 
  StatBox, 
  CircuitBar, 
  MissionCreateModal,
  Toast,
} from '../components';
import { 
  getTop1Node, 
  getDangerNodes,
  calculateEquilibrium,
  calculateStability,
  calculateCircuitValue,
  getStateColor,
  getPressureColor,
} from '../utils/calculations';
import { formatNodeValue, formatDecimal } from '../utils/formatters';
import { MissionType, Node, Circuit } from '../types';

type HomeItem = 
  | { type: 'top'; node: Node }
  | { type: 'stats'; equilibrium: number; stability: number; dangerCount: number; missionCount: number }
  | { type: 'circuits-header' }
  | { type: 'circuits'; circuits: (Circuit & { calculatedValue: number })[] }
  | { type: 'danger-header' }
  | { type: 'danger-node'; node: Node };

export const HomeScreen: React.FC = () => {
  const { nodes, missions, addMission } = useAutusStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  const topNode = useMemo(() => getTop1Node(nodes), [nodes]);
  const dangerNodes = useMemo(() => getDangerNodes(nodes).slice(0, 5), [nodes]);
  const equilibrium = useMemo(() => calculateEquilibrium(nodes), [nodes]);
  const stability = useMemo(() => calculateStability(nodes), [nodes]);
  const activeMissions = useMemo(() => 
    missions.filter(m => m.status === 'active').length, [missions]);
  
  const circuitValues = useMemo(() => 
    CIRCUITS.map(c => ({
      ...c,
      calculatedValue: calculateCircuitValue(nodes, c),
    })), [nodes]);
  
  // FlatList 데이터 생성
  const listData = useMemo<HomeItem[]>(() => {
    const items: HomeItem[] = [];
    
    if (topNode) {
      items.push({ type: 'top', node: topNode });
    }
    
    items.push({ 
      type: 'stats', 
      equilibrium, 
      stability, 
      dangerCount: dangerNodes.length,
      missionCount: activeMissions,
    });
    
    items.push({ type: 'circuits-header' });
    items.push({ type: 'circuits', circuits: circuitValues });
    
    items.push({ type: 'danger-header' });
    dangerNodes.forEach(node => {
      items.push({ type: 'danger-node', node });
    });
    
    return items;
  }, [topNode, equilibrium, stability, dangerNodes, activeMissions, circuitValues]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);
  
  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);
  const hideToast = useCallback(() => setToast(null), []);
  
  const handleCreateMission = useCallback((type: MissionType | null) => {
    closeModal();
    
    if (type === null) {
      setToast('무시됨 - 압력이 계속 상승합니다');
      return;
    }
    
    if (!topNode) return;
    
    addMission({
      title: `${topNode.name} 개선`,
      type,
      icon: type === '자동화' ? '🤖' : type === '외주' ? '👥' : '📋',
      status: 'active',
      progress: 0,
      eta: type === '자동화' ? '3일 후' : type === '외주' ? '7일 후' : '1일 후',
      nodeId: topNode.id,
      steps: [
        { t: '분석 시작', s: 'active' },
        { t: '옵션 검토', s: '' },
        { t: '실행', s: '' },
        { t: '결과 확인', s: '' },
      ],
    });
    
    setToast('미션이 생성되었습니다!');
  }, [topNode, addMission, closeModal]);
  
  const handleDangerPress = useCallback((node: Node) => {
    setToast(`${node.icon} ${node.name}: 압력 ${(node.pressure * 100).toFixed(0)}%`);
  }, []);
  
  const renderItem: ListRenderItem<HomeItem> = useCallback(({ item }) => {
    switch (item.type) {
      case 'top':
        return <TopCard node={item.node} onPress={openModal} />;
        
      case 'stats':
        return (
          <View style={styles.stats}>
            <StatBox value={formatDecimal(item.equilibrium)} label="평형점" />
            <StatBox value={formatDecimal(item.stability)} label="안정성" />
            <StatBox 
              value={String(item.dangerCount)} 
              label="위험" 
              color={item.dangerCount > 0 ? theme.warning : theme.success}
            />
            <StatBox value={String(item.missionCount)} label="미션" />
          </View>
        );
        
      case 'circuits-header':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔌 핵심 회로</Text>
          </View>
        );
        
      case 'circuits':
        return (
          <View style={styles.circuitCard}>
            {item.circuits.map((circuit) => (
              <CircuitBar 
                key={circuit.id} 
                circuit={circuit} 
                value={circuit.calculatedValue} 
              />
            ))}
          </View>
        );
        
      case 'danger-header':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ 위험 노드</Text>
          </View>
        );
        
      case 'danger-node':
        return (
          <TouchableOpacity
            style={[styles.dangerCard, { borderColor: getStateColor(item.node.state) }]}
            onPress={() => handleDangerPress(item.node)}
          >
            <View style={styles.dangerLeft}>
              <Text style={styles.dangerIcon}>{item.node.icon}</Text>
              <Text style={styles.dangerName}>{item.node.name}</Text>
              <Text style={styles.dangerValue}>{formatNodeValue(item.node)}</Text>
            </View>
            <Text style={[styles.dangerPressure, { color: getPressureColor(item.node.pressure) }]}>
              {item.node.pressure.toFixed(2)}
            </Text>
          </TouchableOpacity>
        );
        
      default:
        return null;
    }
  }, [openModal, handleDangerPress]);
  
  const keyExtractor = useCallback((item: HomeItem, index: number) => 
    `${item.type}-${index}`, []);
  
  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={5}
      />
      
      <MissionCreateModal
        visible={showModal}
        node={topNode}
        onClose={closeModal}
        onSelect={handleCreateMission}
      />
      
      <Toast
        message={toast || ''}
        visible={!!toast}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    padding: 15,
    paddingBottom: 30,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    color: theme.text2,
  },
  circuitCard: {
    backgroundColor: theme.bg2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 15,
  },
  dangerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.bg2,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  dangerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dangerIcon: {
    fontSize: 16,
  },
  dangerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  dangerValue: {
    fontSize: 13,
    color: theme.text3,
  },
  dangerPressure: {
    fontSize: 14,
    fontWeight: '600',
  },
});
