/**
 * AUTUS Supabase Client - autus-ai.com 전체 페이지 공유 레이어
 *
 * 사용법: 모든 HTML에 아래 두 줄 추가
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * <script src="/js/supabase-client.js"></script>
 *
 * 이후 window.AutusDB 로 접근
 */
(function(global) {
  'use strict';

  const SUPABASE_URL = 'https://pphzvnaedmzcvpxjulti.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHp2bmFlZG16Y3ZweGp1bHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTI0NjUsImV4cCI6MjA4NDMyODQ2NX0.kj7hRwujBXRmEwA4B9C8Hml9bbBkEQfGaZ3XYi-GnqQ';

  let _client = null;
  let _channels = [];
  let _connected = false;

  // ═══════════════════════════════════════════════
  // 1. 초기화
  // ═══════════════════════════════════════════════

  function getClient() {
    if (_client) return _client;
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.warn('[AutusDB] Supabase SDK not loaded, fallback mode');
      return null;
    }
    try {
      _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: { params: { eventsPerSecond: 10 } }
      });
      _connected = true;
      console.log('[AutusDB] Connected to Supabase');
    } catch (e) {
      console.error('[AutusDB] Init failed:', e);
    }
    return _client;
  }

  function isConnected() { return _connected && _client !== null; }

  // ═══════════════════════════════════════════════
  // 2. 범용 쿼리
  // ═══════════════════════════════════════════════

  async function query(table, opts) {
    var c = getClient();
    if (!c) return { data: null, error: 'not_connected' };
    try {
      var q = c.from(table).select(opts.select || '*');
      if (opts.filters) {
        Object.keys(opts.filters).forEach(function(k) {
          q = q.eq(k, opts.filters[k]);
        });
      }
      if (opts.order) {
        q = q.order(opts.order.column, { ascending: opts.order.ascending !== false });
      }
      if (opts.limit) q = q.limit(opts.limit);
      if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit || 100) - 1);
      if (opts.gte) {
        Object.keys(opts.gte).forEach(function(k) { q = q.gte(k, opts.gte[k]); });
      }
      if (opts.lte) {
        Object.keys(opts.lte).forEach(function(k) { q = q.lte(k, opts.lte[k]); });
      }
      if (opts.ilike) {
        Object.keys(opts.ilike).forEach(function(k) { q = q.ilike(k, opts.ilike[k]); });
      }
      if (opts.head) q = q.select(opts.select || '*', { count: 'exact', head: true });
      return await q;
    } catch (e) {
      console.error('[AutusDB] query error:', table, e);
      return { data: null, error: e.message };
    }
  }

  async function queryCount(table, filters) {
    var c = getClient();
    if (!c) return 0;
    try {
      var q = c.from(table).select('*', { count: 'exact', head: true });
      if (filters) {
        Object.keys(filters).forEach(function(k) { q = q.eq(k, filters[k]); });
      }
      var result = await q;
      return result.count || 0;
    } catch (e) {
      return 0;
    }
  }

  async function insert(table, row) {
    var c = getClient();
    if (!c) return { data: null, error: 'not_connected' };
    try {
      return await c.from(table).insert(row).select();
    } catch (e) {
      console.error('[AutusDB] insert error:', table, e);
      return { data: null, error: e.message };
    }
  }

  async function upsert(table, row, onConflict) {
    var c = getClient();
    if (!c) return { data: null, error: 'not_connected' };
    try {
      var q = c.from(table).upsert(row);
      if (onConflict) q = q.onConflict(onConflict);
      return await q.select();
    } catch (e) {
      return { data: null, error: e.message };
    }
  }

  async function rpc(fnName, params) {
    var c = getClient();
    if (!c) return { data: null, error: 'not_connected' };
    try {
      return await c.rpc(fnName, params || {});
    } catch (e) {
      console.error('[AutusDB] rpc error:', fnName, e);
      return { data: null, error: e.message };
    }
  }

  async function invokeEdge(name, body) {
    var c = getClient();
    if (!c) return { data: null, error: 'not_connected' };
    try {
      var result = await c.functions.invoke(name, { body: body || {} });
      return result;
    } catch (e) {
      console.error('[AutusDB] edge error:', name, e);
      return { data: null, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════
  // 3. Realtime 구독
  // ═══════════════════════════════════════════════

  function subscribe(table, event, callback, filter) {
    var c = getClient();
    if (!c) return null;
    var channelName = 'autus-' + table + '-' + event + '-' + Date.now();
    var config = {
      event: event === '*' ? '*' : event,
      schema: 'public',
      table: table
    };
    if (filter) config.filter = filter;
    var channel = c.channel(channelName)
      .on('postgres_changes', config, function(payload) {
        try { callback(payload); } catch (e) { console.error('[AutusDB] subscription callback error:', e); }
      })
      .subscribe();
    _channels.push(channel);
    return channel;
  }

  function unsubscribeAll() {
    var c = getClient();
    if (!c) return;
    _channels.forEach(function(ch) {
      try { c.removeChannel(ch); } catch (e) {}
    });
    _channels = [];
  }

  // 페이지 이탈 시 자동 정리
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', unsubscribeAll);
  }

  // ═══════════════════════════════════════════════
  // 4. 학생 (atb_students - 786 rows)
  // ═══════════════════════════════════════════════

  async function getStudents(opts) {
    opts = opts || {};
    return await query('atb_students', {
      select: opts.select || '*',
      order: opts.order || { column: 'created_at', ascending: false },
      limit: opts.limit || 100,
      offset: opts.offset || 0,
      filters: opts.filters,
      ilike: opts.search ? { name: '%' + opts.search + '%' } : undefined
    });
  }

  async function getStudentCount() {
    return await queryCount('atb_students');
  }

  async function getStudentById(id) {
    var c = getClient();
    if (!c) return { data: null };
    return await c.from('atb_students').select('*').eq('id', id).single();
  }

  // ═══════════════════════════════════════════════
  // 5. 이벤트 원장 (events - 1005 rows)
  // ═══════════════════════════════════════════════

  async function getEvents(opts) {
    opts = opts || {};
    return await query('events', {
      select: opts.select || '*',
      order: opts.order || { column: 'occurred_at', ascending: false },
      limit: opts.limit || 50,
      offset: opts.offset || 0,
      filters: opts.filters,
      gte: opts.gte,
      lte: opts.lte
    });
  }

  async function getEventCount(filters) {
    return await queryCount('events', filters);
  }

  async function recordEvent(eventData) {
    var row = {
      event_type: eventData.event_type,
      event_category: eventData.event_category || 'general',
      entity_id: eventData.entity_id || 'system',
      entity_type: eventData.entity_type || 'system',
      state_from: eventData.state_from || null,
      state_to: eventData.state_to || null,
      payload: eventData.payload || {},
      idempotency_key: eventData.idempotency_key || ('WEB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6)),
      actor_type: eventData.actor_type || 'user',
      source: eventData.source || 'web_dashboard',
      occurred_at: eventData.occurred_at || new Date().toISOString()
    };
    return await insert('events', row);
  }

  // ═══════════════════════════════════════════════
  // 6. V-Engine 메트릭 (v_engine_metrics - 1 row)
  // ═══════════════════════════════════════════════

  async function getVMetrics() {
    var result = await query('v_engine_metrics', { limit: 1, order: { column: 'recorded_at', ascending: false } });
    return (result.data && result.data[0]) || null;
  }

  // ═══════════════════════════════════════════════
  // 7. AUTUS 노드 & 관계 (5 nodes, 3 relationships)
  // ═══════════════════════════════════════════════

  async function getNodes() {
    return await query('autus_nodes', { order: { column: 'lambda', ascending: false } });
  }

  async function getRelationships() {
    return await query('autus_relationships', { order: { column: 'sigma', ascending: false } });
  }

  // ═══════════════════════════════════════════════
  // 8. 감사 로그 (audit_logs - 781 rows)
  // ═══════════════════════════════════════════════

  async function getAuditLogs(opts) {
    opts = opts || {};
    return await query('audit_logs', {
      select: opts.select || '*',
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 20,
      offset: opts.offset || 0,
      filters: opts.filters
    });
  }

  // ═══════════════════════════════════════════════
  // 9. 사용 로그 / 합의 (usage_logs - 5 rows)
  // ═══════════════════════════════════════════════

  async function getUsageLogs(opts) {
    opts = opts || {};
    return await query('usage_logs', {
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 50,
      filters: opts.filters
    });
  }

  async function recordUsageLog(log) {
    return await insert('usage_logs', {
      task_id: log.task_id,
      solution_id: log.solution_id,
      user_id: log.user_id || null,
      before_m: log.before_m || 0,
      before_t: log.before_t || 0,
      before_s: log.before_s || 0,
      after_m: log.after_m || 0,
      after_t: log.after_t || 0,
      after_s: log.after_s || 0,
      effectiveness_score: log.effectiveness_score || 0,
      v_growth: log.v_growth || 0,
      duration_minutes: log.duration_minutes || 0
    });
  }

  // ═══════════════════════════════════════════════
  // 10. 자동화 (automation_logs/rules)
  // ═══════════════════════════════════════════════

  async function getAutomationLogs(opts) {
    opts = opts || {};
    return await query('automation_logs', {
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 50,
      filters: opts.filters
    });
  }

  async function getAutomationRules() {
    return await query('automation_rules', { order: { column: 'created_at', ascending: false } });
  }

  // ═══════════════════════════════════════════════
  // 11. 조직 & 사용자
  // ═══════════════════════════════════════════════

  async function getOrganization() {
    var result = await query('organizations', { limit: 1 });
    return (result.data && result.data[0]) || null;
  }

  async function getOrg() {
    var result = await query('orgs', { limit: 1 });
    return (result.data && result.data[0]) || null;
  }

  // ═══════════════════════════════════════════════
  // 12. HUD 상태 & K값 스냅샷
  // ═══════════════════════════════════════════════

  async function getHudState() {
    var result = await query('hud_state', { limit: 1 });
    return (result.data && result.data[0]) || null;
  }

  async function getKValueSnapshot() {
    var result = await query('k_value_snapshots', { limit: 1, order: { column: 'created_at', ascending: false } });
    return (result.data && result.data[0]) || null;
  }

  // ═══════════════════════════════════════════════
  // 13. 온리쌤 (onlyssem) 데이터
  // ═══════════════════════════════════════════════

  async function getOnlyssemStudents() {
    return await query('onlyssem_students', { order: { column: 'created_at', ascending: false } });
  }

  async function getOnlyssemAttendance(opts) {
    opts = opts || {};
    return await query('onlyssem_attendance', {
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 50,
      filters: opts.filters
    });
  }

  async function getOnlyssemInvoices(opts) {
    opts = opts || {};
    return await query('onlyssem_invoices', {
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 50
    });
  }

  async function getOnlyssemEvaluations() {
    return await query('onlyssem_evaluations', { order: { column: 'created_at', ascending: false } });
  }

  // ═══════════════════════════════════════════════
  // 14. Decision Log
  // ═══════════════════════════════════════════════

  async function getDecisionLog(opts) {
    opts = opts || {};
    return await query('decision_log', {
      order: { column: 'decided_at', ascending: false },
      limit: opts.limit || 20,
      filters: opts.filters
    });
  }

  // ═══════════════════════════════════════════════
  // 15. 추가 테이블들
  // ═══════════════════════════════════════════════

  async function getCoaches() {
    return await query('atb_coaches', { order: { column: 'created_at', ascending: false } });
  }

  async function getAttendance(opts) {
    opts = opts || {};
    return await query('atb_attendance', {
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 50,
      filters: opts.filters
    });
  }

  async function getPayments(opts) {
    opts = opts || {};
    return await query('payments', {
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 50,
      filters: opts.filters
    });
  }

  async function getSchedules() {
    return await query('schedules', { order: { column: 'created_at', ascending: false } });
  }

  async function getConsultations(opts) {
    opts = opts || {};
    return await query('consultations', {
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 20
    });
  }

  async function getBlueprints() {
    return await query('blueprint_registry', { order: { column: 'created_at', ascending: false } });
  }

  async function getClassLogs(opts) {
    opts = opts || {};
    return await query('class_logs', {
      order: { column: 'created_at', ascending: false },
      limit: opts.limit || 20
    });
  }

  // ═══════════════════════════════════════════════
  // 16. RPC 함수 래퍼 (22개 DB 함수)
  // ═══════════════════════════════════════════════

  async function calculateAutusA(params) { return rpc('calculate_autus_a', params); }
  async function measureSigma(params) { return rpc('measure_autus_sigma', params); }
  async function calculateChurnRisk(params) { return rpc('calculate_churn_risk', params); }
  async function recordImmortalEvent(params) { return rpc('record_immortal_event', params); }
  async function checkStandardization(params) { return rpc('check_standardization', params); }
  async function updateSolutionStats(params) { return rpc('update_solution_stats', params); }
  async function getSigmaGrade(params) { return rpc('get_autus_sigma_grade', params); }
  async function updateOrganismStatus(params) { return rpc('update_organism_status', params); }
  async function standardizeRepetition(params) { return rpc('standardize_repetition', params); }
  async function claimKakaoOutbox(params) { return rpc('claim_kakao_outbox', params); }

  // ═══════════════════════════════════════════════
  // 17. Edge Function 래퍼 (5개)
  // ═══════════════════════════════════════════════

  async function chatAI(payload) { return invokeEdge('chat-ai', payload); }
  async function sendMessage(payload) { return invokeEdge('message-sender', payload); }
  async function messageWorker(payload) { return invokeEdge('message-worker', payload); }
  async function triggerAutomation(payload) { return invokeEdge('automation-engine', payload); }
  async function kakaoWebhook(payload) { return invokeEdge('kakao-webhook-receiver', payload); }

  // ═══════════════════════════════════════════════
  // 18. 유틸리티
  // ═══════════════════════════════════════════════

  function formatDate(d) {
    if (!d) return '';
    var date = new Date(d);
    return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(d) {
    if (!d) return '';
    var now = Date.now();
    var diff = now - new Date(d).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금';
    if (mins < 60) return mins + '분 전';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + '시간 전';
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + '일 전';
    return Math.floor(days / 7) + '주 전';
  }

  // 연결 상태 표시 배지 생성
  function createStatusBadge() {
    var badge = document.createElement('div');
    badge.id = 'autus-db-status';
    badge.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:600;font-family:Inter,-apple-system,sans-serif;display:flex;align-items:center;gap:6px;transition:all 0.3s;cursor:pointer;';
    if (_connected) {
      badge.style.background = 'rgba(16,185,129,0.12)';
      badge.style.border = '1px solid rgba(16,185,129,0.3)';
      badge.style.color = '#10b981';
      badge.innerHTML = '<span style="width:6px;height:6px;background:#10b981;border-radius:50%;display:inline-block;animation:blink 1.2s ease-in-out infinite"></span>Supabase LIVE';
    } else {
      badge.style.background = 'rgba(239,68,68,0.12)';
      badge.style.border = '1px solid rgba(239,68,68,0.3)';
      badge.style.color = '#ef4444';
      badge.innerHTML = '<span style="width:6px;height:6px;background:#ef4444;border-radius:50%;display:inline-block"></span>Offline';
    }
    badge.onclick = function() {
      console.log('[AutusDB] Status:', _connected ? 'Connected' : 'Disconnected');
      console.log('[AutusDB] URL:', SUPABASE_URL);
      console.log('[AutusDB] Channels:', _channels.length);
    };
    return badge;
  }

  // 페이지 로드 시 자동 초기화 + 상태 배지
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
      getClient();
      document.body.appendChild(createStatusBadge());
    });
  }

  // ═══════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════

  global.AutusDB = {
    // Core
    getClient: getClient,
    isConnected: isConnected,
    SUPABASE_URL: SUPABASE_URL,

    // Generic
    query: query,
    queryCount: queryCount,
    insert: insert,
    upsert: upsert,
    rpc: rpc,
    invokeEdge: invokeEdge,

    // Realtime
    subscribe: subscribe,
    unsubscribeAll: unsubscribeAll,

    // Students (786)
    getStudents: getStudents,
    getStudentCount: getStudentCount,
    getStudentById: getStudentById,

    // Events (1005)
    getEvents: getEvents,
    getEventCount: getEventCount,
    recordEvent: recordEvent,

    // V-Engine
    getVMetrics: getVMetrics,

    // Nodes & Relationships
    getNodes: getNodes,
    getRelationships: getRelationships,

    // Audit (781)
    getAuditLogs: getAuditLogs,

    // Usage / Consensus
    getUsageLogs: getUsageLogs,
    recordUsageLog: recordUsageLog,

    // Automation
    getAutomationLogs: getAutomationLogs,
    getAutomationRules: getAutomationRules,

    // Organization
    getOrganization: getOrganization,
    getOrg: getOrg,

    // HUD & K-Value
    getHudState: getHudState,
    getKValueSnapshot: getKValueSnapshot,

    // Onlyssem
    getOnlyssemStudents: getOnlyssemStudents,
    getOnlyssemAttendance: getOnlyssemAttendance,
    getOnlyssemInvoices: getOnlyssemInvoices,
    getOnlyssemEvaluations: getOnlyssemEvaluations,

    // Decision Log
    getDecisionLog: getDecisionLog,

    // Additional tables
    getCoaches: getCoaches,
    getAttendance: getAttendance,
    getPayments: getPayments,
    getSchedules: getSchedules,
    getConsultations: getConsultations,
    getBlueprints: getBlueprints,
    getClassLogs: getClassLogs,

    // RPC (DB Functions)
    calculateAutusA: calculateAutusA,
    measureSigma: measureSigma,
    calculateChurnRisk: calculateChurnRisk,
    recordImmortalEvent: recordImmortalEvent,
    checkStandardization: checkStandardization,
    updateSolutionStats: updateSolutionStats,
    getSigmaGrade: getSigmaGrade,
    updateOrganismStatus: updateOrganismStatus,
    standardizeRepetition: standardizeRepetition,
    claimKakaoOutbox: claimKakaoOutbox,

    // Edge Functions
    chatAI: chatAI,
    sendMessage: sendMessage,
    messageWorker: messageWorker,
    triggerAutomation: triggerAutomation,
    kakaoWebhook: kakaoWebhook,

    // Utils
    formatDate: formatDate,
    timeAgo: timeAgo
  };

})(window);
