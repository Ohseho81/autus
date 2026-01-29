/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👥 StudentListScreen - KRATON 스타일 학생 목록
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius, getTemperatureColor } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard, FilterTabs } from '../../components/common';
import { api } from '../../services/api';

type StudentFilter = 'all' | 'at_risk' | 'warning' | 'normal';

interface Student {
  id: string;
  name: string;
  grade: string;
  school: string;
  risk_score: number;
  attendance_rate: number;
  last_consultation?: string;
}

export default function StudentListScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', filter, search],
    queryFn: () => api.getStudents({ filter, search }),
  });

  const students: Student[] = data?.data?.students || [];

  const renderStudent = ({ item }: { item: Student }) => {
    const riskColor = getTemperatureColor(item.risk_score);
    const isHighRisk = item.risk_score >= 80;

    return (
      <GlassCard
        onPress={() => navigation.navigate('StudentDetail' as never, { studentId: item.id } as never)}
        glow={isHighRisk ? riskColor.glow : null}
        style={styles.studentCard}
        padding={spacing[3]}
      >
        <View style={styles.studentRow}>
          {/* Avatar */}
          <View style={[styles.avatar, { borderColor: riskColor.primary }]}>
            <Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text>
            <View style={[styles.statusDot, { backgroundColor: riskColor.primary }]} />
          </View>

          {/* Info */}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentGrade}>{item.grade} · {item.school}</Text>
          </View>

          {/* Risk Score */}
          <View style={[styles.riskBadge, { backgroundColor: riskColor.bg }]}>
            <Text style={[styles.riskScore, { color: riskColor.primary }]}>
              {item.risk_score.toFixed(0)}°
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.statText}>출석 {item.attendance_rate}%</Text>
          </View>
          {item.last_consultation && (
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
              <Text style={styles.statText}>최근 상담 {item.last_consultation}</Text>
            </View>
          )}
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
        title="학생 관리"
        rightIcon="add"
        onRightPress={() => navigation.navigate('StudentCreate' as never)}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="학생 이름 검색..."
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <FilterTabs
        tabs={[
          { key: 'all', label: `전체 (${students.length})` },
          { key: 'at_risk', label: '위험', color: colors.danger.primary },
          { key: 'warning', label: '주의', color: colors.caution.primary },
          { key: 'normal', label: '정상', color: colors.success.primary },
        ]}
        activeTab={filter}
        onTabPress={(tab) => setFilter(tab as StudentFilter)}
      />

      {/* Student List */}
      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.safe.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textDim} />
            <Text style={styles.emptyTitle}>학생이 없습니다</Text>
            <Text style={styles.emptySubtitle}>학생을 등록해주세요</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('StudentCreate' as never)}
      >
        <LinearGradient
          colors={[colors.safe.primary, '#0099CC']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={colors.background} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    padding: spacing[4],
    paddingBottom: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: 100,
  },
  studentCard: {
    marginBottom: spacing[3],
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
    color: colors.text,
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.card,
  },
  studentInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  studentName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  studentGrade: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    marginRight: spacing[2],
  },
  riskScore: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing[4],
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.safe.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
