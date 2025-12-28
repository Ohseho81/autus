// ================================================================
// SYSTEM AUTOPILOT (Global Optimization)
// 자동 시스템 최적화 엔진
// 
// Features:
// 1. Entropy Manager - 엔트로피 관리
// 2. Resource Load Balancer - 자원 부하 분산
// 3. Feedback Loop Stabilization - 피드백 루프 안정화
//
// Version: 2.0.0
// ================================================================

import { AnalysisEngine, SensorType, AlertSeverity } from './AnalysisEngine.js';

// ================================================================
// 1. ENTROPY MANAGER
// ================================================================

export const EntropyManager = {
    /**
     * GlobalEntropySweep: 고위험 노드 클러스터 식별
     */
    globalEntropySweep(nodes) {
        const clusters = {
            critical: [],    // σ > 0.8
            warning: [],     // σ > 0.6
            stable: [],      // σ > 0.4
            optimal: []      // σ <= 0.4
        };
        
        nodes.forEach(node => {
            const sigma = node.sigma || node.entropy || 0;
            
            if (sigma > 0.8) {
                clusters.critical.push(node);
            } else if (sigma > 0.6) {
                clusters.warning.push(node);
            } else if (sigma > 0.4) {
                clusters.stable.push(node);
            } else {
                clusters.optimal.push(node);
            }
        });
        
        return {
            clusters,
            riskScore: this.calculateRiskScore(clusters),
            recommendations: this.generateStabilityRecommendations(clusters)
        };
    },
    
    /**
     * 위험 점수 계산
     */
    calculateRiskScore(clusters) {
        const weights = { critical: 4, warning: 2, stable: 1, optimal: 0 };
        const totalNodes = Object.values(clusters).reduce((s, c) => s + c.length, 0);
        
        if (totalNodes === 0) return 0;
        
        let weightedSum = 0;
        Object.entries(clusters).forEach(([level, nodes]) => {
            weightedSum += nodes.length * weights[level];
        });
        
        return Math.min(weightedSum / (totalNodes * 4), 1);
    },
    
    /**
     * 안정화 권장사항 생성
     */
    generateStabilityRecommendations(clusters) {
        const recommendations = [];
        
        if (clusters.critical.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                action: 'IMMEDIATE_INTERVENTION',
                targets: clusters.critical.map(n => n.id),
                message: `${clusters.critical.length}개 노드 즉시 안정화 필요`
            });
        }
        
        if (clusters.warning.length > 3) {
            recommendations.push({
                priority: 'HIGH',
                action: 'RESOURCE_REDISTRIBUTION',
                targets: clusters.warning.map(n => n.id),
                message: '자원 재분배로 경고 수준 노드 안정화'
            });
        }
        
        return recommendations;
    },
    
    /**
     * 자동 Stability Report 생성
     */
    generateStabilityReport(nodes) {
        const sweep = this.globalEntropySweep(nodes);
        
        return {
            timestamp: Date.now(),
            totalNodes: nodes.length,
            distribution: {
                critical: sweep.clusters.critical.length,
                warning: sweep.clusters.warning.length,
                stable: sweep.clusters.stable.length,
                optimal: sweep.clusters.optimal.length
            },
            overallRisk: sweep.riskScore,
            status: sweep.riskScore > 0.6 ? 'UNSTABLE' : sweep.riskScore > 0.3 ? 'MODERATE' : 'STABLE',
            recommendations: sweep.recommendations,
            autoActions: this.determineAutoActions(sweep)
        };
    },
    
    /**
     * 자동 액션 결정
     */
    determineAutoActions(sweep) {
        const actions = [];
        
        sweep.clusters.critical.forEach(node => {
            actions.push({
                type: 'EMERGENCY_STABILIZATION',
                nodeId: node.id,
                action: 'Apply constraint tightening',
                autoDeploy: true
            });
        });
        
        return actions;
    }
};

// ================================================================
// 2. RESOURCE LOAD BALANCER
// ================================================================

