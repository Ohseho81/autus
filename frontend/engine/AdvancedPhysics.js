// ================================================================
// ADVANCED PHYSICS MODULE
// 고급 물리 계산: 관성, 가속 감쇠, 공명 경로, 에너지 분석
// ================================================================

const DECAY_CONSTANT = 0.001;           // 시간당 에너지 감쇠율
const RESONANCE_THRESHOLD = 0.7;        // 공명 임계치
const INERTIA_FACTOR = 9.8;             // 관성 계수
const GLOBAL_MARKET_CONSTANT = 0.001;   // 시장 상수
const GOLDEN_TIME_HOURS = 72;           // 골든타임 (시간)

// Action Type Multipliers
const ACTION_MULTIPLIERS = {
    'PRESENTATION': 3.0,
    'CONSULT': 1.5,
    'ATTENDANCE': 1.0,
    'commit': 2.0,
    'invest': 1.8,
    'connect': 1.5,
    'create': 1.7,
    'update': 1.2,
    'review': 1.1,
    'share': 1.3,
    'view': 0.5,
    'browse': 0.3,
    'idle': 0.1
};

export const AdvancedPhysics = {
    // ================================================================
    // 1. 관성 계산 (Inertia Calculation)
    // ================================================================
    
    /**
     * Calculate inertia for a member
     * 관성 = 질량 × 저항 계수 × 연결 밀도
     * @param {Object} member - Member object with mass, friction, connections
     * @returns {number} Inertia value
     */
    calculateInertia: function(member) {
        const mass = member.mass || member.node_mass || 1.0;
        const friction = member.friction || member.frictionCoefficient || 0.5;
        const connections = member.connections?.length || member.connectionCount || 0;
        
        // 연결이 많을수록 관성 증가 (움직이기 어려움)
        const connectionDensity = 1 + Math.log10(connections + 1) * 0.2;
        
        // 기본 관성 공식
        const baseInertia = mass * friction * INERTIA_FACTOR;
        
        // 연결 밀도 적용
        const totalInertia = baseInertia * connectionDensity;
        
        return {
            value: totalInertia,
            components: {
                mass,
                friction,
                connectionDensity,
                baseInertia
            },
            breakForce: totalInertia * 1.5 // 관성을 깨기 위한 최소 힘
        };
    },
    
    /**
     * Check if force can overcome inertia
     */
    canOvercomeInertia: function(member, appliedForce) {
        const inertia = this.calculateInertia(member);
        return appliedForce >= inertia.breakForce;
    },
    
    // ================================================================
    // 2. 가속 감쇠 (Accelerated Decay)
    // ================================================================
    
    /**
     * Apply accelerated decay to energy based on time elapsed
     * 골든타임 경과 시 급격한 에너지 하락 (지수 감쇠)
     * @param {number} energy - Current energy
     * @param {number|Date} lastSeen - Last interaction timestamp (or hours past)
     * @returns {Object} Decayed energy details
     */
    applyAcceleratedDecay: function(energy, lastSeen) {
        if (!lastSeen && lastSeen !== 0) return { value: energy, original: energy };
        
        let hoursPast;
        
        // lastSeen이 시간(hours)인지 timestamp인지 확인
        if (typeof lastSeen === 'number' && lastSeen < 10000) {
            // 직접 hours로 전달된 경우
            hoursPast = lastSeen;
        } else {
            // timestamp인 경우
            const lastTime = lastSeen instanceof Date ? lastSeen.getTime() : lastSeen;
            const elapsedMs = Date.now() - lastTime;
            hoursPast = elapsedMs / (60 * 60 * 1000);
        }
        
        // 골든타임 기반 감쇠율 (72시간 초과 시 급격한 감쇠)
        const decayRate = hoursPast > GOLDEN_TIME_HOURS ? 0.15 : 0.05;
        const decayedEnergy = energy * Math.exp(-decayRate * hoursPast);
        
        // 상태 분류
        let status = 'STABLE';
        if (hoursPast > GOLDEN_TIME_HOURS * 2) status = 'CRITICAL';
        else if (hoursPast > GOLDEN_TIME_HOURS) status = 'DECAYING';
        
        return {
            value: Math.max(0, decayedEnergy),
            original: energy,
            hoursPast,
            daysPast: hoursPast / 24,
            decayRate,
            isGoldenTimeExpired: hoursPast > GOLDEN_TIME_HOURS,
            lossPercentage: ((energy - decayedEnergy) / energy) * 100,
            status
        };
    },
    
    /**
     * Calculate half-life of energy
     */
    calculateHalfLife: function() {
        // t½ = ln(2) / λ
        return Math.log(2) / DECAY_CONSTANT;
    },
    
    // ================================================================
    // 3. 공명 경로 탐색 (Resonant Path Finding)
    // ================================================================
    
    /**
     * Find resonant path in member history
     * 반복 패턴을 찾아 공명 경로 식별
     * @param {Array} history - Array of past actions/events
     * @returns {Object} Resonance analysis
     */
    findResonantPath: function(history) {
        if (!history || history.length < 3) {
            return {
                found: false,
                frequency: 0,
                pattern: null,
                strength: 0
            };
        }
        
        // 패턴 분석
        const patterns = this.analyzePatterns(history);
        
        // 가장 강한 공명 패턴 찾기
        const strongestPattern = patterns.reduce((best, p) => 
            p.strength > best.strength ? p : best,
            { strength: 0 }
        );
        
        // 공명 임계치 체크
        const isResonant = strongestPattern.strength >= RESONANCE_THRESHOLD;
        
        return {
            found: isResonant,
            frequency: strongestPattern.frequency || 0,
            pattern: strongestPattern.type || null,
            strength: strongestPattern.strength,
            amplification: isResonant ? 1 + strongestPattern.strength * 0.5 : 1,
            allPatterns: patterns
        };
    },
    
    /**
     * Analyze patterns in history
     */
    analyzePatterns: function(history) {
        const patterns = [];
        
        // 시간 패턴 분석
        if (history[0]?.timestamp) {
            const timePattern = this.analyzeTimePattern(history);
            if (timePattern) patterns.push(timePattern);
        }
        
        // 액션 타입 패턴 분석
        if (history[0]?.type || history[0]?.action) {
            const actionPattern = this.analyzeActionPattern(history);
            if (actionPattern) patterns.push(actionPattern);
        }
        
        // 값 패턴 분석
        if (history[0]?.value !== undefined) {
            const valuePattern = this.analyzeValuePattern(history);
            if (valuePattern) patterns.push(valuePattern);
        }
        
        return patterns;
    },
    
    /**
     * Analyze time-based patterns
     */
    analyzeTimePattern: function(history) {
        const timestamps = history.map(h => h.timestamp).filter(t => t);
        if (timestamps.length < 3) return null;
        
        // 간격 계산
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i-1]);
        }
        
        // 간격 일관성 측정
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => 
            sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
        const cv = Math.sqrt(variance) / avgInterval; // Coefficient of variation
        
        // 일관성이 높을수록 공명 강도 높음
        const strength = Math.max(0, 1 - cv);
        
        return {
            type: 'time_regular',
            frequency: 1 / avgInterval,
            period: avgInterval,
            strength,
            description: `평균 ${(avgInterval / (24*60*60*1000)).toFixed(1)}일 간격`
        };
    },
    
    /**
     * Analyze action type patterns
     */
    analyzeActionPattern: function(history) {
        const actions = history.map(h => h.type || h.action).filter(a => a);
        if (actions.length < 3) return null;
        
        // 액션 빈도 계산
        const counts = {};
        actions.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
        
        // 가장 빈번한 액션
        const [topAction, topCount] = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])[0];
        
        const strength = topCount / actions.length;
        
        return {
            type: 'action_dominant',
            dominantAction: topAction,
            frequency: topCount / history.length,
            strength,
            description: `'${topAction}' 액션 ${Math.round(strength * 100)}% 지배`
        };
    },
    
    /**
     * Analyze value patterns
     */
    analyzeValuePattern: function(history) {
        const values = history.map(h => h.value).filter(v => typeof v === 'number');
        if (values.length < 3) return null;
        
        // 트렌드 분석
        let increasing = 0, decreasing = 0;
        for (let i = 1; i < values.length; i++) {
            if (values[i] > values[i-1]) increasing++;
            else if (values[i] < values[i-1]) decreasing++;
        }
        
        const total = values.length - 1;
        const trendStrength = Math.max(increasing, decreasing) / total;
        const trend = increasing > decreasing ? 'increasing' : 'decreasing';
        
        return {
            type: `value_${trend}`,
            trend,
            frequency: trendStrength,
            strength: trendStrength,
            description: `값 ${trend === 'increasing' ? '상승' : '하락'} 추세 ${Math.round(trendStrength * 100)}%`
        };
    },
    
    // ================================================================
    // 4. 유효 질량 계산 (Effective Mass)
    // ================================================================
    
    /**
     * Calculate effective mass based on action type
     * 액션 타입에 따른 실제 적용 질량 계산 (질적 가치 반영)
     * @param {string} actionType - Type of action
     * @param {number} intensity - Action intensity (0-1)
     * @returns {Object} Effective mass calculation
     */
    calculateEffectiveMass: function(actionType, intensity = 1.0) {
        const multiplier = ACTION_MULTIPLIERS[actionType] || 1.0;
        const effectiveMass = multiplier * intensity;
        
        return {
            value: effectiveMass,
            intensity,
            multiplier,
            actionType,
            impactLevel: multiplier >= 2.0 ? 'high' : multiplier >= 1.0 ? 'medium' : 'low',
            qualityScore: effectiveMass / 3.0 // Normalized to max multiplier
        };
    },
    
    // ================================================================
    // 5. 에너지 준위 판별 (Energy Level Classification)
    // ================================================================
    
    /**
     * Classify energy level
     * @param {number} energy - Energy value
     * @returns {Object} Energy level classification
     */
    classifyEnergyLevel: function(energy) {
        const levels = [
            { name: 'CRITICAL', min: 0, max: 0.1, color: '#ff0000', action: 'urgent_intervention' },
            { name: 'LOW', min: 0.1, max: 0.3, color: '#ff6600', action: 'boost_required' },
            { name: 'MODERATE', min: 0.3, max: 0.6, color: '#ffcc00', action: 'maintain' },
            { name: 'HIGH', min: 0.6, max: 0.8, color: '#66ff00', action: 'optimize' },
            { name: 'OPTIMAL', min: 0.8, max: 1.0, color: '#00ff88', action: 'sustain' },
            { name: 'OVERFLOW', min: 1.0, max: Infinity, color: '#00ffff', action: 'redistribute' }
        ];
        
        const level = levels.find(l => energy >= l.min && energy < l.max) || levels[0];
        
        return {
            level: level.name,
            energy,
            color: level.color,
            recommendedAction: level.action,
            percentile: Math.min(energy / 0.8, 1) * 100, // 0.8을 100%로 정규화
            isHealthy: energy >= 0.3 && energy <= 1.0
        };
    }
};

