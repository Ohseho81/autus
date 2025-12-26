/**
 * AUTUS Central Loop v2.0
 * Semantic Neutrality Compliant
 * 
 * Rules:
 * - No node-to-node connections (Goal-centric only)
 * - Neutral colors only
 * - No semantic interpretation
 * - Pure physical state display
 */

class CentralLoop {
  constructor(canvas, options = {}) {
    this.canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    if (!this.canvas) {
      console.warn('[CentralLoop] Canvas not found');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width || 400;
    this.height = this.canvas.height || 400;
    this.origin = { x: this.width / 2, y: this.height / 2 };
    
    // Options
    this.options = {
      nodeCount: options.nodeCount || 8,
      baseRadius: options.baseRadius || 120,
      ...options
    };
    
    // 8 observation nodes - pure physical entities
    this.nodes = Array.from({ length: this.options.nodeCount }, (_, i) => ({
      id: i,
      angle: (i * Math.PI * 2) / this.options.nodeCount,
      r: this.options.baseRadius,
      targetR: this.options.baseRadius,
      mass: 1 + Math.random(),   // 1.0 - 2.0
      flow: 0,                   // current flow toward origin
    }));

    // Pure physical state - no semantic meaning
    this.state = {
      delta: 0.68,      // ΔGoal: normalized distance to goal
      mu: 0.23,         // friction coefficient
      rho: 0.81,        // momentum
      sigma: 0.12,      // variance
    };

    // Motion particles moving toward origin
    this.motions = this.nodes.map((_, i) => ({
      angle: (i * Math.PI * 2) / this.options.nodeCount + 0.2,
      progress: Math.random(),
      intensity: 0.5 + Math.random() * 0.5,
    }));

    // Neutral color palette
    this.colors = {
      primary: 'rgba(180, 180, 170, 0.9)',
      secondary: 'rgba(180, 180, 170, 0.5)',
      dim: 'rgba(180, 180, 170, 0.2)',
      faint: 'rgba(180, 180, 170, 0.08)',
    };
    
    // Callbacks
    this.onStateChange = null;
    this.onVectorApplied = null;
    
    // Animation
    this.running = false;
    this.animationId = null;
  }

  update(dt = 16) {
    const { state, nodes, motions } = this;
    
    // Scale factor based on canvas size
    const scale = Math.min(this.width, this.height) / 400;
    
    // Update nodes based on pure physics
    nodes.forEach((node, i) => {
      // Orbital distance responds to delta
      node.targetR = (50 + (1 - state.delta) * 50) * scale;
      
      // Smooth interpolation with friction
      node.r += (node.targetR - node.r) * (1 - state.mu) * 0.1;
      
      // Rotation based on momentum
      node.angle += state.rho * 0.01;
      
      // Flow calculation (toward origin)
      node.flow = (node.targetR - node.r) * node.mass;
    });

    // Update motion particles - always toward origin
    motions.forEach(m => {
      m.progress += 0.005 * m.intensity * state.rho;
      if (m.progress >= 1) {
        m.progress = 0;
        m.angle += 0.3; // slight angle shift on reset
      }
    });
  }

  draw() {
    const { ctx, origin, nodes, motions, colors, state, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(width, height) / 400;

    // Background grid
    this.drawGrid();

    // Orbital reference rings (measurement only)
    [40, 65, 90].map(r => r * scale).forEach(r => {
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = colors.faint;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Motion trails toward origin (NOT node-to-node)
    motions.forEach(m => {
      const startR = 100 * scale;
      const currentR = startR * (1 - m.progress);
      const endX = origin.x + Math.cos(m.angle) * currentR;
      const endY = origin.y + Math.sin(m.angle) * currentR;
      const startX = origin.x + Math.cos(m.angle) * startR;
      const startY = origin.y + Math.sin(m.angle) * startR;

      // Gradient trail
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, 'rgba(180, 180, 170, 0)');
      gradient.addColorStop(1, `rgba(180, 180, 170, ${0.2 + m.progress * 0.3})`);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Motion particle
      const size = (2 + m.intensity * 3) * scale * 0.8;
      ctx.beginPath();
      ctx.arc(endX, endY, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 180, 170, ${0.3 + m.progress * 0.5})`;
      ctx.fill();
    });

    // Nodes - size = mass, no labels, no connections
    nodes.forEach(node => {
      const x = origin.x + Math.cos(node.angle) * node.r;
      const y = origin.y + Math.sin(node.angle) * node.r;
      const size = (2 + node.mass * 2) * scale;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = colors.primary;
      ctx.fill();
    });

    // Origin marker (Goal reference point)
    this.drawOrigin(scale);

    // State readout (if canvas is large enough)
    if (width >= 200) {
      this.drawStateReadout(scale);
    }
  }

  drawGrid() {
    const { ctx, width, height, colors } = this;
    const gridSize = 32;

    ctx.strokeStyle = colors.faint;
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  drawOrigin(scale = 1) {
    const { ctx, origin, colors } = this;

    // Crosshair
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1;
    
    const offset = 8 * scale;
    [-1, 1].forEach(dir => {
      ctx.beginPath();
      ctx.moveTo(origin.x + offset * dir, origin.y);
      ctx.lineTo(origin.x + offset * 0.5 * dir, origin.y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y + offset * dir);
      ctx.lineTo(origin.x, origin.y + offset * 0.5 * dir);
      ctx.stroke();
    });

    // Center ring
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 8 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2 * scale, 0, Math.PI * 2);
    ctx.fillStyle = colors.primary;
    ctx.fill();

    // Label
    ctx.font = `${8 * scale}px monospace`;
    ctx.fillStyle = colors.secondary;
    ctx.textAlign = 'center';
    ctx.fillText('ORIGIN', origin.x, origin.y + 20 * scale);
  }

  drawStateReadout(scale = 1) {
    const { ctx, state, colors, width, height } = this;
    const x = 12 * scale;
    let y = 18 * scale;
    const lineHeight = 14 * scale;

    ctx.font = `${9 * scale}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.secondary;

    const readings = [
      `Δ  ${state.delta.toFixed(2)}`,
      `μ  ${state.mu.toFixed(2)}`,
      `ρ  ${state.rho.toFixed(2)}`,
    ];

    readings.forEach(text => {
      ctx.fillText(text, x, y);
      y += lineHeight;
    });

    // State equation at bottom
    ctx.font = `${7 * scale}px monospace`;
    ctx.fillStyle = colors.dim;
    ctx.fillText('S(t+1) = S(t) + ρ·Δv − μ·|v|', x, height - 10 * scale);
  }

  // Vector input - pure physics, no semantic meaning
  applyVector(deltaV) {
    const { state } = this;
    
    // S(t+1) = S(t) + ρ·Δv − μ·|v|
    state.rho = Math.max(0, Math.min(1, state.rho + deltaV * 0.1));
    state.delta = Math.max(0, Math.min(1, state.delta - state.rho * 0.01 + state.mu * 0.005));
    
    if (this.onVectorApplied) {
      this.onVectorApplied(deltaV, { ...state });
    }
  }

  // Set state directly (for external integration)
  setState(newState) {
    Object.assign(this.state, newState);
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  // Flow readout - pure number
  getFlowRate() {
    return this.nodes.reduce((sum, n) => sum + Math.abs(n.flow), 0) / this.nodes.length;
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Animation control
  start() {
    if (this.running) return;
    this.running = true;
    this.render();
  }

  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  render() {
    if (!this.running) return;
    
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.render());
  }

  // Resize handler
  resize(width, height) {
    this.width = this.canvas.width = width;
    this.height = this.canvas.height = height;
    this.origin = { x: width / 2, y: height / 2 };
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CentralLoop;
}

// Global export
window.CentralLoop = CentralLoop;
