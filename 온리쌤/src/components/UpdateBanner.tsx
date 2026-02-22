/**
 * UpdateBanner - OTA 업데이트 준비 시 하단 배너 표시
 *
 * 업데이트 다운로드 완료 → 배너 표시 → 탭하면 앱 리로드
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useAppUpdate } from '../hooks/useAppUpdate';

export function UpdateBanner() {
  const { status, isUpdateReady, applyUpdate } = useAppUpdate();
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: isUpdateReady ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isUpdateReady, opacity]);

  if (!isUpdateReady && status !== 'downloading') return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <TouchableOpacity
        style={styles.banner}
        onPress={isUpdateReady ? applyUpdate : undefined}
        activeOpacity={0.8}
      >
        <Text style={styles.text}>
          {status === 'downloading'
            ? '업데이트 다운로드 중...'
            : '새 버전이 준비되었습니다. 탭하여 적용'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  banner: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
