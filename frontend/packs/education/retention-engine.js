// ================================================================
// ELON'S RETENTION COMMAND
// /autus/packs/education/retention-engine.js
// 리텐션 물리 엔진: 관성 추적, 반작용 최적화, 에너지 회복
// ================================================================

import { AdvancedPhysics, AUTUS_Physics, MemberEnergyAnalyzer, EnergyScanner } from '../../engine/AdvancedPhysics.js';

// ================================================================
// CONSTANTS
// ================================================================

const DECAY_THRESHOLD = 0.3;        // 감쇠 경고 임계치
const CHURN_RISK_THRESHOLD = 0.2;   // 이탈 위험 임계치
const RECOVERY_BOOST = 1.5;         // 회복 부스트 계수

// ================================================================
// 1. INERTIA TRACKER
// 사용자 활동 감쇠 모니터링
// ================================================================

export const InertiaTracker = {
    // 추적 중인 사용자
    trackedUsers: new Map(),
    
    // 감쇠 이력
    decayHistory: [],
    
    /**
     * Start tracking a user
     * @param {Object} user - User to track
     */
    startTracking: function(user) {
        const userId = user.id || user.userId;
        
        this.trackedUsers.set(userId, {
            userId,
            startTime: Date.now(),
            lastActivity: Date.now(),
            initialEnergy: user.energy || 100,
            currentEnergy: user.energy || 100,
            activityCount: 0,
            decayEvents: []
        });
        
        console.log(`[InertiaTracker] Started tracking: ${userId}`);
    },
    
    /**
     * Record activity for user
     * @param {string} userId - User ID
     * @param {Object} activity - Activity data
     */
    recordActivity: function(userId, activity) {
        const userData = this.trackedUsers.get(userId);
        if (!userData) return;
        
        // 활동 기록
        userData.lastActivity = Date.now();
        userData.activityCount++;
        
        // 에너지 업데이트 (활동으로 에너지 증가)
        const energyBoost = AdvancedPhysics.calculateEffectiveMass(
            activity.type || 'ATTENDANCE',
            activity.intensity || 1.0
        );
        
        userData.currentEnergy = Math.min(
            userData.currentEnergy + energyBoost.value * 5,
            100
        );
    },
    
    /**
     * Check decay for all tracked users
     * @returns {Array} Users with significant decay
     */
    checkDecay: function() {
        const decayingUsers = [];
        const now = Date.now();
        
        this.trackedUsers.forEach((userData, userId) => {
            // 마지막 활동 이후 시간 (시간 단위)
            const hoursSinceActivity = (now - userData.lastActivity) / (60 * 60 * 1000);
            
            // 감쇠 적용
            const decayResult = AdvancedPhysics.applyAcceleratedDecay(
                userData.currentEnergy,
                hoursSinceActivity
            );
            
            // 에너지 업데이트
            userData.currentEnergy = decayResult.value;
            
            // 감쇠 이벤트 기록
            if (decayResult.lossPercentage > 10) {
                userData.decayEvents.push({
                    timestamp: now,
                    energyBefore: decayResult.original,
                    energyAfter: decayResult.value,
                    lossPercentage: decayResult.lossPercentage
                });
            }
            
            // 임계치 이하면 경고 목록에 추가
            if (userData.currentEnergy / userData.initialEnergy < DECAY_THRESHOLD) {
                decayingUsers.push({
                    userId,
                    currentEnergy: userData.currentEnergy,
                    initialEnergy: userData.initialEnergy,
                    decayRatio: userData.currentEnergy / userData.initialEnergy,
                    hoursSinceActivity,
                    isGoldenTimeExpired: decayResult.isGoldenTimeExpired,
                    status: decayResult.status,
                    urgency: this.calculateUrgency(userData)
                });
            }
        });
        
        // 이력에 기록
        if (decayingUsers.length > 0) {
            this.decayHistory.push({
                timestamp: now,
                count: decayingUsers.length,
                users: decayingUsers.map(u => u.userId)
            });
        }
        
        return decayingUsers;
    },
    
    /**
     * Calculate urgency level
     */
    calculateUrgency: function(userData) {
        const ratio = userData.currentEnergy / userData.initialEnergy;
        const decayEventCount = userData.decayEvents.length;
        
        if (ratio < 0.1 || decayEventCount > 5) return 'CRITICAL';
        if (ratio < 0.2 || decayEventCount > 3) return 'HIGH';
        if (ratio < 0.3) return 'MEDIUM';
        return 'LOW';
    },
    
    /**
     * Get tracking summary
     */
    getSummary: function() {
        const users = Array.from(this.trackedUsers.values());
        
        return {
            totalTracked: users.length,
            activeUsers: users.filter(u => 
                Date.now() - u.lastActivity < 72 * 60 * 60 * 1000
            ).length,
            decayingUsers: users.filter(u => 
                u.currentEnergy / u.initialEnergy < DECAY_THRESHOLD
            ).length,
            avgEnergyRatio: users.reduce((sum, u) => 
                sum + u.currentEnergy / u.initialEnergy, 0
            ) / users.length,
            recentDecayEvents: this.decayHistory.slice(-10)
        };
    }
};

