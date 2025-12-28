// ================================================================
// VIDEO ANALYZER ENGINE (영상 분석 엔진)
// FaceDetector API + 주의력 추적 + 자세 분석
// ================================================================

// ================================================================
// WEBCAM MANAGER (웹캠 관리)
// ================================================================

const WebcamManager = {
    stream: null,
    video: null,
    isActive: false,
    
    /**
     * 웹캠 시작
     */
    async start(options = {}) {
        const constraints = {
            video: {
                width: options.width || 640,
                height: options.height || 480,
                facingMode: options.facingMode || 'user',
                frameRate: options.frameRate || 30
            }
        };
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.video = document.createElement('video');
            this.video.srcObject = this.stream;
            this.video.autoplay = true;
            this.video.playsInline = true;
            
            await this.video.play();
            
            this.isActive = true;
            console.log('[WebcamManager] 웹캠 시작');
            
            return this.video;
        } catch (err) {
            throw new Error('웹캠 접근 실패: ' + err.message);
        }
    },
    
    /**
     * 프레임 캡처
     */
    captureFrame() {
        if (!this.video || !this.isActive) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        
        return canvas;
    },
    
    /**
     * 웹캠 중지
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.video) {
            this.video.srcObject = null;
            this.video = null;
        }
        
        this.isActive = false;
        console.log('[WebcamManager] 웹캠 중지');
    },
    
    /**
     * 비디오 엘리먼트를 DOM에 추가
     */
    attachToElement(container) {
        if (this.video && container) {
            this.video.style.cssText = `
                width: 100%;
                max-width: 640px;
                border-radius: 8px;
                transform: scaleX(-1);
            `;
            container.appendChild(this.video);
        }
    }
};

// ================================================================
// FACE DETECTOR (얼굴 감지)
// ================================================================

const FaceDetectorModule = {
    detector: null,
    isSupported: false,
    
    /**
     * FaceDetector API 확인 및 초기화
     */
    async init() {
        if ('FaceDetector' in window) {
            try {
                this.detector = new window.FaceDetector({
                    fastMode: true,
                    maxDetectedFaces: 5
                });
                this.isSupported = true;
                console.log('[FaceDetector] API 사용 가능');
                return true;
            } catch (err) {
                console.warn('[FaceDetector] 초기화 실패:', err);
            }
        }
        
        console.log('[FaceDetector] API 미지원 - 폴백 모드');
        this.isSupported = false;
        return false;
    },
    
    /**
     * 얼굴 감지
     */
    async detect(imageSource) {
        if (!this.isSupported || !this.detector) {
            return this.fallbackDetect(imageSource);
        }
        
        try {
            const faces = await this.detector.detect(imageSource);
            
            return faces.map(face => ({
                boundingBox: {
                    x: face.boundingBox.x,
                    y: face.boundingBox.y,
                    width: face.boundingBox.width,
                    height: face.boundingBox.height
                },
                landmarks: face.landmarks?.map(l => ({
                    type: l.type,
                    locations: l.locations.map(loc => ({ x: loc.x, y: loc.y }))
                })) || [],
                confidence: 0.9 // API는 신뢰도를 제공하지 않으므로 기본값
            }));
        } catch (err) {
            console.warn('[FaceDetector] 감지 오류:', err);
            return this.fallbackDetect(imageSource);
        }
    },
    
    /**
     * 폴백 감지 (간단한 피부색 기반)
     */
    fallbackDetect(imageSource) {
        // Canvas에서 이미지 데이터 추출
        const canvas = imageSource instanceof HTMLCanvasElement 
            ? imageSource 
            : this.imageToCanvas(imageSource);
        
        if (!canvas) return [];
        
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 간단한 피부색 영역 감지
        let skinPixels = 0;
        let sumX = 0, sumY = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 간단한 피부색 범위 체크
            if (this.isSkinColor(r, g, b)) {
                const pixelIndex = i / 4;
                const x = pixelIndex % canvas.width;
                const y = Math.floor(pixelIndex / canvas.width);
                
                sumX += x;
                sumY += y;
                skinPixels++;
            }
        }
        
        if (skinPixels > (canvas.width * canvas.height * 0.05)) {
            // 5% 이상 피부색이면 얼굴 있음으로 추정
            const centerX = sumX / skinPixels;
            const centerY = sumY / skinPixels;
            
            return [{
                boundingBox: {
                    x: centerX - 100,
                    y: centerY - 100,
                    width: 200,
                    height: 200
                },
                landmarks: [],
                confidence: 0.5, // 폴백은 낮은 신뢰도
                isFallback: true
            }];
        }
        
        return [];
    },
    
    /**
     * 피부색 판별
     */
    isSkinColor(r, g, b) {
        // YCbCr 색공간 기반 피부색 감지
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;
        
        return cr >= 133 && cr <= 173 && 
               cb >= 77 && cb <= 127 &&
               y >= 80;
    },
    
    /**
     * 이미지를 Canvas로 변환
     */
    imageToCanvas(imageSource) {
        if (imageSource instanceof HTMLCanvasElement) return imageSource;
        
        if (imageSource instanceof HTMLVideoElement || 
            imageSource instanceof HTMLImageElement) {
            const canvas = document.createElement('canvas');
            canvas.width = imageSource.videoWidth || imageSource.width;
            canvas.height = imageSource.videoHeight || imageSource.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageSource, 0, 0);
            
            return canvas;
        }
        
        return null;
    }
};

