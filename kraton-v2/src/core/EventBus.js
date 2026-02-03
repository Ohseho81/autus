/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS EventBus - 진짜 이벤트 기반 통신
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 모든 엔진이 이 버스를 통해 통신
 * - PainSignalEngine → EventBus → VFactoryEngine
 * - UI → EventBus → Engine
 * - Engine → EventBus → Persistence
 */

class EventBusClass {
  constructor() {
    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 1000;
    this.middlewares = [];
    this.isInitialized = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 이벤트 구독
   */
  on(eventType, callback, options = {}) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.listeners.get(eventType).push(listener);

    // 우선순위 정렬
    this.listeners.get(eventType).sort((a, b) => b.priority - a.priority);

    // 구독 해제 함수 반환
    return () => this.off(eventType, listener.id);
  }

  /**
   * 한 번만 구독
   */
  once(eventType, callback, options = {}) {
    return this.on(eventType, callback, { ...options, once: true });
  }

  /**
   * 구독 해제
   */
  off(eventType, listenerId) {
    if (!this.listeners.has(eventType)) return;

    const listeners = this.listeners.get(eventType);
    const index = listeners.findIndex(l => l.id === listenerId);

    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * 이벤트 발행
   */
  async emit(eventType, payload = {}) {
    const event = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // 미들웨어 실행
    let processedEvent = event;
    for (const middleware of this.middlewares) {
      processedEvent = await middleware(processedEvent);
      if (!processedEvent) return null; // 미들웨어가 이벤트 차단
    }

    // 히스토리 저장
    this._addToHistory(processedEvent);

    // 리스너 호출
    const listeners = this.listeners.get(eventType) || [];
    const wildcardListeners = this.listeners.get('*') || [];
    const allListeners = [...listeners, ...wildcardListeners];

    const results = [];
    const toRemove = [];

    for (const listener of allListeners) {
      try {
        const result = await listener.callback(processedEvent);
        results.push(result);

        if (listener.once) {
          toRemove.push({ eventType, id: listener.id });
        }
      } catch (error) {
        console.error(`[EventBus] Error in listener for ${eventType}:`, error);
        this.emit('SYSTEM:ERROR', { originalEvent: eventType, error: error.message });
      }
    }

    // once 리스너 제거
    toRemove.forEach(({ eventType: et, id }) => this.off(et, id));

    return { event: processedEvent, results };
  }

  /**
   * 미들웨어 추가
   */
  use(middleware) {
    this.middlewares.push(middleware);
    return () => {
      const index = this.middlewares.indexOf(middleware);
      if (index !== -1) this.middlewares.splice(index, 1);
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // History & Debug
  // ─────────────────────────────────────────────────────────────────────────────

  _addToHistory(event) {
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getHistory(filter = {}) {
    let result = [...this.history];

    if (filter.type) {
      result = result.filter(e => e.type === filter.type);
    }
    if (filter.since) {
      result = result.filter(e => e.timestamp >= filter.since);
    }
    if (filter.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  clearHistory() {
    this.history = [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Debug Mode
  // ─────────────────────────────────────────────────────────────────────────────

  enableDebug() {
    this.use((event) => {
      console.log(`[EventBus] ${event.type}`, event.payload);
      return event;
    });
  }

  getStats() {
    const eventCounts = {};
    this.history.forEach(e => {
      eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
    });

    return {
      totalEvents: this.history.length,
      listenerCount: Array.from(this.listeners.values()).reduce((sum, l) => sum + l.length, 0),
      eventTypes: Object.keys(eventCounts).length,
      eventCounts,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Types (타입 안전성)
// ═══════════════════════════════════════════════════════════════════════════════

export const EventTypes = {
  // Pain Signal
  PAIN_RECEIVED: 'PAIN:RECEIVED',
  PAIN_CLASSIFIED: 'PAIN:CLASSIFIED',
  PAIN_RESOLVED: 'PAIN:RESOLVED',

  // V-Factory
  V_CREATED: 'V:CREATED',
  V_TARGET_SET: 'V:TARGET_SET',
  V_BOTTLENECK: 'V:BOTTLENECK',

  // Constitution
  CONSTITUTION_CHECK: 'CONSTITUTION:CHECK',
  CONSTITUTION_VIOLATION: 'CONSTITUTION:VIOLATION',
  CONSTITUTION_PASSED: 'CONSTITUTION:PASSED',

  // State Machine
  STATE_TRANSITION: 'STATE:TRANSITION',
  STATE_BLOCKED: 'STATE:BLOCKED',

  // Approval
  APPROVAL_REQUIRED: 'APPROVAL:REQUIRED',
  APPROVAL_GRANTED: 'APPROVAL:GRANTED',
  APPROVAL_DENIED: 'APPROVAL:DENIED',

  // User Actions
  USER_INPUT: 'USER:INPUT',
  USER_ACTION: 'USER:ACTION',

  // System
  SYSTEM_ERROR: 'SYSTEM:ERROR',
  SYSTEM_READY: 'SYSTEM:READY',

  // Persistence
  DATA_SAVED: 'DATA:SAVED',
  DATA_LOADED: 'DATA:LOADED',
  DATA_SYNC: 'DATA:SYNC',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const EventBus = new EventBusClass();
export default EventBus;
