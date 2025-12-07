#!/usr/bin/env python3
"""
VS Code 빠른 실행 메뉴
Ctrl+Shift+P에서 "Quick Launch" 검색하여 사용
"""

import subprocess
import sys
import platform
from pathlib import Path

def run_command(cmd: str, title: str = ""):
    """명령 실행"""
    if title:
        print(f"\n{'='*60}")
        print(f"🚀 {title}")
        print(f"{'='*60}\n")
    
    try:
        result = subprocess.run(cmd, shell=True)
        return result.returncode == 0
    except KeyboardInterrupt:
        print("\n\n⏹️  중단됨")
        return False

def print_menu():
    """메인 메뉴"""
    menu = """
╔════════════════════════════════════════════════════════════════╗
║          AUTUS v4.8 성능 분석 - 빠른 실행 메뉴               ║
║         [M1] 대시보드 [T2] 캐시 [D1] 프로파일링            ║
╚════════════════════════════════════════════════════════════════╝

📋 실행 메뉴:

🎯 성능 분석
  1️⃣  [M1+T2+D1] 전체 성능 분석 (권장) ⭐
  2️⃣  [M1] 실시간 성능 대시보드 (계속 실행)
  3️⃣  [T2] 캐시 검증 - 80% 목표 확인
  4️⃣  [D1] 프로파일링 - 병목 특정

📊 모니터링
  5️⃣  실시간 대시보드 (30초 갱신)
  6️⃣  캐시 상태 모니터링 (10초 갱신)
  7️⃣  요청 추적 모니터링 (10초 갱신)
  8️⃣  부하 테스트 (100 요청)

🔧 유틸리티
  9️⃣  서버 상태 확인
  🔟  서버 시작 + 성능 분석
  1️⃣1️⃣  도움말 및 가이드 열기

0️⃣  종료

────────────────────────────────────────────────────────────────
"""
    print(menu)

def main():
    """메인 루프"""
    while True:
        print_menu()
        
        try:
            choice = input("선택 (0-11): ").strip()
        except KeyboardInterrupt:
            print("\n\n👋 종료됨")
            sys.exit(0)
        except EOFError:
            # VS Code 내장 터미널에서 Ctrl+D
            print("\n👋 종료됨")
            sys.exit(0)
        
        if choice == "0":
            print("\n👋 종료됨")
            sys.exit(0)
        
        elif choice == "1":
            run_command(
                "python3 performance_dashboard.py --all",
                "[M1+T2+D1] 전체 성능 분석"
            )
        
        elif choice == "2":
            run_command(
                "python3 performance_dashboard.py --dashboard --duration=600",
                "[M1] 실시간 성능 대시보드 (10분)"
            )
        
        elif choice == "3":
            run_command(
                "python3 performance_dashboard.py --cache",
                "[T2] 캐시 검증"
            )
        
        elif choice == "4":
            run_command(
                "python3 performance_dashboard.py --profile",
                "[D1] 프로파일링"
            )
        
        elif choice == "5":
            cmd = (
                "while true; do "
                "clear; "
                "echo '=== 성능 대시보드 ===' && "
                "date && "
                "curl -s http://localhost:8000/monitoring/performance/dashboard 2>/dev/null | python3 -m json.tool || echo '❌ 서버 연결 실패'; "
                "sleep 30; "
                "done"
            )
            run_command(cmd, "실시간 대시보드 (30초 갱신)")
        
        elif choice == "6":
            cmd = (
                "while true; do "
                "clear; "
                "echo '=== 캐시 상태 ===' && "
                "date && "
                "curl -s http://localhost:8000/cache/stats 2>/dev/null | python3 -m json.tool || echo '❌ 서버 연결 실패'; "
                "sleep 10; "
                "done"
            )
            run_command(cmd, "캐시 상태 모니터링 (10초 갱신)")
        
        elif choice == "7":
            cmd = (
                "while true; do "
                "clear; "
                "echo '=== 요청 추적 ===' && "
                "date && "
                "curl -s http://localhost:8000/monitoring/requests/summary 2>/dev/null | python3 -m json.tool || echo '❌ 서버 연결 실패'; "
                "sleep 10; "
                "done"
            )
            run_command(cmd, "요청 추적 모니터링 (10초 갱신)")
        
        elif choice == "8":
            run_command(
                """python3 -c "
import asyncio, httpx, time, statistics

async def benchmark():
    times = []
    errors = 0
    print('🔄 100개 요청 전송 중...')
    async with httpx.AsyncClient(timeout=30) as client:
        for i in range(100):
            try:
                start = time.time()
                r = await client.get('http://localhost:8000/devices')
                times.append((time.time() - start) * 1000)
                print(f'\\r진행: {i+1}/100', end='', flush=True)
            except Exception as e:
                errors += 1
    
    if not times:
        print('\\n❌ 모든 요청 실패')
        return
    
    times.sort()
    print(f'\\n\\n📊 부하 테스트 결과 (100 요청)')
    print(f'  ├─ 성공: {len(times)}, 실패: {errors}')
    print(f'  ├─ 평균: {statistics.mean(times):.2f}ms')
    print(f'  ├─ 중앙값(P50): {statistics.median(times):.2f}ms')
    print(f'  ├─ P95: {times[int(len(times)*0.95)]:.2f}ms')
    print(f'  ├─ P99: {times[int(len(times)*0.99)]:.2f}ms')
    print(f'  └─ 범위: {min(times):.2f}ms ~ {max(times):.2f}ms')

asyncio.run(benchmark())
\"",
                "부하 테스트 (100 요청)"
            )
        
        elif choice == "9":
            print("\n🔍 서버 상태 확인...\n")
            run_command("curl -s http://localhost:8000/health | python3 -m json.tool || echo '❌ 서버 연결 실패'")
            run_command("curl -s http://localhost:8000/cache/stats | python3 -m json.tool || echo '❌ 캐시 연결 실패'")
        
        elif choice == "10":
            print("\n🚀 서버 시작 중...")
            print("(이것은 별도의 프로세스에서 실행됩니다)\n")
            
            if platform.system() == "Darwin":  # macOS
                run_command("open -a Terminal .")
            
            run_command("sleep 3 && python3 performance_dashboard.py --all")
        
        elif choice == "11":
            print("\n📖 가이드 열기...\n")
            
            guide_file = Path("PERFORMANCE_ANALYSIS_GUIDE.md")
            if guide_file.exists():
                if platform.system() == "Darwin":  # macOS
                    run_command(f"open {guide_file}")
                elif platform.system() == "Linux":
                    run_command(f"xdg-open {guide_file}")
                elif platform.system() == "Windows":
                    run_command(f"start {guide_file}")
            else:
                print("❌ 가이드 파일을 찾을 수 없습니다: PERFORMANCE_ANALYSIS_GUIDE.md")
        
        else:
            print("❌ 잘못된 선택입니다. 다시 선택하세요.\n")
            continue
        
        # 계속 진행 여부
        try:
            input("\n\n✅ 완료! (엔터를 눌러 계속...)")
        except (KeyboardInterrupt, EOFError):
            print("\n👋 종료됨")
            sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 종료됨")
        sys.exit(0)
