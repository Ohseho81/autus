/**
 * AUTUS × Bezos: Day 1 Mentality Monitor
 * "Day 2 is stasis. Followed by irrelevance. Followed by painful decline. Followed by death."
 */

class DayOneMonitor {
  constructor() {
    this.entropyHistory = [];
    this.decisionVelocityHistory = [];
    this.processComplexityHistory = [];
    this.customerFocusHistory = [];
    
    this.maxHistoryDays = 7;
    this.checkInterval = null;
  }

  /**
   * 데이터 업데이트
   */
  update(metrics) {
    const now = Date.now();
    const weekAgo = now - this.maxHistoryDays * 24 * 60 * 60 * 1000;
    
    // 엔트로피 (복잡성)
    if (metrics.entropy !== undefined) {
      this.entropyHistory.push({ value: metrics.entropy, time: now });
      this.entropyHistory = this.entropyHistory.filter(e => e.time > weekAgo);
    }
    
    // 결정 속도
    if (metrics.decisionVelocity !== undefined) {
      this.decisionVelocityHistory.push({ value: metrics.decisionVelocity, time: now });
      this.decisionVelocityHistory = this.decisionVelocityHistory.filter(e => e.time > weekAgo);
    }
    
    // 프로세스 복잡성
    if (metrics.processComplexity !== undefined) {
      this.processComplexityHistory.push({ value: metrics.processComplexity, time: now });
      this.processComplexityHistory = this.processComplexityHistory.filter(e => e.time > weekAgo);
    }
    
    // 고객 포커스
    if (metrics.customerFocus !== undefined) {
      this.customerFocusHistory.push({ value: metrics.customerFocus, time: now });
      this.customerFocusHistory = this.customerFocusHistory.filter(e => e.time > weekAgo);
    }
  }

  /**
   * Day 1/2 진단
   */
  diagnose() {
    if (this.entropyHistory.length < 2) {
      return {
        status: 'INSUFFICIENT_DATA',
        message: '데이터 수집 중...',
        daysTracked: 0
      };
    }
    
    const entropyTrend = this.calculateTrend(this.entropyHistory);
    const velocityTrend = this.calculateTrend(this.decisionVelocityHistory);
    const complexityTrend = this.calculateTrend(this.processComplexityHistory);
    const customerTrend = this.calculateTrend(this.customerFocusHistory);
    
    // Day 2 징후 점수 계산
    let day2Score = 0;
    const symptoms = [];
    
    // 엔트로피 상승 = 관료화
    if (entropyTrend > 0.05) {
      day2Score += 25;
      symptoms.push({ name: '복잡성 증가', severity: 'warning', trend: '+' + (entropyTrend * 100).toFixed(1) + '%' });
    }
    
    // 결정 속도 하락 = 정체
    if (velocityTrend < -0.05) {
      day2Score += 25;
      symptoms.push({ name: '결정 속도 저하', severity: 'warning', trend: (velocityTrend * 100).toFixed(1) + '%' });
    }
    
    // 프로세스 복잡성 증가
    if (complexityTrend > 0.05) {
      day2Score += 25;
      symptoms.push({ name: '프로세스 비대화', severity: 'warning', trend: '+' + (complexityTrend * 100).toFixed(1) + '%' });
    }
    
    // 고객 포커스 감소
    if (customerTrend < -0.05) {
      day2Score += 25;
      symptoms.push({ name: '고객 관심 감소', severity: 'critical', trend: (customerTrend * 100).toFixed(1) + '%' });
    }
    
    const status = day2Score >= 50 ? 'DAY_2_WARNING' : day2Score >= 25 ? 'DAY_1_CAUTION' : 'DAY_1';
    
    return {
      status,
      day2Score,
      trends: {
        entropy: entropyTrend,
        velocity: velocityTrend,
        complexity: complexityTrend,
        customerFocus: customerTrend
      },
      symptoms,
      message: this.getMessage(status, day2Score),
      recommendations: this.getRecommendations(status, symptoms),
      bezosQuote: this.getQuote(status),
      healthScore: Math.max(0, 100 - day2Score)
    };
  }

