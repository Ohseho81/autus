// ================================================================
// AUTUS CHURN PREVENTION ENGINE (BEZOS EDITION)
// 이탈 방지 시뮬레이션 및 교정 벡터 시스템
//
// 기능:
// 1. Churn Risk Detection - 이탈 위험 감지
// 2. Correction Vector Calculation - 교정 벡터 계산
// 3. Retention Automation Pack - 유지 자동화 팩
// 4. Orbit Path Prediction - 이탈 경로 예측
//
// Version: 2.0.0
// Status: LOCKED
// ================================================================

// ================================================================
// ENUMS
// ================================================================

export const ChurnRiskLevel = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

export const RetentionPackType = {
    EMOTIONAL_RECONNECTION: 'EMOTIONAL_RECONNECTION',
    TRUST_BUILDING: 'TRUST_BUILDING',
    AUTOMATION_DELEGATION: 'AUTOMATION_DELEGATION',
    CUSTOM_ROADMAP: 'CUSTOM_ROADMAP',
    HIGH_LEVEL_INTERVENTION: 'HIGH_LEVEL_INTERVENTION',
    EMERGENCY_RECOVERY: 'EMERGENCY_RECOVERY'
};

export const CorrectionThrustType = {
    RETENTION_HIGH_LEVEL: 'RETENTION_HIGH_LEVEL',
    ENGAGEMENT_BOOST: 'ENGAGEMENT_BOOST',
    VALUE_DEMONSTRATION: 'VALUE_DEMONSTRATION',
    COMPETITIVE_COUNTER: 'COMPETITIVE_COUNTER',
    EMOTIONAL_BOND: 'EMOTIONAL_BOND'
};

// ================================================================
// CONSTANTS
// ================================================================

export const CENTER_GOAL = [0, 0, 0];

export const CHURN_THRESHOLDS = {
    attendance_rate: 0.9,
    engagement_score: 0.5,
    energy_level: 0.3,
    distance_critical: 5.0,
    competitor_gravity: 0.7,
    days_since_interaction: 7
};

export const ANXIETY_KEYWORDS = [
    '비용', '이동', '타학원', '그만', '힘들', '부담',
    '경쟁사', '다른곳', '비싸', '효과없', '시간없'
];

export const HIGH_VALUE_KEYWORDS = [
    '입시', '의대', '컨설팅', '특별', '추가', '프리미엄',
    '1:1', '집중', '강화', '올인', '목표'
];

// ================================================================
// RETENTION PACKS
// ================================================================

