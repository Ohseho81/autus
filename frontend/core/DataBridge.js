// ================================================================
// DATA BRIDGE
// Secure, persistent connection to user's data storage
// Central DB stores ONLY metadata about access, never raw data
// ================================================================

export const DataBridge = {
    // Active bridges
    bridges: new Map(),
    
    // Supported storage types
    STORAGE_TYPES: {
        LOCAL: 'local',
        GDRIVE: 'google_drive',
        DROPBOX: 'dropbox',
        ONEDRIVE: 'onedrive',
        ICLOUD: 'icloud',
        CUSTOM_API: 'custom_api',
        INDEXEDDB: 'indexeddb'
    },
    
    // ================================================================
    // BRIDGE METADATA SCHEMA
    // This is the ONLY persistent record in central DB
    // ================================================================
    
    createBridgeMetadata: function(config) {
        return {
            bridge_id: `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            storage_type: config.storageType,
            access_path: config.accessPath, // e.g., folder path, API endpoint
            auth_method: config.authMethod, // oauth, api_key, local
            auth_token_ref: config.tokenRef, // Reference to encrypted token, NOT the token itself
            permissions: config.permissions || ['read'],
            created_at: Date.now(),
            last_accessed: null,
            access_count: 0,
            status: 'active',
            
            // NO raw data, NO credentials stored here
            _data_retained: false,
            _credentials_stored: false
        };
    },
    
    // ================================================================
    // BRIDGE ESTABLISHMENT
    // ================================================================
    
    /**
     * Establish a new bridge to user's data storage
     * @param {Object} config - Bridge configuration
     * @returns {Object} Bridge metadata (to be stored in central DB)
     */
    establish: async function(config) {
        const metadata = this.createBridgeMetadata(config);
        
        // Create adapter based on storage type
        const adapter = this.createAdapter(config.storageType, config);
        
        // Test connection
        const connectionTest = await adapter.testConnection();
        
        if (!connectionTest.success) {
            throw new Error(`Bridge establishment failed: ${connectionTest.error}`);
        }
        
        // Store bridge locally (adapter + metadata reference)
        this.bridges.set(metadata.bridge_id, {
            adapter,
            metadata,
            established: Date.now()
        });
        
        return {
            metadata, // This goes to central DB
            bridgeId: metadata.bridge_id,
            status: 'established'
        };
    },
    
    /**
     * Create storage adapter based on type
     */
    createAdapter: function(storageType, config) {
        const adapters = {
            [this.STORAGE_TYPES.LOCAL]: () => new LocalStorageAdapter(config),
            [this.STORAGE_TYPES.GDRIVE]: () => new GoogleDriveAdapter(config),
            [this.STORAGE_TYPES.DROPBOX]: () => new DropboxAdapter(config),
            [this.STORAGE_TYPES.INDEXEDDB]: () => new IndexedDBAdapter(config),
            [this.STORAGE_TYPES.CUSTOM_API]: () => new CustomAPIAdapter(config)
        };
        
        const factory = adapters[storageType];
        if (!factory) {
            throw new Error(`Unsupported storage type: ${storageType}`);
        }
        
        return factory();
    },
    
    // ================================================================
    // DATA OPERATIONS
    // All operations are temporary - data is not retained
    // ================================================================
    
    /**
     * Pull data through bridge (temporary access)
     * @param {string} sourceId - Source identifier
     * @returns {Promise<Object>} Raw data (for temporary calculation only)
     */
    pullData: async function(sourceId) {
        const bridge = this.findBridgeForSource(sourceId);
        
        if (!bridge) {
            throw new Error(`No bridge found for source: ${sourceId}`);
        }
        
        // Update access metadata
        bridge.metadata.last_accessed = Date.now();
        bridge.metadata.access_count++;
        
        // Pull data through adapter
        const rawData = await bridge.adapter.pull(sourceId);
        
        // Return data for temporary use
        // Caller is responsible for not retaining this
        return rawData;
    },
    
    /**
     * Push physics update back to source
     * Only physics attributes are sent, not raw data
     * @param {string} sourceId - Source identifier
     * @param {Object} physicsUpdate - Physics attributes update
     */
    pushPhysicsUpdate: async function(sourceId, physicsUpdate) {
        const bridge = this.findBridgeForSource(sourceId);
        
        if (!bridge) {
            throw new Error(`No bridge found for source: ${sourceId}`);
        }
        
        // Validate that only physics attributes are being sent
        if (!this.isPhysicsOnly(physicsUpdate)) {
            throw new Error('Only physics attributes can be pushed through bridge');
        }
        
        // Push through adapter
        await bridge.adapter.pushPhysics(sourceId, physicsUpdate);
        
        return { success: true, timestamp: Date.now() };
    },
    
    /**
     * Validate object contains only physics attributes
     */
    isPhysicsOnly: function(obj) {
        const physicsKeys = [
            'node_mass', 'connection_gravity', 'friction_coefficient',
            'potential_energy', 'kinetic_energy', 'entropy_level',
            'stability_index', 'influence_radius', 'decay_rate',
            'resonance_frequency', 'timestamp', 'source_id'
        ];
        
        return Object.keys(obj).every(key => 
            physicsKeys.includes(key) || key.startsWith('_')
        );
    },
    
    /**
     * Find bridge that can handle a source
     */
    findBridgeForSource: function(sourceId) {
        for (const [_, bridge] of this.bridges) {
            if (bridge.adapter.canHandle(sourceId)) {
                return bridge;
            }
        }
        return null;
    },
    
    // ================================================================
    // BRIDGE MANAGEMENT
    // ================================================================
    
    /**
     * Get bridge status
     */
    getBridgeStatus: function(bridgeId) {
        const bridge = this.bridges.get(bridgeId);
        if (!bridge) return null;
        
        return {
            id: bridgeId,
            status: bridge.metadata.status,
            lastAccessed: bridge.metadata.last_accessed,
            accessCount: bridge.metadata.access_count,
            storageType: bridge.metadata.storage_type
        };
    },
    
    /**
     * List all active bridges
     */
    listBridges: function() {
        const list = [];
        this.bridges.forEach((bridge, id) => {
            list.push({
                id,
                type: bridge.metadata.storage_type,
                status: bridge.metadata.status,
                accessCount: bridge.metadata.access_count
            });
        });
        return list;
    },
    
    /**
     * Disconnect bridge
     */
    disconnect: async function(bridgeId) {
        const bridge = this.bridges.get(bridgeId);
        if (!bridge) return { success: false, error: 'Bridge not found' };
        
        // Cleanup adapter
        await bridge.adapter.disconnect();
        
        // Update metadata
        bridge.metadata.status = 'disconnected';
        
        // Remove from active bridges
        this.bridges.delete(bridgeId);
        
        return {
            success: true,
            metadata: bridge.metadata // Return for central DB update
        };
    },
    
    /**
     * Refresh bridge connection
     */
    refresh: async function(bridgeId) {
        const bridge = this.bridges.get(bridgeId);
        if (!bridge) return { success: false, error: 'Bridge not found' };
        
        const result = await bridge.adapter.testConnection();
        bridge.metadata.status = result.success ? 'active' : 'error';
        
        return {
            success: result.success,
            metadata: bridge.metadata
        };
    }
};

// ================================================================
// STORAGE ADAPTERS
// ================================================================

/**
 * Local Storage Adapter (Browser localStorage + IndexedDB)
 */
class LocalStorageAdapter {
    constructor(config) {
        this.basePath = config.accessPath || 'autus_data';
    }
    
    async testConnection() {
        try {
            localStorage.setItem('_test', '1');
            localStorage.removeItem('_test');
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    canHandle(sourceId) {
        return sourceId.startsWith('local:');
    }
    
    async pull(sourceId) {
        const key = sourceId.replace('local:', '');
        const data = localStorage.getItem(`${this.basePath}_${key}`);
        return data ? JSON.parse(data) : null;
    }
    
    async pushPhysics(sourceId, physics) {
        const key = sourceId.replace('local:', '');
        const existing = await this.pull(sourceId) || {};
        existing._physics = physics;
        existing._physics_updated = Date.now();
        localStorage.setItem(`${this.basePath}_${key}`, JSON.stringify(existing));
    }
    
    async disconnect() {
        // Local storage doesn't need disconnection
    }
}

/**
 * IndexedDB Adapter (For larger datasets)
 */
class IndexedDBAdapter {
    constructor(config) {
        this.dbName = config.dbName || 'autus_bridge';
        this.storeName = config.storeName || 'data';
        this.db = null;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }
    
    async testConnection() {
        try {
            await this.init();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    canHandle(sourceId) {
        return sourceId.startsWith('idb:');
    }
    
    async pull(sourceId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const key = sourceId.replace('idb:', '');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async pushPhysics(sourceId, physics) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const key = sourceId.replace('idb:', '');
            
            store.put({
                id: key,
                _physics: physics,
                _physics_updated: Date.now()
            });
            
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    
    async disconnect() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

/**
 * Google Drive Adapter (Simulated)
 */
class GoogleDriveAdapter {
    constructor(config) {
        this.clientId = config.clientId;
        this.tokenRef = config.tokenRef;
        this.folderId = config.folderId;
    }
    
    async testConnection() {
        // In production, would test OAuth token validity
        return { success: true, simulated: true };
    }
    
    canHandle(sourceId) {
        return sourceId.startsWith('gdrive:');
    }
    
    async pull(sourceId) {
        // In production, would use Google Drive API
        console.log(`[GDrive] Would pull: ${sourceId}`);
        return { simulated: true, sourceId };
    }
    
    async pushPhysics(sourceId, physics) {
        console.log(`[GDrive] Would push physics to: ${sourceId}`, physics);
    }
    
    async disconnect() {
        // Would revoke OAuth token
    }
}

/**
 * Dropbox Adapter (Simulated)
 */
class DropboxAdapter {
    constructor(config) {
        this.tokenRef = config.tokenRef;
        this.path = config.path;
    }
    
    async testConnection() {
        return { success: true, simulated: true };
    }
    
    canHandle(sourceId) {
        return sourceId.startsWith('dropbox:');
    }
    
    async pull(sourceId) {
        console.log(`[Dropbox] Would pull: ${sourceId}`);
        return { simulated: true, sourceId };
    }
    
    async pushPhysics(sourceId, physics) {
        console.log(`[Dropbox] Would push physics to: ${sourceId}`, physics);
    }
    
    async disconnect() {}
}

/**
 * Custom API Adapter
 */
class CustomAPIAdapter {
    constructor(config) {
        this.endpoint = config.endpoint;
        this.authHeader = config.authHeader;
    }
    
    async testConnection() {
        try {
            const response = await fetch(`${this.endpoint}/health`);
            return { success: response.ok };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    canHandle(sourceId) {
        return sourceId.startsWith('api:');
    }
    
    async pull(sourceId) {
        const path = sourceId.replace('api:', '');
        const response = await fetch(`${this.endpoint}${path}`, {
            headers: this.authHeader ? { 'Authorization': this.authHeader } : {}
        });
        return await response.json();
    }
    
    async pushPhysics(sourceId, physics) {
        const path = sourceId.replace('api:', '');
        await fetch(`${this.endpoint}${path}/physics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.authHeader ? { 'Authorization': this.authHeader } : {})
            },
            body: JSON.stringify(physics)
        });
    }
    
    async disconnect() {}
}

export default DataBridge;




