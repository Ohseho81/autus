"""
═══════════════════════════════════════════════════════════════════════════════
📝 AUTUS Meeting Extractor — 회의록 핵심 결정 추출
═══════════════════════════════════════════════════════════════════════════════

회의 내용에서 핵심 결정 사항 자동 추출:
- 결정 문장 감지 ("~하기로 했다", "~로 확정")
- 담당자 + 기한 파싱
- 액션 아이템 분류

═══════════════════════════════════════════════════════════════════════════════
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import re
import uuid


# 결정 패턴 (한글)
DECISION_PATTERNS = [
    r'(.+?)(하기로|로)\s*(했|결정|확정|합의)',
    r'(.+?)(을|를)\s*(하기로|진행하기로|완료하기로)',
    r'(.+?)(까지|에)\s*(완료|제출|마감)',
    r'(.+?)(님이?|가)\s*(.+?)(담당|책임)',
    r'(결정|확정|합의)\s*[:：]\s*(.+)',
    r'(TODO|Action)\s*[:：]\s*(.+)',
]

# 담당자 패턴
ASSIGNEE_PATTERNS = [
    r'([가-힣]{2,4})(님|씨|대리|과장|차장|부장|팀장|사원)',
    r'([가-힣]{2,4})(이|가)\s*(담당|책임|진행)',
    r'담당\s*[:：]?\s*([가-힣]{2,4})',
]

# 날짜 패턴
DATE_PATTERNS = [
    (r'(\d{1,2})월\s*(\d{1,2})일', lambda m: (int(m.group(1)), int(m.group(2)))),
    (r'(\d{1,2})/(\d{1,2})', lambda m: (int(m.group(1)), int(m.group(2)))),
    (r'내일', lambda m: None),  # 특수 처리
    (r'모레', lambda m: None),
    (r'다음\s*주', lambda m: None),
    (r'이번\s*주\s*(월|화|수|목|금)', lambda m: None),
]


@dataclass
class Decision:
    """결정 사항"""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    content: str = ""
    assignee: Optional[str] = None
    deadline: Optional[datetime] = None
    deadline_text: str = ""
    v_impact: float = 1.0
    confidence: float = 0.8
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content": self.content,
            "assignee": self.assignee,
            "deadline": self.deadline.strftime("%Y-%m-%d") if self.deadline else None,
            "deadline_text": self.deadline_text,
            "v_impact": round(self.v_impact, 2),
            "confidence": round(self.confidence, 2)
        }


@dataclass
class MeetingResult:
    """회의록 분석 결과"""
    meeting_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    decisions: List[Decision] = field(default_factory=list)
    summary: str = ""
    raw_text: str = ""
    analyzed_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            "meeting_id": self.meeting_id,
            "decisions": [d.to_dict() for d in self.decisions],
            "summary": self.summary,
            "decision_count": len(self.decisions),
            "analyzed_at": self.analyzed_at.isoformat()
        }


class MeetingExtractor:
    """
    회의록 핵심 결정 추출 엔진
    
    1. 문장 단위 분리
    2. 결정 패턴 매칭
    3. 담당자/기한 추출
    4. V 영향도 계산 (숨김)
    """
    
    def __init__(self, default_s: float = 0.2):
        self.default_s = default_s
    
    def split_sentences(self, text: str) -> List[str]:
        """문장 분리"""
        # 한글 문장 종결 패턴
        sentences = re.split(r'[.。!?]\s*|\n+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def extract_assignee(self, text: str) -> Optional[str]:
        """담당자 추출"""
        for pattern in ASSIGNEE_PATTERNS:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None
    
    def extract_deadline(self, text: str) -> Tuple[Optional[datetime], str]:
        """기한 추출"""
        today = datetime.now()
        
        # 내일
        if '내일' in text:
            deadline = today + timedelta(days=1)
            return deadline, "내일"
        
        # 모레
        if '모레' in text:
            deadline = today + timedelta(days=2)
            return deadline, "모레"
        
        # 이번 주 요일
        weekday_map = {'월': 0, '화': 1, '수': 2, '목': 3, '금': 4, '토': 5, '일': 6}
        weekday_match = re.search(r'이번\s*주\s*(월|화|수|목|금|토|일)', text)
        if weekday_match:
            target_day = weekday_map[weekday_match.group(1)]
            days_ahead = target_day - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            deadline = today + timedelta(days=days_ahead)
            return deadline, f"이번 주 {weekday_match.group(1)}요일"
        
        # 다음 주
        if '다음 주' in text or '다음주' in text:
            deadline = today + timedelta(days=7)
            return deadline, "다음 주"
        
        # MM/DD 또는 M월 D일
        date_match = re.search(r'(\d{1,2})[/월]\s*(\d{1,2})[일]?', text)
        if date_match:
            month = int(date_match.group(1))
            day = int(date_match.group(2))
            year = today.year
            if month < today.month:
                year += 1
            try:
                deadline = datetime(year, month, day)
                return deadline, f"{month}/{day}"
            except ValueError:
                pass
        
        return None, ""
    
    def is_decision_sentence(self, sentence: str) -> Tuple[bool, float]:
        """결정 문장 여부 판단"""
        # 결정 키워드 확인
        decision_keywords = [
            '하기로', '확정', '결정', '합의', '완료', '진행',
            '담당', '책임', '마감', '제출', 'TODO', 'Action'
        ]
        
        confidence = 0.0
        for keyword in decision_keywords:
            if keyword.lower() in sentence.lower():
                confidence += 0.2
        
        # 패턴 매칭
        for pattern in DECISION_PATTERNS:
            if re.search(pattern, sentence):
                confidence += 0.3
        
        return confidence >= 0.4, min(1.0, confidence)
    
    def calculate_v_impact(self, decision: str, assignee: Optional[str]) -> float:
        """V 영향도 계산 (숨김)"""
        base = 1.0
        
        # 키워드 가중치
        impact_keywords = {
            '프로젝트': 2.0,
            '클라이언트': 2.5,
            '계약': 3.0,
            '발표': 2.0,
            '제안': 2.5,
            '승인': 2.0,
            '예산': 2.5,
        }
        
        for keyword, weight in impact_keywords.items():
            if keyword in decision:
                base += weight
        
        # 담당자가 있으면 추가
        if assignee:
            base += 0.5
        
        return base * (1 + self.default_s)
    
    def extract(self, text: str, max_decisions: int = 5) -> MeetingResult:
        """
        회의록에서 핵심 결정 추출
        
        Args:
            text: 회의록 텍스트
            max_decisions: 최대 추출 개수
        
        Returns:
            MeetingResult
        """
        sentences = self.split_sentences(text)
        decisions = []
        
        for sentence in sentences:
            is_decision, confidence = self.is_decision_sentence(sentence)
            
            if is_decision:
                assignee = self.extract_assignee(sentence)
                deadline, deadline_text = self.extract_deadline(sentence)
                v_impact = self.calculate_v_impact(sentence, assignee)
                
                decision = Decision(
                    content=sentence,
                    assignee=assignee,
                    deadline=deadline,
                    deadline_text=deadline_text,
                    v_impact=v_impact,
                    confidence=confidence
                )
                decisions.append(decision)
        
        # 신뢰도 순 정렬 후 상위 N개
        decisions.sort(key=lambda d: (d.confidence, d.v_impact), reverse=True)
        decisions = decisions[:max_decisions]
        
        # 요약 생성
        summary = self._generate_summary(decisions)
        
        return MeetingResult(
            decisions=decisions,
            summary=summary,
            raw_text=text
        )
    
    def _generate_summary(self, decisions: List[Decision]) -> str:
        """요약 생성"""
        if not decisions:
            return "추출된 결정 사항이 없습니다."
        
        lines = [f"📋 핵심 결정 {len(decisions)}건"]
        for i, d in enumerate(decisions, 1):
            assignee = f" 👤{d.assignee}" if d.assignee else ""
            deadline = f" 📅{d.deadline_text}" if d.deadline_text else ""
            lines.append(f"{i}. {d.content[:30]}...{assignee}{deadline}")
        
        return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

_extractor: Optional[MeetingExtractor] = None


def get_extractor() -> MeetingExtractor:
    """싱글톤"""
    global _extractor
    if _extractor is None:
        _extractor = MeetingExtractor()
    return _extractor


def extract_decisions(text: str, max_decisions: int = 5) -> Dict:
    """
    회의록 핵심 결정 추출 (편의 함수)
    
    Example:
        result = extract_decisions('''
            오늘 팀 회의에서 Q1 프로젝트 일정을 논의했습니다.
            김대리가 디자인 시안을 다음 주 수요일까지 완료하기로 했고,
            박팀장님이 클라이언트 미팅을 금요일로 확정했습니다.
        ''')
    """
    extractor = get_extractor()
    result = extractor.extract(text, max_decisions)
    return result.to_dict()


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    test_text = """
    오늘 주간 팀 회의에서 Q1 프로젝트 일정을 논의했습니다.
    
    김대리가 디자인 시안을 다음 주 수요일까지 완료하기로 했습니다.
    박팀장님이 클라이언트 미팅을 이번 주 금요일로 확정했습니다.
    
    예산 검토는 이차장님이 담당하기로 결정되었습니다.
    마케팅 자료는 내일까지 제출하기로 합의했습니다.
    
    다음 회의는 월요일 오전 10시에 진행 예정입니다.
    """
    
    result = extract_decisions(test_text)
    
    print("═" * 60)
    print("  📝 AUTUS Meeting Extractor Test")
    print("═" * 60)
    print(f"\n{result['summary']}")
    print("\n─" * 30)
    
    for d in result['decisions']:
        print(f"\n  [{d['id']}] {d['content'][:40]}...")
        if d['assignee']:
            print(f"       👤 담당: {d['assignee']}")
        if d['deadline']:
            print(f"       📅 기한: {d['deadline']} ({d['deadline_text']})")
        print(f"       📊 신뢰도: {d['confidence']*100:.0f}%")
