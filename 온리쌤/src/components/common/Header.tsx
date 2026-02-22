/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔝 Header - KRATON 스타일 헤더
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../utils/theme';

interface HeaderProps {
  title?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightBadge?: number;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'AUTUS',
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  rightBadge,
  transparent = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {!transparent && (
          <LinearGradient
            colors={[colors.surface, colors.background]}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        <View style={styles.content}>
          {/* Left Button */}
          <View style={styles.leftContainer}>
            {leftIcon && (
              <TouchableOpacity
                onPress={onLeftPress}
                style={styles.iconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name={leftIcon} size={24} color={colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.titleUnderline} />
          </View>

          {/* Right Button */}
          <View style={styles.rightContainer}>
            {rightIcon && (
              <TouchableOpacity
                onPress={onRightPress}
                style={styles.iconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name={rightIcon} size={24} color={colors.text.primary} />
                {rightBadge && rightBadge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {rightBadge > 99 ? '99+' : rightBadge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom Border Glow */}
        <LinearGradient
          colors={['transparent', colors.safe.primary, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomGlow}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing[4],
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 1,
  },
  titleUnderline: {
    width: 40,
    height: 2,
    backgroundColor: colors.safe.primary,
    borderRadius: 1,
    marginTop: 4,
    opacity: 0.8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
  },
  bottomGlow: {
    height: 1,
    opacity: 0.3,
  },
});

export default Header;