export const RETENTION_PACKS = [
    {
        id: 'RP_EMOTIONAL',
        packType: RetentionPackType.EMOTIONAL_RECONNECTION,
        name: '감정적 재연결',
        actions: [
            { type: 'call', action: 'personal_check_in', by: 'manager' },
            { type: 'message', action: 'appreciation_note', personalized: true },
            { type: 'gift', action: 'small_gesture', value: 'low' },
            { type: 'meeting', action: 'face_to_face', duration: 30 }
        ],
        expectedImpact: { engagement: 0.25, energy: 0.15, trust: 0.20 },
        priority: 8,
        triggerConditions: { color: 'RED', stress_level: '>0.6' }
    },
    {
        id: 'RP_TRUST',
        packType: RetentionPackType.TRUST_BUILDING,
        name: '신뢰 구축 리포트',
        actions: [
            { type: 'report', action: 'progress_summary', format: 'visual' },
            { type: 'data', action: 'achievement_highlights' },
            { type: 'comparison', action: 'before_after_analysis' },
            { type: 'roadmap', action: 'next_milestones_preview' }
        ],
        expectedImpact: { trust: 0.30, engagement: 0.15, retention: 0.20 },
        priority: 7,
        triggerConditions: { distance_increasing: true }
    },
    {
        id: 'RP_AUTOMATION',
        packType: RetentionPackType.AUTOMATION_DELEGATION,
        name: '자동화 위임',
        actions: [
            { type: 'setup', action: 'auto_scheduling' },
            { type: 'setup', action: 'reminder_system' },
            { type: 'reduce', action: 'friction_points' },
            { type: 'simplify', action: 'communication_flow' }
        ],
        expectedImpact: { stress: -0.25, engagement: 0.10, efficiency: 0.30 },
        priority: 6,
        triggerConditions: { stress_level: '>0.7', vibration: '>0.5' }
    },
    {
        id: 'RP_ROADMAP',
        packType: RetentionPackType.CUSTOM_ROADMAP,
        name: '맞춤형 로드맵',
        actions: [
            { type: 'analysis', action: 'gap_identification' },
            { type: 'plan', action: 'personalized_curriculum' },
            { type: 'milestone', action: 'achievable_goals' },
            { type: 'report', action: 'weekly_progress_track' }
        ],
        expectedImpact: { direction: 0.35, engagement: 0.25, retention: 0.30 },
        priority: 9,
        triggerConditions: { attendance_rate: '<0.9', competitor_gravity: '>0.7' }
    },
    {
        id: 'RP_HIGH_LEVEL',
        packType: RetentionPackType.HIGH_LEVEL_INTERVENTION,
        name: '고수준 개입',
        actions: [
            { type: 'meeting', action: 'director_call', by: 'director' },
            { type: 'offer', action: 'exclusive_package' },
            { type: 'incentive', action: 'loyalty_reward' },
            { type: 'commitment', action: 'success_guarantee' }
        ],
        expectedImpact: { retention: 0.40, trust: 0.35, value_perception: 0.30 },
        priority: 10,
        triggerConditions: { risk_level: 'CRITICAL', mass: '>1.0' }
    },
    {
        id: 'RP_EMERGENCY',
        packType: RetentionPackType.EMERGENCY_RECOVERY,
        name: '긴급 복구',
        actions: [
            { type: 'immediate', action: 'pause_billing' },
            { type: 'call', action: 'crisis_intervention', priority: 'urgent' },
            { type: 'offer', action: 'flexible_terms' },
            { type: 'support', action: 'dedicated_liaison' }
        ],
        expectedImpact: { churn_prevention: 0.50, trust: 0.20, stress: -0.40 },
        priority: 10,
        triggerConditions: { churn_probability: '>0.8', days_to_churn: '<7' }
    }
];

// ================================================================
// CHURN PREVENTION ENGINE
// ================================================================

