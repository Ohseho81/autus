// ================================================================
// AUTUS CHURN ALERT SYSTEM
// 실시간 이탈 감지 및 경보 시스템
// ================================================================

import { ChurnPreventionEngine } from '../engines/ChurnPreventionEngine.js';

// ================================================================
// ALERT TYPES
// ================================================================

export const AlertLevel = {
    CRITICAL: 'CRITICAL',   // 즉시 조치 필요 (24시간 내 이탈 예상)
    HIGH: 'HIGH',           // 긴급 (48시간 내 위험)
    MEDIUM: 'MEDIUM',       // 주의 (1주일 내 위험)
    LOW: 'LOW'              // 관찰 필요
};

export const AlertChannel = {
    DASHBOARD: 'DASHBOARD',
    KAKAO: 'KAKAO',
    SMS: 'SMS',
    EMAIL: 'EMAIL',
    PUSH: 'PUSH'
};

// ================================================================
// CHURN ALERT SYSTEM
// ================================================================

export const ChurnAlertSystem = {
    engine: null,
    alerts: [],
    subscribers: [],
    checkInterval: null,
    config: {
        checkIntervalMs: 60000,  // 1분마다 체크
        criticalThreshold: 0.85,
        highThreshold: 0.70,
        mediumThreshold: 0.50,
        channels: [AlertChannel.DASHBOARD, AlertChannel.KAKAO]
    },
    
    /**
     * 초기화
     */
    init(config = {}) {
        this.config = { ...this.config, ...config };
        this.engine = Object.create(ChurnPreventionEngine).init();
        this.alerts = [];
        this.subscribers = [];
        return this;
    },
    
    /**
     * 실시간 모니터링 시작
     */
    startMonitoring(nodes) {
        console.log('[ChurnAlert] 🚨 실시간 모니터링 시작');
        
        // 초기 스캔
        this.scanForChurn(nodes);
        
        // 주기적 체크 설정
        this.checkInterval = setInterval(() => {
            this.scanForChurn(nodes);
        }, this.config.checkIntervalMs);
        
        return this;
    },
    
    /**
     * 모니터링 중지
     */
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('[ChurnAlert] ⏹️ 모니터링 중지');
    },
    
    /**
     * 이탈 위험 스캔
     */
    scanForChurn(nodes) {
        const timestamp = new Date();
        console.log(`[ChurnAlert] 🔍 스캔 시작 - ${nodes.length}명`);
        
        const newAlerts = [];
        
        nodes.forEach(node => {
            const riskScore = this._calculateRiskScore(node);
            const level = this._determineAlertLevel(riskScore);
            
            if (level) {
                const alert = this._createAlert(node, riskScore, level, timestamp);
                newAlerts.push(alert);
            }
        });
        
        // 새 알림 처리
        newAlerts.forEach(alert => {
            if (!this._isDuplicate(alert)) {
                this.alerts.push(alert);
                this._dispatchAlert(alert);
            }
        });
        
        // 오래된 알림 정리 (7일 이상)
        this._cleanupOldAlerts();
        
        console.log(`[ChurnAlert] ✅ 스캔 완료 - ${newAlerts.length}개 위험 감지`);
        
        return newAlerts;
    },
    
    /**
     * 위험 점수 계산
     */
    _calculateRiskScore(node) {
        let score = 0;
        
        // 출석률 기반 위험
        const attendance = node.attendance || node.recentAttendance || 100;
        if (attendance < 50) score += 0.4;
        else if (attendance < 70) score += 0.25;
        else if (attendance < 85) score += 0.1;
        
        // 참여도 기반 위험
        const engagement = node.engagement || node.recentEngagement || 100;
        if (engagement < 40) score += 0.3;
        else if (engagement < 60) score += 0.2;
        else if (engagement < 75) score += 0.1;
        
        // 마지막 활동 기반 위험
        const lastActivity = node.lastActivity ? new Date(node.lastActivity) : new Date();
        const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 14) score += 0.3;
        else if (daysSinceActivity > 7) score += 0.2;
        else if (daysSinceActivity > 3) score += 0.1;
        
        // 감정 신호 (negative sentiment)
        if (node.sentiment === 'negative' || node.emotionalState === 'frustrated') {
            score += 0.2;
        }
        
        // 결제 이슈
        if (node.paymentIssue || node.latePayment) {
            score += 0.15;
        }
        
        return Math.min(1, score);
    },
    
    /**
     * 알림 레벨 결정
     */
    _determineAlertLevel(riskScore) {
        if (riskScore >= this.config.criticalThreshold) return AlertLevel.CRITICAL;
        if (riskScore >= this.config.highThreshold) return AlertLevel.HIGH;
        if (riskScore >= this.config.mediumThreshold) return AlertLevel.MEDIUM;
        if (riskScore >= 0.3) return AlertLevel.LOW;
        return null;
    },
    
    /**
     * 알림 생성
     */
    _createAlert(node, riskScore, level, timestamp) {
        const reasons = this._analyzeRiskReasons(node);
        const actions = this._suggestActions(node, level);
        
        return {
            id: `alert_${node.id}_${timestamp.getTime()}`,
            nodeId: node.id,
            nodeName: node.name || node.studentName || node.id,
            level,
            riskScore,
            reasons,
            suggestedActions: actions,
            createdAt: timestamp,
            status: 'ACTIVE',
            assignedTo: null,
            resolvedAt: null
        };
    },
    
    /**
     * 위험 원인 분석
     */
    _analyzeRiskReasons(node) {
        const reasons = [];
        
        const attendance = node.attendance || node.recentAttendance || 100;
        if (attendance < 70) {
            reasons.push({
                type: 'LOW_ATTENDANCE',
                message: `출석률 ${attendance}% (기준치 미달)`,
                weight: 0.3
            });
        }
        
        const engagement = node.engagement || node.recentEngagement || 100;
        if (engagement < 60) {
            reasons.push({
                type: 'LOW_ENGAGEMENT',
                message: `참여도 ${engagement}% (저조)`,
                weight: 0.25
            });
        }
        
        const lastActivity = node.lastActivity ? new Date(node.lastActivity) : new Date();
        const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 7) {
            reasons.push({
                type: 'INACTIVE',
                message: `${Math.floor(daysSinceActivity)}일간 비활성`,
                weight: 0.25
            });
        }
        
        if (node.sentiment === 'negative') {
            reasons.push({
                type: 'NEGATIVE_SENTIMENT',
                message: '부정적 감정 신호 감지',
                weight: 0.2
            });
        }
        
        if (node.paymentIssue) {
            reasons.push({
                type: 'PAYMENT_ISSUE',
                message: '결제 문제 발생',
                weight: 0.15
            });
        }
        
        return reasons.sort((a, b) => b.weight - a.weight);
    },
    
    /**
     * 권장 조치 제안
     */
    _suggestActions(node, level) {
        const actions = [];
        
        if (level === AlertLevel.CRITICAL) {
            actions.push({
                type: 'IMMEDIATE_CALL',
                message: '📞 즉시 학부모 전화 상담',
                priority: 1,
                deadline: '24시간 내'
            });
            actions.push({
                type: 'SPECIAL_OFFER',
                message: '🎁 특별 케어 프로그램 제안',
                priority: 2,
                deadline: '48시간 내'
            });
        } else if (level === AlertLevel.HIGH) {
            actions.push({
                type: 'PERSONAL_MESSAGE',
                message: '💬 개인 맞춤 메시지 발송',
                priority: 1,
                deadline: '48시간 내'
            });
            actions.push({
                type: 'FOLLOW_UP_CALL',
                message: '📞 학부모 상담 예약',
                priority: 2,
                deadline: '1주일 내'
            });
        } else if (level === AlertLevel.MEDIUM) {
            actions.push({
                type: 'ENGAGEMENT_BOOST',
                message: '🚀 참여 유도 콘텐츠 발송',
                priority: 1,
                deadline: '1주일 내'
            });
        } else {
            actions.push({
                type: 'MONITOR',
                message: '👁️ 지속 관찰',
                priority: 1,
                deadline: '2주간'
            });
        }
        
        return actions;
    },
    
    /**
     * 중복 알림 확인
     */
    _isDuplicate(newAlert) {
        const recentAlerts = this.alerts.filter(a => 
            a.nodeId === newAlert.nodeId &&
            a.level === newAlert.level &&
            a.status === 'ACTIVE' &&
            (Date.now() - new Date(a.createdAt).getTime()) < 24 * 60 * 60 * 1000
        );
        return recentAlerts.length > 0;
    },
    
    /**
     * 알림 발송
     */
    _dispatchAlert(alert) {
        console.log(`[ChurnAlert] 🚨 ${alert.level}: ${alert.nodeName} (위험도 ${(alert.riskScore * 100).toFixed(0)}%)`);
        
        // 구독자들에게 알림
        this.subscribers.forEach(subscriber => {
            try {
                subscriber(alert);
            } catch (e) {
                console.error('[ChurnAlert] Subscriber error:', e);
            }
        });
        
        // 채널별 발송
        this.config.channels.forEach(channel => {
            this._sendToChannel(channel, alert);
        });
    },
    
    /**
     * 채널별 발송
     */
    _sendToChannel(channel, alert) {
        switch (channel) {
            case AlertChannel.DASHBOARD:
                // 대시보드에 표시 (기본)
                break;
            case AlertChannel.KAKAO:
                this._sendKakaoAlert(alert);
                break;
            case AlertChannel.SMS:
                this._sendSMSAlert(alert);
                break;
            case AlertChannel.EMAIL:
                this._sendEmailAlert(alert);
                break;
            case AlertChannel.PUSH:
                this._sendPushAlert(alert);
                break;
        }
    },
    
    /**
     * 카카오톡 알림 발송
     */
    _sendKakaoAlert(alert) {
        const message = this._formatKakaoMessage(alert);
        console.log(`[ChurnAlert] 📱 카카오톡 발송: ${alert.nodeName}`);
        // 실제 카카오 API 호출
        // await KakaoAPI.sendMessage(message);
        return message;
    },
    
    /**
     * SMS 알림 발송
     */
    _sendSMSAlert(alert) {
        const message = this._formatSMSMessage(alert);
        console.log(`[ChurnAlert] 📨 SMS 발송: ${alert.nodeName}`);
        // 실제 SMS API 호출
        return message;
    },
    
    /**
     * 이메일 알림 발송
     */
    _sendEmailAlert(alert) {
        const email = this._formatEmailMessage(alert);
        console.log(`[ChurnAlert] 📧 이메일 발송: ${alert.nodeName}`);
        // 실제 이메일 API 호출
        return email;
    },
    
    /**
     * 푸시 알림 발송
     */
    _sendPushAlert(alert) {
        const push = this._formatPushMessage(alert);
        console.log(`[ChurnAlert] 🔔 푸시 발송: ${alert.nodeName}`);
        // 실제 푸시 API 호출
        return push;
    },
    
    /**
     * 메시지 포맷팅
     */
    _formatKakaoMessage(alert) {
        const levelEmoji = {
            CRITICAL: '🚨',
            HIGH: '⚠️',
            MEDIUM: '📢',
            LOW: '📌'
        };
        
        return {
            type: 'TEMPLATE',
            template: 'CHURN_ALERT',
            data: {
                emoji: levelEmoji[alert.level],
                level: alert.level,
                studentName: alert.nodeName,
                riskScore: (alert.riskScore * 100).toFixed(0),
                mainReason: alert.reasons[0]?.message || '위험 신호 감지',
                action: alert.suggestedActions[0]?.message || '확인 필요',
                deadline: alert.suggestedActions[0]?.deadline || '-'
            }
        };
    },
    
    _formatSMSMessage(alert) {
        return `[AUTUS] ${alert.level} 경보: ${alert.nodeName} 이탈 위험 ${(alert.riskScore * 100).toFixed(0)}%. 즉시 확인 필요.`;
    },
    
    _formatEmailMessage(alert) {
        return {
            subject: `[AUTUS ${alert.level}] ${alert.nodeName} 이탈 위험 경보`,
            body: `
                학생: ${alert.nodeName}
                위험도: ${(alert.riskScore * 100).toFixed(0)}%
                주요 원인: ${alert.reasons.map(r => r.message).join(', ')}
                권장 조치: ${alert.suggestedActions.map(a => a.message).join(', ')}
            `
        };
    },
    
    _formatPushMessage(alert) {
        return {
            title: `🚨 ${alert.nodeName} 이탈 위험`,
            body: `위험도 ${(alert.riskScore * 100).toFixed(0)}% - ${alert.reasons[0]?.message || '확인 필요'}`,
            data: { alertId: alert.id }
        };
    },
    
    /**
     * 알림 구독
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(s => s !== callback);
        };
    },
    
    /**
     * 알림 해결 처리
     */
    resolveAlert(alertId, resolution) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'RESOLVED';
            alert.resolvedAt = new Date();
            alert.resolution = resolution;
            console.log(`[ChurnAlert] ✅ 알림 해결: ${alertId}`);
        }
        return alert;
    },
    
    /**
     * 알림 할당
     */
    assignAlert(alertId, assignee) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.assignedTo = assignee;
            console.log(`[ChurnAlert] 👤 알림 할당: ${alertId} → ${assignee}`);
        }
        return alert;
    },
    
    /**
     * 오래된 알림 정리
     */
    _cleanupOldAlerts() {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7일
        this.alerts = this.alerts.filter(a => 
            new Date(a.createdAt).getTime() > cutoff || a.status === 'ACTIVE'
        );
    },
    
    /**
     * 활성 알림 조회
     */
    getActiveAlerts() {
        return this.alerts.filter(a => a.status === 'ACTIVE')
            .sort((a, b) => {
                const levelOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return levelOrder[a.level] - levelOrder[b.level];
            });
    },
    
    /**
     * 알림 통계
     */
    getAlertStats() {
        const active = this.alerts.filter(a => a.status === 'ACTIVE');
        
        return {
            total: this.alerts.length,
            active: active.length,
            byLevel: {
                critical: active.filter(a => a.level === AlertLevel.CRITICAL).length,
                high: active.filter(a => a.level === AlertLevel.HIGH).length,
                medium: active.filter(a => a.level === AlertLevel.MEDIUM).length,
                low: active.filter(a => a.level === AlertLevel.LOW).length
            },
            resolved: this.alerts.filter(a => a.status === 'RESOLVED').length,
            avgResolutionTime: this._calculateAvgResolutionTime()
        };
    },
    
    _calculateAvgResolutionTime() {
        const resolved = this.alerts.filter(a => a.status === 'RESOLVED' && a.resolvedAt);
        if (resolved.length === 0) return null;
        
        const totalTime = resolved.reduce((sum, a) => {
            return sum + (new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime());
        }, 0);
        
        return totalTime / resolved.length / (1000 * 60 * 60); // 시간 단위
    },
    
    /**
     * 대시보드 HTML 렌더링
     */
    renderDashboard() {
        const stats = this.getAlertStats();
        const activeAlerts = this.getActiveAlerts();
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>AUTUS Churn Alert Dashboard</title>
    <style>${this._getDashboardStyles()}</style>
</head>
<body>
    <div class="alert-dashboard">
        <header>
            <h1>🚨 이탈 경보 시스템</h1>
            <div class="stats">
                <span class="stat critical">${stats.byLevel.critical} Critical</span>
                <span class="stat high">${stats.byLevel.high} High</span>
                <span class="stat medium">${stats.byLevel.medium} Medium</span>
                <span class="stat low">${stats.byLevel.low} Low</span>
            </div>
        </header>
        
        <main>
            <section class="alerts-list">
                ${activeAlerts.length === 0 ? 
                    '<div class="empty">✅ 현재 활성 경보 없음</div>' :
                    activeAlerts.map(a => this._renderAlertCard(a)).join('')
                }
            </section>
        </main>
    </div>
    <script>${this._getDashboardScripts()}</script>
</body>
</html>`;
    },
    
    _renderAlertCard(alert) {
        const levelClass = alert.level.toLowerCase();
        return `
        <div class="alert-card ${levelClass}">
            <div class="alert-header">
                <span class="alert-level">${alert.level}</span>
                <span class="alert-time">${new Date(alert.createdAt).toLocaleString('ko-KR')}</span>
            </div>
            <div class="alert-body">
                <h3>${alert.nodeName}</h3>
                <div class="risk-score">위험도: ${(alert.riskScore * 100).toFixed(0)}%</div>
                <div class="reasons">
                    ${alert.reasons.map(r => `<span class="reason">${r.message}</span>`).join('')}
                </div>
            </div>
            <div class="alert-actions">
                ${alert.suggestedActions.map(a => `
                    <button class="action-btn" onclick="executeAction('${alert.id}', '${a.type}')">
                        ${a.message}
                    </button>
                `).join('')}
            </div>
            <div class="alert-footer">
                <button onclick="resolveAlert('${alert.id}')">✓ 해결</button>
                <button onclick="assignAlert('${alert.id}')">👤 할당</button>
            </div>
        </div>`;
    },
    
    _getDashboardStyles() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #fff; }
        .alert-dashboard { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        h1 { color: #ef4444; }
        .stats { display: flex; gap: 15px; }
        .stat { padding: 8px 16px; border-radius: 20px; font-size: 14px; }
        .stat.critical { background: #ef4444; }
        .stat.high { background: #f97316; }
        .stat.medium { background: #fbbf24; color: #000; }
        .stat.low { background: #4ade80; color: #000; }
        .alerts-list { display: flex; flex-direction: column; gap: 15px; }
        .alert-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; border-left: 4px solid; }
        .alert-card.critical { border-color: #ef4444; }
        .alert-card.high { border-color: #f97316; }
        .alert-card.medium { border-color: #fbbf24; }
        .alert-card.low { border-color: #4ade80; }
        .alert-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .alert-level { font-weight: bold; }
        .alert-time { color: #888; font-size: 12px; }
        .alert-body h3 { margin-bottom: 10px; }
        .risk-score { font-size: 24px; font-weight: bold; color: #ef4444; }
        .reasons { margin: 15px 0; }
        .reason { display: inline-block; padding: 4px 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 2px; font-size: 12px; }
        .alert-actions { margin: 15px 0; }
        .action-btn { padding: 8px 16px; background: #4ade80; color: #000; border: none; border-radius: 6px; margin-right: 10px; cursor: pointer; }
        .alert-footer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; }
        .alert-footer button { padding: 8px 16px; background: rgba(255,255,255,0.1); border: none; border-radius: 6px; color: #fff; margin-right: 10px; cursor: pointer; }
        .empty { text-align: center; padding: 60px; color: #4ade80; font-size: 24px; }
        `;
    },
    
    _getDashboardScripts() {
        return `
        function executeAction(alertId, actionType) { console.log('Execute:', alertId, actionType); alert('조치 실행: ' + actionType); }
        function resolveAlert(alertId) { console.log('Resolve:', alertId); alert('알림 해결 처리됨'); location.reload(); }
        function assignAlert(alertId) { const assignee = prompt('담당자 이름:'); if(assignee) { console.log('Assign:', alertId, assignee); alert(assignee + '에게 할당됨'); } }
        console.log('🚨 Churn Alert Dashboard Loaded');
        `;
    }
};

// ================================================================
// TEST
// ================================================================

export function testChurnAlertSystem() {
    console.log('Testing Churn Alert System...');
    
    const system = Object.create(ChurnAlertSystem).init();
    
    const testNodes = [
        { id: 'student_001', name: '김위험', attendance: 45, engagement: 30, lastActivity: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { id: 'student_002', name: '이주의', attendance: 65, engagement: 55, lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { id: 'student_003', name: '박안정', attendance: 95, engagement: 88, lastActivity: new Date() }
    ];
    
    const alerts = system.scanForChurn(testNodes);
    const stats = system.getAlertStats();
    const html = system.renderDashboard();
    
    console.log('✅ Alerts generated:', alerts.length);
    console.log('✅ Stats:', stats);
    console.log('✅ Dashboard HTML:', html.length, 'characters');
    
    return { system, alerts, stats, html };
}

export default ChurnAlertSystem;
