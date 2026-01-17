/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS GATE TRANSITION SYSTEM
 * K2 ↔ K10 전환 애니메이션 규칙 (불변)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CONSTITUTION:
 * - K2 → K10: 상승 (Ascend) - 느려짐 → 흐림 → 축소 → 전환
 * - K10 → K2: 하강 (Descend) - 확대 → 선명 → 가속 → 전환
 * - Gate 통과: 물리적 저항 체감 필수
 * - 데이터 동일, 표현만 분기
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Altitude = 'K2' | 'K5' | 'K10';

export type GateState = 'NONE' | 'RING' | 'LOCK' | 'AFTERIMAGE';

export type TransitionDirection = 'ASCEND' | 'DESCEND';

export interface TransitionPhase {
  name: string;
  duration: number;
  easing: string;
  effect: TransitionEffect;
}

export interface TransitionEffect {
  blur: number;
  opacity: number;
  scale: number;
  speed: number; // 1 = normal, 0 = frozen
}

export interface GateTransitionConfig {
  direction: TransitionDirection;
  from: Altitude;
  to: Altitude;
  phases: TransitionPhase[];
  totalDuration: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS (IMMUTABLE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * K2 → K10 상승 전환 (Ascend)
 * "K2는 이해하지 않는다. 느끼고 감속한다."
 * 상승 시: 점진적 감속 → 흐려짐 → 축소 → K10 도달
 */
export const ASCEND_PHASES: TransitionPhase[] = [
  {
    name: 'DECELERATE',
    duration: 400,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    effect: { blur: 0, opacity: 1, scale: 1, speed: 0.5 }
  },
  {
    name: 'BLUR_GATE',
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    effect: { blur: 8, opacity: 0.8, scale: 0.98, speed: 0.2 }
  },
  {
    name: 'CONTRACT',
    duration: 400,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    effect: { blur: 15, opacity: 0.5, scale: 0.9, speed: 0 }
  },
  {
    name: 'GATE_CROSS',
    duration: 200,
    easing: 'linear',
    effect: { blur: 20, opacity: 0, scale: 0.8, speed: 0 }
  }
];

/**
 * K10 → K2 하강 전환 (Descend)
 * "K10은 바꾸지 않는다. 닫힌 결과를 승인할 뿐이다."
 * 하강 시: 확대 → 선명해짐 → 가속 → K2 도달
 */
export const DESCEND_PHASES: TransitionPhase[] = [
  {
    name: 'EXPAND',
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    effect: { blur: 20, opacity: 0, scale: 0.8, speed: 0 }
  },
  {
    name: 'CLARIFY',
    duration: 400,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    effect: { blur: 8, opacity: 0.6, scale: 0.95, speed: 0.3 }
  },
  {
    name: 'FOCUS',
    duration: 300,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    effect: { blur: 2, opacity: 0.9, scale: 1, speed: 0.7 }
  },
  {
    name: 'ACCELERATE',
    duration: 300,
    easing: 'cubic-bezier(0, 0.5, 0.5, 1)',
    effect: { blur: 0, opacity: 1, scale: 1, speed: 1 }
  }
];

/**
 * Gate 저항 효과 (물리적 체감)
 */
export const GATE_RESISTANCE = {
  NONE: { blur: 0, opacity: 1, speed: 1, filter: 'none' },
  RING: { blur: 2, opacity: 0.9, speed: 0.7, filter: 'saturate(0.8)' },
  LOCK: { blur: 8, opacity: 0.6, speed: 0.2, filter: 'saturate(0.5) brightness(0.8)' },
  AFTERIMAGE: { blur: 12, opacity: 0.4, speed: 0, filter: 'saturate(0.3) brightness(0.6) sepia(0.3)' }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class GateTransitionEngine {
  private currentAltitude: Altitude = 'K2';
  private isTransitioning: boolean = false;
  private element: HTMLElement | null = null;

  constructor(element?: HTMLElement) {
    this.element = element || document.body;
  }

  /**
   * 현재 고도 반환
   */
  getAltitude(): Altitude {
    return this.currentAltitude;
  }

  /**
   * 전환 중 여부
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * K2 → K10 상승 전환
   */
  async ascend(): Promise<void> {
    if (this.isTransitioning || this.currentAltitude === 'K10') return;
    
    this.isTransitioning = true;
    
    const config: GateTransitionConfig = {
      direction: 'ASCEND',
      from: this.currentAltitude,
      to: 'K10',
      phases: ASCEND_PHASES,
      totalDuration: ASCEND_PHASES.reduce((sum, p) => sum + p.duration, 0)
    };

    await this.executeTransition(config);
    
    this.currentAltitude = 'K10';
    this.isTransitioning = false;
  }

  /**
   * K10 → K2 하강 전환
   */
  async descend(): Promise<void> {
    if (this.isTransitioning || this.currentAltitude === 'K2') return;
    
    this.isTransitioning = true;
    
    const config: GateTransitionConfig = {
      direction: 'DESCEND',
      from: this.currentAltitude,
      to: 'K2',
      phases: DESCEND_PHASES,
      totalDuration: DESCEND_PHASES.reduce((sum, p) => sum + p.duration, 0)
    };

    await this.executeTransition(config);
    
    this.currentAltitude = 'K2';
    this.isTransitioning = false;
  }

  /**
   * Gate 저항 효과 적용
   */
  applyGateResistance(state: GateState): void {
    if (!this.element) return;
    
    const resistance = GATE_RESISTANCE[state];
    
    this.element.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    this.element.style.filter = `blur(${resistance.blur}px) ${resistance.filter}`;
    this.element.style.opacity = String(resistance.opacity);
    
    // CSS 변수로 속도 조절
    document.documentElement.style.setProperty('--gate-speed', String(resistance.speed));
  }

  /**
   * 전환 실행
   */
  private async executeTransition(config: GateTransitionConfig): Promise<void> {
    if (!this.element) return;

    for (const phase of config.phases) {
      await this.applyPhase(phase);
    }
  }

  /**
   * 단일 페이즈 적용
   */
  private applyPhase(phase: TransitionPhase): Promise<void> {
    return new Promise((resolve) => {
      if (!this.element) {
        resolve();
        return;
      }

      const { blur, opacity, scale, speed } = phase.effect;

      this.element.style.transition = `all ${phase.duration}ms ${phase.easing}`;
      this.element.style.filter = `blur(${blur}px)`;
      this.element.style.opacity = String(opacity);
      this.element.style.transform = `scale(${scale})`;
      
      document.documentElement.style.setProperty('--gate-speed', String(speed));

      setTimeout(resolve, phase.duration);
    });
  }

  /**
   * 즉시 리셋
   */
  reset(): void {
    if (!this.element) return;
    
    this.element.style.transition = 'none';
    this.element.style.filter = 'none';
    this.element.style.opacity = '1';
    this.element.style.transform = 'scale(1)';
    
    document.documentElement.style.setProperty('--gate-speed', '1');
    
    this.isTransitioning = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

export function useGateTransition(initialAltitude: Altitude = 'K2') {
  const [altitude, setAltitude] = useState<Altitude>(initialAltitude);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [gateState, setGateState] = useState<GateState>('NONE');
  const engineRef = useRef<GateTransitionEngine | null>(null);

  useEffect(() => {
    engineRef.current = new GateTransitionEngine();
    return () => {
      engineRef.current?.reset();
    };
  }, []);

  const ascend = useCallback(async () => {
    if (!engineRef.current || isTransitioning) return;
    
    setIsTransitioning(true);
    await engineRef.current.ascend();
    setAltitude('K10');
    setIsTransitioning(false);
  }, [isTransitioning]);

  const descend = useCallback(async () => {
    if (!engineRef.current || isTransitioning) return;
    
    setIsTransitioning(true);
    await engineRef.current.descend();
    setAltitude('K2');
    setIsTransitioning(false);
  }, [isTransitioning]);

  const applyResistance = useCallback((state: GateState) => {
    setGateState(state);
    engineRef.current?.applyGateResistance(state);
  }, []);

  return {
    altitude,
    isTransitioning,
    gateState,
    ascend,
    descend,
    applyResistance
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS KEYFRAMES (for vanilla JS usage)
// ═══════════════════════════════════════════════════════════════════════════════

export const GATE_KEYFRAMES = `
@keyframes gateAscend {
  0% { filter: blur(0px); opacity: 1; transform: scale(1); }
  30% { filter: blur(4px); opacity: 0.9; transform: scale(0.98); }
  60% { filter: blur(12px); opacity: 0.6; transform: scale(0.92); }
  100% { filter: blur(20px); opacity: 0; transform: scale(0.8); }
}

@keyframes gateDescend {
  0% { filter: blur(20px); opacity: 0; transform: scale(0.8); }
  40% { filter: blur(8px); opacity: 0.6; transform: scale(0.95); }
  70% { filter: blur(2px); opacity: 0.9; transform: scale(1); }
  100% { filter: blur(0px); opacity: 1; transform: scale(1); }
}

@keyframes gateResistance {
  0%, 100% { filter: blur(var(--gate-blur, 0px)); }
  50% { filter: blur(calc(var(--gate-blur, 0px) + 2px)); }
}

@keyframes gatePulse {
  0%, 100% { opacity: var(--gate-opacity, 1); }
  50% { opacity: calc(var(--gate-opacity, 1) * 0.7); }
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 고도 레벨 숫자 반환
 */
export function getAltitudeLevel(altitude: Altitude): number {
  const levels: Record<Altitude, number> = { K2: 2, K5: 5, K10: 10 };
  return levels[altitude];
}

/**
 * 고도 비교
 */
export function compareAltitude(a: Altitude, b: Altitude): number {
  return getAltitudeLevel(a) - getAltitudeLevel(b);
}

/**
 * 전환 방향 결정
 */
export function getTransitionDirection(from: Altitude, to: Altitude): TransitionDirection {
  return compareAltitude(from, to) < 0 ? 'ASCEND' : 'DESCEND';
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  GateTransitionEngine,
  useGateTransition,
  ASCEND_PHASES,
  DESCEND_PHASES,
  GATE_RESISTANCE,
  GATE_KEYFRAMES,
  getAltitudeLevel,
  compareAltitude,
  getTransitionDirection
};
