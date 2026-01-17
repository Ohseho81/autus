#!/usr/bin/env python3
"""
AUTUS 월 1회 최신화 CLI
========================

사용법:
    # 전체 업데이트 (dry-run)
    python scripts/monthly_update.py --dry-run
    
    # 실제 업데이트 실행
    python scripts/monthly_update.py --execute
    
    # 특정 패키지만 업데이트
    python scripts/monthly_update.py --packages langgraph,langchain
    
    # 상태 확인
    python scripts/monthly_update.py --status

크론탭 설정 (매월 1일 00:00):
    0 0 1 * * cd /path/to/autus && .venv/bin/python scripts/monthly_update.py --execute >> logs/monthly_update.log 2>&1
"""

import os
import sys
import argparse
import json
from datetime import datetime
from pathlib import Path

# 프로젝트 루트를 path에 추가
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))


def main():
    parser = argparse.ArgumentParser(description="AUTUS 월 1회 최신화")
    parser.add_argument("--dry-run", action="store_true", help="시뮬레이션 모드 (실제 업데이트 안함)")
    parser.add_argument("--execute", action="store_true", help="실제 업데이트 실행")
    parser.add_argument("--packages", type=str, help="특정 패키지만 (콤마 구분)")
    parser.add_argument("--status", action="store_true", help="현재 패키지 상태 확인")
    parser.add_argument("--rollback", type=str, help="특정 패키지 롤백")
    parser.add_argument("--report", action="store_true", help="마지막 업데이트 리포트")
    parser.add_argument("--slack", action="store_true", help="Slack 알림 전송")
    parser.add_argument("-v", "--verbose", action="store_true", help="상세 출력")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🔄 AUTUS 월 1회 최신화")
    print(f"   시간: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # 상태 확인
    if args.status:
        show_status()
        return
    
    # 리포트
    if args.report:
        show_report()
        return
    
    # 롤백
    if args.rollback:
        rollback_package(args.rollback)
        return
    
    # 업데이트 실행
    dry_run = not args.execute
    packages = args.packages.split(",") if args.packages else None
    
    result = run_update(
        dry_run=dry_run,
        packages=packages,
        verbose=args.verbose,
        notify_slack=args.slack,
    )
    
    # 결과 출력
    print("\n" + "=" * 60)
    print(f"📊 결과: {result['status']}")
    print(f"   검사: {len(result['checked'])}개")
    print(f"   업데이트: {len(result['updated'])}개")
    print(f"   실패: {len(result['failed'])}개")
    print("=" * 60)
    
    # 리포트 저장
    save_report(result)
    
    return 0 if result['status'] == 'success' else 1


def show_status():
    """현재 패키지 상태"""
    try:
        from langgraph.monthly_update import MANAGED_PACKAGES, MonthlyUpdateCrew
        
        agent = MonthlyUpdateCrew()
        
        print("\n📦 관리 대상 패키지:")
        print("-" * 60)
        
        for pkg in MANAGED_PACKAGES:
            current = agent._get_installed_version(pkg.name)
            latest = agent._get_latest_version(pkg.name)
            status = "✅" if current == latest else "🔄"
            
            print(f"  {status} {pkg.name}")
            print(f"     현재: {current or 'N/A'}")
            print(f"     최신: {latest or 'N/A'}")
            print()
            
    except ImportError as e:
        print(f"⚠️ 모듈 로드 실패: {e}")
        print("\n📦 기본 패키지 목록:")
        packages = [
            "langgraph", "langchain", "langchain-openai",
            "crewai", "openai", "anthropic",
            "pinecone-client", "neo4j", "pytorch-forecasting"
        ]
        for pkg in packages:
            print(f"  - {pkg}")


def show_report():
    """마지막 업데이트 리포트"""
    report_path = PROJECT_ROOT / "logs" / "monthly_update_report.json"
    
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
        
        print("\n📋 마지막 업데이트 리포트")
        print("-" * 60)
        print(f"  시간: {report.get('timestamp', 'N/A')}")
        print(f"  상태: {report.get('status', 'N/A')}")
        print(f"  검사: {len(report.get('checked', []))}개")
        print(f"  업데이트: {len(report.get('updated', []))}개")
        print(f"  실패: {len(report.get('failed', []))}개")
        
        if report.get('updated'):
            print("\n  업데이트된 패키지:")
            for pkg in report['updated']:
                print(f"    - {pkg}")
    else:
        print("⚠️ 리포트 파일이 없습니다.")


def rollback_package(package: str):
    """패키지 롤백"""
    print(f"\n🔙 {package} 롤백 중...")
    
    try:
        from langgraph.auto_rollback import AutoRollbackEngine
        
        engine = AutoRollbackEngine()
        result = engine.rollback_package(package)
        
        if result:
            print(f"✅ {package} 롤백 완료")
        else:
            print(f"❌ {package} 롤백 실패")
            
    except Exception as e:
        print(f"❌ 롤백 오류: {e}")


def run_update(
    dry_run: bool = True,
    packages: list = None,
    verbose: bool = False,
    notify_slack: bool = False,
) -> dict:
    """업데이트 실행"""
    
    result = {
        "status": "pending",
        "timestamp": datetime.now().isoformat(),
        "dry_run": dry_run,
        "checked": [],
        "updated": [],
        "failed": [],
        "errors": [],
    }
    
    try:
        from langgraph.monthly_update import MonthlyUpdateCrew, MANAGED_PACKAGES
        
        agent = MonthlyUpdateCrew()
        
        # 대상 패키지
        target_packages = packages or [p.name for p in MANAGED_PACKAGES]
        
        print(f"\n{'[DRY-RUN] ' if dry_run else ''}업데이트 시작...")
        print(f"대상: {len(target_packages)}개 패키지")
        
        for pkg_name in target_packages:
            if verbose:
                print(f"\n  📦 {pkg_name} 검사 중...")
            
            result["checked"].append(pkg_name)
            
            # 버전 확인
            current = agent._get_installed_version(pkg_name)
            latest = agent._get_latest_version(pkg_name)
            
            if not latest:
                if verbose:
                    print(f"    ⏭️ 버전 정보 없음")
                continue
            
            if current == latest:
                if verbose:
                    print(f"    ✅ 최신 버전 ({current})")
                continue
            
            print(f"\n  🔄 {pkg_name}: {current} → {latest}")
            
            if dry_run:
                print(f"    [DRY-RUN] 업데이트 스킵")
                result["updated"].append(pkg_name)
                continue
            
            # 실제 업데이트
            try:
                success = agent._update_package(pkg_name, latest)
                if success:
                    print(f"    ✅ 업데이트 완료")
                    result["updated"].append(pkg_name)
                else:
                    print(f"    ❌ 업데이트 실패")
                    result["failed"].append(pkg_name)
            except Exception as e:
                print(f"    ❌ 오류: {e}")
                result["failed"].append(pkg_name)
                result["errors"].append(str(e))
        
        result["status"] = "success" if not result["failed"] else "partial"
        
    except ImportError as e:
        print(f"\n⚠️ 모듈 로드 실패: {e}")
        print("pip install 명령으로 시뮬레이션...")
        
        # Fallback: pip 직접 사용
        import subprocess
        
        packages_to_check = packages or [
            "langgraph", "langchain", "crewai", "openai"
        ]
        
        for pkg in packages_to_check:
            result["checked"].append(pkg)
            
            if dry_run:
                print(f"  [DRY-RUN] {pkg} 체크")
                continue
            
            try:
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", "--upgrade", pkg],
                    check=True,
                    capture_output=True
                )
                result["updated"].append(pkg)
                print(f"  ✅ {pkg} 업데이트됨")
            except subprocess.CalledProcessError as e:
                result["failed"].append(pkg)
                print(f"  ❌ {pkg} 실패")
        
        result["status"] = "success" if not result["failed"] else "partial"
    
    # Slack 알림
    if notify_slack:
        send_slack_notification(result)
    
    return result


def save_report(result: dict):
    """리포트 저장"""
    logs_dir = PROJECT_ROOT / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    report_path = logs_dir / "monthly_update_report.json"
    with open(report_path, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n📝 리포트 저장: {report_path}")


def send_slack_notification(result: dict):
    """Slack 알림 전송"""
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    
    if not webhook_url:
        print("⚠️ SLACK_WEBHOOK_URL 미설정")
        return
    
    try:
        import urllib.request
        import json
        
        status_emoji = "✅" if result["status"] == "success" else "⚠️"
        
        message = {
            "text": f"{status_emoji} AUTUS 월별 업데이트 완료",
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": f"{status_emoji} AUTUS 월별 업데이트"}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*상태:* {result['status']}"},
                        {"type": "mrkdwn", "text": f"*시간:* {result['timestamp']}"},
                        {"type": "mrkdwn", "text": f"*검사:* {len(result['checked'])}개"},
                        {"type": "mrkdwn", "text": f"*업데이트:* {len(result['updated'])}개"},
                    ]
                }
            ]
        }
        
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(message).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req)
        print("📨 Slack 알림 전송 완료")
        
    except Exception as e:
        print(f"⚠️ Slack 알림 실패: {e}")


if __name__ == "__main__":
    sys.exit(main())
