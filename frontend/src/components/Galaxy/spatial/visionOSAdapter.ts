// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - VisionOS/AR 환경 이식 어댑터
// ═══════════════════════════════════════════════════════════════════════════════
//
// Apple Vision Pro, Meta Quest, AR 글래스 환경 대비
// - 공간 컴퓨팅 좌표계 변환
// - 시선 추적 (Gaze) 인터페이스
// - 제스처 인터랙션 (Pinch, Swipe)
// - 공간 오디오 힌트
//
// ═══════════════════════════════════════════════════════════════════════════════

import { Vector3, Quaternion, Euler } from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type SpatialPlatform = 'visionos' | 'meta_quest' | 'webxr' | 'ar_glasses' | 'desktop';

export interface SpatialConfig {
  platform: SpatialPlatform;
  
  // 공간 설정
  worldScale: number;           // 실제 공간 대비 스케일 (1 = 1m)
  userHeight: number;           // 사용자 눈 높이 (m)
  comfortZone: {
    minDistance: number;        // 최소 편안한 거리 (m)
    maxDistance: number;        // 최대 편안한 거리 (m)
    optimalDistance: number;    // 최적 거리 (m)
  };
  
  // 인터랙션
  gazeEnabled: boolean;
  gestureEnabled: boolean;
  voiceEnabled: boolean;
  hapticEnabled: boolean;
  
  // 렌더링
  stereoscopic: boolean;
  foveatedRendering: boolean;   // 시선 중심 고해상도
  passthrough: boolean;         // AR 패스스루
}

export interface GazeData {
  origin: Vector3;
  direction: Vector3;
  timestamp: number;
  confidence: number;
  hitPoint?: Vector3;
  hitNodeId?: string;
}

export interface GestureData {
  type: 'pinch' | 'grab' | 'swipe' | 'point' | 'palm_up' | 'palm_down';
  hand: 'left' | 'right' | 'both';
  position: Vector3;
  rotation: Quaternion;
  strength: number;
  timestamp: number;
}

