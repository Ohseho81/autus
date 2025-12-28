// ================================================================
// AUTUS LOCAL-FIRST HYBRID STORAGE (BEZOS EDITION)
// 로컬 우선 하이브리드 아키텍처
//
// 기능:
// 1. Local Persistence - Raw 센서 로그 로컬 저장
// 2. Central Sync - 익명화된 벡터만 동기화
// 3. Data Integrity - 해시 체크, AES-256 암호화
// 4. Auto-Purge - 벡터 추출 후 7일 자동 삭제
//
// Version: 2.0.0
// Status: LOCKED
// ================================================================

// ================================================================
// ENUMS
// ================================================================

export const StorageLocation = {
    LOCAL: 'LOCAL',
    CENTRAL: 'CENTRAL'
};

export const DataCategory = {
    RAW_SENSOR: 'RAW_SENSOR',
    EXTRACTED_VECTOR: 'EXTRACTED_VECTOR',
    CONFIG: 'CONFIG',
    HISTORY: 'HISTORY'
};

export const EncryptionStatus = {
    ENCRYPTED: 'ENCRYPTED',
    DECRYPTED: 'DECRYPTED',
    PENDING: 'PENDING'
};

// ================================================================
// ENCRYPTION MODULE (Simulated AES-256)
// ================================================================

export const EncryptionModule = {
    key: null,
    
    /**
     * 초기화
     */
    init(userKey = null) {
        if (userKey) {
            this.key = this._deriveKey(userKey);
        } else {
            this.key = this._generateKey();
        }
        return this;
    },
    
    /**
     * 256비트 키 생성
     */
    _generateKey() {
        const array = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            for (let i = 0; i < 32; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return array;
    },
    
    /**
     * 사용자 키에서 암호화 키 유도
     */
    _deriveKey(userKey) {
        const encoder = new TextEncoder();
        const data = encoder.encode(userKey);
        
        // Simple hash simulation
        const hash = new Uint8Array(32);
        for (let i = 0; i < data.length; i++) {
            hash[i % 32] ^= data[i];
            hash[(i + 7) % 32] = (hash[(i + 7) % 32] + data[i]) % 256;
        }
        return hash;
    },
    
    /**
     * 암호화 (시뮬레이션)
     */
    encrypt(data) {
        const encoder = new TextEncoder();
        const dataBytes = typeof data === 'string' 
            ? encoder.encode(data) 
            : data;
        
        // Nonce 생성
        const nonce = new Uint8Array(12);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(nonce);
        } else {
            for (let i = 0; i < 12; i++) {
                nonce[i] = Math.floor(Math.random() * 256);
            }
        }
        
        // XOR 암호화 (시뮬레이션)
        const encrypted = new Uint8Array(dataBytes.length);
        for (let i = 0; i < dataBytes.length; i++) {
            encrypted[i] = dataBytes[i] ^ this.key[i % 32];
        }
        
        // Nonce + Encrypted 결합 후 Base64
        const combined = new Uint8Array(nonce.length + encrypted.length);
        combined.set(nonce);
        combined.set(encrypted, nonce.length);
        
        return btoa(String.fromCharCode(...combined));
    },
    
    /**
     * 복호화 (시뮬레이션)
     */
    decrypt(encryptedData) {
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        const ciphertext = combined.slice(12);
        
        // XOR 복호화
        const decrypted = new Uint8Array(ciphertext.length);
        for (let i = 0; i < ciphertext.length; i++) {
            decrypted[i] = ciphertext[i] ^ this.key[i % 32];
        }
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    },
    
    /**
     * 키 식별자
     */
    getKeyHash() {
        if (!this.key) return 'NOT_INITIALIZED';
        
        // Simple hash
        let hash = 0;
        for (let i = 0; i < this.key.length; i++) {
            hash = ((hash << 5) - hash) + this.key[i];
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
    }
};

// ================================================================
// HASH CHECK MODULE
// ================================================================

export const HashCheckModule = {
    /**
     * SHA-256 해시 계산 (시뮬레이션)
     */
    computeHash(data) {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        
        // Simple hash (실제 구현에서는 crypto.subtle.digest 사용)
        let hash1 = 0, hash2 = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash1 = ((hash1 << 5) - hash1) + char;
            hash2 = ((hash2 << 7) - hash2) + char;
            hash1 = hash1 & hash1;
            hash2 = hash2 & hash2;
        }
        
        return Math.abs(hash1).toString(16).padStart(16, '0') + 
               Math.abs(hash2).toString(16).padStart(16, '0');
    },
    
    /**
     * 해시 검증
     */
    verify(data, expectedHash) {
        const actual = this.computeHash(data);
        return actual === expectedHash;
    },
    
    /**
     * 무결성 체크 수행
     */
    checkIntegrity(entry) {
        const actualHash = this.computeHash(entry.data);
        const isValid = actualHash === entry.hash;
        
        return {
            entryId: entry.id,
            expectedHash: entry.hash,
            actualHash,
            isValid,
            checkedAt: new Date()
        };
    }
};