// ================================================================
// ATTENTION TRACKER (주의력 추적)
// ================================================================

const AttentionTracker = {
    history: [],
    maxHistory: 100,
    lastFacePosition: null,
    
    /**
     * 주의력 점수 계산
     */
    calculate(faces, canvasSize) {
        if (faces.length === 0) {
            this.recordHistory(0, 'no_face');
            return {
                score: 0,
                status: 'NO_FACE',
                reason: '얼굴이 감지되지 않았습니다',
                eyeContact: false
            };
        }
        
        // 가장 큰 얼굴 (가장 가까운) 선택
        const mainFace = faces.reduce((a, b) => 
            (a.boundingBox.width * a.boundingBox.height) > 
            (b.boundingBox.width * b.boundingBox.height) ? a : b
        );
        
        const box = mainFace.boundingBox;
        const { width: canvasWidth, height: canvasHeight } = canvasSize;
        
        // 1. 얼굴 위치 점수 (중앙에 가까울수록 높음)
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        const distanceFromCenter = Math.sqrt(
            Math.pow((centerX - canvasWidth / 2) / (canvasWidth / 2), 2) +
            Math.pow((centerY - canvasHeight / 2) / (canvasHeight / 2), 2)
        );
        
        const positionScore = Math.max(0, 1 - distanceFromCenter * 0.7);
        
        // 2. 얼굴 크기 점수 (적당한 크기가 좋음)
        const faceRatio = (box.width * box.height) / (canvasWidth * canvasHeight);
        const idealRatio = 0.15; // 화면의 15%가 이상적
        const sizeScore = Math.max(0, 1 - Math.abs(faceRatio - idealRatio) * 5);
        
        // 3. 움직임 점수 (너무 많이 움직이면 감점)
        let movementScore = 1;
        if (this.lastFacePosition) {
            const dx = centerX - this.lastFacePosition.x;
            const dy = centerY - this.lastFacePosition.y;
            const movement = Math.sqrt(dx * dx + dy * dy);
            movementScore = Math.max(0, 1 - movement / 100);
        }
        
        this.lastFacePosition = { x: centerX, y: centerY };
        
        // 4. 얼굴 방향 (정면 응시 추정)
        let eyeContactScore = 0.7; // 기본값
        if (mainFace.landmarks?.length > 0) {
            // 랜드마크가 있으면 더 정확한 분석 가능
            eyeContactScore = this.estimateEyeContact(mainFace.landmarks);
        }
        
        // 종합 점수
        const totalScore = (
            positionScore * 0.25 +
            sizeScore * 0.20 +
            movementScore * 0.25 +
            eyeContactScore * 0.30
        );
        
        // 상태 결정
        let status, reason;
        if (totalScore > 0.8) {
            status = 'FOCUSED';
            reason = '집중하고 있습니다';
        } else if (totalScore > 0.6) {
            status = 'ATTENTIVE';
            reason = '주의를 기울이고 있습니다';
        } else if (totalScore > 0.4) {
            status = 'DISTRACTED';
            reason = '주의가 분산되어 있습니다';
        } else {
            status = 'AWAY';
            reason = '화면을 보고 있지 않습니다';
        }
        
        this.recordHistory(totalScore, status);
        
        return {
            score: Math.round(totalScore * 100) / 100,
            status,
            reason,
            eyeContact: eyeContactScore > 0.6,
            components: {
                position: Math.round(positionScore * 100) / 100,
                size: Math.round(sizeScore * 100) / 100,
                movement: Math.round(movementScore * 100) / 100,
                eyeContact: Math.round(eyeContactScore * 100) / 100
            }
        };
    },
    
    /**
     * 눈 맞춤 추정
     */
    estimateEyeContact(landmarks) {
        // 랜드마크 기반 눈 위치 분석
        const eyes = landmarks.filter(l => 
            l.type === 'eye' || l.type === 'leftEye' || l.type === 'rightEye'
        );
        
        if (eyes.length < 2) return 0.7;
        
        // 두 눈의 수평 정렬도로 정면 응시 추정
        const leftEye = eyes[0].locations[0];
        const rightEye = eyes[1].locations[0];
        
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        const horizontalScore = Math.cos(angle);
        
        return Math.max(0, horizontalScore);
    },
    
    /**
     * 이력 기록
     */
    recordHistory(score, status) {
        this.history.push({
            score,
            status,
            timestamp: Date.now()
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    },
    
    /**
     * 평균 주의력 계산
     */
    getAverageAttention(seconds = 30) {
        const cutoff = Date.now() - seconds * 1000;
        const recent = this.history.filter(h => h.timestamp > cutoff);
        
        if (recent.length === 0) return null;
        
        const avgScore = recent.reduce((a, b) => a + b.score, 0) / recent.length;
        
        // 상태별 비율
        const statusCounts = {};
        recent.forEach(h => {
            statusCounts[h.status] = (statusCounts[h.status] || 0) + 1;
        });
        
        return {
            averageScore: Math.round(avgScore * 100) / 100,
            sampleCount: recent.length,
            statusBreakdown: statusCounts,
            dominantStatus: Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])[0]?.[0]
        };
    },
    
    /**
     * 이력 초기화
     */
    reset() {
        this.history = [];
        this.lastFacePosition = null;
    }
};

