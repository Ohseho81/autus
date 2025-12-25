/**
 * AUTUS × Bezos: Working Backwards (PR/FAQ)
 * "고객 프레스 릴리스를 먼저 쓰고, 거꾸로 제품을 만든다"
 */

class WorkingBackwards {
  constructor() {
    this.futurePR = null;
    this.milestones = [];
    this.userName = 'You';
  }

  /**
   * 미래 보도자료 생성
   * @param {Object} params - { goal, targetDate, userName, metrics }
   */
  generateFuturePR(params) {
    const {
      goal = '목표 달성',
      targetDate = this.getDefaultTargetDate(),
      userName = this.userName,
      metrics = {}
    } = params;
    
    const target = new Date(targetDate);
    const formattedDate = target.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    this.futurePR = {
      targetDate: target,
      headline: `${formattedDate}: ${userName}, ${goal}`,
      subheadline: 'AUTUS 기반 결정 물리학으로 목표 실현',
      body: this.generatePRBody(goal, userName, metrics),
      quote: `"매일의 작은 결정들이 이 순간을 만들었습니다." - ${userName}`,
      metrics,
      createdAt: Date.now()
    };
    
    this.milestones = this.generateMilestones(target);
    
    return {
      futurePR: this.futurePR,
      milestones: this.milestones,
      path: this.reverseEngineerPath()
    };
  }

