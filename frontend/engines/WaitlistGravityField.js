// ================================================================
// AUTUS WAITLIST GRAVITY FIELD (BEZOS EDITION)
// 대기자 중력장: 사건의 지표면(Event Horizon) 구현
//
// 기능:
// 1. Waitlist Horizon - 대기자 명단 중력장
// 2. Pre-Diagnostic Portal - 사전 진단 포털
// 3. Queue Priority Algorithm - 우선순위 알고리즘
// 4. Gravitational Pulse - 주기적 에너지 펄스
//
// 물리적 원리:
// - "들어갈 수 없다"는 사실이 욕망을 극대화
// - 대기 중에도 데이터 수집으로 심리적 동기화
// - Event Horizon: 한번 진입하면 빠져나갈 수 없는 경계
//
// Version: 2.0.0
// Status: LOCKED
// ================================================================

// ================================================================
// ENUMS
// ================================================================

export const WaitlistStatus = {
    PENDING_DIAGNOSTIC: 'PENDING_DIAGNOSTIC',
    DIAGNOSTIC_COMPLETE: 'DIAGNOSTIC_COMPLETE',
    IN_QUEUE: 'IN_QUEUE',
    NOTIFIED: 'NOTIFIED',
    CONVERTED: 'CONVERTED',
    EXPIRED: 'EXPIRED'
};

export const OrbitTier = {
    OUTER: 'OUTER',
    WARM_UP: 'WARM_UP',
    INNER: 'INNER',
    PRIORITY: 'PRIORITY',
    GOLDEN: 'GOLDEN'
};

export const PulseType = {
    SUCCESS_STORY: 'SUCCESS_STORY',
    DATA_INSIGHT: 'DATA_INSIGHT',
    SCARCITY_ALERT: 'SCARCITY_ALERT',
    EXCLUSIVE_PREVIEW: 'EXCLUSIVE_PREVIEW'
};

// ================================================================
// CONSTANTS
// ================================================================

export const WAITLIST_CONFIG = {
    maxWaitlistCapacity: 20,
    depositAmount: 300000,
    pulseIntervalDays: 14,
    notificationWindowHours: 24,
    priorityWeights: {
        diagnosticScore: 0.35,
        engagementRate: 0.25,
        depositPaid: 0.20,
        waitTime: 0.10,
        referralBonus: 0.10
    }
};

export const GOLDEN_RING_CONFIG = {
    totalSlots: 5,
    monthlyRotation: 1,
    priceMultiplier: 2.5
};

// ================================================================
// PRE-DIAGNOSTIC DATA
// ================================================================

export class PreDiagnosticData {
    constructor(data) {
        this.studentId = data.studentId;
        this.currentGrade = data.currentGrade;
        this.studyHoursWeekly = data.studyHoursWeekly;
        this.focusSelfRating = data.focusSelfRating;
        this.exerciseHoursWeekly = data.exerciseHoursWeekly;
        this.sleepHoursDaily = data.sleepHoursDaily;
        this.energySelfRating = data.energySelfRating;
        this.stressLevel = data.stressLevel;
        this.motivationLevel = data.motivationLevel;
        this.targetSchool = data.targetSchool;
        this.targetTimelineMonths = data.targetTimelineMonths;
        this.submittedAt = data.submittedAt || new Date();
    }
    
    /**
     * 잠재력 점수 계산
     */
    calculatePotentialScore() {
        // 학습 잠재력 (30%)
        const studyScore = (this.studyHoursWeekly / 40) * 0.5 + 
                         (this.focusSelfRating / 10) * 0.5;
        
        // 신체 잠재력 (25%)
        const physicalScore = (this.exerciseHoursWeekly / 10) * 0.3 +
                             (this.sleepHoursDaily / 8) * 0.3 +
                             (this.energySelfRating / 10) * 0.4;
        
        // 심리 잠재력 (25%)
        const mentalScore = ((10 - this.stressLevel) / 10) * 0.5 +
                           (this.motivationLevel / 10) * 0.5;
        
        // 목표 명확성 (20%)
        let goalScore = this.targetSchool ? 0.8 : 0.4;
        if (this.targetTimelineMonths < 12) goalScore += 0.2;
        
        return (studyScore * 0.30 +
                physicalScore * 0.25 +
                mentalScore * 0.25 +
                goalScore * 0.20);
    }
}

