/**
 * AUTUS Mobile - AsyncStorage Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@autus_state';

export interface StorageData {
  nodes: any;
  missions: any;
  connectors: any;
  devices: any;
  webServices: any;
  settings: any;
  team: any;
}

/**
 * 상태 저장
 */
export const saveState = async (data: StorageData): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

/**
 * 상태 로드
 */
export const loadState = async (): Promise<StorageData | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Failed to load state:', e);
    return null;
  }
};

/**
 * 상태 삭제 (초기화)
 */
export const clearState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear state:', e);
  }
};

/**
 * 특정 키 저장
 */
export const setItem = async (key: string, value: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
};

/**
 * 특정 키 로드
 */
export const getItem = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error(`Failed to load ${key}:`, e);
    return null;
  }
};
