/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 AdminMonitorScreen - 관리자 모니터링 대시보드
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 관리자가 "모니터링"하는 것:
 * 1. 상담 현황 (알림톡 실시간)
 * 2. 스케줄 현황
 * 3. 수납 현황
 *
 * 원칙: 직접 하지 않는다. 본다. 이상 있으면 알림 받는다.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, REFRESH_INTERVAL } from '../../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ConsultationStatus {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  recentMessages: {
    parentName: string;
    message: string;
    time: string;
    status: 'waiting' | 'replied';
  }[];
}

interface ScheduleStatus {
  todayClasses: number;
  inProgress: number;
  completed: number;
  upcoming: number;
  conflicts: number;
  alerts: { message: string; level: 'warning' | 'error' }[];
}

interface PaymentStatus {
  monthlyTarget: number;
  monthlyActual: number;
  todayPayments: number;
  overdue: number;
  expiringSoon: number;
  recentPayments: {
    studentName: string;
    amount: number;
    time: string;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 모니터링 카드 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface MonitorCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  children: React.ReactNode;
  alertCount?: number;
}

const MonitorCard: React.FC<MonitorCardProps> = React.memo(function MonitorCard({
  title,
  icon,
  color,
  children,
  alertCount,
}) {
  return (
    <View style={styles.monitorCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        {alertCount !== undefined && alertCount > 0 && (
          <View style={[styles.alertBadge, { backgroundColor: colors.danger.primary }]}>
            <Text style={styles.alertBadgeText}>{alertCount}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 숫자 표시 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface StatBoxProps {
  label: string;
  value: number | string;
  color?: string;
  suffix?: string;
}

const StatBox: React.FC<StatBoxProps> = React.memo(function StatBox({ label, value, color = colors.text.primary, suffix }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>
        {value}{suffix}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminMonitorScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [consultation, setConsultation] = useState<ConsultationStatus>({
    total: 24,
    pending: 3,
    inProgress: 5,
    completed: 16,
    recentMessages: [
      { parentName: '김민준 어머니', message: '보강 일정 문의드립니다', time: '5분 전', status: 'waiting' },
      { parentName: '이서연 아버지', message: '결제 완료했습니다', time: '12분 전', status: 'replied' },
      { parentName: '박지훈 어머니', message: '다음 주 스케줄 변경 가능한가요?', time: '28분 전', status: 'waiting' },
    ],
  });

  const [schedule, setSchedule] = useState<ScheduleStatus>({
    todayClasses: 18,
    inProgress: 3,
    completed: 8,
    upcoming: 7,
    conflicts: 0,
    alerts: [],
  });

  const [payment, setPayment] = useState<PaymentStatus>({
    monthlyTarget: 50000000,
    monthlyActual: 42350000,
    todayPayments: 2150000,
    overdue: 5,
    expiringSoon: 12,
    recentPayments: [
      { studentName: '최예린', amount: 220000, time: '10분 전' },
      { studentName: '정하준', amount: 300000, time: '1시간 전' },
    ],
  });

  // 실시간 갱신
  const loadData = useCallback(async () => {
    // 실제로는 API 호출
    // TODO: 알림톡 연동하여 실시간 상담 메시지 가져오기
  }, []);

  useEffect(() => {
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // 진행률 계산
  const paymentProgress = useMemo(
    () => payment.monthlyTarget > 0 ? (payment.monthlyActual / payment.monthlyTarget) * 100 : 0,
    [payment.monthlyActual, payment.monthlyTarget]
  );
  const scheduleProgress = useMemo(
    () => schedule.todayClasses > 0 ? (schedule.completed / schedule.todayClasses) * 100 : 0,
    [schedule.completed, schedule.todayClasses]
  );

  // Memoized recent messages list
  const memoizedConsultationMessages = useMemo(
    () => consultation.recentMessages,
    [consultation.recentMessages]
  );

  // Memoized schedule alerts list
  const memoizedScheduleAlerts = useMemo(
    () => schedule.alerts,
    [schedule.alerts]
  );

  // Memoized recent payments list
  const memoizedRecentPayments = useMemo(
    () => payment.recentPayments,
    [payment.recentPayments]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>모니터링</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>실시간</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 1. 상담 모니터링 (알림톡 실시간) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <MonitorCard
          title="상담 현황"
          icon="chatbubbles"
          color={colors.apple.purple}
          alertCount={consultation.pending}
        >
          <View style={styles.statRow}>
            <StatBox label="대기" value={consultation.pending} color={colors.danger.primary} />
            <StatBox label="진행중" value={consultation.inProgress} color={colors.caution.primary} />
            <StatBox label="완료" value={consultation.completed} color={colors.success.primary} />
          </View>

          {/* 최근 메시지 (알림톡) */}
          <View style={styles.messageList}>
            <Text style={styles.subTitle}>최근 알림톡</Text>
            {memoizedConsultationMessages.map((msg, idx) => (
              <View key={idx} style={styles.messageItem}>
                <View style={[
                  styles.messageStatus,
                  { backgroundColor: msg.status === 'waiting' ? '#FFF3E0' : '#E8F5E9' }
                ]}>
                  <Ionicons
                    name={msg.status === 'waiting' ? 'time' : 'checkmark'}
                    size={14}
                    color={msg.status === 'waiting' ? '#FF9800' : '#4CAF50'}
                  />
                </View>
                <View style={styles.messageContent}>
                  <Text style={styles.messageName}>{msg.parentName}</Text>
                  <Text style={styles.messageText} numberOfLines={1}>{msg.message}</Text>
                </View>
                <Text style={styles.messageTime}>{msg.time}</Text>
              </View>
            ))}
          </View>
        </MonitorCard>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 2. 스케줄 모니터링 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <MonitorCard
          title="스케줄 현황"
          icon="calendar"
          color={colors.apple.blue}
          alertCount={schedule.conflicts}
        >
          <View style={styles.statRow}>
            <StatBox label="완료" value={schedule.completed} color={colors.success.primary} />
            <StatBox label="진행중" value={schedule.inProgress} color={colors.apple.blue} />
            <StatBox label="예정" value={schedule.upcoming} color={colors.text.muted} />
          </View>

          {/* 진행률 */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>오늘 진행률</Text>
              <Text style={styles.progressValue}>{Math.round(scheduleProgress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${scheduleProgress}%`, backgroundColor: colors.apple.blue }]} />
            </View>
          </View>

          {/* 알림 */}
          {memoizedScheduleAlerts.length > 0 && (
            <View style={styles.alertList}>
              {memoizedScheduleAlerts.map((alert, idx) => (
                <View key={idx} style={[styles.alertItem, { borderLeftColor: alert.level === 'error' ? '#F44336' : '#FF9800' }]}>
                  <Ionicons name="warning" size={16} color={alert.level === 'error' ? '#F44336' : '#FF9800'} />
                  <Text style={styles.alertText}>{alert.message}</Text>
                </View>
              ))}
            </View>
          )}

          {schedule.conflicts === 0 && schedule.alerts.length === 0 && (
            <View style={styles.allGood}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success.primary} />
              <Text style={styles.allGoodText}>문제 없음</Text>
            </View>
          )}
        </MonitorCard>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 3. 수납 모니터링 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <MonitorCard
          title="수납 현황"
          icon="card"
          color="#FF9500"
          alertCount={payment.overdue}
        >
          {/* 월간 목표 */}
          <View style={styles.targetSection}>
            <View style={styles.targetHeader}>
              <Text style={styles.targetLabel}>월간 목표</Text>
              <Text style={styles.targetValue}>
                {(payment.monthlyActual / 10000).toLocaleString()}만 / {(payment.monthlyTarget / 10000).toLocaleString()}만
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${paymentProgress}%`, backgroundColor: '#FF9500' }]} />
            </View>
            <Text style={styles.targetPercent}>{Math.round(paymentProgress)}% 달성</Text>
          </View>

          <View style={styles.statRow}>
            <StatBox label="오늘 수납" value={(payment.todayPayments / 10000).toLocaleString()} suffix="만" color={colors.success.primary} />
            <StatBox label="미납" value={payment.overdue} color={colors.danger.primary} suffix="명" />
            <StatBox label="만료예정" value={payment.expiringSoon} color={colors.caution.primary} suffix="명" />
          </View>

          {/* 최근 결제 */}
          <View style={styles.recentPayments}>
            <Text style={styles.subTitle}>최근 결제</Text>
            {memoizedRecentPayments.map((p, idx) => (
              <View key={idx} style={styles.paymentItem}>
                <View style={styles.paymentIcon}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success.primary} />
                </View>
                <Text style={styles.paymentName}>{p.studentName}</Text>
                <Text style={styles.paymentAmount}>{p.amount.toLocaleString()}원</Text>
                <Text style={styles.paymentTime}>{p.time}</Text>
              </View>
            ))}
          </View>
        </MonitorCard>

        {/* 안내 */}
        <View style={styles.guideCard}>
          <Ionicons name="eye" size={20} color={colors.apple.blue} />
          <Text style={styles.guideText}>
            보기만 하세요. 문제가 있으면 알림이 옵니다.
          </Text>
        </View>
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
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success.primary,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },

  // 모니터 카드
  monitorCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  alertBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // 통계
  statRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },

  // 메시지 리스트
  messageList: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
    marginBottom: 12,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  messageStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  messageText: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 12,
    color: '#BBB',
  },

  // 진행률
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // 알림
  alertList: {
    marginTop: 8,
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.caution.bg,
    borderRadius: 10,
    borderLeftWidth: 3,
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  allGood: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.success.bg,
    borderRadius: 10,
    gap: 8,
  },
  allGoodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success.primary,
  },

  // 목표
  targetSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.danger.bg,
    borderRadius: 12,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  targetLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  targetPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9500',
    textAlign: 'right',
    marginTop: 8,
  },

  // 최근 결제
  recentPayments: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paymentIcon: {
    marginRight: 10,
  },
  paymentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success.primary,
    marginRight: 10,
  },
  paymentTime: {
    fontSize: 12,
    color: '#BBB',
  },

  // 가이드
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.apple.blue + '15',
    borderRadius: 12,
    gap: 10,
    marginBottom: 30,
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});
