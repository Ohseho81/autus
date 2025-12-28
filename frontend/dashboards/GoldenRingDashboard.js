// ================================================================
// AUTUS GOLDEN RING DASHBOARD
// Elite Club 3석 관리 + 대기자 현황 + 펄스 스케줄러 UI
// ================================================================

import { WaitlistGravityField } from '../engines/WaitlistGravityField.js';

// ================================================================
// DASHBOARD STATE
// ================================================================

export const GoldenRingDashboard = {
    gravityField: null,
    refreshInterval: null,
    
    // ================================================================
    // INITIALIZATION
    // ================================================================
    
    init() {
        this.gravityField = Object.create(WaitlistGravityField).init();
        return this;
    },
    
    // ================================================================
    // RENDER FUNCTIONS
    // ================================================================
    
    /**
     * 전체 대시보드 HTML 생성
     */
    render() {
        const status = this.gravityField.getGravityFieldStatus();
        const physicsMap = this.gravityField.exportForPhysicsMap();
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTUS Golden Ring Dashboard</title>
    <style>
        ${this._getStyles()}
    </style>
</head>
<body>
    <div class="dashboard">
        <!-- HEADER -->
        <header class="header">
            <div class="logo">
                <span class="icon">👑</span>
                <h1>GOLDEN RING</h1>
                <span class="badge ${status.goldenRingSealed ? 'sealed' : 'open'}">
                    ${status.goldenRingSealed ? '🔒 SEALED' : '🔓 OPEN'}
                </span>
            </div>
            <div class="header-stats">
                <div class="stat">
                    <span class="value">${status.goldenRingCapacity.used}/${status.goldenRingCapacity.total}</span>
                    <span class="label">골든 링 현황</span>
                </div>
                <div class="stat">
                    <span class="value">${status.waitlistCount}</span>
                    <span class="label">대기자 수</span>
                </div>
                <div class="stat">
                    <span class="value">${status.pendingPulses}</span>
                    <span class="label">대기 펄스</span>
                </div>
            </div>
        </header>
        
        <!-- MAIN CONTENT -->
        <main class="main-content">
            <!-- GOLDEN RING SECTION -->
            <section class="golden-ring-section">
                <h2>🏆 Elite Club 슬롯 현황</h2>
                <div class="slots-container">
                    ${this._renderGoldenRingSlots(status)}
                </div>
            </section>
            
            <!-- WAITLIST SECTION -->
            <section class="waitlist-section">
                <h2>⏳ 대기자 명단 (중력장)</h2>
                <div class="waitlist-container">
                    ${this._renderWaitlist(physicsMap)}
                </div>
            </section>
            
            <!-- PULSE SCHEDULER -->
            <section class="pulse-section">
                <h2>📡 Gravitational Pulse 스케줄러</h2>
                <div class="pulse-container">
                    ${this._renderPulseScheduler()}
                </div>
            </section>
            
            <!-- ORBIT VISUALIZATION -->
            <section class="orbit-section">
                <h2>🌌 중력장 시각화</h2>
                <div class="orbit-container">
                    ${this._renderOrbitVisualization(physicsMap)}
                </div>
            </section>
            
            <!-- ACTIONS -->
            <section class="actions-section">
                <h2>⚡ 빠른 액션</h2>
                <div class="actions-container">
                    ${this._renderQuickActions()}
                </div>
            </section>
        </main>
        
        <!-- FOOTER -->
        <footer class="footer">
            <p>AUTUS Golden Ring Dashboard v2.0 | Last updated: ${new Date().toLocaleString('ko-KR')}</p>
        </footer>
    </div>
    
    <script>
        ${this._getScripts()}
    </script>
</body>
</html>`;
    },
    
    /**
     * 골든 링 슬롯 렌더링
     */
    _renderGoldenRingSlots(status) {
        const slots = Object.values(this.gravityField.goldenRing);
        let html = '';
        
        for (let i = 0; i < 3; i++) {
            const slot = slots[i];
            
            if (slot && slot.memberId) {
                html += `
                <div class="slot occupied">
                    <div class="slot-header">
                        <span class="slot-number">#${i + 1}</span>
                        <span class="slot-status">🔒 OCCUPIED</span>
                    </div>
                    <div class="slot-content">
                        <div class="member-info">
                            <strong>${slot.memberId}</strong>
                            <p>입장: ${new Date(slot.entryDate).toLocaleDateString('ko-KR')}</p>
                            <p>가치: ₩${(slot.lifetimeValue || 0).toLocaleString()}</p>
                        </div>
                        <div class="premium-tier tier-${slot.premiumTier || 1}">
                            TIER ${slot.premiumTier || 1}
                        </div>
                    </div>
                    <div class="slot-actions">
                        <button onclick="viewMemberDetail('${slot.memberId}')">상세보기</button>
                    </div>
                </div>`;
            } else {
                html += `
                <div class="slot available">
                    <div class="slot-header">
                        <span class="slot-number">#${i + 1}</span>
                        <span class="slot-status">✨ AVAILABLE</span>
                    </div>
                    <div class="slot-content">
                        <div class="empty-slot">
                            <span class="icon">👑</span>
                            <p>대기자 초대 가능</p>
                        </div>
                    </div>
                    <div class="slot-actions">
                        <button onclick="inviteNextInQueue(${i})" class="primary">다음 대기자 초대</button>
                    </div>
                </div>`;
            }
        }
        
        return html;
    },
    
    /**
     * 대기자 명단 렌더링
     */
    _renderWaitlist(physicsMap) {
        const waitlist = physicsMap.nodes.sort((a, b) => b.priority - a.priority);
        
        if (waitlist.length === 0) {
            return `
            <div class="empty-waitlist">
                <span class="icon">📭</span>
                <p>현재 대기자가 없습니다</p>
                <button onclick="openRegistrationForm()" class="primary">새 관심 등록</button>
            </div>`;
        }
        
        let html = '<div class="waitlist-table">';
        html += `
        <div class="table-header">
            <span>순위</span>
            <span>학생명</span>
            <span>우선순위</span>
            <span>진단</span>
            <span>예치금</span>
            <span>예상 입장</span>
            <span>액션</span>
        </div>`;
        
        waitlist.forEach((node, index) => {
            const priorityClass = node.priority > 70 ? 'high' : node.priority > 40 ? 'medium' : 'low';
            
            html += `
            <div class="table-row priority-${priorityClass}">
                <span class="rank">${index + 1}</span>
                <span class="name">${node.id}</span>
                <span class="priority">
                    <div class="priority-bar">
                        <div class="priority-fill" style="width: ${node.priority}%"></div>
                    </div>
                    <span>${node.priority.toFixed(0)}%</span>
                </span>
                <span class="diagnostic ${node.diagnosticSubmitted ? 'done' : 'pending'}">
                    ${node.diagnosticSubmitted ? '✅ 완료' : '⏳ 대기'}
                </span>
                <span class="deposit ${node.depositPaid ? 'paid' : 'unpaid'}">
                    ${node.depositPaid ? '₩' + (node.depositAmount || 0).toLocaleString() : '미납'}
                </span>
                <span class="eta">${node.estimatedEntry || '-'}</span>
                <span class="actions">
                    <button onclick="sendPulse('${node.id}')" title="펄스 발송">📡</button>
                    <button onclick="viewDetail('${node.id}')" title="상세보기">👁️</button>
                </span>
            </div>`;
        });
        
        html += '</div>';
        return html;
    },
    
    /**
     * 펄스 스케줄러 렌더링
     */
    _renderPulseScheduler() {
        const pulseQueue = this.gravityField.pulseQueue;
        const pulseHistory = this.gravityField.pulseHistory.slice(-5);
        
        return `
        <div class="pulse-scheduler">
            <!-- 새 펄스 생성 -->
            <div class="new-pulse">
                <h3>🆕 새 펄스 생성</h3>
                <form onsubmit="createPulse(event)">
                    <div class="form-group">
                        <label>펄스 타입</label>
                        <select id="pulseType">
                            <option value="SUCCESS_STORY">📖 성공 스토리</option>
                            <option value="SCARCITY_ALERT">⚡ 희소성 알림</option>
                            <option value="EXCLUSIVE_CONTENT">🎁 독점 콘텐츠</option>
                            <option value="PROGRESS_UPDATE">📊 진행 상황</option>
                            <option value="ENGAGEMENT_BOOST">🚀 참여 부스트</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>제목</label>
                        <input type="text" id="pulseSubject" placeholder="펄스 제목..." required>
                    </div>
                    <div class="form-group">
                        <label>내용</label>
                        <textarea id="pulseContent" placeholder="펄스 내용..." rows="3" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>타겟 궤도</label>
                        <select id="targetOrbit">
                            <option value="ALL">전체</option>
                            <option value="OUTER">외곽 궤도</option>
                            <option value="MIDDLE">중간 궤도</option>
                            <option value="INNER">내곽 궤도</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>예약 시간 (선택)</label>
                        <input type="datetime-local" id="scheduledAt">
                    </div>
                    <button type="submit" class="primary">📡 펄스 예약</button>
                </form>
            </div>
            
            <!-- 대기 중인 펄스 -->
            <div class="pending-pulses">
                <h3>⏰ 대기 중인 펄스 (${pulseQueue.length})</h3>
                <div class="pulse-list">
                    ${pulseQueue.length === 0 ? '<p class="empty">대기 중인 펄스 없음</p>' : 
                      pulseQueue.map((pulse, i) => `
                        <div class="pulse-item pending">
                            <span class="type">${this._getPulseIcon(pulse.type)}</span>
                            <span class="subject">${pulse.subject}</span>
                            <span class="target">→ ${pulse.targetOrbit}</span>
                            <span class="time">${pulse.scheduledAt ? new Date(pulse.scheduledAt).toLocaleString('ko-KR') : '즉시'}</span>
                            <button onclick="cancelPulse(${i})" class="danger">취소</button>
                        </div>
                      `).join('')}
                </div>
                <button onclick="executePulses()" class="primary full-width" ${pulseQueue.length === 0 ? 'disabled' : ''}>
                    🚀 모든 펄스 발송
                </button>
            </div>
            
            <!-- 펄스 히스토리 -->
            <div class="pulse-history">
                <h3>📜 최근 발송 내역</h3>
                <div class="pulse-list">
                    ${pulseHistory.length === 0 ? '<p class="empty">발송 내역 없음</p>' : 
                      pulseHistory.map(pulse => `
                        <div class="pulse-item sent">
                            <span class="type">${this._getPulseIcon(pulse.type)}</span>
                            <span class="subject">${pulse.subject}</span>
                            <span class="delivered">✅ ${pulse.deliveredCount || 0}명 전달</span>
                            <span class="time">${new Date(pulse.sentAt).toLocaleString('ko-KR')}</span>
                        </div>
                      `).join('')}
                </div>
            </div>
        </div>`;
    },
    
    /**
     * 궤도 시각화 렌더링
     */
    _renderOrbitVisualization(physicsMap) {
        return `
        <div class="orbit-visualization">
            <svg viewBox="0 0 400 400" class="orbit-svg">
                <!-- 배경 -->
                <defs>
                    <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#0a0a14;stop-opacity:1" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <rect width="400" height="400" fill="url(#bgGradient)"/>
                
                <!-- 궤도 링 -->
                <circle cx="200" cy="200" r="180" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="5,5"/>
                <circle cx="200" cy="200" r="120" fill="none" stroke="#444" stroke-width="1" stroke-dasharray="5,5"/>
                <circle cx="200" cy="200" r="60" fill="none" stroke="#ffd700" stroke-width="2" filter="url(#glow)"/>
                
                <!-- 골든 링 중심 -->
                <circle cx="200" cy="200" r="40" fill="#ffd700" opacity="0.2"/>
                <text x="200" y="200" text-anchor="middle" dominant-baseline="middle" fill="#ffd700" font-size="12" font-weight="bold">
                    GOLDEN RING
                </text>
                <text x="200" y="215" text-anchor="middle" fill="#ffd700" font-size="10">
                    ${physicsMap.goldenRing.used}/${physicsMap.goldenRing.total}
                </text>
                
                <!-- 대기자 노드들 -->
                ${this._renderOrbitNodes(physicsMap.nodes)}
                
                <!-- 레전드 -->
                <g transform="translate(10, 350)">
                    <circle cx="5" cy="5" r="4" fill="#4ade80"/>
                    <text x="15" y="9" fill="#888" font-size="8">고우선순위</text>
                    <circle cx="80" cy="5" r="4" fill="#fbbf24"/>
                    <text x="90" y="9" fill="#888" font-size="8">중간</text>
                    <circle cx="130" cy="5" r="4" fill="#ef4444"/>
                    <text x="140" y="9" fill="#888" font-size="8">저우선순위</text>
                </g>
            </svg>
            
            <div class="orbit-stats">
                <div class="stat">
                    <span class="value">${physicsMap.nodes.filter(n => n.orbit === 'INNER').length}</span>
                    <span class="label">내곽 궤도</span>
                </div>
                <div class="stat">
                    <span class="value">${physicsMap.nodes.filter(n => n.orbit === 'MIDDLE').length}</span>
                    <span class="label">중간 궤도</span>
                </div>
                <div class="stat">
                    <span class="value">${physicsMap.nodes.filter(n => n.orbit === 'OUTER').length}</span>
                    <span class="label">외곽 궤도</span>
                </div>
            </div>
        </div>`;
    },
    
    /**
     * 궤도 노드 SVG 생성
     */
    _renderOrbitNodes(nodes) {
        let svg = '';
        
        nodes.forEach((node, index) => {
            const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
            let radius;
            
            switch (node.orbit) {
                case 'INNER': radius = 80; break;
                case 'MIDDLE': radius = 130; break;
                default: radius = 170;
            }
            
            const x = 200 + Math.cos(angle) * radius;
            const y = 200 + Math.sin(angle) * radius;
            
            const color = node.priority > 70 ? '#4ade80' : node.priority > 40 ? '#fbbf24' : '#ef4444';
            const size = 4 + (node.priority / 20);
            
            svg += `
            <g class="orbit-node" data-id="${node.id}">
                <circle cx="${x}" cy="${y}" r="${size}" fill="${color}" opacity="0.8" filter="url(#glow)"/>
                <title>${node.id}: 우선순위 ${node.priority.toFixed(0)}%</title>
            </g>`;
        });
        
        return svg;
    },
    
    /**
     * 빠른 액션 렌더링
     */
    _renderQuickActions() {
        return `
        <div class="quick-actions">
            <button onclick="generateSuccessStoryPulse()" class="action-btn">
                <span class="icon">📖</span>
                <span class="label">성공 스토리 발송</span>
            </button>
            <button onclick="generateScarcityPulse()" class="action-btn warning">
                <span class="icon">⚡</span>
                <span class="label">희소성 알림 발송</span>
            </button>
            <button onclick="sealGoldenRing()" class="action-btn danger">
                <span class="icon">🔒</span>
                <span class="label">골든 링 봉인</span>
            </button>
            <button onclick="notifyNextInQueue()" class="action-btn success">
                <span class="icon">📨</span>
                <span class="label">다음 대기자 알림</span>
            </button>
            <button onclick="exportReport()" class="action-btn">
                <span class="icon">📊</span>
                <span class="label">리포트 내보내기</span>
            </button>
            <button onclick="refreshDashboard()" class="action-btn">
                <span class="icon">🔄</span>
                <span class="label">새로고침</span>
            </button>
        </div>`;
    },
    
    /**
     * 펄스 타입 아이콘
     */
    _getPulseIcon(type) {
        const icons = {
            'SUCCESS_STORY': '📖',
            'SCARCITY_ALERT': '⚡',
            'EXCLUSIVE_CONTENT': '🎁',
            'PROGRESS_UPDATE': '📊',
            'ENGAGEMENT_BOOST': '🚀'
        };
        return icons[type] || '📡';
    },
    
    // ================================================================
    // STYLES
    // ================================================================
    
    _getStyles() {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a14 0%, #1a1a2e 100%);
            color: #fff;
            min-height: 100vh;
        }
        
        .dashboard {
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
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid #ffd700;
            border-radius: 16px;
            margin-bottom: 30px;
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo .icon {
            font-size: 40px;
        }
        
        .logo h1 {
            color: #ffd700;
            font-size: 28px;
        }
        
        .badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }
        
        .badge.sealed {
            background: #ef4444;
            color: white;
        }
        
        .badge.open {
            background: #4ade80;
            color: #0a0a14;
        }
        
        .header-stats {
            display: flex;
            gap: 30px;
        }
        
        .header-stats .stat {
            text-align: center;
        }
        
        .header-stats .value {
            display: block;
            font-size: 32px;
            font-weight: bold;
            color: #ffd700;
        }
        
        .header-stats .label {
            color: #888;
            font-size: 12px;
        }
        
        /* Main Content */
        .main-content {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        
        section {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 20px;
        }
        
        section h2 {
            color: #ffd700;
            margin-bottom: 20px;
            font-size: 18px;
        }
        
        /* Golden Ring Slots */
        .golden-ring-section {
            grid-column: span 2;
        }
        
        .slots-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        
        .slot {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            padding: 20px;
            border: 2px solid transparent;
            transition: all 0.3s;
        }
        
        .slot.occupied {
            border-color: #ffd700;
        }
        
        .slot.available {
            border-color: #4ade80;
            border-style: dashed;
        }
        
        .slot-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        
        .slot-number {
            font-size: 24px;
            font-weight: bold;
            color: #ffd700;
        }
        
        .slot-status {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
        }
        
        .slot-content {
            margin-bottom: 15px;
        }
        
        .member-info strong {
            font-size: 18px;
            color: #fff;
        }
        
        .member-info p {
            color: #888;
            font-size: 12px;
            margin-top: 5px;
        }
        
        .premium-tier {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 10px;
        }
        
        .premium-tier.tier-1 { background: #cd7f32; }
        .premium-tier.tier-2 { background: #c0c0c0; color: #000; }
        .premium-tier.tier-3 { background: #ffd700; color: #000; }
        
        .empty-slot {
            text-align: center;
            padding: 30px;
        }
        
        .empty-slot .icon {
            font-size: 48px;
            opacity: 0.5;
        }
        
        /* Buttons */
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        
        button:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        button.primary {
            background: #ffd700;
            color: #0a0a14;
        }
        
        button.primary:hover {
            background: #ffed4a;
        }
        
        button.danger {
            background: #ef4444;
        }
        
        button.success {
            background: #4ade80;
            color: #0a0a14;
        }
        
        button.warning {
            background: #fbbf24;
            color: #0a0a14;
        }
        
        button.full-width {
            width: 100%;
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Waitlist Table */
        .waitlist-table {
            overflow-x: auto;
        }
        
        .table-header, .table-row {
            display: grid;
            grid-template-columns: 50px 1fr 150px 80px 100px 100px 80px;
            gap: 10px;
            padding: 12px;
            align-items: center;
        }
        
        .table-header {
            background: rgba(255, 215, 0, 0.1);
            border-radius: 8px;
            font-weight: bold;
            color: #ffd700;
            font-size: 12px;
        }
        
        .table-row {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .table-row:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        .table-row.priority-high {
            border-left: 3px solid #4ade80;
        }
        
        .table-row.priority-medium {
            border-left: 3px solid #fbbf24;
        }
        
        .table-row.priority-low {
            border-left: 3px solid #ef4444;
        }
        
        .rank {
            font-size: 18px;
            font-weight: bold;
            color: #ffd700;
        }
        
        .priority-bar {
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .priority-fill {
            height: 100%;
            background: linear-gradient(90deg, #ef4444, #fbbf24, #4ade80);
            transition: width 0.3s;
        }
        
        .diagnostic.done { color: #4ade80; }
        .diagnostic.pending { color: #fbbf24; }
        .deposit.paid { color: #4ade80; }
        .deposit.unpaid { color: #ef4444; }
        
        /* Pulse Scheduler */
        .pulse-scheduler {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .new-pulse {
            grid-column: span 2;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #888;
            font-size: 12px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: #fff;
            font-size: 14px;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #ffd700;
        }
        
        .pulse-list {
            max-height: 200px;
            overflow-y: auto;
        }
        
        .pulse-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .pulse-item .type {
            font-size: 20px;
        }
        
        .pulse-item .subject {
            flex: 1;
        }
        
        .pulse-item .target,
        .pulse-item .time,
        .pulse-item .delivered {
            font-size: 12px;
            color: #888;
        }
        
        .empty {
            text-align: center;
            color: #666;
            padding: 20px;
        }
        
        /* Orbit Visualization */
        .orbit-visualization {
            display: flex;
            gap: 20px;
            align-items: center;
        }
        
        .orbit-svg {
            width: 400px;
            height: 400px;
            border-radius: 12px;
        }
        
        .orbit-stats {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .orbit-stats .stat {
            text-align: center;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
        }
        
        .orbit-stats .value {
            display: block;
            font-size: 36px;
            font-weight: bold;
            color: #ffd700;
        }
        
        .orbit-stats .label {
            color: #888;
            font-size: 12px;
        }
        
        /* Quick Actions */
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        
        .action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
        }
        
        .action-btn .icon {
            font-size: 32px;
        }
        
        .action-btn .label {
            font-size: 12px;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
        }
        
        /* Empty State */
        .empty-waitlist {
            text-align: center;
            padding: 40px;
        }
        
        .empty-waitlist .icon {
            font-size: 64px;
            opacity: 0.5;
        }
        
        /* Responsive */
        @media (max-width: 1200px) {
            .main-content {
                grid-template-columns: 1fr;
            }
            
            .golden-ring-section {
                grid-column: span 1;
            }
            
            .slots-container {
                grid-template-columns: 1fr;
            }
            
            .orbit-visualization {
                flex-direction: column;
            }
        }
        `;
    },
    
    // ================================================================
    // SCRIPTS
    // ================================================================
    
    _getScripts() {
        return `
        // Dashboard Functions
        function createPulse(event) {
            event.preventDefault();
            const type = document.getElementById('pulseType').value;
            const subject = document.getElementById('pulseSubject').value;
            const content = document.getElementById('pulseContent').value;
            const targetOrbit = document.getElementById('targetOrbit').value;
            const scheduledAt = document.getElementById('scheduledAt').value;
            
            console.log('Creating pulse:', { type, subject, content, targetOrbit, scheduledAt });
            alert('펄스가 예약되었습니다!');
            
            // Reset form
            event.target.reset();
        }
        
        function executePulses() {
            if (confirm('모든 대기 중인 펄스를 발송하시겠습니까?')) {
                console.log('Executing all pulses');
                alert('모든 펄스가 발송되었습니다!');
                refreshDashboard();
            }
        }
        
        function cancelPulse(index) {
            if (confirm('이 펄스를 취소하시겠습니까?')) {
                console.log('Cancelling pulse:', index);
                refreshDashboard();
            }
        }
        
        function generateSuccessStoryPulse() {
            const eliteMember = prompt('성공 스토리 주인공 이름:');
            const achievement = prompt('달성한 성과:');
            if (eliteMember && achievement) {
                console.log('Generating success story:', { eliteMember, achievement });
                alert('성공 스토리 펄스가 생성되었습니다!');
            }
        }
        
        function generateScarcityPulse() {
            const slots = prompt('남은 슬롯 수:');
            if (slots) {
                console.log('Generating scarcity pulse:', { slots });
                alert('희소성 알림 펄스가 생성되었습니다!');
            }
        }
        
        function sealGoldenRing() {
            if (confirm('⚠️ 골든 링을 봉인하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                console.log('Sealing golden ring');
                alert('🔒 골든 링이 봉인되었습니다!');
                refreshDashboard();
            }
        }
        
        function notifyNextInQueue() {
            console.log('Notifying next in queue');
            alert('📨 다음 대기자에게 알림이 발송되었습니다!');
        }
        
        function inviteNextInQueue(slotIndex) {
            console.log('Inviting to slot:', slotIndex);
            alert('📨 대기자를 슬롯 #' + (slotIndex + 1) + '에 초대했습니다!');
            refreshDashboard();
        }
        
        function sendPulse(nodeId) {
            console.log('Sending pulse to:', nodeId);
            alert('📡 ' + nodeId + '에게 펄스를 발송했습니다!');
        }
        
        function viewDetail(nodeId) {
            console.log('Viewing detail:', nodeId);
            alert('상세 정보: ' + nodeId);
        }
        
        function viewMemberDetail(memberId) {
            console.log('Viewing member detail:', memberId);
            alert('회원 상세: ' + memberId);
        }
        
        function openRegistrationForm() {
            alert('관심 등록 폼을 엽니다.');
        }
        
        function exportReport() {
            console.log('Exporting report');
            alert('📊 리포트가 다운로드됩니다!');
        }
        
        function refreshDashboard() {
            location.reload();
        }
        
        // Auto-refresh every 30 seconds
        // setInterval(refreshDashboard, 30000);
        
        console.log('🏆 Golden Ring Dashboard Loaded');
        `;
    }
};

// ================================================================
// TEST
// ================================================================

export function testGoldenRingDashboard() {
    console.log('Testing Golden Ring Dashboard...');
    
    const dashboard = Object.create(GoldenRingDashboard).init();
    
    // 테스트 데이터 추가
    dashboard.gravityField.registerInterest('김부모', '김학생', 'kim@test.com');
    dashboard.gravityField.registerInterest('이부모', '이학생', 'lee@test.com');
    dashboard.gravityField.registerInterest('박부모', '박학생', 'park@test.com');
    
    const html = dashboard.render();
    
    console.log('✅ Dashboard HTML generated:', html.length, 'characters');
    
    return { dashboard, html };
}

export default GoldenRingDashboard;