// ================================================================
// POSTURE ANALYZER (자세 분석)
// ================================================================

const PostureAnalyzer = {
    /**
     * 자세 분석 (얼굴 기반 추정)
     */
    analyze(faces, canvasSize) {
        if (faces.length === 0) {
            return {
                status: 'UNKNOWN',
                issues: ['얼굴을 감지할 수 없습니다'],
                score: 0
            };
        }
        
        const face = faces[0];
        const box = face.boundingBox;
        const { width: canvasWidth, height: canvasHeight } = canvasSize;
        
        const issues = [];
        let score = 100;
        
        // 1. 거리 체크 (얼굴 크기로 추정)
        const faceRatio = (box.width * box.height) / (canvasWidth * canvasHeight);
        
        if (faceRatio > 0.3) {
            issues.push('화면과 너무 가깝습니다');
            score -= 20;
        } else if (faceRatio < 0.05) {
            issues.push('화면과 너무 멉니다');
            score -= 15;
        }
        
        // 2. 수평 위치 체크
        const centerX = box.x + box.width / 2;
        const horizontalOffset = Math.abs(centerX - canvasWidth / 2) / (canvasWidth / 2);
        
        if (horizontalOffset > 0.4) {
            issues.push('화면 중앙을 바라봐 주세요');
            score -= 15;
        }
        
        // 3. 수직 위치 체크
        const centerY = box.y + box.height / 2;
        const verticalPosition = centerY / canvasHeight;
        
        if (verticalPosition < 0.3) {
            issues.push('고개를 약간 내려주세요');
            score -= 10;
        } else if (verticalPosition > 0.7) {
            issues.push('고개를 약간 올려주세요');
            score -= 10;
        }
        
        // 4. 기울기 체크 (랜드마크 있을 경우)
        if (face.landmarks?.length > 1) {
            const eyes = face.landmarks.filter(l => 
                l.type?.includes('eye') || l.type?.includes('Eye')
            );
            
            if (eyes.length >= 2) {
                const leftEye = eyes[0].locations[0];
                const rightEye = eyes[1].locations[0];
                const tiltAngle = Math.abs(Math.atan2(
                    rightEye.y - leftEye.y,
                    rightEye.x - leftEye.x
                ) * 180 / Math.PI);
                
                if (tiltAngle > 10) {
                    issues.push('고개가 기울어져 있습니다');
                    score -= 15;
                }
            }
        }
        
        // 상태 결정
        let status;
        if (score >= 90) status = 'EXCELLENT';
        else if (score >= 70) status = 'GOOD';
        else if (score >= 50) status = 'FAIR';
        else status = 'POOR';
        
        return {
            status,
            score: Math.max(0, score),
            issues,
            recommendations: issues.length > 0 
                ? issues 
                : ['자세가 좋습니다!']
        };
    }
};

