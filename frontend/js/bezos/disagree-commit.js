/**
 * AUTUS × Bezos: Disagree and Commit
 * "반대해도 된다. 하지만 결정되면 100% 헌신하라."
 */

class DisagreeAndCommit {
  constructor() {
    this.commitLockHours = 48; // 기본 48시간 재논의 금지
    this.decisions = new Map();
    this.listeners = [];
  }

  /**
   * 결정 제안
   * @param {Object} proposal - { id, title, description, options, deadline }
   */
  proposeDecision(proposal) {
    const {
      id = `decision_${Date.now()}`,
      title = '새로운 결정',
      description = '',
      options = ['찬성', '반대'],
      deadline = Date.now() + 24 * 60 * 60 * 1000 // 24시간 후
    } = proposal;
    
    const decision = {
      id,
      title,
      description,
      options,
      deadline,
      status: 'PROPOSED',
      createdAt: Date.now(),
      disagreements: [],
      votes: {},
      finalChoice: null,
      commitTime: null,
      unlockTime: null
    };
    
    this.decisions.set(id, decision);
    this.notify('proposed', decision);
    
    return {
      decision,
      message: `결정 제안됨: "${title}"`,
      instruction: '반대 의견이 있다면 지금 등록하세요. 확정 후에는 100% 헌신입니다.',
      bezosQuote: '"Have backbone; disagree and commit."'
    };
  }

  /**
   * 반대 의견 등록
   */
  addDisagreement(decisionId, disagreement) {
    const decision = this.decisions.get(decisionId);
    if (!decision) return { error: '결정을 찾을 수 없습니다' };
    
    if (decision.status !== 'PROPOSED') {
      return { error: '이미 확정된 결정입니다. 재논의 불가.' };
    }
    
    const {
      reason = '',
      alternative = null,
      severity = 'medium' // low, medium, high
    } = disagreement;
    
    decision.disagreements.push({
      reason,
      alternative,
      severity,
      timestamp: Date.now()
    });
    
    this.notify('disagreement_added', { decisionId, disagreement });
    
    return {
      success: true,
      message: '반대 의견이 등록되었습니다.',
      totalDisagreements: decision.disagreements.length,
      note: '반대 의견은 결정 전에만 가능합니다. 확정 후에는 100% 헌신!'
    };
  }

  /**
   * 투표
   */
  vote(decisionId, optionIndex, voterId = 'anonymous') {
    const decision = this.decisions.get(decisionId);
    if (!decision) return { error: '결정을 찾을 수 없습니다' };
    
    if (decision.status !== 'PROPOSED') {
      return { error: '투표 기간이 종료되었습니다' };
    }
    
    decision.votes[voterId] = optionIndex;
    this.notify('voted', { decisionId, voterId, optionIndex });
    
    return {
      success: true,
      message: `투표 완료: ${decision.options[optionIndex]}`,
      currentVotes: this.countVotes(decision)
    };
  }

  countVotes(decision) {
    const counts = {};
    decision.options.forEach((opt, i) => counts[i] = 0);
    Object.values(decision.votes).forEach(v => counts[v]++);
    return counts;
  }

  /**
   * 결정 확정 (Commit)
   */
  commit(decisionId, finalChoice = null) {
    const decision = this.decisions.get(decisionId);
    if (!decision) return { error: '결정을 찾을 수 없습니다' };
    
    if (decision.status === 'COMMITTED') {
      return { error: '이미 확정된 결정입니다' };
    }
    
    // 최종 선택 결정 (투표 결과 또는 명시적 선택)
    if (finalChoice === null) {
      const votes = this.countVotes(decision);
      const maxVotes = Math.max(...Object.values(votes));
      finalChoice = parseInt(Object.keys(votes).find(k => votes[k] === maxVotes));
    }
    
    decision.status = 'COMMITTED';
    decision.finalChoice = finalChoice;
    decision.commitTime = Date.now();
    decision.unlockTime = Date.now() + this.commitLockHours * 60 * 60 * 1000;
    
    this.notify('committed', decision);
    
    return {
      decision,
      message: `✓ 결정 확정: "${decision.title}" → ${decision.options[finalChoice]}`,
      lockPeriod: `${this.commitLockHours}시간 동안 재논의 금지`,
      unlockTime: new Date(decision.unlockTime).toLocaleString('ko-KR'),
      disagreementsRecorded: decision.disagreements.length,
      bezosQuote: '"Disagree and commit is not about being right. It\'s about moving forward together."',
      instruction: '이제 100% 헌신하세요. 반대 의견이 있었더라도 전력으로 실행합니다.'
    };
  }

