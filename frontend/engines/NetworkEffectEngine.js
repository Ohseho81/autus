// ================================================================
// AUTUS GRAND EQUATION AGGREGATOR (BEZOS EDITION)
// 가치 폭발 & 네트워크 효과 엔진
//
// 기능:
// 1. Grand Equation - 성공 상관관계 수식 집계
// 2. Federated Formula Update - 분산 학습
// 3. Cross-Node Synergy - 노드 간 시너지 추적
// 4. Singularity Alert - 임계질량 감지
//
// 스케일링 법칙:
// - n² (Metcalfe): 노드 연결 기반
// - n³ (AUTUS): 공유 물리 법칙 기반
// - Kaplan Scaling: 데이터↑ → 오판율 ↓ (Power-law)
//
// Version: 2.0.0
// Status: LOCKED
// ================================================================

// ================================================================
// ENUMS
// ================================================================

export const ScalingPhase = {
    INDIVIDUAL: 'INDIVIDUAL',
    PATTERN: 'PATTERN',
    EXPLOSION: 'EXPLOSION',
    SINGULARITY: 'SINGULARITY'
};

export const FormulaType = {
    CHURN_PREDICTION: 'CHURN_PREDICTION',
    ENGAGEMENT_BOOST: 'ENGAGEMENT_BOOST',
    REVENUE_OPTIMIZE: 'REVENUE_OPTIMIZE',
    TIMING_PATTERN: 'TIMING_PATTERN',
    CROSS_SELL: 'CROSS_SELL'
};

export const ClusterType = {
    ELEMENTARY: 'ELEMENTARY',
    MIDDLE: 'MIDDLE',
    HIGH: 'HIGH',
    ADULT: 'ADULT',
    MIXED: 'MIXED'
};

// ================================================================
// CONSTANTS
// ================================================================

export const SCALING_THRESHOLDS = {
    [ScalingPhase.INDIVIDUAL]: 100,
    [ScalingPhase.PATTERN]: 1000,
    [ScalingPhase.EXPLOSION]: 10000,
    [ScalingPhase.SINGULARITY]: Infinity
};

export const DIFFERENTIAL_PRIVACY = {
    epsilon: 1.0,
    delta: 1e-5,
    sensitivity: 1.0
};

// ================================================================
// SUCCESS VECTOR
// ================================================================

export class SuccessVector {
    constructor(data) {
        this.sourceId = data.sourceId;
        this.clusterId = data.clusterId;
        this.timestamp = data.timestamp || new Date();
        
        this.energyDelta = data.energyDelta || 0;
        this.momentumDelta = data.momentumDelta || 0;
        this.engagementDelta = data.engagementDelta || 0;
        this.revenueDelta = data.revenueDelta || 0;
        
        this.actionType = data.actionType || '';
        this.timeOfDay = data.timeOfDay || new Date().getHours();
        this.dayOfWeek = data.dayOfWeek || new Date().getDay();
        
        this.noiseAdded = data.noiseAdded || 0;
    }
}

// ================================================================
// GRAND EQUATION
// ================================================================

export class GrandEquation {
    constructor(data) {
        this.id = data.id;
        this.formulaType = data.formulaType;
        this.coefficients = data.coefficients || {};
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.contributingVectors = data.contributingVectors || 0;
        this.accuracy = data.accuracy || 0.6;
        this.confidence = data.confidence || 0.5;
        this.applicableClusters = data.applicableClusters || [];
    }
    
    /**
     * 수식으로 예측
     */
    predict(inputVector) {
        let result = this.coefficients.intercept || 0;
        
        for (const [key, coef] of Object.entries(this.coefficients)) {
            if (key in inputVector) {
                result += coef * inputVector[key];
            }
        }
        
        return Math.max(0, Math.min(1, result));
    }
}

// ================================================================
// CLUSTER PROFILE
// ================================================================

export class ClusterProfile {
    constructor(data) {
        this.clusterId = data.clusterId;
        this.clusterType = data.clusterType;
        this.location = data.location;
        
        this.totalNodes = data.totalNodes || 0;
        this.activeNodes = data.activeNodes || 0;
        
        this.avgEngagement = data.avgEngagement || 0.5;
        this.avgRetention = data.avgRetention || 0.9;
        this.avgRevenuePerNode = data.avgRevenuePerNode || 500000;
        
        this.vectorsContributed = data.vectorsContributed || 0;
        this.equationsApplied = data.equationsApplied || [];
    }
}

