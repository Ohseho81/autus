"""
AUTUS AI Analyzer v14.0
========================
수집된 데이터 AI 분석

기능:
- 이메일 요약 및 우선순위
- 일정 최적화 제안
- 메시지 감성 분석
- 문서 자동 분류
- 인사이트 생성
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from integrations.data_hub import DataHub, DataType, UnifiedData, get_data_hub

logger = logging.getLogger(__name__)

# ============================================
# Analysis Types
# ============================================

class AnalysisType(str, Enum):
    SUMMARY = "summary"           # 요약
    PRIORITY = "priority"         # 우선순위
    SENTIMENT = "sentiment"       # 감성
    CATEGORY = "category"         # 분류
    INSIGHT = "insight"           # 인사이트
    RECOMMENDATION = "recommendation"  # 추천
    ANOMALY = "anomaly"           # 이상 감지

@dataclass
class AnalysisResult:
    """분석 결과"""
    type: AnalysisType
    data_type: DataType
    result: Dict[str, Any]
    confidence: float = 0.0
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

# ============================================
# AI Analyzer
# ============================================

class AIAnalyzer:
    """
    AI 기반 데이터 분석기
    
    수집된 데이터를 분석하여 인사이트 제공
    """
    
    def __init__(self):
        self.data_hub = get_data_hub()
        self.llm_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    
    async def analyze_emails(self, user_id: str) -> List[AnalysisResult]:
        """이메일 분석"""
        data = self.data_hub.get_cached(user_id)
        emails = [d for d in data if d.type == DataType.EMAIL]
        
        if not emails:
            return []
        
        results = []
        
        # 1. 우선순위 분류
        priority_result = self._classify_email_priority(emails)
        results.append(AnalysisResult(
            type=AnalysisType.PRIORITY,
            data_type=DataType.EMAIL,
            result=priority_result,
            confidence=0.85
        ))
        
        # 2. 요약 생성
        summary_result = self._summarize_emails(emails)
        results.append(AnalysisResult(
            type=AnalysisType.SUMMARY,
            data_type=DataType.EMAIL,
            result=summary_result,
            confidence=0.9
        ))
        
        return results
    
    async def analyze_calendar(self, user_id: str) -> List[AnalysisResult]:
        """캘린더 분석"""
        data = self.data_hub.get_cached(user_id)
        events = [d for d in data if d.type == DataType.CALENDAR]
        
        if not events:
            return []
        
        results = []
        
        # 일정 최적화 제안
        optimization = self._optimize_schedule(events)
        results.append(AnalysisResult(
            type=AnalysisType.RECOMMENDATION,
            data_type=DataType.CALENDAR,
            result=optimization,
            confidence=0.8
        ))
        
        return results
    
    async def analyze_messages(self, user_id: str) -> List[AnalysisResult]:
        """메시지 분석"""
        data = self.data_hub.get_cached(user_id)
        messages = [d for d in data if d.type == DataType.MESSAGE]
        
        if not messages:
            return []
        
        results = []
        
        # 감성 분석
        sentiment = self._analyze_sentiment(messages)
        results.append(AnalysisResult(
            type=AnalysisType.SENTIMENT,
            data_type=DataType.MESSAGE,
            result=sentiment,
            confidence=0.75
        ))
        
        return results
    
    async def analyze_all(self, user_id: str) -> Dict[str, List[AnalysisResult]]:
        """전체 분석"""
        return {
            "emails": await self.analyze_emails(user_id),
            "calendar": await self.analyze_calendar(user_id),
            "messages": await self.analyze_messages(user_id),
        }
    
    async def generate_daily_brief(self, user_id: str) -> Dict[str, Any]:
        """일일 브리핑 생성"""
        data = self.data_hub.get_cached(user_id)
        summary = self.data_hub.get_summary(user_id)
        
        # 오늘 일정
        today = datetime.utcnow().date()
        today_events = []
        for d in data:
            if d.type == DataType.CALENDAR:
                event_date = d.metadata.get("start", "")
                if event_date and str(today) in event_date:
                    today_events.append({
                        "title": d.title,
                        "time": event_date,
                        "location": d.metadata.get("location", "")
                    })
        
        # 중요 이메일
        important_emails = []
        for d in data:
            if d.type == DataType.EMAIL:
                # 간단한 우선순위 판단
                if any(kw in d.title.lower() for kw in ["urgent", "긴급", "asap", "important", "중요"]):
                    important_emails.append({
                        "title": d.title,
                        "from": d.metadata.get("from", ""),
                        "preview": d.content[:100]
                    })
        
        # 최근 메시지 요약
        recent_messages = []
        for d in data:
            if d.type == DataType.MESSAGE:
                recent_messages.append({
                    "channel": d.title,
                    "content": d.content[:100]
                })
        
        return {
            "date": str(today),
            "summary": {
                "total_items": summary.get("total", 0),
                "by_type": summary.get("by_type", {})
            },
            "today_events": today_events[:5],
            "important_emails": important_emails[:5],
            "recent_messages": recent_messages[:5],
            "recommendations": self._generate_recommendations(data)
        }
    
    # ============================================
    # Private Methods (Rule-based, LLM 연동 가능)
    # ============================================
    
    def _classify_email_priority(self, emails: List[UnifiedData]) -> Dict:
        """이메일 우선순위 분류"""
        high = []
        medium = []
        low = []
        
        high_keywords = ["urgent", "긴급", "asap", "important", "중요", "deadline", "마감"]
        low_keywords = ["newsletter", "뉴스레터", "unsubscribe", "수신거부", "promotion", "광고"]
        
        for email in emails:
            title_lower = email.title.lower()
            content_lower = email.content.lower()
            
            if any(kw in title_lower or kw in content_lower for kw in high_keywords):
                high.append(email.id)
            elif any(kw in title_lower or kw in content_lower for kw in low_keywords):
                low.append(email.id)
            else:
                medium.append(email.id)
        
        return {
            "high": len(high),
            "medium": len(medium),
            "low": len(low),
            "high_ids": high[:10],
            "low_ids": low[:10]
        }
    
    def _summarize_emails(self, emails: List[UnifiedData]) -> Dict:
        """이메일 요약"""
        # 발신자별 그룹핑
        by_sender = {}
        for email in emails:
            sender = email.metadata.get("from", "unknown")
            if sender not in by_sender:
                by_sender[sender] = []
            by_sender[sender].append(email.title)
        
        # 상위 발신자
        top_senders = sorted(by_sender.items(), key=lambda x: len(x[1]), reverse=True)[:5]
        
        return {
            "total_emails": len(emails),
            "unique_senders": len(by_sender),
            "top_senders": [
                {"sender": s[0], "count": len(s[1]), "subjects": s[1][:3]}
                for s in top_senders
            ]
        }
    
    def _optimize_schedule(self, events: List[UnifiedData]) -> Dict:
        """일정 최적화"""
        recommendations = []
        
        # 연속 회의 감지
        sorted_events = sorted(events, key=lambda e: e.metadata.get("start", ""))
        
        for i, event in enumerate(sorted_events):
            if i > 0:
                prev_end = sorted_events[i-1].metadata.get("end", "")
                curr_start = event.metadata.get("start", "")
                
                # 휴식 없는 연속 회의
                if prev_end and curr_start and prev_end >= curr_start:
                    recommendations.append({
                        "type": "back_to_back",
                        "message": f"'{sorted_events[i-1].title}'와 '{event.title}' 사이에 휴식이 필요합니다",
                        "events": [sorted_events[i-1].id, event.id]
                    })
        
        # 빈 시간대 분석
        return {
            "total_events": len(events),
            "recommendations": recommendations[:5],
            "busy_days": self._find_busy_days(events)
        }
    
    def _find_busy_days(self, events: List[UnifiedData]) -> List[str]:
        """바쁜 날 찾기"""
        by_date = {}
        for event in events:
            date_str = event.metadata.get("start", "")[:10]
            if date_str:
                by_date[date_str] = by_date.get(date_str, 0) + 1
        
        busy = [date for date, count in by_date.items() if count >= 5]
        return sorted(busy)[:5]
    
    def _analyze_sentiment(self, messages: List[UnifiedData]) -> Dict:
        """감성 분석"""
        positive_words = ["좋아", "감사", "축하", "great", "awesome", "thanks", "good", "👍", "🎉"]
        negative_words = ["문제", "이슈", "버그", "error", "issue", "problem", "fail", "😢", "😠"]
        
        positive = 0
        negative = 0
        neutral = 0
        
        for msg in messages:
            content = msg.content.lower()
            
            pos_score = sum(1 for w in positive_words if w in content)
            neg_score = sum(1 for w in negative_words if w in content)
            
            if pos_score > neg_score:
                positive += 1
            elif neg_score > pos_score:
                negative += 1
            else:
                neutral += 1
        
        total = len(messages)
        return {
            "positive": positive,
            "negative": negative,
            "neutral": neutral,
            "positive_rate": positive / total * 100 if total else 0,
            "overall": "positive" if positive > negative else "negative" if negative > positive else "neutral"
        }
    
    def _generate_recommendations(self, data: List[UnifiedData]) -> List[str]:
        """추천 생성"""
        recommendations = []
        
        # 읽지 않은 이메일
        unread_emails = sum(1 for d in data if d.type == DataType.EMAIL)
        if unread_emails > 20:
            recommendations.append(f"📧 {unread_emails}개의 이메일이 있습니다. 정리가 필요해 보입니다.")
        
        # 오늘 일정
        today = datetime.utcnow().date()
        today_events = sum(1 for d in data if d.type == DataType.CALENDAR and str(today) in d.metadata.get("start", ""))
        if today_events >= 5:
            recommendations.append(f"📅 오늘 {today_events}개의 일정이 있습니다. 바쁜 하루가 될 것 같네요!")
        
        # 미답변 메시지
        messages = [d for d in data if d.type == DataType.MESSAGE]
        if messages:
            recommendations.append(f"💬 {len(messages)}개의 새 메시지를 확인하세요.")
        
        return recommendations


# ============================================
# Singleton
# ============================================

_analyzer: Optional[AIAnalyzer] = None

def get_analyzer() -> AIAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = AIAnalyzer()
    return _analyzer
