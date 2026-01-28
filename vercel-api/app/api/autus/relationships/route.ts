/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Relationships API
 * 
 * 관계 CRUD 및 σ/A 관리
 * A = T^σ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  optionsResponse,
} from '../../../../lib/api-utils';

// Types
type RelationshipStatus = 'active' | 'inactive' | 'churned';

interface Relationship {
  id: string;
  orgId: string;
  nodeAId: string;
  nodeBId: string;
  nodeAName?: string;
  nodeBName?: string;
  sigma: number;
  sigmaHistory: Array<{ date: string; sigma: number }>;
  tTotal: number;
  aValue: number;
  status: RelationshipStatus;
  createdAt: string;
  updatedAt: string;
}

// 계산 함수
function calculateA(tTotal: number, sigma: number, lambdaAvg: number = 1): number {
  const T = lambdaAvg * tTotal;
  if (T <= 0) return 0;
  return Math.pow(T, sigma);
}

function getSigmaGrade(sigma: number): string {
  if (sigma < 0.7) return 'critical';
  if (sigma < 1.0) return 'at_risk';
  if (sigma < 1.3) return 'neutral';
  if (sigma < 1.6) return 'good';
  if (sigma < 2.0) return 'loyal';
  return 'advocate';
}

// In-memory store
const relationshipsStore: Relationship[] = [
  // 샘플 데이터
  { 
    id: 'rel-1', orgId: 'org-1', nodeAId: 'node-3', nodeBId: 'node-4',
    nodeAName: '박교사', nodeBName: '이학생',
    sigma: 1.45, sigmaHistory: [{ date: '2026-01-01', sigma: 1.2 }, { date: '2026-01-15', sigma: 1.45 }],
    tTotal: 1200, aValue: 0, status: 'active',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: new Date().toISOString()
  },
  { 
    id: 'rel-2', orgId: 'org-1', nodeAId: 'node-3', nodeBId: 'node-5',
    nodeAName: '박교사', nodeBName: '이학부모',
    sigma: 1.32, sigmaHistory: [{ date: '2026-01-01', sigma: 1.0 }, { date: '2026-01-15', sigma: 1.32 }],
    tTotal: 300, aValue: 0, status: 'active',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: new Date().toISOString()
  },
];

// A 값 초기화
relationshipsStore.forEach(r => {
  r.aValue = calculateA(r.tTotal, r.sigma);
});

// OPTIONS
export async function OPTIONS() {
  return optionsResponse();
}

// GET - 관계 목록/상세 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('id');
    const orgId = searchParams.get('orgId');
    const nodeId = searchParams.get('nodeId');
    const status = searchParams.get('status') as RelationshipStatus | null;
    const minSigma = parseFloat(searchParams.get('minSigma') || '0');
    const maxSigma = parseFloat(searchParams.get('maxSigma') || '3');
    
    // 단일 관계 조회
    if (relationshipId) {
      const rel = relationshipsStore.find(r => r.id === relationshipId);
      if (!rel) {
        return errorResponse('Relationship not found', 404);
      }
      return successResponse({ 
        relationship: rel,
        grade: getSigmaGrade(rel.sigma),
        formula: `A = T^σ = ${rel.tTotal}^${rel.sigma} = ${rel.aValue.toFixed(2)}`
      });
    }
    
    // 목록 조회
    let filtered = [...relationshipsStore];
    
    if (orgId) {
      filtered = filtered.filter(r => r.orgId === orgId);
    }
    if (nodeId) {
      filtered = filtered.filter(r => r.nodeAId === nodeId || r.nodeBId === nodeId);
    }
    if (status) {
      filtered = filtered.filter(r => r.status === status);
    }
    filtered = filtered.filter(r => r.sigma >= minSigma && r.sigma <= maxSigma);
    
    // 통계
    const activeRels = filtered.filter(r => r.status === 'active');
    const stats = {
      total: filtered.length,
      active: activeRels.length,
      avgSigma: activeRels.reduce((s, r) => s + r.sigma, 0) / activeRels.length || 0,
      totalA: activeRels.reduce((s, r) => s + r.aValue, 0),
      distribution: {
        critical: activeRels.filter(r => r.sigma < 0.7).length,
        at_risk: activeRels.filter(r => r.sigma >= 0.7 && r.sigma < 1.0).length,
        neutral: activeRels.filter(r => r.sigma >= 1.0 && r.sigma < 1.3).length,
        good: activeRels.filter(r => r.sigma >= 1.3 && r.sigma < 1.6).length,
        loyal: activeRels.filter(r => r.sigma >= 1.6 && r.sigma < 2.0).length,
        advocate: activeRels.filter(r => r.sigma >= 2.0).length,
      },
    };
    
    return successResponse({ 
      relationships: filtered.map(r => ({ ...r, grade: getSigmaGrade(r.sigma) })),
      stats 
    });
    
  } catch (error) {
    return serverErrorResponse(error, 'Relationships GET');
  }
}

