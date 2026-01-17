"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 1,000 Task Generator
30개 모듈 × 파라미터 조합 → 1,000개 업무 자동 생성

구조:
  Layer 1: 30개 원자 모듈 (modules_30.py)
  Layer 2: 570개 업무 정의 (task_definitions_570.py)
  Layer 3: 1,000개 인스턴스 (이 파일) - 실제 실행 가능한 업무
═══════════════════════════════════════════════════════════════════════════════
"""

import json
import random
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field, asdict
from itertools import product
import uuid

# ═══════════════════════════════════════════════════════════════════════════════
# 상수 정의
# ═══════════════════════════════════════════════════════════════════════════════

class TaskPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskFrequency(str, Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    ON_DEMAND = "on_demand"

# ═══════════════════════════════════════════════════════════════════════════════
# 30개 업무 도메인 (MECE)
# ═══════════════════════════════════════════════════════════════════════════════

TASK_DOMAINS = {
    # 재무/회계 (5개)
    "FIN": {"name": "Finance", "name_ko": "재무", "color": "#10B981"},
    "ACC": {"name": "Accounting", "name_ko": "회계", "color": "#059669"},
    "TAX": {"name": "Tax", "name_ko": "세무", "color": "#047857"},
    "TRS": {"name": "Treasury", "name_ko": "자금", "color": "#065F46"},
    "AUD": {"name": "Audit", "name_ko": "감사", "color": "#064E3B"},
    
    # HR/인사 (5개)
    "HRM": {"name": "HR Management", "name_ko": "인사관리", "color": "#8B5CF6"},
    "REC": {"name": "Recruitment", "name_ko": "채용", "color": "#7C3AED"},
    "PAY": {"name": "Payroll", "name_ko": "급여", "color": "#6D28D9"},
    "TRN": {"name": "Training", "name_ko": "교육", "color": "#5B21B6"},
    "PER": {"name": "Performance", "name_ko": "성과관리", "color": "#4C1D95"},
    
    # 영업/마케팅 (5개)
    "SAL": {"name": "Sales", "name_ko": "영업", "color": "#F59E0B"},
    "MKT": {"name": "Marketing", "name_ko": "마케팅", "color": "#D97706"},
    "CRM": {"name": "CRM", "name_ko": "고객관리", "color": "#B45309"},
    "SVC": {"name": "Service", "name_ko": "고객서비스", "color": "#92400E"},
    "PRD": {"name": "Product", "name_ko": "제품관리", "color": "#78350F"},
    
    # IT/운영 (5개)
    "ITS": {"name": "IT Support", "name_ko": "IT지원", "color": "#3B82F6"},
    "INF": {"name": "Infrastructure", "name_ko": "인프라", "color": "#2563EB"},
    "SEC": {"name": "Security", "name_ko": "보안", "color": "#1D4ED8"},
    "DEV": {"name": "Development", "name_ko": "개발", "color": "#1E40AF"},
    "OPS": {"name": "Operations", "name_ko": "운영", "color": "#1E3A8A"},
    
    # 문서/데이터 (5개)
    "DOC": {"name": "Document", "name_ko": "문서관리", "color": "#EC4899"},
    "DAT": {"name": "Data", "name_ko": "데이터", "color": "#DB2777"},
    "RPT": {"name": "Reporting", "name_ko": "보고서", "color": "#BE185D"},
    "ANA": {"name": "Analytics", "name_ko": "분석", "color": "#9D174D"},
    "ARC": {"name": "Archive", "name_ko": "아카이브", "color": "#831843"},
    
    # 법무/규정 (5개)
    "LEG": {"name": "Legal", "name_ko": "법무", "color": "#EF4444"},
    "COM": {"name": "Compliance", "name_ko": "준법", "color": "#DC2626"},
    "CON": {"name": "Contract", "name_ko": "계약", "color": "#B91C1C"},
    "RIS": {"name": "Risk", "name_ko": "리스크", "color": "#991B1B"},
    "GOV": {"name": "Governance", "name_ko": "거버넌스", "color": "#7F1D1D"},
}

# ═══════════════════════════════════════════════════════════════════════════════
# 업무 파라미터 (조합용)
# ═══════════════════════════════════════════════════════════════════════════════

TASK_PARAMETERS = {
    "departments": [
        "경영지원", "재무", "인사", "영업", "마케팅", "IT", "개발", "운영",
        "법무", "기획", "품질", "구매", "물류", "R&D", "고객서비스"
    ],
    "regions": ["본사", "서울", "부산", "대구", "인천", "광주", "대전", "해외"],
    "currencies": ["KRW", "USD", "EUR", "JPY", "CNY"],
    "amounts": ["소액(~100만)", "중액(100만~1000만)", "대액(1000만~1억)", "거액(1억+)"],
    "urgency": ["긴급(당일)", "단기(1주)", "중기(1개월)", "장기(분기)"],
    "approval_levels": ["팀장", "부장", "이사", "임원", "CEO"],
    "document_types": ["PDF", "Excel", "Word", "이메일", "스캔문서", "웹폼"],
    "systems": ["SAP", "Oracle", "Salesforce", "Workday", "ServiceNow", "자체시스템"],
    "vendors": ["국내대기업", "국내중소", "해외대기업", "해외중소", "스타트업"],
    "frequencies": ["일일", "주간", "월간", "분기", "반기", "연간", "수시"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# Task Instance 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TaskInstance:
    """실행 가능한 업무 인스턴스"""
    id: str
    task_id: str  # 570개 정의 중 원본 ID
    name: str
    name_ko: str
    domain: str
    
    # 파라미터
    department: str
    region: str
    priority: TaskPriority
    frequency: TaskFrequency
    
    # 모듈 체인
    modules: List[str]
    
    # 물리 상수
    k_value: float  # 자동화 가능도
    i_value: float  # 인간 개입 필요도
    r_value: float  # 리스크 레벨
    
    # 메타데이터
    estimated_minutes: int
    automation_rate: float  # 0.0 ~ 1.0
    
    # 상태
    status: TaskStatus = TaskStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            "priority": self.priority.value,
            "frequency": self.frequency.value,
            "status": self.status.value,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 1,000 Task Generator
# ═══════════════════════════════════════════════════════════════════════════════

class TaskGenerator1000:
    """30개 모듈 × 파라미터 조합 → 1,000개 업무 생성"""
    
    def __init__(self):
        self.tasks: List[TaskInstance] = []
        self._seed_random()
    
    def _seed_random(self, seed: int = 42):
        """재현 가능한 랜덤 시드"""
        random.seed(seed)
    
    def _generate_id(self, domain: str, index: int) -> str:
        """고유 ID 생성"""
        return f"{domain}_{index:04d}"
    
    def _compute_physics(self, modules: List[str]) -> Tuple[float, float, float]:
        """K/I/R 물리 상수 계산"""
        # 모듈 수에 따른 기본값
        n = len(modules)
        
        # K: 모듈이 많을수록 자동화 복잡도 증가
        k = round(1.0 - (n - 2) * 0.05, 2)
        k = max(0.5, min(1.2, k))
        
        # I: 모듈이 많을수록 인간 개입 필요
        i = round(0.1 + (n - 2) * 0.08, 2)
        i = max(0.0, min(0.5, i))
        
        # R: 랜덤 리스크 (0.1 ~ 0.4)
        r = round(random.uniform(0.1, 0.4), 2)
        
        return k, i, r
    
    def _select_modules(self, domain: str, complexity: int) -> List[str]:
        """도메인에 맞는 모듈 체인 선택"""
        # 기본 모듈 패턴 (30개 원자 모듈 기반)
        module_patterns = {
            "FIN": ["IN_API", "PR_VALIDATE", "PR_CALCULATE", "DE_THRESHOLD", "OUT_REPORT"],
            "ACC": ["IN_FILE", "PR_PARSE", "PR_VALIDATE", "PR_CALCULATE", "OUT_DATA", "CM_STORE"],
            "TAX": ["IN_API", "PR_CALCULATE", "DE_RULE", "OUT_REPORT", "CM_STORE"],
            "TRS": ["IN_API", "PR_AGGREGATE", "PR_CALCULATE", "DE_THRESHOLD", "CM_API"],
            "AUD": ["IN_SCHEDULE", "PR_AGGREGATE", "DE_RULE", "OUT_REPORT", "OUT_LOG"],
            "HRM": ["IN_FORM", "PR_VALIDATE", "DE_RULE", "DE_APPROVE", "CM_NOTIFY"],
            "REC": ["IN_FILE", "PR_PARSE", "PR_EXTRACT", "DE_MATCH", "OUT_DATA"],
            "PAY": ["IN_SCHEDULE", "PR_AGGREGATE", "PR_CALCULATE", "PR_VALIDATE", "CM_STORE"],
            "TRN": ["IN_FORM", "PR_VALIDATE", "DE_APPROVE", "CM_NOTIFY", "OUT_LOG"],
            "PER": ["IN_FORM", "PR_VALIDATE", "PR_AGGREGATE", "DE_APPROVE", "OUT_REPORT"],
            "SAL": ["IN_FORM", "PR_VALIDATE", "PR_CALCULATE", "OUT_DOC", "CM_EMAIL"],
            "MKT": ["IN_API", "PR_AGGREGATE", "PR_CALCULATE", "OUT_VISUAL", "CM_NOTIFY"],
            "CRM": ["IN_API", "PR_TRANSFORM", "DE_MATCH", "CM_STORE", "CM_NOTIFY"],
            "SVC": ["IN_FORM", "PR_PARSE", "DE_MATCH", "CM_NOTIFY", "OUT_LOG"],
            "PRD": ["IN_API", "PR_AGGREGATE", "PR_CALCULATE", "OUT_VISUAL", "OUT_REPORT"],
            "ITS": ["IN_FORM", "PR_PARSE", "DE_MATCH", "CM_NOTIFY"],
            "INF": ["IN_STREAM", "PR_FILTER", "DE_THRESHOLD", "CM_NOTIFY", "OUT_LOG"],
            "SEC": ["IN_STREAM", "PR_FILTER", "DE_RULE", "CM_ESCALATE", "OUT_LOG"],
            "DEV": ["IN_API", "PR_VALIDATE", "DE_RULE", "CM_API", "OUT_LOG"],
            "OPS": ["IN_API", "PR_VALIDATE", "PR_TRANSFORM", "CM_API", "CM_NOTIFY"],
            "DOC": ["IN_FILE", "PR_PARSE", "PR_EXTRACT", "CM_STORE"],
            "DAT": ["IN_API", "PR_TRANSFORM", "PR_VALIDATE", "CM_STORE"],
            "RPT": ["IN_SCHEDULE", "PR_AGGREGATE", "PR_CALCULATE", "OUT_VISUAL", "OUT_REPORT"],
            "ANA": ["IN_API", "PR_AGGREGATE", "PR_CALCULATE", "OUT_VISUAL"],
            "ARC": ["IN_SCHEDULE", "PR_FILTER", "CM_STORE", "OUT_LOG"],
            "LEG": ["IN_FILE", "PR_PARSE", "PR_EXTRACT", "DE_RULE", "OUT_REPORT"],
            "COM": ["IN_SCHEDULE", "PR_VALIDATE", "DE_RULE", "OUT_REPORT", "CM_NOTIFY"],
            "CON": ["IN_FILE", "PR_PARSE", "PR_VALIDATE", "DE_APPROVE", "CM_STORE"],
            "RIS": ["IN_API", "PR_CALCULATE", "DE_THRESHOLD", "CM_ESCALATE", "OUT_REPORT"],
            "GOV": ["IN_SCHEDULE", "DE_RULE", "OUT_REPORT", "OUT_LOG", "CM_NOTIFY"],
        }
        
        base = module_patterns.get(domain, ["IN_API", "PR_VALIDATE", "OUT_DATA"])
        
        # 복잡도에 따라 모듈 수 조정
        if complexity <= 2:
            return base[:3]
        elif complexity <= 4:
            return base[:4]
        else:
            return base
    
    def generate_tasks(self, count: int = 1000) -> List[TaskInstance]:
        """1,000개 업무 생성"""
        self.tasks = []
        
        # 각 도메인에서 균등하게 생성 (30개 도메인 × ~34개 = 1020개)
        tasks_per_domain = count // len(TASK_DOMAINS) + 1
        
        task_index = 0
        
        for domain_code, domain_info in TASK_DOMAINS.items():
            for i in range(tasks_per_domain):
                if task_index >= count:
                    break
                
                # 파라미터 랜덤 선택
                dept = random.choice(TASK_PARAMETERS["departments"])
                region = random.choice(TASK_PARAMETERS["regions"])
                freq = random.choice(list(TaskFrequency))
                priority = random.choice(list(TaskPriority))
                
                # 복잡도 (1-5)
                complexity = random.randint(1, 5)
                
                # 모듈 체인 선택
                modules = self._select_modules(domain_code, complexity)
                
                # 물리 상수 계산
                k, i_val, r = self._compute_physics(modules)
                
                # 예상 시간 (분)
                estimated_minutes = random.randint(5, 480)  # 5분 ~ 8시간
                
                # 자동화율
                automation_rate = round(random.uniform(0.3, 0.95), 2)
                
                # 업무명 생성
                task_name_templates = [
                    f"{domain_info['name_ko']} 처리 #{i+1}",
                    f"{dept} {domain_info['name_ko']} 업무",
                    f"{region} {domain_info['name_ko']} 작업",
                    f"[{freq.value}] {domain_info['name_ko']} 태스크",
                ]
                
                task = TaskInstance(
                    id=self._generate_id(domain_code, i + 1),
                    task_id=f"TEMPLATE_{domain_code}_{i % 20 + 1:03d}",
                    name=f"{domain_info['name']} Task #{i+1}",
                    name_ko=random.choice(task_name_templates),
                    domain=domain_code,
                    department=dept,
                    region=region,
                    priority=priority,
                    frequency=freq,
                    modules=modules,
                    k_value=k,
                    i_value=i_val,
                    r_value=r,
                    estimated_minutes=estimated_minutes,
                    automation_rate=automation_rate,
                )
                
                self.tasks.append(task)
                task_index += 1
        
        return self.tasks[:count]
    
    def get_tasks_by_domain(self, domain: str) -> List[TaskInstance]:
        """도메인별 업무 조회"""
        return [t for t in self.tasks if t.domain == domain]
    
    def get_tasks_by_department(self, department: str) -> List[TaskInstance]:
        """부서별 업무 조회"""
        return [t for t in self.tasks if t.department == department]
    
    def get_tasks_by_priority(self, priority: TaskPriority) -> List[TaskInstance]:
        """우선순위별 업무 조회"""
        return [t for t in self.tasks if t.priority == priority]
    
    def get_high_automation_tasks(self, threshold: float = 0.8) -> List[TaskInstance]:
        """고자동화 업무 조회"""
        return [t for t in self.tasks if t.automation_rate >= threshold]
    
    def get_summary(self) -> Dict[str, Any]:
        """생성 결과 요약"""
        if not self.tasks:
            return {"error": "No tasks generated"}
        
        # 도메인별 집계
        by_domain = {}
        for domain in TASK_DOMAINS:
            by_domain[domain] = len([t for t in self.tasks if t.domain == domain])
        
        # 우선순위별 집계
        by_priority = {}
        for p in TaskPriority:
            by_priority[p.value] = len([t for t in self.tasks if t.priority == p])
        
        # 평균 물리 상수
        avg_k = sum(t.k_value for t in self.tasks) / len(self.tasks)
        avg_i = sum(t.i_value for t in self.tasks) / len(self.tasks)
        avg_r = sum(t.r_value for t in self.tasks) / len(self.tasks)
        avg_automation = sum(t.automation_rate for t in self.tasks) / len(self.tasks)
        
        return {
            "total_tasks": len(self.tasks),
            "domains": 30,
            "by_domain": by_domain,
            "by_priority": by_priority,
            "avg_physics": {
                "K": round(avg_k, 2),
                "I": round(avg_i, 2),
                "R": round(avg_r, 2),
            },
            "avg_automation_rate": round(avg_automation, 2),
            "avg_estimated_minutes": round(sum(t.estimated_minutes for t in self.tasks) / len(self.tasks)),
        }
    
    def to_supabase_format(self) -> List[Dict[str, Any]]:
        """Supabase 저장용 포맷 변환 (UUID 자동 생성)"""
        return [
            {
                # id는 Supabase가 자동 UUID 생성
                "title": task.name_ko,
                "source": f"AUTUS-{task.domain}",
                "status": "captured",
                "data": {
                    "task_code": task.id,  # 원래 ID를 task_code로 저장
                    "task_id": task.task_id,
                    "domain": task.domain,
                    "department": task.department,
                    "region": task.region,
                    "priority": task.priority.value,
                    "frequency": task.frequency.value,
                    "modules": task.modules,
                    "k_value": task.k_value,
                    "i_value": task.i_value,
                    "r_value": task.r_value,
                    "estimated_minutes": task.estimated_minutes,
                    "automation_rate": task.automation_rate,
                }
            }
            for task in self.tasks
        ]
    
    def export_json(self, filepath: str = None) -> str:
        """JSON 파일로 내보내기"""
        data = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_tasks": len(self.tasks),
                "domains": 30,
                "version": "1.0",
            },
            "summary": self.get_summary(),
            "tasks": [t.to_dict() for t in self.tasks],
        }
        
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        
        if filepath:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(json_str)
        
        return json_str


# ═══════════════════════════════════════════════════════════════════════════════
# 전역 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════

_generator: Optional[TaskGenerator1000] = None

def get_task_generator() -> TaskGenerator1000:
    """싱글톤 TaskGenerator 반환"""
    global _generator
    if _generator is None:
        _generator = TaskGenerator1000()
        _generator.generate_tasks(1000)
    return _generator


def generate_1000_tasks() -> List[TaskInstance]:
    """1,000개 업무 생성"""
    generator = TaskGenerator1000()
    return generator.generate_tasks(1000)


def get_task_summary() -> Dict[str, Any]:
    """생성된 업무 요약"""
    return get_task_generator().get_summary()


# ═══════════════════════════════════════════════════════════════════════════════
# CLI 실행
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("🚀 AUTUS 1,000 Task Generator")
    print("=" * 70)
    
    generator = TaskGenerator1000()
    tasks = generator.generate_tasks(1000)
    
    summary = generator.get_summary()
    
    print(f"\n✅ 생성 완료: {summary['total_tasks']}개 업무")
    print(f"\n📊 도메인: {summary['domains']}개")
    
    print("\n📈 우선순위별:")
    for p, count in summary["by_priority"].items():
        print(f"  {p}: {count}개")
    
    print(f"\n⚙️ 평균 물리 상수:")
    print(f"  K (자동화): {summary['avg_physics']['K']}")
    print(f"  I (인간개입): {summary['avg_physics']['I']}")
    print(f"  R (리스크): {summary['avg_physics']['R']}")
    
    print(f"\n🤖 평균 자동화율: {summary['avg_automation_rate'] * 100:.0f}%")
    print(f"⏱️ 평균 예상 시간: {summary['avg_estimated_minutes']}분")
    
    # 샘플 출력
    print("\n📋 샘플 업무 (처음 5개):")
    for task in tasks[:5]:
        print(f"  [{task.id}] {task.name_ko}")
        print(f"      모듈: {' → '.join(task.modules)}")
        print(f"      K={task.k_value}, I={task.i_value}, 자동화={task.automation_rate*100:.0f}%")
