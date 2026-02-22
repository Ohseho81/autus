// ============================================
// AUTUS Shared Data & Utilities
// ============================================

const AUTUS = {
    // ============================================
    // KERNEL SCHEMA (6 Fields)
    // ============================================
    kernel: {
        // Constants (상수) - 정적 구조 정의
        role_id: null,           // [owner|director|teacher|staff|parent|student]
        affiliation_map: {},     // [지점명|소속반|담당/자녀관계]
        base_capacity: 0,        // [담당학생수|자녀수|운영지점수]
        
        // Indices (지수) - 동적 상태 측정
        pain_point_top1: null,   // [admin|churn|anxiety|...]
        sync_orbit: 0.5,         // [0.2=밀착|0.5=중간|0.8=자율]
        current_energy: 0.5      // [0.3=낮음|0.5=보통|0.8=높음]
    },

    // Load kernel from localStorage
    loadKernel() {
        const saved = localStorage.getItem('autus_kernel');
        if (saved) {
            this.kernel = { ...this.kernel, ...JSON.parse(saved) };
        }
    },

    // Derive orbit UI mode based on sync_orbit
    deriveOrbitMode() {
        const orbit = this.kernel.sync_orbit;
        if (orbit < 0.35) return 'core';      // 원클릭 실행형
        if (orbit < 0.65) return 'mid';       // 옵션 선택형
        return 'outer';                        // 정보 제공형
    },

    // ============================================
    // REWARD CARD SYSTEM
    // ============================================
    rewardCards: {
        owner: {
            cashflow: {
                id: 'reward_owner_cashflow',
                title: 'Cash-Flow Guardian',
                icon: '💰',
                one_line_benefit: '미납 예상 가구를 미리 추출합니다.',
                template: (data) => `이번 달 미납 예상 가구 ${data.count || 4}곳을 추출했습니다. 거절감 없는 정중한 납부 안내 문안 3종을 준비했습니다.`,
                actions: [
                    { label: '문안 확인', type: 'open_draft', requires_approval: false },
                    { label: '수정 요청', type: 'ask_revision', requires_approval: false },
                    { label: '자동 발송', type: 'send_message', requires_approval: true }
                ]
            },
            churn: {
                id: 'reward_owner_churn',
                title: 'Risk Radar',
                icon: '📊',
                one_line_benefit: '퇴원 리스크를 사전 감지합니다.',
                template: (data) => `최근 3일간 학습 에너지가 급감한 학생 ${data.count || 2}명을 발견했습니다. 퇴원 징후일 확률 ${data.probability || 82}%입니다. 맞춤 대응 스크립트를 생성했습니다.`
            }
        },
        director: {
            churn: {
                id: 'reward_director_churn',
                title: 'Risk Radar',
                icon: '📉',
                one_line_benefit: '퇴원 징후를 82% 확률로 감지합니다.',
                template: (data) => `최근 3일간 학습 에너지가 급감한 학생 ${data.count || 2}명을 발견했습니다. 상담 시 바로 사용할 '맞춤 대응 스크립트'를 생성했습니다.`
            }
        },
        teacher: {
            admin: {
                id: 'reward_teacher_admin',
                title: 'Magic Reporter',
                icon: '📝',
                one_line_benefit: '상담 일지를 30초로 완성합니다.',
                template: (data) => `수고하셨습니다. 오늘 수업 로그를 바탕으로 학부모 상담 일지 ${data.count || 5}건의 초안을 작성했습니다. 퇴근 시간을 ${data.minutes || 20}분 앞당겨 드릴게요.`,
                actions: [
                    { label: '초안 확인', type: 'open_draft', requires_approval: false },
                    { label: '수정 요청', type: 'ask_revision', requires_approval: false },
                    { label: '전송', type: 'send_message', requires_approval: true }
                ]
            },
            prep: {
                id: 'reward_teacher_prep',
                title: 'Focus Planner',
                icon: '🎯',
                one_line_benefit: '학생별 맞춤 수업 자료를 준비합니다.',
                template: (data) => `${data.studentName || '연우'}는 ${data.weakness || '분수 연산'}에서 반복 오류가 있습니다. 추천 문제 ${data.count || 10}개를 준비했습니다.`
            }
        },
        staff: {
            emotion: {
                id: 'reward_staff_emotion',
                title: 'Friction Filter',
                icon: '🛡️',
                one_line_benefit: '감정 노동을 70% 줄여드립니다.',
                template: (data) => `감정적 표현이 섞인 문의를 감지했습니다. AI가 핵심 요구사항만 중립적으로 요약했습니다. 가장 적절한 답변 옵션 ${data.count || 2}개를 추천합니다.`,
                actions: [
                    { label: '요약 확인', type: 'view_summary', requires_approval: false },
                    { label: '답변 선택', type: 'select_option', requires_approval: false },
                    { label: '전송', type: 'send_message', requires_approval: true }
                ]
            }
        },
        parent: {
            anxiety: {
                id: 'reward_parent_anxiety',
                title: 'Growth Highlight',
                icon: '🌟',
                one_line_benefit: '아이의 성장을 10초로 확인합니다.',
                template: (data) => `${data.childName || '연우'}가 오늘 가장 어려워하던 문제를 스스로 풀어냈습니다. 그 칭찬할 만한 순간을 15초 영상 리포트로 구성했습니다. 아이에게 보낼 '칭찬 메시지'를 추천해 드릴까요?`,
                actions: [
                    { label: '리포트 보기', type: 'view_report', requires_approval: false },
                    { label: '칭찬 메시지 보내기', type: 'send_praise', requires_approval: true }
                ]
            }
        },
        student: {
            motivation: {
                id: 'reward_student_motivation',
                title: 'Achievement Quest',
                icon: '🎮',
                one_line_benefit: '게임처럼 공부하세요!',
                template: (data) => `오늘 퀘스트 ${data.questCount || 3}개만 완료하면 '${data.badge || '단어 마스터'}' 배지를 획득합니다. 어제 틀린 문제 복습 시 추가 경험치 2배!`,
                actions: [
                    { label: '도전', type: 'start_quest', requires_approval: false }
                ]
            }
        }
    },

    // Generate reward card based on kernel
    generateRewardCard(contextSignals = {}) {
        const role = this.kernel.role_id;
        const pain = this.kernel.pain_point_top1;
        const orbit = this.deriveOrbitMode();
        
        const roleCards = this.rewardCards[role];
        if (!roleCards) return null;
        
        const card = roleCards[pain] || Object.values(roleCards)[0];
        if (!card) return null;

        const message = card.template(contextSignals);
        
        // Adjust actions based on orbit
        let actions = card.actions || [];
        if (orbit === 'core') {
            actions = actions.map(a => ({ ...a, highlighted: true }));
        } else if (orbit === 'outer') {
            actions = actions.filter(a => !a.requires_approval);
        }

        return {
            card_id: card.id,
            title: card.title,
            icon: card.icon,
            one_line_benefit: card.one_line_benefit,
            message: message,
            actions: actions,
            orbit_mode: orbit,
            orbit_hint: {
                current: this.kernel.sync_orbit,
                suggested: Math.min(1, this.kernel.sync_orbit + 0.05)
            }
        };
    },

    // Status colors
    statusColors: {
        urgent: '#ff3366',
        warning: '#ff8800',
        opportunity: '#00ff88',
        stable: '#4488ff'
    },

    // Action templates
    actionTemplates: {
        teacher: [
            { id: 'retain', icon: '🤝', name: '리텐션 보너스', cost: 2000000, effects: { sync: +0.15, churn: -0.3, roi: 340 } },
            { id: 'training', icon: '📚', name: '역량 강화 교육', cost: 500000, effects: { sync: +0.1, quality: +0.2, roi: 280 } },
            { id: 'promote', icon: '⬆️', name: '직급 승진', cost: 3000000, effects: { sync: +0.25, loyalty: +0.4, roi: 420 } },
            { id: 'workload', icon: '⚖️', name: '업무 조정', cost: 0, effects: { sync: +0.08, stress: -0.2, roi: 150 } }
        ],
        parent: [
            { id: 'discount', icon: '🏷️', name: '할인 프로모션', cost: 300000, effects: { sync: +0.12, ltv: +0.15, roi: 210 } },
            { id: 'consult', icon: '💬', name: '1:1 상담', cost: 50000, effects: { sync: +0.18, satisfaction: +0.25, roi: 380 } },
            { id: 'upsell', icon: '📈', name: '프리미엄 제안', cost: 100000, effects: { revenue: +500000, sync: +0.05, roi: 500 } },
            { id: 'loyalty', icon: '💎', name: 'VIP 전환', cost: 200000, effects: { sync: +0.2, referral: +0.3, roi: 350 } }
        ]
    },

    // Data
    entities: [],
    connections: [],
    selectedEntity: null,
    selectedAction: null,

    // Initialize
    init() {
        this.loadKernel();
        this.loadFromStorage();
        if (this.entities.length === 0) {
            this.generateEntities();
            this.saveToStorage();
        }
        this.updateNavStats();
    },

    // Generate entities
    generateEntities() {
        this.entities = [];
        
        const teacherNames = ['김영희', '이철수', '박지민', '최수연', '정민호', '강서현',
                              '윤재영', '장미경', '한소희', '오승우', '임하늘', '배준서'];
        
        for (let i = 0; i < 12; i++) {
            const sync = 0.4 + Math.random() * 0.55;
            const money = 15000000 + Math.random() * 25000000;
            const urgency = 1 - sync + Math.random() * 0.2;
            
            let status = 'stable';
            if (sync < 0.5) status = 'urgent';
            else if (sync < 0.65) status = 'warning';
            else if (sync > 0.85) status = 'opportunity';
            
            this.entities.push({
                id: `teacher_${i}`,
                name: teacherNames[i],
                type: 'teacher',
                emoji: '👨‍🏫',
                money: money,
                sync: sync,
                urgency: Math.min(1, urgency),
                status: status,
                history: this.generateHistory(money),
                forecast: this.generateForecast(money, sync),
                vitalData: this.generateVitalData(),
                appliedActions: []
            });
        }

        const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
        const firstNames = ['준', '서', '민', '지', '수', '현', '영', '호', '경', '희'];
        
        for (let i = 0; i < 50; i++) {
            const sync = 0.3 + Math.random() * 0.65;
            const money = 1000000 + Math.random() * 4000000;
            const urgency = (1 - sync) * 0.8 + Math.random() * 0.3;
            
            let status = 'stable';
            if (sync < 0.4) status = 'urgent';
            else if (sync < 0.55) status = 'warning';
            else if (sync > 0.8) status = 'opportunity';
            
            this.entities.push({
                id: `parent_${i}`,
                name: `${surnames[i % 10]}${firstNames[Math.floor(i / 10) % 10]} 학부모`,
                type: 'parent',
                emoji: '👪',
                money: money,
                sync: sync,
                urgency: Math.min(1, urgency),
                status: status,
                history: this.generateHistory(money),
                forecast: this.generateForecast(money, sync),
                vitalData: this.generateVitalData(),
                appliedActions: []
            });
        }

        this.generateConnections();
    },

    generateHistory(currentMoney) {
        const history = [];
        let value = currentMoney * 0.7;
        for (let y = -3; y <= 0; y++) {
            value = value * (1 + Math.random() * 0.15);
            history.push({ year: 2026 + y, value: value });
        }
        return history;
    },

    generateForecast(currentMoney, sync) {
        const forecast = [];
        let value = currentMoney;
        for (let y = 1; y <= 3; y++) {
            const growth = sync > 0.7 ? 0.15 : sync > 0.5 ? 0.05 : -0.1;
            value = value * (1 + growth + (Math.random() - 0.5) * 0.1);
            forecast.push({ year: 2026 + y, value: value });
        }
        return forecast;
    },

    generateVitalData() {
        return Array.from({ length: 30 }, () => Math.random() * 0.5 + 0.25);
    },

    generateConnections() {
        this.connections = [];
        for (let i = 0; i < 30; i++) {
            const from = this.entities[Math.floor(Math.random() * this.entities.length)];
            const to = this.entities[Math.floor(Math.random() * this.entities.length)];
            if (from.id !== to.id) {
                this.connections.push({
                    from: from.id,
                    to: to.id,
                    strength: Math.random()
                });
            }
        }
    },

    // Priority calculation
    getPriority(entity) {
        const sorted = [...this.entities].sort((a, b) => {
            const scoreA = a.urgency * a.money;
            const scoreB = b.urgency * b.money;
            return scoreB - scoreA;
        });
        return sorted.findIndex(e => e.id === entity.id) + 1;
    },

    // Get top recommendations
    getTopRecommendations(count = 3) {
        const scored = this.entities.map(e => ({
            entity: e,
            score: e.urgency * e.money * (e.status === 'urgent' ? 2 : e.status === 'warning' ? 1.5 : 1),
            bestAction: this.actionTemplates[e.type]?.sort((a, b) => b.effects.roi - a.effects.roi)[0]
        })).sort((a, b) => b.score - a.score);

        return scored.slice(0, count);
    },

    // Apply action
    applyAction(entityId, actionId) {
        const entity = this.entities.find(e => e.id === entityId);
        if (!entity) return false;

        const actions = this.actionTemplates[entity.type];
        const action = actions?.find(a => a.id === actionId);
        if (!action) return false;

        Object.entries(action.effects).forEach(([key, val]) => {
            if (key === 'sync') entity.sync = Math.min(1, entity.sync + val);
            if (key === 'churn') entity.urgency = Math.max(0, entity.urgency + val);
        });

        if (entity.sync > 0.8) entity.status = 'opportunity';
        else if (entity.sync > 0.65) entity.status = 'stable';
        else if (entity.sync > 0.5) entity.status = 'warning';
        else entity.status = 'urgent';

        entity.forecast = this.generateForecast(entity.money, entity.sync);
        entity.vitalData = this.generateVitalData();
        
        entity.appliedActions.push({
            actionId: actionId,
            actionName: action.name,
            cost: action.cost,
            timestamp: new Date().toISOString()
        });

        this.saveToStorage();
        this.updateNavStats();
        return true;
    },

    // Storage
    saveToStorage() {
        localStorage.setItem('autus_entities', JSON.stringify(this.entities));
        localStorage.setItem('autus_connections', JSON.stringify(this.connections));
    },

    loadFromStorage() {
        const entities = localStorage.getItem('autus_entities');
        const connections = localStorage.getItem('autus_connections');
        
        if (entities) this.entities = JSON.parse(entities);
        if (connections) this.connections = JSON.parse(connections);
    },

    resetData() {
        localStorage.removeItem('autus_entities');
        localStorage.removeItem('autus_connections');
        this.generateEntities();
        this.saveToStorage();
        this.updateNavStats();
    },

    // Stats
    getStats() {
        return {
            urgent: this.entities.filter(e => e.status === 'urgent').length,
            warning: this.entities.filter(e => e.status === 'warning').length,
            opportunity: this.entities.filter(e => e.status === 'opportunity').length,
            stable: this.entities.filter(e => e.status === 'stable').length,
            total: this.entities.length,
            totalValue: this.entities.reduce((sum, e) => sum + e.money, 0)
        };
    },

    updateNavStats() {
        const stats = this.getStats();
        
        const urgentEl = document.getElementById('navUrgent');
        const warningEl = document.getElementById('navWarning');
        const opportunityEl = document.getElementById('navOpportunity');
        const totalEl = document.getElementById('navTotal');

        if (urgentEl) urgentEl.textContent = stats.urgent;
        if (warningEl) warningEl.textContent = stats.warning;
        if (opportunityEl) opportunityEl.textContent = stats.opportunity;
        if (totalEl) totalEl.textContent = '₩' + Math.round(stats.totalValue / 1000000) + 'M';
    },

    // Utilities
    formatMoney(value) {
        if (value >= 1000000) return '₩' + (value / 1000000).toFixed(1) + 'M';
        if (value >= 10000) return '₩' + (value / 10000).toFixed(0) + '만';
        return '₩' + value.toLocaleString();
    },

    formatPercent(value) {
        return Math.round(value * 100) + '%';
    }
};