export const ChurnPreventionEngine = {
    nodes: {},
    market: {
        competitorGravity: 0.5,
        marketVolatility: 0.3,
        seasonalFactor: 1.0,
        externalEvents: []
    },
    retentionPacks: RETENTION_PACKS.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}),
    assessments: {},
    
    /**
     * 시장 상황 업데이트
     */
    updateMarketCondition(market) {
        Object.assign(this.market, market);
    },
    
    /**
     * 노드 등록
     */
    registerNode(node) {
        node.distanceFromCenter = this._calculateDistance(node.position, CENTER_GOAL);
        node.color = this._determineColor(node.energy);
        node.isUnstable = this._checkInstability(node);
        this.nodes[node.id] = node;
        return node;
    },
    
    /**
     * 노드 상태 업데이트
     */
    updateNode(nodeId, updates) {
        const node = this.nodes[nodeId];
        if (!node) return;
        
        Object.assign(node, updates);
        node.distanceFromCenter = this._calculateDistance(node.position, CENTER_GOAL);
        node.color = this._determineColor(node.energy);
        node.isUnstable = this._checkInstability(node);
    },
    
    /**
     * 이탈 위험 평가
     */
    assessChurnRisk(nodeId) {
        const node = this.nodes[nodeId];
        if (!node) throw new Error(`Node ${nodeId} not found`);
        
        const factors = [];
        let riskScore = 0;
        
        // 1. 출석률 체크
        if (node.attendanceRate < CHURN_THRESHOLDS.attendance_rate) {
            const factorScore = (CHURN_THRESHOLDS.attendance_rate - node.attendanceRate) * 2;
            factors.push({
                factor: 'low_attendance',
                value: node.attendanceRate,
                threshold: CHURN_THRESHOLDS.attendance_rate,
                impact: factorScore
            });
            riskScore += factorScore;
        }
        
        // 2. 에너지 레벨 체크
        if (node.energy < CHURN_THRESHOLDS.energy_level) {
            const factorScore = (CHURN_THRESHOLDS.energy_level - node.energy) * 1.5;
            factors.push({
                factor: 'low_energy',
                value: node.energy,
                threshold: CHURN_THRESHOLDS.energy_level,
                impact: factorScore
            });
            riskScore += factorScore;
        }
        
        // 3. 거리 체크
        if (node.distanceFromCenter > CHURN_THRESHOLDS.distance_critical) {
            const factorScore = (node.distanceFromCenter - CHURN_THRESHOLDS.distance_critical) * 0.1;
            factors.push({
                factor: 'high_distance',
                value: node.distanceFromCenter,
                threshold: CHURN_THRESHOLDS.distance_critical,
                impact: factorScore
            });
            riskScore += factorScore;
        }
        
        // 4. 경쟁사 영향력 체크
        if (this.market.competitorGravity > CHURN_THRESHOLDS.competitor_gravity) {
            const factorScore = this.market.competitorGravity * 0.5;
            factors.push({
                factor: 'competitor_pressure',
                value: this.market.competitorGravity,
                threshold: CHURN_THRESHOLDS.competitor_gravity,
                impact: factorScore
            });
            riskScore += factorScore;
        }
        
        // 5. 불안 키워드 체크
        const anxietyCount = (node.keywordsDetected || [])
            .filter(kw => ANXIETY_KEYWORDS.includes(kw)).length;
        if (anxietyCount > 0) {
            const factorScore = anxietyCount * 0.15;
            factors.push({
                factor: 'anxiety_keywords',
                count: anxietyCount,
                keywords: node.keywordsDetected.filter(kw => ANXIETY_KEYWORDS.includes(kw)),
                impact: factorScore
            });
            riskScore += factorScore;
        }
        
        // 6. 스트레스 레벨
        if ((node.stressLevel || 0) > 0.6) {
            const factorScore = node.stressLevel * 0.3;
            factors.push({
                factor: 'high_stress',
                value: node.stressLevel,
                impact: factorScore
            });
            riskScore += factorScore;
        }
        
        // 위험 레벨 결정
        riskScore = Math.min(riskScore, 1.0);
        
        let riskLevel;
        if (riskScore > 0.75) riskLevel = ChurnRiskLevel.CRITICAL;
        else if (riskScore > 0.5) riskLevel = ChurnRiskLevel.HIGH;
        else if (riskScore > 0.25) riskLevel = ChurnRiskLevel.MEDIUM;
        else riskLevel = ChurnRiskLevel.LOW;
        
        // 예상 이탈 일수
        const predictedDays = riskScore > 0 ? Math.floor(30 * (1 - riskScore)) : 90;
        
        // 교정 벡터 계산
        const correction = this._calculateCorrectionVector(node);
        
        // 권장 액션
        const recommendedActions = this._getRecommendedActions(node, riskLevel, factors);
        
        const assessment = {
            nodeId,
            riskLevel,
            riskScore,
            contributingFactors: factors,
            predictedChurnDays: predictedDays,
            recommendedActions,
            correctionVector: correction.direction
        };
        
        this.assessments[nodeId] = assessment;
        return assessment;
    },
    
    /**
     * 교정 벡터 계산
     */
    _calculateCorrectionVector(node) {
        const [dx, dy, dz] = CENTER_GOAL.map((c, i) => c - node.position[i]);
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        
        const direction = [dx / distance, dy / distance, dz / distance];
        const magnitude = node.distanceFromCenter * (1 - node.energy) * 2;
        
        let thrustType;
        if (this.market.competitorGravity > 0.7) {
            thrustType = CorrectionThrustType.COMPETITIVE_COUNTER;
        } else if ((node.stressLevel || 0) > 0.7) {
            thrustType = CorrectionThrustType.EMOTIONAL_BOND;
        } else if (node.energy < 0.3) {
            thrustType = CorrectionThrustType.ENGAGEMENT_BOOST;
        } else {
            thrustType = CorrectionThrustType.VALUE_DEMONSTRATION;
        }
        
        const estimatedTime = distance / Math.max(magnitude, 0.1) * 24;
        
        return {
            direction,
            magnitude,
            thrustType,
            targetPosition: CENTER_GOAL,
            estimatedTimeToTarget: estimatedTime
        };
    },
    
    /**
     * 권장 액션 결정
     */
    _getRecommendedActions(node, riskLevel, factors) {
        const actions = [];
        
        if (node.color === 'RED') actions.push('EMOTIONAL_RECONNECTION');
        if (node.distanceFromCenter > 3) actions.push('TRUST_BUILDING_REPORT');
        if ((node.stressLevel || 0) > 0.6) actions.push('AUTOMATION_DELEGATION');
        
        if (this.market.competitorGravity > 0.7 && node.attendanceRate < 0.9) {
            actions.push('CUSTOM_ROADMAP');
        }
        
        if (riskLevel === ChurnRiskLevel.CRITICAL) {
            actions.push('HIGH_LEVEL_INTERVENTION', 'EMERGENCY_RECOVERY');
        }
        
        return actions;
    },
    
    /**
     * 이탈 경로 예측
     */
    predictOrbitPath(nodeId, hours = 168) {
        const node = this.nodes[nodeId];
        if (!node) throw new Error(`Node ${nodeId} not found`);
        
        const path = [];
        const timeSteps = [];
        
        let pos = [...node.position];
        let vel = [...(node.velocity || [0, 0, 0])];
        let energy = node.energy;
        
        const dt = 1.0;
        
        for (let t = 0; t <= hours; t += dt) {
            path.push([...pos]);
            timeSteps.push(t);
            
            energy *= 0.995;
            
            // 중력 영향
            const gx = -pos[0] * 0.01 * energy;
            const gy = -pos[1] * 0.01 * energy;
            const gz = -pos[2] * 0.01 * energy;
            
            // 경쟁사 영향 (외향력)
            const cx = pos[0] * 0.005 * this.market.competitorGravity;
            const cy = pos[1] * 0.005 * this.market.competitorGravity;
            const cz = pos[2] * 0.005 * this.market.competitorGravity;
            
            vel[0] += (gx + cx) * dt;
            vel[1] += (gy + cy) * dt;
            vel[2] += (gz + cz) * dt;
            
            pos[0] += vel[0] * dt;
            pos[1] += vel[1] * dt;
            pos[2] += vel[2] * dt;
        }
        
        const finalDistance = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
        const churnProbability = Math.min(finalDistance / 10, 1.0);
        
        // 개입 포인트
        const interventionPoints = [];
        for (let i = 1; i < path.length; i++) {
            const prevDist = Math.sqrt(path[i-1].reduce((s, p) => s + p ** 2, 0));
            const currDist = Math.sqrt(path[i].reduce((s, p) => s + p ** 2, 0));
            
            if (currDist - prevDist > 0.5) {
                interventionPoints.push({
                    timeHours: timeSteps[i],
                    position: path[i],
                    urgency: currDist > 5 ? 'HIGH' : 'MEDIUM'
                });
            }
        }
        
        return {
            nodeId,
            predictedPath: path,
            timeSteps,
            churnProbability,
            interventionPoints
        };
    },
    
    /**
     * 유지 팩 트리거
     */
    triggerRetentionPack(nodeId, packType) {
        const pack = RETENTION_PACKS.find(p => p.packType === packType);
        if (!pack) return { success: false, error: 'Pack not found' };
        
        const node = this.nodes[nodeId];
        if (!node) return { success: false, error: 'Node not found' };
        
        return {
            success: true,
            packId: pack.id,
            packName: pack.name,
            actions: pack.actions,
            expectedImpact: pack.expectedImpact,
            nodeId,
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * UI 데이터
     */
    getUIData(nodeId) {
        const node = this.nodes[nodeId];
        const assessment = this.assessments[nodeId];
        
        if (!node) return {};
        
        const correction = this._calculateCorrectionVector(node);
        
        return {
            node: {
                id: node.id,
                position: node.position,
                color: node.color,
                isUnstable: node.isUnstable
            },
            arrow: {
                from: node.position,
                to: CENTER_GOAL,
                color: this._getArrowColor(assessment),
                label: this._getArrowLabel(assessment, correction),
                magnitude: correction.magnitude
            },
            risk: {
                level: assessment?.riskLevel || 'UNKNOWN',
                score: assessment?.riskScore || 0,
                predictedDays: assessment?.predictedChurnDays
            },
            recommendedPack: assessment?.recommendedActions?.[0] || null
        };
    },
    
    /**
     * 유틸리티 함수들
     */
    _calculateDistance(p1, p2) {
        return Math.sqrt(p1.reduce((s, v, i) => s + (v - p2[i]) ** 2, 0));
    },
    
    _determineColor(energy) {
        if (energy > 0.6) return 'BLUE';
        if (energy > 0.3) return 'YELLOW';
        return 'RED';
    },
    
    _checkInstability(node) {
        return (
            node.energy < 0.4 ||
            (node.stressLevel || 0) > 0.6 ||
            node.distanceFromCenter > 4 ||
            node.attendanceRate < 0.85
        );
    },
    
    _getArrowColor(assessment) {
        if (!assessment) return 'GRAY';
        const colorMap = {
            [ChurnRiskLevel.LOW]: 'GREEN',
            [ChurnRiskLevel.MEDIUM]: 'YELLOW',
            [ChurnRiskLevel.HIGH]: 'ORANGE',
            [ChurnRiskLevel.CRITICAL]: 'GOLD'
        };
        return colorMap[assessment.riskLevel] || 'GRAY';
    },
    
    _getArrowLabel(assessment, correction) {
        if (!assessment) return 'Monitor';
        const labelMap = {
            [CorrectionThrustType.RETENTION_HIGH_LEVEL]: 'Push Top-Tier Roadmap',
            [CorrectionThrustType.ENGAGEMENT_BOOST]: 'Boost Engagement',
            [CorrectionThrustType.VALUE_DEMONSTRATION]: 'Demonstrate Value',
            [CorrectionThrustType.COMPETITIVE_COUNTER]: 'Counter Competition',
            [CorrectionThrustType.EMOTIONAL_BOND]: 'Strengthen Bond'
        };
        return labelMap[correction.thrustType] || 'Apply Correction';
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            nodeCount: Object.keys(this.nodes).length,
            assessmentCount: Object.keys(this.assessments).length,
            market: this.market,
            packCount: RETENTION_PACKS.length
        };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.nodes = {};
        this.assessments = {};
    }
};

