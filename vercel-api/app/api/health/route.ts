/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏥 AUTUS Health Check API
 * 
 * 시스템 상태 모니터링 및 성능 지표
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 시스템 시작 시간
const START_TIME = Date.now();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const checks: Record<string, { status: 'ok' | 'error' | 'degraded'; latency?: number; message?: string }> = {};
  
  // 1. API 서버 상태
  checks.api = { status: 'ok', latency: 0 };
  
  // 2. 데이터베이스 연결 확인
  try {
    const dbStart = Date.now();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('autus_nodes').select('id').limit(1);
    const dbLatency = Date.now() - dbStart;
    
    if (error) {
      checks.database = { status: 'error', latency: dbLatency, message: error.message };
    } else {
      checks.database = { 
        status: dbLatency < 1000 ? 'ok' : 'degraded', 
        latency: dbLatency,
        message: dbLatency > 500 ? 'High latency' : undefined
      };
    }
  } catch (e) {
    checks.database = { status: 'error', message: 'Connection failed' };
  }
  
  // 3. 환경변수 확인
  const envVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingEnvs = envVars.filter(v => !process.env[v]);
  checks.environment = {
    status: missingEnvs.length === 0 ? 'ok' : 'degraded',
    message: missingEnvs.length > 0 ? `Missing: ${missingEnvs.join(', ')}` : undefined
  };
  
  // 4. 메모리 사용량 (Node.js 환경에서만)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    checks.memory = {
      status: heapUsedMB / heapTotalMB < 0.9 ? 'ok' : 'degraded',
      message: `${heapUsedMB}MB / ${heapTotalMB}MB`
    };
  }
  
  // 전체 상태 판단
  const statuses = Object.values(checks).map(c => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (statuses.includes('error')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded';
  }
  
  const totalLatency = Date.now() - startTime;
  const uptime = Date.now() - START_TIME;
  
  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    uptime: {
      ms: uptime,
      human: formatUptime(uptime)
    },
    checks,
    metrics: {
      response_time_ms: totalLatency,
      node_version: process.version,
      region: process.env.VERCEL_REGION || 'unknown'
    }
  }, {
    status: overallStatus === 'unhealthy' ? 503 : 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    }
  });
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