// ================================================================
// PHYSICS CONVERTER (물리 속성 변환)
// ================================================================

const VideoPhysicsConverter = {
    /**
     * 영상 분석 결과를 물리 속성으로 변환
     */
    convert(analysisResult) {
        const { faces, attention, posture, duration } = analysisResult;
        
        // 1. MASS = 프레임 처리량 + 얼굴 수
        const mass = Math.log10(duration * 30 + 1) * 5 + faces.length * 10;
        
        // 2. ENERGY = 주의력 점수
        const energy = attention.score * 100;
        
        // 3. ENTROPY = 움직임/변화량
        const entropy = 1 - (attention.components?.movement || 0.5);
        
        // 4. VELOCITY = 자세 점수 기반 안정성
        const velocity = posture.score / 100;
        
        return {
            mass: Math.round(mass * 100) / 100,
            energy: Math.round(energy * 100) / 100,
            entropy: Math.round(entropy * 1000) / 1000,
            velocity: Math.round(velocity * 100) / 100,
            
            metadata: {
                faceCount: faces.length,
                attention: {
                    score: attention.score,
                    status: attention.status,
                    eyeContact: attention.eyeContact
                },
                posture: {
                    status: posture.status,
                    score: posture.score,
                    issues: posture.issues
                },
                duration
            },
            
            analyzedAt: new Date().toISOString()
        };
    }
};

// ================================================================
// VIDEO ANALYZER ENGINE (통합 엔진)
// ================================================================

export const VideoAnalyzer = {
    // 컴포넌트
    webcam: WebcamManager,
    faceDetector: FaceDetectorModule,
    attentionTracker: AttentionTracker,
    postureAnalyzer: PostureAnalyzer,
    converter: VideoPhysicsConverter,
    
    // 상태
    isInitialized: false,
    isRunning: false,
    analysisInterval: null,
    lastResult: null,
    history: [],
    
    // 콜백
    onAnalysis: null,
    onAttentionChange: null,
    
    /**
     * 초기화
     */
    async init() {
        console.log('[VideoAnalyzer] 초기화 중...');
        
        await this.faceDetector.init();
        
        this.isInitialized = true;
        console.log('[VideoAnalyzer] 초기화 완료');
        
        return this;
    },
    
    /**
     * 실시간 분석 시작
     */
    async start(options = {}) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        // 웹캠 시작
        await this.webcam.start(options);
        
        if (options.container) {
            this.webcam.attachToElement(options.container);
        }
        
        // 분석 루프 시작
        const interval = options.interval || 500; // 500ms 기본
        this.isRunning = true;
        
        const startTime = Date.now();
        
        this.analysisInterval = setInterval(async () => {
            const result = await this.analyzeFrame();
            result.duration = (Date.now() - startTime) / 1000;
            
            this.lastResult = result;
            
            if (this.onAnalysis) {
                this.onAnalysis(result);
            }
            
            // 주의력 변화 감지
            if (this.onAttentionChange && this.history.length > 1) {
                const prev = this.history[this.history.length - 2]?.attention?.status;
                const curr = result.attention.status;
                
                if (prev !== curr) {
                    this.onAttentionChange(curr, prev);
                }
            }
            
        }, interval);
        
        console.log(`[VideoAnalyzer] 분석 시작 (간격: ${interval}ms)`);
    },
    
    /**
     * 단일 프레임 분석
     */
    async analyzeFrame() {
        const canvas = this.webcam.captureFrame();
        if (!canvas) return null;
        
        const canvasSize = { width: canvas.width, height: canvas.height };
        
        // 얼굴 감지
        const faces = await this.faceDetector.detect(canvas);
        
        // 주의력 분석
        const attention = this.attentionTracker.calculate(faces, canvasSize);
        
        // 자세 분석
        const posture = this.postureAnalyzer.analyze(faces, canvasSize);
        
        const result = {
            faces,
            attention,
            posture,
            timestamp: Date.now()
        };
        
        // 물리 속성 변환
        result.physics = this.converter.convert({
            ...result,
            duration: 1
        });
        
        // 이력 저장
        this.history.push(result);
        if (this.history.length > 100) {
            this.history.shift();
        }
        
        return result;
    },
    
    /**
     * 분석 중지
     */
    stop() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
        
        this.webcam.stop();
        this.isRunning = false;
        
        console.log('[VideoAnalyzer] 분석 중지');
    },
    
    /**
     * 스냅샷 분석 (단발성)
     */
    async snapshot() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        // 웹캠에서 단일 프레임 캡처
        await this.webcam.start();
        await new Promise(resolve => setTimeout(resolve, 500)); // 안정화 대기
        
        const result = await this.analyzeFrame();
        
        this.webcam.stop();
        
        return result;
    },
    
    /**
     * 요약 생성
     */
    generateSummary(result) {
        if (!result) return null;
        
        const avgAttention = this.attentionTracker.getAverageAttention(30);
        
        return {
            current: {
                attention: result.attention.status,
                attentionScore: result.attention.score,
                posture: result.posture.status,
                postureScore: result.posture.score,
                faceDetected: result.faces.length > 0
            },
            
            interpretation: {
                attention: result.attention.score > 0.7 
                    ? '👁️ 높은 집중도'
                    : result.attention.score > 0.5 
                        ? '👀 보통 집중도'
                        : '⚠️ 주의 분산',
                
                posture: result.posture.score > 80 
                    ? '✅ 좋은 자세'
                    : result.posture.score > 60 
                        ? '👍 양호한 자세'
                        : '⚠️ 자세 교정 필요',
                
                eyeContact: result.attention.eyeContact 
                    ? '👁️ 화면 응시 중'
                    : '👀 시선 이탈'
            },
            
            average: avgAttention,
            
            recommendations: result.posture.issues
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            faceDetectorSupported: this.faceDetector.isSupported,
            historyCount: this.history.length,
            avgAttention: this.attentionTracker.getAverageAttention(30),
            lastResult: this.lastResult ? {
                faceCount: this.lastResult.faces.length,
                attention: this.lastResult.attention.status,
                posture: this.lastResult.posture.status
            } : null
        };
    },
    
    /**
     * 리소스 해제
     */
    release() {
        this.stop();
        this.attentionTracker.reset();
        this.history = [];
        console.log('[VideoAnalyzer] 리소스 해제');
    }
};