// ================================================================
// WAITLIST NODE
// ================================================================

export class WaitlistNode {
    constructor(data) {
        this.id = data.id;
        this.parentName = data.parentName;
        this.studentName = data.studentName;
        this.contact = data.contact;
        
        this.status = data.status || WaitlistStatus.PENDING_DIAGNOSTIC;
        this.orbitTier = data.orbitTier || OrbitTier.OUTER;
        
        this.diagnostic = data.diagnostic || null;
        
        this.matchScore = data.matchScore || 0;
        this.priorityScore = data.priorityScore || 0;
        
        this.depositPaid = data.depositPaid || 0;
        this.depositDate = data.depositDate || null;
        
        this.registeredAt = data.registeredAt || new Date();
        this.lastPulseAt = data.lastPulseAt || null;
        this.notifiedAt = data.notifiedAt || null;
        this.expiresAt = data.expiresAt || null;
        
        this.pulsesReceived = data.pulsesReceived || 0;
        this.pulsesOpened = data.pulsesOpened || 0;
        this.engagementRate = data.engagementRate || 0;
    }
}

// ================================================================
// GRAVITATIONAL PULSE
// ================================================================

export class GravitationalPulse {
    constructor(data) {
        this.id = data.id;
        this.pulseType = data.pulseType;
        this.subject = data.subject;
        this.content = data.content;
        this.targetOrbit = data.targetOrbit;
        this.scheduledAt = data.scheduledAt;
        this.sentAt = data.sentAt || null;
        
        this.sentCount = data.sentCount || 0;
        this.openedCount = data.openedCount || 0;
        this.clickedCount = data.clickedCount || 0;
    }
}

// ================================================================
// GOLDEN RING SLOT
// ================================================================

export class GoldenRingSlot {
    constructor(slotId) {
        this.slotId = slotId;
        this.isOccupied = false;
        this.occupantId = null;
        this.occupiedAt = null;
        this.expectedVacancy = null;
    }
}

// ================================================================
// WAITLIST GRAVITY FIELD
// ================================================================