// ================================================================
// LOCAL STORAGE
// ================================================================

export const LocalStorage = {
    encryption: null,
    hashCheck: HashCheckModule,
    entries: {},
    purgeLog: [],
    
    RAW_DATA_TTL_DAYS: 7,
    
    /**
     * 초기화
     */
    init(encryption) {
        this.encryption = encryption;
        return this;
    },
    
    /**
     * 데이터 저장 (암호화)
     */
    store(id, category, data, ttlDays = null) {
        // JSON 직렬화
        let rawString;
        if (typeof data === 'object') {
            rawString = JSON.stringify(data);
        } else {
            rawString = String(data);
        }
        
        // 암호화
        const encrypted = this.encryption.encrypt(rawString);
        
        // 해시 계산
        const dataHash = HashCheckModule.computeHash(encrypted);
        
        // TTL 설정
        if (ttlDays === null && category === DataCategory.RAW_SENSOR) {
            ttlDays = this.RAW_DATA_TTL_DAYS;
        }
        
        const expiresAt = ttlDays 
            ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000) 
            : null;
        
        const entry = {
            id,
            category,
            data: encrypted,
            hash: dataHash,
            createdAt: new Date(),
            expiresAt,
            encryptionStatus: EncryptionStatus.ENCRYPTED
        };
        
        this.entries[id] = entry;
        return entry;
    },
    
    /**
     * 데이터 조회 (복호화)
     */
    retrieve(id) {
        const entry = this.entries[id];
        if (!entry) return null;
        
        // 만료 체크
        if (entry.expiresAt && new Date() > entry.expiresAt) {
            this._purgeEntry(entry, 'expired');
            return null;
        }
        
        // 무결성 체크
        const integrity = this.hashCheck.checkIntegrity(entry);
        if (!integrity.isValid) {
            throw new Error(`Data integrity check failed for ${id}`);
        }
        
        // 복호화
        const decrypted = this.encryption.decrypt(entry.data);
        
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    },
    
    /**
     * 데이터 삭제
     */
    delete(id, reason = 'manual') {
        const entry = this.entries[id];
        if (entry) {
            return this._purgeEntry(entry, reason);
        }
        return false;
    },
    
    /**
     * 엔트리 삭제 (Secure Purge)
     */
    _purgeEntry(entry, reason) {
        this.purgeLog.push({
            entryId: entry.id,
            category: entry.category,
            purgedAt: new Date(),
            reason
        });
        
        if (this.entries[entry.id]) {
            delete this.entries[entry.id];
        }
        
        return true;
    },
    
    /**
     * 만료된 데이터 자동 삭제
     */
    autoPurgeExpired() {
        const now = new Date();
        let count = 0;
        
        Object.values(this.entries).forEach(entry => {
            if (entry.expiresAt && entry.expiresAt < now) {
                this._purgeEntry(entry, 'auto_expired');
                count++;
            }
        });
        
        return count;
    },
    
    /**
     * SecurePurge - 피처 추출 후 즉시 메모리 와이프
     */
    secureWipe(id) {
        const entry = this.entries[id];
        if (!entry) return false;
        
        // 데이터 덮어쓰기 (보안 삭제)
        entry.data = 'WIPED_' + Math.random().toString(36);
        
        return this._purgeEntry(entry, 'secure_wipe');
    },
    
    /**
     * 저장소 통계
     */
    getStorageStats() {
        const categories = {};
        let totalSize = 0;
        
        Object.values(this.entries).forEach(entry => {
            const cat = entry.category;
            if (!categories[cat]) {
                categories[cat] = { count: 0, size: 0 };
            }
            categories[cat].count++;
            categories[cat].size += entry.data.length;
            totalSize += entry.data.length;
        });
        
        return {
            totalEntries: Object.keys(this.entries).length,
            totalSizeBytes: totalSize,
            categories,
            purgeLogCount: this.purgeLog.length,
            encryptionKeyId: this.encryption.getKeyHash()
        };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.entries = {};
        this.purgeLog = [];
    }
};

// ================================================================
// CENTRAL SYNC MANAGER
// ================================================================

