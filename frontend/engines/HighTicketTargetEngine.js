// ================================================================
// AUTUS HIGH-TICKET TARGET IDENTIFICATION (BEZOS EDITION)
// 고가치 타겟 식별 시스템
//
// 기능:
// 1. High-Value Signal Filter - 고가치 신호 필터
// 2. Willingness-to-Pay (WTP) Score - 지불 의향 점수
// 3. Pilot Campaign Generator - 파일럿 캠페인 생성
// 4. Personalized Invitation - 맞춤형 초대장
//
// Version: 2.0.0
// Status: LOCKED
// ================================================================

// ================================================================
// ENUMS
// ================================================================

export const ValueTier = {
    STANDARD: 'STANDARD',
    PREMIUM: 'PREMIUM',
    VIP: 'VIP',
    ULTRA: 'ULTRA'
};

export const CampaignType = {
    UPSELL: 'UPSELL',
    PREMIUM_INVITATION: 'PREMIUM_INVITATION',
    EXCLUSIVE_OFFER: 'EXCLUSIVE_OFFER',
    CUSTOM_CONSULTATION: 'CUSTOM_CONSULTATION'
};

export const SignalStrength = {
    WEAK: 'WEAK',
    MODERATE: 'MODERATE',
    STRONG: 'STRONG',
    DEFINITIVE: 'DEFINITIVE'
};

// ================================================================
// CONSTANTS
// ================================================================

export const HIGH_VALUE_KEYWORDS = [
    '입시', '의대', '컨설팅', '특별', '추가', '프리미엄',
    '1:1', '집중', '강화', '올인', '목표', '상위권',
    '특목고', '영재', '심화', '맞춤', '전문가', '코칭'
];

export const URGENCY_INDICATORS = [
    '급해요', '빨리', '바로', '지금', '당장', '이번에',
    '마지막', '놓치면', '기회', '시작해야'
];

export const COMPETITOR_KEYWORDS = [
    '다른곳', '타학원', '비교', '어디가', '추천', '알아보는',
    '옮길', '바꿀'
];

// ================================================================
// HIGH-VALUE SIGNAL FILTER
// ================================================================

export const HighValueSignalFilter = {
    signals: [],
    
    /**
     * 고가치 멤버 필터링
     */
    filterHighValueMembers(members, avgMass = null) {
        if (!avgMass && members.length > 0) {
            avgMass = members.reduce((s, m) => s + m.mass, 0) / members.length;
        }
        avgMass = avgMass || 0.5;
        
        const massThreshold = avgMass * 1.5;
        const energyThreshold = 0.8;
        
        const highValue = [];
        
        members.forEach(member => {
            if (member.mass > massThreshold && member.energyLevel > energyThreshold) {
                highValue.push(member);
            } else if (this._hasHighValueKeywords(member)) {
                highValue.push(member);
            }
        });
        
        return highValue;
    },
    
    /**
     * 고가치 키워드 포함 여부
     */
    _hasHighValueKeywords(member) {
        return (member.detectedKeywords || []).some(kw => HIGH_VALUE_KEYWORDS.includes(kw));
    },
    
    /**
     * 멤버에서 고가치 신호 추출
     */
    extractSignals(member) {
        const signals = [];
        const now = new Date();
        
        // 1. Mass 신호
        if (member.mass > 0.7) {
            signals.push({
                memberId: member.id,
                signalType: 'HIGH_MASS',
                signalStrength: member.mass > 0.9 ? SignalStrength.STRONG : SignalStrength.MODERATE,
                source: 'physics_engine',
                value: member.mass,
                timestamp: now,
                contributionToWtp: member.mass * 20
            });
        }
        
        // 2. 고가치 키워드 신호
        const hvKeywords = (member.detectedKeywords || [])
            .filter(kw => HIGH_VALUE_KEYWORDS.includes(kw));
        if (hvKeywords.length > 0) {
            signals.push({
                memberId: member.id,
                signalType: 'HIGH_VALUE_KEYWORDS',
                signalStrength: hvKeywords.length > 2 ? SignalStrength.STRONG : SignalStrength.MODERATE,
                source: 'sensor_analysis',
                value: hvKeywords,
                timestamp: now,
                contributionToWtp: hvKeywords.length * 8
            });
        }
        
        // 3. 긴급 톤 신호
        const urgentKeywords = (member.detectedKeywords || [])
            .filter(kw => URGENCY_INDICATORS.includes(kw));
        if (urgentKeywords.length > 0 || member.communicationTone === 'urgent') {
            signals.push({
                memberId: member.id,
                signalType: 'URGENT_TONE',
                signalStrength: SignalStrength.STRONG,
                source: 'voice_analysis',
                value: { keywords: urgentKeywords, tone: member.communicationTone },
                timestamp: now,
                contributionToWtp: 15
            });
        }
        
        // 4. 경쟁사 관심 신호
        if ((member.competitorInterest || 0) > 0.5) {
            signals.push({
                memberId: member.id,
                signalType: 'COMPETITOR_INTEREST',
                signalStrength: SignalStrength.MODERATE,
                source: 'context_analysis',
                value: member.competitorInterest,
                timestamp: now,
                contributionToWtp: member.competitorInterest * 10
            });
        }
        
        // 5. 구매 이력 신호
        if (member.totalSpent > 0) {
            const avgPurchase = member.purchaseHistory?.length > 0
                ? member.totalSpent / member.purchaseHistory.length
                : 0;
            if (avgPurchase > 500000) {  // 50만원 이상
                signals.push({
                    memberId: member.id,
                    signalType: 'HIGH_SPENDER',
                    signalStrength: SignalStrength.DEFINITIVE,
                    source: 'purchase_history',
                    value: { total: member.totalSpent, avg: avgPurchase },
                    timestamp: now,
                    contributionToWtp: Math.min(avgPurchase / 20000, 30)
                });
            }
        }
        
        this.signals.push(...signals);
        return signals;
    },
    
    /**
     * 초기화
     */
    reset() {
        this.signals = [];
    }
};

