/**
 * AUTUS Proximity Map v1.0
 * Semantic Neutrality Compliant
 * 
 * Node = 사람/기업/국가 (no labels, size = mass)
 * Motion = 돈/시간/가치 (always toward Origin)
 * Proximity = distance from Origin (L1 < 80, L2 < 140, L3 < 200)
 */

class ProximityMap {
  constructor(canvas, options = {}) {
    this.canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    if (!this.canvas) {
      console.warn('[ProximityMap] Canvas not found');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width || 400;
    this.height = this.canvas.height || 400;
    this.origin = { x: this.width / 2, y: this.height / 2 };
    
    // Options
    this.options = {
      nodeCountL1: options.nodeCountL1 || 5,
      nodeCountL2: options.nodeCountL2 || 8,
      nodeCountL3: options.nodeCountL3 || 12,
      motionCount: options.motionCount || 24,
      ...options
    };
    
    this.zoom = 1;
    this.state = { 
      delta: 0.68, 
      mu: 0.23, 
      rho: 0.81 
    };
    
    this.colors = {
      primary: 'rgba(180, 180, 170, 0.9)',
      secondary: 'rgba(180, 180, 170, 0.5)',
      dim: 'rgba(180, 180, 170, 0.25)',
      faint: 'rgba(180, 180, 170, 0.08)',
    };

    this.nodes = this.generateNodes();
    this.motions = this.generateMotions();
    
    // Callbacks
    this.onStateChange = null;
    this.onZoomChange = null;
    this.onNodeClick = null;
    
    // Animation
    this.running = false;
    this.animationId = null;
  }

  generateNodes() {
    const nodes = [];
    const { nodeCountL1, nodeCountL2, nodeCountL3 } = this.options;
    
    // L1: r < 80 (close entities)
    for (let i = 0; i < nodeCountL1; i++) {
      nodes.push({
        id: `L1-${i}`,
        level: 1,
        angle: (i * Math.PI * 2) / nodeCountL1 + Math.random() * 0.3,
        r: 50 + Math.random() * 25,
        mass: 1.5 + Math.random() * 1.5,
        velocity: 0.008 + Math.random() * 0.004,
      });
    }
    
    // L2: r < 140 (mid-range entities)
    for (let i = 0; i < nodeCountL2; i++) {
      nodes.push({
        id: `L2-${i}`,
        level: 2,
        angle: (i * Math.PI * 2) / nodeCountL2 + Math.random() * 0.2,
        r: 90 + Math.random() * 40,
        mass: 0.8 + Math.random() * 1.0,
        velocity: 0.005 + Math.random() * 0.003,
      });
    }
    
    // L3: r < 200 (distant entities)
    for (let i = 0; i < nodeCountL3; i++) {
      nodes.push({
        id: `L3-${i}`,
        level: 3,
        angle: (i * Math.PI * 2) / nodeCountL3 + Math.random() * 0.15,
        r: 150 + Math.random() * 45,
        mass: 0.3 + Math.random() * 0.6,
        velocity: 0.003 + Math.random() * 0.002,
      });
    }
    
    return nodes;
  }

  generateMotions() {
    return Array.from({ length: this.options.motionCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      progress: Math.random(),
      intensity: 0.3 + Math.random() * 0.7,
      startR: 80 + Math.random() * 140,
    }));
  }

  setZoom(newZoom) {
    this.zoom = Math.max(0.5, Math.min(2.5, newZoom));
    if (this.onZoomChange) {
      this.onZoomChange(this.zoom);
    }
  }

