/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 ReportsScreen - KRATON 스타일 리포트 대시보드
 * V-Index 분석 + TSEL 요약 + 트렌드 차트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, Line, Text as SvgText, Path } from 'react-native-svg';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard, FilterTabs } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReportData {
  vIndex: number;
  vChange: number;
  tsel: {
    trust: number;
    satisfaction: number;
    engagement: number;
    loyalty: number;
  };
  riskDistribution: {
    safe: number;
    caution: number;
    danger: number;
  };
  monthlyTrend: number[];
  churnRate: number;
  retentionRate: number;
  newStudents: number;
  leftStudents: number;
}

// Mock data
const mockReportData: ReportData = {
  vIndex: 68.5,
  vChange: -2.3,
  tsel: {
    trust: 72,
    satisfaction: 65,
    engagement: 70,
    loyalty: 68,
  },
  riskDistribution: {
    safe: 85,
    caution: 10,
    danger: 5,
  },
  monthlyTrend: [72, 70, 68, 71, 69, 68.5],
  churnRate: 5.2,
  retentionRate: 87,
  newStudents: 12,
  leftStudents: 3,
};

const periodOptions = [
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
  { key: 'quarter', label: '분기' },
  { key: 'year', label: '연간' },
];

export default function ReportsScreen() {
  const navigation = useNavigation();
  const [period, setPeriod] = useState('month');
  const data = mockReportData;

  const getVIndexColor = (value: number) => {
    if (value >= 70) return colors.safe.primary;
    if (value >= 50) return colors.caution.primary;
    return colors.danger.primary;
  };

  const renderVIndexGauge = () => {
    const size = 180;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (data.vIndex / 100) * circumference;
    const color = getVIndexColor(data.vIndex);

    return (
      <GlassCard style={styles.vIndexCard} glowColor={color}>
        <Text style={styles.cardTitle}>V-Index</Text>
        <View style={styles.gaugeContainer}>
          <Svg width={size} height={size}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.gaugeCenter}>
            <Text style={[styles.gaugeValue, { color }]}>{data.vIndex.toFixed(1)}</Text>
            <View style={[styles.changeTag, { backgroundColor: data.vChange >= 0 ? colors.success.bg : colors.danger.bg }]}>
              <Ionicons
                name={data.vChange >= 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={data.vChange >= 0 ? colors.success.primary : colors.danger.primary}
              />
              <Text style={[
                styles.changeText,
                { color: data.vChange >= 0 ? colors.success.primary : colors.danger.primary }
              ]}>
                {Math.abs(data.vChange).toFixed(1)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.vIndexDesc}>
          V = R^σ (관계 지수 기반 이탈 예측)
        </Text>
      </GlassCard>
    );
  };

  const renderTSELCard = () => {
    const tselItems = [
      { key: 'trust', label: 'Trust', value: data.tsel.trust, color: colors.safe.primary },
      { key: 'satisfaction', label: 'Satisfaction', value: data.tsel.satisfaction, color: colors.caution.primary },
      { key: 'engagement', label: 'Engagement', value: data.tsel.engagement, color: colors.success.primary },
      { key: 'loyalty', label: 'Loyalty', value: data.tsel.loyalty, color: '#9B59B6' },
    ];

    return (
      <GlassCard style={styles.tselCard}>
        <Text style={styles.cardTitle}>TSEL 분석</Text>
        {tselItems.map((item) => (
          <View key={item.key} style={styles.tselRow}>
            <Text style={styles.tselLabel}>{item.label}</Text>
            <View style={styles.tselBarContainer}>
              <View style={styles.tselBarBg}>
                <View
                  style={[
                    styles.tselBarFill,
                    { width: `${item.value}%`, backgroundColor: item.color },
                  ]}
                />
              </View>
              <Text style={[styles.tselValue, { color: item.color }]}>
                {item.value}%
              </Text>
            </View>
          </View>
        ))}
      </GlassCard>
    );
  };

  const renderRiskDistribution = () => {
    const total = data.riskDistribution.safe + data.riskDistribution.caution + data.riskDistribution.danger;

    return (
      <GlassCard style={styles.riskCard}>
        <Text style={styles.cardTitle}>위험 분포</Text>
        <View style={styles.riskBarContainer}>
          <View style={styles.riskBar}>
            <View
              style={[
                styles.riskSegment,
                {
                  flex: data.riskDistribution.safe,
                  backgroundColor: colors.safe.primary,
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                },
              ]}
            />
            <View
              style={[
                styles.riskSegment,
                { flex: data.riskDistribution.caution, backgroundColor: colors.caution.primary },
              ]}
            />
            <View
              style={[
                styles.riskSegment,
                {
                  flex: data.riskDistribution.danger,
                  backgroundColor: colors.danger.primary,
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.riskLegend}>
          <View style={styles.riskLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.safe.primary }]} />
            <Text style={styles.legendLabel}>안전 {data.riskDistribution.safe}%</Text>
          </View>
          <View style={styles.riskLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.caution.primary }]} />
            <Text style={styles.legendLabel}>주의 {data.riskDistribution.caution}%</Text>
          </View>
          <View style={styles.riskLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger.primary }]} />
            <Text style={styles.legendLabel}>위험 {data.riskDistribution.danger}%</Text>
          </View>
        </View>
      </GlassCard>
    );
  };

  const renderTrendChart = () => {
    const chartWidth = SCREEN_WIDTH - spacing[8] - spacing[8];
    const chartHeight = 120;
    const padding = 20;

    const maxValue = Math.max(...data.monthlyTrend);
    const minValue = Math.min(...data.monthlyTrend);
    const range = maxValue - minValue || 10;

    const points = data.monthlyTrend.map((value, index) => {
      const x = padding + (index / (data.monthlyTrend.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((value - minValue) / range) * (chartHeight - padding * 2);
      return { x, y, value };
    });

    const pathD = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    return (
      <GlassCard style={styles.trendCard}>
        <Text style={styles.cardTitle}>V-Index 트렌드</Text>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[0, 1, 2, 3].map((i) => (
            <Line
              key={i}
              x1={padding}
              y1={padding + (i / 3) * (chartHeight - padding * 2)}
              x2={chartWidth - padding}
              y2={padding + (i / 3) * (chartHeight - padding * 2)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}

          {/* Trend line */}
          <Path
            d={pathD}
            stroke={colors.safe.primary}
            strokeWidth={2}
            fill="transparent"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={colors.safe.primary}
            />
          ))}
        </Svg>
        <View style={styles.trendLabels}>
          {['6월', '7월', '8월', '9월', '10월', '11월'].map((month, index) => (
            <Text key={index} style={styles.trendLabel}>{month}</Text>
          ))}
        </View>
      </GlassCard>
    );
  };

  const renderStatsGrid = () => (
    <View style={styles.statsGrid}>
      <GlassCard style={styles.statCard} glowColor={colors.success.primary}>
        <View style={[styles.statIcon, { backgroundColor: colors.success.bg }]}>
          <Ionicons name="repeat" size={20} color={colors.success.primary} />
        </View>
        <Text style={styles.statValue}>{data.retentionRate}%</Text>
        <Text style={styles.statLabel}>재등록률</Text>
      </GlassCard>

      <GlassCard style={styles.statCard} glowColor={colors.danger.primary}>
        <View style={[styles.statIcon, { backgroundColor: colors.danger.bg }]}>
          <Ionicons name="exit" size={20} color={colors.danger.primary} />
        </View>
        <Text style={styles.statValue}>{data.churnRate}%</Text>
        <Text style={styles.statLabel}>이탈률</Text>
      </GlassCard>

      <GlassCard style={styles.statCard} glowColor={colors.safe.primary}>
        <View style={[styles.statIcon, { backgroundColor: colors.safe.bg }]}>
          <Ionicons name="person-add" size={20} color={colors.safe.primary} />
        </View>
        <Text style={styles.statValue}>{data.newStudents}</Text>
        <Text style={styles.statLabel}>신규 등록</Text>
      </GlassCard>

      <GlassCard style={styles.statCard} glowColor={colors.caution.primary}>
        <View style={[styles.statIcon, { backgroundColor: colors.caution.bg }]}>
          <Ionicons name="person-remove" size={20} color={colors.caution.primary} />
        </View>
        <Text style={styles.statValue}>{data.leftStudents}</Text>
        <Text style={styles.statLabel}>퇴원</Text>
      </GlassCard>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        title="리포트"
        rightIcon="share-outline"
        onRightPress={() => {/* Share report */}}
      />

      {/* Period Filter */}
      <FilterTabs
        tabs={periodOptions}
        activeTab={period}
        onTabPress={(tab) => setPeriod(tab)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* V-Index Gauge */}
        {renderVIndexGauge()}

        {/* TSEL Analysis */}
        {renderTSELCard()}

        {/* Risk Distribution */}
        {renderRiskDistribution()}

        {/* Trend Chart */}
        {renderTrendChart()}

        {/* Stats Grid */}
        {renderStatsGrid()}

        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download-outline" size={20} color={colors.safe.primary} />
          <Text style={styles.exportButtonText}>리포트 내보내기 (PDF)</Text>
        </TouchableOpacity>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[4],
  },
  vIndexCard: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  changeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing[1],
  },
  changeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  vIndexDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing[3],
    textAlign: 'center',
  },
  tselCard: { marginBottom: spacing[4] },
  tselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  tselLabel: {
    width: 100,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  tselBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  tselBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tselBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  tselValue: {
    width: 40,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    textAlign: 'right',
  },
  riskCard: { marginBottom: spacing[4] },
  riskBarContainer: { marginBottom: spacing[3] },
  riskBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  riskSegment: {
    height: '100%',
  },
  riskLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  riskLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  trendCard: { marginBottom: spacing[4] },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  trendLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    width: (SCREEN_WIDTH - spacing[8] - spacing[3]) / 2 - spacing[2],
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.safe.primary,
    borderStyle: 'dashed',
  },
  exportButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.safe.primary,
  },
});
