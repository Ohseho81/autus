// ═══════════════════════════════════════════════════════════════
// AUTUS Choice Learning Loop v1.0
// "AUTUS는 기억하지 않고 진화한다"
// 로그 없이, 물리 가중치만 미세 조정
// ═══════════════════════════════════════════════════════════════

class LearningLoop {
  constructor() {
    // ─────────────────────────────────────────────────────────
    // 학습 파라미터 (LOCK)
    // ─────────────────────────────────────────────────────────
    this.config = {
      // 학습률
      alpha: 0.02,
      
      // 오차 캡 (급격한 변화 방지)
      errorCap: 0.10,
      
      // 가중치 범위 (±15%)
      weightMin: 0.85,
      weightMax: 1.15,
      
      // 실패 판정 임계치
      thresholds: {
        risk: 0.08,
        entropy: 0.08,
        critical: 0.05  // Gate CRITICAL 시
      },
      
      // 검증 주기 (ms)
      verificationDelay: 10 * 60 * 1000, // 10분
      
      // Confidence 조정 범위
      confidenceAdjust: {
        failurePenalty: -0.03,    // 실패 시 -3%
        successBonus: 0.01,       // 성공 시 +1%
        maxPenalty: -0.05,        // 최대 -5%
        maxBonus: 0.02            // 최대 +2%
      }
    };

    // ─────────────────────────────────────────────────────────
    // Physics Kernel 가중치 (조정 대상)
    // ─────────────────────────────────────────────────────────
    this.weights = this.loadWeights() || {
      // Law Sensitivity Weights
      recovery: 1.0,
      friction: 1.0,
      shock: 1.0,
      entropy: 1.0,
      pressure: 1.0,
      stability: 1.0,
      
      // Confidence 산식 계수
      conf_entropy: 0.35,
      conf_risk: 0.35,
      conf_pressure: 0.15,
      conf_shock: 0.15,
      
      // Choice 패턴별 보정
      pattern_safe: 1.0,      // A: Safe Path
      pattern_balanced: 1.0,  // B: Balanced Trade
      pattern_fast: 1.0       // C: Fast/Hard
    };

    // ─────────────────────────────────────────────────────────
    // 연속 성공/실패 카운터 (메모리 없이 세션 내 임시)
    // ─────────────────────────────────────────────────────────
    this.sessionStats = {
      consecutiveSuccess: 0,
      consecutiveFailure: 0,
      lastChoicePattern: null
    };

    this.pendingVerifications = new Map();
    this.init();
  }

  init() {
    this.bindEvents();
    this.startVerificationLoop();
    console.log('[AUTUS Learning] Loop initialized');
  }

