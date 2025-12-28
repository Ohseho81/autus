// ================================================================
// AUTUS EIGHT SENSORS SYSTEM
// All-Senses Intelligence: Screen, Voice, Video, Log, Link, Bio, Context, Intuition
// Mission Critical: Complete Environmental Awareness
// ================================================================

import { SecurePurge } from '../security/SecurePurge.js';

// ================================================================
// BASE SENSOR CLASS
// ================================================================

class BaseSensor {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.isActive = false;
        this.lastReading = null;
        this.readingCount = 0;
        this.extractedFeatures = [];
    }
    
    start() {
        this.isActive = true;
        console.log(`[${this.type}Sensor] Started`);
    }
    
    stop() {
        this.isActive = false;
        console.log(`[${this.type}Sensor] Stopped`);
    }
    
    // Abstract method - override in subclasses
    async read() {
        throw new Error('read() must be implemented');
    }
    
    // Extract features and purge raw data
    async extractAndPurge(rawData) {
        const features = await this.extractFeatures(rawData);
        SecurePurge.purge(rawData);
        this.extractedFeatures.push({
            timestamp: Date.now(),
            features
        });
        return features;
    }
    
    // Abstract method - override in subclasses
    async extractFeatures(rawData) {
        throw new Error('extractFeatures() must be implemented');
    }
    
    getStatus() {
        return {
            id: this.id,
            type: this.type,
            isActive: this.isActive,
            readingCount: this.readingCount,
            lastReadingTime: this.lastReading?.timestamp
        };
    }
}

// ================================================================
// 1. SCREEN SENSOR (화면 분석)
// OCR via Tesseract, UI Pattern Detection
// ================================================================

export class ScreenSensor extends BaseSensor {
    constructor() {
        super('screen', 'Screen');
        this.tesseractWorker = null;
        this.captureInterval = null;
    }
    
    async init() {
        // WebGPU Tesseract 초기화 (시뮬레이션)
        console.log('[ScreenSensor] Initializing Tesseract with WebGPU...');
        this.tesseractWorker = {
            recognize: async (image) => {
                // 실제로는 Tesseract.js 사용
                return { text: '[OCR_EXTRACTED_TEXT]', confidence: 0.95 };
            }
        };
    }
    
    async read() {
        if (!this.isActive) return null;
        
        // 화면 캡처 (Permission 필요)
        const rawScreenData = await this.captureScreen();
        const features = await this.extractAndPurge(rawScreenData);
        
        this.lastReading = { timestamp: Date.now(), features };
        this.readingCount++;
        
        return features;
    }
    
    async captureScreen() {
        // getDisplayMedia API 사용 (사용자 권한 필요)
        // 여기서는 시뮬레이션
        return {
            type: 'screen_capture',
            timestamp: Date.now(),
            width: 1920,
            height: 1080,
            data: null // 실제 이미지 데이터
        };
    }
    
    async extractFeatures(rawData) {
        // OCR 실행
        const ocrResult = await this.tesseractWorker?.recognize(rawData.data);
        
        // UI 패턴 분석
        const uiPatterns = this.analyzeUIPatterns(rawData);
        
        // Raw data는 추출 후 삭제됨
        return {
            textContent: this.anonymizeText(ocrResult?.text),
            textConfidence: ocrResult?.confidence || 0,
            uiPatterns,
            activeApp: this.detectActiveApp(),
            focusArea: this.detectFocusArea(rawData),
            screenTime: Date.now() - (this.lastReading?.timestamp || Date.now())
        };
    }
    
    analyzeUIPatterns(rawData) {
        return {
            hasForm: false,
            hasTable: false,
            hasList: false,
            dominantColor: 'unknown',
            complexity: 'medium'
        };
    }
    
    anonymizeText(text) {
        if (!text) return null;
        // 개인정보 제거
        return text
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
            .replace(/\b\d{3}[-.]?\d{4}[-.]?\d{4}\b/g, '[PHONE]')
            .replace(/\b\d{6}[-]?\d{7}\b/g, '[ID]');
    }
    
    detectActiveApp() {
        // 실제로는 window.title 또는 API로 감지
        return 'unknown';
    }
    
    detectFocusArea(rawData) {
        return { x: 0.5, y: 0.5 }; // 정규화된 좌표
    }
}

// ================================================================
// 2. VOICE SENSOR (음성 분석)
// Speech-to-Text via Whisper, Emotion Detection
// ================================================================

