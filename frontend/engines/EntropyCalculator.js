// ================================================================
// AUTUS ENTROPY CALCULATOR (BEZOS EDITION)
// 엔트로피 계산: 시스템 무질서도 정량화
//
// 수식:
// 1. Boltzmann: S = k ln W
// 2. Shannon: H = -Σ p_i log₂ p_i  
// 3. AUTUS: S = Shannon + λ × (갈등 + 미스매치)
//
// 원리:
// - 엔트로피 ↑ → 돈 생산 효율 ↓
// - 엔트로피 ↓ → 시스템 안정 → 수익 극대화
// - 목표: S_AUTUS → 0에 수렴
//
// Version: 2.0.0
// Status: LOCKED
// ================================================================

// ================================================================
// CONSTANTS
// ================================================================

export const K_BOLTZMANN = 1.0;

export const LAMBDA_CONFLICT = 0.5;
export const LAMBDA_MISMATCH = 0.5;
export const LAMBDA_CHURN = 0.3;
export const LAMBDA_ISOLATION = 0.2;

export const ENTROPY_THRESHOLDS = {
    CRITICAL: 10.0,
    HIGH: 5.0,
    MEDIUM: 2.0,
    LOW: 1.0,
    OPTIMAL: 0.5
};

// ================================================================
// ENUMS
// ================================================================

export const NodeState = {
    STABLE: 'STABLE',
    AT_RISK: 'AT_RISK',
    CHURNING: 'CHURNING',
    SYNERGY: 'SYNERGY',
    CONFLICT: 'CONFLICT',
    ISOLATED: 'ISOLATED'
};

