// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Adaptive Performance Monitor
// ═══════════════════════════════════════════════════════════════════════════════
//
// FPS 방어 시스템:
// - 실시간 FPS 모니터링
// - 자동 품질 조절 (DPR, Bloom 강도, 노드 수)
// - 성능 경고 및 최적화 제안
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';

// 성능 수준 정의
export type PerformanceLevel = 'ultra' | 'high' | 'medium' | 'low' | 'potato';

export interface PerformanceSettings {
  level: PerformanceLevel;
  dpr: number;                    // Device Pixel Ratio
  bloomIntensity: number;         // Bloom 강도
  bloomRadius: number;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  maxVisibleNodes: number;        // 최대 표시 노드 수
  connectionLines: boolean;       // 연결선 표시
  postProcessing: boolean;        // 후처리 효과
  particleCount: number;          // 배경 입자 수
}

// 수준별 프리셋
const PERFORMANCE_PRESETS: Record<PerformanceLevel, PerformanceSettings> = {
  ultra: {
    level: 'ultra',
    dpr: 2,
    bloomIntensity: 1.5,
    bloomRadius: 0.8,
    shadowQuality: 'high',
    maxVisibleNodes: 570,
    connectionLines: true,
    postProcessing: true,
    particleCount: 5000,
  },
  high: {
    level: 'high',
    dpr: 1.5,
    bloomIntensity: 1.2,
    bloomRadius: 0.6,
    shadowQuality: 'medium',
    maxVisibleNodes: 570,
    connectionLines: true,
    postProcessing: true,
    particleCount: 3000,
  },
  medium: {
    level: 'medium',
    dpr: 1,
    bloomIntensity: 0.8,
    bloomRadius: 0.4,
    shadowQuality: 'low',
    maxVisibleNodes: 400,
    connectionLines: true,
    postProcessing: true,
    particleCount: 2000,
  },
  low: {
    level: 'low',
    dpr: 0.75,
    bloomIntensity: 0.5,
    bloomRadius: 0.3,
    shadowQuality: 'off',
    maxVisibleNodes: 200,
    connectionLines: false,
    postProcessing: false,
    particleCount: 1000,
  },
  potato: {
    level: 'potato',
    dpr: 0.5,
    bloomIntensity: 0,
    bloomRadius: 0,
    shadowQuality: 'off',
    maxVisibleNodes: 100,
    connectionLines: false,
    postProcessing: false,
    particleCount: 500,
  },
};

// FPS 임계값
const FPS_THRESHOLDS = {
  excellent: 58,  // 58+ FPS
  good: 50,       // 50-57 FPS
  acceptable: 40, // 40-49 FPS
  poor: 30,       // 30-39 FPS
  critical: 20,   // 20-29 FPS
};

export interface PerformanceStats {
  fps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameTime: number;
  memoryUsage?: number;
  drawCalls?: number;
  triangles?: number;
}

interface UseAdaptivePerformanceOptions {
  targetFps?: number;
  sampleSize?: number;           // FPS 평균 계산용 샘플 수
  adaptationDelay?: number;      // 품질 변경 전 대기 시간 (ms)
  autoAdapt?: boolean;           // 자동 품질 조절
  initialLevel?: PerformanceLevel;
}

interface UseAdaptivePerformanceReturn {
  stats: PerformanceStats;
  settings: PerformanceSettings;
  setLevel: (level: PerformanceLevel) => void;
  forceAdapt: () => void;
  isAdapting: boolean;
}

