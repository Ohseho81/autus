/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌐 useNetworkStatus - 네트워크 상태 감지 Hook
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isWifi: boolean;
  isCellular: boolean;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    isWifi: false,
    isCellular: false,
  });

  const updateStatus = useCallback((state: NetInfoState) => {
    setStatus({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      isWifi: state.type === 'wifi',
      isCellular: state.type === 'cellular',
    });
  }, []);

  useEffect(() => {
    // 초기 상태 확인
    NetInfo.fetch().then(updateStatus).catch((err) => {
      if (__DEV__) console.warn('[NetworkStatus] Initial fetch failed:', err);
    });

    // 상태 변화 구독
    const unsubscribe = NetInfo.addEventListener(updateStatus);

    return () => unsubscribe();
  }, [updateStatus]);

  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    updateStatus(state);
    return state.isConnected ?? false;
  }, [updateStatus]);

  return {
    ...status,
    isOffline: !status.isConnected,
    refresh,
  };
}
