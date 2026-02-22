/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💀 Skeleton - 로딩 플레이스홀더 컴포넌트
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 사용법:
 *   <Skeleton width={200} height={20} />
 *   <Skeleton.Circle size={50} />
 *   <Skeleton.Card />
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../../utils/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// Base Skeleton
// ═══════════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ 
  width = '100%' as const, 
  height = 16, 
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Circle Skeleton
// ═══════════════════════════════════════════════════════════════════════════════

interface CircleProps {
  size?: number;
  style?: ViewStyle;
}

function Circle({ size = 48, style }: CircleProps) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Card Skeleton
// ═══════════════════════════════════════════════════════════════════════════════

interface CardProps {
  style?: ViewStyle;
}

function Card({ style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <Circle size={40} />
        <View style={styles.cardHeaderText}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} style={{ marginTop: spacing[1] }} />
        </View>
      </View>
      <Skeleton height={12} style={{ marginTop: spacing[3] }} />
      <Skeleton width="80%" height={12} style={{ marginTop: spacing[2] }} />
      <Skeleton width="60%" height={12} style={{ marginTop: spacing[2] }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// List Item Skeleton
// ═══════════════════════════════════════════════════════════════════════════════

interface ListItemProps {
  hasAvatar?: boolean;
  lines?: number;
  style?: ViewStyle;
}

function ListItem({ hasAvatar = true, lines = 2, style }: ListItemProps) {
  return (
    <View style={[styles.listItem, style]}>
      {hasAvatar && <Circle size={44} />}
      <View style={styles.listItemContent}>
        <Skeleton width="70%" height={14} />
        {lines > 1 && <Skeleton width="50%" height={12} style={{ marginTop: spacing[2] }} />}
        {lines > 2 && <Skeleton width="30%" height={12} style={{ marginTop: spacing[2] }} />}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stats Skeleton
// ═══════════════════════════════════════════════════════════════════════════════

function Stats({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.stats, style]}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.statItem}>
          <Skeleton width={40} height={24} />
          <Skeleton width={50} height={12} style={{ marginTop: spacing[1] }} />
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

Skeleton.Circle = Circle;
Skeleton.Card = Card;
Skeleton.ListItem = ListItem;
Skeleton.Stats = Stats;

export default Skeleton;

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[3],
  },
  listItemContent: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing[4],
  },
  statItem: {
    alignItems: 'center',
  },
});
