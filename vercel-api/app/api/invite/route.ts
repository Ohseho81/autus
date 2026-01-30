// ═══════════════════════════════════════════════════════════════════════════════
// 📨 AUTUS Invite API — 1-12-144 원칙 적용
// 
// Dunbar's Number 기반 조직 구조 제한:
// - Owner (1) → 원장 (12) → 관리자 (144) → 강사 (1,728)
// - max_direct_child = 12 (직접 관리 한도)
// - max_influence_count = 144 (영향력 한도)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface InviteCheckResult {
  allowed: boolean;
  direct: {
    current: number;
    max: number;
    remaining: number;
  };
  influence: {
    current: number;
    max: number;
    remaining: number;
  };
  reason: string;
}

interface InviteLink {
  code: string;
  url: string;
  expiresAt: string;
  targetRole: string;
  createdBy: string;
}

// ─────────────────────────────────────────────────────────────────────
// Supabase Client
// ─────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────

/**
 * 1-12-144 제한 체크
 */
async function checkInviteLimit(userId: string): Promise<InviteCheckResult> {
  try {
    // DB 함수 호출
    const { data, error } = await supabase.rpc('can_invite', {
      p_inviter_id: userId
    });

    if (error) {
      // 함수가 없으면 기본값으로 폴백
      console.warn('can_invite function not found, using fallback:', error.message);
      
      // 직접 쿼리
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('max_direct_child, max_influence_count, current_direct_count, current_influence_count')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          allowed: false,
          direct: { current: 0, max: 12, remaining: 0 },
          influence: { current: 0, max: 144, remaining: 0 },
          reason: 'User not found'
        };
      }

      const maxDirect = user.max_direct_child || 12;
      const maxInfluence = user.max_influence_count || 144;
      const currentDirect = user.current_direct_count || 0;
      const currentInfluence = user.current_influence_count || 0;

      const canDirect = currentDirect < maxDirect;
      const canInfluence = currentInfluence < maxInfluence;

      return {
        allowed: canDirect && canInfluence,
        direct: {
          current: currentDirect,
          max: maxDirect,
          remaining: maxDirect - currentDirect
        },
        influence: {
          current: currentInfluence,
          max: maxInfluence,
          remaining: maxInfluence - currentInfluence
        },
        reason: !canDirect 
          ? `직접 관리 한도(${maxDirect}명) 초과` 
          : !canInfluence 
            ? `영향력 한도(${maxInfluence}명) 초과` 
            : 'OK'
      };
    }

    return data as InviteCheckResult;
  } catch (err) {
    console.error('checkInviteLimit error:', err);
    return {
      allowed: false,
      direct: { current: 0, max: 12, remaining: 0 },
      influence: { current: 0, max: 144, remaining: 0 },
      reason: 'System error'
    };
  }
}

/**
 * 초대 코드 생성
 */
function generateInviteCode(): string {
  return nanoid(12).toUpperCase();
}

/**
 * 역할 계층 체크
 */
