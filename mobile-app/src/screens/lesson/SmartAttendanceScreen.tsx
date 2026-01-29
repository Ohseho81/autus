/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📱 SmartAttendanceScreen - 스마트 출석 체크
 * 출석 → 영상피드백 → 소통 → 레슨비 차감 통합 플로우
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TodayLesson {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  time: string;
  packageName: string;
  remainingCount: number;
  status: 'upcoming' | 'checked_in' | 'in_progress' | 'completed' | 'absent';
  checkInTime?: string;
  vIndex: number;
  riskLevel: 'safe' | 'caution' | 'danger';
}

// Mock data
const mockTodayLessons: TodayLesson[] = [
  {
    id: '1',
    studentId: 's1',
    studentName: '김민수',
    grade: '중2',
    time: '14:00',
    packageName: '10회 레슨권',
    remainingCount: 7,
    status: 'completed',
    checkInTime: '13:58',
    vIndex: 72,
    riskLevel: 'safe',
  },
  {
    id: '2',
    studentId: 's2',
    studentName: '이서연',
    grade: '고1',
    time: '15:00',
    packageName: '20회 레슨권',
    remainingCount: 3,
    status: 'in_progress',
    checkInTime: '15:02',
    vIndex: 58,
    riskLevel: 'caution',
  },
  {
    id: '3',
    studentId: 's3',
    studentName: '박지훈',
    grade: '초6',
    time: '16:00',
    packageName: '10회 레슨권',
    remainingCount: 8,
    status: 'upcoming',
    vIndex: 85,
    riskLevel: 'safe',
  },
  {
    id: '4',
    studentId: 's4',
    studentName: '최수아',
    grade: '중3',
    time: '17:00',
    packageName: '월정액',
    remainingCount: -1,
    status: 'upcoming',
    vIndex: 35,
    riskLevel: 'danger',
  },
];