// ================================================================
// SYNERGY EVENT
// ================================================================

export class SynergyEvent {
    constructor(data) {
        this.id = data.id;
        this.sourceCluster = data.sourceCluster;
        this.targetCluster = data.targetCluster;
        this.patternType = data.patternType;
        this.patternDescription = data.patternDescription;
        this.accuracyImprovement = data.accuracyImprovement;
        this.timestamp = data.timestamp || new Date();
    }
}

// ================================================================
// DIFFERENTIAL PRIVACY MODULE
// ================================================================

export const DifferentialPrivacyModule = {
    epsilon: DIFFERENTIAL_PRIVACY.epsilon,
    sensitivity: DIFFERENTIAL_PRIVACY.sensitivity,
    
    /**
     * Laplace 노이즈 추가
     */
    addNoise(value) {
        const scale = this.sensitivity / this.epsilon;
        // Box-Muller 변환으로 가우시안 근사
        const u1 = Math.random();
        const u2 = Math.random();
        const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * scale;
        
        return { noisyValue: value + noise, noise: Math.abs(noise) };
    },
    
    /**
     * 벡터 전체에 노이즈 추가
     */
    addNoiseToVector(vector) {
        const noisyVector = {};
        
        for (const [key, value] of Object.entries(vector)) {
            const { noisyValue } = this.addNoise(value);
            noisyVector[key] = noisyValue;
        }
        
        return noisyVector;
    }
};

// ================================================================
// GRAND EQUATION AGGREGATOR
// ================================================================

export const GrandEquationAggregator = {
    equations: {},
    privacy: DifferentialPrivacyModule,
    
    /**
     * 초기화
     */
    init() {
        this.equations = {};
        this._initializeEquations();
        return this;
    },
    
    /**
     * 초기 수식 설정
     */
    _initializeEquations() {
        const baseEquations = [
            {
                type: FormulaType.CHURN_PREDICTION,
                coefficients: {
                    intercept: 0.5,
                    energy_level: -0.3,
                    engagement_rate: -0.25,
                    days_since_contact: 0.02,
                    competitor_interest: 0.2
                }
            },
            {
                type: FormulaType.ENGAGEMENT_BOOST,
                coefficients: {
                    intercept: 0.3,
                    personalized_content: 0.25,
                    timing_score: 0.2,
                    previous_response: 0.15,
                    milestone_proximity: 0.1
                }
            },
            {
                type: FormulaType.TIMING_PATTERN,
                coefficients: {
                    intercept: 0.4,
                    hour_9_12: 0.15,
                    hour_18_21: 0.2,
                    weekend_factor: -0.1,
                    after_exercise: 0.25
                }
            },
            {
                type: FormulaType.REVENUE_OPTIMIZE,
                coefficients: {
                    intercept: 0.2,
                    trust_score: 0.3,
                    usage_intensity: 0.2,
                    referral_made: 0.15,
                    premium_interest_signal: 0.35
                }
            }
        ];
        
        baseEquations.forEach(eqData => {
            const eqId = `EQ_${eqData.type}`;
            this.equations[eqId] = new GrandEquation({
                id: eqId,
                formulaType: eqData.type,
                coefficients: eqData.coefficients,
                createdAt: new Date(),
                updatedAt: new Date(),
                contributingVectors: 0,
                accuracy: 0.6,
                confidence: 0.5,
                applicableClusters: []
            });
        });
    },
    
    /**
     * Federated Formula Update
     */
    federatedUpdate(vectors, clusterId, learningRate = 0.01) {
        if (!vectors || vectors.length === 0) {
            return { updated: 0, equations: [] };
        }
        
        const updatedEquations = [];
        
        Object.entries(this.equations).forEach(([eqId, equation]) => {
            const relevantVectors = this._filterRelevantVectors(vectors, equation.formulaType);
            
            if (relevantVectors.length === 0) return;
            
            const noisyGradients = this._calculateNoisyGradients(relevantVectors, equation);
            
            Object.keys(equation.coefficients).forEach(key => {
                if (key in noisyGradients) {
                    equation.coefficients[key] += learningRate * noisyGradients[key];
                }
            });
            
            equation.updatedAt = new Date();
            equation.contributingVectors += relevantVectors.length;
            
            if (!equation.applicableClusters.includes(clusterId)) {
                equation.applicableClusters.push(clusterId);
            }
            
            updatedEquations.push(eqId);
        });
        
        return {
            updated: updatedEquations.length,
            equations: updatedEquations,
            vectorsProcessed: vectors.length,
            privacyPreserved: true
        };
    },
    
    /**
     * 수식 타입에 맞는 벡터 필터링
     */
    _filterRelevantVectors(vectors, formulaType) {
        const typeActionMap = {
            [FormulaType.CHURN_PREDICTION]: ['retention', 'churn', 'engagement'],
            [FormulaType.ENGAGEMENT_BOOST]: ['open', 'click', 'response'],
            [FormulaType.TIMING_PATTERN]: ['send', 'notify', 'report'],
            [FormulaType.REVENUE_OPTIMIZE]: ['purchase', 'upgrade', 'referral']
        };
        
        const relevantActions = typeActionMap[formulaType] || [];
        
        return vectors.filter(v =>
            relevantActions.some(a => v.actionType.toLowerCase().includes(a))
        );
    },
    
    /**
     * 노이즈 추가된 그래디언트 계산
     */
    _calculateNoisyGradients(vectors, equation) {
        const gradients = {};
        
        Object.keys(equation.coefficients).forEach(key => {
            if (key === 'intercept') return;
            
            const deltas = vectors
                .map(v => v[key.replace(/_/g, '')] || 0)
                .filter(d => d !== 0);
            
            if (deltas.length > 0) {
                const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
                const { noisyValue } = this.privacy.addNoise(avgDelta);
                gradients[key] = noisyValue;
            }
        });
        
        return gradients;
    },
    
    /**
     * 수식 조회
     */
    getEquation(formulaType) {
        const eqId = `EQ_${formulaType}`;
        return this.equations[eqId];
    },
    
    /**
     * 예측 수행
     */
    predict(formulaType, inputData) {
        const equation = this.getEquation(formulaType);
        
        if (!equation) {
            return { success: false, error: 'Equation not found' };
        }
        
        const prediction = equation.predict(inputData);
        
        return {
            success: true,
            formulaType,
            prediction,
            confidence: equation.confidence,
            contributingDataPoints: equation.contributingVectors
        };
    }
};

