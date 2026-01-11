/**
 * AUTUS Mobile - Haptics Service
 */

import * as Haptics from 'expo-haptics';

/**
 * 가벼운 탭 피드백
 */
export const lightTap = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * 중간 탭 피드백
 */
export const mediumTap = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * 강한 탭 피드백
 */
export const heavyTap = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * 성공 피드백
 */
export const success = async () => {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * 경고 피드백
 */
export const warning = async () => {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/**
 * 에러 피드백
 */
export const error = async () => {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/**
 * 선택 피드백
 */
export const selection = async () => {
  await Haptics.selectionAsync();
};
