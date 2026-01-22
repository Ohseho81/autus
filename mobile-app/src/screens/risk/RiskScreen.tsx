/**
 * AUTUS - Risk Management Screen (2-표6)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { colors, spacing, typography, shadows, borderRadius } from '../../utils/theme';
import { api } from '../../services/api';

// Components
import Header from '../../components/common/Header';
import RiskStudentCard from '../../components/risk/RiskStudentCard';
import FilterTabs from '../../components/common/FilterTabs';

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
    // Generate AI script and show in modal
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
      {/* Header */}
      <Header
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        title="퇴원 위험 관리"
        rightIcon="notifications-outline"
      />

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="warning" size={24} color={colors.danger[500]} />
            <Text style={styles.summaryLabel}>위험 학생</Text>
            <Text style={styles.summaryValue}>{totalAtRisk}명</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Ionicons name="cash" size={24} color={colors.warning[500]} />
            <Text style={styles.summaryLabel}>예상 손실</Text>
            <Text style={styles.summaryValueSmall}>{formatCurrency(estimatedLoss)}</Text>
          </View>
        </View>
        <Text style={styles.summaryNote}>
          (월 수업료 × 평균 6개월 재원 기준)
        </Text>
      </View>

      {/* Filter Tabs */}
      <FilterTabs
        tabs={[
          { key: 'all', label: '전체' },
          { key: 'high', label: '🔴 고위험', color: colors.danger[500] },
          { key: 'medium', label: '🟠 주의', color: colors.warning[500] },
        ]}
        activeTab={filter}
        onTabPress={(tab) => setFilter(tab as RiskFilter)}
      />

      {/* Student List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {students.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success[500]} />
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
    backgroundColor: colors.gray[50],
  },
  summaryCard: {
    backgroundColor: colors.white,
    margin: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.md,
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
  divider: {
    width: 1,
    height: 60,
    backgroundColor: colors.gray[200],
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  summaryValueSmall: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray[900],
  },
  summaryNote: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
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
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
    marginTop: spacing[4],
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.gray[600],
  },
});