export class VoiceSensor extends BaseSensor {
    constructor() {
        super('voice', 'Voice');
        this.audioContext = null;
        this.mediaStream = null;
        this.whisperModel = null;
    }
    
    async init() {
        console.log('[VoiceSensor] Initializing Whisper with WebGPU...');
        // WebGPU Whisper 초기화 (시뮬레이션)
        this.whisperModel = {
            transcribe: async (audio) => ({
                text: '[TRANSCRIBED_TEXT]',
                language: 'ko',
                confidence: 0.92
            })
        };
    }
    
    async start() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            super.start();
        } catch (err) {
            console.error('[VoiceSensor] Microphone access denied');
        }
    }
    
    stop() {
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.audioContext?.close();
        super.stop();
    }
    
    async read() {
        if (!this.isActive || !this.mediaStream) return null;
        
        const rawAudioData = await this.captureAudio();
        const features = await this.extractAndPurge(rawAudioData);
        
        this.lastReading = { timestamp: Date.now(), features };
        this.readingCount++;
        
        return features;
    }
    
    async captureAudio(durationMs = 5000) {
        // 오디오 캡처 (시뮬레이션)
        return {
            type: 'audio_capture',
            timestamp: Date.now(),
            duration: durationMs,
            sampleRate: 44100,
            data: null
        };
    }
    
    async extractFeatures(rawData) {
        // Whisper 전사
        const transcription = await this.whisperModel?.transcribe(rawData.data);
        
        // 감정 분석
        const emotion = this.analyzeEmotion(rawData);
        
        return {
            transcribedText: this.anonymizeText(transcription?.text),
            language: transcription?.language,
            confidence: transcription?.confidence || 0,
            emotion,
            voiceEnergy: this.calculateVoiceEnergy(rawData),
            speakingRate: this.calculateSpeakingRate(transcription),
            isSpeaking: true
        };
    }
    
    analyzeEmotion(rawData) {
        // 음성 감정 분석 (시뮬레이션)
        return {
            primary: 'neutral',
            confidence: 0.7,
            valence: 0.5, // -1 to 1
            arousal: 0.5  // 0 to 1
        };
    }
    
    calculateVoiceEnergy(rawData) {
        return 0.5; // 정규화된 에너지 레벨
    }
    
    calculateSpeakingRate(transcription) {
        return 120; // WPM
    }
    
    anonymizeText(text) {
        if (!text) return null;
        return text
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
            .replace(/\b\d{3}[-.]?\d{4}[-.]?\d{4}\b/g, '[PHONE]');
    }
}

// ================================================================
// 3. VIDEO SENSOR (영상 분석)
// Face Detection, Posture Analysis, Attention Tracking
// ================================================================

export class VideoSensor extends BaseSensor {
    constructor() {
        super('video', 'Video');
        this.videoStream = null;
        this.faceDetector = null;
    }
    
    async init() {
        console.log('[VideoSensor] Initializing Face Detection...');
        // FaceDetector API (if available)
        if ('FaceDetector' in window) {
            this.faceDetector = new window.FaceDetector();
        }
    }
    
    async start() {
        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            super.start();
        } catch (err) {
            console.error('[VideoSensor] Camera access denied');
        }
    }
    
    stop() {
        this.videoStream?.getTracks().forEach(track => track.stop());
        super.stop();
    }
    
    async read() {
        if (!this.isActive || !this.videoStream) return null;
        
        const rawVideoFrame = await this.captureFrame();
        const features = await this.extractAndPurge(rawVideoFrame);
        
        this.lastReading = { timestamp: Date.now(), features };
        this.readingCount++;
        
        return features;
    }
    
    async captureFrame() {
        return {
            type: 'video_frame',
            timestamp: Date.now(),
            width: 640,
            height: 480,
            data: null
        };
    }
    
    async extractFeatures(rawData) {
        // 얼굴 감지 (실제 이미지 데이터 없이 시뮬레이션)
        const faceData = await this.detectFace(rawData);
        
        // 자세 분석
        const posture = this.analyzePosture(rawData);
        
        // 주의 집중도
        const attention = this.trackAttention(faceData);
        
        return {
            faceDetected: faceData?.detected || false,
            faceCount: faceData?.count || 0,
            eyeContact: faceData?.eyeContact || false,
            posture,
            attention,
            lightingCondition: this.analyzeLighting(rawData),
            // 얼굴 특징은 저장하지 않음 (Privacy)
            privacyCompliant: true
        };
    }
    
    async detectFace(rawData) {
        // FaceDetector API 또는 시뮬레이션
        return {
            detected: true,
            count: 1,
            eyeContact: true,
            boundingBox: null // 저장하지 않음
        };
    }
    
    analyzePosture(rawData) {
        return {
            isUpright: true,
            headTilt: 0,
            confidence: 0.8
        };
    }
    
    trackAttention(faceData) {
        return {
            level: 'focused',
            score: 0.85,
            gazeDirection: 'screen'
        };
    }
    
    analyzeLighting(rawData) {
        return 'adequate';
    }
}

