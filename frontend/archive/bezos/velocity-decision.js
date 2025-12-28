/**
 * AUTUS × Bezos: High-Velocity Decision Making
 * "Most decisions should be made with around 70% of the information you wish you had."
 */

class VelocityDecisionEngine {
  constructor() {
    this.informationThreshold = 0.7; // 베조스의 70%
    this.waitingCostPerHour = 10000; // 기본 대기 비용 (원)
    this.decisionStartTime = null;
    this.history = [];
  }

  /**
   * 정보 수준 평가 및 결정 권장
   * @param {Object} params - { informationLevel, hourlyLoss, urgency, riskTolerance }
   */
  evaluate(params) {
    const {
      informationLevel = 0.5,  // 현재 정보 수준 (0~1)
      hourlyLoss = this.waitingCostPerHour,  // 시간당 손실
      urgency = 0.5,           // 긴급성 (0~1)
      riskTolerance = 0.5      // 리스크 허용도 (0~1)
    } = params;
    
    // 동적 임계값 (긴급성과 리스크 허용도에 따라 조정)
    const adjustedThreshold = this.informationThreshold - (urgency * 0.1) + ((1 - riskTolerance) * 0.1);
    
    const isReadyToDecide = informationLevel >= adjustedThreshold;
    const waitingCost = this.calculateWaitingCost(informationLevel, hourlyLoss, urgency);
    const infoGap = Math.max(0, adjustedThreshold - informationLevel);
    
    // 정보 획득 예상 시간 (역설: 정보가 부족할수록 오래 걸림)
    const estimatedTimeToThreshold = infoGap > 0 
      ? Math.ceil(infoGap * 24) // 10%당 약 2.4시간
      : 0;
    
    // 대기 시 총 예상 손실
    const totalWaitingLoss = waitingCost * estimatedTimeToThreshold;
    
    return {
      informationLevel: Math.round(informationLevel * 100),
      threshold: Math.round(adjustedThreshold * 100),
      isReady: isReadyToDecide,
      
      // 대기 비용
      waitingCostPerHour: Math.round(waitingCost),
      estimatedWaitHours: estimatedTimeToThreshold,
      totalWaitingLoss: Math.round(totalWaitingLoss),
      
      // 권장 사항
      recommendation: isReadyToDecide ? 'DECIDE_NOW' : 'GATHER_MORE',
      confidenceBoost: isReadyToDecide 
        ? `현재 ${Math.round(informationLevel * 100)}%로 충분합니다`
        : `${Math.round(infoGap * 100)}% 더 필요 (예상 ${estimatedTimeToThreshold}시간)`,
      
      // 메시지
      message: this.getMessage(isReadyToDecide, informationLevel, waitingCost),
      
      // 베조스 명언
      bezosQuote: this.getQuote(isReadyToDecide),
      
      // 의사결정 매트릭스
      matrix: {
        speed: isReadyToDecide ? 'FAST' : 'SLOW',
        accuracy: informationLevel > 0.8 ? 'HIGH' : informationLevel > 0.5 ? 'MEDIUM' : 'LOW',
        cost: totalWaitingLoss > hourlyLoss * 8 ? 'HIGH' : 'LOW'
      }
    };
  }

  calculateWaitingCost(infoLevel, hourlyLoss, urgency) {
    // 정보가 부족할수록 대기 비용 증가 (역설적으로)
    // 긴급할수록 대기 비용 증가
    const infoGapPenalty = 1 + (1 - infoLevel);
    const urgencyPenalty = 1 + (urgency * 0.5);
    return Math.round(hourlyLoss * infoGapPenalty * urgencyPenalty);
  }

  getMessage(isReady, infoLevel, waitingCost) {
    if (isReady) {
      return `✓ 정보 ${Math.round(infoLevel * 100)}% - 결정 가능. 더 기다리면 손해!`;
    }
    return `정보 ${Math.round(infoLevel * 100)}% - 대기 비용 ₩${waitingCost.toLocaleString()}/hour`;
  }

