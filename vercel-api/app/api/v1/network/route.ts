// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 🌐 네트워크 API (Network)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import {
  generateNetworkNode,
  generateNetworkEdge,
  generateInfluencer,
  generateNetworkCluster,
  generateCustomerBriefs,
  randomInt,
  randomFloat,
} from '@/lib/mock-data';
import type { NetworkNode, NetworkEdge, Influencer, NetworkCluster } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/network
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'graph';
    
    switch (endpoint) {
      case 'graph':
        return getGraph();
      case 'influencers':
        return getInfluencers(searchParams);
      case 'clusters':
        return getClusters();
      case 'risk':
        return getRisk();
      default:
        return getGraph();
    }
  } catch (error) {
    return serverErrorResponse(error, 'Network API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// Graph
// ─────────────────────────────────────────────────────────────────────

function getGraph() {
  // 노드 생성
  const nodes: NetworkNode[] = Array.from({ length: 50 }, generateNetworkNode);
  
  // 엣지 생성 (추천 관계)
  const edges: NetworkEdge[] = [];
  const influencers = nodes.filter(n => n.isInfluencer);
  
  influencers.forEach(influencer => {
    const targetCount = Math.min(influencer.referralCount, nodes.length - 1);
    const availableTargets = nodes.filter(n => n.id !== influencer.id);
    
    for (let i = 0; i < targetCount && i < availableTargets.length; i++) {
      edges.push(generateNetworkEdge(influencer.id, availableTargets[i].id));
    }
  });
  
  return successResponse({
    nodes,
    edges,
  }, '네트워크 그래프 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Influencers
// ─────────────────────────────────────────────────────────────────────

function getInfluencers(params: URLSearchParams) {
  const minReferrals = parseInt(params.get('minReferrals') || '3');
  const limit = parseInt(params.get('limit') || '10');
  
  const influencers: Influencer[] = Array.from({ length: 15 }, generateInfluencer)
    .filter(i => i.referralCount >= minReferrals)
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, limit);
  
  return successResponse({ influencers }, '영향력자 목록 조회 성공');
}

// ─────────────────────────────────────────────────────────────────────
// Clusters
// ─────────────────────────────────────────────────────────────────────

function getClusters() {
  const clusters: NetworkCluster[] = Array.from({ length: 5 }, generateNetworkCluster);
  
  return successResponse({ clusters }, '클러스터 분석 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Risk (연쇄 이탈 위험)
// ─────────────────────────────────────────────────────────────────────

function getRisk() {
  // 위험한 영향력자
  const atRiskInfluencers = Array.from({ length: randomInt(2, 5) }, () => {
    const influencer = generateInfluencer();
    // 위험한 상태로 조정
    influencer.temperature = randomInt(30, 50);
    influencer.temperatureZone = influencer.temperature < 40 ? 'critical' : 'warning';
    
    const connectedAtRisk = generateCustomerBriefs(randomInt(2, 6));
    const estimatedMonthlyRevenue = 350000; // 1인당 월 평균 매출
    
    return {
      influencer: {
        id: influencer.id,
        name: influencer.name,
        temperature: influencer.temperature,
        temperatureZone: influencer.temperatureZone,
        churnProbability: randomFloat(0.35, 0.6),
      },
      temperature: influencer.temperature,
      churnProbability: randomFloat(0.35, 0.6),
      connectedAtRisk,
      totalCascadeRisk: connectedAtRisk.length,
      estimatedLoss: (1 + connectedAtRisk.length) * estimatedMonthlyRevenue,
    };
  });
  
  // 고립된 노드 (관계 없음)
  const isolatedNodes = generateCustomerBriefs(randomInt(5, 12));
  
  // 요약
  const totalCascadeRisk = atRiskInfluencers.reduce((sum, a) => sum + a.totalCascadeRisk, 0);
  const estimatedTotalLoss = atRiskInfluencers.reduce((sum, a) => sum + a.estimatedLoss, 0);
  
  return successResponse({
    atRiskInfluencers,
    isolatedNodes,
    summary: {
      totalCascadeRisk,
      estimatedTotalLoss,
    },
  }, '연쇄 이탈 위험 분석 완료');
}