// ================================================================
// CHURN SIMULATION ENGINE
// ================================================================

export const ChurnSimulationEngine = {
    engine: ChurnPreventionEngine,
    
    /**
     * 시나리오 시뮬레이션
     */
    simulateScenario(nodeId, scenario) {
        const node = this.engine.nodes[nodeId];
        if (!node) return { error: 'Node not found' };
        
        const gaze = scenario.gazeStability ?? 1.0;
        const keywords = scenario.parentAnxietyKeywords || [];
        const marketForce = scenario.externalMarketForce ?? 0.5;
        
        // 에너지 계산
        const energyDelta = (gaze - 1.0) * 0.5;
        const newEnergy = Math.max(0.1, Math.min(1.0, node.energy + energyDelta));
        
        // 시장 상황 업데이트
        this.engine.market.competitorGravity = marketForce;
        
        // 노드 업데이트
        this.engine.updateNode(nodeId, {
            energy: newEnergy,
            keywordsDetected: [...(node.keywordsDetected || []), ...keywords],
            stressLevel: Math.min(1.0, (node.stressLevel || 0) + keywords.length * 0.1)
        });
        
        // 위험 평가
        const assessment = this.engine.assessChurnRisk(nodeId);
        
        // 경로 예측
        const prediction = this.engine.predictOrbitPath(nodeId, 168);
        
        // 처방 생성
        let prescription = null;
        if ([ChurnRiskLevel.HIGH, ChurnRiskLevel.CRITICAL].includes(assessment.riskLevel)) {
            prescription = this._generatePrescription(assessment);
        }
        
        return {
            input: scenario,
            nodeState: {
                energy: newEnergy,
                color: node.color,
                distance: node.distanceFromCenter
            },
            assessment: {
                riskLevel: assessment.riskLevel,
                riskScore: assessment.riskScore,
                predictedDays: assessment.predictedChurnDays
            },
            prediction: {
                churnProbability: prediction.churnProbability,
                interventionPoints: prediction.interventionPoints.length
            },
            prescription,
            uiData: this.engine.getUIData(nodeId)
        };
    },
    
    /**
     * 처방 생성
     */
    _generatePrescription(assessment) {
        let packType;
        
        if (assessment.riskLevel === ChurnRiskLevel.CRITICAL) {
            packType = RetentionPackType.HIGH_LEVEL_INTERVENTION;
        } else if (assessment.recommendedActions.includes('CUSTOM_ROADMAP')) {
            packType = RetentionPackType.CUSTOM_ROADMAP;
        } else if (assessment.recommendedActions.includes('EMOTIONAL_RECONNECTION')) {
            packType = RetentionPackType.EMOTIONAL_RECONNECTION;
        } else {
            packType = RetentionPackType.TRUST_BUILDING;
        }
        
        const pack = RETENTION_PACKS.find(p => p.packType === packType);
        
        if (pack) {
            return {
                packType: packType,
                packName: pack.name,
                actions: pack.actions.slice(0, 3),
                expectedImpact: pack.expectedImpact
            };
        }
        
        return null;
    }
};