// ================================================================
// 2. REACTION OPTIMIZER
// 피드백 방향을 학부모 선호 theta에 맞춤
// ================================================================

export const ReactionOptimizer = {
    // 학부모 선호도 프로필
    preferenceProfiles: new Map(),
    
    // 최적화 이력
    optimizationHistory: [],
    
    /**
     * Set parent preference profile
     * @param {string} parentId - Parent ID
     * @param {Object} preferences - Preference theta values
     */
    setPreference: function(parentId, preferences) {
        this.preferenceProfiles.set(parentId, {
            parentId,
            // 선호 각도 (theta) - 커뮤니케이션 스타일
            theta: {
                formality: preferences.formality || 0.5,    // 0: 비격식, 1: 격식
                frequency: preferences.frequency || 0.5,    // 0: 드문, 1: 자주
                detail: preferences.detail || 0.5,          // 0: 간략, 1: 상세
                channel: preferences.channel || 'mixed',    // sms, email, app, mixed
                timing: preferences.timing || 'afternoon'   // morning, afternoon, evening
            },
            // 과거 반응 이력
            reactionHistory: [],
            // 최고 반응 액션
            bestReactionType: null,
            updatedAt: Date.now()
        });
    },
    
    /**
     * Record reaction to feedback
     * @param {string} parentId - Parent ID
     * @param {Object} feedback - Feedback sent
     * @param {Object} reaction - Parent's reaction
     */
    recordReaction: function(parentId, feedback, reaction) {
        const profile = this.preferenceProfiles.get(parentId);
        if (!profile) return;
        
        // 반응 점수 계산
        const reactionScore = this.calculateReactionScore(reaction);
        
        // 이력에 추가
        profile.reactionHistory.push({
            feedbackType: feedback.type,
            feedbackChannel: feedback.channel,
            reactionScore,
            timestamp: Date.now()
        });
        
        // 최고 반응 타입 업데이트
        this.updateBestReactionType(profile);
        
        // 선호도 자동 조정
        this.adjustPreferences(profile, feedback, reactionScore);
    },
    
    /**
     * Calculate reaction score
     */
    calculateReactionScore: function(reaction) {
        let score = 50; // 기본 점수
        
        if (reaction.opened) score += 10;
        if (reaction.read) score += 15;
        if (reaction.responded) score += 25;
        if (reaction.positive) score += 20;
        if (reaction.shared) score += 15;
        if (reaction.negative) score -= 30;
        
        return Math.max(0, Math.min(100, score));
    },
    
    /**
     * Update best reaction type
     */
    updateBestReactionType: function(profile) {
        if (profile.reactionHistory.length < 3) return;
        
        // 타입별 평균 반응 점수 계산
        const typeScores = {};
        profile.reactionHistory.forEach(r => {
            if (!typeScores[r.feedbackType]) {
                typeScores[r.feedbackType] = { total: 0, count: 0 };
            }
            typeScores[r.feedbackType].total += r.reactionScore;
            typeScores[r.feedbackType].count++;
        });
        
        // 최고 평균 점수 타입 찾기
        let bestType = null;
        let bestAvg = 0;
        
        Object.entries(typeScores).forEach(([type, data]) => {
            const avg = data.total / data.count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestType = type;
            }
        });
        
        profile.bestReactionType = bestType;
    },
    
    /**
     * Adjust preferences based on reaction
     */
    adjustPreferences: function(profile, feedback, reactionScore) {
        const theta = profile.theta;
        const adjustment = (reactionScore - 50) / 500; // 작은 조정
        
        // 피드백 특성에 따른 선호도 조정
        if (feedback.formal && reactionScore > 60) {
            theta.formality = Math.min(1, theta.formality + adjustment);
        } else if (!feedback.formal && reactionScore > 60) {
            theta.formality = Math.max(0, theta.formality - adjustment);
        }
        
        if (feedback.detailed && reactionScore > 60) {
            theta.detail = Math.min(1, theta.detail + adjustment);
        }
        
        profile.updatedAt = Date.now();
    },
    
    /**
     * Get optimal feedback configuration for parent
     * @param {string} parentId - Parent ID
     * @returns {Object} Optimized feedback config
     */
    getOptimalFeedback: function(parentId) {
        const profile = this.preferenceProfiles.get(parentId);
        
        if (!profile) {
            // 기본 설정 반환
            return {
                type: 'STANDARD',
                channel: 'app',
                formality: 0.5,
                detail: 0.5,
                timing: 'afternoon',
                confidence: 0.3
            };
        }
        
        const theta = profile.theta;
        
        return {
            type: profile.bestReactionType || 'PROGRESS_REPORT',
            channel: theta.channel,
            formality: theta.formality,
            detail: theta.detail,
            timing: theta.timing,
            confidence: Math.min(profile.reactionHistory.length / 10, 1),
            personalizedMessage: this.generatePersonalizedTemplate(theta)
        };
    },
    
    /**
     * Generate personalized message template
     */
    generatePersonalizedTemplate: function(theta) {
        const templates = {
            formal_detailed: '안녕하세요, {parent_name}님. {student_name} 학생의 학습 현황을 상세히 보고드립니다...',
            formal_brief: '안녕하세요. {student_name} 학생 학습 현황 요약입니다.',
            casual_detailed: '{parent_name}님! {student_name} 요즘 학습 상황 자세히 알려드릴게요 :)',
            casual_brief: '{student_name} 이번 주 잘하고 있어요! 👍'
        };
        
        const formalKey = theta.formality > 0.5 ? 'formal' : 'casual';
        const detailKey = theta.detail > 0.5 ? 'detailed' : 'brief';
        
        return templates[`${formalKey}_${detailKey}`];
    },
    
    /**
     * Find resonant path (best reaction type) for member
     */
    findResonantPath: function(memberHistory) {
        if (!memberHistory || memberHistory.length < 3) {
            return { found: false, bestType: null };
        }
        
        // 반응별 그룹화
        const typeScores = {};
        memberHistory.forEach(h => {
            const type = h.type || h.actionType;
            const score = h.reactionScore || h.score || 50;
            
            if (!typeScores[type]) {
                typeScores[type] = { total: 0, count: 0 };
            }
            typeScores[type].total += score;
            typeScores[type].count++;
        });
        
        // 최고 평균 점수 타입
        let bestType = null;
        let bestAvg = 0;
        
        Object.entries(typeScores).forEach(([type, data]) => {
            const avg = data.total / data.count;
            if (avg > bestAvg && data.count >= 2) {
                bestAvg = avg;
                bestType = type;
            }
        });
        
        return {
            found: bestType !== null,
            bestType,
            avgScore: bestAvg,
            allTypes: Object.entries(typeScores).map(([type, data]) => ({
                type,
                avgScore: data.total / data.count,
                count: data.count
            }))
        };
    }
};

