import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

/**
 * React Query 전역 설정
 * - 자동 재시도 로직
 * - 네트워크 상태 기반 동작
 * - 에러 로깅
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐싱 전략
      staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
      gcTime: 10 * 60 * 1000, // 10분간 캐시 보관 (구 cacheTime)

      // 재시도 로직
      retry: (failureCount, error: unknown) => {
        // 인증 에러는 재시도하지 않음
        const status = (error as Record<string, unknown>)?.status;
        if (status === 401 || status === 403) {
          return false;
        }

        // 최대 3회 재시도
        return failureCount < 3;
      },

      // 지수 백오프 (1초, 2초, 4초)
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),

      // 네트워크 재연결 시 자동 refetch
      refetchOnReconnect: true,

      // 윈도우 포커스 시 refetch (웹에서만 작동)
      refetchOnWindowFocus: false,

      // 마운트 시 refetch
      refetchOnMount: true,

      // 에러 핸들링 — Sentry에 자동 전송
      throwOnError: false,

      // 네트워크 모드
      networkMode: 'online',
    },

    mutations: {
      // Mutation 재시도 (1회만)
      retry: 1,

      // 에러 핸들링 — 개별 mutation에서 onError 처리
      throwOnError: false,
    },
  },
});

/**
 * 네트워크 상태 모니터링
 * 오프라인 시 자동으로 쿼리 일시정지
 */
export const setupNetworkMonitoring = () => {
  NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected && state.isInternetReachable;

    if (!isOnline) {
      if (__DEV__) console.log('Network offline, pausing queries');
      queryClient.setDefaultOptions({
        queries: {
          networkMode: 'offlineFirst',
        },
      });
    } else {
      if (__DEV__) console.log('Network online, resuming queries');
      queryClient.setDefaultOptions({
        queries: {
          networkMode: 'online',
        },
      });

      // 온라인 복구 시 모든 쿼리 refetch
      queryClient.refetchQueries();
    }
  });
};

