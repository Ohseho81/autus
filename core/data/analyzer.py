"""
Data Analyzer - 수집된 데이터 분석 및 인사이트 추출
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import Counter

from .base import DataSession, UsagePattern, DataStats, EventType

class DataAnalyzer:
    """
    데이터 분석 및 인사이트 추출
    """
    
    def __init__(self):
        pass
    
    def analyze_sessions(self, sessions: List[DataSession]) -> DataStats:
        """세션들을 분석하여 통계 생성"""
        
        if not sessions:
            return DataStats()
        
        total_events = sum(len(s.events) for s in sessions)
        total_sessions = len(sessions)
        
        # 세션 길이 계산
        session_lengths = []
        for session in sessions:
            if session.ended_at and session.started_at:
                length = (session.ended_at - session.started_at).total_seconds()
                session_lengths.append(length)
        
        avg_session_length = sum(session_lengths) / len(session_lengths) if session_lengths else 0
        
        # 가장 많은 이벤트 타입
        event_types = []
        for session in sessions:
            for event in session.events:
                event_types.append(event.event_type.value)
        
        most_common = Counter(event_types).most_common(1)
        most_common_event = most_common[0][0] if most_common else None
        
        # 기간
        all_timestamps = []
        for session in sessions:
            all_timestamps.append(session.started_at)
            if session.ended_at:
                all_timestamps.append(session.ended_at)
        
        period_start = min(all_timestamps) if all_timestamps else None
        period_end = max(all_timestamps) if all_timestamps else None
        
        return DataStats(
            total_events=total_events,
            total_sessions=total_sessions,
            patterns_discovered=0,  # 나중에 업데이트
            avg_session_length=avg_session_length,
            most_common_event=most_common_event,
            period_start=period_start,
            period_end=period_end
        )
    
    def analyze_patterns(self, patterns: Dict[str, UsagePattern]) -> Dict[str, Any]:
        """패턴 분석"""
        
        if not patterns:
            return {
                'total_patterns': 0,
                'most_frequent': None,
                'most_effective': None,
                'insights': []
            }
        
        # 가장 빈번한 패턴
        most_frequent = max(patterns.values(), key=lambda p: p.frequency)
        
        # 가장 효과적인 패턴
        most_effective = max(patterns.values(), key=lambda p: p.effectiveness)
        
        # 인사이트 생성
        insights = []
        
        for pattern in patterns.values():
            if pattern.frequency > 10:
                insights.append(f"Pattern '{pattern.pattern_type}' is very common (used {pattern.frequency} times)")
            
            if pattern.effectiveness > 0.8:
                insights.append(f"Pattern '{pattern.pattern_type}' is highly effective ({pattern.effectiveness:.0%})")
        
        return {
            'total_patterns': len(patterns),
            'most_frequent': {
                'type': most_frequent.pattern_type,
                'frequency': most_frequent.frequency
            },
            'most_effective': {
                'type': most_effective.pattern_type,
                'effectiveness': most_effective.effectiveness
            },
            'insights': insights
        }
    
    def analyze_code_generation(self, sessions: List[DataSession]) -> Dict[str, Any]:
        """코드 생성 분석"""
        
        code_events = []
        
        for session in sessions:
            for event in session.events:
                if event.event_type == EventType.CODE_GENERATED:
                    code_events.append(event)
        
        if not code_events:
            return {
                'total_generated': 0,
                'success_rate': 0,
                'avg_time': 0,
                'providers': {}
            }
        
        # 성공률
        successful = sum(1 for e in code_events if e.data.get('success', False))
        success_rate = successful / len(code_events) if code_events else 0
        
        # 평균 시간
        times = [e.data.get('time_seconds', 0) for e in code_events]
        avg_time = sum(times) / len(times) if times else 0
        
        # 제공자별 통계
        providers = {}
        for event in code_events:
            provider = event.data.get('ai_provider', 'unknown')
            if provider not in providers:
                providers[provider] = {'count': 0, 'success': 0, 'total_time': 0}
            
            providers[provider]['count'] += 1
            if event.data.get('success', False):
                providers[provider]['success'] += 1
            providers[provider]['total_time'] += event.data.get('time_seconds', 0)
        
        # 제공자별 평균 계산
        for provider, stats in providers.items():
            stats['success_rate'] = stats['success'] / stats['count'] if stats['count'] > 0 else 0
            stats['avg_time'] = stats['total_time'] / stats['count'] if stats['count'] > 0 else 0
        
        return {
            'total_generated': len(code_events),
            'success_rate': success_rate,
            'avg_time': avg_time,
            'providers': providers
        }
    
    def get_insights(
        self,
        sessions: List[DataSession],
        patterns: Dict[str, UsagePattern]
    ) -> List[str]:
        """전체 인사이트 생성"""
        
        insights = []
        
        # 세션 분석
        stats = self.analyze_sessions(sessions)
        
        if stats.total_sessions > 0:
            insights.append(f"You've had {stats.total_sessions} sessions with {stats.total_events} total events")
        
        if stats.avg_session_length > 0:
            mins = int(stats.avg_session_length / 60)
            insights.append(f"Average session length: {mins} minutes")
        
        # 패턴 분석
        pattern_analysis = self.analyze_patterns(patterns)
        
        if pattern_analysis['total_patterns'] > 0:
            insights.append(f"Discovered {pattern_analysis['total_patterns']} unique patterns")
        
        if pattern_analysis['most_frequent']:
            insights.append(
                f"Most used pattern: {pattern_analysis['most_frequent']['type']} "
                f"({pattern_analysis['most_frequent']['frequency']} times)"
            )
        
        # 코드 생성 분석
        code_analysis = self.analyze_code_generation(sessions)
        
        if code_analysis['total_generated'] > 0:
            insights.append(
                f"Generated {code_analysis['total_generated']} code snippets "
                f"with {code_analysis['success_rate']:.0%} success rate"
            )
            
            insights.append(f"Average generation time: {code_analysis['avg_time']:.2f}s")
        
        return insights
    
    def generate_report(
        self,
        sessions: List[DataSession],
        patterns: Dict[str, UsagePattern]
    ) -> str:
        """종합 리포트 생성"""
        
        report = "# AUTUS Usage Report\n\n"
        
        # 통계
        stats = self.analyze_sessions(sessions)
        report += "## Statistics\n\n"
        report += f"- **Total Sessions**: {stats.total_sessions}\n"
        report += f"- **Total Events**: {stats.total_events}\n"
        report += f"- **Avg Session Length**: {stats.avg_session_length/60:.1f} minutes\n"
        report += f"- **Most Common Event**: {stats.most_common_event}\n\n"
        
        # 패턴
        pattern_analysis = self.analyze_patterns(patterns)
        report += "## Patterns\n\n"
        report += f"- **Total Patterns**: {pattern_analysis['total_patterns']}\n"
        
        if pattern_analysis['most_frequent']:
            report += f"- **Most Frequent**: {pattern_analysis['most_frequent']['type']} "
            report += f"({pattern_analysis['most_frequent']['frequency']} uses)\n"
        
        if pattern_analysis['most_effective']:
            report += f"- **Most Effective**: {pattern_analysis['most_effective']['type']} "
            report += f"({pattern_analysis['most_effective']['effectiveness']:.0%})\n"
        
        report += "\n"
        
        # 코드 생성
        code_analysis = self.analyze_code_generation(sessions)
        report += "## Code Generation\n\n"
        report += f"- **Total Generated**: {code_analysis['total_generated']}\n"
        report += f"- **Success Rate**: {code_analysis['success_rate']:.0%}\n"
        report += f"- **Avg Time**: {code_analysis['avg_time']:.2f}s\n\n"
        
        if code_analysis['providers']:
            report += "### By Provider\n\n"
            for provider, stats in code_analysis['providers'].items():
                report += f"- **{provider}**: {stats['count']} generations, "
                report += f"{stats['success_rate']:.0%} success, "
                report += f"{stats['avg_time']:.2f}s avg\n"
        
        # 인사이트
        insights = self.get_insights(sessions, patterns)
        if insights:
            report += "\n## Insights\n\n"
            for insight in insights:
                report += f"- {insight}\n"
        
        return report
