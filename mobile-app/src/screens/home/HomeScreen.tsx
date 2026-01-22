/**
 * AUTUS - Home Screen (1-홈)
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

import { colors, spacing, typography, shadows, borderRadius } from '../../utils/theme';
import { api } from '../../services/api';

// Components
import Header from '../../components/common/Header';
import StatCard from '../../components/home/StatCard';
import AlertCard from '../../components/home/AlertCard';
import QuickActionButton from '../../components/home/QuickActionButton';
import VIndexCard from '../../components/home/VIndexCard';

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        leftIcon="menu"
        onLeftPress={openDrawer}
        title="AUTUS"
        rightIcon="notifications-outline"
        onRightPress={navigateToNotifications}
        rightBadge={dashboard?.data?.urgent_alerts?.length}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>안녕하세요, 원장님! 👋</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
        </View>

        {/* V-Index Card */}
        <VIndexCard
          value={dashboard?.data?.v_index || 0}
          change={dashboard?.data?.v_change || 0}
          onPress={() => navigation.navigate('Reports' as never)}
        />

        {/* Urgent Alerts */}
        {dashboard?.data?.urgent_alerts && dashboard.data.urgent_alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                ⚠️ 위험 알림 ({dashboard.data.urgent_alerts.length})
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Risk' as never)}>
                <Text style={styles.seeAllText}>전체보기</Text>
              </TouchableOpacity>
            </View>
            {dashboard.data.urgent_alerts.slice(0, 3).map((alert: any) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onPress={() => navigation.navigate('StudentDetail' as never, { 
                  studentId: alert.student_id 
                } as never)}
              />
            ))}
          </View>
        )}

        {/* Stats Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 오늘의 요약</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="출석률"
              value={`${dashboard?.data?.attendance_rate?.toFixed(1) || 0}%`}
              trend={dashboard?.data?.attendance_rate > 90 ? 'up' : 'down'}
              color={colors.primary[500]}
            />
            <StatCard
              label="재등록률"
              value={`${dashboard?.data?.payment_rate?.toFixed(1) || 0}%`}
              trend={dashboard?.data?.payment_rate > 90 ? 'up' : 'down'}
              color={colors.success[500]}
            />
            <StatCard
              label="미납"
              value={`${dashboard?.data?.overdue_count || 0}명`}
              trend={dashboard?.data?.overdue_count > 0 ? 'down' : 'up'}
              color={colors.danger[500]}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ 퀵 액션</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="person-add"
              label="학생 등록"
              onPress={() => navigation.navigate('StudentCreate' as never)}
            />
            <QuickActionButton
              icon="chatbubble-ellipses"
              label="상담 예약"
              onPress={() => navigation.navigate('Consultation' as never)}
            />
            <QuickActionButton
              icon="document-text"
              label="리포트"
              onPress={() => navigation.navigate('Reports' as never)}
            />
            <QuickActionButton
              icon="warning"
              label="위험 관리"
              onPress={() => navigation.navigate('Risk' as never)}
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
    backgroundColor: colors.gray[50],
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
    color: colors.gray[900],
  },
  dateText: {
    fontSize: typography.fontSize.md,
    color: colors.gray[600],
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
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing[3],
  },
  seeAllText: {
    fontSize: typography.fontSize.md,
    color: colors.primary[500],
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
});
