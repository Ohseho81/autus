#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 자율 모니터링 시스템
Mac M3 Pro에서 실제로 작동하는 반자율 점검 파이프라인
═══════════════════════════════════════════════════════════════════════════════

실제로 할 수 있는 것:
✅ 시스템 헬스 체크 (API, Frontend)
✅ TypeScript 린트 에러 감지
✅ Git 변경 사항 추적
✅ 결과 로깅 및 알림
✅ 정기적 리포트 생성

실제로 할 수 없는 것:
❌ Cursor AI 자동 호출 (CLI 미지원)
❌ 코드 자동 수정 (사람의 판단 필요)
❌ "Dribbble급" 디자인 자동 생성

사용법:
    python3 autonomous_monitor.py              # 1회 실행
    python3 autonomous_monitor.py --loop       # 10분 간격 무한 루프
    python3 autonomous_monitor.py --loop 5     # 5분 간격 무한 루프
"""

import subprocess
import os
import sys
import json
import time
from datetime import datetime
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════

AUTUS_DIR = Path("/Users/oseho/Desktop/autus")
FRONTEND_DIR = AUTUS_DIR / "frontend"
DOCS_DIR = AUTUS_DIR / "docs"
REPORTS_DIR = DOCS_DIR / "reports"
LOG_FILE = AUTUS_DIR / "logs" / "autonomous_monitor.log"

API_URL = os.environ.get("AUTUS_API_URL", "https://vercel-8npl25xul-ohsehos-projects.vercel.app/api")
ORG_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

# 색상 코드
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log(msg: str, level: str = "INFO"):
    """로그 출력 및 파일 저장"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 색상 설정
    color = {
        "INFO": Colors.CYAN,
        "OK": Colors.GREEN,
        "WARN": Colors.YELLOW,
        "ERROR": Colors.RED,
        "ACTION": Colors.PURPLE
    }.get(level, Colors.END)
    
    # 콘솔 출력
    print(f"{color}[{timestamp}] [{level}] {msg}{Colors.END}")
    
    # 파일 저장
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}] [{level}] {msg}\n")

# ═══════════════════════════════════════════════════════════════════════════════
# 체크 함수들
# ═══════════════════════════════════════════════════════════════════════════════

def check_api_health() -> dict:
    """API 엔드포인트 헬스 체크"""
    log("API 헬스 체크 시작...", "INFO")
    
    # rewards는 userId 필요, 나머지는 org_id 사용
    endpoints = ["churn", "consensus", "leaderboard", "pilot"]
    results = {"healthy": 0, "unhealthy": 0, "details": []}
    
    for ep in endpoints:
        try:
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", 
                 f"{API_URL}/{ep}?org_id={ORG_ID}", "--max-time", "5"],
                capture_output=True, text=True, timeout=10
            )
            status = result.stdout.strip()
            
            if status == "200":
                results["healthy"] += 1
                results["details"].append({"endpoint": ep, "status": "OK"})
            else:
                results["unhealthy"] += 1
                results["details"].append({"endpoint": ep, "status": f"ERROR ({status})"})
                log(f"  /{ep} - ERROR ({status})", "WARN")
        except Exception as e:
            results["unhealthy"] += 1
            results["details"].append({"endpoint": ep, "status": f"TIMEOUT"})
            log(f"  /{ep} - TIMEOUT", "ERROR")
    
    total = results["healthy"] + results["unhealthy"]
    log(f"API 상태: {results['healthy']}/{total} 정상", "OK" if results["unhealthy"] == 0 else "WARN")
    
    return results

def check_frontend_health() -> dict:
    """프론트엔드 서버 체크"""
    log("프론트엔드 헬스 체크...", "INFO")
    
    try:
        result = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", 
             "http://localhost:3000", "--max-time", "3"],
            capture_output=True, text=True, timeout=5
        )
        status = result.stdout.strip()
        
        if status == "200":
            log("프론트엔드: 정상 (localhost:3000)", "OK")
            return {"status": "running", "port": 3000}
        else:
            log(f"프론트엔드: 응답 없음 (status: {status})", "WARN")
            return {"status": "error", "code": status}
    except:
        log("프론트엔드: 서버 미실행", "WARN")
        return {"status": "not_running"}

def check_typescript_errors() -> dict:
    """TypeScript 컴파일 에러 체크"""
    log("TypeScript 에러 체크...", "INFO")
    
    if not FRONTEND_DIR.exists():
        log("프론트엔드 디렉토리 없음", "WARN")
        return {"errors": 0, "details": []}
    
    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit", "--pretty", "false"],
            cwd=FRONTEND_DIR,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            log("TypeScript: 에러 없음", "OK")
            return {"errors": 0, "details": []}
        else:
            # 에러 파싱
            errors = result.stdout.strip().split('\n') if result.stdout else []
            error_count = len([e for e in errors if e.strip()])
            
            log(f"TypeScript: {error_count}개 에러 발견", "WARN")
            return {"errors": error_count, "details": errors[:10]}  # 처음 10개만
    except subprocess.TimeoutExpired:
        log("TypeScript 체크 타임아웃", "WARN")
        return {"errors": -1, "details": ["timeout"]}
    except Exception as e:
        log(f"TypeScript 체크 실패: {e}", "ERROR")
        return {"errors": -1, "details": [str(e)]}

def check_git_status() -> dict:
    """Git 변경 사항 체크"""
    log("Git 상태 체크...", "INFO")
    
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=AUTUS_DIR,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        changes = result.stdout.strip().split('\n') if result.stdout.strip() else []
        modified = len([c for c in changes if c.startswith(' M') or c.startswith('M ')])
        untracked = len([c for c in changes if c.startswith('??')])
        
        log(f"Git: {modified}개 수정, {untracked}개 미추적", "INFO")
        return {"modified": modified, "untracked": untracked, "total": len(changes)}
    except Exception as e:
        log(f"Git 체크 실패: {e}", "ERROR")
        return {"modified": 0, "untracked": 0, "total": 0}

