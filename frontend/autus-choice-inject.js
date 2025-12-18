// ═══════════════════════════════════════════════════════════════
// AUTUS CHOICE INJECT v1.0
// 배포 버전(solar.autus-ai.com) 전용
// L3/L4 위에 Choice 카드 시스템 삽입 + Legacy 숨김
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // 1. 상태 추출 (현재 페이지에서)
  // ─────────────────────────────────────────────────────────────
  function extractState() {
    const state = {
      recovery: 0.42,
      stability: 0.55,
      cohesion: 0.62,
      shock: 0.72,
      friction: 0.79,
      entropy: 0.00,
      pressure: 0.00,
      risk: 0.00,
      flow: 0.00
    };

    // TWIN STATE에서 값 추출
    const twinState = document.body.textContent;
    
    // ENTROPY, PRESSURE, RISK, FLOW 추출
    const entropyMatch = twinState.match(/ENTROPY[\s\S]*?([\d.]+)/i);
    const pressureMatch = twinState.match(/PRESSURE[\s\S]*?([\d.]+)/i);
    const riskMatch = twinState.match(/RISK[\s\S]*?([\d.]+)/i);
    const flowMatch = twinState.match(/FLOW[\s\S]*?([\d.]+)/i);

    if (entropyMatch) state.entropy = parseFloat(entropyMatch[1]);
    if (pressureMatch) state.pressure = parseFloat(pressureMatch[1]);
    if (riskMatch) state.risk = parseFloat(riskMatch[1]);
    if (flowMatch) state.flow = parseFloat(flowMatch[1]);

    // L4 AUDIT에서 추가 정보 추출
    const recoveryMatch = twinState.match(/Δ Recovery\s*\+?([\d]+)%/i);
    const frictionMatch = twinState.match(/Δ Friction\s*-?([\d]+)%/i);
    const riskChangeMatch = twinState.match(/Risk\s*0\.([\d]+)\s*→\s*0\.([\d]+)/i);
    const confidenceMatch = twinState.match(/Confidence\s*([\d]+)%/i);

    state.audit = {
      deltaRecovery: recoveryMatch ? parseInt(recoveryMatch[1]) : 15,
      deltaFriction: frictionMatch ? parseInt(frictionMatch[1]) : 5,
      riskBefore: riskChangeMatch ? parseFloat('0.' + riskChangeMatch[1]) : 0.58,
      riskAfter: riskChangeMatch ? parseFloat('0.' + riskChangeMatch[2]) : 0.42,
      confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 87
    };

    return state;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Choice 정의 (Physics 기반)
  // ─────────────────────────────────────────────────────────────
  function defineChoices(state) {
    const baseRisk = state.audit.riskBefore || 0.58;
    
    return [
      {
        id: 'A',
        rank: 'PRIMARY',
        name: 'RECOVER FIRST',
        policy: '복구 우선 정책',
        action: 'RECOVER',
        reasoning: state.recovery < 0.50 
          ? `Recovery ${(state.recovery*100).toFixed(0)}% < 임계치(50%). 복구가 최우선.`
          : `Recovery 안정화로 시스템 여유 확보.`,
        delta: {
          recovery: { h1: '+18%', h24: '+25%', d7: '+32%' },
          friction: { h1: '-5%', h24: '-8%', d7: '-12%' },
          risk: { h1: '-12%', h24: '-20%', d7: '-28%' }
        },
        forecast: {
          h1: Math.round((baseRisk - 0.12) * 100),
          h24: Math.round((baseRisk - 0.20) * 100),
          d7: Math.round((baseRisk - 0.28) * 100)
        },
        tradeoff: 'Output 일시 저하 (-8%)',
        confidence: state.audit.confidence || 87
      },
      {
        id: 'B',
        rank: 'SECONDARY',
        name: 'UNBLOCK FLOW',
        policy: '병목 해소 정책',
        action: 'SHOCK_DAMP',
        reasoning: state.shock > 0.70
          ? `Shock ${(state.shock*100).toFixed(0)}% = 병목 상태. 해소 필요.`
          : `Shock 관리로 시스템 안정화.`,
        delta: {
          shock: { h1: '-20%', h24: '-28%', d7: '-35%' },
          stability: { h1: '+12%', h24: '+18%', d7: '+25%' },
          risk: { h1: '-10%', h24: '-18%', d7: '-25%' }
        },
        forecast: {
          h1: Math.round((baseRisk - 0.10) * 100),
          h24: Math.round((baseRisk - 0.18) * 100),
          d7: Math.round((baseRisk - 0.25) * 100)
        },
        tradeoff: 'Recovery 정체 (Δ0)',
        confidence: 82
      },
      {
        id: 'C',
        rank: 'TERTIARY',
        name: 'REDUCE FRICTION',
        policy: '마찰 감소 정책',
        action: 'DEFRICTION',
        reasoning: state.friction > 0.70
          ? `Friction ${(state.friction*100).toFixed(0)}% = 고마찰. Flow 개선 필요.`
          : `Friction 최적화로 효율 향상.`,
        delta: {
          friction: { h1: '-18%', h24: '-25%', d7: '-32%' },
          flow: { h1: '+15%', h24: '+22%', d7: '+30%' },
          risk: { h1: '-8%', h24: '-15%', d7: '-22%' }
        },
        forecast: {
          h1: Math.round((baseRisk - 0.08) * 100),
          h24: Math.round((baseRisk - 0.15) * 100),
          d7: Math.round((baseRisk - 0.22) * 100)
        },
        tradeoff: 'Shock 미처리 (위험 잔존)',
        confidence: 75
      }
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // 3. HTML 생성
  // ─────────────────────────────────────────────────────────────
  function renderChoiceCard(choice, currentRisk) {
    const isPrimary = choice.rank === 'PRIMARY';
    const riskReduction = Math.round(((currentRisk - choice.forecast.h24/100) / currentRisk) * 100);
    
    return `
      <div class="autus-choice-card ${choice.rank.toLowerCase()}" data-choice="${choice.id}" data-action="${choice.action}">
        <div class="card-rank ${choice.rank.toLowerCase()}">${isPrimary ? '◉ ' : ''}${choice.rank}</div>
        
        <div class="card-header">
          <span class="card-id">CHOICE ${choice.id}</span>
          <span class="card-name">${choice.name}</span>
        </div>
        
        <div class="card-policy">${choice.policy}</div>
        
        <div class="card-reasoning">${choice.reasoning}</div>
        
        <div class="card-deltas">
          ${Object.entries(choice.delta).map(([key, vals]) => {
            const isGood = (key === 'risk' || key === 'friction' || key === 'shock') 
              ? vals.h24.startsWith('-') 
              : vals.h24.startsWith('+');
            return `<span class="delta-item ${isGood ? 'positive' : 'negative'}">${key.toUpperCase()} ${vals.h24}</span>`;
          }).join('')}
        </div>
        
        <div class="card-minibar">
          <div class="minibar-label">RISK Δ</div>
          <div class="minibar-track">
            <div class="minibar-current" style="width: ${currentRisk * 100}%"></div>
            <div class="minibar-predicted" style="width: ${choice.forecast.h24}%"></div>
          </div>
          <div class="minibar-value ${riskReduction > 0 ? 'positive' : ''}">↓${riskReduction}%</div>
        </div>
        
        <div class="card-forecast">
          <span class="forecast-title">FORECAST</span>
          <div class="forecast-row"><span>+1h</span><span>Risk ${choice.forecast.h1}%</span></div>
          <div class="forecast-row"><span>+24h</span><span>Risk ${choice.forecast.h24}%</span></div>
          <div class="forecast-row"><span>+7d</span><span>Risk ${choice.forecast.d7}%</span></div>
        </div>
        
        <div class="card-tradeoff">
          <span class="tradeoff-icon">⚠️</span>
          <span class="tradeoff-text">${choice.tradeoff}</span>
        </div>
        
        <div class="card-confidence">
          <div class="conf-bar" style="width: ${choice.confidence}%"></div>
          <span class="conf-label">Confidence ${choice.confidence}%</span>
        </div>
        
        <button class="card-lock-btn" data-action="${choice.action}">LOCK ${choice.id}</button>
      </div>
    `;
  }

  function renderChoiceContainer(choices, state) {
    const currentRisk = state.audit.riskBefore;
    
    // 병목 감지
    let bottleneck = null;
    if (state.recovery < 0.50) bottleneck = { name: 'RECOVERY', value: state.recovery };
    else if (state.shock > 0.70) bottleneck = { name: 'SHOCK', value: state.shock };
    else if (state.friction > 0.70) bottleneck = { name: 'FRICTION', value: state.friction };

    return `
      <div id="autus-choice-container" class="autus-choice-container">
        <div class="choice-header">
          <span class="choice-title">STRATEGIC CHOICES</span>
          <span class="choice-subtitle">선택의 이유와 미래를 먼저 본다</span>
        </div>
        
        ${bottleneck ? `
          <div class="bottleneck-badge">
            <span class="bn-icon">⚠️</span>
            <span class="bn-label">PRIMARY BOTTLENECK:</span>
            <span class="bn-name">${bottleneck.name}</span>
            <span class="bn-value">${(bottleneck.value * 100).toFixed(0)}%</span>
          </div>
        ` : ''}
        
        <div class="choice-cards-grid">
          ${choices.map(c => renderChoiceCard(c, currentRisk)).join('')}
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. 스타일 주입
  // ─────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('autus-choice-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'autus-choice-styles';
    style.textContent = `
      /* Container */
      .autus-choice-container {
        padding: 20px;
        margin: 20px 0;
        background: rgba(10, 12, 18, 0.95);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .choice-header {
        text-align: center;
        margin-bottom: 20px;
      }

      .choice-title {
        display: block;
        font-size: 11px;
        letter-spacing: 3px;
        color: rgba(255, 255, 255, 0.4);
        margin-bottom: 4px;
      }

      .choice-subtitle {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
      }

      /* Bottleneck */
      .bottleneck-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 11px;
      }
      .bn-name, .bn-value { color: #ef4444; font-weight: 600; }

      /* Grid */
      .choice-cards-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      @media (max-width: 900px) {
        .choice-cards-grid { grid-template-columns: 1fr; }
      }

      /* Card */
      .autus-choice-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 18px;
        position: relative;
        transition: all 0.3s;
      }
      .autus-choice-card:hover {
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
      }
      .autus-choice-card.primary {
        border-color: rgba(59, 130, 246, 0.4);
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), transparent);
      }

      /* Rank */
      .card-rank {
        position: absolute;
        top: 12px;
        right: 12px;
        font-size: 9px;
        letter-spacing: 1px;
        padding: 4px 10px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.5);
      }
      .card-rank.primary {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
      }
      .card-rank.secondary {
        background: rgba(147, 51, 234, 0.15);
        color: #9333ea;
      }

      /* Header */
      .card-header { margin-bottom: 10px; }
      .card-id {
        display: block;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.3);
        letter-spacing: 2px;
        margin-bottom: 4px;
      }
      .card-name {
        font-size: 15px;
        font-weight: 600;
        color: #fff;
      }

      .card-policy {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .card-reasoning {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.5;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        border-left: 2px solid rgba(59, 130, 246, 0.5);
        margin-bottom: 10px;
      }

      /* Deltas */
      .card-deltas {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
      }
      .delta-item {
        font-size: 10px;
        padding: 3px 7px;
        border-radius: 4px;
        font-family: monospace;
      }
      .delta-item.positive {
        background: rgba(34, 197, 94, 0.15);
        color: #22c55e;
      }
      .delta-item.negative {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }

      /* Mini Bar */
      .card-minibar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .minibar-label {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.4);
        width: 45px;
      }
      .minibar-track {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        position: relative;
        overflow: hidden;
      }
      .minibar-current {
        position: absolute;
        top: 0; left: 0;
        height: 100%;
        background: rgba(239, 68, 68, 0.4);
        border-radius: 3px;
      }
      .minibar-predicted {
        position: absolute;
        top: 0; left: 0;
        height: 100%;
        background: rgba(34, 197, 94, 0.7);
        border-radius: 3px;
      }
      .minibar-value {
        font-size: 11px;
        font-weight: 600;
        width: 45px;
        text-align: right;
      }
      .minibar-value.positive { color: #22c55e; }

      /* Forecast */
      .card-forecast {
        margin-bottom: 10px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
      }
      .forecast-title {
        display: block;
        font-size: 9px;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.3);
        margin-bottom: 6px;
      }
      .forecast-row {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        padding: 2px 0;
        color: rgba(255, 255, 255, 0.6);
      }

      /* Trade-off */
      .card-tradeoff {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        background: rgba(239, 68, 68, 0.08);
        border-radius: 4px;
        border: 1px solid rgba(239, 68, 68, 0.15);
        margin-bottom: 10px;
        font-size: 10px;
        color: rgba(239, 68, 68, 0.9);
      }

      /* Confidence */
      .card-confidence {
        position: relative;
        height: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .conf-bar {
        height: 100%;
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.5));
        border-radius: 4px;
      }
      .conf-label {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        font-size: 9px;
        color: rgba(255, 255, 255, 0.7);
        letter-spacing: 1px;
      }

      /* Lock Button */
      .card-lock-btn {
        width: 100%;
        padding: 10px;
        background: rgba(59, 130, 246, 0.15);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 6px;
        color: #3b82f6;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 2px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .card-lock-btn:hover {
        background: rgba(59, 130, 246, 0.25);
        border-color: rgba(59, 130, 246, 0.5);
      }
      .autus-choice-card.primary .card-lock-btn {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.4);
      }

      /* Legacy 숨김 */
      .autus-legacy-hidden {
        display: none !important;
      }
      
      /* L3/L4 격하 표시 */
      .autus-legacy-dimmed {
        opacity: 0.4;
        pointer-events: none;
        position: relative;
      }
      .autus-legacy-dimmed::before {
        content: '(Choice 카드로 대체됨)';
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        color: rgba(255, 255, 255, 0.3);
        z-index: 10;
      }
    `;
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. DOM 삽입 및 Legacy 숨김
  // ─────────────────────────────────────────────────────────────
  function inject() {
    const state = extractState();
    const choices = defineChoices(state);
    const html = renderChoiceContainer(choices, state);

    // L3 ACTION LOG 찾기
    let l3Section = null;
    document.querySelectorAll('*').forEach(el => {
      if (el.textContent && el.textContent.includes('L3') && el.textContent.includes('ACTION LOG')) {
        l3Section = el.closest('section, div.layer, div');
      }
    });

    // 삽입 위치 결정
    const container = document.createElement('div');
    container.innerHTML = html;
    const choiceElement = container.firstElementChild;

    if (l3Section && l3Section.parentElement) {
      l3Section.parentElement.insertBefore(choiceElement, l3Section);
    } else {
      // fallback: 페이지 중간에 삽입
      const main = document.querySelector('main, .main, .content, body');
      main.appendChild(choiceElement);
    }

    // Legacy 숨김 (L3 버튼, L4 버튼)
    hideLegacy();

    // 이벤트 바인딩
    bindEvents();
  }

  function hideLegacy() {
    // L3 ACTION LOG 섹션의 버튼들
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.toUpperCase();
      if (['RECOVER', 'DEFRICTION', 'SHOCK DAMP', 'SHOCK_DAMP'].some(t => text.includes(t))) {
        // Choice 카드 내부가 아니면 숨김
        if (!btn.closest('.autus-choice-card')) {
          const section = btn.closest('section, div');
          if (section) section.classList.add('autus-legacy-dimmed');
        }
      }
      
      // L4 AUDIT 버튼
      if (['LOCK', 'HOLD', 'REJECT'].some(t => text === t)) {
        if (!btn.closest('.autus-choice-card')) {
          const section = btn.closest('section, div');
          if (section) section.classList.add('autus-legacy-dimmed');
        }
      }
    });

    // 특정 텍스트 숨김
    const hideTexts = ['PREVIEW ONLY', 'Hold 3s for AUDIT', 'Auto-reject'];
    document.querySelectorAll('*').forEach(el => {
      if (el.childNodes.length <= 2) {
        const text = el.textContent || '';
        if (hideTexts.some(t => text.includes(t))) {
          el.style.display = 'none';
        }
      }
    });
  }

  function bindEvents() {
    document.querySelectorAll('.card-lock-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        const card = btn.closest('.autus-choice-card');
        const choiceId = card.dataset.choice;
        
        console.log(`[AUTUS] LOCK: ${action} (Choice ${choiceId})`);
        
        // 시각 피드백
        btn.textContent = '✓ LOCKED';
        btn.disabled = true;
        card.style.opacity = '0.6';
        
        // 로그 저장
        try {
          const log = JSON.parse(localStorage.getItem('autus-log') || '[]');
          log.unshift({
            timestamp: Date.now(),
            action,
            choiceId
          });
          localStorage.setItem('autus-log', JSON.stringify(log.slice(0, 50)));
        } catch (e) {}
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. 초기화
  // ─────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    inject();
    console.log('[AUTUS] Choice System injected ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
  } else {
    setTimeout(init, 300);
  }

})();
