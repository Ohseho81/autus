/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔔 NotificationSettingsScreen - KRATON 스타일 알림 설정
 * 푸시 알림 + 이메일/SMS 알림 설정
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

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  riskAlerts: boolean;
  attendanceAlerts: boolean;
  paymentAlerts: boolean;
  consultationReminders: boolean;
  marketingMessages: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    riskAlerts: true,
    attendanceAlerts: true,
    paymentAlerts: true,
    consultationReminders: true,
    marketingMessages: false,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    Alert.alert(
      '저장',
      '알림 설정을 저장할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: () => {
            setHasChanges(false);
            Alert.alert('완료', '알림 설정이 저장되었습니다.');
          }
        },
      ]
    );
  };

  const renderToggle = (value: boolean, onToggle: () => void) => (
    <TouchableOpacity
      style={[styles.toggle, value && styles.toggleActive]}
      onPress={onToggle}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
    </TouchableOpacity>
  );

  const renderSettingItem = (
    icon: string,
    label: string,
    desc: string,
    value: boolean,
    key: keyof NotificationSettings,
    color?: string
  ) => (
    <View style={styles.settingItem}>
      <View style={[styles.settingIcon, { backgroundColor: `${color || colors.safe.primary}15` }]}>
        <Ionicons name={icon as any} size={20} color={color || colors.safe.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      {renderToggle(value, () => toggleSetting(key))}
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
        title="알림 설정"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Channels */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>알림 채널</Text>
          <Text style={styles.cardSubtitle}>알림을 받을 방법을 선택하세요</Text>

          {renderSettingItem(
            'notifications',
            '푸시 알림',
            '앱 알림을 받습니다',
            settings.pushEnabled,
            'pushEnabled'
          )}
          {renderSettingItem(
            'mail',
            '이메일 알림',
            '중요 알림을 이메일로 받습니다',
            settings.emailEnabled,
            'emailEnabled',
            colors.caution.primary
          )}
          {renderSettingItem(
            'chatbubble',
            'SMS 알림',
            '긴급 알림을 문자로 받습니다',
            settings.smsEnabled,
            'smsEnabled',
            colors.success.primary
          )}
        </GlassCard>

        {/* Alert Types */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>알림 유형</Text>
          <Text style={styles.cardSubtitle}>받고 싶은 알림을 선택하세요</Text>

          {renderSettingItem(
            'warning',
            '위험 알림',
            '위험 학생 발생 시 알림',
            settings.riskAlerts,
            'riskAlerts',
            colors.danger.primary
          )}
          {renderSettingItem(
            'calendar',
            '출석 알림',
            '결석, 지각 발생 시 알림',
            settings.attendanceAlerts,
            'attendanceAlerts'
          )}
          {renderSettingItem(
            'card',
            '수납 알림',
            '미납, 결제 완료 시 알림',
            settings.paymentAlerts,
            'paymentAlerts',
            colors.caution.primary
          )}
          {renderSettingItem(
            'chatbubble-ellipses',
            '상담 알림',
            '상담 예정 1시간 전 알림',
            settings.consultationReminders,
            'consultationReminders',
            colors.success.primary
          )}
          {renderSettingItem(
            'megaphone',
            '마케팅 메시지',
            '새로운 기능 및 이벤트 안내',
            settings.marketingMessages,
            'marketingMessages',
            '#9B59B6'
          )}
        </GlassCard>

        {/* Quiet Hours */}
        <GlassCard style={styles.card}>
          <View style={styles.quietHoursHeader}>
            <View>
              <Text style={styles.cardTitle}>방해금지 시간</Text>
              <Text style={styles.cardSubtitle}>이 시간에는 알림이 오지 않습니다</Text>
            </View>
            {renderToggle(settings.quietHoursEnabled, () => toggleSetting('quietHoursEnabled'))}
          </View>

          {settings.quietHoursEnabled && (
            <View style={styles.quietHoursTime}>
              <View style={styles.timeDisplay}>
                <Ionicons name="moon" size={20} color={colors.caution.primary} />
                <Text style={styles.timeText}>
                  {settings.quietHoursStart} ~ {settings.quietHoursEnd}
                </Text>
              </View>
              <TouchableOpacity style={styles.editTimeButton}>
                <Text style={styles.editTimeButtonText}>변경</Text>
              </TouchableOpacity>
            </View>
          )}
        </GlassCard>

        {/* Info Card */}
        <GlassCard style={styles.infoCard} glowColor={colors.safe.primary}>
          <Ionicons name="information-circle" size={24} color={colors.safe.primary} />
          <Text style={styles.infoText}>
            위험 알림과 긴급 상담 알림은 방해금지 시간에도 전송됩니다.
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
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing[4],
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
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
  quietHoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  quietHoursTime: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  timeText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  editTimeButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editTimeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.safe.primary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
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
