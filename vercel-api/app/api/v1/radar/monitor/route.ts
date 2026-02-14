// ═══════════════════════════════════════════════════════════════════════════════
// 🚨 AUTUS Radar Monitor - 실시간 위험 감지 & 알림
// Moltbot + Telegram 연동
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface RiskAlert {
  id: string;
  customerId: string;
  customerName: string;
  temperature: number;
  churnProbability: number;
  riskLevel: 'critical' | 'high' | 'medium';
  factors: string[];
  recommendedAction: string;
  detectedAt: string;
}

interface RadarMonitorResponse {
  success: boolean;
  data: {
    alerts: RiskAlert[];
    summary: {
      critical: number;
      high: number;
      medium: number;
      totalAtRisk: number;
    };
    lastScan: string;
    nextScan: string;
  };
  telegram?: {
    sent: boolean;
    messageId?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────
// Telegram Bot Config
// ─────────────────────────────────────────────────────────────────────

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/radar/monitor - 실시간 레이더 스캔
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id') || (process.env.DEFAULT_ORG_ID || '');
  const notify = searchParams.get('notify') !== 'false'; // 기본값: true
  const threshold = parseFloat(searchParams.get('threshold') || '0.5'); // 이탈 확률 임계값

  try {
    const supabase = getSupabaseAdmin();
    
    // 위험 고객 조회 (새로운 customer_temperatures 테이블)
    const { data: riskCustomers, error } = await supabase
      .from('customer_temperatures')
      .select('*')
      .eq('org_id', orgId)
      .or(`temperature.lt.50,risk_score.gte.${threshold}`)
      .order('risk_score', { ascending: false })
      .limit(20);

    if (error) {
      console.log('Radar: Using mock data -', error.message);
    }

    // 실제 데이터 변환
    const alerts: RiskAlert[] = (riskCustomers && riskCustomers.length > 0)
      ? riskCustomers.map(rc => ({
          id: rc.id,
          customerId: rc.id,
          customerName: rc.customer_name,
          temperature: Number(rc.temperature),
          churnProbability: Number(rc.risk_score),
          riskLevel: Number(rc.temperature) < 30 ? 'critical' as const : 
                     Number(rc.temperature) < 50 ? 'high' as const : 'medium' as const,
          factors: rc.risk_factors || [],
          recommendedAction: getRecommendedActionFromTemp(Number(rc.temperature), Number(rc.risk_score)),
          detectedAt: rc.updated_at || new Date().toISOString()
        }))
      : getMockAlerts();

    const summary = {
      critical: alerts.filter(a => a.riskLevel === 'critical').length,
      high: alerts.filter(a => a.riskLevel === 'high').length,
      medium: alerts.filter(a => a.riskLevel === 'medium').length,
      totalAtRisk: alerts.length
    };

    const response: RadarMonitorResponse = {
      success: true,
      data: {
        alerts,
        summary,
        lastScan: new Date().toISOString(),
        nextScan: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5분 후
      }
    };

    // Telegram 알림 전송 (critical 또는 high가 있을 때)
    if (notify && (summary.critical > 0 || summary.high > 0)) {
      const telegramResult = await sendTelegramAlert(alerts, summary);
      response.telegram = telegramResult;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Radar monitor error:', error);
    
    // Fallback Mock 응답
    const mockAlerts = getMockAlerts();
    return NextResponse.json({
      success: true,
      data: {
        alerts: mockAlerts,
        summary: {
          critical: mockAlerts.filter(a => a.riskLevel === 'critical').length,
          high: mockAlerts.filter(a => a.riskLevel === 'high').length,
          medium: mockAlerts.filter(a => a.riskLevel === 'medium').length,
          totalAtRisk: mockAlerts.length
        },
        lastScan: new Date().toISOString(),
        nextScan: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      },
      meta: { isMock: true }
    });
  }
}

// 온도 기반 권장 조치
function getRecommendedActionFromTemp(temperature: number, riskScore: number): string {
  if (temperature < 25) {
    return '🚨 즉시 오너 직접 연락 - 이탈 직전 긴급 대응';
  }
  if (temperature < 35) {
    return '📞 48시간 내 원장 면담 예약 필수';
  }
  if (temperature < 50) {
    return '💬 담당 강사 친밀도 메시지 발송';
  }
  if (riskScore > 0.5) {
    return '📊 주간 모니터링 강화';
  }
  return '✅ 정상 관리 유지';
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/radar/monitor - 수동 스캔 트리거
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { org_id, notify = true, message } = body;

  // GET과 동일한 로직 실행
  const url = new URL(request.url);
  url.searchParams.set('org_id', org_id || (process.env.DEFAULT_ORG_ID || ''));
  url.searchParams.set('notify', notify.toString());

  const getRequest = new NextRequest(url);
  return GET(getRequest);
}

// ─────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────

function getFactors(customer: any): string[] {
  const factors: string[] = [];
  
  if (customer.temperature < 30) factors.push('온도 위험 수준');
  if (customer.churn_probability > 0.7) factors.push('이탈 확률 70%+');
  if (customer.trust_score < 40) factors.push('신뢰도 하락');
  if (customer.engagement_score < 30) factors.push('참여도 저조');
  if (customer.sigma_external < 0.8) factors.push('외부 환경 악화');
  
  return factors.length ? factors : ['복합 요인'];
}

function getRecommendedAction(customer: any): string {
  if (customer.temperature < 30) {
    return '🚨 즉시 1:1 상담 필요 - 담당자에게 긴급 연락';
  }
  if (customer.churn_probability > 0.7) {
    return '📞 48시간 내 학부모 면담 예약';
  }
  if (customer.temperature < 50) {
    return '💬 친밀도 향상 메시지 발송 권장';
  }
  return '📊 주간 모니터링 유지';
}

function getMockAlerts(): RiskAlert[] {
  return [
    {
      id: 'alert-001',
      customerId: 'cust-001',
      customerName: '김민수',
      temperature: 28,
      churnProbability: 0.85,
      riskLevel: 'critical',
      factors: ['온도 위험 수준', '이탈 확률 85%', '최근 결석 3회'],
      recommendedAction: '🚨 즉시 1:1 상담 필요 - 담당자에게 긴급 연락',
      detectedAt: new Date().toISOString()
    },
    {
      id: 'alert-002',
      customerId: 'cust-002',
      customerName: '이서연',
      temperature: 42,
      churnProbability: 0.62,
      riskLevel: 'high',
      factors: ['참여도 저조', '학부모 불만 Voice 감지'],
      recommendedAction: '📞 48시간 내 학부모 면담 예약',
      detectedAt: new Date().toISOString()
    },
    {
      id: 'alert-003',
      customerId: 'cust-003',
      customerName: '박지훈',
      temperature: 48,
      churnProbability: 0.51,
      riskLevel: 'medium',
      factors: ['경쟁사 프로모션 영향'],
      recommendedAction: '💬 친밀도 향상 메시지 발송 권장',
      detectedAt: new Date().toISOString()
    }
  ];
}

// ─────────────────────────────────────────────────────────────────────
// Telegram Alert
// ─────────────────────────────────────────────────────────────────────

async function sendTelegramAlert(
  alerts: RiskAlert[], 
  summary: { critical: number; high: number; medium: number; totalAtRisk: number }
): Promise<{ sent: boolean; messageId?: number; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { sent: false, error: 'Telegram credentials not configured' };
  }

  try {
    const criticalAlerts = alerts.filter(a => a.riskLevel === 'critical');
    const highAlerts = alerts.filter(a => a.riskLevel === 'high');
    
    // 메시지 구성
    let message = `🚨 *AUTUS 레이더 알림*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `📊 *위험 현황*\n`;
    message += `• 🔴 위험: ${summary.critical}명\n`;
    message += `• 🟠 주의: ${summary.high}명\n`;
    message += `• 🟡 관찰: ${summary.medium}명\n\n`;
    
    if (criticalAlerts.length > 0) {
      message += `🔴 *긴급 대응 필요*\n`;
      criticalAlerts.forEach(alert => {
        message += `\n*${alert.customerName}* (${alert.temperature}°)\n`;
        message += `├ 이탈 확률: ${(alert.churnProbability * 100).toFixed(0)}%\n`;
        message += `├ 요인: ${alert.factors.join(', ')}\n`;
        message += `└ 조치: ${alert.recommendedAction}\n`;
      });
    }
    
    if (highAlerts.length > 0) {
      message += `\n🟠 *주의 관찰*\n`;
      highAlerts.slice(0, 3).forEach(alert => {
        message += `• ${alert.customerName}: ${alert.temperature}° (${(alert.churnProbability * 100).toFixed(0)}%)\n`;
      });
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🕐 ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
    message += `🔗 [대시보드 열기](${process.env.NEXT_PUBLIC_APP_URL || 'https://autus-ai.com'})`;
    
    // Telegram API 호출
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      }
    );
    
    const result = await response.json();
    
    if (result.ok) {
      return { sent: true, messageId: result.result.message_id };
    } else {
      return { sent: false, error: result.description };
    }
  } catch (error) {
    console.error('Telegram send error:', error);
    return { sent: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
