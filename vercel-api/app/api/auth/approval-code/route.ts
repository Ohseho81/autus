// ============================================
// AUTUS Approval Code Management API
// 승인 코드 생성 및 관리 (상위 티어 → 하위 티어)
// ============================================

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  optionsResponse,
  generateUUID,
} from '../../../../lib/api-utils';
import { 
  canApprove, 
  isInternalRole, 
  storeDynamicApprovalCode, 
  getDynamicApprovalCodes, 
  deleteDynamicApprovalCode 
} from '../../../../lib/auth';

// ============================================
// OPTIONS (CORS)
// ============================================
export async function OPTIONS() {
  return optionsResponse();
}

// ============================================
// GET - 승인 코드 목록 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const codes = getDynamicApprovalCodes(role || undefined);

    return successResponse({
      codes,
      total: codes.length,
    });

  } catch (error) {
    return serverErrorResponse(error, 'Approval Code GET');
  }
}

// ============================================
// POST - 승인 코드 생성
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { approverRole, targetRole, expiresInHours = 24 } = body;

    // 필수 필드 검증
    if (!approverRole || !targetRole) {
      return errorResponse('approverRole and targetRole are required', 400);
    }

    // 역할 검증
    if (!isInternalRole(targetRole)) {
      return errorResponse('Can only create approval codes for internal roles', 400);
    }

    // 승인 권한 검증
    if (!canApprove(approverRole, targetRole)) {
      return errorResponse(`${approverRole} cannot approve ${targetRole}`, 403);
    }

    // 승인 코드 생성 (6자리 대문자+숫자)
    const code = generateApprovalCode();
    const id = generateUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    const codeData = {
      code,
      targetRole,
      createdBy: approverRole,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false,
    };

    storeDynamicApprovalCode(id, codeData);

    return successResponse({
      id,
      ...codeData,
    }, `Approval code generated for ${targetRole}`);

  } catch (error) {
    return serverErrorResponse(error, 'Approval Code POST');
  }
}

// ============================================
// DELETE - 승인 코드 취소
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return errorResponse('Code ID is required', 400);
    }

    const deleted = deleteDynamicApprovalCode(codeId);
    
    if (!deleted) {
      return errorResponse('Approval code not found', 404);
    }

    return successResponse({ deleted: true }, 'Approval code deleted');

  } catch (error) {
    return serverErrorResponse(error, 'Approval Code DELETE');
  }
}

// ============================================
// 헬퍼 함수
// ============================================
function generateApprovalCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동되는 문자 제외
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
