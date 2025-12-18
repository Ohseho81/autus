// ═══════════════════════════════════════════════════════════════
// AUTUS Choice Engine + Learning Loop 연동
// 가중치 적용 및 Confidence 계산 통합
// ═══════════════════════════════════════════════════════════════

(function() {
  // Choice Engine 확장
  const extendChoiceEngine = () => {
    if (!window.ChoiceEngine) return false;
    
    const originalDefineChoices = window.ChoiceEngine.prototype.defineChoices;
    
    window.ChoiceEngine.prototype.defineChoices = function() {
      // 원본 실행
      originalDefineChoices.call(this);
      
      // Learning Loop 가중치 적용
      if (window.learningLoop) {
        this.applyLearningWeights();
      }
      
      return this.choices;
    };
    
    window.ChoiceEngine.prototype.applyLearningWeights = function() {
      const ll = window.learningLoop;
      if (!ll) return;
      
      this.choices.forEach(choice => {
        const pattern = choice.id === 'A' ? 'safe' : 
                       choice.id === 'B' ? 'balanced' : 'fast';
        
        // 패턴 보정 계수 적용
        const modifier = ll.getPatternModifier(pattern);
        
        // Confidence 재계산
        choice.confidence = ll.calculateConfidence(this.state) * modifier;
        
        // Delta 보정 (가중치 반영)
        if (choice.delta) {
          Object.keys(choice.delta).forEach(key => {
            const weight = ll.weights[key] || 1.0;
            if (choice.delta[key]) {
              ['now', 'h1', 'h24', 'd7'].forEach(tf => {
                if (choice.delta[key][tf] !== undefined) {
                  // 가중치가 1보다 크면 효과 증폭, 작으면 감소
                  choice.delta[key][tf] *= weight;
                }
              });
            }
          });
        }
      });
      
      // 재정렬
      this.rankChoices();
    };
    
    window.ChoiceEngine.prototype.setWeights = function(weights) {
      // Learning Loop에서 호출
      this.learningWeights = weights;
    };
    
    return true;
  };

  // Causality Engine 확장 - LOCK 시 학습 데이터 전달
  const extendCausalityEngine = () => {
    if (!window.CausalityEngine) return false;
    
    const originalRecordChoice = window.CausalityEngine.prototype.recordChoice;
    
    if (originalRecordChoice) {
      window.CausalityEngine.prototype.recordChoice = function(choiceId, choiceData, currentState) {
        const entry = originalRecordChoice.call(this, choiceId, choiceData, currentState);
        
        // Learning Loop에 알림
        if (window.learningLoop && entry) {
          console.log('[AUTUS] Choice recorded for learning:', choiceId);
        }
        
        return entry;
      };
    }
    
    return true;
  };

  // Phantom Orbit 연동 - 학습된 가중치로 시각화 조정
  const extendPhantomOrbit = () => {
    if (!window.PhantomOrbitEngine) return false;
    
    const originalMapPhysicsToVisual = window.PhantomOrbitEngine.prototype.mapPhysicsToVisual;
    
    if (originalMapPhysicsToVisual) {
      window.PhantomOrbitEngine.prototype.mapPhysicsToVisual = function(phantom, affectedPlanet) {
        const visual = originalMapPhysicsToVisual.call(this, phantom, affectedPlanet);
        
        // Learning Loop 가중치로 노이즈 조정
        if (window.learningLoop) {
          const weights = window.learningLoop.weights;
          
          // 학습이 진행될수록 노이즈 감소 (예측 정확도 향상 체감)
          const avgWeight = (weights.recovery + weights.friction + weights.shock) / 3;
          const stabilityFactor = Math.abs(avgWeight - 1.0);
          
          // 가중치가 1에서 멀어질수록 = 학습이 진행됨 = 노이즈 감소
          visual.noise *= Math.max(0.3, 1 - stabilityFactor * 2);
        }
        
        return visual;
      };
    }
    
    return true;
  };

  // CausalityLog 연동 - Entry 추가 시 이벤트 발생
  const extendCausalityLog = () => {
    if (!window.CausalityLog) return false;
    
    const originalAddEntry = window.CausalityLog.prototype.addEntry;
    
    if (originalAddEntry) {
      window.CausalityLog.prototype.addEntry = function(entry) {
        originalAddEntry.call(this, entry);
        
        // Learning Loop에 이벤트 전달
        if (entry.type === 'lock') {
          window.dispatchEvent(new CustomEvent('causality:entry-added', {
            detail: entry
          }));
        }
      };
    }
    
    return true;
  };

  // 초기화
  const init = () => {
    let extended = 0;
    
    if (extendChoiceEngine()) extended++;
    if (extendCausalityEngine()) extended++;
    if (extendPhantomOrbit()) extended++;
    if (extendCausalityLog()) extended++;
    
    console.log(`[AUTUS] Learning Loop integration loaded (${extended} extensions)`);
  };

  // DOM 로드 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(init, 2500);
    });
  } else {
    setTimeout(init, 2500);
  }
})();
