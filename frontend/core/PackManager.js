// ================================================================
// AUTUS PACK MANAGER
// Modular automation pack loading and management system
// ================================================================

export const PackManager = {
    loadedPacks: new Map(),
    registry: {},
    
    // Load a specific pack module
    loadPack: async function(packName) {
        console.log(`[AUTUS] Loading ${packName} Pack...`);
        
        if (this.loadedPacks.has(packName)) {
            console.log(`[AUTUS] ${packName} Pack already loaded`);
            return this.loadedPacks.get(packName);
        }
        
        try {
            const pack = await import(`../packs/${packName}/index.js`);
            this.loadedPacks.set(packName, pack);
            this.registry[packName] = {
                loaded: true,
                timestamp: Date.now(),
                features: pack.features || []
            };
            
            console.log(`[AUTUS] ${packName} Pack loaded successfully`);
            return pack;
        } catch (error) {
            console.error(`[AUTUS] Failed to load ${packName} Pack:`, error);
            return null;
        }
    },
    
    // Unload a pack
    unloadPack: function(packName) {
        if (this.loadedPacks.has(packName)) {
            this.loadedPacks.delete(packName);
            delete this.registry[packName];
            console.log(`[AUTUS] ${packName} Pack unloaded`);
        }
    },
    
    // Get all loaded packs
    getLoadedPacks: function() {
        return Array.from(this.loadedPacks.keys());
    },
    
    // Execute a pack function
    executePack: async function(packName, functionName, ...args) {
        const pack = this.loadedPacks.get(packName);
        if (pack && typeof pack[functionName] === 'function') {
            return await pack[functionName](...args);
        }
        throw new Error(`Function ${functionName} not found in ${packName} pack`);
    },
    
    // Bind pack to physics engine
    bindToPhysics: function(packName, physicsEngine) {
        const pack = this.loadedPacks.get(packName);
        if (pack && pack.bindPhysics) {
            pack.bindPhysics(physicsEngine);
            console.log(`[AUTUS] ${packName} bound to physics engine`);
        }
    }
};

export default PackManager;




