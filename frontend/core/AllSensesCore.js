// ================================================================
// AUTUS ALL-SENSES INTELLIGENCE CORE
// Mission Critical: Unified Sensor Intelligence
// ================================================================

import { CorePhysicsKernel } from './CorePhysicsKernel.js';
import { EightSensors } from './sensors/EightSensors.js';
import { ResourceManager } from './ResourceManager.js';
import { SecurePurge } from './security/SecurePurge.js';
import { ProactiveSuggestion } from './ProactiveSuggestion.js';

// ================================================================
// PHYSICS MAP CONNECTOR
// ================================================================

const PhysicsMapConnector = {
    physicsMap: null,
    
    /**
     * Connect to PhysicsMap visualization
     */
    connect: async function() {
        try {
            const { PhysicsMap } = await import('../engine/PhysicsMap.js');
            this.physicsMap = PhysicsMap;
            console.log('[PhysicsMapConnector] Connected');
            return true;
        } catch (err) {
            console.warn('[PhysicsMapConnector] PhysicsMap not available');
            return false;
        }
    },
    
    /**
     * Map sensor vectors to physics map
     */
    mapVectors: function(sensorFeatures) {
        if (!this.physicsMap) return null;
        
        const vectors = [];
        
        // Screen sensor -> 집중도 벡터
        if (sensorFeatures.screen) {
            vectors.push({
                type: 'focus',
                value: sensorFeatures.screen.textConfidence || 0.5,
                source: 'screen'
            });
        }
        
        // Voice sensor -> 커뮤니케이션 벡터
        if (sensorFeatures.voice) {
            vectors.push({
                type: 'communication',
                value: sensorFeatures.voice.confidence || 0,
                energy: sensorFeatures.voice.voiceEnergy || 0,
                source: 'voice'
            });
        }
        
        // Video sensor -> 주의력 벡터
        if (sensorFeatures.video) {
            vectors.push({
                type: 'attention',
                value: sensorFeatures.video.attention?.score || 0,
                faceDetected: sensorFeatures.video.faceDetected,
                source: 'video'
            });
        }
        
        // Log sensor -> 활동 벡터
        if (sensorFeatures.log) {
            vectors.push({
                type: 'activity',
                value: Math.min(sensorFeatures.log.activityRate / 100, 1),
                dominant: sensorFeatures.log.dominantActivity,
                source: 'log'
            });
        }
        
        // Link sensor -> 연결 벡터
        if (sensorFeatures.link) {
            vectors.push({
                type: 'connection',
                value: sensorFeatures.link.density || 0,
                nodeCount: sensorFeatures.link.nodeCount,
                source: 'link'
            });
        }
        
        // Bio sensor -> 웰빙 벡터
        if (sensorFeatures.bio) {
            vectors.push({
                type: 'wellness',
                value: 1 - (sensorFeatures.bio.estimatedStress?.score || 0),
                energy: sensorFeatures.bio.energyLevel?.score || 0.5,
                source: 'bio'
            });
        }
        
        // Context sensor -> 환경 벡터
        if (sensorFeatures.context) {
            vectors.push({
                type: 'context',
                period: sensorFeatures.context.timeContext?.period,
                isOptimal: this.isOptimalTime(sensorFeatures.context),
                source: 'context'
            });
        }
        
        // Intuition sensor -> 예측 벡터
        if (sensorFeatures.intuition) {
            vectors.push({
                type: 'prediction',
                confidence: sensorFeatures.intuition.confidence || 0,
                nextAction: sensorFeatures.intuition.prediction?.nextAction,
                source: 'intuition'
            });
        }
        
        return {
            vectors,
            timestamp: Date.now(),
            aggregatedEnergy: this.calculateAggregatedEnergy(vectors)
        };
    },
    
    /**
     * Check if current time is optimal
     */
    isOptimalTime: function(context) {
        const period = context.timeContext?.period;
        return period === 'morning' || period === 'afternoon';
    },
    
    /**
     * Calculate aggregated energy from vectors
     */
    calculateAggregatedEnergy: function(vectors) {
        const weights = {
            focus: 0.15,
            communication: 0.1,
            attention: 0.2,
            activity: 0.2,
            connection: 0.1,
            wellness: 0.15,
            context: 0.05,
            prediction: 0.05
        };
        
        let totalEnergy = 0;
        let totalWeight = 0;
        
        vectors.forEach(v => {
            const weight = weights[v.type] || 0.1;
            totalEnergy += (v.value || 0) * weight;
            totalWeight += weight;
        });
        
        return totalWeight > 0 ? totalEnergy / totalWeight : 0.5;
    },
    
    /**
     * Update physics map with vectors
     */
    updateMap: function(vectors) {
        if (!this.physicsMap) return;
        
        const userNode = this.physicsMap.getUserNode();
        if (!userNode) return;
        
        // 에너지 업데이트
        userNode.energy = vectors.aggregatedEnergy * 100;
        
        // 속도 업데이트 (활동 기반)
        const activityVector = vectors.vectors.find(v => v.type === 'activity');
        if (activityVector) {
            userNode.velocity = activityVector.value * 10;
        }
        
        return this.physicsMap.exportState();
    }
};

