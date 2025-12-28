// ================================================================
// SCREEN SCANNER ENGINE (화면 스캔 엔진)
// Tesseract.js OCR로 화면/이미지 텍스트 추출
// ================================================================

// ================================================================
// TESSERACT LOADER (동적 로드)
// ================================================================

const TesseractLoader = {
    Tesseract: null,
    worker: null,
    isLoaded: false,
    isInitialized: false,
    
    /**
     * Tesseract.js CDN에서 동적 로드
     */
    async load() {
        if (this.isLoaded) return this.Tesseract;
        
        console.log('[TesseractLoader] 라이브러리 로딩 중...');
        
        try {
            // CDN에서 로드
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error('Tesseract.js 로드 실패'));
                document.head.appendChild(script);
            });
            
            this.Tesseract = window.Tesseract;
            this.isLoaded = true;
            console.log('[TesseractLoader] 로드 완료');
            
            return this.Tesseract;
        } catch (err) {
            console.error('[TesseractLoader] 오류:', err);
            throw err;
        }
    },
    
    /**
     * Worker 초기화
     */
    async initWorker(lang = 'kor+eng') {
        if (this.isInitialized) return this.worker;
        
        await this.load();
        
        console.log(`[TesseractLoader] Worker 초기화 중 (언어: ${lang})...`);
        
        this.worker = await this.Tesseract.createWorker(lang, 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    if (progress % 20 === 0) {
                        console.log(`[OCR] 진행률: ${progress}%`);
                    }
                }
            }
        });
        
        this.isInitialized = true;
        console.log('[TesseractLoader] Worker 준비 완료');
        
        return this.worker;
    },
    
    /**
     * Worker 종료
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
        }
    }
};

// ================================================================
// IMAGE CAPTURER (이미지 캡처)
// ================================================================

const ImageCapturer = {
    /**
     * 파일에서 이미지 로드
     */
    async fromFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,.pdf';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('파일이 선택되지 않았습니다'));
                    return;
                }
                
                const url = URL.createObjectURL(file);
                resolve({
                    source: 'file',
                    url,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            };
            
            input.click();
        });
    },
    
    /**
     * 클립보드에서 이미지 가져오기
     */
    async fromClipboard() {
        try {
            const items = await navigator.clipboard.read();
            
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const url = URL.createObjectURL(blob);
                        
                        return {
                            source: 'clipboard',
                            url,
                            type,
                            size: blob.size
                        };
                    }
                }
            }
            
            throw new Error('클립보드에 이미지가 없습니다');
        } catch (err) {
            throw new Error('클립보드 접근 실패: ' + err.message);
        }
    },
    
    /**
     * 화면 캡처 (Screen Capture API)
     */
    async fromScreen() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' }
            });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();
            
            // 프레임 캡처
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            // 스트림 정지
            stream.getTracks().forEach(track => track.stop());
            
            const url = canvas.toDataURL('image/png');
            
            return {
                source: 'screen',
                url,
                width: canvas.width,
                height: canvas.height
            };
        } catch (err) {
            throw new Error('화면 캡처 실패: ' + err.message);
        }
    },
    
    /**
     * 웹캠에서 캡처
     */
    async fromWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();
            
            // 잠시 대기 후 캡처
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            stream.getTracks().forEach(track => track.stop());
            
            const url = canvas.toDataURL('image/png');
            
            return {
                source: 'webcam',
                url,
                width: canvas.width,
                height: canvas.height
            };
        } catch (err) {
            throw new Error('웹캠 캡처 실패: ' + err.message);
        }
    },
    
    /**
     * URL에서 이미지 로드
     */
    async fromURL(imageUrl) {
        return {
            source: 'url',
            url: imageUrl
        };
    },
    
    /**
     * Canvas에서 이미지
     */
    fromCanvas(canvas) {
        return {
            source: 'canvas',
            url: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height
        };
    }
};

// ================================================================
// TEXT ANALYZER (텍스트 분석)
// ================================================================

