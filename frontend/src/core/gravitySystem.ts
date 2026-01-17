// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Gravity System (The Mind)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Gravity Trigger: 비가역적 결정 감지 → 자동 고도 상승
// Lock System: 특정 고도 강제 고정
// Approval Flow: 승인 주체 기반 접근 제어
//
// ═══════════════════════════════════════════════════════════════════════════════

import {
  KScale,
  AutusTask,
  GravityTrigger,
  GravityCondition,
  DEFAULT_GRAVITY_TRIGGERS,
  SCALE_CONFIGS,
  ApprovalAuthority,
} from './schema';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface GravityEvent {
  type: 'scale_up' | 'scale_down' | 'lock' | 'unlock' | 'blocked';
  fromScale: KScale;
  toScale: KScale;
  trigger: GravityTrigger | null;
  reason: string;
  timestamp: Date;
  requiresApproval: boolean;
  approvalAuthority?: ApprovalAuthority;
}

export interface UserPermissions {
  userId: string;
  maxScale: KScale;
  authorities: ApprovalAuthority[];
  canOverride: boolean;
  overrideLog: OverrideEntry[];
}

export interface OverrideEntry {
  timestamp: Date;
  fromScale: KScale;
  toScale: KScale;
  reason: string;
  approvedBy: string;
}

export interface GravitySystemState {
  currentScale: KScale;
  lockedScale: KScale | null;
  lockReason: string | null;
  pendingApprovals: PendingApproval[];
  recentEvents: GravityEvent[];
  activeAlerts: GravityAlert[];
}