// ================================================================
// 테스트 함수
// ================================================================

export async function testVideoAnalyzer() {
    console.log('='.repeat(50));
    console.log('[TEST] VideoAnalyzer 테스트');
    console.log('='.repeat(50));
    
    console.log('\n[TEST] FaceDetector API 지원 여부:');
    const supported = 'FaceDetector' in window;
    console.log('FaceDetector API:', supported ? '✅ 지원' : '❌ 미지원 (폴백 사용)');
    
    console.log('\n[TEST] 주의력 계산 테스트:');
    
    // 가상 얼굴 데이터로 테스트
    const mockFace = {
        boundingBox: { x: 200, y: 150, width: 200, height: 200 },
        landmarks: [],
        confidence: 0.9
    };
    
    const canvasSize = { width: 640, height: 480 };
    
    const attention = AttentionTracker.calculate([mockFace], canvasSize);
    console.log('주의력 점수:', attention.score);
    console.log('상태:', attention.status);
    console.log('이유:', attention.reason);
    
    console.log('\n[TEST] 자세 분석 테스트:');
    const posture = PostureAnalyzer.analyze([mockFace], canvasSize);
    console.log('자세 점수:', posture.score);
    console.log('상태:', posture.status);
    console.log('권장사항:', posture.recommendations);
    
    console.log('\n[TEST] 물리 속성 변환:');
    const physics = VideoPhysicsConverter.convert({
        faces: [mockFace],
        attention,
        posture,
        duration: 10
    });
    
    console.log('Mass:', physics.mass);
    console.log('Energy:', physics.energy);
    console.log('Entropy:', physics.entropy);
    console.log('Velocity:', physics.velocity);
    
    console.log('\n' + '='.repeat(50));
    console.log('[TEST] 완료!');
    console.log('실제 테스트: VideoAnalyzer.start({ container: element })');
    console.log('='.repeat(50));
}

// ================================================================
// EXPORTS
// ================================================================

export { 
    WebcamManager, 
    FaceDetectorModule, 
    AttentionTracker, 
    PostureAnalyzer,
    VideoPhysicsConverter 
};

export default VideoAnalyzer;




