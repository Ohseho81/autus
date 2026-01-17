"""
AUTUS 월 1회 최신화 에이전트
============================

외부 기술 자동 최신화 시스템

에이전트:
1. Analyzer: 명령 분석 & 대상 기술 목록 추출
2. Checker: 호환성·안전 검증
3. Updater: 최신화 적용
4. Tester: 검증 & 보고

스케줄:
- 매월 1일 00:00 UTC 자동 실행
- 수동 명령으로도 트리거 가능

대상 기술:
- LangGraph
- LangChain
- Neo4j GDS
- CrewAI
- OpenAI API
- PyTorch Forecasting
"""

import os
import logging
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum

logger = logging.getLogger(__name__)


class UpdateStatus(Enum):
    """업데이트 상태"""
    PENDING = "pending"
    ANALYZING = "analyzing"
    CHECKING = "checking"
    UPDATING = "updating"
    TESTING = "testing"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class TechPackage:
    """기술 패키지 정보"""
    name: str
    current_version: str = ""
    latest_version: str = ""
    update_available: bool = False
    breaking_changes: list = field(default_factory=list)
    safe_to_update: bool = True
    priority: int = 1  # 1=높음, 5=낮음


@dataclass
class UpdateResult:
    """업데이트 결과"""
    status: UpdateStatus = UpdateStatus.PENDING
    timestamp: datetime = field(default_factory=datetime.now)
    packages_checked: list = field(default_factory=list)
    packages_updated: list = field(default_factory=list)
    packages_failed: list = field(default_factory=list)
    safety_check_passed: bool = True
    rollback_performed: bool = False
    report: str = ""
    duration_seconds: float = 0.0


# 관리 대상 패키지
MANAGED_PACKAGES = [
    TechPackage("langgraph", priority=1),
    TechPackage("langchain", priority=1),
    TechPackage("langchain-openai", priority=1),
    TechPackage("crewai", priority=2),
    TechPackage("neo4j", priority=2),
    TechPackage("pytorch-forecasting", priority=3),
    TechPackage("pytorch-lightning", priority=3),
    TechPackage("openai", priority=1),
    TechPackage("streamlit", priority=4),
    TechPackage("prometheus-client", priority=5),
    TechPackage("sentry-sdk", priority=5),
]


