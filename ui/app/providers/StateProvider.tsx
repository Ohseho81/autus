'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 상태 타입
// ═══════════════════════════════════════════════════════════════════════════════
export type SystemGate = 'GREEN' | 'AMBER' | 'YELLOW' | 'RED';

interface SystemState {
  risk: number;
  gate: SystemGate;
  entropy: number;
  pressure: number;
  flow: number;
  survivalDays: number;
  allowedAction: string | null;
  auditId: string | null;
  canNavigateToAction: boolean;
  canNavigateToAudit: boolean;
  isLoading: boolean;
  lastUpdate: number;
}

interface StateContextType {
  state: SystemState;
  updateState: (newState: Partial<SystemState>) => void;
  executeAction: (action: string) => Promise<{ success: boolean; auditId?: string }>;
  lockAudit: (auditId: string) => void;
  refreshState: () => Promise<void>;
}

const StateContext = createContext<StateContextType | null>(null);

// API 베이스 URL
const API_BASE = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' 
      ? 'http://localhost:8000' 
      : 'https://autus-production.up.railway.app')
  : 'https://autus-production.up.railway.app';

// ═══════════════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════════════
export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SystemState>({
    risk: 0,
    gate: 'GREEN',
    entropy: 0,
    pressure: 0,
    flow: 0,
    survivalDays: 0,
    allowedAction: null,
    auditId: null,
    canNavigateToAction: false,
    canNavigateToAudit: false,
    isLoading: true,
    lastUpdate: 0,
  });

  // 상태 갱신 함수
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/physics/solar-binding`);
      
      if (!res.ok) {
        console.warn('[State] API error:', res.status);
        return;
      }
      
      const data = await res.json();
      
      // ACTION 결정 로직
      let allowedAction: string | null = null;
      const gate = (data.gate || data.status || 'GREEN').toUpperCase();
      const risk = data.risk || 0;
      
      if (risk >= 60 && gate !== 'RED') {
        const shock = data.physics?.shock || data.shock || 0;
        const friction = data.physics?.friction || data.friction || 0;
        
        if (shock > friction) {
          allowedAction = 'SHOCK_DAMP';
        } else if (friction >= shock) {
          allowedAction = 'DEFRICTION';
        } else {
          allowedAction = 'RECOVER';
        }
      }
      
      setState(prev => ({
        ...prev,
        risk: risk,
        gate: gate as SystemGate,
        entropy: data.entropy || 0,
        pressure: data.pressure || 0,
        flow: data.flow || 0,
        survivalDays: data.survival_time || data.physics?.survival_days || 0,
        allowedAction,
        canNavigateToAction: risk >= 60 && gate !== 'RED',
        isLoading: false,
        lastUpdate: Date.now(),
      }));
    } catch (e) {
      console.warn('[State] API offline:', e);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // 초기 상태 로드 + 주기적 갱신
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, [fetchState]);

  function updateState(newState: Partial<SystemState>) {
    setState(prev => ({ ...prev, ...newState }));
  }

  async function executeAction(action: string): Promise<{ success: boolean; auditId?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/action/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          system_state: state.gate,
          risk: state.risk,
          entropy: state.entropy,
        }),
      });
      
      if (!res.ok) {
        console.error('[Action] Failed:', res.status);
        return { success: false };
      }
      
      const data = await res.json();
      
      if (data.audit_id) {
        setState(prev => ({
          ...prev,
          auditId: data.audit_id,
          canNavigateToAudit: true,
          canNavigateToAction: false,
        }));
        return { success: true, auditId: data.audit_id };
      }
      
      return { success: false };
    } catch (e) {
      console.error('[Action] Error:', e);
      return { success: false };
    }
  }

  function lockAudit(auditId: string) {
    setState(prev => ({
      ...prev,
      auditId,
      canNavigateToAction: false,
      canNavigateToAudit: false, // 더 이상 이동 불가
    }));
    
    // localStorage에도 저장 (새로고침 대비)
    if (typeof window !== 'undefined') {
      localStorage.setItem('autus.auditLocked', 'true');
      localStorage.setItem('autus.lastAuditId', auditId);
    }
  }

  return (
    <StateContext.Provider value={{ 
      state, 
      updateState, 
      executeAction, 
      lockAudit,
      refreshState: fetchState 
    }}>
      {children}
    </StateContext.Provider>
  );
}

export function useSystemState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useSystemState must be used within StateProvider');
  }
  return context;
}
