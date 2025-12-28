// ================================================================
// INTUITION PREDICTOR ENGINE (직관 예측 엔진)
// 패턴 학습 + 다음 행동 예측 + 이상 감지
// ================================================================

// ================================================================
// PATTERN MEMORY (패턴 기억)
// ================================================================

const PatternMemory = {
    patterns: [],
    sequences: [],
    maxPatterns: 500,
    maxSequences: 100,
    
    /**
     * 패턴 저장
     */
    store(pattern) {
        const signature = this.createSignature(pattern);
        
        const existing = this.patterns.find(p => p.signature === signature);
        
        if (existing) {
            existing.count++;
            existing.lastSeen = Date.now();
            existing.contexts.push(pattern.context);
            if (existing.contexts.length > 10) {
                existing.contexts.shift();
            }
        } else {
            this.patterns.push({
                signature,
                pattern,
                count: 1,
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                contexts: [pattern.context]
            });
        }
        
        // 크기 제한
        if (this.patterns.length > this.maxPatterns) {
            // 가장 오래되고 빈도 낮은 패턴 제거
            this.patterns.sort((a, b) => 
                (b.count * 0.7 + (b.lastSeen - a.lastSeen) / 86400000 * 0.3) -
                (a.count * 0.7 + (a.lastSeen - b.lastSeen) / 86400000 * 0.3)
            );
            this.patterns = this.patterns.slice(0, this.maxPatterns);
        }
    },
    
    /**
     * 시퀀스 저장 (연속 행동)
     */
    storeSequence(actions) {
        if (actions.length < 2) return;
        
        const sequenceKey = actions.map(a => a.type).join('->');
        
        const existing = this.sequences.find(s => s.key === sequenceKey);
        
        if (existing) {
            existing.count++;
            existing.lastSeen = Date.now();
        } else {
            this.sequences.push({
                key: sequenceKey,
                actions,
                count: 1,
                firstSeen: Date.now(),
                lastSeen: Date.now()
            });
        }
        
        if (this.sequences.length > this.maxSequences) {
            this.sequences.sort((a, b) => b.count - a.count);
            this.sequences = this.sequences.slice(0, this.maxSequences);
        }
    },
    
    /**
     * 패턴 시그니처 생성
     */
    createSignature(pattern) {
        return JSON.stringify({
            type: pattern.type,
            hour: pattern.hour,
            dayOfWeek: pattern.dayOfWeek,
            action: pattern.action
        });
    },
    
    /**
     * 유사 패턴 찾기
     */
    findSimilar(currentPattern, threshold = 0.7) {
        const currentSig = this.createSignature(currentPattern);
        
        return this.patterns
            .map(p => ({
                ...p,
                similarity: this.calculateSimilarity(currentSig, p.signature)
            }))
            .filter(p => p.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity);
    },
    
    /**
     * 유사도 계산
     */
    calculateSimilarity(sig1, sig2) {
        const obj1 = JSON.parse(sig1);
        const obj2 = JSON.parse(sig2);
        
        let matches = 0;
        let total = 0;
        
        Object.keys(obj1).forEach(key => {
            total++;
            if (obj1[key] === obj2[key]) matches++;
        });
        
        return total > 0 ? matches / total : 0;
    },
    
    /**
     * 가장 빈번한 패턴들
     */
    getTopPatterns(count = 10) {
        return this.patterns
            .sort((a, b) => b.count - a.count)
            .slice(0, count);
    },
    
    /**
     * 초기화
     */
    clear() {
        this.patterns = [];
        this.sequences = [];
    }
};

// ================================================================
// ACTION PREDICTOR (행동 예측)
// ================================================================

