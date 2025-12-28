// ================================================================
// AUTUS MAIN KERNEL
// 8대 엔진 + PhysicsMap + UI 통합 메인 커널
// ================================================================

import { AutusEngines, EngineRegistry } from './engines/index.js';

// ================================================================
// PHYSICS MAP BRIDGE (물리 맵 연결)
// ================================================================

const PhysicsMapBridge = {
    physicsMap: null,
    
    /**
     * PhysicsMap 연결
     */
    async connect() {
        try {
            const { PhysicsMap } = await import('./engine/PhysicsMap.js');
            this.physicsMap = PhysicsMap;
            console.log('[PhysicsMapBridge] PhysicsMap 연결됨');
            return true;
        } catch (err) {
            console.warn('[PhysicsMapBridge] PhysicsMap 로드 실패:', err.message);
            return false;
        }
    },
    
    /**
     * 엔진 데이터를 PhysicsMap에 반영
     */
    update(engineData) {
        if (!this.physicsMap) return null;
        
        // User 노드 업데이트
        const userNode = this.physicsMap.getUserNode();
        if (userNode && engineData.combinedPhysics) {
            userNode.mass = engineData.combinedPhysics.mass * 5;
            userNode.energy = engineData.combinedPhysics.energy;
            userNode.velocity = engineData.combinedPhysics.velocity * 10;
        }
        
        // 네트워크 노드들 추가 (LinkMapper에서)
        if (engineData.network?.visualization?.nodes) {
            engineData.network.visualization.nodes.forEach(node => {
                if (node.id !== 'USER' && !this.physicsMap.getNode(node.id)) {
                    this.physicsMap.addNode({
                        id: node.id,
                        mass: node.mass || 10,
                        position: {
                            x: Math.random() * 200 - 100,
                            y: Math.random() * 200 - 100,
                            z: 0
                        }
                    });
                }
            });
        }
        
        return this.physicsMap.exportState();
    },
    
    /**
     * 목표 설정
     */
    setGoal(goalConfig) {
        if (!this.physicsMap) return;
        this.physicsMap.setGoal(goalConfig);
    },
    
    /**
     * 상태 내보내기
     */
    exportState() {
        return this.physicsMap?.exportState() || null;
    }
};

// ================================================================
// UI CONTROLLER (UI 컨트롤러)
// ================================================================

