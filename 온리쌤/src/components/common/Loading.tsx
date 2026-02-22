/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⏳ Loading - 로딩 인디케이터 컴포넌트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../../utils/theme';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  color?: string;
}

export function Loading({
  message,
  size = 'large',
  fullScreen = false,
  color = colors.primary,
}: LoadingProps) {
  const content = (
    <>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return <View style={styles.container}>{content}</View>;
}

// 전체 화면 로딩 (오버레이)
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && <Text style={styles.overlayMessage}>{message}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  message: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    backgroundColor: colors.surface,
    padding: spacing[6],
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 120,
  },
  overlayMessage: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
