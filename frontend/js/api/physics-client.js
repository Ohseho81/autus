/**
 * AUTUS Physics API Client
 * Semantic Neutrality Compliant
 */

class PhysicsAPIClient {
  constructor(baseUrl = 'http://localhost:8000/v1') {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace('http', 'ws');
  }

  // ============================================
  // State
  // ============================================

  async getState() {
    const response = await fetch(`${this.baseUrl}/state`);
    return response.json();
  }

  async applyVector(deltaV) {
    const response = await fetch(`${this.baseUrl}/state/vector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta_v: deltaV }),
    });
    return response.json();
  }

  async getEquation() {
    const response = await fetch(`${this.baseUrl}/physics/equation`);
    return response.json();
  }

  // ============================================
  // Nodes
  // ============================================

  async listNodes(params = {}) {
    const query = new URLSearchParams();
    if (params.level) query.set('level', params.level);
    if (params.r_min) query.set('r_min', params.r_min);
    if (params.r_max) query.set('r_max', params.r_max);
    
    const url = `${this.baseUrl}/nodes${query.toString() ? '?' + query : ''}`;
    const response = await fetch(url);
    return response.json();
  }

  async getNode(id) {
    const response = await fetch(`${this.baseUrl}/nodes/${id}`);
    if (!response.ok) throw new Error('Node not found');
    return response.json();
  }

  async createNode(data) {
    const response = await fetch(`${this.baseUrl}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updateNode(id, data) {
    const response = await fetch(`${this.baseUrl}/nodes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteNode(id) {
    await fetch(`${this.baseUrl}/nodes/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // Motions
  // ============================================

  async listMotions() {
    const response = await fetch(`${this.baseUrl}/motions`);
    return response.json();
  }

  streamMotions(onMessage) {
    const ws = new WebSocket(`${this.wsUrl}/motions/stream`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    ws.onerror = (error) => {
      console.error('[PhysicsAPI] WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('[PhysicsAPI] WebSocket closed');
    };
    
    return ws;
  }

  // ============================================
  // Goal
  // ============================================

  async getGoal() {
    const response = await fetch(`${this.baseUrl}/goal`);
    if (!response.ok) throw new Error('No goal set');
    return response.json();
  }

  async setGoal(anchor) {
    const response = await fetch(`${this.baseUrl}/goal`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anchor }),
    });
    return response.json();
  }
}

// ============================================
// Constants
// ============================================

const PROXIMITY_LEVELS = {
  L1: { max: 80, label: 'L1' },
  L2: { max: 140, label: 'L2' },
  L3: { max: 200, label: 'L3' },
};

const STATE_EQUATION = 'S(t+1) = S(t) + ρ·Δv − μ·|v|';

// ============================================
// Helper Functions
// ============================================

function calculateLevel(r) {
  if (r < PROXIMITY_LEVELS.L1.max) return 1;
  if (r < PROXIMITY_LEVELS.L2.max) return 2;
  return 3;
}

function getNodePosition(node) {
  return {
    x: Math.cos(node.theta) * node.r,
    y: Math.sin(node.theta) * node.r,
  };
}

function getMotionPosition(motion) {
  const currentR = motion.start_r * (1 - motion.progress);
  return {
    x: Math.cos(motion.angle) * currentR,
    y: Math.sin(motion.angle) * currentR,
  };
}

// Export
window.PhysicsAPIClient = PhysicsAPIClient;
window.PROXIMITY_LEVELS = PROXIMITY_LEVELS;
window.STATE_EQUATION = STATE_EQUATION;
window.calculateLevel = calculateLevel;
window.getNodePosition = getNodePosition;
window.getMotionPosition = getMotionPosition;

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PhysicsAPIClient,
    PROXIMITY_LEVELS,
    STATE_EQUATION,
    calculateLevel,
    getNodePosition,
    getMotionPosition,
  };
}
