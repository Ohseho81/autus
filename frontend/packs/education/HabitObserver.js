// ================================================================
// HABIT OBSERVER
// Student behavior clustering and trait identification
// ================================================================

export const HabitObserver = {
    observations: [],
    traits: new Map(),
    clusters: [],
    
    config: {
        observationWindow: 30, // days
        minDataPoints: 10,
        clusterThreshold: 0.65
    },
    
    // Trait definitions
    traitDefinitions: {
        focused: { name: '집중형', indicators: ['long_sessions', 'few_breaks', 'task_completion'] },
        social: { name: '사회형', indicators: ['group_work', 'discussions', 'peer_help'] },
        creative: { name: '창의형', indicators: ['unique_solutions', 'questions', 'experiments'] },
        methodical: { name: '체계형', indicators: ['organized', 'scheduled', 'step_by_step'] },
        independent: { name: '자기주도형', indicators: ['self_study', 'extra_work', 'initiative'] },
        collaborative: { name: '협력형', indicators: ['team_projects', 'sharing', 'mentoring'] }
    },
    
    // Record observation
    observe: function(studentId, behavior) {
        const observation = {
            studentId,
            behavior,
            timestamp: Date.now(),
            indicators: this.extractIndicators(behavior)
        };
        
        this.observations.push(observation);
        this.updateTraits(studentId);
        
        return observation;
    },
    
    // Extract behavioral indicators
    extractIndicators: function(behavior) {
        const indicators = [];
        
        if (behavior.sessionDuration > 30) indicators.push('long_sessions');
        if (behavior.breakCount < 2) indicators.push('few_breaks');
        if (behavior.taskCompletion > 0.8) indicators.push('task_completion');
        if (behavior.groupInteraction > 5) indicators.push('group_work');
        if (behavior.questionsAsked > 3) indicators.push('questions');
        if (behavior.uniqueApproach) indicators.push('unique_solutions');
        if (behavior.organized) indicators.push('organized');
        if (behavior.selfInitiated) indicators.push('self_study');
        if (behavior.helpedPeers) indicators.push('peer_help');
        
        return indicators;
    },
    
    // Update student traits
    updateTraits: function(studentId) {
        const studentObs = this.observations.filter(o => o.studentId === studentId);
        
        if (studentObs.length < this.config.minDataPoints) return;
        
        // Count indicator occurrences
        const indicatorCounts = {};
        studentObs.forEach(obs => {
            obs.indicators.forEach(ind => {
                indicatorCounts[ind] = (indicatorCounts[ind] || 0) + 1;
            });
        });
        
        // Calculate trait scores
        const traitScores = {};
        Object.entries(this.traitDefinitions).forEach(([traitKey, trait]) => {
            const score = trait.indicators.reduce((sum, ind) => {
                return sum + (indicatorCounts[ind] || 0);
            }, 0) / (trait.indicators.length * studentObs.length);
            
            traitScores[traitKey] = Math.min(score * 2, 1); // Normalize to 0-1
        });
        
        // Identify dominant traits
        const dominantTraits = Object.entries(traitScores)
            .filter(([_, score]) => score > this.config.clusterThreshold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([trait, score]) => ({
                trait,
                name: this.traitDefinitions[trait].name,
                score: Math.round(score * 100)
            }));
        
        this.traits.set(studentId, {
            scores: traitScores,
            dominant: dominantTraits,
            lastUpdated: Date.now()
        });
        
        return this.traits.get(studentId);
    },
    
    // Cluster students by similar traits
    clusterStudents: function() {
        const students = Array.from(this.traits.entries());
        
        if (students.length < 2) return [];
        
        const clusters = {
            focused_independent: [],
            social_collaborative: [],
            creative_methodical: [],
            balanced: []
        };
        
        students.forEach(([studentId, data]) => {
            const dominant = data.dominant.map(d => d.trait);
            
            if (dominant.includes('focused') || dominant.includes('independent')) {
                clusters.focused_independent.push(studentId);
            } else if (dominant.includes('social') || dominant.includes('collaborative')) {
                clusters.social_collaborative.push(studentId);
            } else if (dominant.includes('creative') || dominant.includes('methodical')) {
                clusters.creative_methodical.push(studentId);
            } else {
                clusters.balanced.push(studentId);
            }
        });
        
        this.clusters = clusters;
        return clusters;
    },
    
    // Generate trait report
    generateTraitReport: function(studentId) {
        const data = this.traits.get(studentId);
        
        if (!data) {
            return { error: '충분한 관찰 데이터가 없습니다.' };
        }
        
        return {
            studentId,
            dominantTraits: data.dominant,
            allScores: data.scores,
            recommendations: this.generateRecommendations(data),
            learningStyle: this.determineLearningStyle(data),
            savedTime: 15 // Minutes saved on manual assessment
        };
    },
    
    // Generate recommendations based on traits
    generateRecommendations: function(data) {
        const recs = [];
        const dominant = data.dominant.map(d => d.trait);
        
        if (dominant.includes('focused')) {
            recs.push('심화 학습 자료 제공이 효과적입니다.');
        }
        if (dominant.includes('social')) {
            recs.push('그룹 프로젝트에 적극 참여시키세요.');
        }
        if (dominant.includes('creative')) {
            recs.push('열린 질문과 탐구 활동을 권장합니다.');
        }
        if (dominant.includes('methodical')) {
            recs.push('체계적인 학습 계획표를 활용하세요.');
        }
        if (dominant.includes('independent')) {
            recs.push('자기주도 학습 기회를 늘려주세요.');
        }
        
        return recs.length > 0 ? recs : ['균형 잡힌 학습 활동을 유지하세요.'];
    },
    
    // Determine learning style
    determineLearningStyle: function(data) {
        const styles = {
            visual: data.scores.creative * 0.5 + data.scores.methodical * 0.3,
            auditory: data.scores.social * 0.5 + data.scores.collaborative * 0.3,
            kinesthetic: data.scores.independent * 0.4 + data.scores.focused * 0.3,
            readingWriting: data.scores.methodical * 0.5 + data.scores.focused * 0.3
        };
        
        const dominant = Object.entries(styles).sort((a, b) => b[1] - a[1])[0];
        
        const styleNames = {
            visual: '시각형',
            auditory: '청각형',
            kinesthetic: '체험형',
            readingWriting: '읽기/쓰기형'
        };
        
        return {
            type: dominant[0],
            name: styleNames[dominant[0]],
            score: Math.round(dominant[1] * 100)
        };
    }
};

export default HabitObserver;