  getQuote(isReady) {
    if (isReady) {
      return '"Most decisions should be made with around 70% of the information you wish you had. If you wait for 90%, you\'re probably being slow." - Jeff Bezos';
    }
    return '"Waiting for perfect information is a trap. Speed matters in business." - Jeff Bezos';
  }

  /**
   * 결정 타이머 시작
   */
  startDecisionTimer() {
    this.decisionStartTime = Date.now();
  }

  /**
   * 결정 타이머 종료 및 기록
   */
  endDecisionTimer(decision) {
    if (!this.decisionStartTime) return null;
    
    const duration = Date.now() - this.decisionStartTime;
    const record = {
      startTime: this.decisionStartTime,
      endTime: Date.now(),
      durationMs: duration,
      durationMinutes: Math.round(duration / 60000),
      decision
    };
    
    this.history.push(record);
    this.decisionStartTime = null;
    
    return record;
  }

  /**
   * 결정 속도 통계
   */
  getVelocityStats() {
    if (this.history.length === 0) {
      return { avgMinutes: 0, count: 0 };
    }
    
    const totalMinutes = this.history.reduce((sum, h) => sum + h.durationMinutes, 0);
    const avgMinutes = Math.round(totalMinutes / this.history.length);
    
    // 최근 10개 결정의 속도 트렌드
    const recent = this.history.slice(-10);
    const recentAvg = recent.reduce((sum, h) => sum + h.durationMinutes, 0) / recent.length;
    const older = this.history.slice(-20, -10);
    const olderAvg = older.length > 0 
      ? older.reduce((sum, h) => sum + h.durationMinutes, 0) / older.length
      : recentAvg;
    
    const trend = recentAvg < olderAvg ? 'FASTER' : recentAvg > olderAvg ? 'SLOWER' : 'STABLE';
    
    return {
      avgMinutes,
      count: this.history.length,
      trend,
      trendMessage: {
        'FASTER': '✓ 결정 속도 향상 중',
        'SLOWER': '⚠️ 결정 속도 저하 중',
        'STABLE': '→ 결정 속도 안정'
      }[trend]
    };
  }

  /**
   * UI 업데이트
   */
  updateUI(evaluation) {
    // 정보 레벨
    document.querySelectorAll('[data-autus="info_level"]').forEach(el => {
      el.textContent = evaluation.informationLevel;
    });
    
    // 임계값
    document.querySelectorAll('[data-autus="info_threshold"]').forEach(el => {
      el.textContent = evaluation.threshold;
    });
    
    // 대기 비용
    document.querySelectorAll('[data-autus="waiting_cost"]').forEach(el => {
      el.textContent = `₩${evaluation.waitingCostPerHour.toLocaleString()}/hr`;
    });
    
    // 권장 사항
    document.querySelectorAll('[data-autus="velocity_recommendation"]').forEach(el => {
      el.textContent = evaluation.recommendation === 'DECIDE_NOW' ? '지금 결정!' : '정보 수집 중';
      el.className = evaluation.recommendation === 'DECIDE_NOW' ? 'ready' : 'waiting';
    });
    
    // 게이지
    document.querySelectorAll('[data-autus-gauge="info_level"]').forEach(el => {
      el.style.width = `${evaluation.informationLevel}%`;
      el.style.background = evaluation.isReady ? '#00e5cc' : '#ffaa00';
    });
  }

  /**
   * WebSocket 연동 (Physics 데이터에서 정보 레벨 추론)
   */
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', (data) => {
        // Flow = 정보 흐름, Entropy = 불확실성
        const informationLevel = Math.max(0.3, Math.min(0.95,
          ((data.flow || 50) / 100) * 0.6 + 
          (1 - (data.entropy || 30) / 100) * 0.4
        ));
        
        const evaluation = this.evaluate({
          informationLevel,
          hourlyLoss: data.loss_rate || this.waitingCostPerHour,
          urgency: (data.pressure || 30) / 100
        });
        
        this.updateUI(evaluation);
      });
    }
  }
}

// 글로벌 노출
window.VelocityDecisionEngine = VelocityDecisionEngine;
