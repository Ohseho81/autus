// ================================================================
// AUTUS ANALYSIS ENGINE (BEZOS EDITION)
// 진단 및 처방 시스템
// 
// 기능:
// 1. Anomaly Detection - 이상 징후 자동 감지
// 2. Multi-Sensor Correlation - 다중 센서 상관관계 분석
// 3. Vector Prescription - 자동 처방 생성
//
// Version: 2.0.0
// Status: LOCKED
// ================================================================

// ================================================================
// ENUMS
// ================================================================

export const AlertSeverity = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    CRITICAL: 'CRITICAL',
    EMERGENCY: 'EMERGENCY'
};

export const SensorType = {
    // Internal Sensors
    ENERGY: 'ENERGY',
    INERTIA: 'INERTIA',
    DENSITY: 'DENSITY',
    SIGMA: 'SIGMA',
    MOMENTUM: 'MOMENTUM',
    
    // External Sensors
    VOICE_SENTIMENT: 'VOICE_SENTIMENT',
    CALENDAR_LOAD: 'CALENDAR_LOAD',
    FINANCIAL_STRESS: 'FINANCIAL_STRESS',
    SCREEN_TIME: 'SCREEN_TIME',
    SLEEP_QUALITY: 'SLEEP_QUALITY',
    
    // Environment Sensors
    COMPETITOR_EVENT: 'COMPETITOR_EVENT',
    MARKET_SHIFT: 'MARKET_SHIFT',
    NETWORK_CHANGE: 'NETWORK_CHANGE'
};

export const PrescriptionType = {
    ENERGY_BOOST: 'ENERGY_BOOST',
    INERTIA_CORRECTION: 'INERTIA_CORRECTION',
    NODE_CULLING: 'NODE_CULLING',
    RESOURCE_REALLOCATION: 'RESOURCE_REALLOCATION',
    CONSTRAINT_TIGHTENING: 'CONSTRAINT_TIGHTENING',
    RECOVERY_PROTOCOL: 'RECOVERY_PROTOCOL',
    EMERGENCY_STOP: 'EMERGENCY_STOP'
};

// ================================================================
// THRESHOLDS (Bezos Standards)
// ================================================================

export const THRESHOLDS = {
    inertia_delta_critical: 0.30,     // 30% 이상 변화 = 위험
    energy_low: 0.20,                  // 20% 이하 = 위험
    energy_critical: 0.10,             // 10% 이하 = 긴급
    sigma_high: 0.70,                  // 70% 이상 = 불안정
    density_low: 0.30,                 // 30% 이하 = 저밀도
    momentum_stall: 0.15,              // 15% 이하 = 정체
    correlation_significant: 0.60,     // 상관계수 60% 이상 = 유의미
};

// ================================================================
// 1. ANOMALY DETECTOR
// ================================================================

