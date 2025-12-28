// ================================================================
// AUTUS 8-ENGINE SYSTEM - UNIFIED INDEX
// 8대 엔진 통합 모듈
// ================================================================

// ================================================================
// ENGINE EXPORTS
// ================================================================

// 1. 기록 학습 엔진
export { 
    LogMiningEngine, 
    FileReader as LogFileReader,
    CSVParser, 
    ExcelParser,
    JSONParser,
    PhysicsConverter as LogPhysicsConverter,
    testLogMiningEngine
} from './LogMiningEngine.js';

// 2. 화면 스캔 엔진
export { 
    ScreenScanner,
    TesseractLoader,
    ImageCapturer,
    TextAnalyzer,
    ScreenPhysicsConverter,
    testScreenScanner
} from './ScreenScanner.js';

// 3. 음성 인식 엔진
export { 
    VoiceListener,
    WebSpeechRecognizer,
    AudioRecorder,
    AudioAnalyzer,
    VoiceTextProcessor,
    VoicePhysicsConverter,
    testVoiceListener
} from './VoiceListener.js';

// 4. 영상 분석 엔진
export { 
    VideoAnalyzer,
    WebcamManager,
    FaceDetectorModule,
    AttentionTracker,
    PostureAnalyzer,
    VideoPhysicsConverter,
    testVideoAnalyzer
} from './VideoAnalyzer.js';

// 5. 연결 분석 엔진
export { 
    LinkMapper,
    NetworkGraph,
    GraphNode,
    GraphEdge,
    NetworkAnalyzer,
    RelationshipTypes,
    LinkPhysicsConverter,
    testLinkMapper
} from './LinkMapper.js';

// 6. 생체 모니터 엔진
export { 
    BioMonitor,
    BluetoothHeartRate,
    ActivityEstimator,
    WellnessCalculator,
    BioPhysicsConverter,
    testBioMonitor
} from './BioMonitor.js';

// 7. 맥락 인식 엔진
export { 
    ContextAwareness,
    TimeContext,
    LocationContext,
    EnvironmentContext,
    ScheduleContext,
    ContextPhysicsConverter,
    testContextAwareness
} from './ContextAwareness.js';

// 8. 직관 예측 엔진
export { 
    IntuitionPredictor,
    PatternMemory,
    ActionPredictor,
    AnomalyDetector as IntuitionAnomalyDetector,
    InsightGenerator,
    IntuitionPhysicsConverter,
    testIntuitionPredictor
} from './IntuitionPredictor.js';

// ================================================================
// BEZOS EDITION ENGINES
// ================================================================

// 9. 분석 엔진 (Bezos Edition)
export {
    AnalysisEngine,
    AnomalyDetector,
    CorrelationEngine,
    PrescriptionEngine,
    AlertSeverity,
    SensorType,
    PrescriptionType,
    THRESHOLDS,
    testAnalysisEngine
} from './AnalysisEngine.js';

// 10. 시스템 오토파일럿
export {
    SystemAutopilot,
    EntropyManager,
    ResourceLoadBalancer,
    FeedbackLoopStabilizer,
    testSystemAutopilot
} from './SystemAutopilot.js';

// 11. 교육 통합 엔진
export {
    EducationEngine,
    ParentDelightReport,
    AllThatBasketIntegration,
    SatisfactionMesh,
    HighTicketTargeting,
    testEducationIntegration
} from './EducationIntegration.js';

// ================================================================
// BEZOS EDITION V2 - ADVANCED ENGINES
// ================================================================

// 12. 이탈 방지 엔진
export {
    ChurnPreventionEngine,
    ChurnSimulationEngine,
    ChurnRiskLevel,
    RetentionPackType,
    CorrectionThrustType,
    CHURN_THRESHOLDS,
    RETENTION_PACKS,
    testChurnPreventionEngine
} from './ChurnPreventionEngine.js';

// 13. 물리-조언 매칭 엔진
export {
    PhysicsToAdviceMatchingEngine,
    DataLineageTable,
    MotionBasedAdviceEngine,
    TransparencyEngine,
    RawDataType,
    PhysicsMetric,
    AdviceType,
    testPhysicsToAdviceEngine
} from './PhysicsToAdviceEngine.js';

