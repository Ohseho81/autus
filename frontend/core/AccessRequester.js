// ================================================================
// ACCESS REQUESTER
// Reference Logic - Pull raw data for temporary calculation only
// Core engine stores ONLY Physics Attributes, never raw data
// ================================================================

export const AccessRequester = {
    // Active data requests
    activeRequests: new Map(),
    
    // Request timeout (ms)
    REQUEST_TIMEOUT: 30000,
    
    // ================================================================
    // PHYSICS ATTRIBUTE SCHEMA
    // The ONLY data types stored in core engine
    // ================================================================
    
    PHYSICS_ATTRIBUTES: {
        node_mass: { type: 'number', range: [0, 10], default: 1.0 },
        connection_gravity: { type: 'number', range: [0, 1], default: 0.5 },
        friction_coefficient: { type: 'number', range: [0, 1], default: 0.3 },
        potential_energy: { type: 'number', range: [0, Infinity], default: 0 },
        kinetic_energy: { type: 'number', range: [0, Infinity], default: 0 },
        entropy_level: { type: 'number', range: [0, 1], default: 0.2 },
        stability_index: { type: 'number', range: [0, 1], default: 0.5 },
        influence_radius: { type: 'number', range: [0, 100], default: 10 },
        decay_rate: { type: 'number', range: [0, 1], default: 0.01 },
        resonance_frequency: { type: 'number', range: [0, 100], default: 1 }
    },
    
    // ================================================================
    // DATA REQUEST METHODS
    // Pull raw data TEMPORARILY for calculation
    // ================================================================
    
    /**
     * Request raw data from a source
     * Data is processed and immediately discarded
     * Only physics attributes are retained
     * @param {string} sourceId - Data source identifier
     * @param {Object} bridge - DataBridge instance
     * @param {Function} calculator - Function to convert raw → physics
     * @returns {Promise<Object>} Physics attributes only
     */
    requestForCalculation: async function(sourceId, bridge, calculator) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.activeRequests.set(requestId, {
            sourceId,
            startTime: Date.now(),
            status: 'pending'
        });
        
        try {
            // Pull raw data temporarily
            const rawData = await bridge.pullData(sourceId);
            
            // Convert to physics attributes immediately
            const physicsAttributes = calculator(rawData);
            
            // Validate physics attributes
            const validated = this.validatePhysicsAttributes(physicsAttributes);
            
            // Raw data is now out of scope - automatically garbage collected
            // Only physics attributes are returned
            
            this.activeRequests.set(requestId, {
                ...this.activeRequests.get(requestId),
                status: 'completed',
                endTime: Date.now()
            });
            
            // Clean up request after short delay
            setTimeout(() => this.activeRequests.delete(requestId), 5000);
            
            return {
                requestId,
                attributes: validated,
                dataRetained: false, // Confirm no raw data retained
                timestamp: Date.now()
            };
            
        } catch (error) {
            this.activeRequests.set(requestId, {
                ...this.activeRequests.get(requestId),
                status: 'failed',
                error: error.message
            });
            
            throw error;
        }
    },
    
    /**
     * Batch request for multiple sources
     * @param {Array<string>} sourceIds - Array of source identifiers
     * @param {Object} bridge - DataBridge instance
     * @param {Function} calculator - Conversion function
     * @returns {Promise<Array>} Array of physics attributes
     */
    batchRequest: async function(sourceIds, bridge, calculator) {
        const results = await Promise.all(
            sourceIds.map(id => this.requestForCalculation(id, bridge, calculator))
        );
        
        return {
            count: results.length,
            attributes: results.map(r => r.attributes),
            allCompleted: results.every(r => r.attributes !== null)
        };
    },
    
    // ================================================================
    // PHYSICS ATTRIBUTE VALIDATION
    // ================================================================
    
    /**
     * Validate and sanitize physics attributes
     * @param {Object} attributes - Raw physics attributes
     * @returns {Object} Validated attributes
     */
    validatePhysicsAttributes: function(attributes) {
        const validated = {};
        
        Object.entries(this.PHYSICS_ATTRIBUTES).forEach(([key, schema]) => {
            let value = attributes[key];
            
            // Apply default if missing
            if (value === undefined || value === null) {
                value = schema.default;
            }
            
            // Type coercion
            if (schema.type === 'number') {
                value = Number(value) || schema.default;
            }
            
            // Range clamping
            if (schema.range) {
                value = Math.max(schema.range[0], Math.min(schema.range[1], value));
            }
            
            validated[key] = value;
        });
        
        return validated;
    },
    
    /**
     * Check if object contains only physics attributes
     * @param {Object} obj - Object to check
     * @returns {boolean} True if pure physics attributes
     */
    isPurePhysics: function(obj) {
        const allowedKeys = Object.keys(this.PHYSICS_ATTRIBUTES);
        const objKeys = Object.keys(obj);
        
        return objKeys.every(key => 
            allowedKeys.includes(key) || key.startsWith('_')
        );
    },
    
    // ================================================================
    // RAW DATA CONVERTERS
    // Transform specific data types to physics attributes
    // ================================================================
    
    converters: {
        /**
         * Convert calendar data to physics
         */
        calendar: (rawData) => {
            const events = rawData.events || [];
            const totalHours = events.reduce((sum, e) => sum + (e.duration || 0), 0);
            const freeHours = 24 * 7 - totalHours; // Weekly
            
            return {
                node_mass: Math.min(totalHours / 40, 2), // Normalized to 40h week
                potential_energy: freeHours * 10, // Free time = potential
                entropy_level: events.length > 20 ? 0.8 : events.length / 25,
                stability_index: totalHours > 0 ? Math.min(totalHours / 168, 1) : 0.1
            };
        },
        
        /**
         * Convert financial data to physics
         */
        financial: (rawData) => {
            const income = rawData.income || 0;
            const expenses = rawData.expenses || 0;
            const savings = income - expenses;
            
            return {
                node_mass: Math.log10(Math.max(income, 1)) / 6, // Log scale
                potential_energy: Math.max(savings, 0),
                kinetic_energy: expenses * 0.3, // Money in motion
                friction_coefficient: expenses / Math.max(income, 1),
                stability_index: savings > 0 ? Math.min(savings / income, 1) : 0
            };
        },
        
        /**
         * Convert relationship data to physics
         */
        relationship: (rawData) => {
            const interactions = rawData.interactions || 0;
            const lastContact = rawData.lastContactDays || 30;
            const sentiment = rawData.sentiment || 0.5;
            
            return {
                connection_gravity: Math.min(interactions / 10, 1),
                decay_rate: Math.min(lastContact / 90, 1), // 90 days = full decay
                resonance_frequency: sentiment,
                influence_radius: interactions * sentiment * 10,
                entropy_level: lastContact > 30 ? 0.7 : lastContact / 45
            };
        },
        
        /**
         * Convert productivity data to physics
         */
        productivity: (rawData) => {
            const tasksCompleted = rawData.completed || 0;
            const tasksPending = rawData.pending || 0;
            const focusTime = rawData.focusMinutes || 0;
            
            return {
                kinetic_energy: tasksCompleted * 10,
                potential_energy: tasksPending * 5,
                node_mass: (tasksCompleted + tasksPending) / 20,
                stability_index: tasksCompleted / Math.max(tasksCompleted + tasksPending, 1),
                friction_coefficient: tasksPending / Math.max(tasksCompleted, 1)
            };
        },
        
        /**
         * Generic converter for unknown data
         */
        generic: (rawData) => {
            const keys = Object.keys(rawData);
            const numericValues = keys
                .map(k => Number(rawData[k]))
                .filter(v => !isNaN(v));
            
            const avg = numericValues.length > 0 
                ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length 
                : 0.5;
            
            return {
                node_mass: Math.min(avg / 100, 2),
                potential_energy: avg,
                stability_index: 0.5,
                entropy_level: 0.3
            };
        }
    },
    
    /**
     * Get appropriate converter for data type
     * @param {string} dataType - Type of data
     * @returns {Function} Converter function
     */
    getConverter: function(dataType) {
        return this.converters[dataType] || this.converters.generic;
    },
    
    // ================================================================
    // CLEANUP & MONITORING
    // ================================================================
    
    /**
     * Get active request status
     */
    getActiveRequests: function() {
        const now = Date.now();
        const requests = [];
        
        this.activeRequests.forEach((value, key) => {
            requests.push({
                id: key,
                ...value,
                age: now - value.startTime
            });
        });
        
        return requests;
    },
    
    /**
     * Cancel stale requests
     */
    cleanupStaleRequests: function() {
        const now = Date.now();
        const stale = [];
        
        this.activeRequests.forEach((value, key) => {
            if (now - value.startTime > this.REQUEST_TIMEOUT) {
                stale.push(key);
            }
        });
        
        stale.forEach(key => this.activeRequests.delete(key));
        
        return { cleaned: stale.length };
    }
};

export default AccessRequester;




