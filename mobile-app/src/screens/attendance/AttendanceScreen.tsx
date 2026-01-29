/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📅 AttendanceScreen - KRATON 스타일 출석 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';
import { api } from '../../services/api';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  student_id: string;
  student_name: string;
  status: AttendanceStatus;
}

const statusConfig = {
  present: { label: '출석', color: colors.success.primary, bg: colors.success.bg, icon: 'checkmark-circle' },
  absent: { label: '결석', color: colors.danger.primary, bg: colors.danger.bg, icon: 'close-circle' },
  late: { label: '지각', color: colors.caution.primary, bg: colors.caution.bg, icon: 'time' },
  excused: { label: '사유', color: colors.safe.primary, bg: colors.safe.bg, icon: 'document-text' },
};

export default function AttendanceScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => api.getAttendance({ date: selectedDate }),
  });

  const mutation = useMutation({
    mutationFn: (data: { student_id: string; date: string; status: AttendanceStatus }) =>
      api.recordAttendance(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const records: AttendanceRecord[] = data?.data?.records || [];
  const summary = data?.data?.summary || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    mutation.mutate({ student_id: studentId, date: selectedDate, status });
  };

  const renderRecord = ({ item }: { item: AttendanceRecord }) => {
    const config = statusConfig[item.status];

    return (
      <GlassCard style={styles.recordCard} padding={spacing[3]}>
        <View style={styles.recordRow}>
          <View style={styles.studentInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.student_name.slice(0, 1)}</Text>
            </View>
            <Text style={styles.studentName}>{item.student_name}</Text>
          </View>

          <View style={styles.statusButtons}>
            {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
              const cfg = statusConfig[status];
              const isActive = item.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    isActive && { backgroundColor: cfg.bg, borderColor: cfg.color },
                  ]}
                  onPress={() => handleStatusChange(item.student_id, status)}
                >
                  <Ionicons
                    name={cfg.icon as any}
                    size={18}
                    color={isActive ? cfg.color : colors.textDim}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
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
        title="출석 관리"
        rightIcon="calendar-outline"
      />

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {selectedDate === new Date().toISOString().split('T')[0] && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>오늘</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
        <View style={styles.summaryContainer}>
          {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
            const cfg = statusConfig[status];
            const count = summary[status] || 0;
            return (
              <GlassCard key={status} style={styles.summaryCard} padding={spacing[3]}>
                <View style={[styles.summaryIcon, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                </View>
                <Text style={[styles.summaryValue, { color: cfg.color }]}>{count}</Text>
                <Text style={styles.summaryLabel}>{cfg.label}</Text>
              </GlassCard>
            );
          })}
        </View>
      </ScrollView>

      {/* Attendance Rate */}
      <GlassCard style={styles.rateCard}>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>오늘 출석률</Text>
          <Text style={styles.rateValue}>
            {summary.total > 0
              ? ((summary.present / summary.total) * 100).toFixed(1)
              : 0}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${summary.total > 0 ? (summary.present / summary.total) * 100 : 0}%` },
            ]}
          />
        </View>
      </GlassCard>

      {/* Records List */}
      <FlatList
        data={records}
        renderItem={renderRecord}
        keyExtractor={(item) => item.student_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textDim} />
            <Text style={styles.emptyText}>출석 기록이 없습니다</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  dateSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  dateArrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  dateCenter: { alignItems: 'center' },
  dateText: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.text },
  todayBadge: {
    marginTop: spacing[1], paddingHorizontal: spacing[2], paddingVertical: 2,
    backgroundColor: colors.safe.bg, borderRadius: borderRadius.full,
  },
  todayText: { fontSize: typography.fontSize.xs, color: colors.safe.primary, fontWeight: '500' },
  summaryScroll: { maxHeight: 110 },
  summaryContainer: { flexDirection: 'row', paddingHorizontal: spacing[4], gap: spacing[2] },
  summaryCard: { width: 80, alignItems: 'center' },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: spacing[1] },
  summaryValue: { fontSize: typography.fontSize.xl, fontWeight: '700' },
  summaryLabel: { fontSize: typography.fontSize.xs, color: colors.textMuted },
  rateCard: { marginHorizontal: spacing[4], marginVertical: spacing[3] },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  rateLabel: { fontSize: typography.fontSize.md, color: colors.textMuted },
  rateValue: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.success.primary },
  progressBar: { height: 8, backgroundColor: colors.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success.primary, borderRadius: 4 },
  listContent: { padding: spacing[4], paddingTop: 0 },
  recordCard: { marginBottom: spacing[2] },
  recordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: typography.fontSize.md, fontWeight: '600', color: colors.text },
  studentName: { marginLeft: spacing[2], fontSize: typography.fontSize.md, fontWeight: '500', color: colors.text },
  statusButtons: { flexDirection: 'row', gap: spacing[1] },
  statusButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyState: { alignItems: 'center', paddingVertical: spacing[12] },
  emptyText: { marginTop: spacing[3], fontSize: typography.fontSize.md, color: colors.textMuted },
});
