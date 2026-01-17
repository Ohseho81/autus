/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS GEO-CAUSAL KERNEL
 * 공간 기반 인과 전파 커널
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 제약:
 * - 모든 노드는 lat/lng 필수
 * - Haversine 거리 사용
 * - 경계 감쇠 지원
 * - 밀집 증폭 지원
 * - 출력은 숫자만 (포맷팅 없음)
 * - 시각화 코드 없음
 * - UI 가정 없음
 */

import { 
  EARTH_RADIUS_METERS,
  ALPHA_URBAN,
  BETA_DEFAULT,
  GAMMA_DEFAULT
} from '../physics/constants';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface GeoNode extends GeoCoordinate {
  id: string;
  mass: number;
}

export interface Boundary {
  id: string;
  polygon: GeoCoordinate[];
  attenuation: number; // β
}

export interface PropagationParams {
  alpha: number;    // 거리 감쇠
  beta: number;     // 경계 감쇠
  gamma: number;    // 밀집 증폭
  densityRadius: number;
}

export interface PropagationResult {
  nodeId: string;
  distance: number;
  impact: number;
  crossedBoundaries: string[];
  densityFactor: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HAVERSINE DISTANCE (순수 함수)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haversine 공식으로 두 지점 사이 거리 계산 (미터)
 */
export function haversineDistance(a: GeoCoordinate, b: GeoCoordinate): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  
  const h = sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
    sinDLng * sinDLng;
  
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ray casting 알고리즘으로 점이 폴리곤 내부인지 판정
 */
export function isPointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
  let inside = false;
  const { lng: x, lat: y } = point;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { lng: xi, lat: yi } = polygon[i];
    const { lng: xj, lat: yj } = polygon[j];
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * 두 점 사이에 경계를 통과하는지 확인
 */
export function getCrossedBoundaries(
  from: GeoCoordinate,
  to: GeoCoordinate,
  boundaries: Boundary[]
): Boundary[] {
  const crossed: Boundary[] = [];
  
  for (const boundary of boundaries) {
    const fromIn = isPointInPolygon(from, boundary.polygon);
    const toIn = isPointInPolygon(to, boundary.polygon);
    
    if (fromIn !== toIn) {
      crossed.push(boundary);
    }
  }
  
  return crossed;
}

// ─────────────────────────────────────────────────────────────────────────────
// DENSITY CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 특정 지점 주변의 밀집도 계산
 */
export function calculateDensity(
  point: GeoCoordinate,
  allNodes: GeoNode[],
  radius: number
): number {
  let count = 0;
  
  for (const node of allNodes) {
    if (haversineDistance(point, node) < radius) {
      count++;
    }
  }
  
  return count / 10; // 정규화
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPAGATION KERNEL (핵심)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 인과 전파 계산 (순수 함수)
 * 
 * 공식: Impact = Mass × e^(-α × distance) × Π(β_i) × (1 + γ × density)
 */
export function propagate(
  source: GeoNode,
  target: GeoNode,
  boundaries: Boundary[],
  allNodes: GeoNode[],
  params: PropagationParams = {
    alpha: ALPHA_URBAN,
    beta: BETA_DEFAULT,
    gamma: GAMMA_DEFAULT,
    densityRadius: 5000
  }
): PropagationResult {
  // 거리 계산
  const distance = haversineDistance(source, target);
  
  // 기본 영향 (거리 감쇠)
  let impact = source.mass * Math.exp(-params.alpha * distance);
  
  // 경계 감쇠
  const crossedBoundaries = getCrossedBoundaries(source, target, boundaries);
  for (const boundary of crossedBoundaries) {
    impact *= boundary.attenuation;
  }
  
  // 밀집 증폭
  const density = calculateDensity(target, allNodes, params.densityRadius);
  const densityFactor = 1 + params.gamma * density;
  impact *= densityFactor;
  
  return {
    nodeId: target.id,
    distance,
    impact,
    crossedBoundaries: crossedBoundaries.map(b => b.id),
    densityFactor
  };
}

/**
 * 모든 노드에 대한 전파 계산
 */
export function propagateToAll(
  source: GeoNode,
  targets: GeoNode[],
  boundaries: Boundary[],
  params?: PropagationParams
): PropagationResult[] {
  return targets
    .filter(t => t.id !== source.id)
    .map(target => propagate(source, target, boundaries, targets, params));
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 좌표 유효성 검증
 */
export function isValidCoordinate(coord: GeoCoordinate): boolean {
  return (
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    coord.lat >= -90 && coord.lat <= 90 &&
    coord.lng >= -180 && coord.lng <= 180 &&
    !Number.isNaN(coord.lat) &&
    !Number.isNaN(coord.lng)
  );
}

/**
 * 노드 유효성 검증
 * 좌표 없는 노드 = 존재하지 않음
 */
export function isValidGeoNode(node: GeoNode): boolean {
  return (
    isValidCoordinate(node) &&
    typeof node.id === 'string' &&
    node.id.length > 0 &&
    typeof node.mass === 'number' &&
    node.mass >= 0
  );
}
