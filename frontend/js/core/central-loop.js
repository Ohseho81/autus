/**
 * AUTUS Central Loop Animation
 * Tesla FSD 스타일 결정 시각화
 * 
 * "인간 결정의 살아있는 물리법칙 지도"
 * 
 * Titans Kernel 내장:
 * - Bezos: 80세 후회 최소화 / 70% 정보면 실행
 * - Thiel: 독점률 = 네트워크 효과
 * - Musk: 인간 개입 최소화 / Delete First
 */

class CentralLoop {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 캔버스 고해상도 설정
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    
    // 8단계 노드 정의
    this.stages = [
      { id: 'reality', name: 'Reality', icon: '👁', desc: '현실 인식' },
      { id: 'state', name: 'State', icon: '📊', desc: '상태 평가' },
      { id: 'threshold', name: 'Threshold', icon: '⚖️', desc: '기준 설정' },
      { id: 'forecast', name: 'Forecast', icon: '🔮', desc: '미래 예측' },
      { id: 'decision', name: 'Decision', icon: '⚡', desc: '결정 순간' },
      { id: 'action', name: 'Action', icon: '🚀', desc: '실행' },
      { id: 'log', name: 'Log', icon: '📝', desc: '기록' },
      { id: 'loop', name: 'Loop', icon: '🔄', desc: '학습 완료' }
    ];
    
    // 상태
    this.currentStage = 0;
    this.progress = 0;
    this.stageProgress = 0;
    this.rotationAngle = -Math.PI / 2; // 12시 방향 시작
    this.rotationSpeed = 0.001;
    this.isRunning = false;
    this.isPaused = false;
    
    // 시각 설정
    this.config = {
      primaryColor: '#00ffcc',
      secondaryColor: '#0088ff',
      warningColor: '#ff6600',
      dangerColor: '#ff3366',
      bgColor: 'transparent',
      loopRadius: 0.35,
      nodeRadius: 0.03,
      lineWidth: 0.015,
      pulseSpeed: 2,
      particleCount: 30,
      glowIntensity: 0.6,
      ...options
    };
    
    // 입자 시스템
    this.particles = [];
    this.initParticles();
    
    // 터널링 효과
    this.tunnelingWaves = [];
    
    // Goal Anchor
    this.goalText = '목표를 설정하세요';
    
    // Loss Velocity
    this.lossVelocity = 0;
    this.lossWarning = false;
    
    // 뇌파 데이터
    this.focusLevel = 0;
    
    // Titans 메트릭스
    this.titansMetrics = {
      regretScore: 0,
      monopolyScore: 0,
      interventionRate: 1,
      infoLevel: 0.7
    };
    
    // 이벤트 바인딩
    this.bindEvents();
    
    // 시간 추적
    this.lastTime = 0;
    this.deltaTime = 0;
    
