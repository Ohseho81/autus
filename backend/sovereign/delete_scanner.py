"""
AUTUS Sovereign - Delete Scanner
=================================

삭제 대상 스캔: 비즈니스에서 삭제 가능한 요소들을 찾아냄

핵심 원리: "추가보다 삭제가 더 강력하다"
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
from datetime import datetime
import hashlib


class DeleteCategory(Enum):
    """삭제 카테고리"""
    SUBSCRIPTION = "subscription"       # 구독 서비스
    SOFTWARE = "software"               # 소프트웨어
    MEETING = "meeting"                 # 회의
    REPORT = "report"                   # 보고서
    PROCESS = "process"                 # 프로세스
    APPROVAL = "approval"               # 결재 단계
    POSITION = "position"               # 직위/포지션
    ASSET = "asset"                     # 자산
    VENDOR = "vendor"                   # 벤더/공급업체
    PROJECT = "project"                 # 프로젝트
    FEATURE = "feature"                 # 기능
    CHANNEL = "channel"                 # 채널
    INVENTORY = "inventory"             # 재고
    POLICY = "policy"                   # 정책


# 카테고리별 우선순위 (1: 최우선)
CATEGORY_PRIORITIES = {
    DeleteCategory.SUBSCRIPTION: 1,
    DeleteCategory.MEETING: 1,
    DeleteCategory.APPROVAL: 2,
    DeleteCategory.SOFTWARE: 2,
    DeleteCategory.REPORT: 2,
    DeleteCategory.PROCESS: 3,
    DeleteCategory.VENDOR: 3,
    DeleteCategory.PROJECT: 4,
    DeleteCategory.FEATURE: 4,
    DeleteCategory.POSITION: 5,
    DeleteCategory.ASSET: 5,
    DeleteCategory.CHANNEL: 3,
    DeleteCategory.INVENTORY: 4,
    DeleteCategory.POLICY: 5,
}


# 대체 템플릿
REPLACEMENT_TEMPLATES = {
    DeleteCategory.SUBSCRIPTION: "무료 대안 또는 통합",
    DeleteCategory.SOFTWARE: "오픈소스 또는 통합",
    DeleteCategory.MEETING: "비동기 커뮤니케이션",
    DeleteCategory.REPORT: "자동화 대시보드",
    DeleteCategory.PROCESS: "자동화 또는 제거",
    DeleteCategory.APPROVAL: "자동 승인 규칙",
    DeleteCategory.POSITION: "역할 통합",
    DeleteCategory.ASSET: "매각 또는 임대",
    DeleteCategory.VENDOR: "내재화 또는 통합",
    DeleteCategory.PROJECT: "범위 축소 또는 중단",
    DeleteCategory.FEATURE: "핵심 기능 집중",
    DeleteCategory.CHANNEL: "채널 통합",
    DeleteCategory.INVENTORY: "JIT 또는 드롭십",
    DeleteCategory.POLICY: "단순화",
}


# 산업별 템플릿
INDUSTRY_TEMPLATES = {
    "startup": {
        DeleteCategory.SUBSCRIPTION: [
            {"name": "Slack Pro", "cost": 100000, "alternative": "Discord/무료 Slack"},
            {"name": "Notion Team", "cost": 80000, "alternative": "Obsidian/무료 Notion"},
            {"name": "Zoom Pro", "cost": 50000, "alternative": "Google Meet"},
            {"name": "Adobe CC", "cost": 200000, "alternative": "Figma/Canva"},
            {"name": "AWS 과다 사용", "cost": 500000, "alternative": "최적화/Vercel"},
        ],
        DeleteCategory.MEETING: [
            {"name": "주간 전체 회의", "time": 2, "alternative": "월간 + 비동기"},
            {"name": "일일 스탠드업", "time": 0.5, "alternative": "Slack 봇"},
            {"name": "1:1 미팅 과다", "time": 3, "alternative": "격주 1:1"},
        ],
        DeleteCategory.PROCESS: [
            {"name": "수동 배포", "time": 5, "alternative": "CI/CD"},
            {"name": "수동 테스트", "time": 10, "alternative": "자동화 테스트"},
            {"name": "수동 보고", "time": 3, "alternative": "대시보드"},
        ],
    },
    "smb": {
        DeleteCategory.SUBSCRIPTION: [
            {"name": "ERP 과다 기능", "cost": 300000, "alternative": "핵심만 사용"},
            {"name": "CRM 미사용", "cost": 150000, "alternative": "스프레드시트"},
            {"name": "마케팅 툴 중복", "cost": 200000, "alternative": "통합"},
        ],
        DeleteCategory.MEETING: [
            {"name": "주간 임원 회의", "time": 3, "alternative": "격주"},
            {"name": "부서별 회의", "time": 5, "alternative": "비동기"},
        ],
        DeleteCategory.VENDOR: [
            {"name": "중복 공급업체", "cost": 500000, "alternative": "통합"},
            {"name": "비효율 계약", "cost": 300000, "alternative": "재협상"},
        ],
    },
    "enterprise": {
        DeleteCategory.APPROVAL: [
            {"name": "3단계 결재", "time": 24, "alternative": "자동 승인"},
            {"name": "예산 승인 지연", "time": 48, "alternative": "한도 자동화"},
        ],
        DeleteCategory.REPORT: [
            {"name": "주간 보고서", "time": 5, "alternative": "자동화"},
            {"name": "월간 보고서", "time": 10, "alternative": "대시보드"},
        ],
        DeleteCategory.PROCESS: [
            {"name": "레거시 프로세스", "time": 20, "alternative": "리엔지니어링"},
        ],
    },
    "education": {
        DeleteCategory.PROCESS: [
            {"name": "수동 출석", "time": 5, "alternative": "자동화"},
            {"name": "성적 입력", "time": 10, "alternative": "자동 채점"},
        ],
        DeleteCategory.MEETING: [
            {"name": "교사 회의", "time": 3, "alternative": "비동기"},
        ],
    },
}


@dataclass
class DeleteTarget:
    """삭제 대상"""
    id: str
    name: str
    category: DeleteCategory
    
    # 현재 비용
    current_cost: float = 0.0           # 월 비용 (원)
    current_time: float = 0.0           # 월 소요 시간 (시간)
    
    # 삭제 효과
    delete_roi: float = 0.0             # 삭제 ROI
    inertia: float = 0.5                # 관성 (0-1)
    priority: int = 3                   # 우선순위 (1-5)
    
    # 대체 방안
    replacement: str = ""
    replacement_cost: float = 0.0
    automation_level: float = 0.0       # 자동화 가능성 (0-1)
    
    # 액션
    action_plan: str = ""
    
    # 메타
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ScanResult:
    """스캔 결과"""
    entity_id: str
    scanned_at: str
    
    targets: List[DeleteTarget] = field(default_factory=list)
    total_count: int = 0
    by_category: Dict[str, int] = field(default_factory=dict)
    
    # 예상 효과
    total_cost_saved: float = 0.0
    total_time_saved: float = 0.0
    total_efficiency_gain: float = 0.0
    
    # 추천
    recommendations: List[str] = field(default_factory=list)


class DeleteScanner:
    """
    삭제 대상 스캐너
    
    산업별 템플릿 또는 커스텀 아이템으로 삭제 대상을 스캔
    """
    
    INDUSTRY_TEMPLATES = INDUSTRY_TEMPLATES
    REPLACEMENT_TEMPLATES = REPLACEMENT_TEMPLATES
    CATEGORY_PRIORITIES = CATEGORY_PRIORITIES
    
    def __init__(self):
        self.results: Dict[str, ScanResult] = {}
    
    def _generate_id(self, name: str) -> str:
        """ID 생성"""
        return hashlib.md5(f"{name}{datetime.now().isoformat()}".encode()).hexdigest()[:12]
    
    def _calculate_delete_roi(self, cost: float, time: float, replacement_cost: float) -> float:
        """삭제 ROI 계산"""
        annual_savings = (cost * 12) + (time * 50000)  # 시간당 5만원 가정
        annual_replacement = replacement_cost * 12
        net_savings = annual_savings - annual_replacement
        return net_savings / max(cost, 1)
    
    def scan_by_industry(self, entity_id: str, industry: str) -> ScanResult:
        """산업별 템플릿으로 스캔"""
        template = self.INDUSTRY_TEMPLATES.get(industry, {})
        targets: List[DeleteTarget] = []
        by_category: Dict[str, int] = {}
        
        for category, items in template.items():
            by_category[category.value] = len(items)
            
            for item in items:
                cost = item.get("cost", 0)
                time = item.get("time", 0)
                replacement_cost = cost * 0.2  # 대체 비용 20% 가정
                
                target = DeleteTarget(
                    id=self._generate_id(item["name"]),
                    name=item["name"],
                    category=category,
                    current_cost=cost,
                    current_time=time,
                    delete_roi=self._calculate_delete_roi(cost, time, replacement_cost),
                    inertia=0.5,
                    priority=CATEGORY_PRIORITIES.get(category, 3),
                    replacement=item.get("alternative", REPLACEMENT_TEMPLATES.get(category, "")),
                    replacement_cost=replacement_cost,
                    automation_level=0.7 if category in [DeleteCategory.PROCESS, DeleteCategory.REPORT] else 0.3,
                    action_plan=f"'{item['name']}' → {item.get('alternative', '삭제')}",
                )
                targets.append(target)
        
        # ROI 기준 정렬
        targets.sort(key=lambda t: t.delete_roi, reverse=True)
        
        # 효과 계산
        total_cost = sum(t.current_cost for t in targets)
        total_time = sum(t.current_time for t in targets)
        
        # 추천 생성
        recommendations = []
        if targets:
            top = targets[0]
            recommendations.append(f"최우선: '{top.name}' 삭제 (ROI: {top.delete_roi:.1f})")
        
        high_roi = [t for t in targets if t.delete_roi > 10]
        if high_roi:
            recommendations.append(f"높은 ROI 항목 {len(high_roi)}개 발견")
        
        result = ScanResult(
            entity_id=entity_id,
            scanned_at=datetime.now().isoformat(),
            targets=targets,
            total_count=len(targets),
            by_category=by_category,
            total_cost_saved=total_cost * 0.7,  # 70% 절감 가정
            total_time_saved=total_time * 0.8,  # 80% 절감 가정
            total_efficiency_gain=15.0,  # 15% 효율 향상 가정
            recommendations=recommendations,
        )
        
        self.results[entity_id] = result
        return result
    
    def scan_custom(self, entity_id: str, items: List[dict]) -> ScanResult:
        """커스텀 아이템 스캔"""
        targets: List[DeleteTarget] = []
        by_category: Dict[str, int] = {}
        
        for item in items:
            category = DeleteCategory(item.get("category", "process"))
            
            if category.value not in by_category:
                by_category[category.value] = 0
            by_category[category.value] += 1
            
            cost = item.get("cost", 0)
            time = item.get("time", 0)
            
            target = DeleteTarget(
                id=self._generate_id(item.get("name", "unknown")),
                name=item.get("name", "Unknown"),
                category=category,
                current_cost=cost,
                current_time=time,
                delete_roi=self._calculate_delete_roi(cost, time, cost * 0.2),
                inertia=item.get("inertia", 0.5),
                priority=item.get("priority", CATEGORY_PRIORITIES.get(category, 3)),
                replacement=item.get("replacement", REPLACEMENT_TEMPLATES.get(category, "")),
                action_plan=item.get("action_plan", f"'{item.get('name', '')}' 삭제"),
            )
            targets.append(target)
        
        targets.sort(key=lambda t: t.delete_roi, reverse=True)
        
        result = ScanResult(
            entity_id=entity_id,
            scanned_at=datetime.now().isoformat(),
            targets=targets,
            total_count=len(targets),
            by_category=by_category,
            total_cost_saved=sum(t.current_cost for t in targets) * 0.7,
            total_time_saved=sum(t.current_time for t in targets) * 0.8,
            recommendations=[f"총 {len(targets)}개 항목 스캔 완료"],
        )
        
        self.results[entity_id] = result
        return result
    
    def get_result(self, entity_id: str) -> Optional[ScanResult]:
        """저장된 스캔 결과 조회"""
        return self.results.get(entity_id)
    
    def get_quick_wins(self, entity_id: str, limit: int = 5) -> List[DeleteTarget]:
        """빠른 성과 항목 (낮은 관성, 높은 ROI)"""
        result = self.results.get(entity_id)
        if not result:
            return []
        
        # 관성 낮고 ROI 높은 순
        quick_wins = sorted(
            result.targets,
            key=lambda t: (t.inertia, -t.delete_roi)
        )
        return quick_wins[:limit]


# 전역 스캐너 인스턴스
_scanner: Optional[DeleteScanner] = None


def get_scanner() -> DeleteScanner:
    """스캐너 싱글톤"""
    global _scanner
    if _scanner is None:
        _scanner = DeleteScanner()
    return _scanner
