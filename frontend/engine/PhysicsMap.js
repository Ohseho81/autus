// ================================================================
// PHYSICS MAP - The Physics of Human-Money-Position
// Based on Elon's First Principles
// 사람 = 질량, 돈 = 에너지, 위치 = 상태
// ================================================================

const GLOBAL_MONEY_CONSTANT = 0.0001;
const ENTROPY_CONSTANT = 0.001;
const EFFICIENCY_FACTOR = 0.85;

// ================================================================
// ELON ENGINE: 3 LAWS ONLY
// ================================================================

export const ElonEngine = {
    // LAW 1: Gravity - 관계 거리에 따른 인력 계산
    getGravity: function(nodeA, nodeB) {
        const dist = this.distance(nodeA.position, nodeB.position);
        const massA = nodeA.mass || 1;
        const massB = nodeB.mass || 1;
        return (massA * massB) / (dist * dist + 0.01); // +0.01 prevents division by zero
    },
    
    // LAW 2: Entropy - 시간 경과에 따른 가치 감쇠
    applyEntropy: function(action) {
        action.energy *= (1 - ENTROPY_CONSTANT);
        return action;
    },
    
    // LAW 3: Action-Reaction - 투입 대비 산출물 계산
    getReaction: function(inputAction) {
        return {
            value: inputAction.magnitude * EFFICIENCY_FACTOR,
            energy_cost: inputAction.magnitude * (1 - EFFICIENCY_FACTOR),
            efficiency: EFFICIENCY_FACTOR
        };
    },
    
    // Utility: Calculate distance between positions
    distance: function(posA, posB) {
        const dx = (posA.x || 0) - (posB.x || 0);
        const dy = (posA.y || 0) - (posB.y || 0);
        const dz = (posA.z || 0) - (posB.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    }
};

// ================================================================
// PHYSICS MAP: Core State Management
// ================================================================

export const PhysicsMap = {
    // 1. 개체의 상태 (사람 = 질량)
    nodes: [
        { 
            id: 'User', 
            mass: 100, 
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            potential: 1000,
            kinetic: 0,
            isUser: true
        }
    ],
    
    // Goal node
    goalNode: null,
    
    // History for momentum calculation
    history: [],
    
    // ================================================================
    // NODE MANAGEMENT
    // ================================================================
    
    /**
     * Add node to map
     */
    addNode: function(node) {
        const newNode = {
            id: node.id || 'node_' + Date.now(),
            mass: node.mass || 1,
            position: node.position || { x: 0, y: 0, z: 0 },
            velocity: node.velocity || { x: 0, y: 0, z: 0 },
            potential: node.potential || 0,
            kinetic: node.kinetic || 0,
            attributes: node.attributes || [],
            connections: [],
            ...node
        };
        
        this.nodes.push(newNode);
        return newNode;
    },
    
    /**
     * Get node by ID
     */
    getNode: function(nodeId) {
        return this.nodes.find(n => n.id === nodeId);
    },
    
    /**
     * Get user node
     */
    getUserNode: function() {
        return this.nodes.find(n => n.isUser);
    },
    
    /**
     * Set goal node
     */
    setGoal: function(goalConfig) {
        this.goalNode = {
            id: 'Goal',
            mass: goalConfig.mass || 50,
            position: goalConfig.position || { x: 100, y: 100, z: 0 },
            target_mass: goalConfig.targetMass || 100,
            target_volume: goalConfig.targetVolume || 50,
            target_time: goalConfig.targetTime || 365,
            description: goalConfig.description || '',
            ...goalConfig
        };
        
        return this.goalNode;
    },
    
    // ================================================================
    // 2. 개체 이동 시뮬레이션 (위치 변경)
    // ================================================================
    
    /**
     * Move node to new position
     * @returns {Object} Action change prediction
     */
    moveNode: function(nodeId, newPosition) {
        const node = this.getNode(nodeId);
        if (!node) return null;
        
        // Calculate velocity from position change
        const dx = newPosition.x - node.position.x;
        const dy = newPosition.y - node.position.y;
        const dz = (newPosition.z || 0) - (node.position.z || 0);
        
        // Update velocity
        node.velocity = { x: dx, y: dy, z: dz };
        
        // Update position
        node.position = { ...newPosition };
        
        // Convert potential to kinetic energy
        const movementEnergy = Math.sqrt(dx*dx + dy*dy + dz*dz) * node.mass;
        if (node.potential >= movementEnergy) {
            node.potential -= movementEnergy;
            node.kinetic += movementEnergy * EFFICIENCY_FACTOR;
        }
        
        // Record history
        this.history.push({
            nodeId,
            position: { ...newPosition },
            timestamp: Date.now()
        });
        
        // Keep only last 100 entries
        if (this.history.length > 100) {
            this.history.shift();
        }
        
        return this.predictActionChange(node);
    },
    
    // ================================================================
    // 3. 액션 예측 (돈 = 위치에 따른 에너지 변화)
    // ================================================================
    
    /**
     * Predict action change based on node state
     * F = G * (m1 * m2) / r² (관계 거리에 따른 자본 흐름 계산)
     */
    predictActionChange: function(node) {
        if (!node) return null;
        
        // Calculate gravity influence from all other nodes
        const gravitySum = this.nodes.reduce((sum, other) => {
            if (other.id === node.id) return sum;
            return sum + ElonEngine.getGravity(node, other);
        }, 0);
        
        // Add goal gravity if exists
        let goalGravity = 0;
        if (this.goalNode) {
            goalGravity = ElonEngine.getGravity(node, this.goalNode);
        }
        
        // Calculate predicted money flow
        const totalGravity = gravitySum + goalGravity * 2; // Goal has 2x influence
        const energyFlux = totalGravity * GLOBAL_MONEY_CONSTANT;
        
        // Calculate distance to goal
        let distanceToGoal = null;
        if (this.goalNode) {
            distanceToGoal = ElonEngine.distance(node.position, this.goalNode.position);
        }
        
        // Calculate success probability
        const successProbability = this.calculateSuccessProbability(node, distanceToGoal);
        
        return {
            node_id: node.id,
            predicted_money_flow: energyFlux,
            gravity_influence: totalGravity,
            goal_gravity: goalGravity,
            distance_to_goal: distanceToGoal,
            success_probability: successProbability,
            recommended_direction: this.getOptimalDirection(node),
            timestamp: Date.now()
        };
    },
    
    /**
     * Calculate success probability based on physics
     */
    calculateSuccessProbability: function(node, distanceToGoal) {
        if (!distanceToGoal || !this.goalNode) return 0.5;
        
        // Factors affecting success
        const massFactor = node.mass / (this.goalNode.target_mass || 100);
        const distanceFactor = 1 / (1 + distanceToGoal / 100);
        const energyFactor = (node.potential + node.kinetic) / 1000;
        const velocityMag = Math.sqrt(
            node.velocity.x ** 2 + 
            node.velocity.y ** 2 + 
            (node.velocity.z || 0) ** 2
        );
        const momentumFactor = velocityMag * node.mass / 100;
        
        // Weighted combination
        const probability = (
            massFactor * 0.3 +
            distanceFactor * 0.3 +
            energyFactor * 0.2 +
            momentumFactor * 0.2
        );
        
        return Math.max(0, Math.min(probability, 1));
    },
    
    /**
     * Get optimal direction toward goal
     */
    getOptimalDirection: function(node) {
        if (!this.goalNode) return { x: 0, y: 0, z: 0 };
        
        const dx = this.goalNode.position.x - node.position.x;
        const dy = this.goalNode.position.y - node.position.y;
        const dz = (this.goalNode.position.z || 0) - (node.position.z || 0);
        
        const magnitude = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
        
        return {
            x: dx / magnitude,
            y: dy / magnitude,
            z: dz / magnitude
        };
    },
    
    // ================================================================
    // GRAVITY CALCULATIONS
    // ================================================================
    
    /**
     * Calculate total gravity on a node
     */
    calculateTotalGravity: function(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return 0;
        
        return this.nodes.reduce((sum, other) => {
            if (other.id === nodeId) return sum;
            return sum + ElonEngine.getGravity(node, other);
        }, 0);
    },
    
    /**
     * Find highest gravity attractor
     */
    findStrongestAttractor: function(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return null;
        
        let strongest = null;
        let maxGravity = 0;
        
        this.nodes.forEach(other => {
            if (other.id === nodeId) return;
            const gravity = ElonEngine.getGravity(node, other);
            if (gravity > maxGravity) {
                maxGravity = gravity;
                strongest = other;
            }
        });
        
        return { node: strongest, gravity: maxGravity };
    },
    
    // ================================================================
    // ENERGY MANAGEMENT
    // ================================================================
    
    /**
     * Get total system energy
     */
    getTotalEnergy: function() {
        return this.nodes.reduce((sum, node) => {
            return sum + (node.potential || 0) + (node.kinetic || 0);
        }, 0);
    },
    
    /**
     * Get system momentum
     */
    getMomentum: function() {
        return this.nodes.reduce((momentum, node) => {
            const mass = node.mass || 1;
            return {
                x: momentum.x + mass * (node.velocity?.x || 0),
                y: momentum.y + mass * (node.velocity?.y || 0),
                z: momentum.z + mass * (node.velocity?.z || 0)
            };
        }, { x: 0, y: 0, z: 0 });
    },
    
    /**
     * Apply entropy decay to all nodes
     */
    applyEntropyDecay: function() {
        this.nodes.forEach(node => {
            // Decay kinetic energy
            if (node.kinetic > 0) {
                node.kinetic *= (1 - ENTROPY_CONSTANT);
            }
            
            // Slow decay of velocity
            if (node.velocity) {
                node.velocity.x *= (1 - ENTROPY_CONSTANT * 0.1);
                node.velocity.y *= (1 - ENTROPY_CONSTANT * 0.1);
                node.velocity.z *= (1 - ENTROPY_CONSTANT * 0.1);
            }
        });
    },
    
    // ================================================================
    // CONNECTION MANAGEMENT
    // ================================================================
    
    /**
     * Connect two nodes
     */
    connect: function(nodeIdA, nodeIdB, strength = 1) {
        const nodeA = this.getNode(nodeIdA);
        const nodeB = this.getNode(nodeIdB);
        
        if (!nodeA || !nodeB) return false;
        
        // Add connection
        if (!nodeA.connections) nodeA.connections = [];
        if (!nodeB.connections) nodeB.connections = [];
        
        nodeA.connections.push({ target: nodeIdB, strength });
        nodeB.connections.push({ target: nodeIdA, strength });
        
        return true;
    },
    
    /**
     * Get connection strength
     */
    getConnectionStrength: function(nodeIdA, nodeIdB) {
        const nodeA = this.getNode(nodeIdA);
        if (!nodeA || !nodeA.connections) return 0;
        
        const connection = nodeA.connections.find(c => c.target === nodeIdB);
        return connection ? connection.strength : 0;
    },
    
    // ================================================================
    // STATE EXPORT
    // ================================================================
    
    /**
     * Export physics state (no raw data)
     */
    exportState: function() {
        return {
            nodes: this.nodes.map(n => ({
                id: n.id,
                mass: n.mass,
                position: n.position,
                velocity: n.velocity,
                energy: (n.potential || 0) + (n.kinetic || 0),
                connections: n.connections?.length || 0
            })),
            goal: this.goalNode ? {
                position: this.goalNode.position,
                target_mass: this.goalNode.target_mass
            } : null,
            total_energy: this.getTotalEnergy(),
            momentum: this.getMomentum(),
            exported_at: Date.now()
        };
    },
    
    /**
     * Reset map
     */
    reset: function() {
        this.nodes = [{
            id: 'User',
            mass: 100,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            potential: 1000,
            kinetic: 0,
            isUser: true
        }];
        this.goalNode = null;
        this.history = [];
    }
};

export default PhysicsMap;




