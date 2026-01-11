/**
 * AUTUS Local Data Hook
 * =====================
 * 
 * 로컬 스토리지 데이터 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import { setItem, getItem, removeItem } from '../services/LocalStorage';

export interface UseLocalDataOptions<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

/**
 * 로컬 스토리지와 동기화된 상태 훅
 */
export function useLocalData<T>(key: string, defaultValue: T) {
  const [data, setData] = useState<T>(() => {
    const stored = getItem<T>(key);
    return stored ?? defaultValue;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getItem<T>(key);
    if (stored !== null) {
      setData(stored);
    }
    setLoading(false);
  }, [key]);

  const save = useCallback((newData: T) => {
    setData(newData);
    setItem(key, newData);
  }, [key]);

  const update = useCallback((updater: (prev: T) => T) => {
    setData(prev => {
      const newData = updater(prev);
      setItem(key, newData);
      return newData;
    });
  }, [key]);

  const clear = useCallback(() => {
    setData(defaultValue);
    removeItem(key);
  }, [key, defaultValue]);

  return {
    data,
    loading,
    save,
    update,
    clear,
  };
}

export default useLocalData;
