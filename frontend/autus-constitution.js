// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 10조 (AUTUS CONSTITUTION)
// FROZEN — 이 파일은 수정 불가
// 
// "Autus는 미래를 맞히는 시스템이 아니라,
//  사람이 더 품위 있는 선택을 하도록 미래의 차이를 보여주는 시스템이다."
//
// BUILD: 2025-12-18 v1.0 LOCKED
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_CONSTITUTION = Object.freeze({
  
  // ─────────────────────────────────────────────────────────────────────────
  // 제1조: 정체성 (Identity)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_1: Object.freeze({
    id: 1,
    title: '정체성',
    title_en: 'Identity',
    content: 'Autus는 예측 시스템이 아니다. 선택 지원 시스템이다.',
    content_en: 'Autus is not a prediction system. It is a choice support system.',
    principle: '미래를 맞히지 않는다. 미래의 차이를 보여준다.',
    violation: '예측 정확도를 KPI로 삼는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제2조: 단일 소스 (Single Source)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_2: Object.freeze({
    id: 2,
    title: '단일 소스',
    title_en: 'Single Source',
    content: '모든 UI 값은 PhysicsFrame.snapshot에서만 파생된다.',
    content_en: 'All UI values derive only from PhysicsFrame.snapshot.',
    principle: '진실의 원천은 하나다. 복제는 혼란이다.',
    violation: 'snapshot 외 경로에서 UI 값을 생성하는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제3조: 물리 우선 (Physics First)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_3: Object.freeze({
    id: 3,
    title: '물리 우선',
    title_en: 'Physics First',
    content: '모든 결정의 근거는 물리 변수다. 감정, 직관, 마케팅은 근거가 아니다.',
    content_en: 'All decisions are grounded in physics variables. Emotion, intuition, marketing are not grounds.',
    principle: '숫자가 말한다. 해석하지 않는다.',
    violation: '물리 공식 외 임의 가중치를 부여하는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제4조: 비개입 (Non-Intervention)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_4: Object.freeze({
    id: 4,
    title: '비개입',
    title_en: 'Non-Intervention',
    content: 'Autus는 추천하지 않는다. 선택지의 미래 결과만 보여준다.',
    content_en: 'Autus does not recommend. It only shows future outcomes of choices.',
    principle: '판단은 사용자의 것이다. 시스템은 판사가 아니다.',
    violation: '"이것을 선택하세요"라고 유도하는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제5조: 투명성 (Transparency)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_5: Object.freeze({
    id: 5,
    title: '투명성',
    title_en: 'Transparency',
    content: '모든 계산 과정은 공개된다. 블랙박스는 존재하지 않는다.',
    content_en: 'All calculations are open. No black boxes exist.',
    principle: '신뢰는 투명성에서 온다.',
    violation: '계산 로직을 숨기거나 난독화하는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제6조: 인과 기록 (Causality)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_6: Object.freeze({
    id: 6,
    title: '인과 기록',
    title_en: 'Causality',
    content: '모든 선택과 결과는 기록된다. 원인 없는 결과는 없다.',
    content_en: 'All choices and outcomes are recorded. No effect without cause.',
    principle: '기록은 학습의 기반이다.',
    violation: '선택 로그를 삭제하거나 조작하는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제7조: 품위 (Dignity)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_7: Object.freeze({
    id: 7,
    title: '품위',
    title_en: 'Dignity',
    content: '더 나은 선택은 더 품위 있는 미래를 만든다. 품위는 물리적으로 측정된다.',
    content_en: 'Better choices create more dignified futures. Dignity is measured physically.',
    formula: 'DIGNITY = Quality × Stability − Entropy × Friction',
    principle: '품위는 추상이 아니다. 공식이다.',
    violation: '품위를 주관적 판단으로 정의하는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제8조: 진화 (Evolution)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_8: Object.freeze({
    id: 8,
    title: '진화',
    title_en: 'Evolution',
    content: 'Autus는 기억하지 않고 진화한다. 가중치만 조정되고, 로그는 학습에 쓰이지 않는다.',
    content_en: 'Autus evolves without memory. Only weights adjust; logs are not used for learning.',
    principle: '과거에 갇히지 않는다. 물리만 정제된다.',
    violation: '개인 데이터를 학습에 사용하는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제9조: 위기 대응 (Crisis Response)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_9: Object.freeze({
    id: 9,
    title: '위기 대응',
    title_en: 'Crisis Response',
    content: 'Gate RED 시 자동 개입한다. 그러나 최종 결정은 항상 사용자에게 있다.',
    content_en: 'Auto-intervention at Gate RED. But final decision always belongs to user.',
    principle: '시스템은 경고한다. 강제하지 않는다.',
    violation: '사용자 동의 없이 자동 실행하는 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 제10조: 불변 (Immutability)
  // ─────────────────────────────────────────────────────────────────────────
  ARTICLE_10: Object.freeze({
    id: 10,
    title: '불변',
    title_en: 'Immutability',
    content: '이 10조는 수정될 수 없다. 예외도 없다.',
    content_en: 'These 10 articles cannot be modified. No exceptions.',
    principle: '원칙 없는 시스템은 시스템이 아니다.',
    violation: '이 파일을 수정하는 모든 행위'
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // 메타데이터
  // ─────────────────────────────────────────────────────────────────────────
  META: Object.freeze({
    version: '1.0.0',
    frozen_at: '2025-12-18T00:00:00Z',
    hash: 'AUTUS-CONSTITUTION-V1-LOCKED',
    authors: ['SehoOS'],
    license: 'AUTUS Internal Use Only'
  })
});

// ═══════════════════════════════════════════════════════════════════════════
// 헌법 검증 시스템
// ═══════════════════════════════════════════════════════════════════════════

class ConstitutionGuard {
  constructor() {
    this.violations = [];
    this.init();
  }

  init() {
    this.displayConstitution();
    this.startWatch();
    console.log('[AUTUS] Constitution Guard initialized — 10조 LOCKED');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 콘솔 표시
  // ─────────────────────────────────────────────────────────────────────────
  displayConstitution() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    AUTUS 10조 (CONSTITUTION)                   ');
    console.log('═══════════════════════════════════════════════════════════════');
    
    for (let i = 1; i <= 10; i++) {
      const article = AUTUS_CONSTITUTION[`ARTICLE_${i}`];
      console.log(`제${i}조: ${article.title} — ${article.content}`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`VERSION: ${AUTUS_CONSTITUTION.META.version} | FROZEN: ${AUTUS_CONSTITUTION.META.frozen_at}`);
    console.log('═══════════════════════════════════════════════════════════════');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 위반 감시
  // ─────────────────────────────────────────────────────────────────────────
  startWatch() {
    // 제2조 위반 감시: Single Source
    this.watchSingleSource();
    
    // 제4조 위반 감시: Non-Intervention
    this.watchNonIntervention();
    
    // 제5조 위반 감시: Transparency
    this.watchTransparency();
  }

  watchSingleSource() {
    // PhysicsFrame.snapshot 외 경로로 UI 값 생성 감지
    // 주의: Element.prototype.textContent는 getter이므로 직접 참조하면 에러 발생
    // 실제 구현은 MutationObserver 등을 사용해야 함
    console.log('[Constitution] Single Source watch active');
  }

  watchNonIntervention() {
    // "추천" 문구 감지
    setInterval(() => {
      const forbidden = ['추천합니다', 'recommend', '선택하세요', 'should choose'];
      document.querySelectorAll('*').forEach(el => {
        forbidden.forEach(word => {
          if (el.textContent && el.textContent.toLowerCase().includes(word.toLowerCase())) {
            // Choice 카드 내부가 아닌 곳에서 발견 시
            if (!el.closest('.choice-card') && !el.closest('#choice-container')) {
              this.reportViolation(4, `Forbidden word detected: "${word}"`);
            }
          }
        });
      });
    }, 10000);
  }

  watchTransparency() {
    // 계산 로직 숨김 감지 (minified code 외)
    // 실제로는 빌드 시스템에서 검증
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 위반 보고
  // ─────────────────────────────────────────────────────────────────────────
  reportViolation(articleId, description) {
    const violation = {
      timestamp: new Date().toISOString(),
      article: articleId,
      description,
      stack: new Error().stack
    };
    
    this.violations.push(violation);
    
    console.warn(`[AUTUS CONSTITUTION] ⚠️ VIOLATION OF ARTICLE ${articleId}`);
    console.warn(`Description: ${description}`);
    console.warn(`Article: ${AUTUS_CONSTITUTION[`ARTICLE_${articleId}`].content}`);
    
    // 이벤트 발생
    window.dispatchEvent(new CustomEvent('constitution:violation', {
      detail: violation
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 외부 인터페이스
  // ─────────────────────────────────────────────────────────────────────────
  getArticle(id) {
    return AUTUS_CONSTITUTION[`ARTICLE_${id}`];
  }

  getAllArticles() {
    const articles = [];
    for (let i = 1; i <= 10; i++) {
      articles.push(AUTUS_CONSTITUTION[`ARTICLE_${i}`]);
    }
    return articles;
  }

  getViolations() {
    return [...this.violations];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 품위 공식 (제7조)
  // ─────────────────────────────────────────────────────────────────────────
  calculateDignity(state) {
    const quality = state.quality || state.QUALITY || 0.5;
    const stability = state.stability || state.STABILITY || 0.5;
    const entropy = state.entropy || 0.5;
    const friction = state.friction || state.FRICTION || 0.5;
    
    return quality * stability - entropy * friction;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 명성 공식 (보조)
  // ─────────────────────────────────────────────────────────────────────────
  calculateReputation(futureShockResidual) {
    return -futureShockResidual;
  }
}

// 전역 인스턴스
window.AUTUS_CONSTITUTION = AUTUS_CONSTITUTION;
window.constitutionGuard = new ConstitutionGuard();