const UIController = {
    container: null,
    statusPanel: null,
    engineCards: null,
    physicsDisplay: null,
    
    /**
     * UI 초기화
     */
    init(containerId = 'autus-app') {
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            document.body.appendChild(this.container);
        }
        
        this.render();
        console.log('[UIController] UI 초기화 완료');
    },
    
    /**
     * 메인 UI 렌더링
     */
    render() {
        this.container.innerHTML = `
            <style>
                #autus-app {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
                    min-height: 100vh;
                    color: #fff;
                    padding: 20px;
                }
                
                .autus-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                
                .autus-header h1 {
                    color: #00d4ff;
                    font-size: 2.5em;
                    margin: 0;
                }
                
                .autus-header p {
                    color: #888;
                    margin-top: 10px;
                }
                
                .autus-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                
                .autus-panel {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(0, 212, 255, 0.3);
                    border-radius: 12px;
                    padding: 20px;
                }
                
                .autus-panel h2 {
                    color: #00d4ff;
                    font-size: 1.2em;
                    margin: 0 0 15px 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .engine-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                }
                
                .engine-card {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    border: 1px solid transparent;
                }
                
                .engine-card:hover {
                    border-color: rgba(0, 212, 255, 0.5);
                    transform: translateY(-2px);
                }
                
                .engine-card.active {
                    border-color: #00d4ff;
                    background: rgba(0, 212, 255, 0.1);
                }
                
                .engine-card .icon {
                    font-size: 2em;
                    margin-bottom: 8px;
                }
                
                .engine-card .name {
                    font-size: 0.85em;
                    color: #aaa;
                }
                
                .engine-card .status {
                    font-size: 0.7em;
                    color: #4caf50;
                    margin-top: 5px;
                }
                
                .physics-display {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                }
                
                .physics-card {
                    background: rgba(0, 212, 255, 0.1);
                    border-radius: 10px;
                    padding: 20px;
                    text-align: center;
                }
                
                .physics-card .icon {
                    font-size: 1.5em;
                    margin-bottom: 8px;
                }
                
                .physics-card .value {
                    font-size: 2em;
                    font-weight: bold;
                    color: #00d4ff;
                }
                
                .physics-card .label {
                    font-size: 0.85em;
                    color: #888;
                    margin-top: 5px;
                }
                
                .btn {
                    background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
                    border: none;
                    color: #000;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-right: 10px;
                    margin-top: 10px;
                }
                
                .btn:hover {
                    opacity: 0.9;
                }
                
                .btn.secondary {
                    background: transparent;
                    border: 1px solid #00d4ff;
                    color: #00d4ff;
                }
                
                .console-output {
                    background: rgba(0, 0, 0, 0.5);
                    border-radius: 8px;
                    padding: 15px;
                    font-family: monospace;
                    font-size: 12px;
                    max-height: 200px;
                    overflow-y: auto;
                    color: #0f0;
                }
                
                .insights-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .insights-list li {
                    padding: 10px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 6px;
                    margin-bottom: 8px;
                    border-left: 3px solid #00d4ff;
                }
                
                .insights-list li.high {
                    border-left-color: #ff6b6b;
                }
                
                .insights-list li.medium {
                    border-left-color: #ffa726;
                }
            </style>
            
            <div class="autus-header">
                <h1>🧠 AUTUS 8-Engine System</h1>
                <p>Physics-based Intelligence Platform</p>
            </div>
            
            <div class="autus-grid">
                <!-- 엔진 상태 패널 -->
                <div class="autus-panel" style="grid-column: span 2;">
                    <h2>⚡ 8대 엔진</h2>
                    <div class="engine-grid" id="engine-grid"></div>
                    <div style="margin-top: 15px;">
                        <button class="btn" onclick="AutusMain.start()">▶️ 시작</button>
                        <button class="btn secondary" onclick="AutusMain.stop()">⏹️ 중지</button>
                        <button class="btn secondary" onclick="AutusMain.gather()">🔄 데이터 수집</button>
                    </div>
                </div>
                
                <!-- 물리 속성 패널 -->
                <div class="autus-panel" style="grid-column: span 2;">
                    <h2>📊 통합 물리 속성</h2>
                    <div class="physics-display" id="physics-display">
                        <div class="physics-card">
                            <div class="icon">⚖️</div>
                            <div class="value" id="physics-mass">0</div>
                            <div class="label">MASS</div>
                        </div>
                        <div class="physics-card">
                            <div class="icon">⚡</div>
                            <div class="value" id="physics-energy">0</div>
                            <div class="label">ENERGY</div>
                        </div>
                        <div class="physics-card">
                            <div class="icon">🌊</div>
                            <div class="value" id="physics-entropy">0</div>
                            <div class="label">ENTROPY</div>
                        </div>
                        <div class="physics-card">
                            <div class="icon">🚀</div>
                            <div class="value" id="physics-velocity">0</div>
                            <div class="label">VELOCITY</div>
                        </div>
                    </div>
                </div>
                
                <!-- 인사이트 패널 -->
                <div class="autus-panel">
                    <h2>💡 인사이트</h2>
                    <ul class="insights-list" id="insights-list">
                        <li>시스템 초기화 대기 중...</li>
                    </ul>
                </div>
                
                <!-- 콘솔 패널 -->
                <div class="autus-panel">
                    <h2>🖥️ 콘솔</h2>
                    <div class="console-output" id="console-output"></div>
                </div>
            </div>
        `;
        
        this.engineCards = document.getElementById('engine-grid');
        this.physicsDisplay = document.getElementById('physics-display');
        
        this.renderEngineCards();
    },
    
    /**
     * 엔진 카드 렌더링
     */
    renderEngineCards() {
        const engines = EngineRegistry.getAll();
        
        this.engineCards.innerHTML = engines.map(engine => `
            <div class="engine-card" id="engine-${engine.id}" onclick="AutusMain.selectEngine('${engine.id}')">
                <div class="icon">${engine.icon}</div>
                <div class="name">${engine.name}</div>
                <div class="status">● 준비됨</div>
            </div>
        `).join('');
    },
    
    /**
     * 물리 속성 업데이트
     */
    updatePhysics(physics) {
        if (!physics) return;
        
        document.getElementById('physics-mass').textContent = physics.mass?.toFixed(1) || '0';
        document.getElementById('physics-energy').textContent = physics.energy?.toFixed(1) || '0';
        document.getElementById('physics-entropy').textContent = physics.entropy?.toFixed(3) || '0';
        document.getElementById('physics-velocity').textContent = physics.velocity?.toFixed(2) || '0';
    },
    
    /**
     * 인사이트 업데이트
     */
    updateInsights(insights) {
        const list = document.getElementById('insights-list');
        
        if (!insights || insights.length === 0) {
            list.innerHTML = '<li>인사이트 수집 중...</li>';
            return;
        }
        
        list.innerHTML = insights.map(i => `
            <li class="${i.importance || 'low'}">
                <strong>${i.title}</strong><br>
                <span style="color: #aaa;">${i.content}</span>
            </li>
        `).join('');
    },
    
    /**
     * 콘솔 로그
     */
    log(message) {
        const console = document.getElementById('console-output');
        const time = new Date().toLocaleTimeString();
        console.innerHTML += `[${time}] ${message}\n`;
        console.scrollTop = console.scrollHeight;
    },
    
    /**
     * 엔진 상태 업데이트
     */
    updateEngineStatus(engineId, status) {
        const card = document.getElementById(`engine-${engineId}`);
        if (card) {
            const statusEl = card.querySelector('.status');
            statusEl.textContent = status === 'active' ? '● 활성' : '● 준비됨';
            statusEl.style.color = status === 'active' ? '#00d4ff' : '#4caf50';
            
            if (status === 'active') {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        }
    }
};

