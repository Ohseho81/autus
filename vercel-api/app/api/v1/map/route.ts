// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🗺️ 지도 API (Map)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import {
  generateMapCustomer,
  generateMapCompetitor,
  generateMapZone,
  randomInt,
  randomFloat,
} from '@/lib/mock-data';
import type { MapCustomer, MapCompetitor, MapZone } from '@/lib/types-views';

const BASE_LAT = 37.5665;
const BASE_LNG = 126.978;

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/map
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'customers';
    
    switch (endpoint) {
      case 'customers':
        return getCustomers(searchParams);
      case 'competitors':
        return getCompetitors(searchParams);
      case 'zones':
        return getZones();
      case 'market':
        return getMarket(searchParams);
      default:
        return getCustomers(searchParams);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Map API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────────

function getCustomers(params: URLSearchParams) {
  const radius = parseInt(params.get('radius') || '1500');
  const status = params.get('status') || 'all';
  
  let customers: MapCustomer[] = Array.from({ length: 50 }, generateMapCustomer)
    .filter(c => c.distanceMeters <= radius);
  
  if (status === 'at_risk') {
    customers = customers.filter(c => c.temperatureZone === 'critical' || c.temperatureZone === 'warning');
  } else if (status === 'healthy') {
    customers = customers.filter(c => c.temperatureZone !== 'critical' && c.temperatureZone !== 'warning');
  }
  
  // 클러스터 생성
  const clusters = [
    {
      id: 'cluster_north',
      centerLat: BASE_LAT + 0.01,
      centerLng: BASE_LNG,
      count: randomInt(10, 25),
      avgTemperature: randomFloat(50, 70),
    },
    {
      id: 'cluster_south',
      centerLat: BASE_LAT - 0.01,
      centerLng: BASE_LNG,
      count: randomInt(8, 20),
      avgTemperature: randomFloat(55, 75),
    },
  ];
  
  // 방향별 집계
  const byDirection = {
    north: customers.filter(c => c.lat > BASE_LAT).length,
    south: customers.filter(c => c.lat <= BASE_LAT).length,
    east: customers.filter(c => c.lng > BASE_LNG).length,
    west: customers.filter(c => c.lng <= BASE_LNG).length,
  };
  
  return successResponse({
    center: { lat: BASE_LAT, lng: BASE_LNG },
    customers,
    clusters,
    summary: {
      total: customers.length,
      byDirection,
    },
  }, '고객 위치 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Competitors
// ─────────────────────────────────────────────────────────────────────

function getCompetitors(params: URLSearchParams) {
  const radius = parseInt(params.get('radius') || '1500');
  
  const competitors: MapCompetitor[] = Array.from({ length: 6 }, generateMapCompetitor)
    .filter(c => c.distanceMeters <= radius);
  
  const highThreat = competitors.filter(c => c.threatLevel === 'high').length;
  const totalAffectedCustomers = competitors.reduce((sum, c) => sum + c.affectedCustomers, 0);
  
  return successResponse({
    competitors,
    summary: {
      total: competitors.length,
      highThreat,
      totalAffectedCustomers,
    },
  }, '경쟁사 위치 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Zones
// ─────────────────────────────────────────────────────────────────────

function getZones() {
  const zones: MapZone[] = Array.from({ length: 4 }, generateMapZone);
  
  return successResponse({ zones }, '위험/기회 지역 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Market
// ─────────────────────────────────────────────────────────────────────

function getMarket(params: URLSearchParams) {
  const ourCustomers = randomInt(100, 150);
  const marketSize = randomInt(1200, 1800);
  const marketShare = parseFloat(((ourCustomers / marketSize) * 100).toFixed(1));
  
  const competitorShares = [
    { name: 'A학원', customerCount: randomInt(80, 150), marketShare: randomFloat(5, 12) },
    { name: 'B학원', customerCount: randomInt(60, 120), marketShare: randomFloat(4, 10) },
    { name: 'C학원', customerCount: randomInt(40, 100), marketShare: randomFloat(3, 8) },
    { name: 'D학원', customerCount: randomInt(30, 80), marketShare: randomFloat(2, 6) },
  ];
  
  return successResponse({
    marketSize,
    ourCustomers,
    marketShare,
    marketShareTrend: randomFloat(-0.5, 1.0),
    competitorShares,
  }, '시장 규모 조회 성공');
}
