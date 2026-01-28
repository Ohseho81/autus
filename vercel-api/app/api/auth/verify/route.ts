// ============================================
// AUTUS Auth Verify API
// 마스터 비밀번호 및 승인 코드 검증
// ============================================

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  optionsResponse,
  validateRequest,
} from '../../../../lib/api-utils';
import {
  verifyMasterPassword,
  verifyApprovalCode,
  isInternalRole,
} from '../../../../lib/auth';

// ============================================
// OPTIONS (CORS)
// ============================================
export async function OPTIONS() {
  return optionsResponse();
}

// ============================================
// POST - 인증 검증
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 유효성 검사
    const validation = validateRequest(body, {
      role: { required: true, type: 'string' },
      credential: { required: true, type: 'string', min: 4 },
      type: { required: true, type: 'string' },
    });

    if (!validation.valid) {
      return errorResponse('Validation failed', 400, { errors: validation.errors });
    }

    const { role, credential, type } = body;

    // 역할 검증
    const validRoles = ['c_level', 'fsd', 'optimus', 'consumer', 'regulatory', 'partner'];
    if (!validRoles.includes(role)) {
      return errorResponse('Invalid role', 400);
    }

    // 외부 역할은 인증 불필요
    if (!isInternalRole(role)) {
      return successResponse({ 
        verified: true, 
        role,
        message: 'External role - no authentication required' 
      });
    }

    // 인증 타입별 검증
    let verified = false;

    if (type === 'master_password') {
      // C-Level 마스터 비밀번호 검증
      if (role !== 'c_level') {
        return errorResponse('Master password only for C-Level', 403);
      }
      verified = verifyMasterPassword(credential);
    } else if (type === 'approval_code') {
      // FSD/Optimus 승인 코드 검증
      if (role === 'c_level') {
        return errorResponse('C-Level uses master password', 400);
      }
      verified = verifyApprovalCode(role, credential);
    } else {
      return errorResponse('Invalid authentication type', 400);
    }

    if (!verified) {
      return errorResponse('Authentication failed', 401);
    }

    // 성공 시 세션 토큰 생성 (간단한 구현)
    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    return successResponse({
      verified: true,
      role,
      sessionToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 후
    }, 'Authentication successful');

  } catch (error) {
    return serverErrorResponse(error, 'Auth Verify');
  }
}
