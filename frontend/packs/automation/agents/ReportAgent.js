// ================================================================
// REPORT AUTOMATION AGENT
// Core logic for automated report generation
// Bezos-style: Extract only key decision metrics
// ================================================================

export const ReportAgent = {
    config: {
        maxInsights: 5,
        standardTaskTime: 120, // Minutes for manual report
        confidenceThreshold: 0.7
    },
    
    // ================================================================
    // RAW DATA PROCESSING
    // ================================================================
    
    /**
     * Process raw data source (CSV, XLSX, PDF, JSON)
     * @param {Object} source - File or data source
     * @returns {Object} Normalized data
     */
    processRawData: async function(source) {
        console.log('[ReportAgent] Processing raw data...');
        
        // Determine source type
        const sourceType = this.detectSourceType(source);
        
        // Fetch and normalize data
        let rawData;
        switch (sourceType) {
            case 'csv':
                rawData = await this.parseCSV(source);
                break;
            case 'xlsx':
                rawData = await this.parseXLSX(source);
                break;
            case 'json':
                rawData = await this.parseJSON(source);
                break;
            case 'pdf':
                rawData = await this.parsePDF(source);
                break;
            default:
                rawData = source.data || source;
        }
        
        // Clean and normalize
        const cleanData = this.cleanData(rawData);
        
        return cleanData;
    },
    
    /**
     * Detect source type
     */
    detectSourceType: function(source) {
        if (source.name) {
            const ext = source.name.split('.').pop().toLowerCase();
            return ext;
        }
        if (typeof source === 'string') {
            if (source.startsWith('{') || source.startsWith('[')) return 'json';
            if (source.includes(',')) return 'csv';
        }
        return 'unknown';
    },
    
    /**
     * Parse CSV data
     */
    parseCSV: async function(source) {
        const text = typeof source === 'string' ? source : await source.text();
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((h, i) => {
                row[h] = values[i]?.trim();
            });
            return row;
        });
        
        return { headers, data, rowCount: data.length };
    },
    
    /**
     * Parse JSON data
     */
    parseJSON: async function(source) {
        const text = typeof source === 'string' ? source : await source.text();
        return JSON.parse(text);
    },
    
    /**
     * Parse XLSX (simulated)
     */
    parseXLSX: async function(source) {
        // In production, use xlsx library
        console.log('[ReportAgent] XLSX parsing simulated');
        return {
            sheets: ['Sheet1'],
            data: [],
            simulated: true
        };
    },
    
    /**
     * Parse PDF (simulated)
     */
    parsePDF: async function(source) {
        // In production, use pdf.js
        console.log('[ReportAgent] PDF parsing simulated');
        return {
            pages: 1,
            text: '',
            simulated: true
        };
    },
    
    /**
     * Clean and normalize data
     */
    cleanData: function(rawData) {
        if (!rawData) return { data: [], valid: false };
        
        const data = Array.isArray(rawData.data) ? rawData.data : 
                     Array.isArray(rawData) ? rawData : [rawData];
        
        // Remove nulls and duplicates
        const cleaned = data
            .filter(row => row !== null && row !== undefined)
            .filter((row, index, self) => 
                index === self.findIndex(r => JSON.stringify(r) === JSON.stringify(row))
            );
        
        // Detect numeric columns
        const numericColumns = this.detectNumericColumns(cleaned);
        
        return {
            data: cleaned,
            rowCount: cleaned.length,
            numericColumns,
            valid: cleaned.length > 0
        };
    },
    
    /**
     * Detect numeric columns
     */
    detectNumericColumns: function(data) {
        if (!data.length) return [];
        
        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        
        return columns.filter(col => {
            const values = data.map(row => row[col]).filter(v => v !== null && v !== '');
            const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
            return numericCount / values.length > 0.7;
        });
    },
    
    // ================================================================
    // AI-BASED INSIGHT EXTRACTION
    // ================================================================
    
    /**
     * Generate insights from cleaned data
     * Bezos-style: Only key decision metrics
     */
    generateInsights: async function(cleanData) {
        console.log('[ReportAgent] Generating insights...');
        
        const insights = [];
        
        // 1. Key Metrics
        if (cleanData.numericColumns.length > 0) {
            const keyMetrics = this.extractKeyMetrics(cleanData);
            insights.push(...keyMetrics);
        }
        
        // 2. Trends
        const trends = this.detectTrends(cleanData);
        if (trends.length > 0) {
            insights.push(...trends);
        }
        
        // 3. Anomalies
        const anomalies = this.detectAnomalies(cleanData);
        if (anomalies.length > 0) {
            insights.push(...anomalies);
        }
        
        // 4. Correlations
        const correlations = this.findCorrelations(cleanData);
        if (correlations.length > 0) {
            insights.push(...correlations);
        }
        
        // Limit and prioritize
        const prioritized = this.prioritizeInsights(insights);
        
        return prioritized.slice(0, this.config.maxInsights);
    },
    
    /**
     * Extract key metrics
     */
    extractKeyMetrics: function(cleanData) {
        const metrics = [];
        
        cleanData.numericColumns.forEach(col => {
            const values = cleanData.data
                .map(row => parseFloat(row[col]))
                .filter(v => !isNaN(v));
            
            if (values.length === 0) return;
            
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const max = Math.max(...values);
            const min = Math.min(...values);
            
            metrics.push({
                type: 'key_metric',
                column: col,
                summary: {
                    total: Math.round(sum * 100) / 100,
                    average: Math.round(avg * 100) / 100,
                    max,
                    min,
                    range: max - min
                },
                insight: `${col}: 평균 ${avg.toFixed(1)}, 범위 ${min.toFixed(1)}-${max.toFixed(1)}`,
                importance: sum > 0 ? 'high' : 'medium'
            });
        });
        
        return metrics;
    },
    
    /**
     * Detect trends
     */
    detectTrends: function(cleanData) {
        const trends = [];
        
        cleanData.numericColumns.forEach(col => {
            const values = cleanData.data
                .map(row => parseFloat(row[col]))
                .filter(v => !isNaN(v));
            
            if (values.length < 3) return;
            
            // Simple linear regression
            const trend = this.calculateTrend(values);
            
            if (Math.abs(trend.slope) > 0.05) {
                trends.push({
                    type: 'trend',
                    column: col,
                    direction: trend.slope > 0 ? 'increasing' : 'decreasing',
                    magnitude: Math.abs(trend.slope),
                    insight: `${col}: ${trend.slope > 0 ? '상승' : '하락'} 추세 (${(Math.abs(trend.slope) * 100).toFixed(1)}%/기간)`,
                    importance: Math.abs(trend.slope) > 0.1 ? 'high' : 'medium'
                });
            }
        });
        
        return trends;
    },
    
    /**
     * Calculate trend
     */
    calculateTrend: function(values) {
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        values.forEach((y, x) => {
            numerator += (x - xMean) * (y - yMean);
            denominator += (x - xMean) * (x - xMean);
        });
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        
        return { slope: slope / yMean }; // Normalized slope
    },
    
    /**
     * Detect anomalies
     */
    detectAnomalies: function(cleanData) {
        const anomalies = [];
        
        cleanData.numericColumns.forEach(col => {
            const values = cleanData.data
                .map((row, i) => ({ value: parseFloat(row[col]), index: i }))
                .filter(v => !isNaN(v.value));
            
            if (values.length < 5) return;
            
            const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
            const stdDev = Math.sqrt(
                values.reduce((sum, v) => sum + Math.pow(v.value - avg, 2), 0) / values.length
            );
            
            // Find outliers (>2 std dev)
            const outliers = values.filter(v => Math.abs(v.value - avg) > 2 * stdDev);
            
            if (outliers.length > 0) {
                anomalies.push({
                    type: 'anomaly',
                    column: col,
                    count: outliers.length,
                    insight: `${col}: ${outliers.length}개 이상치 발견`,
                    importance: outliers.length > 2 ? 'high' : 'medium'
                });
            }
        });
        
        return anomalies;
    },
    
    /**
     * Find correlations
     */
    findCorrelations: function(cleanData) {
        const correlations = [];
        const cols = cleanData.numericColumns;
        
        for (let i = 0; i < cols.length; i++) {
            for (let j = i + 1; j < cols.length; j++) {
                const col1 = cols[i];
                const col2 = cols[j];
                
                const values1 = cleanData.data.map(row => parseFloat(row[col1]));
                const values2 = cleanData.data.map(row => parseFloat(row[col2]));
                
                const correlation = this.calculateCorrelation(values1, values2);
                
                if (Math.abs(correlation) > 0.7) {
                    correlations.push({
                        type: 'correlation',
                        columns: [col1, col2],
                        value: correlation,
                        insight: `${col1}와 ${col2} 간 ${correlation > 0 ? '양' : '음'}의 상관관계 (${(correlation * 100).toFixed(0)}%)`,
                        importance: Math.abs(correlation) > 0.85 ? 'high' : 'medium'
                    });
                }
            }
        }
        
        return correlations;
    },
    
    /**
     * Calculate correlation
     */
    calculateCorrelation: function(x, y) {
        const n = Math.min(x.length, y.length);
        const xMean = x.reduce((a, b) => a + b, 0) / n;
        const yMean = y.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let xDenom = 0;
        let yDenom = 0;
        
        for (let i = 0; i < n; i++) {
            const xDiff = x[i] - xMean;
            const yDiff = y[i] - yMean;
            numerator += xDiff * yDiff;
            xDenom += xDiff * xDiff;
            yDenom += yDiff * yDiff;
        }
        
        const denominator = Math.sqrt(xDenom * yDenom);
        return denominator !== 0 ? numerator / denominator : 0;
    },
    
    /**
     * Prioritize insights
     */
    prioritizeInsights: function(insights) {
        const importanceOrder = { high: 0, medium: 1, low: 2 };
        
        return insights.sort((a, b) => {
            const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
            if (impDiff !== 0) return impDiff;
            return 0;
        });
    },
    
    // ================================================================
    // REPORT BUILDING
    // ================================================================
    
    /**
     * Build final report
     */
    buildReport: async function(insights, metadata = {}) {
        console.log('[ReportAgent] Building report...');
        
        const report = {
            id: 'report_' + Date.now(),
            generated_at: Date.now(),
            metadata: {
                source: metadata.source || 'unknown',
                rows_analyzed: metadata.rowCount || 0,
                confidence: this.calculateConfidence(insights)
            },
            
            // Executive Summary (Bezos 6-pager style)
            executive_summary: this.generateExecutiveSummary(insights),
            
            // Key Insights
            insights: insights.map(i => ({
                type: i.type,
                text: i.insight,
                importance: i.importance,
                data: i.summary || i.value || i.count
            })),
            
            // Strategic Recommendations
            recommendations: this.generateRecommendations(insights),
            
            // Time saved
            time_saved: this.config.standardTaskTime,
            
            // Physics impact
            physics_impact: {
                entropy_reduction: insights.length * 0.05,
                stability_boost: 0.02,
                success_probability_delta: insights.filter(i => i.importance === 'high').length * 0.01
            }
        };
        
        return report;
    },
    
    /**
     * Calculate overall confidence
     */
    calculateConfidence: function(insights) {
        if (insights.length === 0) return 0;
        
        const highCount = insights.filter(i => i.importance === 'high').length;
        return Math.min(0.5 + (highCount / insights.length) * 0.5, 0.95);
    },
    
    /**
     * Generate executive summary
     */
    generateExecutiveSummary: function(insights) {
        const highPriority = insights.filter(i => i.importance === 'high');
        
        if (highPriority.length === 0) {
            return '분석 결과, 현재 데이터에서 특별한 주의가 필요한 항목은 발견되지 않았습니다.';
        }
        
        const points = highPriority.map(i => i.insight).join(' ');
        return `핵심 발견 사항: ${points} 이에 따른 전략적 조치가 권장됩니다.`;
    },
    
    /**
     * Generate recommendations
     */
    generateRecommendations: function(insights) {
        const recommendations = [];
        
        insights.forEach(insight => {
            if (insight.type === 'trend' && insight.direction === 'decreasing') {
                recommendations.push({
                    priority: 'high',
                    action: `${insight.column} 하락 추세 대응 전략 수립`,
                    rationale: insight.insight
                });
            }
            
            if (insight.type === 'anomaly') {
                recommendations.push({
                    priority: 'medium',
                    action: `${insight.column} 이상치 원인 분석`,
                    rationale: insight.insight
                });
            }
            
            if (insight.type === 'correlation' && insight.value > 0.8) {
                recommendations.push({
                    priority: 'medium',
                    action: `${insight.columns.join('-')} 관계 활용 전략`,
                    rationale: insight.insight
                });
            }
        });
        
        return recommendations;
    },
    
    // ================================================================
    // FULL PIPELINE
    // ================================================================
    
    /**
     * Run full report generation pipeline
     */
    run: async function(source) {
        // Step 1: Process raw data
        const cleanData = await this.processRawData(source);
        
        if (!cleanData.valid) {
            return { error: 'Invalid or empty data', success: false };
        }
        
        // Step 2: Generate insights
        const insights = await this.generateInsights(cleanData);
        
        // Step 3: Build report
        const report = await this.buildReport(insights, {
            source: source.name || 'data',
            rowCount: cleanData.rowCount
        });
        
        return {
            success: true,
            report,
            time_saved: this.config.standardTaskTime
        };
    }
};

export default ReportAgent;




