/**
 * AUTUS Monte Carlo Engine (JavaScript)
 * ======================================
 * 
 * 프론트엔드용 Monte Carlo 시너지 엔진
 * 
 * Features:
 * - Power Iteration PPR
 * - 시너지 스코어 계산
 * - 골든 볼륨 / 엔트로피 노드 분류
 * - 액션 카드 생성
 * - 수익 예측
 * 
 * Version: 2.0.0
 */

// ================================================================
// CONSTANTS
// ================================================================

export const MC_CONFIG = {
    // PPR 설정
    ALPHA: 0.85,              // 텔레포트 확률
    MAX_ITERATIONS: 50,       // 최대 반복
    TOLERANCE: 1e-6,          // 수렴 허용치
    
    // 시너지 임계값
    GOLDEN_THRESHOLD: 0.8,
    ENTROPY_THRESHOLD: -0.3,
    
    // 수익 정규화
    MAX_REVENUE: 5_000_000,
    
    // 수익 예측
    SYNERGY_COMPOUND_RATE: 0.15,
    NN_THRESHOLD: 5,
    NN_MULTIPLIER: 1.5
};

export const GRADE_MAP = {
    CORE: { min: 0.9, label: '중력 핵', color: '#FFD700' },
    GOLDEN: { min: 0.8, label: '골든', color: '#FFA500' },
    ACCELERATOR: { min: 0.6, label: '가속기', color: '#90EE90' },
    STABLE: { min: 0.3, label: '안정', color: '#87CEEB' },
    NEUTRAL: { min: 0, label: '중립', color: '#D3D3D3' },
    FRICTION: { min: -0.3, label: '마찰', color: '#FFB6C1' },
    DRAIN: { min: -0.7, label: '드레인', color: '#FF6347' },
    BLACKHOLE: { min: -1, label: '블랙홀', color: '#8B0000' }
};

export const ACTION_MAP = {
    AMPLIFY: { threshold: 0.8, label: '증폭', icon: '🚀' },
    BOOST: { threshold: 0.6, label: '부스트', icon: '⚡' },
    MAINTAIN: { threshold: 0.3, label: '유지', icon: '✅' },
    OBSERVE: { threshold: 0, label: '관찰', icon: '👀' },
    REDUCE: { threshold: -0.3, label: '축소', icon: '⬇️' },
    DELAY: { threshold: -0.7, label: '지연', icon: '⏸️' },
    EJECT: { threshold: -1, label: '이탈', icon: '🚫' }
};

// ================================================================
// MONTE CARLO ENGINE
// ================================================================

