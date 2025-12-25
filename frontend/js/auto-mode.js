/**
 * AUTUS AUTO Mode
 * 하나의 버튼으로 모든 것을 제어
 * Elon: "Delete → Simplify → Automate"
 */

class AutoMode {
  constructor() {
    this.button = document.getElementById('auto-button');
    this.slider = document.getElementById('threshold-slider');
    this.sliderInput = document.getElementById('threshold-level');
    
    if (!this.button) {
      console.warn('[AutoMode] Button not found');
      return;
    }
    
    this.isRunning = false;
    this.pressTimer = null;
    this.thresholdLevel = 1; // 0=Chill, 1=Standard, 2=MadMax
    this.thresholdNames = ['Chill', 'Standard', 'Mad Max'];
    this.loopInterval = null;
    
    this.initEvents();
    this.initVoice();
    this.initHaptics();
  }
  
  initEvents() {
    // 클릭: 루프 토글
    this.button.addEventListener('click', (e) => {
      if (!this.longPressed) {
        this.toggleLoop();
      }
      this.longPressed = false;
    });
    
    // 길게 누르기: 슬라이더 표시
    this.button.addEventListener('touchstart', (e) => this.startPress(e));
    this.button.addEventListener('touchend', () => this.endPress());
    this.button.addEventListener('mousedown', (e) => this.startPress(e));
    this.button.addEventListener('mouseup', () => this.endPress());
    this.button.addEventListener('mouseleave', () => this.endPress());
    
    // 슬라이더 변경
    if (this.sliderInput) {
      this.sliderInput.addEventListener('input', (e) => {
        this.thresholdLevel = parseInt(e.target.value);
        this.updateThresholdDisplay();
        this.haptic('light');
      });
      
      // 슬라이더 외부 클릭 시 닫기
      document.addEventListener('click', (e) => {
        if (this.slider && !this.slider.contains(e.target) && e.target !== this.button) {
          this.hideSlider();
        }
      });
    }
  }
  
  startPress(e) {
    e.preventDefault();
    this.longPressed = false;
    
    this.pressTimer = setTimeout(() => {
      this.longPressed = true;
      this.showSlider();
      this.haptic('medium');
    }, 500);
  }
  
  endPress() {
    clearTimeout(this.pressTimer);
  }
  
  toggleLoop() {
    if (this.isRunning) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  }
  
  startLoop() {
    this.isRunning = true;
    this.button.classList.add('active');
    this.button.querySelector('.auto-text').textContent = 'STOP';
    
    console.log('[AUTO] Loop started | Threshold:', this.thresholdNames[this.thresholdLevel]);
    
    // WebSocket 연결 확인 및 스냅샷 요청
    if (window.autusBridge) {
      window.autusBridge.sendAction('AUTO_START', {
        threshold: this.thresholdLevel
      });
    }
    
    // Core Loop 진행
    if (window.coreLoop) {
      this.loopInterval = setInterval(() => {
        const stage = window.coreLoop.nextStage();
        
        // 각 스테이지별 처리
        this.processStage(stage);
        
      }, this.getLoopSpeed());
    }
    
    this.haptic('success');
    this.speak('오토 모드 시작');
  }
  
  stopLoop() {
    this.isRunning = false;
    this.button.classList.remove('active');
    this.button.querySelector('.auto-text').textContent = 'AUTO';
    
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    
    if (window.autusBridge) {
      window.autusBridge.sendAction('AUTO_STOP');
    }
    
    console.log('[AUTO] Loop stopped');
    this.haptic('warning');
  }
  
  processStage(stage) {
    const stageNames = ['Reality', 'State', 'Threshold', 'Forecast', 'Decision', 'Action', 'Log', 'Loop'];
    
    switch (stage) {
      case 2: // Threshold
        this.checkThreshold();
        break;
      case 4: // Decision
        this.autoDecide();
        break;
      case 5: // Action
        this.executeAction();
        break;
      case 6: // Log
        this.logDecision();
        break;
    }
  }
  
  checkThreshold() {
    const model = window.__AUTUS_MODEL || {};
    const risk = model.risk || 0;
    
    // Threshold 레벨에 따른 임계값
    const thresholds = [0.7, 0.5, 0.3]; // Chill, Standard, MadMax
    const threshold = thresholds[this.thresholdLevel];
    
    if (risk / 100 > threshold) {
      console.log('[AUTO] Threshold exceeded! Risk:', risk);
      if (window.feedbackSystem) {
        window.feedbackSystem.triggerStressAlert(risk / 100);
      }
    }
  }
  
  autoDecide() {
    const model = window.__AUTUS_MODEL || {};
    const action = model.recommended_action || 'HOLD';
    
    console.log('[AUTO] Auto decision:', action);
    
    // 결정 이벤트 발생
    document.dispatchEvent(new CustomEvent('autus:decision', {
      detail: { action, auto: true }
    }));
  }
  
  executeAction() {
    // Action 실행은 백엔드에서 처리
    if (window.autusBridge) {
      window.autusBridge.sendAction('AUTO_EXECUTE');
    }
  }
  
  logDecision() {
    // 로그 기록
    const model = window.__AUTUS_MODEL || {};
    console.log('[AUTO] Decision logged:', {
      timestamp: Date.now(),
      risk: model.risk,
      entropy: model.entropy,
      action: model.recommended_action
    });
  }
  
  getLoopSpeed() {
    // Threshold 레벨에 따른 루프 속도 (ms)
    const speeds = [5000, 3000, 1500]; // Chill, Standard, MadMax
    return speeds[this.thresholdLevel];
  }
  
  showSlider() {
    if (this.slider) {
      this.slider.classList.remove('hidden');
      this.slider.classList.add('visible');
    }
  }
  
  hideSlider() {
    if (this.slider) {
      this.slider.classList.remove('visible');
      this.slider.classList.add('hidden');
    }
  }
  
  updateThresholdDisplay() {
    const labels = this.slider?.querySelectorAll('.threshold-labels span');
    if (labels) {
      labels.forEach((label, i) => {
        label.classList.toggle('active', i === this.thresholdLevel);
      });
    }
  }
  
  // 음성 인식
  initVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('[AutoMode] Speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.lang = 'ko-KR';
    this.recognition.interimResults = false;
    
    this.recognition.onresult = (event) => {
      const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log('[Voice]', text);
      
      if (text.includes('오토') || text.includes('auto') || text.includes('시작')) {
        if (!this.isRunning) this.startLoop();
      }
      if (text.includes('멈춰') || text.includes('stop') || text.includes('정지')) {
        if (this.isRunning) this.stopLoop();
      }
    };
    
    this.recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.warn('[Voice] Error:', event.error);
      }
    };
    
    // 음성 인식 버튼이 있으면 활성화
    const voiceBtn = document.getElementById('voice-toggle');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        try {
          this.recognition.start();
          voiceBtn.classList.add('active');
        } catch (e) {
          console.log('[Voice] Already started');
        }
      });
    }
  }
  
  // TTS
  speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.1;
      speechSynthesis.speak(utterance);
    }
  }
  
  // 햅틱 피드백
  initHaptics() {
    this.hapticPatterns = {
      light: [10],
      medium: [30],
      heavy: [50],
      success: [30, 50, 30],
      warning: [100, 30, 100],
      error: [200, 100, 200]
    };
  }
  
  haptic(type = 'light') {
    if (navigator.vibrate) {
      navigator.vibrate(this.hapticPatterns[type] || [10]);
    }
  }
}

// 글로벌 노출
window.AutoMode = AutoMode;
