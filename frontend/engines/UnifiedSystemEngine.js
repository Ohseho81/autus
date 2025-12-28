/**
 * AUTUS Unified System Engine (JavaScript)
 * ==========================================
 * 
 * 모든 모듈 통합 + 양자 영감 변수 + 실시간 최적화
 * 
 * Version: 3.0.0
 * Status: PRODUCTION
 */

// ================================================================
// CONSTANTS
// ================================================================

export const SYSTEM_CONSTANTS = {
    G: 1.0,           // 중력 상수
    K: 1.0,           // 볼츠만 상수
    MAX_REVENUE: 10_000_000,
    MAX_TIME: 200,
    AUTUS_PLANCK: 0.1  // 불확실성 상수
};

export const CLUSTER_TYPES = {
    GOLDEN: 'GOLDEN',
    EFFICIENCY: 'EFFICIENCY',
    HIGH_ENERGY: 'HIGH_ENERGY',
    STABLE: 'STABLE',
    REMOVAL: 'REMOVAL'
};

export const ORBIT_TYPES = {
    SAFETY: 'SAFETY',
    ACQUISITION: 'ACQUISITION',
    REVENUE: 'REVENUE',
    EJECT: 'EJECT'
};

// ================================================================
// QUANTUM STATE (중첩)
// ================================================================

export class QuantumState {
    constructor(nodeId, roleProbabilities = {}) {
        this.nodeId = nodeId;
        this.roleProbabilities = roleProbabilities;
        this.isSuperposition = true;
        this.collapsedRole = null;
    }
    
    /**
     * 상태 측정 (붕괴)
     */
    measure() {
        if (!this.isSuperposition) {
            return this.collapsedRole;
        }
        
        const roles = Object.keys(this.roleProbabilities);
        const probs = Object.values(this.roleProbabilities);
        
        const r = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < roles.length; i++) {
            cumulative += probs[i];
            if (r <= cumulative) {
                this.collapsedRole = roles[i];
                this.isSuperposition = false;
                return this.collapsedRole;
            }
        }
        
        this.collapsedRole = roles[roles.length - 1] || 'unknown';
        this.isSuperposition = false;
        return this.collapsedRole;
    }
    
    /**
     * 기대값 계산
     */
    getExpectedValue(roleValues) {
        if (!this.isSuperposition) {
            return roleValues[this.collapsedRole] || 0;
        }
        
        return Object.entries(this.roleProbabilities).reduce((sum, [role, prob]) => {
            return sum + prob * (roleValues[role] || 0);
        }, 0);
    }
    
    /**
     * 엔트로피 계산
     */
    getEntropy() {
        let entropy = 0;
        for (const prob of Object.values(this.roleProbabilities)) {
            if (prob > 0) {
                entropy -= prob * Math.log2(prob);
            }
        }
        return entropy;
    }
    
    reset() {
        this.isSuperposition = true;
        this.collapsedRole = null;
    }
    
    toDict() {
        return {
            nodeId: this.nodeId,
            roleProbabilities: this.roleProbabilities,
            isSuperposition: this.isSuperposition,
            collapsedRole: this.collapsedRole,
            entropy: this.getEntropy()
        };
    }
}

// ================================================================
// ENTANGLEMENT (얽힘)
// ================================================================

export class Entanglement {
    constructor(nodeA, nodeB, intensity = 0.5, correlation = 0.8, type = 'synergy') {
        this.nodeA = nodeA;
        this.nodeB = nodeB;
        this.intensity = intensity;
        this.correlation = correlation;
        this.entanglementType = type;
    }
    
    /**
     * 변화 전파
     */
    propagateChange(sourceNode, changeMagnitude) {
        const targetNode = sourceNode === this.nodeA ? this.nodeB : this.nodeA;
        const propagatedChange = changeMagnitude * this.intensity * this.correlation;
        return { targetNode, propagatedChange };
    }
    
    getCouplingStrength() {
        return Math.abs(this.intensity * this.correlation);
    }
    
    toDict() {
        return {
            nodeA: this.nodeA,
            nodeB: this.nodeB,
            intensity: this.intensity,
            correlation: this.correlation,
            type: this.entanglementType,
            couplingStrength: this.getCouplingStrength()
        };
    }
}

