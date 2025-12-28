// ================================================================
// AUTUS CORE PHYSICS KERNEL
// 3-Law Logic: Inertia, Reaction, Conservation
// Mission Critical: All-Senses Intelligence Core
// ================================================================

const SYSTEM_CONSTANTS = {
    INERTIA_COEFFICIENT: 9.8,
    EFFICIENCY_FACTOR: 0.85,
    ENTROPY_RATE: 0.001,
    GOLDEN_TIME_HOURS: 72,
    MIN_VALID_FORCE: 0.1,
    CONSERVATION_TOLERANCE: 0.001
};

// ================================================================
// LAW 1: INERTIA (관성)
// 개체를 이동시키기 위한 최소 힘 계산
// ================================================================

const InertiaLaw = {
    /**
     * Calculate static friction (정지 마찰력)
     * F = m × μ × g
     */
    calculateStaticFriction: function(mass, frictionCoeff) {
        return mass * frictionCoeff * SYSTEM_CONSTANTS.INERTIA_COEFFICIENT;
    },
    
    /**
     * Calculate required force to break inertia
     * @param {Object} node - Node with mass and friction
     * @returns {Object} Force calculation result
     */
    getRequiredForce: function(node) {
        const mass = node.mass || node.node_mass || 1.0;
        const friction = node.friction || node.frictionCoefficient || 0.5;
        const resistance = node.psychologicalResistance || 1.0;
        
        const staticFriction = this.calculateStaticFriction(mass, friction);
        const totalResistance = staticFriction * resistance;
        
        return {
            value: totalResistance,
            mass,
            friction,
            resistance,
            minValidForce: totalResistance,
            canBreak: (force) => force > totalResistance,
            formula: `${mass} × ${friction} × ${SYSTEM_CONSTANTS.INERTIA_COEFFICIENT} × ${resistance}`
        };
    },
    
    /**
     * Check if force can overcome inertia
     */
    canOvercome: function(node, appliedForce) {
        const required = this.getRequiredForce(node);
        const canBreak = appliedForce > required.value;
        
        return {
            success: canBreak,
            required: required.value,
            applied: appliedForce,
            deficit: canBreak ? 0 : required.value - appliedForce,
            excess: canBreak ? appliedForce - required.value : 0,
            efficiency: Math.min(appliedForce / required.value, 1)
        };
    },
    
    /**
     * Calculate kinetic friction (운동 마찰력)
     * Usually less than static friction
     */
    calculateKineticFriction: function(mass, frictionCoeff) {
        return this.calculateStaticFriction(mass, frictionCoeff) * 0.8;
    }
};

// ================================================================
// LAW 2: ACTION-REACTION (작용-반작용)
// 투입 대비 산출물 계산
// ================================================================

const ReactionLaw = {
    /**
     * Calculate reaction yield from action
     * @param {number} force - Applied force
     * @param {number} efficiency - System efficiency (0-1)
     * @returns {Object} Reaction calculation
     */
    getReaction: function(force, efficiency = SYSTEM_CONSTANTS.EFFICIENCY_FACTOR) {
        const workDone = force * efficiency;
        const heatLoss = force * (1 - efficiency);
        
        return {
            input: force,
            output: workDone,
            heatLoss,
            efficiency,
            roi: efficiency,
            netGain: workDone - heatLoss
        };
    },
    
    /**
     * Calculate money/revenue reaction
     * @param {number} actionMagnitude - Magnitude of action
     * @param {number} marketConstant - Market conversion constant
     */
    calculateMoneyReaction: function(actionMagnitude, marketConstant = 0.001) {
        const reaction = this.getReaction(actionMagnitude);
        
        return {
            ...reaction,
            revenueYield: reaction.output * marketConstant,
            potentialRevenue: actionMagnitude * marketConstant,
            actualRevenue: reaction.output * marketConstant,
            lostRevenue: reaction.heatLoss * marketConstant
        };
    },
    
    /**
     * Calculate compound reaction (multiple actions)
     */
    compoundReaction: function(actions) {
        let totalInput = 0;
        let totalOutput = 0;
        let totalHeatLoss = 0;
        
        actions.forEach(action => {
            const reaction = this.getReaction(action.force, action.efficiency);
            totalInput += reaction.input;
            totalOutput += reaction.output;
            totalHeatLoss += reaction.heatLoss;
        });
        
        return {
            totalInput,
            totalOutput,
            totalHeatLoss,
            netEfficiency: totalOutput / totalInput,
            actionCount: actions.length
        };
    },
    
    /**
     * Predict reaction from action type
     */
    predictReaction: function(actionType, baseMagnitude) {
        const multipliers = {
            'PRESENTATION': { force: 3.0, efficiency: 0.9 },
            'CONSULT': { force: 1.5, efficiency: 0.85 },
            'ATTENDANCE': { force: 1.0, efficiency: 0.95 },
            'INVEST': { force: 2.0, efficiency: 0.7 },
            'CONNECT': { force: 1.5, efficiency: 0.8 },
            'CREATE': { force: 2.5, efficiency: 0.75 },
            'DEFAULT': { force: 1.0, efficiency: 0.8 }
        };
        
        const config = multipliers[actionType] || multipliers['DEFAULT'];
        const adjustedForce = baseMagnitude * config.force;
        
        return this.getReaction(adjustedForce, config.efficiency);
    }
};

