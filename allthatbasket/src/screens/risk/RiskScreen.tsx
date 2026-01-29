/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️ RiskScreen - KRATON 스타일 위험 관리 화면
 * AUTUS 2.0 - 퇴원 위험 학생 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius, shadows } from '../../utils/theme';
import { api } from '../../services/api';

// KRATON Components
import Header from '../../components/common/Header';
import FilterTabs from '../../components/common/FilterTabs';
import { GlassCard } from '../../components/common';
import RiskStudentCard from '../../components/risk/RiskStudentCard';

type RiskFilter = 'all' | 'high' | 'medium';

export default function RiskScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<RiskFilter>('all');

  // Fetch at-risk students
  const { data: riskData, isLoading, refetch } = useQuery({
    queryKey: ['atRiskStudents', filter],
    queryFn: () => api.getAtRiskStudents(filter),
  });

  const students = riskData?.data?.students || [];
  const totalAtRisk = riskData?.data?.total_at_risk || 0;
  const estimatedLoss = riskData?.data?.estimated_loss || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleStudentPress = (studentId: string) => {
    navigation.navigate('StudentDetail' as never, { studentId } as never);
  };

  const handleConsultation = (studentId: string) => {
    navigation.navigate('ConsultationCreate' as never, { studentId } as never);
  };

  const handleScript = async (studentId: string) => {
    try {
      const response = await api.generateConsultationScript(studentId);
      // TODO: Show script in modal
      console.log('Script generated:', response);
    } catch (error) {
      console.error('Error generating script:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <Header
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        title="퇴원 위험 관리"
        rightIcon="settings-outline"
        onRightPress={() => navigation.navigate('RiskSettings' as never)}
      />

      {/* Summary Card */}
      <GlassCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconContainer, { backgroundColor: colors.danger.bg }]}>
              <Ionicons name="warning" size={24} color={colors.danger.primary} />
            </View>
            <Text style={styles.summaryLabel}>위험 학생</Text>
            <Text style={[styles.summaryValue, { color: colors.danger.primary }]}>
              {totalAtRisk}명
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconContainer, { backgroundColor: colors.caution.bg }]}>
              <Ionicons name="cash" size={24} color={colors.caution.primary} />
            </View>
            <Text style={styles.summaryLabel}>예상 손실</Text>
            <Text style={[styles.summaryValueSmall, { color: colors.caution.primary }]}>
              {formatCurrency(estimatedLoss)}
            </Text>
          </View>
        </View>

        <Text style={styles.summaryNote}>
          (월 수업료 × 평균 6개월 재원 기준)
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((totalAtRisk / 20) * 100, 100)}%`,
                  backgroundColor: totalAtRisk > 10 ? colors.danger.primary : colors.caution.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {totalAtRisk > 10 ? '긴급 조치 필요' : '관리 가능 수준'}
          </Text>
        </View>
      </GlassCard>

      {/* Filter Tabs */}
      <FilterTabs
        tabs={[
          { key: 'all', label: '전체' },
          { key: 'high', label: '고위험', color: colors.danger.primary },
          { key: 'medium', label: '주의', color: colors.caution.primary },
        ]}
        activeTab={filter}
        onTabPress={(tab) => setFilter(tab as RiskFilter)}
      />

      {/* Student List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.safe.primary}
          />
        }
      >
        {students.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.success.bg }]}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success.primary} />
            </View>
            <Text style={styles.emptyTitle}>위험 학생이 없습니다!</Text>
            <Text style={styles.emptySubtitle}>모든 학생이 안정적인 상태입니다.</Text>
          </View>
        ) : (
          students.map((item: any) => (
            <RiskStudentCard
              key={item.student.id}
              student={item.student}
              riskScore={item.risk_score}
              riskFactors={item.risk_factors}
              estimatedLoss={item.estimated_loss}
              aiRecommendation={item.ai_recommendation}
              onPress={() => handleStudentPress(item.student.id)}
              onConsultation={() => handleConsultation(item.student.id)}
              onScript={() => handleScript(item.student.id)}
            />
          ))
        )}

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryCard: {
    margin: spacing[4],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  summaryDivider: {
    width: 1,
    height: 80,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  summaryValueSmall: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  summaryNote: {
    fontSize: typography.fontSize.xs,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing[3],
  },
  progressContainer: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingTop: spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    gap: spacing[2],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
  },
});