// 14. 하이브리드 스토리지 엔진
export {
    HybridStorageOrchestrator,
    LocalStorage,
    CentralSyncManager,
    EncryptionModule,
    HashCheckModule,
    StorageLocation,
    DataCategory,
    EncryptionStatus,
    testHybridStorageEngine
} from './HybridStorageEngine.js';

// 15. 고가치 타겟 엔진
export {
    HighTicketTargetEngine,
    HighValueSignalFilter,
    WTPScoreCalculator,
    CampaignGenerator,
    InvitationGenerator,
    ValueTier,
    CampaignType,
    SignalStrength,
    HIGH_VALUE_KEYWORDS,
    testHighTicketTargetEngine
} from './HighTicketTargetEngine.js';

// ================================================================
// BEZOS EDITION V3 - GRAVITY & NETWORK ENGINES
// ================================================================

// 16. 대기자 중력장 엔진
export {
    WaitlistGravityField,
    GoldenRingSealingProtocol,
    WaitlistStatus,
    OrbitTier,
    PulseType,
    PreDiagnosticData,
    WaitlistNode,
    GravitationalPulse,
    GoldenRingSlot,
    WAITLIST_CONFIG,
    GOLDEN_RING_CONFIG,
    testWaitlistGravityField
} from './WaitlistGravityField.js';

// 17. 네트워크 효과 엔진
export {
    NetworkEffectEngine,
    GrandEquationAggregator,
    CrossNodeSynergyTracker,
    SingularityDetector,
    DifferentialPrivacyModule,
    ScalingPhase,
    FormulaType,
    ClusterType,
    SuccessVector,
    GrandEquation,
    ClusterProfile,
    SynergyEvent,
    SCALING_THRESHOLDS,
    DIFFERENTIAL_PRIVACY,
    testNetworkEffectEngine
} from './NetworkEffectEngine.js';

// 18. 다중 궤도 전략 엔진
export {
    MultiOrbitStrategyEngine,
    SafetyOrbitEngine,
    AcquisitionOrbitEngine,
    RevenueOrbitEngine,
    GoldenTargetExtractor,
    FutureSimulator,
    OrbitType,
    ActionType,
    SurgeType,
    DataContinuityScore,
    EmotionalVector,
    PerformanceSurge,
    GoldenTarget,
    FutureSimulation,
    ORBIT_CONFIG,
    SURGE_THRESHOLDS as SURGE_THRESHOLDS_ORBIT,
    testMultiOrbitStrategy
} from './MultiOrbitStrategy.js';

// 19. 엔트로피 계산 엔진
export {
    AutusEntropyCalculator,
    BoltzmannEntropy,
    ShannonEntropy,
    EntropyVisualizer,
    NodeState,
    EntropyLevel,
    RelationType,
    NodeProbability,
    RelationEdge,
    RoleMismatch,
    EntropyComponents,
    EntropyReport,
    EntropyTarget,
    K_BOLTZMANN,
    LAMBDA_CONFLICT,
    LAMBDA_MISMATCH,
    LAMBDA_CHURN,
    LAMBDA_ISOLATION,
    ENTROPY_THRESHOLDS,
    testEntropyCalculator
} from './EntropyCalculator.js';

// ================================================================
// UNIFIED SYSTEM ENGINE (v3.0)
// ================================================================

// 20. 통합 시스템 엔진
export {
    UnifiedSystemEngine,
    UnifiedNode,
    QuantumState,
    Entanglement,
    UncertaintyPrinciple,
    UnifiedPhysicsFormulas,
    SYSTEM_CONSTANTS,
    CLUSTER_TYPES,
    ORBIT_TYPES,
    testUnifiedSystemEngine
} from './UnifiedSystemEngine.js';

// ================================================================
// ENGINE REGISTRY
// ================================================================

