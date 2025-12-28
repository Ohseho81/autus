// ================================================================
// AUTUS PHYSICS-TO-ADVICE MATCHING ENGINE (BEZOS EDITION)
// 물리량 → 조언 매칭 및 데이터 계보 추적
//
// 기능:
// 1. DataLineage - Raw Data → Physics Metric 추적
// 2. Motion-based Advice Logic - 노드 상태 기반 조언
// 3. Transparency Feature - 원인 추적 표시
//
// Version: 2.0.0
// Status: LOCKED
// ================================================================

// ================================================================
// ENUMS
// ================================================================

export const RawDataType = {
    AUDIO_TONE: 'AUDIO_TONE',
    AUDIO_STT: 'AUDIO_STT',
    SCREEN_OCR: 'SCREEN_OCR',
    SCREEN_APP: 'SCREEN_APP',
    VIDEO_GAZE: 'VIDEO_GAZE',
    VIDEO_EXPRESSION: 'VIDEO_EXPRESSION',
    LOG_ACTIVITY: 'LOG_ACTIVITY',
    LOG_CLICK: 'LOG_CLICK',
    BIO_HRV: 'BIO_HRV',
    BIO_KEYSTROKE: 'BIO_KEYSTROKE',
    CONTEXT_TIME: 'CONTEXT_TIME',
    CONTEXT_LOCATION: 'CONTEXT_LOCATION',
    LINK_CALENDAR: 'LINK_CALENDAR',
    LINK_MARKET: 'LINK_MARKET',
    INTUITION_FEEDBACK: 'INTUITION_FEEDBACK'
};

export const PhysicsMetric = {
    ENERGY: 'ENERGY',
    INERTIA: 'INERTIA',
    MASS: 'MASS',
    ENTROPY: 'ENTROPY',
    MOMENTUM: 'MOMENTUM',
    STRESS: 'STRESS',
    DIRECTION: 'DIRECTION',
    VIBRATION: 'VIBRATION'
};

export const AdviceType = {
    EMOTIONAL_RECONNECTION: 'EMOTIONAL_RECONNECTION',
    TRUST_BUILDING: 'TRUST_BUILDING',
    AUTOMATION_DELEGATION: 'AUTOMATION_DELEGATION',
    FOCUS_REDIRECT: 'FOCUS_REDIRECT',
    STRESS_RELIEF: 'STRESS_RELIEF',
    GOAL_REMINDER: 'GOAL_REMINDER',
    VALUE_DEMONSTRATION: 'VALUE_DEMONSTRATION'
};

// ================================================================
// DATA LINEAGE TABLE
// ================================================================