export interface SpatialAudioCue {
  nodeId: string;
  position: Vector3;
  volume: number;
  pitch: number;
  type: 'notification' | 'warning' | 'success' | 'ambient';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 플랫폼별 기본 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const SPATIAL_CONFIGS: Record<SpatialPlatform, SpatialConfig> = {
  visionos: {
    platform: 'visionos',
    worldScale: 0.5,            // 책상 위 스케일
    userHeight: 1.6,
    comfortZone: {
      minDistance: 0.5,
      maxDistance: 3.0,
      optimalDistance: 1.2,
    },
    gazeEnabled: true,
    gestureEnabled: true,
    voiceEnabled: true,
    hapticEnabled: false,       // Vision Pro는 햅틱 없음
    stereoscopic: true,
    foveatedRendering: true,
    passthrough: true,
  },
  
  meta_quest: {
    platform: 'meta_quest',
    worldScale: 0.6,
    userHeight: 1.6,
    comfortZone: {
      minDistance: 0.4,
      maxDistance: 4.0,
      optimalDistance: 1.5,
    },
    gazeEnabled: true,
    gestureEnabled: true,
    voiceEnabled: true,
    hapticEnabled: true,
    stereoscopic: true,
    foveatedRendering: true,
    passthrough: true,
  },
  
  webxr: {
    platform: 'webxr',
    worldScale: 0.7,
    userHeight: 1.6,
    comfortZone: {
      minDistance: 0.5,
      maxDistance: 5.0,
      optimalDistance: 2.0,
    },
    gazeEnabled: false,
    gestureEnabled: false,
    voiceEnabled: false,
    hapticEnabled: false,
    stereoscopic: true,
    foveatedRendering: false,
    passthrough: false,
  },
  
  ar_glasses: {
    platform: 'ar_glasses',
    worldScale: 0.4,
    userHeight: 1.6,
    comfortZone: {
      minDistance: 0.3,
      maxDistance: 2.0,
      optimalDistance: 0.8,
    },
    gazeEnabled: true,
    gestureEnabled: false,
    voiceEnabled: true,
    hapticEnabled: false,
    stereoscopic: true,
    foveatedRendering: false,
    passthrough: true,
  },
  
  desktop: {
    platform: 'desktop',
    worldScale: 1.0,
    userHeight: 0,
    comfortZone: {
      minDistance: 10,
      maxDistance: 80,
      optimalDistance: 35,
    },
    gazeEnabled: false,
    gestureEnabled: false,
    voiceEnabled: false,
    hapticEnabled: false,
    stereoscopic: false,
    foveatedRendering: false,
    passthrough: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 좌표계 변환
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 데스크톱 좌표 → 공간 컴퓨팅 좌표 변환
 * 책상 위에 미니 은하계처럼 배치
 */
export function toSpatialCoordinates(
  position: Vector3,
  config: SpatialConfig
): Vector3 {
  const scaled = position.clone().multiplyScalar(config.worldScale);
  
  // 사용자 앞 최적 거리에 배치
  scaled.z -= config.comfortZone.optimalDistance;
  
  // 눈높이 기준 조정
  scaled.y += config.userHeight * 0.7; // 시선보다 약간 아래
  
  return scaled;
}

/**
 * 공간 컴퓨팅 좌표 → 데스크톱 좌표 변환
 */
export function fromSpatialCoordinates(
  position: Vector3,
  config: SpatialConfig
): Vector3 {
  const unscaled = position.clone();
  
  unscaled.z += config.comfortZone.optimalDistance;
  unscaled.y -= config.userHeight * 0.7;
  
  return unscaled.divideScalar(config.worldScale);
}

/**
 * Z-축 심도를 공간적 거리로 변환
 * K가 높은 노드는 사용자에게 물리적으로 가깝게
 */
export function zDepthToSpatialDistance(
  zDepth: number,
  config: SpatialConfig
): number {
  // zDepth: -5 (가까움) ~ -25 (멀음)
  const normalized = (zDepth + 5) / 20; // 0 (가까움) ~ 1 (멀음)
  
  const { minDistance, maxDistance } = config.comfortZone;
  return minDistance + normalized * (maxDistance - minDistance);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 시선 추적 (Gaze) 인터페이스
// ═══════════════════════════════════════════════════════════════════════════════

export class GazeTracker {
  private lastGaze: GazeData | null = null;
  private gazeHistory: GazeData[] = [];
  private dwellThreshold: number = 500; // ms
  private dwellCallback: ((nodeId: string) => void) | null = null;
  
  constructor(
    private config: SpatialConfig,
    private onGaze?: (gaze: GazeData) => void
  ) {}
  
  /**
   * 시선 데이터 업데이트
   */
  update(gaze: GazeData): void {
    this.lastGaze = gaze;
    this.gazeHistory.push(gaze);
    
    // 히스토리 크기 제한
    if (this.gazeHistory.length > 60) {
      this.gazeHistory.shift();
    }
    
    // Dwell 감지 (같은 노드를 일정 시간 응시)
    if (gaze.hitNodeId) {
      this.checkDwell(gaze.hitNodeId, gaze.timestamp);
    }
    
    this.onGaze?.(gaze);
  }
  
  /**
   * Dwell 선택 감지
   */
  private checkDwell(nodeId: string, timestamp: number): void {
    const dwellStart = this.gazeHistory.find(
      g => g.hitNodeId === nodeId
    )?.timestamp;
    
    if (dwellStart && timestamp - dwellStart >= this.dwellThreshold) {
      this.dwellCallback?.(nodeId);
    }
  }
  
  /**
   * Dwell 콜백 설정
   */
  onDwell(callback: (nodeId: string) => void): void {
    this.dwellCallback = callback;
  }
  
  /**
   * 현재 응시 중인 노드
   */
  getCurrentTarget(): string | undefined {
    return this.lastGaze?.hitNodeId;
  }
  
  /**
   * 시선 레이캐스트 방향
   */
  getGazeRay(): { origin: Vector3; direction: Vector3 } | null {
    if (!this.lastGaze) return null;
    return {
      origin: this.lastGaze.origin,
      direction: this.lastGaze.direction,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 제스처 인터랙션
// ═══════════════════════════════════════════════════════════════════════════════

export class GestureHandler {
  private activeGestures: Map<string, GestureData> = new Map();
  
  constructor(
    private config: SpatialConfig,
    private callbacks: {
      onPinch?: (data: GestureData) => void;
      onGrab?: (data: GestureData) => void;
      onSwipe?: (data: GestureData, direction: Vector3) => void;
      onPoint?: (data: GestureData) => void;
    }
  ) {}
  
  /**
   * 제스처 업데이트
   */
  update(gesture: GestureData): void {
    const key = `${gesture.hand}-${gesture.type}`;
    this.activeGestures.set(key, gesture);
    
    switch (gesture.type) {
      case 'pinch':
        if (gesture.strength > 0.8) {
          this.callbacks.onPinch?.(gesture);
        }
        break;
      
      case 'grab':
        if (gesture.strength > 0.7) {
          this.callbacks.onGrab?.(gesture);
        }
        break;
      
      case 'swipe':
        // 스와이프 방향 계산
        const prevGesture = this.activeGestures.get(key);
        if (prevGesture) {
          const direction = gesture.position.clone().sub(prevGesture.position);
          if (direction.length() > 0.1) {
            this.callbacks.onSwipe?.(gesture, direction.normalize());
          }
        }
        break;
      
      case 'point':
        this.callbacks.onPoint?.(gesture);
        break;
    }
  }
  
  /**
   * 양손 동시 제스처 감지
   */
  isBothHandsActive(type: GestureData['type']): boolean {
    return (
      this.activeGestures.has(`left-${type}`) &&
      this.activeGestures.has(`right-${type}`)
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 공간 오디오
// ═══════════════════════════════════════════════════════════════════════════════

export class SpatialAudioManager {
  private audioContext: AudioContext | null = null;
  private pannerNodes: Map<string, PannerNode> = new Map();
  
  constructor(private config: SpatialConfig) {
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext();
    }
  }
  
  /**
   * 노드 위치에 따른 공간 오디오 큐
   */
  playCue(cue: SpatialAudioCue): void {
    if (!this.audioContext) return;
    
    // 위치 기반 패너 설정
    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    
    const spatialPos = toSpatialCoordinates(cue.position, this.config);
    panner.positionX.value = spatialPos.x;
    panner.positionY.value = spatialPos.y;
    panner.positionZ.value = spatialPos.z;
    
    // 오실레이터로 간단한 사운드 생성
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // 타입별 주파수
    const frequencies = {
      notification: 440,
      warning: 880,
      success: 523,
      ambient: 220,
    };
    
    oscillator.frequency.value = frequencies[cue.type] * cue.pitch;
    oscillator.type = cue.type === 'warning' ? 'sawtooth' : 'sine';
    
    gainNode.gain.value = cue.volume * 0.3;
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.audioContext.destination);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.5);
    
    this.pannerNodes.set(cue.nodeId, panner);
  }
  
  /**
   * 노드 위치 업데이트
   */
  updateNodePosition(nodeId: string, position: Vector3): void {
    const panner = this.pannerNodes.get(nodeId);
    if (panner) {
      const spatialPos = toSpatialCoordinates(position, this.config);
      panner.positionX.value = spatialPos.x;
      panner.positionY.value = spatialPos.y;
      panner.positionZ.value = spatialPos.z;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VisionOS 어댑터 메인 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class VisionOSAdapter {
  public config: SpatialConfig;
  public gazeTracker: GazeTracker;
  public gestureHandler: GestureHandler;
  public audioManager: SpatialAudioManager;
  
  private platform: SpatialPlatform;
  
  constructor(platform: SpatialPlatform = 'desktop') {
    this.platform = platform;
    this.config = SPATIAL_CONFIGS[platform];
    
    this.gazeTracker = new GazeTracker(this.config);
    this.gestureHandler = new GestureHandler(this.config, {
      onPinch: (g) => this.handlePinch(g),
      onGrab: (g) => this.handleGrab(g),
      onSwipe: (g, d) => this.handleSwipe(g, d),
    });
    this.audioManager = new SpatialAudioManager(this.config);
  }
  
  /**
   * 플랫폼 감지
   */
  static detectPlatform(): SpatialPlatform {
    if (typeof navigator === 'undefined') return 'desktop';
    
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('vision')) return 'visionos';
    if (ua.includes('quest')) return 'meta_quest';
    if ('xr' in navigator) return 'webxr';
    
    return 'desktop';
  }
  
  /**
   * 노드 위치를 현재 플랫폼에 맞게 변환
   */
  adaptPosition(position: Vector3): Vector3 {
    if (this.platform === 'desktop') {
      return position.clone();
    }
    return toSpatialCoordinates(position, this.config);
  }
  
  /**
   * 핀치 처리
   */
  private handlePinch(gesture: GestureData): void {
    console.log('[VisionOS] Pinch detected', gesture);
    // 노드 선택
  }
  
  /**
   * 그랩 처리
   */
  private handleGrab(gesture: GestureData): void {
    console.log('[VisionOS] Grab detected', gesture);
    // 노드 이동
  }
  
  /**
   * 스와이프 처리
   */
  private handleSwipe(gesture: GestureData, direction: Vector3): void {
    console.log('[VisionOS] Swipe detected', direction);
    // 카메라 회전
  }
  
  /**
   * 플랫폼별 렌더링 힌트
   */
  getRenderingHints(): {
    pixelRatio: number;
    antialiasing: boolean;
    shadows: boolean;
    maxLights: number;
  } {
    switch (this.platform) {
      case 'visionos':
        return { pixelRatio: 1, antialiasing: true, shadows: false, maxLights: 4 };
      case 'meta_quest':
        return { pixelRatio: 1, antialiasing: true, shadows: false, maxLights: 4 };
      case 'webxr':
        return { pixelRatio: 1, antialiasing: false, shadows: false, maxLights: 2 };
      default:
        return { pixelRatio: 2, antialiasing: true, shadows: true, maxLights: 8 };
    }
  }
}

export default VisionOSAdapter;