// Navigation HTML generator
function generateNav(activePage) {
    const pages = [
        { id: 'index', name: 'Dashboard', icon: '◈', href: 'app.html' },
        { id: 'matrix', name: 'Matrix', icon: '◉', href: 'matrix.html' },
        { id: 'scanner', name: 'Scanner', icon: '◎', href: 'scanner.html' },
        { id: 'timeline', name: 'Timeline', icon: '◇', href: 'timeline.html' },
        { id: 'solutions', name: 'Solutions', icon: '◆', href: 'solutions.html' },
        { id: 'solar', name: 'Solar HQ', icon: '🌐', href: 'solar.html' }
    ];

    return `
        <header class="nav-header">
            <a href="index.html" class="logo">
                <div class="logo-icon">A</div>
                <span class="logo-text">온리쌤</span>
            </a>
            
            <nav class="nav-links">
                ${pages.map(p => `
                    <a href="${p.href}" class="nav-link ${activePage === p.id ? 'active' : ''}">
                        <span class="nav-link-icon">${p.icon}</span>
                        ${p.name}
                    </a>
                `).join('')}
            </nav>

            <div class="nav-stats">
                <div class="nav-stat">
                    <div class="nav-stat-value text-urgent" id="navUrgent">-</div>
                    <div class="nav-stat-label">Urgent</div>
                </div>
                <div class="nav-stat">
                    <div class="nav-stat-value text-warning" id="navWarning">-</div>
                    <div class="nav-stat-label">Warning</div>
                </div>
                <div class="nav-stat">
                    <div class="nav-stat-value text-opportunity" id="navOpportunity">-</div>
                    <div class="nav-stat-label">Opportunity</div>
                </div>
                <div class="nav-stat">
                    <div class="nav-stat-value text-cyan" id="navTotal">-</div>
                    <div class="nav-stat-label">Total</div>
                </div>
            </div>
        </header>
    `;
}

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    AUTUS.init();
});
