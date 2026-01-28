/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Time Logs API
 * 
 * 시간 기록 관리
 * T = λ × t
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
interface TimeLog {
  id: string;
  orgId: string;
  nodeId?: string;
  relationshipId?: string;
  tPhysical: number;      // 물리 시간 (분)
  tValue: number;         // 가치 시간 (λ × t)
  activityType: string;   // class, consultation, event, etc.
  lambdaMultiplier: number; // 활동 유형별 가중치
  metadata?: Record<string, unknown>;
  recordedAt: string;
}

// 활동 유형별 λ 가중치
const ACTIVITY_LAMBDA_MULTIPLIER: Record<string, number> = {
  'consultation_1on1': 1.5,    // 1:1 상담
  'class_small': 1.0,          // 소그룹 수업 (2-5명)
  'class_large': 0.5,          // 대그룹 수업 (5명+)
  'event': 0.8,                // 이벤트
  'self_study': 0.3,           // 자습
  'communication': 0.7,        // 소통 (전화, 메시지)
  'admin': 0.2,                // 행정 업무
  'other': 0.5,                // 기타
};

// In-memory store
const timeLogsStore: TimeLog[] = [];

// OPTIONS
export async function OPTIONS() {
  return optionsResponse();
}

// GET - 시간 기록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const relationshipId = searchParams.get('relationshipId');
    const orgId = searchParams.get('orgId');
    const activityType = searchParams.get('activityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    let filtered = [...timeLogsStore];
    
    if (nodeId) {
      filtered = filtered.filter(t => t.nodeId === nodeId);
    }
    if (relationshipId) {
      filtered = filtered.filter(t => t.relationshipId === relationshipId);
    }
    if (orgId) {
      filtered = filtered.filter(t => t.orgId === orgId);
    }
    if (activityType) {
      filtered = filtered.filter(t => t.activityType === activityType);
    }
    if (startDate) {
      filtered = filtered.filter(t => t.recordedAt >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.recordedAt <= endDate);
    }
    
    // 최신순 정렬
    filtered.sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    
    // 제한
    filtered = filtered.slice(0, limit);
    
    // 통계
    const stats = {
      count: filtered.length,
      totalTPhysical: filtered.reduce((s, t) => s + t.tPhysical, 0),
      totalTValue: filtered.reduce((s, t) => s + t.tValue, 0),
      avgLambdaMultiplier: filtered.reduce((s, t) => s + t.lambdaMultiplier, 0) / filtered.length || 0,
      byActivityType: Object.entries(
        filtered.reduce((acc, t) => {
          acc[t.activityType] = (acc[t.activityType] || 0) + t.tPhysical;
          return acc;
        }, {} as Record<string, number>)
      ).map(([type, minutes]) => ({ type, minutes })),
    };
    
    return successResponse({ 
      timeLogs: filtered, 
      stats,
      activityMultipliers: ACTIVITY_LAMBDA_MULTIPLIER,
    });
    
  } catch (error) {
    return serverErrorResponse(error, 'TimeLogs GET');
  }
}

// POST - 시간 기록 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action || 'create') {
      // 단일 기록 생성
      case 'create': {
        const { 
          orgId, nodeId, relationshipId, 
          tPhysical, activityType, 
          lambda = 1, metadata 
        } = body;
        
        if (!orgId || tPhysical === undefined || !activityType) {
          return errorResponse('orgId, tPhysical, activityType are required', 400);
        }
        
        const lambdaMultiplier = ACTIVITY_LAMBDA_MULTIPLIER[activityType] || 0.5;
        const tValue = lambda * lambdaMultiplier * tPhysical;
        
        const timeLog: TimeLog = {
          id: `tlog-${Date.now()}`,
          orgId,
          nodeId,
          relationshipId,
          tPhysical,
          tValue,
          activityType,
          lambdaMultiplier,
          metadata,
          recordedAt: new Date().toISOString(),
        };
        
        timeLogsStore.push(timeLog);
        
        return successResponse({ 
          timeLog,
          calculation: {
            formula: `T = λ × λ_activity × t = ${lambda} × ${lambdaMultiplier} × ${tPhysical} = ${tValue.toFixed(2)}`,
            lambda,
            lambdaMultiplier,
            tPhysical,
            tValue,
          }
        }, 'Time log created');
      }
      
      // 일괄 기록 생성
      case 'bulk_create': {
        const { logs } = body;
        
        if (!logs || !Array.isArray(logs)) {
          return errorResponse('logs array is required', 400);
        }
        
        const created: TimeLog[] = [];
        
        for (const log of logs) {
          const { orgId, nodeId, relationshipId, tPhysical, activityType, lambda = 1, metadata } = log;
          
          if (!orgId || tPhysical === undefined || !activityType) continue;
          
          const lambdaMultiplier = ACTIVITY_LAMBDA_MULTIPLIER[activityType] || 0.5;
          const tValue = lambda * lambdaMultiplier * tPhysical;
          
          const timeLog: TimeLog = {
            id: `tlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            orgId,
            nodeId,
            relationshipId,
            tPhysical,
            tValue,
            activityType,
            lambdaMultiplier,
            metadata,
            recordedAt: new Date().toISOString(),
          };
          
          timeLogsStore.push(timeLog);
          created.push(timeLog);
        }
        
        return successResponse({ 
          created,
          count: created.length,
          totalTValue: created.reduce((s, t) => s + t.tValue, 0),
        }, `${created.length} time logs created`);
      }
      
      // 노드/관계별 T 총합 계산
      case 'calculate_total': {
        const { nodeId, relationshipId, startDate, endDate } = body;
        
        let filtered = [...timeLogsStore];
        
        if (nodeId) {
          filtered = filtered.filter(t => t.nodeId === nodeId);
        }
        if (relationshipId) {
          filtered = filtered.filter(t => t.relationshipId === relationshipId);
        }
        if (startDate) {
          filtered = filtered.filter(t => t.recordedAt >= startDate);
        }
        if (endDate) {
          filtered = filtered.filter(t => t.recordedAt <= endDate);
        }
        
        const totalTPhysical = filtered.reduce((s, t) => s + t.tPhysical, 0);
        const totalTValue = filtered.reduce((s, t) => s + t.tValue, 0);
        
        return successResponse({
          nodeId,
          relationshipId,
          period: { startDate, endDate },
          totalTPhysical,
          totalTValue,
          logCount: filtered.length,
        });
      }
      
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
    
  } catch (error) {
    return serverErrorResponse(error, 'TimeLogs POST');
  }
}

// DELETE - 시간 기록 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    
    if (!logId) {
      return errorResponse('id is required', 400);
    }
    
    const index = timeLogsStore.findIndex(t => t.id === logId);
    if (index === -1) {
      return errorResponse('Time log not found', 404);
    }
    
    const deleted = timeLogsStore.splice(index, 1)[0];
    return successResponse({ deleted }, 'Time log deleted');
    
  } catch (error) {
    return serverErrorResponse(error, 'TimeLogs DELETE');
  }
}
