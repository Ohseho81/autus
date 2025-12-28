// ================================================================
// RAW-TO-VECTOR ENGINE (CONVERTER)
// [ELON'S FIRST PRINCIPLES] Physics Map Converter
// No Storage Policy: Immediately destroy raw data after extraction
// ================================================================

const GLOBAL_MONEY_CONSTANT = 0.0001; // Capital flow coefficient

export const Converter = {
    // ================================================================
    // NO STORAGE POLICY
    // Raw data is NEVER stored, only converted
    // ================================================================
    
    /**
     * Convert raw data to physics vector
     * @param {Object} rawData - Raw input (destroyed after processing)
     * @param {Object} goalNode - Target goal for direction calculation
     * @returns {Object} Physics attributes only
     */
    convert: function(rawData, goalNode) {
        // Extract physics immediately
        const mass = this.extractMass(rawData);
        const velocity = this.extractVelocity(rawData);
        const direction = this.calculateDirection(rawData, goalNode);
        
        // Calculate derived physics
        const energy = this.calculateEnergy(mass, velocity);
        const momentum = mass * velocity;
        const friction = this.estimateFriction(rawData);
        
        // Create physics vector
        const vector = {
            mass,
            velocity,
            direction,
            momentum,
            kinetic_energy: energy.kinetic,
            potential_energy: energy.potential,
            friction_coefficient: friction,
            entropy: this.calculateEntropy(rawData),
            timestamp: Date.now()
        };
        
        // DESTROY RAW DATA
        this.destroy(rawData);
        
        return vector;
    },
    
    /**
     * Destroy raw data after extraction
     * Ensures no storage policy
     */
    destroy: function(rawData) {
        // Overwrite all values
        if (typeof rawData === 'object' && rawData !== null) {
            Object.keys(rawData).forEach(key => {
                rawData[key] = null;
            });
        }
        // Signal garbage collection
        rawData = null;
        
        console.log('[Converter] Raw data destroyed');
    },
    
    // ================================================================
    // FEATURE EXTRACTION
    // ================================================================
    
    /**
     * Extract Mass (Volume of data/money)
     * Mass = importance/weight of the entity
     */
    extractMass: function(rawData) {
        let mass = 1.0; // Default mass
        
        // Financial mass
        if (rawData.amount || rawData.value || rawData.money) {
            mass += Math.log10((rawData.amount || rawData.value || rawData.money) + 1);
        }
        
        // Data volume mass
        if (rawData.size || rawData.count || rawData.length) {
            mass += Math.log10((rawData.size || rawData.count || rawData.length) + 1) * 0.5;
        }
        
        // Relationship mass
        if (rawData.connections || rawData.interactions) {
            mass += Math.sqrt(rawData.connections || rawData.interactions) * 0.3;
        }
        
        // Time investment mass
        if (rawData.timeSpent || rawData.duration) {
            mass += Math.log10((rawData.timeSpent || rawData.duration) / 60 + 1) * 0.2;
        }
        
        return Math.max(0.1, Math.min(mass, 10)); // Clamp to 0.1-10
    },
    
    /**
     * Extract Velocity (Frequency of action)
     * Velocity = rate of change
     */
    extractVelocity: function(rawData) {
        let velocity = 0;
        
        // Frequency-based velocity
        if (rawData.frequency) {
            velocity = rawData.frequency;
        } else if (rawData.count && rawData.period) {
            velocity = rawData.count / rawData.period;
        }
        
        // Action rate
        if (rawData.actionsPerDay || rawData.activityRate) {
            velocity = rawData.actionsPerDay || rawData.activityRate;
        }
        
        // Change rate
        if (rawData.delta && rawData.timeDelta) {
            velocity = Math.abs(rawData.delta / rawData.timeDelta);
        }
        
        return Math.max(0, Math.min(velocity, 100)); // Clamp to 0-100
    },
    
    /**
     * Calculate direction toward goal
     * Returns angle in radians
     */
    calculateDirection: function(rawData, goalNode) {
        if (!goalNode) return 0;
        
        // Extract current position from raw data
        const currentPos = {
            x: rawData.progressX || rawData.x || 0,
            y: rawData.progressY || rawData.y || 0
        };
        
        const goalPos = {
            x: goalNode.x || goalNode.targetX || 100,
            y: goalNode.y || goalNode.targetY || 100
        };
        
        // Calculate direction angle
        const dx = goalPos.x - currentPos.x;
        const dy = goalPos.y - currentPos.y;
        
        return Math.atan2(dy, dx);
    },
    
    /**
     * Calculate energy from mass and velocity
     */
    calculateEnergy: function(mass, velocity) {
        // Kinetic energy: 1/2 * m * v²
        const kinetic = 0.5 * mass * velocity * velocity;
        
        // Potential energy: approximation based on mass
        const potential = mass * 10; // Simplified
        
        return { kinetic, potential };
    },
    
    /**
     * Estimate friction from data patterns
     */
    estimateFriction: function(rawData) {
        let friction = 0.3; // Default friction
        
        // More complexity = more friction
        if (rawData.complexity) {
            friction += rawData.complexity * 0.1;
        }
        
        // More obstacles = more friction
        if (rawData.obstacles || rawData.blockers) {
            friction += (rawData.obstacles || rawData.blockers) * 0.05;
        }
        
        // Less support = more friction
        if (rawData.support !== undefined) {
            friction -= rawData.support * 0.1;
        }
        
        return Math.max(0.1, Math.min(friction, 0.9)); // Clamp to 0.1-0.9
    },
    
    /**
     * Calculate entropy (disorder level)
     */
    calculateEntropy: function(rawData) {
        let entropy = 0.2; // Base entropy
        
        // Inconsistency increases entropy
        if (rawData.variance || rawData.inconsistency) {
            entropy += Math.sqrt(rawData.variance || rawData.inconsistency) * 0.1;
        }
        
        // More variables = more entropy
        const keyCount = Object.keys(rawData).length;
        entropy += Math.log10(keyCount + 1) * 0.1;
        
        // Noise increases entropy
        if (rawData.noise) {
            entropy += rawData.noise * 0.2;
        }
        
        return Math.max(0, Math.min(entropy, 1)); // Clamp to 0-1
    }
};

