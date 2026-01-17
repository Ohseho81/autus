/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌐 AUTUS v4.0 - Frontend API Client
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 대시보드 ↔ 백엔드 API 연동
 */

const AUTUS_API = {
  baseUrl: window.AUTUS_API_URL || 'http://localhost:8000',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 시스템 API
  // ═══════════════════════════════════════════════════════════════════════════
  
  async getSystemSummary() {
    const res = await fetch(`${this.baseUrl}/v4/system/summary`);
    return res.json();
  },
  
  async getSystemHealth() {
    const res = await fetch(`${this.baseUrl}/v4/system/health`);
    return res.json();
  },
  
  async getConstants() {
    const res = await fetch(`${this.baseUrl}/v4/system/constants`);
    return res.json();
  },
  
  async initDemo() {
    const res = await fetch(`${this.baseUrl}/v4/system/demo`, { method: 'POST' });
    return res.json();
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 개체 API
  // ═══════════════════════════════════════════════════════════════════════════
  
  async listEntities(hierarchyRank = null, limit = 100) {
    const params = new URLSearchParams({ limit });
    if (hierarchyRank) params.append('hierarchy_rank', hierarchyRank);
    const res = await fetch(`${this.baseUrl}/v4/entities?${params}`);
    return res.json();
  },
  
  async getEntity(entityId) {
    const res = await fetch(`${this.baseUrl}/v4/entities/${entityId}`);
    return res.json();
  },
  
  async createEntity(id, name, entityType = '개인', initialK = 1.0) {
    const res = await fetch(`${this.baseUrl}/v4/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name,
        entity_type: entityType,
        initial_k: initialK,
      }),
    });
    return res.json();
  },
  
  async connectEntities(sourceId, targetId, strength = 0) {
    const res = await fetch(`${this.baseUrl}/v4/entities/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_id: sourceId,
        target_id: targetId,
        initial_strength: strength,
      }),
    });
    return res.json();
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 중력·보상 API
  // ═══════════════════════════════════════════════════════════════════════════
  
  async contribute(entityId, contribution) {
    const res = await fetch(`${this.baseUrl}/v4/gravity/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id: entityId,
        contribution,
      }),
    });
    return res.json();
  },
  
  async updateMetrics(entityId, contribution, completedTasks, totalTasks, delayedTasks = 0) {
    const res = await fetch(`${this.baseUrl}/v4/gravity/update-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id: entityId,
        contribution,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        delayed_tasks: delayedTasks,
      }),
    });
    return res.json();
  },
  
  async calculateGravity(sourceId, targetId) {
    const params = new URLSearchParams({
      source_id: sourceId,
      target_id: targetId,
    });
    const res = await fetch(`${this.baseUrl}/v4/gravity/calculate?${params}`);
    return res.json();
  },
  
  async getExtinctionRisks(minRisk = 0.3) {
    const res = await fetch(`${this.baseUrl}/v4/gravity/extinction-risks?min_risk=${minRisk}`);
    return res.json();
  },
  
  async runDeletionCycle() {
    const res = await fetch(`${this.baseUrl}/v4/gravity/deletion-cycle`, { method: 'POST' });
    return res.json();
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 계층 API
  // ═══════════════════════════════════════════════════════════════════════════
  
  async getHierarchySummary() {
    const res = await fetch(`${this.baseUrl}/v4/hierarchy/summary`);
    return res.json();
  },
  
  async getHierarchyMembers(rank) {
    const res = await fetch(`${this.baseUrl}/v4/hierarchy/${rank}`);
    return res.json();
  },
  
  async getD3GraphData() {
    const res = await fetch(`${this.baseUrl}/v4/hierarchy/graph/d3`);
    return res.json();
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 파이프라인 API
  // ═══════════════════════════════════════════════════════════════════════════
  
  async getPipelineStatus() {
    const res = await fetch(`${this.baseUrl}/v4/pipeline/status`);
    return res.json();
  },
  
  async connectDataSource(sourceName, credentials) {
    const res = await fetch(`${this.baseUrl}/v4/pipeline/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_name: sourceName,
        credentials,
      }),
    });
    return res.json();
  },
  
  async collectFromSource(sourceName) {
    const res = await fetch(`${this.baseUrl}/v4/pipeline/collect/${sourceName}`, {
      method: 'POST',
    });
    return res.json();
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 대시보드 API
  // ═══════════════════════════════════════════════════════════════════════════
  
  async getUserDashboard(entityId) {
    const res = await fetch(`${this.baseUrl}/v4/dashboard/user/${entityId}`);
    return res.json();
  },
  
  async getAdminDashboard() {
    const res = await fetch(`${this.baseUrl}/v4/dashboard/admin`);
    return res.json();
  },
  
  async get570TasksOverview() {
    const res = await fetch(`${this.baseUrl}/v4/tasks/570`);
    return res.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 도파민 효과 (시각/사운드/햅틱)
// ═══════════════════════════════════════════════════════════════════════════

const DopamineEffects = {
  // 성공 사운드
  playSuccessSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  },
  
  // 황금빛 글로우 효과
  showGoldenGlow(element) {
    if (!element) return;
    
    element.style.transition = 'box-shadow 0.3s ease';
    element.style.boxShadow = '0 0 30px rgba(245, 158, 11, 0.8)';
    
    setTimeout(() => {
      element.style.boxShadow = '';
    }, 2000);
  },
  
  // 토스트 알림
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 16px 24px;
      background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : '#ef4444'};
      color: white;
      border-radius: 12px;
      font-weight: 600;
      z-index: 9999;
      animation: slideIn 0.3s ease;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  
  // 햅틱 피드백 (모바일)
  vibrate(pattern = [100, 50, 100]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },
  
  // 도파민 트리거 실행
  trigger(effects) {
    if (!effects || !effects.effects) return;
    
    effects.effects.forEach(effect => {
      switch (effect.type) {
        case 'sound':
          this.playSuccessSound();
          break;
        case 'visual':
          // 가장 가까운 카드에 글로우 효과
          const card = document.querySelector('.stat-card, .card');
          this.showGoldenGlow(card);
          break;
        case 'notification':
          this.showToast(effect.message);
          break;
        case 'haptic':
          this.vibrate(effect.pattern);
          break;
      }
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 게이지 업데이트 헬퍼
// ═══════════════════════════════════════════════════════════════════════════

const GaugeHelper = {
  // K·I·Ω 게이지 업데이트
  updateGauges(gauges) {
    if (!gauges) return;
    
    // K 게이지
    if (gauges.k) {
      const kFill = document.querySelector('.k-gauge .gauge-fill, [data-gauge="k"]');
      if (kFill) {
        const percent = (gauges.k.value / gauges.k.max) * 100;
        kFill.style.transform = `rotate(${percent * 1.8}deg)`;
      }
    }
    
    // I 게이지
    if (gauges.i) {
      const iFill = document.querySelector('.i-gauge .gauge-fill, [data-gauge="i"]');
      if (iFill) {
        const percent = gauges.i.value * 100;
        iFill.style.transform = `rotate(${percent * 1.8}deg)`;
      }
    }
    
    // Ω 게이지
    if (gauges.omega) {
      const omegaFill = document.querySelector('.omega-gauge .gauge-fill, [data-gauge="omega"]');
      if (omegaFill) {
        const percent = gauges.omega.value * 100;
        omegaFill.style.transform = `rotate(${percent * 1.8}deg)`;
      }
    }
  },
  
  // 건강 점수 표시
  updateHealthScore(score) {
    const el = document.querySelector('.health-score, [data-health-score]');
    if (el) {
      el.textContent = score.toFixed(1);
      el.style.color = score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444';
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 실시간 업데이트
// ═══════════════════════════════════════════════════════════════════════════

const RealtimeUpdater = {
  intervalId: null,
  
  start(entityId, intervalMs = 5000) {
    this.stop();
    
    this.intervalId = setInterval(async () => {
      try {
        const data = await AUTUS_API.getUserDashboard(entityId);
        GaugeHelper.updateGauges(data.gauges);
        GaugeHelper.updateHealthScore(data.health_score);
        
        // 도파민 트리거 체크
        if (data.dopamine_ready) {
          DopamineEffects.showToast('🎯 기여 준비 완료!', 'success');
        }
      } catch (e) {
        console.error('Realtime update failed:', e);
      }
    }, intervalMs);
  },
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 전역 노출
// ═══════════════════════════════════════════════════════════════════════════

window.AUTUS_API = AUTUS_API;
window.DopamineEffects = DopamineEffects;
window.GaugeHelper = GaugeHelper;
window.RealtimeUpdater = RealtimeUpdater;

console.log('🏛️ AUTUS API Client v4.0 loaded');
