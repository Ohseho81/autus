// ================================================================
// BIO MONITOR ENGINE (생체 모니터 엔진)
// Web Bluetooth API + 활동 기반 생체 추정
// ================================================================

// ================================================================
// BLUETOOTH HEART RATE MONITOR
// ================================================================

const BluetoothHeartRate = {
    device: null,
    server: null,
    characteristic: null,
    isConnected: false,
    lastReading: null,
    onReading: null,
    
    /**
     * 심박수 모니터 연결
     */
    async connect() {
        if (!navigator.bluetooth) {
            throw new Error('Web Bluetooth API가 지원되지 않습니다');
        }
        
        try {
            console.log('[BluetoothHR] 기기 검색 중...');
            
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['heart_rate'] }],
                optionalServices: ['battery_service']
            });
            
            console.log('[BluetoothHR] 기기 연결:', this.device.name);
            
            this.server = await this.device.gatt.connect();
            const service = await this.server.getPrimaryService('heart_rate');
            this.characteristic = await service.getCharacteristic('heart_rate_measurement');
            
            // 알림 구독
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', 
                (e) => this.handleReading(e));
            
            this.isConnected = true;
            console.log('[BluetoothHR] 연결 완료');
            
            return true;
        } catch (err) {
            console.error('[BluetoothHR] 연결 실패:', err);
            throw err;
        }
    },
    
    /**
     * 심박수 데이터 처리
     */
    handleReading(event) {
        const value = event.target.value;
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        
        let heartRate;
        if (rate16Bits) {
            heartRate = value.getUint16(1, true);
        } else {
            heartRate = value.getUint8(1);
        }
        
        this.lastReading = {
            heartRate,
            timestamp: Date.now()
        };
        
        if (this.onReading) {
            this.onReading(this.lastReading);
        }
    },
    
    /**
     * 연결 해제
     */
    disconnect() {
        if (this.device?.gatt?.connected) {
            this.device.gatt.disconnect();
        }
        this.isConnected = false;
        console.log('[BluetoothHR] 연결 해제');
    }
};

// ================================================================
// ACTIVITY BASED ESTIMATOR (활동 기반 생체 추정)
// ================================================================

