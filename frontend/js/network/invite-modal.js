/**
 * AUTUS × Thiel Edition: Invite Code Modal
 * 초대제 가입 UI
 * 
 * "Every great business is built around a secret."
 * — Peter Thiel
 */

class InviteModal {
  constructor() {
    this.modal = null;
    this.onSuccess = null;
  }

  show(onSuccess = null) {
    // 이미 인증된 창업자인지 확인
    if (localStorage.getItem('autus_founder_verified') === 'true') {
      console.log('[Invite] Already verified founder');
      return;
    }
    
    this.onSuccess = onSuccess;
    
    this.modal = document.createElement('div');
    this.modal.className = 'invite-modal';
    this.modal.innerHTML = `
      <div class="invite-backdrop"></div>
      <div class="invite-content">
        <div class="invite-header">
          <div class="invite-logo">AUTUS</div>
          <div class="invite-edition">× Thiel Edition</div>
          <h2>Founder-Only Access</h2>
          <p class="invite-subtitle">초기 1,000명 창업자 한정</p>
        </div>
        
        <div class="invite-stats">
          <div class="stat">
            <span class="stat-value" id="invite-remaining">--</span>
            <span class="stat-label">남은 슬롯</span>
          </div>
          <div class="stat">
            <span class="stat-value" id="invite-total">--</span>
            <span class="stat-label">현재 창업자</span>
          </div>
          <div class="stat">
            <span class="stat-value" id="invite-phase">--</span>
            <span class="stat-label">단계</span>
          </div>
        </div>
        
        <div class="invite-form">
          <div class="invite-input-group">
            <input type="text" 
                   id="invite-code-input" 
                   placeholder="AUTUS-XXXX-XXXX"
                   maxlength="14"
                   autocomplete="off"
                   spellcheck="false">
            <div class="input-glow"></div>
          </div>
          <button id="invite-submit" class="invite-button">
            <span class="btn-text">네트워크 진입</span>
            <span class="btn-loading" style="display:none">검증 중...</span>
          </button>
        </div>
        
        <div class="invite-error" id="invite-error"></div>
        
        <div class="thiel-quote">
          <span class="quote-text">"Competition is for losers."</span>
          <span class="quote-author">— Peter Thiel</span>
        </div>
        
        <div class="invite-footer">
          <p>초대 코드가 없으신가요?</p>
          <a href="#" id="waitlist-link">대기자 명단 등록</a>
        </div>
        
        <div class="genesis-codes" id="genesis-codes" style="display:none">
          <p class="genesis-title">🎁 Genesis Codes (테스트용)</p>
          <div class="genesis-list">
            <span class="code">AUTUS-THIE-L001</span>
            <span class="code">AUTUS-ZERO-ONE1</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    this.bindEvents();
    this.loadStats();
    
    // 입력 필드 포커스
    setTimeout(() => {
      document.getElementById('invite-code-input')?.focus();
    }, 300);
  }

  bindEvents() {
    const input = document.getElementById('invite-code-input');
    const submit = document.getElementById('invite-submit');
    
    // 자동 포맷팅 (AUTUS-XXXX-XXXX)
    input?.addEventListener('input', (e) => {
      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      
      // 자동으로 AUTUS- 접두사 추가
      if (value.length > 0 && !value.startsWith('AUTUS')) {
        if (value.startsWith('A')) {
          // 타이핑 중
        } else {
          value = 'AUTUS-' + value;
        }
      }
      
      // 하이픈 자동 삽입
      if (value.length === 5 && !value.includes('-')) {
        value += '-';
      }
      if (value.length === 10 && value.split('-').length === 2) {
        value = value.slice(0, 10) + '-' + value.slice(10);
      }
      
      // 최대 길이 제한
      if (value.length > 14) {
        value = value.slice(0, 14);
      }
      
      e.target.value = value;
      
      // 에러 메시지 클리어
      document.getElementById('invite-error').textContent = '';
    });
    
    // 제출
    submit?.addEventListener('click', () => this.submitCode());
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.submitCode();
    });
    
    // 대기자 명단
    document.getElementById('waitlist-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showWaitlist();
    });
    
    // 배경 클릭으로 닫기 (선택적)
    // document.querySelector('.invite-backdrop')?.addEventListener('click', () => this.hide());
    
    // Genesis 코드 표시 (개발용 - 더블 클릭)
    document.querySelector('.invite-logo')?.addEventListener('dblclick', () => {
      const genesis = document.getElementById('genesis-codes');
      if (genesis) {
        genesis.style.display = genesis.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  async loadStats() {
    try {
      const response = await fetch('/api/invite/stats');
      if (!response.ok) throw new Error('Stats fetch failed');
      
      const stats = await response.json();
      
      document.getElementById('invite-remaining').textContent = stats.remaining_slots;
      document.getElementById('invite-total').textContent = stats.total_founders;
      document.getElementById('invite-phase').textContent = stats.phase;
      
      // 단계별 스타일
      const phaseEl = document.getElementById('invite-phase');
      if (phaseEl) {
        phaseEl.className = `stat-value phase-${stats.phase.toLowerCase()}`;
      }
    } catch (e) {
      console.error('[Invite] Failed to load stats:', e);
      // 시뮬레이션 데이터
      document.getElementById('invite-remaining').textContent = '153';
      document.getElementById('invite-total').textContent = '847';
      document.getElementById('invite-phase').textContent = 'GROWTH';
    }
  }

  async submitCode() {
    const input = document.getElementById('invite-code-input');
    const error = document.getElementById('invite-error');
    const button = document.getElementById('invite-submit');
    const btnText = button?.querySelector('.btn-text');
    const btnLoading = button?.querySelector('.btn-loading');
    
    const code = input?.value.trim();
    
    // 유효성 검사
    if (!code) {
      error.textContent = '초대 코드를 입력하세요.';
      input?.focus();
      return;
    }
    
    if (!code.match(/^AUTUS-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
      error.textContent = '올바른 형식: AUTUS-XXXX-XXXX';
      return;
    }
    
    // 로딩 상태
    button.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline';
    error.textContent = '';
    
    try {
      // Founder ID 생성 또는 가져오기
      let founderId = localStorage.getItem('autus_founder_id');
      if (!founderId) {
        founderId = 'founder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
      
      // 네트워크를 통해 검증
      const result = await window.founderNetwork?.validateInvite(code, founderId);
      
      if (result?.valid) {
        // 성공 시 모달 닫기
        this.hide();
        
        // 콜백 실행
        if (this.onSuccess) {
          this.onSuccess(result);
        }
      } else {
        error.textContent = result?.message || '검증 실패. 다시 시도해주세요.';
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
      }
    } catch (e) {
      console.error('[Invite] Submit error:', e);
      error.textContent = '네트워크 오류. 다시 시도해주세요.';
      button.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (btnLoading) btnLoading.style.display = 'none';
    }
  }

  showWaitlist() {
    const content = this.modal?.querySelector('.invite-content');
    if (!content) return;
    
    content.innerHTML = `
      <div class="waitlist-form">
        <div class="waitlist-icon">📋</div>
        <h2>대기자 명단</h2>
        <p>초기 1,000명 모집 완료 시 순차 안내됩니다.</p>
        
        <div class="waitlist-input-group">
          <input type="email" id="waitlist-email" placeholder="이메일 주소" autocomplete="email">
        </div>
        
        <button id="waitlist-submit" class="waitlist-button">등록하기</button>
        
        <div class="waitlist-error" id="waitlist-error"></div>
        
        <div class="thiel-quote">
          <span class="quote-text">"Patience is a competitive advantage."</span>
        </div>
        
        <a href="#" id="back-to-invite" class="back-link">← 초대 코드 입력으로 돌아가기</a>
      </div>
    `;
    
    // 이벤트 바인딩
    document.getElementById('waitlist-submit')?.addEventListener('click', () => this.submitWaitlist());
    document.getElementById('waitlist-email')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.submitWaitlist();
    });
    document.getElementById('back-to-invite')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.hide();
      new InviteModal().show(this.onSuccess);
    });
  }

  async submitWaitlist() {
    const emailInput = document.getElementById('waitlist-email');
    const error = document.getElementById('waitlist-error');
    const button = document.getElementById('waitlist-submit');
    
    const email = emailInput?.value.trim();
    
    if (!email || !email.includes('@')) {
      error.textContent = '유효한 이메일 주소를 입력하세요.';
      return;
    }
    
    button.disabled = true;
    button.textContent = '등록 중...';
    
    try {
      const response = await fetch(`/api/invite/waitlist?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      // 성공 메시지 표시
      const content = this.modal?.querySelector('.waitlist-form');
      if (content) {
        content.innerHTML = `
          <div class="waitlist-success">
            <div class="success-icon">✓</div>
            <h2>등록 완료</h2>
            <p>${result.message}</p>
            <p class="position">대기 순번: #${result.position}</p>
            <button class="close-btn" onclick="document.querySelector('.invite-modal').remove()">
              확인
            </button>
          </div>
        `;
      }
    } catch (e) {
      error.textContent = '등록 실패. 다시 시도해주세요.';
      button.disabled = false;
      button.textContent = '등록하기';
    }
  }

  hide() {
    this.modal?.remove();
    this.modal = null;
  }
}

// 글로벌 노출
window.InviteModal = InviteModal;

// 자동 표시 (인증 안 된 경우)
document.addEventListener('DOMContentLoaded', () => {
  // 약간의 딜레이 후 체크 (네트워크 초기화 대기)
  setTimeout(() => {
    if (localStorage.getItem('autus_founder_verified') !== 'true') {
      // 페이지에서 명시적으로 비활성화하지 않은 경우에만
      if (!window.AUTUS_SKIP_INVITE_CHECK) {
        new InviteModal().show();
      }
    }
  }, 500);
});
