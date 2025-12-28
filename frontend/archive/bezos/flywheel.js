/**
 * AUTUS × Bezos: Flywheel Effect
 * "플라이휠은 처음엔 무겁지만, 일단 돌기 시작하면 자체 모멘텀을 만든다"
 */

class FlywheelEngine {
  constructor() {
    this.momentum = 0;
    this.friction = 0.005; // 자연 감소율 (시간당)
    this.decisionHistory = [];
    this.lastTickTime = Date.now();
    this.tickInterval = null;
    
    // 스테이지 정의
    this.stages = [
      { name: 'STARTING', min: 0, max: 0.2, message: '플라이휠 시작 - 첫 회전이 가장 무겁다', icon: '🔄' },
      { name: 'BUILDING', min: 0.2, max: 0.5, message: '모멘텀 축적 중 - 계속 밀어라', icon: '⚙️' },
      { name: 'ACCELERATING', min: 0.5, max: 0.8, message: '가속 중 - 자체 추진력 형성', icon: '🚀' },
      { name: 'FLYWHEEL_EFFECT', min: 0.8, max: 1, message: '플라이휠 효과 - 자동 가속!', icon: '✨' }
    ];
  }

  /**
   * 플라이휠에 힘 가하기
   * @param {Object} decision - { success, impact, effort }
   */
  push(decision) {
    const { success = true, impact = 0.5, effort = 0.5 } = decision;
    
    // 성공한 결정 = 가속, 실패한 결정 = 약간의 감속
    let pushForce;
    if (success) {
      pushForce = 0.05 + (impact * 0.1) + (effort * 0.05);
    } else {
      // 실패해도 배움 = 작은 손실
      pushForce = -0.02 - ((1 - impact) * 0.03);
    }
    
    // 현재 모멘텀이 높을수록 같은 힘으로 더 많이 가속 (플라이휠 효과)
    const momentumBonus = this.momentum * 0.5;
    pushForce *= (1 + momentumBonus);
    
    this.momentum = Math.max(0, Math.min(1, this.momentum + pushForce));
    
    // 기록
    this.decisionHistory.push({
      time: Date.now(),
      success,
      impact,
      effort,
      pushForce,
      resultingMomentum: this.momentum
    });
    
    // 100개 이상이면 오래된 것 삭제
    if (this.decisionHistory.length > 100) {
      this.decisionHistory.shift();
    }
    
    return this.getStatus();
  }

  /**
   * 시간에 따른 자연 감속 (Day 2 방지 필요)
   */
  tick() {
    const now = Date.now();
    const hoursPassed = (now - this.lastTickTime) / (1000 * 60 * 60);
    this.lastTickTime = now;
    
    // 시간이 지나면 마찰로 인해 감속
    const decay = this.friction * hoursPassed;
    this.momentum = Math.max(0, this.momentum - decay);
    
    return this.getStatus();
  }

  /**
   * 현재 상태 조회
   */
  getStatus() {
    const stage = this.stages.find(s => this.momentum >= s.min && this.momentum < s.max) 
                  || this.stages[this.stages.length - 1];
    
    // 다음 스테이지까지 필요한 추진력
    const currentStageIndex = this.stages.indexOf(stage);
    const nextStage = this.stages[currentStageIndex + 1];
    const progressInStage = nextStage 
      ? (this.momentum - stage.min) / (nextStage.min - stage.min)
      : 1;
    
    // 최근 결정 성공률
    const recentDecisions = this.decisionHistory.slice(-10);
    const successRate = recentDecisions.length > 0
      ? recentDecisions.filter(d => d.success).length / recentDecisions.length
      : 0;
    
    return {
      momentum: Math.round(this.momentum * 100),
      stage: stage.name,
      stageIndex: currentStageIndex,
      message: stage.message,
      icon: stage.icon,
      progressInStage: Math.round(progressInStage * 100),
      nextPush: nextStage ? Math.round((nextStage.min - this.momentum) * 100) : 0,
      recentSuccessRate: Math.round(successRate * 100),
      totalDecisions: this.decisionHistory.length,
      bezosQuote: this.getQuote(stage.name)
    };
  }

  getQuote(stageName) {
    const quotes = {
      'STARTING': '"We\'ve had three big ideas at Amazon that we\'ve stuck with for 18 years, and they\'re the reason we\'re successful."',
      'BUILDING': '"If you\'re competitor-focused, you have to wait until there is a competitor doing something. Being customer-focused allows you to be more pioneering."',
      'ACCELERATING': '"What\'s dangerous is not to evolve."',
      'FLYWHEEL_EFFECT': '"The flywheel effect: Push the flywheel consistently in one direction, and it will build momentum." - Jeff Bezos'
    };
    return quotes[stageName] || quotes['STARTING'];
  }

  /**
   * 모멘텀 시각화 데이터
   */
  getVisualizationData() {
    const status = this.getStatus();
    
    return {
      // 원형 게이지용
      gauge: {
        value: status.momentum,
        max: 100,
        color: this.getStageColor(status.stage),
        label: `${status.momentum}%`
      },
      // 히스토리 차트용
      history: this.decisionHistory.slice(-20).map(d => ({
        x: d.time,
        y: d.resultingMomentum * 100,
        success: d.success
      })),
      // 스테이지 표시
      stages: this.stages.map((s, i) => ({
        name: s.name,
        active: i === status.stageIndex,
        completed: i < status.stageIndex
      }))
    };
  }

  getStageColor(stageName) {
    const colors = {
      'STARTING': '#ff6b4a',
      'BUILDING': '#ffaa00',
      'ACCELERATING': '#00aaff',
      'FLYWHEEL_EFFECT': '#00e5cc'
    };
    return colors[stageName] || '#00e5cc';
  }

  /**
   * UI 업데이트
   */
  updateUI() {
    const status = this.getStatus();
    
    // 모멘텀 값
    document.querySelectorAll('[data-autus="momentum"]').forEach(el => {
      el.textContent = status.momentum;
    });
    
    // 스테이지
    document.querySelectorAll('[data-autus="flywheel_stage"]').forEach(el => {
      el.textContent = status.stage;
    });
    
    // 아이콘
    document.querySelectorAll('[data-autus="flywheel_icon"]').forEach(el => {
      el.textContent = status.icon;
    });
    
    // 메시지
    document.querySelectorAll('[data-autus="flywheel_message"]').forEach(el => {
      el.textContent = status.message;
    });
    
    // 게이지 바
    document.querySelectorAll('[data-autus-gauge="momentum"]').forEach(el => {
      el.style.width = `${status.momentum}%`;
      el.style.background = this.getStageColor(status.stage);
    });
  }

  /**
   * 자동 틱 시작
   */
  startTicking(intervalMs = 60000) {
    this.tickInterval = setInterval(() => {
      this.tick();
      this.updateUI();
    }, intervalMs);
  }

  stopTicking() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * 결정 이벤트 연동
   */
  connectToDecisions() {
    document.addEventListener('autus:decision', (e) => {
      const { success, impact, effort } = e.detail;
      this.push({ success, impact, effort });
      this.updateUI();
    });
  }

  /**
   * WebSocket 연동
   */
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', () => {
        this.updateUI();
      });
    }
  }
}

// 글로벌 노출
window.FlywheelEngine = FlywheelEngine;