const ActionPredictor = {
    recentActions: [],
    maxRecent: 20,
    
    /**
     * 행동 기록
     */
    recordAction(action) {
        this.recentActions.push({
            ...action,
            timestamp: Date.now()
        });
        
        if (this.recentActions.length > this.maxRecent) {
            this.recentActions.shift();
        }
        
        // 시퀀스 저장
        if (this.recentActions.length >= 3) {
            PatternMemory.storeSequence(this.recentActions.slice(-3));
        }
    },
    
    /**
     * 다음 행동 예측
     */
    predictNext(context) {
        // 1. 현재 시퀀스와 매칭되는 과거 패턴 찾기
        const recentTypes = this.recentActions.slice(-2).map(a => a.type);
        const prefix = recentTypes.join('->');
        
        const matchingSequences = PatternMemory.sequences.filter(s => 
            s.key.startsWith(prefix) && s.key !== prefix
        );
        
        if (matchingSequences.length > 0) {
            // 가장 빈번한 다음 행동
            const topMatch = matchingSequences.sort((a, b) => b.count - a.count)[0];
            const nextAction = topMatch.key.split('->').slice(recentTypes.length)[0];
            
            return {
                action: nextAction,
                confidence: Math.min(topMatch.count / 10, 0.9),
                source: 'sequence',
                basedOn: topMatch.key
            };
        }
        
        // 2. 시간대 기반 예측
        const hour = new Date().getHours();
        const dayOfWeek = new Date().getDay();
        
        const timeBasedPatterns = PatternMemory.patterns.filter(p => 
            p.pattern.hour === hour || 
            Math.abs(p.pattern.hour - hour) <= 1
        );
        
        if (timeBasedPatterns.length > 0) {
            const topPattern = timeBasedPatterns.sort((a, b) => b.count - a.count)[0];
            
            return {
                action: topPattern.pattern.action,
                confidence: Math.min(topPattern.count / 20, 0.7),
                source: 'time_pattern',
                basedOn: `${topPattern.pattern.hour}시 패턴`
            };
        }
        
        // 3. 기본 예측
        return {
            action: 'unknown',
            confidence: 0.1,
            source: 'default',
            basedOn: null
        };
    },
    
    /**
     * 여러 예측 생성
     */
    predictMultiple(context, count = 3) {
        const predictions = [];
        const hour = new Date().getHours();
        
        // 시간대 기반 상위 패턴들
        const timePatterns = PatternMemory.patterns
            .filter(p => Math.abs(p.pattern.hour - hour) <= 2)
            .sort((a, b) => b.count - a.count)
            .slice(0, count);
        
        timePatterns.forEach((p, i) => {
            predictions.push({
                rank: i + 1,
                action: p.pattern.action,
                confidence: Math.min(p.count / 20, 0.9 - i * 0.2),
                reason: `${p.count}회 반복된 패턴`
            });
        });
        
        return predictions;
    }
};

// ================================================================
// ANOMALY DETECTOR (이상 감지)
// ================================================================

const AnomalyDetector = {
    baselines: {},
    
    /**
     * 기준선 업데이트
     */
    updateBaseline(metric, value) {
        if (!this.baselines[metric]) {
            this.baselines[metric] = {
                values: [],
                mean: value,
                stdDev: 0
            };
        }
        
        const baseline = this.baselines[metric];
        baseline.values.push(value);
        
        if (baseline.values.length > 100) {
            baseline.values.shift();
        }
        
        // 평균과 표준편차 재계산
        const sum = baseline.values.reduce((a, b) => a + b, 0);
        baseline.mean = sum / baseline.values.length;
        
        const squaredDiffs = baseline.values.map(v => Math.pow(v - baseline.mean, 2));
        baseline.stdDev = Math.sqrt(
            squaredDiffs.reduce((a, b) => a + b, 0) / baseline.values.length
        );
    },
    
    /**
     * 이상 여부 판단
     */
    isAnomaly(metric, value, threshold = 2) {
        const baseline = this.baselines[metric];
        
        if (!baseline || baseline.values.length < 10) {
            return { isAnomaly: false, reason: 'insufficient_data' };
        }
        
        const zScore = Math.abs((value - baseline.mean) / (baseline.stdDev || 1));
        
        return {
            isAnomaly: zScore > threshold,
            zScore,
            expectedRange: {
                min: baseline.mean - threshold * baseline.stdDev,
                max: baseline.mean + threshold * baseline.stdDev
            },
            deviation: value - baseline.mean
        };
    },
    
    /**
     * 다중 메트릭 이상 감지
     */
    detectAnomalies(metrics) {
        const anomalies = [];
        
        Object.entries(metrics).forEach(([metric, value]) => {
            if (typeof value === 'number') {
                this.updateBaseline(metric, value);
                
                const result = this.isAnomaly(metric, value);
                if (result.isAnomaly) {
                    anomalies.push({
                        metric,
                        value,
                        ...result
                    });
                }
            }
        });
        
        return anomalies;
    }
};

// ================================================================
// INSIGHT GENERATOR (인사이트 생성)
// ================================================================