export const MonteCarloEngine = {
    // 노드 데이터
    nodeIds: [],
    nodeNames: [],
    nodeRevenues: [],
    nodeTimes: [],
    idToIdx: {},
    
    // 행렬
    adjMatrix: null,
    transitionMatrix: null,
    
    // 캐시
    pprCache: {},
    
    /**
     * 초기화
     */
    init() {
        this.nodeIds = [];
        this.nodeNames = [];
        this.nodeRevenues = [];
        this.nodeTimes = [];
        this.idToIdx = {};
        this.adjMatrix = null;
        this.transitionMatrix = null;
        this.pprCache = {};
        
        console.log('🎲 MonteCarloEngine initialized');
        return this;
    },
    
    /**
     * 노드 로드
     */
    loadNodes(nodes) {
        const n = nodes.length;
        
        this.nodeIds = nodes.map(n => n.id);
        this.nodeNames = nodes.map(n => n.name);
        this.nodeRevenues = nodes.map(n => n.revenue || 0);
        this.nodeTimes = nodes.map(n => n.timeSpent || n.time_spent || 0);
        
        this.idToIdx = {};
        this.nodeIds.forEach((id, idx) => {
            this.idToIdx[id] = idx;
        });
        
        // 인접 행렬 초기화
        this.adjMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
        
        console.log(`  Nodes loaded: ${n}`);
        return this;
    },
    
    /**
     * 엣지 추가
     */
    addEdge(source, target, weight = 1.0) {
        if (source in this.idToIdx && target in this.idToIdx) {
            const i = this.idToIdx[source];
            const j = this.idToIdx[target];
            this.adjMatrix[i][j] = weight;
        }
    },
    
    /**
     * 엣지 일괄 추가
     */
    addEdgesBatch(edges) {
        edges.forEach(({ source, target, weight = 1.0 }) => {
            this.addEdge(source, target, weight);
            this.addEdge(target, source, weight);  // 양방향
        });
        
        console.log(`  Edges added: ${edges.length * 2}`);
        return this;
    },
    
    /**
     * 전이 행렬 구축
     */
    buildTransitionMatrix() {
        const n = this.nodeIds.length;
        this.transitionMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            const rowSum = this.adjMatrix[i].reduce((a, b) => a + b, 0);
            
            for (let j = 0; j < n; j++) {
                this.transitionMatrix[i][j] = rowSum > 0 
                    ? this.adjMatrix[i][j] / rowSum 
                    : 0;
            }
        }
        
        return this;
    },
    
    /**
     * Power Iteration PPR
     */
    computePPR(seedIdx, alpha = MC_CONFIG.ALPHA, maxIter = MC_CONFIG.MAX_ITERATIONS, tol = MC_CONFIG.TOLERANCE) {
        const n = this.nodeIds.length;
        
        if (!this.transitionMatrix) {
            this.buildTransitionMatrix();
        }
        
        // 초기 벡터
        let ppr = Array(n).fill(0);
        ppr[seedIdx] = 1.0;
        
        // 텔레포트 벡터
        const teleport = Array(n).fill(0);
        teleport[seedIdx] = 1.0;
        
        // Power iteration
        for (let iter = 0; iter < maxIter; iter++) {
            const newPpr = Array(n).fill(0);
            
            // 텔레포트 + 전이
            for (let i = 0; i < n; i++) {
                newPpr[i] = (1 - alpha) * teleport[i];
                
                for (let j = 0; j < n; j++) {
                    newPpr[i] += alpha * this.transitionMatrix[j][i] * ppr[j];
                }
            }
            
            // 수렴 체크
            let diff = 0;
            for (let i = 0; i < n; i++) {
                diff += Math.abs(newPpr[i] - ppr[i]);
            }
            
            ppr = newPpr;
            
            if (diff < tol) {
                break;
            }
        }
        
        return ppr;
    },
    
    /**
     * PPR → 시너지 변환
     */
    pprToSynergy(pprScores, seedIdx) {
        const n = pprScores.length;
        
        // 로그 스케일
        const logScores = pprScores.map(p => Math.log(p + 1e-10));
        
        // Min-Max (시드 제외)
        const validScores = logScores.filter((_, i) => i !== seedIdx);
        const minVal = Math.min(...validScores);
        const maxVal = Math.max(...validScores);
        const rangeVal = maxVal > minVal ? maxVal - minVal : 1;
        
        // 정규화 → -1 ~ +1
        const synergy = logScores.map((score, i) => {
            if (i === seedIdx) return 0;
            
            const normalized = (score - minVal) / rangeVal;
            let z = (normalized * 2) - 1;
            
            // 수익 보정
            const revenueFactor = Math.min(0.2, Math.max(-0.2, 
                this.nodeRevenues[i] / MC_CONFIG.MAX_REVENUE
            ));
            
            // 시간 효율 보정
            const efficiency = this.nodeRevenues[i] / (this.nodeTimes[i] * 10000 + 1);
            const timeFactor = Math.min(0.1, Math.max(-0.1, efficiency - 0.5));
            
            z = z + revenueFactor + timeFactor;
            return Math.min(1, Math.max(-1, z));
        });
        
        return synergy;
    },
    
    /**
     * 등급 결정
     */
    getGrade(synergy) {
        if (synergy >= 0.9) return 'CORE';
        if (synergy >= 0.8) return 'GOLDEN';
        if (synergy >= 0.6) return 'ACCELERATOR';
        if (synergy >= 0.3) return 'STABLE';
        if (synergy >= 0) return 'NEUTRAL';
        if (synergy >= -0.3) return 'FRICTION';
        if (synergy >= -0.7) return 'DRAIN';
        return 'BLACKHOLE';
    },
    
    /**
     * 액션 결정
     */
    getAction(synergy) {
        if (synergy >= 0.8) return 'AMPLIFY';
        if (synergy >= 0.6) return 'BOOST';
        if (synergy >= 0.3) return 'MAINTAIN';
        if (synergy >= 0) return 'OBSERVE';
        if (synergy >= -0.3) return 'REDUCE';
        if (synergy >= -0.7) return 'DELAY';
        return 'EJECT';
    },
    
    /**
     * 전체 분석 실행
     */
    runAnalysis(seedId) {
        const startTime = performance.now();
        
        if (!(seedId in this.idToIdx)) {
            return { error: `Seed node ${seedId} not found` };
        }
        
        const seedIdx = this.idToIdx[seedId];
        const n = this.nodeIds.length;
        
        // PPR 계산
        const pprScores = this.computePPR(seedIdx);
        
        // 시너지 변환
        const synergyScores = this.pprToSynergy(pprScores, seedIdx);
        
        // 인덱스 정렬
        const indices = [...Array(n).keys()];
        indices.sort((a, b) => synergyScores[b] - synergyScores[a]);
        
        // 골든 볼륨
        const top20Count = Math.max(1, Math.floor(n / 5));
        const goldenIndices = indices
            .slice(0, top20Count)
            .filter(i => synergyScores[i] >= MC_CONFIG.GOLDEN_THRESHOLD && i !== seedIdx);
        
        // 엔트로피 노드
        const bottom10Count = Math.max(1, Math.floor(n / 10));
        const entropyIndices = indices
            .slice(-bottom10Count)
            .filter(i => synergyScores[i] < MC_CONFIG.ENTROPY_THRESHOLD && i !== seedIdx);
        
        // 시스템 메트릭
        const conflictCount = synergyScores.filter(s => s < -0.3).length;
        const frictionCount = synergyScores.filter(s => s >= -0.3 && s < 0).length;
        
        const W = (conflictCount + 1) * (frictionCount + 1);
        const systemEntropy = Math.log(Math.max(1, W));
        const efficiency = Math.exp(-systemEntropy / 5);
        
        const executionTime = performance.now() - startTime;
        
        return {
            meta: {
                seed: seedId,
                totalNodes: n,
                executionTimeMs: Math.round(executionTime * 100) / 100,
                method: 'power_iteration'
            },
            goldenVolume: goldenIndices.slice(0, 10).map((i, rank) => ({
                rank: rank + 1,
                id: this.nodeIds[i],
                name: this.nodeNames[i],
                synergy: Math.round(synergyScores[i] * 10000) / 10000,
                ppr: Math.round(pprScores[i] * 1000000) / 1000000,
                revenue: this.nodeRevenues[i],
                grade: this.getGrade(synergyScores[i])
            })),
            entropyNodes: entropyIndices.slice(0, 5).map((i, rank) => ({
                rank: rank + 1,
                id: this.nodeIds[i],
                name: this.nodeNames[i],
                synergy: Math.round(synergyScores[i] * 10000) / 10000,
                grade: this.getGrade(synergyScores[i])
            })),
            top5: indices
                .filter(i => i !== seedIdx)
                .slice(0, 5)
                .map((i, rank) => ({
                    rank: rank + 1,
                    id: this.nodeIds[i],
                    name: this.nodeNames[i],
                    synergy: Math.round(synergyScores[i] * 10000) / 10000,
                    action: this.getAction(synergyScores[i])
                })),
            bottom5: indices
                .filter(i => i !== seedIdx)
                .slice(-5)
                .reverse()
                .map((i, rank) => ({
                    rank: rank + 1,
                    id: this.nodeIds[i],
                    name: this.nodeNames[i],
                    synergy: Math.round(synergyScores[i] * 10000) / 10000,
                    action: this.getAction(synergyScores[i])
                })),
            system: {
                entropy: Math.round(systemEntropy * 1000) / 1000,
                efficiency: Math.round(efficiency * 1000) / 1000,
                goldenCount: goldenIndices.length,
                entropyCount: entropyIndices.length
            },
            zValues: Object.fromEntries(
                this.nodeIds
                    .map((id, i) => [id, Math.round(synergyScores[i] * 10000) / 10000])
                    .filter(([_, v], i) => i !== seedIdx)
            )
        };
    },
    
    /**
     * 액션 카드 생성
     */
    getActionCards(seedId, limit = 10) {
        const result = this.runAnalysis(seedId);
        
        if (result.error) return [];
        
        const cards = [];
        
        // 골든 → 증폭/부스트
        result.goldenVolume.slice(0, 5).forEach(node => {
            cards.push({
                id: `card_${node.id}`,
                type: node.synergy >= 0.9 ? 'AMPLIFY' : 'BOOST',
                targetId: node.id,
                targetName: node.name,
                priority: node.synergy >= 0.9 ? 1 : 2,
                synergy: node.synergy,
                reason: `시너지 ${node.synergy.toFixed(2)} - ${node.synergy >= 0.9 ? '중력 핵' : '골든 볼륨'}`,
                message: this._generateMessage(node, 'amplify')
            });
        });
        
        // 엔트로피 → 축소/이탈
        result.entropyNodes.slice(0, 3).forEach(node => {
            const action = node.synergy < -0.7 ? 'EJECT' : 'REDUCE';
            cards.push({
                id: `card_${node.id}`,
                type: action,
                targetId: node.id,
                targetName: node.name,
                priority: action === 'REDUCE' ? 7 : 8,
                synergy: node.synergy,
                reason: `시너지 ${node.synergy.toFixed(2)} - ${node.synergy < -0.7 ? '블랙홀' : '에너지 드레인'}`,
                message: this._generateMessage(node, action.toLowerCase())
            });
        });
        
        cards.sort((a, b) => a.priority - b.priority);
        return cards.slice(0, limit);
    },
    
    /**
     * 메시지 생성
     */
    _generateMessage(node, actionType) {
        const name = node.name;
        
        switch (actionType) {
            case 'amplify':
                return `${name}님, 우리의 시너지가 정점에 도달했습니다. 다음 단계의 공동 프로젝트를 제안드립니다.`;
            case 'boost':
                return `${name}님, 최근 협력의 밀도가 매우 높습니다. 주간 체크인을 정례화하면 어떨까요?`;
            case 'reduce':
                return `${name}님, 현재 핵심 프로젝트에 집중하고 있어 당분간 새로운 논의는 어렵습니다.`;
            case 'eject':
                return `확인했습니다. 참여가 어렵습니다.`;
            default:
                return '';
        }
    },
    
    /**
     * 수익 예측 (간단 버전)
     */
    projectRevenue(seedId, months = 1) {
        const result = this.runAnalysis(seedId);
        
        if (result.error) return result;
        
        const goldenNodes = result.goldenVolume;
        
        if (!goldenNodes.length) {
            return { error: '골든 볼륨이 비어있습니다.' };
        }
        
        // 기본 가치
        const baseValue = goldenNodes
            .map(n => n.revenue)
            .filter(r => r > 0)
            .reduce((a, b) => a + b, 0);
        
        // 평균 시너지
        const avgSynergy = goldenNodes
            .map(n => n.synergy)
            .reduce((a, b) => a + b, 0) / goldenNodes.length;
        
        // 시너지 복리
        const synergyRate = MC_CONFIG.SYNERGY_COMPOUND_RATE * (1 + avgSynergy);
        const projectedValue = baseValue * Math.pow(1 + synergyRate, months);
        
        // n^n 승수
        let nnMultiplier = 1.0;
        if (goldenNodes.length >= MC_CONFIG.NN_THRESHOLD) {
            const n = goldenNodes.length;
            nnMultiplier = MC_CONFIG.NN_MULTIPLIER + Math.log(Math.pow(n, n)) / 10 + avgSynergy * 0.5;
        }
        
        const finalValue = projectedValue * nnMultiplier;
        
        return {
            period: `${months}개월`,
            baseValue,
            projectedValue: Math.round(finalValue),
            growthRate: `${((finalValue / baseValue - 1) * 100).toFixed(1)}%`,
            nnMultiplier: Math.round(nnMultiplier * 100) / 100,
            avgSynergy: Math.round(avgSynergy * 1000) / 1000,
            goldenCount: goldenNodes.length
        };
    }
};

