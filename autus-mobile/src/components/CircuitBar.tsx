/**
 * AUTUS Mobile - Circuit Bar Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Circuit } from '../types';
import { theme } from '../constants/theme';
import { getPressureColor } from '../utils/calculations';

interface CircuitBarProps {
  circuit: Circuit;
  value: number;
}

export const CircuitBar: React.FC<CircuitBarProps> = ({ circuit, value }) => {
  const color = getPressureColor(value);
  
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{circuit.name}</Text>
      <View style={styles.barBg}>
        <View 
          style={[
            styles.barFill, 
            { width: `${value * 100}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={[styles.value, { color }]}>{value.toFixed(2)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  name: {
    width: 70,
    fontSize: 12,
    color: theme.text2,
  },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: theme.bg3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  value: {
    width: 40,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});
