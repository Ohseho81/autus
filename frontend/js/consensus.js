// ============================================
// AUTUS Consensus Engine
// 활용 결과 기반 자동 합의 시스템
// ============================================

const ConsensusEngine = {
    // ============================================
    // LEDGER SCHEMA
    // ============================================
    
    /**
     * 활용 로그 스키마
     * @typedef {Object} UsageLog
     * @property {string} id - 고유 ID (UUID)
     * @property {string} taskId - 업무 ID (예: "weekly_report", "invoice_processing")
     * @property {string} solutionId - 솔루션 ID (예: "auto_report_v1", "template_based")
     * @property {string} userId - 사용자 ID
     * @property {string} userType - 사용자 역할 (owner, teacher, staff, etc.)
     * @property {number} timestamp - 실행 시점 (Unix timestamp)
     * @property {Object} before - 실행 전 스냅샷
     * @property {number} before.M - Mint (아웃풋 가치)
     * @property {number} before.T - Tax (인풋 비용)
     * @property {number} before.s - Synergy 계수 (0~1)
     * @property {Object} after - 실행 후 실측값
     * @property {number} after.M - Mint (아웃풋 가치)
     * @property {number} after.T - Tax (인풋 비용)
     * @property {number} after.s - Synergy 계수 (0~1)
     * @property {number} durationMinutes - 활용 시간(분)
     * @property {number} effectivenessScore - 자동 계산된 실효성 점수
     */

    // 저장소
    usageLogs: [],
    solutionStats: {},  // solutionId → 집계 통계
    standards: {},      // taskId → standardSolutionId

    // ============================================
    // CONSTANTS (내부 전용 - 사용자 노출 금지)
    // ============================================
    WEIGHTS: {
        DELTA_M: 0.40,      // 아웃풋 가치 증가 비율
        DELTA_T: 0.40,      // 인풋 비용 감소 비율
        USAGE: 0.10,        // 사용 빈도
        DELTA_S: 0.10       // 시너지 증가 비율
    },

    CAPS: {
        DELTA_M_MAX: 2.0,   // 가치 증가 최대 200%
        DELTA_T_MAX: 0.95,  // 비용 절감 최대 95%
        DELTA_S_MAX: 1.0    // 시너지 증가 최대 100%
    },

    STANDARD_THRESHOLDS: {
        MIN_SCORE: 0.80,        // 최소 실효성 점수
        MIN_USAGE_COUNT: 50,    // 최소 활용 횟수
        MIN_V_GROWTH: 0.15      // 최소 V 증가율 (15%)
    },

    // 최대 사용 횟수 (정규화용, 동적 업데이트)
    maxUsageCount: 500,

    // ============================================
    // EFFECTIVENESS SCORE CALCULATION
    // ============================================

    /**
     * 정규화 함수 (0~max 범위로 캡핑)
     */
    normalize(value, max = 1.0) {
        return Math.min(max, Math.max(0, value));
    },

    /**
     * 단일 활용 로그의 실효성 점수 계산
     * @param {Object} before - {M, T, s}
     * @param {Object} after - {M, T, s}
     * @param {number} usageCount - 해당 솔루션의 누적 사용 횟수
     * @returns {number} 실효성 점수 (0.00 ~ 1.00)
     */
    calculateEffectiveness(before, after, usageCount = 1) {
        // 1. ΔM 정규화 (가치 증가율)
        const deltaM = before.M > 0 
            ? (after.M - before.M) / before.M 
            : 0;
        const deltaMNorm = this.normalize(deltaM, this.CAPS.DELTA_M_MAX);

        // 2. ΔT 정규화 (비용 감소율) - 감소가 양수
        const deltaT = before.T > 0 
            ? (before.T - after.T) / before.T 
            : 0;
        const deltaTNorm = this.normalize(deltaT, this.CAPS.DELTA_T_MAX);

        // 3. Usage 정규화 (로그 스케일)
        const usageNorm = Math.log(usageCount + 1) / Math.log(this.maxUsageCount + 1);

        // 4. Δs 정규화 (시너지 증가율)
        const deltaS = before.s > 0 
            ? (after.s - before.s) / before.s 
            : (after.s > 0 ? 1.0 : 0);
        const deltaSNorm = this.normalize(deltaS, this.CAPS.DELTA_S_MAX);

        // 최종 실효성 점수
        const score = 
            this.WEIGHTS.DELTA_M * deltaMNorm +
            this.WEIGHTS.DELTA_T * deltaTNorm +
            this.WEIGHTS.USAGE * usageNorm +
            this.WEIGHTS.DELTA_S * deltaSNorm;

        return Math.round(score * 1000) / 1000; // 소수점 3자리
    },

    /**
     * V 증가율 계산
     * V = (M - T) × (1 + s)^t
     */
    calculateVGrowth(before, after, t = 1) {
        const vBefore = (before.M - before.T) * Math.pow(1 + before.s, t);
        const vAfter = (after.M - after.T) * Math.pow(1 + after.s, t);
        
        if (vBefore <= 0) return vAfter > 0 ? 1.0 : 0;
        return (vAfter - vBefore) / Math.abs(vBefore);
    },

    // ============================================
    // USAGE LOG MANAGEMENT
    // ============================================

    /**
     * 활용 로그 기록
     * @param {Object} params
     * @returns {UsageLog}
     */
    recordUsage({ taskId, solutionId, userId, userType, before, after, durationMinutes = 0 }) {
        // 솔루션 사용 횟수 업데이트
        if (!this.solutionStats[solutionId]) {
            this.solutionStats[solutionId] = {
                taskId,
                usageCount: 0,
                totalScore: 0,
                avgScore: 0,
                totalVGrowth: 0,
                avgVGrowth: 0,
                users: new Set(),
                firstUsed: Date.now(),
                lastUsed: Date.now()
            };
        }

        const stats = this.solutionStats[solutionId];
        stats.usageCount++;
        stats.lastUsed = Date.now();
        stats.users.add(userId);

        // 최대 사용 횟수 업데이트 (정규화용)
        if (stats.usageCount > this.maxUsageCount) {
            this.maxUsageCount = stats.usageCount;
        }

        // 실효성 점수 계산
        const effectivenessScore = this.calculateEffectiveness(before, after, stats.usageCount);
        const vGrowth = this.calculateVGrowth(before, after);

        // 통계 업데이트
        stats.totalScore += effectivenessScore;
        stats.avgScore = stats.totalScore / stats.usageCount;
        stats.totalVGrowth += vGrowth;
        stats.avgVGrowth = stats.totalVGrowth / stats.usageCount;

        // 로그 생성
        const log = {
            id: crypto.randomUUID(),
            taskId,
            solutionId,
            userId,
            userType,
            timestamp: Date.now(),
            before,
            after,
            durationMinutes,
            effectivenessScore,
            vGrowth
        };

        this.usageLogs.push(log);
        this.saveToStorage();

        // 표준 고정 조건 체크
        this.checkStandardization(taskId, solutionId);

        return log;
    },

    // ============================================
    // STANDARDIZATION (표준 고정)
    // ============================================

    /**
     * 표준 고정 조건 체크 및 자동 트리거
     */
    checkStandardization(taskId, solutionId) {
        const stats = this.solutionStats[solutionId];
        if (!stats) return null;

        const meetsScore = stats.avgScore >= this.STANDARD_THRESHOLDS.MIN_SCORE;
        const meetsUsage = stats.usageCount >= this.STANDARD_THRESHOLDS.MIN_USAGE_COUNT;
        const meetsVGrowth = stats.avgVGrowth >= this.STANDARD_THRESHOLDS.MIN_V_GROWTH;

        const result = {
            taskId,
            solutionId,
            meetsScore,
            meetsUsage,
            meetsVGrowth,
            isStandard: meetsScore && meetsUsage && meetsVGrowth,
            stats: {
                avgScore: stats.avgScore,
                usageCount: stats.usageCount,
                avgVGrowth: stats.avgVGrowth,
                uniqueUsers: stats.users.size
            }
        };

        // 표준 고정
        if (result.isStandard) {
            const currentStandard = this.standards[taskId];
            
            if (!currentStandard || currentStandard.solutionId !== solutionId) {
                // 기존 표준이 있으면 Gate-2 경고
                if (currentStandard) {
                    this.triggerGate2Warning(taskId, currentStandard.solutionId, solutionId);
                }

                this.standards[taskId] = {
                    solutionId,
                    standardizedAt: Date.now(),
                    avgScore: stats.avgScore,
                    usageCount: stats.usageCount,
                    avgVGrowth: stats.avgVGrowth
                };

                this.saveToStorage();
                this.notifyStandardization(taskId, solutionId);
            }
        }

        return result;
    },

    /**
     * Gate-2 경고 발동
     */
    triggerGate2Warning(taskId, oldSolutionId, newSolutionId) {
        const warning = {
            type: 'GATE_2_STANDARD_CHANGE',
            taskId,
            oldSolutionId,
            newSolutionId,
            timestamp: Date.now(),
            message: `표준 솔루션이 변경됩니다. 기존 워크플로우 조정이 필요할 수 있습니다.`,
            estimatedImpact: {
                affectedUsers: this.solutionStats[oldSolutionId]?.users.size || 0,
                transitionCost: 'MEDIUM'
            }
        };

        console.warn('[GATE-2 WARNING]', warning);
        
        // 이벤트 발생
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('autus:gate2', { detail: warning }));
        }

        return warning;
    },

    /**
     * 표준화 알림 (사용자 친화적)
     */
    notifyStandardization(taskId, solutionId) {
        const notification = {
            type: 'STANDARD_FIXED',
            taskId,
            solutionId,
            timestamp: Date.now(),
            // 사용자에게 보이는 메시지 (숫자 없음)
            userMessage: this.generateUserFriendlyMessage(taskId, solutionId)
        };

        console.log('[STANDARD FIXED]', notification);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('autus:standard', { detail: notification }));
        }

        return notification;
    },

    /**
     * 사용자 친화적 메시지 생성 (숫자 노출 금지)
     */
    generateUserFriendlyMessage(taskId, solutionId) {
        const messages = [
            `이 업무의 가장 효과적인 방법이 확인되었습니다.`,
            `많은 분들이 활용하고 가치를 높이고 있는 솔루션입니다.`,
            `실제 결과로 검증된 방법입니다.`,
            `같은 업무를 하는 분들이 가장 많이 선택하는 방법입니다.`,
            `활용 결과가 가장 좋은 솔루션으로 자동 선정되었습니다.`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    },

    // ============================================
    // RETRO PGF (공헌 기반 보상)
    // ============================================

    /**
     * RetroPGF 배분 계산 (분기별)
     * @param {number} totalReward - 총 보상 풀 (AUS 토큰)
     * @param {number} startTime - 집계 시작 시점
     * @param {number} endTime - 집계 종료 시점
     */
    calculateRetroPGF(totalReward, startTime, endTime) {
        // 기간 내 로그 필터링
        const periodLogs = this.usageLogs.filter(
            log => log.timestamp >= startTime && log.timestamp <= endTime
        );

        // 사용자별 기여도 계산
        const userContributions = {};
        
        periodLogs.forEach(log => {
            if (!userContributions[log.userId]) {
                userContributions[log.userId] = {
                    userId: log.userId,
                    userType: log.userType,
                    totalScore: 0,
                    logCount: 0,
                    standardContributions: 0 // 표준화에 기여한 횟수
                };
            }

            const contrib = userContributions[log.userId];
            contrib.totalScore += log.effectivenessScore;
            contrib.logCount++;

            // 표준 솔루션 활용 시 추가 가중치
            if (this.standards[log.taskId]?.solutionId === log.solutionId) {
                contrib.standardContributions++;
            }
        });

        // 총 기여도 합계
        let totalContribution = 0;
        Object.values(userContributions).forEach(c => {
            c.weightedScore = c.totalScore + (c.standardContributions * 0.2);
            totalContribution += c.weightedScore;
        });

        // 비례 배분
        const distributions = Object.values(userContributions).map(c => ({
            userId: c.userId,
            userType: c.userType,
            contribution: c.weightedScore,
            contributionPercent: totalContribution > 0 
                ? (c.weightedScore / totalContribution) * 100 
                : 0,
            reward: totalContribution > 0 
                ? Math.floor((c.weightedScore / totalContribution) * totalReward)
                : 0,
            logCount: c.logCount,
            standardContributions: c.standardContributions
        }));

        // 내림차순 정렬
        distributions.sort((a, b) => b.reward - a.reward);

        return {
            period: { startTime, endTime },
            totalReward,
            totalContribution,
            participantCount: distributions.length,
            distributions
        };
    },

    // ============================================
    // QUERIES
    // ============================================

    /**
     * 업무별 솔루션 랭킹 조회
     */
    getSolutionRanking(taskId) {
        const solutions = Object.entries(this.solutionStats)
            .filter(([_, stats]) => stats.taskId === taskId)
            .map(([solutionId, stats]) => ({
                solutionId,
                avgScore: stats.avgScore,
                usageCount: stats.usageCount,
                avgVGrowth: stats.avgVGrowth,
                uniqueUsers: stats.users.size,
                isStandard: this.standards[taskId]?.solutionId === solutionId
            }))
            .sort((a, b) => b.avgScore - a.avgScore);

        return solutions;
    },

    /**
     * 사용자 기여 통계 조회
     */
    getUserStats(userId) {
        const userLogs = this.usageLogs.filter(log => log.userId === userId);
        
        const stats = {
            totalLogs: userLogs.length,
            totalScore: 0,
            avgScore: 0,
            tasksContributed: new Set(),
            solutionsUsed: new Set(),
            standardContributions: 0
        };

        userLogs.forEach(log => {
            stats.totalScore += log.effectivenessScore;
            stats.tasksContributed.add(log.taskId);
            stats.solutionsUsed.add(log.solutionId);

            if (this.standards[log.taskId]?.solutionId === log.solutionId) {
                stats.standardContributions++;
            }
        });

        stats.avgScore = stats.totalLogs > 0 
            ? stats.totalScore / stats.totalLogs 
            : 0;
        stats.tasksContributed = stats.tasksContributed.size;
        stats.solutionsUsed = stats.solutionsUsed.size;

        return stats;
    },

    // ============================================
    // STORAGE
    // ============================================

    saveToStorage() {
        try {
            // Set을 배열로 변환 (JSON 직렬화용)
            const statsToSave = {};
            Object.entries(this.solutionStats).forEach(([key, val]) => {
                statsToSave[key] = {
                    ...val,
                    users: Array.from(val.users)
                };
            });

            localStorage.setItem('autus_usage_logs', JSON.stringify(this.usageLogs));
            localStorage.setItem('autus_solution_stats', JSON.stringify(statsToSave));
            localStorage.setItem('autus_standards', JSON.stringify(this.standards));
        } catch (e) {
            console.error('ConsensusEngine: Storage save failed', e);
        }
    },

    loadFromStorage() {
        try {
            const logs = localStorage.getItem('autus_usage_logs');
            const stats = localStorage.getItem('autus_solution_stats');
            const standards = localStorage.getItem('autus_standards');

            if (logs) this.usageLogs = JSON.parse(logs);
            if (standards) this.standards = JSON.parse(standards);
            
            if (stats) {
                const parsed = JSON.parse(stats);
                Object.entries(parsed).forEach(([key, val]) => {
                    this.solutionStats[key] = {
                        ...val,
                        users: new Set(val.users || [])
                    };
                });
            }

            // 최대 사용 횟수 재계산
            Object.values(this.solutionStats).forEach(s => {
                if (s.usageCount > this.maxUsageCount) {
                    this.maxUsageCount = s.usageCount;
                }
            });
        } catch (e) {
            console.error('ConsensusEngine: Storage load failed', e);
        }
    },

    reset() {
        this.usageLogs = [];
        this.solutionStats = {};
        this.standards = {};
        this.maxUsageCount = 500;
        localStorage.removeItem('autus_usage_logs');
        localStorage.removeItem('autus_solution_stats');
        localStorage.removeItem('autus_standards');
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        this.loadFromStorage();
        console.log('[ConsensusEngine] Initialized', {
            logs: this.usageLogs.length,
            solutions: Object.keys(this.solutionStats).length,
            standards: Object.keys(this.standards).length
        });
    }
};

// Auto-init
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        ConsensusEngine.init();
    });
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConsensusEngine;
}
