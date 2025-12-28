// ================================================================
// AUTUS PROACTIVE SUGGESTION ENGINE
// Page 4 Energy-Based Recommendations
// Based on Latest Energy Audit
// ================================================================

// ================================================================
// CONSTANTS
// ================================================================

const SUGGESTION_CONFIG = {
    MIN_CONFIDENCE: 0.6,
    MAX_SUGGESTIONS: 5,
    COOLDOWN_MS: 30000,          // 30초 쿨다운
    ENERGY_THRESHOLD_LOW: 0.3,
    ENERGY_THRESHOLD_HIGH: 0.8,
    POPUP_DURATION_MS: 8000     // 8초 표시
};

// ================================================================
// SUGGESTION TEMPLATES
// ================================================================

const SuggestionTemplates = {
    // 에너지 저하 관련
    lowEnergy: [
        {
            id: 'rest',
            title: '휴식 권장',
            message: '에너지 레벨이 낮습니다. 잠시 쉬어가세요.',
            icon: '☕',
            action: 'take_break',
            priority: 'high'
        },
        {
            id: 'recharge',
            title: '재충전 필요',
            message: '활동 에너지가 감소했습니다. 목표를 다시 확인해보세요.',
            icon: '🔋',
            action: 'review_goals',
            priority: 'medium'
        }
    ],
    
    // 높은 에너지
    highEnergy: [
        {
            id: 'momentum',
            title: '모멘텀 활용',
            message: '에너지가 높습니다! 중요한 작업을 진행하세요.',
            icon: '🚀',
            action: 'focus_task',
            priority: 'high'
        },
        {
            id: 'challenge',
            title: '도전 기회',
            message: '최적의 상태입니다. 어려운 과제에 도전해보세요.',
            icon: '💪',
            action: 'tackle_challenge',
            priority: 'medium'
        }
    ],
    
    // 관성 관련
    inertia: [
        {
            id: 'small_start',
            title: '작은 시작',
            message: '관성이 높습니다. 작은 행동부터 시작해보세요.',
            icon: '🌱',
            action: 'small_action',
            priority: 'medium'
        }
    ],
    
    // 연결 관련
    connection: [
        {
            id: 'reach_out',
            title: '연결 강화',
            message: '핵심 인맥과의 소통이 필요합니다.',
            icon: '🤝',
            action: 'contact_key_person',
            priority: 'medium'
        }
    ],
    
    // 패턴 감지
    pattern: [
        {
            id: 'automation',
            title: '자동화 기회',
            message: '반복 패턴이 감지되었습니다. 자동화를 고려해보세요.',
            icon: '⚙️',
            action: 'automate_task',
            priority: 'high'
        }
    ],
    
    // 목표 관련
    goal: [
        {
            id: 'on_track',
            title: '순항 중',
            message: '목표 달성 궤도에 있습니다. 계속 진행하세요!',
            icon: '✨',
            action: 'continue',
            priority: 'low'
        },
        {
            id: 'off_track',
            title: '경로 이탈',
            message: '목표에서 벗어나고 있습니다. 방향을 재조정하세요.',
            icon: '🧭',
            action: 'realign',
            priority: 'high'
        }
    ]
};

// ================================================================
// SUGGESTION GENERATOR
// ================================================================

