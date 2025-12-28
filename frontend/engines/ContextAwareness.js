// ================================================================
// CONTEXT AWARENESS ENGINE (맥락 인식 엔진)
// 시간, 위치, 환경, 일정 분석
// ================================================================

// ================================================================
// TIME CONTEXT (시간 맥락)
// ================================================================

const TimeContext = {
    /**
     * 현재 시간 맥락 가져오기
     */
    getCurrent() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const date = now.getDate();
        const month = now.getMonth();
        
        return {
            timestamp: now.toISOString(),
            hour,
            minute: now.getMinutes(),
            dayOfWeek: day,
            dayOfMonth: date,
            month,
            year: now.getFullYear(),
            
            // 파생 속성
            period: this.getPeriod(hour),
            isWeekend: day === 0 || day === 6,
            isWorkingHours: hour >= 9 && hour < 18 && day >= 1 && day <= 5,
            quarter: Math.floor(month / 3) + 1,
            weekOfMonth: Math.ceil(date / 7),
            
            // 한국 표현
            periodKo: this.getPeriodKo(hour),
            dayNameKo: ['일', '월', '화', '수', '목', '금', '토'][day] + '요일'
        };
    },
    
    /**
     * 시간대 구분
     */
    getPeriod(hour) {
        if (hour >= 5 && hour < 9) return 'early_morning';
        if (hour >= 9 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 14) return 'noon';
        if (hour >= 14 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 21) return 'evening';
        if (hour >= 21 || hour < 5) return 'night';
        return 'unknown';
    },
    
    getPeriodKo(hour) {
        if (hour >= 5 && hour < 9) return '이른 아침';
        if (hour >= 9 && hour < 12) return '오전';
        if (hour >= 12 && hour < 14) return '점심';
        if (hour >= 14 && hour < 18) return '오후';
        if (hour >= 18 && hour < 21) return '저녁';
        if (hour >= 21 || hour < 5) return '밤';
        return '알 수 없음';
    },
    
    /**
     * 최적 활동 시간 추천
     */
    getOptimalActivityTime() {
        const current = this.getCurrent();
        
        const recommendations = {
            'early_morning': ['운동', '명상', '계획 수립'],
            'morning': ['중요 업무', '창의적 작업', '회의'],
            'noon': ['가벼운 업무', '휴식', '점심'],
            'afternoon': ['협업', '미팅', '분석 작업'],
            'evening': ['정리', '리뷰', '개인 시간'],
            'night': ['휴식', '독서', '취미 활동']
        };
        
        return {
            currentPeriod: current.period,
            recommended: recommendations[current.period] || [],
            productivityScore: this.getProductivityScore(current)
        };
    },
    
    /**
     * 생산성 점수 (시간대 기반)
     */
    getProductivityScore(timeContext) {
        const { hour, isWeekend, isWorkingHours } = timeContext;
        
        let score = 0.5; // 기본
        
        // 골든 타임 (오전 9-11시)
        if (hour >= 9 && hour < 11) score = 0.9;
        // 집중 시간 (오전/오후 초반)
        else if (hour >= 14 && hour < 16) score = 0.75;
        // 점심 시간 직후
        else if (hour >= 13 && hour < 14) score = 0.4;
        // 저녁
        else if (hour >= 18 && hour < 21) score = 0.6;
        // 밤
        else if (hour >= 21 || hour < 6) score = 0.3;
        
        // 주말 조정
        if (isWeekend) score *= 0.8;
        
        return Math.round(score * 100) / 100;
    }
};

// ================================================================
// LOCATION CONTEXT (위치 맥락)
// ================================================================

