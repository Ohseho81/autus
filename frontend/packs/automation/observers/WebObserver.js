// ================================================================
// WEB OBSERVER
// Monitor browser interaction patterns for automation opportunities
// No Storage Policy: Raw data destroyed after feature extraction
// ================================================================

export const WebObserver = {
    isActive: false,
    patterns: [],
    urlClusters: new Map(),
    inputPatterns: [],
    
    config: {
        minClusterSize: 3,
        patternThreshold: 5,
        observationWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
        autoDestroyRaw: true
    },
    
    // ================================================================
    // OBSERVATION ENGINE
    // ================================================================
    
    /**
     * Start observing browser interactions
     */
    start: function() {
        if (this.isActive) return;
        
        console.log('[WebObserver] Starting observation...');
        this.isActive = true;
        
        // URL tracking
        this.observeNavigation();
        
        // Input field monitoring
        this.observeInputs();
        
        // Click patterns
        this.observeClicks();
        
        // Form submissions
        this.observeForms();
    },
    
    /**
     * Stop observation
     */
    stop: function() {
        this.isActive = false;
        console.log('[WebObserver] Observation stopped');
    },
    
    // ================================================================
    // URL CLUSTER ANALYSIS
    // ================================================================
    
    /**
     * Observe navigation patterns
     */
    observeNavigation: function() {
        // Track URL patterns (domain clusters)
        const recordNavigation = (url) => {
            if (!this.isActive) return;
            
            try {
                const parsed = new URL(url);
                const domain = parsed.hostname;
                const path = parsed.pathname;
                
                // Cluster by domain
                if (!this.urlClusters.has(domain)) {
                    this.urlClusters.set(domain, {
                        domain,
                        visits: 0,
                        paths: new Map(),
                        firstVisit: Date.now(),
                        lastVisit: Date.now()
                    });
                }
                
                const cluster = this.urlClusters.get(domain);
                cluster.visits++;
                cluster.lastVisit = Date.now();
                
                // Track paths within domain
                const pathCount = cluster.paths.get(path) || 0;
                cluster.paths.set(path, pathCount + 1);
                
            } catch (e) {
                // Invalid URL, ignore
            }
        };
        
        // Simulated navigation tracking
        // In real implementation, would use browser extension API
        if (typeof window !== 'undefined') {
            const originalPushState = history.pushState;
            history.pushState = function() {
                originalPushState.apply(this, arguments);
                recordNavigation(window.location.href);
            };
            
            window.addEventListener('popstate', () => {
                recordNavigation(window.location.href);
            });
        }
    },
    
    /**
     * Get URL clusters for automation detection
     */
    getUrlClusters: function() {
        const clusters = [];
        
        this.urlClusters.forEach((data, domain) => {
            if (data.visits >= this.config.minClusterSize) {
                // Extract physics attributes only
                clusters.push({
                    domain_hash: this.hashString(domain), // No raw domain stored
                    visit_mass: Math.log10(data.visits + 1), // Normalized mass
                    path_entropy: this.calculateEntropy(Array.from(data.paths.values())),
                    frequency: data.visits / 7, // Daily average
                    recency: (Date.now() - data.lastVisit) / (24 * 60 * 60 * 1000)
                });
            }
        });
        
        // Destroy raw data after extraction
        if (this.config.autoDestroyRaw) {
            this.urlClusters.clear();
        }
        
        return clusters;
    },
    
    // ================================================================
    // INPUT FIELD MONITORING
    // ================================================================
    
    /**
     * Observe input field patterns
     */
    observeInputs: function() {
        if (typeof document === 'undefined') return;
        
        const recordInput = (element, value) => {
            if (!this.isActive) return;
            
            // Extract pattern, not actual value
            const pattern = {
                type: element.type || 'text',
                name_hash: this.hashString(element.name || element.id || 'unknown'),
                length_bucket: this.getLengthBucket(value.length),
                has_numbers: /\d/.test(value),
                has_special: /[^a-zA-Z0-9\s]/.test(value),
                timestamp: Date.now()
            };
            
            // Never store actual value
            this.inputPatterns.push(pattern);
            
            // Keep only recent patterns
            const cutoff = Date.now() - this.config.observationWindow;
            this.inputPatterns = this.inputPatterns.filter(p => p.timestamp > cutoff);
        };
        
        // Debounced input handler
        let inputTimeout;
        document.addEventListener('input', (e) => {
            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(() => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    recordInput(e.target, e.target.value);
                }
            }, 500);
        }, true);
    },
    
    /**
     * Get input patterns for automation detection
     */
    getInputPatterns: function() {
        // Group by type and extract physics
        const typeGroups = {};
        
        this.inputPatterns.forEach(p => {
            const key = `${p.type}_${p.name_hash}`;
            if (!typeGroups[key]) {
                typeGroups[key] = { count: 0, lengths: [], timestamps: [] };
            }
            typeGroups[key].count++;
            typeGroups[key].lengths.push(p.length_bucket);
            typeGroups[key].timestamps.push(p.timestamp);
        });
        
        const patterns = Object.entries(typeGroups)
            .filter(([_, data]) => data.count >= this.config.patternThreshold)
            .map(([key, data]) => ({
                pattern_id: key,
                frequency_mass: data.count / 7,
                consistency: this.calculateConsistency(data.lengths),
                time_pattern: this.detectTimePattern(data.timestamps),
                automation_potential: data.count * this.calculateConsistency(data.lengths)
            }));
        
        // Clear raw data
        if (this.config.autoDestroyRaw) {
            this.inputPatterns = [];
        }
        
        return patterns;
    },
    
    // ================================================================
    // CLICK PATTERN ANALYSIS
    // ================================================================
    
    clickPatterns: [],
    
    /**
     * Observe click patterns
     */
    observeClicks: function() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('click', (e) => {
            if (!this.isActive) return;
            
            const target = e.target;
            
            // Extract pattern, not actual element
            const pattern = {
                tag: target.tagName,
                class_hash: this.hashString(target.className || ''),
                has_text: target.textContent?.length > 0,
                position_bucket: this.getPositionBucket(e.clientX, e.clientY),
                timestamp: Date.now()
            };
            
            this.clickPatterns.push(pattern);
            
            // Keep only recent
            const cutoff = Date.now() - this.config.observationWindow;
            this.clickPatterns = this.clickPatterns.filter(p => p.timestamp > cutoff);
        }, true);
    },
    
    /**
     * Get click patterns for automation detection
     */
    getClickPatterns: function() {
        // Group by tag and position
        const groups = {};
        
        this.clickPatterns.forEach(p => {
            const key = `${p.tag}_${p.position_bucket}`;
            if (!groups[key]) {
                groups[key] = { count: 0, timestamps: [] };
            }
            groups[key].count++;
            groups[key].timestamps.push(p.timestamp);
        });
        
        const patterns = Object.entries(groups)
            .filter(([_, data]) => data.count >= this.config.minClusterSize)
            .map(([key, data]) => ({
                click_pattern_id: key,
                frequency_mass: data.count / 7,
                regularity: this.detectTimePattern(data.timestamps),
                automation_potential: data.count > 10 ? 'high' : 'medium'
            }));
        
        if (this.config.autoDestroyRaw) {
            this.clickPatterns = [];
        }
        
        return patterns;
    },
    
    // ================================================================
    // FORM SUBMISSION TRACKING
    // ================================================================
    
    formPatterns: [],
    
    /**
     * Observe form submissions
     */
    observeForms: function() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('submit', (e) => {
            if (!this.isActive) return;
            
            const form = e.target;
            
            // Extract structure, not data
            const pattern = {
                field_count: form.elements.length,
                field_types: this.extractFieldTypes(form),
                action_hash: this.hashString(form.action || ''),
                timestamp: Date.now()
            };
            
            this.formPatterns.push(pattern);
        }, true);
    },
    
    /**
     * Extract field types from form (no values)
     */
    extractFieldTypes: function(form) {
        const types = {};
        for (const element of form.elements) {
            const type = element.type || 'unknown';
            types[type] = (types[type] || 0) + 1;
        }
        return types;
    },
    
    // ================================================================
    // UTILITY FUNCTIONS
    // ================================================================
    
    /**
     * Hash string for privacy
     */
    hashString: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(16);
    },
    
    /**
     * Get length bucket (no exact values)
     */
    getLengthBucket: function(length) {
        if (length < 10) return 'short';
        if (length < 50) return 'medium';
        if (length < 200) return 'long';
        return 'very_long';
    },
    
    /**
     * Get position bucket
     */
    getPositionBucket: function(x, y) {
        const width = window.innerWidth || 1920;
        const height = window.innerHeight || 1080;
        
        const xBucket = Math.floor(x / width * 3); // 0, 1, 2
        const yBucket = Math.floor(y / height * 3);
        
        return `${xBucket}_${yBucket}`;
    },
    
    /**
     * Calculate entropy of distribution
     */
    calculateEntropy: function(values) {
        const total = values.reduce((a, b) => a + b, 0);
        if (total === 0) return 0;
        
        let entropy = 0;
        values.forEach(v => {
            const p = v / total;
            if (p > 0) entropy -= p * Math.log2(p);
        });
        
        return entropy;
    },
    
    /**
     * Calculate consistency of values
     */
    calculateConsistency: function(values) {
        if (values.length < 2) return 1;
        
        const counts = {};
        values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        
        const max = Math.max(...Object.values(counts));
        return max / values.length;
    },
    
    /**
     * Detect time pattern
     */
    detectTimePattern: function(timestamps) {
        if (timestamps.length < 3) return 'insufficient';
        
        // Check for daily pattern
        const hours = timestamps.map(t => new Date(t).getHours());
        const hourCounts = {};
        hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
        
        const maxHourCount = Math.max(...Object.values(hourCounts));
        
        if (maxHourCount / timestamps.length > 0.5) {
            return 'daily_regular';
        }
        
        // Check for intervals
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
        const cv = Math.sqrt(variance) / avgInterval; // Coefficient of variation
        
        if (cv < 0.3) return 'regular_interval';
        if (cv < 0.7) return 'semi_regular';
        return 'irregular';
    },
    
    // ================================================================
    // AUTOMATION DETECTION
    // ================================================================
    
    /**
     * Get all automation opportunities
     */
    getAutomationOpportunities: function() {
        const urlPatterns = this.getUrlClusters();
        const inputPatterns = this.getInputPatterns();
        const clickPatterns = this.getClickPatterns();
        
        const opportunities = [];
        
        // High-frequency URL patterns
        urlPatterns
            .filter(p => p.frequency_mass > 0.5)
            .forEach(p => {
                opportunities.push({
                    type: 'web_navigation',
                    pattern_id: p.domain_hash,
                    potential_time_save: Math.round(p.visit_mass * 5), // minutes/week
                    confidence: 1 - p.path_entropy / 3
                });
            });
        
        // Repetitive input patterns
        inputPatterns
            .filter(p => p.automation_potential > 10)
            .forEach(p => {
                opportunities.push({
                    type: 'form_filling',
                    pattern_id: p.pattern_id,
                    potential_time_save: Math.round(p.frequency_mass * 2),
                    confidence: p.consistency
                });
            });
        
        // Repetitive click sequences
        clickPatterns
            .filter(p => p.automation_potential === 'high')
            .forEach(p => {
                opportunities.push({
                    type: 'click_automation',
                    pattern_id: p.click_pattern_id,
                    potential_time_save: Math.round(p.frequency_mass * 1),
                    confidence: p.regularity === 'regular_interval' ? 0.9 : 0.6
                });
            });
        
        return opportunities.sort((a, b) => b.potential_time_save - a.potential_time_save);
    }
};

export default WebObserver;