// ================================================================
// AUTUS MAIN KERNEL
// ================================================================

export const AutusMain = {
    // 상태
    isInitialized: false,
    isRunning: false,
    updateInterval: null,
    selectedEngine: null,
    
    // 컴포넌트
    engines: AutusEngines,
    physicsMap: PhysicsMapBridge,
    ui: UIController,
    
    // 설정
    config: {
        updateIntervalMs: 5000,
        autoStart: false
    },
    
    /**
     * 시스템 초기화
     */
    async init(config = {}) {
        console.log('[AutusMain] ====================================');
        console.log('[AutusMain] AUTUS 메인 커널 초기화');
        console.log('[AutusMain] ====================================');
        
        Object.assign(this.config, config);
        
        // UI 초기화
        this.ui.init(config.containerId);
        this.ui.log('시스템 초기화 중...');
        
        // 엔진 초기화
        await this.engines.init();
        this.ui.log('8대 엔진 로드 완료');
        
        // PhysicsMap 연결
        await this.physicsMap.connect();
        this.ui.log('PhysicsMap 연결 완료');
        
        this.isInitialized = true;
        this.ui.log('시스템 준비 완료!');
        
        // 자동 시작
        if (this.config.autoStart) {
            this.start();
        }
        
        // 전역 접근
        window.AutusMain = this;
        
        return this;
    },
    
    /**
     * 시스템 시작
     */
    start() {
        if (!this.isInitialized) {
            console.error('[AutusMain] 초기화 필요');
            return;
        }
        
        if (this.isRunning) {
            console.warn('[AutusMain] 이미 실행 중');
            return;
        }
        
        this.isRunning = true;
        this.ui.log('시스템 시작됨');
        
        // 주기적 데이터 수집
        this.updateInterval = setInterval(() => {
            this.gather();
        }, this.config.updateIntervalMs);
        
        // 즉시 한 번 수집
        this.gather();
        
        // 엔진 상태 활성화
        Object.keys(this.engines.instances).forEach(id => {
            this.ui.updateEngineStatus(id, 'active');
        });
    },
    
    /**
     * 시스템 중지
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.isRunning = false;
        this.ui.log('시스템 중지됨');
        
        // 엔진 상태 비활성화
        Object.keys(this.engines.instances).forEach(id => {
            this.ui.updateEngineStatus(id, 'ready');
        });
    },
    
    /**
     * 데이터 수집
     */
    async gather() {
        try {
            this.ui.log('데이터 수집 중...');
            
            // 전체 엔진 데이터 수집
            const data = await this.engines.gatherAll();
            
            // PhysicsMap 업데이트
            const mapState = this.physicsMap.update(data);
            
            // UI 업데이트
            this.ui.updatePhysics(data.combinedPhysics);
            this.ui.updateInsights(data.intuition?.insights);
            
            this.ui.log(`수집 완료 - M:${data.combinedPhysics?.mass?.toFixed(1)} E:${data.combinedPhysics?.energy?.toFixed(1)}`);
            
            return data;
        } catch (err) {
            this.ui.log(`오류: ${err.message}`);
            console.error('[AutusMain] gather error:', err);
        }
    },
    
    /**
     * 엔진 선택
     */
    selectEngine(engineId) {
        this.selectedEngine = engineId;
        const engine = this.engines.get(engineId);
        const info = EngineRegistry.get(engineId);
        
        this.ui.log(`엔진 선택: ${info.name}`);
        
        // 선택 표시 업데이트
        document.querySelectorAll('.engine-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.getElementById(`engine-${engineId}`)?.classList.add('selected');
    },
    
    /**
     * 행동 학습
     */
    learn(action, context) {
        this.engines.learn(action, context);
        this.ui.log(`학습: ${action.type}`);
    },
    
    /**
     * 목표 설정
     */
    setGoal(goalConfig) {
        this.physicsMap.setGoal(goalConfig);
        this.ui.log(`목표 설정: ${goalConfig.id}`);
    },
    
    /**
     * 파일에서 데이터 로드
     */
    async loadFile() {
        try {
            const result = await this.engines.get('logMining').process();
            this.ui.log(`파일 로드: ${result.file.name}`);
            this.ui.updatePhysics(result.physics);
            return result;
        } catch (err) {
            this.ui.log(`파일 로드 실패: ${err.message}`);
        }
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            engines: this.engines.getStatus(),
            physicsMap: this.physicsMap.exportState()
        };
    }
};

// ================================================================
// AUTO INIT (DOM 로드 시)
// ================================================================

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // 자동 초기화는 하지 않음 (명시적 호출 필요)
        console.log('[AutusMain] Ready. Call AutusMain.init() to start.');
    });
}

// ================================================================
// EXPORTS
// ================================================================

export { PhysicsMapBridge, UIController };
export default AutusMain;