export const DataLineageTable = {
    entries: [],
    rawData: {},
    physicsChanges: [],
    
    // Raw Data → Physics Metric 영향 매핑
    INFLUENCE_MAP: {
        [RawDataType.AUDIO_TONE]: {
            [PhysicsMetric.ENERGY]: 0.6,
            [PhysicsMetric.STRESS]: 0.7,
            [PhysicsMetric.MOMENTUM]: 0.3
        },
        [RawDataType.AUDIO_STT]: {
            [PhysicsMetric.ENTROPY]: 0.5,
            [PhysicsMetric.DIRECTION]: 0.4,
            [PhysicsMetric.STRESS]: 0.3
        },
        [RawDataType.SCREEN_OCR]: {
            [PhysicsMetric.ENTROPY]: 0.6,
            [PhysicsMetric.MOMENTUM]: 0.4
        },
        [RawDataType.SCREEN_APP]: {
            [PhysicsMetric.ENERGY]: 0.5,
            [PhysicsMetric.ENTROPY]: 0.5
        },
        [RawDataType.VIDEO_GAZE]: {
            [PhysicsMetric.ENERGY]: 0.7,
            [PhysicsMetric.STRESS]: 0.4,
            [PhysicsMetric.MOMENTUM]: 0.3
        },
        [RawDataType.VIDEO_EXPRESSION]: {
            [PhysicsMetric.ENERGY]: 0.6,
            [PhysicsMetric.STRESS]: 0.6
        },
        [RawDataType.BIO_HRV]: {
            [PhysicsMetric.STRESS]: 0.8,
            [PhysicsMetric.ENERGY]: 0.5,
            [PhysicsMetric.VIBRATION]: 0.6
        },
        [RawDataType.BIO_KEYSTROKE]: {
            [PhysicsMetric.STRESS]: 0.6,
            [PhysicsMetric.MOMENTUM]: 0.4
        },
        [RawDataType.LINK_MARKET]: {
            [PhysicsMetric.INERTIA]: 0.5,
            [PhysicsMetric.ENTROPY]: 0.4
        },
        [RawDataType.INTUITION_FEEDBACK]: {
            [PhysicsMetric.DIRECTION]: 0.7,
            [PhysicsMetric.MASS]: 0.4
        }
    },
    
    /**
     * Raw 데이터 기록
     */
    recordRawData(entry) {
        this.rawData[entry.id] = {
            ...entry,
            timestamp: entry.timestamp || new Date()
        };
        return entry.id;
    },
    
    /**
     * 물리량 변화와 원인 Raw Data 연결
     */
    recordPhysicsChange(rawDataId, metric, before, after, explanation = '') {
        const rawData = this.rawData[rawDataId];
        if (!rawData) {
            throw new Error(`Raw data ${rawDataId} not found`);
        }
        
        const delta = after - before;
        
        // 영향도 계산
        const influenceMap = this.INFLUENCE_MAP[rawData.dataType] || {};
        const contribution = (influenceMap[metric] || 0.3) * delta;
        
        // 설명 생성
        if (!explanation) {
            explanation = this._generateExplanation(rawData, metric, delta);
        }
        
        const lineageEntry = {
            id: `LIN_${Date.now()}_${rawDataId.substring(0, 8)}`,
            rawDataId,
            rawDataType: rawData.dataType,
            physicsMetric: metric,
            contribution,
            timestamp: new Date(),
            explanation
        };
        
        this.entries.push(lineageEntry);
        
        // 물리량 변화 기록
        this.physicsChanges.push({
            metric,
            before,
            after,
            delta,
            timestamp: new Date()
        });
        
        return lineageEntry;
    },
    
    /**
     * 자동 설명 생성
     */
    _generateExplanation(rawData, metric, delta) {
        const direction = delta > 0 ? 'increased' : 'decreased';
        const time = rawData.timestamp instanceof Date 
            ? rawData.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : 'recently';
        
        const templates = {
            [`${RawDataType.AUDIO_TONE}_${PhysicsMetric.ENERGY}`]:
                `Voice tone analysis ${direction} energy level`,
            [`${RawDataType.AUDIO_TONE}_${PhysicsMetric.STRESS}`]:
                `Anxiety detected in voice at ${time}`,
            [`${RawDataType.VIDEO_GAZE}_${PhysicsMetric.ENERGY}`]:
                `Gaze stability ${direction} engagement`,
            [`${RawDataType.BIO_HRV}_${PhysicsMetric.STRESS}`]:
                `Heart rate variability indicates ${direction} stress`,
            [`${RawDataType.SCREEN_APP}_${PhysicsMetric.ENTROPY}`]:
                `App usage pattern ${direction} entropy`
        };
        
        const key = `${rawData.dataType}_${metric}`;
        return templates[key] || `${rawData.dataType} affected ${metric}`;
    },
    
    /**
     * 특정 물리량에 영향을 준 모든 Raw Data 조회
     */
    getLineageForMetric(metric) {
        return this.entries.filter(e => e.physicsMetric === metric);
    },
    
    /**
     * 주요 기여자 조회
     */
    getMajorContributors(metric, topN = 3) {
        const entries = this.getLineageForMetric(metric);
        return entries
            .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
            .slice(0, topN);
    },
    
    /**
     * 계보 그래프 내보내기
     */
    exportLineageGraph() {
        const nodes = [];
        const edges = [];
        
        // Raw Data 노드
        Object.entries(this.rawData).forEach(([rawId, raw]) => {
            nodes.push({
                id: rawId,
                type: 'raw_data',
                label: raw.dataType,
                timestamp: raw.timestamp?.toISOString()
            });
        });
        
        // Physics Metric 노드
        const metricsSeen = new Set();
        this.entries.forEach(entry => {
            if (!metricsSeen.has(entry.physicsMetric)) {
                nodes.push({
                    id: entry.physicsMetric,
                    type: 'physics_metric',
                    label: entry.physicsMetric
                });
                metricsSeen.add(entry.physicsMetric);
            }
        });
        
        // 엣지
        this.entries.forEach(entry => {
            edges.push({
                source: entry.rawDataId,
                target: entry.physicsMetric,
                contribution: entry.contribution,
                explanation: entry.explanation
            });
        });
        
        return { nodes, edges };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.entries = [];
        this.rawData = {};
        this.physicsChanges = [];
    }
};

