/**
 * Attendance Types
 * QR 출석 시스템용 타입 정의
 */

// Re-export from lesson.ts
export { AttendanceRecord } from './lesson';

// Student 타입
export interface Student {
  id: string;
  name: string;
  phone?: string;
  parent_phone?: string;
  email?: string;
  birth_date?: string;
  grade?: string;
  school?: string;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'paused';
  created_at: string;
  updated_at?: string;
}

// Lesson Slot 타입
export interface LessonSlot {
  id: string;
  date: string;
  name: string;
  start_time: string;
  end_time: string;
  location?: string;
  coach_id?: string;
  coach_name?: string;
  current_count: number;
  max_count: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at?: string;
}
