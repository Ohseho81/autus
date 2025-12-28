// ================================================================
// VOICE LISTENER ENGINE (음성 인식 엔진)
// Web Speech API + Whisper.js 지원
// ================================================================

// ================================================================
// WEB SPEECH API (브라우저 내장)
// ================================================================

const WebSpeechRecognizer = {
    recognition: null,
    isSupported: false,
    isListening: false,
    
    /**
     * 초기화
     */
    init(lang = 'ko-KR') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('[WebSpeech] 이 브라우저에서 지원되지 않습니다');
            this.isSupported = false;
            return false;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.lang = lang;
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        
        this.isSupported = true;
        console.log(`[WebSpeech] 초기화 완료 (언어: ${lang})`);
        
        return true;
    },
    
    /**
     * 음성 인식 시작
     */
    start(callbacks = {}) {
        if (!this.isSupported) {
            throw new Error('Web Speech API가 지원되지 않습니다');
        }
        
        return new Promise((resolve, reject) => {
            const results = [];
            let finalTranscript = '';
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    const confidence = event.results[i][0].confidence;
                    
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                        results.push({
                            text: transcript,
                            confidence,
                            isFinal: true,
                            timestamp: Date.now()
                        });
                        
                        if (callbacks.onResult) {
                            callbacks.onResult({ text: transcript, confidence, isFinal: true });
                        }
                    } else {
                        interimTranscript += transcript;
                        
                        if (callbacks.onInterim) {
                            callbacks.onInterim({ text: transcript, confidence, isFinal: false });
                        }
                    }
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('[WebSpeech] 오류:', event.error);
                if (callbacks.onError) callbacks.onError(event.error);
                reject(new Error(event.error));
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                
                if (callbacks.onEnd) callbacks.onEnd();
                
                resolve({
                    transcript: finalTranscript.trim(),
                    results,
                    confidence: results.length > 0 
                        ? results.reduce((a, b) => a + b.confidence, 0) / results.length 
                        : 0
                });
            };
            
            this.recognition.start();
            this.isListening = true;
            
            if (callbacks.onStart) callbacks.onStart();
            console.log('[WebSpeech] 음성 인식 시작');
        });
    },
    
    /**
     * 음성 인식 중지
     */
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            console.log('[WebSpeech] 음성 인식 중지');
        }
    },
    
    /**
     * 언어 변경
     */
    setLanguage(lang) {
        if (this.recognition) {
            this.recognition.lang = lang;
            console.log(`[WebSpeech] 언어 변경: ${lang}`);
        }
    }
};

// ================================================================
// AUDIO RECORDER (오디오 녹음)
// ================================================================

const AudioRecorder = {
    mediaRecorder: null,
    audioChunks: [],
    stream: null,
    
    /**
     * 마이크 접근 권한 요청
     */
    async requestPermission() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                } 
            });
            console.log('[AudioRecorder] 마이크 권한 획득');
            return true;
        } catch (err) {
            console.error('[AudioRecorder] 마이크 접근 실패:', err);
            throw new Error('마이크 접근 권한이 필요합니다');
        }
    },
    
    /**
     * 녹음 시작
     */
    async start() {
        if (!this.stream) {
            await this.requestPermission();
        }
        
        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.start(100); // 100ms 간격으로 데이터 수집
        console.log('[AudioRecorder] 녹음 시작');
    },
    
    /**
     * 녹음 중지 및 Blob 반환
     */
    stop() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                console.log(`[AudioRecorder] 녹음 완료: ${(blob.size / 1024).toFixed(1)} KB`);
                resolve(blob);
            };
            
            this.mediaRecorder.stop();
        });
    },
    
    /**
     * 리소스 해제
     */
    release() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }
};

// ================================================================
// AUDIO ANALYZER (오디오 분석)
// ================================================================

