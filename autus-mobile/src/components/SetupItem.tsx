/**
 * AUTUS Mobile - Setup Item Component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { lightTap } from '../services/haptics';

interface SetupItemProps {
  icon: string;
  name: string;
  desc: string;
  isOn: boolean;
  onPress: () => void;
  rightText?: string;
}

export const SetupItem: React.FC<SetupItemProps> = ({ 
  icon, 
  name, 
  desc, 
  isOn, 
  onPress,
  rightText,
}) => {
  const handlePress = () => {
    lightTap();
    onPress();
  };
  
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.desc}>{desc}</Text>
        </View>
      </View>
      {rightText ? (
        <Text style={styles.rightText}>{rightText} →</Text>
      ) : (
        <Text style={[styles.status, isOn && styles.statusOn]}>
          {isOn ? '✅ 연결됨' : '연결하기 →'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.bg2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  desc: {
    fontSize: 11,
    color: theme.text3,
    marginTop: 2,
  },
  status: {
    fontSize: 12,
    color: theme.text3,
  },
  statusOn: {
    color: theme.success,
  },
  rightText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accent,
  },
});
