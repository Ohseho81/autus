// ================================================================
// AUTUS NETWORK EFFECT CHART
// n² → n³ 스케일링 실시간 차트
// ================================================================

// ================================================================
// NETWORK EFFECT CHART
// ================================================================

export const NetworkEffectChart = {
    canvas: null,
    ctx: null,
    data: [],
    animationId: null,
    
    init(canvasId = 'networkChart') {
        this.data = [];
        return this;
    },
    
    /**
     * 차트 HTML 렌더링
     */
    render(networkData = {}) {
        const nodes = networkData.nodes || 42;
        const phase = networkData.phase || 'QUADRATIC';
        const exponent = networkData.exponent || 2;
        const currentValue = Math.pow(nodes, exponent);
        const history = networkData.history || this._generateSampleHistory(nodes);
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTUS Network Effect Chart</title>
    <style>${this._getStyles()}</style>
</head>
<body>
    <div class="chart-container">
        <header class="header">
            <h1>🔗 Network Effect Chart</h1>
            <div class="phase-badge phase-${phase.toLowerCase()}">${phase}</div>
        </header>
        
        <main class="main">
            <!-- VALUE DISPLAY -->
            <section class="value-display">
                <div class="current-value">
                    <span class="formula">V = n<sup>${exponent}</sup></span>
                    <span class="equals">=</span>
                    <span class="result">${currentValue.toLocaleString()}</span>
                </div>
                <div class="node-count">
                    <span class="label">현재 노드</span>
                    <span class="count">${nodes}</span>
                </div>
            </section>
            
            <!-- SCALING COMPARISON -->
            <section class="scaling-section">
                <h2>📊 스케일링 비교</h2>
                <div class="scaling-grid">
                    ${this._renderScalingComparison(nodes)}
                </div>
            </section>
            
            <!-- MAIN CHART -->
            <section class="chart-section">
                <h2>📈 네트워크 가치 성장 추이</h2>
                <div class="chart-wrapper">
                    <canvas id="mainChart" width="700" height="300"></canvas>
                </div>
                <div class="chart-legend">
                    <span class="legend-item"><span class="dot linear"></span> Linear (n)</span>
                    <span class="legend-item"><span class="dot quadratic"></span> Metcalfe (n²)</span>
                    <span class="legend-item"><span class="dot cubic"></span> AUTUS (n³)</span>
                </div>
            </section>
            
            <!-- GROWTH PROJECTIONS -->
            <section class="projections-section">
                <h2>🔮 성장 예측</h2>
                <div class="projections-grid">
                    ${this._renderProjections(nodes, exponent)}
                </div>
            </section>
            
            <!-- MILESTONES -->
            <section class="milestones-section">
                <h2>🏆 네트워크 마일스톤</h2>
                <div class="milestones-timeline">
                    ${this._renderMilestones(nodes)}
                </div>
            </section>
            
            <!-- CONTROLS -->
            <section class="controls-section">
                <h2>🎛️ 시뮬레이션</h2>
                <div class="sim-controls">
                    <div class="control-group">
                        <label>노드 수</label>
                        <input type="range" id="nodeSlider" min="1" max="100" value="${nodes}" oninput="updateSimulation()">
                        <span id="nodeValue">${nodes}</span>
                    </div>
                    <div class="control-group">
                        <label>스케일링 지수</label>
                        <select id="exponentSelect" onchange="updateSimulation()">
                            <option value="1" ${exponent === 1 ? 'selected' : ''}>Linear (n¹)</option>
                            <option value="2" ${exponent === 2 ? 'selected' : ''}>Metcalfe (n²)</option>
                            <option value="3" ${exponent === 3 ? 'selected' : ''}>AUTUS (n³)</option>
                        </select>
                    </div>
                    <button onclick="runProjection()" class="primary">시뮬레이션 실행</button>
                </div>
            </section>
        </main>
        
        <footer class="footer">
            <p>AUTUS Network Effect Visualizer v2.0</p>
        </footer>
    </div>
    
    <script>
        ${this._getChartScript(nodes, exponent, history)}
    </script>
</body>
</html>`;
    },
    
    _renderScalingComparison(nodes) {
        const linear = nodes;
        const quadratic = nodes * nodes;
        const cubic = nodes * nodes * nodes;
        const maxValue = cubic;
        
        return `
        <div class="scaling-card linear">
            <div class="scaling-header">
                <span class="icon">📏</span>
                <span class="name">Linear</span>
                <span class="formula">n¹</span>
            </div>
            <div class="scaling-bar">
                <div class="bar-fill" style="width: ${(linear / maxValue) * 100}%"></div>
            </div>
            <div class="scaling-value">${linear.toLocaleString()}</div>
        </div>
        <div class="scaling-card quadratic">
            <div class="scaling-header">
                <span class="icon">📊</span>
                <span class="name">Metcalfe</span>
                <span class="formula">n²</span>
            </div>
            <div class="scaling-bar">
                <div class="bar-fill" style="width: ${(quadratic / maxValue) * 100}%"></div>
            </div>
            <div class="scaling-value">${quadratic.toLocaleString()}</div>
        </div>
        <div class="scaling-card cubic">
            <div class="scaling-header">
                <span class="icon">🚀</span>
                <span class="name">AUTUS</span>
                <span class="formula">n³</span>
            </div>
            <div class="scaling-bar">
                <div class="bar-fill" style="width: 100%"></div>
            </div>
            <div class="scaling-value">${cubic.toLocaleString()}</div>
        </div>`;
    },
    
    _renderProjections(nodes, exponent) {
        const projections = [
            { label: '1개월 후', multiplier: 1.1 },
            { label: '3개월 후', multiplier: 1.3 },
            { label: '6개월 후', multiplier: 1.6 },
            { label: '1년 후', multiplier: 2.0 }
        ];
        
        return projections.map(p => {
            const futureNodes = Math.floor(nodes * p.multiplier);
            const futureValue = Math.pow(futureNodes, exponent);
            const currentValue = Math.pow(nodes, exponent);
            const growth = ((futureValue / currentValue) - 1) * 100;
            
            return `
            <div class="projection-card">
                <div class="projection-period">${p.label}</div>
                <div class="projection-nodes">${futureNodes}명</div>
                <div class="projection-value">${futureValue.toLocaleString()}</div>
                <div class="projection-growth">+${growth.toFixed(0)}%</div>
            </div>`;
        }).join('');
    },
    
    _renderMilestones(currentNodes) {
        const milestones = [
            { nodes: 10, label: '초기 성장', status: currentNodes >= 10 ? 'achieved' : 'pending' },
            { nodes: 25, label: '네트워크 형성', status: currentNodes >= 25 ? 'achieved' : 'pending' },
            { nodes: 50, label: '임계질량', status: currentNodes >= 50 ? 'achieved' : 'pending' },
            { nodes: 100, label: '자기 유지', status: currentNodes >= 100 ? 'achieved' : 'pending' },
            { nodes: 250, label: '가치 폭발', status: currentNodes >= 250 ? 'achieved' : 'pending' }
        ];
        
        return milestones.map(m => `
            <div class="milestone ${m.status}">
                <div class="milestone-marker"></div>
                <div class="milestone-content">
                    <span class="milestone-nodes">${m.nodes}명</span>
                    <span class="milestone-label">${m.label}</span>
                </div>
            </div>
        `).join('');
    },
    
    _generateSampleHistory(currentNodes) {
        const history = [];
        for (let i = 20; i >= 0; i--) {
            const nodes = Math.max(1, currentNodes - i * 2 + Math.floor(Math.random() * 3));
            history.push({
                date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
                nodes,
                linear: nodes,
                quadratic: nodes * nodes,
                cubic: nodes * nodes * nodes
            });
        }
        return history;
    },
    
    _getChartScript(nodes, exponent, history) {
        return `
        const canvas = document.getElementById('mainChart');
        const ctx = canvas.getContext('2d');
        
        let currentNodes = ${nodes};
        let currentExponent = ${exponent};
        const history = ${JSON.stringify(history)};
        
        function drawChart() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const padding = { top: 30, right: 30, bottom: 50, left: 80 };
            const chartWidth = canvas.width - padding.left - padding.right;
            const chartHeight = canvas.height - padding.top - padding.bottom;
            
            // 배경 그리드
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (chartHeight / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(canvas.width - padding.right, y);
                ctx.stroke();
            }
            
            // 데이터 포인트 수집
            const maxCubic = Math.max(...history.map(h => h.cubic));
            
            // 선 그리기 함수
            function drawLine(data, key, color) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                data.forEach((d, i) => {
                    const x = padding.left + (i / (data.length - 1)) * chartWidth;
                    const y = padding.top + chartHeight - (d[key] / maxCubic) * chartHeight;
                    
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                
                ctx.stroke();
            }
            
            // 선 그리기
            drawLine(history, 'linear', '#60a5fa');
            drawLine(history, 'quadratic', '#fbbf24');
            drawLine(history, 'cubic', '#a855f7');
            
            // 포인트 그리기
            history.forEach((d, i) => {
                const x = padding.left + (i / (history.length - 1)) * chartWidth;
                
                ['linear', 'quadratic', 'cubic'].forEach((key, ki) => {
                    const colors = ['#60a5fa', '#fbbf24', '#a855f7'];
                    const y = padding.top + chartHeight - (d[key] / maxCubic) * chartHeight;
                    
                    ctx.fillStyle = colors[ki];
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
            
            // X축 레이블
            ctx.fillStyle = '#888';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            
            [0, 5, 10, 15, 20].forEach(i => {
                if (i < history.length) {
                    const x = padding.left + (i / (history.length - 1)) * chartWidth;
                    const date = new Date(history[i].date);
                    ctx.fillText(date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }), x, canvas.height - 20);
                }
            });
            
            // Y축 레이블
            ctx.textAlign = 'right';
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (chartHeight / 5) * i;
                const value = maxCubic * (1 - i / 5);
                ctx.fillText(formatNumber(value), padding.left - 10, y + 4);
            }
        }
        
        function formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toFixed(0);
        }
        
        function updateSimulation() {
            currentNodes = parseInt(document.getElementById('nodeSlider').value);
            currentExponent = parseInt(document.getElementById('exponentSelect').value);
            
            document.getElementById('nodeValue').textContent = currentNodes;
            
            // 업데이트된 히스토리로 차트 다시 그리기
            const newHistory = [];
            for (let i = 20; i >= 0; i--) {
                const nodes = Math.max(1, currentNodes - i * 2);
                newHistory.push({
                    date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
                    nodes,
                    linear: nodes,
                    quadratic: nodes * nodes,
                    cubic: nodes * nodes * nodes
                });
            }
            
            history.length = 0;
            history.push(...newHistory);
            
            drawChart();
        }
        
        function runProjection() {
            alert('시뮬레이션 실행 중... 노드: ' + currentNodes + ', 지수: ' + currentExponent);
            updateSimulation();
        }
        
        // 초기 그리기
        drawChart();
        
        console.log('📊 Network Effect Chart Loaded');
        `;
    },
    
    _getStyles() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #fff; }
        
        .chart-container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .header h1 { font-size: 24px; }
        .phase-badge { padding: 8px 20px; border-radius: 20px; font-weight: bold; }
        .phase-badge.phase-linear { background: #60a5fa; }
        .phase-badge.phase-quadratic { background: #fbbf24; color: #000; }
        .phase-badge.phase-cubic, .phase-badge.phase-autus { background: #a855f7; }
        
        section { background: rgba(255,255,255,0.03); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        section h2 { font-size: 16px; color: #a855f7; margin-bottom: 15px; }
        
        .value-display { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05)); }
        .current-value { display: flex; align-items: center; gap: 15px; }
        .formula { font-size: 24px; color: #888; }
        .formula sup { font-size: 16px; }
        .equals { font-size: 32px; color: #666; }
        .result { font-size: 48px; font-weight: bold; color: #a855f7; }
        .node-count { text-align: center; }
        .node-count .label { display: block; font-size: 12px; color: #888; }
        .node-count .count { font-size: 36px; font-weight: bold; color: #4ade80; }
        
        .scaling-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .scaling-card { padding: 15px; background: rgba(0,0,0,0.3); border-radius: 12px; }
        .scaling-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .scaling-header .icon { font-size: 20px; }
        .scaling-header .name { font-weight: bold; }
        .scaling-header .formula { color: #888; font-size: 12px; }
        .scaling-bar { height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 10px; }
        .scaling-card.linear .bar-fill { background: #60a5fa; height: 100%; border-radius: 6px; }
        .scaling-card.quadratic .bar-fill { background: #fbbf24; height: 100%; border-radius: 6px; }
        .scaling-card.cubic .bar-fill { background: #a855f7; height: 100%; border-radius: 6px; }
        .scaling-value { font-size: 24px; font-weight: bold; }
        .scaling-card.linear .scaling-value { color: #60a5fa; }
        .scaling-card.quadratic .scaling-value { color: #fbbf24; }
        .scaling-card.cubic .scaling-value { color: #a855f7; }
        
        .chart-wrapper { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; }
        .chart-legend { display: flex; justify-content: center; gap: 30px; margin-top: 15px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 14px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot.linear { background: #60a5fa; }
        .dot.quadratic { background: #fbbf24; }
        .dot.cubic { background: #a855f7; }
        
        .projections-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .projection-card { text-align: center; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 12px; }
        .projection-period { font-size: 12px; color: #888; margin-bottom: 5px; }
        .projection-nodes { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .projection-value { font-size: 14px; color: #a855f7; margin-bottom: 5px; }
        .projection-growth { color: #4ade80; font-weight: bold; }
        
        .milestones-timeline { display: flex; justify-content: space-between; position: relative; padding: 20px 0; }
        .milestones-timeline::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #333; }
        .milestone { position: relative; text-align: center; }
        .milestone-marker { width: 20px; height: 20px; border-radius: 50%; background: #333; margin: 0 auto 10px; position: relative; z-index: 1; }
        .milestone.achieved .milestone-marker { background: #4ade80; }
        .milestone-nodes { display: block; font-weight: bold; }
        .milestone-label { font-size: 12px; color: #888; }
        
        .sim-controls { display: flex; gap: 20px; align-items: flex-end; }
        .control-group { flex: 1; }
        .control-group label { display: block; font-size: 12px; margin-bottom: 5px; }
        .control-group input, .control-group select { width: 100%; padding: 10px; border: 1px solid #333; background: rgba(0,0,0,0.3); color: #fff; border-radius: 8px; }
        button.primary { padding: 12px 24px; background: #a855f7; border: none; color: #fff; border-radius: 8px; cursor: pointer; font-weight: bold; }
        
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        `;
    }
};

export function testNetworkEffectChart() {
    console.log('Testing Network Effect Chart...');
    
    const chart = Object.create(NetworkEffectChart).init();
    
    const html = chart.render({
        nodes: 42,
        phase: 'QUADRATIC',
        exponent: 2
    });
    
    console.log('✅ Network Effect Chart HTML generated:', html.length, 'characters');
    
    return { chart, html };
}

export default NetworkEffectChart;