// ================================================================
// TEST
// ================================================================

export function testMonteCarloEngine() {
    console.log('=' .repeat(60));
    console.log('Monte Carlo Engine Test');
    console.log('=' .repeat(60));
    
    const engine = MonteCarloEngine;
    engine.init();
    
    // 샘플 노드 생성
    const n = 50;
    const nodes = [];
    
    for (let i = 0; i < n; i++) {
        nodes.push({
            id: `node_${String(i).padStart(3, '0')}`,
            name: `Person_${i}`,
            revenue: Math.floor(Math.random() * 5500000) - 500000,
            timeSpent: Math.floor(Math.random() * 170) + 10
        });
    }
    
    engine.loadNodes(nodes);
    
    // 엣지 생성
    const edges = [];
    for (let i = 0; i < 100; i++) {
        const a = Math.floor(Math.random() * n);
        const b = Math.floor(Math.random() * n);
        if (a !== b) {
            edges.push({
                source: nodes[a].id,
                target: nodes[b].id,
                weight: Math.random() * 1.5 + 0.5
            });
        }
    }
    
    engine.addEdgesBatch(edges);
    engine.buildTransitionMatrix();
    
    // 분석 실행
    console.log('\n[1. Analysis]');
    const result = engine.runAnalysis('node_000');
    
    console.log(`  Execution Time: ${result.meta.executionTimeMs}ms`);
    console.log(`  Golden Volume: ${result.system.goldenCount}`);
    console.log(`  Entropy Nodes: ${result.system.entropyCount}`);
    
    console.log('\n[2. Top 5]');
    result.top5.forEach(node => {
        console.log(`  #${node.rank} ${node.name}: z=${node.synergy.toFixed(3)} → ${node.action}`);
    });
    
    console.log('\n[3. System]');
    console.log(`  Entropy: ${result.system.entropy}`);
    console.log(`  Efficiency: ${(result.system.efficiency * 100).toFixed(1)}%`);
    
    console.log('\n[4. Revenue Projection (3 months)]');
    const projection = engine.projectRevenue('node_000', 3);
    console.log(`  Base: ₩${projection.baseValue?.toLocaleString() || 0}`);
    console.log(`  Projected: ₩${projection.projectedValue?.toLocaleString() || 0}`);
    console.log(`  Growth: ${projection.growthRate}`);
    
    console.log('\n[5. Action Cards]');
    const cards = engine.getActionCards('node_000', 3);
    cards.forEach(card => {
        console.log(`  [${card.type}] ${card.targetName}: ${card.reason.slice(0, 30)}...`);
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Monte Carlo Engine Test Complete');
    
    return engine;
}

export default MonteCarloEngine;
