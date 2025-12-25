/**
 * AUTUS Backend Server
 * WebSocket Real-time + REST API + 90-Type Router
 */

const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════════
// 90-TYPE DICTIONARY
// ═══════════════════════════════════════════════════════════════════════════════

const AUTUS_90_TYPES = {
  "state.initial": { policy: "NORMAL", bucket: "state", current: 100, target: 100 },
  "state.active": { policy: "NORMAL", bucket: "state", current: 842, target: 1000 },
  "state.pending": { policy: "ALTERNATE", bucket: "state", current: 156, target: 500 },
  "state.paused": { policy: "LOOP", bucket: "state", current: 45, target: 200 },
  "state.completed": { policy: "NORMAL", bucket: "state", current: 1200, target: 1200 },
  "decision.approve": { policy: "NORMAL", bucket: "decision", current: 1842, target: 2500 },
  "decision.reject": { policy: "ALTERNATE", bucket: "decision", current: 156, target: 200 },
  "decision.route": { policy: "NORMAL", bucket: "decision", current: 890, target: 1200 },
  "signal.alert": { policy: "ALTERNATE", bucket: "signal", current: 89, target: 100 },
  "signal.info": { policy: "NORMAL", bucket: "signal", current: 1200, target: 2000 },
  "action.execute": { policy: "NORMAL", bucket: "action", current: 567, target: 800 },
  "action.queue": { policy: "LOOP", bucket: "action", current: 456, target: 600 },
  "constraint.policy": { policy: "ALTERNATE", bucket: "constraint", current: 45, target: 50 },
  "record.log": { policy: "NORMAL", bucket: "record", current: 45000, target: 50000 },
  "record.metric": { policy: "NORMAL", bucket: "record", current: 23456, target: 30000 }
};

const LAYER_TYPE_MAP = {
  'state.initial': 'L0', 'state.active': 'L2', 'state.pending': 'L5',
  'state.completed': 'L3', 'decision.approve': 'L3', 'decision.reject': 'L6',
  'decision.route': 'L3', 'signal.alert': 'L5', 'signal.info': 'L1',
  'action.execute': 'L3', 'action.queue': 'L4', 'constraint.policy': 'L6',
  'record.log': 'L0', 'record.metric': 'L2'
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

let systemState = {
  velocity: 74,
  entropy: 0.32,
  currentLayer: 'L3',
  currentType: 'decision.approve',
  ledger: []
};

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP SERVER + REST API
// ═══════════════════════════════════════════════════════════════════════════════

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // API Routes
  if (path === '/api/types' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, data: AUTUS_90_TYPES }));
  }
  else if (path === '/api/layers' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, data: LAYER_TYPE_MAP }));
  }
  else if (path === '/api/state' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, data: systemState }));
  }
  else if (path === '/api/ledger' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, data: systemState.ledger.slice(0, 50) }));
  }
  else if (path === '/api/select-type' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { type } = JSON.parse(body);
        if (AUTUS_90_TYPES[type]) {
          systemState.currentType = type;
          systemState.currentLayer = LAYER_TYPE_MAP[type] || 'L3';
          recordLedger(type);
          broadcastState();
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: systemState }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid type' }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
  }
  else if (path === '/api/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      success: true, 
      status: 'healthy',
      uptime: process.uptime(),
      clients: wss.clients.size
    }));
  }
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET SERVER
// ═══════════════════════════════════════════════════════════════════════════════

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('[WS] Client connected. Total:', wss.clients.size);

  // Send initial state
  ws.send(JSON.stringify({
    type: 'INIT',
    data: {
      state: systemState,
      types: AUTUS_90_TYPES,
      layers: LAYER_TYPE_MAP
    }
  }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      handleWSMessage(ws, msg);
    } catch (e) {
      console.error('[WS] Invalid message:', e);
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected. Total:', wss.clients.size);
  });
});

function handleWSMessage(ws, msg) {
  switch (msg.type) {
    case 'SELECT_TYPE':
      if (AUTUS_90_TYPES[msg.data]) {
        systemState.currentType = msg.data;
        systemState.currentLayer = LAYER_TYPE_MAP[msg.data] || 'L3';
        recordLedger(msg.data);
        broadcastState();
      }
      break;

    case 'SELECT_LAYER':
      if (['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(msg.data)) {
        systemState.currentLayer = msg.data;
        broadcastState();
      }
      break;

    case 'GET_STATE':
      ws.send(JSON.stringify({ type: 'STATE', data: systemState }));
      break;

    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      break;

    default:
      console.log('[WS] Unknown message type:', msg.type);
  }
}

function broadcastState() {
  const message = JSON.stringify({ type: 'STATE', data: systemState });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

function recordLedger(type) {
  const entry = {
    timestamp: new Date().toISOString(),
    type: type,
    layer: LAYER_TYPE_MAP[type] || 'L3',
    policy: AUTUS_90_TYPES[type]?.policy || 'NORMAL'
  };

  systemState.ledger.unshift(entry);
  if (systemState.ledger.length > 100) {
    systemState.ledger.pop();
  }

  // Broadcast ledger update
  const message = JSON.stringify({ type: 'LEDGER', data: entry });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

setInterval(() => {
  // Update velocity
  systemState.velocity = Math.max(0, Math.min(120, 
    systemState.velocity + (Math.random() - 0.4) * 4
  ));

  // Update entropy
  systemState.entropy = Math.max(0, Math.min(1,
    systemState.entropy + (Math.random() - 0.5) * 0.05
  ));

  // Increment type values
  Object.keys(AUTUS_90_TYPES).forEach(key => {
    const type = AUTUS_90_TYPES[key];
    if (type.current < type.target && Math.random() < 0.3) {
      type.current = Math.min(type.target, type.current + Math.floor(Math.random() * 10) + 1);
    }
  });

  // Broadcast update
  const message = JSON.stringify({
    type: 'TICK',
    data: {
      velocity: Math.round(systemState.velocity),
      entropy: systemState.entropy.toFixed(2),
      timestamp: Date.now()
    }
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}, 500);

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  AUTUS Backend Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  HTTP API:    http://localhost:${PORT}/api/`);
  console.log(`  WebSocket:   ws://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Endpoints:');
  console.log('    GET  /api/types      - All 90 types');
  console.log('    GET  /api/layers     - Layer mappings');
  console.log('    GET  /api/state      - Current state');
  console.log('    GET  /api/ledger     - Ledger entries');
  console.log('    POST /api/select-type - Select a type');
  console.log('    GET  /api/health     - Health check');
  console.log('═══════════════════════════════════════════════════════════');
});

