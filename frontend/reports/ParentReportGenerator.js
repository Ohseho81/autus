// ================================================================
// AUTUS PARENT REPORT GENERATOR
// Physics 데이터 → 주간/월간 성과 리포트 자동 생성
// ================================================================

// ================================================================
// REPORT GENERATOR
// ================================================================

export const ParentReportGenerator = {
    templates: {},
    
    init() {
        this.templates = this._getTemplates();
        return this;
    },
    
    /**
     * 주간 리포트 생성
     */
    generateWeeklyReport(studentData) {
        const report = {
            type: 'WEEKLY',
            generatedAt: new Date(),
            period: this._getWeekPeriod(),
            student: studentData.name || studentData.id,
            summary: this._generateWeeklySummary(studentData),
            metrics: this._calculateMetrics(studentData, 'weekly'),
            highlights: this._extractHighlights(studentData),
            recommendations: this._generateRecommendations(studentData),
            nextWeekGoals: this._suggestNextWeekGoals(studentData)
        };
        
        return report;
    },
    
    /**
     * 월간 리포트 생성
     */
    generateMonthlyReport(studentData) {
        const report = {
            type: 'MONTHLY',
            generatedAt: new Date(),
            period: this._getMonthPeriod(),
            student: studentData.name || studentData.id,
            summary: this._generateMonthlySummary(studentData),
            metrics: this._calculateMetrics(studentData, 'monthly'),
            progressChart: this._generateProgressChart(studentData),
            achievements: this._extractAchievements(studentData),
            growthAnalysis: this._analyzeGrowth(studentData),
            parentFeedback: this._generateParentFeedback(studentData),
            recommendations: this._generateRecommendations(studentData)
        };
        
        return report;
    },
    
    /**
     * HTML 리포트 렌더링
     */
    renderHTML(report) {
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTUS ${report.type === 'WEEKLY' ? '주간' : '월간'} 리포트 - ${report.student}</title>
    <style>${this._getReportStyles()}</style>
</head>
<body>
    <div class="report">
        <!-- HEADER -->
        <header class="report-header">
            <div class="logo">
                <span class="logo-icon">📊</span>
                <span class="logo-text">AUTUS</span>
            </div>
            <div class="report-info">
                <h1>${report.type === 'WEEKLY' ? '주간' : '월간'} 학습 리포트</h1>
                <p class="period">${report.period.start} ~ ${report.period.end}</p>
            </div>
        </header>
        
        <!-- STUDENT INFO -->
        <section class="student-section">
            <div class="student-card">
                <div class="avatar">👤</div>
                <div class="student-info">
                    <h2>${report.student}</h2>
                    <p>리포트 생성: ${report.generatedAt.toLocaleDateString('ko-KR')}</p>
                </div>
            </div>
        </section>
        
        <!-- SUMMARY -->
        <section class="summary-section">
            <h2>📝 요약</h2>
            <div class="summary-content">
                <p>${report.summary}</p>
            </div>
        </section>
        
        <!-- METRICS -->
        <section class="metrics-section">
            <h2>📈 핵심 지표</h2>
            <div class="metrics-grid">
                ${this._renderMetrics(report.metrics)}
            </div>
        </section>
        
        ${report.type === 'WEEKLY' ? `
        <!-- HIGHLIGHTS (Weekly) -->
        <section class="highlights-section">
            <h2>⭐ 이번 주 하이라이트</h2>
            <div class="highlights-list">
                ${this._renderHighlights(report.highlights)}
            </div>
        </section>
        
        <!-- NEXT WEEK GOALS -->
        <section class="goals-section">
            <h2>🎯 다음 주 목표</h2>
            <div class="goals-list">
                ${this._renderGoals(report.nextWeekGoals)}
            </div>
        </section>
        ` : `
        <!-- PROGRESS CHART (Monthly) -->
        <section class="progress-section">
            <h2>📊 월간 성장 그래프</h2>
            <div class="chart-container">
                ${this._renderProgressChart(report.progressChart)}
            </div>
        </section>
        
        <!-- ACHIEVEMENTS -->
        <section class="achievements-section">
            <h2>🏆 이달의 성취</h2>
            <div class="achievements-grid">
                ${this._renderAchievements(report.achievements)}
            </div>
        </section>
        
        <!-- GROWTH ANALYSIS -->
        <section class="growth-section">
            <h2>📈 성장 분석</h2>
            <div class="growth-content">
                ${this._renderGrowthAnalysis(report.growthAnalysis)}
            </div>
        </section>
        `}
        
        <!-- RECOMMENDATIONS -->
        <section class="recommendations-section">
            <h2>💡 권장 사항</h2>
            <div class="recommendations-list">
                ${this._renderRecommendations(report.recommendations)}
            </div>
        </section>
        
        ${report.parentFeedback ? `
        <!-- PARENT FEEDBACK -->
        <section class="feedback-section">
            <h2>💬 학부모님께</h2>
            <div class="feedback-content">
                <p>${report.parentFeedback}</p>
            </div>
        </section>
        ` : ''}
        
        <!-- FOOTER -->
        <footer class="report-footer">
            <p>이 리포트는 AUTUS 시스템에 의해 자동 생성되었습니다.</p>
            <p>문의: support@autus.io</p>
        </footer>
    </div>
</body>
</html>`;
    },
    
    /**
     * PDF용 데이터 생성 (Print-ready HTML)
     */
    generatePDFReady(report) {
        const html = this.renderHTML(report);
        return {
            html,
            filename: `AUTUS_${report.type}_${report.student}_${this._formatDate(report.generatedAt)}.pdf`,
            metadata: {
                title: `AUTUS ${report.type} Report - ${report.student}`,
                author: 'AUTUS System',
                subject: 'Student Learning Report',
                keywords: 'education, report, autus'
            }
        };
    },
    
    // ================================================================
    // CALCULATION METHODS
    // ================================================================
    
    _getWeekPeriod() {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        
        return {
            start: start.toLocaleDateString('ko-KR'),
            end: now.toLocaleDateString('ko-KR')
        };
    },
    
    _getMonthPeriod() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return {
            start: start.toLocaleDateString('ko-KR'),
            end: end.toLocaleDateString('ko-KR')
        };
    },
    
    _generateWeeklySummary(data) {
        const attendance = data.attendance || 90;
        const progress = data.progress || 75;
        const engagement = data.engagement || 80;
        
        let summary = `${data.name || '학생'}님은 이번 주 `;
        
        if (attendance >= 90) {
            summary += '출석률이 매우 우수했으며, ';
        } else if (attendance >= 70) {
            summary += '꾸준히 출석하였으며, ';
        } else {
            summary += '출석률이 다소 낮았으나, ';
        }
        
        if (progress >= 80) {
            summary += '학습 진도에서 뛰어난 발전을 보였습니다.';
        } else if (progress >= 60) {
            summary += '학습 진도가 순조롭게 진행되고 있습니다.';
        } else {
            summary += '학습 진도에 조금 더 집중이 필요합니다.';
        }
        
        return summary;
    },
    
    _generateMonthlySummary(data) {
        const growth = data.growth || 15;
        const consistency = data.consistency || 75;
        
        let summary = `이번 달 ${data.name || '학생'}님은 `;
        
        if (growth >= 20) {
            summary += `전월 대비 ${growth}%의 놀라운 성장을 이루었습니다. `;
        } else if (growth >= 10) {
            summary += `전월 대비 ${growth}%의 안정적인 성장을 보여주었습니다. `;
        } else {
            summary += `전월과 비슷한 수준을 유지하고 있습니다. `;
        }
        
        if (consistency >= 80) {
            summary += '특히 학습의 일관성이 뛰어났습니다.';
        } else {
            summary += '앞으로 더욱 꾸준한 학습을 권장드립니다.';
        }
        
        return summary;
    },
    
    _calculateMetrics(data, period) {
        const base = {
            attendance: { value: data.attendance || 85, unit: '%', label: '출석률', trend: 'up' },
            progress: { value: data.progress || 72, unit: '%', label: '학습 진도', trend: 'up' },
            engagement: { value: data.engagement || 78, unit: '%', label: '참여도', trend: 'stable' },
            homework: { value: data.homeworkCompletion || 88, unit: '%', label: '과제 완료율', trend: 'up' }
        };
        
        if (period === 'monthly') {
            base.growth = { value: data.growth || 15, unit: '%', label: '성장률', trend: 'up' };
            base.consistency = { value: data.consistency || 75, unit: '%', label: '일관성', trend: 'stable' };
        }
        
        return base;
    },
    
    _extractHighlights(data) {
        const highlights = [];
        
        if ((data.attendance || 85) >= 90) {
            highlights.push({ icon: '🎯', text: '출석률 90% 이상 달성!' });
        }
        
        if ((data.testScore || 0) >= 90) {
            highlights.push({ icon: '🏆', text: `테스트 점수 ${data.testScore}점 달성!` });
        }
        
        if ((data.progress || 72) >= 80) {
            highlights.push({ icon: '📈', text: '학습 진도 목표 초과 달성!' });
        }
        
        if (data.specialAchievement) {
            highlights.push({ icon: '⭐', text: data.specialAchievement });
        }
        
        if (highlights.length === 0) {
            highlights.push({ icon: '💪', text: '꾸준히 노력하고 있습니다!' });
        }
        
        return highlights;
    },
    
    _extractAchievements(data) {
        return [
            { icon: '📚', title: '학습량', description: `총 ${data.studyHours || 40}시간 학습` },
            { icon: '✅', title: '완료 과제', description: `${data.completedTasks || 12}개 과제 완료` },
            { icon: '📈', title: '성장', description: `전월 대비 ${data.growth || 15}% 성장` }
        ];
    },
    
    _analyzeGrowth(data) {
        return {
            overallTrend: data.growth >= 10 ? 'positive' : 'stable',
            strongAreas: data.strongAreas || ['수학', '논리력'],
            improvementAreas: data.improvementAreas || ['영어 단어'],
            recommendation: '현재 페이스를 유지하면서 약점 영역에 조금 더 시간을 투자하세요.'
        };
    },
    
    _suggestNextWeekGoals(data) {
        const goals = [];
        
        if ((data.attendance || 85) < 90) {
            goals.push({ priority: 'high', text: '출석률 90% 달성하기' });
        }
        
        if ((data.homeworkCompletion || 88) < 100) {
            goals.push({ priority: 'medium', text: '모든 과제 제출하기' });
        }
        
        goals.push({ priority: 'low', text: '복습 시간 늘리기' });
        
        return goals;
    },
    
    _generateRecommendations(data) {
        const recommendations = [];
        
        if ((data.engagement || 78) < 70) {
            recommendations.push({
                category: '참여도',
                text: '수업 중 질문을 더 많이 하도록 격려해주세요.',
                priority: 'high'
            });
        }
        
        if ((data.consistency || 75) < 80) {
            recommendations.push({
                category: '일관성',
                text: '매일 일정한 시간에 학습하는 습관을 만들어주세요.',
                priority: 'medium'
            });
        }
        
        recommendations.push({
            category: '격려',
            text: '잘하고 있다고 칭찬해주세요!',
            priority: 'low'
        });
        
        return recommendations;
    },
    
    _generateParentFeedback(data) {
        const name = data.name || '자녀분';
        const attendance = data.attendance || 85;
        const progress = data.progress || 72;
        
        if (attendance >= 90 && progress >= 80) {
            return `${name}이(가) 이번 달 정말 잘하고 있습니다! 학부모님의 꾸준한 관심과 격려가 큰 힘이 되고 있습니다. 지금처럼만 해주세요. 감사합니다.`;
        } else if (attendance >= 70 && progress >= 60) {
            return `${name}이(가) 꾸준히 노력하고 있습니다. 조금만 더 힘내면 더 좋은 결과가 있을 것입니다. 가정에서의 격려 부탁드립니다.`;
        } else {
            return `${name}에게 조금 더 관심이 필요한 시기입니다. 함께 학습 계획을 점검하고, 동기 부여를 위한 대화를 나눠보시는 것을 권장드립니다.`;
        }
    },
    
    _generateProgressChart(data) {
        // 4주간 데이터 생성
        const weeks = [];
        for (let i = 3; i >= 0; i--) {
            weeks.push({
                week: `${i + 1}주차`,
                attendance: Math.min(100, Math.max(50, (data.attendance || 80) + (Math.random() - 0.5) * 20)),
                progress: Math.min(100, Math.max(40, (data.progress || 70) + (Math.random() - 0.5) * 15)),
                engagement: Math.min(100, Math.max(50, (data.engagement || 75) + (Math.random() - 0.5) * 15))
            });
        }
        return weeks;
    },
    
    // ================================================================
    // RENDER HELPERS
    // ================================================================
    
    _renderMetrics(metrics) {
        return Object.entries(metrics).map(([key, m]) => `
            <div class="metric-card">
                <div class="metric-value">${m.value}<span class="unit">${m.unit}</span></div>
                <div class="metric-label">${m.label}</div>
                <div class="metric-trend trend-${m.trend}">
                    ${m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                </div>
            </div>
        `).join('');
    },
    
    _renderHighlights(highlights) {
        return highlights.map(h => `
            <div class="highlight-item">
                <span class="highlight-icon">${h.icon}</span>
                <span class="highlight-text">${h.text}</span>
            </div>
        `).join('');
    },
    
    _renderGoals(goals) {
        return goals.map(g => `
            <div class="goal-item priority-${g.priority}">
                <span class="goal-checkbox">☐</span>
                <span class="goal-text">${g.text}</span>
            </div>
        `).join('');
    },
    
    _renderProgressChart(chartData) {
        const maxHeight = 100;
        return `
        <div class="chart-wrapper">
            <div class="chart-bars">
                ${chartData.map(d => `
                    <div class="chart-column">
                        <div class="bar attendance" style="height: ${d.attendance}px" title="출석률: ${d.attendance.toFixed(0)}%"></div>
                        <div class="bar progress" style="height: ${d.progress}px" title="진도: ${d.progress.toFixed(0)}%"></div>
                        <div class="bar engagement" style="height: ${d.engagement}px" title="참여도: ${d.engagement.toFixed(0)}%"></div>
                        <div class="chart-label">${d.week}</div>
                    </div>
                `).join('')}
            </div>
            <div class="chart-legend">
                <span class="legend-item"><span class="dot attendance"></span> 출석률</span>
                <span class="legend-item"><span class="dot progress"></span> 진도</span>
                <span class="legend-item"><span class="dot engagement"></span> 참여도</span>
            </div>
        </div>`;
    },
    
    _renderAchievements(achievements) {
        return achievements.map(a => `
            <div class="achievement-card">
                <div class="achievement-icon">${a.icon}</div>
                <div class="achievement-title">${a.title}</div>
                <div class="achievement-desc">${a.description}</div>
            </div>
        `).join('');
    },
    
    _renderGrowthAnalysis(analysis) {
        return `
        <div class="growth-overview">
            <div class="trend trend-${analysis.overallTrend}">
                전체 추세: ${analysis.overallTrend === 'positive' ? '📈 상승' : '➡️ 유지'}
            </div>
        </div>
        <div class="growth-details">
            <div class="strong-areas">
                <h4>💪 강점 영역</h4>
                <ul>${analysis.strongAreas.map(a => `<li>${a}</li>`).join('')}</ul>
            </div>
            <div class="improvement-areas">
                <h4>📚 개선 영역</h4>
                <ul>${analysis.improvementAreas.map(a => `<li>${a}</li>`).join('')}</ul>
            </div>
        </div>
        <div class="growth-recommendation">
            <p>💡 ${analysis.recommendation}</p>
        </div>`;
    },
    
    _renderRecommendations(recommendations) {
        return recommendations.map(r => `
            <div class="recommendation-item priority-${r.priority}">
                <span class="recommendation-category">[${r.category}]</span>
                <span class="recommendation-text">${r.text}</span>
            </div>
        `).join('');
    },
    
    _formatDate(date) {
        return date.toISOString().split('T')[0].replace(/-/g, '');
    },
    
    _getTemplates() {
        return {
            weekly: 'WEEKLY_TEMPLATE',
            monthly: 'MONTHLY_TEMPLATE'
        };
    },
    
    _getReportStyles() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .report {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .logo-icon { font-size: 40px; }
        .logo-text { font-size: 24px; font-weight: bold; }
        
        .report-info h1 { font-size: 24px; }
        .report-info .period { opacity: 0.8; }
        
        section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        
        section h2 {
            font-size: 18px;
            color: #667eea;
            margin-bottom: 20px;
        }
        
        .student-card {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 12px;
        }
        
        .avatar {
            width: 60px;
            height: 60px;
            background: #667eea;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
        }
        
        .student-info h2 { color: #333; }
        .student-info p { color: #888; font-size: 14px; }
        
        .summary-content {
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            font-size: 16px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .metric-card {
            padding: 20px;
            background: #f9f9f9;
            border-radius: 12px;
            text-align: center;
            position: relative;
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
        }
        
        .metric-value .unit { font-size: 16px; }
        .metric-label { color: #888; font-size: 14px; }
        
        .metric-trend {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 20px;
        }
        
        .trend-up { color: #4ade80; }
        .trend-down { color: #ef4444; }
        .trend-stable { color: #fbbf24; }
        
        .highlight-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background: linear-gradient(135deg, #ffd70020 0%, #ffd70010 100%);
            border-left: 4px solid #ffd700;
            margin-bottom: 10px;
            border-radius: 0 8px 8px 0;
        }
        
        .highlight-icon { font-size: 24px; }
        
        .goal-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 8px;
            background: #f9f9f9;
        }
        
        .goal-item.priority-high { border-left: 4px solid #ef4444; }
        .goal-item.priority-medium { border-left: 4px solid #fbbf24; }
        .goal-item.priority-low { border-left: 4px solid #4ade80; }
        
        .goal-checkbox { font-size: 18px; }
        
        .chart-wrapper {
            padding: 20px;
            background: #f9f9f9;
            border-radius: 12px;
        }
        
        .chart-bars {
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            height: 150px;
            padding-bottom: 30px;
        }
        
        .chart-column {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        }
        
        .bar {
            width: 20px;
            border-radius: 4px 4px 0 0;
            transition: height 0.3s;
        }
        
        .bar.attendance { background: #667eea; }
        .bar.progress { background: #4ade80; }
        .bar.engagement { background: #fbbf24; }
        
        .chart-label { font-size: 12px; color: #888; }
        
        .chart-legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 12px;
        }
        
        .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .dot.attendance { background: #667eea; }
        .dot.progress { background: #4ade80; }
        .dot.engagement { background: #fbbf24; }
        
        .achievements-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        
        .achievement-card {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #ffd70015 0%, #ffd70005 100%);
            border: 1px solid #ffd70050;
            border-radius: 12px;
        }
        
        .achievement-icon { font-size: 40px; margin-bottom: 10px; }
        .achievement-title { font-weight: bold; }
        .achievement-desc { color: #888; font-size: 14px; }
        
        .growth-overview {
            margin-bottom: 20px;
        }
        
        .trend {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
        }
        
        .trend-positive { background: #4ade8020; color: #16a34a; }
        .trend-stable { background: #fbbf2420; color: #d97706; }
        
        .growth-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .growth-details h4 { margin-bottom: 10px; }
        .growth-details ul { padding-left: 20px; }
        
        .growth-recommendation {
            padding: 15px;
            background: #667eea10;
            border-radius: 8px;
        }
        
        .recommendation-item {
            padding: 12px;
            margin-bottom: 8px;
            background: #f9f9f9;
            border-radius: 8px;
            display: flex;
            gap: 10px;
        }
        
        .recommendation-item.priority-high { border-left: 4px solid #ef4444; }
        .recommendation-item.priority-medium { border-left: 4px solid #fbbf24; }
        .recommendation-item.priority-low { border-left: 4px solid #4ade80; }
        
        .recommendation-category {
            font-weight: bold;
            color: #667eea;
        }
        
        .feedback-content {
            padding: 20px;
            background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
            border-radius: 12px;
            font-size: 16px;
            line-height: 1.8;
        }
        
        .report-footer {
            padding: 20px;
            text-align: center;
            background: #f5f5f5;
            color: #888;
            font-size: 12px;
        }
        
        @media print {
            body { background: white; }
            .report { box-shadow: none; }
        }
        `;
    }
};

// ================================================================
// TEST
// ================================================================

export function testParentReportGenerator() {
    console.log('Testing Parent Report Generator...');
    
    const generator = Object.create(ParentReportGenerator).init();
    
    const testStudent = {
        id: 'student_001',
        name: '김학생',
        attendance: 92,
        progress: 78,
        engagement: 85,
        homeworkCompletion: 95,
        growth: 18,
        consistency: 82,
        testScore: 88,
        studyHours: 45,
        completedTasks: 15,
        strongAreas: ['수학', '과학'],
        improvementAreas: ['영어 작문']
    };
    
    const weeklyReport = generator.generateWeeklyReport(testStudent);
    const monthlyReport = generator.generateMonthlyReport(testStudent);
    
    const weeklyHTML = generator.renderHTML(weeklyReport);
    const monthlyHTML = generator.renderHTML(monthlyReport);
    
    console.log('✅ Weekly Report generated:', weeklyHTML.length, 'characters');
    console.log('✅ Monthly Report generated:', monthlyHTML.length, 'characters');
    
    return { generator, weeklyReport, monthlyReport, weeklyHTML, monthlyHTML };
}

export default ParentReportGenerator;
