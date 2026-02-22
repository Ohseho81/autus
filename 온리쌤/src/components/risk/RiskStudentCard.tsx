/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️ RiskStudentCard - 위험 학생 카드 (KRATON 스타일)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../common/GlassCard';
import { colors, spacing, typography, borderRadius, getTemperatureColor } from '../../utils/theme';

interface Student {
  id: string;
  name: string;
  grade?: string;
  school?: string;
  avatar_url?: string;
}

interface RiskStudentCardProps {
  student: Student;
  riskScore: number;
  riskFactors?: string[];
  estimatedLoss?: number;
  aiRecommendation?: string;
  onPress?: () => void;
  onConsultation?: () => void;
  onScript?: () => void;
}

export const RiskStudentCard: React.FC<RiskStudentCardProps> = ({
  student,
  riskScore,
  riskFactors = [],
  estimatedLoss = 0,
  aiRecommendation,
  onPress,
  onConsultation,
  onScript,
}) => {
  const color = getTemperatureColor(riskScore);
  const isHighRisk = riskScore >= 80;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <GlassCard
      onPress={onPress}
      glow={isHighRisk ? color.glow : null}
      pulse={isHighRisk}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: color.primary }]}>
          <Text style={styles.avatarText}>
            {student.name.slice(0, 1)}
          </Text>
          <View style={[styles.riskIndicator, { backgroundColor: color.primary }]} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.grade}>{student.grade} · {student.school}</Text>
        </View>

        {/* Risk Score */}
        <View style={[styles.scoreBadge, { backgroundColor: color.bg, borderColor: color.primary }]}>
          <Text style={[styles.scoreText, { color: color.primary }]}>
            {riskScore.toFixed(0)}°
          </Text>
        </View>
      </View>

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <View style={styles.factorsContainer}>
          {riskFactors.slice(0, 3).map((factor, index) => (
            <View key={index} style={[styles.factorChip, { backgroundColor: color.bg }]}>
              <Text style={[styles.factorText, { color: color.primary }]}>{factor}</Text>
            </View>
          ))}
        </View>
      )}

      {/* AI Recommendation */}
      {aiRecommendation && (
        <View style={styles.aiContainer}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={14} color={colors.safe.primary} />
            <Text style={styles.aiLabel}>AI 추천</Text>
          </View>
          <Text style={styles.aiText} numberOfLines={2}>{aiRecommendation}</Text>
        </View>
      )}

      {/* Estimated Loss */}
      <View style={styles.lossContainer}>
        <Text style={styles.lossLabel}>예상 손실</Text>
        <Text style={[styles.lossValue, { color: colors.caution.primary }]}>
          {formatCurrency(estimatedLoss)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onConsultation}
          style={[styles.actionButton, styles.primaryButton]}
        >
          <Ionicons name="chatbubble" size={16} color={colors.background} />
          <Text style={styles.primaryButtonText}>상담하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onScript}
          style={[styles.actionButton, styles.secondaryButton]}
        >
          <Ionicons name="document-text" size={16} color={colors.safe.primary} />
          <Text style={styles.secondaryButtonText}>스크립트</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  riskIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.card,
  },
  info: {
    flex: 1,
    marginLeft: spacing[3],
  },
  name: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  grade: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  scoreText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  factorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  factorChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  factorText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  aiContainer: {
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: colors.safe.primary,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  aiLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.safe.primary,
  },
  aiText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  lossContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    marginBottom: spacing[3],
  },
  lossLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  lossValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  primaryButton: {
    backgroundColor: colors.safe.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.safe.primary,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.safe.primary,
  },
});

export default RiskStudentCard;