  applyVector(dv) {
    this.state.rho = Math.max(0, Math.min(1, this.state.rho + dv * 0.1));
    this.state.delta = Math.max(0, Math.min(1, 
      this.state.delta - this.state.rho * 0.01 + this.state.mu * 0.005
    ));
    
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  setState(newState) {
    Object.assign(this.state, newState);
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  getState() {
    return { ...this.state, zoom: this.zoom };
  }

  getVisibleNodes() {
    const threshold = { 1: 0.5, 2: 0.8, 3: 1.2 };
    return this.nodes.filter(node => this.zoom >= threshold[node.level]);
  }

  update() {
    const scale = Math.min(this.width, this.height) / 500;
    
    // Update motions (toward Origin)
    this.motions.forEach(m => {
      m.progress += 0.004 * m.intensity * this.state.rho;
      if (m.progress >= 1) {
        m.progress = 0;
        m.angle = Math.random() * Math.PI * 2;
        m.startR = (80 + Math.random() * 140) * scale;
      }
    });

    // Update node orbits
    this.nodes.forEach(node => {
      node.angle += node.velocity * this.state.rho;
    });
  }

  draw() {
    const { ctx, origin, zoom, colors, width, height } = this;
    const scale = Math.min(width, height) / 500;
    
    ctx.clearRect(0, 0, width, height);

    // Apply zoom
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-origin.x, -origin.y);

    // Grid
    this.drawGrid();

    // Proximity rings
    [80, 140, 200].map(r => r * scale).forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = colors.faint;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (zoom > 0.7) {
        ctx.font = `${8 * scale}px monospace`;
        ctx.fillStyle = colors.dim;
        ctx.textAlign = 'center';
        ctx.fillText(`${[80, 140, 200][i]}`, origin.x, origin.y - r - 6 * scale);
      }
    });

    // Draw motions
    this.motions.forEach(m => {
      const startR = m.startR * scale;
      const currentR = startR * (1 - m.progress);
      const x = origin.x + Math.cos(m.angle) * currentR;
      const y = origin.y + Math.sin(m.angle) * currentR;
      const startX = origin.x + Math.cos(m.angle) * startR;
      const startY = origin.y + Math.sin(m.angle) * startR;

      // Trail
      const gradient = ctx.createLinearGradient(startX, startY, x, y);
      gradient.addColorStop(0, 'rgba(180, 180, 170, 0)');
      gradient.addColorStop(1, `rgba(180, 180, 170, ${0.1 + m.progress * 0.2})`);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Particle
      const size = (1 + m.intensity * 2) * scale;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 180, 170, ${0.2 + m.progress * 0.5})`;
      ctx.fill();
    });

    // Draw nodes
    const threshold = { 1: 0.5, 2: 0.8, 3: 1.2 };
    this.nodes.forEach(node => {
      if (zoom < threshold[node.level]) return;

      const x = origin.x + Math.cos(node.angle) * node.r * scale;
      const y = origin.y + Math.sin(node.angle) * node.r * scale;
      const size = (2 + node.mass * 4) * scale;
      const opacity = 1 - (node.level - 1) * 0.25;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 180, 170, ${opacity * 0.8})`;
      ctx.fill();
    });

    // Origin marker
    this.drawOrigin(scale);

    ctx.restore();

    // State readout
    this.drawState(scale);
  }

  drawGrid() {
    const { ctx, width, height, colors } = this;
    const gridSize = 40;

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
    
    const offset = 12 * scale;
    [-1, 1].forEach(dir => {
      ctx.beginPath();
      ctx.moveTo(origin.x + offset * dir, origin.y);
      ctx.lineTo(origin.x + offset * 0.4 * dir, origin.y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y + offset * dir);
      ctx.lineTo(origin.x, origin.y + offset * 0.4 * dir);
      ctx.stroke();
    });

    // Ring
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 14 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 3 * scale, 0, Math.PI * 2);
    ctx.fillStyle = colors.primary;
    ctx.fill();

    // Label
    ctx.font = `${8 * scale}px monospace`;
    ctx.fillStyle = colors.secondary;
    ctx.textAlign = 'center';
    ctx.fillText('ORIGIN', origin.x, origin.y + 28 * scale);
  }

  drawState(scale = 1) {
    const { ctx, state, zoom, colors } = this;
    const x = 12 * scale;
    let y = 20 * scale;

    ctx.font = `${9 * scale}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.secondary;

    [
      `Δ  ${state.delta.toFixed(2)}`,
      `μ  ${state.mu.toFixed(2)}`,
      `ρ  ${state.rho.toFixed(2)}`,
      `×  ${zoom.toFixed(1)}`,
    ].forEach(text => {
      ctx.fillText(text, x, y);
      y += 14 * scale;
    });
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
  module.exports = ProximityMap;
}

// Global export
window.ProximityMap = ProximityMap;
