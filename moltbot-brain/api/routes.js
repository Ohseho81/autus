/**
 * 🌐 MoltBot Brain - API Routes
 *
 * REST API 엔드포인트
 * Edge Functions에서 호출
 */

import { moltBotBrain } from '../index.js';
import supabaseAdapter from '../adapters/supabase-adapter.js';
import telegramAdapter from '../adapters/telegram-adapter.js';
import { constitutionAdapter } from '../adapters/constitution-adapter.js';
import { NODE_TYPES } from '../core/state-graph.js';

// ============================================
// HTTP Handler (for Vercel/Express)
// ============================================

/**
 * 메인 라우터
 */
export async function handleRequest(req) {
  const { method, path, body } = req;

  try {
    switch (path) {
      // ============================================
      // Events (Edge Functions에서 호출)
      // ============================================
      case '/api/moltbot/attendance':
        if (method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };
        return await handleAttendance(body);

      case '/api/moltbot/payment':
        if (method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };
        return await handlePayment(body);

      case '/api/moltbot/coach-clockout':
        if (method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };
        return await handleCoachClockout(body);

      // ============================================
      // Dashboard
      // ============================================
      case '/api/moltbot/dashboard':
        if (method !== 'GET') return { status: 405, body: { error: 'Method not allowed' } };
        return handleDashboard();

      case '/api/moltbot/students/at-risk':
        if (method !== 'GET') return { status: 405, body: { error: 'Method not allowed' } };
        return handleAtRiskStudents();

      // ============================================
      // Student Detail
      // ============================================
      case '/api/moltbot/student':
        if (method !== 'GET') return { status: 405, body: { error: 'Method not allowed' } };
        return handleStudentDetail(req.query?.id);

      // ============================================
      // Rules
      // ============================================
      case '/api/moltbot/rules':
        if (method === 'GET') return handleGetRules();
        if (method === 'PUT') return handleUpdateRule(body);
        return { status: 405, body: { error: 'Method not allowed' } };

      case '/api/moltbot/rules/promote':
        if (method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };
        return handlePromoteRule(body);

      // ============================================
      // Sync
      // ============================================
      case '/api/moltbot/sync':
        if (method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };
        return await handleSync();

      // ============================================
      // Constitution
      // ============================================
      case '/api/moltbot/constitution/pending':
        if (method !== 'GET') return { status: 405, body: { error: 'Method not allowed' } };
        return handlePendingChanges();

      case '/api/moltbot/constitution/verdicts':
        if (method !== 'GET') return { status: 405, body: { error: 'Method not allowed' } };
        return handleVerdicts();

      // ============================================
      // Health Check
      // ============================================
      case '/api/moltbot/health':
        return {
          status: 200,
          body: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        };

      default:
        return { status: 404, body: { error: 'Not found' } };
    }
  } catch (error) {
    console.error('[API ERROR]', error);
    return {
      status: 500,
      body: { error: error.message },
    };
  }
}

// ============================================
// Event Handlers
// ============================================

async function handleAttendance(body) {
  const result = await supabaseAdapter.handleAttendanceEvent(body);

  // 주의 필요 시 Telegram 알림
  if (result.needs_attention) {
    const student = moltBotBrain.stateGraph.getNode(NODE_TYPES.STUDENT, body.student_id);
    await telegramAdapter.notifyRiskStudent(student, '출석 문제 감지');
  }

  return {
    status: 200,
    body: result,
  };
}

async function handlePayment(body) {
  const result = await supabaseAdapter.handlePaymentEvent(body);

  if (result.needs_attention) {
    const student = moltBotBrain.stateGraph.getNode(NODE_TYPES.STUDENT, body.student_id);
    await telegramAdapter.notifyRiskStudent(student, '미수금 발생');
  }

  return {
    status: 200,
    body: result,
  };
}

async function handleCoachClockout(body) {
  const result = await supabaseAdapter.handleCoachClockOutEvent(body);
  return {
    status: 200,
    body: result,
  };
}

// ============================================
// Dashboard Handlers
// ============================================