// ================================================================
// CROSS-NODE SYNERGY TRACKER
// ================================================================

export const CrossNodeSynergyTracker = {
    aggregator: null,
    clusters: {},
    synergyEvents: [],
    
    /**
     * 초기화
     */
    init(aggregator) {
        this.aggregator = aggregator;
        this.clusters = {};
        this.synergyEvents = [];
        return this;
    },
    
    /**
     * 클러스터 등록
     */
    registerCluster(clusterId, clusterType, location) {
        const profile = new ClusterProfile({
            clusterId,
            clusterType,
            location
        });
        
        this.clusters[clusterId] = profile;
        return profile;
    },
    
    /**
     * 시너지 이벤트 기록
     */
    trackSynergy(sourceCluster, targetCluster, patternType, accuracyBefore, accuracyAfter) {
        const improvement = accuracyAfter - accuracyBefore;
        
        if (improvement <= 0) return null;
        
        const event = new SynergyEvent({
            id: `SYN_${Date.now()}`,
            sourceCluster,
            targetCluster,
            patternType,
            patternDescription: `${sourceCluster}의 ${patternType} 패턴이 ${targetCluster}에 적용`,
            accuracyImprovement: improvement,
            timestamp: new Date()
        });
        
        this.synergyEvents.push(event);
        return event;
    },
    
    /**
     * 네트워크 효과 계산
     */
    calculateNetworkEffect() {
        const n = Object.values(this.clusters).reduce((s, c) => s + c.activeNodes, 0);
        
        if (n === 0) {
            return { n: 0, effectType: 'none', value: 0 };
        }
        
        const simpleConnections = n * (n - 1) / 2;
        const synergyCount = this.synergyEvents.length;
        const clusterCount = Object.keys(this.clusters).length;
        
        const synergyRatio = synergyCount / Math.max(clusterCount * (clusterCount - 1), 1);
        const scalingExponent = 2.0 + Math.min(synergyRatio, 1.0);
        const networkValue = Math.pow(n, scalingExponent);
        
        return {
            n,
            simpleConnections,
            synergyCount,
            scalingExponent,
            networkValue,
            effectType: scalingExponent >= 2.5 ? 'n³' : 'n²'
        };
    },
    
    /**
     * 클러스터 간 시너지 매트릭스
     */
    getSynergyMatrix() {
        const matrix = {};
        
        Object.keys(this.clusters).forEach(clusterId => {
            matrix[clusterId] = {};
            Object.keys(this.clusters).forEach(otherId => {
                if (clusterId === otherId) {
                    matrix[clusterId][otherId] = 1.0;
                } else {
                    const synergies = this.synergyEvents.filter(e =>
                        (e.sourceCluster === clusterId && e.targetCluster === otherId) ||
                        (e.sourceCluster === otherId && e.targetCluster === clusterId)
                    );
                    matrix[clusterId][otherId] = synergies.reduce((s, e) => s + e.accuracyImprovement, 0);
                }
            });
        });
        
        return matrix;
    }
};

