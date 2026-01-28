// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 📡 레이더 API (Radar)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
  notFoundResponse,
} from '@/lib/api-utils';
import {
  generateThreat,
  generateOpportunity,
  generateVulnerability,
  generateCustomerBriefs,
  randomInt,
} from '@/lib/mock-data';
import type { Threat, Opportunity, Vulnerability } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/radar
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'threats';
    
    switch (endpoint) {
      case 'threats':
        return getThreats();
      case 'opportunities':
        return getOpportunities();
      case 'threat':
        return getThreatDetail(searchParams);
      case 'vulnerabilities':
        return getVulnerabilities();
      default:
        return getThreats();
    }
  } catch (error) {
    return serverErrorResponse(error, 'Radar API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Threats
// ─────────────────────────────────────────────────────────────────────

function getThreats() {
  const threats: Threat[] = Array.from({ length: randomInt(3, 6) }, generateThreat)
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2, low: 3 };
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    });
  
  return successResponse({ threats }, '위협 목록 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Opportunities
// ─────────────────────────────────────────────────────────────────────

function getOpportunities() {
  const opportunities: Opportunity[] = Array.from({ length: randomInt(2, 4) }, generateOpportunity)
    .sort((a, b) => {
      const potentialOrder = { high: 0, medium: 1, low: 2 };
      return potentialOrder[a.potential] - potentialOrder[b.potential];
    });
  
  return successResponse({ opportunities }, '기회 목록 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Threat Detail
// ─────────────────────────────────────────────────────────────────────

function getThreatDetail(params: URLSearchParams) {
  const threatId = params.get('id');
  
  if (!threatId) {
    return notFoundResponse('Threat');
  }
  
  const threat = generateThreat();
  threat.id = threatId;
  
  // 취약점 분석
  const vulnerabilities = [
    {
      type: 'cost_sensitive',
      customerCount: randomInt(5, 15),
      customers: generateCustomerBriefs(randomInt(5, 10)),
    },
    {
      type: 'competitor_adjacent',
      customerCount: randomInt(3, 10),
      customers: generateCustomerBriefs(randomInt(3, 8)),
    },
  ];
  
  // 방어 전략
  const defenseStrategies = [
    {
      id: 'strategy_1',
      name: '가치 재인식 캠페인',
      description: '기존 고객에게 우리 학원의 차별화된 가치를 재인식시키는 캠페인',
      expectedEffect: {
        temperatureChange: 10,
        churnReduction: 0.15,
      },
    },
    {
      id: 'strategy_2',
      name: '방어적 프로모션',
      description: '경쟁사 프로모션에 대응하는 한정 프로모션',
      expectedEffect: {
        temperatureChange: 5,
        churnReduction: 0.1,
      },
    },
    {
      id: 'strategy_3',
      name: '긴급 상담 블리츠',
      description: '위험 고객 대상 집중 상담 실시',
      expectedEffect: {
        temperatureChange: 15,
        churnReduction: 0.2,
      },
    },
  ];
  
  return successResponse({
    threat,
    vulnerabilities,
    defenseStrategies,
  }, '위협 상세 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Vulnerabilities
// ─────────────────────────────────────────────────────────────────────

function getVulnerabilities() {
  const vulnerabilities: Vulnerability[] = [
    generateVulnerability(),
    generateVulnerability(),
    generateVulnerability(),
  ];
  
  const strengths = [
    {
      type: 'high_satisfaction',
      label: '높은 만족도',
      customerCount: randomInt(30, 60),
    },
    {
      type: 'long_tenure',
      label: '장기 재원',
      customerCount: randomInt(20, 40),
    },
    {
      type: 'referral_active',
      label: '추천 활발',
      customerCount: randomInt(10, 25),
    },
  ];
  
  return successResponse({
    vulnerabilities,
    strengths,
  }, '취약점 분석 완료');
}
