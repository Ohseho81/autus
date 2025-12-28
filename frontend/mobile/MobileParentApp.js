// ================================================================
// AUTUS MOBILE PARENT APP
// 학부모용 간소화 뷰
// ================================================================

// ================================================================
// MOBILE PARENT APP
// ================================================================

export const MobileParentApp = {
    init() {
        return this;
    },
    
    /**
     * 모바일 앱 HTML 렌더링
     */
    render(data = {}) {
        const student = data.student || { name: '학생', id: 'student_001' };
        const stats = data.stats || this._getDefaultStats();
        const recentActivity = data.recentActivity || [];
        const notifications = data.notifications || [];
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>AUTUS - ${student.name}</title>
    <style>${this._getStyles()}</style>
</head>
<body>
    <div class="mobile-app">
        <!-- STATUS BAR SPACER -->
        <div class="status-bar-spacer"></div>
        
        <!-- HEADER -->
        <header class="app-header">
            <div class="header-left">
                <span class="greeting">안녕하세요 👋</span>
                <h1>${student.name} 학부모님</h1>
            </div>
            <div class="header-right">
                <button class="icon-btn notification-btn" onclick="showNotifications()">
                    🔔
                    ${notifications.length > 0 ? `<span class="badge">${notifications.length}</span>` : ''}
                </button>
            </div>
        </header>
        
        <!-- MAIN STATS CARD -->
        <section class="stats-card">
            <div class="student-avatar">
                <span class="avatar-emoji">👨‍🎓</span>
            </div>
            <div class="student-info">
                <h2>${student.name}</h2>
                <p class="status ${stats.overallStatus}">${this._getStatusText(stats.overallStatus)}</p>
            </div>
            <div class="quick-stats">
                <div class="stat-item">
                    <span class="stat-value">${stats.attendance}%</span>
                    <span class="stat-label">출석률</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.progress}%</span>
                    <span class="stat-label">진도</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.engagement}%</span>
                    <span class="stat-label">참여도</span>
                </div>
            </div>
        </section>
        
        <!-- PROGRESS RING -->
        <section class="progress-section">
            <h3>📊 이번 주 학습 현황</h3>
            <div class="progress-ring-container">
                <svg class="progress-ring" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#333" stroke-width="12"/>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#4ade80" stroke-width="12"
                            stroke-dasharray="${stats.weeklyProgress * 3.14} 314"
                            stroke-linecap="round" transform="rotate(-90 60 60)"/>
                    <text x="60" y="55" text-anchor="middle" fill="#fff" font-size="24" font-weight="bold">${stats.weeklyProgress}%</text>
                    <text x="60" y="75" text-anchor="middle" fill="#888" font-size="10">주간 목표</text>
                </svg>
            </div>
        </section>
        
        <!-- QUICK ACTIONS -->
        <section class="quick-actions">
            <h3>⚡ 빠른 메뉴</h3>
            <div class="actions-grid">
                <button class="action-btn" onclick="viewReport()">
                    <span class="action-icon">📋</span>
                    <span class="action-label">리포트</span>
                </button>
                <button class="action-btn" onclick="viewSchedule()">
                    <span class="action-icon">📅</span>
                    <span class="action-label">일정</span>
                </button>
                <button class="action-btn" onclick="contactTeacher()">
                    <span class="action-icon">💬</span>
                    <span class="action-label">상담</span>
                </button>
                <button class="action-btn" onclick="makePayment()">
                    <span class="action-icon">💳</span>
                    <span class="action-label">결제</span>
                </button>
            </div>
        </section>
        
        <!-- RECENT ACTIVITY -->
        <section class="activity-section">
            <h3>📝 최근 활동</h3>
            <div class="activity-list">
                ${this._renderActivity(recentActivity)}
            </div>
        </section>
        
        <!-- WEEKLY CHART -->
        <section class="chart-section">
            <h3>📈 주간 트렌드</h3>
            <div class="mini-chart">
                ${this._renderMiniChart(stats.weeklyTrend)}
            </div>
        </section>
        
        <!-- BOTTOM NAV -->
        <nav class="bottom-nav">
            <button class="nav-item active">
                <span class="nav-icon">🏠</span>
                <span class="nav-label">홈</span>
            </button>
            <button class="nav-item" onclick="showProgress()">
                <span class="nav-icon">📊</span>
                <span class="nav-label">성적</span>
            </button>
            <button class="nav-item" onclick="showSchedule()">
                <span class="nav-icon">📅</span>
                <span class="nav-label">일정</span>
            </button>
            <button class="nav-item" onclick="showSettings()">
                <span class="nav-icon">⚙️</span>
                <span class="nav-label">설정</span>
            </button>
        </nav>
    </div>
    
    <script>${this._getScripts()}</script>