const InsightGenerator = {
    /**
     * 인사이트 생성
     */
    generate(data) {
        const insights = [];
        
        // 1. 패턴 기반 인사이트
        const topPatterns = PatternMemory.getTopPatterns(3);
        if (topPatterns.length > 0) {
            insights.push({
                type: 'pattern',
                title: '주요 행동 패턴',
                content: `가장 빈번한 패턴: ${topPatterns[0].pattern.action} (${topPatterns[0].count}회)`,
                importance: 'medium'
            });
        }
        
        // 2. 이상 기반 인사이트
        if (data.anomalies?.length > 0) {
            insights.push({
                type: 'anomaly',
                title: '이상 감지',
                content: `${data.anomalies.length}개 지표에서 비정상 값 감지`,
                details: data.anomalies.map(a => `${a.metric}: ${a.value.toFixed(2)} (예상: ${a.expectedRange.min.toFixed(2)}-${a.expectedRange.max.toFixed(2)})`),
                importance: 'high'
            });
        }
        
        // 3. 예측 기반 인사이트
        if (data.prediction?.confidence > 0.5) {
            insights.push({
                type: 'prediction',
                title: '다음 행동 예측',
                content: `${data.prediction.action} 가능성 높음 (신뢰도: ${(data.prediction.confidence * 100).toFixed(0)}%)`,
                importance: 'low'
            });
        }
        
        // 4. 시간대 기반 인사이트
        const hour = new Date().getHours();
        if (hour >= 9 && hour < 11) {
            insights.push({
                type: 'timing',
                title: '골든 타임',
                content: '지금은 집중력이 가장 높은 시간대입니다',
                importance: 'medium'
            });
        } else if (hour >= 14 && hour < 15) {
            insights.push({
                type: 'timing',
                title: '식곤증 주의',
                content: '점심 후 졸음이 올 수 있는 시간입니다',
                importance: 'low'
            });
        }
        
        return insights.sort((a, b) => {
            const priority = { high: 0, medium: 1, low: 2 };
            return priority[a.importance] - priority[b.importance];
        });
    }
};

// ================================================================
// PHYSICS CONVERTER (물리 속성 변환)
// ================================================================

const IntuitionPhysicsConverter = {
    /**
     * 직관 데이터를 물리 속성으로 변환
     */
    convert(intuitionData) {
        const { patterns, prediction, anomalies, insights } = intuitionData;
        
        // 1. MASS = 학습된 패턴 양
        const patternCount = PatternMemory.patterns.length;
        const mass = Math.log10(patternCount + 1) * 10;
        
        // 2. ENERGY = 예측 신뢰도
        const energy = (prediction?.confidence || 0.1) * 100;
        
        // 3. ENTROPY = 이상 발생 정도
        const anomalyRatio = anomalies?.length / 10 || 0;
        const entropy = Math.min(anomalyRatio, 1);
        
        // 4. VELOCITY = 패턴 변화 속도
        const recentPatterns = PatternMemory.patterns.filter(p => 
            Date.now() - p.lastSeen < 24 * 60 * 60 * 1000
        ).length;
        const velocity = Math.min(recentPatterns / patternCount, 1) || 0;
        
        return {
            mass: Math.round(mass * 100) / 100,
            energy: Math.round(energy * 100) / 100,
            entropy: Math.round(entropy * 1000) / 1000,
            velocity: Math.round(velocity * 100) / 100,
            
            metadata: {
                totalPatterns: patternCount,
                recentPatterns,
                predictionConfidence: prediction?.confidence || 0,
                anomalyCount: anomalies?.length || 0,
                insightCount: insights?.length || 0
            },
            
            predictions: prediction,
            insights,
            
            analyzedAt: new Date().toISOString()
        };
    }
};

// ================================================================
// INTUITION PREDICTOR ENGINE (통합 엔진)
// ================================================================

