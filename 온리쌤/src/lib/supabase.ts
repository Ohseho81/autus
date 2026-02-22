/**
 * 🔌 Supabase Client
 * 온리쌤 데이터베이스 연결
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { env } from '../config/env';

// Supabase Config (환경변수에서 가져오기)
const SUPABASE_URL = env.supabase.url;
const SUPABASE_ANON_KEY = env.supabase.anonKey;

// Secure Storage Adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// Create Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types (from Supabase schema)
export interface Student {
  id: string;
  name: string;
  grade: string;
  phone?: string;
  parent_phone?: string;
  team?: string;
  skill_level?: number;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  lesson_slot_id: string;
  check_in_time: string;
  status: 'present' | 'absent' | 'late';
  verified_by: string;
}

export interface LessonSlot {
  id: string;
  coach_id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  max_count: number;
}

export interface CoachWorkLog {
  id: string;
  coach_id: string;
  work_date: string;
  clock_in_time: string;
  clock_out_time?: string;
  total_hours?: number;
  lessons_completed?: number;
  students_attended?: number;
  location?: string;
}

export interface SkillRating {
  id: string;
  student_id: string;
  coach_id: string;
  dribble: number;
  shoot: number;
  pass: number;
  defense: number;
  stamina: number;
  teamwork: number;
  rated_at: string;
}

export default supabase;
