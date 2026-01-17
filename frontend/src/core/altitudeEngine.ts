// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Altitude Engine (The World)
// ═══════════════════════════════════════════════════════════════════════════════
//
// 줌/스크롤 → 고도(K-Scale) 이동 매핑
// 카메라 Z축 → UI 컴포넌트 자동 교체 (Mount/Unmount)
// 고도별 LOD (Level of Detail) 제어
//
// ═══════════════════════════════════════════════════════════════════════════════

import { KScale, SCALE_CONFIGS, ScaleConfig } from './schema';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface AltitudeState {
  currentScale: KScale;
  targetScale: KScale;
  zoomLevel: number;          // 0~1 (0: K1, 1: K10)
  cameraZ: number;            // 실제 카메라 Z 좌표
  isTransitioning: boolean;
  transitionProgress: number; // 0~1
  lockedScale: KScale | null; // 잠긴 고도 (강제 고정)
  maxAllowedScale: KScale;    // 사용자 최대 허용 고도
}

export interface AltitudeConfig {
  minCameraZ: number;         // K1 (가장 가까움)
  maxCameraZ: number;         // K10 (가장 멀리)
  transitionDuration: number; // 전환 시간 (ms)
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  snapToScale: boolean;       // 스케일 단위로 스냅
  smoothing: number;          // 스무딩 계수 (0~1)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_ALTITUDE_CONFIG: AltitudeConfig = {
  minCameraZ: 10,     // K1: 가장 가까이
  maxCameraZ: 100,    // K10: 가장 멀리
  transitionDuration: 800,
  easing: 'ease-in-out',
  snapToScale: true,
  smoothing: 0.15,
};

