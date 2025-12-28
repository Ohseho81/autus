// ================================================================
// LOG MINING ENGINE (기록 학습 엔진)
// 실제 작동하는 첫 번째 모듈
// 
// 역할: 로컬 파일(CSV, Excel, JSON)을 읽어서 물리 속성으로 변환
// ================================================================

// ================================================================
// FILE READER (파일 읽기)
// ================================================================

export const FileReader = {
    /**
     * 파일 선택 다이얼로그 열기
     * @param {string} accept - 허용 파일 타입 (예: '.csv,.xlsx,.json')
     * @returns {Promise<File>} 선택된 파일
     */
    selectFile: function(accept = '.csv,.xlsx,.json,.txt') {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    resolve(file);
                } else {
                    reject(new Error('파일이 선택되지 않았습니다'));
                }
            };
            
            input.click();
        });
    },
    
    /**
     * 파일을 텍스트로 읽기
     * @param {File} file - 파일 객체
     * @returns {Promise<string>} 파일 내용
     */
    readAsText: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new window.FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('파일 읽기 실패'));
            
            reader.readAsText(file, 'UTF-8');
        });
    },
    
    /**
     * 파일을 ArrayBuffer로 읽기 (Excel용)
     * @param {File} file - 파일 객체
     * @returns {Promise<ArrayBuffer>} 파일 데이터
     */
    readAsArrayBuffer: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new window.FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('파일 읽기 실패'));
            
            reader.readAsArrayBuffer(file);
        });
    }
};

// ================================================================
// CSV PARSER (CSV 파싱)
// ================================================================

export const CSVParser = {
    /**
     * CSV 문자열을 파싱
     * @param {string} csvText - CSV 텍스트
     * @param {Object} options - 옵션 { delimiter, hasHeader }
     * @returns {Object} { headers, rows, data }
     */
    parse: function(csvText, options = {}) {
        const delimiter = options.delimiter || ',';
        const hasHeader = options.hasHeader !== false;
        
        // 줄 분리 (Windows/Unix 호환)
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
            return { headers: [], rows: [], data: [] };
        }
        
        // 각 줄을 필드로 분리
        const parseRow = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === delimiter && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            
            return result;
        };
        
        const rows = lines.map(parseRow);
        const headers = hasHeader ? rows[0] : rows[0].map((_, i) => `Column${i + 1}`);
        const dataRows = hasHeader ? rows.slice(1) : rows;
        
        // 객체 배열로 변환
        const data = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });
            return obj;
        });
        
        return { headers, rows: dataRows, data };
    }
};

// ================================================================
// EXCEL PARSER (Excel 파싱 - SheetJS/xlsx 필요시 동적 로드)
// ================================================================

export const ExcelParser = {
    xlsxLoaded: false,
    XLSX: null,
    
    /**
     * SheetJS 라이브러리 동적 로드
     */
    async loadXLSX() {
        if (this.xlsxLoaded) return this.XLSX;
        
        try {
            // CDN에서 동적 로드
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            
            this.XLSX = window.XLSX;
            this.xlsxLoaded = true;
            console.log('[ExcelParser] SheetJS loaded');
            
            return this.XLSX;
        } catch (err) {
            console.error('[ExcelParser] Failed to load SheetJS:', err);
            return null;
        }
    },
    
    /**
     * Excel 파일 파싱
     * @param {ArrayBuffer} buffer - 파일 데이터
     * @returns {Object} { sheets, data }
     */
    async parse(buffer) {
        const XLSX = await this.loadXLSX();
        
        if (!XLSX) {
            throw new Error('Excel 파서를 로드할 수 없습니다. CSV 파일을 사용해주세요.');
        }
        
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheets = {};
        
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        });
        
        // 첫 번째 시트를 기본 데이터로
        const firstSheet = workbook.SheetNames[0];
        const rows = sheets[firstSheet];
        const headers = rows[0] || [];
        const dataRows = rows.slice(1);
        
        const data = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] !== undefined ? row[i] : '';
            });
            return obj;
        });
        
        return { sheets, headers, data };
    }
};

// ================================================================
// JSON PARSER (JSON 파싱)
// ================================================================

export const JSONParser = {
    /**
     * JSON 문자열 파싱
     * @param {string} jsonText - JSON 텍스트
     * @returns {Object} 파싱된 데이터
     */
    parse: function(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            
            // 배열인 경우
            if (Array.isArray(data)) {
                const headers = data.length > 0 ? Object.keys(data[0]) : [];
                return { headers, data };
            }
            
            // 객체인 경우 (단일 레코드)
            return { headers: Object.keys(data), data: [data] };
            
        } catch (err) {
            throw new Error('JSON 파싱 실패: ' + err.message);
        }
    }
};