// ================================================================
// MOTION-BASED ADVICE ENGINE
// ================================================================

export const MotionBasedAdviceEngine = {
    lineage: DataLineageTable,
    adviceHistory: [],
    
    // 조언 팩 정의
    ADVICE_PACKS: {
        [AdviceType.EMOTIONAL_RECONNECTION]: {
            adviceType: AdviceType.EMOTIONAL_RECONNECTION,
            title: '감정적 재연결 팩',
            description: '높은 스트레스와 낮은 에너지로 인해 정서적 지원이 필요합니다',
            actions: [
                '개인적인 안부 전화 진행',
                '감사 메시지 전송',
                '1:1 면담 예약',
                '소소한 선물 전달'
            ],
            triggerConditions: { color: 'RED', stress: '>0.6' },
            priority: 9
        },
        [AdviceType.TRUST_BUILDING]: {
            adviceType: AdviceType.TRUST_BUILDING,
            title: '신뢰 구축 리포트',
            description: '목표와의 거리가 증가하고 있어 성과 확인이 필요합니다',
            actions: [
                '진도 요약 리포트 생성',
                'Before/After 분석 제공',
                '다음 마일스톤 프리뷰',
                '성과 하이라이트 공유'
            ],
            triggerConditions: { distance_increasing: true },
            priority: 7
        },
        [AdviceType.AUTOMATION_DELEGATION]: {
            adviceType: AdviceType.AUTOMATION_DELEGATION,
            title: '자동화 위임',
            description: '높은 스트레스(진동)가 감지되어 부담 경감이 필요합니다',
            actions: [
                '자동 스케줄링 설정',
                '리마인더 시스템 구축',
                '마찰 포인트 감소',
                '커뮤니케이션 간소화'
            ],
            triggerConditions: { vibration: '>0.5', stress: '>0.7' },
            priority: 8
        },
        [AdviceType.FOCUS_REDIRECT]: {
            adviceType: AdviceType.FOCUS_REDIRECT,
            title: '집중 방향 재설정',
            description: '방향성이 흐려지고 있어 목표 재확인이 필요합니다',
            actions: [
                '목표 재확인 세션',
                '우선순위 재설정',
                '방해 요소 식별 및 제거',
                '집중 시간 블록 설정'
            ],
            triggerConditions: { direction_change: '>0.5' },
            priority: 6
        },
        [AdviceType.STRESS_RELIEF]: {
            adviceType: AdviceType.STRESS_RELIEF,
            title: '스트레스 완화',
            description: '높은 스트레스 레벨이 지속되고 있습니다',
            actions: [
                '휴식 권장 알림',
                '부담 축소 방안 협의',
                '유연한 일정 제안',
                '지원 리소스 안내'
            ],
            triggerConditions: { stress: '>0.8' },
            priority: 8
        },
        [AdviceType.GOAL_REMINDER]: {
            adviceType: AdviceType.GOAL_REMINDER,
            title: '목표 리마인더',
            description: '목표와의 연결이 약해지고 있습니다',
            actions: [
                '목표 달성 시 혜택 리마인드',
                '진척 상황 시각화',
                '동기부여 콘텐츠 공유',
                '성공 사례 소개'
            ],
            triggerConditions: { momentum: '<0.3' },
            priority: 5
        },
        [AdviceType.VALUE_DEMONSTRATION]: {
            adviceType: AdviceType.VALUE_DEMONSTRATION,
            title: '가치 증명',
            description: '서비스 가치에 대한 확신이 필요합니다',
            actions: [
                'ROI 분석 리포트',
                '비교 분석 자료',
                '성과 지표 대시보드',
                '고객 후기 공유'
            ],
            triggerConditions: { engagement: '<0.4' },
            priority: 6
        }
    },
    
    /**
     * 노드 상태 분석 및 적합한 조언 결정
     */
    analyzeNodeState(nodeState) {
        const applicableAdvice = [];
        
        // Rule 1: RED color → Emotional Re-connection
        if (nodeState.color === 'RED') {
            applicableAdvice.push(this.ADVICE_PACKS[AdviceType.EMOTIONAL_RECONNECTION]);
        }
        
        // Rule 2: Distance increasing → Trust Building
        if (nodeState.distanceIncreasing || (nodeState.distanceFromCenter || 0) > 4) {
            applicableAdvice.push(this.ADVICE_PACKS[AdviceType.TRUST_BUILDING]);
        }
        
        // Rule 3: High vibration/stress → Automation Delegation
        if ((nodeState.vibration || 0) > 0.5 || (nodeState.stress || 0) > 0.7) {
            applicableAdvice.push(this.ADVICE_PACKS[AdviceType.AUTOMATION_DELEGATION]);
        }
        
        // Rule 4: Very high stress → Stress Relief
        if ((nodeState.stress || 0) > 0.8) {
            applicableAdvice.push(this.ADVICE_PACKS[AdviceType.STRESS_RELIEF]);
        }
        
        // Rule 5: Low momentum → Goal Reminder
        if ((nodeState.momentum ?? 1) < 0.3) {
            applicableAdvice.push(this.ADVICE_PACKS[AdviceType.GOAL_REMINDER]);
        }
        
        // Rule 6: Low engagement → Value Demonstration
        if ((nodeState.engagement ?? 1) < 0.4) {
            applicableAdvice.push(this.ADVICE_PACKS[AdviceType.VALUE_DEMONSTRATION]);
        }
        
        // Rule 7: Direction change → Focus Redirect
        if ((nodeState.directionChange || 0) > 0.5) {
            applicableAdvice.push(this.ADVICE_PACKS[AdviceType.FOCUS_REDIRECT]);
        }
        
        // 중복 제거 및 우선순위 정렬
        const seen = new Set();
        const uniqueAdvice = [];
        
        applicableAdvice
            .sort((a, b) => b.priority - a.priority)
            .forEach(advice => {
                if (!seen.has(advice.adviceType)) {
                    seen.add(advice.adviceType);
                    uniqueAdvice.push(advice);
                }
            });
        
        return uniqueAdvice;
    },
    
    /**
     * 최우선 조언 반환
     */
    getAdvice(nodeState) {
        const adviceList = this.analyzeNodeState(nodeState);
        return adviceList.length > 0 ? adviceList[0] : null;
    }
};