export const EngineRegistry = {
    engines: {
        logMining: {
            id: 'logMining',
            name: '기록 학습 엔진',
            nameEn: 'LogMining Engine',
            description: '로컬 파일(CSV, Excel, JSON)을 물리 속성으로 변환',
            icon: '📁',
            status: 'READY'
        },
        screenScanner: {
            id: 'screenScanner',
            name: '화면 스캔 엔진',
            nameEn: 'ScreenScanner Engine',
            description: 'Tesseract OCR로 화면/이미지 텍스트 추출',
            icon: '🖥️',
            status: 'READY'
        },
        voiceListener: {
            id: 'voiceListener',
            name: '음성 인식 엔진',
            nameEn: 'VoiceListener Engine',
            description: 'Web Speech API로 음성을 텍스트로 변환',
            icon: '🎤',
            status: 'READY'
        },
        videoAnalyzer: {
            id: 'videoAnalyzer',
            name: '영상 분석 엔진',
            nameEn: 'VideoAnalyzer Engine',
            description: '얼굴 감지, 주의력 추적, 자세 분석',
            icon: '📹',
            status: 'READY'
        },
        linkMapper: {
            id: 'linkMapper',
            name: '연결 분석 엔진',
            nameEn: 'LinkMapper Engine',
            description: '관계 네트워크 구축 및 물리 맵핑',
            icon: '🔗',
            status: 'READY'
        },
        bioMonitor: {
            id: 'bioMonitor',
            name: '생체 모니터 엔진',
            nameEn: 'BioMonitor Engine',
            description: '심박수, 스트레스, 에너지 레벨 추적',
            icon: '💓',
            status: 'READY'
        },
        contextAwareness: {
            id: 'contextAwareness',
            name: '맥락 인식 엔진',
            nameEn: 'ContextAwareness Engine',
            description: '시간, 위치, 환경, 일정 분석',
            icon: '🌍',
            status: 'READY'
        },
        intuitionPredictor: {
            id: 'intuitionPredictor',
            name: '직관 예측 엔진',
            nameEn: 'IntuitionPredictor Engine',
            description: '패턴 학습, 다음 행동 예측, 이상 감지',
            icon: '🔮',
            status: 'READY'
        },
        // Bezos Edition
        analysisEngine: {
            id: 'analysisEngine',
            name: '분석 엔진 (Bezos)',
            nameEn: 'Analysis Engine (Bezos Edition)',
            description: '이상 감지, 상관관계 분석, 자동 처방',
            icon: '🔬',
            status: 'READY'
        },
        systemAutopilot: {
            id: 'systemAutopilot',
            name: '시스템 오토파일럿',
            nameEn: 'System Autopilot',
            description: '엔트로피 관리, 자원 분산, 피드백 안정화',
            icon: '🤖',
            status: 'READY'
        },
        educationEngine: {
            id: 'educationEngine',
            name: '교육 통합 엔진',
            nameEn: 'Education Integration Engine',
            description: '학부모 리포트, 운동x학습 시너지, 타겟팅',
            icon: '🎓',
            status: 'READY'
        },
        // Bezos Edition V2
        churnPrevention: {
            id: 'churnPrevention',
            name: '이탈 방지 엔진',
            nameEn: 'Churn Prevention Engine',
            description: '이탈 위험 감지, 교정 벡터, 유지 자동화 팩',
            icon: '🛡️',
            status: 'READY'
        },
        physicsToAdvice: {
            id: 'physicsToAdvice',
            name: '물리-조언 매칭 엔진',
            nameEn: 'Physics-to-Advice Engine',
            description: '데이터 계보, 모션 기반 조언, 투명성 리포트',
            icon: '💡',
            status: 'READY'
        },
        hybridStorage: {
            id: 'hybridStorage',
            name: '하이브리드 스토리지',
            nameEn: 'Hybrid Storage Engine',
            description: '로컬 우선 저장, 중앙 동기화, SecurePurge',
            icon: '💾',
            status: 'READY'
        },
        highTicketTarget: {
            id: 'highTicketTarget',
            name: '고가치 타겟 엔진',
            nameEn: 'High-Ticket Target Engine',
            description: '고가치 신호 필터, WTP 점수, 캠페인 생성',
            icon: '💎',
            status: 'READY'
        },
        // Bezos Edition V3 - Gravity & Network
        waitlistGravity: {
            id: 'waitlistGravity',
            name: '대기자 중력장 엔진',
            nameEn: 'Waitlist Gravity Field Engine',
            description: '골든 링 봉인, 대기자 궤도, 중력 펄스',
            icon: '🔒',
            status: 'READY'
        },
        networkEffect: {
            id: 'networkEffect',
            name: '네트워크 효과 엔진',
            nameEn: 'Network Effect Engine',
            description: 'Grand Equation, 시너지 추적, 임계질량 감지',
            icon: '🚀',
            status: 'READY'
        },
        multiOrbitStrategy: {
            id: 'multiOrbitStrategy',
            name: '다중 궤도 전략 엔진',
            nameEn: 'Multi-Orbit Strategy Engine',
            description: '안전/영입/수익 3궤도 통합, 골든 타겟, 미래 시뮬레이션',
            icon: '🎯',
            status: 'READY'
        },
        entropyCalculator: {
            id: 'entropyCalculator',
            name: '엔트로피 계산 엔진',
            nameEn: 'Entropy Calculator Engine',
            description: 'Boltzmann/Shannon 엔트로피, 돈 생산 효율, 무질서도 정량화',
            icon: '🧮',
            status: 'READY'
        },
        // Unified System Engine v3.0
        unifiedSystem: {
            id: 'unifiedSystem',
            name: '통합 시스템 엔진',
            nameEn: 'Unified System Engine',
            description: '양자 영감 변수, 얽힘 전파, 불확실성 원리, 자동 최적화',
            icon: '⚛️',
            status: 'READY'
        }
    },
    
    getAll() {
        return Object.values(this.engines);
    },
    
    get(id) {
        return this.engines[id];
    },
    
    getStatus() {
        const all = this.getAll();
        return {
            total: all.length,
            ready: all.filter(e => e.status === 'READY').length,
            engines: all.map(e => ({ id: e.id, name: e.name, status: e.status }))
        };
    }
};

