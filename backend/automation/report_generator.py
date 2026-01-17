"""
═══════════════════════════════════════════════════════════════════════════════
📊 AUTUS Report Generator — 일일 보고서 자동 생성
═══════════════════════════════════════════════════════════════════════════════

완료된 작업 목록에서 일일 보고서 자동 생성:
- 카테고리화
- 시간 투자 추정
- 성과 문장 생성

═══════════════════════════════════════════════════════════════════════════════
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date
from enum import Enum
import re
import uuid


class TaskCategory(Enum):
    """작업 카테고리"""
    DEVELOPMENT = "개발"
    MEETING = "미팅/회의"
    DOCUMENT = "문서 작업"
    COMMUNICATION = "커뮤니케이션"
    PLANNING = "기획/계획"
    REVIEW = "검토/리뷰"
    OTHER = "기타"


# 카테고리 키워드
CATEGORY_KEYWORDS = {
    TaskCategory.DEVELOPMENT: [
        '개발', '코딩', '코드', '구현', '버그', '수정', '배포',
        'API', '테스트', '디버깅', 'PR', '커밋'
    ],
    TaskCategory.MEETING: [
        '미팅', '회의', '미팅', '콜', '화상', '줌', '스크럼',
        '싱크', '브리핑', '논의'
    ],
    TaskCategory.DOCUMENT: [
        '문서', '작성', '보고서', '제안서', '기획서', '정리',
        '스펙', '명세', '매뉴얼', 'PPT', '슬라이드'
    ],
    TaskCategory.COMMUNICATION: [
        '이메일', '메일', '슬랙', '답변', '연락', '전화',
        '공유', '전달', '알림'
    ],
    TaskCategory.PLANNING: [
        '기획', '계획', '설계', '아이디어', '브레인스토밍',
        '로드맵', '전략', '분석'
    ],
    TaskCategory.REVIEW: [
        '검토', '리뷰', '확인', '승인', '피드백', '코드리뷰',
        'QA', '테스트', '점검'
    ],
}

# 시간 추정 키워드
TIME_ESTIMATE_KEYWORDS = {
    # 짧은 작업 (30분 이하)
    '확인': 0.5, '답변': 0.5, '공유': 0.25, '전달': 0.25,
    '알림': 0.25, '체크': 0.5,
    # 중간 작업 (1~2시간)
    '미팅': 1.0, '회의': 1.0, '정리': 1.0, '검토': 1.5,
    '리뷰': 1.0, '분석': 1.5,
    # 긴 작업 (2시간 이상)
    '개발': 2.5, '구현': 3.0, '작성': 2.0, '기획': 2.5,
    '설계': 2.0, '제안서': 3.0, '보고서': 2.0,
}


@dataclass
class CompletedTask:
    """완료된 작업"""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    content: str = ""
    category: TaskCategory = TaskCategory.OTHER
    estimated_hours: float = 1.0
    v_contribution: float = 1.0
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content": self.content,
            "category": self.category.value,
            "estimated_hours": round(self.estimated_hours, 1),
            "v_contribution": round(self.v_contribution, 2)
        }


@dataclass
class DailyReport:
    """일일 보고서"""
    report_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    date: date = field(default_factory=date.today)
    completed_tasks: List[CompletedTask] = field(default_factory=list)
    tomorrow_plan: List[str] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)
    total_hours: float = 0.0
    v_total: float = 0.0
    report_text: str = ""
    
    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "date": self.date.isoformat(),
            "completed_tasks": [t.to_dict() for t in self.completed_tasks],
            "tomorrow_plan": self.tomorrow_plan,
            "issues": self.issues,
            "total_hours": round(self.total_hours, 1),
            "v_total": round(self.v_total, 2),
            "report_text": self.report_text
        }


class ReportGenerator:
    """
    일일 보고서 생성 엔진
    
    1. 완료 작업 카테고리화
    2. 시간 투자 추정
    3. V 기여도 계산 (숨김)
    4. 보고서 텍스트 생성
    """
    
    def __init__(self, default_s: float = 0.2):
        self.default_s = default_s
    
    def categorize_task(self, task: str) -> TaskCategory:
        """작업 카테고리 분류"""
        task_lower = task.lower()
        
        for category, keywords in CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in task_lower:
                    return category
        
        return TaskCategory.OTHER
    
    def estimate_time(self, task: str) -> float:
        """시간 추정 (시간 단위)"""
        task_lower = task.lower()
        max_time = 1.0  # 기본 1시간
        
        for keyword, hours in TIME_ESTIMATE_KEYWORDS.items():
            if keyword.lower() in task_lower:
                max_time = max(max_time, hours)
        
        # 명시적 시간 표기 확인
        time_match = re.search(r'(\d+(?:\.\d+)?)\s*(시간|h|hr)', task_lower)
        if time_match:
            max_time = float(time_match.group(1))
        
        return max_time
    
    def calculate_v_contribution(self, task: str, category: TaskCategory) -> float:
        """V 기여도 계산 (숨김)"""
        base = 1.0
        
        # 카테고리별 가중치
        category_weights = {
            TaskCategory.DEVELOPMENT: 2.0,
            TaskCategory.PLANNING: 1.8,
            TaskCategory.DOCUMENT: 1.5,
            TaskCategory.REVIEW: 1.3,
            TaskCategory.MEETING: 1.2,
            TaskCategory.COMMUNICATION: 1.0,
            TaskCategory.OTHER: 0.8,
        }
        
        base *= category_weights.get(category, 1.0)
        
        # 키워드 가중치
        impact_keywords = {
            '완료': 1.5, '제출': 1.5, '배포': 2.0,
            '승인': 1.8, '클라이언트': 2.0, '프로젝트': 1.5,
        }
        
        for keyword, weight in impact_keywords.items():
            if keyword in task:
                base *= weight
        
        return base * (1 + self.default_s)
    
    def generate(
        self,
        completed: List[str],
        tomorrow: List[str] = None,
        issues: List[str] = None
    ) -> DailyReport:
        """
        일일 보고서 생성
        
        Args:
            completed: 완료된 작업 목록
            tomorrow: 내일 계획 (선택)
            issues: 이슈 사항 (선택)
        
        Returns:
            DailyReport
        """
        completed_tasks = []
        total_hours = 0.0
        v_total = 0.0
        
        for task_text in completed:
            if not task_text.strip():
                continue
            
            category = self.categorize_task(task_text)
            hours = self.estimate_time(task_text)
            v_contrib = self.calculate_v_contribution(task_text, category)
            
            task = CompletedTask(
                content=task_text.strip(),
                category=category,
                estimated_hours=hours,
                v_contribution=v_contrib
            )
            completed_tasks.append(task)
            total_hours += hours
            v_total += v_contrib
        
        # 보고서 텍스트 생성
        report_text = self._generate_report_text(
            completed_tasks,
            tomorrow or [],
            issues or [],
            total_hours
        )
        
        return DailyReport(
            completed_tasks=completed_tasks,
            tomorrow_plan=tomorrow or [],
            issues=issues or [],
            total_hours=total_hours,
            v_total=v_total,
            report_text=report_text
        )
    
    def _generate_report_text(
        self,
        completed: List[CompletedTask],
        tomorrow: List[str],
        issues: List[str],
        total_hours: float
    ) -> str:
        """보고서 텍스트 생성"""
        today = date.today()
        lines = [
            f"📊 {today.year}.{today.month:02d}.{today.day:02d} 일일 보고서",
            "",
            "▸ 오늘 완료"
        ]
        
        # 카테고리별 그룹화
        by_category: Dict[TaskCategory, List[CompletedTask]] = {}
        for task in completed:
            if task.category not in by_category:
                by_category[task.category] = []
            by_category[task.category].append(task)
        
        for category, tasks in by_category.items():
            for task in tasks:
                hours_str = f"({task.estimated_hours}h)" if task.estimated_hours else ""
                lines.append(f"  • {task.content} {hours_str}")
        
        lines.append(f"\n  총 {total_hours:.1f}시간 투자")
        
        # 내일 계획
        if tomorrow:
            lines.append("\n▸ 내일 계획")
            for item in tomorrow:
                lines.append(f"  • {item}")
        
        # 이슈
        if issues:
            lines.append("\n▸ 이슈")
            for issue in issues:
                lines.append(f"  • {issue}")
        else:
            lines.append("\n▸ 이슈")
            lines.append("  • 없음")
        
        return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

_generator: Optional[ReportGenerator] = None


def get_generator() -> ReportGenerator:
    """싱글톤"""
    global _generator
    if _generator is None:
        _generator = ReportGenerator()
    return _generator


def generate_daily_report(
    completed: List[str],
    tomorrow: List[str] = None,
    issues: List[str] = None
) -> Dict:
    """
    일일 보고서 생성 (편의 함수)
    
    Example:
        result = generate_daily_report(
            completed=[
                "프로젝트 제안서 초안 완성",
                "클라이언트 피드백 반영",
                "팀 미팅 참석 및 정리"
            ],
            tomorrow=[
                "제안서 최종 검토 및 제출",
                "디자인팀 협업 미팅"
            ]
        )
    """
    generator = get_generator()
    result = generator.generate(completed, tomorrow, issues)
    return result.to_dict()


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    test_completed = [
        "프로젝트 제안서 초안 완성 (3시간)",
        "클라이언트 피드백 반영",
        "팀 미팅 참석 및 정리",
        "이메일 답변 10건",
        "코드 리뷰 진행",
        "버그 수정 및 배포"
    ]
    
    test_tomorrow = [
        "제안서 최종 검토 및 제출",
        "디자인팀 협업 미팅"
    ]
    
    result = generate_daily_report(test_completed, test_tomorrow)
    
    print("═" * 60)
    print("  📊 AUTUS Report Generator Test")
    print("═" * 60)
    print()
    print(result['report_text'])
    print()
    print("─" * 60)
    print(f"  총 투자 시간: {result['total_hours']}시간")
    print(f"  V 기여도: {result['v_total']}")
