/**
 * AUTUS LOD Policy v1.0
 * 4K 성능 최적화 규칙
 */

export type Resolution = "1080p" | "4K";

export type LODCaps = {
  maxNodes: number;
  maxLinks: number;
  maxLabels: number;
};

export const CAPS: Record<Resolution, LODCaps> = {
  "1080p": { maxNodes: 2000, maxLinks: 3000, maxLabels: 250 },
  "4K": { maxNodes: 1200, maxLinks: 1800, maxLabels: 180 }
};

export type LODLevel = "near" | "mid" | "far";

export function getLODLevel(cameraDistance: number): LODLevel {
  if (cameraDistance < 3) return "near";
  if (cameraDistance < 8) return "mid";
  return "far";
}

export function getVisibleCounts(level: LODLevel, caps: LODCaps): LODCaps {
  switch (level) {
    case "near":
      return caps;
    case "mid":
      return {
        maxNodes: caps.maxNodes,
        maxLinks: Math.floor(caps.maxLinks * 0.7),
        maxLabels: Math.floor(caps.maxLabels * 0.5)
      };
    case "far":
      return {
        maxNodes: Math.floor(caps.maxNodes * 0.5),
        maxLinks: Math.floor(caps.maxLinks * 0.3),
        maxLabels: Math.floor(caps.maxLabels * 0.2)
      };
  }
}

export function sampleByPriority<T extends { weight?: number; strength?: number; risk?: number }>(
  items: T[],
  maxCount: number
): T[] {
  if (items.length <= maxCount) return items;
  
  // Sort by priority (weight/strength/risk)
  const scored = items.map(item => ({
    item,
    score: (item.weight || 0) + (item.strength || 0) + (item.risk || 0) * 2
  }));
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, maxCount).map(s => s.item);
}

export function detectResolution(): Resolution {
  const w = window.innerWidth * window.devicePixelRatio;
  return w > 2560 ? "4K" : "1080p";
}