// ================================================================
// UNIFIED AUTUS ENGINES API
// ================================================================

export const AutusEngines = {
    // 엔진 인스턴스들
    instances: {},
    isInitialized: false,
    
    /**
     * 모든 엔진 초기화
     */
    async init() {
        console.log('[AutusEngines] ====================================');
        console.log('[AutusEngines] 8대 엔진 시스템 초기화');
        console.log('[AutusEngines] ====================================');
        
        const { LogMiningEngine } = await import('./LogMiningEngine.js');
        const { ScreenScanner } = await import('./ScreenScanner.js');
        const { VoiceListener } = await import('./VoiceListener.js');
        const { VideoAnalyzer } = await import('./VideoAnalyzer.js');
        const { LinkMapper } = await import('./LinkMapper.js');
        const { BioMonitor } = await import('./BioMonitor.js');
        const { ContextAwareness } = await import('./ContextAwareness.js');
        const { IntuitionPredictor } = await import('./IntuitionPredictor.js');
        
        // Bezos Edition V1
        const { AnalysisEngine } = await import('./AnalysisEngine.js');
        const { SystemAutopilot } = await import('./SystemAutopilot.js');
        const { EducationEngine } = await import('./EducationIntegration.js');
        
        // Bezos Edition V2
        const { ChurnPreventionEngine } = await import('./ChurnPreventionEngine.js');
        const { PhysicsToAdviceMatchingEngine } = await import('./PhysicsToAdviceEngine.js');
        const { HybridStorageOrchestrator } = await import('./HybridStorageEngine.js');
        const { HighTicketTargetEngine } = await import('./HighTicketTargetEngine.js');
        
        // Bezos Edition V3 - Gravity & Network
        const { WaitlistGravityField } = await import('./WaitlistGravityField.js');
        const { NetworkEffectEngine } = await import('./NetworkEffectEngine.js');
        const { MultiOrbitStrategyEngine } = await import('./MultiOrbitStrategy.js');
        const { AutusEntropyCalculator } = await import('./EntropyCalculator.js');
        
        // Unified System Engine v3.0
        const { UnifiedSystemEngine } = await import('./UnifiedSystemEngine.js');
        
        this.instances = {
            // 8대 코어 엔진
            logMining: LogMiningEngine,
            screenScanner: ScreenScanner,
            voiceListener: VoiceListener,
            videoAnalyzer: VideoAnalyzer,
            linkMapper: LinkMapper,
            bioMonitor: BioMonitor,
            contextAwareness: ContextAwareness,
            intuitionPredictor: IntuitionPredictor,
            // Bezos Edition V1
            analysisEngine: AnalysisEngine,
            systemAutopilot: SystemAutopilot,
            educationEngine: EducationEngine,
            // Bezos Edition V2
            churnPrevention: ChurnPreventionEngine,
            physicsToAdvice: PhysicsToAdviceMatchingEngine,
            hybridStorage: HybridStorageOrchestrator,
            highTicketTarget: HighTicketTargetEngine,
            // Bezos Edition V3 - Gravity & Network
            waitlistGravity: WaitlistGravityField.init(),
            networkEffect: NetworkEffectEngine.init(),
            multiOrbitStrategy: MultiOrbitStrategyEngine.init(),
            entropyCalculator: Object.create(AutusEntropyCalculator).init()
        };
        
        // 각 엔진 초기화
        this.instances.linkMapper.init();
        this.instances.bioMonitor.init();
        this.instances.hybridStorage.init();
        
        this.isInitialized = true;
        console.log('[AutusEngines] 초기화 완료 - 19개 엔진 로드됨 (8대 코어 + Bezos V1 3개 + Bezos V2 4개 + Bezos V3 4개)');
        
        return this;
    },
    
    /**
     * 엔진 가져오기
     */
    get(engineId) {
        return this.instances[engineId];
    },
    
    /**
     * 전체 센서 데이터 수집
     */
    async gatherAll() {
        const results = {};
        
        // 맥락 수집 (동기 가능)
        results.context = await this.instances.contextAwareness.gather();
        
        // 생체 데이터 (동기)
        results.bio = this.instances.bioMonitor.read();
        
        // 네트워크 분석 (동기)
        results.network = this.instances.linkMapper.analyze();
        
        // 직관 분석 (동기)
        results.intuition = this.instances.intuitionPredictor.analyze({
            ...results.context?.physics?.metadata,
            ...results.bio?.physics?.metadata
        });
        
        // 통합 물리 속성
        results.combinedPhysics = this.combinePhysics(results);
        
        return results;
    },
    
    /**
     * 물리 속성 통합
     */
    combinePhysics(results) {
        const physics = {
            context: results.context?.physics,
            bio: results.bio?.physics,
            network: results.network,
            intuition: results.intuition?.physics
        };
        
        // 가중 평균 계산
        const values = Object.values(physics).filter(p => p);
        
        if (values.length === 0) {
            return { mass: 0, energy: 0, entropy: 0, velocity: 0 };
        }
        
        const combined = {
            mass: values.reduce((s, p) => s + (p.mass || 0), 0) / values.length,
            energy: values.reduce((s, p) => s + (p.energy || 0), 0) / values.length,
            entropy: values.reduce((s, p) => s + (p.entropy || 0), 0) / values.length,
            velocity: values.reduce((s, p) => s + (p.velocity || 0), 0) / values.length
        };
        
        return {
            mass: Math.round(combined.mass * 100) / 100,
            energy: Math.round(combined.energy * 100) / 100,
            entropy: Math.round(combined.entropy * 1000) / 1000,
            velocity: Math.round(combined.velocity * 100) / 100,
            sources: Object.keys(physics).filter(k => physics[k])
        };
    },
    
    /**
     * 행동 학습 (모든 관련 엔진에 전파)
     */
    learn(action, context = {}) {
        // 직관 예측기에 학습
        this.instances.intuitionPredictor.learn(action, context);
        
        // 생체 모니터에 활동 기록
        this.instances.bioMonitor.recordActivity(action.type, action.intensity || 0.5);
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        const status = {
            initialized: this.isInitialized,
            engines: {}
        };
        
        Object.entries(this.instances).forEach(([id, engine]) => {
            status.engines[id] = {
                ...EngineRegistry.get(id),
                runtimeStatus: engine.getStatus?.() || 'unknown'
            };
        });
        
        return status;
    },
    
    /**
     * 전체 테스트 실행
     */
    async runAllTests() {
        console.log('='.repeat(60));
        console.log('AUTUS 8-ENGINE SYSTEM - FULL TEST');
        console.log('='.repeat(60));
        
        const results = {};
        
        try {
            results.logMining = await testLogMiningEngine();
        } catch (e) { results.logMining = { error: e.message }; }
        
        try {
            results.screenScanner = await testScreenScanner();
        } catch (e) { results.screenScanner = { error: e.message }; }
        
        try {
            results.voiceListener = await testVoiceListener();
        } catch (e) { results.voiceListener = { error: e.message }; }
        
        try {
            results.videoAnalyzer = await testVideoAnalyzer();
        } catch (e) { results.videoAnalyzer = { error: e.message }; }
        
        try {
            results.linkMapper = await testLinkMapper();
        } catch (e) { results.linkMapper = { error: e.message }; }
        
        try {
            results.bioMonitor = await testBioMonitor();
        } catch (e) { results.bioMonitor = { error: e.message }; }
        
        try {
            results.contextAwareness = await testContextAwareness();
        } catch (e) { results.contextAwareness = { error: e.message }; }
        
        try {
            results.intuitionPredictor = await testIntuitionPredictor();
        } catch (e) { results.intuitionPredictor = { error: e.message }; }
        
        // Bezos Edition Tests
        try {
            const { testAnalysisEngine } = await import('./AnalysisEngine.js');
            results.analysisEngine = testAnalysisEngine();
        } catch (e) { results.analysisEngine = { error: e.message }; }
        
        try {
            const { testSystemAutopilot } = await import('./SystemAutopilot.js');
            results.systemAutopilot = testSystemAutopilot();
        } catch (e) { results.systemAutopilot = { error: e.message }; }
        
        try {
            const { testEducationIntegration } = await import('./EducationIntegration.js');
            results.educationEngine = testEducationIntegration();
        } catch (e) { results.educationEngine = { error: e.message }; }
        
        // Bezos Edition V2 Tests
        try {
            const { testChurnPreventionEngine } = await import('./ChurnPreventionEngine.js');
            results.churnPrevention = testChurnPreventionEngine();
        } catch (e) { results.churnPrevention = { error: e.message }; }
        
        try {
            const { testPhysicsToAdviceEngine } = await import('./PhysicsToAdviceEngine.js');
            results.physicsToAdvice = testPhysicsToAdviceEngine();
        } catch (e) { results.physicsToAdvice = { error: e.message }; }
        
        try {
            const { testHybridStorageEngine } = await import('./HybridStorageEngine.js');
            results.hybridStorage = await testHybridStorageEngine();
        } catch (e) { results.hybridStorage = { error: e.message }; }
        
        try {
            const { testHighTicketTargetEngine } = await import('./HighTicketTargetEngine.js');
            results.highTicketTarget = testHighTicketTargetEngine();
        } catch (e) { results.highTicketTarget = { error: e.message }; }
        
        // Bezos Edition V3 Tests
        try {
            const { testWaitlistGravityField } = await import('./WaitlistGravityField.js');
            results.waitlistGravity = testWaitlistGravityField();
        } catch (e) { results.waitlistGravity = { error: e.message }; }
        
        try {
            const { testNetworkEffectEngine } = await import('./NetworkEffectEngine.js');
            results.networkEffect = testNetworkEffectEngine();
        } catch (e) { results.networkEffect = { error: e.message }; }
        
        try {
            const { testMultiOrbitStrategy } = await import('./MultiOrbitStrategy.js');
            results.multiOrbitStrategy = testMultiOrbitStrategy();
        } catch (e) { results.multiOrbitStrategy = { error: e.message }; }
        
        try {
            const { testEntropyCalculator } = await import('./EntropyCalculator.js');
            results.entropyCalculator = testEntropyCalculator();
        } catch (e) { results.entropyCalculator = { error: e.message }; }
        
        console.log('='.repeat(60));
        console.log('ALL TESTS COMPLETED (19 Engines)');
        console.log('='.repeat(60));
        
        return results;
    }
};

// ================================================================
// DEFAULT EXPORT
// ================================================================

export default AutusEngines;




