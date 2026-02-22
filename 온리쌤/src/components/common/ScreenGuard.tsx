/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🛡️ ScreenGuard - 공통 로딩/에러/빈 상태 핸들러
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 일관된 로딩/에러/빈 상태 UI를 제공하는 컴포넌트
 *
 * 사용법:
 * <ScreenGuard loading={isLoading} error={error} empty={items.length === 0}>
 *   <YourContent />
 * </ScreenGuard>
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';

interface ScreenGuardProps {
  children: React.ReactNode;
  
  // 로딩 상태
  loading?: boolean;
  loadingText?: string;
  
  // 에러 상태
  error?: Error | string | null;
  onRetry?: () => void;
  retryText?: string;
  
  // 빈 상태
  empty?: boolean;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: () => void;
  emptyActionText?: string;
  
  // IndustryConfig로 자동 로딩 상태 지원
  useIndustryLoading?: boolean;
}

/**
 * 로딩 뷰
 */
const LoadingView: React.FC<{ text?: string }> = ({ text }) => {
  const { config, loading: industryLoading } = useIndustryConfig();
  
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={config.color.primary} />
      <Text style={styles.loadingText}>
        {text || (industryLoading ? '설정 불러오는 중...' : '데이터 불러오는 중...')}
      </Text>
    </View>
  );
};

/**
 * 에러 뷰
 */
const ErrorView: React.FC<{
  error: Error | string;
  onRetry?: () => void;
  retryText?: string;
}> = ({ error, onRetry, retryText }) => {
  const { config } = useIndustryConfig();
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.danger.bg }]}>
        <Ionicons name="warning-outline" size={48} color={colors.danger.primary} />
      </View>
      <Text style={styles.errorTitle}>오류가 발생했습니다</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: config.color.primary }]}
          onPress={onRetry}
        >
          <Ionicons name="refresh" size={20} color={colors.white} />
          <Text style={styles.retryText}>{retryText || '다시 시도'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * 빈 상태 뷰
 */
const EmptyView: React.FC<{
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  subtitle?: string;
  action?: () => void;
  actionText?: string;
}> = ({ icon = 'folder-open-outline', title, subtitle, action, actionText }) => {
  const { config } = useIndustryConfig();
  
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.glass }]}>
        <Ionicons name={icon} size={48} color={colors.text.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title || '데이터가 없습니다'}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action && actionText && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: config.color.primary }]}
          onPress={action}
        >
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * ScreenGuard 메인 컴포넌트
 */
export function ScreenGuard({
  children,
  loading,
  loadingText,
  error,
  onRetry,
  retryText,
  empty,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  emptyAction,
  emptyActionText,
  useIndustryLoading = false,
}: ScreenGuardProps): JSX.Element {
  const { loading: industryLoading } = useIndustryConfig();
  
  // 산업 설정 로딩 중
  if (useIndustryLoading && industryLoading) {
    return <LoadingView />;
  }
  
  // 데이터 로딩 중
  if (loading) {
    return <LoadingView text={loadingText} />;
  }
  
  // 에러 발생
  if (error) {
    return <ErrorView error={error} onRetry={onRetry} retryText={retryText} />;
  }
  
  // 빈 상태
  if (empty) {
    return (
      <EmptyView
        icon={emptyIcon}
        title={emptyTitle}
        subtitle={emptySubtitle}
        action={emptyAction}
        actionText={emptyActionText}
      />
    );
  }
  
  // 정상 렌더링
  return <>{children}</>;
}

/**
 * HOC 버전 - 화면 전체를 감쌀 때 사용
 */
export function withScreenGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Partial<ScreenGuardProps>
) {
  return function WithScreenGuard(props: P & Partial<ScreenGuardProps>) {
    const mergedProps = { ...options, ...props };
    
    return (
      <ScreenGuard {...mergedProps}>
        <WrappedComponent {...props} />
      </ScreenGuard>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing[6],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  errorMessage: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  retryText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  actionButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
  },
  actionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
});

export default ScreenGuard;
