/**
 * AUTUS × Bezos: Regret Minimization Framework
 * "80살의 나는 이 결정을 후회할까?"
 */

class RegretMinimization {
  constructor() {
    this.projectionYears = 10;
    this.selfAge = 80; // 베조스 프레임워크
    this.decisionHistory = [];
  }

  /**
   * 후회 점수 계산
   * @param {Object} decision - { impact, reversibility, timeValue, urgency }
   * @returns {Object} - 후회 분석 결과
   */
  calculate(decision) {
    const { 
      impact = 0.5,           // 결정의 영향력 (0~1)
      reversibility = 0.5,    // 되돌릴 수 있는 정도 (0~1)
      timeValue = 0.5,        // 시간이 지날수록 가치 증가 (0~1)
      urgency = 0.5           // 긴급성 (0~1)
    } = decision;
    
    // 후회 점수 = (영향력 × 시간가치) / 되돌림가능성
    // 안 했을 때 후회 = 높은 영향력 + 높은 시간가치 + 낮은 되돌림가능성
    const regretIfSkip = Math.min(1, (impact * timeValue * (1 + urgency)) / Math.max(reversibility, 0.1));
    
    // 했을 때 후회 = 낮은 영향력 + 높은 리스크 (1-reversibility)
    const regretIfAct = Math.min(1, (1 - impact) * (1 - reversibility) * 0.5);
    
    const recommendation = regretIfSkip > regretIfAct ? 'ACT' : 'SKIP';
    const confidence = Math.abs(regretIfSkip - regretIfAct);
    
    // 10년 후 예측
    const futureRegretSkip = Math.min(1, regretIfSkip * (1 + this.projectionYears * 0.05));
    const futureRegretAct = Math.max(0, regretIfAct * (1 - this.projectionYears * 0.03));
    
    return {
      regretIfSkip: Math.round(regretIfSkip * 100),
      regretIfAct: Math.round(regretIfAct * 100),
      futureRegretSkip: Math.round(futureRegretSkip * 100),
      futureRegretAct: Math.round(futureRegretAct * 100),
      recommendation,
      confidence: Math.round(confidence * 100),
      message: this.generateMessage({ regretIfSkip, regretIfAct, recommendation }),
      bezosQuote: this.getQuote(recommendation)
    };
  }

  /**
   * 80세 시점 시뮬레이션 메시지
   */
  generateMessage(result) {
    if (result.recommendation === 'ACT') {
      return `80세의 당신: "그때 했어야지..." 확률 ${Math.round(result.regretIfSkip * 100)}%`;
    }
    return `80세의 당신: "안 해서 다행이야" 확률 ${Math.round((1 - result.regretIfAct) * 100)}%`;
  }

  /**
   * 베조스 명언
   */
  getQuote(recommendation) {
    if (recommendation === 'ACT') {
      return '"I knew that if I failed I wouldn\'t regret that, but I knew the one thing I might regret is not trying." - Jeff Bezos';
    }
    return '"If you\'re good at course correcting, being wrong may be less costly than you think." - Jeff Bezos';
  }

  /**
   * 결정 기록
   */
  logDecision(decision, result, actualOutcome = null) {
    this.decisionHistory.push({
      timestamp: Date.now(),
      decision,
      result,
      actualOutcome,
      predictionAccuracy: actualOutcome ? this.calculateAccuracy(result, actualOutcome) : null
    });
  }

  calculateAccuracy(prediction, actual) {
    // 예측 정확도 계산
    const predictedRegret = prediction.recommendation === 'ACT' ? prediction.regretIfAct : prediction.regretIfSkip;
    const actualRegret = actual.regretLevel || 0;
    return Math.round((1 - Math.abs(predictedRegret / 100 - actualRegret)) * 100);
  }

  /**
   * 시각화용 데이터
   */
  getVisualizationData(result) {
    return {
      skipBar: {
        value: result.regretIfSkip,
        color: result.regretIfSkip > 50 ? '#ff6b4a' : '#00e5cc',
        label: `안 하면 ${result.regretIfSkip}% 후회`
      },
      actBar: {
        value: result.regretIfAct,
        color: result.regretIfAct > 50 ? '#ff6b4a' : '#00e5cc',
        label: `하면 ${result.regretIfAct}% 후회`
      },
      recommendation: {
        text: result.recommendation === 'ACT' ? '실행하라' : '보류하라',
        confidence: result.confidence
      }
    };
  }

  /**
   * WebSocket 연동
   */
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', (data) => {
        // Risk → Impact, Flow → TimeValue
        const decision = {
          impact: Math.min(1, (data.risk || 30) / 100 + 0.3),
          reversibility: Math.max(0.1, 1 - (data.entropy || 30) / 100),
          timeValue: (data.flow || 50) / 100,
          urgency: Math.min(1, (data.pressure || 30) / 100)
        };
        
        const result = this.calculate(decision);
        this.updateUI(result);
      });
    }
  }

  updateUI(result) {
    // data-autus 속성으로 자동 업데이트
    const elements = {
      'regret_skip': result.regretIfSkip,
      'regret_act': result.regretIfAct,
      'regret_recommendation': result.recommendation,
      'regret_message': result.message
    };
    
    Object.entries(elements).forEach(([key, value]) => {
      document.querySelectorAll(`[data-autus="${key}"]`).forEach(el => {
        el.textContent = value;
      });
    });
  }
}

// 글로벌 노출
window.RegretMinimization = RegretMinimization;