export const ResourceLoadBalancer = {
    /**
     * BalanceHumanEnergy: 사용자 에너지 기반 자동 모드 전환
     */
    balanceHumanEnergy(bioData) {
        const stressLevel = bioData.stress?.level || 0;
        const energyLevel = bioData.energy?.level || 0.5;
        
        const result = {
            bioStress: stressLevel,
            energyLevel,
            mode: 'NORMAL',
            automationRatio: 0.3,
            recommendations: []
        };
        
        // Bio-Stress 높으면 AI-Automation Mode로 전환
        if (stressLevel > 0.7) {
            result.mode = 'AI_AUTOMATION';
            result.automationRatio = 0.7;  // 70% 자동화
            result.recommendations.push({
                type: 'MODE_SWITCH',
                action: '70% 커뮤니케이션 AI-Automation Mode 전환',
                reason: '높은 스트레스 감지'
            });
        } else if (stressLevel > 0.5) {
            result.mode = 'ASSISTED';
            result.automationRatio = 0.5;
            result.recommendations.push({
                type: 'MODE_ADJUST',
                action: '50% 자동화 지원 모드',
                reason: '중간 수준 스트레스'
            });
        }
        
        // 에너지 낮으면 추가 조치
        if (energyLevel < 0.3) {
            result.recommendations.push({
                type: 'ENERGY_RECOVERY',
                action: '비필수 알림 비활성화',
                reason: '낮은 에너지 레벨'
            });
        }
        
        return result;
    },
    
    /**
     * 작업 부하 분산
     */
    distributeTaskLoad(tasks, availableResources) {
        const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority);
        const distribution = [];
        let remainingCapacity = availableResources.totalCapacity;
        
        sortedTasks.forEach(task => {
            const taskLoad = task.estimatedLoad || 0.1;
            
            if (remainingCapacity >= taskLoad) {
                distribution.push({
                    taskId: task.id,
                    status: 'ASSIGNED',
                    resourceAllocation: taskLoad
                });
                remainingCapacity -= taskLoad;
            } else if (remainingCapacity > 0) {
                distribution.push({
                    taskId: task.id,
                    status: 'PARTIAL',
                    resourceAllocation: remainingCapacity,
                    overflow: taskLoad - remainingCapacity
                });
                remainingCapacity = 0;
            } else {
                distribution.push({
                    taskId: task.id,
                    status: 'QUEUED',
                    resourceAllocation: 0
                });
            }
        });
        
        return {
            distribution,
            utilizationRate: (availableResources.totalCapacity - remainingCapacity) / availableResources.totalCapacity,
            queuedCount: distribution.filter(d => d.status === 'QUEUED').length
        };
    }
};

// ================================================================
// 3. FEEDBACK LOOP STABILIZATION
// ================================================================

export const FeedbackLoopStabilizer = {
    // 중력 상수 (인센티브/가격/이벤트)
    gravitationalConstant: 1.0,
    targetStableRatio: 0.90,  // 90% 안정 궤도 목표
    
    /**
     * Reaction Rate 모니터링 및 중력 상수 자동 조정
     */
    monitorAndAdjust(nodes) {
        const analysis = this.analyzeOrbitStatus(nodes);
        const adjustment = this.calculateGravityAdjustment(analysis);
        
        if (adjustment !== 0) {
            this.gravitationalConstant = Math.max(0.5, Math.min(2.0, 
                this.gravitationalConstant + adjustment
            ));
        }
        
        return {
            currentGravity: this.gravitationalConstant,
            orbitAnalysis: analysis,
            adjustment,
            recommendations: this.generateAdjustmentRecommendations(analysis)
        };
    },
    
    /**
     * 궤도 상태 분석
     */
    analyzeOrbitStatus(nodes) {
        const orbits = {
            stable: 0,      // 안정 궤도
            decaying: 0,    // 감쇠 궤도
            escaping: 0,    // 이탈 궤도
            incoming: 0     // 접근 궤도
        };
        
        nodes.forEach(node => {
            const velocity = node.velocity || 0;
            const distance = node.distanceToCore || 1;
            const escapeVelocity = Math.sqrt(2 * this.gravitationalConstant / distance);
            
            if (Math.abs(velocity) < escapeVelocity * 0.5) {
                orbits.stable++;
            } else if (velocity < 0) {
                orbits.incoming++;
            } else if (velocity > escapeVelocity) {
                orbits.escaping++;
            } else {
                orbits.decaying++;
            }
        });
        
        const total = nodes.length || 1;
        
        return {
            distribution: orbits,
            stableRatio: orbits.stable / total,
            escapingRatio: orbits.escaping / total,
            reactionRate: (orbits.stable + orbits.incoming) / total
        };
    },
    
    /**
     * 중력 상수 조정량 계산
     */
    calculateGravityAdjustment(analysis) {
        const gap = this.targetStableRatio - analysis.stableRatio;
        
        // PID-like 조정
        if (gap > 0.1) {
            // 안정 노드가 부족 → 중력 증가 (인센티브↑)
            return 0.1;
        } else if (gap < -0.1) {
            // 안정 노드 초과 → 중력 감소 (비용↓)
            return -0.05;
        }
        
        return 0;
    },
    
    /**
     * 조정 권장사항 생성
     */
    generateAdjustmentRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.escapingRatio > 0.1) {
            recommendations.push({
                type: 'RETENTION_BOOST',
                action: '리텐션 인센티브 강화',
                magnitude: 'HIGH',
                reason: `${(analysis.escapingRatio * 100).toFixed(1)}% 노드 이탈 위험`
            });
        }
        
        if (analysis.reactionRate < 0.7) {
            recommendations.push({
                type: 'ENGAGEMENT_EVENT',
                action: '참여 이벤트 실행',
                magnitude: 'MEDIUM',
                reason: '반응률 저하'
            });
        }
        
        return recommendations;
    }
};