export const EntropyLevel = {
    OPTIMAL: 'OPTIMAL',
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

export const RelationType = {
    SYNERGY: 'SYNERGY',
    NEUTRAL: 'NEUTRAL',
    FRICTION: 'FRICTION',
    CONFLICT: 'CONFLICT'
};

// ================================================================
// DATA STRUCTURES
// ================================================================

export class NodeProbability {
    constructor(nodeId, probabilities) {
        this.nodeId = nodeId;
        this.probabilities = probabilities || {};
    }
    
    validate() {
        const total = Object.values(this.probabilities).reduce((s, p) => s + p, 0);
        return Math.abs(total - 1.0) < 0.001;
    }
}

export class RelationEdge {
    constructor(data) {
        this.fromNode = data.fromNode;
        this.toNode = data.toNode;
        this.relationType = data.relationType;
        this.strength = data.strength || 0.5;
    }
    
    get isConflict() {
        return this.relationType === RelationType.FRICTION || 
               this.relationType === RelationType.CONFLICT;
    }
}

export class RoleMismatch {
    constructor(data) {
        this.nodeId = data.nodeId;
        this.assignedRole = data.assignedRole;
        this.optimalRole = data.optimalRole;
        this.mismatchScore = data.mismatchScore || 0.5;
    }
}

export class EntropyComponents {
    constructor(data) {
        this.shannonEntropy = data.shannonEntropy || 0;
        this.conflictPenalty = data.conflictPenalty || 0;
        this.mismatchPenalty = data.mismatchPenalty || 0;
        this.churnPenalty = data.churnPenalty || 0;
        this.isolationPenalty = data.isolationPenalty || 0;
    }
    
    get total() {
        return (
            this.shannonEntropy +
            this.conflictPenalty +
            this.mismatchPenalty +
            this.churnPenalty +
            this.isolationPenalty
        );
    }
}

export class EntropyReport {
    constructor(data) {
        this.timestamp = data.timestamp || new Date();
        this.totalNodes = data.totalNodes || 0;
        this.totalEntropy = data.totalEntropy || 0;
        this.entropyLevel = data.entropyLevel;
        this.components = data.components;
        this.conflictCount = data.conflictCount || 0;
        this.mismatchCount = data.mismatchCount || 0;
        this.churnRiskCount = data.churnRiskCount || 0;
        this.isolatedCount = data.isolatedCount || 0;
        this.recommendations = data.recommendations || [];
        this.previousEntropy = data.previousEntropy;
        this.entropyDelta = data.entropyDelta;
    }
}

export class EntropyTarget {
    constructor(data) {
        this.nodeId = data.nodeId;
        this.contribution = data.contribution || 0;
        this.issueType = data.issueType;
        this.fixAction = data.fixAction;
        this.expectedReduction = data.expectedReduction || 0;
    }
}

// ================================================================
// BOLTZMANN ENTROPY
// ================================================================

export const BoltzmannEntropy = {
    /**
     * 볼츠만 엔트로피 계산: S = k ln W
     */
    calculate(numMicrostates, k = K_BOLTZMANN) {
        if (numMicrostates <= 0) return 0;
        return k * Math.log(numMicrostates);
    },
    
    /**
     * 노드와 상태 수로 계산
     * W = states^nodes
     * S = k * nodes * ln(states)
     */
    fromNodeStates(nodes, statesPerNode) {
        if (nodes <= 0 || statesPerNode <= 0) return 0;
        return K_BOLTZMANN * nodes * Math.log(statesPerNode);
    },
    
    /**
     * 순열 기반 무질서도
     * W = n! / (n-r)!
     */
    calculateDisorderFromPermutations(n, r) {
        if (n <= 0 || r <= 0 || r > n) return 0;
        
        let logW = 0;
        for (let i = n - r + 1; i <= n; i++) {
            logW += Math.log(i);
        }
        
        return K_BOLTZMANN * logW;
    }
};

// ================================================================
// SHANNON ENTROPY
// ================================================================

export const ShannonEntropy = {
    /**
     * 섀넌 엔트로피: H = -Σ p_i log₂ p_i
     */
    calculate(probabilities) {
        let entropy = 0;
        
        for (const p of probabilities) {
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        
        return entropy;
    },
    
    /**
     * 빈도수로부터 계산
     */
    calculateFromCounts(counts) {
        const total = counts.reduce((s, c) => s + c, 0);
        if (total === 0) return 0;
        
        const probabilities = counts.map(c => c / total);
        return this.calculate(probabilities);
    },
    
    /**
     * 노드 상태 확률로부터 평균 엔트로피
     */
    calculateFromNodeStates(nodeProbabilities) {
        if (!nodeProbabilities || nodeProbabilities.length === 0) return 0;
        
        let totalEntropy = 0;
        
        for (const nodeProb of nodeProbabilities) {
            const probs = Object.values(nodeProb.probabilities);
            totalEntropy += this.calculate(probs);
        }
        
        return totalEntropy / nodeProbabilities.length;
    },
    
    /**
     * 결합 엔트로피
     */
    calculateJointEntropy(jointDistribution) {
        const probs = Object.values(jointDistribution);
        return this.calculate(probs);
    },
    
    /**
     * 조건부 엔트로피 H(X|Y) = H(X,Y) - H(Y)
     */
    calculateConditionalEntropy(jointDistribution, marginalY) {
        const hXY = this.calculateJointEntropy(jointDistribution);
        const hY = this.calculate(Object.values(marginalY));
        return hXY - hY;
    },
    
    /**
     * 상호 정보량 I(X;Y) = H(X) + H(Y) - H(X,Y)
     */
    calculateMutualInformation(jointDistribution, marginalX, marginalY) {
        const hX = this.calculate(Object.values(marginalX));
        const hY = this.calculate(Object.values(marginalY));
        const hXY = this.calculateJointEntropy(jointDistribution);
        return hX + hY - hXY;
    },
    
    /**
     * 최대 엔트로피 (균등 분포): H_max = log₂(n)
     */
    maxEntropy(numStates) {
        if (numStates <= 0) return 0;
        return Math.log2(numStates);
    },
    
    /**
     * 정규화된 엔트로피 (0-1 범위)
     */
    normalizedEntropy(entropy, numStates) {
        const maxH = this.maxEntropy(numStates);
        if (maxH === 0) return 0;
        return entropy / maxH;
    }
};

// ================================================================
// AUTUS ENTROPY CALCULATOR
// ================================================================

export const AutusEntropyCalculator = {
    lambdaConflict: LAMBDA_CONFLICT,
    lambdaMismatch: LAMBDA_MISMATCH,
    lambdaChurn: LAMBDA_CHURN,
    lambdaIsolation: LAMBDA_ISOLATION,
    history: [],
    
    /**
     * 초기화
     */
    init(config = {}) {
        this.lambdaConflict = config.lambdaConflict || LAMBDA_CONFLICT;
        this.lambdaMismatch = config.lambdaMismatch || LAMBDA_MISMATCH;
        this.lambdaChurn = config.lambdaChurn || LAMBDA_CHURN;
        this.lambdaIsolation = config.lambdaIsolation || LAMBDA_ISOLATION;
        this.history = [];
        return this;
    },
    
    /**
     * AUTUS 엔트로피 계산
     * S_AUTUS = Shannon + λ₁×갈등 + λ₂×미스매치 + λ₃×이탈 + λ₄×고립
     */
    calculate(nodeProbabilities, relations, mismatches) {
        // 1. 섀넌 엔트로피
        const shannon = ShannonEntropy.calculateFromNodeStates(nodeProbabilities);
        
        // 2. 갈등 패널티
        const conflictCount = relations.filter(r => r.isConflict).length;
        const conflictPenalty = this.lambdaConflict * conflictCount;
        
        // 3. 역할 미스매치 패널티
        const mismatchCount = mismatches.length;
        const mismatchPenalty = this.lambdaMismatch * mismatchCount;
        
        // 4. 이탈 위험 패널티
        const churnRiskCount = nodeProbabilities.filter(np =>
            (np.probabilities[NodeState.CHURNING] || 0) > 0.3 ||
            (np.probabilities[NodeState.AT_RISK] || 0) > 0.5
        ).length;
        const churnPenalty = this.lambdaChurn * churnRiskCount;
        
        // 5. 고립 패널티
        const connectedNodes = new Set();
        relations.forEach(r => {
            connectedNodes.add(r.fromNode);
            connectedNodes.add(r.toNode);
        });
        const allNodes = new Set(nodeProbabilities.map(np => np.nodeId));
        const isolatedCount = [...allNodes].filter(n => !connectedNodes.has(n)).length;
        const isolationPenalty = this.lambdaIsolation * isolatedCount;
        
        // 구성요소 조립
        const components = new EntropyComponents({
            shannonEntropy: shannon,
            conflictPenalty,
            mismatchPenalty,
            churnPenalty,
            isolationPenalty
        });
        
        const total = components.total;
        const level = this._determineLevel(total);
        const recommendations = this._generateRecommendations(
            components, conflictCount, mismatchCount, churnRiskCount, isolatedCount
        );
        
        const previous = this.history.length > 0 ? 
            this.history[this.history.length - 1].totalEntropy : null;
        const delta = previous !== null ? total - previous : null;
        
        const report = new EntropyReport({
            timestamp: new Date(),
            totalNodes: nodeProbabilities.length,
            totalEntropy: total,
            entropyLevel: level,
            components,
            conflictCount,
            mismatchCount,
            churnRiskCount,
            isolatedCount,
            recommendations,
            previousEntropy: previous,
            entropyDelta: delta
        });
        
        this.history.push(report);
        return report;
    },
    
    /**
     * 엔트로피 레벨 결정
     */
    _determineLevel(entropy) {
        if (entropy >= ENTROPY_THRESHOLDS.CRITICAL) return EntropyLevel.CRITICAL;
        if (entropy >= ENTROPY_THRESHOLDS.HIGH) return EntropyLevel.HIGH;
        if (entropy >= ENTROPY_THRESHOLDS.MEDIUM) return EntropyLevel.MEDIUM;
        if (entropy >= ENTROPY_THRESHOLDS.LOW) return EntropyLevel.LOW;
        return EntropyLevel.OPTIMAL;
    },
    
    /**
     * 개선 권장 사항 생성
     */
    _generateRecommendations(components, conflicts, mismatches, churns, isolated) {
        const recs = [];
        
        const issues = [
            ['갈등', components.conflictPenalty, conflicts,
             `🔥 ${conflicts}개 갈등 관계 해소 필요 → 시너지 페어링 재배치`],
            ['미스매치', components.mismatchPenalty, mismatches,
             `⚙️ ${mismatches}명 역할 최적화 필요 → 강점 기반 재배치`],
            ['이탈', components.churnPenalty, churns,
             `⚠️ ${churns}명 이탈 위험 → 즉각적 리텐션 액션`],
            ['고립', components.isolationPenalty, isolated,
             `🔗 ${isolated}명 고립 상태 → 네트워크 연결 강화`]
        ];
        
        issues.sort((a, b) => b[1] - a[1]);
        
        issues.forEach(([name, penalty, count, rec]) => {
            if (count > 0) recs.push(rec);
        });
        
        if (components.shannonEntropy > 1.5) {
            recs.push('📊 기본 불확실성 높음 → 데이터 수집 및 예측 정확도 개선');
        }
        
        if (recs.length === 0) {
            recs.push('✅ 시스템 최적 상태 - 현재 궤도 유지');
        }
        
        return recs;
    },
    
    /**
     * 간단한 데이터로 계산
     */
    calculateFromSimpleData(nodeStates, conflictPairs, mismatchNodes) {
        const nodeProbabilities = Object.entries(nodeStates).map(([nodeId, states]) => {
            const probs = { ...states };
            if (!(NodeState.STABLE in probs)) {
                const remaining = 1.0 - Object.values(probs).reduce((s, v) => s + v, 0);
                if (remaining > 0) probs[NodeState.STABLE] = remaining;
            }
            return new NodeProbability(nodeId, probs);
        });
        
        const relations = conflictPairs.map(([n1, n2]) => new RelationEdge({
            fromNode: n1,
            toNode: n2,
            relationType: RelationType.CONFLICT,
            strength: 0.8
        }));
        
        const mismatches = mismatchNodes.map(n => new RoleMismatch({
            nodeId: n,
            assignedRole: 'current',
            optimalRole: 'optimal',
            mismatchScore: 0.7
        }));
        
        return this.calculate(nodeProbabilities, relations, mismatches);
    },
    
    /**
     * 엔트로피 개선 타겟 식별
     */
    identifyEntropyTargets(nodeProbabilities, relations, mismatches, topK = 5) {
        const targets = [];
        
        // 갈등 노드들
        relations.filter(r => r.isConflict).forEach(relation => {
            const contribution = this.lambdaConflict * relation.strength;
            targets.push(new EntropyTarget({
                nodeId: `${relation.fromNode}-${relation.toNode}`,
                contribution,
                issueType: 'CONFLICT',
                fixAction: '시너지 페어링으로 교체 또는 분리',
                expectedReduction: contribution * 0.8
            }));
        });
        
        // 미스매치 노드들
        mismatches.forEach(mismatch => {
            const contribution = this.lambdaMismatch * mismatch.mismatchScore;
            targets.push(new EntropyTarget({
                nodeId: mismatch.nodeId,
                contribution,
                issueType: 'MISMATCH',
                fixAction: `역할 변경: ${mismatch.assignedRole} → ${mismatch.optimalRole}`,
                expectedReduction: contribution * 0.9
            }));
        });
        
        // 이탈 위험 노드들
        nodeProbabilities.forEach(np => {
            const churnProb = np.probabilities[NodeState.CHURNING] || 0;
            const riskProb = np.probabilities[NodeState.AT_RISK] || 0;
            
            if (churnProb > 0.3 || riskProb > 0.5) {
                const contribution = this.lambdaChurn * Math.max(churnProb, riskProb);
                targets.push(new EntropyTarget({
                    nodeId: np.nodeId,
                    contribution,
                    issueType: 'CHURN_RISK',
                    fixAction: '즉각적 리텐션 액션 (데이터 잠금 + 감성 케어)',
                    expectedReduction: contribution * 0.7
                }));
            }
        });
        
        targets.sort((a, b) => b.contribution - a.contribution);
        return targets.slice(0, topK);
    },
    
    /**
     * 액션 실행 시 엔트로피 감소 시뮬레이션
     */
    simulateEntropyReduction(currentReport, actions) {
        let reduction = 0;
        
        actions.forEach(action => {
            const count = action.count || 1;
            
            switch (action.type) {
                case 'resolve_conflict':
                    reduction += this.lambdaConflict * count * 0.8;
                    break;
                case 'fix_mismatch':
                    reduction += this.lambdaMismatch * count * 0.9;
                    break;
                case 'prevent_churn':
                    reduction += this.lambdaChurn * count * 0.7;
                    break;
                case 'connect_isolated':
                    reduction += this.lambdaIsolation * count * 0.6;
                    break;
            }
        });
        
        const expectedEntropy = Math.max(0, currentReport.totalEntropy - reduction);
        return { reduction, expectedEntropy };
    },
    
    /**
     * 엔트로피 기반 돈 생산 효율 계산
     * 효율 = base × e^(-entropy/5)
     */
    calculateMoneyProductionEfficiency(entropy, baseEfficiency = 1.0) {
        return baseEfficiency * Math.exp(-entropy / 5);
    },
    
    /**
     * 엔트로피 추세 분석
     */
    getEntropyTrend(periods = 10) {
        if (this.history.length < 2) {
            return { trend: 'INSUFFICIENT_DATA' };
        }
        
        const recent = this.history.slice(-periods);
        const entropies = recent.map(r => r.totalEntropy);
        
        const n = entropies.length;
        const xMean = (n - 1) / 2;
        const yMean = entropies.reduce((s, e) => s + e, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        entropies.forEach((e, i) => {
            numerator += (i - xMean) * (e - yMean);
            denominator += (i - xMean) ** 2;
        });
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        
        let trend, status;
        if (slope < -0.1) {
            trend = 'DECREASING';
            status = '✅ 시스템 개선 중';
        } else if (slope > 0.1) {
            trend = 'INCREASING';
            status = '⚠️ 무질서 증가 중';
        } else {
            trend = 'STABLE';
            status = '➡️ 안정 상태';
        }
        
        return {
            trend,
            slope,
            status,
            recentValues: entropies,
            current: entropies[entropies.length - 1] || 0,
            min: Math.min(...entropies),
            max: Math.max(...entropies)
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            initialized: true,
            historyLength: this.history.length,
            lambdas: {
                conflict: this.lambdaConflict,
                mismatch: this.lambdaMismatch,
                churn: this.lambdaChurn,
                isolation: this.lambdaIsolation
            }
        };
    }
};

// ================================================================
// ENTROPY VISUALIZER
// ================================================================

export const EntropyVisualizer = {
    /**
     * 게이지 바 생성
     */
    generateGauge(entropy, maxEntropy = 15.0) {
        const ratio = Math.min(entropy / maxEntropy, 1.0);
        const filled = Math.floor(ratio * 20);
        const empty = 20 - filled;
        
        let color;
        if (ratio < 0.33) color = '🟢';
        else if (ratio < 0.66) color = '🟡';
        else color = '🔴';
        
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        return `${color} [${bar}] ${entropy.toFixed(2)}`;
    },
    
    /**
     * 구성요소 분해 시각화
     */
    generateComponentBreakdown(components) {
        const total = components.total;
        const pct = (val) => total > 0 ? (val / total * 100).toFixed(1) : '0.0';
        
        return `
┌─────────────────────────────────────────────┐
│          ENTROPY COMPONENTS                 │
├─────────────────────────────────────────────┤
│ Shannon (기본):    ${components.shannonEntropy.toFixed(2).padStart(6)} (${pct(components.shannonEntropy).padStart(5)}%)   │
│ Conflict (갈등):   ${components.conflictPenalty.toFixed(2).padStart(6)} (${pct(components.conflictPenalty).padStart(5)}%)   │
│ Mismatch (미스매치): ${components.mismatchPenalty.toFixed(2).padStart(6)} (${pct(components.mismatchPenalty).padStart(5)}%)   │
│ Churn (이탈):      ${components.churnPenalty.toFixed(2).padStart(6)} (${pct(components.churnPenalty).padStart(5)}%)   │
│ Isolation (고립):  ${components.isolationPenalty.toFixed(2).padStart(6)} (${pct(components.isolationPenalty).padStart(5)}%)   │
├─────────────────────────────────────────────┤
│ TOTAL:            ${total.toFixed(2).padStart(6)} (100.0%)    │
└─────────────────────────────────────────────┘`;
    },
    
    /**
     * 돈 생산 효율 미터
     */
    generateEfficiencyMeter(entropy) {
        const efficiency = Math.exp(-entropy / 5) * 100;
        return `
💰 돈 생산 효율: ${efficiency.toFixed(1)}%
   엔트로피 ${entropy.toFixed(2)} → 효율 손실 ${(100 - efficiency).toFixed(1)}%`;
    }
};

// ================================================================
// TEST
// ================================================================

export function testEntropyCalculator() {
    console.log('='.repeat(70));
    console.log('AUTUS Entropy Calculator Test');
    console.log('='.repeat(70));
    
    const calculator = Object.create(AutusEntropyCalculator).init();
    
    // 1. 섀넌 엔트로피 테스트
    console.log('\n[1. 섀넌 엔트로피 테스트]');
    
    let probs = [0.8, 0.2];
    let h = ShannonEntropy.calculate(probs);
    console.log(`  유지 80%, 이탈 20%: H = ${h.toFixed(3)} 비트`);
    
    let probsUniform = [0.25, 0.25, 0.25, 0.25];
    let hUniform = ShannonEntropy.calculate(probsUniform);
    console.log(`  균등 분포 (4상태): H = ${hUniform.toFixed(3)} 비트 (최대)`);
    
    // 2. 볼츠만 엔트로피 테스트
    console.log('\n[2. 볼츠만 엔트로피 테스트]');
    
    let sCoins = BoltzmannEntropy.calculate(8);
    console.log(`  동전 3개 (W=8): S = ${sCoins.toFixed(3)}`);
    
    let sNodes = BoltzmannEntropy.fromNodeStates(10, 4);
    console.log(`  10노드 × 4상태: S = ${sNodes.toFixed(3)}`);
    
    // 3. AUTUS 엔트로피 계산
    console.log('\n[3. AUTUS 엔트로피 계산]');
    
    const nodeStates = {};
    for (let i = 0; i < 42; i++) {
        nodeStates[`person_${String(i).padStart(2, '0')}`] = {
            [NodeState.STABLE]: 0.70,
            [NodeState.AT_RISK]: 0.20,
            [NodeState.CONFLICT]: 0.10
        };
    }
    
    const conflictPairs = [
        ['person_01', 'person_05'],
        ['person_02', 'person_08'],
        ['person_10', 'person_15'],
        ['person_12', 'person_20'],
        ['person_25', 'person_30'],
        ['person_31', 'person_35'],
        ['person_38', 'person_40'],
        ['person_05', 'person_10']
    ];
    
    const mismatchNodes = Array.from({ length: 12 }, (_, i) => 
        `person_${String(i + 5).padStart(2, '0')}`
    );
    
    const report = calculator.calculateFromSimpleData(nodeStates, conflictPairs, mismatchNodes);
    
    console.log(`  총 노드: ${report.totalNodes}`);
    console.log(`  총 엔트로피: ${report.totalEntropy.toFixed(2)}`);
    console.log(`  레벨: ${report.entropyLevel}`);
    console.log(`\n  구성요소:`);
    console.log(`    Shannon: ${report.components.shannonEntropy.toFixed(3)}`);
    console.log(`    갈등: ${report.components.conflictPenalty.toFixed(3)} (${report.conflictCount}개)`);
    console.log(`    미스매치: ${report.components.mismatchPenalty.toFixed(3)} (${report.mismatchCount}명)`);
    console.log(`    이탈: ${report.components.churnPenalty.toFixed(3)} (${report.churnRiskCount}명)`);
    console.log(`    고립: ${report.components.isolationPenalty.toFixed(3)} (${report.isolatedCount}명)`);
    
    console.log(`\n  권장 사항:`);
    report.recommendations.forEach(rec => console.log(`    ${rec}`));
    
    // 4. 돈 생산 효율
    console.log('\n[4. 돈 생산 효율]');
    const efficiency = calculator.calculateMoneyProductionEfficiency(report.totalEntropy);
    console.log(`  현재 효율: ${(efficiency * 100).toFixed(1)}%`);
    console.log(`  손실: ${((1 - efficiency) * 100).toFixed(1)}%`);
    
    // 5. 개선 시뮬레이션
    console.log('\n[5. 개선 시뮬레이션]');
    const actions = [
        { type: 'resolve_conflict', count: 8 },
        { type: 'fix_mismatch', count: 12 }
    ];
    
    const { reduction, expectedEntropy } = calculator.simulateEntropyReduction(report, actions);
    console.log(`  갈등 8개 해소 + 미스매치 12개 수정`);
    console.log(`  예상 감소: ${reduction.toFixed(2)}`);
    console.log(`  예상 최종 엔트로피: ${expectedEntropy.toFixed(2)}`);
    
    const newEfficiency = calculator.calculateMoneyProductionEfficiency(expectedEntropy);
    console.log(`  예상 효율: ${(newEfficiency * 100).toFixed(1)}%`);
    
    // 6. 시각화
    console.log('\n[6. 시각화]');
    console.log(`  게이지: ${EntropyVisualizer.generateGauge(report.totalEntropy)}`);
    console.log(EntropyVisualizer.generateComponentBreakdown(report.components));
    console.log(EntropyVisualizer.generateEfficiencyMeter(report.totalEntropy));
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Entropy Calculator Test Complete');
    
    return { calculator, report, efficiency };
}

export default AutusEntropyCalculator;
