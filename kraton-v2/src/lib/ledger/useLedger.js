/**
 * useLedger.js
 * Immortal Ledger 훅 - Supabase 연동 버전
 * 
 * 모든 행동을 영구 기록 + 자기반복 종말 지원
 */

import { useState, useCallback } from 'react';
import { supabaseClient } from '../supabase/admin';
import { semanticHash, maskPII } from './semanticHash';
import { ACTION_TYPES, ROLES } from './types';

/**
 * useLedger - 불멸 원장 훅
 * @param {Object} options - 기본 옵션 (org_id, user_id, role)
 */
export function useLedger(options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { org_id, user_id, role } = options;

  /**
   * 이벤트 기록
   */
  const record = useCallback(async (
    action_type,
    content,
    extra = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = supabaseClient();
      if (!supabase) {
        console.warn('Supabase not available, using mock');
        return mockRecord(action_type, content, extra);
      }

      const contentRedacted = maskPII(content);
      const hash = await semanticHash(action_type, contentRedacted);

      // Supabase RPC 함수 호출
      const { data, error: rpcError } = await supabase.rpc('record_immortal_event', {
        p_org_id: org_id,
        p_user_id: user_id,
        p_role: role,
        p_action_type: action_type,
        p_semantic_hash: hash,
        p_content_redacted: contentRedacted,
        p_entity_type: extra.entity_type || null,
        p_entity_id: extra.entity_id || null,
        p_outcome_delta_v: extra.outcome_delta_v || null,
        p_meta: extra.meta || {},
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      setError(err.message);
      console.error('Ledger record error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [org_id, user_id, role]);

  /**
   * 타임라인 조회
   */
  const getTimeline = useCallback(async (limit = 50) => {
    try {
      const supabase = supabaseClient();
      if (!supabase) return getMockTimeline(limit);

      const { data, error: queryError } = await supabase
        .from('immortal_events')
        .select('*')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (queryError) throw queryError;
      return data;
    } catch (err) {
      console.error('Timeline fetch error:', err);
      return [];
    }
  }, [org_id]);

  /**
   * 반복 후보 조회
   */
  const getCandidates = useCallback(async (status = 'proposed') => {
    try {
      const supabase = supabaseClient();
      if (!supabase) return getMockCandidates(status);

      const { data, error: queryError } = await supabase
        .from('repetition_candidates')
        .select('*')
        .eq('org_id', org_id)
        .eq('status', status)
        .order('seen_count', { ascending: false });

      if (queryError) throw queryError;
      return data;
    } catch (err) {
      console.error('Candidates fetch error:', err);
      return [];
    }
  }, [org_id]);

  /**
   * 반복 패턴 표준화
   */
  const standardize = useCallback(async (candidateId, standardName) => {
    try {
      const supabase = supabaseClient();
      if (!supabase) return { success: true, mock: true };

      const { data, error: rpcError } = await supabase.rpc('standardize_repetition', {
        p_candidate_id: candidateId,
        p_standard_name: standardName,
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      console.error('Standardize error:', err);
      return null;
    }
  }, []);

  // ============================================
  // 편의 메서드 (자주 쓰는 액션들)
  // ============================================

  const riskDetected = (content, meta) =>
    record(ACTION_TYPES.RISK_DETECTED, content, { outcome_delta_v: -0.5, meta });

  const riskResolved = (content, meta) =>
    record(ACTION_TYPES.RISK_RESOLVED, content, { outcome_delta_v: 0.5, meta });

  const messageSent = (content, meta) =>
    record(ACTION_TYPES.MESSAGE_SENT, content, { outcome_delta_v: 0.1, meta });

  const cardSent = (content, meta) =>
    record(ACTION_TYPES.CARD_SENT, content, { outcome_delta_v: 0.3, meta });

  const consultationDone = (content, meta) =>
    record(ACTION_TYPES.CONSULTATION_DONE, content, { outcome_delta_v: 0.4, meta });

  const standardCreated = (content, meta) =>
    record(ACTION_TYPES.STANDARD_CREATED, content, { outcome_delta_v: 1.0, meta });

  const feedbackReceived = (content, meta) =>
    record(ACTION_TYPES.FEEDBACK_RECEIVED, content, { outcome_delta_v: 0.2, meta });

  const paymentReceived = (content, meta) =>
    record(ACTION_TYPES.PAYMENT_RECEIVED, content, { outcome_delta_v: 0.5, meta });

  return {
    // 상태
    loading,
    error,
    
    // 핵심 메서드
    record,
    getTimeline,
    getCandidates,
    standardize,
    
    // 편의 메서드
    riskDetected,
    riskResolved,
    messageSent,
    cardSent,
    consultationDone,
    standardCreated,
    feedbackReceived,
    paymentReceived,
  };
}

// ============================================
// MOCK 데이터 (Supabase 없을 때)
// ============================================

const now = Date.now();
const mockEvents = [
  {
    id: '1',
    action_type: 'risk_detected',
    content_redacted: '[이름] 학생 출석률 50% 이하',
    created_at: new Date(now - 1000 * 60 * 60).toISOString(),
    outcome_delta_v: -0.5,
    semantic_hash: 'mockhash-risk-001',
    entity_type: 'student',
  },
  {
    id: '2',
    action_type: 'message_sent',
    content_redacted: '[이름] 학부모에게 알림 발송',
    created_at: new Date(now - 1000 * 60 * 30).toISOString(),
    outcome_delta_v: 0.1,
    semantic_hash: 'mockhash-message-002',
    entity_type: 'notification',
  },
  {
    id: '3',
    action_type: 'consultation_done',
    content_redacted: '[이름] 학생 1:1 상담 완료',
    created_at: new Date(now - 1000 * 60 * 10).toISOString(),
    outcome_delta_v: 0.4,
    semantic_hash: 'mockhash-consult-003',
    entity_type: 'session',
  },
];

const mockCandidates = [
  {
    id: '1',
    semantic_hash: 'mockhash-message-002',
    seen_count: 5,
    status: 'proposed',
    first_seen_at: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
    last_seen_at: new Date(now - 1000 * 60 * 30).toISOString(),
    meta: { action_type: 'message_sent' },
  },
  {
    id: '2',
    semantic_hash: 'mockhash-risk-001',
    seen_count: 4,
    status: 'proposed',
    first_seen_at: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
    last_seen_at: new Date(now - 1000 * 60 * 10).toISOString(),
    meta: { action_type: 'risk_detected' },
  },
];

function mockRecord(action_type, content, extra) {
  console.log('[Mock] Recording:', { action_type, content, extra });
  return { event_id: `mock-${Date.now()}`, seen_count: 1, status: 'candidate' };
}

function getMockTimeline(limit) {
  return mockEvents.slice(0, limit);
}

function getMockCandidates(status) {
  return mockCandidates.filter(c => c.status === status);
}

export default useLedger;
