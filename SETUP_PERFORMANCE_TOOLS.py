#!/usr/bin/env python3
"""
AUTUS v4.8 성능 분석 통합 도구 - 설정 가이드
setup_instructions.py

설치 및 첫 실행 방법을 포함합니다.
"""

import os
import sys
from pathlib import Path

SETUP_GUIDE = """
╔════════════════════════════════════════════════════════════════════════════╗
║                   AUTUS v4.8 성능 분석 도구 - 설치 가이드                  ║
║              [M1] 대시보드 + [T2] 캐시 검증 + [D1] 프로파일링             ║
╚════════════════════════════════════════════════════════════════════════════╝

📦 생성된 파일 목록
════════════════════════════════════════════════════════════════════════════

✅ performance_dashboard.py (320 줄)
   └─ 핵심 성능 분석 도구
      • PerformanceDashboard: [M1] 실시간 추적
      • CacheValidator: [T2] 캐시 검증 (80% 목표)
      • PerformanceProfiler: [D1] 병목 분석

✅ .vscode/tasks.json (230 줄)
   └─ VS Code 통합 태스크 (10개)
      • 전체 분석
      • 개별 분석 (대시보드/캐시/프로파일)
      • 실시간 모니터링
      • 부하 테스트

✅ quick_launch.py (280 줄)
   └─ VS Code 내장 빠른 실행 메뉴
      • 11개 옵션
      • 대화형 메뉴

✅ PERFORMANCE_ANALYSIS_GUIDE.md (350 줄)
   └─ 완벽한 사용자 가이드
      • 3가지 실행 방법
      • 결과 해석
      • 문제 해결

✅ run_performance_check.sh
   └─ 커맨드라인 쉘 스크립트

════════════════════════════════════════════════════════════════════════════

🚀 빠른 시작 (5분)

1️⃣ 필수 패키지 설치
   ─────────────────────────────────────────────────────────────
   pip install httpx

2️⃣ 전체 성능 분석 실행
   ─────────────────────────────────────────────────────────────
   
   방법 A: VS Code (추천)
   • Ctrl+Shift+P → "Tasks: Run Task" → "전체 성능 분석" 선택
   
   방법 B: 터미널
   • python3 performance_dashboard.py --all

3️⃣ 결과 확인
   ─────────────────────────────────────────────────────────────
   • 2-3분 후 완전한 성능 분석 보고서 출력

════════════════════════════════════════════════════════════════════════════

📚 실행 방법 3가지

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
방법 1: VS Code 메뉴 (추천 ⭐)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 가장 사용하기 쉬운 방법

VS Code에서:
1. Ctrl+Shift+P (명령 팔레트 열기)
2. "Tasks: Run Task" 입력
3. 원하는 작업 선택:

   🔵 [M1+T2+D1] 전체 성능 분석 ⭐
   🎯 [M1] 성능 대시보드 - 실시간 추적
   💾 [T2] 캐시 검증 - 80% 목표 확인
   ⚡ [D1] 프로파일링 - 병목 특정
   📊 실시간 대시보드 (Refresh: 30초)
   🔍 캐시 상태 모니터링
   📈 요청 추적 모니터링
   🧪 부하 테스트 (100 요청)
   🚀 서버 시작 + 성능 분석

예시:
─────
커맨드 팔레트 → "Tasks: Run Task" → "전체 성능 분석" → Enter

2-3분 후 다음이 순차 실행됩니다:
  ✅ [M1] 현재 성능 대시보드 스냅샷
  ✅ [T2] 캐시 검증 (50회 요청으로 히트율 측정)
  ✅ [D1] 프로파일링 (각 엔드포인트 50회 벤치마크)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
방법 2: 빠른 메뉴 실행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 대화형 메뉴로 선택

터미널에서:
$ python3 quick_launch.py

메뉴가 표시되고, 숫자로 선택:
  1 - 전체 성능 분석
  2 - 실시간 대시보드
  3 - 캐시 검증
  4 - 프로파일링
  5-8 - 모니터링 및 테스트
  9-11 - 유틸리티

예시:
─────
$ python3 quick_launch.py
  ... (메뉴 표시) ...
선택 (0-11): 1
  ✅ 전체 성능 분석 시작
  (2-3분 소요)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
방법 3: 커맨드라인 직접 실행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 파워유저용 - 스크립트 통합 가능

전체 실행:
$ python3 performance_dashboard.py --all

개별 실행:
$ python3 performance_dashboard.py --dashboard --duration=600  # 10분
$ python3 performance_dashboard.py --cache                     # 1분
$ python3 performance_dashboard.py --profile                   # 1분

한 줄 명령 (실시간 모니터링):
$ while true; do curl -s http://localhost:8000/monitoring/performance/dashboard | jq '.'; sleep 30; done

════════════════════════════════════════════════════════════════════════════

📊 [M1] 성능 대시보드 - 실시간 추적

실행:
  python3 performance_dashboard.py --dashboard --duration=600

결과 예시:
  🎯 AUTUS v4.8 성능 대시보드
  ════════════════════════════════════════════════════════════
  📊 전체 메트릭
    • 총 요청: 12,543
    • 평균 응답시간: 42.5ms        ✅ 목표: < 100ms
    • P95 응답시간: 85.2ms         ✅ 목표: < 100ms
    • P99 응답시간: 125.8ms        ⚠️  목표: < 150ms
    • 캐시 히트율: 82.3%           ✅ 목표: > 80%
    • 에러율: 0.12%                ✅ 목표: < 1%
  
  🔍 엔드포인트별 성능
    🟢 /devices (P95: 45.2ms)
    🟡 /analytics (P95: 120.5ms)
    🟢 /cache/stats (P95: 8.3ms)

해석:
  🟢 = 우수 (P95 < 50ms)
  🟡 = 양호 (P95 < 100ms)
  🔴 = 개선 필요 (P95 > 200ms)

────────────────────────────────────────────────────────────────
💾 [T2] 캐시 검증 - 80% 목표 확인

실행:
  python3 performance_dashboard.py --cache

결과 예시:
  💾 AUTUS v4.8 캐시 검증
  ════════════════════════════════════════════════════════════
  🎯 목표 캐시 히트율: 80%
  
  📊 현재 캐시 통계
    • 전체 요청: 5,234
    • 캐시 히트: 4,291
    • 캐시 미스: 943
    • 현재 히트율: 81.9%
    ✅ 목표 달성! (+1.9%)
  
  🔍 엔드포인트별 캐시 성능
    ✅ /devices: 85.2%
    ✅ /analytics: 78.5%
    ✅ /config: 95.3%
    ✅ /cache/stats: 100%
  
  💡 권장사항
    ✅ 모든 엔드포인트가 목표 히트율 달성!

해석:
  ✅ > 80% = 목표 달성
  ⚠️ 70-80% = 개선 권장 (TTL 증가)
  🔴 < 70% = 즉시 개선 필요

────────────────────────────────────────────────────────────────
⚡ [D1] 프로파일링 - 병목 특정

실행:
  python3 performance_dashboard.py --profile

결과 예시:
  ⚡ AUTUS v4.8 성능 프로파일링
  ════════════════════════════════════════════════════════════
  🔍 성능 분석 (P95 기준 정렬)
  
  1. /devices 🟢 EXCELLENT
     ├─ P95: 42.3ms
     ├─ Mean: 38.1ms
     ├─ Min/Max: 25.2ms / 65.4ms
     ├─ 성공: 50/50
     └─ StdDev: 8.5ms
  
  2. /analytics 🟡 GOOD
     ├─ P95: 95.7ms
     ├─ Mean: 82.3ms
     ├─ Min/Max: 65.2ms / 180.4ms
     ├─ 성공: 50/50
     └─ StdDev: 22.1ms
  
  🔴 병목 지점 분석
  ⚠️ /analytics
     → P95: 95.7ms (목표: 100ms)
     → DB 쿼리 최적화 또는 캐시 TTL 증가

해석:
  🟢 EXCELLENT: P95 < 50ms
  🟡 GOOD: P95 < 100ms
  🟠 ACCEPTABLE: P95 < 200ms
  🔴 POOR: P95 > 200ms

════════════════════════════════════════════════════════════════════════════

✅ 사전 체크리스트

실행 전 확인사항:

□ main.py가 실행 중인가?
  확인: curl http://localhost:8000/health
  
□ Python 3.7+ 설치되어 있는가?
  확인: python3 --version
  
□ httpx 패키지 설치되어 있는가?
  설치: pip install httpx
  
□ VS Code 열려있는가? (VS Code 방법 사용시)
  확인: 현재 디렉토리가 /Users/oseho/Desktop/autus

════════════════════════════════════════════════════════════════════════════

🆘 문제 해결

Q: "Connection refused" 오류가 나옵니다
A: main.py가 실행 중인지 확인하세요
   $ python3 main.py

Q: "Module 'httpx' not found" 오류
A: httpx를 설치하세요
   $ pip install httpx

Q: 응답이 매우 느립니다 (P95 > 200ms)
A: 다음을 확인하세요
   1. 데이터베이스 연결 상태 (SQLite/Redis)
   2. 캐시 상태: python3 performance_dashboard.py --cache
   3. 메모리 사용: curl http://localhost:8000/monitoring/performance/dashboard

Q: "Tasks: Run Task"가 안 보입니다
A: .vscode/tasks.json이 존재하는지 확인하세요
   없으면 생성: mkdir -p .vscode && 파일 복사

════════════════════════════════════════════════════════════════════════════

🎯 추천 실행 패턴

방법 1: 정기 성능 모니터링 (주 1회)
───────────────────────────────
$ python3 performance_dashboard.py --all

→ 5-10분 소요
→ 기준선 설정, 성능 추이 파악

방법 2: 배포 후 성능 확인
───────────────────────────────
$ python3 performance_dashboard.py --profile

→ 2-3분 소요
→ 배포 전후 성능 비교

방법 3: 캐시 효율성 확인
───────────────────────────────
$ python3 performance_dashboard.py --cache

→ 1-2분 소요
→ 캐시 히트율 80% 이상 확인

방법 4: 지속적 모니터링 (대시보드)
───────────────────────────────
$ python3 performance_dashboard.py --dashboard

→ 지속 실행 (Ctrl+C로 중단)
→ 실시간 성능 추적

════════════════════════════════════════════════════════════════════════════

📞 참고 문서

📖 성능 분석 완벽 가이드
   → PERFORMANCE_ANALYSIS_GUIDE.md

📖 전체 액션 리스트
   → VS_CODE_ACTION_LIST.md

📖 API 문서
   → http://localhost:8000/docs (Swagger UI)

📖 문제 해결 가이드
   → docs/TROUBLESHOOTING_GUIDE.md

════════════════════════════════════════════════════════════════════════════

✨ 성공 지표

성능 분석 완료:
  ✅ 평균 응답시간 < 100ms
  ✅ P95 응답시간 < 150ms
  ✅ 캐시 히트율 > 80%
  ✅ 에러율 < 1%

병목 지점 식별:
  ✅ P95 > 200ms 엔드포인트 파악
  ✅ 각 병목별 원인 분석
  ✅ 개선 방안 도출

오케이!

════════════════════════════════════════════════════════════════════════════

Version: AUTUS v4.8
Updated: 2024-12-07
Status: Production Ready ✅
"""

def main():
    print(SETUP_GUIDE)
    
    # 체크리스트
    print("\n🔍 환경 체크\n")
    
    checks = [
        ("Python 3.7+", lambda: __import__('sys').version_info >= (3, 7)),
        ("httpx 패키지", lambda: __import__('importlib.util').util.find_spec('httpx') is not None),
        ("performance_dashboard.py 파일", lambda: Path("performance_dashboard.py").exists()),
        (".vscode/tasks.json 파일", lambda: Path(".vscode/tasks.json").exists()),
        ("PERFORMANCE_ANALYSIS_GUIDE.md", lambda: Path("PERFORMANCE_ANALYSIS_GUIDE.md").exists()),
    ]
    
    for name, check in checks:
        try:
            result = check()
            status = "✅" if result else "❌"
            print(f"{status} {name}")
        except Exception as e:
            print(f"❌ {name} ({e})")

if __name__ == "__main__":
    main()
