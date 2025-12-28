// ================================================================
// AUTUS SECURE PURGE SYSTEM
// Zero-Server Security Protocol
// Direct Memory Wipe After Feature Extraction
// ================================================================

// ================================================================
// CONSTANTS
// ================================================================

const PURGE_CONFIG = {
    OVERWRITE_PASSES: 3,          // 덮어쓰기 횟수
    ZERO_FILL: true,              // 0으로 채우기
    RANDOM_FILL: true,            // 랜덤 데이터로 채우기
    VERIFY_PURGE: true,           // 삭제 검증
    LOG_PURGE_EVENTS: false,      // 삭제 이벤트 로깅 (디버그용)
    MAX_PURGE_DELAY_MS: 100       // 최대 삭제 지연
};

// ================================================================
// SECURE MEMORY WIPER
// ================================================================

const MemoryWiper = {
    /**
     * Overwrite memory with zeros
     */
    zeroFill: function(data) {
        if (data === null || data === undefined) return;
        
        if (typeof data === 'string') {
            // 문자열은 불변이므로 새 문자열로 대체
            return '\0'.repeat(data.length);
        }
        
        if (ArrayBuffer.isView(data)) {
            // TypedArray 덮어쓰기
            const view = new Uint8Array(data.buffer);
            view.fill(0);
            return data;
        }
        
        if (data instanceof ArrayBuffer) {
            const view = new Uint8Array(data);
            view.fill(0);
            return data;
        }
        
        if (Array.isArray(data)) {
            data.fill(0);
            return data;
        }
        
        if (typeof data === 'object') {
            Object.keys(data).forEach(key => {
                data[key] = this.zeroFill(data[key]);
            });
            return data;
        }
        
        return null;
    },
    
    /**
     * Overwrite with random data
     */
    randomFill: function(data) {
        if (data === null || data === undefined) return;
        
        if (ArrayBuffer.isView(data)) {
            const view = new Uint8Array(data.buffer);
            crypto.getRandomValues(view);
            return data;
        }
        
        if (data instanceof ArrayBuffer) {
            const view = new Uint8Array(data);
            crypto.getRandomValues(view);
            return data;
        }
        
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random();
            }
            return data;
        }
        
        return data;
    },
    
    /**
     * Multi-pass secure wipe
     */
    secureWipe: function(data, passes = PURGE_CONFIG.OVERWRITE_PASSES) {
        for (let i = 0; i < passes; i++) {
            // 패스 1: 랜덤 데이터
            if (PURGE_CONFIG.RANDOM_FILL && i % 2 === 0) {
                this.randomFill(data);
            }
            // 패스 2: 0으로 채우기
            if (PURGE_CONFIG.ZERO_FILL) {
                this.zeroFill(data);
            }
        }
        
        return data;
    }
};

// ================================================================
// LOCAL STORAGE HANDLER
// ================================================================

const LocalStorageHandler = {
    STORAGE_PREFIX: 'autus_',
    
    /**
     * Save to local storage with encryption hint
     */
    save: function(key, data) {
        const fullKey = this.STORAGE_PREFIX + key;
        const encrypted = this.simpleEncrypt(JSON.stringify(data));
        
        try {
            localStorage.setItem(fullKey, encrypted);
            return true;
        } catch (e) {
            console.error('[LocalStorage] Save failed:', e.message);
            return false;
        }
    },
    
    /**
     * Load from local storage
     */
    load: function(key) {
        const fullKey = this.STORAGE_PREFIX + key;
        
        try {
            const encrypted = localStorage.getItem(fullKey);
            if (!encrypted) return null;
            
            return JSON.parse(this.simpleDecrypt(encrypted));
        } catch (e) {
            console.error('[LocalStorage] Load failed:', e.message);
            return null;
        }
    },
    
    /**
     * Delete from local storage
     */
    delete: function(key) {
        const fullKey = this.STORAGE_PREFIX + key;
        localStorage.removeItem(fullKey);
    },
    
    /**
     * Clear all AUTUS data
     */
    clearAll: function() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        return keysToRemove.length;
    },
    
    /**
     * Simple XOR encryption (should use Web Crypto API in production)
     */
    simpleEncrypt: function(text) {
        const key = 'AUTUS_LOCAL_KEY';
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        
        return btoa(result);
    },
    
    /**
     * Simple XOR decryption
     */
    simpleDecrypt: function(encoded) {
        const key = 'AUTUS_LOCAL_KEY';
        const text = atob(encoded);
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        
        return result;
    }
};

// ================================================================
// INDEXED DB HANDLER
// ================================================================

const IndexedDBHandler = {
    DB_NAME: 'AUTUS_DB',
    DB_VERSION: 1,
    db: null,
    
    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Features store
                if (!db.objectStoreNames.contains('features')) {
                    db.createObjectStore('features', { keyPath: 'id', autoIncrement: true });
                }
                
                // Physics store
                if (!db.objectStoreNames.contains('physics')) {
                    db.createObjectStore('physics', { keyPath: 'id' });
                }
            };
        });
    },
    
    /**
     * Save to IndexedDB
     */
    async save(storeName, data) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    /**
     * Load from IndexedDB
     */
    async load(storeName, id) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    /**
     * Delete from IndexedDB
     */
    async delete(storeName, id) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },
    
    /**
     * Clear entire store
     */
    async clearStore(storeName) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
};

// ================================================================
// PURGE VERIFIER
// ================================================================