    // 콜백
    this.onStageComplete = null;
    this.onLoopComplete = null;
  }

  // ==================== 초기화 ====================

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    
    this.width = rect.width;
    this.height = rect.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius = Math.min(this.width, this.height) * this.config.loopRadius;
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        distance: this.radius * (0.9 + Math.random() * 0.2),
        size: 1 + Math.random() * 2,
        speed: 0.5 + Math.random() * 0.5,
        opacity: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e, 'start'));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e, 'move'));
    this.canvas.addEventListener('touchend', (e) => this.handleTouch(e, 'end'));
    
    this.canvas.addEventListener('mousedown', (e) => this.handleMouse(e, 'start'));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e, 'move'));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouse(e, 'end'));
  }

  // ==================== 메인 렌더링 ====================

  render(timestamp) {
    this.deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    // 배경 클리어 (투명)
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 레이어 순서대로 렌더링
    this.renderGlow();
    this.renderParticles();
    this.renderLoopTrack();
    this.renderProgress();
    this.renderEntanglements();
    this.renderTunneling();
    this.renderNodes();
    this.renderCurrentNode();
    this.renderGoalAnchor();
    this.renderTitansMetrics();
    this.renderStageInfo();
    
    // 상태 업데이트
    if (this.isRunning && !this.isPaused) {
      this.updateState();
    }
    
    requestAnimationFrame((t) => this.render(t));
  }

  // ==================== 배경 글로우 ====================

  renderGlow() {
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, this.radius * 0.3,
      this.centerX, this.centerY, this.radius * 1.5
    );
    
    const intensity = this.config.glowIntensity * (0.3 + this.progress * 0.7);
    gradient.addColorStop(0, `rgba(0, 255, 204, ${intensity * 0.15})`);
    gradient.addColorStop(0.5, `rgba(0, 255, 204, ${intensity * 0.05})`);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // ==================== 입자 효과 ====================

  renderParticles() {
    const time = this.lastTime * 0.001;
    
    this.particles.forEach(p => {
      p.angle += p.speed * 0.01 * this.rotationSpeed * 10;
      
      const wave = Math.sin(time * 2 + p.phase) * 5;
      const x = this.centerX + Math.cos(p.angle) * (p.distance + wave);
      const y = this.centerY + Math.sin(p.angle) * (p.distance + wave);
      
      const progressAngle = this.rotationAngle + this.progress * Math.PI * 2;
      const angleDiff = Math.abs(p.angle - progressAngle) % (Math.PI * 2);
      const brightness = angleDiff < 0.5 ? 1 : 0.3;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(0, 255, 204, ${p.opacity * brightness})`;
      this.ctx.fill();
    });
  }

  // ==================== 루프 트랙 ====================

  renderLoopTrack() {
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = this.width * this.config.lineWidth;
    this.ctx.stroke();
  }

  // ==================== 진행 표시 ====================

  renderProgress() {
    if (this.progress <= 0) return;
    
    const startAngle = this.rotationAngle;
    const endAngle = startAngle + this.progress * Math.PI * 2;
    
    const baseWidth = this.width * this.config.lineWidth;
    const progressWidth = baseWidth * (0.5 + this.progress * 0.5);
    
    const gradient = this.ctx.createLinearGradient(
      this.centerX - this.radius, this.centerY,
      this.centerX + this.radius, this.centerY
    );
    gradient.addColorStop(0, this.config.primaryColor);
    gradient.addColorStop(0.5, this.config.secondaryColor);
    gradient.addColorStop(1, this.config.primaryColor);
    
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = progressWidth;
    this.ctx.lineCap = 'round';
    
    this.ctx.shadowColor = this.config.primaryColor;
    this.ctx.shadowBlur = 15;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
    
    // 진행선 끝 밝은 점
    const endX = this.centerX + Math.cos(endAngle) * this.radius;
    const endY = this.centerY + Math.sin(endAngle) * this.radius;
    
    this.ctx.beginPath();
    this.ctx.arc(endX, endY, progressWidth * 0.8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
  }

  // ==================== 8개 노드 ====================

  renderNodes() {
    const nodeRadius = this.width * this.config.nodeRadius;
    
    this.stages.forEach((stage, i) => {
      const angle = this.rotationAngle + (i / 8) * Math.PI * 2;
      const x = this.centerX + Math.cos(angle) * this.radius;
      const y = this.centerY + Math.sin(angle) * this.radius;
      
      const isCompleted = i < this.currentStage;
      const isCurrent = i === this.currentStage;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      
      if (isCurrent) {
        this.ctx.fillStyle = this.config.primaryColor;
      } else if (isCompleted) {
        this.ctx.fillStyle = 'rgba(0, 255, 204, 0.6)';
      } else {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      }
      this.ctx.fill();
      
      this.ctx.strokeStyle = isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = isCurrent ? 2 : 1;
      this.ctx.stroke();
      
      // 라벨
      const labelRadius = this.radius + nodeRadius + 15;
      const labelX = this.centerX + Math.cos(angle) * labelRadius;
      const labelY = this.centerY + Math.sin(angle) * labelRadius;
      
      this.ctx.font = '10px -apple-system, sans-serif';
      this.ctx.fillStyle = isCurrent ? this.config.primaryColor : 'rgba(255, 255, 255, 0.5)';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(stage.name, labelX, labelY);
    });
  }

  // ==================== 현재 노드 펄스 ====================

  renderCurrentNode() {
    const nodeRadius = this.width * this.config.nodeRadius;
    const angle = this.rotationAngle + (this.currentStage / 8) * Math.PI * 2;
    const x = this.centerX + Math.cos(angle) * this.radius;
    const y = this.centerY + Math.sin(angle) * this.radius;
    
    const time = this.lastTime * 0.001;
    const pulse = Math.sin(time * this.config.pulseSpeed) * 0.3 + 0.7;
    const pulseRadius = nodeRadius * (1 + pulse * 0.5);
    
    // 펄스 링
    this.ctx.beginPath();
    this.ctx.arc(x, y, pulseRadius * 1.5, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(0, 255, 204, ${0.3 * pulse})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, pulseRadius * 2, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(0, 255, 204, ${0.15 * pulse})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // 내부 글로우
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, nodeRadius * 2);
    gradient.addColorStop(0, `rgba(0, 255, 204, ${0.8 * pulse})`);
    gradient.addColorStop(0.5, `rgba(0, 255, 204, ${0.3 * pulse})`);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, nodeRadius * 2, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  // ==================== 얽힘 연결선 (Decision) ====================

  renderEntanglements() {
    if (this.currentStage !== 4) return;
    
    const time = this.lastTime * 0.001;
    const currentAngle = this.rotationAngle + (this.currentStage / 8) * Math.PI * 2;
    const currentX = this.centerX + Math.cos(currentAngle) * this.radius;
    const currentY = this.centerY + Math.sin(currentAngle) * this.radius;
    
    [0, 2, 5, 7].forEach((targetStage, i) => {
      const targetAngle = this.rotationAngle + (targetStage / 8) * Math.PI * 2;
      const targetX = this.centerX + Math.cos(targetAngle) * this.radius;
      const targetY = this.centerY + Math.sin(targetAngle) * this.radius;
      
      const wave = Math.sin(time * 3 + i) * 0.5 + 0.5;
      
      this.ctx.beginPath();
      this.ctx.moveTo(currentX, currentY);
      this.ctx.quadraticCurveTo(this.centerX, this.centerY, targetX, targetY);
      this.ctx.strokeStyle = `rgba(0, 255, 204, ${0.3 * wave})`;
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      
      // 이동 점
      const t = (time * 0.5 + i * 0.25) % 1;
      const pointX = (1-t)*(1-t)*currentX + 2*(1-t)*t*this.centerX + t*t*targetX;
      const pointY = (1-t)*(1-t)*currentY + 2*(1-t)*t*this.centerY + t*t*targetY;
      
      this.ctx.beginPath();
      this.ctx.arc(pointX, pointY, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = this.config.primaryColor;
      this.ctx.fill();
    });
  }

  // ==================== 터널링 파동 ====================

  renderTunneling() {
    this.tunnelingWaves = this.tunnelingWaves.filter(wave => {
      wave.progress += 0.02;
      
      if (wave.progress >= 1) return false;
      
      const radius = this.radius * wave.progress;
      const opacity = (1 - wave.progress) * 0.5;
      
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(0, 255, 204, ${opacity})`;
      this.ctx.lineWidth = 3 * (1 - wave.progress);
      this.ctx.stroke();
      
      return true;
    });
  }

  triggerTunneling() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.tunnelingWaves.push({ progress: 0 });
      }, i * 150);
    }
    navigator.vibrate?.([50, 30, 50, 30, 100]);
  }

  // ==================== Goal Anchor ====================

  renderGoalAnchor() {
    const bgRadius = this.radius * 0.4;
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, bgRadius
    );
    gradient.addColorStop(0, 'rgba(10, 10, 15, 0.9)');
    gradient.addColorStop(1, 'rgba(10, 10, 15, 0.3)');
    
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, bgRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // 테두리
    this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // 텍스트
    this.ctx.font = 'bold 13px -apple-system, sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const maxWidth = bgRadius * 1.5;
    const words = this.goalText.split(' ');
    let line = '';
    let lines = [];
    
    words.forEach(word => {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        lines.push(line.trim());
        line = word + ' ';
      } else {
        line = testLine;
      }
    });
    lines.push(line.trim());
    
    const lineHeight = 16;
    const startY = this.centerY - (lines.length - 1) * lineHeight / 2;
    
    lines.forEach((l, i) => {
      this.ctx.fillText(l, this.centerX, startY + i * lineHeight);
    });
  }

  // ==================== Titans 메트릭스 ====================

  renderTitansMetrics() {
    const metrics = this.titansMetrics;
    const baseY = this.centerY + this.radius + 35;
    
    // Loss Velocity (Musk)
    if (this.lossVelocity > 0) {
      const color = this.lossWarning ? this.config.dangerColor : this.config.warningColor;
      this.ctx.font = 'bold 11px SF Mono, monospace';
      this.ctx.fillStyle = color;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`₩${this.lossVelocity.toFixed(1)}/s`, 10, 20);
    }
    
    // Info Level (Bezos 70%)
    if (metrics.infoLevel > 0) {
      const pct = Math.round(metrics.infoLevel * 100);
      const ready = metrics.infoLevel >= 0.7;
      this.ctx.font = '10px -apple-system, sans-serif';
      this.ctx.fillStyle = ready ? this.config.primaryColor : 'rgba(255,255,255,0.5)';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`정보 ${pct}%${ready ? ' ✓' : ''}`, this.width - 10, 20);
    }
  }

  // ==================== 단계 정보 ====================

  renderStageInfo() {
    const stage = this.stages[this.currentStage];
    const y = this.centerY + this.radius + 35;
    
    this.ctx.font = 'bold 12px -apple-system, sans-serif';
    this.ctx.fillStyle = this.config.primaryColor;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${this.currentStage + 1}/8`, this.centerX, y);
    
    this.ctx.font = '11px -apple-system, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText(stage.name, this.centerX, y + 14);
  }

  // ==================== 상태 업데이트 ====================

  updateState() {
    this.rotationAngle += this.rotationSpeed;
    
    if (this.stageProgress < 1) {
      this.stageProgress += 0.005 * this.rotationSpeed * 100;
    } else {
      this.stageProgress = 0;
      this.currentStage = (this.currentStage + 1) % 8;
      
      this.onStageComplete?.(this.stages[this.currentStage]);
      navigator.vibrate?.(10);
      
      // Loop 완료
      if (this.currentStage === 0) {
        this.onLoopComplete?.();
        this.triggerTunneling();
      }
      
      // Decision 단계 얽힘 효과
      if (this.currentStage === 4) {
        navigator.vibrate?.([20, 10, 20]);
      }
    }
    
    this.progress = (this.currentStage + this.stageProgress) / 8;
    
    // AUTUS 모델 연동
    if (window.__AUTUS_MODEL) {
      const model = window.__AUTUS_MODEL;
      this.setEnergy(model.energy || 0.5);
      this.lossVelocity = model.loss_velocity || 0;
      this.lossWarning = this.lossVelocity > 5;
      this.focusLevel = model.focus_level || 0;
      this.titansMetrics.infoLevel = model.info_level || 0.7;
    }
  }

  // ==================== 외부 제어 ====================

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.render(performance.now());
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }
  
  stop() {
    this.isRunning = false;
    this.progress = 0;
    this.currentStage = 0;
    this.stageProgress = 0;
  }

  reset() {
    this.stop();
    this.render(performance.now());
  }

  setGoal(text) { this.goalText = text; }
  
  setEnergy(energy) {
    this.rotationSpeed = 0.0005 + energy * 0.002;
  }

  setStage(stageIndex) {
    this.currentStage = Math.max(0, Math.min(7, stageIndex));
    this.stageProgress = 0;
  }

  setLossVelocity(velocity, warning = false) {
    this.lossVelocity = velocity;
    this.lossWarning = warning;
  }

  setTitansMetrics(metrics) {
    Object.assign(this.titansMetrics, metrics);
  }

  // ==================== 인터랙션 ====================

  handleTouch(e, type) {
    if (type === 'start') {
      e.preventDefault();
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartTime = Date.now();
      this.isDragging = true;
    } else if (type === 'move' && this.isDragging) {
      e.preventDefault();
    } else if (type === 'end') {
      const duration = Date.now() - this.touchStartTime;
      if (duration < 200) {
        this.nextStage();
      }
      this.isDragging = false;
    }
  }

  handleMouse(e, type) {
    if (type === 'start') {
      this.touchStartX = e.clientX;
      this.touchStartTime = Date.now();
      this.isDragging = true;
    } else if (type === 'end') {
      const duration = Date.now() - this.touchStartTime;
      if (duration < 200) {
        this.nextStage();
      }
      this.isDragging = false;
    }
  }

  nextStage() {
    this.currentStage = (this.currentStage + 1) % 8;
    this.stageProgress = 0;
    navigator.vibrate?.(10);
    this.onStageComplete?.(this.stages[this.currentStage]);
  }

  prevStage() {
    this.currentStage = (this.currentStage - 1 + 8) % 8;
    this.stageProgress = 0;
    navigator.vibrate?.(10);
  }
}

// 전역 등록
window.CentralLoop = CentralLoop;

// 자동 초기화 헬퍼
window.initCentralLoop = (canvasId, options) => {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`[CentralLoop] Canvas #${canvasId} not found`);
    return null;
  }
  
  const loop = new CentralLoop(canvas, options);
  loop.start();
  return loop;
};

console.log('🔄 CentralLoop loaded - Tesla FSD for Human Life');
