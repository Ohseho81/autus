/**
 * AUTUS Core API Engine (LOCK)
 * ============================
 * 
 * 프론트엔드-백엔드 물리적 연결 스크립트
 * 
 * 핵심 규칙:
 * - 단일 상태 원천 (Single Source of Truth)
 * - SIM/LIVE 모드 엄격 분리
 * - 결정론적 데이터 흐름
 * - 오프라인 캐싱 (LocalStorage)
 * 
 * Version: 1.1.0
 * Status: LOCKED
 */

const AUTUS_API_BASE = "http://localhost:8001";
const STORAGE_KEY = "autus_draft_cache";
const STORAGE_STATE_KEY = "autus_state_cache";

/**
 * AUTUS Engine - 전역 상태 관리 및 API 통신
 */
export const AutusEngine = {
    // 현재 상태
    _state: null,
    _sessionId: null,
    _subscribers: [],
    _pollInterval: null,
    _connected: false,
    _lastError: null,
    
    /**
     * 초기화
     */
    init(sessionId) {
        this._sessionId = sessionId || `autus_${Date.now()}`;
        
        // 캐시된 상태 복구
        this._restoreFromCache();
        
        console.log(`[AUTUS] Engine initialized: ${this._sessionId}`);
        return this;
    },
    
    /**
     * 상태 구독 (Observer Pattern)
     */
    subscribe(callback) {
        this._subscribers.push(callback);
        // 즉시 현재 상태 전달
        if (this._state) {
            callback(this._state);
        }
        return () => {
            this._subscribers = this._subscribers.filter(cb => cb !== callback);
        };
    },
    
    /**
     * 상태 변경 알림
     */
    _notify() {
        this._subscribers.forEach(cb => cb(this._state));
    },
    
    // ================================================================
    // LOCAL STORAGE CACHING (네트워크 단절 대응)
    // ================================================================
    
    /**
     * Draft를 로컬 스토리지에 캐싱
     */
    _cacheDraft() {
        if (!this._state?.draft) return;
        try {
            const cache = {
                sessionId: this._sessionId,
                draft: this._state.draft,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.warn('[AUTUS] Draft cache failed:', e);
        }
    },
    
    /**
     * 상태를 로컬 스토리지에 캐싱
     */
    _cacheState() {
        if (!this._state) return;
        try {
            const cache = {
                sessionId: this._sessionId,
                state: this._state,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.warn('[AUTUS] State cache failed:', e);
        }
    },
    
    /**
     * 캐시에서 복구
     */
    _restoreFromCache() {
        try {
            const stateCache = localStorage.getItem(STORAGE_STATE_KEY);
            if (stateCache) {
                const { sessionId, state, timestamp } = JSON.parse(stateCache);
                // 24시간 이내 캐시만 복구
                if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                    this._state = state;
                    console.log('[AUTUS] State restored from cache');
                }
            }
        } catch (e) {
            console.warn('[AUTUS] Cache restore failed:', e);
        }
    },
    
    /**
     * 캐시된 Draft 가져오기
     */
    getCachedDraft() {
        try {
            const cache = localStorage.getItem(STORAGE_KEY);
            if (cache) {
                return JSON.parse(cache);
            }
        } catch (e) {}
        return null;
    },
    
    /**
     * 캐시 삭제
     */
    clearCache() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_STATE_KEY);
    },
    
    // ================================================================
    // API ENDPOINTS
    // ================================================================
    
    /**
     * GET /state - 현재 물리 상태 가져오기
     */
    async fetchState() {
        try {
            const response = await fetch(
                `${AUTUS_API_BASE}/state?session_id=${this._sessionId}`,
                { timeout: 5000 }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this._state = await response.json();
            this._connected = true;
            this._lastError = null;
            this._notify();
            this._cacheState();
            
            console.log(`[AUTUS] State fetched:`, {
                mode: this._state.ui?.mode,
                density: this._state.measure?.density,
                sigma: this._state.measure?.sigma
            });
            
            return this._state;
        } catch (error) {
            this._connected = false;
            this._lastError = error.message;
            console.error('[AUTUS] fetchState failed:', error);
            
            // 오프라인: 캐시에서 복구
            if (!this._state) {
                this._restoreFromCache();
            }
            
            throw error;
        }
    },
    
    /**
     * POST /draft/update - Draft 수정 (SIM 모드)
     * 
     * @param {number} page - 1 | 2 | 3
     * @param {Object} patch - 수정할 필드
     */
    async updateDraft(page, patch) {
        // LIVE 모드에서는 Draft 수정 불가 (불변성)
        if (this._state?.ui?.mode === 'LIVE') {
            console.warn('[AUTUS] Cannot update draft in LIVE mode');
            // SIM 모드로 전환 필요
            this._state.ui.mode = 'SIM';
        }
        
        try {
            const response = await fetch(`${AUTUS_API_BASE}/draft/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: 'autus.draft.patch.v1',
                    session_id: this._sessionId,
                    t_ms: Date.now(),
                    page: page,
                    patch: patch
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            this._state = result.state;
            this._connected = true;
            this._notify();
            this._cacheDraft(); // Draft 캐싱
            this._cacheState();
            
            console.log(`[AUTUS] Draft updated (Page ${page}):`, patch);
            
            return result;
        } catch (error) {
            this._connected = false;
            this._lastError = error.message;
            console.error('[AUTUS] updateDraft failed:', error);
            
            // 오프라인: 로컬에 Draft 저장
            this._cacheDraft();
            
            throw error;
        }
    },
    
    /**
     * POST /commit - Draft를 LIVE로 확정
     * 
     * Pipeline 순서 (LOCKED):
     * 1. Page 3 (Mandala Transform)
     * 2. Page 1 (Mass/Volume)
     * 3. Page 2 (NodeOps)
     */
    async commit(options = {}) {
        // Commit Gate 확인
        if (!this.canCommit()) {
            const reason = this.getCommitBlockReason();
            console.error('[AUTUS] Commit blocked:', reason);
            throw new Error(`COMMIT_BLOCKED: ${reason}`);
        }
        
        try {
            const response = await fetch(`${AUTUS_API_BASE}/commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: 'autus.commit.v1',
                    session_id: this._sessionId,
                    t_ms: Date.now(),
                    commit_reason: options.reason || 'USER_COMMIT',
                    options: {
                        create_marker: options.createMarker !== false,
                        marker_label: options.label
                    }
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            console.log(`[AUTUS] Commit successful:`, {
                stateHash: result.state_hash,
                markerId: result.marker_id,
                steps: result.processing_steps
            });
            
            // 상태 갱신
            await this.fetchState();
            
            // Commit 후 Draft 캐시 삭제
            localStorage.removeItem(STORAGE_KEY);
            
            return result;
        } catch (error) {
            console.error('[AUTUS] commit failed:', error);
            throw error;
        }
    },
    
    /**
     * POST /replay/marker - Replay 마커 생성
     */
    async createMarker(stateHash, label = null) {
        try {
            const prevHash = this._state?.replay?.last_chain_hash || null;
            
            const response = await fetch(`${AUTUS_API_BASE}/replay/marker`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: 'autus.marker.v1',
                    session_id: this._sessionId,
                    t_ms: Date.now(),
                    state_hash: stateHash,
                    prev_hash: prevHash,
                    label: label
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`[AUTUS] Marker created:`, result.marker);
            
            return result.marker;
        } catch (error) {
            console.error('[AUTUS] createMarker failed:', error);
            throw error;
        }
    },
    
    // ================================================================
    // PAGE-SPECIFIC HELPERS
    // ================================================================
    
    /**
     * Page 1: Mass/Volume/Horizon 업데이트
     */
    async updatePage1(massMod = null, volumeOverride = null, horizon = null) {
        const patch = {};
        if (massMod !== null) patch.mass_mod = this._clamp(massMod, -0.5, 0.5);
        if (volumeOverride !== null) patch.volume_override = this._clamp(volumeOverride, 0.01, 1.0);
        if (horizon !== null) patch.horizon = horizon;
        
        if (Object.keys(patch).length > 0) {
            return this.updateDraft(1, patch);
        }
    },
    
    /**
     * Page 2: Sigma/NodeOps 업데이트
     */
    async updatePage2(sigmaDelta = null, ops = null) {
        const patch = {};
        if (sigmaDelta !== null) patch.sigma_delta = this._clamp(sigmaDelta, -0.5, 0.5);
        if (ops !== null) patch.ops = ops;
        
        if (Object.keys(patch).length > 0) {
            return this.updateDraft(2, patch);
        }
    },
    
    /**
     * Page 3: Allocations 업데이트 (자동 정규화)
     */
    async updatePage3(allocations) {
        // 합계 = 1.0 정규화 (부동 소수점 오차 방지)
        const normalized = this._normalizeAllocations(allocations);
        return this.updateDraft(3, { allocations: normalized });
    },
    
    /**
     * 특정 슬롯에 투자 증가
     */
    async investSlot(slot, delta = 0.1) {
        const current = this._state?.draft?.page3?.allocations || this._defaultAllocations();
        const newAllocations = { ...current };
        newAllocations[slot] = (newAllocations[slot] || 0) + delta;
        return this.updatePage3(newAllocations);
    },
    
    // ================================================================
    // GATE CONTROLLER (LOCKED)
    // ================================================================
    
    /**
     * Commit 버튼 활성화 조건 체크
     * 
     * 규칙 (P_outcome 기반):
     * - P_outcome >= 0.3 (최소 임계치)
     * - sigma <= 0.7 (불확실성 상한)
     * - mode === 'SIM'
     */
    canCommit() {
        if (!this._state) return false;
        
        const { sigma, node_type } = this._state.measure || {};
        const { P_outcome } = this._state.forecast || {};
        const mode = this._state.ui?.mode;
        
        // SIM 모드에서만 Commit 가능
        if (mode !== 'SIM') return false;
        
        // 엔트로피가 너무 높으면 불가
        if (sigma > 0.7) return false;
        
        // THRESHOLD 상태면 항상 가능
        if (node_type === 'THRESHOLD') return true;
        
        // P_outcome 최소 임계치
        if (P_outcome < 0.3) return false;
        
        return true;
    },
    
    /**
     * Commit 불가 사유 반환
     */
    getCommitBlockReason() {
        if (!this._state) return 'NO_STATE';
        
        const { sigma, node_type } = this._state.measure || {};
        const { P_outcome } = this._state.forecast || {};
        const mode = this._state.ui?.mode;
        
        if (mode === 'LIVE') return 'ALREADY_LIVE';
        if (sigma > 0.7) return 'ENTROPY_TOO_HIGH';
        if (P_outcome < 0.3) return 'P_OUTCOME_TOO_LOW';
        if (sigma > 0.5 && node_type !== 'THRESHOLD') return 'BELOW_THRESHOLD';
        
        return null;
    },
    
    /**
     * 물리적 변곡점 체크 (시각 효과용)
     */
    checkMilestone() {
        if (!this._state) return null;
        
        const { density, stability, sigma } = this._state.measure || {};
        const { P_outcome } = this._state.forecast || {};
        
        // Density 0.9 돌파
        if (density >= 0.9) return { type: 'DENSITY_HIGH', value: density };
        
        // Stability 0.8 돌파
        if (stability >= 0.8) return { type: 'STABILITY_HIGH', value: stability };
        
        // P_outcome 0.7 돌파
        if (P_outcome >= 0.7) return { type: 'P_OUTCOME_HIGH', value: P_outcome };
        
        // Sigma 0.2 이하 (낮은 불확실성)
        if (sigma <= 0.2) return { type: 'SIGMA_LOW', value: sigma };
        
        return null;
    },
    
    // ================================================================
    // POLLING
    // ================================================================
    
    /**
     * 주기적 상태 폴링 시작
     */
    startPolling(intervalMs = 2000) {
        this.stopPolling();
        this._pollInterval = setInterval(() => this.fetchState().catch(() => {}), intervalMs);
        console.log(`[AUTUS] Polling started (${intervalMs}ms)`);
    },
    
    /**
     * 폴링 중지
     */
    stopPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
            console.log('[AUTUS] Polling stopped');
        }
    },
    
    // ================================================================
    // UTILITIES (결정론적)
    // ================================================================
    
    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    /**
     * Allocation 정규화 (합계 = 1.0)
     * 부동 소수점 오차 방지를 위해 10000배 연산 후 복원
     */
    _normalizeAllocations(allocations) {
        const slots = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const total = slots.reduce((sum, s) => sum + (allocations[s] || 0), 0);
        
        if (total === 0) return this._defaultAllocations();
        
        // 정수 연산으로 부동 소수점 오차 방지
        const intValues = {};
        let intSum = 0;
        
        slots.forEach(s => {
            const ratio = (allocations[s] || 0) / total;
            intValues[s] = Math.round(ratio * 10000);
            intSum += intValues[s];
        });
        
        // 합계 보정 (마지막 슬롯에 반영)
        const diff = 10000 - intSum;
        if (diff !== 0) {
            const maxSlot = slots.reduce((a, b) => intValues[a] > intValues[b] ? a : b);
            intValues[maxSlot] += diff;
        }
        
        // 소수점 복원
        const normalized = {};
        slots.forEach(s => {
            normalized[s] = intValues[s] / 10000;
        });
        
        return normalized;
    },
    
    _defaultAllocations() {
        return {
            N: 0.125, NE: 0.125, E: 0.125, SE: 0.125,
            S: 0.125, SW: 0.125, W: 0.125, NW: 0.125
        };
    },
    
    // ================================================================
    // GETTERS
    // ================================================================
    
    get state() { return this._state; },
    get sessionId() { return this._sessionId; },
    get mode() { return this._state?.ui?.mode || 'SIM'; },
    get measure() { return this._state?.measure || {}; },
    get forecast() { return this._state?.forecast || {}; },
    get draft() { return this._state?.draft || {}; },
    get graph() { return this._state?.graph || { nodes: [], edges: [] } },
    get connected() { return this._connected; },
    get lastError() { return this._lastError; }
};

export default AutusEngine;





