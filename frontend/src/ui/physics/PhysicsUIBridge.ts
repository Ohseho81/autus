/**
 * Physics → UI 변환 브릿지
 */

// Physics → UI 매핑
export const PHYSICS_UI_MAP = {
  mass: { uiProp: 'size', formula: (v: number) => 80 + v * 120, unit: 'px' },
  energy: { uiProp: 'brightness', formula: (d: number) => 0.5 + Math.abs(d) * 10, unit: '' },
  inertia: { uiProp: 'transitionDuration', formula: (c: number) => 0.3 + c * 1.2, unit: 's' },
  friction: { uiProp: 'noise', formula: (r: string) => r === 'range' ? 0.7 : 0.3, unit: '' },
  entropy: { uiProp: 'blur', formula: (f: number) => (1 - f) * 5, unit: 'px' },
  force: { uiProp: 'glowRadius', formula: (i: number) => i * 40, unit: 'px' },
};

// Node Data 타입
export interface NodeData {
  value: number;
  confidence: number;
  delta?: number;
  freshness?: number;
  uncertainty_level?: 'range' | 'estimate' | 'point';
  impact?: number;
}

// 변환 함수
export function transformPhysicsToUI(nodeData: NodeData) {
  const { value, confidence, delta = 0, freshness = 1, uncertainty_level = 'point', impact = 0 } = nodeData;
  
  return {
    size: PHYSICS_UI_MAP.mass.formula(value),
    brightness: PHYSICS_UI_MAP.energy.formula(delta),
    transitionDuration: PHYSICS_UI_MAP.inertia.formula(confidence),
    noise: PHYSICS_UI_MAP.friction.formula(uncertainty_level),
    blur: PHYSICS_UI_MAP.entropy.formula(freshness),
    glowRadius: PHYSICS_UI_MAP.force.formula(impact),
  };
}

// 관성 효과 Hook
export function usePhysicsInertia(value: number, confidence: number) {
  const transitionDuration = 0.3 + confidence * 1.2;
  return {
    transition: `all ${transitionDuration}s ease-out`,
    transitionDuration: `${transitionDuration}s`,
  };
}

// 노이즈 CSS 생성
export function generateNoiseCSS(level: number): string {
  if (level < 0.3) return '';
  return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${level * 0.3}'/%3E%3C/svg%3E")`;
}

// 부력 계산
export function calculateBuoyancy(impact: number, confidence: number, uncertainty: string): number {
  let buoyancy = impact * 100;
  buoyancy += confidence * 50;
  if (uncertainty === 'range') buoyancy -= 20;
  if (uncertainty === 'estimate') buoyancy -= 10;
  return Math.max(0, buoyancy);
}

// 스타일 Hook
export function usePhysicsStyle(nodeData: NodeData) {
  const ui = transformPhysicsToUI(nodeData);
  
  return {
    width: `${ui.size}px`,
    height: `${ui.size}px`,
    filter: `blur(${ui.blur}px) brightness(${ui.brightness})`,
    boxShadow: ui.glowRadius > 0 ? `0 0 ${ui.glowRadius}px rgba(59, 130, 246, 0.5)` : 'none',
    transition: `all ${ui.transitionDuration}s ease-out`,
  };
}

// 액션 부력 정렬
export function useActionBuoyancy(actions: Array<{ impact: number; confidence: number; uncertainty?: string }>) {
  return actions
    .map((action, index) => ({
      ...action,
      buoyancy: calculateBuoyancy(action.impact, action.confidence, action.uncertainty || 'point'),
      originalIndex: index,
    }))
    .sort((a, b) => b.buoyancy - a.buoyancy);
}