// ================================================================
// AUTUS_Physics: Elon's Success Physics Kernel
// ================================================================

export const AUTUS_Physics = {
    /**
     * 1. 관성 돌파 연산: 개체를 이동시키기 위한 '최소 힘' 계산
     * 이 값보다 낮은 액션은 '무효' 처리됨
     * @param {Object} node - Node with mass and resistance
     * @returns {Object} Required force details
     */
    getRequiredForce: function(node) {
        const mass = node.mass || node.node_mass || 1.0;
        const resistance = node.psychologicalResistance || node.friction || 0.5;
        const staticFriction = mass * resistance * INERTIA_FACTOR;
        
        return {
            value: staticFriction,
            mass,
            resistance,
            formula: `${mass} × ${resistance} × ${INERTIA_FACTOR}`,
            minValidAction: staticFriction,
            isHeavy: staticFriction > 50
        };
    },
    
    /**
     * 2. 작용-반작용 연산: 이동에 따른 에너지 환산
     * @param {number} forceApplied - Applied force
     * @param {number} efficiency - System efficiency (0-1)
     * @returns {Object} Reaction calculation
     */
    calculateReaction: function(forceApplied, efficiency = 0.85) {
        const workDone = forceApplied * efficiency;
        const heatLoss = forceApplied * (1 - efficiency);
        const revenueReaction = workDone * GLOBAL_MARKET_CONSTANT;
        
        return {
            workDone,
            revenueReaction,
            heatLoss,
            efficiency,
            netGain: workDone - heatLoss,
            roi: workDone / forceApplied
        };
    },
    
    /**
     * 3. 에너지 보존 감사: 시스템의 자산 총량 유지 확인
     * 이 값이 줄어들면 시스템은 '붕괴' 경고를 보냄
     * @param {Array} nodes - Array of nodes
     * @returns {Object} System energy audit
     */
    auditSystemEnergy: function(nodes) {
        const totalPotential = nodes.reduce((sum, node) => {
            const mass = node.mass || 1;
            const distance = node.distanceToGoal || node.distance || 1;
            return sum + (mass / Math.max(distance, 0.1));
        }, 0);
        
        // 이전 감사 값과 비교 (저장된 경우)
        const previousTotal = this._lastAuditValue || totalPotential;
        const delta = totalPotential - previousTotal;
        this._lastAuditValue = totalPotential;
        
        return {
            totalPotential,
            nodeCount: nodes.length,
            averagePotential: totalPotential / nodes.length,
            delta,
            status: delta < -0.1 * previousTotal ? 'COLLAPSE_WARNING' : 
                    delta < 0 ? 'DECLINING' : 'STABLE',
            isHealthy: delta >= 0
        };
    },
    
    // 저장된 이전 감사 값
    _lastAuditValue: null
};