// ================================================================
// UNCERTAINTY PRINCIPLE (불확실성 원리)
// ================================================================

export const UncertaintyPrinciple = {
    AUTUS_PLANCK: SYSTEM_CONSTANTS.AUTUS_PLANCK,
    
    calculateUncertainty(moneyPrecision, timePrecision) {
        const product = moneyPrecision * timePrecision;
        
        if (product < this.AUTUS_PLANCK) {
            const sqrtH = Math.sqrt(this.AUTUS_PLANCK);
            return { moneyPrecision: sqrtH, timePrecision: sqrtH, violated: true };
        }
        
        return { moneyPrecision, timePrecision, violated: false };
    },
    
    getPredictionConfidence(moneyVariance, timeVariance) {
        const totalVariance = moneyVariance + timeVariance;
        return 1 / (1 + totalVariance);
    }
};

// ================================================================
// PHYSICS FORMULAS
// ================================================================

export const UnifiedPhysicsFormulas = {
    
    /**
     * 중력 가치
     */
    gravityValue(masses, distances) {
        const n = masses.length;
        let totalValue = 0;
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const r = distances[i][j] > 0 ? distances[i][j] : 0.1;
                totalValue += (masses[i] * masses[j]) / (r * r);
            }
        }
        
        return SYSTEM_CONSTANTS.G * totalValue;
    },
    
    /**
     * 볼츠만 엔트로피
     */
    boltzmannEntropy(W) {
        if (W <= 0) return 0;
        return SYSTEM_CONSTANTS.K * Math.log(W);
    },
    
    /**
     * 섀넌 엔트로피
     */
    shannonEntropy(probabilities) {
        let entropy = 0;
        for (const p of probabilities) {
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        return entropy;
    },
    
    /**
     * AUTUS 엔트로피
     */
    autusEntropy(conflictCount, mismatchCount, churnCount, inefficientCount) {
        const W = (conflictCount + 1) * (mismatchCount + 1) * (churnCount + 1) * (inefficientCount + 1);
        return Math.log(W);
    },
    
    /**
     * 돈 생산 효율
     */
    moneyEfficiency(entropy) {
        return Math.exp(-entropy / 5);
    },
    
    /**
     * 시너지 강도
     */
    synergyStrength(fitness, density, frequency, penalty) {
        const raw = fitness * 0.35 * 2 +
                    density * 0.25 * 2 +
                    frequency * 0.20 * 2 -
                    penalty * 0.20 * 3;
        return Math.tanh(raw);
    },
    
    /**
     * 관성
     */
    momentum(mass, velocity) {
        return mass * velocity;
    },
    
    /**
     * 통합 가치
     */
    unifiedValue(gravityValue, entropy, momentum) {
        const entropyFactor = this.moneyEfficiency(entropy);
        return gravityValue * entropyFactor * (1 + momentum);
    },
    
    /**
     * 양자 중첩 가치
     */
    quantumSuperpositionValue(scenarios) {
        return scenarios.reduce((sum, [prob, value]) => sum + prob * value, 0);
    },
    
    /**
     * 3D 유클리드 거리
     */
    euclideanDistance3D(p1, p2) {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow(p1.z - p2.z, 2)
        );
    },
    
    /**
     * 거리 매트릭스
     */
    calculateDistanceMatrix(positions) {
        const n = positions.length;
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dist = this.euclideanDistance3D(positions[i], positions[j]);
                matrix[i][j] = dist || 0.1;
                matrix[j][i] = dist || 0.1;
            }
        }
        
        return matrix;
    }
};

// ================================================================
// UNIFIED NODE
// ================================================================

