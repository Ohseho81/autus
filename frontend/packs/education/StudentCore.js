// ================================================================
// STUDENT CORE - Education Pack Student Module
// Based on EduPack specification
// ================================================================

export const StudentCore = {
    // ================================================================
    // 1. 학생별 학습 로그 분석 (Data Observer)
    // ================================================================
    
    /**
     * Analyze student performance from test results
     * @param {Array} testResults - Array of student test data
     * @returns {Array} Analysis for each student
     */
    analyzeStudentPerformance: function(testResults) {
        return testResults.map(student => {
            // Calculate progress based on score delta
            const scoreDelta = student.currentScore - (student.previousScore || student.currentScore);
            const progress = scoreDelta > 5 ? '상승' : scoreDelta < -5 ? '하락' : '정체';
            
            // Find weak points from wrong answers
            const weakPoints = this.findWeakCategories(student.wrongAnswers || []);
            
            // Determine status based on attendance
            const attendanceRate = student.attendanceRate || 100;
            const status = attendanceRate < 80 ? '주의' : attendanceRate < 90 ? '관심' : '정상';
            
            // Calculate physics attributes
            const physics = this.calculateStudentPhysics(student);
            
            return {
                student_id: this.hashStudentId(student.id || student.name),
                progress,
                progress_delta: scoreDelta,
                weak_points: weakPoints,
                status,
                attendance_rate: attendanceRate,
                physics,
                recommendations: this.generateRecommendations(progress, weakPoints, status)
            };
        });
    },
    
    /**
     * Find top weak categories from wrong answers
     */
    findWeakCategories: function(wrongAnswers) {
        if (!wrongAnswers || wrongAnswers.length === 0) return [];
        
        // Count by category
        const categoryCounts = {};
        wrongAnswers.forEach(answer => {
            const category = answer.category || answer.topic || 'general';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        // Sort and return top 3
        return Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, count]) => ({
                category,
                error_count: count,
                severity: count > 5 ? 'high' : count > 2 ? 'medium' : 'low'
            }));
    },
    
    /**
     * Calculate student physics attributes
     */
    calculateStudentPhysics: function(student) {
        // Academic mass (importance/weight)
        const mass = Math.log10((student.currentScore || 50) / 10 + 1) * 2;
        
        // Learning velocity (rate of change)
        const velocity = Math.abs(student.scoreDelta || 0) / 10;
        
        // Engagement energy
        const attendance = (student.attendanceRate || 100) / 100;
        const participation = (student.participationRate || 50) / 100;
        const energy = (attendance * 0.6 + participation * 0.4) * 100;
        
        // Stability (consistency)
        const stability = student.scoreVariance 
            ? Math.max(0, 1 - Math.sqrt(student.scoreVariance) / 20)
            : 0.7;
        
        return {
            mass,
            velocity,
            kinetic_energy: energy * velocity,
            potential_energy: energy * (1 - velocity),
            stability,
            momentum: mass * velocity
        };
    },
    
    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations: function(progress, weakPoints, status) {
        const recommendations = [];
        
        if (progress === '하락') {
            recommendations.push('학습 패턴 점검 필요');
            recommendations.push('1:1 상담 권장');
        }
        
        if (weakPoints.length > 0) {
            const topWeak = weakPoints[0];
            recommendations.push(`${topWeak.category} 영역 보충학습 필요`);
        }
        
        if (status === '주의') {
            recommendations.push('출결 관리 강화 필요');
        }
        
        return recommendations;
    },
    
    /**
     * Hash student ID for privacy
     */
    hashStudentId: function(id) {
        let hash = 0;
        const str = String(id);
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return 'stu_' + Math.abs(hash).toString(16);
    },
    
    // ================================================================
    // 2. 학부모 소통용 브리핑 생성 (Comm Observer)
    // ================================================================
    
    /**
     * Generate parent briefing from student analysis
     * @param {Array} studentAnalysis - Analyzed student data
     * @returns {Array} Briefings for parents
     */
    generateParentBrief: function(studentAnalysis) {
        return studentAnalysis.map(data => {
            const progressText = {
                '상승': '꾸준히 성장하고 있습니다',
                '정체': '안정적으로 유지하고 있습니다',
                '하락': '최근 학습에 어려움을 겪고 있습니다'
            };
            
            const statusEmoji = {
                '정상': '✅',
                '관심': '📋',
                '주의': '⚠️'
            };
            
            // Generate message content
            let message = `${statusEmoji[data.status]} [아우투스 학습 알림]\n\n`;
            message += `${progressText[data.progress]}.\n`;
            
            if (data.weak_points.length > 0) {
                message += `\n📚 보충이 필요한 영역:\n`;
                data.weak_points.forEach(wp => {
                    message += `  - ${wp.category}\n`;
                });
            }
            
            if (data.recommendations.length > 0) {
                message += `\n💡 권장 사항:\n`;
                data.recommendations.forEach(rec => {
                    message += `  - ${rec}\n`;
                });
            }
            
            message += `\n출결률: ${data.attendance_rate}%`;
            
            return {
                student_id: data.student_id,
                message,
                priority: data.status === '주의' ? 'HIGH' : data.status === '관심' ? 'MEDIUM' : 'NORMAL',
                type: 'parent_brief',
                generated_at: Date.now()
            };
        });
    },
    
    // ================================================================
    // 3. 시간 절약 가치 계산
    // ================================================================
    
    /**
     * Calculate efficiency from automation
     * @param {number} studentCount - Number of students
     * @returns {Object} Efficiency metrics
     */
    calculateEfficiency: function(studentCount) {
        const commTimePerParent = 10; // 인당 상담/메시지 10분
        const analysisTimePerStudent = 5; // 인당 분석 5분
        const reportTimePerStudent = 3; // 인당 보고서 3분
        
        const manualTime = studentCount * (commTimePerParent + analysisTimePerStudent + reportTimePerStudent);
        const automatedTime = Math.ceil(studentCount / 20) * 10; // 20명당 10분
        
        return {
            manual_time_minutes: manualTime,
            automated_time_minutes: automatedTime,
            saved_time_minutes: manualTime - automatedTime,
            efficiency_ratio: manualTime / Math.max(automatedTime, 1),
            student_count: studentCount
        };
    },
    
    // ================================================================
    // BATCH PROCESSING
    // ================================================================
    
    /**
     * Process batch of student data
     * @param {Array} rawStudentData - Raw student records
     * @returns {Object} Complete analysis with briefings
     */
    processBatch: function(rawStudentData) {
        // Analyze all students
        const analysis = this.analyzeStudentPerformance(rawStudentData);
        
        // Generate parent briefings
        const briefings = this.generateParentBrief(analysis);
        
        // Calculate efficiency
        const efficiency = this.calculateEfficiency(rawStudentData.length);
        
        // Aggregate physics
        const aggregatePhysics = this.aggregatePhysics(analysis);
        
        return {
            analysis,
            briefings,
            efficiency,
            aggregate_physics: aggregatePhysics,
            processed_at: Date.now(),
            student_count: rawStudentData.length
        };
    },
    
    /**
     * Aggregate physics across all students
     */
    aggregatePhysics: function(analysis) {
        if (analysis.length === 0) return null;
        
        const sum = analysis.reduce((acc, a) => ({
            mass: acc.mass + (a.physics?.mass || 0),
            energy: acc.energy + (a.physics?.kinetic_energy || 0) + (a.physics?.potential_energy || 0),
            stability: acc.stability + (a.physics?.stability || 0)
        }), { mass: 0, energy: 0, stability: 0 });
        
        const count = analysis.length;
        
        return {
            average_mass: sum.mass / count,
            total_energy: sum.energy,
            average_stability: sum.stability / count,
            class_momentum: sum.mass * (analysis.filter(a => a.progress === '상승').length / count)
        };
    }
};

export default StudentCore;