function canInviteRole(inviterRole: string, targetRole: string): boolean {
  const hierarchy: Record<string, string[]> = {
    'c_level': ['fsd', 'optimus', 'consumer'],
    'fsd': ['optimus', 'consumer'],
    'optimus': ['consumer'],
    'consumer': [],
    'regulatory': [],
    'partner': []
  };

  return hierarchy[inviterRole]?.includes(targetRole) || false;
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/invite — 초대 가능 여부 확인
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID required'
      }, { status: 401 });
    }

    const result = await checkInviteLimit(userId);

    return NextResponse.json({
      success: true,
      data: {
        canInvite: result.allowed,
        limits: {
          direct: result.direct,
          influence: result.influence
        },
        message: result.reason,
        principle: '1-12-144 (Dunbar\'s Number 기반)'
      }
    });
  } catch (error) {
    console.error('GET /api/invite error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check invite status'
    }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/invite — 초대 링크 생성
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    
    const { 
      orgId, 
      targetRole = 'consumer',
      expiresInHours = 72,
      metadata = {}
    } = body;

    if (!userId || !orgId) {
      return NextResponse.json({
        success: false,
        error: 'User ID and Org ID required'
      }, { status: 400 });
    }

    // 1. 1-12-144 제한 체크
    const limitCheck = await checkInviteLimit(userId);
    
    if (!limitCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: limitCheck.reason,
        data: {
          blocked: true,
          limits: {
            direct: limitCheck.direct,
            influence: limitCheck.influence
          },
          suggestion: limitCheck.direct.remaining === 0 
            ? '직접 관리 인원을 정리하거나, 기존 멤버에게 초대 권한을 위임하세요.'
            : '영향력 범위 내 멤버를 정리하거나, 조직 구조를 재검토하세요.'
        }
      }, { status: 403 });
    }

    // 2. 초대자 역할 확인
    const { data: inviter, error: inviterError } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (inviterError || !inviter) {
      return NextResponse.json({
        success: false,
        error: 'Inviter not found in organization'
      }, { status: 403 });
    }

    // 3. 역할 계층 체크
    if (!canInviteRole(inviter.role, targetRole)) {
      return NextResponse.json({
        success: false,
        error: `${inviter.role} 역할은 ${targetRole} 역할을 초대할 수 없습니다.`,
        data: {
          inviterRole: inviter.role,
          targetRole: targetRole,
          allowedRoles: ({
            'c_level': ['fsd', 'optimus', 'consumer'],
            'fsd': ['optimus', 'consumer'],
            'optimus': ['consumer']
          } as Record<string, string[]>)[inviter.role as string] || []
        }
      }, { status: 403 });
    }

    // 4. 초대 코드 생성
    const inviteCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // 5. DB에 저장
    const { data: invite, error: insertError } = await supabase
      .from('approval_codes')
      .insert({
        code: inviteCode,
        org_id: orgId,
        issued_by: userId,
        issuer_role: inviter.role,
        target_role: targetRole,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert invite error:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create invite'
      }, { status: 500 });
    }

    // 6. 성공 응답
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://autus.app';
    const inviteUrl = `${baseUrl}/invite/${inviteCode}`;

    return NextResponse.json({
      success: true,
      data: {
        code: inviteCode,
        url: inviteUrl,
        expiresAt: expiresAt.toISOString(),
        targetRole: targetRole,
        createdBy: userId,
        limits: {
          direct: {
            ...limitCheck.direct,
            afterInvite: limitCheck.direct.remaining - 1
          },
          influence: {
            ...limitCheck.influence,
            afterInvite: limitCheck.influence.remaining - 1
          }
        }
      },
      message: `초대 링크가 생성되었습니다. 남은 직접 초대: ${limitCheck.direct.remaining - 1}명`
    });
  } catch (error) {
    console.error('POST /api/invite error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create invite'
    }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────
// PUT /api/invite — 초대 수락 (코드 사용)
// ─────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userId, userEmail, userName } = body;

    if (!code || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Invite code and user ID required'
      }, { status: 400 });
    }

    // 1. 코드 유효성 검사
    const { data: invite, error: fetchError } = await supabase
      .from('approval_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('used', false)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired invite code'
      }, { status: 404 });
    }

    // 2. 만료 체크
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Invite code has expired'
      }, { status: 410 });
    }

    // 3. 초대자의 1-12-144 재확인
    const limitCheck = await checkInviteLimit(invite.issued_by);
    if (!limitCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: '초대자의 인원 한도가 초과되었습니다. 다른 초대 링크를 요청하세요.'
      }, { status: 403 });
    }

    // 4. 조직에 멤버 추가
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: invite.org_id,
        user_id: userId,
        role: invite.target_role,
        approved_by: invite.issued_by,
        approved_at: new Date().toISOString()
      });

    if (memberError) {
      // 이미 멤버인 경우
      if (memberError.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'User is already a member of this organization'
        }, { status: 409 });
      }
      throw memberError;
    }

    // 5. 코드 사용 처리
    await supabase
      .from('approval_codes')
      .update({
        used: true,
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    // 6. 초대자의 카운트 업데이트
    const { error: rpcError } = await supabase.rpc('increment_user_counts', {
      p_user_id: invite.issued_by,
      p_direct_delta: 1,
      p_influence_delta: 1
    });
    
    // 함수 없으면 직접 업데이트
    if (rpcError) {
      await supabase
        .from('users')
        .update({
          current_direct_count: limitCheck.direct.current + 1,
          current_influence_count: limitCheck.influence.current + 1
        })
        .eq('id', invite.issued_by);
    }

    // 7. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        orgId: invite.org_id,
        role: invite.target_role,
        invitedBy: invite.issued_by,
        joinedAt: new Date().toISOString()
      },
      message: `${invite.target_role} 역할로 조직에 가입되었습니다.`
    });
  } catch (error) {
    console.error('PUT /api/invite error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to accept invite'
    }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/invite — 초대 취소
// ─────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!userId || !code) {
      return NextResponse.json({
        success: false,
        error: 'User ID and invite code required'
      }, { status: 400 });
    }

    // 초대 코드 삭제 (발행자만 가능)
    const { data, error } = await supabase
      .from('approval_codes')
      .delete()
      .eq('code', code.toUpperCase())
      .eq('issued_by', userId)
      .eq('used', false)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({
        success: false,
        error: 'Invite not found or already used'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invite cancelled successfully'
    });
  } catch (error) {
    console.error('DELETE /api/invite error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel invite'
    }, { status: 500 });
  }
}
