/**
 * 🌐 MoltBot Brain - Express Server
 *
 * REST API 서버
 */

import 'dotenv/config';
import express from 'express';
import { handleRequest } from './api/routes.js';
import supabaseAdapter from './adapters/supabase-adapter.js';
import { moltBotBrain } from './index.js';
import { setupWorkflowRoutes } from './adapters/workflow-adapter.js';

const app = express();
const PORT = process.env.PORT || 3030;

// ============================================
// Middleware
// ============================================
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================
// Routes
// ============================================
app.all('/api/moltbot/*', async (req, res) => {
  const path = '/api/moltbot' + req.url.replace(/^\/api\/moltbot/, '').split('?')[0];

  const result = await handleRequest({
    method: req.method,
    path,
    body: req.body,
    query: req.query,
  });

  res.status(result.status).json(result.body);
});

// ============================================
// Workflow Routes (9단계)
// ============================================
setupWorkflowRoutes(app);

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'MoltBot Brain API',
    version: '2.0.0',
    endpoints: {
      moltbot: [
        'GET  /api/moltbot/health',
        'GET  /api/moltbot/dashboard',
        'GET  /api/moltbot/students/at-risk',
        'GET  /api/moltbot/student?id=xxx',
        'GET  /api/moltbot/rules',
        'PUT  /api/moltbot/rules',
        'POST /api/moltbot/rules/promote',
        'POST /api/moltbot/attendance',
        'POST /api/moltbot/payment',
        'POST /api/moltbot/coach-clockout',
        'POST /api/moltbot/sync',
        'GET  /api/moltbot/constitution/pending',
        'GET  /api/moltbot/constitution/verdicts',
      ],
      workflow: [
        'GET  /api/workflow/phases',
        'GET  /api/workflow/templates',
        'GET  /api/workflow/missions',
        'GET  /api/workflow/mission/:id',
        'POST /api/workflow/mission',
        'POST /api/workflow/mission/:id/advance',
      ],
    },
  });
});

// ============================================
// Startup
// ============================================
async function start() {
  console.log(`
╔═══════════════════════════════════════════╗
║        🧠 MoltBot Brain Server            ║
╠═══════════════════════════════════════════╣
║  Port: ${PORT}                              ║
║  Mode: ${process.env.NODE_ENV || 'development'}                      ║
╚═══════════════════════════════════════════╝
  `);

  // 초기 데이터 동기화 시도
  if (process.env.SUPABASE_URL) {
    console.log('📦 Syncing with Supabase...');
    try {
      const syncResult = await supabaseAdapter.syncAll();
      console.log(`✅ Synced: ${syncResult.students} students, ${syncResult.classes} classes`);
    } catch (error) {
      console.log('⚠️ Supabase sync skipped:', error.message);
    }
  }

  // 서버 시작
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/moltbot/dashboard`);
    console.log('');
  });
}

start();