export const IntuitionPredictor = {
    // 컴포넌트
    memory: PatternMemory,
    predictor: ActionPredictor,
    anomaly: AnomalyDetector,
    insight: InsightGenerator,
    converter: IntuitionPhysicsConverter,
    
    // 상태
    lastResult: null,
    
    /**
     * 행동 기록 및 학습
     */
    learn(action, context = {}) {
        const now = new Date();
        
        // 패턴 저장
        const pattern = {
            type: action.type,
            action: action.type,
            hour: now.getHours(),
            dayOfWeek: now.getDay(),
            context
        };
        
        this.memory.store(pattern);
        
        // 행동 기록
        this.predictor.recordAction(action);
        
        // 메트릭 업데이트 (이상 감지용)
        if (action.metrics) {
            Object.entries(action.metrics).forEach(([key, value]) => {
                this.anomaly.updateBaseline(key, value);
            });
        }
    },
    
    /**
     * 예측 및 분석
     */
    analyze(currentMetrics = {}) {
        // 다음 행동 예측
        const prediction = this.predictor.predictNext({});
        const predictions = this.predictor.predictMultiple({});
        
        // 이상 감지
        const anomalies = this.anomaly.detectAnomalies(currentMetrics);
        
        // 인사이트 생성
        const insights = this.insight.generate({
            patterns: this.memory.getTopPatterns(5),
            prediction,
            anomalies
        });
        
        const result = {
            prediction,
            predictions,
            anomalies,
            insights,
            patterns: {
                total: this.memory.patterns.length,
                top: this.memory.getTopPatterns(5).map(p => ({
                    action: p.pattern.action,
                    count: p.count
                }))
            }
        };
        
        // 물리 속성 변환
        result.physics = this.converter.convert(result);
        
        this.lastResult = result;
        
        return result;
    },
    
    /**
     * 빠른 예측 (학습 없이)
     */
    quickPredict() {
        return this.predictor.predictNext({});
    },
    
    /**
     * 요약 생성
     */
    generateSummary() {
        if (!this.lastResult) {
            this.analyze();
        }
        
        const r = this.lastResult;
        
        return {
            prediction: {
                nextAction: r.prediction?.action,
                confidence: `${((r.prediction?.confidence || 0) * 100).toFixed(0)}%`,
                source: r.prediction?.source
            },
            
            interpretation: {
                patterns: r.patterns.total > 50 
                    ? '📊 풍부한 패턴 학습'
                    : r.patterns.total > 20 
                        ? '📈 패턴 학습 중'
                        : '📝 패턴 수집 초기',
                
                prediction: r.prediction?.confidence > 0.7 
                    ? '🎯 높은 예측 신뢰도'
                    : r.prediction?.confidence > 0.4 
                        ? '👀 보통 예측 신뢰도'
                        : '❓ 낮은 예측 신뢰도',
                
                anomaly: r.anomalies?.length > 0 
                    ? `⚠️ ${r.anomalies.length}개 이상 감지`
                    : '✅ 정상 범위'
            },
            
            topPatterns: r.patterns.top,
            insights: r.insights
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            patternsLearned: this.memory.patterns.length,
            sequencesLearned: this.memory.sequences.length,
            recentActions: this.predictor.recentActions.length,
            baselineMetrics: Object.keys(this.anomaly.baselines).length,
            lastAnalysis: this.lastResult?.physics?.analyzedAt
        };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.memory.clear();
        this.predictor.recentActions = [];
        this.anomaly.baselines = {};
        this.lastResult = null;
    }
};

// ================================================================
// 테스트 함수
// ================================================================

export async function testIntuitionPredictor() {
    console.log('='.repeat(50));
    console.log('[TEST] IntuitionPredictor 테스트');
    console.log('='.repeat(50));
    
    // 초기화
    IntuitionPredictor.reset();
    
    // 행동 학습 시뮬레이션
    console.log('\n[TEST] 행동 학습:');
    
    const actions = [
        { type: 'login', metrics: { duration: 5 } },
        { type: 'check_email', metrics: { duration: 10 } },
        { type: 'write_report', metrics: { duration: 30 } },
        { type: 'meeting', metrics: { duration: 60 } },
        { type: 'check_email', metrics: { duration: 8 } },
        { type: 'write_report', metrics: { duration: 45 } },
        { type: 'check_email', metrics: { duration: 12 } },
        { type: 'logout', metrics: { duration: 2 } }
    ];
    
    actions.forEach(action => {
        IntuitionPredictor.learn(action);
        console.log(`- 학습: ${action.type}`);
    });
    
    // 분석
    console.log('\n[TEST] 분석 결과:');
    const result = IntuitionPredictor.analyze({
        duration: 100, // 이상값 테스트
        focus: 0.8
    });
    
    console.log('학습된 패턴 수:', result.patterns.total);
    console.log('예측 행동:', result.prediction.action);
    console.log('예측 신뢰도:', (result.prediction.confidence * 100).toFixed(0) + '%');
    console.log('이상 감지 수:', result.anomalies.length);
    
    // 물리 속성
    console.log('\n[TEST] 물리 속성:');
    console.log('Mass:', result.physics.mass);
    console.log('Energy:', result.physics.energy);
    console.log('Entropy:', result.physics.entropy);
    console.log('Velocity:', result.physics.velocity);
    
    // 인사이트
    console.log('\n[TEST] 인사이트:');
    result.insights.forEach(i => {
        console.log(`- [${i.importance}] ${i.title}: ${i.content}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('[TEST] 완료!');
    console.log('='.repeat(50));
    
    return result;
}

// ================================================================
// EXPORTS
// ================================================================

export { 
    PatternMemory, 
    ActionPredictor, 
    AnomalyDetector, 
    InsightGenerator,
    IntuitionPhysicsConverter 
};

export default IntuitionPredictor;