const SuggestionGenerator = {
    /**
     * Generate suggestions based on energy audit
     */
    fromEnergyAudit: function(audit) {
        const suggestions = [];
        
        // 에너지 레벨 기반
        if (audit.status === 'COLLAPSE_WARNING' || audit.status === 'DECLINING') {
            suggestions.push(...SuggestionTemplates.lowEnergy);
        } else if (audit.currentEnergy?.total > SUGGESTION_CONFIG.ENERGY_THRESHOLD_HIGH * 100) {
            suggestions.push(...SuggestionTemplates.highEnergy);
        }
        
        // 누수 감지
        if (audit.leakage > 0) {
            suggestions.push({
                id: 'leakage',
                title: '에너지 누수 감지',
                message: `시스템에서 ${audit.leakage.toFixed(1)} 에너지가 손실되었습니다.`,
                icon: '⚠️',
                action: 'investigate_leakage',
                priority: 'high'
            });
        }
        
        return suggestions;
    },
    
    /**
     * Generate suggestions from sensor readings
     */
    fromSensorReadings: function(readings) {
        const suggestions = [];
        
        // 주의력 저하
        if (readings.video?.attention?.score < 0.5) {
            suggestions.push({
                id: 'attention',
                title: '집중력 저하',
                message: '주의력이 떨어지고 있습니다. 잠시 환기해보세요.',
                icon: '👀',
                action: 'refocus',
                priority: 'medium'
            });
        }
        
        // 높은 활동량
        if (readings.log?.activityRate > 80) {
            suggestions.push({
                id: 'high_activity',
                title: '높은 활동량',
                message: '활발하게 활동 중입니다. 효율을 유지하세요!',
                icon: '📈',
                action: 'maintain_pace',
                priority: 'low'
            });
        }
        
        // 반복 패턴 감지
        if (readings.log?.patterns?.hasRepetition) {
            suggestions.push(...SuggestionTemplates.pattern);
        }
        
        // 연결 약화
        if (readings.link?.averageStrength < 0.3) {
            suggestions.push(...SuggestionTemplates.connection);
        }
        
        // 직관 센서 추천
        if (readings.intuition?.recommendation) {
            suggestions.push({
                id: 'intuition',
                title: readings.intuition.recommendation.action === 'take_break' 
                    ? '휴식 권장' : '활동 권장',
                message: readings.intuition.recommendation.message,
                icon: '🔮',
                action: readings.intuition.recommendation.action,
                priority: readings.intuition.recommendation.priority
            });
        }
        
        return suggestions;
    },
    
    /**
     * Generate from physics map state
     */
    fromPhysicsMap: function(mapState) {
        const suggestions = [];
        
        if (!mapState) return suggestions;
        
        // 목표까지 거리
        const userNode = mapState.nodes?.find(n => n.id === 'User');
        const goalNode = mapState.goalNode;
        
        if (userNode && goalNode) {
            const distance = Math.sqrt(
                Math.pow(userNode.position.x - goalNode.position.x, 2) +
                Math.pow(userNode.position.y - goalNode.position.y, 2) +
                Math.pow((userNode.position.z || 0) - (goalNode.position.z || 0), 2)
            );
            
            if (distance < 10) {
                suggestions.push({
                    ...SuggestionTemplates.goal[0],
                    message: `목표까지 ${distance.toFixed(1)} 거리 - 곧 도달합니다!`
                });
            } else if (distance > 100) {
                suggestions.push({
                    ...SuggestionTemplates.goal[1],
                    message: `목표까지 ${distance.toFixed(1)} 거리 - 방향 재조정이 필요합니다.`
                });
            }
        }
        
        // 모멘텀
        const momentum = mapState.momentum;
        if (momentum && momentum > 50) {
            suggestions.push({
                id: 'momentum_high',
                title: '높은 모멘텀',
                message: '강한 추진력이 있습니다. 이 흐름을 유지하세요!',
                icon: '🌊',
                action: 'ride_momentum',
                priority: 'medium'
            });
        }
        
        return suggestions;
    }
};

// ================================================================
// POPUP MANAGER
// ================================================================

