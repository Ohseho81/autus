/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔮 ForecastScreen - KRATON 스타일 예측 화면 (Cycle 6)
 * 퇴원 예측 + 시간별 그라디언트
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
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard, FilterTabs } from '../../components/common';

const { width } = Dimensions.get('window');

interface ForecastStudent {
  id: string;
  name: string;
  current_risk: number;
  predicted_risk_30d: number;
  predicted_risk_60d: number;
  predicted_risk_90d: number;
  churn_probability: number;
  estimated_loss: number;
}

// Mock data
const mockForecast: ForecastStudent[] = [
  { id: '1', name: '김민수', current_risk: 85, predicted_risk_30d: 92, predicted_risk_60d: 95, predicted_risk_90d: 98, churn_probability: 0.85, estimated_loss: 3600000 },
  { id: '2', name: '이서연', current_risk: 72, predicted_risk_30d: 78, predicted_risk_60d: 82, predicted_risk_90d: 85, churn_probability: 0.55, estimated_loss: 2400000 },
  { id: '3', name: '박지훈', current_risk: 65, predicted_risk_30d: 68, predicted_risk_60d: 70, predicted_risk_90d: 72, churn_probability: 0.35, estimated_loss: 1800000 },
];

export default function ForecastScreen() {
  const navigation = useNavigation();
  const [period, setPeriod] = useState<'30d' | '60d' | '90d'>('30d');

  const totalEstimatedLoss = mockForecast.reduce((sum, s) => sum + s.estimated_loss, 0);
  const avgChurnProbability = mockForecast.reduce((sum, s) => sum + s.churn_probability, 0) / mockForecast.length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value);
  };

  const getGradientColors = (risk: number): [string, string] => {
    if (risk < 60) return [colors.safe.primary, colors.success.primary];
    if (risk < 80) return [colors.caution.primary, colors.danger.primary];
    return [colors.danger.primary, '#FF0040'];
  };

  const renderForecastChart = () => {
    const chartWidth = width - spacing[4] * 2 - spacing[4] * 2;
    const chartHeight = 200;
    const barWidth = (chartWidth - 40) / 4;
    const periods = ['현재', '30일', '60일', '90일'];

    return (
      <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map((val, i) => (
          <React.Fragment key={i}>
            <Line
              x1={30}
              y1={chartHeight - 30 - (val / 100) * (chartHeight - 50)}
              x2={chartWidth}
              y2={chartHeight - 30 - (val / 100) * (chartHeight - 50)}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
            />
            <SvgText
              x={0}
              y={chartHeight - 30 - (val / 100) * (chartHeight - 50) + 4}
              fill={colors.textDim}
              fontSize={10}
            >
              {val}°
            </SvgText>
          </React.Fragment>
        ))}

        {/* Bars */}
        {mockForecast.slice(0, 1).map((student, si) => {
          const risks = [student.current_risk, student.predicted_risk_30d, student.predicted_risk_60d, student.predicted_risk_90d];
          return risks.map((risk, i) => {
            const barHeight = (risk / 100) * (chartHeight - 50);
            const x = 40 + i * barWidth + (barWidth - 30) / 2;
            const y = chartHeight - 30 - barHeight;
            const gradientColors = getGradientColors(risk);

            return (
              <React.Fragment key={`${si}-${i}`}>
                <Rect
                  x={x}
                  y={y}
                  width={30}
                  height={barHeight}
                  rx={6}
                  fill={gradientColors[0]}
                  opacity={0.8}
                />
                <SvgText
                  x={x + 15}
                  y={y - 8}
                  fill={colors.text}
                  fontSize={12}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {risk}°
                </SvgText>
              </React.Fragment>
            );
          });
        })}

        {/* X Axis Labels */}
        {periods.map((label, i) => (
          <SvgText
            key={i}
            x={40 + i * barWidth + barWidth / 2}
            y={chartHeight - 10}
            fill={colors.textMuted}
            fontSize={11}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    );
  };

  const renderStudentCard = (student: ForecastStudent) => {
    const risk = period === '30d' ? student.predicted_risk_30d
      : period === '60d' ? student.predicted_risk_60d
      : student.predicted_risk_90d;
    const gradientColors = getGradientColors(risk);

    return (
      <GlassCard key={student.id} style={styles.studentCard} padding={spacing[4]}>
        <View style={styles.studentHeader}>
          <View style={styles.studentInfo}>
            <View style={[styles.avatar, { borderColor: gradientColors[0] }]}>
              <Text style={styles.avatarText}>{student.name.slice(0, 1)}</Text>
            </View>
            <View>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.currentRisk}>현재 {student.current_risk}° → {period} 후 {risk}°</Text>
            </View>
          </View>
          <View style={[styles.probabilityBadge, { backgroundColor: `${gradientColors[0]}15` }]}>
            <Text style={[styles.probabilityText, { color: gradientColors[0] }]}>
              퇴원확률 {(student.churn_probability * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Risk Progression */}
        <View style={styles.progressionContainer}>
          <LinearGradient
            colors={[colors.safe.primary, colors.caution.primary, colors.danger.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressionBar}
          >
            <View style={[styles.currentMarker, { left: `${student.current_risk}%` }]} />
            <View style={[styles.predictedMarker, { left: `${risk}%` }]} />
          </LinearGradient>
        </View>

        {/* Estimated Loss */}
        <View style={styles.lossContainer}>
          <Text style={styles.lossLabel}>예상 손실</Text>
          <Text style={[styles.lossValue, { color: colors.danger.primary }]}>
            {formatCurrency(student.estimated_loss)}
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('StudentDetail' as never, { studentId: student.id } as never)}
        >
          <Text style={styles.actionButtonText}>상세 분석</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.safe.primary} />
        </TouchableOpacity>
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
        title="퇴원 예측"
        rightIcon="analytics-outline"
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <GlassCard style={styles.summaryCard}>
            <Ionicons name="trending-up" size={24} color={colors.danger.primary} />
            <Text style={[styles.summaryValue, { color: colors.danger.primary }]}>
              {(avgChurnProbability * 100).toFixed(0)}%
            </Text>
            <Text style={styles.summaryLabel}>평균 퇴원확률</Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard}>
            <Ionicons name="cash-outline" size={24} color={colors.caution.primary} />
            <Text style={[styles.summaryValue, { color: colors.caution.primary }]}>
              {formatCurrency(totalEstimatedLoss)}
            </Text>
            <Text style={styles.summaryLabel}>예상 총 손실</Text>
          </GlassCard>
        </View>

        {/* Forecast Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>위험도 예측 추이</Text>
          <GlassCard>
            {renderForecastChart()}
          </GlassCard>
        </View>

        {/* Period Filter */}
        <FilterTabs
          tabs={[
            { key: '30d', label: '30일 후' },
            { key: '60d', label: '60일 후' },
            { key: '90d', label: '90일 후' },
          ]}
          activeTab={period}
          onTabPress={(tab) => setPeriod(tab as typeof period)}
        />

        {/* Student List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>퇴원 위험 학생</Text>
          {mockForecast.map(renderStudentCard)}
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: spacing[3], padding: spacing[4] },
  summaryCard: { flex: 1, alignItems: 'center', padding: spacing[4] },
  summaryValue: { fontSize: typography.fontSize.xl, fontWeight: '700', marginTop: spacing[2] },
  summaryLabel: { fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: spacing[1] },
  section: { padding: spacing[4], paddingTop: 0 },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing[3] },
  studentCard: { marginBottom: spacing[3] },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  studentInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarText: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.text },
  studentName: { marginLeft: spacing[2], fontSize: typography.fontSize.md, fontWeight: '600', color: colors.text },
  currentRisk: { marginLeft: spacing[2], fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: 2 },
  probabilityBadge: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: borderRadius.md },
  probabilityText: { fontSize: typography.fontSize.xs, fontWeight: '600' },
  progressionContainer: { marginTop: spacing[4] },
  progressionBar: { height: 8, borderRadius: 4, position: 'relative' },
  currentMarker: { position: 'absolute', top: -4, width: 4, height: 16, backgroundColor: colors.text, borderRadius: 2 },
  predictedMarker: { position: 'absolute', top: -4, width: 4, height: 16, backgroundColor: colors.danger.primary, borderRadius: 2, borderWidth: 1, borderColor: colors.text },
  lossContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border },
  lossLabel: { fontSize: typography.fontSize.sm, color: colors.textMuted },
  lossValue: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], marginTop: spacing[3], paddingVertical: spacing[2], borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.safe.primary },
  actionButtonText: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.safe.primary },
});
