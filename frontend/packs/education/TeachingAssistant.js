// ================================================================
// TEACHING ASSISTANT
// Observe teacher methods and trigger automation popups
// ================================================================

export const TeachingAssistant = {
    observations: [],
    automationTriggers: [],
    
    config: {
        observationInterval: 60000, // 1 minute
        triggerThreshold: 3,
        categories: ['lesson_prep', 'grading', 'communication', 'admin', 'planning']
    },
    
    // ================================================================
    // OBSERVATION
    // ================================================================
    
    // Start observing teacher activity
    startObservation: function(teacherId) {
        console.log(`[TeachingAssistant] Starting observation for teacher ${teacherId}`);
        
        return {
            teacherId,
            sessionId: 'obs_' + Date.now(),
            startedAt: Date.now(),
            status: 'active'
        };
    },
    
    // Record teacher action
    recordAction: function(teacherId, action) {
        const observation = {
            teacherId,
            action: action.type,
            category: this.categorizeAction(action),
            duration: action.duration || 5,
            timestamp: Date.now(),
            metadata: action.metadata || {}
        };
        
        this.observations.push(observation);
        
        // Check for automation opportunities
        this.checkAutomationTriggers(teacherId);
        
        return observation;
    },
    
    // Categorize action
    categorizeAction: function(action) {
        const categoryMap = {
            'create_lesson': 'lesson_prep',
            'prepare_materials': 'lesson_prep',
            'grade_assignment': 'grading',
            'grade_test': 'grading',
            'send_message': 'communication',
            'call_parent': 'communication',
            'write_report': 'communication',
            'attendance': 'admin',
            'schedule': 'admin',
            'meeting': 'admin',
            'curriculum': 'planning',
            'goals': 'planning'
        };
        
        return categoryMap[action.type] || 'admin';
    },
    
    // ================================================================
    // AUTOMATION TRIGGERS
    // ================================================================
    
    // Check for automation triggers
    checkAutomationTriggers: function(teacherId) {
        const recentObs = this.observations.filter(o => 
            o.teacherId === teacherId &&
            o.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
        );
        
        // Count by category
        const categoryCounts = {};
        recentObs.forEach(o => {
            categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
        });
        
        // Find high-frequency categories
        const triggers = [];
        Object.entries(categoryCounts).forEach(([category, count]) => {
            if (count >= this.config.triggerThreshold) {
                const automation = this.getAutomationSuggestion(category, count);
                if (automation && !this.isAlreadyTriggered(teacherId, category)) {
                    triggers.push(automation);
                    this.automationTriggers.push({
                        teacherId,
                        category,
                        timestamp: Date.now()
                    });
                }
            }
        });
        
        return triggers;
    },
    
    // Check if already triggered
    isAlreadyTriggered: function(teacherId, category) {
        const recent = this.automationTriggers.find(t =>
            t.teacherId === teacherId &&
            t.category === category &&
            t.timestamp > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
        );
        return !!recent;
    },
    
    // Get automation suggestion
    getAutomationSuggestion: function(category, frequency) {
        const suggestions = {
            lesson_prep: {
                title: '📚 수업 준비 자동화',
                description: `최근 ${frequency}회의 수업 준비 작업이 감지되었습니다. AI 교안 생성기로 시간을 절약하세요.`,
                automation: 'auto_lesson_generator',
                savedTime: frequency * 20,
                action: '자동 교안 생성 활성화'
            },
            grading: {
                title: '✓ 채점 자동화',
                description: `최근 ${frequency}회의 채점 작업이 감지되었습니다. 자동 채점 시스템을 활용하세요.`,
                automation: 'auto_grading',
                savedTime: frequency * 30,
                action: '자동 채점 활성화'
            },
            communication: {
                title: '💬 학부모 소통 자동화',
                description: `최근 ${frequency}회의 소통 작업이 감지되었습니다. 자동 리포트 발송을 설정하세요.`,
                automation: 'auto_parent_report',
                savedTime: frequency * 15,
                action: '자동 리포트 활성화'
            },
            admin: {
                title: '📋 행정 업무 자동화',
                description: `최근 ${frequency}회의 행정 업무가 감지되었습니다. 출석 및 스케줄 자동화를 활성화하세요.`,
                automation: 'auto_admin',
                savedTime: frequency * 10,
                action: '행정 자동화 활성화'
            },
            planning: {
                title: '📅 계획 수립 지원',
                description: `최근 ${frequency}회의 계획 작업이 감지되었습니다. AI 커리큘럼 추천을 받아보세요.`,
                automation: 'ai_curriculum',
                savedTime: frequency * 25,
                action: 'AI 추천 활성화'
            }
        };
        
        return suggestions[category];
    },
    
    // ================================================================
    // STATISTICS
    // ================================================================
    
    // Get teacher statistics
    getTeacherStats: function(teacherId) {
        const teacherObs = this.observations.filter(o => o.teacherId === teacherId);
        
        const categoryTime = {};
        teacherObs.forEach(o => {
            categoryTime[o.category] = (categoryTime[o.category] || 0) + o.duration;
        });
        
        const totalTime = Object.values(categoryTime).reduce((a, b) => a + b, 0);
        
        return {
            teacherId,
            totalObservations: teacherObs.length,
            totalTimeMinutes: totalTime,
            categoryBreakdown: categoryTime,
            categoryPercentage: Object.fromEntries(
                Object.entries(categoryTime).map(([k, v]) => [k, Math.round(v / totalTime * 100)])
            ),
            automationPotential: this.calculateAutomationPotential(categoryTime),
            topTimeConsumer: Object.entries(categoryTime).sort((a, b) => b[1] - a[1])[0]
        };
    },
    
    // Calculate automation potential
    calculateAutomationPotential: function(categoryTime) {
        const automationRates = {
            lesson_prep: 0.4,
            grading: 0.7,
            communication: 0.5,
            admin: 0.8,
            planning: 0.3
        };
        
        let potentialSavings = 0;
        Object.entries(categoryTime).forEach(([category, time]) => {
            potentialSavings += time * (automationRates[category] || 0.3);
        });
        
        return {
            minutes: Math.round(potentialSavings),
            hours: Math.round(potentialSavings / 60 * 10) / 10,
            percentage: Math.round(potentialSavings / Object.values(categoryTime).reduce((a, b) => a + b, 1) * 100)
        };
    }
};

export default TeachingAssistant;