export const WaitlistGravityField = {
    waitlist: {},
    goldenRing: {},
    pulseQueue: [],
    pulseHistory: [],
    
    /**
     * 초기화
     */
    init() {
        this.waitlist = {};
        this.pulseQueue = [];
        this.pulseHistory = [];
        
        // 골든 링 슬롯 초기화
        this.goldenRing = {};
        for (let i = 0; i < GOLDEN_RING_CONFIG.totalSlots; i++) {
            const slotId = `GOLDEN_SLOT_${i + 1}`;
            this.goldenRing[slotId] = new GoldenRingSlot(slotId);
        }
        
        return this;
    },
    
    // ================================================================
    // PRE-DIAGNOSTIC PORTAL
    // ================================================================
    
    /**
     * 관심 등록 (Outer Orbit 진입)
     */
    registerInterest(parentName, studentName, contact) {
        const nodeId = `WL_${Date.now()}_${this._hashContact(contact)}`;
        
        const node = new WaitlistNode({
            id: nodeId,
            parentName,
            studentName,
            contact,
            status: WaitlistStatus.PENDING_DIAGNOSTIC,
            orbitTier: OrbitTier.OUTER,
            registeredAt: new Date()
        });
        
        this.waitlist[nodeId] = node;
        return node;
    },
    
    /**
     * 사전 진단 제출
     */
    submitDiagnostic(nodeId, diagnosticData) {
        const node = this.waitlist[nodeId];
        if (!node) return { success: false, error: 'Node not found' };
        
        const diagnostic = new PreDiagnosticData(diagnosticData);
        node.diagnostic = diagnostic;
        node.status = WaitlistStatus.DIAGNOSTIC_COMPLETE;
        node.orbitTier = OrbitTier.WARM_UP;
        
        const potential = diagnostic.calculatePotentialScore();
        node.matchScore = this._calculateMatchScore(diagnostic);
        node.priorityScore = potential * 0.5;
        
        return {
            success: true,
            nodeId,
            potentialScore: potential,
            matchScore: node.matchScore,
            orbitTier: node.orbitTier,
            message: this._generateDiagnosticFeedback(potential, node.matchScore)
        };
    },
    
    /**
     * 시스템 적합도 계산
     */
    _calculateMatchScore(diagnostic) {
        let score = 0.5;
        
        const highTargetSchools = ['의대', '서울대', '연세대', '고려대', '카이스트', '포항공대'];
        if (highTargetSchools.some(s => diagnostic.targetSchool?.includes(s))) {
            score += 0.2;
        }
        
        if (diagnostic.motivationLevel >= 8) score += 0.15;
        if (diagnostic.sleepHoursDaily >= 6 && diagnostic.sleepHoursDaily <= 8) score += 0.1;
        if (diagnostic.exerciseHoursWeekly >= 5) score += 0.05;
        
        return Math.min(score, 1.0);
    },
    
    /**
     * 진단 피드백 메시지 생성
     */
    _generateDiagnosticFeedback(potential, match) {
        if (potential >= 0.8 && match >= 0.7) {
            return '우수한 잠재력이 감지되었습니다. Elite Club 우선 대기 자격이 부여됩니다.';
        } else if (potential >= 0.6) {
            return '성장 가능성이 확인되었습니다. 데이터 기반 맞춤 관리가 효과적일 것입니다.';
        } else {
            return '기초 역량 강화가 선행되어야 합니다. 일반 프로그램을 먼저 권장드립니다.';
        }
    },
    
    // ================================================================
    // QUEUE MANAGEMENT
    // ================================================================
    
    /**
     * 보증금 납부 → Inner Orbit 진입
     */
    payDeposit(nodeId, amount) {
        const node = this.waitlist[nodeId];
        if (!node) return { success: false, error: 'Node not found' };
        if (node.status !== WaitlistStatus.DIAGNOSTIC_COMPLETE) {
            return { success: false, error: 'Diagnostic required first' };
        }
        
        node.depositPaid = amount;
        node.depositDate = new Date();
        node.status = WaitlistStatus.IN_QUEUE;
        node.orbitTier = OrbitTier.INNER;
        
        this._recalculatePriority(node);
        
        const queuePosition = this._getQueuePosition(nodeId);
        
        return {
            success: true,
            nodeId,
            depositPaid: amount,
            orbitTier: node.orbitTier,
            queuePosition,
            estimatedEntry: this._estimateEntryDate(queuePosition),
            perksUnlocked: [
                '월간 프리미엄 리포트 열람권',
                'Elite 멤버 성공 스토리 독점 공개',
                '진입 시 첫 달 20% 할인 보장'
            ]
        };
    },
    
    /**
     * 우선순위 점수 재계산
     */
    _recalculatePriority(node) {
        const weights = WAITLIST_CONFIG.priorityWeights;
        
        const diagnosticScore = node.matchScore || 0;
        const engagement = node.engagementRate;
        const depositFactor = node.depositPaid >= WAITLIST_CONFIG.depositAmount ? 1.0 : 0;
        
        const daysWaiting = (Date.now() - node.registeredAt.getTime()) / (1000 * 60 * 60 * 24);
        const waitFactor = Math.min(daysWaiting / 30, 1.0);
        
        const referralFactor = 0;
        
        node.priorityScore = (
            diagnosticScore * weights.diagnosticScore +
            engagement * weights.engagementRate +
            depositFactor * weights.depositPaid +
            waitFactor * weights.waitTime +
            referralFactor * weights.referralBonus
        );
        
        if (node.priorityScore >= 0.7 && node.depositPaid > 0) {
            node.orbitTier = OrbitTier.PRIORITY;
        }
    },
    
    /**
     * 대기 순번 조회
     */
    _getQueuePosition(nodeId) {
        const inQueue = Object.entries(this.waitlist)
            .filter(([_, n]) => n.status === WaitlistStatus.IN_QUEUE)
            .sort((a, b) => b[1].priorityScore - a[1].priorityScore);
        
        const idx = inQueue.findIndex(([id, _]) => id === nodeId);
        return idx >= 0 ? idx + 1 : inQueue.length + 1;
    },
    
    /**
     * 예상 진입일 계산
     */
    _estimateEntryDate(position) {
        const months = position / GOLDEN_RING_CONFIG.monthlyRotation;
        const entryDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
        return `${entryDate.getFullYear()}년 ${entryDate.getMonth() + 1}월`;
    },
    
    // ================================================================
    // GRAVITATIONAL PULSE
    // ================================================================
    
    /**
     * 중력 펄스 예약
     */
    schedulePulse(pulseType, subject, content, targetOrbit, scheduledAt = null) {
        const pulse = new GravitationalPulse({
            id: `PULSE_${Date.now()}`,
            pulseType,
            subject,
            content,
            targetOrbit,
            scheduledAt: scheduledAt || new Date()
        });
        
        this.pulseQueue.push(pulse);
        return pulse;
    },
    
    /**
     * 예약된 펄스 실행
     */
    executePulses() {
        const now = new Date();
        const executed = [];
        
        this.pulseQueue.forEach((pulse, idx) => {
            if (pulse.scheduledAt <= now) {
                const targets = Object.values(this.waitlist).filter(n =>
                    n.orbitTier === pulse.targetOrbit ||
                    pulse.targetOrbit === OrbitTier.OUTER
                );
                
                pulse.sentCount = targets.length;
                pulse.sentAt = now;
                
                targets.forEach(node => {
                    node.pulsesReceived++;
                    node.lastPulseAt = now;
                });
                
                executed.push(pulse);
                this.pulseHistory.push(pulse);
            }
        });
        
        this.pulseQueue = this.pulseQueue.filter(p => !executed.includes(p));
        
        return {
            executedCount: executed.length,
            pulses: executed.map(p => ({
                id: p.id,
                type: p.pulseType,
                sentTo: p.sentCount
            }))
        };
    },
    
    /**
     * 성공 스토리 펄스 생성
     */
    generateSuccessStoryPulse(eliteMemberName, achievement) {
        const inQueueCount = Object.values(this.waitlist)
            .filter(n => n.status === WaitlistStatus.IN_QUEUE).length;
        
        const content = `
[AUTUS Elite Club 성공 사례]

${eliteMemberName} 학생이 놀라운 성과를 달성했습니다!

📊 성과: ${achievement}

아우투스의 데이터 기반 관리 시스템이 
${eliteMemberName} 학생만의 최적 궤도를 설계했습니다.

현재 Elite Club 대기자: ${inQueueCount}명
예상 다음 진입: ${this._estimateEntryDate(1)}

▶ 지금 바로 진단받고 대기열에 합류하세요.
`;
        
        return this.schedulePulse(
            PulseType.SUCCESS_STORY,
            `🏆 ${eliteMemberName} 학생의 놀라운 성장 이야기`,
            content,
            OrbitTier.OUTER
        );
    },
    
    /**
     * 희소성 알림 펄스 생성
     */
    generateScarcityPulse(remainingSlots) {
        const content = `
[긴급] Elite Club 잔여석 안내

현재 Elite Club 잔여석: ${remainingSlots}석

대기자 중 상위 ${remainingSlots}명에게 
우선 진입 기회가 부여됩니다.

귀하의 현재 대기 순번을 확인하세요.

▶ [내 순번 확인하기]
`;
        
        return this.schedulePulse(
            PulseType.SCARCITY_ALERT,
            `⚠️ Elite Club 잔여 ${remainingSlots}석 - 우선 진입 기회`,
            content,
            OrbitTier.INNER
        );
    },
    
    // ================================================================
    // GOLDEN RING MANAGEMENT
    // ================================================================
    
    /**
     * 빈 슬롯 확인
     */
    checkAvailableSlots() {
        return Object.entries(this.goldenRing)
            .filter(([_, slot]) => !slot.isOccupied)
            .map(([id, _]) => id);
    },
    
    /**
     * 대기열 1순위에게 진입 기회 알림
     */
    notifyNextInQueue() {
        const availableSlots = this.checkAvailableSlots();
        if (availableSlots.length === 0) return null;
        
        const inQueue = Object.entries(this.waitlist)
            .filter(([_, n]) => n.status === WaitlistStatus.IN_QUEUE)
            .sort((a, b) => b[1].priorityScore - a[1].priorityScore);
        
        if (inQueue.length === 0) return null;
        
        const [topNodeId, topNode] = inQueue[0];
        
        topNode.status = WaitlistStatus.NOTIFIED;
        topNode.notifiedAt = new Date();
        topNode.expiresAt = new Date(Date.now() + WAITLIST_CONFIG.notificationWindowHours * 60 * 60 * 1000);
        
        return {
            nodeId: topNodeId,
            studentName: topNode.studentName,
            parentName: topNode.parentName,
            contact: topNode.contact,
            slotOffered: availableSlots[0],
            deadline: topNode.expiresAt.toISOString(),
            message: `
[AUTUS Elite Club] 진입 기회 안내

${topNode.parentName}님, 축하합니다!

Elite Club에 빈자리가 발생하여
${topNode.studentName} 학생에게 우선 진입권이 부여되었습니다.

⏰ 확정 마감: ${topNode.expiresAt.toLocaleString()}
(24시간 내 미확정 시 다음 대기자에게 기회가 넘어갑니다)

▶ [지금 바로 확정하기]
`
        };
    },
    
    /**
     * 골든 링 진입 확정
     */
    confirmGoldenRingEntry(nodeId, slotId) {
        const node = this.waitlist[nodeId];
        const slot = this.goldenRing[slotId];
        
        if (!node || !slot) return { success: false, error: 'Invalid node or slot' };
        if (node.status !== WaitlistStatus.NOTIFIED) return { success: false, error: 'Not in notified status' };
        if (slot.isOccupied) return { success: false, error: 'Slot already occupied' };
        
        slot.isOccupied = true;
        slot.occupantId = nodeId;
        slot.occupiedAt = new Date();
        
        node.status = WaitlistStatus.CONVERTED;
        node.orbitTier = OrbitTier.GOLDEN;
        
        delete this.waitlist[nodeId];
        
        return {
            success: true,
            nodeId,
            slotId,
            studentName: node.studentName,
            message: `
🎉 축하합니다!

${node.studentName} 학생이 Elite Club에 정식 합류했습니다!

슬롯: ${slotId}
진입일: ${new Date().toLocaleDateString()}

지금부터 아우투스의 모든 프리미엄 기능이 활성화됩니다.
`
        };
    },
    
    /**
     * 알림 만료 처리
     */
    handleExpiredNotification(nodeId) {
        const node = this.waitlist[nodeId];
        if (!node) return { success: false, error: 'Node not found' };
        if (node.status !== WaitlistStatus.NOTIFIED) return { success: false, error: 'Not in notified status' };
        
        node.status = WaitlistStatus.IN_QUEUE;
        node.priorityScore *= 0.8;
        node.notifiedAt = null;
        node.expiresAt = null;
        
        const nextNotification = this.notifyNextInQueue();
        
        return {
            success: true,
            expiredNode: nodeId,
            nextNotification
        };
    },
    
    // ================================================================
    // ANALYTICS
    // ================================================================
    
    /**
     * 중력장 상태 조회
     */
    getGravityFieldStatus() {
        const waitlistNodes = Object.values(this.waitlist);
        
        const orbitDistribution = {};
        Object.values(OrbitTier).forEach(tier => {
            orbitDistribution[tier] = waitlistNodes.filter(n => n.orbitTier === tier).length;
        });
        
        const statusDistribution = {};
        Object.values(WaitlistStatus).forEach(status => {
            statusDistribution[status] = waitlistNodes.filter(n => n.status === status).length;
        });
        
        const occupiedSlots = Object.values(this.goldenRing).filter(s => s.isOccupied).length;
        
        return {
            waitlistTotal: waitlistNodes.length,
            orbitDistribution,
            statusDistribution,
            goldenRing: {
                totalSlots: Object.keys(this.goldenRing).length,
                occupied: occupiedSlots,
                available: Object.keys(this.goldenRing).length - occupiedSlots
            },
            pulseStats: {
                queued: this.pulseQueue.length,
                sentTotal: this.pulseHistory.length
            },
            depositPool: waitlistNodes.reduce((s, n) => s + n.depositPaid, 0),
            avgPriorityScore: waitlistNodes.length > 0
                ? waitlistNodes.reduce((s, n) => s + n.priorityScore, 0) / waitlistNodes.length
                : 0
        };
    },
    
    /**
     * Physics Map UI용 데이터 내보내기
     */
    exportForPhysicsMap() {
        const distanceMap = {
            [OrbitTier.OUTER]: 8,
            [OrbitTier.WARM_UP]: 6,
            [OrbitTier.INNER]: 4,
            [OrbitTier.PRIORITY]: 2.5,
            [OrbitTier.GOLDEN]: 1
        };
        
        const colorMap = {
            [OrbitTier.OUTER]: '#888888',
            [OrbitTier.WARM_UP]: '#FFCC00',
            [OrbitTier.INNER]: '#00CCFF',
            [OrbitTier.PRIORITY]: '#00FF88',
            [OrbitTier.GOLDEN]: '#FFD700'
        };
        
        const nodes = Object.values(this.waitlist).map(node => {
            const distance = distanceMap[node.orbitTier] || 8;
            const angle = (this._simpleHash(node.id) % 360) * Math.PI / 180;
            
            return {
                id: node.id,
                name: node.studentName,
                orbitTier: node.orbitTier,
                position: {
                    x: distance * Math.cos(angle),
                    y: distance * Math.sin(angle),
                    z: 0
                },
                color: colorMap[node.orbitTier] || '#888888',
                size: 0.2 + node.priorityScore * 0.3,
                priorityScore: node.priorityScore,
                status: node.status
            };
        });
        
        return {
            waitlistNodes: nodes,
            goldenRing: {
                radius: 1.5,
                slots: Object.values(this.goldenRing).map(s => ({
                    slotId: s.slotId,
                    occupied: s.isOccupied,
                    occupant: s.occupantId
                }))
            }
        };
    },
    
    /**
     * 유틸리티: 연락처 해시
     */
    _hashContact(contact) {
        let hash = 0;
        for (let i = 0; i < contact.length; i++) {
            hash = ((hash << 5) - hash) + contact.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).substring(0, 8);
    },
    
    /**
     * 유틸리티: 간단한 해시
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
};

// ================================================================
// GOLDEN RING SEALING PROTOCOL
// ================================================================

export const GoldenRingSealingProtocol = {
    /**
     * 골든 링 봉인 실행
     */
    sealGoldenRing(gravityField) {
        const availableSlots = gravityField.checkAvailableSlots();
        
        if (availableSlots.length === 0) {
            // 골든 링 완전 봉인
            console.log('🔒 GOLDEN RING: SEALED');
            
            // 기존 멤버에게 축하 벡터
            const members = Object.values(gravityField.goldenRing)
                .filter(s => s.isOccupied)
                .map(s => s.occupantId);
            
            const celebrationMessages = members.map(memberId => ({
                memberId,
                message: '축하합니다. 당신은 이제 0.1% 궤도의 일원입니다.',
                badge: 'FOUNDING_ELITE',
                perks: ['전용 데이터 대시보드', '다이렉트 핫라인', '연간 로드맵']
            }));
            
            // 외부 노드에 충격파
            const shockwave = {
                message: 'Elite Club이 정원 마감되었습니다.',
                effect: 'FOMO_AMPLIFICATION',
                redirectTo: 'WAITLIST_ORBIT'
            };
            
            // 희소성 펄스 발송
            gravityField.schedulePulse(
                PulseType.SCARCITY_ALERT,
                '🔒 Elite Club 정원 마감',
                this._generateSealedMessage(members.length),
                OrbitTier.OUTER
            );
            
            return {
                sealed: true,
                sealedAt: new Date(),
                totalMembers: members.length,
                celebrationMessages,
                shockwave,
                waitlistActive: true
            };
        }
        
        return {
            sealed: false,
            availableSlots: availableSlots.length
        };
    },
    
    /**
     * 봉인 메시지 생성
     */
    _generateSealedMessage(memberCount) {
        return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[AUTUS Elite Club: 정원 마감 안내]

안녕하세요.

아쉽게도 이번 Elite Club 모집이 **정원 마감**되었습니다.
${memberCount}명의 학생이 골든 링에 진입하여 
1:1 데이터 기반 관리를 시작합니다.

[대기자 명단 등록]을 원하시면 
다음 기수 **우선 진입권**을 확보하실 수 있습니다.

• 대기 중 혜택: 월간 프리미엄 리포트 + 진입 시 20% 할인
• 현재 대기 순번: 1번 (최우선)

▶ [대기자 등록하기] (보증금 30만원)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }
};

