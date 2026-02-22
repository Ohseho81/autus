/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 DashboardScreen - AUTUS v1.0 Admin Outcome 대시보드
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 핵심 기능:
 * - Outcome (V-Index) 모니터링
 * - 위험 알림 표시
 * - 변화율 요약
 * - 결제/미납 현황
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../../navigation/AppNavigatorV2';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L, T } from '../../config/labelMap';
import { useRole } from '../../navigation/AppNavigatorV2';
import { supabaseApi } from '../../services/supabaseApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface DashboardData {
  vIndex: number;
  vIndexChange: number;
  totalEntities: number;
  riskCount: number;
  cautionCount: number;
  safeCount: number;
  unpaidAmount: number;
  unpaidCount: number;
  todaySessions: number;
  completedSessions: number;
}

interface RiskAlert {
  id: string;
  entityId: string;
  entityName: string;
  riskLevel: number;
  reason: string;
  suggestedAction: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardScreen() {
  const { config } = useIndustryConfig();
  const { logout } = useRole();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    try {
      // 실제 Supabase 데이터 연동
      const response = await supabaseApi.getDashboardSummary();

      if (response.success && response.data) {
        const summary = response.data;
        setData({
          vIndex: Math.round(summary.v_index) || 50,
          vIndexChange: summary.v_change || 0,
          totalEntities: summary.total_students || 0,
          riskCount: summary.high_risk_count || 0,
          cautionCount: Math.floor((summary.total_students || 0) * 0.1), // 10%를 주의로 추정
          safeCount: (summary.total_students || 0) - (summary.high_risk_count || 0) - Math.floor((summary.total_students || 0) * 0.1),
          unpaidAmount: 0, // TODO: 결제 데이터 연동
          unpaidCount: summary.overdue_count || 0,
          todaySessions: summary.today_lessons || 0,
          completedSessions: summary.today_attendance || 0,
        });

        // 긴급 알림 설정
        if (summary.urgent_alerts && summary.urgent_alerts.length > 0) {
          setAlerts(summary.urgent_alerts.map((alert: { id: string; student_id: string; name: string; v_index?: number; message?: string }) => ({
            id: alert.id,
            entityId: alert.student_id,
            entityName: alert.name,
            riskLevel: alert.v_index || 0,
            reason: alert.message || '이탈 위험',
            suggestedAction: '상담 필요',
          })));
        } else {
          setAlerts([]);
        }
      }
    } catch (error: unknown) {
      if (__DEV__) console.error('Failed to fetch dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoized alerts list
  const memoizedAlerts = useMemo(
    () => alerts,
    [alerts]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const getVIndexColor = useCallback((value: number) => {
    if (value >= 70) return colors.success.primary;
    if (value >= 50) return colors.caution.primary;
    return colors.danger.primary;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render V-Index Gauge
  // ─────────────────────────────────────────────────────────────────────────────

  const renderVIndexGauge = useCallback(() => {
    if (!data) return null;

    const size = 160;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = (data.vIndex / 100) * circumference;
    const vColor = getVIndexColor(data.vIndex);

    return (
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border.primary}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={vColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          {/* Value */}
          <SvgText
            x={size / 2}
            y={size / 2 - 10}
            textAnchor="middle"
            fontSize={36}
            fontWeight="bold"
            fill={colors.text.primary}
          >
            {data.vIndex}
          </SvgText>
          <SvgText
            x={size / 2}
            y={size / 2 + 15}
            textAnchor="middle"
            fontSize={12}
            fill={colors.text.muted}
          >
            V-Index
          </SvgText>
        </Svg>

        {/* Change Indicator */}
        <View style={[styles.changeIndicator, { backgroundColor: data.vIndexChange >= 0 ? colors.success.bg : colors.danger.bg }]}>
          <Ionicons
            name={data.vIndexChange >= 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={data.vIndexChange >= 0 ? colors.success.primary : colors.danger.primary}
          />
          <Text style={[
            styles.changeText,
            { color: data.vIndexChange >= 0 ? colors.success.primary : colors.danger.primary }
          ]}>
            {data.vIndexChange >= 0 ? '+' : ''}{data.vIndexChange}%
          </Text>
        </View>
      </View>
    );
  }, [data, getVIndexColor]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandIcon}>{config.icon}</Text>
          <View>
            <Text style={styles.brandName}>{config.name}</Text>
            <Text style={styles.roleLabel}>{config.labels.admin}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color={colors.text.muted} />
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
          style={styles.vIndexCard}
        >
          <Text style={styles.cardTitle}>Outcome</Text>
          {renderVIndexGauge()}
          
          {/* Distribution */}
          {data && (
            <View style={styles.distribution}>
              <View style={styles.distItem}>
                <View style={[styles.distDot, { backgroundColor: colors.success.primary }]} />
                <Text style={styles.distLabel}>정상</Text>
                <Text style={styles.distValue}>{data.safeCount}</Text>
              </View>
              <View style={styles.distItem}>
                <View style={[styles.distDot, { backgroundColor: colors.caution.primary }]} />
                <Text style={styles.distLabel}>주의</Text>
                <Text style={styles.distValue}>{data.cautionCount}</Text>
              </View>
              <View style={styles.distItem}>
                <View style={[styles.distDot, { backgroundColor: colors.danger.primary }]} />
                <Text style={styles.distLabel}>{config.labels.risk}</Text>
                <Text style={styles.distValue}>{data.riskCount}</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Risk Alerts */}
        {memoizedAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ {config.labels.risk} 알림</Text>
            {memoizedAlerts.map(alert => (
              <TouchableOpacity
                key={alert.id}
                style={styles.alertCard}
                onPress={() => navigation.navigate('EntityDetail', { entityId: alert.entityId, mode: 'view' })}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.riskBadge, { backgroundColor: `${colors.danger.primary}20` }]}>
                    <Text style={[styles.riskBadgeText, { color: colors.danger.primary }]}>
                      {alert.riskLevel}°
                    </Text>
                  </View>
                  <Text style={styles.alertName}>{alert.entityName}</Text>
                </View>
                <Text style={styles.alertReason}>{alert.reason}</Text>
                <Text style={styles.alertAction}>💡 {alert.suggestedAction}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={config.color.primary} />
            <Text style={styles.statValue}>{data?.totalEntities || 0}</Text>
            <Text style={styles.statLabel}>{L.entities(config)}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color={colors.safe.primary} />
            <Text style={styles.statValue}>{data?.completedSessions || 0}/{data?.todaySessions || 0}</Text>
            <Text style={styles.statLabel}>오늘 {L.service(config)}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="card" size={24} color={colors.caution.primary} />
            <Text style={styles.statValue}>{data?.unpaidCount || 0}건</Text>
            <Text style={styles.statLabel}>{T.unpaidAmount(config)}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color={colors.danger.primary} />
            <Text style={[styles.statValue, { fontSize: 16 }]}>{formatCurrency(data?.unpaidAmount || 0)}</Text>
            <Text style={styles.statLabel}>미수금</Text>
          </View>
        </View>

        {/* 감사 현황 카드 (온리쌤 스타일) */}
        <TouchableOpacity 
          style={styles.gratitudeCard}
          onPress={() => navigation.navigate('Gratitude')}
          activeOpacity={0.8}
        >
          <View style={styles.gratitudeHeader}>
            <View style={styles.gratitudeIconBox}>
              <Text style={styles.gratitudeIcon}>💝</Text>
            </View>
            <View style={styles.gratitudeInfo}>
              <Text style={styles.gratitudeLabel}>감사 현황</Text>
              <Text style={styles.gratitudeAmount}>39,500원</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </View>
          <Text style={styles.gratitudeHint}>학부모님들의 감사를 확인하세요 →</Text>
        </TouchableOpacity>

        {/* Today's Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 오늘 요약</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              • 총 {data?.totalEntities || 0}명의 {L.entities(config)} 중 {data?.riskCount || 0}명이 {config.labels.risk} 상태입니다.{'\n'}
              • 오늘 {data?.todaySessions || 0}개의 {L.service(config)} 중 {data?.completedSessions || 0}개가 완료되었습니다.{'\n'}
              • {data?.unpaidCount || 0}건의 미납 ({formatCurrency(data?.unpaidAmount || 0)})이 있습니다.
            </Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  brandIcon: {
    fontSize: 32,
  },
  brandName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  roleLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  logoutButton: {
    padding: spacing[2],
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },

  // V-Index Card
  vIndexCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  gaugeContainer: {
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
  distribution: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  distItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  distDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  distValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Section
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },

  // Alert Cards
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.danger.primary,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  riskBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  riskBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  alertName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  alertReason: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  alertAction: {
    fontSize: typography.fontSize.sm,
    color: colors.safe.primary,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    width: (SCREEN_WIDTH - spacing[4] * 2 - spacing[3]) / 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginVertical: spacing[1],
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  summaryText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // 감사 카드 (온리쌤 스타일)
  gratitudeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(255,55,95,0.3)',
  },
  gratitudeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  gratitudeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,55,95,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  gratitudeIcon: {
    fontSize: 22,
  },
  gratitudeInfo: {
    flex: 1,
  },
  gratitudeLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginBottom: 2,
  },
  gratitudeAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: '#FF375F',
  },
  gratitudeHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
});
