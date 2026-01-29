/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📈 TimelineScreen - KRATON 스타일 타임라인 (Cycle 8)
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
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard, FilterTabs } from '../../components/common';

interface TimelineEvent {
  id: string;
  type: 'consultation' | 'attendance' | 'payment' | 'risk' | 'action';
  title: string;
  description: string;
  student_name?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const eventConfig = {
  consultation: { icon: 'chatbubble', color: colors.safe.primary, label: '상담' },
  attendance: { icon: 'calendar', color: colors.success.primary, label: '출석' },
  payment: { icon: 'card', color: colors.caution.primary, label: '수납' },
  risk: { icon: 'warning', color: colors.danger.primary, label: '위험' },
  action: { icon: 'checkmark-circle', color: colors.safe.primary, label: '액션' },
};

// Mock data
const mockEvents: TimelineEvent[] = [
  { id: '1', type: 'risk', title: '고위험 감지', description: '김민수 학생의 위험도가 85°로 상승', student_name: '김민수', timestamp: '10분 전' },
  { id: '2', type: 'consultation', title: '상담 완료', description: '이서연 학생 정기 상담 진행', student_name: '이서연', timestamp: '1시간 전' },
  { id: '3', type: 'payment', title: '수납 완료', description: '박지훈 학생 2월 수업료 납부', student_name: '박지훈', timestamp: '2시간 전' },
  { id: '4', type: 'attendance', title: '결석 알림', description: '최유진 학생 2일 연속 결석', student_name: '최유진', timestamp: '3시간 전' },
  { id: '5', type: 'action', title: '액션 완료', description: '학부모 상담 전화 완료', timestamp: '어제' },
  { id: '6', type: 'risk', title: '위험도 하락', description: '정하늘 학생의 위험도가 45°로 하락', student_name: '정하늘', timestamp: '어제' },
];

export default function TimelineScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<'all' | 'risk' | 'consultation' | 'payment'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const events = filter === 'all'
    ? mockEvents
    : mockEvents.filter(e => e.type === filter);

  const onRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const renderEvent = ({ item, index }: { item: TimelineEvent; index: number }) => {
    const config = eventConfig[item.type];
    const isLast = index === events.length - 1;

    return (
      <View style={styles.eventContainer}>
        {/* Timeline Line */}
        <View style={styles.timelineLine}>
          <View style={[styles.dot, { backgroundColor: config.color }]}>
            <Ionicons name={config.icon as any} size={12} color={colors.background} />
          </View>
          {!isLast && <View style={styles.line} />}
        </View>

        {/* Event Card */}
        <GlassCard style={styles.eventCard} padding={spacing[3]}>
          <View style={styles.eventHeader}>
            <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
              <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
            </View>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>

          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDescription}>{item.description}</Text>

          {item.student_name && (
            <TouchableOpacity
              style={styles.studentLink}
              onPress={() => navigation.navigate('StudentDetail' as never, { studentId: item.id } as never)}
            >
              <Ionicons name="person" size={14} color={colors.safe.primary} />
              <Text style={styles.studentName}>{item.student_name}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.safe.primary} />
            </TouchableOpacity>
          )}
        </GlassCard>
      </View>
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
        title="타임라인"
        rightIcon="filter-outline"
      />

      {/* Filter */}
      <FilterTabs
        tabs={[
          { key: 'all', label: '전체' },
          { key: 'risk', label: '위험', color: colors.danger.primary },
          { key: 'consultation', label: '상담', color: colors.safe.primary },
          { key: 'payment', label: '수납', color: colors.caution.primary },
        ]}
        activeTab={filter}
        onTabPress={(tab) => setFilter(tab as typeof filter)}
      />

      {/* Timeline */}
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.safe.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color={colors.textDim} />
            <Text style={styles.emptyTitle}>활동 기록이 없습니다</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing[4] },
  eventContainer: { flexDirection: 'row', marginBottom: spacing[2] },
  timelineLine: { width: 40, alignItems: 'center' },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  line: {
    width: 2, flex: 1,
    backgroundColor: colors.border,
    marginTop: -spacing[1],
  },
  eventCard: { flex: 1, marginLeft: spacing[2] },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  typeBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: borderRadius.full },
  typeText: { fontSize: typography.fontSize.xs, fontWeight: '500' },
  timestamp: { fontSize: typography.fontSize.xs, color: colors.textDim },
  eventTitle: { fontSize: typography.fontSize.md, fontWeight: '600', color: colors.text },
  eventDescription: { fontSize: typography.fontSize.sm, color: colors.textMuted, marginTop: spacing[1] },
  studentLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    marginTop: spacing[2], paddingTop: spacing[2],
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  studentName: { fontSize: typography.fontSize.sm, color: colors.safe.primary, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: spacing[16] },
  emptyTitle: { fontSize: typography.fontSize.lg, color: colors.textMuted, marginTop: spacing[4] },
});