</body>
</html>`;
    },
    
    _getDefaultStats() {
        return {
            attendance: 92,
            progress: 78,
            engagement: 85,
            weeklyProgress: 72,
            overallStatus: 'good',
            weeklyTrend: [65, 70, 68, 75, 72, 78, 82]
        };
    },
    
    _getStatusText(status) {
        switch (status) {
            case 'excellent': return '🌟 최우수';
            case 'good': return '✅ 양호';
            case 'warning': return '⚠️ 주의 필요';
            case 'critical': return '🚨 긴급';
            default: return '✅ 양호';
        }
    },
    
    _renderActivity(activities) {
        if (activities.length === 0) {
            activities = [
                { type: 'attendance', message: '수업 출석', time: '오늘 14:00', icon: '✅' },
                { type: 'homework', message: '과제 제출 완료', time: '어제', icon: '📝' },
                { type: 'achievement', message: '주간 목표 달성!', time: '2일 전', icon: '🏆' }
            ];
        }
        
        return activities.map(a => `
            <div class="activity-item">
                <span class="activity-icon">${a.icon}</span>
                <div class="activity-content">
                    <span class="activity-message">${a.message}</span>
                    <span class="activity-time">${a.time}</span>
                </div>
            </div>
        `).join('');
    },
    
    _renderMiniChart(trend) {
        if (!trend || trend.length === 0) {
            trend = [65, 70, 68, 75, 72, 78, 82];
        }
        
        const max = Math.max(...trend);
        const min = Math.min(...trend);
        const range = max - min || 1;
        
        return `
        <svg viewBox="0 0 280 80" class="trend-svg">
            <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#4ade80;stop-opacity:0.3"/>
                    <stop offset="100%" style="stop-color:#4ade80;stop-opacity:0"/>
                </linearGradient>
            </defs>
            
            <!-- 배경 영역 -->
            <path d="M ${trend.map((v, i) => {
                const x = (i / (trend.length - 1)) * 260 + 10;
                const y = 70 - ((v - min) / range) * 50;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')} L 270 70 L 10 70 Z" fill="url(#chartGradient)"/>
            
            <!-- 선 -->
            <path d="M ${trend.map((v, i) => {
                const x = (i / (trend.length - 1)) * 260 + 10;
                const y = 70 - ((v - min) / range) * 50;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round"/>
            
            <!-- 포인트 -->
            ${trend.map((v, i) => {
                const x = (i / (trend.length - 1)) * 260 + 10;
                const y = 70 - ((v - min) / range) * 50;
                return `<circle cx="${x}" cy="${y}" r="4" fill="#4ade80"/>`;
            }).join('')}
            
            <!-- X축 레이블 -->
            <text x="10" y="78" fill="#666" font-size="8">월</text>
            <text x="140" y="78" fill="#666" font-size="8">목</text>
            <text x="260" y="78" fill="#666" font-size="8">일</text>
        </svg>`;
    },
    
    _getStyles() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f1a;
            color: #fff;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .mobile-app {
            max-width: 430px;
            margin: 0 auto;
            min-height: 100vh;
            padding-bottom: 80px;
        }
        
        .status-bar-spacer {
            height: env(safe-area-inset-top, 44px);
            background: #0f0f1a;
        }
        
        .app-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
        }
        
        .greeting { color: #888; font-size: 14px; }
        .app-header h1 { font-size: 20px; margin-top: 4px; }
        
        .icon-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            border: none;
            font-size: 20px;
            position: relative;
            cursor: pointer;
        }
        
        .notification-btn .badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background: #ef4444;
            color: #fff;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
        }
        
        section {
            margin: 15px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 20px;
        }
        
        section h3 {
            font-size: 14px;
            color: #888;
            margin-bottom: 15px;
        }
        
        .stats-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            text-align: center;
        }
        
        .student-avatar {
            width: 80px;
            height: 80px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
        }
        
        .avatar-emoji { font-size: 40px; }
        
        .student-info h2 { font-size: 24px; margin-bottom: 5px; }
        .student-info .status { font-size: 14px; }
        .status.good { color: #4ade80; }
        .status.warning { color: #fbbf24; }
        .status.critical { color: #ef4444; }
        
        .quick-stats {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
        }
        
        .stat-item { text-align: center; }
        .stat-value { display: block; font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 11px; opacity: 0.8; }
        
        .progress-section { text-align: center; }
        
        .progress-ring-container {
            display: flex;
            justify-content: center;
        }
        
        .progress-ring { width: 150px; height: 150px; }
        
        .quick-actions .actions-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }
        
        .action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 15px 10px;
            background: rgba(255,255,255,0.05);
            border: none;
            border-radius: 16px;
            color: #fff;
            cursor: pointer;
        }
        
        .action-btn:active {
            transform: scale(0.95);
            background: rgba(255,255,255,0.1);
        }
        
        .action-icon { font-size: 28px; }
        .action-label { font-size: 11px; }
        
        .activity-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 12px;
        }
        
        .activity-icon { font-size: 24px; }
        
        .activity-content {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .activity-message { font-size: 14px; }
        .activity-time { font-size: 11px; color: #888; }
        
        .mini-chart {
            background: rgba(0,0,0,0.2);
            border-radius: 12px;
            padding: 15px;
        }
        
        .trend-svg { width: 100%; height: 80px; }
        
        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            max-width: 430px;
            display: flex;
            justify-content: space-around;
            padding: 10px 20px calc(10px + env(safe-area-inset-bottom, 0px));
            background: rgba(15, 15, 26, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 8px 16px;
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
        }
        
        .nav-item.active {
            color: #667eea;
        }
        
        .nav-icon { font-size: 24px; }
        .nav-label { font-size: 10px; }
        
        @media (max-width: 380px) {
            .quick-stats { flex-wrap: wrap; gap: 15px; }
            .stat-item { flex: 1 0 30%; }
        }
        `;
    },
    
    _getScripts() {
        return `
        function showNotifications() { alert('알림 목록'); }
        function viewReport() { alert('리포트 보기'); }
        function viewSchedule() { alert('일정 보기'); }
        function contactTeacher() { alert('선생님 상담 예약'); }
        function makePayment() { alert('결제 페이지'); }
        function showProgress() { alert('성적 상세'); }
        function showSchedule() { alert('일정 상세'); }
        function showSettings() { alert('설정'); }
        
        // Pull to refresh simulation
        let startY = 0;
        document.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; });
        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && e.touches[0].clientY > startY + 100) {
                console.log('Pull to refresh triggered');
            }
        });
        
        console.log('📱 Mobile Parent App Loaded');
        `;
    }
};

export function testMobileParentApp() {
    console.log('Testing Mobile Parent App...');
    
    const app = Object.create(MobileParentApp).init();
    const html = app.render({
        student: { name: '김학생', id: 'student_001' }
    });
    
    console.log('✅ Mobile Parent App HTML generated:', html.length, 'characters');
    
    return { app, html };
}

export default MobileParentApp;
