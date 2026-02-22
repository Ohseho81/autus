/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎬 Video Service - 코치 영상촬영 모듈
 * Spec v3.0+ - 버튼 3개 + 영상
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 핵심 원칙:
 * - 코치는 수업 + 영상촬영만 담당
 * - 영상은 수업 진행 중(IN_PROGRESS)일 때만 촬영 가능
 * - 업로드는 백그라운드에서 자동 처리
 * - 실패 시 로컬 저장 후 재시도
 *
 * 플로우:
 * 1. 코치가 [촬영] 버튼 누름
 * 2. expo-camera로 영상 녹화
 * 3. 녹화 완료 후 Supabase Storage 업로드
 * 4. 업로드 성공 시 video_events 테이블에 기록
 * 5. 학부모에게 알림톡 자동 발송 (시스템 처리)
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface VideoRecord {
  id: string;
  session_id: string;
  student_id?: string;
  coach_id?: string;
  local_uri: string;
  remote_url?: string;
  duration_seconds: number;
  file_size_bytes: number;
  status: 'RECORDING' | 'LOCAL' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  created_at: string;
  uploaded_at?: string;
  retry_count: number;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

export interface VideoUploadProgress {
  videoId: string;
  progress: number; // 0-100
  status: VideoRecord['status'];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════════════════════════════════════════

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formatDatePath = (): string => {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Local Video Queue (오프라인 지원)
// ═══════════════════════════════════════════════════════════════════════════════

const VIDEO_QUEUE_KEY = '@coach_video_queue';

const VideoQueue = {
  async getAll(): Promise<VideoRecord[]> {
    try {
      const data = await AsyncStorage.getItem(VIDEO_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async add(video: VideoRecord): Promise<void> {
    const queue = await this.getAll();
    const exists = queue.some(v => v.id === video.id);
    if (!exists) {
      queue.push(video);
      await AsyncStorage.setItem(VIDEO_QUEUE_KEY, JSON.stringify(queue));
    }
  },

  async update(videoId: string, updates: Partial<VideoRecord>): Promise<void> {
    const queue = await this.getAll();
    const index = queue.findIndex(v => v.id === videoId);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await AsyncStorage.setItem(VIDEO_QUEUE_KEY, JSON.stringify(queue));
    }
  },

  async remove(videoId: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter(v => v.id !== videoId);
    await AsyncStorage.setItem(VIDEO_QUEUE_KEY, JSON.stringify(filtered));
  },

  async getPending(): Promise<VideoRecord[]> {
    const queue = await this.getAll();
    return queue.filter(v => v.status === 'LOCAL' || v.status === 'FAILED');
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Video Service
// ═══════════════════════════════════════════════════════════════════════════════

export const VideoService = {
  /**
   * 새 영상 레코드 생성 (녹화 시작 시)
   */
  createVideoRecord(
    sessionId: string,
    localUri: string,
    options?: {
      studentId?: string;
      coachId?: string;
      durationSeconds?: number;
      fileSizeBytes?: number;
      metadata?: VideoRecord['metadata'];
    }
  ): VideoRecord {
    return {
      id: generateUUID(),
      session_id: sessionId,
      student_id: options?.studentId,
      coach_id: options?.coachId,
      local_uri: localUri,
      duration_seconds: options?.durationSeconds || 0,
      file_size_bytes: options?.fileSizeBytes || 0,
      status: 'LOCAL',
      created_at: new Date().toISOString(),
      retry_count: 0,
      metadata: options?.metadata,
    };
  },

  /**
   * 영상 로컬 저장 (녹화 완료 후)
   */
  async saveToLocal(video: VideoRecord): Promise<void> {
    await VideoQueue.add(video);
  },

  /**
   * Supabase Storage에 영상 업로드
   */
  async uploadVideo(
    video: VideoRecord,
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // 상태 업데이트
      await VideoQueue.update(video.id, { status: 'UPLOADING' });
      onProgress?.({ videoId: video.id, progress: 0, status: 'UPLOADING' });

      // 파일 존재 확인
      const fileInfo = await FileSystem.getInfoAsync(video.local_uri);
      if (!fileInfo.exists) {
        throw new Error('Local video file not found');
      }

      // 파일 읽기
      const fileContent = await FileSystem.readAsStringAsync(video.local_uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Storage 경로 생성: videos/YYYY/MM/DD/session_id/video_id.mp4
      const datePath = formatDatePath();
      const storagePath = `videos/${datePath}/${video.session_id}/${video.id}.mp4`;

      // Base64 디코딩 및 업로드
      const { data, error } = await supabase.storage
        .from('lesson-videos')
        .upload(storagePath, decode(fileContent), {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('lesson-videos')
        .getPublicUrl(storagePath);

      const publicUrl = urlData?.publicUrl;

      // 업로드 성공 - 큐 업데이트
      await VideoQueue.update(video.id, {
        status: 'UPLOADED',
        remote_url: publicUrl,
        uploaded_at: new Date().toISOString(),
      });

      // DB에 영상 메타데이터 저장
      await this.saveVideoMetadata({
        ...video,
        remote_url: publicUrl,
        status: 'UPLOADED',
        uploaded_at: new Date().toISOString(),
      });

      onProgress?.({ videoId: video.id, progress: 100, status: 'UPLOADED' });

      // 로컬 큐에서 제거 (성공 후)
      await VideoQueue.remove(video.id);

      return { success: true, url: publicUrl };
    } catch (error: unknown) {
      if (__DEV__) console.error('Video upload failed:', error);

      // 실패 시 재시도 카운트 증가
      await VideoQueue.update(video.id, {
        status: 'FAILED',
        retry_count: video.retry_count + 1,
      });

      onProgress?.({ videoId: video.id, progress: 0, status: 'FAILED' });

      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  /**
   * DB에 영상 메타데이터 저장
   */
  async saveVideoMetadata(video: VideoRecord): Promise<boolean> {
    try {
      const { error } = await supabase.from('atb_video_records').insert({
        id: video.id,
        session_id: video.session_id,
        student_id: video.student_id,
        coach_id: video.coach_id,
        video_url: video.remote_url,
        duration_seconds: video.duration_seconds,
        file_size_bytes: video.file_size_bytes,
        status: video.status,
        metadata: video.metadata,
        created_at: video.created_at,
        uploaded_at: video.uploaded_at,
      });

      if (error) {
        if (__DEV__) console.error('Failed to save video metadata:', error);
        return false;
      }

      return true;
    } catch (error: unknown) {
      if (__DEV__) console.error('Exception saving video metadata:', error);
      return false;
    }
  },

  /**
   * 대기 중인 영상 모두 업로드 시도
   */
  async syncPendingVideos(
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<{ success: number; failed: number }> {
    const pending = await VideoQueue.getPending();
    let success = 0;
    let failed = 0;

    for (const video of pending) {
      // 최대 3회 재시도
      if (video.retry_count >= 3) {
        if (__DEV__) console.warn(`Video ${video.id} exceeded max retries, skipping`);
        failed++;
        continue;
      }

      const result = await this.uploadVideo(video, onProgress);
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  },

  /**
   * 대기 중인 영상 수 조회
   */
  async getPendingCount(): Promise<number> {
    const pending = await VideoQueue.getPending();
    return pending.length;
  },

  /**
   * 세션의 영상 목록 조회
   */
  async getSessionVideos(sessionId: string): Promise<VideoRecord[]> {
    try {
      const { data, error } = await supabase
        .from('atb_video_records')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        if (__DEV__) console.error('Failed to fetch session videos:', error);
        return [];
      }

      return data || [];
    } catch (error: unknown) {
      if (__DEV__) console.error('Exception fetching session videos:', error);
      return [];
    }
  },

  /**
   * 학생의 영상 목록 조회 (학부모 알림톡 링크용)
   */
  async getStudentVideos(studentId: string, limit = 10): Promise<VideoRecord[]> {
    try {
      const { data, error } = await supabase
        .from('atb_video_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'UPLOADED')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (__DEV__) console.error('Failed to fetch student videos:', error);
        return [];
      }

      return data || [];
    } catch (error: unknown) {
      if (__DEV__) console.error('Exception fetching student videos:', error);
      return [];
    }
  },

  /**
   * 로컬 영상 파일 정리 (업로드 완료 후)
   */
  async cleanupLocalFiles(): Promise<number> {
    const all = await VideoQueue.getAll();
    const uploaded = all.filter(v => v.status === 'UPLOADED');
    let cleaned = 0;

    for (const video of uploaded) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(video.local_uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(video.local_uri);
          cleaned++;
        }
        await VideoQueue.remove(video.id);
      } catch (error: unknown) {
        if (__DEV__) console.error(`Failed to cleanup ${video.id}:`, error);
      }
    }

    return cleaned;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Base64 decode
// ═══════════════════════════════════════════════════════════════════════════════

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default VideoService;
