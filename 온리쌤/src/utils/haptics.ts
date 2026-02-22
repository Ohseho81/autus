/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📳 Haptics - 햅틱 피드백 유틸
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 사용법:
 *   import { haptics } from '../utils/haptics';
 *   
 *   haptics.light();   // 버튼 탭
 *   haptics.medium();  // 선택 변경
 *   haptics.heavy();   // 중요 액션
 *   haptics.success(); // 성공
 *   haptics.error();   // 에러
 *   haptics.warning(); // 경고
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// 햅틱 활성화 여부 (설정에서 변경 가능)
let isEnabled = true;

export const haptics = {
  /**
   * 햅틱 활성화/비활성화
   */
  setEnabled(enabled: boolean) {
    isEnabled = enabled;
  },

  /**
   * 가벼운 탭 (버튼 터치)
   */
  light() {
    if (!isEnabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * 중간 탭 (선택 변경, 스위치 토글)
   */
  medium() {
    if (!isEnabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * 강한 탭 (중요 액션, 삭제)
   */
  heavy() {
    if (!isEnabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /**
   * 선택 피드백 (목록 항목 선택)
   */
  selection() {
    if (!isEnabled || Platform.OS === 'web') return;
    Haptics.selectionAsync();
  },

  /**
   * 성공 알림
   */
  success() {
    if (!isEnabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /**
   * 에러 알림
   */
  error() {
    if (!isEnabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /**
   * 경고 알림
   */
  warning() {
    if (!isEnabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};

export default haptics;
