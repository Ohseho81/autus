/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💬 ConsultationListScreen - KRATON 스타일 상담 목록
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard, FilterTabs } from '../../components/common';
import { api } from '../../services/api';

interface Consultation {
  id: string;
  student_id: string;
  student_name: string;
  type: 'regular' | 'risk' | 'complaint';
  content: string;
  result?: 'positive' | 'pending' | 'negative';
  created_at: string;
  follow_ups?: string[];
}

const typeConfig = {
  regular: { label: '정기 상담', color: colors.safe.primary, icon: 'chatbubble' },
  risk: { label: '위험 상담', color: colors.danger.primary, icon: 'warning' },
  complaint: { label: '민원 상담', color: colors.caution.primary, icon: 'alert-circle' },
};

const resultConfig = {
  positive: { label: '긍정적', color: colors.success.primary },
  pending: { label: '보류', color: colors.caution.primary },
  negative: { label: '부정적', color: colors.danger.primary },
};

export default function ConsultationListScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<'all' | 'regular' | 'risk' | 'complaint'>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['consultations', filter],
    queryFn: () => api.getConsultations({ type: filter === 'all' ? undefined : filter }),
  });

  const consultations: Consultation[] = data?.data?.consultations || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderConsultation = ({ item }: { item: Consultation }) => {
    const typeConf = typeConfig[item.type];
    const resultConf = item.result ? resultConfig[item.result] : null;

    return (
      <GlassCard
        onPress={() => navigation.navigate('ConsultationDetail' as never, { consultationId: item.id } as never)}
        style={styles.consultationCard}
        padding={spacing[4]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.studentInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.student_name.slice(0, 1)}</Text>
            </View>
            <View>
              <Text style={styles.studentName}>{item.student_name}</Text>
              <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: `${typeConf.color}15` }]}>
            <Ionicons name={typeConf.icon as any} size={14} color={typeConf.color} />
            <Text style={[styles.typeText, { color: typeConf.color }]}>{typeConf.label}</Text>
          </View>
        </View>

        <Text style={styles.contentText} numberOfLines={2}>{item.content}</Text>

        <View style={styles.cardFooter}>
          {resultConf && (
            <View style={[styles.resultBadge, { backgroundColor: `${resultConf.color}15` }]}>
              <Text style={[styles.resultText, { color: resultConf.color }]}>{resultConf.label}</Text>
            </View>
          )}
          {item.follow_ups && item.follow_ups.length > 0 && (
            <View style={styles.followUpBadge}>
              <Ionicons name="flag" size={12} color={colors.safe.primary} />
              <Text style={styles.followUpText}>후속 {item.follow_ups.length}건</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} style={styles.arrow} />
        </View>
      </GlassCard>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="menu"
        onLeftPress={() => navigation.openDrawer()}
        title="상담 관리"
        rightIcon="add"
        onRightPress={() => navigation.navigate('ConsultationCreate' as never)}
      />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <GlassCard style={styles.summaryCard} padding={spacing[3]}>
          <Text style={styles.summaryValue}>{consultations.length}</Text>
          <Text style={styles.summaryLabel}>전체 상담</Text>
        </GlassCard>
        <GlassCard style={styles.summaryCard} padding={spacing[3]}>
          <Text style={[styles.summaryValue, { color: colors.danger.primary }]}>
            {consultations.filter(c => c.type === 'risk').length}
          </Text>
          <Text style={styles.summaryLabel}>위험 상담</Text>
        </GlassCard>
        <GlassCard style={styles.summaryCard} padding={spacing[3]}>
          <Text style={[styles.summaryValue, { color: colors.caution.primary }]}>
            {consultations.filter(c => c.result === 'pending').length}
          </Text>
          <Text style={styles.summaryLabel}>후속 필요</Text>
        </GlassCard>
      </View>

      {/* Filter */}
      <FilterTabs
        tabs={[
          { key: 'all', label: '전체' },
          { key: 'regular', label: '정기', color: colors.safe.primary },
          { key: 'risk', label: '위험', color: colors.danger.primary },
          { key: 'complaint', label: '민원', color: colors.caution.primary },
        ]}
        activeTab={filter}
        onTabPress={(tab) => setFilter(tab as typeof filter)}
      />

      {/* List */}
      <FlatList
        data={consultations}
        renderItem={renderConsultation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.safe.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textDim} />
            <Text style={styles.emptyTitle}>상담 기록이 없습니다</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('ConsultationCreate' as never)}
            >
              <Text style={styles.emptyButtonText}>첫 상담 기록하기</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ConsultationCreate' as never)}
      >
        <LinearGradient colors={[colors.safe.primary, '#0099CC']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={colors.background} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summaryRow: { flexDirection: 'row', gap: spacing[2], padding: spacing[4], paddingBottom: 0 },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: 2 },
  listContent: { padding: spacing[4], paddingBottom: 100 },
  consultationCard: { marginBottom: spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[3] },
  studentInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: typography.fontSize.md, fontWeight: '600', color: colors.text },
  studentName: { marginLeft: spacing[2], fontSize: typography.fontSize.md, fontWeight: '600', color: colors.text },
  dateText: { marginLeft: spacing[2], fontSize: typography.fontSize.xs, color: colors.textMuted },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: borderRadius.full },
  typeText: { fontSize: typography.fontSize.xs, fontWeight: '500' },
  contentText: { fontSize: typography.fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border },
  resultBadge: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: borderRadius.md },
  resultText: { fontSize: typography.fontSize.xs, fontWeight: '500' },
  followUpBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginLeft: spacing[2] },
  followUpText: { fontSize: typography.fontSize.xs, color: colors.safe.primary },
  arrow: { marginLeft: 'auto' },
  emptyState: { alignItems: 'center', paddingVertical: spacing[12] },
  emptyTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.text, marginTop: spacing[4] },
  emptyButton: { marginTop: spacing[4], paddingHorizontal: spacing[4], paddingVertical: spacing[2], backgroundColor: colors.safe.primary, borderRadius: borderRadius.lg },
  emptyButtonText: { fontSize: typography.fontSize.md, fontWeight: '600', color: colors.background },
  fab: { position: 'absolute', right: spacing[4], bottom: spacing[4], borderRadius: 28, overflow: 'hidden' },
  fabGradient: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
});