// ================================================================
// SINGULARITY DETECTOR
// ================================================================

export const SingularityDetector = {
    aggregator: null,
    synergyTracker: null,
    entropyHistory: [],
    
    /**
     * 초기화
     */
    init(aggregator, synergyTracker) {
        this.aggregator = aggregator;
        this.synergyTracker = synergyTracker;
        this.entropyHistory = [];
        return this;
    },
    
    /**
     * 시스템 엔트로피 측정
     */
    measureEntropy() {
        const totalNodes = Object.values(this.synergyTracker.clusters)
            .reduce((s, c) => s + c.activeNodes, 0);
        
        const activeEquations = Object.values(this.aggregator.equations)
            .filter(eq => eq.contributingVectors > 10).length;
        
        const equations = Object.values(this.aggregator.equations);
        const avgAccuracy = equations.reduce((s, eq) => s + eq.accuracy, 0) / 
                          Math.max(equations.length, 1);
        
        const crossSynergies = this.synergyTracker.synergyEvents.length;
        
        const selfSustaining = (
            avgAccuracy >= 0.8 &&
            crossSynergies >= 10 &&
            totalNodes >= 100
        );
        
        const entropy = {
            timestamp: new Date(),
            totalNodes,
            activeEquations,
            avgPredictionAccuracy: avgAccuracy,
            crossClusterSynergies: crossSynergies,
            selfSustainingGrowth: selfSustaining
        };
        
        this.entropyHistory.push(entropy);
        return entropy;
    },
    
    /**
     * 현재 스케일링 단계
     */
    getCurrentPhase() {
        if (this.entropyHistory.length === 0) {
            return ScalingPhase.INDIVIDUAL;
        }
        
        const latest = this.entropyHistory[this.entropyHistory.length - 1];
        const n = latest.totalNodes;
        
        if (latest.selfSustainingGrowth) {
            return ScalingPhase.SINGULARITY;
        } else if (n >= SCALING_THRESHOLDS[ScalingPhase.PATTERN]) {
            return ScalingPhase.EXPLOSION;
        } else if (n >= SCALING_THRESHOLDS[ScalingPhase.INDIVIDUAL]) {
            return ScalingPhase.PATTERN;
        } else {
            return ScalingPhase.INDIVIDUAL;
        }
    },
    
    /**
     * Singularity 알림 체크
     */
    checkSingularityAlert() {
        if (this.entropyHistory.length < 2) return null;
        
        const current = this.entropyHistory[this.entropyHistory.length - 1];
        const previous = this.entropyHistory[this.entropyHistory.length - 2];
        
        const nodeGrowth = (current.totalNodes - previous.totalNodes) / 
                          Math.max(previous.totalNodes, 1);
        
        if (current.selfSustainingGrowth && !previous.selfSustainingGrowth) {
            return {
                alertType: 'SINGULARITY_REACHED',
                message: '🚀 시스템이 임계질량을 돌파했습니다! 자가 성장 단계 진입.',
                metrics: {
                    totalNodes: current.totalNodes,
                    accuracy: current.avgPredictionAccuracy,
                    synergies: current.crossClusterSynergies
                },
                timestamp: new Date().toISOString()
            };
        }
        
        if (nodeGrowth > 0.5) {
            return {
                alertType: 'RAPID_GROWTH',
                message: `📈 급격한 성장 감지: 노드 ${(nodeGrowth * 100).toFixed(0)}% 증가`,
                metrics: {
                    growthRate: nodeGrowth,
                    newNodes: current.totalNodes - previous.totalNodes
                },
                timestamp: new Date().toISOString()
            };
        }
        
        return null;
    },
    
    /**
     * 스케일링 리포트
     */
    getScalingReport() {
        const phase = this.getCurrentPhase();
        const networkEffect = this.synergyTracker.calculateNetworkEffect();
        
        const phaseDescriptions = {
            [ScalingPhase.INDIVIDUAL]: '개별 최적화 단계 - 각 사용자가 독립적 혜택을 누립니다.',
            [ScalingPhase.PATTERN]: '패턴 인식 단계 - 공통 성공 법칙이 도출되고 있습니다.',
            [ScalingPhase.EXPLOSION]: '가치 폭발 단계 - 네트워크 효과가 n³로 스케일링됩니다.',
            [ScalingPhase.SINGULARITY]: '임계질량 돌파 - 시스템이 자가 성장합니다.'
        };
        
        return {
            currentPhase: phase,
            phaseDescription: phaseDescriptions[phase],
            networkEffect,
            equationsActive: Object.keys(this.aggregator.equations).length,
            clustersConnected: Object.keys(this.synergyTracker.clusters).length,
            totalSynergies: this.synergyTracker.synergyEvents.length,
            nextMilestone: this._getNextMilestone(phase)
        };
    },
    
    /**
     * 다음 마일스톤
     */
    _getNextMilestone(currentPhase) {
        const milestones = {
            [ScalingPhase.INDIVIDUAL]: {
                target: 'PATTERN',
                nodesNeeded: SCALING_THRESHOLDS[ScalingPhase.INDIVIDUAL],
                description: '100 노드 달성 시 패턴 인식 단계 진입'
            },
            [ScalingPhase.PATTERN]: {
                target: 'EXPLOSION',
                nodesNeeded: SCALING_THRESHOLDS[ScalingPhase.PATTERN],
                description: '1,000 노드 달성 시 가치 폭발 단계 진입'
            },
            [ScalingPhase.EXPLOSION]: {
                target: 'SINGULARITY',
                accuracyNeeded: 0.8,
                description: '정확도 80% + 시너지 10개 달성 시 임계질량 돌파'
            },
            [ScalingPhase.SINGULARITY]: {
                target: 'INFINITE_GROWTH',
                description: '🎯 임계질량 돌파 완료 - 무한 성장 모드'
            }
        };
        
        return milestones[currentPhase];
    }
};