// ================================================================
// LAW 3: CONSERVATION (에너지 보존)
// 시스템 전체 에너지 추적 및 누수 감지
// ================================================================

const ConservationLaw = {
    // 이전 에너지 상태 저장
    _previousState: null,
    _auditHistory: [],
    
    /**
     * Calculate total system energy
     * E = Σ(potential + kinetic)
     */
    calculateTotalEnergy: function(nodes) {
        let potentialEnergy = 0;
        let kineticEnergy = 0;
        
        nodes.forEach(node => {
            // 위치 에너지: mass / distance
            const mass = node.mass || 1;
            const distance = node.distanceToGoal || node.distance || 1;
            potentialEnergy += mass / Math.max(distance, 0.1);
            
            // 운동 에너지: 0.5 * mass * velocity^2
            const velocity = node.velocity || 0;
            kineticEnergy += 0.5 * mass * velocity * velocity;
        });
        
        return {
            potential: potentialEnergy,
            kinetic: kineticEnergy,
            total: potentialEnergy + kineticEnergy,
            nodeCount: nodes.length
        };
    },
    
    /**
     * Audit system energy conservation
     * 에너지 누수 감지
     */
    audit: function(nodes) {
        const currentEnergy = this.calculateTotalEnergy(nodes);
        const previousTotal = this._previousState?.total || currentEnergy.total;
        
        const delta = currentEnergy.total - previousTotal;
        const leakage = delta < 0 ? Math.abs(delta) : 0;
        const gain = delta > 0 ? delta : 0;
        
        // 상태 결정
        let status = 'STABLE';
        if (leakage > previousTotal * 0.1) status = 'COLLAPSE_WARNING';
        else if (leakage > previousTotal * 0.05) status = 'DECLINING';
        else if (gain > previousTotal * 0.1) status = 'GROWING';
        
        const auditResult = {
            timestamp: Date.now(),
            currentEnergy,
            previousTotal,
            delta,
            leakage,
            gain,
            status,
            isConserved: Math.abs(delta) < SYSTEM_CONSTANTS.CONSERVATION_TOLERANCE * previousTotal,
            recommendation: this.getRecommendation(status, leakage)
        };
        
        // 이력 저장
        this._previousState = currentEnergy;
        this._auditHistory.push(auditResult);
        if (this._auditHistory.length > 100) {
            this._auditHistory = this._auditHistory.slice(-100);
        }
        
        return auditResult;
    },
    
    /**
     * Get recommendation based on status
     */
    getRecommendation: function(status, leakage) {
        switch (status) {
            case 'COLLAPSE_WARNING':
                return {
                    priority: 'CRITICAL',
                    action: '즉시 에너지 누수원 파악 및 차단',
                    detail: `누수량: ${leakage.toFixed(2)}`
                };
            case 'DECLINING':
                return {
                    priority: 'HIGH',
                    action: '에너지 재충전 액션 필요',
                    detail: '활동 빈도 또는 강도 증가 권장'
                };
            case 'GROWING':
                return {
                    priority: 'LOW',
                    action: '현재 패턴 유지',
                    detail: '에너지 축적 중'
                };
            default:
                return {
                    priority: 'NORMAL',
                    action: '모니터링 유지',
                    detail: '에너지 보존 상태 양호'
                };
        }
    },
    
    /**
     * Get audit history summary
     */
    getHistorySummary: function() {
        if (this._auditHistory.length === 0) return null;
        
        const recent = this._auditHistory.slice(-10);
        const avgDelta = recent.reduce((s, a) => s + a.delta, 0) / recent.length;
        const collapseWarnings = recent.filter(a => a.status === 'COLLAPSE_WARNING').length;
        
        return {
            totalAudits: this._auditHistory.length,
            recentAudits: recent.length,
            avgDelta,
            trend: avgDelta > 0 ? 'INCREASING' : avgDelta < 0 ? 'DECREASING' : 'STABLE',
            collapseWarnings,
            healthScore: Math.max(0, 100 - collapseWarnings * 20)
        };
    },
    
    /**
     * Reset audit state
     */
    reset: function() {
        this._previousState = null;
        this._auditHistory = [];
    }
};