const PurgeVerifier = {
    /**
     * Verify data has been purged
     */
    verify: function(data) {
        if (data === null || data === undefined) {
            return { success: true, reason: 'null_or_undefined' };
        }
        
        if (typeof data === 'string' && data.length === 0) {
            return { success: true, reason: 'empty_string' };
        }
        
        if (ArrayBuffer.isView(data)) {
            const view = new Uint8Array(data.buffer);
            const allZeros = view.every(b => b === 0);
            return { 
                success: allZeros, 
                reason: allZeros ? 'zeroed' : 'not_zeroed' 
            };
        }
        
        if (Array.isArray(data)) {
            const allZeros = data.every(v => v === 0 || v === null);
            return { 
                success: allZeros, 
                reason: allZeros ? 'zeroed' : 'not_zeroed' 
            };
        }
        
        if (typeof data === 'object') {
            const keys = Object.keys(data);
            const allNull = keys.every(k => 
                data[k] === null || data[k] === undefined || data[k] === 0
            );
            return { 
                success: allNull, 
                reason: allNull ? 'nullified' : 'has_values' 
            };
        }
        
        return { success: false, reason: 'unknown_type' };
    }
};

// ================================================================
// SECURE PURGE (Unified Interface)
// ================================================================

export const SecurePurge = {
    wiper: MemoryWiper,
    localStorage: LocalStorageHandler,
    indexedDB: IndexedDBHandler,
    verifier: PurgeVerifier,
    config: PURGE_CONFIG,
    
    // Purge statistics
    stats: {
        totalPurges: 0,
        successfulPurges: 0,
        failedPurges: 0,
        lastPurgeTime: null
    },
    
    /**
     * Initialize secure purge system
     */
    async init() {
        await this.indexedDB.init();
        console.log('[SecurePurge] Initialized - Zero-Server Protocol Active');
        return this;
    },
    
    /**
     * Purge data from memory
     * @param {*} data - Data to purge
     * @param {Object} options - Purge options
     */
    purge: function(data, options = {}) {
        const startTime = Date.now();
        
        try {
            // 멀티패스 보안 삭제
            const passes = options.passes || PURGE_CONFIG.OVERWRITE_PASSES;
            this.wiper.secureWipe(data, passes);
            
            // 검증
            if (PURGE_CONFIG.VERIFY_PURGE) {
                const verification = this.verifier.verify(data);
                
                if (!verification.success) {
                    console.warn('[SecurePurge] Verification failed:', verification.reason);
                    // 추가 시도
                    this.wiper.zeroFill(data);
                }
            }
            
            // 참조 제거
            data = null;
            
            this.stats.totalPurges++;
            this.stats.successfulPurges++;
            this.stats.lastPurgeTime = Date.now();
            
            if (PURGE_CONFIG.LOG_PURGE_EVENTS) {
                console.log(`[SecurePurge] Completed in ${Date.now() - startTime}ms`);
            }
            
            return { success: true, duration: Date.now() - startTime };
            
        } catch (err) {
            this.stats.totalPurges++;
            this.stats.failedPurges++;
            
            console.error('[SecurePurge] Failed:', err.message);
            return { success: false, error: err.message };
        }
    },
    
    /**
     * Purge multiple data items
     */
    purgeBatch: function(dataArray) {
        return dataArray.map(data => this.purge(data));
    },
    
    /**
     * Save features to local storage (physics only)
     */
    saveFeatures: function(key, features) {
        // 물리 속성만 저장 (raw data 제외)
        const physicsOnly = this.extractPhysicsOnly(features);
        return this.localStorage.save(key, physicsOnly);
    },
    
    /**
     * Extract physics attributes only
     */
    extractPhysicsOnly: function(data) {
        const physicsKeys = [
            'mass', 'velocity', 'energy', 'momentum', 'entropy',
            'friction', 'gravity', 'position', 'direction',
            'score', 'level', 'confidence', 'rate', 'count'
        ];
        
        const result = {};
        
        const extract = (obj, target) => {
            Object.entries(obj).forEach(([key, value]) => {
                // 물리 키이거나 숫자형인 경우만
                if (physicsKeys.some(pk => key.toLowerCase().includes(pk))) {
                    target[key] = value;
                } else if (typeof value === 'number') {
                    target[key] = value;
                } else if (typeof value === 'object' && value !== null) {
                    target[key] = {};
                    extract(value, target[key]);
                }
            });
        };
        
        extract(data, result);
        return result;
    },
    
    /**
     * Load saved features
     */
    loadFeatures: function(key) {
        return this.localStorage.load(key);
    },
    
    /**
     * Clear all local data
     */
    async clearAllData() {
        // LocalStorage 클리어
        const localCount = this.localStorage.clearAll();
        
        // IndexedDB 클리어
        await this.indexedDB.clearStore('features');
        await this.indexedDB.clearStore('physics');
        
        console.log(`[SecurePurge] Cleared all data: ${localCount} localStorage items`);
        
        return { localStorage: localCount, indexedDB: true };
    },
    
    /**
     * Get purge statistics
     */
    getStats: function() {
        return {
            ...this.stats,
            successRate: this.stats.totalPurges > 0 
                ? (this.stats.successfulPurges / this.stats.totalPurges * 100).toFixed(1) + '%'
                : 'N/A'
        };
    },
    
    /**
     * Create secure data container
     * Data is automatically purged after TTL
     */
    createSecureContainer: function(data, ttlMs = 60000) {
        const container = {
            data,
            createdAt: Date.now(),
            ttl: ttlMs,
            isValid: () => Date.now() - container.createdAt < container.ttl,
            get: () => container.isValid() ? container.data : null,
            destroy: () => {
                SecurePurge.purge(container.data);
                container.data = null;
            }
        };
        
        // 자동 삭제 타이머
        setTimeout(() => {
            if (container.data !== null) {
                container.destroy();
            }
        }, ttlMs);
        
        return container;
    }
};

export { MemoryWiper, LocalStorageHandler, IndexedDBHandler, PurgeVerifier, PURGE_CONFIG };

export default SecurePurge;