// ================================================================
// RAW-TO-VECTOR ENGINE (Enhanced API)
// ================================================================

export const RawToVectorEngine = {
    /**
     * Full conversion with validation
     */
    convert: function(rawData, goalNode) {
        // Validate input
        if (!rawData || typeof rawData !== 'object') {
            console.warn('[RawToVector] Invalid raw data');
            return null;
        }
        
        return Converter.convert(rawData, goalNode);
    },
    
    /**
     * Batch conversion
     */
    batchConvert: function(dataArray, goalNode) {
        return dataArray.map(raw => this.convert(raw, goalNode)).filter(v => v !== null);
    },
    
    /**
     * Convert with friction flag
     * Returns friction indicators for non-contributing actions
     */
    convertWithFriction: function(rawData, goalNode, successVector) {
        const vector = this.convert(rawData, goalNode);
        
        if (!vector || !successVector) return vector;
        
        // Calculate alignment with success vector
        const alignment = Math.cos(vector.direction - successVector.direction);
        
        // Flag as friction if not contributing to goal
        if (alignment < 0.3) {
            vector.is_friction = true;
            vector.friction_severity = 1 - alignment;
            vector.suggest_automation = true;
        }
        
        return vector;
    },
    
    /**
     * Get update signal for server
     * Returns only delta change in physics map
     */
    getUpdateSignal: function(previousVector, currentVector) {
        if (!previousVector || !currentVector) {
            return currentVector;
        }
        
        return {
            delta_mass: currentVector.mass - previousVector.mass,
            delta_velocity: currentVector.velocity - previousVector.velocity,
            delta_energy: (currentVector.kinetic_energy + currentVector.potential_energy) -
                         (previousVector.kinetic_energy + previousVector.potential_energy),
            delta_entropy: currentVector.entropy - previousVector.entropy,
            direction_change: currentVector.direction - previousVector.direction,
            timestamp: Date.now()
        };
    }
};

export default RawToVectorEngine;