const ActivityEstimator = {
    activityHistory: [],
    baselineHR: 72, // 기본 심박수
    
    /**
     * 활동 기록 추가
     */
    recordActivity(type, intensity = 0.5) {
        this.activityHistory.push({
            type,
            intensity,
            timestamp: Date.now()
        });
        
        // 최근 100개만 유지
        if (this.activityHistory.length > 100) {
            this.activityHistory.shift();
        }
    },
    
    /**
     * 현재 활동 수준 계산
     */
    getCurrentActivityLevel() {
        const recentWindow = 5 * 60 * 1000; // 5분
        const cutoff = Date.now() - recentWindow;
        
        const recent = this.activityHistory.filter(a => a.timestamp > cutoff);
        
        if (recent.length === 0) return 0.3; // 기본 낮은 활동
        
        const avgIntensity = recent.reduce((a, b) => a + b.intensity, 0) / recent.length;
        return avgIntensity;
    },
    
    /**
     * 심박수 추정
     */
    estimateHeartRate() {
        const activity = this.getCurrentActivityLevel();
        
        // 활동에 따른 심박수 증가 (최대 180)
        const estimatedHR = this.baselineHR + (activity * 80);
        
        // 랜덤 변동 추가 (자연스러움)
        const variation = (Math.random() - 0.5) * 10;
        
        return {
            heartRate: Math.round(estimatedHR + variation),
            confidence: 0.4, // 추정값이므로 낮은 신뢰도
            source: 'estimated',
            activityLevel: activity
        };
    },
    
    /**
     * 스트레스 레벨 추정
     */
    estimateStress() {
        const activity = this.getCurrentActivityLevel();
        const recent = this.activityHistory.slice(-20);
        
        // 활동 변동성 계산
        let variability = 0;
        if (recent.length > 1) {
            const intensities = recent.map(a => a.intensity);
            const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
            variability = Math.sqrt(
                intensities.reduce((sq, i) => sq + Math.pow(i - mean, 2), 0) / intensities.length
            );
        }
        
        // 스트레스 = 높은 활동 + 높은 변동성
        const stressLevel = (activity * 0.4 + variability * 0.6);
        
        let status;
        if (stressLevel > 0.7) status = 'HIGH';
        else if (stressLevel > 0.4) status = 'MODERATE';
        else status = 'LOW';
        
        return {
            level: Math.round(stressLevel * 100) / 100,
            status,
            factors: {
                activity,
                variability
            }
        };
    },
    
    /**
     * 에너지 레벨 추정
     */
    estimateEnergy() {
        const hourOfDay = new Date().getHours();
        const activity = this.getCurrentActivityLevel();
        
        // 시간대별 기본 에너지 곡선
        let baseEnergy;
        if (hourOfDay >= 6 && hourOfDay < 10) baseEnergy = 0.7;      // 아침
        else if (hourOfDay >= 10 && hourOfDay < 14) baseEnergy = 0.9; // 오전
        else if (hourOfDay >= 14 && hourOfDay < 17) baseEnergy = 0.6; // 오후 졸음
        else if (hourOfDay >= 17 && hourOfDay < 21) baseEnergy = 0.8; // 저녁
        else baseEnergy = 0.4; // 밤
        
        // 활동에 따른 조정
        const energyLevel = (baseEnergy * 0.6 + activity * 0.4);
        
        let status;
        if (energyLevel > 0.7) status = 'HIGH';
        else if (energyLevel > 0.4) status = 'MODERATE';
        else status = 'LOW';
        
        return {
            level: Math.round(energyLevel * 100) / 100,
            status,
            factors: {
                timeOfDay: hourOfDay,
                activity
            }
        };
    },
    
    /**
     * 피로도 추정
     */
    estimateFatigue() {
        const recentActivity = this.activityHistory.filter(
            a => a.timestamp > Date.now() - 60 * 60 * 1000 // 1시간
        );
        
        // 지속적인 높은 활동 = 피로
        const sustainedHighActivity = recentActivity.filter(a => a.intensity > 0.7).length;
        const fatigueLevel = Math.min(sustainedHighActivity / 20, 1);
        
        return {
            level: Math.round(fatigueLevel * 100) / 100,
            status: fatigueLevel > 0.6 ? 'FATIGUED' : fatigueLevel > 0.3 ? 'MODERATE' : 'RESTED',
            recommendation: fatigueLevel > 0.6 
                ? '휴식을 취하세요' 
                : fatigueLevel > 0.3 
                    ? '가벼운 스트레칭을 권장합니다'
                    : '컨디션이 좋습니다'
        };
    }
};

// ================================================================
// WELLNESS CALCULATOR (웰니스 계산)
// ================================================================

const WellnessCalculator = {
    /**
     * 종합 웰니스 점수 계산
     */
    calculate(bioData) {
        const { heartRate, stress, energy, fatigue } = bioData;
        
        // 각 요소 점수화 (0-100)
        let heartRateScore = 100;
        if (heartRate?.heartRate) {
            const hr = heartRate.heartRate;
            if (hr < 60 || hr > 100) {
                heartRateScore = Math.max(0, 100 - Math.abs(hr - 80) * 2);
            }
        }
        
        const stressScore = 100 - (stress?.level || 0) * 100;
        const energyScore = (energy?.level || 0.5) * 100;
        const fatigueScore = 100 - (fatigue?.level || 0) * 100;
        
        // 가중 평균
        const overall = (
            heartRateScore * 0.25 +
            stressScore * 0.25 +
            energyScore * 0.30 +
            fatigueScore * 0.20
        );
        
        let status;
        if (overall >= 80) status = 'EXCELLENT';
        else if (overall >= 60) status = 'GOOD';
        else if (overall >= 40) status = 'FAIR';
        else status = 'POOR';
        
        return {
            score: Math.round(overall),
            status,
            breakdown: {
                heartRate: Math.round(heartRateScore),
                stress: Math.round(stressScore),
                energy: Math.round(energyScore),
                fatigue: Math.round(fatigueScore)
            },
            recommendations: this.generateRecommendations({
                heartRateScore, stressScore, energyScore, fatigueScore
            })
        };
    },
    
    /**
     * 권장사항 생성
     */
    generateRecommendations(scores) {
        const recommendations = [];
        
        if (scores.stressScore < 50) {
            recommendations.push({
                area: 'stress',
                priority: 'high',
                action: '깊은 호흡이나 명상을 시도해보세요'
            });
        }
        
        if (scores.energyScore < 50) {
            recommendations.push({
                area: 'energy',
                priority: 'medium',
                action: '가벼운 운동이나 외출을 권장합니다'
            });
        }
        
        if (scores.fatigueScore < 50) {
            recommendations.push({
                area: 'fatigue',
                priority: 'high',
                action: '휴식이 필요합니다'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                area: 'general',
                priority: 'low',
                action: '좋은 컨디션입니다! 유지하세요'
            });
        }
        
        return recommendations;
    }
};