export const AnomalyDetector = {
    anomalyHistory: [],
    sensorHistory: {},
    
    /**
     * 센서 측정값 기록
     */
    recordReading(reading) {
        const { sensorType, value } = reading;
        
        if (!this.sensorHistory[sensorType]) {
            this.sensorHistory[sensorType] = [];
        }
        
        const history = this.sensorHistory[sensorType];
        
        // Delta 계산
        if (history.length > 0) {
            const prev = history[history.length - 1].value;
            reading.delta = (value - prev) / Math.max(prev, 0.01);
            
            // Trend 결정
            if (reading.delta > 0.05) {
                reading.trend = 'rising';
            } else if (reading.delta < -0.05) {
                reading.trend = 'falling';
            } else {
                reading.trend = 'stable';
            }
        } else {
            reading.delta = 0;
            reading.trend = 'stable';
        }
        
        reading.timestamp = Date.now();
        history.push(reading);
        
        // 최근 100개만 유지
        if (history.length > 100) {
            this.sensorHistory[sensorType] = history.slice(-100);
        }
        
        return reading;
    },
    
    /**
     * 이상 징후 감지
     */
    detectAnomaly(reading) {
        let anomaly = null;
        const timestamp = Date.now();
        
        // Rule 1: Inertia Delta 검사
        if (reading.sensorType === SensorType.INERTIA) {
            if (Math.abs(reading.delta) > THRESHOLDS.inertia_delta_critical) {
                anomaly = {
                    id: `ANM_${timestamp}`,
                    sensorType: reading.sensorType,
                    severity: AlertSeverity.CRITICAL,
                    value: reading.delta,
                    threshold: THRESHOLDS.inertia_delta_critical,
                    message: `⚠️ INERTIA DELTA CRITICAL: ${(reading.delta * 100).toFixed(1)}% 변화 감지. 즉각 대응 필요.`,
                    timestamp,
                    rootCauses: []
                };
            }
        }
        
        // Rule 2: Energy 검사
        else if (reading.sensorType === SensorType.ENERGY) {
            if (reading.value < THRESHOLDS.energy_critical) {
                anomaly = {
                    id: `ANM_${timestamp}`,
                    sensorType: reading.sensorType,
                    severity: AlertSeverity.EMERGENCY,
                    value: reading.value,
                    threshold: THRESHOLDS.energy_critical,
                    message: `🚨 ENERGY EMERGENCY: ${(reading.value * 100).toFixed(1)}%. 즉시 자원 투입 필요.`,
                    timestamp,
                    rootCauses: []
                };
            } else if (reading.value < THRESHOLDS.energy_low) {
                anomaly = {
                    id: `ANM_${timestamp}`,
                    sensorType: reading.sensorType,
                    severity: AlertSeverity.WARNING,
                    value: reading.value,
                    threshold: THRESHOLDS.energy_low,
                    message: `⚠️ ENERGY LOW: ${(reading.value * 100).toFixed(1)}%. 자원 재배분 권고.`,
                    timestamp,
                    rootCauses: []
                };
            }
        }
        
        // Rule 3: Sigma 검사
        else if (reading.sensorType === SensorType.SIGMA) {
            if (reading.value > THRESHOLDS.sigma_high) {
                anomaly = {
                    id: `ANM_${timestamp}`,
                    sensorType: reading.sensorType,
                    severity: AlertSeverity.WARNING,
                    value: reading.value,
                    threshold: THRESHOLDS.sigma_high,
                    message: `⚠️ HIGH ENTROPY: σ=${(reading.value * 100).toFixed(1)}%. 시스템 불안정.`,
                    timestamp,
                    rootCauses: []
                };
            }
        }
        
        // Rule 4: Density 검사
        else if (reading.sensorType === SensorType.DENSITY) {
            if (reading.value < THRESHOLDS.density_low) {
                anomaly = {
                    id: `ANM_${timestamp}`,
                    sensorType: reading.sensorType,
                    severity: AlertSeverity.WARNING,
                    value: reading.value,
                    threshold: THRESHOLDS.density_low,
                    message: `⚠️ LOW DENSITY: ${(reading.value * 100).toFixed(1)}%. 목표 달성 위험.`,
                    timestamp,
                    rootCauses: []
                };
            }
        }
        
        // Rule 5: Momentum 검사
        else if (reading.sensorType === SensorType.MOMENTUM) {
            if (reading.value < THRESHOLDS.momentum_stall) {
                anomaly = {
                    id: `ANM_${timestamp}`,
                    sensorType: reading.sensorType,
                    severity: AlertSeverity.WARNING,
                    value: reading.value,
                    threshold: THRESHOLDS.momentum_stall,
                    message: `⚠️ MOMENTUM STALL: ${(reading.value * 100).toFixed(1)}%. 진행 정체.`,
                    timestamp,
                    rootCauses: []
                };
            }
        }
        
        if (anomaly) {
            this.anomalyHistory.push(anomaly);
        }
        
        return anomaly;
    },
    
    /**
     * 최근 N시간 내 이상 징후 조회
     */
    getActiveAnomalies(maxAgeHours = 24) {
        const cutoff = Date.now() - (maxAgeHours * 3600 * 1000);
        return this.anomalyHistory.filter(a => a.timestamp > cutoff);
    },
    
    /**
     * 초기화
     */
    reset() {
        this.anomalyHistory = [];
        this.sensorHistory = {};
    }
};

