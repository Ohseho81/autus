// ================================================================
// VALUE INFERENCE ENGINE
// Internal n² data asset: Correlation analysis between user actions
// and success metrics for network effect value creation
// ================================================================

export const ValueInferenceEngine = {
    // Aggregated physics metrics (no PII)
    physicsAggregates: new Map(),
    
    // Correlation matrices
    correlationMatrix: {},
    
    // Success factor weights
    successFactors: {},
    
    // Network effect multiplier
    networkMultiplier: 1.0,
    
    config: {
        minSampleSize: 10,
        correlationThreshold: 0.3,
        decayRate: 0.01 // Daily decay for old data
    },
    
    // ================================================================
    // PHYSICS DATA INGESTION
    // Only physics attributes, never raw data
    // ================================================================
    
    /**
     * Ingest physics update from client
     * @param {string} userId - Hashed user ID
     * @param {Object} physics - Physics attributes only
     */
    ingestPhysics: function(userId, physics) {
        // Validate physics-only
        if (!this.isValidPhysics(physics)) {
            console.warn('[ValueInference] Invalid physics data rejected');
            return false;
        }
        
        // Store aggregated physics
        if (!this.physicsAggregates.has(userId)) {
            this.physicsAggregates.set(userId, {
                samples: [],
                aggregates: {}
            });
        }
        
        const userData = this.physicsAggregates.get(userId);
        
        // Add sample
        userData.samples.push({
            timestamp: Date.now(),
            ...physics
        });
        
        // Keep only recent samples
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days
        userData.samples = userData.samples.filter(s => s.timestamp > cutoff);
        
        // Update aggregates
        this.updateAggregates(userId);
        
        // Update correlations periodically
        if (this.physicsAggregates.size % 10 === 0) {
            this.updateCorrelations();
        }
        
        return true;
    },
    
    /**
     * Validate physics-only data
     */
    isValidPhysics: function(data) {
        const validKeys = [
            'node_mass', 'connection_gravity', 'friction_coefficient',
            'potential_energy', 'kinetic_energy', 'entropy_level',
            'stability_index', 'influence_radius', 'decay_rate',
            'resonance_frequency', 'success_probability', 'time_saved',
            'automation_reliance', 'network_yield'
        ];
        
        return Object.keys(data).every(key => 
            validKeys.includes(key) || key.startsWith('_')
        );
    },
    
    /**
     * Update user aggregates
     */
    updateAggregates: function(userId) {
        const userData = this.physicsAggregates.get(userId);
        if (!userData || userData.samples.length === 0) return;
        
        const samples = userData.samples;
        const keys = Object.keys(samples[0]).filter(k => k !== 'timestamp');
        
        const aggregates = {};
        
        keys.forEach(key => {
            const values = samples.map(s => s[key]).filter(v => typeof v === 'number');
            if (values.length === 0) return;
            
            aggregates[key] = {
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                trend: this.calculateTrend(values),
                variance: this.calculateVariance(values),
                latest: values[values.length - 1]
            };
        });
        
        userData.aggregates = aggregates;
    },
    
    // ================================================================
    // CORRELATION ANALYSIS
    // ================================================================
    
    /**
     * Update correlation matrix across all users
     */
    updateCorrelations: function() {
        console.log('[ValueInference] Updating correlation matrix...');
        
        // Collect all aggregates
        const allAggregates = [];
        this.physicsAggregates.forEach((data, userId) => {
            if (data.aggregates && Object.keys(data.aggregates).length > 0) {
                allAggregates.push(data.aggregates);
            }
        });
        
        if (allAggregates.length < this.config.minSampleSize) {
            console.log('[ValueInference] Insufficient samples for correlation');
            return;
        }
        
        // Get common keys
        const keys = Object.keys(allAggregates[0]);
        
        // Calculate correlations
        const matrix = {};
        
        keys.forEach(key1 => {
            matrix[key1] = {};
            keys.forEach(key2 => {
                if (key1 === key2) {
                    matrix[key1][key2] = 1;
                } else {
                    const values1 = allAggregates.map(a => a[key1]?.mean || 0);
                    const values2 = allAggregates.map(a => a[key2]?.mean || 0);
                    matrix[key1][key2] = this.calculateCorrelation(values1, values2);
                }
            });
        });
        
        this.correlationMatrix = matrix;
        
        // Extract success factors
        this.extractSuccessFactors();
    },
    
    /**
     * Calculate correlation coefficient
     */
    calculateCorrelation: function(x, y) {
        const n = Math.min(x.length, y.length);
        if (n < 2) return 0;
        
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
     * Calculate trend (slope)
     */
    calculateTrend: function(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        values.forEach((y, x) => {
            numerator += (x - xMean) * (y - yMean);
            denominator += (x - xMean) * (x - xMean);
        });
        
        return denominator !== 0 ? numerator / denominator : 0;
    },
    
    /**
     * Calculate variance
     */
    calculateVariance: function(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    },
    
    // ================================================================
    // SUCCESS FACTOR EXTRACTION
    // ================================================================
    
    /**
     * Extract factors that correlate with success
     */
    extractSuccessFactors: function() {
        if (!this.correlationMatrix.success_probability) return;
        
        const successCorrelations = this.correlationMatrix.success_probability;
        
        this.successFactors = {};
        
        Object.entries(successCorrelations).forEach(([factor, correlation]) => {
            if (factor === 'success_probability') return;
            
            if (Math.abs(correlation) >= this.config.correlationThreshold) {
                this.successFactors[factor] = {
                    correlation,
                    direction: correlation > 0 ? 'positive' : 'negative',
                    strength: Math.abs(correlation) > 0.7 ? 'strong' : 
                              Math.abs(correlation) > 0.5 ? 'moderate' : 'weak',
                    recommendation: this.generateRecommendation(factor, correlation)
                };
            }
        });
    },
    
    /**
     * Generate recommendation based on correlation
     */
    generateRecommendation: function(factor, correlation) {
        const direction = correlation > 0 ? 'increase' : 'decrease';
        
        const recommendations = {
            automation_reliance: correlation > 0 
                ? '자동화 의존도가 성공과 양의 상관관계. 자동화 확대 권장'
                : '자동화 의존도가 성공과 음의 상관관계. 수동 개입 권장',
            network_yield: correlation > 0
                ? '네트워크 효율이 성공의 핵심 요인'
                : '네트워크 집중보다 개인 역량 강화 권장',
            time_saved: '시간 절약이 성공 확률과 직결됨',
            entropy_level: correlation > 0
                ? '적정 수준의 변동성이 성장에 도움'
                : '안정성 강화가 성공의 핵심',
            stability_index: correlation > 0
                ? '안정적인 패턴 유지가 성공에 기여'
                : '새로운 시도와 변화가 필요'
        };
        
        return recommendations[factor] || `${factor}를 ${direction}시키는 것이 성공 확률 향상에 도움`;
    },
    
    // ================================================================
    // NETWORK EFFECT CALCULATION
    // ================================================================
    
    /**
     * Calculate network effect value (n² model)
     */
    calculateNetworkValue: function() {
        const n = this.physicsAggregates.size;
        
        // Base n² value
        const baseValue = n * n;
        
        // Connection density factor
        let connectionDensity = 0;
        this.physicsAggregates.forEach(data => {
            connectionDensity += data.aggregates?.connection_gravity?.mean || 0;
        });
        connectionDensity = n > 0 ? connectionDensity / n : 0;
        
        // Engagement factor
        let engagementFactor = 0;
        this.physicsAggregates.forEach(data => {
            engagementFactor += data.aggregates?.automation_reliance?.mean || 0;
        });
        engagementFactor = n > 0 ? engagementFactor / n : 0;
        
        // Network multiplier
        this.networkMultiplier = 1 + (connectionDensity * 0.5) + (engagementFactor * 0.3);
        
        return {
            user_count: n,
            base_value: baseValue,
            network_multiplier: Math.round(this.networkMultiplier * 100) / 100,
            adjusted_value: Math.round(baseValue * this.networkMultiplier),
            connection_density: Math.round(connectionDensity * 100) / 100,
            engagement_factor: Math.round(engagementFactor * 100) / 100
        };
    },
    
    // ================================================================
    // INSIGHTS GENERATION
    // ================================================================
    
    /**
     * Get value insights
     */
    getInsights: function() {
        const networkValue = this.calculateNetworkValue();
        
        return {
            network_value: networkValue,
            
            success_factors: this.successFactors,
            
            correlation_highlights: this.getCorrelationHighlights(),
            
            recommendations: Object.values(this.successFactors)
                .filter(f => f.strength !== 'weak')
                .map(f => f.recommendation),
            
            data_quality: {
                sample_size: this.physicsAggregates.size,
                sufficient: this.physicsAggregates.size >= this.config.minSampleSize,
                correlation_coverage: Object.keys(this.correlationMatrix).length
            },
            
            generated_at: Date.now()
        };
    },
    
    /**
     * Get correlation highlights
     */
    getCorrelationHighlights: function() {
        const highlights = [];
        
        Object.entries(this.correlationMatrix).forEach(([key1, correlations]) => {
            Object.entries(correlations).forEach(([key2, value]) => {
                if (key1 < key2 && Math.abs(value) > 0.7) {
                    highlights.push({
                        factors: [key1, key2],
                        correlation: Math.round(value * 100) / 100,
                        type: value > 0 ? 'positive' : 'negative',
                        insight: `${key1}와 ${key2} 간 ${value > 0 ? '강한 양' : '강한 음'}의 상관관계`
                    });
                }
            });
        });
        
        return highlights.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    },
    
    // ================================================================
    // USER PHYSICS PROFILE
    // ================================================================
    
    /**
     * Get internal physics profile for a user
     * This is the "internal business engine" data
     */
    getUserPhysicsProfile: function(userId) {
        const userData = this.physicsAggregates.get(userId);
        
        if (!userData) {
            return { error: 'User not found' };
        }
        
        const aggregates = userData.aggregates;
        
        return {
            user_id: userId,
            internal_physics: {
                network_yield: aggregates.network_yield?.mean || 0,
                automation_reliance: aggregates.automation_reliance?.mean || 0,
                money_flow_correlation: this.calculateMoneyFlowCorrelation(userData),
                interaction_topology: 'Encrypted_Physics_Data', // Reference only
                success_trajectory: aggregates.success_probability?.trend || 0,
                stability_score: aggregates.stability_index?.mean || 0
            },
            insights: this.generateUserInsights(aggregates),
            recommendations: this.generateUserRecommendations(aggregates)
        };
    },
    
    /**
     * Calculate money flow correlation
     */
    calculateMoneyFlowCorrelation: function(userData) {
        const samples = userData.samples;
        if (samples.length < 5) return [];
        
        // Simulate action-conversion correlation
        return [
            { action: 'Automation', conversion_rate: 0.15 },
            { action: 'Skill-up', conversion_rate: 0.08 },
            { action: 'Network', conversion_rate: 0.12 }
        ];
    },
    
    /**
     * Generate user-specific insights
     */
    generateUserInsights: function(aggregates) {
        const insights = [];
        
        if (aggregates.automation_reliance?.mean > 0.8) {
            insights.push('높은 자동화 의존도 - 시스템 이탈 위험 낮음');
        }
        
        if (aggregates.network_yield?.mean > 0.7) {
            insights.push('네트워크 효율성 우수 - 협업 성과 극대화');
        }
        
        if (aggregates.success_probability?.trend > 0.01) {
            insights.push('성공 확률 상승 추세');
        } else if (aggregates.success_probability?.trend < -0.01) {
            insights.push('성공 확률 하락 추세 - 주의 필요');
        }
        
        return insights;
    },
    
    /**
     * Generate user recommendations
     */
    generateUserRecommendations: function(aggregates) {
        const recommendations = [];
        
        if (aggregates.entropy_level?.mean > 0.5) {
            recommendations.push('시스템 안정화 필요 - 루틴 강화 권장');
        }
        
        if (aggregates.time_saved?.mean < 60) {
            recommendations.push('자동화 확대로 시간 절약 극대화');
        }
        
        if (aggregates.network_yield?.mean < 0.5) {
            recommendations.push('네트워크 활성화 - 관계 투자 필요');
        }
        
        return recommendations;
    },
    
    // ================================================================
    // DATA MANAGEMENT
    // ================================================================
    
    /**
     * Clear old data (privacy compliance)
     */
    clearOldData: function(maxAgeDays = 90) {
        const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
        
        let cleared = 0;
        this.physicsAggregates.forEach((data, userId) => {
            const originalCount = data.samples.length;
            data.samples = data.samples.filter(s => s.timestamp > cutoff);
            
            if (data.samples.length === 0) {
                this.physicsAggregates.delete(userId);
                cleared++;
            } else if (data.samples.length < originalCount) {
                this.updateAggregates(userId);
            }
        });
        
        return { cleared_users: cleared };
    },
    
    /**
     * Export anonymized statistics
     */
    exportAnonymizedStats: function() {
        return {
            total_users: this.physicsAggregates.size,
            network_value: this.calculateNetworkValue(),
            success_factors: this.successFactors,
            correlation_highlights: this.getCorrelationHighlights(),
            exported_at: Date.now(),
            _contains_pii: false
        };
    }
};

export default ValueInferenceEngine;