const LocationContext = {
    lastLocation: null,
    locationHistory: [],
    
    /**
     * 현재 위치 가져오기
     */
    async getCurrent(options = {}) {
        if (!navigator.geolocation) {
            return this.getDefault();
        }
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: options.highAccuracy || false,
                    timeout: options.timeout || 10000,
                    maximumAge: options.maxAge || 300000 // 5분
                });
            });
            
            const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                timestamp: Date.now(),
                
                // 익명화된 영역 (프라이버시)
                region: this.anonymizeLocation(position.coords),
                
                // 장소 유형 추정
                placeType: await this.estimatePlaceType(position.coords)
            };
            
            this.lastLocation = location;
            this.locationHistory.push({
                region: location.region,
                timestamp: location.timestamp
            });
            
            return location;
        } catch (err) {
            console.warn('[LocationContext] 위치 접근 실패:', err.message);
            return this.getDefault();
        }
    },
    
    /**
     * 위치 익명화 (대략적 영역만)
     */
    anonymizeLocation(coords) {
        // 소수점 1자리 (약 11km 정밀도)
        const lat = Math.round(coords.latitude * 10) / 10;
        const lng = Math.round(coords.longitude * 10) / 10;
        
        return {
            id: `${lat}_${lng}`,
            precision: 'city_level'
        };
    },
    
    /**
     * 장소 유형 추정
     */
    async estimatePlaceType(coords) {
        // 시간대 기반 추정 (실제로는 장소 API 사용)
        const hour = new Date().getHours();
        const isWorkingHours = hour >= 9 && hour < 18;
        
        // 간단한 휴리스틱
        if (isWorkingHours) return 'work';
        if (hour >= 22 || hour < 7) return 'home';
        
        return 'other';
    },
    
    /**
     * 기본값 반환
     */
    getDefault() {
        return {
            latitude: null,
            longitude: null,
            region: { id: 'unknown', precision: 'none' },
            placeType: 'unknown',
            timestamp: Date.now()
        };
    },
    
    /**
     * 이동 패턴 분석
     */
    analyzeMobilityPattern() {
        if (this.locationHistory.length < 2) {
            return { pattern: 'unknown', confidence: 0 };
        }
        
        // 유니크 위치 수
        const uniqueLocations = new Set(
            this.locationHistory.map(l => l.region?.id)
        ).size;
        
        // 이동 빈도
        const totalRecords = this.locationHistory.length;
        const mobilityRatio = uniqueLocations / totalRecords;
        
        let pattern;
        if (mobilityRatio < 0.1) pattern = 'stationary';
        else if (mobilityRatio < 0.3) pattern = 'routine';
        else if (mobilityRatio < 0.6) pattern = 'mobile';
        else pattern = 'highly_mobile';
        
        return {
            pattern,
            uniqueLocations,
            confidence: Math.min(totalRecords / 20, 1)
        };
    }
};

// ================================================================
// ENVIRONMENT CONTEXT (환경 맥락)
// ================================================================

const EnvironmentContext = {
    /**
     * 환경 정보 수집
     */
    getCurrent() {
        return {
            // 네트워크
            network: this.getNetworkInfo(),
            
            // 기기
            device: this.getDeviceInfo(),
            
            // 브라우저
            browser: this.getBrowserInfo(),
            
            // 화면
            display: this.getDisplayInfo(),
            
            // 배터리 (가능한 경우)
            battery: null, // getBatteryInfo()로 비동기 업데이트
            
            timestamp: Date.now()
        };
    },
    
    /**
     * 네트워크 정보
     */
    getNetworkInfo() {
        const connection = navigator.connection || 
                          navigator.mozConnection || 
                          navigator.webkitConnection;
        
        return {
            online: navigator.onLine,
            type: connection?.effectiveType || 'unknown',
            downlink: connection?.downlink || null,
            rtt: connection?.rtt || null,
            saveData: connection?.saveData || false
        };
    },
    
    /**
     * 기기 정보
     */
    getDeviceInfo() {
        return {
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookieEnabled: navigator.cookieEnabled,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            maxTouchPoints: navigator.maxTouchPoints,
            isMobile: /Mobile|Android|iPhone/i.test(navigator.userAgent),
            isTablet: /iPad|Tablet/i.test(navigator.userAgent)
        };
    },
    
    /**
     * 브라우저 정보
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        
        let browser = 'unknown';
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        
        return {
            name: browser,
            vendor: navigator.vendor,
            doNotTrack: navigator.doNotTrack === '1'
        };
    },
    
    /**
     * 디스플레이 정보
     */
    getDisplayInfo() {
        return {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            colorDepth: window.screen.colorDepth,
            pixelRatio: window.devicePixelRatio,
            orientation: window.screen.orientation?.type || 'unknown'
        };
    },
    
    /**
     * 배터리 정보 (비동기)
     */
    async getBatteryInfo() {
        if (!navigator.getBattery) return null;
        
        try {
            const battery = await navigator.getBattery();
            return {
                level: battery.level,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
            };
        } catch {
            return null;
        }
    }
};

// ================================================================
// SCHEDULE CONTEXT (일정 맥락)
// ================================================================