// ================================================================
// TRANSPARENCY ENGINE
// ================================================================

export const TransparencyEngine = {
    lineage: DataLineageTable,
    adviceEngine: MotionBasedAdviceEngine,
    
    /**
     * 투명성 리포트 생성
     */
    generateTransparencyReport(nodeId, nodeState) {
        const color = nodeState.color || 'GRAY';
        
        // 주요 원인 결정
        let mainMetric, mainReason;
        
        if (color === 'RED') {
            mainMetric = PhysicsMetric.ENERGY;
            mainReason = this._determineRedReason(nodeState);
        } else if (color === 'YELLOW') {
            mainMetric = PhysicsMetric.MOMENTUM;
            mainReason = this._determineYellowReason(nodeState);
        } else {
            mainMetric = PhysicsMetric.ENERGY;
            mainReason = 'Normal operation';
        }
        
        // 기여 데이터 조회
        const contributors = this.lineage.getMajorContributors(mainMetric, 5);
        
        // 조언 생성
        const advice = this.adviceEngine.getAdvice(nodeState);
        const adviceText = advice?.description || 'Continue monitoring';
        
        // 신뢰도 계산
        const confidence = this._calculateConfidence(contributors);
        
        return {
            nodeId,
            currentColor: color,
            mainReason,
            contributingData: contributors,
            advice: adviceText,
            confidence
        };
    },
    
    /**
     * RED 상태의 주요 원인 결정
     */
    _determineRedReason(nodeState) {
        const reasons = [];
        
        if ((nodeState.energy ?? 1) < 0.3) reasons.push('Low energy level');
        if ((nodeState.stress || 0) > 0.7) reasons.push('High stress detected');
        if ((nodeState.vibration || 0) > 0.6) reasons.push('Unstable state');
        if ((nodeState.attendanceRate ?? 1) < 0.8) reasons.push('Declining attendance');
        
        return reasons.length > 0 ? reasons.join('; ') : 'Multiple factors';
    },
    
    /**
     * YELLOW 상태의 주요 원인 결정
     */
    _determineYellowReason(nodeState) {
        if ((nodeState.momentum ?? 1) < 0.4) return 'Declining momentum';
        if ((nodeState.engagement ?? 1) < 0.5) return 'Reduced engagement';
        return 'Moderate risk indicators';
    },
    
    /**
     * 신뢰도 계산
     */
    _calculateConfidence(contributors) {
        if (!contributors || contributors.length === 0) return 0.5;
        
        const totalContribution = contributors.reduce((s, c) => s + Math.abs(c.contribution), 0);
        const baseConfidence = Math.min(totalContribution / 2, 0.8);
        const recencyBoost = contributors.length >= 3 ? 0.1 : 0.05;
        
        return Math.min(baseConfidence + recencyBoost, 0.95);
    },
    
    /**
     * 사용자에게 표시할 메시지 생성
     */
    formatUserMessage(report) {
        if (!report.contributingData || report.contributingData.length === 0) {
            return `This node is ${report.currentColor}. ${report.mainReason}.`;
        }
        
        const top = report.contributingData[0];
        const time = top.timestamp instanceof Date
            ? top.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : 'recently';
        
        const typeMap = {
            [RawDataType.AUDIO_TONE]: 'Audio Log',
            [RawDataType.AUDIO_STT]: 'Voice Transcript',
            [RawDataType.VIDEO_GAZE]: 'Video Analysis',
            [RawDataType.BIO_HRV]: 'Biometric Data',
            [RawDataType.SCREEN_APP]: 'Screen Activity'
        };
        const sourceName = typeMap[top.rawDataType] || top.rawDataType;
        
        return (
            `This node is ${report.currentColor} because of the ` +
            `'${top.explanation}' detected in the ${time} ${sourceName}.`
        );
    }
};

