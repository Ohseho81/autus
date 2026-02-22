/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 AUTUS Metrics API
 * 
 * 시스템 성능 지표 및 비즈니스 KPI
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureError } from '../../../lib/monitoring';
import { getSupabaseAdmin } from '../../../lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// In-memory metrics store (for demo/development)
const metricsStore: {
  apiCalls: number;
  errors: number;
  avgResponseTime: number;
  responseTimes: number[];
} = {
  apiCalls: 0,
  errors: 0,
  avgResponseTime: 0,
  responseTimes: []
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  
  try {
    const supabase = getSupabaseAdmin();
    
    const metrics: Record<string, unknown> = {};
    
    // System Metrics
    if (type === 'all' || type === 'system') {
      metrics.system = {
        api_calls_total: metricsStore.apiCalls,
        error_rate: metricsStore.apiCalls > 0 
          ? (metricsStore.errors / metricsStore.apiCalls * 100).toFixed(2) + '%'
          : '0%',
        avg_response_time_ms: metricsStore.avgResponseTime.toFixed(0),
        uptime: '99.9%', // Vercel SLA
      };
    }
    
    // Database Metrics
    if (type === 'all' || type === 'database') {
      // 노드 수
      const { count: nodeCount } = await supabase
        .from('autus_nodes')
        .select('*', { count: 'exact', head: true });
      
      // 관계 수
      const { count: relCount } = await supabase
        .from('autus_relationships')
        .select('*', { count: 'exact', head: true });
      
      // 활성 관계 평균 σ
      const { data: sigmaData } = await supabase
        .from('autus_relationships')
        .select('sigma')
        .eq('status', 'active');
      
      const avgSigma = sigmaData && sigmaData.length > 0
        ? sigmaData.reduce((sum, r) => sum + r.sigma, 0) / sigmaData.length
        : 1.0;
      
      metrics.database = {
        total_nodes: nodeCount || 0,
        total_relationships: relCount || 0,
        avg_sigma: avgSigma.toFixed(2),
        storage_used: 'N/A'
      };
    }
    
    // Business Metrics (AUTUS v2.1)
    if (type === 'all' || type === 'business') {
      const { data: relationships } = await supabase
        .from('autus_relationships')
        .select('sigma, a_value, status');
      
      const activeRels = relationships?.filter(r => r.status === 'active') || [];
      
      // Ω 계산
      const omega = activeRels.reduce((sum, r) => sum + (r.a_value || 0), 0);
      
      // σ 분포
      const distribution = {
        critical: activeRels.filter(r => r.sigma < 0.7).length,
        at_risk: activeRels.filter(r => r.sigma >= 0.7 && r.sigma < 1.0).length,
        neutral: activeRels.filter(r => r.sigma >= 1.0 && r.sigma < 1.3).length,
        good: activeRels.filter(r => r.sigma >= 1.3 && r.sigma < 1.6).length,
        loyal: activeRels.filter(r => r.sigma >= 1.6 && r.sigma < 2.0).length,
        advocate: activeRels.filter(r => r.sigma >= 2.0).length,
      };
      
      // 이탈 위험률
      const churnRisk = activeRels.length > 0
        ? ((distribution.critical + distribution.at_risk) / activeRels.length * 100).toFixed(1)
        : '0';
      
      metrics.business = {
        omega: omega.toFixed(0),
        avg_sigma: activeRels.length > 0
          ? (activeRels.reduce((s, r) => s + r.sigma, 0) / activeRels.length).toFixed(2)
          : '1.00',
        sigma_distribution: distribution,
        churn_risk_percent: churnRisk + '%',
        formula: 'A = T^σ'
      };
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    }, { headers: corsHeaders });
    
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'metrics.handler' });
    return NextResponse.json({
      success: false,
      error: 'Failed to collect metrics',
      metrics: {
        system: metricsStore,
        database: { error: 'Unable to connect' },
        business: { error: 'Unable to calculate' }
      }
    }, { status: 500, headers: corsHeaders });
  }
}

// Internal function to track metrics
function trackApiCall(responseTime: number, isError: boolean = false) {
  metricsStore.apiCalls++;
  if (isError) metricsStore.errors++;
  
  metricsStore.responseTimes.push(responseTime);
  if (metricsStore.responseTimes.length > 100) {
    metricsStore.responseTimes.shift();
  }
  
  metricsStore.avgResponseTime = 
    metricsStore.responseTimes.reduce((a, b) => a + b, 0) / metricsStore.responseTimes.length;
}