// K-Scale별 Z 좌표 경계
const SCALE_Z_BOUNDARIES: Record<KScale, { min: number; max: number }> = {
  1:  { min: 10, max: 18 },
  2:  { min: 18, max: 26 },
  3:  { min: 26, max: 34 },
  4:  { min: 34, max: 44 },
  5:  { min: 44, max: 54 },
  6:  { min: 54, max: 64 },
  7:  { min: 64, max: 74 },
  8:  { min: 74, max: 84 },
  9:  { min: 84, max: 94 },
  10: { min: 94, max: 100 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Altitude Engine 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class AltitudeEngine {
  private state: AltitudeState;
  private config: AltitudeConfig;
  private listeners: Set<(state: AltitudeState) => void> = new Set();
  private animationFrame: number | null = null;
  
  constructor(config: Partial<AltitudeConfig> = {}) {
    this.config = { ...DEFAULT_ALTITUDE_CONFIG, ...config };
    
    this.state = {
      currentScale: 1,
      targetScale: 1,
      zoomLevel: 0,
      cameraZ: this.config.minCameraZ,
      isTransitioning: false,
      transitionProgress: 1,
      lockedScale: null,
      maxAllowedScale: 10,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 공개 API
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 현재 상태 반환
   */
  getState(): Readonly<AltitudeState> {
    return { ...this.state };
  }
  
  /**
   * 특정 K-Scale로 이동
   */
  goToScale(scale: KScale, immediate: boolean = false): boolean {
    // 권한 체크
    if (scale > this.state.maxAllowedScale) {
      console.warn(`[Altitude] Scale ${scale} exceeds max allowed (${this.state.maxAllowedScale})`);
      return false;
    }
    
    // 잠금 체크
    if (this.state.lockedScale !== null && scale !== this.state.lockedScale) {
      console.warn(`[Altitude] Scale locked at K${this.state.lockedScale}`);
      return false;
    }
    
    const targetZ = this.scaleToZ(scale);
    
    if (immediate) {
      this.state.currentScale = scale;
      this.state.targetScale = scale;
      this.state.cameraZ = targetZ;
      this.state.zoomLevel = this.zToZoomLevel(targetZ);
      this.state.isTransitioning = false;
      this.state.transitionProgress = 1;
      this.notifyListeners();
    } else {
      this.state.targetScale = scale;
      this.startTransition(targetZ);
    }
    
    return true;
  }
  
  /**
   * 줌 레벨 설정 (0~1)
   */
  setZoomLevel(level: number): void {
    const clampedLevel = Math.max(0, Math.min(1, level));
    const targetZ = this.zoomLevelToZ(clampedLevel);
    const targetScale = this.zToScale(targetZ);
    
    // 권한 체크
    if (targetScale > this.state.maxAllowedScale) {
      return;
    }
    
    this.state.targetScale = targetScale;
    this.startTransition(targetZ);
  }
  
  /**
   * 휠 이벤트 처리
   */
  handleWheel(deltaY: number): void {
    const delta = deltaY > 0 ? 0.05 : -0.05; // 위로 = 줌아웃, 아래로 = 줌인
    const newLevel = Math.max(0, Math.min(1, this.state.zoomLevel + delta));
    this.setZoomLevel(newLevel);
  }
  
  /**
   * 고도 잠금
   */
  lockScale(scale: KScale): void {
    this.state.lockedScale = scale;
    this.goToScale(scale, true);
    this.notifyListeners();
  }
  
  /**
   * 고도 잠금 해제
   */
  unlockScale(): void {
    this.state.lockedScale = null;
    this.notifyListeners();
  }
  
  /**
   * 최대 허용 고도 설정
   */
  setMaxAllowedScale(scale: KScale): void {
    this.state.maxAllowedScale = scale;
    
    // 현재 고도가 최대치를 초과하면 조정
    if (this.state.currentScale > scale) {
      this.goToScale(scale, true);
    }
    
    this.notifyListeners();
  }
  
  /**
   * 상태 변경 리스너 등록
   */
  subscribe(listener: (state: AltitudeState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * 현재 고도의 LOD 설정 반환
   */
  getCurrentLOD(): ScaleConfig['lod'] {
    return SCALE_CONFIGS[this.state.currentScale].lod;
  }
  
  /**
   * 현재 고도의 UI 설정 반환
   */
  getCurrentUIConfig(): ScaleConfig['ui'] {
    return SCALE_CONFIGS[this.state.currentScale].ui;
  }
  
  /**
   * 정리
   */
  dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.listeners.clear();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 내부 메서드
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 전환 시작
   */
  private startTransition(targetZ: number): void {
    this.state.isTransitioning = true;
    this.state.transitionProgress = 0;
    
    const startZ = this.state.cameraZ;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / this.config.transitionDuration);
      
      // Easing 적용
      const easedProgress = this.applyEasing(progress);
      
      // Z 보간
      this.state.cameraZ = startZ + (targetZ - startZ) * easedProgress;
      this.state.zoomLevel = this.zToZoomLevel(this.state.cameraZ);
      this.state.transitionProgress = progress;
      
      // Scale 업데이트
      const newScale = this.zToScale(this.state.cameraZ);
      if (newScale !== this.state.currentScale) {
        this.state.currentScale = newScale;
      }
      
      this.notifyListeners();
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.state.isTransitioning = false;
        
        // 스냅 적용
        if (this.config.snapToScale) {
          this.state.cameraZ = this.scaleToZ(this.state.currentScale);
          this.state.zoomLevel = this.zToZoomLevel(this.state.cameraZ);
        }
        
        this.notifyListeners();
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }
  
  /**
   * Easing 함수 적용
   */
  private applyEasing(t: number): number {
    switch (this.config.easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - Math.pow(1 - t, 2);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default:
        return t;
    }
  }
  
  /**
   * Z 좌표 → K-Scale 변환
   */
  private zToScale(z: number): KScale {
    for (let scale = 1; scale <= 10; scale++) {
      const bounds = SCALE_Z_BOUNDARIES[scale as KScale];
      if (z >= bounds.min && z < bounds.max) {
        return scale as KScale;
      }
    }
    return z >= 94 ? 10 : 1;
  }
  
  /**
   * K-Scale → Z 좌표 변환 (중앙값)
   */
  private scaleToZ(scale: KScale): number {
    const bounds = SCALE_Z_BOUNDARIES[scale];
    return (bounds.min + bounds.max) / 2;
  }
  
  /**
   * Z 좌표 → 줌 레벨 (0~1)
   */
  private zToZoomLevel(z: number): number {
    return (z - this.config.minCameraZ) / (this.config.maxCameraZ - this.config.minCameraZ);
  }
  
  /**
   * 줌 레벨 → Z 좌표
   */
  private zoomLevelToZ(level: number): number {
    return this.config.minCameraZ + level * (this.config.maxCameraZ - this.config.minCameraZ);
  }
  
  /**
   * 리스너 알림
   */
  private notifyListeners(): void {
    const stateCopy = { ...this.state };
    this.listeners.forEach(listener => listener(stateCopy));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useAltitude(config?: Partial<AltitudeConfig>) {
  const engine = useMemo(() => new AltitudeEngine(config), []);
  const [state, setState] = useState<AltitudeState>(engine.getState());
  
  useEffect(() => {
    const unsubscribe = engine.subscribe(setState);
    return () => {
      unsubscribe();
      engine.dispose();
    };
  }, [engine]);
  
  const goToScale = useCallback((scale: KScale, immediate?: boolean) => {
    return engine.goToScale(scale, immediate);
  }, [engine]);
  
  const setZoomLevel = useCallback((level: number) => {
    engine.setZoomLevel(level);
  }, [engine]);
  
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    engine.handleWheel(e.deltaY);
  }, [engine]);
  
  const lockScale = useCallback((scale: KScale) => {
    engine.lockScale(scale);
  }, [engine]);
  
  const unlockScale = useCallback(() => {
    engine.unlockScale();
  }, [engine]);
  
  const setMaxAllowedScale = useCallback((scale: KScale) => {
    engine.setMaxAllowedScale(scale);
  }, [engine]);
  
  return {
    state,
    engine,
    goToScale,
    setZoomLevel,
    handleWheel,
    lockScale,
    unlockScale,
    setMaxAllowedScale,
    lod: engine.getCurrentLOD(),
    uiConfig: engine.getCurrentUIConfig(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOD Manager (컴포넌트 자동 교체)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LODComponentMap {
  K1_K3: React.ComponentType<any>;   // Tactical UI
  K4_K6: React.ComponentType<any>;   // Strategic UI
  K7_K10: React.ComponentType<any>;  // Universal UI
}

export function getComponentForScale(
  scale: KScale,
  components: LODComponentMap
): React.ComponentType<any> {
  if (scale <= 3) return components.K1_K3;
  if (scale <= 6) return components.K4_K6;
  return components.K7_K10;
}

/**
 * 고도 범위 확인
 */
export function isInScaleRange(
  currentScale: KScale,
  minScale: KScale,
  maxScale: KScale
): boolean {
  return currentScale >= minScale && currentScale <= maxScale;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default AltitudeEngine;