// ================================================================
// MemberEnergyAnalyzer: 멤버별 에너지 평가
// ================================================================

export const MemberEnergyAnalyzer = {
    /**
     * Evaluate member energy level
     * @param {Object} member - Member data
     * @returns {Object} Energy evaluation
     */
    evaluate: function(member) {
        // 출석률 점수 (40%)
        const attendanceScore = (member.attendanceRate || 0) * 0.4;
        
        // 추가 이벤트 참여 점수 (40%) - 가중치 높음
        const eventScore = (member.extraEventParticipation || 0) * 0.4;
        
        // 상담 점수 (20%) - 과도한 상담은 가중치 제한 (최대 5회)
        const consultScore = Math.min(member.consultCount || 0, 5) * 0.2 / 5;
        
        // Raw 에너지 계산
        const rawEnergy = attendanceScore + eventScore + consultScore;
        
        // 마지막 활동 이후 감쇠 적용
        const daysSinceLastAction = member.daysSinceLastAction || 0;
        const decayedEnergy = rawEnergy * Math.exp(-0.1 * daysSinceLastAction);
        
        // 우선순위 결정
        let priority = 'STABLE';
        if (decayedEnergy < 0.1) priority = 'CRITICAL';
        else if (decayedEnergy < 0.3) priority = 'IMMEDIATE_ACTION';
        else if (decayedEnergy < 0.5) priority = 'MONITOR';
        
        return {
            id: member.id,
            name: member.name,
            energyLevel: decayedEnergy,
            rawEnergy,
            priority,
            components: {
                attendance: attendanceScore,
                events: eventScore,
                consult: consultScore
            },
            decay: {
                daysSinceLastAction,
                decayFactor: Math.exp(-0.1 * daysSinceLastAction)
            },
            recommendations: this.getRecommendations(priority, member)
        };
    },
    
    /**
     * Get recommendations based on priority
     */
    getRecommendations: function(priority, member) {
        const recommendations = [];
        
        switch (priority) {
            case 'CRITICAL':
                recommendations.push('즉시 연락 필요');
                recommendations.push('1:1 상담 스케줄링');
                break;
            case 'IMMEDIATE_ACTION':
                recommendations.push('이번 주 내 접촉 권장');
                recommendations.push('참여 유도 이벤트 초대');
                break;
            case 'MONITOR':
                recommendations.push('정기 모니터링 유지');
                break;
        }
        
        // 특정 점수가 낮은 경우 추가 권장사항
        if ((member.attendanceRate || 0) < 0.5) {
            recommendations.push('출석률 개선 프로그램 제안');
        }
        if ((member.extraEventParticipation || 0) < 0.3) {
            recommendations.push('특별 이벤트 참여 독려');
        }
        
        return recommendations;
    },
    
    /**
     * Batch evaluate multiple members
     */
    evaluateBatch: function(members) {
        const results = members.map(m => this.evaluate(m));
        
        // 우선순위별 그룹화
        const byPriority = {
            CRITICAL: results.filter(r => r.priority === 'CRITICAL'),
            IMMEDIATE_ACTION: results.filter(r => r.priority === 'IMMEDIATE_ACTION'),
            MONITOR: results.filter(r => r.priority === 'MONITOR'),
            STABLE: results.filter(r => r.priority === 'STABLE')
        };
        
        return {
            members: results,
            summary: {
                total: members.length,
                critical: byPriority.CRITICAL.length,
                needsAction: byPriority.IMMEDIATE_ACTION.length,
                avgEnergy: results.reduce((s, r) => s + r.energyLevel, 0) / results.length
            },
            byPriority,
            alerts: byPriority.CRITICAL.map(m => ({
                memberId: m.id,
                level: 'CRITICAL',
                message: `${m.name || m.id} 즉시 조치 필요`
            }))
        };
    }
};