export default function SmartAttendanceScreen() {
  const navigation = useNavigation();
  const [lessons, setLessons] = useState<TodayLesson[]>(mockTodayLessons);
  const [selectedLesson, setSelectedLesson] = useState<TodayLesson | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Pulse animation for in-progress lessons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const handleCheckIn = (lesson: TodayLesson) => {
    const currentTime = getCurrentTime();

    // Calculate if late
    const [lessonHour, lessonMin] = lesson.time.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const lessonMinutes = lessonHour * 60 + lessonMin;
    const currentMinutes = currentHour * 60 + currentMin;
    const diff = currentMinutes - lessonMinutes;

    const isLate = diff > 5;
    const status = isLate ? 'late' : 'present';

    Alert.alert(
      '출석 체크',
      `${lesson.studentName} 학생 ${isLate ? `(${diff}분 지각)` : ''}\n\n✅ 출석 처리\n💰 레슨 1회 차감 (잔여 ${lesson.remainingCount - 1}회)`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: () => {
            setLessons(prev => prev.map(l =>
              l.id === lesson.id
                ? { ...l, status: 'in_progress', checkInTime: currentTime, remainingCount: l.remainingCount > 0 ? l.remainingCount - 1 : l.remainingCount }
                : l
            ));

            // Show next action
            setTimeout(() => {
              Alert.alert(
                '레슨 시작',
                '레슨이 시작되었습니다.\n\n피드백을 남기시겠습니까?',
                [
                  { text: '나중에' },
                  {
                    text: '피드백 작성',
                    onPress: () => navigation.navigate('LessonFeedback' as never, { lessonId: lesson.id } as never),
                  },
                ]
              );
            }, 500);
          }
        },
      ]
    );
  };

  const handleMarkAbsent = (lesson: TodayLesson) => {
    Alert.alert(
      '결석 처리',
      `${lesson.studentName} 학생을 결석 처리하시겠습니까?\n\n⚠️ V-Index -10점\n📢 학부모 알림 발송`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '결석 처리',
          style: 'destructive',
          onPress: () => {
            setLessons(prev => prev.map(l =>
              l.id === lesson.id
                ? { ...l, status: 'absent', vIndex: Math.max(0, l.vIndex - 10) }
                : l
            ));
          }
        },
      ]
    );
  };

  const handleCompleteLesson = (lesson: TodayLesson) => {
    Alert.alert(
      '레슨 종료',
      `${lesson.studentName} 학생의 레슨을 종료하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '종료',
          onPress: () => {
            setLessons(prev => prev.map(l =>
              l.id === lesson.id ? { ...l, status: 'completed' } : l
            ));

            // Navigate to feedback
            navigation.navigate('LessonFeedback' as never, { lessonId: lesson.id } as never);
          }
        },
      ]
    );
  };

  const openLessonActions = (lesson: TodayLesson) => {
    setSelectedLesson(lesson);
    setShowActionSheet(true);
  };

  const getStatusConfig = (status: TodayLesson['status']) => {
    switch (status) {
      case 'upcoming':
        return { label: '대기중', color: colors.textMuted, icon: 'time-outline' };
      case 'checked_in':
        return { label: '출석', color: colors.safe.primary, icon: 'checkmark-circle' };
      case 'in_progress':
        return { label: '진행중', color: colors.caution.primary, icon: 'play-circle' };
      case 'completed':
        return { label: '완료', color: colors.success.primary, icon: 'checkmark-done-circle' };
      case 'absent':
        return { label: '결석', color: colors.danger.primary, icon: 'close-circle' };
      default:
        return { label: '', color: colors.textMuted, icon: 'help-circle' };
    }
  };

  const getRiskColor = (level: TodayLesson['riskLevel']) => {
    switch (level) {
      case 'safe': return colors.safe.primary;
      case 'caution': return colors.caution.primary;
      case 'danger': return colors.danger.primary;
    }
  };

  // Today Stats
  const stats = {
    total: lessons.length,
    completed: lessons.filter(l => l.status === 'completed').length,
    inProgress: lessons.filter(l => l.status === 'in_progress').length,
    absent: lessons.filter(l => l.status === 'absent').length,
  };

  const renderLessonCard = (lesson: TodayLesson) => {
    const statusConfig = getStatusConfig(lesson.status);
    const riskColor = getRiskColor(lesson.riskLevel);
    const isActive = lesson.status === 'in_progress';

    const CardWrapper = isActive ? Animated.View : View;
    const animStyle = isActive ? { transform: [{ scale: pulseAnim }] } : {};

    return (
      <CardWrapper key={lesson.id} style={animStyle}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openLessonActions(lesson)}
        >
          <GlassCard
            style={[
              styles.lessonCard,
              isActive && styles.lessonCardActive,
            ]}
            glowColor={isActive ? colors.caution.primary : undefined}
          >
            {/* Header */}
            <View style={styles.lessonHeader}>
              <View style={styles.lessonTime}>
                <Text style={styles.lessonTimeText}>{lesson.time}</Text>
                {lesson.checkInTime && (
                  <Text style={styles.checkInTime}>
                    체크인 {lesson.checkInTime}
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
                <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            {/* Student Info */}
            <View style={styles.studentRow}>
              <View style={[styles.studentAvatar, { borderColor: riskColor }]}>
                <Text style={styles.studentAvatarText}>{lesson.studentName.charAt(0)}</Text>
                {lesson.riskLevel === 'danger' && (
                  <View style={styles.dangerDot} />
                )}
              </View>
              <View style={styles.studentInfo}>
                <View style={styles.studentNameRow}>
                  <Text style={styles.studentName}>{lesson.studentName}</Text>
                  <Text style={styles.studentGrade}>{lesson.grade}</Text>
                </View>
                <View style={styles.studentMeta}>
                  <Text style={styles.packageName}>{lesson.packageName}</Text>
                  {lesson.remainingCount > 0 && (
                    <Text style={[
                      styles.remainingCount,
                      lesson.remainingCount <= 3 && { color: colors.danger.primary },
                    ]}>
                      잔여 {lesson.remainingCount}회
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.vIndexMini}>
                <Text style={[styles.vIndexValue, { color: riskColor }]}>
                  {lesson.vIndex}
                </Text>
                <Text style={styles.vIndexLabel}>V-Index</Text>
              </View>
            </View>

            {/* Quick Actions */}
            {lesson.status === 'upcoming' && (
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.checkInButton}
                  onPress={() => handleCheckIn(lesson)}
                >
                  <LinearGradient
                    colors={[colors.safe.primary, '#0099CC']}
                    style={styles.checkInButtonGradient}
                  >
                    <Ionicons name="qr-code" size={18} color={colors.background} />
                    <Text style={styles.checkInButtonText}>출석 체크</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.absentButton}
                  onPress={() => handleMarkAbsent(lesson)}
                >
                  <Ionicons name="close-circle" size={18} color={colors.danger.primary} />
                  <Text style={styles.absentButtonText}>결석</Text>
                </TouchableOpacity>
              </View>
            )}

            {lesson.status === 'in_progress' && (
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => navigation.navigate('LessonFeedback' as never, { lessonId: lesson.id } as never)}
                >
                  <Ionicons name="videocam" size={18} color={colors.caution.primary} />
                  <Text style={styles.feedbackButtonText}>피드백</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => navigation.navigate('LessonChat' as never, { lessonId: lesson.id } as never)}
                >
                  <Ionicons name="chatbubble" size={18} color={colors.safe.primary} />
                  <Text style={styles.chatButtonText}>노트</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => handleCompleteLesson(lesson)}
                >
                  <Ionicons name="checkmark-done" size={18} color={colors.success.primary} />
                  <Text style={styles.completeButtonText}>종료</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        </TouchableOpacity>
      </CardWrapper>
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
        onLeftPress={() => navigation.openDrawer?.()}
        title="오늘의 레슨"
        rightIcon="qr-code-outline"
        onRightPress={() => {/* QR Scanner */}}
      />

      {/* Today Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>전체</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success.primary }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>완료</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.caution.primary }]}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>진행중</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.danger.primary }]}>{stats.absent}</Text>
          <Text style={styles.statLabel}>결석</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Time */}
        <View style={styles.currentTimeRow}>
          <Ionicons name="time" size={16} color={colors.safe.primary} />
          <Text style={styles.currentTimeText}>현재 시각 {getCurrentTime()}</Text>
        </View>

        {/* Lesson List */}
        {lessons.map(renderLessonCard)}

        {/* Empty State */}
        {lessons.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>오늘 예정된 레슨이 없습니다</Text>
          </View>
        )}

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('LessonRegistration' as never)}
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
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },

  // Current Time
  currentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  currentTimeText: {
    fontSize: typography.fontSize.sm,
    color: colors.safe.primary,
    fontWeight: '500',
  },

  // Lesson Card
  lessonCard: { marginBottom: spacing[3] },
  lessonCardActive: {
    borderColor: colors.caution.primary,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  lessonTime: {},
  lessonTimeText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  checkInTime: {
    fontSize: typography.fontSize.xs,
    color: colors.success.primary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: spacing[3],
  },
  studentAvatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  dangerDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  studentInfo: { flex: 1 },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  studentName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  studentGrade: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: 2,
  },
  packageName: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  remainingCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  vIndexMini: { alignItems: 'center' },
  vIndexValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  vIndexLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkInButton: { flex: 2, borderRadius: borderRadius.lg, overflow: 'hidden' },
  checkInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  checkInButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
  absentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.danger.primary,
    backgroundColor: colors.danger.bg,
  },
  absentButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.danger.primary,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.caution.bg,
  },
  feedbackButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.caution.primary,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.safe.bg,
  },
  chatButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.safe.primary,
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.success.bg,
  },
  completeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.success.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    marginTop: spacing[3],
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing[8],
    right: spacing[4],
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
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