// ================================================================
// 3. ENERGY RECOVERY
// 높은 이탈 위험을 신뢰 회복으로 전환
// ================================================================

export const EnergyRecovery = {
    // 회복 중인 사용자
    recoveryQueue: [],
    
    // 회복 성공 이력
    successHistory: [],
    
    // 회복 프로그램
    programs: {
        LIGHT: {
            name: '라이트 터치',
            actions: ['친근한 메시지', '소식 공유'],
            duration: 7,
            targetBoost: 0.2
        },
        MODERATE: {
            name: '적극 관리',
            actions: ['1:1 상담', '특별 이벤트 초대', '맞춤 피드백'],
            duration: 14,
            targetBoost: 0.4
        },
        INTENSIVE: {
            name: '집중 케어',
            actions: ['전화 상담', '대면 미팅', '특별 혜택', '개인화 프로그램'],
            duration: 30,
            targetBoost: 0.6
        }
    },
    
    /**
     * Start recovery loop for user
     * @param {Object} user - User at risk
     * @returns {Object} Recovery plan
     */
    startRecovery: function(user) {
        const energyRatio = user.currentEnergy / (user.initialEnergy || 100);
        
        // 프로그램 선택
        let program;
        if (energyRatio < 0.1) {
            program = this.programs.INTENSIVE;
        } else if (energyRatio < 0.2) {
            program = this.programs.MODERATE;
        } else {
            program = this.programs.LIGHT;
        }
        
        // 회복 계획 생성
        const recoveryPlan = {
            userId: user.id,
            startTime: Date.now(),
            program: program.name,
            actions: program.actions,
            duration: program.duration,
            targetBoost: program.targetBoost,
            initialEnergy: user.currentEnergy,
            targetEnergy: Math.min(
                user.currentEnergy * (1 + program.targetBoost * RECOVERY_BOOST),
                100
            ),
            status: 'IN_PROGRESS',
            progress: 0,
            completedActions: []
        };
        
        // 큐에 추가
        this.recoveryQueue.push(recoveryPlan);
        
        console.log(`[EnergyRecovery] Started ${program.name} for ${user.id}`);
        
        return recoveryPlan;
    },
    
    /**
     * Record recovery action
     * @param {string} userId - User ID
     * @param {string} action - Completed action
     * @param {Object} result - Action result
     */
    recordAction: function(userId, action, result) {
        const plan = this.recoveryQueue.find(p => p.userId === userId);
        if (!plan) return;
        
        // 액션 완료 기록
        plan.completedActions.push({
            action,
            result,
            timestamp: Date.now()
        });
        
        // 진행률 업데이트
        plan.progress = plan.completedActions.length / plan.actions.length;
        
        // 에너지 부스트 적용
        if (result.success) {
            const boost = (plan.targetBoost / plan.actions.length) * RECOVERY_BOOST;
            plan.currentEnergy = (plan.currentEnergy || plan.initialEnergy) * (1 + boost);
        }
    },
    
    /**
     * Check and complete recovery plans
     * @returns {Array} Completed plans
     */
    checkCompletion: function() {
        const now = Date.now();
        const completed = [];
        
        this.recoveryQueue = this.recoveryQueue.filter(plan => {
            const elapsed = (now - plan.startTime) / (24 * 60 * 60 * 1000);
            
            // 기간 종료 또는 목표 달성
            if (elapsed >= plan.duration || plan.progress >= 1) {
                const success = (plan.currentEnergy || plan.initialEnergy) >= plan.targetEnergy * 0.8;
                
                plan.status = success ? 'SUCCESS' : 'PARTIAL';
                plan.endTime = now;
                plan.finalEnergy = plan.currentEnergy || plan.initialEnergy;
                
                completed.push(plan);
                this.successHistory.push(plan);
                
                console.log(`[EnergyRecovery] ${plan.status}: ${plan.userId}`);
                
                return false; // 큐에서 제거
            }
            
            return true; // 큐에 유지
        });
        
        return completed;
    },
    
    /**
     * Convert high churn potential to renewed trust
     * @param {Object} user - High risk user
     * @returns {Object} Trust renewal result
     */
    convertToTrust: function(user) {
        // 이탈 위험도 계산
        const churnRisk = 1 - (user.currentEnergy / (user.initialEnergy || 100));
        
        if (churnRisk < CHURN_RISK_THRESHOLD) {
            return {
                success: false,
                reason: 'Churn risk below threshold',
                churnRisk
            };
        }
        
        // 회복 시작
        const plan = this.startRecovery(user);
        
        // 신뢰 점수 계산
        const trustScore = this.calculateTrustScore(user);
        
        // 맞춤형 신뢰 회복 액션 생성
        const trustActions = this.generateTrustActions(user, churnRisk);
        
        return {
            success: true,
            userId: user.id,
            churnRisk,
            trustScore,
            recoveryPlan: plan,
            trustActions,
            estimatedRecoveryTime: plan.duration,
            message: `${user.id}의 이탈 위험(${(churnRisk * 100).toFixed(1)}%)을 신뢰 회복 프로그램으로 전환`
        };
    },
    
    /**
     * Calculate trust score
     */
    calculateTrustScore: function(user) {
        let score = 50;
        
        // 히스토리 기반 점수
        if (user.positiveHistory) score += user.positiveHistory * 5;
        if (user.negativeHistory) score -= user.negativeHistory * 10;
        
        // 기간 기반 점수
        if (user.tenureMonths > 12) score += 10;
        if (user.tenureMonths > 24) score += 10;
        
        // 참여도 기반 점수
        if (user.engagementRate > 0.7) score += 15;
        
        return Math.max(0, Math.min(100, score));
    },
    
    /**
     * Generate trust recovery actions
     */
    generateTrustActions: function(user, churnRisk) {
        const actions = [];
        
        // 위험도에 따른 액션
        if (churnRisk > 0.8) {
            actions.push({
                priority: 1,
                action: '대표/원장 직접 연락',
                timing: 'immediate'
            });
        }
        
        if (churnRisk > 0.5) {
            actions.push({
                priority: 2,
                action: '특별 혜택 제공',
                timing: '24h'
            });
            actions.push({
                priority: 3,
                action: '불만 사항 청취 미팅',
                timing: '48h'
            });
        }
        
        actions.push({
            priority: 4,
            action: '개선 계획 공유',
            timing: '1week'
        });
        
        actions.push({
            priority: 5,
            action: '정기 체크인 스케줄',
            timing: 'ongoing'
        });
        
        return actions;
    },
    
    /**
     * Get recovery summary
     */
    getSummary: function() {
        return {
            activeRecoveries: this.recoveryQueue.length,
            totalSuccess: this.successHistory.filter(p => p.status === 'SUCCESS').length,
            totalPartial: this.successHistory.filter(p => p.status === 'PARTIAL').length,
            avgRecoveryRate: this.calculateAvgRecoveryRate(),
            currentQueue: this.recoveryQueue.map(p => ({
                userId: p.userId,
                program: p.program,
                progress: Math.round(p.progress * 100) + '%',
                daysRemaining: Math.ceil(p.duration - (Date.now() - p.startTime) / (24*60*60*1000))
            }))
        };
    },
    
    /**
     * Calculate average recovery rate
     */
    calculateAvgRecoveryRate: function() {
        if (this.successHistory.length === 0) return 0;
        
        const successCount = this.successHistory.filter(p => p.status === 'SUCCESS').length;
        return successCount / this.successHistory.length;
    }
};