// ================================================================
// WTP SCORE CALCULATOR
// ================================================================

export const WTPScoreCalculator = {
    COMPONENT_WEIGHTS: {
        purchase_history: 0.30,
        urgent_tone: 0.25,
        competitor_interest: 0.20,
        high_value_keywords: 0.15,
        engagement: 0.10
    },
    
    /**
     * WTP 점수 계산
     */
    calculateWTP(member, signals) {
        const components = {};
        
        // 1. 구매 이력 점수
        if (member.purchaseHistory && member.purchaseHistory.length > 0) {
            const avgPurchase = member.totalSpent / member.purchaseHistory.length;
            components.purchase_history = Math.min(avgPurchase / 10000, 100);
        } else {
            components.purchase_history = 20;  // 신규 고객 기본 점수
        }
        
        // 2. 긴급 톤 점수
        const urgentSignals = signals.filter(s => s.signalType === 'URGENT_TONE');
        if (urgentSignals.length > 0) {
            components.urgent_tone = 80;
        } else if (member.communicationTone === 'interested') {
            components.urgent_tone = 40;
        } else {
            components.urgent_tone = 20;
        }
        
        // 3. 경쟁사 관심도 점수
        components.competitor_interest = (member.competitorInterest || 0) * 100;
        
        // 4. 고가치 키워드 점수
        const hvCount = (member.detectedKeywords || [])
            .filter(kw => HIGH_VALUE_KEYWORDS.includes(kw)).length;
        components.high_value_keywords = Math.min(hvCount * 20, 100);
        
        // 5. 참여도 점수
        components.engagement = (member.engagementScore || 0.5) * 100;
        
        // 가중 합계
        const totalScore = Object.entries(this.COMPONENT_WEIGHTS).reduce((sum, [comp, weight]) => {
            return sum + (components[comp] || 0) * weight;
        }, 0);
        
        // 티어 결정
        let tier;
        if (totalScore >= 80) tier = ValueTier.ULTRA;
        else if (totalScore >= 60) tier = ValueTier.VIP;
        else if (totalScore >= 40) tier = ValueTier.PREMIUM;
        else tier = ValueTier.STANDARD;
        
        // 신뢰도
        const strongSignals = signals.filter(s => 
            [SignalStrength.STRONG, SignalStrength.DEFINITIVE].includes(s.signalStrength)
        ).length;
        const confidence = Math.min(0.5 + strongSignals * 0.1, 0.95);
        
        return {
            memberId: member.id,
            totalScore,
            tier,
            components,
            signals,
            confidence,
            calculatedAt: new Date()
        };
    }
};

// ================================================================
// CAMPAIGN GENERATOR
// ================================================================