// ================================================================
// INTEGRATED MATCHING ENGINE
// ================================================================

export const PhysicsToAdviceMatchingEngine = {
    lineage: DataLineageTable,
    adviceEngine: MotionBasedAdviceEngine,
    transparency: TransparencyEngine,
    
    /**
     * Raw 데이터 입력
     */
    ingestRawData(entry) {
        return this.lineage.recordRawData(entry);
    },
    
    /**
     * 물리량 영향 기록
     */
    recordPhysicsImpact(rawDataId, metric, before, after, explanation = '') {
        return this.lineage.recordPhysicsChange(rawDataId, metric, before, after, explanation);
    },
    
    /**
     * 조언 획득
     */
    getAdvice(nodeState) {
        const advice = this.adviceEngine.getAdvice(nodeState);
        
        if (!advice) {
            return { advice: null, message: 'No advice needed at this time' };
        }
        
        return {
            advice: {
                type: advice.adviceType,
                title: advice.title,
                description: advice.description,
                actions: advice.actions,
                priority: advice.priority
            },
            message: advice.description
        };
    },
    
    /**
     * 노드 클릭 시 투명성 정보
     */
    getNodeTransparency(nodeId, nodeState) {
        const report = this.transparency.generateTransparencyReport(nodeId, nodeState);
        const message = this.transparency.formatUserMessage(report);
        
        return {
            nodeId,
            color: report.currentColor,
            mainReason: report.mainReason,
            userMessage: message,
            advice: report.advice,
            confidence: report.confidence,
            contributingFactors: report.contributingData.map(e => ({
                dataType: e.rawDataType,
                metric: e.physicsMetric,
                contribution: e.contribution,
                explanation: e.explanation,
                timestamp: e.timestamp?.toISOString()
            }))
        };
    },
    
    /**
     * 계보 그래프 내보내기
     */
    exportLineageGraph() {
        return this.lineage.exportLineageGraph();
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            rawDataCount: Object.keys(this.lineage.rawData).length,
            lineageEntries: this.lineage.entries.length,
            physicsChanges: this.lineage.physicsChanges.length
        };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.lineage.reset();
    }
};

// ================================================================
// TEST
// ================================================================

