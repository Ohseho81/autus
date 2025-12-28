// ================================================================
// PATTERN MATCHER
// Cross-reference logs from 3 observers for high-ROI automation
// Calculate Time-Saving Velocity: Priority to tasks saving >10h/month
// ================================================================

import { WebObserver } from './WebObserver.js';
import { DataObserver } from './DataObserver.js';
import { CommObserver } from './CommObserver.js';

export const PatternMatcher = {
    // Minimum hours/month to be considered high-ROI
    MIN_ROI_HOURS: 10,
    
    // Combined patterns from all observers
    combinedPatterns: [],
    
    // High-ROI opportunities
    highROIOpportunities: [],
    
    // ================================================================
    // CROSS-REFERENCE ENGINE
    // ================================================================
    
    /**
     * Collect and cross-reference patterns from all observers
     */
    analyze: function() {
        console.log('[PatternMatcher] Starting cross-reference analysis...');
        
        // Collect from all observers
        const webOps = WebObserver.getAutomationOpportunities();
        const dataOps = DataObserver.getAutomationOpportunities();
        const commOps = CommObserver.getAutomationOpportunities();
        
        // Combine all opportunities
        this.combinedPatterns = [
            ...webOps.map(o => ({ ...o, source: 'web' })),
            ...dataOps.map(o => ({ ...o, source: 'data' })),
            ...commOps.map(o => ({ ...o, source: 'comm' }))
        ];
        
        // Calculate Time-Saving Velocity
        this.calculateVelocity();
        
        // Find cross-observer correlations
        this.findCorrelations();
        
        // Filter high-ROI opportunities
        this.filterHighROI();
        
        return this.getResults();
    },
    
    /**
     * Calculate Time-Saving Velocity for each pattern
     * TSV = (time_saved_per_occurrence * frequency) / observation_period
     */
    calculateVelocity: function() {
        this.combinedPatterns.forEach(pattern => {
            const weeklyMinutes = pattern.potential_time_save || 0;
            const monthlyMinutes = weeklyMinutes * 4.33;
            const monthlyHours = monthlyMinutes / 60;
            
            pattern.time_saving_velocity = {
                weekly_minutes: weeklyMinutes,
                monthly_hours: Math.round(monthlyHours * 10) / 10,
                is_high_roi: monthlyHours >= this.MIN_ROI_HOURS,
                roi_rank: this.calculateROIRank(monthlyHours, pattern.confidence || 0.5)
            };
        });
    },
    
    /**
     * Calculate ROI rank (0-100)
     */
    calculateROIRank: function(monthlyHours, confidence) {
        // Base score from time saved
        let score = Math.min(monthlyHours / 20, 1) * 70; // Up to 70 points
        
        // Confidence multiplier
        score += confidence * 30; // Up to 30 points
        
        return Math.round(score);
    },
    
    // ================================================================
    // CORRELATION DETECTION
    // ================================================================
    
    /**
     * Find patterns that correlate across observers
     */
    findCorrelations: function() {
        const correlations = [];
        
        // Group by potential workflow
        const workflows = this.detectWorkflows();
        
        workflows.forEach(workflow => {
            if (workflow.patterns.length > 1) {
                // Multiple observer patterns = likely a complete workflow
                const combinedTimeSave = workflow.patterns.reduce(
                    (sum, p) => sum + (p.potential_time_save || 0), 0
                );
                
                correlations.push({
                    workflow_id: workflow.id,
                    name: workflow.name,
                    patterns: workflow.patterns.map(p => p.pattern_id),
                    sources: [...new Set(workflow.patterns.map(p => p.source))],
                    combined_time_save: combinedTimeSave,
                    confidence: this.calculateWorkflowConfidence(workflow.patterns),
                    automation_complexity: workflow.patterns.length > 3 ? 'high' : 'medium'
                });
            }
        });
        
        // Add correlations to combined patterns
        correlations.forEach(corr => {
            this.combinedPatterns.push({
                type: 'workflow_correlation',
                ...corr,
                potential_time_save: corr.combined_time_save,
                time_saving_velocity: {
                    weekly_minutes: corr.combined_time_save,
                    monthly_hours: Math.round(corr.combined_time_save * 4.33 / 60 * 10) / 10,
                    is_high_roi: (corr.combined_time_save * 4.33 / 60) >= this.MIN_ROI_HOURS,
                    roi_rank: this.calculateROIRank(corr.combined_time_save * 4.33 / 60, corr.confidence)
                }
            });
        });
    },
    
    /**
     * Detect potential workflows from patterns
     */
    detectWorkflows: function() {
        const workflows = [];
        
        // Workflow: Report Generation
        const reportPatterns = this.combinedPatterns.filter(p => 
            p.subtype?.includes('report') || 
            p.subtype?.includes('spreadsheet') ||
            p.type?.includes('file')
        );
        
        if (reportPatterns.length > 0) {
            workflows.push({
                id: 'wf_report_gen',
                name: 'Report Generation',
                patterns: reportPatterns
            });
        }
        
        // Workflow: Communication
        const commPatterns = this.combinedPatterns.filter(p =>
            p.source === 'comm' ||
            p.subtype?.includes('email') ||
            p.subtype?.includes('message')
        );
        
        if (commPatterns.length > 0) {
            workflows.push({
                id: 'wf_communication',
                name: 'Communication Automation',
                patterns: commPatterns
            });
        }
        
        // Workflow: Data Processing
        const dataPatterns = this.combinedPatterns.filter(p =>
            p.subtype?.includes('data') ||
            p.subtype?.includes('extraction') ||
            p.type?.includes('clipboard')
        );
        
        if (dataPatterns.length > 0) {
            workflows.push({
                id: 'wf_data_proc',
                name: 'Data Processing',
                patterns: dataPatterns
            });
        }
        
        // Workflow: Navigation
        const navPatterns = this.combinedPatterns.filter(p =>
            p.type === 'web_navigation' ||
            p.type === 'click_automation'
        );
        
        if (navPatterns.length > 1) {
            workflows.push({
                id: 'wf_navigation',
                name: 'Navigation Automation',
                patterns: navPatterns
            });
        }
        
        return workflows;
    },
    
    /**
     * Calculate workflow confidence
     */
    calculateWorkflowConfidence: function(patterns) {
        const avgConfidence = patterns.reduce(
            (sum, p) => sum + (p.confidence || 0.5), 0
        ) / patterns.length;
        
        // Bonus for multi-source workflows
        const sources = new Set(patterns.map(p => p.source));
        const sourceBonus = sources.size > 1 ? 0.1 : 0;
        
        return Math.min(avgConfidence + sourceBonus, 1);
    },
    
    // ================================================================
    // HIGH-ROI FILTERING
    // ================================================================
    
    /**
     * Filter to high-ROI opportunities
     */
    filterHighROI: function() {
        this.highROIOpportunities = this.combinedPatterns
            .filter(p => p.time_saving_velocity?.is_high_roi)
            .sort((a, b) => b.time_saving_velocity.roi_rank - a.time_saving_velocity.roi_rank);
    },
    
    // ================================================================
    // INSIGHT GENERATION
    // ================================================================
    
    /**
     * Generate insight toast data
     */
    generateInsightToast: function(opportunity) {
        const monthlyHours = opportunity.time_saving_velocity?.monthly_hours || 0;
        const area = this.getAreaName(opportunity);
        
        return {
            title: '🔥 자동화 기회 발견!',
            area: area,
            message: `${area} 영역에서 자동화 기회를 발견했습니다!`,
            roi: `월 ${monthlyHours}시간 절약 예상`,
            confidence: Math.round((opportunity.confidence || 0.5) * 100) + '%',
            action: {
                label: '자동화 설정',
                handler: () => this.activateAutomation(opportunity)
            },
            physics_impact: this.calculatePhysicsImpact(monthlyHours)
        };
    },
    
    /**
     * Get human-readable area name
     */
    getAreaName: function(opportunity) {
        const areaMap = {
            'web_navigation': '웹 네비게이션',
            'form_filling': '폼 입력',
            'click_automation': '클릭 자동화',
            'clipboard_automation': '클립보드',
            'file_automation': '파일 처리',
            'message_template': '메시지 템플릿',
            'response_automation': '응답 자동화',
            'workflow_correlation': '워크플로우'
        };
        
        return areaMap[opportunity.type] || opportunity.type;
    },
    
    /**
     * Calculate physics impact (P_outcome boost)
     */
    calculatePhysicsImpact: function(monthlyHours) {
        // 1 hour/month = 0.1% success probability boost
        const boost = monthlyHours * 0.001;
        
        return {
            success_probability_boost: boost,
            display: `성공 확률 +${(boost * 100).toFixed(1)}%`
        };
    },
    
    /**
     * Activate automation for opportunity
     */
    activateAutomation: function(opportunity) {
        console.log('[PatternMatcher] Activating automation:', opportunity.pattern_id);
        
        return {
            activated: true,
            pattern_id: opportunity.pattern_id,
            estimated_savings: opportunity.time_saving_velocity,
            timestamp: Date.now()
        };
    },
    
    // ================================================================
    // RESULTS
    // ================================================================
    
    /**
     * Get analysis results
     */
    getResults: function() {
        return {
            total_patterns: this.combinedPatterns.length,
            high_roi_count: this.highROIOpportunities.length,
            
            by_source: {
                web: this.combinedPatterns.filter(p => p.source === 'web').length,
                data: this.combinedPatterns.filter(p => p.source === 'data').length,
                comm: this.combinedPatterns.filter(p => p.source === 'comm').length,
                workflow: this.combinedPatterns.filter(p => p.type === 'workflow_correlation').length
            },
            
            high_roi_opportunities: this.highROIOpportunities.slice(0, 10).map(o => ({
                pattern_id: o.pattern_id || o.workflow_id,
                type: o.type,
                monthly_hours: o.time_saving_velocity.monthly_hours,
                roi_rank: o.time_saving_velocity.roi_rank,
                confidence: o.confidence
            })),
            
            total_potential_savings: {
                weekly_minutes: this.highROIOpportunities.reduce(
                    (sum, o) => sum + o.time_saving_velocity.weekly_minutes, 0
                ),
                monthly_hours: this.highROIOpportunities.reduce(
                    (sum, o) => sum + o.time_saving_velocity.monthly_hours, 0
                )
            },
            
            ready_for_automation: this.highROIOpportunities.filter(o => 
                (o.confidence || 0) > 0.7
            ).length,
            
            analyzed_at: Date.now()
        };
    },
    
    /**
     * Get top opportunity for toast display
     */
    getTopOpportunity: function() {
        if (this.highROIOpportunities.length === 0) {
            return null;
        }
        
        const top = this.highROIOpportunities[0];
        return this.generateInsightToast(top);
    }
};

export default PatternMatcher;