// ================================================================
// PHYSICS CONVERTER (물리 속성 변환기)
// ================================================================

export const PhysicsConverter = {
    /**
     * 숫자 컬럼 자동 감지
     * @param {Array} data - 데이터 배열
     * @returns {Array} 숫자 컬럼 이름들
     */
    detectNumericColumns: function(data) {
        if (data.length === 0) return [];
        
        const headers = Object.keys(data[0]);
        const numericCols = [];
        
        headers.forEach(header => {
            const values = data.map(row => row[header]).filter(v => v !== '' && v !== null);
            const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
            
            if (numericCount / values.length > 0.8) { // 80% 이상이 숫자면
                numericCols.push(header);
            }
        });
        
        return numericCols;
    },
    
    /**
     * 날짜 컬럼 자동 감지
     * @param {Array} data - 데이터 배열
     * @returns {Array} 날짜 컬럼 이름들
     */
    detectDateColumns: function(data) {
        if (data.length === 0) return [];
        
        const headers = Object.keys(data[0]);
        const dateCols = [];
        
        const datePatterns = [
            /^\d{4}-\d{2}-\d{2}$/,           // 2024-01-15
            /^\d{4}\/\d{2}\/\d{2}$/,         // 2024/01/15
            /^\d{2}\/\d{2}\/\d{4}$/,         // 01/15/2024
            /^\d{4}\.\d{2}\.\d{2}$/          // 2024.01.15
        ];
        
        headers.forEach(header => {
            const values = data.map(row => String(row[header])).filter(v => v);
            const dateCount = values.filter(v => 
                datePatterns.some(pattern => pattern.test(v)) || !isNaN(Date.parse(v))
            ).length;
            
            if (dateCount / values.length > 0.7) {
                dateCols.push(header);
            }
        });
        
        return dateCols;
    },
    
    /**
     * 데이터를 물리 속성으로 변환
     * @param {Array} data - 원본 데이터
     * @param {Object} mapping - 컬럼 매핑 설정
     * @returns {Object} 물리 속성
     */
    convert: function(data, mapping = {}) {
        if (data.length === 0) {
            return { mass: 0, energy: 0, entropy: 0, velocity: 0, records: [] };
        }
        
        const numericCols = this.detectNumericColumns(data);
        const dateCols = this.detectDateColumns(data);
        
        // 1. MASS (질량) = 데이터 양 + 숫자 필드 합계
        const recordCount = data.length;
        let totalValue = 0;
        
        numericCols.forEach(col => {
            data.forEach(row => {
                const val = parseFloat(row[col]) || 0;
                totalValue += Math.abs(val);
            });
        });
        
        const mass = Math.log10(recordCount + 1) * 10 + Math.log10(totalValue + 1) * 5;
        
        // 2. ENERGY (에너지) = 최근 활동 기반
        let energy = 50; // 기본값
        if (dateCols.length > 0) {
            const dateCol = dateCols[0];
            const recentDates = data
                .map(row => new Date(row[dateCol]))
                .filter(d => !isNaN(d.getTime()))
                .sort((a, b) => b - a);
            
            if (recentDates.length > 0) {
                const daysSinceLatest = (Date.now() - recentDates[0].getTime()) / (24 * 60 * 60 * 1000);
                energy = Math.max(0, 100 - daysSinceLatest * 2); // 하루당 2씩 감소
            }
        }
        
        // 3. ENTROPY (엔트로피) = 데이터 다양성
        const uniqueValues = {};
        Object.keys(data[0] || {}).forEach(col => {
            uniqueValues[col] = new Set(data.map(row => row[col])).size;
        });
        
        const avgUniqueness = Object.values(uniqueValues).reduce((a, b) => a + b, 0) / 
                              Object.keys(uniqueValues).length;
        const entropy = Math.min(avgUniqueness / recordCount, 1);
        
        // 4. VELOCITY (속도) = 데이터 증가율 (날짜 기반)
        let velocity = 0;
        if (dateCols.length > 0) {
            const dateCol = dateCols[0];
            const dates = data
                .map(row => new Date(row[dateCol]))
                .filter(d => !isNaN(d.getTime()))
                .sort((a, b) => a - b);
            
            if (dates.length > 1) {
                const span = (dates[dates.length - 1] - dates[0]) / (24 * 60 * 60 * 1000);
                velocity = span > 0 ? recordCount / span : 0; // 일당 레코드 수
            }
        }
        
        // 5. 개별 레코드 물리 속성
        const records = data.map((row, index) => {
            let recordMass = 1;
            numericCols.forEach(col => {
                recordMass += Math.abs(parseFloat(row[col]) || 0) * 0.01;
            });
            
            return {
                index,
                id: row.id || row.ID || row['번호'] || `record_${index}`,
                mass: recordMass,
                originalData: row
            };
        });
        
        return {
            // 전체 물리 속성
            mass: Math.round(mass * 100) / 100,
            energy: Math.round(energy * 100) / 100,
            entropy: Math.round(entropy * 1000) / 1000,
            velocity: Math.round(velocity * 100) / 100,
            
            // 메타데이터
            metadata: {
                recordCount,
                numericColumns: numericCols,
                dateColumns: dateCols,
                totalNumericValue: totalValue
            },
            
            // 개별 레코드 (원본 데이터 포함)
            records,
            
            // 분석 시간
            analyzedAt: new Date().toISOString()
        };
    }
};