export const CentralSyncManager = {
    hubUrl: 'https://autus-hub.example.com',
    syncQueue: [],
    syncHistory: [],
    
    /**
     * 동기화 벡터 준비 (익명화)
     */
    prepareSyncVector(originalMemberId, mass, velocity, energyLevel) {
        // 익명 ID 생성
        const anonId = HashCheckModule.computeHash(originalMemberId).substring(0, 16);
        
        return {
            memberId: anonId,
            mass: Math.round(mass * 10000) / 10000,
            velocity: velocity.map(v => Math.round(v * 10000) / 10000),
            energyLevel: Math.round(energyLevel * 10000) / 10000,
            timestamp: new Date()
        };
    },
    
    /**
     * 동기화 큐에 추가
     */
    queueSync(vector) {
        this.syncQueue.push(vector);
    },
    
    /**
     * 중앙 허브로 동기화 (시뮬레이션)
     */
    syncToHub() {
        if (this.syncQueue.length === 0) {
            return { synced: 0, status: 'empty_queue' };
        }
        
        const payload = this.syncQueue.map(vector => ({
            member_id: vector.memberId,
            mass: vector.mass,
            velocity: vector.velocity,
            energy_level: vector.energyLevel,
            timestamp: vector.timestamp.toISOString()
        }));
        
        // 시뮬레이션: 성공
        const result = {
            synced: payload.length,
            status: 'success',
            hubUrl: this.hubUrl,
            timestamp: new Date().toISOString()
        };
        
        this.syncHistory.push({
            ...result,
            vectors: payload.length
        });
        
        this.syncQueue = [];
        
        return result;
    },
    
    /**
     * 동기화 상태
     */
    getSyncStatus() {
        return {
            queueSize: this.syncQueue.length,
            totalSynced: this.syncHistory.reduce((s, h) => s + (h.synced || 0), 0),
            lastSync: this.syncHistory.length > 0 
                ? this.syncHistory[this.syncHistory.length - 1].timestamp 
                : null
        };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.syncQueue = [];
        this.syncHistory = [];
    }
};

// ================================================================
// HYBRID STORAGE ORCHESTRATOR
// ================================================================

export const HybridStorageOrchestrator = {
    encryption: null,
    local: null,
    sync: CentralSyncManager,
    vectorCache: {},
    
    /**
     * 초기화
     */
    init(userKey = null) {
        this.encryption = Object.create(EncryptionModule);
        this.encryption.init(userKey);
        
        this.local = Object.create(LocalStorage);
        this.local.init(this.encryption);
        
        this.vectorCache = {};
        
        return this;
    },
    
    /**
     * Raw 센서 데이터 로컬 저장
     */
    storeRawSensorData(sensorId, dataType, rawData) {
        const entryId = `RAW_${sensorId}_${Date.now()}`;
        
        this.local.store(
            entryId,
            DataCategory.RAW_SENSOR,
            {
                sensorId,
                dataType,
                rawData,
                timestamp: new Date().toISOString()
            },
            7  // 7일 후 자동 삭제
        );
        
        return entryId;
    },
    
    /**
     * 벡터 추출 및 동기화
     */
    extractAndSyncVector(memberId, rawEntryIds) {
        // Raw 데이터 조회
        const rawDataList = [];
        rawEntryIds.forEach(entryId => {
            const data = this.local.retrieve(entryId);
            if (data) rawDataList.push(data);
        });
        
        // 벡터 추출 (시뮬레이션)
        const mass = rawDataList.length > 0
            ? rawDataList.reduce((s, d) => s + (d.rawData?.mass || 0.5), 0) / rawDataList.length
            : 0.5;
        
        const energy = rawDataList.length > 0
            ? rawDataList.reduce((s, d) => s + (d.rawData?.energy || 0.5), 0) / rawDataList.length
            : 0.5;
        
        const velocity = [0.1, 0.05, 0.0];  // 시뮬레이션
        
        // 동기화 벡터 생성
        const vector = this.sync.prepareSyncVector(memberId, mass, velocity, energy);
        
        // 동기화 큐에 추가
        this.sync.queueSync(vector);
        
        // 캐시 저장
        this.vectorCache[memberId] = vector;
        
        return vector;
    },
    
    /**
     * 벡터 추출 후 SecurePurge 실행
     */
    securePurgeAfterExtraction(entryIds) {
        let purged = 0;
        entryIds.forEach(entryId => {
            if (this.local.secureWipe(entryId)) purged++;
        });
        return purged;
    },
    
    /**
     * 정기 유지보수 실행
     */
    runMaintenance() {
        // 1. 만료 데이터 삭제
        const expiredCount = this.local.autoPurgeExpired();
        
        // 2. 무결성 검사
        const integrityIssues = [];
        Object.values(this.local.entries).forEach(entry => {
            const check = this.local.hashCheck.checkIntegrity(entry);
            if (!check.isValid) {
                integrityIssues.push(entry.id);
            }
        });
        
        // 3. 동기화 실행
        const syncResult = this.sync.syncToHub();
        
        return {
            expiredPurged: expiredCount,
            integrityIssues: integrityIssues.length,
            syncedVectors: syncResult.synced || 0,
            storageStats: this.local.getStorageStats(),
            syncStatus: this.sync.getSyncStatus()
        };
    },
    
    /**
     * 시스템 상태 조회
     */
    getSystemStatus() {
        return {
            localStorage: this.local.getStorageStats(),
            syncStatus: this.sync.getSyncStatus(),
            encryptionActive: true,
            encryptionKeyId: this.encryption.getKeyHash(),
            vectorCacheSize: Object.keys(this.vectorCache).length
        };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.local?.reset();
        this.sync.reset();
        this.vectorCache = {};
    }
};

