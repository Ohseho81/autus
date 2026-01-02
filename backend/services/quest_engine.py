#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Quest Engine                                      ║
║                          직원 게이미피케이션 - 일일 퀘스트 & 바운티                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

목적:
- 직원들이 태블릿 조회를 '일'이 아닌 '게임'으로 느끼게 만들기
- VIP 찾기, 시너지 연결 등 핵심 행동을 퀘스트화
- 완료 시 즉시 보상 (포인트, 쿠폰)

퀘스트 유형:
1. FIND_VIP: 숨은 보석 찾기 - VIP 고객 발견
2. DEFEND_WARN: 방어전 - 주의 고객 무사 응대
3. CROSS_LINK: 다리 놓기 - 타 매장 언급하여 반응 유도
4. STREAK: 연속 달성 - N일 연속 퀘스트 완료
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestType(str, Enum):
    """퀘스트 유형"""
    FIND_VIP = "FIND_VIP"           # VIP 찾기
    DEFEND_WARN = "DEFEND_WARN"     # 주의 고객 방어
    CROSS_LINK = "CROSS_LINK"       # 시너지 연결
    FAST_SERVICE = "FAST_SERVICE"   # 신속 응대
    SATISFACTION = "SATISFACTION"   # 만족 버튼 획득
    STREAK = "STREAK"               # 연속 달성


class RewardType(str, Enum):
    """보상 유형"""
    POINTS = "POINTS"           # 포인트
    COFFEE = "COFFEE"           # 커피 쿠폰
    EARLY_OUT = "EARLY_OUT"     # 조기 퇴근권
    MEAL = "MEAL"               # 식사 쿠폰
    CASH = "CASH"               # 현금 보너스


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Quest:
    """퀘스트 정의"""
    quest_id: str
    quest_type: QuestType
    title: str
    description: str
    target_count: int = 1          # 목표 횟수
    reward_type: RewardType = RewardType.POINTS
    reward_amount: int = 100       # 포인트 또는 금액
    reward_description: str = ""   # 보상 설명
    difficulty: str = "normal"     # easy, normal, hard
    biz_types: List[str] = field(default_factory=list)  # 적용 업종
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "quest_id": self.quest_id,
            "quest_type": self.quest_type.value,
            "title": self.title,
            "description": self.description,
            "target_count": self.target_count,
            "reward_type": self.reward_type.value,
            "reward_amount": self.reward_amount,
            "reward_description": self.reward_description,
            "difficulty": self.difficulty,
        }


