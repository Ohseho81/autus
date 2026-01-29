/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚙️ SettingsScreen - KRATON 스타일 설정 화면
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';
import { api } from '../../services/api';

interface SettingsItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  type: 'navigate' | 'toggle' | 'action';
  route?: string;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  color?: string;
}

export default function SettingsScreen() {
  const navigation = useNavigation();

  const { data: notificationSettings, refetch } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => api.getNotificationSettings(),
  });

  const [pushEnabled, setPushEnabled] = useState(notificationSettings?.data?.push_enabled ?? true);
  const [riskAlert, setRiskAlert] = useState(notificationSettings?.data?.risk_alert ?? true);
  const [paymentAlert, setPaymentAlert] = useState(notificationSettings?.data?.payment_alert ?? true);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateNotificationSettings(data),
    onSuccess: () => refetch(),
  });

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => api.logout() },
      ]
    );
  };

  const settingsSections = [
    {
      title: '계정',
      items: [
        { key: 'profile', icon: 'person-outline', label: '프로필 설정', type: 'navigate', route: 'ProfileSettings' },
        { key: 'academy', icon: 'business-outline', label: '학원 정보', type: 'navigate', route: 'AcademySettings' },
        { key: 'password', icon: 'lock-closed-outline', label: '비밀번호 변경', type: 'navigate', route: 'PasswordChange' },
      ] as SettingsItem[],
    },
    {
      title: '위험 감지',
      items: [
        { key: 'riskSettings', icon: 'thermometer-outline', label: '위험 감지 설정', type: 'navigate', route: 'RiskSettings' },
        { key: 'thresholds', icon: 'options-outline', label: '임계값 설정', type: 'navigate', route: 'ThresholdSettings' },
        { key: 'weights', icon: 'scale-outline', label: '가중치 설정', type: 'navigate', route: 'WeightSettings' },
      ] as SettingsItem[],
    },
    {
      title: '알림',
      items: [
        {
          key: 'push', icon: 'notifications-outline', label: '푸시 알림', type: 'toggle',
          value: pushEnabled,
          onToggle: (value) => {
            setPushEnabled(value);
            updateMutation.mutate({ push_enabled: value });
          },
        },
        {
          key: 'risk', icon: 'warning-outline', label: '위험 알림', type: 'toggle',
          value: riskAlert,
          onToggle: (value) => {
            setRiskAlert(value);
            updateMutation.mutate({ risk_alert: value });
          },
        },
        {
          key: 'payment', icon: 'card-outline', label: '수납 알림', type: 'toggle',
          value: paymentAlert,
          onToggle: (value) => {
            setPaymentAlert(value);
            updateMutation.mutate({ payment_alert: value });
          },
        },
        { key: 'notifSettings', icon: 'settings-outline', label: '상세 알림 설정', type: 'navigate', route: 'NotificationSettings' },
      ] as SettingsItem[],
    },
    {
      title: '지원',
      items: [
        { key: 'help', icon: 'help-circle-outline', label: '도움말', type: 'navigate', route: 'Help' },
        { key: 'feedback', icon: 'chatbox-outline', label: '피드백 보내기', type: 'navigate', route: 'Feedback' },
        { key: 'terms', icon: 'document-text-outline', label: '이용약관', type: 'navigate', route: 'Terms' },
        { key: 'privacy', icon: 'shield-outline', label: '개인정보처리방침', type: 'navigate', route: 'Privacy' },
      ] as SettingsItem[],
    },
    {
      title: '',
      items: [
        {
          key: 'logout', icon: 'log-out-outline', label: '로그아웃', type: 'action',
          color: colors.danger.primary,
          onPress: handleLogout,
        },
      ] as SettingsItem[],
    },
  ];

  const renderSettingItem = (item: SettingsItem) => {
    return (
      <TouchableOpacity
        key={item.key}
        style={styles.settingItem}
        onPress={() => {
          if (item.type === 'navigate' && item.route) {
            navigation.navigate(item.route as never);
          } else if (item.type === 'action' && item.onPress) {
            item.onPress();
          }
        }}
        disabled={item.type === 'toggle'}
      >
        <View style={[styles.settingIcon, item.color && { backgroundColor: `${item.color}15` }]}>
          <Ionicons
            name={item.icon}
            size={20}
            color={item.color || colors.safe.primary}
          />
        </View>
        <Text style={[styles.settingLabel, item.color && { color: item.color }]}>
          {item.label}
        </Text>
        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.surfaceLight, true: colors.safe.bg }}
            thumbColor={item.value ? colors.safe.primary : colors.textMuted}
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        )}
      </TouchableOpacity>
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
        title="설정"
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ProfileSettings' as never)}
        >
          <GlassCard style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.profileAvatar}>
                <LinearGradient
                  colors={[colors.safe.primary, colors.caution.primary]}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>원</Text>
                </LinearGradient>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>원장님</Text>
                <Text style={styles.profileEmail}>academy@autus.ai</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textDim} />
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            {section.title ? (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            ) : null}
            <GlassCard padding={0}>
              {section.items.map((item, itemIndex) => (
                <View key={item.key}>
                  {renderSettingItem(item)}
                  {itemIndex < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </GlassCard>
          </View>
        ))}

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>AUTUS v2.0 (KRATON)</Text>
          <Text style={styles.copyrightText}>© 2026 AUTUS Inc.</Text>
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
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  avatarGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.background },
  profileInfo: { flex: 1, marginLeft: spacing[3] },
  profileName: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.text },
  profileEmail: { fontSize: typography.fontSize.sm, color: colors.textMuted, marginTop: 2 },
  section: { marginHorizontal: spacing[4], marginBottom: spacing[4] },
  sectionTitle: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[2], marginLeft: spacing[1] },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: spacing[4] },
  settingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.safe.bg, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { flex: 1, marginLeft: spacing[3], fontSize: typography.fontSize.md, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing[4] + 36 + spacing[3] },
  versionContainer: { alignItems: 'center', paddingVertical: spacing[6] },
  versionText: { fontSize: typography.fontSize.sm, color: colors.textMuted },
  copyrightText: { fontSize: typography.fontSize.xs, color: colors.textDim, marginTop: spacing[1] },
});