export function testPhysicsToAdviceEngine() {
    console.log('='.repeat(70));
    console.log('AUTUS Physics-to-Advice Matching Engine Test');
    console.log('='.repeat(70));
    
    PhysicsToAdviceMatchingEngine.reset();
    
    // Raw 데이터 입력
    console.log('\n[Raw 데이터 입력]');
    
    const now = new Date();
    const raw1 = {
        id: 'RAW_001',
        dataType: RawDataType.AUDIO_TONE,
        timestamp: new Date(now.setHours(14, 0)),
        value: { anxietyScore: 0.7, tone: 'stressed' },
        source: 'voice_sensor'
    };
    PhysicsToAdviceMatchingEngine.ingestRawData(raw1);
    console.log(`  • ${raw1.dataType} at ${raw1.timestamp.toLocaleTimeString()}`);
    
    const raw2 = {
        id: 'RAW_002',
        dataType: RawDataType.VIDEO_GAZE,
        timestamp: new Date(now.setHours(14, 15)),
        value: { stability: 0.4, attention: 0.3 },
        source: 'video_sensor'
    };
    PhysicsToAdviceMatchingEngine.ingestRawData(raw2);
    console.log(`  • ${raw2.dataType} at ${raw2.timestamp.toLocaleTimeString()}`);
    
    const raw3 = {
        id: 'RAW_003',
        dataType: RawDataType.BIO_HRV,
        timestamp: new Date(now.setHours(14, 30)),
        value: { hrv: 35, stressIndex: 0.8 },
        source: 'bio_sensor'
    };
    PhysicsToAdviceMatchingEngine.ingestRawData(raw3);
    console.log(`  • ${raw3.dataType} at ${raw3.timestamp.toLocaleTimeString()}`);
    
    // 물리량 영향 기록
    console.log('\n[물리량 영향 기록]');
    
    PhysicsToAdviceMatchingEngine.recordPhysicsImpact(
        'RAW_001', PhysicsMetric.STRESS, 0.3, 0.7,
        'Anxiety detected in voice tone'
    );
    PhysicsToAdviceMatchingEngine.recordPhysicsImpact(
        'RAW_001', PhysicsMetric.ENERGY, 0.6, 0.4,
        'Energy dropped due to stressed voice'
    );
    PhysicsToAdviceMatchingEngine.recordPhysicsImpact(
        'RAW_002', PhysicsMetric.ENERGY, 0.4, 0.25,
        'Low gaze stability reduced energy'
    );
    PhysicsToAdviceMatchingEngine.recordPhysicsImpact(
        'RAW_003', PhysicsMetric.STRESS, 0.7, 0.85,
        'Low HRV indicates high stress'
    );
    
    console.log('  • Audio → Stress: 0.3 → 0.7');
    console.log('  • Audio → Energy: 0.6 → 0.4');
    console.log('  • Video → Energy: 0.4 → 0.25');
    console.log('  • Bio → Stress: 0.7 → 0.85');
    
    // 노드 상태
    const nodeState = {
        color: 'RED',
        energy: 0.25,
        stress: 0.85,
        vibration: 0.6,
        momentum: 0.3,
        distanceFromCenter: 4.5,
        distanceIncreasing: true,
        engagement: 0.4
    };
    
    // 조언 획득
    console.log('\n[Motion-based Advice]');
    const advice = PhysicsToAdviceMatchingEngine.getAdvice(nodeState);
    console.log(`  Type: ${advice.advice.type}`);
    console.log(`  Title: ${advice.advice.title}`);
    console.log(`  Priority: ${advice.advice.priority}`);
    console.log('  Actions:');
    advice.advice.actions.slice(0, 3).forEach(a => console.log(`    • ${a}`));
    
    // 투명성 정보
    console.log('\n[Transparency Feature]');
    const transparency = PhysicsToAdviceMatchingEngine.getNodeTransparency('member_001', nodeState);
    console.log(`  User Message: ${transparency.userMessage}`);
    console.log(`  Confidence: ${(transparency.confidence * 100).toFixed(1)}%`);
    console.log('  Contributing Factors:');
    transparency.contributingFactors.slice(0, 3).forEach(f => {
        console.log(`    • ${f.dataType}: ${f.explanation}`);
    });
    
    // 계보 그래프
    console.log('\n[Data Lineage Graph]');
    const graph = PhysicsToAdviceMatchingEngine.exportLineageGraph();
    console.log(`  Nodes: ${graph.nodes.length}`);
    console.log(`  Edges: ${graph.edges.length}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Physics-to-Advice Matching Test Complete');
    
    return { advice, transparency, graph };
}

export default PhysicsToAdviceMatchingEngine;



