// ================================================================
// AUTUS PHYSICS MAP 3D UPGRADE
// WaitlistGravity + NetworkEffect 궤도 시각화
// ================================================================

// ================================================================
// PHYSICS MAP 3D
// ================================================================

export const PhysicsMap3D = {
    config: {
        width: 800,
        height: 600,
        centerX: 400,
        centerY: 300,
        maxRadius: 250,
        animationSpeed: 0.02
    },
    
    init(config = {}) {
        this.config = { ...this.config, ...config };
        return this;
    },
    
    /**
     * 3D 물리 맵 렌더링
     */
    render(data = {}) {
        const nodes = data.nodes || [];
        const goldenRing = data.goldenRing || { used: 0, total: 3 };
        const waitlist = data.waitlist || [];
        const networkStats = data.networkStats || { phase: 'LINEAR', value: 1 };
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTUS Physics Map 3D</title>
    <style>${this._getStyles()}</style>
</head>
<body>
    <div class="physics-container">
        <!-- HEADER -->
        <header class="header">
            <h1>🌌 AUTUS Physics Map 3D</h1>
            <div class="controls">
                <button onclick="toggleOrbit('waitlist')">대기자 궤도</button>
                <button onclick="toggleOrbit('network')">네트워크 효과</button>
                <button onclick="toggleAnimation()">애니메이션</button>
                <button onclick="resetView()">초기화</button>
            </div>
        </header>
        
        <!-- MAIN CANVAS -->
        <main class="main">
            <div class="map-container">
                <canvas id="physicsCanvas" width="${this.config.width}" height="${this.config.height}"></canvas>
                
                <!-- OVERLAY INFO -->
                <div class="overlay-info">
                    <div class="info-card golden-ring">
                        <span class="icon">👑</span>
                        <span class="label">Golden Ring</span>
                        <span class="value">${goldenRing.used}/${goldenRing.total}</span>
                    </div>
                    <div class="info-card waitlist">
                        <span class="icon">⏳</span>
                        <span class="label">대기자</span>
                        <span class="value">${waitlist.length}명</span>
                    </div>
                    <div class="info-card network">
                        <span class="icon">🔗</span>
                        <span class="label">네트워크</span>
                        <span class="value">${networkStats.phase}</span>
                    </div>
                    <div class="info-card nodes">
                        <span class="icon">⚛️</span>
                        <span class="label">활성 노드</span>
                        <span class="value">${nodes.length}개</span>
                    </div>
                </div>
            </div>
            
            <!-- SIDE PANEL -->
            <aside class="side-panel">
                <section class="panel-section">
                    <h3>🎯 궤도 현황</h3>
                    ${this._renderOrbitStatus(nodes)}
                </section>
                
                <section class="panel-section">
                    <h3>📊 네트워크 효과</h3>
                    ${this._renderNetworkEffect(networkStats)}
                </section>
                
                <section class="panel-section">
                    <h3>⏳ 대기자 중력장</h3>
                    ${this._renderWaitlistGravity(waitlist)}
                </section>
                
                <section class="panel-section">
                    <h3>🎛️ 물리 파라미터</h3>
                    ${this._renderPhysicsParams()}
                </section>
            </aside>
        </main>
        
        <!-- FOOTER -->
        <footer class="footer">
            <span>AUTUS Physics Map 3D v2.0</span>
            <span id="fps">FPS: --</span>
        </footer>
    </div>
    
    <script>
        ${this._getCanvasScript(nodes, goldenRing, waitlist, networkStats)}
    </script>
</body>
</html>`;
    },
    
    _renderOrbitStatus(nodes) {
        const orbits = {
            CORE: nodes.filter(n => (n.mass || 0) >= 80).length,
            INNER: nodes.filter(n => (n.mass || 0) >= 60 && (n.mass || 0) < 80).length,
            MIDDLE: nodes.filter(n => (n.mass || 0) >= 40 && (n.mass || 0) < 60).length,
            OUTER: nodes.filter(n => (n.mass || 0) < 40).length
        };
        
        return `
        <div class="orbit-bars">
            <div class="orbit-bar">
                <span class="orbit-name">Core</span>
                <div class="bar-bg"><div class="bar-fill core" style="width: ${orbits.CORE * 10}%"></div></div>
                <span class="orbit-count">${orbits.CORE}</span>
            </div>
            <div class="orbit-bar">
                <span class="orbit-name">Inner</span>
                <div class="bar-bg"><div class="bar-fill inner" style="width: ${orbits.INNER * 10}%"></div></div>
                <span class="orbit-count">${orbits.INNER}</span>
            </div>
            <div class="orbit-bar">
                <span class="orbit-name">Middle</span>
                <div class="bar-bg"><div class="bar-fill middle" style="width: ${orbits.MIDDLE * 10}%"></div></div>
                <span class="orbit-count">${orbits.MIDDLE}</span>
            </div>
            <div class="orbit-bar">
                <span class="orbit-name">Outer</span>
                <div class="bar-bg"><div class="bar-fill outer" style="width: ${orbits.OUTER * 10}%"></div></div>
                <span class="orbit-count">${orbits.OUTER}</span>
            </div>
        </div>`;
    },
    
    _renderNetworkEffect(stats) {
        const phases = ['LINEAR', 'QUADRATIC', 'CUBIC', 'EXPONENTIAL'];
        const phaseIndex = phases.indexOf(stats.phase);
        
        return `
        <div class="network-viz">
            <div class="phase-indicator">
                ${phases.map((p, i) => `
                    <div class="phase ${i <= phaseIndex ? 'active' : ''}">
                        <span class="phase-dot"></span>
                        <span class="phase-name">${p}</span>
                    </div>
                `).join('')}
            </div>
            <div class="network-value">
                <span class="label">네트워크 가치</span>
                <span class="value">n<sup>${stats.exponent || 2}</sup> = ${stats.value || 0}</span>
            </div>
            <div class="scaling-formula">
                V = k × n<sup>${stats.exponent || 2}</sup>
            </div>
        </div>`;
    },
    
    _renderWaitlistGravity(waitlist) {
        return `
        <div class="gravity-field">
            <div class="gravity-visual">
                <svg viewBox="0 0 100 100" class="gravity-svg">
                    <defs>
                        <radialGradient id="gravityGrad">
                            <stop offset="0%" stop-color="#ffd700" stop-opacity="0.8"/>
                            <stop offset="100%" stop-color="#ffd700" stop-opacity="0"/>
                        </radialGradient>
                    </defs>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#333" stroke-dasharray="2,2"/>
                    <circle cx="50" cy="50" r="30" fill="none" stroke="#444" stroke-dasharray="2,2"/>
                    <circle cx="50" cy="50" r="15" fill="url(#gravityGrad)"/>
                    ${waitlist.slice(0, 10).map((w, i) => {
                        const angle = (i / Math.min(waitlist.length, 10)) * Math.PI * 2;
                        const radius = 25 + (1 - (w.priority || 50) / 100) * 20;
                        const x = 50 + Math.cos(angle) * radius;
                        const y = 50 + Math.sin(angle) * radius;
                        return `<circle cx="${x}" cy="${y}" r="3" fill="#4ade80" opacity="0.8"/>`;
                    }).join('')}
                </svg>
            </div>
            <div class="gravity-stats">
                <div class="stat">
                    <span class="label">대기자</span>
                    <span class="value">${waitlist.length}명</span>
                </div>
                <div class="stat">
                    <span class="label">평균 우선순위</span>
                    <span class="value">${waitlist.length > 0 ? (waitlist.reduce((s, w) => s + (w.priority || 50), 0) / waitlist.length).toFixed(0) : 0}%</span>
                </div>
            </div>
        </div>`;
    },
    
    _renderPhysicsParams() {
        return `
        <div class="params-grid">
            <div class="param">
                <label>중력 상수 (G)</label>
                <input type="range" min="0.1" max="2" step="0.1" value="1" onchange="updateParam('gravity', this.value)">
                <span class="param-value">1.0</span>
            </div>
            <div class="param">
                <label>궤도 속도</label>
                <input type="range" min="0.5" max="3" step="0.1" value="1" onchange="updateParam('speed', this.value)">
                <span class="param-value">1.0</span>
            </div>
            <div class="param">
                <label>노드 크기</label>
                <input type="range" min="0.5" max="2" step="0.1" value="1" onchange="updateParam('size', this.value)">
                <span class="param-value">1.0</span>
            </div>
        </div>`;
    },
    
    _getCanvasScript(nodes, goldenRing, waitlist, networkStats) {
        return `
        const canvas = document.getElementById('physicsCanvas');
        const ctx = canvas.getContext('2d');
        const centerX = ${this.config.centerX};
        const centerY = ${this.config.centerY};
        
        let animationId;
        let isAnimating = true;
        let time = 0;
        let lastTime = performance.now();
        let frameCount = 0;
        
        const nodes = ${JSON.stringify(nodes)};
        const waitlist = ${JSON.stringify(waitlist)};
        const goldenRing = ${JSON.stringify(goldenRing)};
        
        const params = {
            gravity: 1.0,
            speed: 1.0,
            size: 1.0
        };
        
        const orbits = {
            waitlist: true,
            network: true
        };
        
        function draw() {
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            drawStarfield();
            drawOrbits();
            drawGoldenRing();
            drawNodes();
            if (orbits.waitlist) drawWaitlist();
            if (orbits.network) drawNetworkLines();
            
            time += 0.02 * params.speed;
            
            // FPS 계산
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                document.getElementById('fps').textContent = 'FPS: ' + frameCount;
                frameCount = 0;
                lastTime = now;
            }
            
            if (isAnimating) {
                animationId = requestAnimationFrame(draw);
            }
        }
        
        function drawStarfield() {
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 100; i++) {
                const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * canvas.width;
                const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * canvas.height;
                const size = Math.random() * 1.5;
                const alpha = 0.3 + Math.sin(time + i) * 0.2;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        function drawOrbits() {
            const radii = [60, 100, 150, 200, 250];
            ctx.strokeStyle = '#333';
            ctx.setLineDash([5, 5]);
            
            radii.forEach(r => {
                ctx.beginPath();
                ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                ctx.stroke();
            });
            
            ctx.setLineDash([]);
        }
        
        function drawGoldenRing() {
            // 골든 링 글로우
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
            ctx.fill();
            
            // 골든 링 테두리
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
            
            // 슬롯 표시
            for (let i = 0; i < goldenRing.total; i++) {
                const angle = (i / goldenRing.total) * Math.PI * 2 - Math.PI / 2;
                const x = centerX + Math.cos(angle) * 35;
                const y = centerY + Math.sin(angle) * 35;
                
                ctx.fillStyle = i < goldenRing.used ? '#ffd700' : 'rgba(255, 215, 0, 0.3)';
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 중앙 텍스트
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GOLDEN', centerX, centerY - 5);
            ctx.fillText('RING', centerX, centerY + 10);
        }
        
        function drawNodes() {
            nodes.forEach((node, i) => {
                const mass = node.mass || 50;
                const energy = node.energy || 50;
                
                // 궤도 결정
                let radius;
                if (mass >= 80) radius = 70;
                else if (mass >= 60) radius = 110;
                else if (mass >= 40) radius = 160;
                else radius = 210;
                
                const baseAngle = (i / nodes.length) * Math.PI * 2;
                const angle = baseAngle + time * (0.5 + energy / 200);
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                // 노드 색상 (에너지 기반)
                const hue = 120 - (100 - energy) * 1.2;
                ctx.fillStyle = 'hsl(' + hue + ', 70%, 50%)';
                
                // 노드 크기 (질량 기반)
                const size = (4 + mass / 20) * params.size;
                
                // 글로우 효과
                const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
                glow.addColorStop(0, 'hsla(' + hue + ', 70%, 50%, 0.5)');
                glow.addColorStop(1, 'hsla(' + hue + ', 70%, 50%, 0)');
                
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = 'hsl(' + hue + ', 70%, 50%)';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        
        function drawWaitlist() {
            waitlist.forEach((w, i) => {
                const priority = w.priority || 50;
                const baseRadius = 240 - priority * 1.5;
                
                const baseAngle = (i / waitlist.length) * Math.PI * 2;
                const angle = baseAngle - time * 0.3;
                const pulseRadius = baseRadius + Math.sin(time * 2 + i) * 5;
                
                const x = centerX + Math.cos(angle) * pulseRadius;
                const y = centerY + Math.sin(angle) * pulseRadius;
                
                // 대기자 노드
                const alpha = 0.5 + (priority / 100) * 0.5;
                ctx.fillStyle = 'rgba(74, 222, 128, ' + alpha + ')';
                
                ctx.beginPath();
                ctx.arc(x, y, 4 + priority / 25, 0, Math.PI * 2);
                ctx.fill();
                
                // 골든 링으로 향하는 중력선
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(centerX, centerY);
                ctx.stroke();
            });
        }
        
        function drawNetworkLines() {
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    if (Math.random() > 0.7) continue;
                    
                    const node1 = nodes[i];
                    const node2 = nodes[j];
                    
                    const mass1 = node1.mass || 50;
                    const mass2 = node2.mass || 50;
                    
                    let r1 = mass1 >= 80 ? 70 : mass1 >= 60 ? 110 : mass1 >= 40 ? 160 : 210;
                    let r2 = mass2 >= 80 ? 70 : mass2 >= 60 ? 110 : mass2 >= 40 ? 160 : 210;
                    
                    const a1 = (i / nodes.length) * Math.PI * 2 + time * 0.5;
                    const a2 = (j / nodes.length) * Math.PI * 2 + time * 0.5;
                    
                    const x1 = centerX + Math.cos(a1) * r1;
                    const y1 = centerY + Math.sin(a1) * r1;
                    const x2 = centerX + Math.cos(a2) * r2;
                    const y2 = centerY + Math.sin(a2) * r2;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
            ctx.lineWidth = 1;
        }
        
        function toggleOrbit(type) {
            orbits[type] = !orbits[type];
        }
        
        function toggleAnimation() {
            isAnimating = !isAnimating;
            if (isAnimating) draw();
        }
        
        function resetView() {
            time = 0;
            params.gravity = 1.0;
            params.speed = 1.0;
            params.size = 1.0;
        }
        
        function updateParam(name, value) {
            params[name] = parseFloat(value);
        }
        
        // 시작
        draw();
        console.log('🌌 Physics Map 3D Loaded');
        `;
    },
    
    _getStyles() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: #0a0a14; color: #fff; }
        
        .physics-container { height: 100vh; display: flex; flex-direction: column; }
        
        .header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(255,255,255,0.05); }
        .header h1 { font-size: 20px; }
        .controls { display: flex; gap: 10px; }
        .controls button { padding: 8px 16px; background: rgba(255,255,255,0.1); border: none; color: #fff; border-radius: 6px; cursor: pointer; }
        .controls button:hover { background: rgba(255,255,255,0.2); }
        
        .main { flex: 1; display: flex; overflow: hidden; }
        
        .map-container { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; }
        
        #physicsCanvas { border-radius: 12px; }
        
        .overlay-info { position: absolute; top: 20px; left: 20px; display: flex; flex-direction: column; gap: 10px; }
        .info-card { display: flex; align-items: center; gap: 10px; padding: 10px 15px; background: rgba(0,0,0,0.7); border-radius: 8px; backdrop-filter: blur(10px); }
        .info-card .icon { font-size: 20px; }
        .info-card .label { font-size: 12px; color: #888; }
        .info-card .value { font-weight: bold; }
        .info-card.golden-ring { border-left: 3px solid #ffd700; }
        .info-card.waitlist { border-left: 3px solid #4ade80; }
        .info-card.network { border-left: 3px solid #a855f7; }
        .info-card.nodes { border-left: 3px solid #38bdf8; }
        
        .side-panel { width: 300px; background: rgba(255,255,255,0.03); padding: 20px; overflow-y: auto; }
        
        .panel-section { margin-bottom: 25px; }
        .panel-section h3 { font-size: 14px; margin-bottom: 15px; color: #a855f7; }
        
        .orbit-bars { display: flex; flex-direction: column; gap: 10px; }
        .orbit-bar { display: flex; align-items: center; gap: 10px; }
        .orbit-name { width: 50px; font-size: 12px; }
        .bar-bg { flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; }
        .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
        .bar-fill.core { background: #ffd700; }
        .bar-fill.inner { background: #4ade80; }
        .bar-fill.middle { background: #38bdf8; }
        .bar-fill.outer { background: #a855f7; }
        .orbit-count { width: 30px; text-align: right; font-size: 12px; }
        
        .network-viz { padding: 15px; background: rgba(168,85,247,0.1); border-radius: 8px; }
        .phase-indicator { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
        .phase { display: flex; align-items: center; gap: 10px; opacity: 0.3; }
        .phase.active { opacity: 1; }
        .phase-dot { width: 8px; height: 8px; border-radius: 50%; background: #a855f7; }
        .phase-name { font-size: 12px; }
        .network-value { text-align: center; margin-bottom: 10px; }
        .network-value .label { display: block; font-size: 10px; color: #888; }
        .network-value .value { font-size: 24px; font-weight: bold; color: #a855f7; }
        .scaling-formula { text-align: center; font-family: monospace; color: #888; }
        
        .gravity-field { padding: 15px; background: rgba(74,222,128,0.1); border-radius: 8px; }
        .gravity-visual { margin-bottom: 15px; }
        .gravity-svg { width: 100%; height: 100px; }
        .gravity-stats { display: flex; justify-content: space-around; }
        .gravity-stats .stat { text-align: center; }
        .gravity-stats .label { display: block; font-size: 10px; color: #888; }
        .gravity-stats .value { font-weight: bold; color: #4ade80; }
        
        .params-grid { display: flex; flex-direction: column; gap: 15px; }
        .param label { display: block; font-size: 12px; margin-bottom: 5px; }
        .param input { width: 100%; }
        .param-value { font-size: 12px; color: #888; }
        
        .footer { display: flex; justify-content: space-between; padding: 10px 20px; background: rgba(255,255,255,0.03); font-size: 12px; color: #666; }
        `;
    }
};

// ================================================================
// TEST
// ================================================================

export function testPhysicsMap3D() {
    console.log('Testing Physics Map 3D...');
    
    const map = Object.create(PhysicsMap3D).init();
    
    const testData = {
        nodes: Array.from({ length: 42 }, (_, i) => ({
            id: `node_${i}`,
            mass: 30 + Math.random() * 70,
            energy: 40 + Math.random() * 60
        })),
        goldenRing: { used: 2, total: 3 },
        waitlist: Array.from({ length: 15 }, (_, i) => ({
            id: `waitlist_${i}`,
            priority: 30 + Math.random() * 70
        })),
        networkStats: { phase: 'QUADRATIC', exponent: 2, value: 1764 }
    };
    
    const html = map.render(testData);
    console.log('✅ Physics Map 3D HTML generated:', html.length, 'characters');
    
    return { map, html };
}

export default PhysicsMap3D;
