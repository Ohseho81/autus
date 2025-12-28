// ================================================================
// AUTUS MULTI-ORBIT CONTROL CENTER
// 3궤도(안전/영입/수익) 실시간 스캔 & 골든 타겟 추적
// ================================================================

import { MultiOrbitStrategyEngine } from '../engines/MultiOrbitStrategy.js';

// ================================================================
// CONTROL CENTER
// ================================================================

export const MultiOrbitControlCenter = {
    engine: null,
    lastScanResult: null,
    
    init() {
        this.engine = Object.create(MultiOrbitStrategyEngine).init();
        return this;
    },
    
    /**
     * 전체 대시보드 HTML
     */
    render(nodes = [], leads = []) {
        // 스캔 실행
        if (nodes.length > 0) {
            this.lastScanResult = this.engine.executeMultiOrbitScan(nodes, leads);
        }
        
        const summary = this.engine.getExecutiveSummary();
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTUS Multi-Orbit Control Center</title>
    <style>${this._getStyles()}</style>
</head>
<body>
    <div class="control-center">
        <!-- HEADER -->
        <header class="header">
            <div class="logo">
                <span class="icon">🎯</span>
                <h1>MULTI-ORBIT CONTROL CENTER</h1>
            </div>
            <div class="status-indicators">
                ${this._renderStatusIndicators(summary)}
            </div>
        </header>
        
        <!-- ORBIT DASHBOARD -->
        <main class="main">
            <!-- 3 ORBIT CARDS -->
            <section class="orbit-cards">
                ${this._renderOrbitCard('SAFETY', '🛡️', summary.safety, '#4ade80')}
                ${this._renderOrbitCard('ACQUISITION', '🎯', summary.acquisition, '#fbbf24')}
                ${this._renderOrbitCard('REVENUE', '💰', summary.revenue, '#a855f7')}
            </section>
            
            <!-- GOLDEN TARGETS -->
            <section class="golden-targets">
                <h2>🌟 Golden Targets</h2>
                <div class="targets-grid">
                    ${this._renderGoldenTargets(summary.goldenTargets)}
                </div>
            </section>
            
            <!-- REAL-TIME ALERTS -->
            <section class="alerts-panel">
                <h2>⚠️ 실시간 경보</h2>
                <div class="alerts-list">
                    ${this._renderAlerts(summary)}
                </div>
            </section>
            
            <!-- FUTURE SIMULATION -->
            <section class="simulation-panel">
                <h2>🔮 미래 시뮬레이션</h2>
                <div class="simulation-content">
                    ${this._renderSimulation(summary.futureSimulation)}
                </div>
            </section>
            
            <!-- QUICK ACTIONS -->
            <section class="actions-panel">
                <h2>⚡ 빠른 액션</h2>
                <div class="actions-grid">
                    ${this._renderQuickActions()}
                </div>
            </section>
        </main>
        
        <footer class="footer">
            <p>AUTUS Multi-Orbit Control Center v2.0 | Last scan: ${new Date().toLocaleString('ko-KR')}</p>
        </footer>
    </div>
    <script>${this._getScripts()}</script>
</body>
</html>`;
    },
    
    _renderStatusIndicators(summary) {
        return `
        <div class="indicator ${summary.safety?.riskCount > 0 ? 'warning' : 'ok'}">
            <span class="dot"></span>
            <span>Safety: ${summary.safety?.riskCount || 0} 위험</span>
        </div>
        <div class="indicator ${summary.acquisition?.hotLeads > 0 ? 'active' : 'idle'}">
            <span class="dot"></span>
            <span>Acquisition: ${summary.acquisition?.hotLeads || 0} 핫리드</span>
        </div>
        <div class="indicator active">
            <span class="dot"></span>
            <span>Revenue: ₩${((summary.revenue?.projectedRevenue || 0) / 10000).toFixed(0)}만</span>
        </div>`;
    },
    
    _renderOrbitCard(name, icon, data, color) {
        const stats = data || {};
        
        return `
        <div class="orbit-card" style="--orbit-color: ${color}">
            <div class="card-header">
                <span class="card-icon">${icon}</span>
                <h3>${name} ORBIT</h3>
            </div>
            <div class="card-body">
                ${name === 'SAFETY' ? `
                    <div class="stat-row">
                        <span>위험 노드</span>
                        <span class="value danger">${stats.riskCount || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span>평균 연속성 점수</span>
                        <span class="value">${(stats.avgContinuityScore || 0).toFixed(1)}%</span>
                    </div>
                    <div class="stat-row">
                        <span>긴급 조치 필요</span>
                        <span class="value warning">${stats.urgentActions || 0}</span>
                    </div>
                ` : name === 'ACQUISITION' ? `
                    <div class="stat-row">
                        <span>핫 리드</span>
                        <span class="value success">${stats.hotLeads || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span>활성 레퍼럴 체인</span>
                        <span class="value">${stats.activeReferralChains || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span>예상 전환율</span>
                        <span class="value">${(stats.conversionRate || 0).toFixed(1)}%</span>
                    </div>
                ` : `
                    <div class="stat-row">
                        <span>예상 매출</span>
                        <span class="value">₩${((stats.projectedRevenue || 0) / 10000).toFixed(0)}만</span>
                    </div>
                    <div class="stat-row">
                        <span>퀀텀 점프 후보</span>
                        <span class="value highlight">${stats.quantumLeapCandidates || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span>마이크로 클리닉 기회</span>
                        <span class="value">${stats.microClinicOpportunities || 0}</span>
                    </div>
                `}
            </div>
            <div class="card-footer">
                <button onclick="drillDown('${name}')" class="drill-btn">상세 보기 →</button>
            </div>
        </div>`;
    },
    
    _renderGoldenTargets(targets) {
        if (!targets || targets.length === 0) {
            return '<p class="empty">현재 골든 타겟 없음</p>';
        }
        
        return targets.slice(0, 6).map(target => `
            <div class="target-card">
                <div class="target-header">
                    <span class="target-icon">🎯</span>
                    <span class="target-id">${target.nodeId || target.id}</span>
                </div>
                <div class="target-body">
                    <div class="target-score">
                        <span class="score-value">${(target.goldenScore || target.score || 0).toFixed(0)}</span>
                        <span class="score-label">Golden Score</span>
                    </div>
                    <div class="target-reason">${target.reason || '고잠재력'}</div>
                </div>
                <div class="target-action">
                    <span class="action-text">${target.action || '즉시 접촉'}</span>
                </div>
                <button onclick="engageTarget('${target.nodeId || target.id}')" class="engage-btn">
                    🚀 Engage
                </button>
            </div>
        `).join('');
    },
    
    _renderAlerts(summary) {
        const alerts = [];
        
        // Safety alerts
        if (summary.safety?.riskCount > 0) {
            alerts.push({
                type: 'danger',
                icon: '🚨',
                message: `${summary.safety.riskCount}명 이탈 위험 감지!`,
                action: '즉시 조치 필요'
            });
        }
        
        // Acquisition alerts
        if (summary.acquisition?.hotLeads > 0) {
            alerts.push({
                type: 'success',
                icon: '🔥',
                message: `${summary.acquisition.hotLeads}명 핫 리드 발견!`,
                action: '48시간 내 접촉 권장'
            });
        }
        
        // Revenue alerts
        if (summary.revenue?.quantumLeapCandidates > 0) {
            alerts.push({
                type: 'highlight',
                icon: '⚡',
                message: `${summary.revenue.quantumLeapCandidates}명 퀀텀 점프 가능!`,
                action: '업그레이드 제안'
            });
        }
        
        if (alerts.length === 0) {
            return '<p class="empty">현재 알림 없음 ✅</p>';
        }
        
        return alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <span class="alert-icon">${alert.icon}</span>
                <div class="alert-content">
                    <p class="alert-message">${alert.message}</p>
                    <p class="alert-action">${alert.action}</p>
                </div>
                <button class="alert-btn">처리</button>
            </div>
        `).join('');
    },
    
    _renderSimulation(simulation) {
        if (!simulation) {
            return `
            <div class="simulation-empty">
                <span class="icon">🔮</span>
                <p>시뮬레이션 데이터 로딩 중...</p>
                <button onclick="runSimulation()" class="primary">시뮬레이션 실행</button>
            </div>`;
        }
        
        return `
        <div class="simulation-results">
            <div class="sim-metric">
                <span class="label">30일 후 예상 활성 노드</span>
                <span class="value">${simulation.predictedActiveNodes || 0}명</span>
            </div>
            <div class="sim-metric">
                <span class="label">예상 이탈률</span>
                <span class="value ${simulation.churnRate > 10 ? 'danger' : 'success'}">
                    ${(simulation.churnRate || 0).toFixed(1)}%
                </span>
            </div>
            <div class="sim-metric">
                <span class="label">성장 곡선</span>
                <span class="value">${simulation.growthCurve || 'LINEAR'}</span>
            </div>
            <div class="sim-metric">
                <span class="label">네트워크 효과 단계</span>
                <span class="value highlight">${simulation.networkEffectPhase || 'N/A'}</span>
            </div>
        </div>
        <div class="simulation-chart">
            <canvas id="simChart" width="400" height="150"></canvas>
        </div>`;
    },
    
    _renderQuickActions() {
        return `
        <button onclick="runFullScan()" class="action-card primary">
            <span class="icon">🔍</span>
            <span class="label">전체 스캔</span>
        </button>
        <button onclick="triggerReferralChain()" class="action-card">
            <span class="icon">🔗</span>
            <span class="label">레퍼럴 체인 트리거</span>
        </button>
        <button onclick="sendQuantumLeapInvite()" class="action-card highlight">
            <span class="icon">⚡</span>
            <span class="label">퀀텀 점프 초대</span>
        </button>
        <button onclick="generateMicroClinic()" class="action-card">
            <span class="icon">🏥</span>
            <span class="label">마이크로 클리닉 생성</span>
        </button>
        <button onclick="exportAnalysis()" class="action-card">
            <span class="icon">📊</span>
            <span class="label">분석 내보내기</span>
        </button>
        <button onclick="refreshCenter()" class="action-card">
            <span class="icon">🔄</span>
            <span class="label">새로고침</span>
        </button>`;
    },
    
    _getStyles() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
            color: #fff;
            min-height: 100vh;
        }
        
        .control-center {
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: rgba(168, 85, 247, 0.1);
            border: 1px solid rgba(168, 85, 247, 0.3);
            border-radius: 16px;
            margin-bottom: 30px;
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo .icon { font-size: 40px; }
        .logo h1 { color: #a855f7; font-size: 24px; }
        
        .status-indicators {
            display: flex;
            gap: 20px;
        }
        
        .indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 20px;
            font-size: 12px;
        }
        
        .indicator .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #888;
        }
        
        .indicator.ok .dot { background: #4ade80; }
        .indicator.warning .dot { background: #fbbf24; animation: pulse 1s infinite; }
        .indicator.active .dot { background: #a855f7; }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        /* Main */
        .main {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        
        section {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 20px;
        }
        
        section h2 {
            margin-bottom: 20px;
            font-size: 16px;
            color: #a855f7;
        }
        
        /* Orbit Cards */
        .orbit-cards {
            grid-column: span 3;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            background: transparent;
            border: none;
            padding: 0;
        }
        
        .orbit-card {
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid var(--orbit-color);
            border-radius: 16px;
            padding: 20px;
            transition: transform 0.2s;
        }
        
        .orbit-card:hover { transform: translateY(-5px); }
        
        .card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .card-icon { font-size: 32px; }
        .card-header h3 { color: var(--orbit-color); }
        
        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .stat-row .value {
            font-weight: bold;
        }
        
        .value.danger { color: #ef4444; }
        .value.warning { color: #fbbf24; }
        .value.success { color: #4ade80; }
        .value.highlight { color: #a855f7; }
        
        .card-footer { margin-top: 20px; }
        
        .drill-btn {
            width: 100%;
            padding: 10px;
            background: var(--orbit-color);
            color: #000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
        }
        
        /* Golden Targets */
        .golden-targets {
            grid-column: span 2;
        }
        
        .targets-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        
        .target-card {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05));
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 12px;
            padding: 15px;
        }
        
        .target-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        }
        
        .target-id { font-weight: bold; }
        
        .target-score {
            text-align: center;
            margin: 15px 0;
        }
        
        .score-value {
            display: block;
            font-size: 32px;
            font-weight: bold;
            color: #ffd700;
        }
        
        .score-label {
            font-size: 10px;
            color: #888;
        }
        
        .target-reason {
            font-size: 12px;
            color: #888;
            margin-bottom: 10px;
        }
        
        .target-action {
            background: rgba(255, 215, 0, 0.2);
            padding: 8px;
            border-radius: 6px;
            font-size: 12px;
            margin-bottom: 10px;
        }
        
        .engage-btn {
            width: 100%;
            padding: 8px;
            background: #ffd700;
            color: #000;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }
        
        /* Alerts */
        .alerts-list {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .alert-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            margin-bottom: 10px;
            border-left: 4px solid #888;
        }
        
        .alert-item.danger { border-left-color: #ef4444; }
        .alert-item.success { border-left-color: #4ade80; }
        .alert-item.highlight { border-left-color: #a855f7; }
        
        .alert-icon { font-size: 24px; }
        .alert-content { flex: 1; }
        .alert-message { font-weight: bold; }
        .alert-action { font-size: 12px; color: #888; }
        
        .alert-btn {
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 6px;
            color: #fff;
            cursor: pointer;
        }
        
        /* Simulation */
        .simulation-results {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .sim-metric {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
        }
        
        .sim-metric .label {
            display: block;
            font-size: 11px;
            color: #888;
            margin-bottom: 5px;
        }
        
        .sim-metric .value {
            font-size: 18px;
            font-weight: bold;
        }
        
        .simulation-chart {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 10px;
        }
        
        /* Actions */
        .actions-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        
        .action-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .action-card:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
        }
        
        .action-card.primary { border-color: #a855f7; }
        .action-card.highlight { border-color: #ffd700; }
        
        .action-card .icon { font-size: 24px; }
        .action-card .label { font-size: 12px; }
        
        .empty {
            text-align: center;
            color: #666;
            padding: 30px;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
        }
        
        @media (max-width: 1200px) {
            .main { grid-template-columns: 1fr; }
            .orbit-cards { grid-column: span 1; grid-template-columns: 1fr; }
            .golden-targets { grid-column: span 1; }
            .targets-grid { grid-template-columns: repeat(2, 1fr); }
        }
        `;
    },
    
    _getScripts() {
        return `
        function drillDown(orbit) {
            console.log('Drill down into:', orbit);
            alert(orbit + ' 궤도 상세 정보');
        }
        
        function engageTarget(targetId) {
            console.log('Engaging target:', targetId);
            alert(targetId + ' 타겟 접촉 시작!');
        }
        
        function runFullScan() {
            alert('🔍 전체 시스템 스캔 중...');
            setTimeout(() => {
                alert('✅ 스캔 완료!');
                location.reload();
            }, 2000);
        }
        
        function triggerReferralChain() {
            alert('🔗 레퍼럴 체인 트리거됨!');
        }
        
        function sendQuantumLeapInvite() {
            alert('⚡ 퀀텀 점프 초대 발송!');
        }
        
        function generateMicroClinic() {
            alert('🏥 마이크로 클리닉 생성됨!');
        }
        
        function exportAnalysis() {
            alert('📊 분석 보고서 내보내기 중...');
        }
        
        function refreshCenter() {
            location.reload();
        }
        
        function runSimulation() {
            alert('🔮 시뮬레이션 실행 중...');
        }
        
        console.log('🎯 Multi-Orbit Control Center Loaded');
        `;
    }
};

export function testMultiOrbitControlCenter() {
    console.log('Testing Multi-Orbit Control Center...');
    
    const center = Object.create(MultiOrbitControlCenter).init();
    
    const testNodes = [
        { id: 'student_01', mass: 80, energy: 70, continuityScore: 0.85 },
        { id: 'student_02', mass: 60, energy: 50, continuityScore: 0.65 },
        { id: 'student_03', mass: 95, energy: 90, continuityScore: 0.95 }
    ];
    
    const testLeads = [
        { id: 'lead_01', interestLevel: 0.9 },
        { id: 'lead_02', interestLevel: 0.7 }
    ];
    
    const html = center.render(testNodes, testLeads);
    console.log('✅ Control Center HTML generated:', html.length, 'characters');
    
    return { center, html };
}

export default MultiOrbitControlCenter;