function handleDashboard() {
  const dashboard = moltBotBrain.getDashboard();
  return {
    status: 200,
    body: dashboard,
  };
}

function handleAtRiskStudents() {
  const atRisk = moltBotBrain.stateGraph.getAtRiskStudents();
  return {
    status: 200,
    body: {
      count: atRisk.length,
      students: atRisk.map(s => ({
        id: s.entity_id,
        name: s.data?.name,
        state: s.state,
        attendance_rate: s.data?.attendance_rate,
        consecutive_absent: s.data?.consecutive_absent,
        total_outstanding: s.data?.total_outstanding,
      })),
    },
  };
}

function handleStudentDetail(studentId) {
  if (!studentId) {
    return { status: 400, body: { error: 'Student ID required' } };
  }

  const detail = moltBotBrain.getStudentDetail(studentId);
  if (!detail || !detail.context) {
    return { status: 404, body: { error: 'Student not found' } };
  }

  return {
    status: 200,
    body: detail,
  };
}

// ============================================
// Rules Handlers
// ============================================

function handleGetRules() {
  const rules = moltBotBrain.getRules();
  const stats = moltBotBrain.ruleEngine.getStats();

  return {
    status: 200,
    body: {
      rules,
      stats,
    },
  };
}

function handleUpdateRule(body) {
  const { ruleId, mode, enabled, threshold } = body;

  if (!ruleId) {
    return { status: 400, body: { error: 'Rule ID required' } };
  }

  if (mode !== undefined) {
    moltBotBrain.setRuleMode(ruleId, mode);
  }

  if (enabled !== undefined) {
    moltBotBrain.ruleEngine.setRuleEnabled(ruleId, enabled);
  }

  if (threshold !== undefined) {
    const { key, value } = threshold;
    moltBotBrain.ruleEngine.adjustThreshold(ruleId, key, value);
  }

  return {
    status: 200,
    body: { updated: true, ruleId },
  };
}

function handlePromoteRule(body) {
  const { ruleId, targetMode, metrics } = body;

  if (!ruleId || !targetMode) {
    return { status: 400, body: { error: 'ruleId and targetMode required' } };
  }

  const rule = moltBotBrain.ruleEngine.rules.find(r => r.id === ruleId);
  if (!rule) {
    return { status: 404, body: { error: 'Rule not found' } };
  }

  // 헌법 검증
  const verdict = constitutionAdapter.validateRulePromotion(
    rule,
    rule.mode,
    targetMode,
    metrics || {}
  );

  if (!verdict.approved) {
    return {
      status: 403,
      body: {
        error: 'Constitution violation',
        verdict,
      },
    };
  }

  // 승인됨 - 모드 변경
  moltBotBrain.setRuleMode(ruleId, targetMode);

  return {
    status: 200,
    body: {
      promoted: true,
      ruleId,
      newMode: targetMode,
      verdict,
    },
  };
}

// ============================================
// Sync Handler
// ============================================

async function handleSync() {
  const result = await supabaseAdapter.syncAll();
  return {
    status: 200,
    body: result,
  };
}

// ============================================
// Constitution Handlers
// ============================================

function handlePendingChanges() {
  const pending = constitutionAdapter.getPendingChanges();
  return {
    status: 200,
    body: pending,
  };
}

function handleVerdicts() {
  const verdicts = constitutionAdapter.getVerdicts(20);
  return {
    status: 200,
    body: verdicts,
  };
}

// ============================================
// Express.js 미들웨어 (옵션)
// ============================================
export function createExpressRouter(express) {
  const router = express.Router();

  router.use(express.json());

  router.all('*', async (req, res) => {
    const result = await handleRequest({
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
    });

    res.status(result.status).json(result.body);
  });

  return router;
}

// ============================================
// Vercel Serverless Handler
// ============================================
export async function vercelHandler(req, res) {
  const { method } = req;
  const path = '/api/moltbot' + req.url.replace(/^\/api\/moltbot/, '');

  const result = await handleRequest({
    method,
    path,
    body: req.body,
    query: req.query,
  });

  res.status(result.status).json(result.body);
}

export default {
  handleRequest,
  createExpressRouter,
  vercelHandler,
};
