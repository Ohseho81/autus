/**
 * AUTUS Brainwave Integration
 * 뇌파 시뮬레이션 + Neuralink API 슬롯
 * gamma = Energy ↑, alpha = Flow ↑
 */

class BrainwaveSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn('[Brainwave] Canvas not found:', canvasId);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    
    // 뇌파 주파수 대역
    this.waves = {
      delta: { freq: 2, amp: 0.3, color: '#4444ff', label: 'Delta (수면)' },      // 0.5-4 Hz
      theta: { freq: 6, amp: 0.4, color: '#00aaff', label: 'Theta (명상)' },      // 4-8 Hz
      alpha: { freq: 10, amp: 0.5, color: '#00ffcc', label: 'Alpha (이완)' },     // 8-13 Hz
      beta: { freq: 20, amp: 0.3, color: '#ffaa00', label: 'Beta (집중)' },       // 13-30 Hz
      gamma: { freq: 40, amp: 0.2, color: '#ff4444', label: 'Gamma (고집중)' }    // 30-100 Hz
    };
    
    // 현재 뇌파 상태
    this.currentState = {
      focusLevel: 50,  // 0-100
      relaxLevel: 50,  // 0-100
      energyLevel: 50  // 0-100
    };
    
    // 시뮬레이션 모드 (실제 Neuralink 연결 전)
    this.simulationMode = true;
    this.neuralinkEndpoint = null;
    
    this.time = 0;
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.offsetWidth || 300;
    this.canvas.height = container.offsetHeight || 150;
  }
  
  draw() {
    const { ctx, canvas, waves, time } = this;
    
    // 배경 페이드
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 그리드 라인
    ctx.strokeStyle = 'rgba(0, 229, 204, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // 각 뇌파 그리기
    const waveHeight = canvas.height / Object.keys(waves).length;
    
    Object.entries(waves).forEach(([name, wave], index) => {
      const baseY = waveHeight * (index + 0.5);
      
      // 상태에 따른 진폭 조절
      let amplitude = wave.amp;
      if (name === 'gamma') amplitude *= this.currentState.focusLevel / 50;
      if (name === 'alpha') amplitude *= this.currentState.relaxLevel / 50;
      if (name === 'beta') amplitude *= this.currentState.energyLevel / 50;
      
      ctx.beginPath();
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 2;
      
      for (let x = 0; x < canvas.width; x++) {
        // 복합 파형 생성
        const noise = Math.random() * 0.1 - 0.05;
        const y = baseY + 
          Math.sin((x + time) * wave.freq * 0.01) * amplitude * waveHeight * 0.3 +
          Math.sin((x + time) * wave.freq * 0.015 + Math.PI/3) * amplitude * waveHeight * 0.15 +
          noise * waveHeight * 0.2;
        
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      // 라벨
      ctx.fillStyle = wave.color;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(wave.label, 5, baseY - waveHeight * 0.3);
    });
    
    // 집중도 표시
    ctx.fillStyle = '#00e5cc';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`집중도: ${this.currentState.focusLevel}%`, canvas.width - 10, 20);
    
    this.time += 1;
  }
  
  animate() {
    this.draw();
    
    // 시뮬레이션 모드: 랜덤 변동
    if (this.simulationMode) {
      this.currentState.focusLevel += (Math.random() - 0.5) * 2;
      this.currentState.relaxLevel += (Math.random() - 0.5) * 2;
      this.currentState.energyLevel += (Math.random() - 0.5) * 2;
      
      // 범위 제한
      Object.keys(this.currentState).forEach(key => {
        this.currentState[key] = Math.max(10, Math.min(90, this.currentState[key]));
      });
    }
    
    requestAnimationFrame(() => this.animate());
  }
  
  // 상태 설정 (외부에서 호출)
  setState(focus, relax, energy) {
    this.currentState = {
      focusLevel: Math.max(0, Math.min(100, focus)),
      relaxLevel: Math.max(0, Math.min(100, relax)),
      energyLevel: Math.max(0, Math.min(100, energy))
    };
    
    // data-autus 업데이트
    const focusEl = document.querySelector('[data-autus="focus_level"]');
    if (focusEl) focusEl.textContent = Math.round(this.currentState.focusLevel);
  }
  
  // Energy 연동 (Physics Engine)
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', (data) => {
        // Energy → Focus
        const energy = (data.flow || 50);
        const risk = (data.risk || 30);
        const entropy = (data.entropy || 30);
        
        this.setState(
          100 - entropy,  // 낮은 엔트로피 = 높은 집중
          100 - risk,     // 낮은 리스크 = 높은 이완
          energy          // Flow = Energy
        );
      });
    }
  }
  
  // Neuralink API 슬롯 (미래 구현)
  connectNeuralink(endpoint, apiKey) {
    console.log('[Brainwave] Neuralink API reserved');
    console.log('[Brainwave] Endpoint:', endpoint);
    
    this.neuralinkEndpoint = endpoint;
    this.simulationMode = false;
    
    // 실제 연결 코드 (미래)
    /*
    this.neuralinkWS = new WebSocket(endpoint);
    this.neuralinkWS.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.setState(data.focus, data.relax, data.energy);
      
      // 뇌파 주파수 직접 업데이트
      if (data.frequencies) {
        Object.entries(data.frequencies).forEach(([name, freq]) => {
          if (this.waves[name]) {
            this.waves[name].amp = freq.amplitude;
          }
        });
      }
    };
    */
    
    return {
      status: 'reserved',
      endpoint: endpoint,
      features: ['focus_tracking', 'meditation_mode', 'energy_boost'],
      note: 'Waiting for Neuralink SDK'
    };
  }
  
  // 명상 모드
  startMeditation() {
    console.log('[Brainwave] Meditation mode started');
    
    // Alpha 파 강화
    this.waves.alpha.amp = 0.8;
    this.waves.beta.amp = 0.2;
    this.waves.gamma.amp = 0.1;
    
    // 30초 후 자동 복귀
    setTimeout(() => {
      this.waves.alpha.amp = 0.5;
      this.waves.beta.amp = 0.3;
      this.waves.gamma.amp = 0.2;
      console.log('[Brainwave] Meditation mode ended');
    }, 30000);
  }
  
  // 집중 모드
  startFocus() {
    console.log('[Brainwave] Focus mode started');
    
    // Gamma/Beta 파 강화
    this.waves.gamma.amp = 0.5;
    this.waves.beta.amp = 0.6;
    this.waves.alpha.amp = 0.2;
    
    setTimeout(() => {
      this.waves.gamma.amp = 0.2;
      this.waves.beta.amp = 0.3;
      this.waves.alpha.amp = 0.5;
      console.log('[Brainwave] Focus mode ended');
    }, 30000);
  }
  
  // 현재 상태 반환
  getState() {
    return {
      ...this.currentState,
      dominantWave: this.getDominantWave(),
      simulationMode: this.simulationMode
    };
  }
  
  getDominantWave() {
    let maxAmp = 0;
    let dominant = 'alpha';
    
    Object.entries(this.waves).forEach(([name, wave]) => {
      if (wave.amp > maxAmp) {
        maxAmp = wave.amp;
        dominant = name;
      }
    });
    
    return dominant;
  }
}

// 글로벌 노출
window.BrainwaveSimulator = BrainwaveSimulator;