// ================================================================
// INTEGRATED NETWORK EFFECT ENGINE
// ================================================================

export const NetworkEffectEngine = {
    aggregator: null,
    synergyTracker: null,
    singularityDetector: null,
    
    /**
     * 초기화
     */
    init() {
        this.aggregator = Object.create(GrandEquationAggregator).init();
        this.synergyTracker = Object.create(CrossNodeSynergyTracker).init(this.aggregator);
        this.singularityDetector = Object.create(SingularityDetector).init(this.aggregator, this.synergyTracker);
        
        return this;
    },
    
    /**
     * 로컬 벡터 처리 및 글로벌 업데이트
     */
    processLocalVectors(clusterId, vectors) {
        const updateResult = this.aggregator.federatedUpdate(vectors, clusterId);
        
        if (clusterId in this.synergyTracker.clusters) {
            this.synergyTracker.clusters[clusterId].vectorsContributed += vectors.length;
        }
        
        const entropy = this.singularityDetector.measureEntropy();
        const alert = this.singularityDetector.checkSingularityAlert();
        
        return {
            updateResult,
            currentPhase: this.singularityDetector.getCurrentPhase(),
            entropy: {
                totalNodes: entropy.totalNodes,
                accuracy: entropy.avgPredictionAccuracy,
                selfSustaining: entropy.selfSustainingGrowth
            },
            alert
        };
    },
    
    /**
     * 전체 리포트
     */
    getFullReport() {
        return {
            scaling: this.singularityDetector.getScalingReport(),
            equations: Object.fromEntries(
                Object.entries(this.aggregator.equations).map(([eqId, eq]) => [
                    eqId,
                    {
                        type: eq.formulaType,
                        accuracy: eq.accuracy,
                        contributors: eq.contributingVectors,
                        clusters: eq.applicableClusters
                    }
                ])
            ),
            synergyMatrix: this.synergyTracker.getSynergyMatrix(),
            networkEffect: this.synergyTracker.calculateNetworkEffect()
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            phase: this.singularityDetector.getCurrentPhase(),
            equations: Object.keys(this.aggregator.equations).length,
            clusters: Object.keys(this.synergyTracker.clusters).length,
            synergies: this.synergyTracker.synergyEvents.length,
            entropyMeasurements: this.singularityDetector.entropyHistory.length
        };
    }
};

