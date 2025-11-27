<div class="card"><h2>Stats/통계</h2><div id="stats">Loading...</div><div id="stats-filters"></div><div id="stats-table"></div></div>
<div class="card"><h2>루프별 테스트 효율성</h2><canvas id="loopStatsChart" height="80"></canvas></div>
<div class="card"><h2>추천/생성</h2>
    <div><b>추천 명령</b><button onclick="loadRecommendations()">새로고침</button></div>
    <div id="recommendations">Loading...</div>
    <div style="margin-top:10px"><b>LLM 생성</b> <input id="llm-prompt" style="width:60%" placeholder="프롬프트 입력..."><button onclick="runLLM()">실행</button></div><div id="llm-result"></div>
# Serve the unified dashboard HTML at root
@dash_app.get("/", response_class=HTMLResponse)
async def dashboard_root():
    return HTML
"""AUTUS Real-time Dashboard Server (Polling)"""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
import asyncio
import time
# 실시간 이벤트 스트림 (SSE)
async def event_generator():
    last_len = 0
    while True:
        try:
            with open(".vscode/autus-audit-log.json", encoding="utf-8") as f:
                logs = json.load(f)
            if len(logs) > last_len:
                # 새 이벤트 발생 시
                new_logs = logs[last_len:]
                for entry in new_logs:
                    yield f"data: {json.dumps(entry, ensure_ascii=False)}\n\n"
                last_len = len(logs)
        except Exception:
            pass
        await asyncio.sleep(2)

@dash_app.get("/api/events")
async def sse_events():
    return StreamingResponse(event_generator(), media_type="text/event-stream")
import subprocess
from datetime import datetime
import json
import os

dash_app = FastAPI(title="AUTUS Dashboard")