// ================================================================
// TEST
// ================================================================

export async function testHybridStorageEngine() {
    console.log('='.repeat(70));
    console.log('AUTUS Local-First Hybrid Storage Test');
    console.log('='.repeat(70));
    
    // 사용자 고유 키로 초기화
    const storage = Object.create(HybridStorageOrchestrator);
    storage.init('user_secret_key_123');
    
    // 1. Raw 센서 데이터 저장
    console.log('\n[1. Raw 센서 데이터 저장]');
    
    const entryIds = [];
    for (let i = 0; i < 5; i++) {
        const entryId = storage.storeRawSensorData(
            `SENSOR_${String(i).padStart(3, '0')}`,
            'AUDIO_TONE',
            {
                mass: 0.4 + i * 0.1,
                energy: 0.5 + i * 0.05,
                rawAudio: `<encrypted_audio_data_${i}>`
            }
        );
        entryIds.push(entryId);
        console.log(`  • Stored: ${entryId}`);
    }
    
    // 2. 저장소 통계
    console.log('\n[2. 저장소 통계]');
    const stats = storage.local.getStorageStats();
    console.log(`  Total Entries: ${stats.totalEntries}`);
    console.log(`  Total Size: ${stats.totalSizeBytes} bytes`);
    console.log(`  Encryption Key ID: ${stats.encryptionKeyId}`);
    
    // 3. 무결성 검사
    console.log('\n[3. 무결성 검사]');
    entryIds.slice(0, 2).forEach(entryId => {
        const entry = storage.local.entries[entryId];
        if (entry) {
            const check = storage.local.hashCheck.checkIntegrity(entry);
            const status = check.isValid ? '✅ Valid' : '❌ Invalid';
            console.log(`  ${entryId}: ${status}`);
        }
    });
    
    // 4. 벡터 추출 및 동기화
    console.log('\n[4. 벡터 추출 및 동기화]');
    const vector = storage.extractAndSyncVector('member_001', entryIds);
    console.log(`  Member ID (Anon): ${vector.memberId}`);
    console.log(`  Mass: ${vector.mass}`);
    console.log(`  Velocity: [${vector.velocity.join(', ')}]`);
    console.log(`  Energy: ${vector.energyLevel}`);
    
    // 5. 동기화 실행
    console.log('\n[5. 중앙 허브 동기화]');
    const syncResult = storage.sync.syncToHub();
    console.log(`  Synced: ${syncResult.synced} vectors`);
    console.log(`  Status: ${syncResult.status}`);
    
    // 6. SecurePurge (선택적)
    console.log('\n[6. SecurePurge 실행]');
    const purged = storage.securePurgeAfterExtraction(entryIds.slice(0, 2));
    console.log(`  Purged: ${purged} entries`);
    
    // 7. 유지보수 실행
    console.log('\n[7. 유지보수 실행]');
    const maintenance = storage.runMaintenance();
    console.log(`  Expired Purged: ${maintenance.expiredPurged}`);
    console.log(`  Integrity Issues: ${maintenance.integrityIssues}`);
    console.log(`  Remaining Entries: ${maintenance.storageStats.totalEntries}`);
    
    // 8. 시스템 상태
    console.log('\n[8. 시스템 상태]');
    const status = storage.getSystemStatus();
    console.log(JSON.stringify(status, null, 2));
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Local-First Storage Test Complete');
    
    return { stats, vector, syncResult, maintenance, status };
}

export default HybridStorageOrchestrator;



