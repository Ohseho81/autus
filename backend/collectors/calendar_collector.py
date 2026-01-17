# ═══════════════════════════════════════════════════════════════════════════════
#
#                     AUTUS OAuth 데이터 수집기
#                     
#                     Part 2: Google Calendar 수집기
#
# ═══════════════════════════════════════════════════════════════════════════════

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

from .gmail_collector import (
    BaseCollector, 
    DataSourceType, 
    NodeContribution,
    OAuthTokens
)


class CalendarCollector(BaseCollector):
    """
    Google Calendar 데이터 수집기
    
    수집 데이터:
        - 이벤트 (회의, 일정)
        - 참석자 정보
        - 시간 사용 패턴
    
    노드 매핑:
        - TIME_A: 가용 시간 자산
        - TIME_D: 시간 사용 변화
        - TIME_E: 시간 활용 효율
        - WORK_A: 업무 시간
        - NET_A: 미팅 네트워크
    
    슬롯 매핑:
        - 참석자 → COLLEAGUE, CLIENT, PARTNER 등
    """
    
    CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"
    
    @property
    def source_type(self) -> DataSourceType:
        return DataSourceType.CALENDAR
    
    @property
    def auth_url(self) -> str:
        return "https://accounts.google.com/o/oauth2/v2/auth"
    
    @property
    def token_url(self) -> str:
        return "https://oauth2.googleapis.com/token"
    
    @property
    def scopes(self) -> List[str]:
        return [
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events.readonly",
        ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # 데이터 수집
    # ─────────────────────────────────────────────────────────────────────────
    
    async def fetch_data(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """캘린더 이벤트 수집"""
        events = []
        
        # 기본: 최근 30일
        if not since:
            since = datetime.now() - timedelta(days=30)
        
        until = datetime.now() + timedelta(days=7)  # 향후 7일 포함
        
        # 캘린더 목록 가져오기
        calendars = await self._get_calendars()
        
        # 각 캘린더에서 이벤트 수집
        for calendar in calendars:
            calendar_id = calendar["id"]
            calendar_events = await self._get_events(
                calendar_id, 
                time_min=since, 
                time_max=until
            )
            
            for event in calendar_events:
                event["calendar_id"] = calendar_id
                event["calendar_name"] = calendar.get("summary", "")
                events.append(event)
        
        return events
    
    async def _get_calendars(self) -> List[Dict[str, Any]]:
        """캘린더 목록 조회"""
        url = f"{self.CALENDAR_API_BASE}/users/me/calendarList"
        result = await self._api_request("GET", url)
        return result.get("items", [])
    
    async def _get_events(
        self, 
        calendar_id: str,
        time_min: datetime,
        time_max: datetime
    ) -> List[Dict[str, Any]]:
        """특정 캘린더의 이벤트 조회"""
        url = f"{self.CALENDAR_API_BASE}/calendars/{calendar_id}/events"
        params = {
            "timeMin": time_min.isoformat() + "Z",
            "timeMax": time_max.isoformat() + "Z",
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": 250,
        }
        
        result = await self._api_request("GET", url, params=params)
        return result.get("items", [])
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노드 매핑
    # ─────────────────────────────────────────────────────────────────────────
    
    def map_to_nodes(self, data: List[Dict[str, Any]]) -> List[NodeContribution]:
        """캘린더 데이터 → 48노드 매핑"""
        contributions = []
        
        if not data:
            return contributions
        
        # 분석 기간 계산
        now = datetime.now()
        
        # 이벤트 분류
        past_events = []
        future_events = []
        
        for event in data:
            start = self._parse_event_time(event.get("start", {}))
            if not start:
                continue
            
            if start < now:
                past_events.append(event)
            else:
                future_events.append(event)
        
        # 시간 사용 분석
        total_hours_past = self._calculate_total_hours(past_events)
        total_hours_future = self._calculate_total_hours(future_events)
        
        # 회의 분석
        meeting_count = sum(1 for e in data if self._is_meeting(e))
        solo_event_count = len(data) - meeting_count
        
        # 참석자 분석
        unique_attendees = set()
        for event in data:
            for attendee in event.get("attendees", []):
                email = attendee.get("email", "")
                if email and not email.endswith("calendar.google.com"):
                    unique_attendees.add(email)
        
        # 1. TIME_A: 가용 시간 (향후 일정 기준)
        # 주 168시간 기준, 일정 없는 시간 = 가용 시간
        weekly_hours = 168
        work_hours = 40  # 주 40시간 근무 가정
        scheduled_hours = total_hours_future * (7 / max(len(future_events), 1))
        available_ratio = (work_hours - scheduled_hours) / work_hours
        time_a_value = max(-1.0, min(1.0, available_ratio))
        
        contributions.append(NodeContribution(
            node_id="TIME_A",
            value=time_a_value,
            weight=0.3,
            source="calendar",
            raw_metric={
                "scheduled_hours_weekly": scheduled_hours,
                "available_ratio": available_ratio
            },
            confidence=0.75
        ))
        
        # 2. TIME_D: 시간 사용 변화 (회의 증가/감소)
        # 과거 vs 미래 비교
        past_weekly = total_hours_past / 4 if past_events else 0
        future_weekly = total_hours_future
        change_ratio = (future_weekly - past_weekly) / max(past_weekly, 1)
        time_d_value = max(-1.0, min(1.0, -change_ratio))  # 회의 감소 = +
        
        contributions.append(NodeContribution(
            node_id="TIME_D",
            value=time_d_value,
            weight=0.25,
            source="calendar",
            raw_metric={
                "past_weekly_hours": past_weekly,
                "future_weekly_hours": future_weekly
            },
            confidence=0.7
        ))
        
        # 3. TIME_E: 시간 활용 효율 (회의 길이, 버퍼 등)
        avg_duration = self._calculate_avg_duration(data)
        # 30분 회의 = 효율적, 2시간+ = 비효율
        efficiency = 1.0 - ((avg_duration - 30) / 90) if avg_duration else 0.5
        time_e_value = max(-1.0, min(1.0, efficiency))
        
        contributions.append(NodeContribution(
            node_id="TIME_E",
            value=time_e_value,
            weight=0.25,
            source="calendar",
            raw_metric={"avg_duration_minutes": avg_duration},
            confidence=0.65
        ))
        
        # 4. WORK_A: 업무 시간 (전체 일정 중 업무 비율)
        work_events = sum(1 for e in data if self._is_work_event(e))
        work_ratio = work_events / max(len(data), 1)
        work_a_value = (work_ratio - 0.5) * 2  # 50% = 0
        
        contributions.append(NodeContribution(
            node_id="WORK_A",
            value=max(-1.0, min(1.0, work_a_value)),
            weight=0.2,
            source="calendar",
            raw_metric={"work_ratio": work_ratio},
            confidence=0.6
        ))
        
        # 5. NET_A: 미팅 네트워크 (참석자 다양성)
        # 50명 이상 = +1, 10명 이하 = -0.5
        network_value = min(1.0, (len(unique_attendees) - 10) / 40)
        
        contributions.append(NodeContribution(
            node_id="NET_A",
            value=network_value,
            weight=0.2,
            source="calendar",
            raw_metric={"unique_attendees": len(unique_attendees)},
            confidence=0.7
        ))
        
        # 6. WORK_D: 미팅 대 개인 작업 비율
        meeting_ratio = meeting_count / max(len(data), 1)
        # 30% 미팅 = 균형 = 0, 70% = -0.8, 10% = +0.4
        work_d_value = (0.3 - meeting_ratio) * 2.5
        
        contributions.append(NodeContribution(
            node_id="WORK_D",
            value=max(-1.0, min(1.0, work_d_value)),
            weight=0.2,
            source="calendar",
            raw_metric={
                "meeting_count": meeting_count,
                "meeting_ratio": meeting_ratio
            },
            confidence=0.65
        ))
        
        return contributions
    
    # ─────────────────────────────────────────────────────────────────────────
    # 슬롯 매핑
    # ─────────────────────────────────────────────────────────────────────────
    
    def map_to_slots(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """캘린더 데이터 → 144슬롯 매핑"""
        # 참석자별 상호작용 집계
        attendee_interactions: Dict[str, Dict] = {}
        
        for event in data:
            attendees = event.get("attendees", [])
            event_time = self._parse_event_time(event.get("start", {}))
            
            for attendee in attendees:
                email = attendee.get("email", "")
                if not email or email.endswith("calendar.google.com"):
                    continue
                
                if email not in attendee_interactions:
                    attendee_interactions[email] = {
                        "email": email,
                        "name": attendee.get("displayName", ""),
                        "meeting_count": 0,
                        "total_hours": 0,
                        "last_meeting": None,
                        "response_status": [],
                    }
                
                attendee_interactions[email]["meeting_count"] += 1
                attendee_interactions[email]["total_hours"] += self._get_event_duration(event)
                
                if event_time:
                    if not attendee_interactions[email]["last_meeting"]:
                        attendee_interactions[email]["last_meeting"] = event_time
                    else:
                        attendee_interactions[email]["last_meeting"] = max(
                            attendee_interactions[email]["last_meeting"],
                            event_time
                        )
                
                status = attendee.get("responseStatus", "")
                if status:
                    attendee_interactions[email]["response_status"].append(status)
        
        # 점수 계산
        for email, data in attendee_interactions.items():
            # 기본 점수 = 미팅 수 × 응답률
            accepted_count = data["response_status"].count("accepted")
            response_rate = accepted_count / max(len(data["response_status"]), 1)
            
            data["interaction_score"] = data["meeting_count"] * (0.5 + response_rate * 0.5)
            data["response_rate"] = response_rate
        
        # 정렬
        sorted_attendees = sorted(
            attendee_interactions.values(),
            key=lambda x: x["interaction_score"],
            reverse=True
        )[:50]
        
        # 슬롯 후보 생성
        slot_candidates = []
        for attendee in sorted_attendees:
            relation_type = self._infer_relation_type(attendee["email"])
            
            # I-score 계산
            i_score = min(1.0, attendee["interaction_score"] / 20)
            
            slot_candidates.append({
                "email": attendee["email"],
                "name": attendee.get("name", ""),
                "relation_type": relation_type,
                "i_score": i_score,
                "interaction_count": attendee["meeting_count"],
                "total_hours": attendee["total_hours"],
                "response_rate": attendee["response_rate"],
                "last_interaction": attendee["last_meeting"].isoformat() if attendee["last_meeting"] else None,
            })
        
        return {
            "candidates": slot_candidates,
            "total_attendees": len(attendee_interactions),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 헬퍼 메서드
    # ─────────────────────────────────────────────────────────────────────────
    
    def _parse_event_time(self, time_obj: Dict) -> Optional[datetime]:
        """이벤트 시간 파싱"""
        if "dateTime" in time_obj:
            try:
                dt_str = time_obj["dateTime"]
                # ISO 형식 파싱
                if "+" in dt_str or dt_str.endswith("Z"):
                    dt_str = dt_str.replace("Z", "+00:00")
                    return datetime.fromisoformat(dt_str.replace("+", "+").split("+")[0])
                return datetime.fromisoformat(dt_str)
            except:
                return None
        elif "date" in time_obj:
            try:
                return datetime.strptime(time_obj["date"], "%Y-%m-%d")
            except:
                return None
        return None
    
    def _get_event_duration(self, event: Dict) -> float:
        """이벤트 길이 (시간)"""
        start = self._parse_event_time(event.get("start", {}))
        end = self._parse_event_time(event.get("end", {}))
        
        if start and end:
            delta = end - start
            return delta.total_seconds() / 3600
        return 0
    
    def _calculate_total_hours(self, events: List[Dict]) -> float:
        """총 이벤트 시간"""
        return sum(self._get_event_duration(e) for e in events)
    
    def _calculate_avg_duration(self, events: List[Dict]) -> float:
        """평균 이벤트 길이 (분)"""
        if not events:
            return 0
        
        durations = [self._get_event_duration(e) * 60 for e in events]
        durations = [d for d in durations if d > 0]
        
        return sum(durations) / len(durations) if durations else 0
    
    def _is_meeting(self, event: Dict) -> bool:
        """미팅 여부 (참석자 있음)"""
        attendees = event.get("attendees", [])
        return len(attendees) > 1
    
    def _is_work_event(self, event: Dict) -> bool:
        """업무 이벤트 여부"""
        # 휴리스틱: 제목에 특정 키워드
        summary = event.get("summary", "").lower()
        
        personal_keywords = ["점심", "lunch", "저녁", "dinner", "운동", "gym", "휴가", "vacation", "생일", "birthday"]
        
        return not any(k in summary for k in personal_keywords)
    
    def _infer_relation_type(self, email: str) -> str:
        """이메일로 관계 유형 추론"""
        domain = email.split("@")[-1].lower() if "@" in email else ""
        
        # 같은 회사
        company_domains = ["mycompany.com"]  # 설정 필요
        
        if domain in company_domains:
            return "COLLEAGUE"
        elif domain in ["gmail.com", "yahoo.com", "hotmail.com", "naver.com"]:
            return "FRIEND"
        else:
            return "CLIENT"


# ═══════════════════════════════════════════════════════════════════════════════
# Free/Busy 분석
# ═══════════════════════════════════════════════════════════════════════════════

class CalendarAnalyzer:
    """캘린더 심화 분석"""
    
    def __init__(self, collector: CalendarCollector):
        self.collector = collector
    
    async def get_free_busy(
        self, 
        time_min: datetime, 
        time_max: datetime,
        calendars: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Free/Busy 정보 조회"""
        url = f"{self.collector.CALENDAR_API_BASE}/freeBusy"
        
        if not calendars:
            calendar_list = await self.collector._get_calendars()
            calendars = [c["id"] for c in calendar_list]
        
        body = {
            "timeMin": time_min.isoformat() + "Z",
            "timeMax": time_max.isoformat() + "Z",
            "items": [{"id": cal_id} for cal_id in calendars]
        }
        
        result = await self.collector._api_request("POST", url, json=body)
        return result
    
    def calculate_availability(self, free_busy: Dict, work_hours: Tuple[int, int] = (9, 18)) -> Dict[str, float]:
        """가용성 계산"""
        calendars = free_busy.get("calendars", {})
        
        availability = {}
        
        for cal_id, cal_data in calendars.items():
            busy_periods = cal_data.get("busy", [])
            
            total_busy_hours = 0
            for period in busy_periods:
                start = datetime.fromisoformat(period["start"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(period["end"].replace("Z", "+00:00"))
                
                # 업무 시간 내만 계산
                if start.hour >= work_hours[0] and end.hour <= work_hours[1]:
                    total_busy_hours += (end - start).total_seconds() / 3600
            
            # 일일 업무 시간 대비 바쁜 시간
            work_day_hours = work_hours[1] - work_hours[0]
            busy_ratio = total_busy_hours / work_day_hours if work_day_hours else 0
            
            availability[cal_id] = {
                "busy_hours": total_busy_hours,
                "availability_ratio": 1 - busy_ratio,
            }
        
        return availability


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예시
# ═══════════════════════════════════════════════════════════════════════════════

"""
# 1. 초기화 (Gmail과 같은 Google OAuth 사용 가능)
collector = CalendarCollector(
    client_id="your-client-id",
    client_secret="your-client-secret",
    redirect_uri="http://localhost:8000/auth/callback/calendar"
)

# 2. OAuth (Gmail과 동일)
auth_url = collector.get_authorization_url()
tokens = await collector.exchange_code(code="received-code")

# 3. 데이터 수집
since = datetime.now() - timedelta(days=30)
collected = await collector.collect(since=since)

print(f"Collected {collected.metadata['collected_count']} events")
print(f"Node mappings: {collected.node_mappings}")

# 4. Free/Busy 분석
analyzer = CalendarAnalyzer(collector)
free_busy = await analyzer.get_free_busy(
    datetime.now(),
    datetime.now() + timedelta(days=7)
)
availability = analyzer.calculate_availability(free_busy)

# 5. 정리
await collector.close()
"""