// ================================================================
// 4. LOG SENSOR (로그 분석)
// Activity Logging, Pattern Detection
// ================================================================

export class LogSensor extends BaseSensor {
    constructor() {
        super('log', 'Log');
        this.activityBuffer = [];
        this.maxBufferSize = 1000;
    }
    
    async init() {
        console.log('[LogSensor] Initializing Activity Logger...');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 클릭 이벤트
        document.addEventListener('click', (e) => {
            this.logActivity('click', {
                target: e.target.tagName,
                position: { x: e.clientX, y: e.clientY }
            });
        });
        
        // 키보드 이벤트 (키 자체는 저장하지 않음)
        document.addEventListener('keydown', () => {
            this.logActivity('keystroke', { count: 1 });
        });
        
        // 스크롤 이벤트
        document.addEventListener('scroll', () => {
            this.logActivity('scroll', {
                position: window.scrollY,
                direction: 'unknown'
            });
        });
    }
    
    logActivity(type, metadata) {
        if (!this.isActive) return;
        
        this.activityBuffer.push({
            type,
            timestamp: Date.now(),
            metadata
        });
        
        // 버퍼 크기 관리
        if (this.activityBuffer.length > this.maxBufferSize) {
            this.activityBuffer = this.activityBuffer.slice(-this.maxBufferSize);
        }
    }
    
    async read() {
        if (!this.isActive) return null;
        
        const rawLogs = [...this.activityBuffer];
        const features = await this.extractAndPurge(rawLogs);
        
        this.lastReading = { timestamp: Date.now(), features };
        this.readingCount++;
        
        // 버퍼 클리어
        this.activityBuffer = [];
        
        return features;
    }
    
    async extractFeatures(rawLogs) {
        // 활동 패턴 분석
        const activityCounts = {};
        rawLogs.forEach(log => {
            activityCounts[log.type] = (activityCounts[log.type] || 0) + 1;
        });
        
        // 활동 빈도 계산
        const timeSpan = rawLogs.length > 1 
            ? rawLogs[rawLogs.length - 1].timestamp - rawLogs[0].timestamp 
            : 1000;
        
        return {
            totalActivities: rawLogs.length,
            activityCounts,
            activityRate: rawLogs.length / (timeSpan / 1000 / 60), // per minute
            dominantActivity: Object.entries(activityCounts)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
            patterns: this.detectPatterns(rawLogs),
            sessionDuration: timeSpan
        };
    }
    
    detectPatterns(logs) {
        // 반복 패턴 감지
        const sequences = [];
        // 시퀀스 분석 로직...
        return {
            hasRepetition: false,
            repetitionFrequency: 0
        };
    }
}

// ================================================================
// 5. LINK SENSOR (연결 분석)
// Network Analysis, Relationship Mapping
// ================================================================

export class LinkSensor extends BaseSensor {
    constructor() {
        super('link', 'Link');
        this.connectionGraph = new Map();
    }
    
    async init() {
        console.log('[LinkSensor] Initializing Connection Analyzer...');
    }
    
    recordConnection(sourceId, targetId, type, strength = 1.0) {
        if (!this.isActive) return;
        
        const connectionId = `${sourceId}->${targetId}`;
        const existing = this.connectionGraph.get(connectionId) || {
            source: this.hashId(sourceId),
            target: this.hashId(targetId),
            type,
            strength: 0,
            interactions: []
        };
        
        existing.strength += strength;
        existing.interactions.push({
            timestamp: Date.now(),
            type
        });
        
        this.connectionGraph.set(connectionId, existing);
    }
    
    hashId(id) {
        // 개인정보 보호를 위한 해시
        let hash = 0;
        for (let i = 0; i < String(id).length; i++) {
            hash = ((hash << 5) - hash) + String(id).charCodeAt(i);
            hash = hash & hash;
        }
        return 'node_' + Math.abs(hash).toString(16);
    }
    
