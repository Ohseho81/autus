import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 오프라인 캐시 서비스
 * AsyncStorage를 사용한 데이터 캐싱
 */

const CACHE_KEYS = {
  STUDENTS: 'cached_students',
  SCHEDULES: 'cached_schedules',
  ATTENDANCE: 'cached_attendance',
  PAYMENTS: 'cached_payments',
  USER_PROFILE: 'cached_user_profile',
} as const;

const CACHE_EXPIRY = {
  STUDENTS: 30 * 60 * 1000, // 30분
  SCHEDULES: 10 * 60 * 1000, // 10분
  ATTENDANCE: 5 * 60 * 1000, // 5분
  PAYMENTS: 30 * 60 * 1000, // 30분
  USER_PROFILE: 60 * 60 * 1000, // 1시간
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const offlineCache = {
  /**
   * 데이터 캐싱
   */
  async set<T>(key: keyof typeof CACHE_KEYS, data: T): Promise<void> {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        CACHE_KEYS[key],
        JSON.stringify(cacheEntry)
      );
    } catch (error: unknown) {
      console.error(`Failed to cache ${key}:`, error);
    }
  },

  /**
   * 캐시된 데이터 가져오기
   * 만료된 경우 null 반환
   */
  async get<T>(key: keyof typeof CACHE_KEYS): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS[key]);
      if (!cached) return null;

      const cacheEntry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      const expiry = CACHE_EXPIRY[key];

      // 캐시 만료 확인
      if (now - cacheEntry.timestamp > expiry) {
        await this.remove(key);
        return null;
      }

      return cacheEntry.data;
    } catch (error: unknown) {
      console.error(`Failed to get cached ${key}:`, error);
      return null;
    }
  },

  /**
   * 특정 캐시 삭제
   */
  async remove(key: keyof typeof CACHE_KEYS): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS[key]);
    } catch (error: unknown) {
      console.error(`Failed to remove cache ${key}:`, error);
    }
  },

  /**
   * 모든 캐시 삭제
   */
  async clearAll(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error: unknown) {
      console.error('Failed to clear all cache:', error);
    }
  },

  /**
   * 학생 목록 캐시
   */
  async saveStudents(students: Array<Record<string, unknown>>): Promise<void> {
    await this.set('STUDENTS', students);
  },

  async getCachedStudents(): Promise<Array<Record<string, unknown>> | null> {
    return this.get<Array<Record<string, unknown>>>('STUDENTS');
  },

  /**
   * 스케줄 캐시
   */
  async saveSchedules(schedules: Array<Record<string, unknown>>): Promise<void> {
    await this.set('SCHEDULES', schedules);
  },

  async getCachedSchedules(): Promise<Array<Record<string, unknown>> | null> {
    return this.get<Array<Record<string, unknown>>>('SCHEDULES');
  },

  /**
   * 출석 기록 캐시
   */
  async saveAttendance(attendance: Array<Record<string, unknown>>): Promise<void> {
    await this.set('ATTENDANCE', attendance);
  },

  async getCachedAttendance(): Promise<Array<Record<string, unknown>> | null> {
    return this.get<Array<Record<string, unknown>>>('ATTENDANCE');
  },

  /**
   * 결제 내역 캐시
   */
  async savePayments(payments: Array<Record<string, unknown>>): Promise<void> {
    await this.set('PAYMENTS', payments);
  },

  async getCachedPayments(): Promise<Array<Record<string, unknown>> | null> {
    return this.get<Array<Record<string, unknown>>>('PAYMENTS');
  },

  /**
   * 사용자 프로필 캐시
   */
  async saveUserProfile(profile: Record<string, unknown>): Promise<void> {
    await this.set('USER_PROFILE', profile);
  },

  async getCachedUserProfile(): Promise<Record<string, unknown> | null> {
    return this.get<Record<string, unknown>>('USER_PROFILE');
  },
};

/**
 * 네트워크 요청 시 캐시 활용 헬퍼
 */
export const withCache = async <T>(
  cacheKey: keyof typeof CACHE_KEYS,
  fetchFn: () => Promise<T>
): Promise<T> => {
  try {
    // 네트워크 요청 시도
    const data = await fetchFn();

    // 성공 시 캐시 저장
    await offlineCache.set(cacheKey, data);

    return data;
  } catch (error: unknown) {
    // 실패 시 캐시 사용
    const cached = await offlineCache.get<T>(cacheKey);

    if (cached) {
      if (__DEV__) console.log(`Using cached ${cacheKey} due to network error`);
      return cached;
    }

    // 캐시도 없으면 에러 throw
    throw error;
  }
};