const PopupManager = {
    activePopups: [],
    popupContainer: null,
    
    /**
     * Initialize popup container
     */
    init: function() {
        // 이미 존재하면 재사용
        this.popupContainer = document.getElementById('autus-suggestion-container');
        
        if (!this.popupContainer) {
            this.popupContainer = document.createElement('div');
            this.popupContainer.id = 'autus-suggestion-container';
            this.popupContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.popupContainer);
        }
        
        // 스타일 주입
        this.injectStyles();
    },
    
    /**
     * Inject CSS styles
     */
    injectStyles: function() {
        if (document.getElementById('autus-suggestion-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'autus-suggestion-styles';
        styles.textContent = `
            .autus-suggestion-popup {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 12px;
                padding: 16px 20px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5),
                            0 0 20px rgba(0, 212, 255, 0.2);
                pointer-events: auto;
                animation: slideIn 0.3s ease-out;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .autus-suggestion-popup.priority-high {
                border-color: rgba(255, 107, 107, 0.5);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5),
                            0 0 20px rgba(255, 107, 107, 0.3);
            }
            
            .autus-suggestion-popup.closing {
                animation: slideOut 0.3s ease-in forwards;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .autus-suggestion-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }
            
            .autus-suggestion-icon {
                font-size: 24px;
            }
            
            .autus-suggestion-title {
                color: #00d4ff;
                font-size: 16px;
                font-weight: 600;
                margin: 0;
            }
            
            .autus-suggestion-message {
                color: #a0a0a0;
                font-size: 14px;
                line-height: 1.5;
                margin: 0 0 12px 0;
            }
            
            .autus-suggestion-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            
            .autus-suggestion-btn {
                background: transparent;
                border: 1px solid rgba(0, 212, 255, 0.5);
                color: #00d4ff;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            
            .autus-suggestion-btn:hover {
                background: rgba(0, 212, 255, 0.1);
            }
            
            .autus-suggestion-btn.primary {
                background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
                border: none;
                color: #000;
                font-weight: 600;
            }
            
            .autus-suggestion-btn.primary:hover {
                opacity: 0.9;
            }
            
            .autus-suggestion-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 18px;
                padding: 4px;
            }
            
            .autus-suggestion-close:hover {
                color: #fff;
            }
            
            .autus-suggestion-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: linear-gradient(90deg, #00d4ff, #00ff88);
                border-radius: 0 0 12px 12px;
                animation: progress ${SUGGESTION_CONFIG.POPUP_DURATION_MS}ms linear;
            }
            
            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        document.head.appendChild(styles);
    },
    
    /**
     * Show suggestion popup
     */
    show: function(suggestion, onAction) {
        if (!this.popupContainer) this.init();
        
        const popup = document.createElement('div');
        popup.className = `autus-suggestion-popup ${suggestion.priority === 'high' ? 'priority-high' : ''}`;
        popup.style.position = 'relative';
        
        popup.innerHTML = `
            <button class="autus-suggestion-close">&times;</button>
            <div class="autus-suggestion-header">
                <span class="autus-suggestion-icon">${suggestion.icon}</span>
                <h4 class="autus-suggestion-title">${suggestion.title}</h4>
            </div>
            <p class="autus-suggestion-message">${suggestion.message}</p>
            <div class="autus-suggestion-actions">
                <button class="autus-suggestion-btn">나중에</button>
                <button class="autus-suggestion-btn primary">실행</button>
            </div>
            <div class="autus-suggestion-progress"></div>
        `;
        
        // 이벤트 핸들러
        const closeBtn = popup.querySelector('.autus-suggestion-close');
        const laterBtn = popup.querySelector('.autus-suggestion-btn:not(.primary)');
        const actionBtn = popup.querySelector('.autus-suggestion-btn.primary');
        
        const close = () => {
            popup.classList.add('closing');
            setTimeout(() => popup.remove(), 300);
            this.activePopups = this.activePopups.filter(p => p !== popup);
        };
        
        closeBtn.onclick = close;
        laterBtn.onclick = close;
        actionBtn.onclick = () => {
            if (onAction) onAction(suggestion.action);
            close();
        };
        
        // 자동 닫기
        setTimeout(close, SUGGESTION_CONFIG.POPUP_DURATION_MS);
        
        this.popupContainer.appendChild(popup);
        this.activePopups.push(popup);
        
        return popup;
    },
    
    /**
     * Clear all popups
     */
    clearAll: function() {
        this.activePopups.forEach(popup => {
            popup.classList.add('closing');
            setTimeout(() => popup.remove(), 300);
        });
        this.activePopups = [];
    }
};

// ================================================================
// PROACTIVE SUGGESTION ENGINE
// ================================================================

export const ProactiveSuggestion = {
    generator: SuggestionGenerator,
    popup: PopupManager,
    config: SUGGESTION_CONFIG,
    
    // 상태
    lastSuggestionTime: 0,
    suggestionHistory: [],
    onActionCallback: null,
    
    /**
     * Initialize suggestion engine
     */
    init: function(onAction) {
        this.popup.init();
        this.onActionCallback = onAction;
        console.log('[ProactiveSuggestion] Initialized');
        return this;
    },
    
    /**
     * Process energy audit and show suggestions
     */
    processEnergyAudit: function(audit) {
        if (!this.canShowSuggestion()) return [];
        
        const suggestions = this.generator.fromEnergyAudit(audit);
        return this.showTopSuggestions(suggestions);
    },
    
    /**
     * Process sensor readings and show suggestions
     */
    processSensorReadings: function(readings) {
        if (!this.canShowSuggestion()) return [];
        
        const suggestions = this.generator.fromSensorReadings(readings);
        return this.showTopSuggestions(suggestions);
    },
    
    /**
     * Process physics map state
     */
    processPhysicsMap: function(mapState) {
        if (!this.canShowSuggestion()) return [];
        
        const suggestions = this.generator.fromPhysicsMap(mapState);
        return this.showTopSuggestions(suggestions);
    },
    
    /**
     * Full analysis with all sources
     */
    analyze: function(data) {
        const { energyAudit, sensorReadings, physicsMap } = data;
        
        let allSuggestions = [];
        
        if (energyAudit) {
            allSuggestions.push(...this.generator.fromEnergyAudit(energyAudit));
        }
        
        if (sensorReadings) {
            allSuggestions.push(...this.generator.fromSensorReadings(sensorReadings));
        }
        
        if (physicsMap) {
            allSuggestions.push(...this.generator.fromPhysicsMap(physicsMap));
        }
        
        // 중복 제거
        allSuggestions = this.deduplicateSuggestions(allSuggestions);
        
        // 우선순위 정렬
        allSuggestions.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        return this.showTopSuggestions(allSuggestions);
    },
    
    /**
     * Check if can show new suggestion (cooldown)
     */
    canShowSuggestion: function() {
        return Date.now() - this.lastSuggestionTime > SUGGESTION_CONFIG.COOLDOWN_MS;
    },
    
    /**
     * Show top suggestions
     */
    showTopSuggestions: function(suggestions) {
        const top = suggestions.slice(0, SUGGESTION_CONFIG.MAX_SUGGESTIONS);
        
        top.forEach((suggestion, index) => {
            setTimeout(() => {
                this.popup.show(suggestion, this.handleAction.bind(this));
                this.recordSuggestion(suggestion);
            }, index * 500); // 순차적 표시
        });
        
        this.lastSuggestionTime = Date.now();
        
        return top;
    },
    
    /**
     * Handle suggestion action
     */
    handleAction: function(action) {
        console.log('[ProactiveSuggestion] Action:', action);
        
        if (this.onActionCallback) {
            this.onActionCallback(action);
        }
        
        // 액션 기록
        this.suggestionHistory.push({
            action,
            timestamp: Date.now(),
            wasActedOn: true
        });
    },
    
    /**
     * Record suggestion
     */
    recordSuggestion: function(suggestion) {
        this.suggestionHistory.push({
            ...suggestion,
            timestamp: Date.now(),
            wasActedOn: false
        });
        
        // 최근 100개만 유지
        if (this.suggestionHistory.length > 100) {
            this.suggestionHistory = this.suggestionHistory.slice(-100);
        }
    },
    
    /**
     * Deduplicate suggestions
     */
    deduplicateSuggestions: function(suggestions) {
        const seen = new Set();
        return suggestions.filter(s => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });
    },
    
    /**
     * Get suggestion statistics
     */
    getStats: function() {
        const acted = this.suggestionHistory.filter(s => s.wasActedOn).length;
        
        return {
            totalShown: this.suggestionHistory.length,
            actedOn: acted,
            actionRate: this.suggestionHistory.length > 0 
                ? (acted / this.suggestionHistory.length * 100).toFixed(1) + '%'
                : 'N/A',
            lastSuggestionTime: this.lastSuggestionTime
        };
    },
    
    /**
     * Clear all popups
     */
    clearAll: function() {
        this.popup.clearAll();
    }
};

export { SuggestionGenerator, SuggestionTemplates, PopupManager, SUGGESTION_CONFIG };

export default ProactiveSuggestion;




