// ================================================================
// AUTUS KAKAO BOT INTEGRATION
// 카카오톡 자동 메시지 발송
// ================================================================

// ================================================================
// KAKAO BOT
// ================================================================

export const KakaoBot = {
    config: {
        apiKey: '',
        templateIds: {
            welcome: 'TPL_WELCOME',
            weeklyReport: 'TPL_WEEKLY_REPORT',
            churnAlert: 'TPL_CHURN_ALERT',
            pulse: 'TPL_PULSE',
            reminder: 'TPL_REMINDER',
            payment: 'TPL_PAYMENT'
        },
        baseUrl: 'https://kapi.kakao.com/v2/api/talk'
    },
    messageQueue: [],
    sentHistory: [],
    
    init(config = {}) {
        this.config = { ...this.config, ...config };
        this.messageQueue = [];
        this.sentHistory = [];
        return this;
    },
    
    // ================================================================
    // MESSAGE TYPES
    // ================================================================
    
    /**
     * 환영 메시지 발송
     */
    async sendWelcome(recipient) {
        const message = {
            templateId: this.config.templateIds.welcome,
            recipient: recipient.phone || recipient.kakaoId,
            data: {
                name: recipient.name,
                studentName: recipient.studentName,
                startDate: new Date().toLocaleDateString('ko-KR'),
                message: `${recipient.studentName} 학생의 AUTUS 학습 여정이 시작되었습니다!`
            }
        };
        
        return this._send(message);
    },
    
    /**
     * 주간 리포트 발송
     */
    async sendWeeklyReport(recipient, reportData) {
        const message = {
            templateId: this.config.templateIds.weeklyReport,
            recipient: recipient.phone || recipient.kakaoId,
            data: {
                name: recipient.name,
                studentName: reportData.studentName,
                period: reportData.period,
                attendance: reportData.attendance,
                progress: reportData.progress,
                engagement: reportData.engagement,
                highlights: reportData.highlights.join(', '),
                reportUrl: reportData.reportUrl || 'https://autus.io/report'
            }
        };
        
        return this._send(message);
    },
    
    /**
     * 이탈 경보 메시지 발송
     */
    async sendChurnAlert(recipient, alertData) {
        const message = {
            templateId: this.config.templateIds.churnAlert,
            recipient: recipient.phone || recipient.kakaoId,
            data: {
                name: recipient.name,
                studentName: alertData.studentName,
                alertLevel: alertData.level,
                reason: alertData.reason,
                suggestion: alertData.suggestion,
                actionUrl: alertData.actionUrl || 'https://autus.io/support'
            }
        };
        
        return this._send(message);
    },
    
    /**
     * 펄스 메시지 발송 (대기자용)
     */
    async sendPulse(recipient, pulseData) {
        const message = {
            templateId: this.config.templateIds.pulse,
            recipient: recipient.phone || recipient.kakaoId,
            data: {
                name: recipient.name,
                pulseType: pulseData.type,
                subject: pulseData.subject,
                content: pulseData.content,
                ctaText: pulseData.ctaText || '자세히 보기',
                ctaUrl: pulseData.ctaUrl || 'https://autus.io'
            }
        };
        
        return this._send(message);
    },
    
    /**
     * 리마인더 발송
     */
    async sendReminder(recipient, reminderData) {
        const message = {
            templateId: this.config.templateIds.reminder,
            recipient: recipient.phone || recipient.kakaoId,
            data: {
                name: recipient.name,
                reminderType: reminderData.type,
                title: reminderData.title,
                content: reminderData.content,
                dueDate: reminderData.dueDate,
                actionUrl: reminderData.actionUrl || 'https://autus.io'
            }
        };
        
        return this._send(message);
    },
    
    /**
     * 결제 알림 발송
     */
    async sendPaymentNotice(recipient, paymentData) {
        const message = {
            templateId: this.config.templateIds.payment,
            recipient: recipient.phone || recipient.kakaoId,
            data: {
                name: recipient.name,
                studentName: paymentData.studentName,
                paymentType: paymentData.type,
                amount: paymentData.amount.toLocaleString(),
                dueDate: paymentData.dueDate,
                paymentUrl: paymentData.paymentUrl || 'https://autus.io/payment'
            }
        };
        
        return this._send(message);
    },
    
    // ================================================================
    // BULK MESSAGING
    // ================================================================
    
    /**
     * 대량 메시지 발송
     */
    async sendBulk(recipients, messageGenerator) {
        const results = [];
        
        for (const recipient of recipients) {
            try {
                const message = messageGenerator(recipient);
                const result = await this._send(message);
                results.push({ recipient: recipient.id, success: true, result });
                
                // Rate limiting
                await this._delay(100);
            } catch (error) {
                results.push({ recipient: recipient.id, success: false, error: error.message });
            }
        }
        
        return {
            total: recipients.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    },
    
    /**
     * 세그먼트별 메시지 발송
     */
    async sendToSegment(segment, messageTemplate) {
        // 세그먼트 정의
        const segments = {
            ALL: () => true,
            AT_RISK: (r) => r.riskScore > 0.5,
            HIGH_VALUE: (r) => r.lifetimeValue > 1000000,
            NEW: (r) => r.daysSinceJoin < 30,
            WAITLIST: (r) => r.isWaitlist
        };
        
        const filter = segments[segment] || segments.ALL;
        const filteredRecipients = this.recipients?.filter(filter) || [];
        
        return this.sendBulk(filteredRecipients, (r) => ({
            ...messageTemplate,
            recipient: r.phone || r.kakaoId,
            data: { ...messageTemplate.data, name: r.name }
        }));
    },
    
    // ================================================================
    // SCHEDULING
    // ================================================================
    
    /**
     * 예약 발송
     */
    scheduleMessage(message, scheduledAt) {
        const scheduled = {
            id: `scheduled_${Date.now()}`,
            message,
            scheduledAt: new Date(scheduledAt),
            status: 'PENDING'
        };
        
        this.messageQueue.push(scheduled);
        
        return scheduled;
    },
    
    /**
     * 예약 메시지 실행
     */
    async executeScheduledMessages() {
        const now = new Date();
        const pending = this.messageQueue.filter(
            m => m.status === 'PENDING' && m.scheduledAt <= now
        );
        
        const results = [];
        
        for (const scheduled of pending) {
            try {
                const result = await this._send(scheduled.message);
                scheduled.status = 'SENT';
                scheduled.sentAt = new Date();
                results.push({ id: scheduled.id, success: true, result });
            } catch (error) {
                scheduled.status = 'FAILED';
                scheduled.error = error.message;
                results.push({ id: scheduled.id, success: false, error: error.message });
            }
        }
        
        return results;
    },
    
    /**
     * 예약 취소
     */
    cancelScheduled(scheduledId) {
        const scheduled = this.messageQueue.find(m => m.id === scheduledId);
        if (scheduled && scheduled.status === 'PENDING') {
            scheduled.status = 'CANCELLED';
            return true;
        }
        return false;
    },
    
    // ================================================================
    // TEMPLATE MANAGEMENT
    // ================================================================
    
    /**
     * 커스텀 템플릿 등록
     */
    registerTemplate(name, templateId) {
        this.config.templateIds[name] = templateId;
    },
    
    /**
     * 메시지 미리보기
     */
    previewMessage(templateId, data) {
        // 템플릿 기반 미리보기 생성
        const templates = {
            welcome: `[AUTUS] 안녕하세요 ${data.name}님! ${data.studentName} 학생의 AUTUS 학습 여정이 시작되었습니다. 🎉`,
            weeklyReport: `[AUTUS 주간 리포트] ${data.studentName}\n📊 출석: ${data.attendance}%\n📈 진도: ${data.progress}%\n💪 참여도: ${data.engagement}%`,
            churnAlert: `[AUTUS] ${data.name}님, ${data.studentName} 학생에게 조금 더 관심이 필요합니다. ${data.suggestion}`,
            pulse: `[AUTUS] ${data.subject}\n${data.content}`,
            reminder: `[AUTUS 리마인더] ${data.title}\n${data.content}\n기한: ${data.dueDate}`,
            payment: `[AUTUS 결제 안내] ${data.studentName} 학생\n${data.paymentType}: ₩${data.amount}\n납부 기한: ${data.dueDate}`
        };
        
        return templates[templateId] || '템플릿을 찾을 수 없습니다.';
    },
    
    // ================================================================
    // ANALYTICS
    // ================================================================
    
    /**
     * 발송 통계
     */
    getStats(period = 'day') {
        const now = new Date();
        let cutoff;
        
        switch (period) {
            case 'hour': cutoff = new Date(now - 60 * 60 * 1000); break;
            case 'day': cutoff = new Date(now - 24 * 60 * 60 * 1000); break;
            case 'week': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
            case 'month': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
            default: cutoff = new Date(0);
        }
        
        const recentHistory = this.sentHistory.filter(h => new Date(h.sentAt) >= cutoff);
        
        const byTemplate = {};
        recentHistory.forEach(h => {
            byTemplate[h.templateId] = (byTemplate[h.templateId] || 0) + 1;
        });
        
        return {
            period,
            total: recentHistory.length,
            success: recentHistory.filter(h => h.success).length,
            failed: recentHistory.filter(h => !h.success).length,
            byTemplate,
            deliveryRate: recentHistory.length > 0 
                ? (recentHistory.filter(h => h.success).length / recentHistory.length * 100).toFixed(1) + '%'
                : 'N/A'
        };
    },
    
    // ================================================================
    // INTERNAL METHODS
    // ================================================================
    
    async _send(message) {
        // 실제 구현에서는 카카오 API 호출
        console.log(`[KakaoBot] 📱 발송: ${message.templateId} → ${message.recipient}`);
        
        // Mock response
        const result = {
            messageId: `msg_${Date.now()}`,
            templateId: message.templateId,
            recipient: message.recipient,
            sentAt: new Date().toISOString(),
            success: true
        };
        
        this.sentHistory.push(result);
        
        return result;
    },
    
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // ================================================================
    // DASHBOARD
    // ================================================================
    
    renderDashboard() {
        const stats = this.getStats('day');
        const pending = this.messageQueue.filter(m => m.status === 'PENDING');
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>AUTUS Kakao Bot Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #fff; padding: 20px; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        h1 { margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; text-align: center; }
        .stat-value { font-size: 36px; font-weight: bold; color: #fbbf24; }
        .stat-label { color: #888; font-size: 14px; }
        section { background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; margin-bottom: 20px; }
        section h2 { margin-bottom: 15px; font-size: 18px; }
        .pending-list { display: flex; flex-direction: column; gap: 10px; }
        .pending-item { display: flex; justify-content: space-between; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; }
        .template-stats { display: flex; flex-wrap: wrap; gap: 10px; }
        .template-badge { padding: 8px 16px; background: rgba(251,191,36,0.2); border-radius: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="dashboard">
        <h1>📱 Kakao Bot Dashboard</h1>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">오늘 발송</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.success}</div>
                <div class="stat-label">성공</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.failed}</div>
                <div class="stat-label">실패</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.deliveryRate}</div>
                <div class="stat-label">전달률</div>
            </div>
        </div>
        
        <section>
            <h2>⏰ 예약 대기 (${pending.length})</h2>
            <div class="pending-list">
                ${pending.length === 0 ? '<p>예약된 메시지 없음</p>' : 
                  pending.map(p => `
                    <div class="pending-item">
                        <span>${p.message.templateId}</span>
                        <span>${new Date(p.scheduledAt).toLocaleString('ko-KR')}</span>
                        <button onclick="cancelScheduled('${p.id}')">취소</button>
                    </div>
                  `).join('')}
            </div>
        </section>
        
        <section>
            <h2>📊 템플릿별 발송</h2>
            <div class="template-stats">
                ${Object.entries(stats.byTemplate).map(([t, c]) => `
                    <span class="template-badge">${t}: ${c}</span>
                `).join('')}
            </div>
        </section>
    </div>
</body>
</html>`;
    }
};

// ================================================================
// TEST
// ================================================================

export async function testKakaoBot() {
    console.log('Testing Kakao Bot...');
    
    const bot = Object.create(KakaoBot).init();
    
    // 환영 메시지
    const welcome = await bot.sendWelcome({
        name: '김부모',
        phone: '010-1234-5678',
        studentName: '김학생'
    });
    console.log('✅ Welcome sent:', welcome.messageId);
    
    // 주간 리포트
    const report = await bot.sendWeeklyReport(
        { name: '김부모', phone: '010-1234-5678' },
        {
            studentName: '김학생',
            period: '1/8 ~ 1/14',
            attendance: 92,
            progress: 78,
            engagement: 85,
            highlights: ['출석률 우수', '과제 완료']
        }
    );
    console.log('✅ Weekly report sent:', report.messageId);
    
    // 통계
    const stats = bot.getStats('day');
    console.log('✅ Stats:', stats);
    
    return { bot, welcome, report, stats };
}

export default KakaoBot;
