#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Google Sync Service                                 ║
║                          구글 캘린더/주소록 연동 (Zero-Click 수집)                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
- Google Calendar: 상담 일정 자동 추출 → complain_count 계산
- Google Contacts: 학부모 연락처 자동 동기화
- Google Sheets: 학원 관리 스프레드시트 연동 (선택)

Zero-Click의 정의:
- 최초 OAuth 로그인 1회만 하면
- 이후 서버가 자동으로 데이터를 긁어옴
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CalendarEvent:
    """캘린더 이벤트"""
    event_id: str
    summary: str
    start_time: datetime
    end_time: datetime
    is_consult: bool = False      # 상담 관련 여부
    is_complaint: bool = False    # 항의/클레임 여부
    attendees: List[str] = field(default_factory=list)


@dataclass
class ContactInfo:
    """연락처 정보"""
    contact_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "학부모"      # 학부모/학생/기타
    notes: Optional[str] = None


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    source: str                   # calendar/contacts/sheets
    synced_count: int
    consult_count: int = 0        # 상담 횟수
    complaint_count: int = 0      # 항의 횟수
    data: List[Any] = field(default_factory=list)
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 상담/항의 감지 키워드
# ═══════════════════════════════════════════════════════════════════════════════════════════

CONSULT_KEYWORDS = [
    "상담", "면담", "미팅", "학부모", "통화", "방문",
    "meeting", "consult", "parent", "call"
]

COMPLAINT_KEYWORDS = [
    "클레임", "항의", "불만", "환불", "민원", "컴플레인",
    "complaint", "refund", "issue", "problem"
]

