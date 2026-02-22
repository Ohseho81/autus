// ═══════════════════════════════════════════════════════════════════════════════
// 🤖 AUTUS Automation Stats API
// 역할별 자동화율 실시간 추적
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { captureError } from '@/lib/monitoring';
import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface AutomationLog {
  id: string;
  role: 'owner' | 'manager' | 'teacher' | 'parent' | 'student';
  source: 'n8n' | 'moltbot' | 'api' | 'manual';
  action_type: string;
  is_automated: boolean;
  org_id: string;
  created_at: string;
}

interface RoleStats {
  role: string;
  label: string;
  icon: string;
  target: number;
  current: number;
  color: string;
  tasks: { auto: number; manual: number };
  trend: number;
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/automation - 자동화 통계 조회
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id') || (process.env.DEFAULT_ORG_ID || '');
  const period = searchParams.get('period') || 'today'; // today, week, month

  try {
    const supabase = getSupabaseAdmin();
    
    // 기간 계산
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // today
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    // 자동화 로그 조회
    const { data: logs, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      // 테이블이 없으면 Mock 데이터 반환
      logger.info('Using mock data:', error.message);
      return NextResponse.json({
        success: true,
        data: getMockAutomationStats(),
        message: '자동화 통계 조회 (Mock)',
        meta: { period, orgId, isMock: true }
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
      });
    }

    // 역할별 통계 계산
    const stats = calculateRoleStats(logs || []);

    return NextResponse.json({
      success: true,
      data: stats,
      message: '자동화 통계 조회 성공',
      meta: {
        period,
        orgId,
        totalLogs: logs?.length || 0,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'automation.GET' });
    return NextResponse.json({
      success: true,
      data: getMockAutomationStats(),
      message: '자동화 통계 조회 (Fallback)',
      meta: { isMock: true }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/automation - 자동화 로그 기록 (n8n, moltbot에서 호출)
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      role, 
      source = 'api', 
      action_type, 
      is_automated = true,
      org_id = (process.env.DEFAULT_ORG_ID || ''),
      metadata = {}
    } = body;

    if (!role || !action_type) {
      return NextResponse.json(
        { success: false, error: 'role and action_type are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('automation_logs')
      .insert({
        role,
        source,
        action_type,
        is_automated,
        org_id,
        metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'automation.POST.log' });
      // 실패해도 성공 응답 (로깅 실패가 비즈니스 로직을 막으면 안됨)
      return NextResponse.json({
        success: true,
        message: '자동화 로그 기록 (캐시)',
        logged: false
      });
    }

    return NextResponse.json({
      success: true,
      data,
      message: '자동화 로그 기록 완료'
    });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'automation.POST' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────

function calculateRoleStats(logs: AutomationLog[]): RoleStats[] {
  const roleConfig = [
    { role: 'owner', label: 'Owner', icon: '👑', target: 90, color: '#FFD700' },
    { role: 'manager', label: 'Manager', icon: '📊', target: 80, color: '#00f0ff' },
    { role: 'teacher', label: 'Teacher', icon: '👨‍🏫', target: 70, color: '#00ff88' },
    { role: 'parent', label: 'Parent', icon: '👪', target: 30, color: '#ff8800' },
    { role: 'student', label: 'Student', icon: '🎓', target: 20, color: '#b44aff' },
  ];

  return roleConfig.map(config => {
    const roleLogs = logs.filter(l => l.role === config.role);
    const autoLogs = roleLogs.filter(l => l.is_automated);
    const manualLogs = roleLogs.filter(l => !l.is_automated);
    
    const total = roleLogs.length || 1; // 0 나누기 방지
    const current = Math.round((autoLogs.length / total) * config.target);
    
    return {
      ...config,
      current: Math.min(current, config.target),
      tasks: {
        auto: autoLogs.length,
        manual: manualLogs.length
      },
      trend: Math.random() * 10 - 5 // TODO: 실제 트렌드 계산
    };
  });
}

function getMockAutomationStats(): RoleStats[] {
  // 현실적인 Mock 데이터 (시간에 따라 약간씩 변동)
  const hour = new Date().getHours();
  const variance = Math.sin(hour / 24 * Math.PI) * 5;
  
  return [
    { 
      role: 'owner', label: 'Owner', icon: '👑', target: 90, 
      current: Math.round(85 + variance), color: '#FFD700',
      tasks: { auto: 42 + Math.floor(variance), manual: 8 },
      trend: 2.3
    },
    { 
      role: 'manager', label: 'Manager', icon: '📊', target: 80, 
      current: Math.round(72 + variance), color: '#00f0ff',
      tasks: { auto: 36 + Math.floor(variance), manual: 14 },
      trend: 1.8
    },
    { 
      role: 'teacher', label: 'Teacher', icon: '👨‍🏫', target: 70, 
      current: Math.round(65 + variance), color: '#00ff88',
      tasks: { auto: 28 + Math.floor(variance), manual: 15 },
      trend: -0.5
    },
    { 
      role: 'parent', label: 'Parent', icon: '👪', target: 30, 
      current: Math.round(25 + variance * 0.5), color: '#ff8800',
      tasks: { auto: 12 + Math.floor(variance * 0.5), manual: 28 },
      trend: 3.2
    },
    { 
      role: 'student', label: 'Student', icon: '🎓', target: 20, 
      current: Math.round(15 + variance * 0.3), color: '#b44aff',
      tasks: { auto: 8 + Math.floor(variance * 0.3), manual: 35 },
      trend: 0.8
    },
  ];
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