const AudioAnalyzer = {
    audioContext: null,
    analyser: null,
    
    /**
     * 오디오 컨텍스트 생성
     */
    init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
    },
    
    /**
     * 실시간 볼륨 레벨 가져오기
     */
    getVolumeLevel(stream) {
        if (!this.audioContext) this.init();
        
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        return average / 255; // 0-1 범위
    },
    
    /**
     * 음성 감정 추정 (볼륨/속도 기반 간단 분석)
     */
    estimateEmotion(audioFeatures) {
        const { volume, speed, pitch } = audioFeatures;
        
        // 간단한 휴리스틱 기반 감정 추정
        if (volume > 0.7 && speed > 1.2) {
            return { emotion: 'excited', confidence: 0.6 };
        }
        if (volume < 0.3 && speed < 0.8) {
            return { emotion: 'calm', confidence: 0.6 };
        }
        if (volume > 0.5 && pitch > 1.1) {
            return { emotion: 'happy', confidence: 0.5 };
        }
        
        return { emotion: 'neutral', confidence: 0.7 };
    },
    
    /**
     * 말하기 속도 계산 (WPM)
     */
    calculateSpeakingRate(text, durationSeconds) {
        const wordCount = text.split(/\s+/).filter(w => w).length;
        const wpm = (wordCount / durationSeconds) * 60;
        
        return {
            wordCount,
            durationSeconds,
            wordsPerMinute: Math.round(wpm),
            pace: wpm > 150 ? 'fast' : wpm > 100 ? 'normal' : 'slow'
        };
    }
};

// ================================================================
// TEXT PROCESSOR (텍스트 처리)
// ================================================================

const VoiceTextProcessor = {
    /**
     * 텍스트 정규화
     */
    normalize(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/\.{2,}/g, '.')
            .replace(/\?{2,}/g, '?');
    },
    
    /**
     * 문장 분리
     */
    splitSentences(text) {
        return text
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    },
    
    /**
     * 키워드 추출
     */
    extractKeywords(text) {
        const words = text.match(/[가-힣]{2,}|[a-zA-Z]{3,}/g) || [];
        const freq = {};
        
        words.forEach(word => {
            const normalized = word.toLowerCase();
            freq[normalized] = (freq[normalized] || 0) + 1;
        });
        
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    },
    
    /**
     * 의도 감지 (간단한 패턴 매칭)
     */
    detectIntent(text) {
        const lowerText = text.toLowerCase();
        
        const patterns = {
            question: /[?？]|뭐|어디|언제|누가|왜|어떻게|what|where|when|who|why|how/,
            command: /해줘|해라|하세요|해주세요|please|do|make|create/,
            greeting: /안녕|반가|hello|hi|hey/,
            farewell: /잘가|bye|goodbye|안녕히/,
            affirmative: /네|예|응|맞아|그래|yes|yeah|right|correct/,
            negative: /아니|아뇨|no|nope|wrong/
        };
        
        for (const [intent, pattern] of Object.entries(patterns)) {
            if (pattern.test(lowerText)) {
                return { intent, confidence: 0.7 };
            }
        }
        
        return { intent: 'statement', confidence: 0.5 };
    }
};

// ================================================================
// PHYSICS CONVERTER (물리 속성 변환)
// ================================================================