// ================================================================
// 2. CORRELATION ENGINE
// ================================================================

export const CorrelationEngine = {
    correlations: [],
    
    // 알려진 상관관계 매트릭스
    KNOWN_CORRELATIONS: {
        [`${SensorType.VOICE_SENTIMENT}_${SensorType.ENERGY}`]: {
            expectedCoefficient: 0.75,
            causality: 'a->b',
            interpretation: '음성 감정 악화 → 에너지 저하'
        },
        [`${SensorType.VOICE_SENTIMENT}_${SensorType.COMPETITOR_EVENT}`]: {
            expectedCoefficient: -0.65,
            causality: 'b->a',
            interpretation: '경쟁사 이벤트 → 음성 감정 악화'
        },
        [`${SensorType.SCREEN_TIME}_${SensorType.ENERGY}`]: {
            expectedCoefficient: -0.70,
            causality: 'a->b',
            interpretation: '스크린 타임 증가 → 에너지 감소'
        },
        [`${SensorType.SLEEP_QUALITY}_${SensorType.DENSITY}`]: {
            expectedCoefficient: 0.80,
            causality: 'a->b',
            interpretation: '수면 품질 → 밀도(생산성)'
        },
        [`${SensorType.FINANCIAL_STRESS}_${SensorType.SIGMA}`]: {
            expectedCoefficient: 0.85,
            causality: 'a->b',
            interpretation: '재정 스트레스 → 엔트로피 증가'
        },
        [`${SensorType.CALENDAR_LOAD}_${SensorType.MOMENTUM}`]: {
            expectedCoefficient: -0.60,
            causality: 'a->b',
            interpretation: '일정 과부하 → 모멘텀 감소'
        }
    },
    
    /**
     * 피어슨 상관계수 계산
     */
    pearsonCorrelation(x, y) {
        const n = x.length;
        if (n === 0) return 0;
        
        const meanX = x.reduce((a, b) => a + b, 0) / n;
        const meanY = y.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let sumXSq = 0;
        let sumYSq = 0;
        
        for (let i = 0; i < n; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            numerator += dx * dy;
            sumXSq += dx * dx;
            sumYSq += dy * dy;
        }
        
        const stdX = Math.sqrt(sumXSq);
        const stdY = Math.sqrt(sumYSq);
        
        if (stdX === 0 || stdY === 0) return 0;
        
        return numerator / (stdX * stdY);
    },
    
    /**
     * 두 센서 간 상관계수 계산
     */
    calculateCorrelation(sensorA, sensorB, detector) {
        const historyA = detector.sensorHistory[sensorA] || [];
        const historyB = detector.sensorHistory[sensorB] || [];
        
        if (historyA.length < 5 || historyB.length < 5) {
            return null;
        }
        
        // 최근 값들로 상관계수 계산
        const valuesA = historyA.slice(-20).map(r => r.value);
        const valuesB = historyB.slice(-20).map(r => r.value);
        
        // 길이 맞추기
        const minLen = Math.min(valuesA.length, valuesB.length);
        const coefficient = this.pearsonCorrelation(
            valuesA.slice(0, minLen),
            valuesB.slice(0, minLen)
        );
        
        // 알려진 상관관계 조회
        let known = this.KNOWN_CORRELATIONS[`${sensorA}_${sensorB}`];
        if (!known) {
            known = this.KNOWN_CORRELATIONS[`${sensorB}_${sensorA}`];
        }
        
        const causality = known?.causality || 'unknown';
        const interpretation = known?.interpretation || `${sensorA}과 ${sensorB} 간 상관관계 발견`;
        const significance = Math.abs(coefficient);
        
        const correlation = {
            sensorA,
            sensorB,
            coefficient,
            causalityDirection: causality,
            significance,
            interpretation
        };
        
        if (significance >= THRESHOLDS.correlation_significant) {
            this.correlations.push(correlation);
        }
        
        return correlation;
    },
    
    /**
     * 이상 징후의 근본 원인 탐색
     */
    findRootCause(anomaly, detector) {
        const rootCauses = [];
        
        Object.entries(this.KNOWN_CORRELATIONS).forEach(([key, known]) => {
            const [sensorA, sensorB] = key.split('_');
            
            if (sensorB === anomaly.sensorType && 
                (known.causality === 'a->b' || known.causality === 'bidirectional')) {
                const history = detector.sensorHistory[sensorA];
                if (history && history.length > 0) {
                    const latest = history[history.length - 1];
                    rootCauses.push({
                        sensor: sensorA,
                        description: `${known.interpretation} (현재값: ${(latest.value * 100).toFixed(1)}%)`
                    });
                }
            } else if (sensorA === anomaly.sensorType && 
                       (known.causality === 'b->a' || known.causality === 'bidirectional')) {
                const history = detector.sensorHistory[sensorB];
                if (history && history.length > 0) {
                    const latest = history[history.length - 1];
                    rootCauses.push({
                        sensor: sensorB,
                        description: `${known.interpretation} (현재값: ${(latest.value * 100).toFixed(1)}%)`
                    });
                }
            }
        });
        
        return rootCauses;
    },
    
    reset() {
        this.correlations = [];
    }
};