  calculateTrend(history) {
    if (history.length < 2) return 0;
    
    const midpoint = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, midpoint);
    const secondHalf = history.slice(midpoint);
    
    const avgFirst = firstHalf.reduce((a, b) => a + b.value, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b.value, 0) / secondHalf.length;
    
    return (avgSecond - avgFirst) / Math.max(avgFirst, 0.01);
  }

  getMessage(status, score) {
    switch (status) {
      case 'DAY_2_WARNING':
        return `⚠️ Day 2 경고 (위험도 ${score}%): 관료화 징후 감지`;
      case 'DAY_1_CAUTION':
        return `⚡ Day 1 주의 (위험도 ${score}%): 일부 징후 감지`;
      default:
        return `✓ Day 1 유지 (건강도 ${100 - score}%): 민첩성 양호`;
    }
  }

  getRecommendations(status, symptoms) {
    const baseRecs = [];
    
    if (status === 'DAY_2_WARNING' || status === 'DAY_1_CAUTION') {
      baseRecs.push(
        { action: '불필요한 프로세스 1개 삭제', priority: 'high', icon: '🗑️' },
        { action: '오늘 1개 결정 즉시 실행', priority: 'high', icon: '⚡' },
        { action: '고객 피드백 직접 확인', priority: 'medium', icon: '👥' }
      );
      
      if (symptoms.some(s => s.name === '결정 속도 저하')) {
        baseRecs.push({ action: '다음 결정 시간 제한 설정 (30분)', priority: 'high', icon: '⏱️' });
      }
      
      if (symptoms.some(s => s.name === '프로세스 비대화')) {
        baseRecs.push({ action: '승인 단계 1개 제거', priority: 'medium', icon: '📝' });
      }
    }
    
    return baseRecs;
  }

  getQuote(status) {
    const quotes = {
      'DAY_2_WARNING': '"Day 2 is stasis. Followed by irrelevance. Followed by excruciating, painful decline. Followed by death."',
      'DAY_1_CAUTION': '"Staying in Day 1 requires you to experiment patiently, accept failures, plant seeds, protect saplings."',
      'DAY_1': '"It\'s always Day 1." - Jeff Bezos'
    };
    return quotes[status] || quotes['DAY_1'];
  }

  /**
   * UI 업데이트
   */
  updateUI(diagnosis) {
    // Day 상태 배지
    document.querySelectorAll('[data-autus="day_status"]').forEach(el => {
      el.textContent = diagnosis.status.replace('_', ' ');
      el.className = `day-status ${diagnosis.status.toLowerCase()}`;
    });
    
    // 건강도 게이지
    document.querySelectorAll('[data-autus="day1_health"]').forEach(el => {
      el.textContent = diagnosis.healthScore;
    });
    
    // 메시지
    document.querySelectorAll('[data-autus="day_message"]').forEach(el => {
      el.textContent = diagnosis.message;
    });
  }

  /**
   * WebSocket 연동
   */
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', (data) => {
        this.update({
          entropy: data.entropy,
          decisionVelocity: data.flow,
          processComplexity: data.pressure,
          customerFocus: 100 - (data.risk || 30)
        });
        
        const diagnosis = this.diagnose();
        this.updateUI(diagnosis);
      });
    }
  }

  /**
   * 자동 모니터링 시작
   */
  startMonitoring(intervalMs = 60000) {
    this.checkInterval = setInterval(() => {
      const diagnosis = this.diagnose();
      this.updateUI(diagnosis);
      
      // Day 2 경고 시 알림
      if (diagnosis.status === 'DAY_2_WARNING') {
        this.triggerAlert(diagnosis);
      }
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  triggerAlert(diagnosis) {
    // 진동
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
    
    // 토스트 알림
    if (window.feedbackSystem) {
      window.feedbackSystem.showToast(diagnosis.message, 'warning');
    }
    
    // 콘솔 경고
    console.warn('[Day 1 Monitor]', diagnosis);
  }
}

// 글로벌 노출
window.DayOneMonitor = DayOneMonitor;
