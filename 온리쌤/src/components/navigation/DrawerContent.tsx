/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📱 DrawerContent - 사이드 메뉴 (KRATON 스타일)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L, T } from '../../config/labelMap';

interface MenuItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
  divider?: boolean;
  highlight?: boolean;
}

// 동적 메뉴 생성 함수
const getMenuItems = (config: { icon: string; labels: { attendance: string; payment: string; risk: string; settings: string; staff: string } }): MenuItem[] => [
  { name: '홈', icon: 'home', route: 'MainTabs' },
  { name: `${config.labels.attendance} 관리`, icon: 'calendar', route: 'Attendance' },
  { name: `${config.labels.payment} 관리`, icon: 'card', route: 'Payments' },
  { name: `${config.labels.risk} 관리`, icon: 'warning', route: 'Risk' },
  { name: config.labels.settings, icon: 'settings', route: 'Settings' },
  { name: '', icon: 'remove', route: '', divider: true },
  { name: `${config.icon} ${config.labels.staff}앱`, icon: 'fitness', route: 'CoachTabs', highlight: true },
];

export const DrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;
  const { config } = useIndustryConfig();

  const currentRoute = state.routes[state.index].name;
  const menuItems = getMenuItems(config);

  const handleNavigation = (route: string) => {
    navigation.navigate(route);
  };

  const handleLogout = () => {
    // TODO: Implement logout
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header / Profile Section */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[colors.safe.primary, colors.caution.primary]}
            style={styles.avatarGradient}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>원</Text>
            </View>
          </LinearGradient>
          <View style={styles.statusDot} />
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.userName}>관리자님</Text>
          <Text style={styles.academyName}>{config.name}</Text>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <Ionicons name="create-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>124</Text>
          <Text style={styles.statLabel}>{L.entity(config)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.danger.primary }]}>5</Text>
          <Text style={styles.statLabel}>{config.labels.risk}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success.primary }]}>87%</Text>
          <Text style={styles.statLabel}>{T.attendanceRate(config)}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => {
          // Divider
          if (item.divider) {
            return (
              <View key={`divider-${index}`} style={styles.menuDivider}>
                <View style={styles.menuDividerLine} />
                <Text style={styles.menuDividerText}>강사 전용</Text>
                <View style={styles.menuDividerLine} />
              </View>
            );
          }

          const isActive = currentRoute === item.route;
          const highlightColor = item.highlight ? colors.roles.coach.primary : colors.safe.primary;

          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                isActive && styles.menuItemActive,
                item.highlight && styles.menuItemHighlight,
              ]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.menuIconContainer,
                isActive && { backgroundColor: `${highlightColor}20` },
                item.highlight && { backgroundColor: `${highlightColor}15` },
              ]}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive || item.highlight ? highlightColor : colors.textMuted}
                />
              </View>
              <Text style={[
                styles.menuText,
                isActive && styles.menuTextActive,
                item.highlight && { color: highlightColor, fontWeight: '600' },
              ]}>
                {item.name}
              </Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: highlightColor }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger.primary} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>AUTUS v2.0 (KRATON)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
  },
  avatar: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  academyName: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    padding: spacing[4],
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.primary,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: spacing[3],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[1],
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
  },
  menuItemHighlight: {
    backgroundColor: 'rgba(255, 71, 87, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.2)',
  },
  menuDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  menuDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.primary,
  },
  menuDividerText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginHorizontal: spacing[2],
    fontWeight: '500',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  menuText: {
    flex: 1,
    marginLeft: spacing[3],
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.textMuted,
  },
  menuTextActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -12,
    width: 3,
    height: 24,
    borderRadius: 1.5,
    backgroundColor: colors.safe.primary,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.danger.bg,
    marginBottom: spacing[3],
  },
  logoutText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.danger.primary,
  },
  versionText: {
    fontSize: typography.fontSize.xs,
    color: colors.textDim,
    textAlign: 'center',
  },
});

export default DrawerContent;
