/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 StatCard - 통계 카드 (KRATON 스타일)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common/GlassCard';
import { colors, spacing, typography, ColorState } from '../../utils/theme';

interface StatCardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  trend = 'neutral',
  color = colors.safe.primary,
  icon,
  onPress,
}) => {
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
  const trendColor = trend === 'up' ? colors.success.primary : trend === 'down' ? colors.danger.primary : colors.textMuted;

  return (
    <GlassCard onPress={onPress} style={styles.card} padding={spacing[3]}>
      <View style={styles.content}>
        <View style={styles.header}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
              <Ionicons name={icon} size={16} color={color} />
            </View>
          )}
          <Ionicons name={trendIcon} size={14} color={trendColor} />
        </View>

        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
  },
  content: {
    alignItems: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing[2],
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
});

export default StatCard;