export function useAdaptivePerformance(
  options: UseAdaptivePerformanceOptions = {}
): UseAdaptivePerformanceReturn {
  const {
    targetFps = 55,
    sampleSize = 60,
    adaptationDelay = 2000,
    autoAdapt = true,
    initialLevel = 'high',
  } = options;
  
  const [settings, setSettings] = useState<PerformanceSettings>(
    PERFORMANCE_PRESETS[initialLevel]
  );
  const [isAdapting, setIsAdapting] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    avgFps: 60,
    minFps: 60,
    maxFps: 60,
    frameTime: 16.67,
  });
  
  // FPS 히스토리
  const fpsHistoryRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const lastAdaptTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  
  // FPS 측정
  useEffect(() => {
    let animationId: number;
    
    const measureFps = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= 1000) { // 1초마다 계산
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        
        // 히스토리 업데이트
        fpsHistoryRef.current.push(fps);
        if (fpsHistoryRef.current.length > sampleSize) {
          fpsHistoryRef.current.shift();
        }
        
        // 통계 계산
        const history = fpsHistoryRef.current;
        const avgFps = Math.round(
          history.reduce((a, b) => a + b, 0) / history.length
        );
        const minFps = Math.min(...history);
        const maxFps = Math.max(...history);
        
        setStats({
          fps,
          avgFps,
          minFps,
          maxFps,
          frameTime: 1000 / fps,
        });
        
        // 자동 적응
        if (autoAdapt && now - lastAdaptTimeRef.current > adaptationDelay) {
          adaptQuality(avgFps);
        }
        
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      frameCountRef.current++;
      animationId = requestAnimationFrame(measureFps);
    };
    
    animationId = requestAnimationFrame(measureFps);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [autoAdapt, adaptationDelay, sampleSize]);
  
  // 품질 적응 로직
  const adaptQuality = useCallback((avgFps: number) => {
    const currentLevel = settings.level;
    const levels: PerformanceLevel[] = ['ultra', 'high', 'medium', 'low', 'potato'];
    const currentIndex = levels.indexOf(currentLevel);
    
    let newLevel = currentLevel;
    
    if (avgFps < FPS_THRESHOLDS.poor && currentIndex < levels.length - 1) {
      // 성능 부족: 한 단계 낮춤
      newLevel = levels[currentIndex + 1];
      console.log(`[Performance] 품질 하향: ${currentLevel} → ${newLevel} (FPS: ${avgFps})`);
    } else if (avgFps > FPS_THRESHOLDS.excellent && currentIndex > 0) {
      // 성능 여유: 한 단계 올림
      newLevel = levels[currentIndex - 1];
      console.log(`[Performance] 품질 상향: ${currentLevel} → ${newLevel} (FPS: ${avgFps})`);
    }
    
    if (newLevel !== currentLevel) {
      setIsAdapting(true);
      setSettings(PERFORMANCE_PRESETS[newLevel]);
      lastAdaptTimeRef.current = performance.now();
      
      setTimeout(() => setIsAdapting(false), 500);
    }
  }, [settings.level]);
  
  // 수동 레벨 설정
  const setLevel = useCallback((level: PerformanceLevel) => {
    setSettings(PERFORMANCE_PRESETS[level]);
    lastAdaptTimeRef.current = performance.now();
  }, []);
  
  // 강제 적응
  const forceAdapt = useCallback(() => {
    adaptQuality(stats.avgFps);
  }, [adaptQuality, stats.avgFps]);
  
  return {
    stats,
    settings,
    setLevel,
    forceAdapt,
    isAdapting,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 성능 모니터 컴포넌트 (디버그용)
// ═══════════════════════════════════════════════════════════════════════════════

export function PerformanceOverlay({ 
  stats, 
  settings,
  show = true 
}: { 
  stats: PerformanceStats; 
  settings: PerformanceSettings;
  show?: boolean;
}) {
  if (!show) return null;
  
  const fpsColor = stats.fps >= 55 ? '#10B981' : 
                   stats.fps >= 40 ? '#F59E0B' : '#EF4444';
  
  return (
    <div className="fixed top-4 left-4 z-50 font-mono text-xs bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/50">FPS</span>
        <span className="text-xl font-bold" style={{ color: fpsColor }}>
          {stats.fps}
        </span>
        <span className="text-white/30">
          (avg: {stats.avgFps} | min: {stats.minFps} | max: {stats.maxFps})
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/40">
        <span>Quality:</span>
        <span className="text-amber-400">{settings.level.toUpperCase()}</span>
        
        <span>DPR:</span>
        <span>{settings.dpr}</span>
        
        <span>Bloom:</span>
        <span>{settings.bloomIntensity.toFixed(1)}</span>
        
        <span>Max Nodes:</span>
        <span>{settings.maxVisibleNodes}</span>
        
        <span>Post FX:</span>
        <span>{settings.postProcessing ? '✓' : '✗'}</span>
      </div>
    </div>
  );
}
