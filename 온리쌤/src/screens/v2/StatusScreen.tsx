/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 StatusScreen - AUTUS v1.0 Consumer 현재 상태 화면
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Consumer (학부모/고객)가 보는 메인 화면
 * - 현재 Outcome 상태
 * - 다음 단계 안내
 * - 안심 메시지
 * - 0 입력 (Passive View Only)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L, T } from '../../config/labelMap';
import { useRole } from '../../navigation/AppNavigatorV2';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface EntityStatus {
  name: string;
  vIndex: number;
  vIndexChange: number; // 지난주 대비
  status: 'improving' | 'stable' | 'declining';
  totalSessions: number;
  completedSessions: number;
  recentActivity: {
    date: string;
    type: 'attended' | 'absent' | 'late';
    serviceName: string;
  }[];
  nextSession?: {
    date: string;
    time: string;
    serviceName: string;
    staffName: string;
  };
  reassuringMessage: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function StatusScreen() {
  const { config } = useIndustryConfig();
  const { logout } = useRole();
  const [data, setData] = useState<EntityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: logout },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchStatus = async () => {
    try {
      // TODO: 실제 API 연동
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setData({
        name: '김민수',
        vIndex: 78,
        vIndexChange: 5,
        status: 'improving',
        totalSessions: 24,
        completedSessions: 18,
        recentActivity: [
          { date: '1/15', type: 'attended', serviceName: '초등부 A' },
          { date: '1/13', type: 'attended', serviceName: '초등부 A' },
          { date: '1/10', type: 'late', serviceName: '초등부 A' },
        ],
        nextSession: {
          date: '1월 17일 (수)',
          time: '15:00 ~ 16:30',
          serviceName: '초등부 A',
          staffName: '김코치',
        },
        reassuringMessage: '민수는 지난 한 달간 꾸준히 참여하고 있어요! 특히 드리블 실력이 눈에 띄게 좋아졌습니다. 계속 이렇게 즐겁게 활동하면 좋겠어요 🏀',
      });
    } catch (error: unknown) {
      if (__DEV__) console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const getStatusColor = (status: EntityStatus['status']) => {
    switch (status) {
      case 'improving': return colors.success.primary;
      case 'stable': return config.color.primary;
      case 'declining': return colors.danger.primary;
    }
  };

  const getStatusIcon = (status: EntityStatus['status']): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'improving': return 'trending-up';
      case 'stable': return 'remove';
      case 'declining': return 'trending-down';
    }
  };

  const getStatusLabel = (status: EntityStatus['status']) => {
    switch (status) {
      case 'improving': return '성장 중';
      case 'stable': return '안정적';
      case 'declining': return '관심 필요';
    }
  };

  const getActivityIcon = (type: 'attended' | 'absent' | 'late'): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'attended': return 'checkmark-circle';
      case 'absent': return 'close-circle';
      case 'late': return 'time';
    }
  };

  const getActivityColor = (type: 'attended' | 'absent' | 'late') => {
    switch (type) {
      case 'attended': return colors.success.primary;
      case 'absent': return colors.danger.primary;
      case 'late': return colors.caution.primary;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: V-Index Circle
  // ─────────────────────────────────────────────────────────────────────────────

  const renderVIndexCircle = () => {
    if (!data) return null;
    
    const size = 160;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = (data.vIndex / 100) * circumference;

    return (
      <View style={styles.vIndexContainer}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getStatusColor(data.status)}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          {/* V-Index Value */}
          <SvgText
            x={size / 2}
            y={size / 2 - 5}
            textAnchor="middle"
            fontSize={40}
            fontWeight="bold"
            fill={colors.text.primary}
          >
            {data.vIndex}
          </SvgText>
          <SvgText
            x={size / 2}
            y={size / 2 + 20}
            textAnchor="middle"
            fontSize={12}
            fill={colors.text.muted}
          >
            V-Index
          </SvgText>
        </Svg>

        {/* Change Indicator */}
        <View style={[styles.changeIndicator, { backgroundColor: `${getStatusColor(data.status)}20` }]}>
          <Ionicons
            name={getStatusIcon(data.status)}
            size={16}
            color={getStatusColor(data.status)}
          />
          <Text style={[styles.changeText, { color: getStatusColor(data.status) }]}>
            {data.vIndexChange > 0 ? '+' : ''}{data.vIndexChange}° {getStatusLabel(data.status)}
          </Text>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={config.color.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.text.muted} />
        <Text style={styles.errorText}>정보를 불러올 수 없습니다</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.entityName}>{data.name}</Text>
          <Text style={styles.entityLabel}>{L.entity(config)}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={config.color.primary} />
        }
      >
        {/* V-Index Card */}
        <LinearGradient
          colors={[colors.surface, colors.background]}
          style={styles.mainCard}
        >
          {renderVIndexCircle()}
          
          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{L.service(config)} 진행률</Text>
              <Text style={styles.progressValue}>
                {data.completedSessions}/{data.totalSessions}회
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${data.totalSessions > 0 ? (data.completedSessions / data.totalSessions) * 100 : 0}%`,
                    backgroundColor: config.color.primary 
                  }
                ]} 
              />
            </View>
          </View>
        </LinearGradient>

        {/* Reassuring Message (안심 메시지) */}
        <View style={styles.messageCard}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageIcon}>💬</Text>
            <Text style={styles.messageTitle}>{L.staff(config)} 메시지</Text>
          </View>
          <Text style={styles.messageText}>{data.reassuringMessage}</Text>
        </View>

        {/* Next Session (다음 단계) */}
        {data.nextSession && (
          <View style={styles.nextSessionCard}>
            <View style={styles.nextSessionHeader}>
              <Text style={styles.nextSessionIcon}>📅</Text>
              <Text style={styles.nextSessionTitle}>다음 {L.service(config)}</Text>
            </View>
            <View style={styles.nextSessionInfo}>
              <View style={styles.nextSessionRow}>
                <Ionicons name="calendar-outline" size={18} color={config.color.primary} />
                <Text style={styles.nextSessionDate}>{data.nextSession.date}</Text>
              </View>
              <View style={styles.nextSessionRow}>
                <Ionicons name="time-outline" size={18} color={config.color.primary} />
                <Text style={styles.nextSessionTime}>{data.nextSession.time}</Text>
              </View>
              <View style={styles.nextSessionRow}>
                <Ionicons name="location-outline" size={18} color={config.color.primary} />
                <Text style={styles.nextSessionDetail}>
                  {data.nextSession.serviceName} · {data.nextSession.staffName}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.activityCard}>
          <Text style={styles.activityTitle}>최근 {config.labels.attendance}</Text>
          <View style={styles.activityList}>
            {data.recentActivity.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <Ionicons
                  name={getActivityIcon(activity.type)}
                  size={20}
                  color={getActivityColor(activity.type)}
                />
                <Text style={styles.activityDate}>{activity.date}</Text>
                <Text style={styles.activityService}>{activity.serviceName}</Text>
              </View>
            ))}
          </View>
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing[6],
  },
  errorText: {
    fontSize: typography.fontSize.md,
    color: colors.text.muted,
    marginTop: spacing[4],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  entityName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
  },
  entityLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginTop: spacing[1],
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },

  // Main Card
  mainCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
  },

  // V-Index
  vIndexContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginTop: spacing[2],
  },
  changeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  // Progress
  progressSection: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  progressLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  progressValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border.primary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },

  // Message Card
  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  messageIcon: {
    fontSize: 20,
  },
  messageTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  messageText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    lineHeight: 24,
  },

  // Next Session
  nextSessionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  nextSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  nextSessionIcon: {
    fontSize: 20,
  },
  nextSessionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  nextSessionInfo: {
    gap: spacing[2],
  },
  nextSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  nextSessionDate: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  nextSessionTime: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  nextSessionDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },

  // Activity
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  activityTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  activityList: {
    gap: spacing[2],
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  activityDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    width: 50,
  },
  activityService: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});