// ================================================================
// EnergyScanner: 실시간 에너지 스캔
// ================================================================

export const EnergyScanner = {
    /**
     * Scan member data for energy level
     * @param {Object} memberData - Member data with logs
     * @returns {Object} Energy scan result
     */
    scan: function(memberData) {
        // 속도 (활동 빈도)
        const velocity = this.calculateFrequency(memberData.activityLog || []);
        
        // 전도도 (응답률)
        const conductivity = this.calculateResponseRate(memberData.commLog || []);
        
        // 엔트로피 (부정어 검출)
        const entropy = this.analyzeSentiments(memberData.chatLog || []);
        
        // 일론의 에너지 공식: E = 2V + C - S
        const energyLevel = (velocity * 2) + conductivity - entropy;
        
        // 상태 결정
        let status = 'STABLE';
        if (energyLevel < 10) status = 'CRITICAL_LOW';
        else if (energyLevel < 30) status = 'LOW';
        else if (energyLevel < 50) status = 'MODERATE';
        else if (energyLevel > 80) status = 'HIGH';
        
        return {
            id: memberData.id,
            energy: energyLevel,
            normalizedEnergy: Math.min(energyLevel / 100, 1),
            status,
            components: {
                velocity,
                conductivity,
                entropy
            },
            formula: `(${velocity} × 2) + ${conductivity} - ${entropy} = ${energyLevel}`,
            recommendations: this.getRecommendations(status, { velocity, conductivity, entropy })
        };
    },
    
    /**
     * Calculate activity frequency
     */
    calculateFrequency: function(activityLog) {
        if (!activityLog || activityLog.length === 0) return 0;
        
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        
        // 최근 7일 활동 수
        const recentActivities = activityLog.filter(a => {
            const timestamp = a.timestamp || a.time || a.date;
            return timestamp && timestamp > weekAgo;
        });
        
        // 일당 활동 수 기반 점수 (0-50)
        const dailyRate = recentActivities.length / 7;
        return Math.min(dailyRate * 10, 50);
    },
    
    /**
     * Calculate response rate
     */
    calculateResponseRate: function(commLog) {
        if (!commLog || commLog.length === 0) return 0;
        
        // 응답 있는 메시지 비율
        const responded = commLog.filter(c => c.responded || c.reply).length;
        const rate = responded / commLog.length;
        
        // 0-50 스케일
        return rate * 50;
    },
    
    /**
     * Analyze sentiments (entropy from negative words)
     */
    analyzeSentiments: function(chatLog) {
        if (!chatLog || chatLog.length === 0) return 0;
        
        const negativeWords = [
            '불만', '싫어', '안돼', '못해', '어려', '힘들', '짜증',
            'hate', 'dislike', 'cannot', 'difficult', 'hard', 'annoying',
            '취소', '환불', '그만', '포기'
        ];
        
        let negativeCount = 0;
        chatLog.forEach(chat => {
            const text = (chat.text || chat.message || '').toLowerCase();
            negativeWords.forEach(word => {
                if (text.includes(word)) negativeCount++;
            });
        });
        
        // 부정어 비율 기반 엔트로피 (0-30)
        const negativeRate = negativeCount / Math.max(chatLog.length, 1);
        return Math.min(negativeRate * 30, 30);
    },
    
    /**
     * Get recommendations based on status
     */
    getRecommendations: function(status, components) {
        const recommendations = [];
        
        if (status === 'CRITICAL_LOW' || status === 'LOW') {
            recommendations.push('긴급 리텐션 프로그램 적용');
        }
        
        if (components.velocity < 10) {
            recommendations.push('활동 유도 캠페인 필요');
        }
        
        if (components.conductivity < 20) {
            recommendations.push('소통 채널 점검 및 개선');
        }
        
        if (components.entropy > 20) {
            recommendations.push('불만 요인 파악 및 해결');
            recommendations.push('1:1 상담 권장');
        }
        
        return recommendations;
    },
    
    /**
     * Batch scan multiple members
     */
    batchScan: function(membersData) {
        const results = membersData.map(m => this.scan(m));
        
        // 상태별 그룹화
        const byStatus = {};
        results.forEach(r => {
            if (!byStatus[r.status]) byStatus[r.status] = [];
            byStatus[r.status].push(r);
        });
        
        return {
            members: results,
            summary: {
                total: membersData.length,
                critical: (byStatus['CRITICAL_LOW'] || []).length,
                low: (byStatus['LOW'] || []).length,
                avgEnergy: results.reduce((s, r) => s + r.energy, 0) / results.length
            },
            byStatus,
            alerts: (byStatus['CRITICAL_LOW'] || []).map(m => ({
                memberId: m.id,
                level: 'CRITICAL',
                energy: m.energy,
                message: `에너지 위험 수준: ${m.energy.toFixed(1)}`
            }))
        };
    }
};

export default AdvancedPhysics;