export const CampaignGenerator = {
    CAMPAIGN_TEMPLATES: {
        [ValueTier.ULTRA]: {
            type: CampaignType.EXCLUSIVE_OFFER,
            title: 'VIP 전용 프리미엄 프로그램',
            discount: 0.0,
            perks: ['전담 컨설턴트', '1:1 맞춤 커리큘럼', '우선 상담권', '특별 리포트']
        },
        [ValueTier.VIP]: {
            type: CampaignType.PREMIUM_INVITATION,
            title: '프리미엄 멤버 초대',
            discount: 0.1,
            perks: ['심화 과정 접근권', '월간 컨설팅', '성과 리포트']
        },
        [ValueTier.PREMIUM]: {
            type: CampaignType.UPSELL,
            title: '맞춤형 강화 프로그램',
            discount: 0.15,
            perks: ['추가 세션', '자료 패키지']
        },
        [ValueTier.STANDARD]: {
            type: CampaignType.UPSELL,
            title: '업그레이드 특별 제안',
            discount: 0.2,
            perks: ['기본 추가 혜택']
        }
    },
    
    /**
     * 타겟 멤버 기반 캠페인 생성
     */
    generateCampaign(targetMembers) {
        if (!targetMembers || targetMembers.length === 0) {
            throw new Error('No target members provided');
        }
        
        // 가장 높은 티어 기준
        const topTier = targetMembers.reduce((max, [_, wtp]) => {
            const tierOrder = { ULTRA: 4, VIP: 3, PREMIUM: 2, STANDARD: 1 };
            return tierOrder[wtp.tier] > tierOrder[max] ? wtp.tier : max;
        }, ValueTier.STANDARD);
        
        const template = this.CAMPAIGN_TEMPLATES[topTier];
        const memberIds = targetMembers.map(([m, _]) => m.id);
        
        // 평균 WTP로 전환율 예측
        const avgWtp = targetMembers.reduce((s, [_, wtp]) => s + wtp.totalScore, 0) / targetMembers.length;
        const expectedConversion = Math.min(avgWtp / 100 * 0.4, 0.35);
        
        return {
            id: `CAMP_${Date.now()}`,
            campaignType: template.type,
            targetMembers: memberIds,
            offer: {
                title: template.title,
                discount: template.discount,
                perks: template.perks
            },
            personalization: {
                tierDistribution: this._getTierDistribution(targetMembers),
                topSignals: this._getTopSignals(targetMembers)
            },
            expectedConversionRate: expectedConversion,
            createdAt: new Date()
        };
    },
    
    /**
     * 티어 분포
     */
    _getTierDistribution(members) {
        const dist = {};
        members.forEach(([_, wtp]) => {
            dist[wtp.tier] = (dist[wtp.tier] || 0) + 1;
        });
        return dist;
    },
    
    /**
     * 주요 신호 유형
     */
    _getTopSignals(members) {
        const signalCounts = {};
        members.forEach(([_, wtp]) => {
            wtp.signals.forEach(signal => {
                signalCounts[signal.signalType] = (signalCounts[signal.signalType] || 0) + 1;
            });
        });
        
        return Object.entries(signalCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, _]) => type);
    }
};

// ================================================================
// INVITATION GENERATOR
// ================================================================

