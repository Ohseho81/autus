/**
 * AUTUS Core v1.0
 * 성능 최적화 + 실시간 데이터 바인딩
 */

class AutusCore {
  constructor() {
    this.state = null;
    this.uniforms = null;
    this.motion = null;
    this.listeners = [];
    this.useSSE = true;
    this.eventSource = null;
    this.pollInterval = null;
  }

  // 초기화
  init() {
    if (this.useSSE && typeof EventSource !== 'undefined') {
      this.initSSE();
    } else {
      this.initPolling();
    }
  }

  // SSE 연결
  initSSE() {
    try {
      this.eventSource = new EventSource('/stream');
      this.eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        this.updateState(data);
      };
      this.eventSource.onerror = () => {
        console.warn('SSE failed, falling back to polling');
        this.eventSource.close();
        this.initPolling();
      };
    } catch (e) {
      this.initPolling();
    }
  }

  // Polling 폴백
  initPolling() {
    this.fetchBatch();
    this.pollInterval = setInterval(() => this.fetchBatch(), 500);
  }

  // Batch API 호출
  async fetchBatch() {
    try {
      const r = await fetch('/status/batch');
      const data = await r.json();
      this.state = data.status;
      this.uniforms = data.uniforms;
      this.motion = data.motion;
      this.notifyListeners(data);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }

  // SSE 데이터 처리
  updateState(data) {
    // 압축된 데이터 확장
    const expanded = {
      status: {
        tick: data.t,
        signals: {
          entropy: data.e,
          pressure: data.p,
          release: data.r,
          gravity: data.g
        },
        output: { status: data.s }
      },
      twin: {
        entropy: data.e,
        pressure: data.p,
        flow: data.r,
        energy: data.g,
        risk: Math.min(1, data.e * 1.5 + data.p * 0.5)
      },
      uniforms: {
        u_time: data.t % 1000,
        u_entropy: data.e,
        u_pressure: data.p,
        u_flow: data.r,
        u_energy: data.g,
        u_risk: Math.min(1, data.e * 1.5 + data.p * 0.5)
      }
    };
    this.state = expanded.status;
    this.uniforms = expanded.uniforms;
    this.notifyListeners(expanded);
  }

  // 리스너 등록
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // 리스너 알림
  notifyListeners(data) {
    this.listeners.forEach(l => {
      try { l(data); } catch (e) { console.error(e); }
    });
  }

  // 정리
  destroy() {
    if (this.eventSource) this.eventSource.close();
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}

// 성능 최적화 유틸리티
const AutusPerf = {
  // RAF 스로틀링
  rafThrottle(fn) {
    let scheduled = false;
    return (...args) => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        fn(...args);
        scheduled = false;
      });
    };
  },

  // 디바운스
  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  // FPS 모니터
  createFPSMonitor() {
    let frames = 0;
    let lastTime = performance.now();
    let fps = 60;

    return {
      tick() {
        frames++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          fps = Math.round(frames * 1000 / (now - lastTime));
          frames = 0;
          lastTime = now;
        }
        return fps;
      },
      get fps() { return fps; }
    };
  },

  // 메모리 체크
  checkMemory() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576)
      };
    }
    return null;
  }
};

// Three.js 성능 최적화
const AutusThree = {
  // LOD 설정
  createLOD(meshes) {
    const lod = new THREE.LOD();
    meshes.forEach((m, i) => lod.addLevel(m.mesh, m.distance || i * 50));
    return lod;
  },

  // 인스턴싱
  createInstanced(geometry, material, count) {
    return new THREE.InstancedMesh(geometry, material, count);
  },

  // 렌더 타겟 풀
  renderTargetPool: [],
  getRenderTarget(width, height) {
    let rt = this.renderTargetPool.find(r => r.width === width && r.height === height && !r.inUse);
    if (!rt) {
      rt = new THREE.WebGLRenderTarget(width, height);
      rt.inUse = false;
      this.renderTargetPool.push(rt);
    }
    rt.inUse = true;
    return rt;
  },
  releaseRenderTarget(rt) {
    rt.inUse = false;
  }
};

// 전역 인스턴스
window.AutusCore = new AutusCore();
window.AutusPerf = AutusPerf;
window.AutusThree = AutusThree;
