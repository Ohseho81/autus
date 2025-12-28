// ================================================================
// COMM OBSERVER
// Scan communication patterns for template identification
// No Storage Policy: Content never stored, only patterns
// ================================================================

export const CommObserver = {
    isActive: false,
    messagePatterns: [],
    responseTemplates: [],
    communicationGraph: new Map(),
    
    config: {
        patternThreshold: 3,
        templateSimilarity: 0.7,
        observationWindow: 14 * 24 * 60 * 60 * 1000, // 14 days
        autoDestroyRaw: true
    },
    
    // ================================================================
    // OBSERVATION ENGINE
    // ================================================================
    
    /**
     * Start observing communication patterns
     */
    start: function() {
        if (this.isActive) return;
        
        console.log('[CommObserver] Starting observation...');
        this.isActive = true;
        
        this.observeTextareas();
        this.observeEmailPatterns();
    },
    
    /**
     * Stop observation
     */
    stop: function() {
        this.isActive = false;
        console.log('[CommObserver] Observation stopped');
    },
    
    // ================================================================
    // MESSAGE PATTERN DETECTION
    // ================================================================
    
    /**
     * Observe textarea inputs for message patterns
     */
    observeTextareas: function() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('focusout', (e) => {
            if (!this.isActive) return;
            
            const target = e.target;
            if (target.tagName !== 'TEXTAREA' && 
                !(target.tagName === 'INPUT' && target.type === 'text')) {
                return;
            }
            
            const text = target.value;
            if (text.length < 20) return; // Too short to be a message
            
            this.recordMessagePattern(text, this.detectContext(target));
        });
    },
    
    /**
     * Record message pattern (no content stored)
     */
    recordMessagePattern: function(text, context) {
        // Extract structure, never store content
        const pattern = {
            context,
            structure: this.extractStructure(text),
            length_bucket: this.getLengthBucket(text.length),
            formality: this.detectFormality(text),
            intent: this.detectIntent(text),
            has_greeting: this.hasGreeting(text),
            has_closing: this.hasClosing(text),
            paragraph_count: (text.match(/\n\n/g) || []).length + 1,
            timestamp: Date.now()
        };
        
        this.messagePatterns.push(pattern);
        
        // Keep only recent
        const cutoff = Date.now() - this.config.observationWindow;
        this.messagePatterns = this.messagePatterns.filter(p => p.timestamp > cutoff);
        
        // Check for template
        this.detectTemplatePattern(pattern);
    },
    
    /**
     * Detect context from element
     */
    detectContext: function(element) {
        const parent = element.closest('form');
        const placeholder = element.placeholder?.toLowerCase() || '';
        const name = element.name?.toLowerCase() || '';
        const id = element.id?.toLowerCase() || '';
        
        if (placeholder.includes('message') || name.includes('message')) return 'direct_message';
        if (placeholder.includes('comment') || name.includes('comment')) return 'comment';
        if (placeholder.includes('email') || name.includes('body')) return 'email';
        if (placeholder.includes('reply')) return 'reply';
        if (parent?.action?.includes('mail')) return 'email';
        
        return 'general';
    },
    
    /**
     * Extract message structure (no content)
     */
    extractStructure: function(text) {
        const lines = text.split('\n').filter(l => l.trim());
        
        return {
            line_count: lines.length,
            avg_line_length: lines.reduce((sum, l) => sum + l.length, 0) / lines.length,
            has_list: /^[\-\*\d\.]\s/m.test(text),
            has_question: text.includes('?'),
            has_link: /https?:\/\//.test(text),
            has_emphasis: /\*\*|__|\*|_/.test(text)
        };
    },
    
    /**
     * Detect formality level
     */
    detectFormality: function(text) {
        const formalIndicators = ['안녕하세요', '감사합니다', '드립니다', '부탁드립니다', 'Dear', 'Regards'];
        const informalIndicators = ['ㅋㅋ', 'ㅎㅎ', '!', '~', 'hey', 'thanks'];
        
        const formalCount = formalIndicators.filter(i => text.includes(i)).length;
        const informalCount = informalIndicators.filter(i => text.includes(i)).length;
        
        if (formalCount > informalCount) return 'formal';
        if (informalCount > formalCount) return 'informal';
        return 'neutral';
    },
    
    /**
     * Detect message intent
     */
    detectIntent: function(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('확인') || lower.includes('문의') || lower.includes('?')) return 'inquiry';
        if (lower.includes('요청') || lower.includes('부탁') || lower.includes('please')) return 'request';
        if (lower.includes('감사') || lower.includes('thank')) return 'gratitude';
        if (lower.includes('안내') || lower.includes('알림') || lower.includes('공지')) return 'notification';
        if (lower.includes('회신') || lower.includes('답변') || lower.includes('reply')) return 'response';
        if (lower.includes('제안') || lower.includes('suggest')) return 'proposal';
        
        return 'general';
    },
    
    /**
     * Check for greeting
     */
    hasGreeting: function(text) {
        const greetings = ['안녕하세요', '안녕', 'Hello', 'Hi', 'Dear', '반갑습니다'];
        const firstLine = text.split('\n')[0];
        return greetings.some(g => firstLine.includes(g));
    },
    
    /**
     * Check for closing
     */
    hasClosing: function(text) {
        const closings = ['감사합니다', '수고하세요', 'Regards', 'Thanks', 'Best', '드림'];
        const lastLines = text.split('\n').slice(-3).join(' ');
        return closings.some(c => lastLines.includes(c));
    },
    
    // ================================================================
    // TEMPLATE DETECTION
    // ================================================================
    
    /**
     * Detect if pattern matches existing template
     */
    detectTemplatePattern: function(pattern) {
        const signature = this.createPatternSignature(pattern);
        
        // Find similar patterns
        const similar = this.messagePatterns.filter(p => {
            if (p === pattern) return false;
            const otherSig = this.createPatternSignature(p);
            return this.calculateSimilarity(signature, otherSig) > this.config.templateSimilarity;
        });
        
        if (similar.length >= this.config.patternThreshold - 1) {
            // Template detected
            const templateId = 'tpl_' + this.hashSignature(signature);
            
            const existingTemplate = this.responseTemplates.find(t => t.id === templateId);
            
            if (existingTemplate) {
                existingTemplate.count++;
                existingTemplate.lastUsed = Date.now();
            } else {
                this.responseTemplates.push({
                    id: templateId,
                    signature,
                    context: pattern.context,
                    intent: pattern.intent,
                    formality: pattern.formality,
                    count: similar.length + 1,
                    firstDetected: Date.now(),
                    lastUsed: Date.now()
                });
            }
        }
    },
    
    /**
     * Create pattern signature for comparison
     */
    createPatternSignature: function(pattern) {
        return {
            context: pattern.context,
            formality: pattern.formality,
            intent: pattern.intent,
            has_greeting: pattern.has_greeting,
            has_closing: pattern.has_closing,
            length_bucket: pattern.length_bucket,
            paragraph_count: Math.min(pattern.paragraph_count, 5) // Cap at 5
        };
    },
    
    /**
     * Calculate similarity between signatures
     */
    calculateSimilarity: function(sig1, sig2) {
        const keys = Object.keys(sig1);
        let matches = 0;
        
        keys.forEach(key => {
            if (sig1[key] === sig2[key]) matches++;
        });
        
        return matches / keys.length;
    },
    
    /**
     * Hash signature for ID
     */
    hashSignature: function(signature) {
        const str = JSON.stringify(signature);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    },
    
    // ================================================================
    // EMAIL PATTERN OBSERVATION
    // ================================================================
    
    emailPatterns: [],
    
    /**
     * Observe email-like patterns
     */
    observeEmailPatterns: function() {
        // Look for email composition contexts
        if (typeof document === 'undefined') return;
        
        const emailSelectors = [
            '[aria-label*="compose"]',
            '[aria-label*="reply"]',
            '[data-action="compose"]',
            '.compose-area',
            '#compose-body'
        ];
        
        const observer = new MutationObserver((mutations) => {
            if (!this.isActive) return;
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        emailSelectors.forEach(selector => {
                            const elements = node.querySelectorAll?.(selector) || [];
                            elements.forEach(el => this.trackEmailElement(el));
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    },
    
    /**
     * Track email element
     */
    trackEmailElement: function(element) {
        // Just note that email composition is happening
        this.emailPatterns.push({
            context: 'email_compose',
            timestamp: Date.now()
        });
    },
    
    // ================================================================
    // COMMUNICATION GRAPH
    // ================================================================
    
    /**
     * Record communication interaction
     */
    recordInteraction: function(recipientHash, interactionType) {
        if (!this.communicationGraph.has(recipientHash)) {
            this.communicationGraph.set(recipientHash, {
                interactions: 0,
                types: {},
                firstContact: Date.now(),
                lastContact: Date.now()
            });
        }
        
        const node = this.communicationGraph.get(recipientHash);
        node.interactions++;
        node.types[interactionType] = (node.types[interactionType] || 0) + 1;
        node.lastContact = Date.now();
    },
    
    /**
     * Get communication topology (physics attributes only)
     */
    getCommunicationTopology: function() {
        const nodes = [];
        
        this.communicationGraph.forEach((data, hash) => {
            nodes.push({
                node_hash: hash,
                interaction_mass: Math.log10(data.interactions + 1),
                recency: (Date.now() - data.lastContact) / (24 * 60 * 60 * 1000),
                relationship_age: (Date.now() - data.firstContact) / (30 * 24 * 60 * 60 * 1000),
                primary_type: Object.entries(data.types).sort((a, b) => b[1] - a[1])[0]?.[0]
            });
        });
        
        return nodes;
    },
    
    // ================================================================
    // GET PATTERNS
    // ================================================================
    
    /**
     * Get message patterns for automation
     */
    getMessagePatterns: function() {
        const groups = {};
        
        this.messagePatterns.forEach(p => {
            const key = `${p.context}_${p.intent}_${p.formality}`;
            if (!groups[key]) {
                groups[key] = { count: 0, timestamps: [] };
            }
            groups[key].count++;
            groups[key].timestamps.push(p.timestamp);
        });
        
        const patterns = Object.entries(groups)
            .filter(([_, data]) => data.count >= this.config.patternThreshold)
            .map(([key, data]) => {
                const [context, intent, formality] = key.split('_');
                return {
                    pattern_id: key,
                    context,
                    intent,
                    formality,
                    frequency_mass: data.count / 14, // Per day over 2 weeks
                    time_pattern: this.detectTimePattern(data.timestamps)
                };
            });
        
        if (this.config.autoDestroyRaw) {
            this.messagePatterns = [];
        }
        
        return patterns;
    },
    
    /**
     * Get detected templates
     */
    getTemplates: function() {
        return this.responseTemplates.map(t => ({
            template_id: t.id,
            context: t.context,
            intent: t.intent,
            formality: t.formality,
            usage_count: t.count,
            time_save_potential: t.count * 5, // 5 min per message
            automation_ready: t.count >= 5
        }));
    },
    
    // ================================================================
    // UTILITY
    // ================================================================
    
    getLengthBucket: function(length) {
        if (length < 50) return 'brief';
        if (length < 200) return 'short';
        if (length < 500) return 'medium';
        if (length < 1000) return 'long';
        return 'very_long';
    },
    
    detectTimePattern: function(timestamps) {
        if (timestamps.length < 3) return 'insufficient';
        
        const hours = timestamps.map(t => new Date(t).getHours());
        const days = timestamps.map(t => new Date(t).getDay());
        
        // Check for work hours pattern
        const workHours = hours.filter(h => h >= 9 && h <= 18).length;
        if (workHours / hours.length > 0.8) return 'work_hours';
        
        // Check for weekday pattern
        const weekdays = days.filter(d => d >= 1 && d <= 5).length;
        if (weekdays / days.length > 0.8) return 'weekdays';
        
        return 'variable';
    },
    
    // ================================================================
    // AUTOMATION OPPORTUNITIES
    // ================================================================
    
    /**
     * Get all communication automation opportunities
     */
    getAutomationOpportunities: function() {
        const messagePatterns = this.getMessagePatterns();
        const templates = this.getTemplates();
        
        const opportunities = [];
        
        // Template-based automation
        templates
            .filter(t => t.automation_ready)
            .forEach(t => {
                opportunities.push({
                    type: 'message_template',
                    subtype: `${t.context}_${t.intent}`,
                    pattern_id: t.template_id,
                    potential_time_save: t.time_save_potential,
                    confidence: Math.min(t.usage_count / 10, 1)
                });
            });
        
        // Repetitive message patterns
        messagePatterns
            .filter(p => p.frequency_mass > 0.5)
            .forEach(p => {
                opportunities.push({
                    type: 'response_automation',
                    subtype: p.intent,
                    pattern_id: p.pattern_id,
                    potential_time_save: Math.round(p.frequency_mass * 5 * 14),
                    confidence: p.time_pattern === 'work_hours' ? 0.9 : 0.7
                });
            });
        
        return opportunities.sort((a, b) => b.potential_time_save - a.potential_time_save);
    }
};

export default CommObserver;




