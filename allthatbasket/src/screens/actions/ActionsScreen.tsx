/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ✅ ActionsScreen - KRATON 스타일 액션 관리 (Cycle 9)
 * 할 일 관리 + 드래그 앤 드롭
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard, FilterTabs } from '../../components/common';

interface Action {
  id: string;
  title: string;
  description?: string;
  type: 'consultation' | 'call' | 'message' | 'follow_up';
  priority: 'high' | 'medium' | 'low';
  student_name?: string;
  student_id?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

const priorityConfig = {
  high: { label: '긴급', color: colors.danger.primary, bg: colors.danger.bg },
  medium: { label: '중요', color: colors.caution.primary, bg: colors.caution.bg },
  low: { label: '일반', color: colors.safe.primary, bg: colors.safe.bg },
};

const typeConfig = {
  consultation: { icon: 'chatbubble', label: '상담' },
  call: { icon: 'call', label: '전화' },
  message: { icon: 'mail', label: '메시지' },
  follow_up: { icon: 'flag', label: '후속' },
};

// Mock data
const mockActions: Action[] = [
  { id: '1', title: '김민수 학부모 전화상담', type: 'call', priority: 'high', student_name: '김민수', student_id: '1', due_date: '오늘', status: 'pending' },
  { id: '2', title: '이서연 정기 상담 예약', type: 'consultation', priority: 'medium', student_name: '이서연', student_id: '2', due_date: '내일', status: 'pending' },
  { id: '3', title: '미납 알림 발송', type: 'message', priority: 'high', description: '3명 미납 학생에게 알림 발송', due_date: '오늘', status: 'in_progress' },
  { id: '4', title: '박지훈 상담 후속 조치', type: 'follow_up', priority: 'low', student_name: '박지훈', student_id: '3', due_date: '이번 주', status: 'pending' },
  { id: '5', title: '월간 리포트 확인', type: 'follow_up', priority: 'low', due_date: '이번 주', status: 'completed' },
];

export default function ActionsScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [actions, setActions] = useState(mockActions);

  const filteredActions = filter === 'all'
    ? actions
    : actions.filter(a => a.status === filter);

  const pendingCount = actions.filter(a => a.status === 'pending').length;
  const inProgressCount = actions.filter(a => a.status === 'in_progress').length;
  const completedCount = actions.filter(a => a.status === 'completed').length;

  const handleStatusChange = (actionId: string, newStatus: Action['status']) => {
    setActions(prev => prev.map(a =>
      a.id === actionId ? { ...a, status: newStatus } : a
    ));
  };