// ================================================================
// TEST
// ================================================================

export function testWaitlistGravityField() {
    console.log('='.repeat(70));
    console.log('AUTUS Waitlist Gravity Field Test');
    console.log('='.repeat(70));
    
    const field = WaitlistGravityField.init();
    
    // 1. 관심 등록
    console.log('\n[1. 관심 등록]');
    const testData = [
        ['김학부모', '김철수', '010-1000-2000'],
        ['이학부모', '이영희', '010-1001-2001'],
        ['박학부모', '박민수', '010-1002-2002'],
        ['최학부모', '최지현', '010-1003-2003']
    ];
    
    const nodes = testData.map(([parent, student, contact]) => {
        const node = field.registerInterest(parent, student, contact);
        console.log(`  • ${student}: ${node.id} (Orbit: ${node.orbitTier})`);
        return node;
    });
    
    // 2. 사전 진단 제출
    console.log('\n[2. 사전 진단 제출]');
    const diagnostics = [
        { studentId: 's1', currentGrade: '중3', studyHoursWeekly: 25, focusSelfRating: 8, exerciseHoursWeekly: 5, sleepHoursDaily: 7, energySelfRating: 7, stressLevel: 4, motivationLevel: 9, targetSchool: '의대', targetTimelineMonths: 36 },
        { studentId: 's2', currentGrade: '고1', studyHoursWeekly: 30, focusSelfRating: 9, exerciseHoursWeekly: 7, sleepHoursDaily: 8, energySelfRating: 3, stressLevel: 8, motivationLevel: 6, targetSchool: '서울대', targetTimelineMonths: 24 },
        { studentId: 's3', currentGrade: '중2', studyHoursWeekly: 15, focusSelfRating: 6, exerciseHoursWeekly: 3, sleepHoursDaily: 6, energySelfRating: 5, stressLevel: 6, motivationLevel: 5, targetSchool: '특목고', targetTimelineMonths: 48 },
        { studentId: 's4', currentGrade: '고2', studyHoursWeekly: 35, focusSelfRating: 7, exerciseHoursWeekly: 4, sleepHoursDaily: 7, energySelfRating: 6, stressLevel: 7, motivationLevel: 8, targetSchool: '연세대', targetTimelineMonths: 12 }
    ];
    
    nodes.forEach((node, i) => {
        const result = field.submitDiagnostic(node.id, diagnostics[i]);
        console.log(`  • ${node.studentName}: Match=${result.matchScore.toFixed(2)}, Potential=${result.potentialScore.toFixed(2)}`);
    });
    
    // 3. 보증금 납부
    console.log('\n[3. 보증금 납부]');
    nodes.slice(0, 2).forEach(node => {
        const result = field.payDeposit(node.id, 300000);
        console.log(`  • ${node.studentName}: Position=${result.queuePosition}, Entry=${result.estimatedEntry}`);
    });
    
    // 4. 중력 펄스
    console.log('\n[4. 중력 펄스 스케줄링]');
    const pulse1 = field.generateSuccessStoryPulse('기존회원A', '전교 1등 달성');
    const pulse2 = field.generateScarcityPulse(2);
    console.log(`  • 성공 스토리 펄스: ${pulse1.id}`);
    console.log(`  • 희소성 알림 펄스: ${pulse2.id}`);
    
    // 5. 상태 조회
    console.log('\n[5. 중력장 상태]');
    const status = field.getGravityFieldStatus();
    console.log(`  • 총 대기자: ${status.waitlistTotal}`);
    console.log(`  • 골든 링: ${status.goldenRing.occupied}/${status.goldenRing.totalSlots}`);
    console.log(`  • 보증금 풀: ₩${status.depositPool.toLocaleString()}`);
    
    // 6. Physics Map Export
    console.log('\n[6. Physics Map Export]');
    const mapData = field.exportForPhysicsMap();
    console.log(`  • 대기자 노드: ${mapData.waitlistNodes.length}개`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Waitlist Gravity Field Test Complete');
    
    return { field, status, mapData };
}

export default WaitlistGravityField;