const TextAnalyzer = {
    /**
     * 텍스트에서 숫자 추출
     */
    extractNumbers(text) {
        const patterns = {
            currency: /[₩$€¥]?\s*[\d,]+(?:\.\d+)?/g,
            percentage: /\d+(?:\.\d+)?%/g,
            phone: /\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
            date: /\d{4}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]\d{4}/g,
            plain: /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g
        };
        
        const results = {};
        Object.entries(patterns).forEach(([key, pattern]) => {
            results[key] = text.match(pattern) || [];
        });
        
        return results;
    },
    
    /**
     * 텍스트에서 키워드 추출
     */
    extractKeywords(text, minLength = 2) {
        // 한글, 영문 단어 추출
        const words = text.match(/[가-힣]+|[a-zA-Z]+/g) || [];
        
        // 빈도 계산
        const freq = {};
        words.forEach(word => {
            if (word.length >= minLength) {
                const normalized = word.toLowerCase();
                freq[normalized] = (freq[normalized] || 0) + 1;
            }
        });
        
        // 정렬
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word, count]) => ({ word, count }));
    },
    
    /**
     * 텍스트 구조 분석
     */
    analyzeStructure(text) {
        const lines = text.split('\n').filter(l => l.trim());
        
        return {
            totalChars: text.length,
            totalLines: lines.length,
            avgLineLength: lines.length > 0 
                ? Math.round(text.length / lines.length) 
                : 0,
            hasTable: /[|┃│┌┐└┘├┤┬┴┼]+/.test(text) || 
                     (text.match(/\t/g) || []).length > 3,
            hasList: /^[\s]*[•\-\*\d+\.]\s/m.test(text),
            hasEmail: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text),
            hasURL: /https?:\/\/[^\s]+/.test(text)
        };
    },
    
    /**
     * 언어 감지
     */
    detectLanguage(text) {
        const korean = (text.match(/[가-힣]/g) || []).length;
        const english = (text.match(/[a-zA-Z]/g) || []).length;
        const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const japanese = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
        
        const total = korean + english + chinese + japanese;
        if (total === 0) return { primary: 'unknown', confidence: 0 };
        
        const ratios = {
            korean: korean / total,
            english: english / total,
            chinese: chinese / total,
            japanese: japanese / total
        };
        
        const primary = Object.entries(ratios)
            .sort((a, b) => b[1] - a[1])[0];
        
        return {
            primary: primary[0],
            confidence: primary[1],
            breakdown: ratios
        };
    }
};

// ================================================================
// PHYSICS CONVERTER (물리 속성 변환)
// ================================================================

const ScreenPhysicsConverter = {
    /**
     * OCR 결과를 물리 속성으로 변환
     */
    convert(ocrResult) {
        const { text, confidence, words, lines } = ocrResult;
        
        // 1. MASS = 텍스트 양 + 숫자 가치
        const numbers = TextAnalyzer.extractNumbers(text);
        const numericValues = numbers.plain
            .map(n => parseFloat(n.replace(/,/g, '')))
            .filter(n => !isNaN(n));
        
        const textMass = Math.log10(text.length + 1) * 5;
        const numericMass = numericValues.reduce((a, b) => a + Math.log10(Math.abs(b) + 1), 0);
        const mass = textMass + numericMass;
        
        // 2. ENERGY = OCR 신뢰도 기반
        const energy = confidence * 100;
        
        // 3. ENTROPY = 텍스트 다양성
        const keywords = TextAnalyzer.extractKeywords(text);
        const uniqueRatio = keywords.length / Math.max(text.split(/\s+/).length, 1);
        const entropy = Math.min(uniqueRatio, 1);
        
        // 4. VELOCITY = 정보 밀도
        const structure = TextAnalyzer.analyzeStructure(text);
        const infoPerLine = structure.totalChars / Math.max(structure.totalLines, 1);
        const velocity = Math.min(infoPerLine / 50, 2);
        
        // 5. 추출된 데이터
        const extracted = {
            numbers,
            keywords: keywords.slice(0, 10),
            structure,
            language: TextAnalyzer.detectLanguage(text)
        };
        
        return {
            mass: Math.round(mass * 100) / 100,
            energy: Math.round(energy * 100) / 100,
            entropy: Math.round(entropy * 1000) / 1000,
            velocity: Math.round(velocity * 100) / 100,
            
            // 메타데이터
            metadata: {
                textLength: text.length,
                wordCount: words?.length || text.split(/\s+/).length,
                lineCount: lines?.length || structure.totalLines,
                confidence,
                extracted
            },
            
            // 원본 텍스트 (프라이버시 주의)
            rawText: text,
            
            analyzedAt: new Date().toISOString()
        };
    }
};

