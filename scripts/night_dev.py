"""
AUTUS Night Dev v1.0
밤새 자동 개발 시스템

Usage:
  python3 scripts/night_dev.py          # 전체 작업 실행
  python3 scripts/night_dev.py --dry    # 미리보기만
  python3 scripts/night_dev.py --task 1 # 특정 작업만
"""

import os
import sys
import time
import json
import subprocess
from pathlib import Path
from datetime import datetime

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# .env 로드
env_path = project_root / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

from oracle.llm_client import LLMClient


# ═══════════════════════════════════════════════════════════════
# 작업 리스트 (남은 개발 항목)
# ═══════════════════════════════════════════════════════════════

TASKS = [
    {
        "id": 1,
        "name": "Decision Logger API",
        "type": "python",
        "output": "app/api/decision_api.py",
        "prompt": """Create a FastAPI router for Decision Logger:

ENDPOINTS:
- POST /decision/log - Log a decision with context
- GET /decision/history - Get decision history
- GET /decision/outcome/{id} - Get decision outcome

MODELS:
- DecisionLog: id, timestamp, context, options, chosen, confidence, outcome
- DecisionOutcome: decision_id, actual_result, predicted_result, accuracy

FEATURES:
- Store in database using get_db() context manager
- Calculate decision quality score
- Track CYCLE increment on decisions

Use existing patterns from app/main.py""",
        "test": "python3 -c \"import ast; ast.parse(open('app/api/decision_api.py').read())\""
    },
    {
        "id": 2,
        "name": "Outcome Tracker API",
        "type": "python",
        "output": "app/api/outcome_api.py",
        "prompt": """Create a FastAPI router for Outcome Tracker:

ENDPOINTS:
- POST /outcome/record - Record an outcome for a decision
- GET /outcome/analysis - Analyze prediction accuracy
- GET /outcome/calibration - Get calibration data for auto-tuner

FEATURES:
- Link outcomes to decisions
- Calculate prediction vs reality delta
- Feed data to auto-tuner for physics calibration

Use existing patterns from app/main.py""",
        "test": "python3 -c \"import ast; ast.parse(open('app/api/outcome_api.py').read())\""
    },
    {
        "id": 3,
        "name": "User Auth System",
        "type": "python",
        "output": "app/api/auth_api.py",
        "prompt": """Create a FastAPI router for User Authentication:

ENDPOINTS:
- POST /auth/register - Register new user
- POST /auth/login - Login and get JWT token
- GET /auth/me - Get current user info
- POST /auth/refresh - Refresh token

FEATURES:
- JWT token based authentication
- Password hashing with bcrypt
- User model with id, email, password_hash, created_at
- Store in PostgreSQL/SQLite using get_db()

Use python-jose for JWT, passlib for password hashing""",
        "test": "python3 -c \"import ast; ast.parse(open('app/api/auth_api.py').read())\""
    },
    {
        "id": 4,
        "name": "Calendar Connector",
        "type": "python",
        "output": "connectors/calendar_connector.py",
        "prompt": """Create a Calendar Connector for AUTUS:

FEATURES:
- Google Calendar OAuth integration
- Fetch events for date range
- Convert events to AUTUS pressure/release signals
- Meeting = pressure increase
- Free time = recovery opportunity

INTERFACE:
- CalendarConnector class
- connect(credentials) method
- get_events(start, end) method
- to_autus_signals(events) method

Include OAuth flow helper""",
        "test": "python3 -c \"import ast; ast.parse(open('connectors/calendar_connector.py').read())\""
    },
    {
        "id": 5,
        "name": "Desktop Agent Core",
        "type": "python",
        "output": "agent/desktop_agent.py",
        "prompt": """Create a Desktop Agent for AUTUS:

FEATURES:
- Track active application
- Track window titles
- Calculate focus time per app
- Detect context switches
- Send events to AUTUS API

INTERFACE:
- DesktopAgent class
- start() method - begin monitoring
- stop() method - stop monitoring
- get_stats() method - current statistics
- on_app_change callback

Use psutil for process info
Platform: macOS/Windows/Linux compatible""",
        "test": "python3 -c \"import ast; ast.parse(open('agent/desktop_agent.py').read())\""
    },
    {
        "id": 6,
        "name": "Galaxy Multi-System API",
        "type": "python",
        "output": "app/api/galaxy_api.py",
        "prompt": """Create a FastAPI router for Galaxy (multi-system):

ENDPOINTS:
- POST /galaxy/create - Create a galaxy (organization)
- POST /galaxy/{id}/add_solar - Add a solar (user) to galaxy
- GET /galaxy/{id}/status - Get aggregate galaxy status
- GET /galaxy/{id}/propagation - Get entropy propagation graph

PHYSICS:
- OuterEntropy = Σ(SolarEntropy × coupling)
- Propagation spreads problems across connected solars
- Galaxy has no DECISION power (only Solars do)

Use existing Solar entity patterns""",
        "test": "python3 -c \"import ast; ast.parse(open('app/api/galaxy_api.py').read())\""
    },
    {
        "id": 7,
        "name": "History Chart Component",
        "type": "html",
        "output": "frontend/history-chart.html",
        "prompt": """Create a History Chart page for AUTUS:

FEATURES:
- Line chart showing entropy over time (last 24h)
- Line chart showing energy over time
- Event markers on chart (pressure/release/decision)
- Zoom and pan controls
- Dark theme matching AUTUS style

Use Chart.js for charts
Fetch from https://solar.autus-ai.com/autus/solar/status
Poll every 5 seconds, store history in memory

COLORS:
- Background: #0a0a0f
- Entropy line: #ff4444
- Energy line: #00ff88
- Grid: rgba(255,255,255,0.1)""",
        "test": "test -f frontend/history-chart.html"
    },
    {
        "id": 8,
        "name": "Mobile Responsive Dashboard",
        "type": "html",
        "output": "frontend/mobile-dashboard.html",
        "prompt": """Create a Mobile-friendly Dashboard for AUTUS:

FEATURES:
- Responsive design (works on phone)
- Simple status display: Energy, Entropy, Status
- Large touch-friendly buttons: PRESSURE, RELEASE, DECISION
- Swipe gestures for navigation
- PWA ready (can install as app)

STYLE:
- Dark theme
- Large fonts for readability
- Bottom navigation bar
- Pull to refresh

Fetch from https://solar.autus-ai.com/autus/solar/status""",
        "test": "test -f frontend/mobile-dashboard.html"
    }
]


