/**
 * AUTUS FramePackHQ v1.0
 * 전역 프레임/라벨 규약
 */

export const FRAME_RULES = {
  safeMargin: 24,          // px
  stroke: { min: 0.8, max: 1.2 },  // px (SDF)
  cornerTicks: "diagonal-2", // 대각 2코너만
  sectionDivider: 0.6,     // 외곽 대비
  borderRadius: 6,         // px
  colors: {
    primary: "#00d4ff",
    secondary: "#00ff88",
    warning: "#ffaa00",
    danger: "#ff4444",
    frame: "rgba(0, 212, 255, 0.15)"
  }
};

export const LABEL_LEVELS = {
  L1: { size: 14, weight: 600, alwaysShow: true },
  L2: { size: 10, weight: 500, truncateOnCollision: true },
  L3: { size: 8, weight: 400, hideOnCollision: true }
};

export function applyFrameStyle(element: HTMLElement): void {
  element.style.margin = `${FRAME_RULES.safeMargin}px`;
  element.style.border = `${FRAME_RULES.stroke.min}px solid ${FRAME_RULES.colors.frame}`;
  element.style.borderRadius = `${FRAME_RULES.borderRadius}px`;
}

// Label collision detection
export function resolveLabels(labels: Array<{ x: number; y: number; level: "L1" | "L2" | "L3"; text: string }>) {
  const visible: typeof labels = [];
  const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
  
  // Sort by level priority
  const sorted = [...labels].sort((a, b) => {
    const order = { L1: 0, L2: 1, L3: 2 };
    return order[a.level] - order[b.level];
  });
  
  for (const label of sorted) {
    const size = LABEL_LEVELS[label.level].size;
    const w = label.text.length * size * 0.6;
    const h = size * 1.5;
    
    const collision = occupied.some(o => 
      Math.abs(o.x - label.x) < (o.w + w) / 2 &&
      Math.abs(o.y - label.y) < (o.h + h) / 2
    );
    
    if (collision) {
      if (LABEL_LEVELS[label.level].hideOnCollision) continue;
      if (LABEL_LEVELS[label.level].truncateOnCollision) {
        label.text = label.text.slice(0, 3) + '...';
      }
    }
    
    visible.push(label);
    occupied.push({ x: label.x, y: label.y, w, h });
  }
  
  return visible;
}
