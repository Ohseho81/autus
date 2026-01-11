/**
 * AUTUS Mobile - Mission Card Component (최적화됨)
 */

import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Mission } from '../types';
import { theme } from '../constants/theme';
import { lightTap, success } from '../services/haptics';

interface MissionCardProps {
  mission: Mission;
  onComplete: (id: number) => void;
  onIgnore: (id: number) => void;
  onDelete: (id: number) => void;
}

export const MissionCard = memo<MissionCardProps>(({ 
  mission, 
  onComplete,
  onIgnore,
  onDelete,
}) => {
  const handleComplete = useCallback(() => {
    success();
    onComplete(mission.id);
  }, [mission.id, onComplete]);
  
  const handleIgnore = useCallback(() => {
    lightTap();
    onIgnore(mission.id);
  }, [mission.id, onIgnore]);
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{mission.icon} {mission.title}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{mission.type}</Text>
          </View>
        </View>
        <Text style={styles.status}>{mission.status}</Text>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${mission.progress}%` }]} />
      </View>
      
      {/* Progress Text */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{mission.progress}% 완료</Text>
        <Text style={styles.progressText}>{mission.eta}</Text>
      </View>
      
      {/* Steps */}
      <View style={styles.steps}>
        {mission.steps.map((step, index) => (
          <Text 
            key={index} 
            style={[
              styles.stepText,
              step.s === 'done' && styles.stepDone,
              step.s === 'active' && styles.stepActive,
            ]}
          >
            {step.s === 'done' ? '✅' : step.s === 'active' ? '🔄' : '⬜'} {step.t}
          </Text>
        ))}
      </View>
      
      {/* Actions */}
      {mission.status === 'active' && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.completeBtn]}
            onPress={handleComplete}
          >
            <Text style={styles.completeBtnText}>✓ 완료</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.ignoreBtn]}
            onPress={handleIgnore}
          >
            <Text style={styles.ignoreBtnText}>무시</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}, (prev, next) => {
  return (
    prev.mission.id === next.mission.id &&
    prev.mission.status === next.mission.status &&
    prev.mission.progress === next.mission.progress
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.bg2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  typeBadge: {
    backgroundColor: theme.bg3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  typeText: {
    fontSize: 10,
    color: theme.text2,
  },
  status: {
    fontSize: 12,
    color: theme.accent,
  },
  progressBg: {
    height: 5,
    backgroundColor: theme.bg3,
    borderRadius: 3,
    marginBottom: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: 3,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 11,
    color: theme.text3,
  },
  steps: {
    marginTop: 10,
    gap: 4,
  },
  stepText: {
    fontSize: 12,
    color: theme.text2,
  },
  stepDone: {
    color: theme.success,
  },
  stepActive: {
    color: theme.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeBtn: {
    backgroundColor: theme.accent,
  },
  completeBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 13,
  },
  ignoreBtn: {
    backgroundColor: theme.bg3,
    borderWidth: 1,
    borderColor: theme.border,
  },
  ignoreBtnText: {
    color: theme.text2,
    fontSize: 13,
  },
});
