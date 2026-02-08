/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏠 HomeScreen - KRATON 스타일 메인 대시보드
 * AUTUS 2.0 - 학원 퇴원 방지 AI 플랫폼
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography } from '../../utils/theme';
import { api } from '../../services/api';

// KRATON Components
import Header from '../../components/common/Header';
import { StatCard, AlertCard, VIndexCard, QuickActionButton } from '../../components/home';

export default function HomeScreen() {
  const navigation = useNavigation();

  // Fetch dashboard data
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboardSummary(),
  });

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const navigateToNotifications = () => {
    // TODO: Navigate to notifications
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '안녕하세요';
    return '수고하셨어요';
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
        leftIcon="menu"
        onLeftPress={openDrawer}
        title="온리쌤"
        rightIcon="notifications-outline"
        onRightPress={navigateToNotifications}
        rightBadge={dashboard?.data?.urgent_alerts?.length}
      />

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
        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>{getGreeting()}, 원장님!</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </Text>
        </View>

        {/* V-Index Card */}
        <VIndexCard
          value={dashboard?.data?.v_index || 68.5}
          change={dashboard?.data?.v_change || -2.3}
          onPress={() => navigation.navigate('Reports' as never)}
        />

        {/* Urgent Alerts */}
        {dashboard?.data?.urgent_alerts && dashboard.data.urgent_alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.danger.bg }]}>
                  <Ionicons name="warning" size={16} color={colors.danger.primary} />
                </View>
                <Text style={styles.sectionTitle}>
                  위험 알림 ({dashboard.data.urgent_alerts.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Risk' as never)}>
                <Text style={styles.seeAllText}>전체보기</Text>
              </TouchableOpacity>
            </View>
            {dashboard.data.urgent_alerts.slice(0, 3).map((alert: any) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onPress={() =>
                  navigation.navigate('StudentDetail' as never, {
                    studentId: alert.student_id,
                  } as never)
                }
              />
            ))}
          </View>
        )}

        {/* Stats Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.safe.bg }]}>
                <Ionicons name="stats-chart" size={16} color={colors.safe.primary} />
              </View>
              <Text style={styles.sectionTitle}>오늘의 요약</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              icon="checkmark-circle"
              label="출석률"
              value={`${dashboard?.data?.attendance_rate?.toFixed(1) || 0}%`}
              trend={(dashboard?.data?.attendance_rate || 0) > 90 ? 'up' : 'down'}
              color={colors.safe.primary}
            />
            <StatCard
              icon="repeat"
              label="재등록률"
              value={`${dashboard?.data?.payment_rate?.toFixed(1) || 0}%`}
              trend={(dashboard?.data?.payment_rate || 0) > 90 ? 'up' : 'down'}
              color={colors.success.primary}
            />
            <StatCard
              icon="alert-circle"
              label="미납"
              value={`${dashboard?.data?.overdue_count || 0}명`}
              trend={(dashboard?.data?.overdue_count || 0) > 0 ? 'down' : 'up'}
              color={colors.caution.primary}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.caution.bg }]}>
                <Ionicons name="flash" size={16} color={colors.caution.primary} />
              </View>
              <Text style={styles.sectionTitle}>퀵 액션</Text>
            </View>
          </View>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="person-add"
              label="학생 등록"
              onPress={() => navigation.navigate('StudentCreate' as never)}
              color={colors.safe.primary}
            />
            <QuickActionButton
              icon="chatbubble-ellipses"
              label="상담 예약"
              onPress={() => navigation.navigate('Consultation' as never)}
              color={colors.success.primary}
            />
            <QuickActionButton
              icon="document-text"
              label="리포트"
              onPress={() => navigation.navigate('Reports' as never)}
              color={colors.caution.primary}
            />
            <QuickActionButton
              icon="warning"
              label="위험 관리"
              onPress={() => navigation.navigate('Risk' as never)}
              color={colors.danger.primary}
            />
          </View>
        </View>

        {/* Bottom Spacing */}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  welcomeSection: {
    marginBottom: spacing[4],
  },
  welcomeText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
  },
  dateText: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  seeAllText: {
    fontSize: typography.fontSize.md,
    color: colors.safe.primary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
