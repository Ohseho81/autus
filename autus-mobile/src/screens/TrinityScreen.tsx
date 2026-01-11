/**
 * AUTUS Mobile - Trinity Screen (최적화됨)
 * FlatList로 가상화 + useMemo/useCallback
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useAutusStore } from '../stores/autusStore';
import { theme } from '../constants/theme';
import { LAYERS, LAYER_ORDER } from '../constants/layers';
import { FilterTabs, NodeCard, Toast } from '../components';
import { NodeFilter, Node, LayerId } from '../types';
import { formatNodeValue } from '../utils/formatters';

interface LayerSection {
  type: 'header' | 'nodes';
  layerId: LayerId;
  title?: string;
  count?: string;
  nodes?: Node[];
}

export const TrinityScreen: React.FC = () => {
  const { nodes, settings } = useAutusStore();
  const [filter, setFilter] = useState<NodeFilter>('active');
  const [toast, setToast] = useState<string | null>(null);
  
  const filterOptions = useMemo(() => [
    { id: 'active' as NodeFilter, label: '활성 노드' },
    { id: 'all' as NodeFilter, label: '전체 36개' },
    { id: 'danger' as NodeFilter, label: '위험만' },
  ], []);
  
  // 섹션 데이터 생성 (메모이제이션)
  const sections = useMemo(() => {
    const result: LayerSection[] = [];
    
    LAYER_ORDER.forEach((layerId) => {
      const layer = LAYERS[layerId];
      let layerNodes = layer.nodeIds.map(id => nodes[id]);
      
      if (filter === 'active') {
        layerNodes = layerNodes.filter(n => n.active);
      } else if (filter === 'danger') {
        layerNodes = layerNodes.filter(n => n.state !== 'IGNORABLE');
      }
      
      if (layerNodes.length === 0 && filter !== 'all') return;
      if (filter === 'all') layerNodes = layer.nodeIds.map(id => nodes[id]);
      
      const activeInLayer = layer.nodeIds.filter(id => nodes[id].active).length;
      
      result.push({
        type: 'header',
        layerId,
        title: `${layer.icon} ${layer.name}`,
        count: `${filter === 'all' ? layer.nodeIds.length : activeInLayer}/${layer.nodeIds.length}`,
      });
      
      result.push({
        type: 'nodes',
        layerId,
        nodes: layerNodes,
      });
    });
    
    return result;
  }, [nodes, filter]);
  
  const handleNodePress = useCallback((nodeId: string) => {
    const node = nodes[nodeId];
    setToast(`${node.icon} ${node.name}: ${formatNodeValue(node)} (압력 ${(node.pressure * 100).toFixed(0)}%)`);
  }, [nodes]);
  
  const hideToast = useCallback(() => setToast(null), []);
  
  const renderItem: ListRenderItem<LayerSection> = useCallback(({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.layerHeader}>
          <Text style={styles.layerTitle}>{item.title} ({item.count})</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.nodeGrid}>
        {item.nodes?.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            onPress={handleNodePress}
            inactive={!node.active && filter === 'all'}
          />
        ))}
      </View>
    );
  }, [filter, handleNodePress]);
  
  const keyExtractor = useCallback((item: LayerSection, index: number) => 
    `${item.layerId}-${item.type}-${index}`, []);
  
  const ListHeader = useMemo(() => (
    <View>
      {/* Goal Card */}
      <TouchableOpacity 
        style={styles.goalCard}
        onPress={() => setToast('Me 탭에서 목표를 수정할 수 있습니다')}
      >
        <Text style={styles.goalLabel}>현재 목표</Text>
        <Text style={styles.goalText}>{settings.goal}</Text>
      </TouchableOpacity>
      
      {/* Filters */}
      <FilterTabs
        options={filterOptions}
        selected={filter}
        onSelect={setFilter}
      />
    </View>
  ), [settings.goal, filter, filterOptions]);
  
  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.content}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
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
  goalCard: {
    backgroundColor: theme.bg2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  goalLabel: {
    fontSize: 12,
    color: theme.text3,
    marginBottom: 8,
  },
  goalText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.accent,
  },
  layerHeader: {
    marginTop: 15,
    marginBottom: 10,
  },
  layerTitle: {
    fontSize: 13,
    color: theme.text2,
  },
  nodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
});
