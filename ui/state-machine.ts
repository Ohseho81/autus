/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS LayerSet 상태기계 (LOCKED)
 * 
 * - hide 금지: display:none 대신 visibility:hidden 사용
 * - LayerSet 전환만 허용: 개별 레이어 직접 조작 금지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type UiMode = "DRIVE" | "NAV" | "ALERT" | "CONTROL" | "SETTINGS";

export type LeftPanelState = "collapsed" | "rail" | "expanded";
export type ManeuverState = "hidden" | "collapsed" | "active" | "promoted";

export interface LayerSet {
  L1: boolean;
  L2: boolean;
  L3: boolean;
  L4: boolean;
  L5: boolean;
  L6: boolean;
  L7: boolean;
  leftPanel: LeftPanelState;
  maneuver: ManeuverState;
}

/**
 * 모드별 LayerSet 정의 (LOCKED)
 */
export const LAYERSETS: Record<UiMode, LayerSet> = {
  DRIVE: {
    L1: true,
    L2: true,
    L3: true,
    L4: true,
    L5: true,
    L6: false,
    L7: false,
    leftPanel: "rail",
    maneuver: "collapsed",
  },
  NAV: {
    L1: true,
    L2: true,
    L3: true,
    L4: true,
    L5: true,
    L6: false,
    L7: false,
    leftPanel: "rail",
    maneuver: "active",
  },
  ALERT: {
    L1: true,
    L2: true,
    L3: true,
    L4: true,
    L5: true,
    L6: true,
    L7: false,
    leftPanel: "rail",
    maneuver: "promoted",
  },
  CONTROL: {
    L1: true,
    L2: true,
    L3: true,
    L4: true,
    L5: true,
    L6: false,
    L7: false,
    leftPanel: "expanded",
    maneuver: "collapsed",
  },
  SETTINGS: {
    L1: true,
    L2: false,
    L3: true,
    L4: false,
    L5: false,
    L6: false,
    L7: true,
    leftPanel: "collapsed",
    maneuver: "hidden",
  },
};

/**
 * 현재 모드의 LayerSet 가져오기
 */
export function getLayerSet(mode: UiMode): LayerSet {
  return LAYERSETS[mode];
}

/**
 * LayerSet을 DOM에 적용
 * 
 * - display:none 금지 (레이아웃 흔들림 방지)
 * - visibility:hidden 사용
 */
export function applyLayerSet(root: HTMLElement, mode: UiMode): void {
  const layerSet = LAYERSETS[mode];

  // 모드 속성 설정
  root.setAttribute("data-mode", mode);

  // 각 레이어 visibility 설정
  const layers = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] as const;
  
  for (const layer of layers) {
    const el = root.querySelector(`[data-layer="${layer}"]`) as HTMLElement | null;
    if (!el) continue;
    
    // display:none 금지 - visibility만 사용
    el.style.visibility = layerSet[layer] ? "visible" : "hidden";
  }

  // 패널/카드 상태 설정
  root.setAttribute("data-leftpanel", layerSet.leftPanel);
  root.setAttribute("data-maneuver", layerSet.maneuver);
}

/**
 * 모드 전환 (애니메이션 포함)
 */
export function transitionToMode(
  root: HTMLElement,
  fromMode: UiMode,
  toMode: UiMode,
  duration: number = 300
): Promise<void> {
  return new Promise((resolve) => {
    // 전환 클래스 추가
    root.classList.add("layer-transitioning");
    root.style.setProperty("--transition-duration", `${duration}ms`);

    // 새 모드 적용
    applyLayerSet(root, toMode);

    // 전환 완료 후 클래스 제거
    setTimeout(() => {
      root.classList.remove("layer-transitioning");
      resolve();
    }, duration);
  });
}

/**
 * Golden Render Mode 적용
 * - window.__AUTUS_GOLDEN__에서 데이터 읽어 고정 렌더
 */
export function applyGoldenRenderMode(root: HTMLElement): void {
  const goldenData = (window as any).__AUTUS_GOLDEN__;
  
  if (!goldenData) {
    console.warn("No __AUTUS_GOLDEN__ data found");
    return;
  }

  const mode = goldenData.mode as UiMode;
  
  if (mode && LAYERSETS[mode]) {
    applyLayerSet(root, mode);
  }

  // 데이터 바인딩 이벤트 발생
  window.dispatchEvent(
    new CustomEvent("autus:golden-render", { detail: goldenData })
  );
}

/**
 * 초기화 함수 (DOMContentLoaded에서 호출)
 */
export function initLayerSystem(root: HTMLElement, defaultMode: UiMode = "NAV"): void {
  // Golden 모드 체크
  if ((window as any).__AUTUS_GOLDEN__) {
    applyGoldenRenderMode(root);
    return;
  }

  // 기본 모드 적용
  applyLayerSet(root, defaultMode);
}

// Export for use in HTML
if (typeof window !== "undefined") {
  (window as any).AUTUS_LAYERS = {
    LAYERSETS,
    applyLayerSet,
    transitionToMode,
    applyGoldenRenderMode,
    initLayerSystem,
  };
}
