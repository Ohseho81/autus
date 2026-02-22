/**
 * 앱 업데이트 서비스 (Expo Updates)
 *
 * 기능:
 * - 수동 업데이트 확인
 * - 업데이트 다운로드 및 적용
 * - 현재 버전 정보 조회
 * - 업데이트 이력 Event Ledger 기록
 */

import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { eventService } from './eventService';

export interface UpdateInfo {
  isAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  isUpdatePending: boolean;
  manifestString?: string;
}

export interface UpdateResult {
  success: boolean;
  updateApplied: boolean;
  errorMessage?: string;
  needsReload?: boolean;
}

class UpdateService {
  /**
   * 업데이트 가능 여부 확인
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      // 개발 모드에서는 업데이트 불가
      if (__DEV__) {
        return {
          isAvailable: false,
          currentVersion: '1.0.0-dev',
          isUpdatePending: false,
        };
      }

      // 현재 업데이트 정보
      const currentUpdate = Updates.updateId;
      const isUpdatePending = false; // Expo Updates에서 제거된 속성

      // 업데이트 확인
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('[UpdateService] Update available:', update.manifest);

        return {
          isAvailable: true,
          currentVersion: currentUpdate || '1.0.0',
          latestVersion: update.manifest?.id || 'latest',
          isUpdatePending,
          manifestString: JSON.stringify(update.manifest),
        };
      }

      return {
        isAvailable: false,
        currentVersion: currentUpdate || '1.0.0',
        isUpdatePending,
      };
    } catch (error: unknown) {
      console.error('[UpdateService] Failed to check for updates:', error);

      return {
        isAvailable: false,
        currentVersion: Updates.updateId || '1.0.0',
        isUpdatePending: false,
      };
    }
  }

  /**
   * 업데이트 다운로드 및 적용
   */
  async downloadAndApplyUpdate(userId: string): Promise<UpdateResult> {
    try {
      // 개발 모드에서는 업데이트 불가
      if (__DEV__) {
        return {
          success: false,
          updateApplied: false,
          errorMessage: 'Updates are not available in development mode',
        };
      }

      console.log('[UpdateService] Downloading update...');

      // 업데이트 다운로드
      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        console.log('[UpdateService] Update downloaded successfully');

        // Event Ledger 기록
        await eventService.logEvent({
          entity_id: userId,
          event_type: 'system_update',
          metadata: {
            type: 'app_update',
            platform: Platform.OS,
            update_id: result.manifest?.id,
            success: true,
          },
        });

        // 업데이트 적용 (앱 재시작)
        await Updates.reloadAsync();

        return {
          success: true,
          updateApplied: true,
          needsReload: true,
        };
      }

      return {
        success: true,
        updateApplied: false,
        errorMessage: 'Already up to date',
      };
    } catch (error: unknown) {
      console.error('[UpdateService] Failed to download update:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // 실패 기록
      await eventService.logEvent({
        entity_id: userId,
        event_type: 'system_update',
        metadata: {
          type: 'app_update',
          platform: Platform.OS,
          success: false,
          error: errorMessage,
        },
      });

      return {
        success: false,
        updateApplied: false,
        errorMessage: errorMessage || 'Failed to download update',
      };
    }
  }

  /**
   * 현재 버전 정보
   */
  getVersionInfo(): {
    appVersion: string;
    updateId: string | null;
    channel: string | null;
    runtimeVersion: string | null;
    isEmergencyLaunch: boolean;
  } {
    return {
      appVersion: '1.0.0', // package.json의 version과 동기화 필요
      updateId: Updates.updateId,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      isEmergencyLaunch: Updates.isEmergencyLaunch,
    };
  }

  /**
   * 업데이트 자동 확인 (앱 시작 시)
   */
  async autoCheckOnStartup(): Promise<void> {
    // app.json의 checkAutomatically: "ON_LOAD"가 자동으로 처리
    // 추가 로직이 필요하면 여기에 구현
    console.log('[UpdateService] Auto-check is handled by Expo Updates');
  }

  /**
   * 개발 모드 확인
   */
  isDevelopmentMode(): boolean {
    return __DEV__;
  }

  /**
   * 업데이트 가능 여부 (플랫폼 체크)
   */
  isUpdateSupported(): boolean {
    // Web은 업데이트 불필요 (항상 최신)
    if (Platform.OS === 'web') {
      return false;
    }

    // 개발 모드에서는 업데이트 불가
    if (__DEV__) {
      return false;
    }

    return true;
  }

  /**
   * 강제 재시작 (업데이트 적용)
   */
  async reloadApp(): Promise<void> {
    if (!__DEV__) {
      await Updates.reloadAsync();
    }
  }
}

// 싱글톤 인스턴스
export const updateService = new UpdateService();

export default updateService;