// ================================================================
// TEST
// ================================================================

export function testNetworkEffectEngine() {
    console.log('='.repeat(70));
    console.log('AUTUS Grand Equation & Network Effect Test');
    console.log('='.repeat(70));
    
    const engine = NetworkEffectEngine.init();
    
    // 1. 클러스터 등록
    console.log('\n[1. 클러스터 등록]');
    const clusters = [
        ['GANGNAM_01', ClusterType.HIGH, '강남'],
        ['BUSAN_01', ClusterType.MIDDLE, '부산'],
        ['DAEJEON_01', ClusterType.ELEMENTARY, '대전']
    ];
    
    clusters.forEach(([cid, ctype, loc]) => {
        const profile = engine.synergyTracker.registerCluster(cid, ctype, loc);
        profile.activeNodes = Math.floor(Math.random() * 70) + 30;
        console.log(`  • ${cid}: ${loc}, ${profile.activeNodes} nodes`);
    });
    
    // 2. 성공 벡터 생성 및 처리
    console.log('\n[2. 성공 벡터 처리]');
    
    clusters.forEach(([clusterId]) => {
        const vectors = [];
        for (let i = 0; i < 20; i++) {
            vectors.push(new SuccessVector({
                sourceId: `node_${i}`,
                clusterId,
                timestamp: new Date(),
                energyDelta: Math.random() * 0.5 - 0.2,
                momentumDelta: Math.random() * 0.3 - 0.1,
                engagementDelta: Math.random() * 0.5,
                revenueDelta: Math.random() * 100000,
                actionType: ['retention_action', 'engagement_boost', 'send_report'][Math.floor(Math.random() * 3)],
                timeOfDay: Math.floor(Math.random() * 12) + 9,
                dayOfWeek: Math.floor(Math.random() * 7) + 1
            }));
        }
        
        const result = engine.processLocalVectors(clusterId, vectors);
        console.log(`  • ${clusterId}: ${result.updateResult.vectorsProcessed} vectors processed`);
        console.log(`    Phase: ${result.currentPhase}`);
    });
    
    // 3. 시너지 이벤트 기록
    console.log('\n[3. 크로스 노드 시너지]');
    
    engine.synergyTracker.trackSynergy(
        'GANGNAM_01', 'BUSAN_01',
        FormulaType.CHURN_PREDICTION,
        0.65, 0.72
    );
    engine.synergyTracker.trackSynergy(
        'GANGNAM_01', 'DAEJEON_01',
        FormulaType.TIMING_PATTERN,
        0.60, 0.68
    );
    
    const network = engine.synergyTracker.calculateNetworkEffect();
    console.log(`  • Scaling Exponent: ${network.scalingExponent.toFixed(2)}`);
    console.log(`  • Network Value: ${Math.round(network.networkValue)}`);
    console.log(`  • Effect Type: ${network.effectType}`);
    
    // 4. 스케일링 리포트
    console.log('\n[4. 스케일링 리포트]');
    const report = engine.singularityDetector.getScalingReport();
    console.log(`  • Current Phase: ${report.currentPhase}`);
    console.log(`  • Description: ${report.phaseDescription}`);
    console.log(`  • Next Milestone: ${report.nextMilestone.description}`);
    
    // 5. 수식 예측
    console.log('\n[5. Grand Equation 예측]');
    
    const testInput = {
        energy_level: 0.4,
        engagement_rate: 0.6,
        days_since_contact: 14,
        competitor_interest: 0.3
    };
    
    const prediction = engine.aggregator.predict(FormulaType.CHURN_PREDICTION, testInput);
    console.log(`  • Input: ${JSON.stringify(testInput)}`);
    console.log(`  • Churn Probability: ${(prediction.prediction * 100).toFixed(1)}%`);
    console.log(`  • Confidence: ${prediction.confidence.toFixed(2)}`);
    
    // 6. 전체 리포트
    console.log('\n[6. 전체 리포트]');
    const fullReport = engine.getFullReport();
    console.log(JSON.stringify({
        scalingPhase: fullReport.scaling.currentPhase,
        equationsCount: Object.keys(fullReport.equations).length,
        networkEffect: fullReport.networkEffect.effectType
    }, null, 2));
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Grand Equation & Network Effect Test Complete');
    
    return { engine, report, prediction };
}

export default NetworkEffectEngine;



