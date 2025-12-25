/**
 * AUTUS Core Loop
 * 8단계 결정 루프 시각화
 * Reality → State → Threshold → Forecast → Decision → Action → Log → Loop
 */

class CoreLoop {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn('[CoreLoop] Canvas not found:', canvasId);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.stages = [
      { name: 'Reality', icon: '👁️', desc: '현실 인식' },
      { name: 'State', icon: '📊', desc: '상태 측정' },
      { name: 'Threshold', icon: '⚡', desc: '임계값 확인' },
      { name: 'Forecast', icon: '🔮', desc: '예측 생성' },
      { name: 'Decision', icon: '🎯', desc: '결정 도출' },
      { name: 'Action', icon: '🚀', desc: '행동 실행' },
      { name: 'Log', icon: '📝', desc: '기록 저장' },
      { name: 'Loop', icon: '🔄', desc: '루프 반복' }
    ];
    
    this.currentStage = 0;
    this.targetStage = 0;
    this.rotationSpeed = 0.008; // Energy에 따라 조절
    this.angle = -Math.PI / 2; // 12시 방향 시작
    this.glowIntensity = 0;
    this.glowDirection = 1;
    
    // 반응형 캔버스 크기
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // 애니메이션 시작
    this.animate();
  }
  
  resize() {
    const container = this.canvas.parentElement;
    const size = Math.min(container.offsetWidth, container.offsetHeight, 350);
    this.canvas.width = size;
    this.canvas.height = size;
  }
  
  draw() {
    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.75;
    const nodeRadius = 18;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 배경 글로우
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
    gradient.addColorStop(0, 'rgba(0, 229, 204, 0.05)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 외부 원 (회전)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle * 0.1);
    
    // 점선 원
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 229, 204, 0.2)';
    ctx.setLineDash([5, 10]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    
    // 노드 연결선
    ctx.beginPath();
    this.stages.forEach((_, i) => {
      const nodeAngle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(nodeAngle) * radius;
      const y = centerY + Math.sin(nodeAngle) * radius;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0, 229, 204, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 8개 노드
    this.stages.forEach((stage, i) => {
      const nodeAngle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(nodeAngle) * radius;
      const y = centerY + Math.sin(nodeAngle) * radius;
      
      const isActive = i === this.currentStage;
      const isPast = i < this.currentStage;
      
      // 노드 글로우 (현재 스테이지)
      if (isActive) {
        const glowRadius = nodeRadius + 10 + Math.sin(this.glowIntensity) * 5;
        const glowGradient = ctx.createRadialGradient(x, y, nodeRadius, x, y, glowRadius);
        glowGradient.addColorStop(0, 'rgba(0, 229, 204, 0.6)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
      }
      
      // 노드 원
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      
      if (isActive) {
        ctx.fillStyle = '#00e5cc';
        ctx.shadowColor = '#00e5cc';
        ctx.shadowBlur = 20;
      } else if (isPast) {
        ctx.fillStyle = 'rgba(0, 229, 204, 0.7)';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(0, 229, 204, 0.3)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // 아이콘
      ctx.fillStyle = isActive ? '#000' : '#fff';
      ctx.font = `${isActive ? 16 : 14}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stage.icon, x, y);
      
      // 라벨 (외부)
      const labelRadius = radius + 35;
      const lx = centerX + Math.cos(nodeAngle) * labelRadius;
      const ly = centerY + Math.sin(nodeAngle) * labelRadius;
      
      ctx.fillStyle = isActive ? '#00e5cc' : 'rgba(255, 255, 255, 0.6)';
      ctx.font = `${isActive ? 'bold ' : ''}11px system-ui, sans-serif`;
      ctx.fillText(stage.name, lx, ly);
    });
    
    // 중앙 정보
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Stage ${this.currentStage + 1}/8`, centerX, centerY - 10);
    
    ctx.fillStyle = '#00e5cc';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(this.stages[this.currentStage].name, centerX, centerY + 10);
    
    // 글로우 애니메이션
    this.glowIntensity += 0.1;
    
    // 회전
    this.angle += this.rotationSpeed;
  }
  
  setStage(stage) {
    if (stage >= 0 && stage < 8) {
      this.targetStage = stage;
      this.currentStage = stage;
      this.updateUI();
    }
  }
  
  nextStage() {
    this.currentStage = (this.currentStage + 1) % 8;
    this.updateUI();
    return this.currentStage;
  }
  
  setEnergy(energy) {
    // Energy 0~1 → 회전 속도 0.003~0.02
    this.rotationSpeed = 0.003 + Math.min(1, Math.max(0, energy)) * 0.017;
  }
  
  updateUI() {
    // data-autus 요소 업데이트
    const stageEl = document.querySelector('[data-autus="current_stage"]');
    const nameEl = document.querySelector('[data-autus="stage_name"]');
    
    if (stageEl) stageEl.textContent = `Stage ${this.currentStage + 1}/8`;
    if (nameEl) nameEl.textContent = this.stages[this.currentStage].name;
  }
  
  animate() {
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
  
  // 외부 데이터 연동
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', (data) => {
        if (data.flow !== undefined) {
          this.setEnergy(data.flow / 100);
        }
      });
    }
  }
}

// 글로벌 노출
window.CoreLoop = CoreLoop;
