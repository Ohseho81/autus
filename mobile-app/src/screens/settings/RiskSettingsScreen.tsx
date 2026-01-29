/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️ RiskSettingsScreen - KRATON 스타일 위험 설정
 * 위험도 임계값 + TSEL 가중치 + AI 분석 설정
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line } from 'react-native-svg';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';

interface RiskSettings {
  dangerThreshold: number;
  cautionThreshold: number;
  tselWeights: {
    trust: number;
    satisfaction: number;
    engagement: number;
    loyalty: number;
  };
  autoAlerts: boolean;
  aiRecommendations: boolean;
  forecastDays: number;
}

const forecastOptions = [7, 14, 30, 60, 90];

export default function RiskSettingsScreen() {
  const navigation = useNavigation();
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<RiskSettings>({
    dangerThreshold: 40,
    cautionThreshold: 70,
    tselWeights: {
      trust: 25,
      satisfaction: 30,
      engagement: 25,
      loyalty: 20,
    },
    autoAlerts: true,
    aiRecommendations: true,
    forecastDays: 30,
  });

  const adjustThreshold = (type: 'danger' | 'caution', delta: number) => {
    setSettings(prev => {
      const key = type === 'danger' ? 'dangerThreshold' : 'cautionThreshold';
      const newValue = Math.max(0, Math.min(100, prev[key] + delta));

      // Ensure danger < caution
      if (type === 'danger' && newValue >= prev.cautionThreshold) return prev;
      if (type === 'caution' && newValue <= prev.dangerThreshold) return prev;

      return { ...prev, [key]: newValue };
    });
    setHasChanges(true);
  };

  const adjustWeight = (key: keyof RiskSettings['tselWeights'], delta: number) => {
    setSettings(prev => {
      const currentWeight = prev.tselWeights[key];
      const newWeight = Math.max(0, Math.min(100, currentWeight + delta));

      // Calculate the change
      const change = newWeight - currentWeight;
      if (change === 0) return prev;

      // Adjust other weights proportionally
      const otherKeys = Object.keys(prev.tselWeights).filter(k => k !== key) as Array<keyof RiskSettings['tselWeights']>;
      const otherTotal = otherKeys.reduce((sum, k) => sum + prev.tselWeights[k], 0);

      if (otherTotal === 0) return prev;

      const newWeights = { ...prev.tselWeights, [key]: newWeight };
      const adjustmentRatio = (otherTotal - change) / otherTotal;

      otherKeys.forEach(k => {
        newWeights[k] = Math.round(prev.tselWeights[k] * adjustmentRatio);
      });

      // Ensure total is 100
      const total = Object.values(newWeights).reduce((sum, v) => sum + v, 0);
      if (total !== 100) {
        const diff = 100 - total;
        newWeights[otherKeys[0]] += diff;
      }

      return { ...prev, tselWeights: newWeights };
    });
    setHasChanges(true);
  };

  const toggleSetting = (key: 'autoAlerts' | 'aiRecommendations') => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSave = () => {
    Alert.alert(
      '저장',
      '위험 설정을 저장할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: () => {
            setHasChanges(false);
            Alert.alert('완료', '위험 설정이 저장되었습니다.');
          }
        },
      ]
    );
  };

  const renderThresholdBar = () => {
    const width = 280;
    const height = 40;
    const dangerWidth = (settings.dangerThreshold / 100) * width;
    const cautionWidth = ((settings.cautionThreshold - settings.dangerThreshold) / 100) * width;

    return (
      <View style={styles.thresholdBarContainer}>
        <View style={styles.thresholdBar}>
          <View style={[styles.dangerZone, { width: dangerWidth }]} />
          <View style={[styles.cautionZone, { width: cautionWidth }]} />
          <View style={styles.safeZone} />
        </View>
        <View style={styles.thresholdLabels}>
          <Text style={styles.thresholdLabel}>0</Text>
          <Text style={[styles.thresholdLabel, { left: `${settings.dangerThreshold}%` }]}>
            {settings.dangerThreshold}
          </Text>
          <Text style={[styles.thresholdLabel, { left: `${settings.cautionThreshold}%` }]}>
            {settings.cautionThreshold}
          </Text>
          <Text style={[styles.thresholdLabel, { right: 0 }]}>100</Text>
        </View>
      </View>
    );
  };

  const renderWeightSlider = (
    label: string,
    key: keyof RiskSettings['tselWeights'],
    color: string
  ) => (
    <View style={styles.weightItem}>
      <View style={styles.weightHeader}>
        <Text style={styles.weightLabel}>{label}</Text>
        <Text style={[styles.weightValue, { color }]}>{settings.tselWeights[key]}%</Text>
      </View>
      <View style={styles.weightControls}>
        <TouchableOpacity
          style={styles.weightButton}
          onPress={() => adjustWeight(key, -5)}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.weightBarContainer}>
          <View style={styles.weightBarBg}>
            <View
              style={[
                styles.weightBarFill,
                { width: `${settings.tselWeights[key]}%`, backgroundColor: color },
              ]}
            />
          </View>
        </View>
        <TouchableOpacity
          style={styles.weightButton}
          onPress={() => adjustWeight(key, 5)}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderToggle = (value: boolean, onToggle: () => void) => (
    <TouchableOpacity
      style={[styles.toggle, value && styles.toggleActive]}
      onPress={onToggle}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
    </TouchableOpacity>
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
        title="위험 설정"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Risk Thresholds */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="speedometer" size={20} color={colors.danger.primary} />
            <Text style={styles.cardTitle}>위험도 임계값</Text>
          </View>
          <Text style={styles.cardDesc}>
            V-Index 기준으로 위험 등급을 분류합니다
          </Text>

          {renderThresholdBar()}

          <View style={styles.thresholdControls}>
            <View style={styles.thresholdControl}>
              <View style={[styles.thresholdDot, { backgroundColor: colors.danger.primary }]} />
              <Text style={styles.thresholdControlLabel}>위험</Text>
              <Text style={styles.thresholdControlDesc}>0 ~ {settings.dangerThreshold}</Text>
              <View style={styles.thresholdButtons}>
                <TouchableOpacity
                  style={styles.thresholdButton}
                  onPress={() => adjustThreshold('danger', -5)}
                >
                  <Ionicons name="remove" size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.thresholdButton}
                  onPress={() => adjustThreshold('danger', 5)}
                >
                  <Ionicons name="add" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.thresholdControl}>
              <View style={[styles.thresholdDot, { backgroundColor: colors.caution.primary }]} />
              <Text style={styles.thresholdControlLabel}>주의</Text>
              <Text style={styles.thresholdControlDesc}>{settings.dangerThreshold} ~ {settings.cautionThreshold}</Text>
              <View style={styles.thresholdButtons}>
                <TouchableOpacity
                  style={styles.thresholdButton}
                  onPress={() => adjustThreshold('caution', -5)}
                >
                  <Ionicons name="remove" size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.thresholdButton}
                  onPress={() => adjustThreshold('caution', 5)}
                >
                  <Ionicons name="add" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.thresholdControl}>
              <View style={[styles.thresholdDot, { backgroundColor: colors.safe.primary }]} />
              <Text style={styles.thresholdControlLabel}>안전</Text>
              <Text style={styles.thresholdControlDesc}>{settings.cautionThreshold} ~ 100</Text>
            </View>
          </View>
        </GlassCard>

        {/* TSEL Weights */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart" size={20} color={colors.safe.primary} />
            <Text style={styles.cardTitle}>TSEL 가중치</Text>
          </View>
          <Text style={styles.cardDesc}>
            각 요소의 V-Index 기여도를 조절합니다 (합계: 100%)
          </Text>

          {renderWeightSlider('Trust (신뢰)', 'trust', colors.safe.primary)}
          {renderWeightSlider('Satisfaction (만족)', 'satisfaction', colors.caution.primary)}
          {renderWeightSlider('Engagement (참여)', 'engagement', colors.success.primary)}
          {renderWeightSlider('Loyalty (충성)', 'loyalty', '#9B59B6')}

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setSettings(prev => ({
                ...prev,
                tselWeights: { trust: 25, satisfaction: 30, engagement: 25, loyalty: 20 },
              }));
              setHasChanges(true);
            }}
          >
            <Ionicons name="refresh" size={16} color={colors.textMuted} />
            <Text style={styles.resetButtonText}>기본값으로 초기화</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* AI Settings */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color={colors.caution.primary} />
            <Text style={styles.cardTitle}>AI 분석 설정</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>자동 위험 알림</Text>
              <Text style={styles.settingDesc}>위험 학생 발생 시 자동으로 알림</Text>
            </View>
            {renderToggle(settings.autoAlerts, () => toggleSetting('autoAlerts'))}
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI 추천 조치</Text>
              <Text style={styles.settingDesc}>AI가 분석한 추천 조치 표시</Text>
            </View>
            {renderToggle(settings.aiRecommendations, () => toggleSetting('aiRecommendations'))}
          </View>

          <View style={styles.forecastSection}>
            <Text style={styles.settingLabel}>예측 기간</Text>
            <View style={styles.forecastOptions}>
              {forecastOptions.map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.forecastButton,
                    settings.forecastDays === days && styles.forecastButtonActive,
                  ]}
                  onPress={() => {
                    setSettings(prev => ({ ...prev, forecastDays: days }));
                    setHasChanges(true);
                  }}
                >
                  <Text style={[
                    styles.forecastButtonText,
                    settings.forecastDays === days && styles.forecastButtonTextActive,
                  ]}>
                    {days}일
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </GlassCard>

        {/* Formula Info */}
        <GlassCard style={styles.formulaCard} glowColor={colors.safe.primary}>
          <Text style={styles.formulaTitle}>V-Index 공식</Text>
          <Text style={styles.formulaText}>V = R^σ</Text>
          <Text style={styles.formulaDesc}>
            V (V-Index) = R (Relationship: TSEL 합산) ^ σ (Environment: 환경 변수)
          </Text>
        </GlassCard>

        {/* Save Button */}
        {hasChanges && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient
              colors={[colors.safe.primary, '#0099CC']}
              style={styles.saveButtonGradient}
            >
              <Ionicons name="checkmark" size={20} color={colors.background} />
              <Text style={styles.saveButtonText}>변경사항 저장</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },
  card: { marginBottom: spacing[4] },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  cardDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing[4],
  },
  thresholdBarContainer: {
    marginBottom: spacing[4],
  },
  thresholdBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dangerZone: {
    backgroundColor: colors.danger.primary,
  },
  cautionZone: {
    backgroundColor: colors.caution.primary,
  },
  safeZone: {
    flex: 1,
    backgroundColor: colors.safe.primary,
  },
  thresholdLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1],
    position: 'relative',
  },
  thresholdLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    position: 'absolute',
  },
  thresholdControls: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  thresholdControl: {
    flex: 1,
    alignItems: 'center',
  },
  thresholdDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing[1],
  },
  thresholdControlLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  thresholdControlDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  thresholdButtons: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  thresholdButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightItem: {
    marginBottom: spacing[4],
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  weightLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  weightValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  weightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  weightButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightBarContainer: { flex: 1 },
  weightBarBg: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  resetButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: { flex: 1 },
  settingLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  settingDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.safe.bg,
    borderColor: colors.safe.primary,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textMuted,
  },
  toggleKnobActive: {
    backgroundColor: colors.safe.primary,
    alignSelf: 'flex-end',
  },
  forecastSection: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  forecastOptions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  forecastButton: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  forecastButtonActive: {
    backgroundColor: colors.caution.bg,
    borderColor: colors.caution.primary,
  },
  forecastButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  forecastButtonTextActive: {
    color: colors.caution.primary,
    fontWeight: '600',
  },
  formulaCard: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  formulaTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  formulaText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.safe.primary,
    marginBottom: spacing[2],
  },
  formulaDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  saveButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
});