// ================================================================
// CORE PHYSICS KERNEL (Unified Interface)
// ================================================================

export const CorePhysicsKernel = {
    // Law references
    inertia: InertiaLaw,
    reaction: ReactionLaw,
    conservation: ConservationLaw,
    
    // Constants
    constants: SYSTEM_CONSTANTS,
    
    // Initialized flag
    _initialized: false,
    
    // Registered sensors
    _sensors: new Map(),
    
    /**
     * Initialize the kernel
     */
    init: function(config = {}) {
        // Apply custom constants
        if (config.constants) {
            Object.assign(SYSTEM_CONSTANTS, config.constants);
        }
        
        this._initialized = true;
        console.log('[CorePhysicsKernel] Initialized with 3-Law Logic');
        
        return this;
    },
    
    /**
     * Register a sensor
     */
    registerSensor: function(sensorId, sensor) {
        this._sensors.set(sensorId, sensor);
        console.log(`[CorePhysicsKernel] Sensor registered: ${sensorId}`);
    },
    
    /**
     * Get registered sensor
     */
    getSensor: function(sensorId) {
        return this._sensors.get(sensorId);
    },
    
    /**
     * Apply all three laws to a node
     */
    applyLaws: function(node, action) {
        // 1. Inertia check
        const inertiaCheck = this.inertia.canOvercome(node, action.force);
        
        if (!inertiaCheck.success) {
            return {
                success: false,
                reason: 'INERTIA_BLOCK',
                inertia: inertiaCheck,
                requiredForce: inertiaCheck.required,
                appliedForce: action.force
            };
        }
        
        // 2. Calculate reaction
        const reaction = this.reaction.predictReaction(action.type, action.force);
        
        // 3. Update node energy
        node.energy = (node.energy || 100) + reaction.output - action.force;
        
        return {
            success: true,
            inertia: inertiaCheck,
            reaction,
            newEnergy: node.energy,
            netGain: reaction.output - action.force
        };
    },
    
    /**
     * Run full system audit
     */
    auditSystem: function(nodes) {
        const energyAudit = this.conservation.audit(nodes);
        
        // Per-node inertia analysis
        const nodeAnalysis = nodes.map(node => ({
            id: node.id,
            requiredForce: this.inertia.getRequiredForce(node),
            energy: node.energy || 0
        }));
        
        return {
            energyAudit,
            nodeAnalysis,
            systemHealth: energyAudit.status === 'STABLE' ? 'HEALTHY' : energyAudit.status,
            timestamp: Date.now()
        };
    },
    
    /**
     * Simulate action outcome
     */
    simulate: function(node, actionType, magnitude) {
        // Check if action can break inertia
        const reaction = this.reaction.predictReaction(actionType, magnitude);
        const inertiaCheck = this.inertia.canOvercome(node, reaction.input);
        
        return {
            actionType,
            magnitude,
            willSucceed: inertiaCheck.success,
            expectedOutput: inertiaCheck.success ? reaction.output : 0,
            energyRequired: reaction.input,
            roi: inertiaCheck.success ? reaction.efficiency : 0,
            recommendation: inertiaCheck.success 
                ? `액션 실행 권장 (예상 ROI: ${(reaction.efficiency * 100).toFixed(1)}%)`
                : `힘 부족 (필요: ${inertiaCheck.required.toFixed(1)}, 현재: ${magnitude})`
        };
    },
    
    /**
     * Get kernel status
     */
    getStatus: function() {
        return {
            initialized: this._initialized,
            registeredSensors: Array.from(this._sensors.keys()),
            constants: SYSTEM_CONSTANTS,
            auditHistory: this.conservation.getHistorySummary()
        };
    }
};

// Export individual laws for direct access
export { InertiaLaw, ReactionLaw, ConservationLaw, SYSTEM_CONSTANTS };

export default CorePhysicsKernel;