// ================================================================
// UNIFIED RETENTION ENGINE
// ================================================================

export const RetentionEngine = {
    // Components
    inertiaTracker: InertiaTracker,
    reactionOptimizer: ReactionOptimizer,
    energyRecovery: EnergyRecovery,
    
    /**
     * Initialize retention engine
     */
    init: function() {
        console.log('[RetentionEngine] Initialized');
        return this;
    },
    
    /**
     * Full retention analysis for members
     * @param {Array} members - Member list
     * @returns {Object} Retention analysis
     */
    analyze: function(members) {
        // 1. 에너지 스캔
        const energyScan = EnergyScanner.batchScan(members);
        
        // 2. 멤버 에너지 분석
        const memberAnalysis = MemberEnergyAnalyzer.evaluateBatch(members);
        
        // 3. 감쇠 체크
        members.forEach(m => this.inertiaTracker.startTracking(m));
        const decayingUsers = this.inertiaTracker.checkDecay();
        
        // 4. 고위험 사용자 회복 시작
        const recoveryPlans = decayingUsers
            .filter(u => u.urgency === 'CRITICAL' || u.urgency === 'HIGH')
            .map(u => this.energyRecovery.convertToTrust({
                id: u.userId,
                currentEnergy: u.currentEnergy,
                initialEnergy: u.initialEnergy
            }));
        
        return {
            summary: {
                totalMembers: members.length,
                criticalCount: memberAnalysis.summary.critical,
                avgEnergy: energyScan.summary.avgEnergy,
                decayingCount: decayingUsers.length,
                recoveryStarted: recoveryPlans.filter(p => p.success).length
            },
            energyScan,
            memberAnalysis,
            decayingUsers,
            recoveryPlans,
            recommendations: this.generateOverallRecommendations(memberAnalysis, decayingUsers),
            analyzedAt: Date.now()
        };
    },
    
    /**
     * Generate overall recommendations
     */
    generateOverallRecommendations: function(memberAnalysis, decayingUsers) {
        const recommendations = [];
        
        if (memberAnalysis.summary.critical > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                action: `${memberAnalysis.summary.critical}명 즉시 개입 필요`,
                members: memberAnalysis.byPriority.CRITICAL.map(m => m.id)
            });
        }
        
        if (decayingUsers.filter(u => u.isGoldenTimeExpired).length > 0) {
            recommendations.push({
                priority: 'HIGH',
                action: '골든타임 경과 회원 긴급 연락',
                count: decayingUsers.filter(u => u.isGoldenTimeExpired).length
            });
        }
        
        if (memberAnalysis.summary.avgEnergy < 0.4) {
            recommendations.push({
                priority: 'MEDIUM',
                action: '전체 회원 참여 캠페인 필요',
                reason: '평균 에너지 수준 저하'
            });
        }
        
        return recommendations;
    }
};

export default RetentionEngine;




