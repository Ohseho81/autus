/**
 * AUTUS Mobile - Stat Box Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface StatBoxProps {
  value: string;
  label: string;
  color?: string;
}

export const StatBox: React.FC<StatBoxProps> = ({ 
  value, 
  label, 
  color = theme.accent 
}) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg2,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    color: theme.text3,
    marginTop: 2,
  },
});