// ================================================================
// PHYSICS CONVERTER (물리 속성 변환)
// ================================================================

const BioPhysicsConverter = {
    /**
     * 생체 데이터를 물리 속성으로 변환
     */
    convert(bioData) {
        const { heartRate, stress, energy, fatigue, wellness } = bioData;
        
        // 1. MASS = 웰니스 점수 기반 안정성
        const mass = (wellness?.score || 50) / 5;
        
        // 2. ENERGY = 에너지 레벨
        const physicsEnergy = (energy?.level || 0.5) * 100;
        
        // 3. ENTROPY = 스트레스 (높으면 무질서)
        const entropy = stress?.level || 0.3;
        
        // 4. VELOCITY = 심박수 기반 활성도
        const hrNormalized = heartRate?.heartRate 
            ? (heartRate.heartRate - 60) / 120 
            : 0.5;
        const velocity = Math.max(0, Math.min(hrNormalized, 1));
        
        return {
            mass: Math.round(mass * 100) / 100,
            energy: Math.round(physicsEnergy * 100) / 100,
            entropy: Math.round(entropy * 1000) / 1000,
            velocity: Math.round(velocity * 100) / 100,
            
            metadata: {
                heartRate: heartRate?.heartRate,
                heartRateSource: heartRate?.source,
                stressLevel: stress?.status,
                energyLevel: energy?.status,
                fatigueLevel: fatigue?.status,
                wellnessScore: wellness?.score
            },
            
            recommendations: wellness?.recommendations || [],
            
            analyzedAt: new Date().toISOString()
        };
    }
};

// ================================================================
// BIO MONITOR ENGINE (통합 엔진)
// ================================================================

