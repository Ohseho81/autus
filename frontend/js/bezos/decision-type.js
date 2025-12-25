/**
 * AUTUS × Bezos: Type 1 vs Type 2 Decisions
 * "Type 1 = 되돌릴 수 없는 문 / Type 2 = 되돌릴 수 있는 문"
 */

class DecisionTypeClassifier {
  constructor() {
    this.threshold = 0.7; // Type 1/2 경계
    this.history = [];
  }

  /**
   * 결정 타입 분류
   * @param {Object} decision - { irreversibility, cost, timeToReverse, stakeholders }
   * @returns {Object} - 분류 결과
   */
  classify(decision) {
    const {
      irreversibility = 0.5,  // 되돌리기 어려운 정도 (0~1)
      cost = 0.5,             // 비용 규모 (0~1)
      timeToReverse = 0.5,    // 되돌리는 데 걸리는 시간 (0~1)
      stakeholders = 0.5      // 영향받는 이해관계자 수 (0~1)
    } = decision;
    
    // 복합 점수 계산
    const compositeScore = (
      irreversibility * 0.4 +
      cost * 0.25 +
      timeToReverse * 0.2 +
      stakeholders * 0.15
    );
    
    const type = compositeScore >= this.threshold ? 1 : 2;
    
    return {
      type,
      score: Math.round(compositeScore * 100),
      label: type === 1 ? 'ONE-WAY DOOR' : 'TWO-WAY DOOR',
      icon: type === 1 ? '🚪➡️' : '🚪↔️',
      color: type === 1 ? '#ff6b4a' : '#00e5cc',
      
      // AUTO 모드 허용 여부
      autoAllowed: type === 2,
      
      // 필요한 확신도
      requiredConfidence: type === 1 ? 90 : 60,
      
      // 권장 접근법
      approach: type === 1 
        ? { 
            method: 'DELIBERATE',
            timeAllowed: 'days',
            message: '⚠️ 되돌릴 수 없는 결정 - 신중하게 분석하세요'
          }
        : {
            method: 'RAPID',
            timeAllowed: 'hours',
            message: '✓ 되돌릴 수 있음 - 빠르게 실행하고 조정하세요'
          },
      
      // 베조스 조언
      bezosAdvice: this.getBezosAdvice(type),
      
      // 세부 점수
      breakdown: {
        irreversibility: Math.round(irreversibility * 100),
        cost: Math.round(cost * 100),
        timeToReverse: Math.round(timeToReverse * 100),
        stakeholders: Math.round(stakeholders * 100)
      }
    };
  }

  getBezosAdvice(type) {
    if (type === 1) {
      return {
        quote: '"Type 1 decisions are like walking through a one-way door. They are consequential and irreversible."',
        action: '데이터 수집 → 이해관계자 협의 → 시나리오 분석 → 최종 결정',
        warning: '이 결정은 되돌리기 어렵습니다. 70% 이상의 확신이 필요합니다.'
      };
    }
    return {
      quote: '"Type 2 decisions are like two-way doors. If you\'ve made a suboptimal Type 2 decision, you can reopen the door and go back through."',
      action: '빠른 실행 → 피드백 수집 → 필요시 조정',
      encouragement: '실패해도 괜찮습니다. 빠르게 배우고 수정하세요.'
    };
  }

  /**
   * 자동 분류 (Physics 데이터 기반)
   */
  classifyFromPhysics(physicsData) {
    const { risk, entropy, pressure, pnr_days } = physicsData;
    
    return this.classify({
      irreversibility: Math.min(1, (risk || 30) / 100 + (entropy || 30) / 200),
      cost: Math.min(1, (pressure || 30) / 100),
      timeToReverse: pnr_days ? Math.min(1, 30 / pnr_days) : 0.5,
      stakeholders: 0.5 // 기본값
    });
  }

  /**
   * UI 업데이트
   */
  updateUI(result) {
    // 도어 타입 배지
    const badge = document.querySelector('.decision-type-badge');
    if (badge) {
      badge.style.borderColor = result.color;
      badge.querySelector('.door-icon')?.textContent = result.icon;
      badge.querySelector('.type-label')?.textContent = result.label;
    }
    
    // data-autus 업데이트
    document.querySelectorAll('[data-autus="door_type"]').forEach(el => {
      el.textContent = result.label;
      el.style.color = result.color;
    });
    
    document.querySelectorAll('[data-autus="door_message"]').forEach(el => {
      el.textContent = result.approach.message;
    });
  }

  /**
   * WebSocket 연동
   */
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', (data) => {
        const result = this.classifyFromPhysics(data);
        this.updateUI(result);
        this.history.push({ time: Date.now(), result });
      });
    }
  }
}

// 글로벌 노출
window.DecisionTypeClassifier = DecisionTypeClassifier;
