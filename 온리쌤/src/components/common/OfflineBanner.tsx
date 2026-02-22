/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📡 OfflineBanner - 오프라인 상태 배너
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors, spacing, typography } from '../../utils/theme';

export function OfflineBanner() {
  const { isOffline, refresh } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOffline ? 0 : -60,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing[2],
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={20} color="white" />
        <Text style={styles.text}>인터넷 연결 없음</Text>
        <TouchableOpacity onPress={refresh} style={styles.retryButton}>
          <Ionicons name="refresh" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.apple.red,
    zIndex: 9998,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },
  retryButton: {
    padding: spacing[1],
  },
});
