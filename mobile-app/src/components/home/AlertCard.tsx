/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚨 AlertCard - 위험 알림 카드 (KRATON Cycle 4)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common/GlassCard';
import { colors, spacing, typography, ColorState } from '../../utils/theme';

interface Alert {
  id: string;
  type: 'danger' | 'caution' | 'success' | 'info';
  title: string;
  subtitle?: string;
  time?: string;
  student_id?: string;
}

interface AlertCardProps {
  alert: Alert;
  onPress?: () => void;
}

const getAlertStyle = (type: string): { color: ColorState; icon: keyof typeof Ionicons.glyphMap; pulse: boolean } => {
  switch (type) {
    case 'danger':
      return { color: colors.danger, icon: 'warning', pulse: true };
    case 'caution':
      return { color: colors.caution, icon: 'alert-circle', pulse: false };
    case 'success':
      return { color: colors.success, icon: 'trending-up', pulse: false };
    default:
      return { color: colors.safe, icon: 'information-circle', pulse: false };
  }
};

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onPress }) => {
  const style = getAlertStyle(alert.type);

  return (
    <GlassCard
      onPress={onPress}
      glow={style.pulse ? style.color.glow : null}
      pulse={style.pulse}
      style={styles.card}
      padding={spacing[3]}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: style.color.bg }]}>
          <Ionicons name={style.icon} size={18} color={style.color.primary} />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{alert.title}</Text>
          {alert.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>{alert.subtitle}</Text>
          )}
          {alert.time && (
            <Text style={styles.time}>{alert.time}</Text>
          )}
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[2],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.textDim,
    marginTop: 4,
  },
});

export default AlertCard;