// ================================================================
// 3. PRESCRIPTION ENGINE
// ================================================================

export const PrescriptionEngine = {
    // 처방 액션 팩 정의
    ACTION_PACKS: {
        ENERGY_EMERGENCY: {
            id: 'AP_001',
            name: '에너지 긴급 충전',
            prescriptionType: PrescriptionType.ENERGY_BOOST,
            actions: [
                '즉시 모든 비필수 활동 중단',
                '15분 회복 휴식 실행',
                '에너지 슬롯에 자원 50% 재배치',
                '다음 24시간 일정 50% 축소'
            ],
            expectedImpact: { energy: 0.30, sigma: -0.10 },
            priority: 10,
            durationHours: 24
        },
        INERTIA_CORRECTION: {
            id: 'AP_002',
            name: '관성 교정 프로토콜',
            prescriptionType: PrescriptionType.INERTIA_CORRECTION,
            actions: [
                '현재 진행 중인 모든 작업 일시 정지',
                '목표 재검토 및 우선순위 재설정',
                '상위 3개 기생 노드 즉시 제거',
                'Constraint 슬롯 강화 (+20%)'
            ],
            expectedImpact: { inertia: -0.25, density: 0.15 },
            priority: 9,
            durationHours: 48
        },
        NODE_CULLING: {
            id: 'AP_003',
            name: '노드 정리 작전',
            prescriptionType: PrescriptionType.NODE_CULLING,
            actions: [
                '기여도 하위 20% 노드 목록 생성',
                '각 노드에 대해 Cut/Fade 결정',
                '제거된 노드의 자원을 핵심 노드로 재배치',
                '72시간 후 효과 측정'
            ],
            expectedImpact: { sigma: -0.20, density: 0.10 },
            priority: 7,
            durationHours: 72
        },
        RESOURCE_REALLOCATION: {
            id: 'AP_004',
            name: '자원 재배분',
            prescriptionType: PrescriptionType.RESOURCE_REALLOCATION,
            actions: [
                '현재 만다라 배분 분석',
                'ROI 낮은 슬롯 식별',
                '에너지/패턴 슬롯으로 자원 이동',
                '48시간 후 Density 변화 측정'
            ],
            expectedImpact: { energy: 0.15, density: 0.10 },
            priority: 6,
            durationHours: 48
        },
        CONSTRAINT_TIGHTENING: {
            id: 'AP_005',
            name: '제약 강화',
            prescriptionType: PrescriptionType.CONSTRAINT_TIGHTENING,
            actions: [
                '목표 Volume 10% 축소',
                '불필요한 옵션 제거',
                '집중 시간 블록 설정',
                '방해 요소 물리적 차단'
            ],
            expectedImpact: { sigma: -0.15, stability: 0.20 },
            priority: 5,
            durationHours: 24
        },
        RECOVERY_PROTOCOL: {
            id: 'AP_006',
            name: '회복 프로토콜',
            prescriptionType: PrescriptionType.RECOVERY_PROTOCOL,
            actions: [
                '8시간 수면 확보',
                '운동 30분 실행',
                '디지털 디톡스 2시간',
                '목표 재확인 세션 진행'
            ],
            expectedImpact: { energy: 0.25, sigma: -0.10, stability: 0.15 },
            priority: 4,
            durationHours: 24
        }
    },
    
    // 진단-처방 매핑
    DIAGNOSIS_TO_PRESCRIPTION: {
        [`${SensorType.ENERGY}_${AlertSeverity.EMERGENCY}`]: ['ENERGY_EMERGENCY'],
        [`${SensorType.ENERGY}_${AlertSeverity.WARNING}`]: ['RESOURCE_REALLOCATION', 'RECOVERY_PROTOCOL'],
        [`${SensorType.INERTIA}_${AlertSeverity.CRITICAL}`]: ['INERTIA_CORRECTION', 'CONSTRAINT_TIGHTENING'],
        [`${SensorType.SIGMA}_${AlertSeverity.WARNING}`]: ['NODE_CULLING', 'CONSTRAINT_TIGHTENING'],
        [`${SensorType.DENSITY}_${AlertSeverity.WARNING}`]: ['RESOURCE_REALLOCATION', 'INERTIA_CORRECTION'],
        [`${SensorType.MOMENTUM}_${AlertSeverity.WARNING}`]: ['INERTIA_CORRECTION', 'RECOVERY_PROTOCOL']
    },
    
    /**
     * 처방 생성
     */
    generatePrescription(anomaly, correlationEngine, detector) {
        // 1. 근본 원인 분석
        const rootCauses = correlationEngine.findRootCause(anomaly, detector);
        const rootCauseStr = rootCauses.length > 0 
            ? rootCauses.map(rc => rc.description).join('; ')
            : '직접적 원인';
        
        // 2. 처방 액션 팩 선택
        const key = `${anomaly.sensorType}_${anomaly.severity}`;
        const packIds = this.DIAGNOSIS_TO_PRESCRIPTION[key] || ['RESOURCE_REALLOCATION'];
        
        const actionPacks = packIds
            .filter(pid => this.ACTION_PACKS[pid])
            .map(pid => this.ACTION_PACKS[pid]);
        
        // 3. Success Vector 계산
        const successVector = this.calculateSuccessVector(anomaly, actionPacks);
        
        // 4. 진단 메시지 생성
        const diagnosis = this.generateDiagnosis(anomaly, rootCauses);
        
        // 5. 신뢰도 계산
        const confidence = this.calculateConfidence(anomaly, rootCauses);
        
        // 6. 긴급도 결정
        const urgency = this.determineUrgency(anomaly);
        
        return {
            anomalyId: anomaly.id,
            diagnosis,
            rootCause: rootCauseStr,
            actionPacks,
            successVector,
            confidence,
            urgency
        };
    },
    
    /**
     * 성공 방향 벡터 계산
     */
    calculateSuccessVector(anomaly, actionPacks) {
        const vector = {
            energy_direction: 0,
            density_direction: 0,
            sigma_direction: 0,
            stability_direction: 0,
            inertia_direction: 0
        };
        
        // 각 액션 팩의 예상 효과 합산
        actionPacks.forEach(pack => {
            Object.entries(pack.expectedImpact).forEach(([metric, impact]) => {
                const key = `${metric}_direction`;
                if (vector[key] !== undefined) {
                    vector[key] += impact;
                }
            });
        });
        
        // 정규화
        const maxVal = Math.max(...Object.values(vector).map(Math.abs)) || 1;
        Object.keys(vector).forEach(k => {
            vector[k] = vector[k] / maxVal;
        });
        
        return vector;
    },
    
    /**
     * 진단 메시지 생성
     */
    generateDiagnosis(anomaly, rootCauses) {
        const base = `[${anomaly.severity}] ${anomaly.sensorType} 이상 감지`;
        
        if (rootCauses.length > 0) {
            const causes = rootCauses.map(rc => rc.sensor).join(', ');
            return `${base}\n원인 추정: ${causes}`;
        }
        
        return base;
    },
    
    /**
     * 처방 신뢰도 계산
     */
    calculateConfidence(anomaly, rootCauses) {
        let baseConfidence = 0.5;
        
        // 근본 원인이 명확할수록 신뢰도 상승
        baseConfidence += 0.1 * rootCauses.length;
        
        // 심각도가 높을수록 처방 신뢰도 상승
        const severityBoost = {
            [AlertSeverity.INFO]: 0,
            [AlertSeverity.WARNING]: 0.1,
            [AlertSeverity.CRITICAL]: 0.2,
            [AlertSeverity.EMERGENCY]: 0.3
        };
        baseConfidence += severityBoost[anomaly.severity] || 0;
        
        return Math.min(baseConfidence, 0.95);
    },
    
    /**
     * 긴급도 결정
     */
    determineUrgency(anomaly) {
        const urgencyMap = {
            [AlertSeverity.INFO]: '낮음 - 모니터링 권장',
            [AlertSeverity.WARNING]: '중간 - 24시간 내 대응 필요',
            [AlertSeverity.CRITICAL]: '높음 - 즉시 대응 필요',
            [AlertSeverity.EMERGENCY]: '긴급 - 모든 것을 멈추고 대응'
        };
        return urgencyMap[anomaly.severity] || '중간';
    }
};