    async read() {
        if (!this.isActive) return null;
        
        const rawConnections = Array.from(this.connectionGraph.values());
        const features = await this.extractAndPurge(rawConnections);
        
        this.lastReading = { timestamp: Date.now(), features };
        this.readingCount++;
        
        return features;
    }
    
    async extractFeatures(rawConnections) {
        // 네트워크 분석
        const nodeCount = new Set(
            rawConnections.flatMap(c => [c.source, c.target])
        ).size;
        
        const totalStrength = rawConnections.reduce((s, c) => s + c.strength, 0);
        
        return {
            nodeCount,
            connectionCount: rawConnections.length,
            averageStrength: totalStrength / rawConnections.length || 0,
            connectionTypes: this.getConnectionTypes(rawConnections),
            density: rawConnections.length / (nodeCount * (nodeCount - 1) / 2) || 0,
            centralNodes: this.findCentralNodes(rawConnections),
            clusters: this.detectClusters(rawConnections)
        };
    }
    
    getConnectionTypes(connections) {
        const types = {};
        connections.forEach(c => {
            types[c.type] = (types[c.type] || 0) + 1;
        });
        return types;
    }
    
    findCentralNodes(connections) {
        const nodeDegrees = {};
        connections.forEach(c => {
            nodeDegrees[c.source] = (nodeDegrees[c.source] || 0) + 1;
            nodeDegrees[c.target] = (nodeDegrees[c.target] || 0) + 1;
        });
        
        return Object.entries(nodeDegrees)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([node, degree]) => ({ node, degree }));
    }
    
    detectClusters(connections) {
        // 클러스터 감지 (시뮬레이션)
        return {
            count: 1,
            sizes: [connections.length]
        };
    }
}

// ================================================================
// 6. BIO SENSOR (생체 분석)
// Heart Rate, Stress Level (via available APIs)
// ================================================================

export class BioSensor extends BaseSensor {
    constructor() {
        super('bio', 'Bio');
        this.heartRateSensor = null;
    }
    
    async init() {
        console.log('[BioSensor] Initializing Biometric Sensors...');
        // Web Bluetooth API for heart rate monitors (if available)
        if ('bluetooth' in navigator) {
            // 연결 가능
        }
    }
    
    async connectHeartRateMonitor() {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['heart_rate'] }]
            });
            // 연결 로직...
        } catch (err) {
            console.log('[BioSensor] Heart rate monitor not available');
        }
    }
    
    async read() {
        if (!this.isActive) return null;
        
        const rawBioData = await this.collectBioMetrics();
        const features = await this.extractAndPurge(rawBioData);
        
        this.lastReading = { timestamp: Date.now(), features };
        this.readingCount++;
        
        return features;
    }
    
    async collectBioMetrics() {
        // 가능한 생체 데이터 수집
        return {
            timestamp: Date.now(),
            heartRate: null, // BLE 연결 시 실제 값
            // 다른 센서들...
        };
    }
    
    async extractFeatures(rawData) {
        // 스트레스 레벨 추정 (다른 센서 데이터 활용)
        const stressLevel = this.estimateStress();
        
        return {
            heartRate: rawData.heartRate,
            heartRateVariability: null,
            estimatedStress: stressLevel,
            energyLevel: this.estimateEnergy(),
            fatigueIndicator: this.detectFatigue(),
            dataSource: rawData.heartRate ? 'sensor' : 'estimated'
        };
    }
    
    estimateStress() {
        // 다른 센서 데이터 기반 추정 (시뮬레이션)
        return {
            level: 'normal',
            score: 0.3,
            confidence: 0.5
        };
    }
    
    estimateEnergy() {
        return {
            level: 'moderate',
            score: 0.6
        };
    }
    
    detectFatigue() {
        return {
            detected: false,
            confidence: 0.4
        };
    }
}

// ================================================================
// 7. CONTEXT SENSOR (맥락 분석)
// Time, Location, Environment Context
// ================================================================

export class ContextSensor extends BaseSensor {
    constructor() {
        super('context', 'Context');
    }
    
    async init() {
        console.log('[ContextSensor] Initializing Context Analyzer...');
    }
    
    async read() {
        if (!this.isActive) return null;
        
        const rawContextData = await this.collectContext();
        const features = await this.extractAndPurge(rawContextData);
        
        this.lastReading = { timestamp: Date.now(), features };
        this.readingCount++;
        
        return features;
    }
    