const VoicePhysicsConverter = {
    /**
     * 음성 인식 결과를 물리 속성으로 변환
     */
    convert(voiceResult, audioFeatures = {}) {
        const { transcript, confidence, results } = voiceResult;
        const text = transcript || '';
        
        // 1. MASS = 텍스트 양 + 단어 수
        const wordCount = text.split(/\s+/).filter(w => w).length;
        const mass = Math.log10(text.length + 1) * 5 + wordCount * 0.5;
        
        // 2. ENERGY = 신뢰도 + 볼륨
        const volumeBonus = (audioFeatures.volume || 0.5) * 20;
        const energy = (confidence || 0.5) * 80 + volumeBonus;
        
        // 3. ENTROPY = 단어 다양성
        const keywords = VoiceTextProcessor.extractKeywords(text);
        const uniqueRatio = keywords.length / Math.max(wordCount, 1);
        const entropy = Math.min(uniqueRatio * 2, 1);
        
        // 4. VELOCITY = 말하기 속도
        const duration = audioFeatures.duration || 10;
        const wpm = (wordCount / duration) * 60;
        const velocity = Math.min(wpm / 100, 2);
        
        // 5. 추가 분석
        const sentences = VoiceTextProcessor.splitSentences(text);
        const intent = VoiceTextProcessor.detectIntent(text);
        const emotion = AudioAnalyzer.estimateEmotion(audioFeatures);
        
        return {
            mass: Math.round(mass * 100) / 100,
            energy: Math.round(energy * 100) / 100,
            entropy: Math.round(entropy * 1000) / 1000,
            velocity: Math.round(velocity * 100) / 100,
            
            metadata: {
                textLength: text.length,
                wordCount,
                sentenceCount: sentences.length,
                confidence,
                speakingRate: {
                    wpm: Math.round(wpm),
                    pace: wpm > 150 ? 'fast' : wpm > 100 ? 'normal' : 'slow'
                },
                emotion,
                intent,
                keywords: keywords.slice(0, 5)
            },
            
            rawTranscript: text,
            analyzedAt: new Date().toISOString()
        };
    }
};

// ================================================================
// VOICE LISTENER ENGINE (통합 엔진)
// ================================================================

export const VoiceListener = {
    // 컴포넌트
    webSpeech: WebSpeechRecognizer,
    recorder: AudioRecorder,
    analyzer: AudioAnalyzer,
    processor: VoiceTextProcessor,
    converter: VoicePhysicsConverter,
    
    // 상태
    isInitialized: false,
    isListening: false,
    history: [],
    lastResult: null,
    
    // 콜백
    onTranscript: null,
    onInterim: null,
    
    /**
     * 초기화
     */
    async init(lang = 'ko-KR') {
        console.log('[VoiceListener] 초기화 중...');
        
        // Web Speech API 초기화
        this.webSpeech.init(lang);
        
        // Audio Analyzer 초기화
        this.analyzer.init();
        
        this.isInitialized = true;
        console.log('[VoiceListener] 초기화 완료');
        
        return this;
    },
    
    /**
     * 실시간 음성 인식 시작
     */
    async startListening(options = {}) {
        if (!this.isInitialized) {
            await this.init(options.lang);
        }
        
        if (this.isListening) {
            console.warn('[VoiceListener] 이미 듣는 중입니다');
            return;
        }
        
        this.isListening = true;
        const startTime = Date.now();
        
        console.log('[VoiceListener] 음성 인식 시작...');
        
        try {
            const result = await this.webSpeech.start({
                onResult: (data) => {
                    if (this.onTranscript) this.onTranscript(data);
                },
                onInterim: (data) => {
                    if (this.onInterim) this.onInterim(data);
                },
                onStart: options.onStart,
                onEnd: options.onEnd,
                onError: options.onError
            });
            
            const duration = (Date.now() - startTime) / 1000;
            
            // 물리 속성 변환
            const physics = this.converter.convert(result, { duration });
            
            // 결과 저장
            this.lastResult = { voice: result, physics };
            this.history.push({
                timestamp: new Date().toISOString(),
                duration,
                textLength: result.transcript.length,
                confidence: result.confidence
            });
            
            return { voice: result, physics };
            
        } finally {
            this.isListening = false;
        }
    },
    
    /**
     * 음성 인식 중지
     */
    stopListening() {
        this.webSpeech.stop();
        this.isListening = false;
        console.log('[VoiceListener] 음성 인식 중지');
    },
    
    /**
     * 녹음 후 처리 (파일용)
     */
    async recordAndProcess(durationMs = 10000) {
        console.log(`[VoiceListener] ${durationMs/1000}초 녹음 시작...`);
        
        await this.recorder.start();
        
        // 지정된 시간 동안 녹음
        await new Promise(resolve => setTimeout(resolve, durationMs));
        
        const audioBlob = await this.recorder.stop();
        
        // Web Speech API로 동시에 인식했다면 그 결과 사용
        // 아니면 녹음된 오디오 반환
        
        return {
            audioBlob,
            duration: durationMs / 1000,
            size: audioBlob ? audioBlob.size : 0
        };
    },
    
    /**
     * 요약 생성
     */
    generateSummary(result) {
        const { voice, physics } = result;
        
        return {
            transcript: voice.transcript.substring(0, 200) + 
                       (voice.transcript.length > 200 ? '...' : ''),
            
            interpretation: {
                mass: physics.mass > 20 
                    ? '📊 풍부한 발화량' 
                    : physics.mass > 10 
                        ? '📋 적정 발화량'
                        : '📝 짧은 발화',
                
                energy: physics.energy > 70 
                    ? '✨ 높은 인식 신뢰도'
                    : physics.energy > 50 
                        ? '👍 양호한 인식 품질'
                        : '⚠️ 인식 품질 주의',
                
                velocity: physics.metadata.speakingRate.pace === 'fast'
                    ? '🚀 빠른 말하기 속도'
                    : physics.metadata.speakingRate.pace === 'normal'
                        ? '➡️ 보통 속도'
                        : '🐢 느린 속도'
            },
            
            insights: {
                intent: physics.metadata.intent.intent,
                emotion: physics.metadata.emotion.emotion,
                topKeywords: physics.metadata.keywords.map(k => k.word)
            }
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            listening: this.isListening,
            webSpeechSupported: this.webSpeech.isSupported,
            historyCount: this.history.length,
            lastResult: this.lastResult ? {
                textLength: this.lastResult.voice.transcript.length,
                confidence: this.lastResult.voice.confidence
            } : null
        };
    },
    
    /**
     * 리소스 해제
     */
    release() {
        this.webSpeech.stop();
        this.recorder.release();
        this.isListening = false;
        console.log('[VoiceListener] 리소스 해제');
    }
};

