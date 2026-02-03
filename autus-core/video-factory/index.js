/**
 * 🎬 올댓바스켓 Video Factory
 *
 * 대량 생산 구조:
 * - 비용: 0 ~ 3만원/월
 * - 속도: 병렬 처리
 * - 품질: 템플릿 + 효과
 *
 * 코치는 촬영만 → 나머지 자동
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// ============================================
// 설정
// ============================================
const CONFIG = {
  // 경로
  inputDir: './videos/raw',
  outputDir: './videos/processed',
  templatesDir: './templates',

  // YouTube
  youtubeChannel: 'AllThatBasket',
  defaultPrivacy: 'unlisted', // 비공개 링크

  // 품질
  outputQuality: '1080p',
  bitrate: '8M',

  // 효과
  defaultEffects: ['intro', 'nameTag', 'colorGrade', 'outro'],
  musicVolume: 0.3,
};

// ============================================
// 효과 템플릿 (FFmpeg 필터)
// ============================================
const EFFECTS = {
  // 인트로 (3초)
  intro: {
    filter: `[0:v]fade=t=in:st=0:d=0.5[v]`,
    duration: 3,
  },

  // 아웃트로 (3초)
  outro: {
    filter: `[0:v]fade=t=out:st=-0.5:d=0.5[v]`,
    duration: 3,
  },

  // 슬로우모션 (0.5x)
  slowmo: {
    filter: `[0:v]setpts=2.0*PTS[v];[0:a]atempo=0.5[a]`,
  },

  // 속도 업 (1.5x)
  speedup: {
    filter: `[0:v]setpts=0.67*PTS[v];[0:a]atempo=1.5[a]`,
  },

  // 줌 인 (1.2x)
  zoomIn: {
    filter: `[0:v]scale=iw*1.2:ih*1.2,crop=iw/1.2:ih/1.2[v]`,
  },

  // 컬러 그레이딩 (시네마틱)
  colorGrade: {
    filter: `[0:v]eq=contrast=1.1:brightness=0.05:saturation=1.2,unsharp=5:5:1.0:5:5:0.0[v]`,
  },

  // 비네팅 (가장자리 어둡게)
  vignette: {
    filter: `[0:v]vignette=PI/4[v]`,
  },

  // 이름 자막
  nameTag: (name, position = 'bottom') => ({
    filter: `[0:v]drawtext=text='${name}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-80:box=1:boxcolor=black@0.5:boxborderw=10[v]`,
  }),

  // 날짜 자막
  dateTag: (date) => ({
    filter: `[0:v]drawtext=text='${date}':fontsize=24:fontcolor=white:x=w-text_w-20:y=20[v]`,
  }),
};

// ============================================
// 프리셋 (용도별 효과 조합)
// ============================================
const PRESETS = {
  // 일반 훈련 영상
  training: {
    effects: ['colorGrade', 'nameTag', 'dateTag'],
    music: 'upbeat',
    duration: null, // 원본 길이
  },

  // 하이라이트
  highlight: {
    effects: ['colorGrade', 'slowmo', 'zoomIn', 'nameTag'],
    music: 'epic',
    duration: 30, // 30초
  },

  // 분기 요약
  quarterly: {
    effects: ['intro', 'colorGrade', 'nameTag', 'outro'],
    music: 'emotional',
    duration: 120, // 2분
  },

  // 성장 비교 (Before/After)
  comparison: {
    effects: ['colorGrade', 'nameTag'],
    layout: 'splitScreen',
    music: 'inspiring',
    duration: 60,
  },
};

// ============================================
// Video Factory 클래스
// ============================================
export class VideoFactory {

  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this.queue = [];
    this.processing = false;
  }

  /**
   * 영상 처리 요청 추가
   */
  async addToQueue(job) {
    const jobId = `VF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.queue.push({
      id: jobId,
      ...job,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // 자동 처리 시작
    if (!this.processing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * 큐 처리 (병렬)
   */
  async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      // 최대 3개 병렬 처리
      const batch = this.queue.splice(0, 3);

      await Promise.all(
        batch.map(job => this.processJob(job))
      );
    }

    this.processing = false;
  }

  /**
   * 개별 작업 처리
   */
  async processJob(job) {
    try {
      job.status = 'processing';
      console.log(`[VideoFactory] Processing: ${job.id}`);

      // 1. 프리셋 적용
      const preset = PRESETS[job.preset] || PRESETS.training;

      // 2. FFmpeg 필터 생성
      const filters = this.buildFilters(preset, job);

      // 3. 영상 처리
      const outputPath = await this.processVideo(job.inputPath, filters, job);

      // 4. YouTube 업로드
      if (job.autoUpload !== false) {
        const youtubeUrl = await this.uploadToYouTube(outputPath, job);
        job.youtubeUrl = youtubeUrl;
      }

      job.status = 'completed';
      job.outputPath = outputPath;
      job.completedAt = new Date().toISOString();

      console.log(`[VideoFactory] Completed: ${job.id}`);

      return job;

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      console.error(`[VideoFactory] Failed: ${job.id}`, error);
      return job;
    }
  }

  /**
   * FFmpeg 필터 빌드
   */
  buildFilters(preset, job) {
    const filters = [];

    preset.effects.forEach(effectName => {
      const effect = EFFECTS[effectName];
      if (!effect) return;

      if (typeof effect === 'function') {
        // 동적 효과 (nameTag 등)
        if (effectName === 'nameTag' && job.studentName) {
          filters.push(effect(job.studentName).filter);
        }
        if (effectName === 'dateTag' && job.date) {
          filters.push(effect(job.date).filter);
        }
      } else {
        filters.push(effect.filter);
      }
    });

    return filters.join(';');
  }

  /**
   * FFmpeg로 영상 처리
   */
  processVideo(inputPath, filters, job) {
    return new Promise((resolve, reject) => {
      const outputFilename = `${job.studentName || 'video'}_${Date.now()}.mp4`;
      const outputPath = path.join(this.config.outputDir, outputFilename);

      // FFmpeg 명령어
      const args = [
        '-i', inputPath,
        '-vf', filters || 'null',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);

      ffmpeg.stderr.on('data', (data) => {
        // 진행 상황 로그 (선택)
        // console.log(data.toString());
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * YouTube 업로드
   */
  async uploadToYouTube(videoPath, job) {
    // YouTube Data API v3 사용
    // 실제 구현시 google-auth-library + googleapis 사용

    const metadata = {
      title: `${job.studentName} - ${job.title || '훈련 영상'}`,
      description: `올댓바스켓 농구 아카데미\n${job.date || new Date().toISOString().split('T')[0]}`,
      tags: ['올댓바스켓', '농구', job.studentName, job.className || ''],
      privacyStatus: this.config.defaultPrivacy,
      playlistId: job.playlistId, // 학생별 재생목록
    };

    console.log(`[YouTube] Uploading: ${metadata.title}`);

    // TODO: 실제 YouTube API 호출
    // const youtube = google.youtube({ version: 'v3', auth });
    // const response = await youtube.videos.insert({ ... });

    // 임시 반환
    return `https://youtu.be/${Math.random().toString(36).substr(2, 11)}`;
  }

  /**
   * 분기 요약 영상 생성
   */
  async createQuarterlyVideo(studentId, quarter) {
    console.log(`[VideoFactory] Creating quarterly video: ${studentId} Q${quarter}`);

    // 1. 해당 분기 영상 목록 조회
    // 2. 하이라이트 자동 선별
    // 3. 인트로 + 하이라이트 + Before/After + 아웃트로
    // 4. 업로드

    const job = {
      type: 'quarterly',
      studentId,
      quarter,
      preset: 'quarterly',
      autoUpload: true,
    };

    return this.addToQueue(job);
  }

  /**
   * 팀 영상에서 개인 추출
   */
  async extractIndividuals(teamVideoPath, students) {
    console.log(`[VideoFactory] Extracting ${students.length} individuals`);

    // YOLO v8 + ByteTrack으로 개인 추적 및 추출
    // 각 학생별 개별 영상 생성

    const jobs = students.map(student => ({
      type: 'individual',
      inputPath: teamVideoPath,
      studentId: student.id,
      studentName: student.name,
      preset: 'training',
      autoUpload: true,
    }));

    return Promise.all(jobs.map(job => this.addToQueue(job)));
  }

  /**
   * 상태 조회
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      pending: this.queue.filter(j => j.status === 'pending').length,
      completed: this.queue.filter(j => j.status === 'completed').length,
      failed: this.queue.filter(j => j.status === 'failed').length,
    };
  }
}

// ============================================
// 싱글톤 인스턴스
// ============================================
export const videoFactory = new VideoFactory();

// ============================================
// API 엔드포인트용 함수들
// ============================================
export async function processTrainingVideo(inputPath, studentName, options = {}) {
  return videoFactory.addToQueue({
    type: 'training',
    inputPath,
    studentName,
    preset: 'training',
    ...options,
  });
}

export async function processHighlight(inputPath, studentName, options = {}) {
  return videoFactory.addToQueue({
    type: 'highlight',
    inputPath,
    studentName,
    preset: 'highlight',
    ...options,
  });
}

export async function createQuarterlySummary(studentId, quarter) {
  return videoFactory.createQuarterlyVideo(studentId, quarter);
}

export default videoFactory;