// ================================================================
// INTEGRATED ANALYSIS ENGINE
// ================================================================

export const AnalysisEngine = {
    detector: AnomalyDetector,
    correlation: CorrelationEngine,
    prescription: PrescriptionEngine,
    
    /**
     * 센서 측정값 처리 및 필요시 처방 생성
     */
    processReading(sensorType, value) {
        const reading = {
            sensorType,
            value,
            timestamp: Date.now(),
            delta: 0,
            trend: 'stable'
        };
        
        // 1. 기록
        this.detector.recordReading(reading);
        
        // 2. 이상 감지
        const anomaly = this.detector.detectAnomaly(reading);
        
        if (anomaly) {
            // 3. 상관관계 분석
            Object.values(SensorType).forEach(otherSensor => {
                if (otherSensor !== sensorType) {
                    this.correlation.calculateCorrelation(sensorType, otherSensor, this.detector);
                }
            });
            
            // 4. 처방 생성
            const prescription = this.prescription.generatePrescription(
                anomaly, 
                this.correlation, 
                this.detector
            );
            
            return prescription;
        }
        
        return null;
    },
    
    /**
     * UI에서 Physics Map에 표시할 Success Vector 반환
     */
    getSuccessVectorForUI() {
        const activeAnomalies = this.detector.getActiveAnomalies(1);
        
        if (activeAnomalies.length === 0) {
            return {
                direction: [0, 0, 1],
                magnitude: 0.5,
                color: '#00FFCC',
                label: '안정 상태'
            };
        }
        
        // 가장 심각한 이상 징후에 대한 처방
        const severityOrder = { INFO: 0, WARNING: 1, CRITICAL: 2, EMERGENCY: 3 };
        const mostSevere = activeAnomalies.reduce((a, b) => 
            severityOrder[a.severity] > severityOrder[b.severity] ? a : b
        );
        
        const prescription = this.prescription.generatePrescription(
            mostSevere,
            this.correlation,
            this.detector
        );
        
        // 벡터를 3D로 변환
        const vec = prescription.successVector;
        let direction = [
            (vec.energy_direction || 0) + (vec.density_direction || 0),
            (vec.stability_direction || 0) - (vec.sigma_direction || 0),
            vec.inertia_direction || 0
        ];
        
        // 정규화
        let magnitude = Math.sqrt(direction.reduce((s, d) => s + d * d, 0)) || 1;
        direction = direction.map(d => d / magnitude);
        
        // 색상 결정
        const colorMap = {
            [AlertSeverity.INFO]: '#00FFCC',
            [AlertSeverity.WARNING]: '#FF8800',
            [AlertSeverity.CRITICAL]: '#FF4444',
            [AlertSeverity.EMERGENCY]: '#FF0000'
        };
        
        return {
            direction,
            magnitude: Math.min(magnitude, 1.0),
            color: colorMap[mostSevere.severity] || '#00FFCC',
            label: prescription.urgency
        };
    },
    
    /**
     * 전체 상태 요약
     */
    getSummary() {
        const activeAnomalies = this.detector.getActiveAnomalies(24);
        const correlations = this.correlation.correlations;
        
        return {
            anomalyCount: activeAnomalies.length,
            anomalies: activeAnomalies.map(a => ({
                severity: a.severity,
                sensor: a.sensorType,
                message: a.message
            })),
            correlationCount: correlations.length,
            topCorrelations: correlations.slice(-5).map(c => ({
                sensors: `${c.sensorA} ↔ ${c.sensorB}`,
                coefficient: c.coefficient.toFixed(2),
                interpretation: c.interpretation
            })),
            successVector: this.getSuccessVectorForUI()
        };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.detector.reset();
        this.correlation.reset();
    }
};

