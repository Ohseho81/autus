/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔬 StudentDetailScreen - KRATON 스타일 학생 상세 (Microscope)
 * TSEL 분석 + 위험 히스토리
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors, spacing, typography, borderRadius, getTemperatureColor } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard, FilterTabs } from '../../components/common';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');

export default function StudentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { studentId } = route.params as { studentId: string };
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const { data: studentData } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => api.getStudent(studentId),
  });

  const { data: historyData } = useQuery({
    queryKey: ['studentHistory', studentId, period],
    queryFn: () => api.getStudentRiskHistory(studentId, period),
  });

  const student = studentData?.data;
  const history = historyData?.data?.history || [];
  const tsel = student?.tsel || { trust: 0.7, satisfaction: 0.6, engagement: 0.8, loyalty: 0.5 };
  const riskScore = student?.risk_score || 65;
  const riskColor = getTemperatureColor(riskScore);

  // TSEL Radar Chart
  const renderTSELRadar = () => {
    const size = 200;
    const center = size / 2;
    const radius = 70;
    const labels = [
      { key: 'trust', label: 'Trust', angle: -90 },
      { key: 'satisfaction', label: 'Satisfaction', angle: 0 },
      { key: 'engagement', label: 'Engagement', angle: 90 },
      { key: 'loyalty', label: 'Loyalty', angle: 180 },
    ];

    const getPoint = (value: number, angle: number) => {
      const rad = (angle * Math.PI) / 180;
      const r = radius * value;
      return {
        x: center + r * Math.cos(rad),
        y: center + r * Math.sin(rad),
      };
    };

    const points = labels.map(l => getPoint(tsel[l.key as keyof typeof tsel], l.angle));
    const pathData = `M ${points[0].x} ${points[0].y} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} Z`;

    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid Lines */}
        {[0.25, 0.5, 0.75, 1].map((level, i) => (
          <Circle
            key={i}
            cx={center}
            cy={center}
            r={radius * level}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        ))}

        {/* Axis Lines */}
        {labels.map((l, i) => {
          const end = getPoint(1, l.angle);
          return (
            <Line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
            />
          );
        })}

        {/* Data Area */}
        <Path
          d={pathData}
          fill={`${colors.safe.primary}30`}
          stroke={colors.safe.primary}
          strokeWidth={2}
        />

        {/* Data Points */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={colors.safe.primary}
          />
        ))}

        {/* Labels */}
        {labels.map((l, i) => {
          const labelPoint = getPoint(1.25, l.angle);
          return (
            <SvgText
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              fill={colors.textMuted}
              fontSize={11}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {l.label.charAt(0)}
            </SvgText>
          );
        })}
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        title="학생 분석"
        rightIcon="create-outline"
        onRightPress={() => navigation.navigate('StudentEdit' as never, { studentId } as never)}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <GlassCard style={styles.profileCard} glow={riskScore >= 80 ? riskColor.glow : null}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { borderColor: riskColor.primary }]}>
              <Text style={styles.avatarText}>{student?.name?.slice(0, 1) || '?'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{student?.name || '로딩중...'}</Text>
              <Text style={styles.profileGrade}>{student?.grade} · {student?.school}</Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: riskColor.bg, borderColor: riskColor.primary }]}>
              <Text style={[styles.riskScore, { color: riskColor.primary }]}>{riskScore}°</Text>
              <Text style={[styles.riskLabel, { color: riskColor.primary }]}>
                {riskScore < 60 ? '안전' : riskScore < 80 ? '주의' : '위험'}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{student?.attendance_rate || 0}%</Text>
              <Text style={styles.quickStatLabel}>출석률</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{student?.homework_rate || 0}%</Text>
              <Text style={styles.quickStatLabel}>과제율</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{student?.grade_avg || 0}점</Text>
              <Text style={styles.quickStatLabel}>평균성적</Text>
            </View>
          </View>
        </GlassCard>

        {/* TSEL Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TSEL 분석</Text>
          <GlassCard>
            <View style={styles.tselContainer}>
              {renderTSELRadar()}
              <View style={styles.tselLegend}>
                {[
                  { key: 'trust', label: 'Trust (신뢰)', color: colors.safe.primary },
                  { key: 'satisfaction', label: 'Satisfaction (만족)', color: colors.success.primary },
                  { key: 'engagement', label: 'Engagement (참여)', color: colors.caution.primary },
                  { key: 'loyalty', label: 'Loyalty (충성)', color: colors.danger.primary },
                ].map((item) => (
                  <View key={item.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.label}</Text>
                    <Text style={[styles.legendValue, { color: item.color }]}>
                      {((tsel[item.key as keyof typeof tsel] || 0) * 100).toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Risk History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>위험 추이</Text>
          <FilterTabs
            tabs={[
              { key: 'week', label: '1주' },
              { key: 'month', label: '1개월' },
              { key: 'quarter', label: '3개월' },
              { key: 'year', label: '1년' },
            ]}
            activeTab={period}
            onTabPress={(tab) => setPeriod(tab as typeof period)}
          />
          <GlassCard style={styles.historyCard}>
            {history.length > 0 ? (
              <View style={styles.historyChart}>
                {/* Simple line representation */}
                <Text style={styles.chartPlaceholder}>📈 위험도 추이 차트</Text>
              </View>
            ) : (
              <Text style={styles.noData}>데이터가 없습니다</Text>
            )}
          </GlassCard>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => navigation.navigate('ConsultationCreate' as never, { studentId } as never)}
          >
            <Ionicons name="chatbubble" size={20} color={colors.background} />
            <Text style={styles.primaryActionText}>상담하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => {/* Generate script */}}
          >
            <Ionicons name="document-text" size={20} color={colors.safe.primary} />
            <Text style={styles.secondaryActionText}>스크립트</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  profileCard: { margin: spacing[4] },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[4] },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.text },
  profileInfo: { flex: 1, marginLeft: spacing[3] },
  profileName: { fontSize: typography.fontSize.xl, fontWeight: '600', color: colors.text },
  profileGrade: { fontSize: typography.fontSize.md, color: colors.textMuted, marginTop: 2 },
  riskBadge: {
    alignItems: 'center', padding: spacing[2],
    borderRadius: borderRadius.lg, borderWidth: 1,
  },
  riskScore: { fontSize: typography.fontSize['2xl'], fontWeight: '700' },
  riskLabel: { fontSize: typography.fontSize.xs, fontWeight: '500' },
  quickStats: { flexDirection: 'row', paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border },
  quickStatItem: { flex: 1, alignItems: 'center' },
  quickStatDivider: { width: 1, height: 40, backgroundColor: colors.border },
  quickStatValue: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text },
  quickStatLabel: { fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: 2 },
  section: { marginHorizontal: spacing[4], marginBottom: spacing[4] },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing[3] },
  tselContainer: { flexDirection: 'row', alignItems: 'center' },
  tselLegend: { flex: 1, marginLeft: spacing[2] },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing[2] },
  legendText: { flex: 1, fontSize: typography.fontSize.xs, color: colors.textMuted },
  legendValue: { fontSize: typography.fontSize.sm, fontWeight: '600' },
  historyCard: { marginTop: spacing[2] },
  historyChart: { height: 150, justifyContent: 'center', alignItems: 'center' },
  chartPlaceholder: { fontSize: typography.fontSize.lg, color: colors.textMuted },
  noData: { textAlign: 'center', color: colors.textDim, padding: spacing[4] },
  actions: { flexDirection: 'row', gap: spacing[3], marginHorizontal: spacing[4] },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: borderRadius.lg },
  primaryAction: { backgroundColor: colors.safe.primary },
  secondaryAction: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.safe.primary },
  primaryActionText: { fontSize: typography.fontSize.md, fontWeight: '600', color: colors.background },
  secondaryActionText: { fontSize: typography.fontSize.md, fontWeight: '600', color: colors.safe.primary },
});