export class UnifiedNode {
    constructor(config = {}) {
        this.id = config.id || `node_${Date.now()}`;
        this.name = config.name || 'Unknown';
        
        // 기본 속성
        this.revenue = config.revenue || 0;
        this.timeSpent = config.timeSpent || 0;
        
        // 좌표
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.z = config.z || 0;
        
        // 시너지 구성요소
        this.fitness = config.fitness ?? 0.5;
        this.density = config.density ?? 0.5;
        this.frequency = config.frequency ?? 0.5;
        this.penalty = config.penalty ?? 0;
        
        // 상태
        this.cluster = config.cluster || CLUSTER_TYPES.STABLE;
        this.orbit = config.orbit || ORBIT_TYPES.SAFETY;
        
        // 양자
        this.quantumState = null;
        this.entanglements = [];
        
        // 메타
        this.tags = config.tags || [];
        this.metadata = config.metadata || {};
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    calculateSynergy() {
        return UnifiedPhysicsFormulas.synergyStrength(
            this.fitness,
            this.density,
            this.frequency,
            this.penalty
        );
    }
    
    calculateMass() {
        return Math.max(0.1, this.fitness + this.calculateSynergy() + 1) / 2;
    }
    
    calculateVelocity() {
        if (this.timeSpent <= 0) return 0;
        return Math.min(1.0, this.revenue / (this.timeSpent * 100000 + 1));
    }
    
    getMomentum() {
        return this.calculateMass() * this.calculateVelocity();
    }
    
    getPosition() {
        return { x: this.x, y: this.y, z: this.z };
    }
    
    toDict() {
        return {
            id: this.id,
            name: this.name,
            revenue: this.revenue,
            timeSpent: this.timeSpent,
            x: this.x,
            y: this.y,
            z: this.z,
            synergy: this.calculateSynergy(),
            cluster: this.cluster,
            orbit: this.orbit,
            mass: this.calculateMass(),
            velocity: this.calculateVelocity(),
            momentum: this.getMomentum(),
            fitness: this.fitness,
            density: this.density,
            frequency: this.frequency,
            penalty: this.penalty,
            tags: this.tags,
            entanglements: this.entanglements
        };
    }
}

// ================================================================
// UNIFIED SYSTEM ENGINE
// ================================================================

export const UnifiedSystemEngine = {
    // 저장소
    nodes: {},
    entanglements: {},
    quantumStates: {},
    pendingActions: [],
    executedActions: [],
    stateHistory: [],
    eventHandlers: {},
    
    /**
     * 초기화
     */
    init() {
        this.nodes = {};
        this.entanglements = {};
        this.quantumStates = {};
        this.pendingActions = [];
        this.executedActions = [];
        this.stateHistory = [];
        this.eventHandlers = {};
        
        console.log('🚀 UnifiedSystemEngine initialized');
        return this;
    },
    
    // ============================================================
    // NODE MANAGEMENT
    // ============================================================
    
    addNode(config) {
        const node = new UnifiedNode(config);
        
        // 좌표 계산
        node.z = node.calculateSynergy();
        node.x = this._normalizeRevenue(config.revenue || 0);
        node.y = this._normalizeTime(config.timeSpent || 0);
        
        // 분류
        node.cluster = this._classifyCluster(node);
        node.orbit = this._classifyOrbit(node);
        
        // 양자 상태
        if (config.roleProbabilities) {
            node.quantumState = new QuantumState(node.id, config.roleProbabilities);
            this.quantumStates[node.id] = node.quantumState;
        }
        
        this.nodes[node.id] = node;
        this._emitEvent('node_added', { node: node.toDict() });
        
        return node;
    },
    
    updateNode(id, updates) {
        const node = this.nodes[id];
        if (!node) return null;
        
        Object.keys(updates).forEach(key => {
            if (node.hasOwnProperty(key)) {
                node[key] = updates[key];
            }
        });
        
        // 재계산
        node.z = node.calculateSynergy();
        node.x = this._normalizeRevenue(node.revenue);
        node.y = this._normalizeTime(node.timeSpent);
        node.cluster = this._classifyCluster(node);
        node.orbit = this._classifyOrbit(node);
        node.updatedAt = new Date();
        
        // 얽힘 전파
        this._propagateEntanglement(id);
        
        this._emitEvent('node_updated', { node: node.toDict() });
        return node;
    },
    
    removeNode(id) {
        if (!this.nodes[id]) return false;
        
        // 얽힘 제거
        Object.keys(this.entanglements).forEach(key => {
            if (key.includes(id)) {
                delete this.entanglements[key];
            }
        });
        
        // 양자 상태 제거
        delete this.quantumStates[id];
        delete this.nodes[id];
        
        this._emitEvent('node_removed', { nodeId: id });
        return true;
    },
    
    getNode(id) {
        return this.nodes[id] || null;
    },
    
    getAllNodes() {
        return Object.values(this.nodes);
    },
    
    // ============================================================
    // ENTANGLEMENT
    // ============================================================
    
    createEntanglement(nodeA, nodeB, intensity = 0.5, correlation = 0.8, type = 'synergy') {
        if (!this.nodes[nodeA] || !this.nodes[nodeB]) return null;
        
        const key = [nodeA, nodeB].sort().join('-');
        
        const ent = new Entanglement(nodeA, nodeB, intensity, correlation, type);
        this.entanglements[key] = ent;
        
        // 노드에 기록
        if (!this.nodes[nodeA].entanglements.includes(nodeB)) {
            this.nodes[nodeA].entanglements.push(nodeB);
        }
        if (!this.nodes[nodeB].entanglements.includes(nodeA)) {
            this.nodes[nodeB].entanglements.push(nodeA);
        }
        
        return ent;
    },
    
    _propagateEntanglement(sourceId) {
        const sourceNode = this.nodes[sourceId];
        if (!sourceNode) return;
        
        sourceNode.entanglements.forEach(targetId => {
            const key = [sourceId, targetId].sort().join('-');
            const ent = this.entanglements[key];
            
            if (ent) {
                const change = sourceNode.calculateSynergy() * 0.1;
                const { propagatedChange } = ent.propagateChange(sourceId, change);
                
                if (this.nodes[targetId]) {
                    this.nodes[targetId].z = Math.min(1, Math.max(-1, 
                        this.nodes[targetId].z + propagatedChange
                    ));
                }
            }
        });
    },
    
    // ============================================================
    // COORDINATE CALCULATIONS
    // ============================================================
    
    _normalizeRevenue(revenue) {
        if (revenue >= 0) {
            return Math.min(1.0, revenue / SYSTEM_CONSTANTS.MAX_REVENUE);
        }
        return Math.max(-1.0, revenue / SYSTEM_CONSTANTS.MAX_REVENUE);
    },
    
    _normalizeTime(timeSpent) {
        return Math.min(1.0, Math.max(0, timeSpent / SYSTEM_CONSTANTS.MAX_TIME));
    },
    
    _classifyCluster(node) {
        const { x, y, z } = node;
        
        if (x < 0.2 || z < -0.5) return CLUSTER_TYPES.REMOVAL;
        if (x >= 0.7 && z >= 0.7) return CLUSTER_TYPES.GOLDEN;
        if (x >= 0.4 && y <= 0.3) return CLUSTER_TYPES.EFFICIENCY;
        if (x >= 0.6 && z < 0) return CLUSTER_TYPES.HIGH_ENERGY;
        
        return CLUSTER_TYPES.STABLE;
    },
    
    _classifyOrbit(node) {
        const cluster = node.cluster;
        
        if (cluster === CLUSTER_TYPES.GOLDEN) return ORBIT_TYPES.REVENUE;
        if (cluster === CLUSTER_TYPES.REMOVAL) return ORBIT_TYPES.EJECT;
        if (cluster === CLUSTER_TYPES.EFFICIENCY || cluster === CLUSTER_TYPES.HIGH_ENERGY) {
            return ORBIT_TYPES.ACQUISITION;
        }
        
        return ORBIT_TYPES.SAFETY;
    },
    
    // ============================================================
    // SYSTEM CALCULATIONS
    // ============================================================
    
    calculateSystemValue() {
        const nodes = this.getAllNodes();
        const n = nodes.length;
        
        if (n === 0) return 0;
        
        const masses = nodes.map(n => n.calculateMass());
        const positions = nodes.map(n => n.getPosition());
        const distances = UnifiedPhysicsFormulas.calculateDistanceMatrix(positions);
        
        const gravityValue = UnifiedPhysicsFormulas.gravityValue(masses, distances);
        const entropy = this.calculateEntropy();
        const avgMomentum = nodes.reduce((sum, n) => sum + n.getMomentum(), 0) / n;
        
        return UnifiedPhysicsFormulas.unifiedValue(gravityValue, entropy, avgMomentum);
    },
    
    calculateEntropy() {
        const nodes = this.getAllNodes();
        if (!nodes.length) return 0;
        
        const conflictCount = nodes.filter(n => n.calculateSynergy() < -0.3).length;
        const mismatchCount = nodes.filter(n => n.fitness < 0.4).length;
        const churnCount = nodes.filter(n => n.calculateSynergy() < 0.3 && n.frequency < 0.3).length;
        const inefficientCount = nodes.filter(n => n.density < 0.2).length;
        
        return UnifiedPhysicsFormulas.autusEntropy(
            conflictCount,
            mismatchCount,
            churnCount,
            inefficientCount
        );
    },
    
    calculateMoneyEfficiency() {
        return UnifiedPhysicsFormulas.moneyEfficiency(this.calculateEntropy());
    },
    
    // ============================================================
    // QUANTUM CALCULATIONS
    // ============================================================
    
    calculateQuantumValue() {
        const scenarios = [];
        
        Object.values(this.nodes).forEach(node => {
            if (node.quantumState && node.quantumState.isSuperposition) {
                const roleValues = {
                    leader: node.revenue * 1.5,
                    executor: node.revenue * 1.2,
                    observer: node.revenue * 0.8
                };
                
                Object.entries(node.quantumState.roleProbabilities).forEach(([role, prob]) => {
                    const value = roleValues[role] || node.revenue;
                    scenarios.push([prob / Object.keys(this.nodes).length, value]);
                });
            }
        });
        
        if (!scenarios.length) {
            return this.calculateSystemValue();
        }
        
        const quantumValue = UnifiedPhysicsFormulas.quantumSuperpositionValue(scenarios);
        const classicalValue = this.calculateSystemValue();
        
        return (quantumValue + classicalValue) / 2;
    },
    
    getUncertaintyMetrics() {
        const nodes = this.getAllNodes();
        if (!nodes.length) {
            return { moneyVariance: 0, timeVariance: 0, confidence: 1.0 };
        }
        
        const revenues = nodes.map(n => n.revenue);
        const avgRev = revenues.reduce((a, b) => a + b, 0) / revenues.length;
        const maxRev = Math.max(...revenues.map(Math.abs)) || 1;
        const moneyVariance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRev, 2), 0) 
                            / revenues.length / (maxRev * maxRev + 1);
        