// ================================================================
// ALL-SENSES CORE (Unified System)
// ================================================================

export const AllSensesCore = {
    // Components
    kernel: CorePhysicsKernel,
    sensors: EightSensors,
    resources: ResourceManager,
    security: SecurePurge,
    suggestions: ProactiveSuggestion,
    physicsConnector: PhysicsMapConnector,
    
    // State
    isInitialized: false,
    isRunning: false,
    analysisInterval: null,
    
    // Callbacks
    onSuggestion: null,
    onVectorUpdate: null,
    onEnergyAudit: null,
    
    /**
     * Initialize All-Senses Intelligence Core
     */
    async init(config = {}) {
        console.log('[AllSensesCore] ====================================');
        console.log('[AllSensesCore] DEPLOYING ALL-SENSES INTELLIGENCE CORE');
        console.log('[AllSensesCore] ====================================');
        
        // 1. Core Physics Kernel 초기화
        console.log('[AllSensesCore] Step 1: Initializing Core Physics Kernel...');
        this.kernel.init(config.kernel);
        
        // 2. Eight Sensors 마운트
        console.log('[AllSensesCore] Step 2: Mounting Eight Sensors...');
        await this.sensors.init();
        this.sensors.mountToKernel(this.kernel);
        
        // 3. Resource Manager 초기화 (Bezos Mode)
        console.log('[AllSensesCore] Step 3: Initializing Resource Manager (Bezos Mode)...');
        await this.resources.init(config.resources);
        
        // 4. Security Protocol 초기화 (Zero-Server)
        console.log('[AllSensesCore] Step 4: Initializing Security Protocol...');
        await this.security.init();
        
        // 5. Physics Map 연결
        console.log('[AllSensesCore] Step 5: Connecting to Physics Map...');
        await this.physicsConnector.connect();
        
        // 6. Proactive Suggestion 초기화
        console.log('[AllSensesCore] Step 6: Initializing Proactive Suggestions...');
        this.suggestions.init(config.onAction || this.handleAction.bind(this));
        
        // Callbacks 설정
        this.onSuggestion = config.onSuggestion;
        this.onVectorUpdate = config.onVectorUpdate;
        this.onEnergyAudit = config.onEnergyAudit;
        
        this.isInitialized = true;
        
        console.log('[AllSensesCore] ====================================');
        console.log('[AllSensesCore] DEPLOYMENT COMPLETE');
        console.log('[AllSensesCore] ====================================');
        
        return this;
    },
    
    /**
     * Start all sensing and analysis
     */
    start(intervalMs = 5000) {
        if (!this.isInitialized) {
            console.error('[AllSensesCore] Not initialized');
            return;
        }
        
        if (this.isRunning) {
            console.warn('[AllSensesCore] Already running');
            return;
        }
        
        console.log('[AllSensesCore] Starting All-Senses Intelligence...');
        
        // 센서 시작
        this.sensors.startAll();
        
        // 분석 루프 시작
        this.analysisInterval = setInterval(() => {
            this.runAnalysisCycle();
        }, intervalMs);
        
        this.isRunning = true;
        console.log(`[AllSensesCore] Running with ${intervalMs}ms interval`);
    },
    
    /**
     * Stop all sensing
     */
    stop() {
        console.log('[AllSensesCore] Stopping...');
        
        // 센서 중지
        this.sensors.stopAll();
        
        // 분석 루프 중지
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
        
        this.isRunning = false;
        console.log('[AllSensesCore] Stopped');
    },
    
    /**
     * Run single analysis cycle
     */
    async runAnalysisCycle() {
        // Low priority 태스크로 스케줄링
        this.resources.scheduleTask(async () => {
            try {
                // 1. 센서 데이터 수집
                const sensorReadings = await this.sensors.readAll();
                
                // 2. 벡터 변환 및 Physics Map 업데이트
                const vectors = this.physicsConnector.mapVectors(sensorReadings);
                const mapState = this.physicsConnector.updateMap(vectors);
                
                if (this.onVectorUpdate) {
                    this.onVectorUpdate(vectors);
                }
                
                // 3. 에너지 감사
                const nodes = mapState?.nodes || [];
                const energyAudit = this.kernel.auditSystem(nodes);
                
                if (this.onEnergyAudit) {
                    this.onEnergyAudit(energyAudit);
                }
                
                // 4. Proactive Suggestion 생성
                const suggestions = this.suggestions.analyze({
                    energyAudit: energyAudit.energyAudit,
                    sensorReadings,
                    physicsMap: mapState
                });
                
                if (suggestions.length > 0 && this.onSuggestion) {
                    this.onSuggestion(suggestions);
                }
                
                // 5. Raw 데이터 보안 삭제
                this.security.purge(sensorReadings);
                
            } catch (err) {
                console.error('[AllSensesCore] Analysis cycle error:', err);
            }
        });
    },
    
    /**
     * Handle suggestion action
     */
    handleAction(action) {
        console.log('[AllSensesCore] Action triggered:', action);
        
        // 액션 타입별 처리
        switch (action) {
            case 'take_break':
                // 휴식 타이머 시작
                console.log('[AllSensesCore] Starting break timer...');
                break;
            case 'focus_task':
                // 집중 모드 활성화
                console.log('[AllSensesCore] Activating focus mode...');
                break;
            case 'automate_task':
                // 자동화 제안 표시
                console.log('[AllSensesCore] Showing automation options...');
                break;
            default:
                console.log('[AllSensesCore] Action not handled:', action);
        }
    },
    
    /**
     * Get comprehensive status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            kernel: this.kernel.getStatus(),
            sensors: this.sensors.getStatus(),
            resources: this.resources.getStatus(),
            security: this.security.getStats(),
            suggestions: this.suggestions.getStats()
        };
    },
    
    /**
     * Manual sensor read
     */
    async readSensors() {
        return this.sensors.readAll();
    },
    
    /**
     * Manual physics audit
     */
    auditPhysics(nodes) {
        return this.kernel.auditSystem(nodes);
    },
    
    /**
     * Apply physics laws to action
     */
    applyAction(node, action) {
        return this.kernel.applyLaws(node, action);
    },
    
    /**
     * Simulate action outcome
     */
    simulateAction(node, actionType, magnitude) {
        return this.kernel.simulate(node, actionType, magnitude);
    },
    
    /**
     * Cleanup and shutdown
     */
    shutdown() {
        console.log('[AllSensesCore] Shutting down...');
        
        this.stop();
        this.resources.shutdown();
        this.security.clearAllData();
        this.suggestions.clearAll();
        
        this.isInitialized = false;
        console.log('[AllSensesCore] Shutdown complete');
    }
};

// ================================================================
// QUICK START FUNCTIONS
// ================================================================

/**
 * Quick initialize and start
 */
export async function deployAllSenses(config = {}) {
    await AllSensesCore.init(config);
    AllSensesCore.start(config.interval || 5000);
    return AllSensesCore;
}

/**
 * Get current status
 */
export function getSystemStatus() {
    return AllSensesCore.getStatus();
}

/**
 * Shutdown system
 */
export function shutdownSystem() {
    AllSensesCore.shutdown();
}

export default AllSensesCore;




