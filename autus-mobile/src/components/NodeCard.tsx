/**
 * AUTUS Mobile - Node Card Component (최적화됨)
 * React.memo로 불필요한 리렌더링 방지
 */

import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Node } from '../types';
import { theme } from '../constants/theme';
import { formatNodeValue } from '../utils/formatters';
import { getStateColor, getPressureColor } from '../utils/calculations';
import { lightTap } from '../services/haptics';

interface NodeCardProps {
  node: Node;
  onPress: (nodeId: string) => void;
  inactive?: boolean;
}

export const NodeCard = memo<NodeCardProps>(({ 
  node, 
  onPress, 
  inactive = false 
}) => {
  const borderColor = getStateColor(node.state);
  const pressureColor = getPressureColor(node.pressure);
  
  const handlePress = useCallback(() => {
    lightTap();
    onPress(node.id);
  }, [node.id, onPress]);
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          borderColor: node.state === 'IGNORABLE' ? theme.border : borderColor,
          opacity: inactive ? 0.35 : 1,
          backgroundColor: node.state === 'IRREVERSIBLE' 
            ? 'rgba(255,59,59,0.05)' 
            : theme.bg2,
        }
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{node.icon}</Text>
      <Text style={styles.name}>{node.name}</Text>
      <Text style={styles.value}>{formatNodeValue(node)}</Text>
      <View style={styles.barBg}>
        <View 
          style={[
            styles.barFill,
            { 
              width: `${node.pressure * 100}%`, 
              backgroundColor: pressureColor 
            }
          ]} 
        />
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => {
  // Custom comparison - 노드 데이터가 같으면 리렌더링 하지 않음
  return (
    prev.node.id === next.node.id &&
    prev.node.pressure === next.node.pressure &&
    prev.node.state === next.node.state &&
    prev.node.active === next.node.active &&
    prev.inactive === next.inactive
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg2,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    margin: 4,
    minWidth: '30%',
    maxWidth: '32%',
  },
  icon: {
    fontSize: 18,
  },
  name: {
    fontSize: 11,
    color: theme.text2,
    marginVertical: 3,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
  barBg: {
    width: '100%',
    height: 3,
    backgroundColor: theme.bg3,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});
