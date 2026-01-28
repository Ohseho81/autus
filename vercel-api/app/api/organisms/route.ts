// ============================================
// AUTUS Organisms API - 유기체 CRUD
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { calculateV, summarizeState, recommendImpulse } from '@/lib/physics';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET /api/organisms?userId=xxx&id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (id) {
      // 단일 유기체 조회
      const organism = await db.getOrganism(id);
      if (!organism) {
        return NextResponse.json(
          { success: false, error: 'Organism not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      const state = {
        mint: organism.mint,
        tax: organism.tax,
        synergy: organism.synergy,
        entropy: organism.entropy,
        velocity: organism.velocity,
        friction: organism.friction
      };

      return NextResponse.json({
        success: true,
        data: {
          ...organism,
          computed_v: calculateV(organism.mint, organism.tax, organism.synergy),
          summary: summarizeState(state),
          recommended_impulse: recommendImpulse(state)
        }
      }, { status: 200, headers: corsHeaders });
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 전체 목록 조회
    const organisms = await db.getOrganisms(userId);

    return NextResponse.json({
      success: true,
      data: organisms.map(org => ({
        ...org,
        computed_v: calculateV(org.mint, org.tax, org.synergy)
      }))
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Organisms GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Demo data
const DEMO_ORGANISMS = [
  { id: 'org-001', name: '김민수 선생님', type: 'teacher', emoji: '👨‍🏫', mint: 8500000, tax: 6200000, synergy: 0.85, status: 'stable', urgency: 0.2 },
  { id: 'org-002', name: '박철수 학생', type: 'student', emoji: '👨‍🎓', mint: 1200000, tax: 800000, synergy: 0.72, status: 'warning', urgency: 0.6 },
  { id: 'org-003', name: '이영희 학부모', type: 'parent', emoji: '👩', mint: 500000, tax: 200000, synergy: 0.91, status: 'opportunity', urgency: 0.1 },
  { id: 'org-004', name: '강남 1반', type: 'class', emoji: '📚', mint: 15000000, tax: 11000000, synergy: 0.78, status: 'stable', urgency: 0.3 },
];

// POST /api/organisms (생성)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, name, type, emoji, mint, tax, synergy } = body;

    // Demo mode
    if (action === 'list' || userId === 'demo') {
      return NextResponse.json({
        success: true,
        data: {
          organisms: DEMO_ORGANISMS.map(org => ({
            ...org,
            computed_v: calculateV(org.mint, org.tax, org.synergy),
            summary: summarizeState({ ...org, entropy: 0.2, velocity: 0.05, friction: 0.1 })
          })),
          total_count: DEMO_ORGANISMS.length,
          by_status: {
            stable: 2,
            warning: 1,
            opportunity: 1
          }
        }
      }, { status: 200, headers: corsHeaders });
    }

    if (!userId || !name || !type) {
      return NextResponse.json(
        { success: false, error: 'userId, name, type are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Supabase에 직접 INSERT
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const supabaseAdmin = getSupabaseAdmin();
    
    // value_v는 DB에서 자동 계산됨 (GENERATED ALWAYS AS)
    const initialState = {
      user_id: userId,
      name,
      type,
      emoji: emoji || '👤',
      mint: mint || 1000000,
      tax: tax || 500000,
      synergy: synergy || 0.1,
      entropy: 0.3,
      velocity: 0.05,
      friction: 0.1,
      sync_rate: 0.7,
      status: 'stable',
      urgency: 0.3
    };

    const { data, error } = await supabaseAdmin
      .from('organisms')
      .insert(initialState)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data
    }, { status: 201, headers: corsHeaders });

  } catch (error: any) {
    console.error('Organisms POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT /api/organisms (업데이트)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // V 재계산
    if (updates.mint !== undefined || updates.tax !== undefined || updates.synergy !== undefined) {
      const current = await db.getOrganism(id);
      if (current) {
        updates.value_v = calculateV(
          updates.mint ?? current.mint,
          updates.tax ?? current.tax,
          updates.synergy ?? current.synergy
        );
      }
    }

    const success = await db.updateOrganism(id, updates);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Update failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    const updated = await db.getOrganism(id);

    return NextResponse.json({
      success: true,
      data: updated
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Organisms PUT Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
