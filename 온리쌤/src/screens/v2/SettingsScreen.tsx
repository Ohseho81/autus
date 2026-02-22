/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚙️ SettingsScreen - AUTUS v1.0 통합 설정 화면
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 기능 통합:
 * - 프로필 설정
 * - 조직/학원 설정
 * - 알림 설정
 * - 위험 기준 설정
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L, T } from '../../config/labelMap';
import { useRole } from '../../navigation/AppNavigatorV2';
import { migrationService } from '../../services/migrationService';
import { useProfile } from '../../context/ProfileContext';
import { updateService } from '../../services/updateService';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface SettingItem {
  id: string;
  label: string;
  value?: string;
  type: 'navigate' | 'toggle' | 'value';
  icon: keyof typeof Ionicons.glyphMap;
  toggleValue?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsScreen() {
  const { config } = useIndustryConfig();
  const { logout } = useRole();
  const { profile } = useProfile();

  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────

  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [riskAlertEnabled, setRiskAlertEnabled] = useState(true);
  const [paymentAlertEnabled, setPaymentAlertEnabled] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: logout },
      ]
    );
  };

  const showComingSoon = () => {
    Alert.alert('알림', '해당 기능은 준비 중입니다.');
  };

  const handleDatabaseUpdate = async () => {
    Alert.alert(
      '데이터베이스 업데이트',
      '데이터베이스를 최신 버전으로 업데이트합니다.\n\n다음 작업이 실행됩니다:\n• RLS 정책 추가\n• 기본 학원 생성\n• Universal ID 연결\n• V-Index 초기화\n• 인덱스 최적화\n\n계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '업데이트',
          style: 'default',
          onPress: async () => {
            try {
              setIsUpdating(true);

              const results = await migrationService.runPendingMigrations(profile?.id || '');

              const allSuccess = results.every(r => r.success);
              const alreadyExecuted = results.every(r => r.alreadyExecuted);

              if (alreadyExecuted) {
                Alert.alert('알림', '이미 최신 버전입니다.');
              } else if (allSuccess) {
                const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
                Alert.alert(
                  '업데이트 완료',
                  `${results.length}개의 마이그레이션이 성공적으로 완료되었습니다.\n실행 시간: ${totalTime}ms`
                );
              } else {
                const failed = results.find(r => !r.success);
                Alert.alert(
                  '업데이트 실패',
                  `마이그레이션 ${failed?.version} 실패:\n${failed?.errorMessage}`
                );
              }
            } catch (error: unknown) {
              const msg = error instanceof Error ? error.message : '업데이트 중 오류가 발생했습니다.';
              Alert.alert('오류', msg);
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleSystemHealth = async () => {
    try {
      const health = await migrationService.getSystemHealth();

      if (health) {
        Alert.alert(
          '시스템 상태',
          `📊 시스템 통계\n\n` +
          `• 학원: ${health.active_academies}개\n` +
          `• 전체 프로필: ${health.total_profiles}개\n` +
          `• 학생: ${health.active_students}명\n` +
          `• 코치: ${health.active_coaches || 0}명\n` +
          `• 평균 V-Index: ${health.avg_v_index}°\n` +
          `• 전체 이벤트: ${health.total_events}개\n` +
          `• 최근 7일 이벤트: ${health.events_last_7_days}개\n` +
          `• 대기 태스크: ${health.pending_tasks}개`
        );
      } else {
        Alert.alert('알림', '시스템 상태를 가져올 수 없습니다.');
      }
    } catch (error: unknown) {
      Alert.alert('오류', '시스템 상태 조회 중 오류가 발생했습니다.');
    }
  };

  const handleAppUpdate = async () => {
    // 업데이트 지원 여부 확인
    if (!updateService.isUpdateSupported()) {
      if (updateService.isDevelopmentMode()) {
        Alert.alert('알림', '개발 모드에서는 업데이트를 확인할 수 없습니다.');
      } else {
        Alert.alert('알림', '이 플랫폼에서는 업데이트가 지원되지 않습니다.');
      }
      return;
    }

    try {
      setIsCheckingUpdate(true);

      // 업데이트 확인
      const updateInfo = await updateService.checkForUpdates();

      if (updateInfo.isAvailable) {
        Alert.alert(
          '업데이트 가능',
          `새로운 버전이 있습니다!\n\n` +
          `현재 버전: ${updateInfo.currentVersion}\n` +
          `최신 버전: ${updateInfo.latestVersion || '최신'}\n\n` +
          `업데이트를 다운로드하고 적용하시겠습니까?\n` +
          `(앱이 자동으로 재시작됩니다)`,
          [
            { text: '취소', style: 'cancel' },
            {
              text: '업데이트',
              onPress: async () => {
                try {
                  const result = await updateService.downloadAndApplyUpdate(profile?.id || '');

                  if (result.success && result.updateApplied) {
                    // 앱이 자동으로 재시작되므로 이 코드는 실행되지 않을 수 있음
                    Alert.alert('업데이트 완료', '앱이 재시작됩니다.');
                  } else if (result.success && !result.updateApplied) {
                    Alert.alert('알림', result.errorMessage || '이미 최신 버전입니다.');
                  } else {
                    Alert.alert('오류', result.errorMessage || '업데이트 중 오류가 발생했습니다.');
                  }
                } catch (error: unknown) {
                  Alert.alert('오류', error instanceof Error ? error.message : '업데이트를 적용할 수 없습니다.');
                }
              },
            },
          ]
        );
      } else {
        // 현재 버전 정보
        const versionInfo = updateService.getVersionInfo();

        Alert.alert(
          '최신 버전',
          `이미 최신 버전을 사용 중입니다.\n\n` +
          `앱 버전: ${versionInfo.appVersion}\n` +
          `Update ID: ${versionInfo.updateId || 'N/A'}\n` +
          `채널: ${versionInfo.channel || 'default'}`
        );
      }
    } catch (error: unknown) {
      Alert.alert('오류', '업데이트 확인 중 오류가 발생했습니다.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings Data
  // ─────────────────────────────────────────────────────────────────────────────

  const sections: SettingSection[] = [
    {
      title: '👤 프로필',
      items: [
        {
          id: 'profile',
          label: '내 정보',
          value: '관리자',
          type: 'navigate',
          icon: 'person-outline',
          onPress: showComingSoon,
        },
        {
          id: 'password',
          label: '비밀번호 변경',
          type: 'navigate',
          icon: 'lock-closed-outline',
          onPress: showComingSoon,
        },
      ],
    },
    {
      title: `🏢 ${config.labels.organization || '조직'} 설정`,
      items: [
        {
          id: 'org-info',
          label: `${config.labels.organization || '조직'} 정보`,
          value: '온리쌤',
          type: 'navigate',
          icon: 'business-outline',
          onPress: showComingSoon,
        },
        {
          id: 'staff',
          label: `${L.staff(config)} 관리`,
          type: 'navigate',
          icon: 'people-outline',
          onPress: showComingSoon,
        },
        {
          id: 'service',
          label: `${L.service(config)} 설정`,
          type: 'navigate',
          icon: 'calendar-outline',
          onPress: showComingSoon,
        },
      ],
    },
    {
      title: '🔔 알림',
      items: [
        {
          id: 'notification-all',
          label: '알림 받기',
          type: 'toggle',
          icon: 'notifications-outline',
          toggleValue: notificationEnabled,
          onToggle: setNotificationEnabled,
        },
        {
          id: 'notification-risk',
          label: `${config.labels.risk} 알림`,
          type: 'toggle',
          icon: 'warning-outline',
          toggleValue: riskAlertEnabled,
          onToggle: setRiskAlertEnabled,
        },
        {
          id: 'notification-payment',
          label: '결제 알림',
          type: 'toggle',
          icon: 'card-outline',
          toggleValue: paymentAlertEnabled,
          onToggle: setPaymentAlertEnabled,
        },
      ],
    },
    {
      title: '📊 V-Index 설정',
      items: [
        {
          id: 'risk-threshold',
          label: `${config.labels.risk} 기준값`,
          value: '40°',
          type: 'navigate',
          icon: 'speedometer-outline',
          onPress: showComingSoon,
        },
        {
          id: 'risk-factors',
          label: '위험 요소 가중치',
          type: 'navigate',
          icon: 'analytics-outline',
          onPress: showComingSoon,
        },
        {
          id: 'auto-alert',
          label: '자동 알림 발송',
          type: 'navigate',
          icon: 'flash-outline',
          onPress: showComingSoon,
        },
      ],
    },
    {
      title: '💳 결제',
      items: [
        {
          id: 'payment-method',
          label: '결제 수단 설정',
          value: '토스페이먼츠',
          type: 'navigate',
          icon: 'wallet-outline',
          onPress: showComingSoon,
        },
        {
          id: 'payment-reminder',
          label: '미납 알림 주기',
          value: '3일',
          type: 'navigate',
          icon: 'time-outline',
          onPress: showComingSoon,
        },
      ],
    },
    {
      title: '🔧 시스템 관리',
      items: [
        {
          id: 'app-update',
          label: isCheckingUpdate ? '확인 중...' : '앱 업데이트 확인',
          type: 'navigate',
          icon: 'cloud-download-outline',
          onPress: handleAppUpdate,
        },
        {
          id: 'db-update',
          label: isUpdating ? '업데이트 중...' : '데이터베이스 업데이트',
          type: 'navigate',
          icon: 'sync-outline',
          onPress: handleDatabaseUpdate,
        },
        {
          id: 'system-health',
          label: '시스템 상태',
          type: 'navigate',
          icon: 'pulse-outline',
          onPress: handleSystemHealth,
        },
      ],
    },
    {
      title: '📱 앱 정보',
      items: [
        {
          id: 'version',
          label: '버전',
          value: 'v1.0.0',
          type: 'value',
          icon: 'information-circle-outline',
        },
        {
          id: 'terms',
          label: '이용약관',
          type: 'navigate',
          icon: 'document-text-outline',
          onPress: showComingSoon,
        },
        {
          id: 'privacy',
          label: '개인정보처리방침',
          type: 'navigate',
          icon: 'shield-outline',
          onPress: showComingSoon,
        },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const renderItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle' || item.type === 'value'}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.color.primary}15` }]}>
          <Ionicons name={item.icon} size={20} color={config.color.primary} />
        </View>
        <Text style={styles.itemLabel}>{item.label}</Text>
      </View>

      <View style={styles.itemRight}>
        {item.type === 'toggle' && item.onToggle && (
          <Switch
            value={item.toggleValue}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.border.primary, true: `${config.color.primary}50` }}
            thumbColor={item.toggleValue ? config.color.primary : colors.text.muted}
          />
        )}
        {item.type === 'navigate' && (
          <>
            {item.value && <Text style={styles.itemValue}>{item.value}</Text>}
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </>
        )}
        {item.type === 'value' && (
          <Text style={styles.itemValue}>{item.value}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{config.labels.settings}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderItem)}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger.primary} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AUTUS v1.0</Text>
          <Text style={styles.footerSubtext}>관계 유지력 OS</Text>
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
    paddingBottom: spacing[8],
  },

  // Section
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.muted,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  sectionContent: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden',
  },

  // Setting Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  itemValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.danger.primary,
  },
  logoutText: {
    fontSize: typography.fontSize.md,
    color: colors.danger.primary,
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
});
