/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌡️ VIndexCard - V-Index 게이지 카드 (KRATON Cycle 1 스타일)
 * 메인 대시보드 V-지수 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common/GlassCard';
import { colors, spacing, typography, getTemperatureColor } from '../../utils/theme';

interface VIndexCardProps {
  value: number;
  change?: number;
  onPress?: () => void;
}

export const VIndexCard: React.FC<VIndexCardProps> = ({
  value = 0,
  change = 0,
  onPress,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const color = getTemperatureColor(value);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const radius = 80;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const percentage = (value / 100);
  const strokeDashoffset = arcLength - percentage * arcLength;

  const statusText = value < 60 ? '안정' : value < 80 ? '주의 필요' : '위험';
  const changeText = change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
  const changeColor = change >= 0 ? colors.success.primary : colors.danger.primary;

  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.content}>
        {/* SVG Gauge */}
        <View style={styles.gaugeContainer}>
          {/* Outer Glow */}
          <View style={[styles.outerGlow, { shadowColor: color.primary }]} />

          <Svg width={200} height={200} viewBox="0 0 200 200">
            <Defs>
              <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.safe.primary} />
                <Stop offset="50%" stopColor={colors.caution.primary} />
                <Stop offset="100%" stopColor={colors.danger.primary} />
              </LinearGradient>
            </Defs>

            {/* Background Circle */}
            <Circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              transform="rotate(-225 100 100)"
            />

            {/* Active Arc */}
            <Circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={color.primary}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-225 100 100)"
            />
          </Svg>

          {/* Center Content */}
          <View style={styles.centerContent}>
            <Text style={[styles.valueText, { color: color.primary }]}>
              {value.toFixed(1)}
            </Text>
            <Text style={styles.labelText}>V-Index</Text>
            <View style={[styles.statusBadge, { backgroundColor: color.bg, borderColor: color.primary }]}>
              <Text style={[styles.statusText, { color: color.primary }]}>{statusText}</Text>
            </View>
          </View>
        </View>

        {/* Change Indicator */}
        <View style={styles.changeContainer}>
          <Ionicons
            name={change >= 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={changeColor}
          />
          <Text style={[styles.changeText, { color: changeColor }]}>
            {changeText} 어제 대비
          </Text>
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          터치하여 상세 리포트 보기
        </Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  gaugeContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
  },
  labelText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  statusBadge: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
  },
  changeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textDim,
    marginTop: spacing[2],
  },
});

export default VIndexCard;