// ================================================================
// TEST
// ================================================================

export function testChurnPreventionEngine() {
    console.log('='.repeat(70));
    console.log('AUTUS Churn Prevention Engine Test');
    console.log('='.repeat(70));
    
    ChurnPreventionEngine.reset();
    
    // 시장 상황 설정
    ChurnPreventionEngine.updateMarketCondition({
        competitorGravity: 0.8,
        marketVolatility: 0.4,
        seasonalFactor: 1.0,
        externalEvents: ['경쟁사 공격 마케팅']
    });
    
    // 노드 등록
    const node = {
        id: 'member_001',
        position: [3.0, 2.0, 0.0],
        velocity: [0.1, 0.05, 0.0],
        mass: 1.2,
        energy: 0.45,
        attendanceRate: 0.85,
        engagementScore: 0.6,
        lastInteraction: Date.now() - 5 * 24 * 60 * 60 * 1000,
        keywordsDetected: ['비용', '타학원', '효과'],
        stressLevel: 0.65
    };
    
    ChurnPreventionEngine.registerNode(node);
    
    console.log('\n[노드 상태]');
    console.log(`  ID: ${node.id}`);
    console.log(`  Energy: ${node.energy.toFixed(2)}`);
    console.log(`  Color: ${node.color}`);
    console.log(`  Distance: ${node.distanceFromCenter.toFixed(2)}`);
    console.log(`  Unstable: ${node.isUnstable}`);
    
    // 이탈 위험 평가
    console.log('\n[이탈 위험 평가]');
    const assessment = ChurnPreventionEngine.assessChurnRisk('member_001');
    console.log(`  Risk Level: ${assessment.riskLevel}`);
    console.log(`  Risk Score: ${(assessment.riskScore * 100).toFixed(1)}%`);
    console.log(`  Predicted Churn: ${assessment.predictedChurnDays} days`);
    console.log('  Factors:');
    assessment.contributingFactors.forEach(f => {
        console.log(`    • ${f.factor}: ${f.value ?? f.count ?? 'N/A'}`);
    });
    console.log(`  Recommended: ${assessment.recommendedActions.join(', ')}`);
    
    // 경로 예측
    console.log('\n[이탈 경로 예측 (7일)]');
    const prediction = ChurnPreventionEngine.predictOrbitPath('member_001', 168);
    console.log(`  Churn Probability: ${(prediction.churnProbability * 100).toFixed(1)}%`);
    console.log(`  Intervention Points: ${prediction.interventionPoints.length}`);
    
    // UI 데이터
    console.log('\n[UI 데이터]');
    const uiData = ChurnPreventionEngine.getUIData('member_001');
    console.log(`  Arrow Color: ${uiData.arrow.color}`);
    console.log(`  Arrow Label: ${uiData.arrow.label}`);
    console.log(`  Recommended Pack: ${uiData.recommendedPack}`);
    
    // 시뮬레이션
    console.log('\n[시뮬레이션]');
    const simResult = ChurnSimulationEngine.simulateScenario('member_001', {
        gazeStability: 0.6,
        parentAnxietyKeywords: ['비용', '이동', '타학원'],
        externalMarketForce: 0.8
    });
    console.log(`  New Energy: ${simResult.nodeState.energy.toFixed(2)}`);
    console.log(`  Risk Level: ${simResult.assessment.riskLevel}`);
    console.log(`  Prescription: ${simResult.prescription?.packName || 'None'}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Churn Prevention Test Complete');
    
    return { assessment, prediction, simResult };
}

export default ChurnPreventionEngine;