// ================================================================
// 테스트 함수
// ================================================================

export async function testVoiceListener() {
    console.log('='.repeat(50));
    console.log('[TEST] VoiceListener 테스트');
    console.log('='.repeat(50));
    
    // 텍스트 처리 테스트
    const sampleText = '안녕하세요. 오늘 수업은 수학입니다. 어떻게 생각하세요?';
    
    console.log('\n[TEST] 텍스트 처리 테스트:');
    console.log('입력:', sampleText);
    
    const normalized = VoiceTextProcessor.normalize(sampleText);
    console.log('정규화:', normalized);
    
    const sentences = VoiceTextProcessor.splitSentences(sampleText);
    console.log('문장 분리:', sentences);
    
    const keywords = VoiceTextProcessor.extractKeywords(sampleText);
    console.log('키워드:', keywords);
    
    const intent = VoiceTextProcessor.detectIntent(sampleText);
    console.log('의도:', intent);
    
    // 물리 변환 테스트
    console.log('\n[TEST] 물리 속성 변환:');
    const physics = VoicePhysicsConverter.convert({
        transcript: sampleText,
        confidence: 0.85,
        results: []
    }, { duration: 5, volume: 0.6 });
    
    console.log('Mass:', physics.mass);
    console.log('Energy:', physics.energy);
    console.log('Entropy:', physics.entropy);
    console.log('Velocity:', physics.velocity);
    
    console.log('\n' + '='.repeat(50));
    console.log('[TEST] 완료!');
    console.log('실제 음성 인식 테스트: VoiceListener.startListening()');
    console.log('='.repeat(50));
}

// ================================================================
// EXPORTS
// ================================================================

export { 
    WebSpeechRecognizer, 
    AudioRecorder, 
    AudioAnalyzer, 
    VoiceTextProcessor, 
    VoicePhysicsConverter 
};

export default VoiceListener;




