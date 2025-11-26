"""AUTUS Real-time Dashboard Server"""
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
import asyncio
import subprocess
import json
from datetime import datetime

dash_app = FastAPI(title="AUTUS Dashboard")

HTML = """
<!DOCTYPE html>
<html>
<head><title>AUTUS Dashboard</title>
<style>
body { font-family: Arial; background: #1a1a2e; color: #eee; padding: 20px; }
.card { background: #16213e; padding: 20px; margin: 10px; border-radius: 10px; }
.success { color: #4ade80; }
.error { color: #f87171; }
h1 { color: #818cf8; }
</style>
</head>
<body>
<h1>🚀 AUTUS Real-time Dashboard</h1>
<div class="card"><h2>📊 Test Status</h2><div id="tests">Loading...</div></div>
<div class="card"><h2>🔧 System Status</h2><div id="system">Loading...</div></div>
<div class="card"><h2>📝 Recent Logs</h2><div id="logs">Loading...</div></div>
<script>
const ws = new WebSocket("ws://localhost:8001/ws");
ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    document.getElementById("tests").innerHTML = data.tests;
    document.getElementById("system").innerHTML = data.system;
    document.getElementById("logs").innerHTML = data.logs;
};
</script>
</body>
</html>
"""

@dash_app.get("/")
async def dashboard():
    return HTMLResponse(HTML)

@dash_app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        # 테스트 상태
        try:
            result = subprocess.run(
                ["python", "-m", "pytest", "-q", "--tb=no"],
                capture_output=True, text=True, timeout=60
            )
            tests = result.stdout.split("\n")[-2] if result.stdout else "Unknown"
        except:
            tests = "Error running tests"
        
        # 시스템 상태
        system = f"Time: {datetime.now().strftime('%H:%M:%S')}"
        
        # 최근 로그
        try:
            with open(".autus/logs/latest.log", "r") as f:
                logs = "<br>".join(f.readlines()[-5:])
        except:
            logs = "No logs"
        
        await websocket.send_json({
            "tests": tests,
            "system": system,
            "logs": logs
        })
        await asyncio.sleep(5)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(dash_app, host="0.0.0.0", port=8001)
