/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Alerts API
 * 
 * 다층 알림 시스템
 * - Critical: 즉시 조치 필요
 * - Warning: 주의 필요
 * - Positive: 긍정적 이벤트
 * - Info: 정보성
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
type AlertLevel = 'critical' | 'warning' | 'positive' | 'info';

interface Alert {
  id: string;
  nodeId?: string;
  relationshipId?: string;
  level: AlertLevel;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// Alert 설정
const ALERT_CONFIG = {
  critical: {
    sigma_threshold: 0.7,
    sigma_delta_30d: -0.3,
    behaviors: ['COMPLAINT', 'CHURN_SIGNAL'],
    consecutive_absence: 3,
  },
  warning: {
    sigma_threshold: 1.0,
    sigma_delta_30d: -0.15,
    payment_delay_days: 7,
    response_rate_threshold: 0.3,
  },
  positive: {
    advocate_threshold: 2.0,
    behaviors: ['REFERRAL', 'POSITIVE_FEEDBACK'],
  },
};

// In-memory store
const alertsStore: Alert[] = [
  // 샘플 알림
  {
    id: 'alert-1',
    nodeId: 'node-1',
    level: 'critical',
    type: 'churn_imminent',
    message: '김학생 이탈 임박 (σ = 0.65)',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-2',
    nodeId: 'node-2',
    level: 'warning',
    type: 'sigma_declining',
    message: '박학부모 σ 하락 추세 (-0.18/30일)',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'alert-3',
    nodeId: 'node-3',
    level: 'positive',
    type: 'referral',
    message: '이학부모 소개 등록 발생!',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// OPTIONS
export async function OPTIONS() {
  return optionsResponse();
}

// GET - 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as AlertLevel | null;
    const nodeId = searchParams.get('nodeId');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let filtered = [...alertsStore];
    
    // 필터링
    if (level) {
      filtered = filtered.filter(a => a.level === level);
    }
    if (nodeId) {
      filtered = filtered.filter(a => a.nodeId === nodeId);
    }
    if (unreadOnly) {
      filtered = filtered.filter(a => !a.isRead);
    }
    
    // 최신순 정렬
    filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // 제한
    filtered = filtered.slice(0, limit);
    
    // 통계
    const stats = {
      total: alertsStore.length,
      unread: alertsStore.filter(a => !a.isRead).length,
      byLevel: {
        critical: alertsStore.filter(a => a.level === 'critical').length,
        warning: alertsStore.filter(a => a.level === 'warning').length,
        positive: alertsStore.filter(a => a.level === 'positive').length,
        info: alertsStore.filter(a => a.level === 'info').length,
      },
    };
    
    return successResponse({
      alerts: filtered,
      stats,
      config: ALERT_CONFIG,
    });
    
  } catch (error) {
    return serverErrorResponse(error, 'Alerts GET');
  }
}

// POST - 알림 생성 / 읽음 처리
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      // 알림 생성
      case 'create': {
        const { nodeId, relationshipId, level, type, message, metadata } = body;
        
        if (!level || !type || !message) {
          return errorResponse('level, type, message are required', 400);
        }
        
        const alert: Alert = {
          id: `alert-${Date.now()}`,
          nodeId,
          relationshipId,
          level,
          type,
          message,
          metadata,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        
        alertsStore.unshift(alert);
        
        return successResponse({ alert }, 'Alert created');
      }
      
      // 읽음 처리
      case 'mark_read': {
        const { alertId, alertIds } = body;
        const ids = alertIds || (alertId ? [alertId] : []);
        
        if (ids.length === 0) {
          return errorResponse('alertId or alertIds required', 400);
        }
        
        let count = 0;
        for (const id of ids) {
          const alert = alertsStore.find(a => a.id === id);
          if (alert && !alert.isRead) {
            alert.isRead = true;
            count++;
          }
        }
        
        return successResponse({ markedCount: count });
      }
      
      // 전체 읽음 처리
      case 'mark_all_read': {
        const { level } = body;
        let count = 0;
        
        for (const alert of alertsStore) {
          if (!alert.isRead && (!level || alert.level === level)) {
            alert.isRead = true;
            count++;
          }
        }
        
        return successResponse({ markedCount: count });
      }
      
      // σ 기반 알림 체크 (시스템용)
      case 'check': {
        const { nodeId, currentSigma, previousSigma, daysDelta, behaviors = [] } = body;
        
        const alerts: Alert[] = [];
        const sigmaDelta = currentSigma - previousSigma;
        const sigmaDelta30d = (sigmaDelta / daysDelta) * 30;
        
        // Critical 체크
        if (currentSigma < ALERT_CONFIG.critical.sigma_threshold) {
          const alert: Alert = {
            id: `alert-${Date.now()}-1`,
            nodeId,
            level: 'critical',
            type: 'churn_imminent',
            message: `σ < ${ALERT_CONFIG.critical.sigma_threshold} 이탈 임박 (현재: ${currentSigma.toFixed(2)})`,
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          alerts.push(alert);
          alertsStore.unshift(alert);
        }
        
        if (sigmaDelta30d < ALERT_CONFIG.critical.sigma_delta_30d) {
          const alert: Alert = {
            id: `alert-${Date.now()}-2`,
            nodeId,
            level: 'critical',
            type: 'sigma_crash',
            message: `σ 급락 (30일 예상: ${sigmaDelta30d.toFixed(2)})`,
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          alerts.push(alert);
          alertsStore.unshift(alert);
        }
        
        // Warning 체크
        if (currentSigma >= 0.7 && currentSigma < ALERT_CONFIG.warning.sigma_threshold) {
          const alert: Alert = {
            id: `alert-${Date.now()}-3`,
            nodeId,
            level: 'warning',
            type: 'churn_risk',
            message: `이탈 위험 (σ: ${currentSigma.toFixed(2)})`,
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          alerts.push(alert);
          alertsStore.unshift(alert);
        }
        
        // Positive 체크
        if (currentSigma >= ALERT_CONFIG.positive.advocate_threshold && previousSigma < 2.0) {
          const alert: Alert = {
            id: `alert-${Date.now()}-4`,
            nodeId,
            level: 'positive',
            type: 'advocate_achieved',
            message: `💜 Advocate 등급 달성!`,
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          alerts.push(alert);
          alertsStore.unshift(alert);
        }
        
        return successResponse({ alerts, triggered: alerts.length });
      }
      
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
    
  } catch (error) {
    return serverErrorResponse(error, 'Alerts POST');
  }
}

// DELETE - 알림 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';
    const deleteRead = searchParams.get('read') === 'true';
    
    if (deleteAll) {
      alertsStore.length = 0;
      return successResponse({ message: 'All alerts deleted' });
    }
    
    if (deleteRead) {
      const count = alertsStore.filter(a => a.isRead).length;
      const remaining = alertsStore.filter(a => !a.isRead);
      alertsStore.length = 0;
      alertsStore.push(...remaining);
      return successResponse({ deletedCount: count });
    }
    
    if (alertId) {
      const index = alertsStore.findIndex(a => a.id === alertId);
      if (index === -1) {
        return errorResponse('Alert not found', 404);
      }
      alertsStore.splice(index, 1);
      return successResponse({ message: 'Alert deleted' });
    }
    
    return errorResponse('id, all, or read parameter required', 400);
    
  } catch (error) {
    return serverErrorResponse(error, 'Alerts DELETE');
  }
}