export const InvitationGenerator = {
    TITLES: {
        [ValueTier.ULTRA]: (id) => `[VIP 전용] ${id}님을 위한 특별 초대`,
        [ValueTier.VIP]: (id) => `[프리미엄] ${id}님, 다음 단계로 도약하세요`,
        [ValueTier.PREMIUM]: (id) => `${id}님을 위한 맞춤 강화 프로그램`,
        [ValueTier.STANDARD]: (id) => `${id}님, 특별 업그레이드 기회`
    },
    
    CTAS: {
        [ValueTier.ULTRA]: '지금 바로 전담 컨설턴트와 상담 예약하기',
        [ValueTier.VIP]: '프리미엄 프로그램 상세 보기',
        [ValueTier.PREMIUM]: '맞춤 커리큘럼 확인하기',
        [ValueTier.STANDARD]: '업그레이드 혜택 알아보기'
    },
    
    BASE_OFFERS: {
        [ValueTier.ULTRA]: {
            program: 'ULTRA VIP 패키지',
            price: '별도 협의',
            includes: [
                '전담 컨설턴트 배정',
                '주 3회 1:1 세션',
                '맞춤형 학습 로드맵',
                '24시간 질의응답',
                '월간 성과 리포트'
            ],
            validity: '선착순 5명'
        },
        [ValueTier.VIP]: {
            program: 'VIP 프리미엄 패키지',
            price: '월 150만원',
            includes: [
                '주 2회 1:1 세션',
                '심화 커리큘럼',
                '주간 피드백',
                '자료 패키지'
            ],
            validity: '이번 달 등록 시 첫 달 10% 할인'
        },
        [ValueTier.PREMIUM]: {
            program: '프리미엄 강화 패키지',
            price: '월 80만원',
            includes: [
                '주 1회 추가 세션',
                '심화 자료',
                '월간 상담'
            ],
            validity: '15% 할인 (한정)'
        },
        [ValueTier.STANDARD]: {
            program: '스탠다드 업그레이드',
            price: '월 50만원',
            includes: [
                '격주 추가 세션',
                '기본 자료'
            ],
            validity: '20% 할인'
        }
    },
    
    /**
     * 맞춤형 초대장 생성
     */
    generateInvitation(member, wtp, detectedGaps) {
        const tier = wtp.tier;
        const title = this.TITLES[tier](member.id);
        const body = this._generateBody(member, wtp, detectedGaps);
        const offer = this._generateOffer(tier, detectedGaps);
        const cta = this.CTAS[tier];
        
        return {
            memberId: member.id,
            tier,
            title,
            body,
            gapsAddressed: detectedGaps,
            offerDetails: offer,
            callToAction: cta
        };
    },
    
    /**
     * 본문 생성
     */
    _generateBody(member, wtp, gaps) {
        const lines = [];
        
        lines.push(`안녕하세요, ${member.id}님.`);
        lines.push('');
        
        if (gaps && gaps.length > 0) {
            lines.push('저희가 분석한 결과, 다음 영역에서 추가 지원이 도움이 될 것으로 보입니다:');
            gaps.slice(0, 3).forEach(gap => {
                lines.push(`  • ${gap}`);
            });
            lines.push('');
        }
        
        if ([ValueTier.ULTRA, ValueTier.VIP].includes(wtp.tier)) {
            lines.push('이를 위해 특별히 준비된 프리미엄 프로그램을 소개드립니다.');
        } else {
            lines.push('이를 해결하기 위한 맞춤형 솔루션을 제안드립니다.');
        }
        
        return lines.join('\n');
    },
    
    /**
     * 오퍼 생성
     */
    _generateOffer(tier, gaps) {
        const offer = { ...this.BASE_OFFERS[tier] };
        
        if (gaps && gaps.length > 0) {
            offer.gapSpecificSolutions = gaps.slice(0, 2).map(gap => `${gap} 집중 보강`);
        }
        
        return offer;
    }
};

// ================================================================
// INTEGRATED HIGH-TICKET TARGET ENGINE
// ================================================================

export const HighTicketTargetEngine = {
    signalFilter: HighValueSignalFilter,
    wtpCalculator: WTPScoreCalculator,
    campaignGenerator: CampaignGenerator,
    invitationGenerator: InvitationGenerator,
    
    members: {},
    wtpScores: {},
    
    /**
     * 멤버 등록
     */
    registerMember(member) {
        this.members[member.id] = {
            ...member,
            createdAt: member.createdAt || new Date(),
            lastActivity: member.lastActivity || null
        };
    },
    
    /**
     * 멤버 분석 및 WTP 계산
     */
    analyzeMember(memberId) {
        const member = this.members[memberId];
        if (!member) return null;
        
        // 신호 추출
        const signals = this.signalFilter.extractSignals(member);
        
        // WTP 계산
        const wtp = this.wtpCalculator.calculateWTP(member, signals);
        this.wtpScores[memberId] = wtp;
        
        return wtp;
    },
    
    /**
     * 고가치 타겟 식별
     */
    identifyHighTicketTargets() {
        const targets = [];
        
        Object.entries(this.members).forEach(([memberId, member]) => {
            const wtp = this.analyzeMember(memberId);
            if (wtp && [ValueTier.VIP, ValueTier.ULTRA].includes(wtp.tier)) {
                targets.push([member, wtp]);
            }
        });
        
        // WTP 점수로 정렬
        targets.sort((a, b) => b[1].totalScore - a[1].totalScore);
        
        return targets;
    },
    
    /**
     * 파일럿 캠페인 생성
     */
    generatePilotCampaign() {
        const targets = this.identifyHighTicketTargets();
        if (targets.length === 0) return null;
        
        return this.campaignGenerator.generateCampaign(targets);
    },
    
    /**
     * 맞춤형 초대장 일괄 생성
     */
    generatePersonalizedInvitations(targets, gapDetector = null) {
        const invitations = [];
        
        targets.forEach(([member, wtp]) => {
            const gaps = gapDetector 
                ? gapDetector(member) 
                : this._defaultGapDetection(member);
            
            const invitation = this.invitationGenerator.generateInvitation(member, wtp, gaps);
            invitations.push(invitation);
        });
        
        return invitations;
    },
    
    /**
     * 기본 Gap 감지
     */
    _defaultGapDetection(member) {
        const gaps = [];
        
        if ((member.energyLevel || 1) < 0.6) {
            gaps.push('학습 동기 및 에너지 관리');
        }
        
        if ((member.engagementScore || 1) < 0.5) {
            gaps.push('수업 참여도 향상');
        }
        
        if ((member.detectedKeywords || []).includes('입시')) {
            gaps.push('입시 전략 수립');
        }
        
        if ((member.detectedKeywords || []).includes('의대')) {
            gaps.push('의대 입시 전문 지도');
        }
        
        if ((member.competitorInterest || 0) > 0.5) {
            gaps.push('차별화된 프로그램 탐색');
        }
        
        return gaps.slice(0, 3);
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            memberCount: Object.keys(this.members).length,
            wtpScoreCount: Object.keys(this.wtpScores).length,
            signalCount: this.signalFilter.signals.length
        };
    },
    
    /**
     * 초기화
     */
    reset() {
        this.members = {};
        this.wtpScores = {};
        this.signalFilter.reset();
    }
};

