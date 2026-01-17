"""
Process Mining Engine
=====================

이벤트 로그 분석 → 프로세스 인사이트

UiPath Process Mining 스타일:
- Conformance checking
- Bottleneck detection
- Root cause analysis
- Optimization suggestions

Phase 2 목표: 업무 흐름 자동 발견 및 최적화 제안
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from pydantic import BaseModel
from collections import defaultdict
import statistics


class ProcessEvent(BaseModel):
    """단일 프로세스 이벤트"""
    case_id: str  # 프로세스 인스턴스 ID
    activity: str  # 액티비티 이름
    timestamp: datetime
    resource: Optional[str] = None  # 실행자
    cost: Optional[float] = None
    duration_ms: Optional[int] = None
    attributes: Dict[str, Any] = {}


class ProcessVariant(BaseModel):
    """프로세스 변형 (경로)"""
    activities: List[str]
    frequency: int
    avg_duration_ms: float
    cases: List[str]


class Bottleneck(BaseModel):
    """병목 지점"""
    activity: str
    avg_wait_time_ms: float
    max_wait_time_ms: float
    frequency: int
    impact_score: float  # 0-100


class ProcessInsight(BaseModel):
    """프로세스 분석 인사이트"""
    insight_type: str  # bottleneck, deviation, opportunity
    title: str
    description: str
    impact: str  # low, medium, high
    suggestion: str
    confidence: float
    affected_cases: int


class ProcessMiner:
    """
    프로세스 마이닝 엔진
    
    Usage:
        miner = ProcessMiner()
        
        # 이벤트 로그 추가
        miner.add_events(events)
        
        # 분석 실행
        insights = miner.analyze()
        
        # 병목 탐지
        bottlenecks = miner.find_bottlenecks()
        
        # 프로세스 변형 발견
        variants = miner.discover_variants()
    """
    
    def __init__(self):
        self.events: List[ProcessEvent] = []
        self._cases: Dict[str, List[ProcessEvent]] = defaultdict(list)
    
    # ═══════════════════════════════════════════════════════════════
    # Event Management
    # ═══════════════════════════════════════════════════════════════
    
    def add_event(self, event: ProcessEvent):
        """단일 이벤트 추가"""
        self.events.append(event)
        self._cases[event.case_id].append(event)
        # 시간순 정렬
        self._cases[event.case_id].sort(key=lambda e: e.timestamp)
    
    def add_events(self, events: List[ProcessEvent]):
        """다중 이벤트 추가"""
        for event in events:
            self.add_event(event)
    
    def clear(self):
        """이벤트 초기화"""
        self.events = []
        self._cases = defaultdict(list)
    
    # ═══════════════════════════════════════════════════════════════
    # Process Discovery
    # ═══════════════════════════════════════════════════════════════
    
    def discover_variants(self, min_frequency: int = 1) -> List[ProcessVariant]:
        """
        프로세스 변형(경로) 발견
        
        각 케이스의 액티비티 시퀀스를 추출하고
        같은 시퀀스끼리 그룹화
        """
        variant_map: Dict[str, Dict] = defaultdict(lambda: {
            "activities": [],
            "cases": [],
            "durations": []
        })
        
        for case_id, events in self._cases.items():
            if not events:
                continue
            
            # 액티비티 시퀀스 추출
            activities = [e.activity for e in events]
            variant_key = " → ".join(activities)
            
            # 케이스 기간 계산
            duration = (events[-1].timestamp - events[0].timestamp).total_seconds() * 1000
            
            variant_map[variant_key]["activities"] = activities
            variant_map[variant_key]["cases"].append(case_id)
            variant_map[variant_key]["durations"].append(duration)
        
        # Variant 객체로 변환
        variants = []
        for key, data in variant_map.items():
            if len(data["cases"]) >= min_frequency:
                variants.append(ProcessVariant(
                    activities=data["activities"],
                    frequency=len(data["cases"]),
                    avg_duration_ms=statistics.mean(data["durations"]) if data["durations"] else 0,
                    cases=data["cases"]
                ))
        
        # 빈도순 정렬
        variants.sort(key=lambda v: v.frequency, reverse=True)
        
        return variants
    
    # ═══════════════════════════════════════════════════════════════
    # Bottleneck Detection
    # ═══════════════════════════════════════════════════════════════
    
    def find_bottlenecks(self, threshold_ms: float = 1000) -> List[Bottleneck]:
        """
        병목 지점 탐지
        
        각 액티비티 전의 대기 시간을 분석하여
        평균 대기 시간이 threshold를 초과하는 지점 식별
        """
        # 액티비티별 대기 시간 수집
        wait_times: Dict[str, List[float]] = defaultdict(list)
        
        for case_id, events in self._cases.items():
            for i in range(1, len(events)):
                prev_event = events[i - 1]
                curr_event = events[i]
                
                # 이전 액티비티 종료 → 현재 액티비티 시작 간 대기 시간
                wait_ms = (curr_event.timestamp - prev_event.timestamp).total_seconds() * 1000
                
                # 이전 액티비티의 duration이 있으면 빼기
                if prev_event.duration_ms:
                    wait_ms -= prev_event.duration_ms
                
                if wait_ms > 0:
                    wait_times[curr_event.activity].append(wait_ms)
        
        # 병목 식별
        bottlenecks = []
        for activity, times in wait_times.items():
            if not times:
                continue
            
            avg_wait = statistics.mean(times)
            max_wait = max(times)
            
            if avg_wait > threshold_ms:
                # 영향도 점수 계산 (대기시간 × 빈도)
                impact = min(100, (avg_wait / 1000) * len(times) / 10)
                
                bottlenecks.append(Bottleneck(
                    activity=activity,
                    avg_wait_time_ms=avg_wait,
                    max_wait_time_ms=max_wait,
                    frequency=len(times),
                    impact_score=impact
                ))
        
        # 영향도순 정렬
        bottlenecks.sort(key=lambda b: b.impact_score, reverse=True)
        
        return bottlenecks
    
    # ═══════════════════════════════════════════════════════════════
    # Conformance Checking
    # ═══════════════════════════════════════════════════════════════
    
    def check_conformance(
        self,
        expected_flow: List[str]
    ) -> Dict[str, Any]:
        """
        적합성 검사
        
        실제 프로세스가 예상 플로우를 따르는지 확인
        """
        conforming_cases = []
        deviating_cases = []
        
        for case_id, events in self._cases.items():
            actual_flow = [e.activity for e in events]
            
            # 시퀀스 일치 여부 확인
            if actual_flow == expected_flow:
                conforming_cases.append(case_id)
            else:
                # 어디서 벗어났는지 분석
                deviation_point = None
                for i, (expected, actual) in enumerate(zip(expected_flow, actual_flow)):
                    if expected != actual:
                        deviation_point = i
                        break
                
                if deviation_point is None and len(actual_flow) != len(expected_flow):
                    deviation_point = min(len(actual_flow), len(expected_flow))
                
                deviating_cases.append({
                    "case_id": case_id,
                    "actual_flow": actual_flow,
                    "deviation_point": deviation_point
                })
        
        total = len(self._cases)
        conformance_rate = len(conforming_cases) / total * 100 if total > 0 else 0
        
        return {
            "expected_flow": expected_flow,
            "total_cases": total,
            "conforming_cases": len(conforming_cases),
            "deviating_cases": len(deviating_cases),
            "conformance_rate": conformance_rate,
            "deviations": deviating_cases[:10]  # Top 10
        }
    
    # ═══════════════════════════════════════════════════════════════
    # Full Analysis
    # ═══════════════════════════════════════════════════════════════
    
    def analyze(self) -> List[ProcessInsight]:
        """
        종합 분석 → AUTUS AI Suggestion용 인사이트
        """
        insights = []
        
        # 1. 병목 분석
        bottlenecks = self.find_bottlenecks()
        for bn in bottlenecks[:3]:  # Top 3
            insights.append(ProcessInsight(
                insight_type="bottleneck",
                title=f"Bottleneck at '{bn.activity}'",
                description=f"Average wait time: {bn.avg_wait_time_ms:.0f}ms, affecting {bn.frequency} cases",
                impact="high" if bn.impact_score > 70 else "medium" if bn.impact_score > 40 else "low",
                suggestion=f"Consider parallelizing or automating the step before '{bn.activity}'",
                confidence=min(95, 60 + bn.impact_score * 0.35),
                affected_cases=bn.frequency
            ))
        
        # 2. 변형 분석
        variants = self.discover_variants(min_frequency=2)
        if len(variants) > 3:
            # 너무 많은 변형 = 비표준화
            insights.append(ProcessInsight(
                insight_type="deviation",
                title="High Process Variation",
                description=f"Found {len(variants)} different process paths. Top path covers only {variants[0].frequency}/{len(self._cases)} cases.",
                impact="medium",
                suggestion="Standardize the process by eliminating unnecessary variations",
                confidence=80,
                affected_cases=sum(v.frequency for v in variants[1:])  # Non-primary paths
            ))
        
        # 3. 효율성 기회
        if variants:
            slowest = max(variants, key=lambda v: v.avg_duration_ms)
            fastest = min(variants, key=lambda v: v.avg_duration_ms)
            
            if slowest.avg_duration_ms > fastest.avg_duration_ms * 2:
                time_diff = slowest.avg_duration_ms - fastest.avg_duration_ms
                insights.append(ProcessInsight(
                    insight_type="opportunity",
                    title="Efficiency Opportunity",
                    description=f"Slowest path takes {time_diff:.0f}ms longer than fastest",
                    impact="high",
                    suggestion=f"Migrate cases from slow path to fast path. Potential time saving: {time_diff * slowest.frequency / 1000:.1f}s total",
                    confidence=85,
                    affected_cases=slowest.frequency
                ))
        
        # 4. 자동화 기회
        activity_counts = defaultdict(int)
        for event in self.events:
            activity_counts[event.activity] += 1
        
        repetitive = [(a, c) for a, c in activity_counts.items() if c > 10]
        if repetitive:
            most_repetitive = max(repetitive, key=lambda x: x[1])
            insights.append(ProcessInsight(
                insight_type="opportunity",
                title=f"Automation Candidate: '{most_repetitive[0]}'",
                description=f"This activity occurs {most_repetitive[1]} times. High automation potential.",
                impact="high",
                suggestion="Consider RPA or API automation for this repetitive task",
                confidence=90,
                affected_cases=most_repetitive[1]
            ))
        
        return insights
    
    # ═══════════════════════════════════════════════════════════════
    # AUTUS Integration
    # ═══════════════════════════════════════════════════════════════
    
    def generate_autus_suggestions(self) -> List[Dict[str, Any]]:
        """
        분석 결과 → AUTUS AI Suggestion 형식으로 변환
        """
        insights = self.analyze()
        suggestions = []
        
        for insight in insights:
            suggestion_type = {
                "bottleneck": "automate",
                "deviation": "merge",
                "opportunity": "eliminate" if "repetitive" in insight.title.lower() else "automate"
            }.get(insight.insight_type, "optimize")
            
            suggestions.append({
                "type": suggestion_type,
                "title": insight.title,
                "confidence": int(insight.confidence),
                "reason": insight.description,
                "simulation": {
                    "time": f"+{min(50, insight.affected_cases // 2)}%",
                    "errors": f"-{min(30, insight.affected_cases // 5)}%",
                    "cost": f"-${min(500, insight.affected_cases * 5)}/mo"
                },
                "alternatives": [
                    insight.suggestion,
                    "Monitor for now",
                    "Ignore"
                ],
                "source": "process_mining",
                "affected_cases": insight.affected_cases
            })
        
        return suggestions


# ═══════════════════════════════════════════════════════════════
# Example: Generate Sample Events from AUTUS Data
# ═══════════════════════════════════════════════════════════════

def generate_sample_events_from_autus(
    tasks: List[Dict[str, Any]],
    actions: List[Dict[str, Any]]
) -> List[ProcessEvent]:
    """
    AUTUS Task/Action 데이터 → Process Mining 이벤트로 변환
    """
    events = []
    
    for task in tasks:
        # Task 생성 이벤트
        events.append(ProcessEvent(
            case_id=task.get("id", str(hash(str(task)))),
            activity="task_created",
            timestamp=datetime.fromisoformat(task.get("created_at", datetime.now().isoformat())),
            resource=task.get("created_by"),
            attributes={"source": task.get("source")}
        ))
        
        # Task 상태 변경 이벤트들
        if task.get("automation", 0) >= 90:
            events.append(ProcessEvent(
                case_id=task.get("id"),
                activity="automated",
                timestamp=datetime.now(),
                attributes={"automation_level": task.get("automation")}
            ))
    
    for action in actions:
        events.append(ProcessEvent(
            case_id=action.get("task_id"),
            activity=action.get("type", "action"),
            timestamp=datetime.fromisoformat(action.get("timestamp", datetime.now().isoformat())),
            resource=action.get("user"),
            duration_ms=action.get("duration_ms")
        ))
    
    return events