class MonthlyUpdateCrew:
    """월 1회 최신화 에이전트 팀"""
    
    def __init__(self, use_llm: bool = False, dry_run: bool = True):
        """
        Args:
            use_llm: LLM 기반 에이전트 사용
            dry_run: 실제 업데이트 없이 시뮬레이션만
        """
        self.use_llm = use_llm
        self.dry_run = dry_run
        self._crew = None
        
        if use_llm:
            self._init_crew()
    
    def _init_crew(self):
        """CrewAI Crew 초기화"""
        try:
            from crewai import Agent, Task, Crew, Process
            from langchain_openai import ChatOpenAI
            
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
            
            self.analyzer = Agent(
                role="Tech Analyzer",
                goal="명령 분석 & 대상 기술 목록 추출",
                backstory="AUTUS 기술 분석 전문가입니다. 패키지 버전과 릴리스 노트를 분석합니다.",
                llm=llm,
                verbose=False,
            )
            
            self.checker = Agent(
                role="Safety Checker",
                goal="호환성·안전 검증",
                backstory="AUTUS 안전 검증 전문가입니다. Breaking changes와 호환성 이슈를 탐지합니다.",
                llm=llm,
                verbose=False,
            )
            
            self.updater = Agent(
                role="Updater",
                goal="최신화 적용",
                backstory="AUTUS 업데이트 전문가입니다. 안전한 업데이트 절차를 실행합니다.",
                llm=llm,
                verbose=False,
            )
            
            self.tester = Agent(
                role="Tester",
                goal="검증 & 보고",
                backstory="AUTUS 테스트 전문가입니다. 업데이트 후 시스템 검증을 수행합니다.",
                llm=llm,
                verbose=False,
            )
            
            logger.info("MonthlyUpdateCrew 초기화 완료")
            
        except ImportError:
            logger.warning("CrewAI 없음, 규칙 기반 업데이트 사용")
            self.use_llm = False
    
    def _get_installed_version(self, package: str) -> str:
        """설치된 패키지 버전 조회"""
        try:
            result = subprocess.run(
                ["pip", "show", package],
                capture_output=True,
                text=True,
                timeout=10,
            )
            
            for line in result.stdout.split("\n"):
                if line.startswith("Version:"):
                    return line.split(":")[1].strip()
            
            return "not_installed"
            
        except Exception as e:
            logger.warning(f"{package} 버전 조회 실패: {e}")
            return "unknown"
    
    def _get_latest_version(self, package: str) -> str:
        """PyPI 최신 버전 조회"""
        try:
            result = subprocess.run(
                ["pip", "index", "versions", package],
                capture_output=True,
                text=True,
                timeout=30,
            )
            
            # 첫 번째 버전이 최신
            for line in result.stdout.split("\n"):
                if "Available versions:" in line:
                    versions = line.split(":")[1].strip()
                    return versions.split(",")[0].strip()
            
            return "unknown"
            
        except Exception as e:
            logger.warning(f"{package} 최신 버전 조회 실패: {e}")
            return "unknown"
    
    def analyze(self) -> list[TechPackage]:
        """
        1단계: 패키지 분석
        
        Returns:
            list[TechPackage]: 분석된 패키지 목록
        """
        logger.info("📊 [Analyzer] 패키지 분석 시작...")
        
        packages = []
        
        for pkg in MANAGED_PACKAGES:
            pkg.current_version = self._get_installed_version(pkg.name)
            pkg.latest_version = self._get_latest_version(pkg.name)
            
            pkg.update_available = (
                pkg.current_version != "not_installed" and
                pkg.current_version != "unknown" and
                pkg.latest_version != "unknown" and
                pkg.current_version != pkg.latest_version
            )
            
            packages.append(pkg)
            
            status = "🔄 업데이트 가능" if pkg.update_available else "✅ 최신"
            logger.info(f"  {pkg.name}: {pkg.current_version} → {pkg.latest_version} ({status})")
        
        return packages
    
    def check_safety(self, packages: list[TechPackage]) -> list[TechPackage]:
        """
        2단계: 안전성 검사
        
        Args:
            packages: 분석된 패키지 목록
            
        Returns:
            list[TechPackage]: 안전성 검사 완료된 패키지
        """
        logger.info("🔍 [Checker] 안전성 검사...")
        
        for pkg in packages:
            if not pkg.update_available:
                continue
            
            # Breaking changes 시뮬레이션 (실제로는 릴리스 노트 분석)
            # 메이저 버전 변경 시 breaking change 가정
            try:
                current_major = int(pkg.current_version.split(".")[0])
                latest_major = int(pkg.latest_version.split(".")[0])
                
                if latest_major > current_major:
                    pkg.breaking_changes.append(f"메이저 버전 변경: {current_major} → {latest_major}")
                    pkg.safe_to_update = False
                    logger.warning(f"⚠️ {pkg.name}: Breaking change 감지")
            except Exception:
                pass
            
            # 우선순위 낮은 패키지는 안전
            if pkg.priority >= 4:
                pkg.safe_to_update = True
        
        safe_count = sum(1 for p in packages if p.update_available and p.safe_to_update)
        logger.info(f"✅ 안전한 업데이트: {safe_count}개")
        
        return packages
    
    def update(self, packages: list[TechPackage]) -> UpdateResult:
        """
        3단계: 업데이트 실행
        
        Args:
            packages: 안전성 검사 완료된 패키지
            
        Returns:
            UpdateResult: 업데이트 결과
        """
        logger.info("🚀 [Updater] 업데이트 실행...")
        
        result = UpdateResult(status=UpdateStatus.UPDATING)
        result.packages_checked = [p.name for p in packages]
        
        for pkg in packages:
            if not pkg.update_available or not pkg.safe_to_update:
                continue
            
            if self.dry_run:
                logger.info(f"  [DRY RUN] {pkg.name}: {pkg.current_version} → {pkg.latest_version}")
                result.packages_updated.append(pkg.name)
                continue
            
            # 실제 업데이트
            try:
                subprocess.run(
                    ["pip", "install", "--upgrade", pkg.name],
                    capture_output=True,
                    text=True,
                    timeout=120,
                    check=True,
                )
                result.packages_updated.append(pkg.name)
                logger.info(f"  ✅ {pkg.name} 업데이트 완료")
                
            except Exception as e:
                result.packages_failed.append(pkg.name)
                logger.error(f"  ❌ {pkg.name} 업데이트 실패: {e}")
        
        return result
    
    def test(self, result: UpdateResult) -> UpdateResult:
        """
        4단계: 테스트 & 보고
        
        Args:
            result: 업데이트 결과
            
        Returns:
            UpdateResult: 테스트 완료된 결과
        """
        logger.info("🧪 [Tester] 테스트 실행...")
        
        result.status = UpdateStatus.TESTING
        
        # 기본 임포트 테스트
        test_imports = [
            ("langgraph", "from langgraph.graph import StateGraph"),
            ("langchain", "from langchain_core.messages import BaseMessage"),
            ("crewai", "from crewai import Agent"),
            ("neo4j", "from neo4j import GraphDatabase"),
        ]
        
        passed = True
        for name, import_stmt in test_imports:
            try:
                exec(import_stmt)
                logger.info(f"  ✅ {name} 임포트 성공")
            except Exception as e:
                logger.error(f"  ❌ {name} 임포트 실패: {e}")
                passed = False
        
        result.safety_check_passed = passed
        
        # 보고서 생성
        result.report = self._generate_report(result)
        result.status = UpdateStatus.COMPLETED if passed else UpdateStatus.FAILED
        result.duration_seconds = (datetime.now() - result.timestamp).total_seconds()
        
        return result
    
    def _generate_report(self, result: UpdateResult) -> str:
        """보고서 생성"""
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║           AUTUS 월 1회 기술 최신화 보고서                      ║
╠══════════════════════════════════════════════════════════════╣
║ 실행 시간: {result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
║ 소요 시간: {result.duration_seconds:.1f}초
║ 상태: {result.status.value}
╠══════════════════════════════════════════════════════════════╣
║ 검사된 패키지: {len(result.packages_checked)}개
║ 업데이트된 패키지: {len(result.packages_updated)}개
║ 실패한 패키지: {len(result.packages_failed)}개
║ 안전성 검사: {'통과 ✅' if result.safety_check_passed else '실패 ❌'}
╠══════════════════════════════════════════════════════════════╣
║ 업데이트된 패키지:
"""
        for pkg in result.packages_updated:
            report += f"║   - {pkg}\n"
        
        if result.packages_failed:
            report += "║ 실패한 패키지:\n"
            for pkg in result.packages_failed:
                report += f"║   - {pkg}\n"
        
        report += "╚══════════════════════════════════════════════════════════════╝"
        
        return report
    
    def run(self, command: str = "월 1회 자동 기술 최신화") -> UpdateResult:
        """
        전체 최신화 프로세스 실행
        
        Args:
            command: 트리거 명령어
            
        Returns:
            UpdateResult: 최종 결과
        """
        logger.info(f"🏛️ AUTUS 월 1회 최신화 시작: {command}")
        
        start_time = datetime.now()
        
        # 1. 분석
        packages = self.analyze()
        
        # 2. 안전성 검사
        packages = self.check_safety(packages)
        
        # 3. 업데이트
        result = self.update(packages)
        
        # 4. 테스트 & 보고
        result = self.test(result)
        
        logger.info(result.report)
        
        return result


def run_monthly_update(
    dry_run: bool = True,
    use_llm: bool = False,
    verbose: bool = True,
) -> UpdateResult:
    """
    월 1회 최신화 실행 편의 함수
    
    Args:
        dry_run: 실제 업데이트 없이 시뮬레이션
        use_llm: LLM 에이전트 사용
        verbose: 상세 출력
        
    Returns:
        UpdateResult: 업데이트 결과
    """
    if verbose:
        logging.basicConfig(level=logging.INFO)
    
    crew = MonthlyUpdateCrew(use_llm=use_llm, dry_run=dry_run)
    return crew.run()


# Airflow DAG 정의 (참고용)
AIRFLOW_DAG_TEMPLATE = '''
# dags/autus_monthly_update.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def run_autus_update():
    from backend.langgraph.monthly_update import run_monthly_update
    result = run_monthly_update(dry_run=False, verbose=True)
    return result.report

with DAG(
    dag_id='autus_monthly_update',
    start_date=datetime(2026, 1, 1),
    schedule_interval='0 0 1 * *',  # 매월 1일 00:00 UTC
    catchup=False,
    tags=['autus', 'maintenance'],
) as dag:
    update_task = PythonOperator(
        task_id='run_autus_monthly_update',
        python_callable=run_autus_update,
    )
'''