// ================================================================
// LOG MINING ENGINE (통합 엔진)
// ================================================================

export const LogMiningEngine = {
    // 상태
    loadedFiles: [],
    physicsData: null,
    
    /**
     * 파일 선택 및 로드
     * @param {string} fileType - 파일 타입 ('csv', 'excel', 'json', 'auto')
     * @returns {Promise<Object>} 로드된 데이터
     */
    async loadFile(fileType = 'auto') {
        console.log('[LogMiningEngine] 파일 선택 대기 중...');
        
        // 1. 파일 선택
        const acceptMap = {
            'csv': '.csv',
            'excel': '.xlsx,.xls',
            'json': '.json',
            'auto': '.csv,.xlsx,.xls,.json,.txt'
        };
        
        const file = await FileReader.selectFile(acceptMap[fileType] || acceptMap['auto']);
        console.log(`[LogMiningEngine] 파일 선택됨: ${file.name} (${file.size} bytes)`);
        
        // 2. 파일 타입 감지
        const extension = file.name.split('.').pop().toLowerCase();
        
        // 3. 파일 파싱
        let parsedData;
        
        if (extension === 'csv' || extension === 'txt') {
            const text = await FileReader.readAsText(file);
            parsedData = CSVParser.parse(text);
            
        } else if (extension === 'xlsx' || extension === 'xls') {
            const buffer = await FileReader.readAsArrayBuffer(file);
            parsedData = await ExcelParser.parse(buffer);
            
        } else if (extension === 'json') {
            const text = await FileReader.readAsText(file);
            parsedData = JSONParser.parse(text);
            
        } else {
            throw new Error(`지원하지 않는 파일 형식: ${extension}`);
        }
        
        console.log(`[LogMiningEngine] 파싱 완료: ${parsedData.data.length} 레코드`);
        
        // 4. 기록 저장
        this.loadedFiles.push({
            name: file.name,
            size: file.size,
            type: extension,
            recordCount: parsedData.data.length,
            loadedAt: new Date().toISOString()
        });
        
        return {
            file: {
                name: file.name,
                size: file.size,
                type: extension
            },
            headers: parsedData.headers,
            data: parsedData.data,
            recordCount: parsedData.data.length
        };
    },
    
    /**
     * 데이터를 물리 속성으로 변환
     * @param {Array} data - 파싱된 데이터
     * @param {Object} mapping - 커스텀 매핑 (선택)
     * @returns {Object} 물리 속성
     */
    convertToPhysics(data, mapping = {}) {
        console.log('[LogMiningEngine] 물리 속성 변환 중...');
        
        const physics = PhysicsConverter.convert(data, mapping);
        this.physicsData = physics;
        
        console.log(`[LogMiningEngine] 변환 완료:`, {
            mass: physics.mass,
            energy: physics.energy,
            entropy: physics.entropy,
            velocity: physics.velocity
        });
        
        return physics;
    },
    
    /**
     * 파일 로드부터 물리 변환까지 한번에
     * @param {string} fileType - 파일 타입
     * @returns {Promise<Object>} 물리 속성
     */
    async process(fileType = 'auto') {
        const loaded = await this.loadFile(fileType);
        const physics = this.convertToPhysics(loaded.data);
        
        return {
            file: loaded.file,
            rawData: loaded.data,
            physics,
            summary: this.generateSummary(loaded, physics)
        };
    },
    
    /**
     * 요약 리포트 생성
     */
    generateSummary(loaded, physics) {
        return {
            // 파일 정보
            fileName: loaded.file.name,
            fileSize: `${(loaded.file.size / 1024).toFixed(1)} KB`,
            recordCount: loaded.recordCount,
            
            // 물리 속성 해석
            interpretation: {
                mass: physics.mass > 50 
                    ? '📊 대규모 데이터셋 (High Mass)' 
                    : physics.mass > 20 
                        ? '📋 중간 규모 데이터셋 (Medium Mass)'
                        : '📝 소규모 데이터셋 (Low Mass)',
                
                energy: physics.energy > 70 
                    ? '⚡ 최근 활동 활발 (High Energy)'
                    : physics.energy > 40 
                        ? '🔋 보통 활동 수준 (Medium Energy)'
                        : '🪫 활동 감소 추세 (Low Energy)',
                
                entropy: physics.entropy > 0.7 
                    ? '🌊 데이터 다양성 높음 (High Entropy)'
                    : physics.entropy > 0.3 
                        ? '📊 보통 다양성 (Medium Entropy)'
                        : '📏 데이터 일관성 높음 (Low Entropy)',
                
                velocity: physics.velocity > 5 
                    ? '🚀 빠른 성장세 (High Velocity)'
                    : physics.velocity > 1 
                        ? '📈 안정적 성장 (Medium Velocity)'
                        : '➡️ 정체 상태 (Low Velocity)'
            },
            
            // 권장 행동
            recommendations: this.generateRecommendations(physics)
        };
    },
    
    /**
     * 물리 속성 기반 권장 행동
     */
    generateRecommendations(physics) {
        const recommendations = [];
        
        if (physics.energy < 40) {
            recommendations.push({
                priority: 'HIGH',
                action: '데이터 활성화 필요',
                detail: '최근 활동이 감소했습니다. 새로운 데이터 입력을 고려하세요.'
            });
        }
        
        if (physics.velocity < 1 && physics.mass > 20) {
            recommendations.push({
                priority: 'MEDIUM',
                action: '성장 모멘텀 확보',
                detail: '데이터는 충분하나 증가세가 둔화되었습니다.'
            });
        }
        
        if (physics.entropy > 0.8) {
            recommendations.push({
                priority: 'LOW',
                action: '데이터 정리 권장',
                detail: '데이터 다양성이 높습니다. 카테고리화를 고려하세요.'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'INFO',
                action: '양호한 상태',
                detail: '현재 데이터 상태가 건강합니다. 현재 패턴을 유지하세요.'
            });
        }
        
        return recommendations;
    },
    
    /**
     * 현재 상태 조회
     */
    getStatus() {
        return {
            loadedFiles: this.loadedFiles,
            currentPhysics: this.physicsData,
            lastUpdate: this.physicsData?.analyzedAt
        };
    },
    
    /**
     * 상태 초기화
     */
    reset() {
        this.loadedFiles = [];
        this.physicsData = null;
        console.log('[LogMiningEngine] 상태 초기화 완료');
    }
};

