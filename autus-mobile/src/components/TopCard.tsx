/**
 * AUTUS Mobile - Top1 Card Component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Node } from '../types';
import { theme } from '../constants/theme';
import { formatNodeValue } from '../utils/formatters';
import { getStateColor, getStateIcon } from '../utils/calculations';
import { mediumTap } from '../services/haptics';

interface TopCardProps {
  node: Node;
  onPress: () => void;
}

export const TopCard: React.FC<TopCardProps> = ({ node, onPress }) => {
  const borderColor = getStateColor(node.state);
  
  const handlePress = () => {
    mediumTap();
    onPress();
  };
  
  return (
    <TouchableOpacity
      style={[styles.container, { borderColor }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{getStateIcon(node.state)}</Text>
      <Text style={styles.message}>
        {node.name} {formatNodeValue(node)}
      </Text>
      <View style={[styles.badge, { backgroundColor: `${borderColor}20` }]}>
        <Text style={[styles.badgeText, { color: borderColor }]}>
          {node.state}
        </Text>
      </View>
      <Text style={styles.hint}>탭하여 미션 생성 →</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.bg2,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  message: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    color: theme.text3,
  },
});