  /**
   * 잠금 상태 확인
   */
  isLocked(decisionId) {
    const decision = this.decisions.get(decisionId);
    if (!decision || decision.status !== 'COMMITTED') return false;
    return Date.now() < decision.unlockTime;
  }

  /**
   * 잠금 해제까지 남은 시간
   */
  getTimeUntilUnlock(decisionId) {
    const decision = this.decisions.get(decisionId);
    if (!decision || !decision.unlockTime) return null;
    
    const remaining = decision.unlockTime - Date.now();
    if (remaining <= 0) return { hours: 0, minutes: 0, message: '재논의 가능' };
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return {
      hours,
      minutes,
      message: `재논의까지 ${hours}시간 ${minutes}분`
    };
  }

  /**
   * 결정 목록 조회
   */
  getDecisions(status = null) {
    const all = Array.from(this.decisions.values());
    if (status) {
      return all.filter(d => d.status === status);
    }
    return all;
  }

  /**
   * 이벤트 리스너
   */
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  notify(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }

  /**
   * UI 렌더링
   */
  renderDecisionCard(decision) {
    const isLocked = this.isLocked(decision.id);
    const timeInfo = this.getTimeUntilUnlock(decision.id);
    
    return `
      <div class="decision-card ${decision.status.toLowerCase()}">
        <div class="decision-header">
          <h3>${decision.title}</h3>
          <span class="status-badge ${decision.status.toLowerCase()}">${decision.status}</span>
        </div>
        
        ${decision.description ? `<p class="description">${decision.description}</p>` : ''}
        
        ${decision.status === 'PROPOSED' ? `
          <div class="options">
            ${decision.options.map((opt, i) => `
              <button class="option-btn" data-decision="${decision.id}" data-option="${i}">
                ${opt}
              </button>
            `).join('')}
          </div>
          <div class="disagreement-section">
            <button class="disagree-btn">반대 의견 등록</button>
            <span class="disagreement-count">반대: ${decision.disagreements.length}건</span>
          </div>
        ` : ''}
        
        ${decision.status === 'COMMITTED' ? `
          <div class="committed-info">
            <div class="final-choice">
              최종 결정: <strong>${decision.options[decision.finalChoice]}</strong>
            </div>
            ${isLocked ? `
              <div class="lock-info">
                🔒 ${timeInfo.message}
              </div>
            ` : `
              <div class="unlock-info">
                🔓 재논의 가능
              </div>
            `}
          </div>
        ` : ''}
        
        <div class="bezos-quote">
          "Have backbone; disagree and commit."
        </div>
      </div>
    `;
  }

  /**
   * UI 업데이트
   */
  updateUI() {
    const container = document.getElementById('decisions-container');
    if (!container) return;
    
    const decisions = this.getDecisions();
    container.innerHTML = decisions.map(d => this.renderDecisionCard(d)).join('');
    
    // 버튼 이벤트 바인딩
    container.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const decisionId = btn.dataset.decision;
        const optionIndex = parseInt(btn.dataset.option);
        this.vote(decisionId, optionIndex);
        this.updateUI();
      });
    });
  }
}

// 글로벌 노출
window.DisagreeAndCommit = DisagreeAndCommit;