// ================================================================
// 테스트 함수
// ================================================================

export async function testLogMiningEngine() {
    console.log('='.repeat(50));
    console.log('[TEST] LogMiningEngine 테스트 시작');
    console.log('='.repeat(50));
    
    // 1. 샘플 CSV 데이터로 테스트
    const sampleCSV = `이름,점수,출석률,최근접속
김철수,85,92,2024-12-15
이영희,92,88,2024-12-18
박민수,78,95,2024-12-10
최지원,88,90,2024-12-17
정하나,95,85,2024-12-16`;
    
    console.log('\n[TEST] 샘플 CSV 파싱 테스트:');
    const parsed = CSVParser.parse(sampleCSV);
    console.log('Headers:', parsed.headers);
    console.log('Data count:', parsed.data.length);
    
    console.log('\n[TEST] 물리 속성 변환 테스트:');
    const physics = PhysicsConverter.convert(parsed.data);
    console.log('Mass:', physics.mass);
    console.log('Energy:', physics.energy);
    console.log('Entropy:', physics.entropy);
    console.log('Velocity:', physics.velocity);
    
    console.log('\n[TEST] 숫자 컬럼 감지:', physics.metadata.numericColumns);
    console.log('[TEST] 날짜 컬럼 감지:', physics.metadata.dateColumns);
    
    console.log('\n' + '='.repeat(50));
    console.log('[TEST] 테스트 완료!');
    console.log('='.repeat(50));
    
    return physics;
}

// ================================================================
// DEFAULT EXPORT
// ================================================================

export default LogMiningEngine;