  // ─────────────────────────────────────────────────────────────
  // 이벤트 바인딩
  // ─────────────────────────────────────────────────────────────
  bindEvents() {
    // Choice LOCK 시 검증 예약
    window.addEventListener('causality:entry-added', (e) => {
      if (e.detail) {
        this.scheduleVerification(e.detail);
      }
    });

    // 검증 완료 시 학습
    window.addEventListener('causality:entry-verified', (e) => {
      if (e.detail) {
        this.onVerificationComplete(e.detail);
      }
    });

    // Causality Log LOCK 감지
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('card-lock-btn')) {
        const card = e.target.closest('.choice-card');
        if (card) {
          setTimeout(() => {
            this.onChoiceLocked(card.dataset.choiceId);
          }, 100);
        }
      }
    });
  }

  onChoiceLocked(choiceId) {
    const entry = {
      id: Date.now(),
      choiceId,
      stateBefore: this.getCurrentState(),
      prediction: this.getPrediction(choiceId),
      timestamp: Date.now()
    };
    
    this.scheduleVerification(entry);
    console.log('[AUTUS Learning] Choice locked, verification scheduled:', choiceId);
  }

  getPrediction(choiceId) {
    if (window.choiceEngine?.choices) {
      const choice = window.choiceEngine.choices.find(c => c.id === choiceId);
      return choice ? { delta: choice.delta, confidence: choice.confidence } : {};
    }
    return {};
  }

  // ─────────────────────────────────────────────────────────────
  // 검증 예약
  // ─────────────────────────────────────────────────────────────
  scheduleVerification(entry) {
    const verifyAt = Date.now() + this.config.verificationDelay;
    
    this.pendingVerifications.set(entry.id, {
      entry,
      verifyAt,
      stateBefore: entry.stateBefore || this.getCurrentState(),
      prediction: entry.prediction || {},
      choicePattern: this.getChoicePattern(entry.choiceId)
    });
  }

  getChoicePattern(choiceId) {
    const patterns = { 'A': 'safe', 'B': 'balanced', 'C': 'fast' };
    return patterns[choiceId] || 'balanced';
  }

  // ─────────────────────────────────────────────────────────────
  // 주기적 검증 루프
  // ─────────────────────────────────────────────────────────────
  startVerificationLoop() {
    setInterval(() => {
      const now = Date.now();
      
      this.pendingVerifications.forEach((pending, entryId) => {
        if (now >= pending.verifyAt) {
          this.verify(pending);
          this.pendingVerifications.delete(entryId);
        }
      });
    }, 60000); // 1분마다 체크
  }

  // ─────────────────────────────────────────────────────────────
  // 검증 실행
  // ─────────────────────────────────────────────────────────────
  verify(pending) {
    const actualState = this.getCurrentState();
    const error = this.calculateError(pending.prediction, actualState, pending.stateBefore);
    const isFailure = this.isFailure(error);
    
    if (isFailure) {
      this.onFailure(error, pending.choicePattern);
    } else {
      this.onSuccess(pending.choicePattern);
    }
    
    console.log('[AUTUS Learning] Verification complete:', {
      pattern: pending.choicePattern,
      isFailure,
      error: this.summarizeError(error)
    });
  }

  onVerificationComplete(data) {
    const { entry, timeframe } = data;
    
    // h1 검증 시에만 학습 (가장 빠른 피드백)
    if (timeframe === 'h1' && entry.accuracy?.h1 !== null) {
      const accuracy = entry.accuracy.h1;
      const pattern = this.getChoicePattern(entry.choiceId);
      
      if (accuracy < 70) {
        this.onFailure(this.estimateError(entry), pattern);
      } else if (accuracy >= 85) {
        this.onSuccess(pattern);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 오차 계산
  // ─────────────────────────────────────────────────────────────
  calculateError(prediction, actual, before) {
    const error = {};
    const metrics = ['recovery', 'risk', 'entropy', 'friction', 'shock', 'stability'];
    
    metrics.forEach(metric => {
      const predictedDelta = (prediction.h1?.[metric] || prediction[metric]?.h1 || 0) - (before[metric] || 0);
      const actualDelta = (actual[metric] || 0) - (before[metric] || 0);
      
      // 예측값이 있는 경우만 오차 계산
      if (prediction.delta?.[metric]) {
        const forecastDelta = prediction.delta[metric].h1 || prediction.delta[metric].now || 0;
        error[metric] = actualDelta - forecastDelta;
      } else {
        error[metric] = actualDelta - predictedDelta;
      }
    });
    
    return error;
  }

  estimateError(entry) {
    const error = {};
    const before = entry.stateBefore || {};
    const actual = entry.actual?.h1 || {};
    const predicted = entry.prediction?.delta || {};
    
    Object.keys(predicted).forEach(metric => {
      const forecastDelta = predicted[metric]?.h1 || predicted[metric]?.now || 0;
      const actualDelta = (actual[metric] || before[metric] || 0) - (before[metric] || 0);
      error[metric] = actualDelta - forecastDelta;
    });
    
    return error;
  }

  // ─────────────────────────────────────────────────────────────
  // 실패 판정
  // ─────────────────────────────────────────────────────────────
  isFailure(error) {
    const gate = this.getGate();
    const threshold = gate === 'RED' ? this.config.thresholds.critical : this.config.thresholds.risk;
    
    // 실패 조건 (1개라도 만족 시)
    if (Math.abs(error.risk || 0) > threshold) return true;
    if (Math.abs(error.entropy || 0) > this.config.thresholds.entropy) return true;
    
    // 병목 악화 체크
    if ((error.shock || 0) > 0.05) return true;
    if ((error.friction || 0) > 0.05) return true;
    
    return false;
  }

  getGate() {
    const gateEl = document.getElementById('gate-badge');
    if (gateEl) {
      if (gateEl.textContent.includes('RED')) return 'RED';
      if (gateEl.textContent.includes('AMBER')) return 'AMBER';
    }
    return 'GREEN';
  }

  getCurrentState() {
    const state = {};
    
    // PhysicsFrame에서 가져오기
    if (typeof PhysicsFrame !== 'undefined' && PhysicsFrame.snapshot) {
      state.risk = PhysicsFrame.snapshot.risk;
      state.entropy = PhysicsFrame.snapshot.entropy;
      state.pressure = PhysicsFrame.snapshot.pressure;
      state.flow = PhysicsFrame.snapshot.flow;
    }

    // TwinState에서 가져오기
    if (typeof TwinState !== 'undefined') {
      state.recovery = TwinState.RECOVERY;
      state.stability = TwinState.STABILITY;
      state.shock = TwinState.SHOCK;
      state.friction = TwinState.FRICTION;
    }

    return state;
  }

  // ─────────────────────────────────────────────────────────────
  // 실패 처리 → 가중치 조정
  // ─────────────────────────────────────────────────────────────
  onFailure(error, choicePattern) {
    this.sessionStats.consecutiveSuccess = 0;
    this.sessionStats.consecutiveFailure++;
    this.sessionStats.lastChoicePattern = choicePattern;
    
    // 가중치 조정
    this.adjustWeights(error, choicePattern, 'failure');
    
    // Confidence 보정
    this.adjustConfidence('failure');
    
    // 저장
    this.saveWeights();
    
    // 디버그 (콘솔만, UI 노출 금지)
    console.log('[AUTUS Learning] Failure detected, weights adjusted:', {
      pattern: choicePattern,
      error: this.summarizeError(error)
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 성공 처리
  // ─────────────────────────────────────────────────────────────
  onSuccess(choicePattern) {
    this.sessionStats.consecutiveFailure = 0;
    this.sessionStats.consecutiveSuccess++;
    this.sessionStats.lastChoicePattern = choicePattern;
    
    // 연속 성공 3회 시 Confidence 복원
    if (this.sessionStats.consecutiveSuccess >= 3) {
      this.adjustConfidence('success');
      this.sessionStats.consecutiveSuccess = 0;
    }
    
    // 저장
    this.saveWeights();
    
    console.log('[AUTUS Learning] Success recorded:', {
      pattern: choicePattern,
      consecutiveSuccess: this.sessionStats.consecutiveSuccess
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 가중치 조정 (핵심 알고리즘)
  // ─────────────────────────────────────────────────────────────
  adjustWeights(error, choicePattern, type) {
    const alpha = this.getAdjustedAlpha();
    const cap = this.config.errorCap;
    
    // Choice 패턴별 조정 방향
    const adjustmentRules = {
      'safe': {
        // A: Safe Path 실패 → Risk/Entropy 가중 증가
        primary: ['conf_risk', 'conf_entropy'],
        secondary: ['recovery', 'stability']
      },
      'balanced': {
        // B: Balanced Trade 실패 → Trade-off 축 민감도 증가
        primary: ['friction', 'pressure'],
        secondary: ['conf_pressure']
      },
      'fast': {
        // C: Fast/Hard 실패 → Shock/Pressure 가중 증가
        primary: ['shock', 'conf_shock'],
        secondary: ['pressure', 'entropy']
      }
    };

    const rules = adjustmentRules[choicePattern] || adjustmentRules['balanced'];
    
    // Primary 가중치 조정
    rules.primary.forEach(key => {
      if (this.weights[key] !== undefined) {
        const errorMagnitude = this.getErrorMagnitude(error, key);
        const adjustment = alpha * Math.sign(errorMagnitude) * Math.min(Math.abs(errorMagnitude), cap);
        
        this.weights[key] = this.clamp(
          this.weights[key] + adjustment,
          this.config.weightMin,
          this.config.weightMax
        );
      }
    });

    // Secondary 가중치 (절반 강도)
    rules.secondary.forEach(key => {
      if (this.weights[key] !== undefined) {
        const errorMagnitude = this.getErrorMagnitude(error, key);
        const adjustment = (alpha / 2) * Math.sign(errorMagnitude) * Math.min(Math.abs(errorMagnitude), cap);
        
        this.weights[key] = this.clamp(
          this.weights[key] + adjustment,
          this.config.weightMin,
          this.config.weightMax
        );
      }
    });

    // 패턴 보정 가중치
    const patternKey = `pattern_${choicePattern}`;
    if (this.weights[patternKey] !== undefined) {
      const direction = type === 'failure' ? -1 : 1;
      this.weights[patternKey] = this.clamp(
        this.weights[patternKey] + (alpha * 0.5 * direction),
        this.config.weightMin,
        this.config.weightMax
      );
    }
  }

  getErrorMagnitude(error, key) {
    // 키에서 메트릭 추출
    const metric = key.replace('conf_', '');
    return error[metric] || 0;
  }

  getAdjustedAlpha() {
    const gate = this.getGate();
    let alpha = this.config.alpha;
    
    // Gate AMBER → 보수적 학습
    if (gate === 'AMBER') {
      alpha *= 0.8;
    }
    
    // Gate RED → 더 보수적
    if (gate === 'RED') {
      alpha *= 0.6;
    }
    
    return alpha;
  }

  // ─────────────────────────────────────────────────────────────
  // Confidence 조정
  // ─────────────────────────────────────────────────────────────
  adjustConfidence(type) {
    const adjust = this.config.confidenceAdjust;
    
    if (type === 'failure') {
      // 실패 시 전체 Confidence 계수 약간 하향
      const penalty = Math.max(adjust.failurePenalty, adjust.maxPenalty);
      
      ['conf_entropy', 'conf_risk', 'conf_pressure', 'conf_shock'].forEach(key => {
        // 계수 증가 = Confidence 감소 (역관계)
        this.weights[key] = this.clamp(
          this.weights[key] - penalty, // 빼면 conf 낮아짐
          0.1,
          0.5
        );
      });
    } else if (type === 'success') {
      // 연속 성공 시 복원
      const bonus = Math.min(adjust.successBonus, adjust.maxBonus);
      
      ['conf_entropy', 'conf_risk', 'conf_pressure', 'conf_shock'].forEach(key => {
        this.weights[key] = this.clamp(
          this.weights[key] + bonus,
          0.1,
          0.5
        );
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 가중치 적용 (Choice Engine 연동)
  // ─────────────────────────────────────────────────────────────
  applyWeights() {
    // Choice Engine에 가중치 전달
    if (window.choiceEngine) {
      window.choiceEngine.setWeights?.(this.weights);
    }
    
    // Physics Kernel에 가중치 전달
    if (window.physicsKernel) {
      window.physicsKernel.updateSensitivity?.(this.weights);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 외부 인터페이스: Confidence 계산
  // ─────────────────────────────────────────────────────────────
  calculateConfidence(state) {
    const w = this.weights;
    
    let confidence = 1 - (
      (state.entropy || 0) * w.conf_entropy +
      (state.risk || 0) * w.conf_risk +
      (state.pressure || 0) * w.conf_pressure +
      (state.shock || 0) * w.conf_shock
    );
    
    // Gate 패널티
    const gate = this.getGate();
    if (gate === 'AMBER') confidence -= 0.05;
    if (gate === 'RED') confidence -= 0.10;
    
    return this.clamp(confidence, 0, 1);
  }

  // ─────────────────────────────────────────────────────────────
  // 외부 인터페이스: 패턴별 보정 계수
  // ─────────────────────────────────────────────────────────────
  getPatternModifier(pattern) {
    const key = `pattern_${pattern}`;
    return this.weights[key] || 1.0;
  }

  // ─────────────────────────────────────────────────────────────
  // 저장/로드 (localStorage만, 서버 전송 금지)
  // ─────────────────────────────────────────────────────────────
  saveWeights() {
    try {
      localStorage.setItem('autus-kernel-weights', JSON.stringify({
        weights: this.weights,
        updatedAt: Date.now()
      }));
    } catch (e) {
      console.warn('[AUTUS Learning] Save failed:', e);
    }
    
    // 적용
    this.applyWeights();
  }

  loadWeights() {
    try {
      const data = localStorage.getItem('autus-kernel-weights');
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.weights;
      }
    } catch (e) {
      console.warn('[AUTUS Learning] Load failed:', e);
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // 유틸리티
  // ─────────────────────────────────────────────────────────────
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  summarizeError(error) {
    const summary = {};
    Object.keys(error).forEach(key => {
      if (Math.abs(error[key]) > 0.01) {
        summary[key] = (error[key] * 100).toFixed(1) + '%';
      }
    });
    return summary;
  }

  // ─────────────────────────────────────────────────────────────
  // 디버그 전용 (개발자 콘솔)
  // ─────────────────────────────────────────────────────────────
  debug() {
    console.table({
      'Recovery Weight': this.weights.recovery,
      'Friction Weight': this.weights.friction,
      'Shock Weight': this.weights.shock,
      'Entropy Weight': this.weights.entropy,
      'Pressure Weight': this.weights.pressure,
      'Conf Entropy': this.weights.conf_entropy,
      'Conf Risk': this.weights.conf_risk,
      'Pattern Safe': this.weights.pattern_safe,
      'Pattern Balanced': this.weights.pattern_balanced,
      'Pattern Fast': this.weights.pattern_fast
    });
    
    console.log('Session Stats:', this.sessionStats);
  }

  // ─────────────────────────────────────────────────────────────
  // 리셋 (개발용)
  // ─────────────────────────────────────────────────────────────
  reset() {
    localStorage.removeItem('autus-kernel-weights');
    this.weights = {
      recovery: 1.0,
      friction: 1.0,
      shock: 1.0,
      entropy: 1.0,
      pressure: 1.0,
      stability: 1.0,
      conf_entropy: 0.35,
      conf_risk: 0.35,
      conf_pressure: 0.15,
      conf_shock: 0.15,
      pattern_safe: 1.0,
      pattern_balanced: 1.0,
      pattern_fast: 1.0
    };
    this.sessionStats = {
      consecutiveSuccess: 0,
      consecutiveFailure: 0,
      lastChoicePattern: null
    };
    console.log('[AUTUS Learning] Weights reset to default');
  }
}

// 전역 인스턴스
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.learningLoop = new LearningLoop();
  }, 2000);
});

if (document.readyState === 'complete') {
  setTimeout(() => {
    if (!window.learningLoop) {
      window.learningLoop = new LearningLoop();
    }
  }, 2000);
}