POSITIVE_KEYWORDS = [
    "감사", "칭찬", "추천", "연장", "재등록",
    "thank", "recommend", "extend"
]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Calendar Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleCalendarService:
    """
    구글 캘린더 연동 서비스
    
    상담 일정을 자동으로 추출하여 엔트로피(T) 계산에 활용
    """
    
    def __init__(self, access_token: str):
        """
        Args:
            access_token: Google OAuth2 Access Token
        """
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google Calendar API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            # 
            # creds = Credentials(token=self.access_token)
            # self.service = build('calendar', 'v3', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Calendar] 서비스 초기화 실패: {e}")
    
    def fetch_events(self, days: int = 30) -> List[CalendarEvent]:
        """
        최근 N일간의 캘린더 이벤트 조회
        
        Args:
            days: 조회 기간 (기본 30일)
            
        Returns:
            List[CalendarEvent]: 이벤트 목록
        """
        # MVP 단계: Mock 데이터 반환
        # 실제 구현 시 Google Calendar API 호출
        
        mock_events = [
            CalendarEvent(
                event_id="evt_001",
                summary="김영재 학부모 상담",
                start_time=datetime.now() - timedelta(days=5),
                end_time=datetime.now() - timedelta(days=5, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_002", 
                summary="이성실 어머니 면담 - 성적 문의",
                start_time=datetime.now() - timedelta(days=10),
                end_time=datetime.now() - timedelta(days=10, hours=-1),
                is_consult=True,
                is_complaint=False
            ),
            CalendarEvent(
                event_id="evt_003",
                summary="박불만 학부모 클레임 대응",
                start_time=datetime.now() - timedelta(days=3),
                end_time=datetime.now() - timedelta(days=3, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_004",
                summary="최문제 환불 요청 미팅",
                start_time=datetime.now() - timedelta(days=7),
                end_time=datetime.now() - timedelta(days=7, hours=-1),
                is_consult=True,
                is_complaint=True  # 클레임
            ),
            CalendarEvent(
                event_id="evt_005",
                summary="정감사 학부모님 감사 인사",
                start_time=datetime.now() - timedelta(days=2),
                end_time=datetime.now() - timedelta(days=2, hours=-1),
                is_consult=True,
                is_complaint=False  # 긍정적
            ),
        ]
        
        return mock_events
    
    def count_consultations(self, days: int = 30) -> Dict[str, int]:
        """
        상담/항의 횟수 집계
        
        Args:
            days: 집계 기간
            
        Returns:
            Dict: {"total": 전체, "consult": 일반상담, "complaint": 항의}
        """
        events = self.fetch_events(days)
        
        total_consult = 0
        complaint_count = 0
        positive_count = 0
        
        for event in events:
            summary_lower = event.summary.lower()
            
            # 상담 여부 체크
            if any(kw in summary_lower for kw in CONSULT_KEYWORDS):
                total_consult += 1
                
                # 항의/클레임 체크
                if any(kw in summary_lower for kw in COMPLAINT_KEYWORDS):
                    complaint_count += 1
                
                # 긍정적 피드백 체크
                elif any(kw in summary_lower for kw in POSITIVE_KEYWORDS):
                    positive_count += 1
        
        return {
            "total": total_consult,
            "consult": total_consult - complaint_count,
            "complaint": complaint_count,
            "positive": positive_count,
            "net_entropy": complaint_count - positive_count  # 순 엔트로피
        }
    
    def sync(self, days: int = 30) -> SyncResult:
        """
        캘린더 동기화 실행
        
        Returns:
            SyncResult: 동기화 결과
        """
        try:
            events = self.fetch_events(days)
            counts = self.count_consultations(days)
            
            return SyncResult(
                success=True,
                source="calendar",
                synced_count=len(events),
                consult_count=counts["consult"],
                complaint_count=counts["complaint"],
                data=events
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="calendar",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Google Contacts Service
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleContactsService:
    """
    구글 연락처 연동 서비스
    
    학부모 연락처를 자동으로 동기화하여 노드 생성에 활용
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.service = None
        self._init_service()
    
    def _init_service(self):
        """Google People API 서비스 초기화"""
        try:
            # 실제 구현 시 주석 해제
            # from google.oauth2.credentials import Credentials
            # from googleapiclient.discovery import build
            #
            # creds = Credentials(token=self.access_token)
            # self.service = build('people', 'v1', credentials=creds)
            pass
        except Exception as e:
            print(f"[Google Contacts] 서비스 초기화 실패: {e}")
    
    def fetch_contacts(self, max_results: int = 100) -> List[ContactInfo]:
        """
        연락처 목록 조회
        
        Args:
            max_results: 최대 조회 개수
            
        Returns:
            List[ContactInfo]: 연락처 목록
        """
        # MVP 단계: Mock 데이터 반환
        mock_contacts = [
            ContactInfo(
                contact_id="contact_001",
                name="김영재 어머니",
                phone="010-1234-5678",
                email="kim.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_002",
                name="이성실 아버지",
                phone="010-2345-6789",
                email="lee.parent@email.com",
                relation="학부모"
            ),
            ContactInfo(
                contact_id="contact_003",
                name="박평범 어머니",
                phone="010-3456-7890",
                relation="학부모"
            ),
        ]
        
        return mock_contacts
    
    def sync(self) -> SyncResult:
        """
        연락처 동기화 실행
        """
        try:
            contacts = self.fetch_contacts()
            
            return SyncResult(
                success=True,
                source="contacts",
                synced_count=len(contacts),
                data=contacts
            )
        except Exception as e:
            return SyncResult(
                success=False,
                source="contacts",
                synced_count=0,
                error=str(e)
            )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Sync Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GoogleSyncManager:
    """
    Google 서비스 통합 동기화 관리자
    
    Usage:
        manager = GoogleSyncManager(access_token="...")
        results = manager.sync_all()
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_service = GoogleCalendarService(access_token)
        self.contacts_service = GoogleContactsService(access_token)
    
    def sync_all(self, calendar_days: int = 30) -> Dict[str, SyncResult]:
        """
        모든 Google 서비스 동기화
        
        Returns:
            Dict: {"calendar": SyncResult, "contacts": SyncResult}
        """
        return {
            "calendar": self.calendar_service.sync(calendar_days),
            "contacts": self.contacts_service.sync()
        }
    
    def get_entropy_score(self, days: int = 30) -> Dict[str, Any]:
        """
        엔트로피 점수 계산 (SQ 엔진 입력용)
        
        Returns:
            Dict: complain_count와 관련 메타데이터
        """
        counts = self.calendar_service.count_consultations(days)
        
        # 엔트로피 점수 = 항의 횟수 - 긍정 피드백 (최소 0)
        entropy_score = max(0, counts["complaint"] - counts.get("positive", 0))
        
        return {
            "complain_count": counts["complaint"],
            "consult_count": counts["total"],
            "positive_count": counts.get("positive", 0),
            "entropy_score": entropy_score,
            "recommendation": self._get_recommendation(entropy_score)
        }
    
    def _get_recommendation(self, entropy: int) -> str:
        """엔트로피 수준에 따른 권장 조치"""
        if entropy == 0:
            return "✅ 양호: 특별한 조치 불필요"
        elif entropy <= 2:
            return "⚠️ 주의: 정기 상담으로 불만 해소 필요"
        elif entropy <= 5:
            return "🔶 경고: 집중 관리 및 원인 파악 필요"
        else:
            return "🔴 위험: 즉각적인 대응 및 관계 회복 필요"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """Google Sync 데모 실행"""
    print("=" * 70)
    print("  📅 AUTUS-PRIME Google Sync Service Demo")
    print("=" * 70)
    
    # Mock 토큰으로 서비스 초기화
    manager = GoogleSyncManager(access_token="mock_token_for_demo")
    
    # 캘린더 동기화
    print("\n[1] 캘린더 동기화...")
    calendar_result = manager.calendar_service.sync()
    print(f"  ✓ 이벤트 {calendar_result.synced_count}건 동기화")
    print(f"    - 일반 상담: {calendar_result.consult_count}건")
    print(f"    - 항의/클레임: {calendar_result.complaint_count}건")
    
    # 연락처 동기화
    print("\n[2] 연락처 동기화...")
    contacts_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 {contacts_result.synced_count}건 동기화")
    
    # 엔트로피 점수
    print("\n[3] 엔트로피 분석...")
    entropy = manager.get_entropy_score()
    print(f"  📊 엔트로피 점수: {entropy['entropy_score']}")
    print(f"  💡 권장 조치: {entropy['recommendation']}")
    
    print("\n" + "=" * 70)
    print("  ✅ Zero-Click 데이터 수집 준비 완료!")
    print("     → OAuth 연동 후 자동 동기화 가능")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()


