// ================================================================
// TEST
// ================================================================

export function testHighTicketTargetEngine() {
    console.log('='.repeat(70));
    console.log('AUTUS High-Ticket Target Identification Test');
    console.log('='.repeat(70));
    
    HighTicketTargetEngine.reset();
    
    // 테스트 멤버 등록
    const members = [
        {
            id: 'student_001',
            mass: 0.9,
            energyLevel: 0.85,
            engagementScore: 0.8,
            purchaseHistory: [{ amount: 800000 }, { amount: 1200000 }],
            totalSpent: 2000000,
            detectedKeywords: ['의대', '입시', '컨설팅', '1:1'],
            communicationTone: 'urgent',
            competitorInterest: 0.3
        },
        {
            id: 'student_002',
            mass: 0.7,
            energyLevel: 0.75,
            engagementScore: 0.65,
            purchaseHistory: [{ amount: 500000 }],
            totalSpent: 500000,
            detectedKeywords: ['특별', '강화', '심화'],
            communicationTone: 'interested',
            competitorInterest: 0.5
        },
        {
            id: 'student_003',
            mass: 0.5,
            energyLevel: 0.6,
            engagementScore: 0.5,
            purchaseHistory: [{ amount: 300000 }],
            totalSpent: 300000,
            detectedKeywords: ['기본'],
            communicationTone: 'casual',
            competitorInterest: 0.2
        }
    ];
    
    members.forEach(m => HighTicketTargetEngine.registerMember(m));
    
    // 개별 멤버 분석
    console.log('\n[멤버별 WTP 분석]');
    members.forEach(member => {
        const wtp = HighTicketTargetEngine.analyzeMember(member.id);
        console.log(`\n  ${member.id}:`);
        console.log(`    WTP Score: ${wtp.totalScore.toFixed(1)}`);
        console.log(`    Tier: ${wtp.tier}`);
        console.log(`    Confidence: ${(wtp.confidence * 100).toFixed(1)}%`);
        console.log(`    Signals: ${wtp.signals.length}`);
        wtp.signals.slice(0, 2).forEach(signal => {
            console.log(`      • ${signal.signalType}: ${signal.signalStrength}`);
        });
    });
    
    // 고가치 타겟 식별
    console.log('\n[고가치 타겟 식별]');
    const targets = HighTicketTargetEngine.identifyHighTicketTargets();
    console.log(`  총 ${targets.length}명 식별`);
    targets.forEach(([member, wtp]) => {
        console.log(`    • ${member.id}: ${wtp.tier} (WTP: ${wtp.totalScore.toFixed(1)})`);
    });
    
    // 캠페인 생성
    console.log('\n[파일럿 캠페인 생성]');
    const campaign = HighTicketTargetEngine.generatePilotCampaign();
    if (campaign) {
        console.log(`  ID: ${campaign.id}`);
        console.log(`  Type: ${campaign.campaignType}`);
        console.log(`  Targets: ${campaign.targetMembers.length}`);
        console.log(`  Expected Conversion: ${(campaign.expectedConversionRate * 100).toFixed(1)}%`);
        console.log(`  Offer: ${campaign.offer.title}`);
    }
    
    // 맞춤형 초대장 생성
    console.log('\n[맞춤형 초대장 생성]');
    const invitations = HighTicketTargetEngine.generatePersonalizedInvitations(targets);
    invitations.forEach(inv => {
        console.log(`\n  [${inv.tier}] ${inv.memberId}`);
        console.log(`  Title: ${inv.title}`);
        console.log(`  Gaps Addressed: ${inv.gapsAddressed.join(', ')}`);
        console.log(`  CTA: ${inv.callToAction}`);
        console.log(`  Offer: ${inv.offerDetails.program} - ${inv.offerDetails.price}`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ High-Ticket Target Test Complete');
    
    return { targets, campaign, invitations };
}

export default HighTicketTargetEngine;