        const times = nodes.map(n => n.timeSpent);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times) || 1;
        const timeVariance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0)
                           / times.length / (maxTime * maxTime + 1);
        
        const confidence = UncertaintyPrinciple.getPredictionConfidence(moneyVariance, timeVariance);
        
        return { moneyVariance, timeVariance, confidence };
    },
    
    // ============================================================
    // ACTION MANAGEMENT
    // ============================================================
    
    queueAction(actionType, targetId, params = {}, priority = 0) {
        const action = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: actionType,
            targetId,
            params,
            priority,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        
        this.pendingActions.push(action);
        this.pendingActions.sort((a, b) => b.priority - a.priority);
        
        return action;
    },
    
    executePendingActions() {
        const executed = [];
        
        while (this.pendingActions.length > 0) {
            const action = this.pendingActions.shift();
            const result = this._executeAction(action);
            
            action.status = 'executed';
            action.result = result;
            action.executedAt = new Date().toISOString();
            
            this.executedActions.push(action);
            executed.push(action);
        }
        
        return executed;
    },
    
    _executeAction(action) {
        const { type, targetId, params } = action;
        const node = this.nodes[targetId];
        
        if (!node && type !== 'broadcast') {
            return { error: 'node_not_found' };
        }
        
        switch (type) {
            case 'amplify':
                this.updateNode(targetId, {
                    fitness: Math.min(1.0, node.fitness + (params.amount || 0.1)),
                    density: Math.min(1.0, node.density + (params.amount || 0.1))
                });
                return { effect: 'synergy_boosted' };
            
            case 'reduce':
                this.updateNode(targetId, {
                    frequency: Math.max(0, node.frequency - (params.amount || 0.2))
                });
                return { effect: 'frequency_reduced' };
            
            case 'eject':
                this.removeNode(targetId);
                return { effect: 'node_removed' };
            
            case 'boost_synergy':
                this.updateNode(targetId, {
                    penalty: Math.max(0, node.penalty - (params.amount || 0.1))
                });
                return { effect: 'penalty_reduced' };
            
            default:
                return { effect: 'unknown_action' };
        }
    },
    
    // ============================================================
    // AUTO OPTIMIZATION
    // ============================================================
    
    runAutoOptimization() {
        const nodes = this.getAllNodes();
        if (!nodes.length) {
            return { status: 'no_nodes', actionsQueued: 0 };
        }
        
        let actionsQueued = 0;
        
        nodes.forEach(node => {
            const synergy = node.calculateSynergy();
            
            if (synergy > 0.7) {
                this.queueAction('amplify', node.id, {}, 1);
                actionsQueued++;
            } else if (synergy < -0.5) {
                if (node.revenue < 0) {
                    this.queueAction('eject', node.id, {}, 2);
                } else {
                    this.queueAction('reduce', node.id, {}, 1);
                }
                actionsQueued++;
            } else if (node.cluster === CLUSTER_TYPES.EFFICIENCY) {
                this.queueAction('boost_synergy', node.id, {}, 0);
                actionsQueued++;
            }
        });
        
        return { status: 'optimization_queued', actionsQueued };
    },
    
    getOptimizationRecommendations() {
        const nodes = this.getAllNodes();
        const recommendations = [];
        
        nodes.forEach(node => {
            const synergy = node.calculateSynergy();
            
            if (synergy > 0.7) {
                recommendations.push({
                    id: `rec_${node.id}`,
                    type: 'amplify',
                    targetId: node.id,
                    targetName: node.name,
                    reason: `시너지 강도 ${synergy.toFixed(2)} - 고효율 노드`,
                    suggestedAction: '증폭 및 자원 집중',
                    priority: 'HIGH'
                });
            } else if (synergy < -0.5) {
                recommendations.push({
                    id: `rec_${node.id}`,
                    type: node.revenue < 0 ? 'block' : 'reduce',
                    targetId: node.id,
                    targetName: node.name,
                    reason: `시너지 강도 ${synergy.toFixed(2)} - 엔트로피 생성`,
                    suggestedAction: node.revenue < 0 ? '차단' : '연결 축소',
                    priority: 'URGENT'
                });
            } else if (node.cluster === CLUSTER_TYPES.EFFICIENCY) {
                recommendations.push({
                    id: `rec_${node.id}`,
                    type: 'boost',
                    targetId: node.id,
                    targetName: node.name,
                    reason: '고효율 지대 - 골든 진입 가능',
                    suggestedAction: '시너지 부스트',
                    priority: 'MEDIUM'
                });
            }
        });
        
        return recommendations;
    },
    
    // ============================================================
    // STATE SNAPSHOT
    // ============================================================
    
    getSystemState() {
        const nodes = this.getAllNodes();
        
        const clusterDist = {};
        const orbitDist = {};
        
        nodes.forEach(node => {
            clusterDist[node.cluster] = (clusterDist[node.cluster] || 0) + 1;
            orbitDist[node.orbit] = (orbitDist[node.orbit] || 0) + 1;
        });
        
        const superpositionCount = Object.values(this.quantumStates)
            .filter(qs => qs.isSuperposition).length;
        
        const uncertainty = this.getUncertaintyMetrics();
        const currentValue = this.calculateSystemValue();
        const quantumValue = this.calculateQuantumValue();
        
        const state = {
            timestamp: new Date().toISOString(),
            totalNodes: nodes.length,
            clusterDistribution: clusterDist,
            orbitDistribution: orbitDist,
            totalValue: currentValue,
            entropy: this.calculateEntropy(),
            moneyEfficiency: this.calculateMoneyEfficiency(),
            superpositionCount,
            entanglementCount: Object.keys(this.entanglements).length,
            uncertaintyLevel: 1 - uncertainty.confidence,
            projectedValue: quantumValue,
            valueMultiplier: currentValue > 0 ? quantumValue / currentValue : 1,
            pendingActions: this.pendingActions.length,
            executedActions: this.executedActions.length
        };
        
        this.stateHistory.push(state);
        return state;
    },
    
    // ============================================================
    // EVENT SYSTEM
    // ============================================================
    
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    },
    
    off(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
        }
    },
    
    _emitEvent(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (e) {
                    console.error('Event handler error:', e);
                }
            });
        }
    },
    
    // ============================================================
    // EXPORT
    // ============================================================
    
    exportGraphData() {
        const nodesData = this.getAllNodes().map(node => ({
            ...node.toDict(),
            quantum: {
                isSuperposition: node.quantumState?.isSuperposition || false,
                entanglements: node.entanglements
            }
        }));
        
        const linksData = Object.values(this.entanglements).map(ent => ({
            source: ent.nodeA,
            target: ent.nodeB,
            strength: ent.intensity * ent.correlation,
            type: ent.entanglementType
        }));
        
        return { nodes: nodesData, links: linksData };
    },
    
    exportStateJSON() {
        return JSON.stringify(this.getSystemState(), null, 2);
    },
    
    importNodes(nodesData) {
        let imported = 0;
        
        nodesData.forEach(data => {
            try {
                this.addNode({
                    id: data.id,
                    name: data.name,
                    revenue: data.revenue || 0,
                    timeSpent: data.timeSpent || data.time_spent || 0,
                    fitness: data.fitness || 0.5,
                    density: data.density || 0.5,
                    frequency: data.frequency || 0.5,
                    penalty: data.penalty || 0,
                    roleProbabilities: data.roleProbabilities || data.role_probabilities,
                    tags: data.tags || []
                });
                imported++;
            } catch (e) {
                console.error('Import error:', e);
            }
        });
        
        return imported;
    }
};