// ================================================================
// SCREEN SCANNER ENGINE (통합 엔진)
// ================================================================

export const ScreenScanner = {
    // 상태
    scanHistory: [],
    lastResult: null,
    
    // 컴포넌트 참조
    loader: TesseractLoader,
    capturer: ImageCapturer,
    analyzer: TextAnalyzer,
    converter: ScreenPhysicsConverter,
    
    /**
     * 초기화 (Tesseract 로드)
     */
    async init(lang = 'kor+eng') {
        console.log('[ScreenScanner] 초기화 중...');
        await this.loader.initWorker(lang);
        console.log('[ScreenScanner] 준비 완료');
        return this;
    },
    
    /**
     * 이미지에서 텍스트 추출
     */
    async recognize(imageSource) {
        if (!this.loader.isInitialized) {
            await this.init();
        }
        
        console.log(`[ScreenScanner] OCR 시작 (소스: ${imageSource.source})`);
        
        const result = await this.loader.worker.recognize(imageSource.url);
        
        console.log(`[ScreenScanner] OCR 완료 - 신뢰도: ${(result.data.confidence).toFixed(1)}%`);
        
        return {
            text: result.data.text,
            confidence: result.data.confidence / 100,
            words: result.data.words,
            lines: result.data.lines,
            symbols: result.data.symbols
        };
    },
    
    /**
     * 파일에서 스캔
     */
    async scanFile() {
        const image = await this.capturer.fromFile();
        const ocr = await this.recognize(image);
        const physics = this.converter.convert(ocr);
        
        return this.saveResult(image, ocr, physics);
    },
    
    /**
     * 클립보드에서 스캔
     */
    async scanClipboard() {
        const image = await this.capturer.fromClipboard();
        const ocr = await this.recognize(image);
        const physics = this.converter.convert(ocr);
        
        return this.saveResult(image, ocr, physics);
    },
    
    /**
     * 화면 캡처 후 스캔
     */
    async scanScreen() {
        const image = await this.capturer.fromScreen();
        const ocr = await this.recognize(image);
        const physics = this.converter.convert(ocr);
        
        return this.saveResult(image, ocr, physics);
    },
    
    /**
     * 웹캠에서 스캔
     */
    async scanWebcam() {
        const image = await this.capturer.fromWebcam();
        const ocr = await this.recognize(image);
        const physics = this.converter.convert(ocr);
        
        return this.saveResult(image, ocr, physics);
    },
    
    /**
     * URL 이미지 스캔
     */
    async scanURL(url) {
        const image = await this.capturer.fromURL(url);
        const ocr = await this.recognize(image);
        const physics = this.converter.convert(ocr);
        
        return this.saveResult(image, ocr, physics);
    },
    
    /**
     * Canvas 스캔
     */
    async scanCanvas(canvas) {
        const image = this.capturer.fromCanvas(canvas);
        const ocr = await this.recognize(image);
        const physics = this.converter.convert(ocr);
        
        return this.saveResult(image, ocr, physics);
    },
    
    /**
     * 결과 저장
     */
    saveResult(image, ocr, physics) {
        const result = {
            source: image,
            ocr,
            physics,
            summary: this.generateSummary(ocr, physics)
        };
        
        this.lastResult = result;
        this.scanHistory.push({
            timestamp: new Date().toISOString(),
            source: image.source,
            textLength: ocr.text.length,
            confidence: ocr.confidence
        });
        
        // URL 해제 (메모리 관리)
        if (image.url && image.url.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(image.url), 5000);
        }
        
        return result;
    },
    
    /**
     * 요약 생성
     */
    generateSummary(ocr, physics) {
        const extracted = physics.metadata.extracted;
        
        return {
            // OCR 결과 요약
            textPreview: ocr.text.substring(0, 200) + (ocr.text.length > 200 ? '...' : ''),
            confidence: `${(ocr.confidence * 100).toFixed(1)}%`,
            
            // 물리 속성 해석
            interpretation: {
                mass: physics.mass > 30 
                    ? '📊 풍부한 정보량 (High Mass)' 
                    : physics.mass > 15 
                        ? '📋 적정 정보량 (Medium Mass)'
                        : '📝 간단한 내용 (Low Mass)',
                
                energy: physics.energy > 80 
                    ? '✨ 높은 OCR 신뢰도'
                    : physics.energy > 60 
                        ? '👍 양호한 OCR 품질'
                        : '⚠️ OCR 품질 주의 필요',
                
                entropy: physics.entropy > 0.5 
                    ? '🌊 다양한 내용'
                    : '📏 집중된 내용',
                
                velocity: physics.velocity > 1 
                    ? '🚀 정보 밀도 높음'
                    : '➡️ 여백 많은 문서'
            },
            
            // 추출 데이터 요약
            extractedData: {
                numbers: extracted.numbers.plain.length + '개 숫자',
                keywords: extracted.keywords.slice(0, 5).map(k => k.word).join(', '),
                language: extracted.language.primary,
                hasTable: extracted.structure.hasTable ? '표 포함' : null,
                hasList: extracted.structure.hasList ? '목록 포함' : null
            }
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            initialized: this.loader.isInitialized,
            scanCount: this.scanHistory.length,
            lastScan: this.scanHistory[this.scanHistory.length - 1],
            lastResult: this.lastResult ? {
                textLength: this.lastResult.ocr.text.length,
                confidence: this.lastResult.ocr.confidence
            } : null
        };
    },
    
    /**
     * 종료
     */
    async terminate() {
        await this.loader.terminate();
        console.log('[ScreenScanner] 종료됨');
    }
};

