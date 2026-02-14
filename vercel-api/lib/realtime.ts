// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 AUTUS Realtime - Supabase 실시간 구독
// WebSocket 기반 실시간 데이터 스트리밍
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface RealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

export type RealtimeCallback = (event: RealtimeEvent) => void;

// ─────────────────────────────────────────────────────────────────────
// Realtime Manager (Singleton)
// ─────────────────────────────────────────────────────────────────────

class RealtimeManager {
  private client;
  private channels: Map<string, RealtimeChannel> = new Map();
  private callbacks: Map<string, Set<RealtimeCallback>> = new Map();

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  /**
   * 테이블 변경 사항 구독
   */
  subscribe(table: string, callback: RealtimeCallback, filter?: string): () => void {
    const channelKey = `${table}:${filter || 'all'}`;
    
    // 콜백 등록
    if (!this.callbacks.has(channelKey)) {
      this.callbacks.set(channelKey, new Set());
    }
    this.callbacks.get(channelKey)!.add(callback);

    // 채널이 없으면 생성
    if (!this.channels.has(channelKey)) {
      const channel = this.client
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter,
          },
          (payload) => {
            const event: RealtimeEvent = {
              type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              table: payload.table,
              schema: payload.schema,
              record: payload.new,
              old_record: payload.old,
            };

            // 모든 콜백 호출
            this.callbacks.get(channelKey)?.forEach(cb => cb(event));
          }
        )
        .subscribe();

      this.channels.set(channelKey, channel);
    }

    // 구독 해제 함수 반환
    return () => {
      this.callbacks.get(channelKey)?.delete(callback);
      
      // 콜백이 없으면 채널 해제
      if (this.callbacks.get(channelKey)?.size === 0) {
        this.channels.get(channelKey)?.unsubscribe();
        this.channels.delete(channelKey);
        this.callbacks.delete(channelKey);
      }
    };
  }

  /**
   * 특정 조직의 고객 온도 변화 구독
   */
  subscribeToTemperatures(orgId: string, callback: RealtimeCallback) {
    return this.subscribe('customer_temperatures', callback);
  }

  /**
   * 알림 구독
   */
  subscribeToAlerts(orgId: string, callback: RealtimeCallback) {
    return this.subscribe('alerts', callback, `org_id=eq.${orgId}`);
  }

  /**
   * Voice(고객 소리) 구독
   */
  subscribeToVoices(orgId: string, callback: RealtimeCallback) {
    return this.subscribe('voices', callback, `org_id=eq.${orgId}`);
  }

  /**
   * 자동화 로그 구독
   */
  subscribeToAutomation(orgId: string, callback: RealtimeCallback) {
    return this.subscribe('automation_logs', callback, `org_id=eq.${orgId}`);
  }

  /**
   * 모든 구독 해제
   */
  unsubscribeAll() {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
    this.callbacks.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────
// Export Singleton
// ─────────────────────────────────────────────────────────────────────

export const realtime = new RealtimeManager();

// ─────────────────────────────────────────────────────────────────────
// React Hook (클라이언트용)
// ─────────────────────────────────────────────────────────────────────

/**
 * 프론트엔드에서 사용할 실시간 구독 코드
 * 
 * @example
 * // components/Dashboard.tsx
 * import { useEffect, useState } from 'react';
 * import { createClient } from '@supabase/supabase-js';
 * 
 * const supabase = createClient(
 *   process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
 * );
 * 
 * function useCockpitRealtime(orgId: string) {
 *   const [data, setData] = useState(null);
 * 
 *   useEffect(() => {
 *     // 초기 데이터 로드
 *     fetch(`/api/v1/cockpit?org_id=${orgId}`)
 *       .then(res => res.json())
 *       .then(d => setData(d.data));
 * 
 *     // 실시간 구독
 *     const channel = supabase
 *       .channel('cockpit-updates')
 *       .on('postgres_changes', {
 *         event: '*',
 *         schema: 'public',
 *         table: 'customer_temperatures'
 *       }, () => {
 *         // 변경 발생 시 다시 fetch
 *         fetch(`/api/v1/cockpit?org_id=${orgId}`)
 *           .then(res => res.json())
 *           .then(d => setData(d.data));
 *       })
 *       .subscribe();
 * 
 *     return () => {
 *       supabase.removeChannel(channel);
 *     };
 *   }, [orgId]);
 * 
 *   return data;
 * }
 */

export default realtime;
