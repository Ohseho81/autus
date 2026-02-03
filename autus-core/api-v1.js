/**
 * AUTUS Core API v1 (LOCKED)
 *
 * 원칙:
 * - 수정/삭제 없음 (Append Only)
 * - 설명/메모 필드 없음
 * - Idempotency 필수
 *
 * AUTUS는 절대 전면에 노출되지 않는다.
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Supabase 클라이언트
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================
// Middleware: Idempotency
// ============================================
const idempotencyCache = new Map();

function checkIdempotency(req, res, next) {
  const idempotencyKey = req.headers['x-idempotency-key'];
  if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
    return res.json(idempotencyCache.get(idempotencyKey));
  }
  req.idempotencyKey = idempotencyKey;
  next();
}

function cacheResponse(key, response) {
  if (key) {
    idempotencyCache.set(key, response);
    // 24시간 후 삭제
    setTimeout(() => idempotencyCache.delete(key), 24 * 60 * 60 * 1000);
  }
}

// ============================================
// POST /payments - 결제 Fact 기록
// ============================================
router.post('/payments', checkIdempotency, async (req, res) => {
  try {
    const { brand, external_id, member_id, amount, status, payment_method, occurred_at } = req.body;

    // 필수 필드 검증
    if (!brand || !member_id || amount === undefined || !status) {
      return res.status(400).json({ error: 'Missing required fields: brand, member_id, amount, status' });
    }

    // Append Only - INSERT만
    const { data, error } = await supabase
      .from('autus_fact_payments')
      .insert({
        brand,
        external_id,
        member_id,
        amount,
        status,
        payment_method,
        occurred_at: occurred_at || new Date().toISOString(),
        source: 'api'
      })
      .select()
      .single();

    if (error) throw error;

    const response = { success: true, data };
    cacheResponse(req.idempotencyKey, response);
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// POST /visits - 출석/방문 Fact 기록
// POST /attendance/scan - 별칭
// ============================================
async function recordVisit(req, res) {
  try {
    const { brand, external_id, member_id, location_id, class_id, status, check_in_method, occurred_at } = req.body;

    if (!brand || !member_id || !status) {
      return res.status(400).json({ error: 'Missing required fields: brand, member_id, status' });
    }

    const { data, error } = await supabase
      .from('autus_fact_visits')
      .insert({
        brand,
        external_id,
        member_id,
        location_id,
        class_id,
        status,
        check_in_method: check_in_method || 'manual',
        occurred_at: occurred_at || new Date().toISOString(),
        source: 'api'
      })
      .select()
      .single();

    if (error) throw error;

    const response = { success: true, data };
    cacheResponse(req.idempotencyKey, response);
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/visits', checkIdempotency, recordVisit);
router.post('/attendance/scan', checkIdempotency, recordVisit);

// ============================================
// POST /classes/event - 수업 이벤트 기록
// ============================================
router.post('/classes/event', checkIdempotency, async (req, res) => {
  try {
    const { brand, external_id, class_id, instructor_id, status, occurred_at } = req.body;

    if (!brand || !class_id || !status) {
      return res.status(400).json({ error: 'Missing required fields: brand, class_id, status' });
    }

    const { data, error } = await supabase
      .from('autus_fact_sessions')
      .insert({
        brand,
        external_id,
        class_id,
        instructor_id,
        status,
        occurred_at: occurred_at || new Date().toISOString(),
        source: 'api'
      })
      .select()
      .single();

    if (error) throw error;

    const response = { success: true, data };
    cacheResponse(req.idempotencyKey, response);
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// POST /interventions - 사람 개입 기록
// ============================================
router.post('/interventions', checkIdempotency, async (req, res) => {
  try {
    const { brand, actor_id, actor_role, action_type, target_type, target_id, context, occurred_at } = req.body;

    if (!brand || !actor_id || !actor_role || !action_type || !target_type || !target_id) {
      return res.status(400).json({
        error: 'Missing required fields: brand, actor_id, actor_role, action_type, target_type, target_id'
      });
    }

    const { data, error } = await supabase
      .from('autus_interventions')
      .insert({
        brand,
        actor_id,
        actor_role,
        action_type,
        target_type,
        target_id,
        context: context || {},
        occurred_at: occurred_at || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    const response = { success: true, data };
    cacheResponse(req.idempotencyKey, response);
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// POST /actions - 액션 실행 (Shadow/Auto)
// ============================================
router.post('/actions', checkIdempotency, async (req, res) => {
  try {
    const { brand, rule_id, action_type, target_type, target_id, mode, context } = req.body;

    if (!brand || !action_type || !target_type || !target_id) {
      return res.status(400).json({
        error: 'Missing required fields: brand, action_type, target_type, target_id'
      });
    }

    // mode가 'auto'면 실제 실행, 'shadow'면 기록만
    const execution_mode = mode || 'shadow';

    // Action 로그 기록
    const { data: actionLog, error: logError } = await supabase
      .from('autus_action_logs')
      .insert({
        brand,
        rule_id,
        action_type,
        target_type,
        target_id,
        mode: execution_mode,
        context: context || {},
        executed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      // 테이블이 없으면 무시 (Optional)
      console.warn('Action log failed:', logError.message);
    }

    // Auto 모드면 실제 액션 실행
    let execution_result = null;
    if (execution_mode === 'auto') {
      execution_result = await executeAction(brand, action_type, target_type, target_id, context);
    }

    const response = {
      success: true,
      mode: execution_mode,
      action_type,
      target: { type: target_type, id: target_id },
      executed: execution_mode === 'auto',
      result: execution_result
    };

    cacheResponse(req.idempotencyKey, response);
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 액션 실행 함수
async function executeAction(brand, action_type, target_type, target_id, context) {
  // TODO: 실제 액션 실행 로직
  // 예: 메시지 발송, 알림 등
  return { status: 'executed', timestamp: new Date().toISOString() };
}

// ============================================
// POST /approval-cards - 승인 카드 생성
// ============================================
router.post('/approval-cards', checkIdempotency, async (req, res) => {
  try {
    const { brand, requested_by, request_type, target_type, target_id, context, expires_in_hours } = req.body;

    if (!brand || !requested_by || !request_type || !target_type || !target_id) {
      return res.status(400).json({
        error: 'Missing required fields: brand, requested_by, request_type, target_type, target_id'
      });
    }

    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + (expires_in_hours || 24));

    const { data, error } = await supabase
      .from('autus_approval_cards')
      .insert({
        brand,
        requested_by,
        request_type,
        target_type,
        target_id,
        context: context || {},
        status: 'pending',
        expires_at: expires_at.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    const response = { success: true, data };
    cacheResponse(req.idempotencyKey, response);
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// POST /approval-cards/:id/decision - 승인/거절
// ============================================
router.post('/approval-cards/:id/decision', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, decided_by } = req.body;

    if (!decision || !decided_by) {
      return res.status(400).json({ error: 'Missing required fields: decision, decided_by' });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "approved" or "rejected"' });
    }

    // 현재 상태 확인
    const { data: card, error: fetchError } = await supabase
      .from('autus_approval_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !card) {
      return res.status(404).json({ error: 'Approval card not found' });
    }

    if (card.status !== 'pending') {
      return res.status(400).json({ error: `Card already ${card.status}` });
    }

    if (new Date(card.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Card has expired' });
    }

    // 결정 기록 (UPDATE 허용 - 상태 변경만)
    const { data, error } = await supabase
      .from('autus_approval_cards')
      .update({
        status: decision,
        decided_by,
        decided_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Intervention으로도 기록
    await supabase
      .from('autus_interventions')
      .insert({
        brand: card.brand,
        actor_id: decided_by,
        actor_role: 'approver',
        action_type: decision === 'approved' ? `${card.request_type}_approved` : `${card.request_type}_rejected`,
        target_type: card.target_type,
        target_id: card.target_id,
        context: { approval_card_id: id, original_context: card.context }
      });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET /members/:id/state - 회원 상태 조회
// GET /students/:id/state - 별칭
// ============================================
async function getMemberState(req, res) {
  try {
    const { id } = req.params;
    const { brand } = req.query;

    if (!brand) {
      return res.status(400).json({ error: 'Missing required query: brand' });
    }

    const { data, error } = await supabase
      .from('autus_member_state')
      .select('*')
      .eq('member_id', id)
      .eq('brand', brand)
      .single();

    if (error) {
      // 뷰가 없으면 직접 계산
      return res.json({
        member_id: id,
        brand,
        risk_level: 'unknown',
        message: 'State view not available, using fallback'
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.get('/members/:id/state', getMemberState);
router.get('/students/:id/state', getMemberState);

// ============================================
// GET /rules - 규칙 목록
// ============================================
router.get('/rules', async (req, res) => {
  try {
    const { brand, mode } = req.query;

    let query = supabase.from('autus_rules').select('*');

    if (brand) query = query.eq('brand', brand);
    if (mode) query = query.eq('mode', mode);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// Health Check
// ============================================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v1',
    timestamp: new Date().toISOString(),
    principle: 'Append Only, No Edit/Delete'
  });
});

export default router;

/**
 * API v1 Summary (LOCKED)
 *
 * POST /payments              - 결제 Fact
 * POST /visits                - 방문 Fact
 * POST /attendance/scan       - 출석 Fact (별칭)
 * POST /classes/event         - 수업 이벤트
 * POST /interventions         - 사람 개입
 * POST /actions               - Shadow/Auto 액션
 * POST /approval-cards        - 승인 카드 생성
 * POST /approval-cards/:id/decision - 승인/거절
 * GET  /members/:id/state     - 회원 상태
 * GET  /students/:id/state    - 학생 상태 (별칭)
 * GET  /rules                 - 규칙 목록
 * GET  /health                - 헬스체크
 */