// ================================================================
// 테스트 함수
// ================================================================

export async function testScreenScanner() {
    console.log('='.repeat(50));
    console.log('[TEST] ScreenScanner 테스트');
    console.log('='.repeat(50));
    
    // 텍스트 분석 테스트
    const sampleText = `
    2024년 12월 학원 성적표
    
    학생명: 김철수
    수학: 95점
    영어: 88점
    국어: 92점
    
    총점: 275점
    평균: 91.7점
    
    연락처: 010-1234-5678
    이메일: test@example.com
    `;
    
    console.log('\n[TEST] 텍스트 분석 테스트:');
    
    const numbers = TextAnalyzer.extractNumbers(sampleText);
    console.log('숫자 추출:', numbers.plain);
    
    const keywords = TextAnalyzer.extractKeywords(sampleText);
    console.log('키워드:', keywords.slice(0, 5));
    
    const structure = TextAnalyzer.analyzeStructure(sampleText);
    console.log('구조 분석:', structure);
    
    const language = TextAnalyzer.detectLanguage(sampleText);
    console.log('언어 감지:', language);
    
    console.log('\n' + '='.repeat(50));
    console.log('[TEST] 완료! 실제 OCR 테스트는 이미지 필요');
    console.log('='.repeat(50));
}

// ================================================================
// EXPORTS
// ================================================================

export { TesseractLoader, ImageCapturer, TextAnalyzer, ScreenPhysicsConverter };

export default ScreenScanner;