    async collectContext() {
        // 위치 정보 (권한 필요)
        let location = null;
        try {
            if ('geolocation' in navigator) {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false,
                        timeout: 5000
                    });
                });
                location = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };
            }
        } catch (e) {
            // 위치 권한 거부
        }
        
        return {
            timestamp: Date.now(),
            location,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            online: navigator.onLine,
            deviceMemory: navigator.deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency
        };
    }
    
    async extractFeatures(rawData) {
        const now = new Date();
        
        // 위치는 대략적인 영역으로만 변환 (Privacy)
        const locationArea = rawData.location 
            ? this.anonymizeLocation(rawData.location)
            : null;
        
        return {
            timeContext: {
                hour: now.getHours(),
                dayOfWeek: now.getDay(),
                isWeekend: now.getDay() === 0 || now.getDay() === 6,
                period: this.getTimePeriod(now.getHours())
            },
            locationArea, // 익명화된 위치
            environment: {
                timezone: rawData.timezone,
                language: rawData.language,
                online: rawData.online
            },
            deviceCapabilities: {
                memory: rawData.deviceMemory,
                cores: rawData.hardwareConcurrency
            }
        };
    }
    
    anonymizeLocation(location) {
        // 소수점 1자리로 반올림 (약 11km 정밀도)
        return {
            region: `${Math.round(location.lat)}_${Math.round(location.lng)}`,
            precision: 'city'
        };
    }
    
    getTimePeriod(hour) {
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }
}

// ================================================================
// 8. INTUITION SENSOR (직관 분석)
// Pattern Prediction, Anomaly Detection
// ================================================================

export class IntuitionSensor extends BaseSensor {
    constructor() {
        super('intuition', 'Intuition');
        this.patternHistory = [];
        this.anomalyThreshold = 2.0; // 표준편차
    }
    
    async init() {
        console.log('[IntuitionSensor] Initializing Pattern Predictor...');
    }
    
    // 다른 센서들의 데이터를 종합하여 분석
    async analyzeAllSensors(sensorReadings) {
        const rawIntuitionData = {
            timestamp: Date.now(),
            readings: sensorReadings
        };
        
        const features = await this.extractAndPurge(rawIntuitionData);
        
        this.lastReading = { timestamp: Date.now(), features };
        this.readingCount++;
        
        return features;
    }
    
    async read() {
        // IntuitionSensor는 단독으로 읽지 않음
        return this.lastReading?.features || null;
    }
    
    async extractFeatures(rawData) {
        const readings = rawData.readings || {};
        
        // 패턴 예측
        const prediction = this.predictNextPattern(readings);
        
        // 이상 감지
        const anomalies = this.detectAnomalies(readings);
        
        // 행동 추천
        const recommendation = this.generateRecommendation(readings, prediction);
        
        return {
            prediction,
            anomalies,
            recommendation,
            confidence: this.calculateConfidence(readings),
            insightType: this.classifyInsight(readings)
        };
    }
    
    predictNextPattern(readings) {
        // 패턴 이력 기반 예측
        this.patternHistory.push({
            timestamp: Date.now(),
            signature: this.createSignature(readings)
        });
        
        // 최근 100개만 유지
        if (this.patternHistory.length > 100) {
            this.patternHistory = this.patternHistory.slice(-100);
        }
        
        // 가장 유사한 이전 패턴 찾기
        const similar = this.findSimilarPattern(readings);
        
        return {
            nextAction: similar?.nextAction || 'unknown',
            confidence: similar?.similarity || 0,
            timeframe: '5min'
        };
    }
    
    createSignature(readings) {
        // 센서 데이터의 시그니처 생성
        return JSON.stringify({
            screen: readings.screen?.uiPatterns,
            log: readings.log?.dominantActivity,
            context: readings.context?.timeContext?.period
        });
    }
    
    findSimilarPattern(readings) {
        const currentSig = this.createSignature(readings);
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (let i = 0; i < this.patternHistory.length - 1; i++) {
            const similarity = this.calculateSimilarity(
                currentSig, 
                this.patternHistory[i].signature
            );
            
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = {
                    pattern: this.patternHistory[i],
                    nextAction: this.patternHistory[i + 1]?.signature,
                    similarity
                };
            }
        }
        
