/**
 * useAppUpdate - OTA 업데이트 실시간 감지 + 자동 다운로드
 *
 * - 앱 시작 시 즉시 체크
 * - 백그라운드에서 주기적 체크 (기본 5분)
 * - 업데이트 발견 → 자동 다운로드
 * - 다운로드 완료 → 배너로 알림 → 사용자 탭 시 리로드
 */

import { useEffect, useRef, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { AppState, AppStateStatus } from 'react-native';
import { captureError } from '../lib/sentry';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5분

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export function useAppUpdate() {
  const {
    isUpdateAvailable,
    isUpdatePending,
    isChecking,
    isDownloading,
    checkError,
    downloadError,
    currentlyRunning,
  } = Updates.useUpdates();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 업데이트 체크
  const checkForUpdate = useCallback(async () => {
    try {
      await Updates.checkForUpdateAsync();
    } catch (e: unknown) {
      if (__DEV__) console.warn('[AppUpdate] Check failed:', e);
    }
  }, []);

  // 업데이트 발견 시 자동 다운로드
  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending && !isDownloading) {
      Updates.fetchUpdateAsync().catch((e) => {
        captureError(e instanceof Error ? e : new Error(String(e)), { context: 'ota_download' });
      });
    }
  }, [isUpdateAvailable, isUpdatePending, isDownloading]);

  // 에러 로깅
  useEffect(() => {
    if (checkError) {
      captureError(checkError, { context: 'ota_check' });
    }
    if (downloadError) {
      captureError(downloadError, { context: 'ota_download' });
    }
  }, [checkError, downloadError]);

  // 앱 시작 시 체크 + 주기적 체크
  useEffect(() => {
    if (__DEV__) return;

    // 즉시 체크
    checkForUpdate();

    // 주기적 체크
    intervalRef.current = setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkForUpdate]);

  // 앱이 포그라운드로 돌아올 때 체크
  useEffect(() => {
    if (__DEV__) return;

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        checkForUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [checkForUpdate]);

  // 리로드 (사용자 액션)
  const applyUpdate = useCallback(async () => {
    if (isUpdatePending) {
      await Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  let status: UpdateStatus = 'idle';
  if (checkError || downloadError) status = 'error';
  else if (isUpdatePending) status = 'ready';
  else if (isDownloading) status = 'downloading';
  else if (isChecking) status = 'checking';

  return {
    status,
    isUpdateReady: isUpdatePending,
    isEmbeddedLaunch: currentlyRunning.isEmbeddedLaunch,
    applyUpdate,
    checkForUpdate,
  };
}