// ================================================================
// TEST
// ================================================================

export function testAnalysisEngine() {
    console.log('='.repeat(70));
    console.log('AUTUS Analysis Engine Test (Bezos Edition)');
    console.log('='.repeat(70));
    
    AnalysisEngine.reset();
    
    // 시뮬레이션: 센서 데이터 스트림
    const testData = [
        { sensor: SensorType.ENERGY, value: 0.65 },
        { sensor: SensorType.ENERGY, value: 0.55 },
        { sensor: SensorType.ENERGY, value: 0.45 },
        { sensor: SensorType.ENERGY, value: 0.30 },
        { sensor: SensorType.ENERGY, value: 0.18 },  // WARNING 트리거
        { sensor: SensorType.VOICE_SENTIMENT, value: 0.3 },
        { sensor: SensorType.COMPETITOR_EVENT, value: 0.8 },
        { sensor: SensorType.INERTIA, value: 0.5 },
        { sensor: SensorType.INERTIA, value: 0.75 }  // 50% 변화 - CRITICAL
    ];
    
    console.log('\n[센서 데이터 스트림 처리]');
    
    testData.forEach(({ sensor, value }) => {
        const result = AnalysisEngine.processReading(sensor, value);
        
        if (result) {
            console.log('\n' + '='.repeat(50));
            console.log('🚨 PRESCRIPTION GENERATED');
            console.log('='.repeat(50));
            console.log('진단:', result.diagnosis);
            console.log('근본 원인:', result.rootCause);
            console.log('긴급도:', result.urgency);
            console.log('신뢰도:', (result.confidence * 100).toFixed(1) + '%');
            console.log('\n처방 액션:');
            result.actionPacks.forEach(pack => {
                console.log(`  [${pack.name}]`);
                pack.actions.forEach(action => {
                    console.log(`    • ${action}`);
                });
            });
            console.log('\nSuccess Vector:', result.successVector);
        }
    });
    
    // UI용 Success Vector
    console.log('\n[UI Success Vector]');
    const uiVector = AnalysisEngine.getSuccessVectorForUI();
    console.log('  Direction:', uiVector.direction);
    console.log('  Magnitude:', uiVector.magnitude.toFixed(2));
    console.log('  Color:', uiVector.color);
    console.log('  Label:', uiVector.label);
    
    // 요약
    console.log('\n[Summary]');
    const summary = AnalysisEngine.getSummary();
    console.log('  Anomalies:', summary.anomalyCount);
    console.log('  Correlations:', summary.correlationCount);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Analysis Engine Test Complete');
    
    return summary;
}

export default AnalysisEngine;




