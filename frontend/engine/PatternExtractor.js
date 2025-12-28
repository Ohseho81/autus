// ================================================================
// PATTERN EXTRACTOR
// Extract anonymized logic/metrics for central server
// NEVER sends raw data, only physics patterns
// ================================================================

export const PatternExtractor = {
    // Extracted patterns (anonymized)
    extractedPatterns: [],
    
    // Feature impact metrics
    featureImpacts: [],
    
    config: {
        minConfidence: 0.6,
        anonymizationLevel: 'high',
        maxPatternAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    
    // ================================================================
    // PATTERN EXTRACTION
    // ================================================================
    
    /**
     * Extract patterns from local data
     * @param {Object} localData - Physics data from local processing
     * @returns {Object} Anonymized pattern for server
     */
    extract: function(localData) {
        // Validate no PII
        if (this.containsPII(localData)) {
            console.error('[PatternExtractor] PII detected, extraction blocked');
            return null;
        }
        
        const pattern = {
            id: this.generatePatternId(),
            type: localData.type || 'general',
            timestamp: Date.now(),
            
            // Physics metrics only
            physics: this.extractPhysicsMetrics(localData),
            
            // Behavioral pattern (anonymized)
            behavior: this.extractBehaviorPattern(localData),
            
            // Impact metrics
            impact: this.calculateImpact(localData),
            
            // Confidence level
            confidence: this.calculateConfidence(localData),
            
            // Metadata
            meta: {
                source_type: localData.source || 'client',
                processing: 'local',
                anonymization: this.config.anonymizationLevel,
                pii_contained: false
            }
        };
        
        // Store locally
        this.extractedPatterns.push(pattern);
        
        // Cleanup old patterns
        this.cleanupOldPatterns();
        
        return pattern;
    },
    
    /**
     * Check for PII
     */
    containsPII: function(data) {
        const piiIndicators = [
            'name', 'email', 'phone', 'address', 'ssn', 'id_number',
            'credit_card', 'birth_date', 'ip_address', 'location'
        ];
        
        const dataStr = JSON.stringify(data).toLowerCase();
        
        // Check for PII fields
        for (const indicator of piiIndicators) {
            if (dataStr.includes(indicator)) {
                // Check if it's a value, not just a field name
                const regex = new RegExp(`"${indicator}"\\s*:\\s*"[^"]+"`);
                if (regex.test(dataStr)) {
                    return true;
                }
            }
        }
        
        // Check for email patterns
        if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(dataStr)) {
            return true;
        }
        
        // Check for phone patterns
        if (/\d{3}[-.]?\d{3,4}[-.]?\d{4}/.test(dataStr)) {
            return true;
        }
        
        return false;
    },
    
    /**
     * Generate pattern ID
     */
    generatePatternId: function() {
        return 'pat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // ================================================================
    // PHYSICS EXTRACTION
    // ================================================================
    
    /**
     * Extract physics metrics
     */
    extractPhysicsMetrics: function(data) {
        return {
            // Core physics
            mass: this.normalizeValue(data.node_mass || data.mass, 0, 10),
            energy: this.normalizeValue(data.potential_energy + data.kinetic_energy, 0, 1000),
            entropy: this.normalizeValue(data.entropy_level || data.entropy, 0, 1),
            stability: this.normalizeValue(data.stability_index || data.stability, 0, 1),
            
            // Derived physics
            momentum: this.calculateMomentum(data),
            inertia: this.calculateInertia(data),
            friction: this.normalizeValue(data.friction_coefficient || data.friction, 0, 1),
            
            // Network physics
            connection_density: this.normalizeValue(data.connection_gravity, 0, 1),
            influence_radius: this.normalizeValue(data.influence_radius, 0, 100)
        };
    },
    
    /**
     * Normalize value to range
     */
    normalizeValue: function(value, min, max) {
        if (value === undefined || value === null) return null;
        const normalized = (value - min) / (max - min);
        return Math.round(Math.max(0, Math.min(1, normalized)) * 100) / 100;
    },
    
    /**
     * Calculate momentum
     */
    calculateMomentum: function(data) {
        const mass = data.node_mass || data.mass || 1;
        const velocity = data.kinetic_energy || 0;
        return this.normalizeValue(mass * Math.sqrt(velocity), 0, 100);
    },
    
    /**
     * Calculate inertia
     */
    calculateInertia: function(data) {
        const mass = data.node_mass || data.mass || 1;
        const friction = data.friction_coefficient || data.friction || 0.5;
        return this.normalizeValue(mass * friction, 0, 10);
    },
    
    // ================================================================
    // BEHAVIOR EXTRACTION
    // ================================================================
    
    /**
     * Extract anonymized behavior pattern
     */
    extractBehaviorPattern: function(data) {
        return {
            // Activity patterns (no raw data)
            activity_level: this.categorize(data.activity_mass, ['low', 'medium', 'high', 'very_high']),
            engagement_type: this.categorize(data.automation_reliance, ['manual', 'semi_auto', 'automated']),
            growth_phase: this.categorize(data.success_probability, ['starting', 'growing', 'maturing', 'optimizing']),
            
            // Time patterns (bucketed)
            active_hours: this.bucketTimePattern(data.active_times),
            frequency: this.categorize(data.frequency, ['rare', 'occasional', 'regular', 'frequent']),
            
            // Interaction patterns
            collaboration_index: this.normalizeValue(data.network_yield, 0, 1),
            independence_index: 1 - this.normalizeValue(data.automation_reliance, 0, 1)
        };
    },
    
    /**
     * Categorize value into buckets
     */
    categorize: function(value, categories) {
        if (value === undefined || value === null) return categories[0];
        const index = Math.min(
            Math.floor(value * categories.length),
            categories.length - 1
        );
        return categories[index];
    },
    
    /**
     * Bucket time pattern
     */
    bucketTimePattern: function(times) {
        if (!times || times.length === 0) return 'unknown';
        
        // Categorize into morning/afternoon/evening/night
        const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
        
        times.forEach(t => {
            const hour = new Date(t).getHours();
            if (hour >= 6 && hour < 12) buckets.morning++;
            else if (hour >= 12 && hour < 18) buckets.afternoon++;
            else if (hour >= 18 && hour < 22) buckets.evening++;
            else buckets.night++;
        });
        
        // Return dominant bucket
        return Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0];
    },
    
    // ================================================================
    // IMPACT CALCULATION
    // ================================================================
    
    /**
     * Calculate feature impact
     */
    calculateImpact: function(data) {
        const impacts = [];
        
        // Time savings impact
        if (data.time_saved) {
            const impact = this.normalizeValue(data.time_saved, 0, 500);
            if (impact > 0.1) {
                impacts.push({
                    feature: 'automation',
                    metric: 'time_saved',
                    impact_score: impact,
                    direction: 'positive'
                });
            }
        }
        
        // Success probability impact
        if (data.success_probability_delta) {
            impacts.push({
                feature: 'optimization',
                metric: 'success_probability',
                impact_score: Math.abs(data.success_probability_delta),
                direction: data.success_probability_delta > 0 ? 'positive' : 'negative'
            });
        }
        
        // Retention impact
        if (data.retention_risk !== undefined) {
            const retention = 1 - data.retention_risk;
            impacts.push({
                feature: 'engagement',
                metric: 'retention',
                impact_score: retention,
                direction: retention > 0.7 ? 'positive' : 'negative'
            });
        }
        
        return impacts;
    },
    
    /**
     * Calculate pattern confidence
     */
    calculateConfidence: function(data) {
        let confidence = 0.5;
        
        // More data points = higher confidence
        if (data.sample_count) {
            confidence += Math.min(data.sample_count / 100, 0.3);
        }
        
        // Lower variance = higher confidence
        if (data.variance !== undefined) {
            confidence += (1 - Math.min(data.variance, 1)) * 0.2;
        }
        
        return Math.round(Math.min(confidence, 0.95) * 100) / 100;
    },
    
    // ================================================================
    // AGGREGATION FOR SERVER
    // ================================================================
    
    /**
     * Generate server-ready payload
     * Contains ONLY anonymized patterns
     */
    generateServerPayload: function() {
        // Filter by confidence
        const validPatterns = this.extractedPatterns.filter(p => 
            p.confidence >= this.config.minConfidence
        );
        
        // Aggregate impacts
        const aggregatedImpacts = this.aggregateImpacts(validPatterns);
        
        return {
            type: 'PATTERN_REPORT',
            timestamp: Date.now(),
            
            // Pattern summary (no individual data)
            summary: {
                pattern_count: validPatterns.length,
                avg_confidence: this.calculateAvgConfidence(validPatterns),
                time_range: this.getTimeRange(validPatterns)
            },
            
            // Aggregated physics distribution
            physics_distribution: this.aggregatePhysics(validPatterns),
            
            // Behavior distribution
            behavior_distribution: this.aggregateBehaviors(validPatterns),
            
            // Impact metrics
            impacts: aggregatedImpacts,
            
            // Insights (no raw data)
            insights: this.generateInsights(validPatterns, aggregatedImpacts),
            
            // Privacy certification
            privacy: {
                pii_contained: false,
                anonymization_level: this.config.anonymizationLevel,
                individual_identifiable: false
            }
        };
    },
    
    /**
     * Aggregate impacts across patterns
     */
    aggregateImpacts: function(patterns) {
        const impactsByFeature = {};
        
        patterns.forEach(p => {
            p.impact.forEach(impact => {
                const key = impact.feature;
                if (!impactsByFeature[key]) {
                    impactsByFeature[key] = {
                        feature: key,
                        total_impact: 0,
                        count: 0,
                        positive: 0,
                        negative: 0
                    };
                }
                
                impactsByFeature[key].total_impact += impact.impact_score;
                impactsByFeature[key].count++;
                if (impact.direction === 'positive') {
                    impactsByFeature[key].positive++;
                } else {
                    impactsByFeature[key].negative++;
                }
            });
        });
        
        // Calculate averages
        return Object.values(impactsByFeature).map(f => ({
            feature: f.feature,
            avg_impact: Math.round(f.total_impact / f.count * 100) / 100,
            sample_size: f.count,
            positive_ratio: Math.round(f.positive / f.count * 100) / 100
        }));
    },
    
    /**
     * Aggregate physics across patterns
     */
    aggregatePhysics: function(patterns) {
        const physicsKeys = ['mass', 'energy', 'entropy', 'stability', 'momentum', 'friction'];
        const distribution = {};
        
        physicsKeys.forEach(key => {
            const values = patterns
                .map(p => p.physics[key])
                .filter(v => v !== null && v !== undefined);
            
            if (values.length > 0) {
                distribution[key] = {
                    mean: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    distribution: this.createDistribution(values)
                };
            }
        });
        
        return distribution;
    },
    
    /**
     * Create distribution buckets
     */
    createDistribution: function(values) {
        const buckets = { low: 0, medium: 0, high: 0 };
        
        values.forEach(v => {
            if (v < 0.33) buckets.low++;
            else if (v < 0.67) buckets.medium++;
            else buckets.high++;
        });
        
        const total = values.length;
        return {
            low: Math.round(buckets.low / total * 100) / 100,
            medium: Math.round(buckets.medium / total * 100) / 100,
            high: Math.round(buckets.high / total * 100) / 100
        };
    },
    
    /**
     * Aggregate behaviors
     */
    aggregateBehaviors: function(patterns) {
        const behaviors = {};
        
        patterns.forEach(p => {
            Object.entries(p.behavior).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    if (!behaviors[key]) behaviors[key] = {};
                    behaviors[key][value] = (behaviors[key][value] || 0) + 1;
                }
            });
        });
        
        // Convert to percentages
        Object.keys(behaviors).forEach(key => {
            const total = Object.values(behaviors[key]).reduce((a, b) => a + b, 0);
            Object.keys(behaviors[key]).forEach(val => {
                behaviors[key][val] = Math.round(behaviors[key][val] / total * 100) / 100;
            });
        });
        
        return behaviors;
    },
    
    /**
     * Calculate average confidence
     */
    calculateAvgConfidence: function(patterns) {
        if (patterns.length === 0) return 0;
        return Math.round(
            patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length * 100
        ) / 100;
    },
    
    /**
     * Get time range
     */
    getTimeRange: function(patterns) {
        if (patterns.length === 0) return null;
        const timestamps = patterns.map(p => p.timestamp);
        return {
            start: Math.min(...timestamps),
            end: Math.max(...timestamps),
            span_days: Math.ceil((Math.max(...timestamps) - Math.min(...timestamps)) / (24 * 60 * 60 * 1000))
        };
    },
    
    /**
     * Generate insights from aggregated data
     */
    generateInsights: function(patterns, impacts) {
        const insights = [];
        
        // Feature impact insights
        impacts.forEach(impact => {
            if (impact.avg_impact > 0.5) {
                insights.push({
                    type: 'feature_impact',
                    text: `Feature "${impact.feature}" increased Retention by ${Math.round(impact.avg_impact * 100)}%`,
                    confidence: impact.positive_ratio
                });
            }
        });
        
        // Physics trend insights
        const physicsAgg = this.aggregatePhysics(patterns);
        if (physicsAgg.stability?.mean > 0.7) {
            insights.push({
                type: 'physics_trend',
                text: 'High system stability detected across users',
                confidence: 0.8
            });
        }
        
        if (physicsAgg.entropy?.distribution.high > 0.3) {
            insights.push({
                type: 'warning',
                text: '30%+ users showing high entropy - intervention recommended',
                confidence: 0.75
            });
        }
        
        return insights;
    },
    
    // ================================================================
    // MAINTENANCE
    // ================================================================
    
    /**
     * Cleanup old patterns
     */
    cleanupOldPatterns: function() {
        const cutoff = Date.now() - this.config.maxPatternAge;
        this.extractedPatterns = this.extractedPatterns.filter(p => p.timestamp > cutoff);
    },
    
    /**
     * Clear all patterns
     */
    clear: function() {
        this.extractedPatterns = [];
        this.featureImpacts = [];
    }
};

export default PatternExtractor;




