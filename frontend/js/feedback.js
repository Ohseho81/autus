/**
 * AUTUS Feedback System
 * 도파민/스트레스 피드백 + 음성 + 햅틱
 */

class FeedbackSystem {
  constructor() {
    this.decisionCount = 0;
    this.energyDelta = 0;
    this.riskDelta = 0;
    this.dailyLoss = 0;
    
    this.lastPhysicsData = null;
    this.stressThreshold = 0.7;
    this.lastAlertTime = 0;
    
    this.initElements();
    this.connectToPhysics();
  }
  
  initElements() {
    // DOM 요소 캐싱
    this.elements = {
      decisionCount: document.querySelector('[data-autus="decision_count"]'),
      energyDelta: document.querySelector('[data-autus="energy_delta"]'),
      riskDelta: document.querySelector('[data-autus="risk_delta"]'),
      dailyLoss: document.querySelector('[data-autus="daily_loss"]'),
      feedbackBar: document.querySelector('.feedback-bar')
    };
  }
  
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', (data) => {
        this.processPhysicsUpdate(data);
      });
    }
    
    // 결정 이벤트 리스닝
    document.addEventListener('autus:decision', (e) => {
      this.recordDecision(e.detail);
    });
  }
  
  processPhysicsUpdate(data) {
    const prev = this.lastPhysicsData || data;
    
    // 델타 계산
    const energyChange = (data.flow || 50) - (prev.flow || 50);
    const riskChange = (data.risk || 30) - (prev.risk || 30);
    
    // 누적
    this.energyDelta += energyChange;
    this.riskDelta += riskChange;
    
    // Daily Loss 누적
    if (data.loss_velocity) {
      this.dailyLoss += data.loss_velocity;
    }
    
    // UI 업데이트
    this.updateUI();
    
    // 스트레스 체크
    if (data.risk && data.risk / 100 > this.stressThreshold) {
      this.triggerStressAlert(data.risk / 100);
    }
    
    this.lastPhysicsData = data;
  }
  
  recordDecision(detail) {
    this.decisionCount++;
    
    // 도파민 피드백
    if (detail.action === 'RECOVER' || detail.action === 'AUTO_EXECUTE') {
      this.triggerDopamine();
    }
    
    this.updateUI();
    
    // 로그
    console.log('[Feedback] Decision recorded:', {
      count: this.decisionCount,
      action: detail.action,
      auto: detail.auto
    });
  }
  
  updateUI() {
    if (this.elements.decisionCount) {
      this.elements.decisionCount.textContent = this.decisionCount;
    }
    
    if (this.elements.energyDelta) {
      const prefix = this.energyDelta >= 0 ? '+' : '';
      this.elements.energyDelta.textContent = `${prefix}${Math.round(this.energyDelta)}`;
      this.elements.energyDelta.parentElement?.classList.toggle('positive', this.energyDelta >= 0);
      this.elements.energyDelta.parentElement?.classList.toggle('negative', this.energyDelta < 0);
    }
    
    if (this.elements.riskDelta) {
      const prefix = this.riskDelta >= 0 ? '+' : '';
      this.elements.riskDelta.textContent = `${prefix}${Math.round(this.riskDelta)}`;
      this.elements.riskDelta.parentElement?.classList.toggle('positive', this.riskDelta < 0);
      this.elements.riskDelta.parentElement?.classList.toggle('negative', this.riskDelta >= 0);
    }
    
    if (this.elements.dailyLoss) {
      this.elements.dailyLoss.textContent = `₩${Math.round(this.dailyLoss).toLocaleString()}`;
    }
  }
  
  // 도파민 피드백 (성공 시)
  triggerDopamine() {
    console.log('[Feedback] 🎉 Dopamine triggered!');
    
    // 시각 효과
    document.body.classList.add('dopamine-flash');
    setTimeout(() => {
      document.body.classList.remove('dopamine-flash');
    }, 500);
    
    // 햅틱
    this.haptic('success');
    
    // 사운드 (선택적)
    this.playSound('success');
    
    // 파티클 효과
    if (window.autusEffects) {
      window.autusEffects.pulse();
    }
  }
  
  // 스트레스 알림 (위험 시)
  triggerStressAlert(riskLevel) {
    // 쿨다운 (30초)
    const now = Date.now();
    if (now - this.lastAlertTime < 30000) return;
    this.lastAlertTime = now;
    
    console.log('[Feedback] ⚠️ Stress alert! Risk:', riskLevel);
    
    // 시각 효과
    document.body.classList.add('stress-alert');
    setTimeout(() => {
      document.body.classList.remove('stress-alert');
    }, 3000);
    
    // 햅틱
    this.haptic('warning');
    
    // 음성 알림
    if (riskLevel > 0.8) {
      this.speak('위험도가 매우 높습니다. 휴식을 권장합니다.');
    } else {
      this.speak('위험도가 상승하고 있습니다.');
    }
    
    // Three.js 효과
    if (window.autusEffects) {
      window.autusEffects.setMode('warning');
    }
    
    // 휴식 추천 토스트
    this.showToast('⚠️ 위험도 높음: 휴식이 필요합니다', 'warning');
  }
  
  // 토스트 알림
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `autus-toast autus-toast-${type}`;
    toast.textContent = message;
    
    const colors = {
      info: '#00e5cc',
      success: '#00ff88',
      warning: '#ff9900',
      error: '#ff3333'
    };
    
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      background: ${colors[type] || colors.info};
      color: ${type === 'info' || type === 'success' ? '#000' : '#fff'};
      font-weight: bold;
      font-size: 14px;
      z-index: 10000;
      animation: toastSlideDown 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastSlideUp 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // TTS
  speak(text) {
    if ('speechSynthesis' in window) {
      // 이전 발화 취소
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      speechSynthesis.speak(utterance);
    }
  }
  
  // 햅틱 피드백
  haptic(type = 'light') {
    if (!navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [30],
      heavy: [50],
      success: [30, 50, 30],
      warning: [100, 50, 100, 50, 100],
      error: [200, 100, 200, 100, 200]
    };
    
    navigator.vibrate(patterns[type] || [10]);
  }
  
  // 사운드 효과
  playSound(type) {
    // Web Audio API 사용 (간단한 비프음)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const sounds = {
        success: { freq: 880, duration: 0.1 },
        warning: { freq: 440, duration: 0.2 },
        error: { freq: 220, duration: 0.3 }
      };
      
      const sound = sounds[type] || sounds.success;
      
      oscillator.frequency.value = sound.freq;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch (e) {
      // 오디오 지원 안 됨
    }
  }
  
  // 일일 통계 리셋
  resetDaily() {
    this.decisionCount = 0;
    this.energyDelta = 0;
    this.riskDelta = 0;
    this.dailyLoss = 0;
    this.updateUI();
    console.log('[Feedback] Daily stats reset');
  }
  
  // 통계 반환
  getStats() {
    return {
      decisionCount: this.decisionCount,
      energyDelta: this.energyDelta,
      riskDelta: this.riskDelta,
      dailyLoss: this.dailyLoss,
      lastUpdate: this.lastPhysicsData?.timestamp
    };
  }
}

// CSS 애니메이션 주입
const feedbackStyles = document.createElement('style');
feedbackStyles.textContent = `
  .dopamine-flash {
    animation: dopamineFlash 0.5s ease-out;
  }
  
  @keyframes dopamineFlash {
    0% { 
      box-shadow: inset 0 0 100px rgba(0, 229, 204, 0.5);
    }
    100% { 
      box-shadow: inset 0 0 0 transparent;
    }
  }
  
  .stress-alert {
    animation: stressAlert 0.5s ease-in-out 3;
  }
  
  @keyframes stressAlert {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(255, 0, 0, 0.1); }
  }
  
  @keyframes toastSlideDown {
    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  
  @keyframes toastSlideUp {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
  }
  
  .delta.positive { color: #00ff88; }
  .delta.negative { color: #ff4444; }
`;
document.head.appendChild(feedbackStyles);

// 글로벌 노출
window.FeedbackSystem = FeedbackSystem;
