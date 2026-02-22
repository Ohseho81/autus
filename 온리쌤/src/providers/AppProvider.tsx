/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎯 AppProvider - 앱 전역 Provider 통합
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 모든 전역 Provider를 하나로 통합합니다.
 * - ToastProvider: 토스트 알림
 * - ErrorBoundary: 에러 처리
 * - OfflineBanner: 오프라인 감지
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ToastProvider, ErrorBoundary, OfflineBanner } from '../components/common';

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <View style={styles.container}>
          <OfflineBanner />
          {children}
        </View>
      </ToastProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppProvider;