def check_disk_space() -> dict:
    """디스크 공간 체크"""
    try:
        result = subprocess.run(
            ["df", "-h", str(AUTUS_DIR)],
            capture_output=True,
            text=True,
            timeout=5
        )
        # 간단히 파싱
        lines = result.stdout.strip().split('\n')
        if len(lines) >= 2:
            parts = lines[1].split()
            if len(parts) >= 5:
                usage = parts[4].replace('%', '')
                log(f"디스크: {usage}% 사용 중", "OK" if int(usage) < 90 else "WARN")
                return {"usage_percent": int(usage)}
    except:
        pass
    return {"usage_percent": -1}

# ═══════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_report(results: dict) -> str:
    """마크다운 리포트 생성"""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now()
    filename = f"monitor-{timestamp.strftime('%Y-%m-%d-%H%M')}.md"
    filepath = REPORTS_DIR / filename
    
    api = results.get("api", {})
    frontend = results.get("frontend", {})
    ts = results.get("typescript", {})
    git = results.get("git", {})
    
    # 전체 상태 판단
    overall = "✅ 정상"
    if api.get("unhealthy", 0) > 0 or ts.get("errors", 0) > 0:
        overall = "⚠️ 주의 필요"
    if api.get("unhealthy", 0) > 2 or ts.get("errors", 0) > 10:
        overall = "🚨 문제 발생"
    
    content = f"""# 🤖 AUTUS 자율 모니터링 리포트

**생성 시간**: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}  
**전체 상태**: {overall}

---

## 📊 시스템 상태

| 항목 | 상태 |
|------|------|
| API | {api.get('healthy', 0)}/{api.get('healthy', 0) + api.get('unhealthy', 0)} 정상 |
| Frontend | {'✅ 실행 중' if frontend.get('status') == 'running' else '⚠️ 미실행'} |
| TypeScript | {ts.get('errors', 0)}개 에러 |
| Git | {git.get('modified', 0)}개 수정됨 |

---

## 🔍 상세 내역

### API 엔드포인트
{chr(10).join([f"- {'✅' if d['status'] == 'OK' else '❌'} /{d['endpoint']}: {d['status']}" for d in api.get('details', [])])}

### TypeScript 에러
{chr(10).join([f"- {e}" for e in ts.get('details', [])[:5]]) if ts.get('details') else '에러 없음'}

---

## 📋 권장 액션

"""
    
    actions = []
    if api.get("unhealthy", 0) > 0:
        actions.append("1. API 엔드포인트 점검 필요")
    if frontend.get("status") != "running":
        actions.append("2. `cd frontend && npm run dev` 실행")
    if ts.get("errors", 0) > 0:
        actions.append(f"3. TypeScript {ts.get('errors')}개 에러 수정 필요")
    if git.get("modified", 0) > 10:
        actions.append("4. Git 커밋 권장")
    
    if not actions:
        actions.append("없음 - 시스템 정상 상태")
    
    content += "\n".join(actions)
    content += f"\n\n---\n\n*자동 생성: autonomous_monitor.py*"
    
    with open(filepath, "w") as f:
        f.write(content)
    
    log(f"리포트 저장: {filepath}", "OK")
    return str(filepath)

# ═══════════════════════════════════════════════════════════════════════════════
# 메인 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_cycle() -> dict:
    """한 사이클 실행"""
    print()
    print(f"{Colors.BOLD}{'═' * 60}{Colors.END}")
    print(f"{Colors.CYAN}🤖 AUTUS 자율 모니터링 사이클 시작{Colors.END}")
    print(f"{Colors.BOLD}{'═' * 60}{Colors.END}")
    print()
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "api": check_api_health(),
        "frontend": check_frontend_health(),
        "typescript": check_typescript_errors(),
        "git": check_git_status(),
        "disk": check_disk_space()
    }
    
    # 리포트 생성
    report_path = generate_report(results)
    results["report"] = report_path
    
    print()
    print(f"{Colors.BOLD}{'═' * 60}{Colors.END}")
    print(f"{Colors.GREEN}✅ 사이클 완료{Colors.END}")
    print(f"{Colors.BOLD}{'═' * 60}{Colors.END}")
    print()
    
    return results

def main():
    """메인 함수"""
    # 로그 디렉토리 생성
    (AUTUS_DIR / "logs").mkdir(parents=True, exist_ok=True)
    
    # 인자 파싱
    loop_mode = "--loop" in sys.argv
    interval_minutes = 10  # 기본값
    
    if loop_mode:
        # 간격 인자 확인
        try:
            idx = sys.argv.index("--loop")
            if idx + 1 < len(sys.argv):
                interval_minutes = int(sys.argv[idx + 1])
        except:
            pass
        
        print(f"{Colors.PURPLE}🚀 자율 모니터링 루프 모드 (간격: {interval_minutes}분){Colors.END}")
        print(f"{Colors.YELLOW}종료: Ctrl+C{Colors.END}")
        print()
        
        cycle_count = 0
        try:
            while True:
                cycle_count += 1
                log(f"=== 사이클 #{cycle_count} 시작 ===", "INFO")
                run_cycle()
                
                log(f"{interval_minutes}분 후 다음 사이클...", "INFO")
                time.sleep(interval_minutes * 60)
        except KeyboardInterrupt:
            print()
            log("사용자에 의해 중단됨", "INFO")
            print(f"{Colors.YELLOW}총 {cycle_count}회 사이클 실행{Colors.END}")
    else:
        # 1회 실행
        run_cycle()

if __name__ == "__main__":
    main()