        return bestMatch;
    }
    
    calculateSimilarity(sig1, sig2) {
        // 간단한 유사도 계산
        if (sig1 === sig2) return 1.0;
        
        const s1 = sig1.split('');
        const s2 = sig2.split('');
        let matches = 0;
        
        for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
            if (s1[i] === s2[i]) matches++;
        }
        
        return matches / Math.max(s1.length, s2.length);
    }
    
    detectAnomalies(readings) {
        const anomalies = [];
        
        // 활동 이상
        if (readings.log?.activityRate > 100) {
            anomalies.push({
                type: 'high_activity',
                severity: 'medium',
                message: '비정상적으로 높은 활동량 감지'
            });
        }
        
        // 주의력 저하
        if (readings.video?.attention?.score < 0.3) {
            anomalies.push({
                type: 'low_attention',
                severity: 'low',
                message: '주의력 저하 감지'
            });
        }
        
        return anomalies;
    }
    
    generateRecommendation(readings, prediction) {
        // 맥락 기반 추천
        const context = readings.context?.timeContext;
        const attention = readings.video?.attention;
        
        if (attention?.score < 0.5 && context?.period === 'afternoon') {
            return {
                action: 'take_break',
                message: '잠시 휴식을 취하는 것이 좋겠습니다',
                priority: 'medium'
            };
        }
        
        return {
            action: 'continue',
            message: '현재 패턴 유지',
            priority: 'low'
        };
    }
    
    calculateConfidence(readings) {
        // 데이터 완성도 기반 신뢰도
        const sensorCount = Object.keys(readings).length;
        return Math.min(sensorCount / 8, 1);
    }
    
    classifyInsight(readings) {
        if (readings.bio?.estimatedStress?.level === 'high') return 'wellness';
        if (readings.log?.activityRate > 50) return 'productivity';
        return 'general';
    }
}

// ================================================================
// EIGHT SENSORS MANAGER
// ================================================================

export const EightSensors = {
    sensors: {},
    isInitialized: false,
    
    /**
     * Initialize all eight sensors
     */
    async init() {
        console.log('[EightSensors] Initializing All-Senses Intelligence...');
        
        // 센서 인스턴스 생성
        this.sensors = {
            screen: new ScreenSensor(),
            voice: new VoiceSensor(),
            video: new VideoSensor(),
            log: new LogSensor(),
            link: new LinkSensor(),
            bio: new BioSensor(),
            context: new ContextSensor(),
            intuition: new IntuitionSensor()
        };
        
        // 각 센서 초기화
        await Promise.all(
            Object.values(this.sensors).map(sensor => sensor.init())
        );
        
        this.isInitialized = true;
        console.log('[EightSensors] All sensors initialized');
        
        return this;
    },
    
    /**
     * Start all sensors
     */
    startAll() {
        Object.values(this.sensors).forEach(sensor => sensor.start());
        console.log('[EightSensors] All sensors started');
    },
    
    /**
     * Stop all sensors
     */
    stopAll() {
        Object.values(this.sensors).forEach(sensor => sensor.stop());
        console.log('[EightSensors] All sensors stopped');
    },
    
    /**
     * Read from all sensors
     */
    async readAll() {
        const readings = {};
        
        // 병렬로 모든 센서 읽기
        await Promise.all(
            Object.entries(this.sensors).map(async ([name, sensor]) => {
                if (name !== 'intuition') { // Intuition은 나중에
                    readings[name] = await sensor.read();
                }
            })
        );
        
        // Intuition 센서는 다른 모든 데이터를 분석
        readings.intuition = await this.sensors.intuition.analyzeAllSensors(readings);
        
        return readings;
    },
    
    /**
     * Get specific sensor
     */
    getSensor(name) {
        return this.sensors[name];
    },
    
    /**
     * Get all sensor statuses
     */
    getStatus() {
        const statuses = {};
        Object.entries(this.sensors).forEach(([name, sensor]) => {
            statuses[name] = sensor.getStatus();
        });
        
        return {
            initialized: this.isInitialized,
            sensors: statuses,
            activeSensorCount: Object.values(this.sensors)
                .filter(s => s.isActive).length
        };
    },
    
    /**
     * Mount to CorePhysicsKernel
     */
    mountToKernel(kernel) {
        Object.entries(this.sensors).forEach(([name, sensor]) => {
            kernel.registerSensor(name, sensor);
        });
        console.log('[EightSensors] Mounted to CorePhysicsKernel');
    }
};

export default EightSensors;