# 최신 대시보드 HTML (1~4번 기능 통합, Chart.js, SSE, 필터/타임라인/롤백/재실행/팝업 포함)
HTML = """
<!DOCTYPE html>
<html>
<head><title>AUTUS Dashboard</title>
<script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>
<style>
body { font-family: Arial; background: #1a1a2e; color: #eee; padding: 20px; }
.card { background: #16213e; padding: 20px; margin: 10px; border-radius: 10px; }
.success { color: #4ade80; }
.error { color: #f87171; }
h1 { color: #818cf8; }
.time { color: #94a3b8; font-size: 14px; }
button { background: #818cf8; color: #fff; border: none; border-radius: 5px; padding: 5px 10px; margin: 2px; cursor: pointer; }
.popup { display: none; position: fixed; top: 20%; left: 50%; transform: translate(-50%, 0); background: #22223b; color: #fff; padding: 20px; border-radius: 10px; z-index: 1000; min-width: 300px; }
.popup.active { display: block; }
.popup-close { float: right; cursor: pointer; color: #f87171; }
.stats-table th, .stats-table td { padding: 4px 8px; }
</style>
</head>
<body>
<h1>AUTUS Real-time Dashboard</h1>
<p class=\"time\">Last update: <span id=\"time\">-</span></p>
<div class=\"card\"><h2>명령/어댑터 실행 내역</h2><div id=\"cmds\">Loading...</div></div>
<div class=\"card\"><h2>Test Status</h2><div id=\"tests\">Loading...</div></div>
<div class=\"card\"><h2>실시간 알림/이벤트</h2><div id=\"events\">Loading...</div></div>
<div class=\"card\"><h2>System Status</h2><div id=\"system\">Loading...</div></div>
<div class=\"card\"><h2>Stats/통계</h2><div id=\"stats\">Loading...</div><div id=\"stats-filters\"></div><div id=\"stats-table\"></div></div>
<div class=\"card\"><h2>명령/이벤트 타임라인</h2><canvas id=\"timelineChart\" height=\"80\"></canvas></div>
<div id=\"popup\" class=\"popup\"><span class=\"popup-close\" onclick=\"closePopup()\">[닫기]</span><pre id=\"popup-content\"></pre></div>
<script>
let timelineChart = null;
let loopStatsChart = null;
// 실시간 알림/이벤트 SSE
function startEventStream() {
    const evt = new EventSource('/api/events');
    evt.onmessage = function(e) {
        let data = JSON.parse(e.data);
        let html = `<b>[${data.timestamp}]</b> <span style='color:#4ade80'>${data.user}</span> <span style='color:#818cf8'>${data.action}</span> <span style='color:#f87171'>${data.result}</span><br>`;
        let el = document.getElementById('events');
        el.innerHTML = html + el.innerHTML;
    }
    evt.onerror = function(e) {
        document.getElementById('events').innerHTML = '<span style=\"color:#f87171\">[이벤트 스트림 연결 오류]</span>';
    }
}
function showPopup(content) {
    document.getElementById('popup-content').textContent = content;
    document.getElementById('popup').classList.add('active');
}
function closePopup() {
    document.getElementById('popup').classList.remove('active');
}
async function rollbackCmd(idx) {
    await fetch('/api/rollback', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({index: idx})});
    update();
}
async function rerunCmd(idx) {
    await fetch('/api/rerun', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({index: idx})});
    update();
}
async function update() {
        try {
                const resp = await fetch('/api/status');
                const data = await resp.json();
                document.getElementById('tests').innerHTML = data.tests;
                document.getElementById('system').innerHTML = data.system;
                document.getElementById('stats').innerHTML = data.stats;
                document.getElementById('time').innerHTML = data.time;
                // 명령/어댑터 실행 내역
                let html = '<table style="width:100%;color:#eee;"><tr><th>#</th><th>어댑터</th><th>메서드</th><th>상세</th><th>액션</th></tr>';
                for(let i=0;i<data.cmds.length;i++){
                    const c = data.cmds[i];
                    html += `<tr><td>${i+1}</td><td>${c.adapter}</td><td>${c.method}</td><td><button onclick='showPopup(JSON.stringify(${JSON.stringify(c)},null,2))'>상세</button></td><td><button onclick='rollbackCmd(${i})'>롤백</button><button onclick='rerunCmd(${i})'>재실행</button></td></tr>`;
                }
                html += '</table>';
                document.getElementById('cmds').innerHTML = html;
                // 통계/필터 UI
                let statsHtml = '<b>사용자별:</b> ';
                for(const u in data.user_stats){ statsHtml += `<button onclick='filterStats("user","${u}")'>${u}(${data.user_stats[u]})</button> `; }
                statsHtml += '<br><b>액션별:</b> ';
                for(const a in data.action_stats){ statsHtml += `<button onclick='filterStats("action","${a}")'>${a}(${data.action_stats[a]})</button> `; }
                statsHtml += '<br><b>시간별:</b> ';
                for(const h in data.hourly_stats){ statsHtml += `<button onclick='filterStats("hour","${h}")'>${h}(${data.hourly_stats[h]})</button> `; }
                document.getElementById('stats-filters').innerHTML = statsHtml;
                document.getElementById('stats-table').innerHTML = '';

                // 타임라인 차트 (시간별 이벤트 수)
                let labels = Object.keys(data.hourly_stats || {}).sort();
                let values = labels.map(h => data.hourly_stats[h]);
                let ctx = document.getElementById('timelineChart').getContext('2d');
                if (timelineChart) timelineChart.destroy();
                timelineChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: '이벤트 수',
                            data: values,
                            backgroundColor: '#818cf8',
                        }]
                    },
                    options: {
                        plugins: { legend: { display: false } },
                        scales: { x: { title: { display: true, text: '시간' } }, y: { title: { display: true, text: '이벤트 수' }, beginAtZero: true } }
                    }
                });
        } catch(e) {
                console.error(e);
        }
}
async function filterStats(type, value) {
    let url = `/api/stats?${type}=${encodeURIComponent(value)}`;
    const resp = await fetch(url);
    const data = await resp.json();
    let html = `<b>필터 결과 (${data.count}건)</b><table class='stats-table' style='width:100%;color:#eee;'><tr><th>user</th><th>action</th><th>result</th><th>timestamp</th></tr>`;
    for(const l of data.logs){
        html += `<tr><td>${l.user}</td><td>${l.action}</td><td>${l.result}</td><td>${l.timestamp}</td></tr>`;
    }
    html += '</table>';
    document.getElementById('stats-table').innerHTML = html;
}
update();
setInterval(update, 5000);
startEventStream();
// 루프별 효율성 그래프
async function drawLoopStats() {
    try {
        const resp = await fetch('/static/.autus/loop_stats.json');
        const stats = await resp.json();
        const labels = stats.map(s => `#${s.iteration}`);
        const passed = stats.map(s => s.passed);
        const failed = stats.map(s => s.failed);
        const error = stats.map(s => s.error);
        const total = stats.map(s => s.total);
        const successRate = stats.map(s => Math.round(100 * s.passed / s.total));
        let ctx = document.getElementById('loopStatsChart').getContext('2d');
        if (loopStatsChart) loopStatsChart.destroy();
        loopStatsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: '성공', data: passed, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.2)', yAxisID: 'y' },
                    { label: '실패', data: failed, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.2)', yAxisID: 'y' },
                    { label: '에러', data: error, borderColor: '#facc15', backgroundColor: 'rgba(250,204,21,0.2)', yAxisID: 'y' },
                    { label: '성공률(%)', data: successRate, borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.2)', yAxisID: 'y2', type: 'line', fill: false }
                ]
            },
            options: {
                plugins: { legend: { display: true } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: '테스트 수' } },
                    y2: { beginAtZero: true, position: 'right', title: { display: true, text: '성공률(%)' }, min: 0, max: 100, grid: { drawOnChartArea: false } }
                }
            }
        });
    } catch(e) {
        document.getElementById('loopStatsChart').parentElement.innerHTML += '<div style="color:#f87171">[loop_stats.json 로드 오류]</div>';
    }
}
drawLoopStats();
setInterval(drawLoopStats, 10000);
// 추천 명령 불러오기
async function loadRecommendations() {
    document.getElementById('recommendations').innerHTML = 'Loading...';
    try {
        const resp = await fetch('/api/recommend?topk=5');
        const data = await resp.json();
        let html = '<table style="width:100%;color:#eee;"><tr><th>user</th><th>action</th><th>count</th></tr>';
        for(const r of data.recommendations){
            html += `<tr><td>${r.user}</td><td>${r.action}</td><td>${r.count}</td></tr>`;
        }
        html += '</table>';
        document.getElementById('recommendations').innerHTML = html;
    } catch(e) {
        document.getElementById('recommendations').innerHTML = '[추천 API 오류]';
    }
}
// LLM 생성 실행
async function runLLM() {
    let prompt = document.getElementById('llm-prompt').value;
    if (!prompt) { alert('프롬프트를 입력하세요!'); return; }
    document.getElementById('llm-result').innerHTML = '실행 중...';
    try {
        const resp = await fetch('/api/llm?prompt=' + encodeURIComponent(prompt), {method:'POST'});
        const data = await resp.json();
        document.getElementById('llm-result').innerHTML = `<pre>${data.result}</pre>`;
    } catch(e) {
        document.getElementById('llm-result').innerHTML = '[LLM API 오류]';
    }
}
// 대시보드 진입 시 자동 추천 로딩
loadRecommendations();
</script>
</body>
</html>
"""
# 롤백 API (mock)
@dash_app.post("/api/rollback")
async def rollback_cmd(req: Request):
    data = await req.json()
    idx = data.get("index")
    # 실제 롤백 로직은 어댑터별로 구현 필요 (여기선 로그만)
    print(f"[DASH] 롤백 요청: index={idx}")
    return JSONResponse({"ok": True, "msg": f"롤백 요청: index={idx}"})

# 재실행 API (mock)
@dash_app.post("/api/rerun")
async def rerun_cmd(req: Request):
    data = await req.json()
    idx = data.get("index")
    print(f"[DASH] 재실행 요청: index={idx}")
    return JSONResponse({"ok": True, "msg": f"재실행 요청: index={idx}"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(dash_app, host="0.0.0.0", port=8001)