# 퀘스트 템플릿
QUEST_TEMPLATES = {
    QuestType.FIND_VIP: Quest(
        quest_id="Q_FIND_VIP",
        quest_type=QuestType.FIND_VIP,
        title="💎 숨은 보석 찾기",
        description="오늘 방문객 중 [VVIP/VIP] 등급 1명을 찾아 '만족 버튼'을 누르세요.",
        target_count=1,
        reward_type=RewardType.COFFEE,
        reward_amount=5000,
        reward_description="스타벅스 아메리카노",
        difficulty="normal"
    ),
    QuestType.DEFEND_WARN: Quest(
        quest_id="Q_DEFEND",
        quest_type=QuestType.DEFEND_WARN,
        title="🛡️ 방어전",
        description="[주의] 등급 고객을 컴플레인 없이 방어하세요. 추가 문제 발생 0건.",
        target_count=1,
        reward_type=RewardType.POINTS,
        reward_amount=500,
        reward_description="포인트 500P",
        difficulty="hard"
    ),
    QuestType.CROSS_LINK: Quest(
        quest_id="Q_CROSS",
        quest_type=QuestType.CROSS_LINK,
        title="🌉 다리 놓기",
        description="고객에게 '학원/식당/헬스장' 중 하나를 자연스럽게 언급하고 반응을 기록하세요.",
        target_count=3,
        reward_type=RewardType.EARLY_OUT,
        reward_amount=1,
        reward_description="조기 퇴근권 추첨 응모",
        difficulty="normal"
    ),
    QuestType.FAST_SERVICE: Quest(
        quest_id="Q_FAST",
        quest_type=QuestType.FAST_SERVICE,
        title="⚡ 번개 서비스",
        description="[신속 처리] 태그 고객을 대기시간 5분 이내로 응대하세요.",
        target_count=2,
        reward_type=RewardType.POINTS,
        reward_amount=300,
        reward_description="포인트 300P",
        difficulty="normal"
    ),
    QuestType.SATISFACTION: Quest(
        quest_id="Q_SATISFY",
        quest_type=QuestType.SATISFACTION,
        title="😊 만족 수집가",
        description="'만족 버튼'을 5회 획득하세요.",
        target_count=5,
        reward_type=RewardType.MEAL,
        reward_amount=15000,
        reward_description="식사 쿠폰 1.5만원",
        difficulty="easy"
    ),
    QuestType.STREAK: Quest(
        quest_id="Q_STREAK",
        quest_type=QuestType.STREAK,
        title="🔥 연속 달성",
        description="3일 연속 일일 퀘스트를 완료하세요.",
        target_count=3,
        reward_type=RewardType.CASH,
        reward_amount=30000,
        reward_description="현금 3만원",
        difficulty="hard"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 진행 상태
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class QuestProgress:
    """직원별 퀘스트 진행 상태"""
    staff_id: str
    quest: Quest
    current_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    reward_claimed: bool = False
    
    def add_progress(self, count: int = 1) -> bool:
        """
        진행도 추가
        
        Returns:
            bool: 완료 여부
        """
        if self.is_completed:
            return True
        
        self.current_count += count
        
        if self.current_count >= self.quest.target_count:
            self.is_completed = True
            self.completed_at = datetime.now()
            return True
        
        return False
    
    @property
    def progress_percent(self) -> float:
        return min(100, (self.current_count / self.quest.target_count) * 100)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "staff_id": self.staff_id,
            "quest": self.quest.to_dict(),
            "current_count": self.current_count,
            "target_count": self.quest.target_count,
            "progress_percent": self.progress_percent,
            "is_completed": self.is_completed,
            "reward_claimed": self.reward_claimed,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퀘스트 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QuestEngine:
    """
    퀘스트 관리 엔진
    
    - 일일 퀘스트 생성
    - 진행 상황 추적
    - 보상 지급
    """
    
    def __init__(self):
        # 직원별 퀘스트 진행 상태
        self._progress: Dict[str, Dict[str, QuestProgress]] = {}
        # 직원별 연속 달성 기록
        self._streaks: Dict[str, int] = {}
    
    def get_daily_quests(
        self, 
        staff_id: str, 
        biz_type: str, 
        count: int = 3
    ) -> List[Quest]:
        """
        일일 퀘스트 생성
        
        매일 날짜 + 직원ID 기준으로 랜덤하게 3개 선택
        (같은 날 같은 직원은 같은 퀘스트를 받음)
        """
        # 시드 생성 (날짜 + 직원ID)
        seed_str = f"{date.today().isoformat()}_{staff_id}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # 업종별 필터링
        available_quests = list(QUEST_TEMPLATES.values())
        
        # 난이도 분포: easy 1개, normal 1~2개, hard 0~1개
        selected = []
        
        # Easy 1개
        easy = [q for q in available_quests if q.difficulty == "easy"]
        if easy:
            selected.append(random.choice(easy))
        
        # Normal 1~2개
        normal = [q for q in available_quests if q.difficulty == "normal"]
        if normal:
            selected.extend(random.sample(normal, min(2, len(normal))))
        
        # Hard 0~1개 (30% 확률)
        if random.random() < 0.3:
            hard = [q for q in available_quests if q.difficulty == "hard"]
            if hard:
                selected.append(random.choice(hard))
        
        # 최대 count개
        return selected[:count]
    
    def start_quest(self, staff_id: str, quest_type: QuestType) -> QuestProgress:
        """퀘스트 시작"""
        if staff_id not in self._progress:
            self._progress[staff_id] = {}
        
        quest = QUEST_TEMPLATES.get(quest_type)
        if not quest:
            raise ValueError(f"Unknown quest type: {quest_type}")
        
        progress = QuestProgress(staff_id=staff_id, quest=quest)
        self._progress[staff_id][quest_type.value] = progress
        
        return progress
    
    def update_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType, 
        count: int = 1
    ) -> Optional[QuestProgress]:
        """
        퀘스트 진행도 업데이트
        
        Returns:
            QuestProgress: 업데이트된 진행 상태 (없으면 None)
        """
        if staff_id not in self._progress:
            return None
        
        progress = self._progress[staff_id].get(quest_type.value)
        if not progress:
            return None
        
        was_completed = progress.is_completed
        progress.add_progress(count)
        
        # 새로 완료된 경우 연속 달성 업데이트
        if not was_completed and progress.is_completed:
            self._update_streak(staff_id)
        
        return progress
    
    def _update_streak(self, staff_id: str):
        """연속 달성 업데이트"""
        current = self._streaks.get(staff_id, 0)
        self._streaks[staff_id] = current + 1
    
    def get_streak(self, staff_id: str) -> int:
        """연속 달성 일수"""
        return self._streaks.get(staff_id, 0)
    
    def get_progress(
        self, 
        staff_id: str, 
        quest_type: QuestType = None
    ) -> Dict[str, QuestProgress]:
        """진행 상태 조회"""
        if staff_id not in self._progress:
            return {}
        
        if quest_type:
            progress = self._progress[staff_id].get(quest_type.value)
            return {quest_type.value: progress} if progress else {}
        
        return self._progress[staff_id]
    
    def claim_reward(
        self, 
        staff_id: str, 
        quest_type: QuestType
    ) -> Optional[Dict[str, Any]]:
        """
        보상 수령
        
        Returns:
            Dict: 보상 정보 (실패 시 None)
        """
        progress = self._progress.get(staff_id, {}).get(quest_type.value)
        
        if not progress or not progress.is_completed or progress.reward_claimed:
            return None
        
        progress.reward_claimed = True
        
        return {
            "staff_id": staff_id,
            "quest": progress.quest.title,
            "reward_type": progress.quest.reward_type.value,
            "reward_amount": progress.quest.reward_amount,
            "reward_description": progress.quest.reward_description,
            "claimed_at": datetime.now().isoformat(),
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        리더보드 (퀘스트 완료 수 기준)
        """
        scores = []
        
        for staff_id, quests in self._progress.items():
            completed = sum(1 for q in quests.values() if q.is_completed)
            total_points = sum(
                q.quest.reward_amount 
                for q in quests.values() 
                if q.is_completed and q.quest.reward_type == RewardType.POINTS
            )
            scores.append({
                "staff_id": staff_id,
                "completed_quests": completed,
                "total_points": total_points,
                "streak": self._streaks.get(staff_id, 0),
            })
        
        return sorted(scores, key=lambda x: (-x["completed_quests"], -x["total_points"]))[:limit]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퀘스트 엔진 데모"""
    print("=" * 70)
    print("  🎮 AUTUS-TRINITY Quest Engine Demo")
    print("=" * 70)
    
    engine = QuestEngine()
    
    # 테스트 직원
    staff_id = "S001"
    biz_type = "restaurant"
    
    # 일일 퀘스트 생성
    print(f"\n📜 오늘의 퀘스트 ({staff_id}):\n")
    quests = engine.get_daily_quests(staff_id, biz_type)
    
    for i, quest in enumerate(quests, 1):
        print(f"  [{i}] {quest.title}")
        print(f"      {quest.description}")
        print(f"      🎁 보상: {quest.reward_description}")
        print(f"      난이도: {quest.difficulty}\n")
    
    # 퀘스트 진행 시뮬레이션
    print("-" * 70)
    print("\n🎯 퀘스트 진행 시뮬레이션:\n")
    
    # VIP 찾기 퀘스트 시작
    progress = engine.start_quest(staff_id, QuestType.FIND_VIP)
    print(f"  퀘스트 시작: {progress.quest.title}")
    print(f"  진행도: {progress.current_count}/{progress.quest.target_count}")
    
    # VIP 발견!
    engine.update_progress(staff_id, QuestType.FIND_VIP, 1)
    progress = engine.get_progress(staff_id, QuestType.FIND_VIP)[QuestType.FIND_VIP.value]
    print(f"\n  ✅ VIP 발견! 진행도: {progress.current_count}/{progress.quest.target_count}")
    print(f"  완료 여부: {progress.is_completed}")
    
    # 보상 수령
    if progress.is_completed:
        reward = engine.claim_reward(staff_id, QuestType.FIND_VIP)
        if reward:
            print(f"\n  🎁 보상 수령!")
            print(f"     {reward['reward_description']}")
    
    # 만족 수집가 퀘스트
    print("\n" + "-" * 70)
    engine.start_quest(staff_id, QuestType.SATISFACTION)
    for i in range(5):
        progress = engine.update_progress(staff_id, QuestType.SATISFACTION, 1)
        print(f"  만족 버튼 {i+1}/5 - 진행도: {progress.progress_percent:.0f}%")
    
    # 리더보드
    print("\n" + "-" * 70)
    print("\n🏆 리더보드:")
    
    # 다른 직원 시뮬레이션
    for sid in ["S002", "S003"]:
        engine.start_quest(sid, QuestType.FIND_VIP)
        if sid == "S002":
            engine.update_progress(sid, QuestType.FIND_VIP, 1)
    
    leaderboard = engine.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['staff_id']} - 완료: {entry['completed_quests']}개, 연속: {entry['streak']}일")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()

