# ═══════════════════════════════════════════════════════════════
# Night Dev Engine
# ═══════════════════════════════════════════════════════════════

class NightDev:
    def __init__(self):
        self.client = LLMClient()
        self.project_root = project_root
        self.results = []
        self.start_time = None
        
    def log(self, msg, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = {"INFO": "📝", "SUCCESS": "✅", "ERROR": "❌", "WARN": "⚠️"}.get(level, "")
        print(f"[{timestamp}] {prefix} {msg}")
        
    def generate_code(self, task: dict) -> dict:
        """LLM으로 코드 생성"""
        prompt = f"""You are AUTUS Auto-Dev. Generate production-ready code.

PROJECT CONTEXT:
- FastAPI backend at app/main.py
- Database: PostgreSQL (DATABASE_URL) or SQLite fallback
- Use get_db() context manager for DB access
- Existing routers in app/api/

TASK: {task['name']}

{task['prompt']}

RULES:
1. Generate COMPLETE, WORKING code
2. Include ALL imports
3. Use modern Python/JS best practices
4. Add docstrings and comments
5. Output ONLY the code, no explanations

{"If HTML: self-contained with inline CSS/JS, dark theme." if task['type'] == 'html' else ""}
"""
        
        response = self.client.generate(prompt, max_tokens=4000)
        
        if not response.get("success"):
            return {"success": False, "error": response.get("error")}
        
        code = response.get("content", "")
        
        # 코드 블록 추출
        if "```" in code:
            parts = code.split("```")
            for i, block in enumerate(parts):
                if i % 2 == 1:
                    lines = block.split("\n")
                    if lines[0].strip() in ["python", "html", "javascript", "js"]:
                        code = "\n".join(lines[1:])
                    else:
                        code = block
                    break
        
        return {"success": True, "code": code.strip()}
    
    def save_code(self, task: dict, code: str) -> bool:
        """코드 파일 저장"""
        output_path = self.project_root / task["output"]
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, "w") as f:
            f.write(code)
        
        return output_path.exists()
    
    def test_code(self, task: dict) -> bool:
        """코드 테스트"""
        try:
            result = subprocess.run(
                task["test"],
                shell=True,
                cwd=self.project_root,
                capture_output=True,
                timeout=30
            )
            return result.returncode == 0
        except Exception as e:
            self.log(f"Test error: {e}", "ERROR")
            return False
    
    def fix_code(self, task: dict, code: str, error: str) -> dict:
        """에러 발생시 자가 수정"""
        prompt = f"""Fix this code error:

ORIGINAL CODE:
```
{code[:2000]}
```

ERROR:
{error}

Generate the FIXED complete code. Output ONLY the code."""
        
        response = self.client.generate(prompt, max_tokens=4000)
        
        if not response.get("success"):
            return {"success": False, "error": response.get("error")}
        
        fixed = response.get("content", "")
        if "```" in fixed:
            parts = fixed.split("```")
            for i, block in enumerate(parts):
                if i % 2 == 1:
                    lines = block.split("\n")
                    if lines[0].strip() in ["python", "html", "javascript"]:
                        fixed = "\n".join(lines[1:])
                    else:
                        fixed = block
                    break
        
        return {"success": True, "code": fixed.strip()}
    
    def git_commit(self, task: dict) -> bool:
        """Git 자동 커밋"""
        try:
            subprocess.run(["git", "add", task["output"]], cwd=self.project_root)
            subprocess.run(
                ["git", "commit", "-m", f"auto: {task['name']} (NightDev)"],
                cwd=self.project_root
            )
            return True
        except:
            return False
    
    def run_task(self, task: dict) -> dict:
        """단일 작업 실행"""
        self.log(f"Starting: {task['name']}")
        result = {"task": task["name"], "success": False, "attempts": 0}
        
        max_attempts = 3
        code = None
        
        for attempt in range(max_attempts):
            result["attempts"] = attempt + 1
            
            # 1. 코드 생성
            self.log(f"Generating code (attempt {attempt + 1})")
            gen_result = self.generate_code(task)
            
            if not gen_result["success"]:
                self.log(f"Generation failed: {gen_result.get('error')}", "ERROR")
                continue
            
            code = gen_result["code"]
            
            # 2. 저장
            if not self.save_code(task, code):
                self.log("Failed to save code", "ERROR")
                continue
            
            # 3. 테스트
            self.log("Testing code...")
            if self.test_code(task):
                self.log(f"Task completed: {task['name']}", "SUCCESS")
                result["success"] = True
                
                # 4. Git 커밋
                self.git_commit(task)
                break
            else:
                self.log("Test failed, attempting fix...", "WARN")
                # 에러 자가 수정 시도
                fix_result = self.fix_code(task, code, "Syntax or import error")
                if fix_result["success"]:
                    code = fix_result["code"]
                    self.save_code(task, code)
                    if self.test_code(task):
                        self.log(f"Fixed and completed: {task['name']}", "SUCCESS")
                        result["success"] = True
                        self.git_commit(task)
                        break
        
        return result
    
    def run_all(self, dry_run=False, task_id=None):
        """전체 작업 실행"""
        self.start_time = datetime.now()
        self.log("=" * 50)
        self.log("AUTUS Night Dev Starting")
        self.log(f"Tasks: {len(TASKS)}")
        self.log("=" * 50)
        
        if not self.client.enabled:
            self.log("LLM not enabled! Set ANTHROPIC_API_KEY in .env", "ERROR")
            return
        
        tasks_to_run = TASKS
        if task_id:
            tasks_to_run = [t for t in TASKS if t["id"] == task_id]
        
        if dry_run:
            self.log("DRY RUN - Preview only")
            for task in tasks_to_run:
                self.log(f"  [{task['id']}] {task['name']} → {task['output']}")
            return
        
        for task in tasks_to_run:
            result = self.run_task(task)
            self.results.append(result)
            
            # 작업 간 딜레이 (API 제한 방지)
            time.sleep(2)
        
        self.report()
    
    def report(self):
        """결과 리포트"""
        elapsed = datetime.now() - self.start_time
        success = sum(1 for r in self.results if r["success"])
        failed = len(self.results) - success
        
        self.log("=" * 50)
        self.log("NIGHT DEV REPORT")
        self.log("=" * 50)
        self.log(f"Total tasks: {len(self.results)}")
        self.log(f"Success: {success}", "SUCCESS")
        self.log(f"Failed: {failed}", "ERROR" if failed else "INFO")
        self.log(f"Time: {elapsed}")
        self.log("=" * 50)
        
        # 결과 저장
        report_path = self.project_root / "reports" / f"night_dev_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_path.parent.mkdir(exist_ok=True)
        with open(report_path, "w") as f:
            json.dump({
                "start": self.start_time.isoformat(),
                "elapsed": str(elapsed),
                "results": self.results
            }, f, indent=2)
        self.log(f"Report saved: {report_path}")


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    dev = NightDev()
    
    dry_run = "--dry" in sys.argv
    task_id = None
    
    for i, arg in enumerate(sys.argv):
        if arg == "--task" and i + 1 < len(sys.argv):
            task_id = int(sys.argv[i + 1])
    
    dev.run_all(dry_run=dry_run, task_id=task_id)