const ScheduleContext = {
    events: [],
    
    /**
     * 이벤트 추가
     */
    addEvent(event) {
        this.events.push({
            id: event.id || Date.now().toString(),
            title: event.title,
            start: new Date(event.start),
            end: event.end ? new Date(event.end) : null,
            type: event.type || 'general',
            importance: event.importance || 'normal'
        });
        
        // 시작 시간 기준 정렬
        this.events.sort((a, b) => a.start - b.start);
    },
    
    /**
     * 현재 이벤트 조회
     */
    getCurrentEvent() {
        const now = Date.now();
        
        return this.events.find(e => 
            e.start.getTime() <= now && 
            (e.end ? e.end.getTime() >= now : e.start.getTime() + 3600000 >= now)
        ) || null;
    },
    
    /**
     * 다음 이벤트 조회
     */
    getNextEvent() {
        const now = Date.now();
        
        return this.events.find(e => e.start.getTime() > now) || null;
    },
    
    /**
     * 오늘 일정 조회
     */
    getTodayEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return this.events.filter(e => 
            e.start >= today && e.start < tomorrow
        );
    },
    
    /**
     * 일정 밀도 계산
     */
    getScheduleDensity(hoursAhead = 24) {
        const now = Date.now();
        const windowEnd = now + hoursAhead * 60 * 60 * 1000;
        
        const upcomingEvents = this.events.filter(e => 
            e.start.getTime() >= now && e.start.getTime() < windowEnd
        );
        
        const density = upcomingEvents.length / hoursAhead;
        
        return {
            eventCount: upcomingEvents.length,
            density: Math.round(density * 100) / 100,
            status: density > 0.3 ? 'busy' : density > 0.1 ? 'moderate' : 'free'
        };
    }
};

// ================================================================
// PHYSICS CONVERTER (물리 속성 변환)
// ================================================================

const ContextPhysicsConverter = {
    /**
     * 맥락 데이터를 물리 속성으로 변환
     */
    convert(contextData) {
        const { time, location, environment, schedule } = contextData;
        
        // 1. MASS = 환경 복잡도 (기기 성능 기반)
        const deviceScore = (
            (environment.device.hardwareConcurrency || 4) / 8 * 0.5 +
            (environment.device.deviceMemory || 4) / 8 * 0.5
        );
        const mass = deviceScore * 20;
        
        // 2. ENERGY = 생산성 잠재력
        const productivityScore = time.productivityScore || 0.5;
        const energy = productivityScore * 100;
        
        // 3. ENTROPY = 환경 불확실성
        const locationUncertainty = location.region?.precision === 'none' ? 0.8 : 0.2;
        const networkUncertainty = !environment.network.online ? 0.5 : 0;
        const entropy = (locationUncertainty + networkUncertainty) / 2;
        
        // 4. VELOCITY = 일정 밀도 (바쁠수록 높음)
        const scheduleDensity = schedule?.density || 0;
        const velocity = Math.min(scheduleDensity * 2, 1);
        
        return {
            mass: Math.round(mass * 100) / 100,
            energy: Math.round(energy * 100) / 100,
            entropy: Math.round(entropy * 1000) / 1000,
            velocity: Math.round(velocity * 100) / 100,
            
            metadata: {
                timePeriod: time.period,
                timeProductivity: productivityScore,
                locationRegion: location.region?.id,
                placeType: location.placeType,
                networkStatus: environment.network.online ? 'online' : 'offline',
                deviceType: environment.device.isMobile ? 'mobile' : 'desktop',
                scheduleStatus: schedule?.status || 'unknown'
            },
            
            optimal: {
                activities: TimeContext.getOptimalActivityTime().recommended,
                focusTime: productivityScore > 0.7
            },
            
            analyzedAt: new Date().toISOString()
        };
    }
};

// ================================================================
// CONTEXT AWARENESS ENGINE (통합 엔진)
// ================================================================

