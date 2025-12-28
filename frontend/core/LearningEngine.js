// ================================================================
// AUTUS LEARNING ENGINE
// Advanced pattern recognition and automation proposal system
// ================================================================

export const LearningEngine = {
    patterns: [],
    logs: [],
    config: {
        minFrequency: 3,
        lookbackDays: 7,
        clusterThreshold: 0.7
    },
    
    // AI-like cluster analysis
    AI_Analyzer: {
        findClusters: function(logs) {
            const actionGroups = {};
            
            logs.forEach(log => {
                const key = `${log.type}_${log.category || 'general'}`;
                if (!actionGroups[key]) {
                    actionGroups[key] = {
                        name: log.name || key,
                        type: log.type,
                        category: log.category,
                        count: 0,
                        totalDuration: 0,
                        instances: []
                    };
                }
                actionGroups[key].count++;
                actionGroups[key].totalDuration += log.duration || 5;
                actionGroups[key].instances.push(log);
            });
            
            // Calculate potential time savings
            return Object.values(actionGroups).map(group => ({
                ...group,
                potentialTimeSave: group.totalDuration * 0.7, // 70% automation efficiency
                frequency: group.count,
                avgDuration: group.totalDuration / group.count,
                automationPotential: Math.min(group.count / 10, 1) // 0-1 scale
            }));
        }
    },
    
    // 1. 반복 패턴 감지
    detectRepeatingPattern: function(logs) {
        const identifiedPatterns = this.AI_Analyzer.findClusters(logs || this.logs);
        return identifiedPatterns
            .filter(p => p.frequency >= this.config.minFrequency)
            .sort((a, b) => b.potentialTimeSave - a.potentialTimeSave);
    },
    
    // 2. 가치 중심 제안 (도파민 유도)
    generateProposal: function(pattern) {
        const weeklyTimeSave = Math.round(pattern.potentialTimeSave * (7 / this.config.lookbackDays));
        const successBoost = (pattern.automationPotential * 5).toFixed(1);
        
        return {
            id: 'proposal_' + Date.now(),
            title: "🔥 시간 절약 기회 발견",
            description: `지난 ${this.config.lookbackDays}일간 '${pattern.name}' 작업을 ${pattern.frequency}회 반복하셨네요. 자동화하면 주당 ${weeklyTimeSave}분을 벌 수 있습니다.`,
            reward: `예상 성공 확률 +${successBoost}% 상승`,
            action: "자동화 팩 활성화",
            pattern: pattern,
            metrics: {
                weeklyTimeSave,
                successBoost: parseFloat(successBoost),
                automationPotential: pattern.automationPotential
            }
        };
    },
    
    // 3. 행동 로그 추가
    addLog: function(log) {
        this.logs.push({
            ...log,
            timestamp: Date.now()
        });
        
        // Keep only recent logs
        const cutoff = Date.now() - (this.config.lookbackDays * 24 * 60 * 60 * 1000);
        this.logs = this.logs.filter(l => l.timestamp > cutoff);
        
        return this.checkForNewPatterns();
    },
    
    // 4. 새 패턴 체크
    checkForNewPatterns: function() {
        const patterns = this.detectRepeatingPattern();
        const newPatterns = patterns.filter(p => 
            !this.patterns.find(existing => existing.name === p.name)
        );
        
        if (newPatterns.length > 0) {
            this.patterns.push(...newPatterns);
            return newPatterns.map(p => this.generateProposal(p));
        }
        
        return [];
    },
    
    // 5. 패턴 승인
    acceptPattern: function(patternId) {
        const pattern = this.patterns.find(p => p.name === patternId || p.id === patternId);
        if (pattern) {
            pattern.accepted = true;
            pattern.acceptedAt = Date.now();
            return pattern;
        }
        return null;
    },
    
    // 6. 통계
    getStats: function() {
        return {
            totalLogs: this.logs.length,
            detectedPatterns: this.patterns.length,
            acceptedPatterns: this.patterns.filter(p => p.accepted).length,
            totalPotentialSavings: this.patterns.reduce((sum, p) => sum + (p.potentialTimeSave || 0), 0)
        };
    }
};

export default LearningEngine;