export const BioMonitor = {
    // 컴포넌트
    bluetooth: BluetoothHeartRate,
    estimator: ActivityEstimator,
    wellness: WellnessCalculator,
    converter: BioPhysicsConverter,
    
    // 상태
    isInitialized: false,
    isMonitoring: false,
    monitorInterval: null,
    lastReading: null,
    history: [],
    
    // 콜백
    onUpdate: null,
    
    /**
     * 초기화
     */
    init() {
        console.log('[BioMonitor] 초기화 완료');
        this.isInitialized = true;
        return this;
    },
    
    /**
     * Bluetooth 심박수 모니터 연결
     */
    async connectHeartRate() {
        try {
            await this.bluetooth.connect();
            
            this.bluetooth.onReading = (reading) => {
                this.lastReading = {
                    ...this.lastReading,
                    heartRate: {
                        ...reading,
                        source: 'bluetooth',
                        confidence: 0.95
                    }
                };
                
                if (this.onUpdate) {
                    this.onUpdate(this.lastReading);
                }
            };
            
            return true;
        } catch (err) {
            console.warn('[BioMonitor] Bluetooth 연결 실패, 추정 모드 사용');
            return false;
        }
    },
    
    /**
     * 활동 기록 (다른 엔진에서 호출)
     */
    recordActivity(type, intensity) {
        this.estimator.recordActivity(type, intensity);
    },
    
    /**
     * 현재 생체 데이터 읽기
     */
    read() {
        // 심박수 (Bluetooth 또는 추정)
        const heartRate = this.bluetooth.isConnected 
            ? this.bluetooth.lastReading 
            : this.estimator.estimateHeartRate();
        
        // 기타 추정값
        const stress = this.estimator.estimateStress();
        const energy = this.estimator.estimateEnergy();
        const fatigue = this.estimator.estimateFatigue();
        
        // 웰니스 계산
        const wellness = this.wellness.calculate({
            heartRate, stress, energy, fatigue
        });
        
        const reading = {
            heartRate,
            stress,
            energy,
            fatigue,
            wellness,
            timestamp: Date.now()
        };
        
        // 물리 속성 변환
        reading.physics = this.converter.convert(reading);
        
        this.lastReading = reading;
        this.history.push({
            timestamp: reading.timestamp,
            wellness: wellness.score,
            heartRate: heartRate?.heartRate
        });
        
        // 이력 제한
        if (this.history.length > 1000) {
            this.history = this.history.slice(-1000);
        }
        
        return reading;
    },
    
    /**
     * 모니터링 시작
     */
    startMonitoring(intervalMs = 5000) {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        this.monitorInterval = setInterval(() => {
            const reading = this.read();
            
            if (this.onUpdate) {
                this.onUpdate(reading);
            }
        }, intervalMs);
        
        console.log(`[BioMonitor] 모니터링 시작 (간격: ${intervalMs}ms)`);
    },
    
    /**
     * 모니터링 중지
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isMonitoring = false;
        console.log('[BioMonitor] 모니터링 중지');
    },
    
    /**
     * 요약 생성
     */
    generateSummary() {
        if (!this.lastReading) {
            this.read();
        }
        
        const r = this.lastReading;
        
        return {
            current: {
                heartRate: r.heartRate?.heartRate,
                stress: r.stress?.status,
                energy: r.energy?.status,
                fatigue: r.fatigue?.status,
                wellness: r.wellness?.status
            },
            
            interpretation: {
                heartRate: r.heartRate?.heartRate > 100 
                    ? '💓 높은 심박수'
                    : r.heartRate?.heartRate > 80 
                        ? '❤️ 보통 심박수'
                        : '💚 안정된 심박수',
                
                stress: r.stress?.status === 'HIGH' 
                    ? '😰 스트레스 높음'
                    : r.stress?.status === 'MODERATE' 
                        ? '😐 보통 스트레스'
                        : '😌 스트레스 낮음',
                
                energy: r.energy?.status === 'HIGH' 
                    ? '⚡ 에너지 충만'
                    : r.energy?.status === 'MODERATE' 
                        ? '🔋 보통 에너지'
                        : '🪫 에너지 부족',
                
                wellness: `💪 웰니스 점수: ${r.wellness?.score}/100`
            },
            
            recommendations: r.wellness?.recommendations || []
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            monitoring: this.isMonitoring,
            bluetoothConnected: this.bluetooth.isConnected,
            historyCount: this.history.length,
            lastReading: this.lastReading ? {
                wellness: this.lastReading.wellness?.score,
                heartRate: this.lastReading.heartRate?.heartRate
            } : null
        };
    },
    
    /**
     * 리소스 해제
     */
    release() {
        this.stopMonitoring();
        this.bluetooth.disconnect();
        this.history = [];
        console.log('[BioMonitor] 리소스 해제');
    }
};

// ================================================================
// 테스트 함수
// ================================================================

export async function testBioMonitor() {
    console.log('='.repeat(50));
    console.log('[TEST] BioMonitor 테스트');
    console.log('='.repeat(50));
    
    BioMonitor.init();
    
    // 활동 시뮬레이션
    console.log('\n[TEST] 활동 시뮬레이션:');
    BioMonitor.recordActivity('typing', 0.3);
    BioMonitor.recordActivity('reading', 0.2);
    BioMonitor.recordActivity('walking', 0.6);
    
    // 생체 데이터 읽기
    console.log('\n[TEST] 생체 데이터 읽기:');
    const reading = BioMonitor.read();
    
    console.log('심박수:', reading.heartRate.heartRate, 'bpm');
    console.log('스트레스:', reading.stress.status);
    console.log('에너지:', reading.energy.status);
    console.log('피로도:', reading.fatigue.status);
    console.log('웰니스:', reading.wellness.score + '/100');
    
    // 물리 속성
    console.log('\n[TEST] 물리 속성:');
    console.log('Mass:', reading.physics.mass);
    console.log('Energy:', reading.physics.energy);
    console.log('Entropy:', reading.physics.entropy);
    console.log('Velocity:', reading.physics.velocity);
    
    // 권장사항
    console.log('\n[TEST] 권장사항:');
    reading.wellness.recommendations.forEach(r => {
        console.log(`- [${r.priority}] ${r.action}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('[TEST] 완료!');
    console.log('='.repeat(50));
    
    return reading;
}

// ================================================================
// EXPORTS
// ================================================================

export { 
    BluetoothHeartRate, 
    ActivityEstimator, 
    WellnessCalculator,
    BioPhysicsConverter 
};

export default BioMonitor;