// POST - 관계 생성/수정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      // 관계 생성
      case 'create': {
        const { orgId, nodeAId, nodeBId, nodeAName, nodeBName, sigma = 1.0 } = body;
        
        if (!orgId || !nodeAId || !nodeBId) {
          return errorResponse('orgId, nodeAId, nodeBId are required', 400);
        }
        
        // 중복 체크
        const exists = relationshipsStore.find(r => 
          (r.nodeAId === nodeAId && r.nodeBId === nodeBId) ||
          (r.nodeAId === nodeBId && r.nodeBId === nodeAId)
        );
        if (exists) {
          return errorResponse('Relationship already exists', 400);
        }
        
        const relationship: Relationship = {
          id: `rel-${Date.now()}`,
          orgId,
          nodeAId,
          nodeBId,
          nodeAName,
          nodeBName,
          sigma: Math.max(0.5, Math.min(3.0, sigma)),
          sigmaHistory: [{ date: new Date().toISOString().split('T')[0], sigma }],
          tTotal: 0,
          aValue: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        relationshipsStore.push(relationship);
        return successResponse({ relationship }, 'Relationship created');
      }
      
      // σ 업데이트
      case 'update_sigma': {
        const { id, sigma, reason } = body;
        
        if (!id || sigma === undefined) {
          return errorResponse('id, sigma are required', 400);
        }
        
        const rel = relationshipsStore.find(r => r.id === id);
        if (!rel) {
          return errorResponse('Relationship not found', 404);
        }
        
        const oldSigma = rel.sigma;
        rel.sigma = Math.max(0.5, Math.min(3.0, sigma));
        rel.sigmaHistory.push({ date: new Date().toISOString().split('T')[0], sigma: rel.sigma });
        rel.aValue = calculateA(rel.tTotal, rel.sigma);
        rel.updatedAt = new Date().toISOString();
        
        return successResponse({ 
          relationship: rel, 
          change: { from: oldSigma, to: rel.sigma },
          grade: getSigmaGrade(rel.sigma)
        }, 'Sigma updated');
      }
      
      // 시간 추가 (T 업데이트)
      case 'add_time': {
        const { id, tPhysical, lambdaAvg = 1 } = body;
        
        if (!id || tPhysical === undefined) {
          return errorResponse('id, tPhysical are required', 400);
        }
        
        const rel = relationshipsStore.find(r => r.id === id);
        if (!rel) {
          return errorResponse('Relationship not found', 404);
        }
        
        const tValue = lambdaAvg * tPhysical;
        rel.tTotal += tValue;
        rel.aValue = calculateA(rel.tTotal, rel.sigma);
        rel.updatedAt = new Date().toISOString();
        
        return successResponse({ 
          relationship: rel,
          added: { tPhysical, tValue },
          formula: `A = ${rel.tTotal}^${rel.sigma} = ${rel.aValue.toFixed(2)}`
        }, 'Time added');
      }
      
      // 상태 변경
      case 'change_status': {
        const { id, status, reason } = body;
        
        if (!id || !status) {
          return errorResponse('id, status are required', 400);
        }
        
        const rel = relationshipsStore.find(r => r.id === id);
        if (!rel) {
          return errorResponse('Relationship not found', 404);
        }
        
        const oldStatus = rel.status;
        rel.status = status as RelationshipStatus;
        rel.updatedAt = new Date().toISOString();
        
        return successResponse({ 
          relationship: rel,
          change: { from: oldStatus, to: status }
        }, 'Status changed');
      }
      
      // Ω (조직 가치) 계산
      case 'calculate_omega': {
        const { orgId } = body;
        
        const orgRels = orgId 
          ? relationshipsStore.filter(r => r.orgId === orgId && r.status === 'active')
          : relationshipsStore.filter(r => r.status === 'active');
        
        const omega = orgRels.reduce((sum, r) => sum + r.aValue, 0);
        const avgSigma = orgRels.reduce((sum, r) => sum + r.sigma, 0) / orgRels.length || 0;
        
        return successResponse({
          omega,
          avgSigma,
          relationshipCount: orgRels.length,
          formula: `Ω = Σ(T^σ) = ${omega.toFixed(2)}`,
        });
      }
      
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
    
  } catch (error) {
    return serverErrorResponse(error, 'Relationships POST');
  }
}

// DELETE - 관계 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('id');
    
    if (!relationshipId) {
      return errorResponse('id is required', 400);
    }
    
    const index = relationshipsStore.findIndex(r => r.id === relationshipId);
    if (index === -1) {
      return errorResponse('Relationship not found', 404);
    }
    
    const deleted = relationshipsStore.splice(index, 1)[0];
    return successResponse({ deleted }, 'Relationship deleted');
    
  } catch (error) {
    return serverErrorResponse(error, 'Relationships DELETE');
  }
}