  getDefaultTargetDate() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }

  generatePRBody(goal, userName, metrics) {
    return `
${userName}은(는) 오늘 ${goal}을(를) 공식 발표했습니다.

"이 성과는 하루아침에 이루어진 것이 아닙니다," ${userName}은(는) 말했습니다. 
"AUTUS의 결정 물리학 프레임워크를 통해 매일 작은 결정들을 최적화했고, 
그 결정들이 누적되어 오늘의 결과를 만들었습니다."

주요 성과:
• 총 결정 횟수: ${metrics.totalDecisions || '수천 회'}
• 평균 결정 속도: ${metrics.avgDecisionTime || '3분 이내'}
• 플라이휠 모멘텀: ${metrics.flywheelMomentum || '95%'}
• Day 1 유지율: ${metrics.day1Rate || '98%'}

"80살의 나는 이 결정을 후회하지 않을 것입니다." 
이것이 ${userName}이(가) 매 결정마다 자신에게 던진 질문이었습니다.
    `.trim();
  }

  generateMilestones(targetDate) {
    const today = new Date();
    const daysRemaining = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    // 4분기로 나누기
    const quarterDays = Math.floor(daysRemaining / 4);
    const milestones = [];
    
    for (let i = 1; i <= 4; i++) {
      const milestoneDate = new Date(today);
      milestoneDate.setDate(milestoneDate.getDate() + quarterDays * i);
      
      milestones.push({
        quarter: `Q${i}`,
        date: milestoneDate,
        daysFromNow: quarterDays * i,
        progress: i * 25,
        checkpoint: `${i * 25}% 달성`,
        status: 'pending',
        requiredVelocity: this.calculateRequiredVelocity(i, daysRemaining)
      });
    }
    
    return milestones;
  }

  calculateRequiredVelocity(quarter, totalDays) {
    // 각 분기에 필요한 결정 속도
    const baseVelocity = 100 / totalDays; // 하루당 필요 진행률
    const accelerationFactor = 1 + (quarter - 1) * 0.1; // 후반으로 갈수록 가속
    return Math.round(baseVelocity * accelerationFactor * 100) / 100;
  }

  /**
   * 역산 경로 생성
   */
  reverseEngineerPath() {
    if (!this.futurePR) return null;
    
    const today = new Date();
    const targetDate = this.futurePR.targetDate;
    const daysRemaining = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    // 일일 목표
    const dailyDecisionBudget = Math.ceil(100 / daysRemaining);
    
    // 주간 마일스톤
    const weeklyMilestones = [];
    const weeksRemaining = Math.ceil(daysRemaining / 7);
    
    for (let w = 1; w <= Math.min(weeksRemaining, 12); w++) {
      weeklyMilestones.push({
        week: w,
        targetProgress: Math.round((w / weeksRemaining) * 100),
        focus: this.getWeeklyFocus(w, weeksRemaining)
      });
    }
    
    return {
      totalDays: daysRemaining,
      weeksRemaining,
      dailyDecisionBudget,
      weeklyMilestones,
      criticalPath: this.identifyCriticalPath(daysRemaining),
      nextAction: this.getNextAction()
    };
  }

  getWeeklyFocus(week, totalWeeks) {
    const phase = week / totalWeeks;
    
    if (phase < 0.25) return '기반 구축 & 데이터 수집';
    if (phase < 0.5) return '실험 & 빠른 반복';
    if (phase < 0.75) return '확장 & 최적화';
    return '마무리 & 안정화';
  }

  identifyCriticalPath(daysRemaining) {
    // 위험 요소 식별
    const risks = [];
    
    if (daysRemaining < 30) {
      risks.push({ type: 'TIME', message: '시간 부족 - 속도 우선', severity: 'high' });
    }
    if (daysRemaining > 365) {
      risks.push({ type: 'MOMENTUM', message: '장기 목표 - 모멘텀 유지 필수', severity: 'medium' });
    }
    
    return {
      risks,
      keyDecisions: [
        '매일 최소 1개 결정 실행',
        '주간 진행률 점검',
        'Day 2 징후 즉시 대응'
      ]
    };
  }

  getNextAction() {
    if (!this.milestones.length) return null;
    
    const nextMilestone = this.milestones.find(m => m.status === 'pending');
    if (!nextMilestone) return { type: 'COMPLETE', message: '목표 달성!' };
    
    return {
      type: 'MILESTONE',
      target: nextMilestone.checkpoint,
      daysLeft: nextMilestone.daysFromNow,
      message: `다음 목표: ${nextMilestone.checkpoint} (D-${nextMilestone.daysFromNow})`
    };
  }

  /**
   * 마일스톤 완료 처리
   */
  completeMilestone(quarterIndex) {
    if (this.milestones[quarterIndex]) {
      this.milestones[quarterIndex].status = 'completed';
      this.milestones[quarterIndex].completedAt = Date.now();
    }
  }

  /**
   * UI 업데이트
   */
  updateUI() {
    if (!this.futurePR) return;
    
    const path = this.reverseEngineerPath();
    
    // 목표 헤드라인
    document.querySelectorAll('[data-autus="goal_headline"]').forEach(el => {
      el.textContent = this.futurePR.headline;
    });
    
    // 목표 날짜
    document.querySelectorAll('[data-autus="target_date"]').forEach(el => {
      el.textContent = this.futurePR.targetDate.toLocaleDateString('ko-KR');
    });
    
    // 남은 일수
    document.querySelectorAll('[data-autus="days_remaining"]').forEach(el => {
      el.textContent = path.totalDays;
    });
    
    // 일일 결정 예산
    document.querySelectorAll('[data-autus="daily_budget"]').forEach(el => {
      el.textContent = `${path.dailyDecisionBudget}% / 일`;
    });
    
    // 다음 액션
    const nextAction = this.getNextAction();
    document.querySelectorAll('[data-autus="next_milestone"]').forEach(el => {
      el.textContent = nextAction.message;
    });
  }

  /**
   * PR 카드 HTML 생성
   */
  renderPRCard() {
    if (!this.futurePR) return '';
    
    const path = this.reverseEngineerPath();
    
    return `
      <div class="future-pr-card">
        <div class="pr-badge">FUTURE PRESS RELEASE</div>
        <div class="pr-date">${this.futurePR.targetDate.toLocaleDateString('ko-KR')}</div>
        <h2 class="pr-headline">${this.futurePR.headline}</h2>
        <p class="pr-subheadline">${this.futurePR.subheadline}</p>
        <blockquote class="pr-quote">${this.futurePR.quote}</blockquote>
        <div class="countdown">
          <span class="label">D-</span>
          <span class="value">${path.totalDays}</span>
        </div>
        <div class="daily-target">
          일일 목표: ${path.dailyDecisionBudget}% 진행
        </div>
      </div>
    `;
  }
}

// 글로벌 노출
window.WorkingBackwards = WorkingBackwards;
