// ================================================================
// DATA OBSERVER
// Monitor file system events and clipboard for repetitive tasks
// No Storage Policy: Raw data destroyed after feature extraction
// ================================================================

export const DataObserver = {
    isActive: false,
    filePatterns: [],
    clipboardPatterns: [],
    documentTasks: [],
    
    config: {
        patternThreshold: 3,
        observationWindow: 7 * 24 * 60 * 60 * 1000,
        autoDestroyRaw: true,
        supportedTypes: ['.csv', '.xlsx', '.pdf', '.docx', '.txt', '.json']
    },
    
    // ================================================================
    // OBSERVATION ENGINE
    // ================================================================
    
    /**
     * Start observing data interactions
     */
    start: function() {
        if (this.isActive) return;
        
        console.log('[DataObserver] Starting observation...');
        this.isActive = true;
        
        this.observeClipboard();
        this.observeFileDrops();
        this.observeDownloads();
    },
    
    /**
     * Stop observation
     */
    stop: function() {
        this.isActive = false;
        console.log('[DataObserver] Observation stopped');
    },
    
    // ================================================================
    // CLIPBOARD MONITORING
    // ================================================================
    
    /**
     * Observe clipboard patterns
     */
    observeClipboard: function() {
        if (typeof document === 'undefined') return;
        
        // Copy events
        document.addEventListener('copy', (e) => {
            if (!this.isActive) return;
            
            const selection = window.getSelection();
            const text = selection?.toString() || '';
            
            // Extract pattern, never store actual content
            this.recordClipboardPattern('copy', text);
        });
        
        // Paste events
        document.addEventListener('paste', (e) => {
            if (!this.isActive) return;
            
            const text = e.clipboardData?.getData('text/plain') || '';
            this.recordClipboardPattern('paste', text);
        });
    },
    
    /**
     * Record clipboard pattern (no content stored)
     */
    recordClipboardPattern: function(action, text) {
        const pattern = {
            action,
            length_bucket: this.getLengthBucket(text.length),
            content_type: this.classifyContent(text),
            has_structure: this.hasStructure(text),
            timestamp: Date.now()
        };
        
        this.clipboardPatterns.push(pattern);
        
        // Keep only recent
        const cutoff = Date.now() - this.config.observationWindow;
        this.clipboardPatterns = this.clipboardPatterns.filter(p => p.timestamp > cutoff);
    },
    
    /**
     * Classify content type (no actual content stored)
     */
    classifyContent: function(text) {
        if (/^\d+$/.test(text)) return 'numeric';
        if (/^[\w.-]+@[\w.-]+\.\w+$/.test(text)) return 'email';
        if (/^https?:\/\//.test(text)) return 'url';
        if (/^\d{2,4}[-\/]\d{2}[-\/]\d{2,4}$/.test(text)) return 'date';
        if (/^[\d,]+\.?\d*$/.test(text)) return 'currency';
        if (text.includes('\t') || text.includes(',')) return 'tabular';
        if (text.length < 50) return 'short_text';
        return 'long_text';
    },
    
    /**
     * Check if content has structure
     */
    hasStructure: function(text) {
        return text.includes('\n') || text.includes('\t') || 
               text.includes(',') || text.includes('|');
    },
    
    /**
     * Get clipboard patterns for automation
     */
    getClipboardPatterns: function() {
        // Group by action and content type
        const groups = {};
        
        this.clipboardPatterns.forEach(p => {
            const key = `${p.action}_${p.content_type}`;
            if (!groups[key]) {
                groups[key] = { count: 0, timestamps: [], structured: 0 };
            }
            groups[key].count++;
            groups[key].timestamps.push(p.timestamp);
            if (p.has_structure) groups[key].structured++;
        });
        
        const patterns = Object.entries(groups)
            .filter(([_, data]) => data.count >= this.config.patternThreshold)
            .map(([key, data]) => ({
                pattern_id: key,
                frequency_mass: data.count / 7,
                structure_ratio: data.structured / data.count,
                time_pattern: this.detectTimePattern(data.timestamps),
                automation_type: this.suggestAutomationType(key, data)
            }));
        
        if (this.config.autoDestroyRaw) {
            this.clipboardPatterns = [];
        }
        
        return patterns;
    },
    
    /**
     * Suggest automation type based on pattern
     */
    suggestAutomationType: function(key, data) {
        if (key.includes('tabular')) return 'data_extraction';
        if (key.includes('email')) return 'contact_capture';
        if (key.includes('url')) return 'link_collection';
        if (data.structure_ratio > 0.5) return 'structured_copy';
        return 'text_template';
    },
    
    // ================================================================
    // FILE DROP MONITORING
    // ================================================================
    
    /**
     * Observe file drop patterns
     */
    observeFileDrops: function() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('drop', (e) => {
            if (!this.isActive) return;
            
            const files = e.dataTransfer?.files;
            if (!files || files.length === 0) return;
            
            for (const file of files) {
                this.recordFilePattern('drop', file);
            }
        });
        
        // File input changes
        document.addEventListener('change', (e) => {
            if (!this.isActive) return;
            if (e.target.type !== 'file') return;
            
            const files = e.target.files;
            for (const file of files) {
                this.recordFilePattern('upload', file);
            }
        });
    },
    
    /**
     * Record file pattern (no file content stored)
     */
    recordFilePattern: function(action, file) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        
        const pattern = {
            action,
            extension: ext,
            size_bucket: this.getSizeBucket(file.size),
            name_pattern: this.extractNamePattern(file.name),
            timestamp: Date.now()
        };
        
        this.filePatterns.push(pattern);
        
        // Keep only recent
        const cutoff = Date.now() - this.config.observationWindow;
        this.filePatterns = this.filePatterns.filter(p => p.timestamp > cutoff);
    },
    
    /**
     * Get size bucket (no exact size)
     */
    getSizeBucket: function(bytes) {
        if (bytes < 10 * 1024) return 'tiny';
        if (bytes < 100 * 1024) return 'small';
        if (bytes < 1024 * 1024) return 'medium';
        if (bytes < 10 * 1024 * 1024) return 'large';
        return 'very_large';
    },
    
    /**
     * Extract name pattern (no actual name)
     */
    extractNamePattern: function(filename) {
        const name = filename.split('.')[0];
        
        if (/\d{4}[-_]\d{2}[-_]\d{2}/.test(name)) return 'dated';
        if (/v\d+|version/i.test(name)) return 'versioned';
        if (/report|summary|analysis/i.test(name)) return 'report';
        if (/data|export|backup/i.test(name)) return 'data_export';
        if (/invoice|receipt|order/i.test(name)) return 'financial';
        return 'generic';
    },
    
    /**
     * Get file patterns for automation
     */
    getFilePatterns: function() {
        const groups = {};
        
        this.filePatterns.forEach(p => {
            const key = `${p.action}_${p.extension}_${p.name_pattern}`;
            if (!groups[key]) {
                groups[key] = { count: 0, sizes: [], timestamps: [] };
            }
            groups[key].count++;
            groups[key].sizes.push(p.size_bucket);
            groups[key].timestamps.push(p.timestamp);
        });
        
        const patterns = Object.entries(groups)
            .filter(([_, data]) => data.count >= this.config.patternThreshold)
            .map(([key, data]) => {
                const [action, ext, namePattern] = key.split('_');
                return {
                    pattern_id: key,
                    extension: ext,
                    name_pattern: namePattern,
                    frequency_mass: data.count / 7,
                    size_consistency: this.calculateConsistency(data.sizes),
                    automation_suggestion: this.suggestFileAutomation(ext, namePattern)
                };
            });
        
        if (this.config.autoDestroyRaw) {
            this.filePatterns = [];
        }
        
        return patterns;
    },
    
    /**
     * Suggest file automation
     */
    suggestFileAutomation: function(ext, namePattern) {
        if (ext === '.csv' || ext === '.xlsx') {
            if (namePattern === 'report') return 'auto_report_generation';
            if (namePattern === 'data_export') return 'data_pipeline';
            return 'spreadsheet_processing';
        }
        if (ext === '.pdf') {
            if (namePattern === 'financial') return 'invoice_processing';
            return 'pdf_extraction';
        }
        if (ext === '.docx') return 'document_template';
        return 'file_organization';
    },
    
    // ================================================================
    // DOWNLOAD MONITORING
    // ================================================================
    
    downloadPatterns: [],
    
    /**
     * Observe download patterns
     */
    observeDownloads: function() {
        // Track programmatic downloads
        const originalCreateElement = document.createElement.bind(document);
        
        document.createElement = (tagName) => {
            const element = originalCreateElement(tagName);
            
            if (tagName.toLowerCase() === 'a') {
                const originalClick = element.click.bind(element);
                element.click = () => {
                    if (element.download && this.isActive) {
                        this.recordDownloadPattern(element);
                    }
                    return originalClick();
                };
            }
            
            return element;
        };
    },
    
    /**
     * Record download pattern
     */
    recordDownloadPattern: function(element) {
        const filename = element.download;
        const ext = '.' + filename.split('.').pop().toLowerCase();
        
        this.downloadPatterns.push({
            extension: ext,
            name_pattern: this.extractNamePattern(filename),
            timestamp: Date.now()
        });
    },
    
    // ================================================================
    // DOCUMENT TASK DETECTION
    // ================================================================
    
    /**
     * Record document task
     */
    recordDocumentTask: function(task) {
        this.documentTasks.push({
            type: task.type,
            source_type: task.sourceType,
            output_type: task.outputType,
            steps: task.steps?.length || 0,
            timestamp: Date.now()
        });
        
        // Keep only recent
        const cutoff = Date.now() - this.config.observationWindow;
        this.documentTasks = this.documentTasks.filter(t => t.timestamp > cutoff);
    },
    
    /**
     * Get document task patterns
     */
    getDocumentTaskPatterns: function() {
        const groups = {};
        
        this.documentTasks.forEach(t => {
            const key = `${t.type}_${t.source_type}_${t.output_type}`;
            if (!groups[key]) {
                groups[key] = { count: 0, avgSteps: 0, timestamps: [] };
            }
            groups[key].count++;
            groups[key].avgSteps = (groups[key].avgSteps * (groups[key].count - 1) + t.steps) / groups[key].count;
            groups[key].timestamps.push(t.timestamp);
        });
        
        return Object.entries(groups)
            .filter(([_, data]) => data.count >= 2)
            .map(([key, data]) => ({
                task_pattern: key,
                frequency: data.count / 7,
                complexity: data.avgSteps,
                time_save_potential: data.avgSteps * data.count * 2 // minutes
            }));
    },
    
    // ================================================================
    // UTILITY FUNCTIONS
    // ================================================================
    
    getLengthBucket: function(length) {
        if (length < 20) return 'tiny';
        if (length < 100) return 'short';
        if (length < 500) return 'medium';
        if (length < 2000) return 'long';
        return 'very_long';
    },
    
    calculateConsistency: function(values) {
        if (values.length < 2) return 1;
        const counts = {};
        values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        const max = Math.max(...Object.values(counts));
        return max / values.length;
    },
    
    detectTimePattern: function(timestamps) {
        if (timestamps.length < 3) return 'insufficient';
        
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / intervals.length;
        const cv = Math.sqrt(variance) / avg;
        
        if (cv < 0.3) return 'regular';
        if (cv < 0.7) return 'semi_regular';
        return 'irregular';
    },
    
    // ================================================================
    // AUTOMATION OPPORTUNITIES
    // ================================================================
    
    /**
     * Get all data-related automation opportunities
     */
    getAutomationOpportunities: function() {
        const clipboardPatterns = this.getClipboardPatterns();
        const filePatterns = this.getFilePatterns();
        const taskPatterns = this.getDocumentTaskPatterns();
        
        const opportunities = [];
        
        // Clipboard-based
        clipboardPatterns
            .filter(p => p.frequency_mass > 0.3)
            .forEach(p => {
                opportunities.push({
                    type: 'clipboard_automation',
                    subtype: p.automation_type,
                    pattern_id: p.pattern_id,
                    potential_time_save: Math.round(p.frequency_mass * 3),
                    confidence: p.structure_ratio
                });
            });
        
        // File-based
        filePatterns
            .filter(p => p.frequency_mass > 0.2)
            .forEach(p => {
                opportunities.push({
                    type: 'file_automation',
                    subtype: p.automation_suggestion,
                    pattern_id: p.pattern_id,
                    potential_time_save: Math.round(p.frequency_mass * 10),
                    confidence: p.size_consistency
                });
            });
        
        // Task-based
        taskPatterns
            .filter(p => p.time_save_potential > 10)
            .forEach(p => {
                opportunities.push({
                    type: 'task_automation',
                    subtype: p.task_pattern,
                    potential_time_save: p.time_save_potential,
                    confidence: 0.7
                });
            });
        
        return opportunities.sort((a, b) => b.potential_time_save - a.potential_time_save);
    }
};

export default DataObserver;