export interface PendingApproval {
  id: string;
  taskId: string;
  requiredScale: KScale;
  requiredAuthority: ApprovalAuthority;
  requestedBy: string;
  requestedAt: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface GravityAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  scale: KScale;
  triggerId?: string;
  expiresAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gravity System 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class GravitySystem {
  private triggers: GravityTrigger[];
  private userPermissions: UserPermissions;
  private state: GravitySystemState;
  private listeners: Set<(event: GravityEvent) => void> = new Set();
  private alertListeners: Set<(alert: GravityAlert) => void> = new Set();
  
  constructor(
    userPermissions: UserPermissions,
    customTriggers?: GravityTrigger[]
  ) {
    this.userPermissions = userPermissions;
    this.triggers = customTriggers || DEFAULT_GRAVITY_TRIGGERS;
    
    this.state = {
      currentScale: 1,
      lockedScale: null,
      lockReason: null,
      pendingApprovals: [],
      recentEvents: [],
      activeAlerts: [],
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 공개 API
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Task 분석 및 필요 고도 반환
   */
  analyzeTask(task: Partial<AutusTask>): {
    requiredScale: KScale;
    triggers: GravityTrigger[];
    alerts: GravityAlert[];
    canProceed: boolean;
    blockReason?: string;
  } {
    const matchedTriggers: GravityTrigger[] = [];
    const alerts: GravityAlert[] = [];
    let maxRequiredScale: KScale = 1;
    
    // 모든 트리거 평가
    for (const trigger of this.triggers) {
      if (this.evaluateCondition(trigger.condition, task)) {
        matchedTriggers.push(trigger);
        
        if (trigger.targetScale > maxRequiredScale) {
          maxRequiredScale = trigger.targetScale;
        }
        
        // 경고 생성
        if (trigger.isForced) {
          alerts.push({
            id: `alert-${Date.now()}-${trigger.id}`,
            type: 'critical',
            message: `${trigger.name}: ${trigger.description}`,
            scale: trigger.targetScale,
            triggerId: trigger.id,
          });
        }
      }
    }
    
    // 권한 체크
    const canProceed = maxRequiredScale <= this.userPermissions.maxScale;
    const blockReason = canProceed 
      ? undefined 
      : `K${maxRequiredScale} 결정에 대한 권한이 없습니다. (최대: K${this.userPermissions.maxScale})`;
    
    return {
      requiredScale: maxRequiredScale,
      triggers: matchedTriggers,
      alerts,
      canProceed,
      blockReason,
    };
  }
  
  /**
   * 고도 변경 요청
   */
  requestScaleChange(
    targetScale: KScale,
    reason: string
  ): GravityEvent {
    const fromScale = this.state.currentScale;
    
    // 잠금 체크
    if (this.state.lockedScale !== null && targetScale !== this.state.lockedScale) {
      const event: GravityEvent = {
        type: 'blocked',
        fromScale,
        toScale: targetScale,
        trigger: null,
        reason: `고도가 K${this.state.lockedScale}에 잠겨있습니다: ${this.state.lockReason}`,
        timestamp: new Date(),
        requiresApproval: false,
      };
      
      this.recordEvent(event);
      return event;
    }
    
    // 권한 체크
    if (targetScale > this.userPermissions.maxScale) {
      const config = SCALE_CONFIGS[targetScale];
      
      const event: GravityEvent = {
        type: 'blocked',
        fromScale,
        toScale: targetScale,
        trigger: null,
        reason: `K${targetScale} 접근 권한 없음`,
        timestamp: new Date(),
        requiresApproval: true,
        approvalAuthority: config.authority,
      };
      
      // 승인 요청 생성
      this.createApprovalRequest(targetScale, reason);
      
      this.recordEvent(event);
      return event;
    }
    
    // 성공
    const eventType = targetScale > fromScale ? 'scale_up' : 'scale_down';
    const event: GravityEvent = {
      type: eventType,
      fromScale,
      toScale: targetScale,
      trigger: null,
      reason,
      timestamp: new Date(),
      requiresApproval: false,
    };
    
    this.state.currentScale = targetScale;
    this.recordEvent(event);
    
    return event;
  }
  
  /**
   * 강제 고도 상승 (Gravity Trigger 발동)
   */
  forceScaleUp(task: Partial<AutusTask>): GravityEvent | null {
    const analysis = this.analyzeTask(task);
    
    if (analysis.requiredScale <= this.state.currentScale) {
      return null; // 현재 고도가 충분함
    }
    
    // 알림 발송
    analysis.alerts.forEach(alert => {
      this.state.activeAlerts.push(alert);
      this.notifyAlertListeners(alert);
    });
    
    // 강제 상승
    const trigger = analysis.triggers.find(t => t.isForced);
    
    const event: GravityEvent = {
      type: 'scale_up',
      fromScale: this.state.currentScale,
      toScale: analysis.requiredScale,
      trigger: trigger || null,
      reason: trigger?.description || '자동 고도 상승',
      timestamp: new Date(),
      requiresApproval: !analysis.canProceed,
      approvalAuthority: analysis.canProceed ? undefined : SCALE_CONFIGS[analysis.requiredScale].authority,
    };
    
    if (analysis.canProceed) {
      this.state.currentScale = analysis.requiredScale;
    } else {
      // 승인 대기 상태로 잠금
      this.lockScale(analysis.requiredScale, `승인 대기: ${trigger?.name || 'Gravity Trigger'}`);
    }
    
    this.recordEvent(event);
    return event;
  }
  
  /**
   * 고도 잠금
   */
  lockScale(scale: KScale, reason: string): void {
    this.state.lockedScale = scale;
    this.state.lockReason = reason;
    
    const event: GravityEvent = {
      type: 'lock',
      fromScale: this.state.currentScale,
      toScale: scale,
      trigger: null,
      reason,
      timestamp: new Date(),
      requiresApproval: false,
    };
    
    this.state.currentScale = scale;
    this.recordEvent(event);
  }
  
  /**
   * 고도 잠금 해제
   */
  unlockScale(authorityId: string): boolean {
    if (!this.state.lockedScale) {
      return true;
    }
    
    // 권한 확인 (간소화)
    const canUnlock = this.userPermissions.canOverride || 
      this.userPermissions.maxScale >= this.state.lockedScale;
    
    if (!canUnlock) {
      return false;
    }
    
    const event: GravityEvent = {
      type: 'unlock',
      fromScale: this.state.lockedScale,
      toScale: this.state.currentScale,
      trigger: null,
      reason: `Unlocked by ${authorityId}`,
      timestamp: new Date(),
      requiresApproval: false,
    };
    
    this.state.lockedScale = null;
    this.state.lockReason = null;
    this.recordEvent(event);
    
    return true;
  }
  
  /**
   * 승인 처리
   */
  processApproval(
    approvalId: string,
    approved: boolean,
    approverInfo: { id: string; name: string }
  ): boolean {
    const approval = this.state.pendingApprovals.find(a => a.id === approvalId);
    
    if (!approval || approval.status !== 'pending') {
      return false;
    }
    
    approval.status = approved ? 'approved' : 'rejected';
    
    if (approved) {
      // 승인 시 고도 잠금 해제 및 상승
      this.unlockScale(approverInfo.id);
      this.state.currentScale = approval.requiredScale;
      
      // Override 기록
      this.userPermissions.overrideLog.push({
        timestamp: new Date(),
        fromScale: this.state.currentScale,
        toScale: approval.requiredScale,
        reason: approval.reason,
        approvedBy: approverInfo.id,
      });
    }
    
    return true;
  }
  
  /**
   * 현재 상태 반환
   */
  getState(): Readonly<GravitySystemState> {
    return { ...this.state };
  }
  
  /**
   * 이벤트 리스너 등록
   */
  onEvent(listener: (event: GravityEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * 알림 리스너 등록
   */
  onAlert(listener: (alert: GravityAlert) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 내부 메서드
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 조건 평가
   */
  private evaluateCondition(
    condition: GravityCondition,
    task: Partial<AutusTask>
  ): boolean {
    switch (condition.type) {
      case 'money_threshold':
        return (task.failureCost?.money?.value || 0) >= condition.value;
      
      case 'time_impact':
        // 시간 단위 변환 후 비교 (간소화)
        return true; // 실제 구현 필요
      
      case 'stakeholder_count':
        return (task.relations?.childIds?.length || 0) >= condition.value;
      
      case 'legal_regulatory':
        const text = `${task.name || ''} ${task.description || ''}`.toLowerCase();
        return condition.keywords.some(kw => text.includes(kw.toLowerCase()));
      
      case 'cross_border':
        return false; // 국가 정보 필요
      
      case 'esg_impact':
        const fullText = `${task.name || ''} ${task.description || ''}`.toLowerCase();
        return condition.categories.some(cat => fullText.includes(cat.toLowerCase()));
      
      case 'system_change':
        return task.domain === 'strategy' && condition.scope === 'principle';
      
      default:
        return false;
    }
  }
  
  /**
   * 이벤트 기록
   */
  private recordEvent(event: GravityEvent): void {
    this.state.recentEvents.unshift(event);
    
    // 최근 100개만 유지
    if (this.state.recentEvents.length > 100) {
      this.state.recentEvents.pop();
    }
    
    // 리스너 알림
    this.listeners.forEach(listener => listener(event));
  }
  
  /**
   * 승인 요청 생성
   */
  private createApprovalRequest(scale: KScale, reason: string): PendingApproval {
    const config = SCALE_CONFIGS[scale];
    
    const approval: PendingApproval = {
      id: `approval-${Date.now()}`,
      taskId: '',
      requiredScale: scale,
      requiredAuthority: config.authority,
      requestedBy: this.userPermissions.userId,
      requestedAt: new Date(),
      reason,
      status: 'pending',
    };
    
    this.state.pendingApprovals.push(approval);
    
    return approval;
  }
  
  /**
   * 알림 리스너 알림
   */
  private notifyAlertListeners(alert: GravityAlert): void {
    this.alertListeners.forEach(listener => listener(alert));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useGravitySystem(userPermissions: UserPermissions) {
  const system = useMemo(() => new GravitySystem(userPermissions), [userPermissions]);
  const [state, setState] = useState<GravitySystemState>(system.getState());
  const [alerts, setAlerts] = useState<GravityAlert[]>([]);
  
  useEffect(() => {
    const unsubEvent = system.onEvent(() => setState(system.getState()));
    const unsubAlert = system.onAlert((alert) => {
      setAlerts(prev => [...prev, alert]);
      
      // 5초 후 자동 제거
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
      }, 5000);
    });
    
    return () => {
      unsubEvent();
      unsubAlert();
    };
  }, [system]);
  
  const analyzeTask = useCallback((task: Partial<AutusTask>) => {
    return system.analyzeTask(task);
  }, [system]);
  
  const requestScaleChange = useCallback((scale: KScale, reason: string) => {
    return system.requestScaleChange(scale, reason);
  }, [system]);
  
  const forceScaleUp = useCallback((task: Partial<AutusTask>) => {
    return system.forceScaleUp(task);
  }, [system]);
  
  return {
    state,
    alerts,
    system,
    analyzeTask,
    requestScaleChange,
    forceScaleUp,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default GravitySystem;