  const handleComplete = (action: Action) => {
    Alert.alert(
      '완료 처리',
      `"${action.title}"을(를) 완료 처리할까요?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '완료', onPress: () => handleStatusChange(action.id, 'completed') },
      ]
    );
  };

  const renderAction = (action: Action) => {
    const priority = priorityConfig[action.priority];
    const type = typeConfig[action.type];
    const isCompleted = action.status === 'completed';

    return (
      <GlassCard
        key={action.id}
        style={[styles.actionCard, isCompleted && styles.completedCard]}
        padding={spacing[4]}
      >
        <View style={styles.actionHeader}>
          <View style={styles.actionLeft}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                isCompleted && styles.checkboxCompleted,
              ]}
              onPress={() => handleComplete(action)}
            >
              {isCompleted && (
                <Ionicons name="checkmark" size={14} color={colors.background} />
              )}
            </TouchableOpacity>
            <View style={[styles.typeIcon, { backgroundColor: `${priority.color}15` }]}>
              <Ionicons name={type.icon as any} size={16} color={priority.color} />
            </View>
          </View>

          <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
            <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
          </View>
        </View>

        <Text style={[styles.actionTitle, isCompleted && styles.completedText]}>
          {action.title}
        </Text>

        {action.description && (
          <Text style={styles.actionDescription}>{action.description}</Text>
        )}

        <View style={styles.actionFooter}>
          {action.student_name && (
            <TouchableOpacity
              style={styles.studentTag}
              onPress={() => navigation.navigate('StudentDetail' as never, { studentId: action.student_id } as never)}
            >
              <Ionicons name="person" size={12} color={colors.safe.primary} />
              <Text style={styles.studentName}>{action.student_name}</Text>
            </TouchableOpacity>
          )}
          {action.due_date && (
            <View style={styles.dueTag}>
              <Ionicons name="time" size={12} color={colors.textMuted} />
              <Text style={styles.dueText}>{action.due_date}</Text>
            </View>
          )}
        </View>

        {!isCompleted && (
          <View style={styles.actionButtons}>
            {action.status === 'pending' && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => handleStatusChange(action.id, 'in_progress')}
              >
                <Text style={styles.startButtonText}>시작하기</Text>
              </TouchableOpacity>
            )}
            {action.status === 'in_progress' && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => handleComplete(action)}
              >
                <Ionicons name="checkmark" size={16} color={colors.background} />
                <Text style={styles.completeButtonText}>완료</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
        title="액션 관리"
        rightIcon="add"
        onRightPress={() => {/* Add action */}}
      />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <GlassCard style={styles.summaryCard} padding={spacing[3]}>
          <Text style={[styles.summaryValue, { color: colors.caution.primary }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>대기중</Text>
        </GlassCard>
        <GlassCard style={styles.summaryCard} padding={spacing[3]}>
          <Text style={[styles.summaryValue, { color: colors.safe.primary }]}>{inProgressCount}</Text>
          <Text style={styles.summaryLabel}>진행중</Text>
        </GlassCard>
        <GlassCard style={styles.summaryCard} padding={spacing[3]}>
          <Text style={[styles.summaryValue, { color: colors.success.primary }]}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>완료</Text>
        </GlassCard>
      </View>

      {/* Filter */}
      <FilterTabs
        tabs={[
          { key: 'all', label: '전체' },
          { key: 'pending', label: `대기 (${pendingCount})`, color: colors.caution.primary },
          { key: 'in_progress', label: `진행 (${inProgressCount})`, color: colors.safe.primary },
          { key: 'completed', label: '완료' },
        ]}
        activeTab={filter}
        onTabPress={(tab) => setFilter(tab as typeof filter)}
      />

      {/* Actions List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filteredActions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.success.primary} />
            <Text style={styles.emptyTitle}>모든 작업을 완료했어요!</Text>
          </View>
        ) : (
          filteredActions.map(renderAction)
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
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
  summaryValue: { fontSize: typography.fontSize.xl, fontWeight: '700' },
  summaryLabel: { fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4], paddingBottom: 100 },
  actionCard: { marginBottom: spacing[3] },
  completedCard: { opacity: 0.6 },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxCompleted: { backgroundColor: colors.success.primary, borderColor: colors.success.primary },
  typeIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  priorityBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: borderRadius.full },
  priorityText: { fontSize: typography.fontSize.xs, fontWeight: '500' },
  actionTitle: { fontSize: typography.fontSize.md, fontWeight: '600', color: colors.text, marginLeft: 56 },
  completedText: { textDecorationLine: 'line-through', color: colors.textMuted },
  actionDescription: { fontSize: typography.fontSize.sm, color: colors.textMuted, marginLeft: 56, marginTop: spacing[1] },
  actionFooter: { flexDirection: 'row', gap: spacing[2], marginLeft: 56, marginTop: spacing[2] },
  studentTag: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: 2, backgroundColor: colors.safe.bg, borderRadius: borderRadius.full },
  studentName: { fontSize: typography.fontSize.xs, color: colors.safe.primary },
  dueTag: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  dueText: { fontSize: typography.fontSize.xs, color: colors.textMuted },
  actionButtons: { marginTop: spacing[3], marginLeft: 56 },
  startButton: { paddingVertical: spacing[2], borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.safe.primary, alignItems: 'center' },
  startButtonText: { fontSize: typography.fontSize.sm, fontWeight: '500', color: colors.safe.primary },
  completeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingVertical: spacing[2], borderRadius: borderRadius.md, backgroundColor: colors.success.primary },
  completeButtonText: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.background },
  emptyState: { alignItems: 'center', paddingVertical: spacing[16] },
  emptyTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.text, marginTop: spacing[4] },
  fab: { position: 'absolute', right: spacing[4], bottom: spacing[4], borderRadius: 28, overflow: 'hidden' },
  fabGradient: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
});