export const ContextAwareness = {
    // 컴포넌트
    time: TimeContext,
    location: LocationContext,
    environment: EnvironmentContext,
    schedule: ScheduleContext,
    converter: ContextPhysicsConverter,
    
    // 상태
    lastContext: null,
    history: [],
    
    /**
     * 전체 맥락 수집
     */
    async gather() {
        const [locationData, batteryData] = await Promise.all([
            this.location.getCurrent(),
            this.environment.getBatteryInfo()
        ]);
        
        const context = {
            time: this.time.getCurrent(),
            location: locationData,
            environment: {
                ...this.environment.getCurrent(),
                battery: batteryData
            },
            schedule: this.schedule.getScheduleDensity(),
            
            timestamp: Date.now()
        };
        
        // 물리 속성 변환
        context.physics = this.converter.convert(context);
        
        this.lastContext = context;
        this.history.push({
            timestamp: context.timestamp,
            period: context.time.period,
            placeType: context.location.placeType
        });
        
        return context;
    },
    
    /**
     * 빠른 맥락 (동기식)
     */
    getQuickContext() {
        return {
            time: this.time.getCurrent(),
            environment: this.environment.getCurrent(),
            schedule: this.schedule.getScheduleDensity(),
            timestamp: Date.now()
        };
    },
    
    /**
     * 일정 추가
     */
    addEvent(event) {
        this.schedule.addEvent(event);
    },
    
    /**
     * 요약 생성
     */
    generateSummary() {
        if (!this.lastContext) {
            this.lastContext = {
                time: this.time.getCurrent(),
                environment: this.environment.getCurrent()
            };
        }
        
        const ctx = this.lastContext;
        const optimal = this.time.getOptimalActivityTime();
        
        return {
            current: {
                time: ctx.time.periodKo,
                day: ctx.time.dayNameKo,
                location: ctx.location?.placeType || 'unknown',
                network: ctx.environment?.network?.online ? '온라인' : '오프라인'
            },
            
            interpretation: {
                time: `🕐 ${ctx.time.periodKo} (${ctx.time.hour}시)`,
                
                productivity: ctx.time.productivityScore > 0.7 
                    ? '🔥 최고 생산성 시간'
                    : ctx.time.productivityScore > 0.5 
                        ? '👍 좋은 집중 시간'
                        : '😴 휴식 권장 시간',
                
                schedule: ctx.schedule?.status === 'busy' 
                    ? '📅 바쁜 일정'
                    : ctx.schedule?.status === 'moderate' 
                        ? '📋 적당한 일정'
                        : '🌴 여유 있는 일정'
            },
            
            recommendations: optimal.recommended,
            
            nextEvent: this.schedule.getNextEvent()
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            historyCount: this.history.length,
            scheduledEvents: this.schedule.events.length,
            lastContext: this.lastContext ? {
                period: this.lastContext.time?.period,
                placeType: this.lastContext.location?.placeType
            } : null
        };
    }
};

// ================================================================
// 테스트 함수
// ================================================================

export async function testContextAwareness() {
    console.log('='.repeat(50));
    console.log('[TEST] ContextAwareness 테스트');
    console.log('='.repeat(50));
    
    // 일정 추가
    console.log('\n[TEST] 일정 추가:');
    ContextAwareness.addEvent({
        title: '팀 미팅',
        start: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2시간 후
        type: 'meeting',
        importance: 'high'
    });
    ContextAwareness.addEvent({
        title: '보고서 작성',
        start: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4시간 후
        type: 'work'
    });
    console.log('일정 수:', ContextAwareness.schedule.events.length);
    
    // 맥락 수집
    console.log('\n[TEST] 맥락 수집:');
    const context = await ContextAwareness.gather();
    
    console.log('시간대:', context.time.periodKo);
    console.log('요일:', context.time.dayNameKo);
    console.log('생산성 점수:', context.time.productivityScore);
    console.log('네트워크:', context.environment.network.online ? '온라인' : '오프라인');
    console.log('기기:', context.environment.device.isMobile ? '모바일' : '데스크톱');
    
    // 물리 속성
    console.log('\n[TEST] 물리 속성:');
    console.log('Mass:', context.physics.mass);
    console.log('Energy:', context.physics.energy);
    console.log('Entropy:', context.physics.entropy);
    console.log('Velocity:', context.physics.velocity);
    
    // 권장 활동
    console.log('\n[TEST] 권장 활동:');
    context.physics.optimal.activities.forEach(a => console.log('-', a));
    
    // 요약
    console.log('\n[TEST] 요약:');
    const summary = ContextAwareness.generateSummary();
    console.log(summary.interpretation);
    
    console.log('\n' + '='.repeat(50));
    console.log('[TEST] 완료!');
    console.log('='.repeat(50));
    
    return context;
}

// ================================================================
// EXPORTS
// ================================================================

export { 
    TimeContext, 
    LocationContext, 
    EnvironmentContext, 
    ScheduleContext,
    ContextPhysicsConverter 
};

export default ContextAwareness;




