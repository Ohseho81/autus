"""
═══════════════════════════════════════════════════════════════════════════════
📋 AUTUS Task Prioritizer — 할 일 우선순위 자동 정렬
═══════════════════════════════════════════════════════════════════════════════

Eisenhower Matrix + V 영향도 기반 우선순위 정렬

Q1: 긴급 + 중요 → 즉시
Q2: 중요 (비긴급) → 계획
Q3: 긴급 (비중요) → 위임
Q4: 비긴급 + 비중요 → 제거

═══════════════════════════════════════════════════════════════════════════════
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
from datetime import datetime, timedelta
import re
import uuid


class Quadrant(Enum):
    """Eisenhower Matrix 사분면"""
    Q1 = "Q1"  # 긴급 + 중요 → 즉시
    Q2 = "Q2"  # 중요 (비긴급) → 계획
    Q3 = "Q3"  # 긴급 (비중요) → 위임
    Q4 = "Q4"  # 비긴급 + 비중요 → 제거


# 긴급 키워드 (한글 + 영어)
URGENT_KEYWORDS = [
    "오늘", "지금", "즉시", "급", "긴급", "ASAP", "urgent",
    "마감", "deadline", "내일", "오전", "오후", "바로",
    "당장", "빨리", "서둘러", "곧", "빠른"
]

# 중요 키워드
IMPORTANT_KEYWORDS = [
    "중요", "핵심", "필수", "반드시", "꼭", "critical",
    "제출", "발표", "보고", "미팅", "회의", "클라이언트",
    "대표", "팀장", "부장", "사장", "임원", "고객",
    "프로젝트", "계약", "결제", "승인", "검토"
]

# V 영향 가중치 키워드
V_IMPACT_KEYWORDS = {
    "프로젝트": 3.0,
    "계약": 4.0,
    "클라이언트": 3.5,
    "팀": 2.0,
    "보고서": 1.5,
    "미팅": 2.0,
    "발표": 3.0,
    "제안서": 3.5,
    "결제": 2.5,
    "협업": 2.0,
}


@dataclass
class Task:
    """할 일 항목"""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    content: str = ""
    quadrant: Quadrant = Quadrant.Q4
    urgency_score: float = 0.0
    importance_score: float = 0.0
    v_impact: float = 0.0
    priority_score: float = 0.0
    created_at: datetime = field(default_factory=datetime.now)
    deadline: Optional[datetime] = None
    status: str = "pending"
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content": self.content,
            "quadrant": self.quadrant.value,
            "urgency_score": round(self.urgency_score, 2),
            "importance_score": round(self.importance_score, 2),
            "v_impact": round(self.v_impact, 2),
            "priority_score": round(self.priority_score, 2),
            "created_at": self.created_at.isoformat(),
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "status": self.status
        }


class TaskPrioritizer:
    """
    할 일 우선순위 정렬 엔진
    
    1. 텍스트 분석으로 긴급도/중요도 추정
    2. Eisenhower Matrix 사분면 할당
    3. V 영향도 계산 (숨김)
    4. 종합 점수 기반 정렬
    """
    
    def __init__(self, default_s: float = 0.2):
        """
        Args:
            default_s: 기본 Synergy 값 (MVP에서는 고정)
        """
        self.default_s = default_s
    
    def analyze_urgency(self, text: str) -> float:
        """긴급도 분석 (0~1)"""
        text_lower = text.lower()
        score = 0.0
        
        # 키워드 매칭
        for keyword in URGENT_KEYWORDS:
            if keyword.lower() in text_lower:
                score += 0.15
        
        # 날짜/시간 패턴 감지
        date_patterns = [
            r'\d{1,2}월\s*\d{1,2}일',
            r'\d{1,2}/\d{1,2}',
            r'오늘|내일|모레',
            r'\d{1,2}시|오전|오후'
        ]
        for pattern in date_patterns:
            if re.search(pattern, text):
                score += 0.2
        
        return min(1.0, score)
    
    def analyze_importance(self, text: str) -> float:
        """중요도 분석 (0~1)"""
        text_lower = text.lower()
        score = 0.0
        
        # 키워드 매칭
        for keyword in IMPORTANT_KEYWORDS:
            if keyword.lower() in text_lower:
                score += 0.12
        
        # 고유명사/직급 감지
        title_patterns = [
            r'(대표|사장|부장|팀장|차장|과장|대리|사원)님?',
            r'(CEO|CTO|CFO|COO|VP|Director|Manager)',
            r'[A-Z][a-z]+\s+[A-Z][a-z]+',  # 영어 이름
        ]
        for pattern in title_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.15
        
        return min(1.0, score)
    
    def calculate_v_impact(self, text: str, urgency: float, importance: float) -> float:
        """
        V 영향도 계산 (숨김 처리)
        
        V = base_impact × (1 + s)^relevance
        """
        base_impact = 1.0
        
        # 키워드 기반 가중치
        for keyword, weight in V_IMPACT_KEYWORDS.items():
            if keyword in text:
                base_impact += weight
        
        # 긴급+중요 가중치
        relevance = (urgency + importance) / 2
        
        # 복리 적용
        v_impact = base_impact * ((1 + self.default_s) ** (relevance * 3))
        
        return v_impact
    
    def assign_quadrant(self, urgency: float, importance: float) -> Quadrant:
        """Eisenhower Matrix 사분면 할당"""
        urgent = urgency >= 0.5
        important = importance >= 0.5
        
        if urgent and important:
            return Quadrant.Q1  # 즉시
        elif important and not urgent:
            return Quadrant.Q2  # 계획
        elif urgent and not important:
            return Quadrant.Q3  # 위임
        else:
            return Quadrant.Q4  # 제거
    
    def prioritize(self, tasks: List[str]) -> List[Task]:
        """
        할 일 목록 우선순위 정렬
        
        Args:
            tasks: 할 일 문자열 리스트
        
        Returns:
            정렬된 Task 리스트
        """
        analyzed_tasks = []
        
        for task_text in tasks:
            if not task_text.strip():
                continue
            
            # 분석
            urgency = self.analyze_urgency(task_text)
            importance = self.analyze_importance(task_text)
            v_impact = self.calculate_v_impact(task_text, urgency, importance)
            quadrant = self.assign_quadrant(urgency, importance)
            
            # 종합 점수 (Q1 > Q2 > Q3 > Q4 순서 보장)
            quadrant_weight = {
                Quadrant.Q1: 1000,
                Quadrant.Q2: 100,
                Quadrant.Q3: 10,
                Quadrant.Q4: 1
            }
            priority_score = (
                quadrant_weight[quadrant] +
                urgency * 50 +
                importance * 30 +
                v_impact * 5
            )
            
            task = Task(
                content=task_text.strip(),
                quadrant=quadrant,
                urgency_score=urgency,
                importance_score=importance,
                v_impact=v_impact,
                priority_score=priority_score
            )
            analyzed_tasks.append(task)
        
        # 정렬 (높은 점수 우선)
        analyzed_tasks.sort(key=lambda t: t.priority_score, reverse=True)
        
        return analyzed_tasks
    
    def get_summary(self, tasks: List[Task]) -> Dict:
        """정렬 결과 요약"""
        quadrant_counts = {q.value: 0 for q in Quadrant}
        total_v = 0.0
        
        for task in tasks:
            quadrant_counts[task.quadrant.value] += 1
            total_v += task.v_impact
        
        return {
            "total_tasks": len(tasks),
            "quadrant_distribution": quadrant_counts,
            "v_total": round(total_v, 2),
            "top_priority": tasks[0].content if tasks else None
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

_prioritizer: Optional[TaskPrioritizer] = None


def get_prioritizer() -> TaskPrioritizer:
    """싱글톤"""
    global _prioritizer
    if _prioritizer is None:
        _prioritizer = TaskPrioritizer()
    return _prioritizer


def prioritize_tasks(tasks: List[str]) -> Dict:
    """
    할 일 우선순위 정렬 (편의 함수)
    
    Example:
        result = prioritize_tasks([
            "프로젝트 제안서 작성 (오늘 마감)",
            "팀 미팅 준비",
            "점심 약속"
        ])
    """
    prioritizer = get_prioritizer()
    prioritized = prioritizer.prioritize(tasks)
    summary = prioritizer.get_summary(prioritized)
    
    return {
        "prioritized": [t.to_dict() for t in prioritized],
        "summary": summary
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    test_tasks = [
        "프로젝트 제안서 작성 (오늘 마감)",
        "팀 미팅 준비",
        "클라이언트 이메일 답장 - 긴급",
        "주간 보고서 제출",
        "점심 약속",
        "코드 리뷰 - 박팀장님 요청",
        "자료 정리",
        "내일 발표 자료 준비"
    ]
    
    result = prioritize_tasks(test_tasks)
    
    print("═" * 60)
    print("  📋 AUTUS Task Prioritizer Test")
    print("═" * 60)
    
    for i, task in enumerate(result["prioritized"], 1):
        emoji = {"Q1": "🔴", "Q2": "🟢", "Q3": "🟡", "Q4": "⚪"}[task["quadrant"]]
        print(f"  {i}. {emoji} {task['content']} [{task['quadrant']}]")
    
    print("─" * 60)
    print(f"  Total V Impact: {result['summary']['v_total']}")
    print(f"  Distribution: {result['summary']['quadrant_distribution']}")
