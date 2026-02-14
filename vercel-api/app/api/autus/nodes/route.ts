/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Nodes API
 * 
 * 노드 CRUD 및 λ 관리
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
type NodeType = 'OWNER' | 'MANAGER' | 'STAFF' | 'STUDENT' | 'PARENT' | 'PROSPECT' | 'CHURNED' | 'EXTERNAL';

interface Node {
  id: string;
  orgId: string;
  type: NodeType;
  name: string;
  email?: string;
  phone?: string;
  lambda: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// 기본 λ 값
const NODE_LAMBDA: Record<NodeType, number> = {
  OWNER: 5.0,
  MANAGER: 3.0,
  STAFF: 2.0,
  STUDENT: 1.0,
  PARENT: 1.2,
  PROSPECT: 0.8,
  CHURNED: 0.5,
  EXTERNAL: 1.0,
};

// In-memory store
const nodesStore: Node[] = [
  // 샘플 데이터
  { id: 'node-1', orgId: 'org-1', type: 'OWNER', name: '대표', lambda: 5.0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'node-2', orgId: 'org-1', type: 'MANAGER', name: '김원장', lambda: 3.0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'node-3', orgId: 'org-1', type: 'STAFF', name: '박교사', lambda: 2.0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'node-4', orgId: 'org-1', type: 'STUDENT', name: '이학생', lambda: 1.0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'node-5', orgId: 'org-1', type: 'PARENT', name: '이학부모', lambda: 1.2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// OPTIONS
export async function OPTIONS() {
  return optionsResponse();
}

// GET - 노드 목록/상세 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('id');
    const orgId = searchParams.get('orgId');
    const type = searchParams.get('type') as NodeType | null;
    const search = searchParams.get('search');
    
    // 단일 노드 조회
    if (nodeId) {
      const node = nodesStore.find(n => n.id === nodeId);
      if (!node) {
        return errorResponse('Node not found', 404);
      }
      return successResponse({ node });
    }
    
    // 목록 조회
    let filtered = [...nodesStore];
    
    if (orgId) {
      filtered = filtered.filter(n => n.orgId === orgId);
    }
    if (type) {
      filtered = filtered.filter(n => n.type === type);
    }
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(n => 
        n.name.toLowerCase().includes(lowerSearch) ||
        n.email?.toLowerCase().includes(lowerSearch)
      );
    }
    
    // 통계
    const stats = {
      total: filtered.length,
      byType: {
        OWNER: filtered.filter(n => n.type === 'OWNER').length,
        MANAGER: filtered.filter(n => n.type === 'MANAGER').length,
        STAFF: filtered.filter(n => n.type === 'STAFF').length,
        STUDENT: filtered.filter(n => n.type === 'STUDENT').length,
        PARENT: filtered.filter(n => n.type === 'PARENT').length,
        PROSPECT: filtered.filter(n => n.type === 'PROSPECT').length,
        CHURNED: filtered.filter(n => n.type === 'CHURNED').length,
        EXTERNAL: filtered.filter(n => n.type === 'EXTERNAL').length,
      },
      avgLambda: filtered.reduce((s, n) => s + n.lambda, 0) / filtered.length || 0,
    };
    
    return successResponse({ nodes: filtered, stats, lambdaDefaults: NODE_LAMBDA });
    
  } catch (error) {
    return serverErrorResponse(error, 'Nodes GET');
  }
}

// POST - 노드 생성/수정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      // 노드 생성
      case 'create': {
        const { orgId, type, name, email, phone, lambda, metadata } = body;
        
        if (!orgId || !type || !name) {
          return errorResponse('orgId, type, name are required', 400);
        }
        
        if (!NODE_LAMBDA[type as NodeType]) {
          return errorResponse(`Invalid type: ${type}`, 400);
        }
        
        const node: Node = {
          id: `node-${Date.now()}`,
          orgId,
          type: type as NodeType,
          name,
          email,
          phone,
          lambda: lambda ?? NODE_LAMBDA[type as NodeType],
          metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        nodesStore.push(node);
        return successResponse({ node }, 'Node created');
      }
      
      // 노드 수정
      case 'update': {
        const { id, name, email, phone, lambda, metadata, type } = body;
        
        if (!id) {
          return errorResponse('id is required', 400);
        }
        
        const node = nodesStore.find(n => n.id === id);
        if (!node) {
          return errorResponse('Node not found', 404);
        }
        
        if (name !== undefined) node.name = name;
        if (email !== undefined) node.email = email;
        if (phone !== undefined) node.phone = phone;
        if (lambda !== undefined) node.lambda = Math.max(0.1, Math.min(10, lambda));
        if (metadata !== undefined) node.metadata = { ...node.metadata, ...metadata };
        if (type !== undefined && NODE_LAMBDA[type as NodeType]) node.type = type;
        node.updatedAt = new Date().toISOString();
        
        return successResponse({ node }, 'Node updated');
      }
      
      // λ 업데이트
      case 'update_lambda': {
        const { id, lambda, performanceFactor } = body;
        
        if (!id) {
          return errorResponse('id is required', 400);
        }
        
        const node = nodesStore.find(n => n.id === id);
        if (!node) {
          return errorResponse('Node not found', 404);
        }
        
        if (lambda !== undefined) {
          node.lambda = Math.max(0.1, Math.min(10, lambda));
        } else if (performanceFactor !== undefined) {
          const baseLambda = NODE_LAMBDA[node.type];
          const factor = Math.max(-0.2, Math.min(0.3, performanceFactor));
          node.lambda = baseLambda * (1 + factor);
        }
        node.updatedAt = new Date().toISOString();
        
        return successResponse({ node }, 'Lambda updated');
      }
      
      // 타입 변경 (이탈 처리 등)
      case 'change_type': {
        const { id, newType, reason } = body;
        
        if (!id || !newType) {
          return errorResponse('id, newType are required', 400);
        }
        
        const node = nodesStore.find(n => n.id === id);
        if (!node) {
          return errorResponse('Node not found', 404);
        }
        
        const oldType = node.type;
        node.type = newType as NodeType;
        node.lambda = NODE_LAMBDA[newType as NodeType];
        const history = (node.metadata?.typeChangeHistory as Array<Record<string, string>> || []);
        node.metadata = { ...node.metadata, typeChangeHistory: [...history, { from: oldType, to: newType, reason, at: new Date().toISOString() }] };
        node.updatedAt = new Date().toISOString();
        
        return successResponse({ node, change: { from: oldType, to: newType } }, 'Type changed');
      }
      
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
    
  } catch (error) {
    return serverErrorResponse(error, 'Nodes POST');
  }
}

// DELETE - 노드 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('id');
    
    if (!nodeId) {
      return errorResponse('id is required', 400);
    }
    
    const index = nodesStore.findIndex(n => n.id === nodeId);
    if (index === -1) {
      return errorResponse('Node not found', 404);
    }
    
    const deleted = nodesStore.splice(index, 1)[0];
    return successResponse({ deleted }, 'Node deleted');
    
  } catch (error) {
    return serverErrorResponse(error, 'Nodes DELETE');
  }
}
