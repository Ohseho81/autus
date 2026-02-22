/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📈 HistoryScreen - AUTUS v1.0 Consumer 변화 기록 화면
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Consumer (학부모/고객)가 보는 변화 추이 화면
 * - V-Index 변화 그래프
 * - 월별/분기별 히스토리
 * - Outcome 증명 데이터
 * - 0 입력 (Passive View Only)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L } from '../../config/labelMap';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type TimeRange = '1M' | '3M' | '6M' | '1Y';

interface DataPoint {
  date: string;
  value: number;
  label: string;
}

interface MilestoneEvent {
  date: string;
  type: 'achievement' | 'attendance' | 'improvement';
  title: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function HistoryScreen() {
  const { config } = useIndustryConfig();
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [refreshing, setRefreshing] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Mock Data
  // ─────────────────────────────────────────────────────────────────────────────

  const chartData: DataPoint[] = useMemo(() => {
    // 3개월 데이터 예시
    return [
      { date: '11/1', value: 62, label: '11월 1주' },
      { date: '11/8', value: 65, label: '11월 2주' },
      { date: '11/15', value: 63, label: '11월 3주' },
      { date: '11/22', value: 68, label: '11월 4주' },
      { date: '11/29', value: 70, label: '11월 5주' },
      { date: '12/6', value: 69, label: '12월 1주' },
      { date: '12/13', value: 72, label: '12월 2주' },
      { date: '12/20', value: 74, label: '12월 3주' },
      { date: '12/27', value: 73, label: '12월 4주' },
      { date: '1/3', value: 75, label: '1월 1주' },
      { date: '1/10', value: 76, label: '1월 2주' },
      { date: '1/17', value: 78, label: '1월 3주' },
    ];
  }, [timeRange]);

  const milestones: MilestoneEvent[] = [
    {
      date: '1월 15일',
      type: 'achievement',
      title: '100회 출석 달성! 🎉',
      description: '꾸준한 참여로 100번째 출석을 달성했습니다.',
    },
    {
      date: '12월 20일',
      type: 'improvement',
      title: 'V-Index 70° 돌파',
      description: '성장세가 안정적으로 유지되고 있습니다.',
    },
    {
      date: '11월 8일',
      type: 'attendance',
      title: '4주 연속 출석',
      description: '한 달간 빠짐없이 참여했습니다.',
    },
  ];

  const stats = useMemo(() => {
    const first = chartData[0]?.value ?? 0;
    const last = chartData[chartData.length - 1]?.value ?? 0;
    const change = last - first;
    const max = Math.max(...chartData.map(d => d.value));
    const min = Math.min(...chartData.map(d => d.value));
    const avg = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length : 0;

    return {
      start: first,
      current: last,
      change,
      changePercent: first > 0 ? ((change / first) * 100).toFixed(1) : '0.0',
      max,
      min,
      avg: Math.round(avg),
    };
  }, [chartData]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Chart Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  const renderChart = () => {
    const width = Dimensions.get('window').width - spacing[4] * 2;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const minValue = Math.min(...chartData.map(d => d.value)) - 5;
    const maxValue = Math.max(...chartData.map(d => d.value)) + 5;
    
    const xScale = (index: number) =>
      padding.left + (chartData.length > 1 ? (index / (chartData.length - 1)) : 0.5) * chartWidth;
    const yScale = (value: number) =>
      padding.top + chartHeight - ((maxValue - minValue) > 0 ? ((value - minValue) / (maxValue - minValue)) : 0.5) * chartHeight;

    // Create path
    const pathD = chartData.map((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <View style={styles.chartContainer}>
        <Svg width={width} height={height}>
          {/* Grid Lines */}
          {[0, 25, 50, 75, 100].map((percent, i) => {
            const y = padding.top + (chartHeight * (100 - percent)) / 100;
            const value = minValue + ((maxValue - minValue) * percent) / 100;
            return (
              <React.Fragment key={i}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={colors.border.primary}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill={colors.text.muted}
                >
                  {Math.round(value)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Area Fill */}
          <Path
            d={`${pathD} L ${xScale(chartData.length - 1)} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`}
            fill={`${config.color.primary}15`}
          />

          {/* Line */}
          <Path
            d={pathD}
            stroke={config.color.primary}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {chartData.map((point, index) => (
            <Circle
              key={index}
              cx={xScale(index)}
              cy={yScale(point.value)}
              r={4}
              fill={colors.background}
              stroke={config.color.primary}
              strokeWidth={2}
            />
          ))}

          {/* X-axis Labels */}
          {chartData.filter((_, i) => i % 3 === 0 || i === chartData.length - 1).map((point, index) => {
            const actualIndex = index * 3 >= chartData.length ? chartData.length - 1 : index * 3;
            return (
              <SvgText
                key={actualIndex}
                x={xScale(actualIndex)}
                y={height - 8}
                textAnchor="middle"
                fontSize={10}
                fill={colors.text.muted}
              >
                {chartData[actualIndex].date}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const getMilestoneIcon = (type: MilestoneEvent['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'achievement': return 'trophy';
      case 'attendance': return 'calendar-outline';
      case 'improvement': return 'trending-up';
    }
  };

  const getMilestoneColor = (type: MilestoneEvent['type']) => {
    switch (type) {
      case 'achievement': return '#FFD700';
      case 'attendance': return colors.success.primary;
      case 'improvement': return config.color.primary;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>변화 기록</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={config.color.primary} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.rangeSelector}>
          {(['1M', '3M', '6M', '1Y'] as TimeRange[]).map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.rangeButton,
                timeRange === range && { backgroundColor: config.color.primary }
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[
                styles.rangeButtonText,
                timeRange === range && styles.rangeButtonTextActive
              ]}>
                {range === '1M' ? '1개월' : range === '3M' ? '3개월' : range === '6M' ? '6개월' : '1년'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>시작</Text>
              <Text style={styles.summaryValue}>{stats.start}°</Text>
            </View>
            <View style={styles.summaryArrow}>
              <Ionicons name="arrow-forward" size={24} color={colors.text.muted} />
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>현재</Text>
              <Text style={[styles.summaryValue, { color: config.color.primary }]}>{stats.current}°</Text>
            </View>
            <View style={[styles.changeBadge, { backgroundColor: stats.change >= 0 ? `${colors.success.primary}20` : `${colors.danger.primary}20` }]}>
              <Ionicons 
                name={stats.change >= 0 ? 'trending-up' : 'trending-down'} 
                size={16} 
                color={stats.change >= 0 ? colors.success.primary : colors.danger.primary} 
              />
              <Text style={[styles.changeValue, { color: stats.change >= 0 ? colors.success.primary : colors.danger.primary }]}>
                {stats.change >= 0 ? '+' : ''}{stats.change}° ({stats.changePercent}%)
              </Text>
            </View>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>최고</Text>
              <Text style={styles.statValue}>{stats.max}°</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>최저</Text>
              <Text style={styles.statValue}>{stats.min}°</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>평균</Text>
              <Text style={styles.statValue}>{stats.avg}°</Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>V-Index 추이</Text>
          {renderChart()}
        </View>

        {/* Milestones */}
        <View style={styles.milestonesCard}>
          <Text style={styles.milestonesTitle}>🏆 주요 기록</Text>
          <View style={styles.milestonesList}>
            {milestones.map((milestone, index) => (
              <View key={index} style={styles.milestoneItem}>
                <View style={[styles.milestoneIcon, { backgroundColor: `${getMilestoneColor(milestone.type)}20` }]}>
                  <Ionicons name={getMilestoneIcon(milestone.type)} size={20} color={getMilestoneColor(milestone.type)} />
                </View>
                <View style={styles.milestoneContent}>
                  <View style={styles.milestoneHeader}>
                    <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                    <Text style={styles.milestoneDate}>{milestone.date}</Text>
                  </View>
                  <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                </View>
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

  // Header
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },

  // Range Selector
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  rangeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    fontWeight: '500',
  },
  rangeButtonTextActive: {
    color: '#fff',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    gap: spacing[3],
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginBottom: spacing[1],
  },
  summaryValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
  },
  summaryArrow: {
    paddingHorizontal: spacing[2],
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  changeValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  statValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[1],
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.primary,
  },

  // Chart Card
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  chartTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  chartContainer: {
    alignItems: 'center',
  },

  // Milestones
  milestonesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  milestonesTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  milestonesList: {
    gap: spacing[3],
  },
  milestoneItem: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  milestoneTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  milestoneDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  milestoneDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
});
