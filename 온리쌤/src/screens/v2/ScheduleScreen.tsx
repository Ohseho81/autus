/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📅 ScheduleScreen - AUTUS v1.0 서비스 스케줄 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 기능:
 * - 주간/일간 스케줄 뷰
 * - 서비스(수업/세션) 일정 확인
 * - 담당자 배정 현황
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L, T } from '../../config/labelMap';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ScheduleItem {
  id: string;
  time: string;
  serviceName: string;
  staffName: string;
  entityCount: number;
  status: 'scheduled' | 'in_progress' | 'completed';
}

interface DaySchedule {
  date: Date;
  dayLabel: string;
  items: ScheduleItem[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function ScheduleScreen() {
  const { config } = useIndustryConfig();
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<Map<string, ScheduleItem[]>>(new Map());

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchScheduleData = async () => {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];

      // Supabase에서 주간 스케줄 조회
      const { data, error } = await supabase
        .from('atb_sessions')
        .select(`
          id,
          name,
          session_date,
          start_time,
          end_time,
          status,
          max_students,
          atb_classes(name),
          atb_coaches(name)
        `)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .order('start_time', { ascending: true });

      if (!error && data) {
        // 날짜별로 그룹핑
        const grouped = new Map<string, ScheduleItem[]>();
        data.forEach((session: Record<string, unknown>) => {
          const dateKey = session.session_date as string;
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, []);
          }
          grouped.get(dateKey)!.push({
            id: session.id,
            time: (session.start_time as string | undefined)?.slice(0, 5) || '00:00',
            serviceName: (session.name as string | undefined) || (session.atb_classes?.name as string | undefined) || '수업',
            staffName: (session.atb_coaches?.name as string | undefined) || '미배정',
            entityCount: (session.max_students as number | undefined) || 0,
            status: session.status === 'in_progress' ? 'in_progress'
                 : session.status === 'completed' ? 'completed'
                 : 'scheduled',
          });
        });
        setScheduleData(grouped);
      }
    } catch (error: unknown) {
      if (__DEV__) console.error('Failed to fetch schedule:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchScheduleData();
  };

  // 주간 데이터 생성
  const weekDays = useMemo(() => {
    const days: DaySchedule[] = [];
    const today = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + i);
      const dateKey = date.toISOString().split('T')[0];

      days.push({
        date,
        dayLabel: `${date.getMonth() + 1}/${date.getDate()} (${dayNames[date.getDay()]})`,
        items: scheduleData.get(dateKey) || [],
      });
    }
    return days;
  }, [scheduleData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const getStatusColor = (status: ScheduleItem['status']) => {
    switch (status) {
      case 'completed': return colors.success.primary;
      case 'in_progress': return config.color.primary;
      case 'scheduled': return colors.text.muted;
    }
  };

  const getStatusIcon = (status: ScheduleItem['status']): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'in_progress': return 'play-circle';
      case 'scheduled': return 'time-outline';
    }
  };

  const getStatusLabel = (status: ScheduleItem['status']) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in_progress': return '진행중';
      case 'scheduled': return '예정';
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: Schedule Item
  // ─────────────────────────────────────────────────────────────────────────────

  const renderScheduleItem = (item: ScheduleItem) => (
    <View key={item.id} style={styles.scheduleItem}>
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{item.time}</Text>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
      </View>
      
      <View style={[styles.itemCard, { borderLeftColor: getStatusColor(item.status) }]}>
        <View style={styles.itemHeader}>
          <Text style={styles.serviceName}>{item.serviceName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Ionicons name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
            <Text style={[styles.statusLabel, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.itemMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color={colors.text.muted} />
            <Text style={styles.metaText}>{item.staffName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.text.muted} />
            <Text style={styles.metaText}>{item.entityCount}명</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: Day
  // ─────────────────────────────────────────────────────────────────────────────

  const renderDay = (day: DaySchedule) => (
    <View key={day.date.toISOString()} style={styles.dayContainer}>
      <View style={[styles.dayHeader, isToday(day.date) && styles.todayHeader]}>
        <Text style={[styles.dayLabel, isToday(day.date) && { color: config.color.primary }]}>
          {day.dayLabel}
        </Text>
        {isToday(day.date) && (
          <View style={[styles.todayBadge, { backgroundColor: config.color.primary }]}>
            <Text style={styles.todayText}>오늘</Text>
          </View>
        )}
        <Text style={styles.itemCount}>{day.items.length}개 {L.service(config)}</Text>
      </View>
      
      {day.items.length > 0 ? (
        <View style={styles.itemList}>
          {day.items.map(renderScheduleItem)}
        </View>
      ) : (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>등록된 {L.service(config)}이 없습니다</Text>
        </View>
      )}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────

  // Summary Stats
  const todayStats = useMemo(() => {
    const today = weekDays.find(d => isToday(d.date));
    if (!today) return { total: 0, completed: 0, inProgress: 0, scheduled: 0 };
    
    return {
      total: today.items.length,
      completed: today.items.filter(i => i.status === 'completed').length,
      inProgress: today.items.filter(i => i.status === 'in_progress').length,
      scheduled: today.items.filter(i => i.status === 'scheduled').length,
    };
  }, [weekDays]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{T.serviceSchedule(config)}</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>주간</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'day' && styles.toggleActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>일간</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{T.todayService(config)}</Text>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.total}</Text>
            <Text style={styles.statLabel}>전체</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success.primary }]}>{todayStats.completed}</Text>
            <Text style={styles.statLabel}>완료</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: config.color.primary }]}>{todayStats.inProgress}</Text>
            <Text style={styles.statLabel}>진행중</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.muted }]}>{todayStats.scheduled}</Text>
            <Text style={styles.statLabel}>예정</Text>
          </View>
        </View>
      </View>

      {/* Schedule List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={config.color.primary} />
        }
      >
        {viewMode === 'week' ? (
          weekDays.map(renderDay)
        ) : (
          renderDay(weekDays.find(d => isToday(d.date)) || weekDays[0])
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  toggleButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  toggleActive: {
    backgroundColor: colors.text.primary,
  },
  toggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.background,
  },

  // Summary
  summaryCard: {
    marginHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing[4],
  },
  summaryTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.primary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },

  // Day Container
  dayContainer: {
    marginBottom: spacing[4],
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    gap: spacing[2],
  },
  todayHeader: {
    borderBottomColor: 'transparent',
  },
  dayLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  todayBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  todayText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: '#fff',
  },
  itemCount: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },

  // Schedule Item
  itemList: {
    gap: spacing[2],
    marginTop: spacing[2],
  },
  scheduleItem: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  timeColumn: {
    width: 50,
    alignItems: 'center',
    gap: spacing[1],
  },
  timeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderLeftWidth: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  serviceName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  itemMeta: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  metaText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },

  // Empty State
  emptyDay: {
    padding: spacing[4],
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
});