// ================================================================
// TEST FUNCTION
// ================================================================

export function testUnifiedSystemEngine() {
    console.log('=' .repeat(60));
    console.log('UnifiedSystemEngine Test');
    console.log('=' .repeat(60));
    
    const engine = UnifiedSystemEngine;
    engine.init();
    
    // 이벤트 핸들러
    engine.on('node_added', (d) => console.log(`  [EVENT] Node added: ${d.node.name}`));
    
    // 노드 생성
    console.log('\n[1. Creating 50 nodes...]');
    
    for (let i = 0; i < 50; i++) {
        const leader = Math.random() * 0.3 + 0.1;
        const executor = Math.random() * 0.2 + 0.3;
        const observer = 1 - leader - executor;
        
        engine.addNode({
            id: `node_${String(i).padStart(3, '0')}`,
            name: `Person_${i}`,
            revenue: Math.floor(Math.random() * 5500000) - 500000,
            timeSpent: Math.floor(Math.random() * 170) + 10,
            fitness: Math.random() * 0.8 + 0.2,
            density: Math.random() * 0.8 + 0.1,
            frequency: Math.random() * 0.7 + 0.2,
            penalty: Math.random() * 0.5,
            roleProbabilities: { leader, executor, observer }
        });
    }
    
    console.log(`  Total nodes: ${Object.keys(engine.nodes).length}`);
    
    // 얽힘 생성
    console.log('\n[2. Creating entanglements...]');
    
    for (let i = 0; i < 20; i++) {
        const a = `node_${String(Math.floor(Math.random() * 50)).padStart(3, '0')}`;
        const b = `node_${String(Math.floor(Math.random() * 50)).padStart(3, '0')}`;
        if (a !== b) {
            engine.createEntanglement(a, b, 0.7, 0.85);
        }
    }
    
    console.log(`  Entanglements: ${Object.keys(engine.entanglements).length}`);
    
    // 시스템 상태
    console.log('\n[3. System State]');
    const state = engine.getSystemState();
    
    console.log(`  Total Value: ${state.totalValue.toLocaleString()}`);
    console.log(`  Entropy: ${state.entropy.toFixed(3)}`);
    console.log(`  Money Efficiency: ${(state.moneyEfficiency * 100).toFixed(1)}%`);
    console.log(`  Projected Value: ${state.projectedValue.toLocaleString()}`);
    console.log(`  Clusters:`, state.clusterDistribution);
    
    // 자동 최적화
    console.log('\n[4. Auto Optimization]');
    const optResult = engine.runAutoOptimization();
    console.log(`  Actions queued: ${optResult.actionsQueued}`);
    
    const executed = engine.executePendingActions();
    console.log(`  Actions executed: ${executed.length}`);
    
    // 최적화 후
    console.log('\n[5. After Optimization]');
    const stateAfter = engine.getSystemState();
    console.log(`  Value: ${state.totalValue.toFixed(2)} → ${stateAfter.totalValue.toFixed(2)}`);
    console.log(`  Efficiency: ${(state.moneyEfficiency * 100).toFixed(1)}% → ${(stateAfter.moneyEfficiency * 100).toFixed(1)}%`);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ UnifiedSystemEngine Test Complete');
    
    return engine;
}

// Export default
export default UnifiedSystemEngine;