// ================================================================
// INTEGRATED SYSTEM AUTOPILOT
// ================================================================

export const SystemAutopilot = {
    entropy: EntropyManager,
    loadBalancer: ResourceLoadBalancer,
    feedbackLoop: FeedbackLoopStabilizer,
    
    isRunning: false,
    interval: null,
    
    /**
     * 자동 최적화 시작
     */
    start(intervalMs = 30000) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('[SystemAutopilot] 자동 최적화 시작');
        
        this.interval = setInterval(() => {
            this.runOptimizationCycle();
        }, intervalMs);
        
        // 즉시 한 번 실행
        this.runOptimizationCycle();
    },
    
    /**
     * 자동 최적화 중지
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('[SystemAutopilot] 자동 최적화 중지');
    },
    
    /**
     * 최적화 사이클 실행
     */
    runOptimizationCycle(nodes = [], bioData = {}) {
        const results = {
            timestamp: Date.now(),
            entropyReport: null,
            loadBalance: null,
            feedbackAdjustment: null,
            autoActions: []
        };
        
        // 1. Entropy Sweep
        if (nodes.length > 0) {
            results.entropyReport = this.entropy.generateStabilityReport(nodes);
            results.autoActions.push(...results.entropyReport.autoActions);
        }
        
        // 2. Load Balancing
        results.loadBalance = this.loadBalancer.balanceHumanEnergy(bioData);
        
        // 3. Feedback Loop Adjustment
        if (nodes.length > 0) {
            results.feedbackAdjustment = this.feedbackLoop.monitorAndAdjust(nodes);
        }
        
        return results;
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            running: this.isRunning,
            gravitationalConstant: this.feedbackLoop.gravitationalConstant,
            targetStableRatio: this.feedbackLoop.targetStableRatio
        };
    }
};

// ================================================================
// TEST
// ================================================================

export function testSystemAutopilot() {
    console.log('='.repeat(60));
    console.log('System Autopilot Test');
    console.log('='.repeat(60));
    
    // 테스트 노드 생성
    const testNodes = [
        { id: 'N1', sigma: 0.9, velocity: 0.5, distanceToCore: 1 },  // Critical
        { id: 'N2', sigma: 0.7, velocity: 0.3, distanceToCore: 2 },  // Warning
        { id: 'N3', sigma: 0.3, velocity: 0.1, distanceToCore: 1.5 }, // Optimal
        { id: 'N4', sigma: 0.5, velocity: -0.2, distanceToCore: 1 },  // Stable
        { id: 'N5', sigma: 0.85, velocity: 1.5, distanceToCore: 3 }   // Critical + Escaping
    ];
    
    const testBioData = {
        stress: { level: 0.75 },
        energy: { level: 0.4 }
    };
    
    // 최적화 사이클 실행
    const result = SystemAutopilot.runOptimizationCycle(testNodes, testBioData);
    
    console.log('\n[Entropy Report]');
    console.log('  Status:', result.entropyReport?.status);
    console.log('  Risk Score:', result.entropyReport?.overallRisk?.toFixed(2));
    console.log('  Distribution:', result.entropyReport?.distribution);
    
    console.log('\n[Load Balance]');
    console.log('  Mode:', result.loadBalance?.mode);
    console.log('  Automation Ratio:', (result.loadBalance?.automationRatio * 100) + '%');
    console.log('  Recommendations:', result.loadBalance?.recommendations);
    
    console.log('\n[Feedback Loop]');
    console.log('  Gravity Constant:', result.feedbackAdjustment?.currentGravity?.toFixed(2));
    console.log('  Stable Ratio:', (result.feedbackAdjustment?.orbitAnalysis?.stableRatio * 100)?.toFixed(1) + '%');
    console.log('  Adjustment:', result.feedbackAdjustment?.adjustment);
    
    console.log('\n[Auto Actions]');
    result.autoActions.forEach(a => console.log('  •', a.type, '-', a.nodeId));
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ System Autopilot Test Complete');
    
    return result;
}

export default SystemAutopilot;




