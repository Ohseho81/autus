"""
Data Collector 테스트
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.data.collector import DataCollector
from core.data.base import EventType, DataSource

def test_session():
    print("="*60)
    print("🧪 Test: Session Management")
    print("="*60)
    
    collector = DataCollector()
    
    # 세션 시작
    session_id = collector.start_session()
    print(f"\n✅ Session started: {session_id[:8]}...")
    
    # 이벤트 수집
    collector.collect_code_generation(
        prompt="Write a function",
        response="def hello(): pass",
        ai_provider="openai",
        time_seconds=2.5,
        success=True
    )
    
    print("✅ Event collected")
    
    # 요약
    summary = collector.get_session_summary()
    print(f"\n📊 Session Summary:")
    print(f"  Events: {summary['events_count']}")
    print(f"  Types: {summary['summary']}")
    
    # 세션 종료
    collector.end_session()
    print("\n✅ Session ended")

def test_pattern_collection():
    print("\n" + "="*60)
    print("🧪 Test: Pattern Collection")
    print("="*60)
    
    collector = DataCollector()
    collector.start_session()
    
    # 여러 패턴 학습
    for i in range(3):
        collector.collect_pattern_learned(
            pattern_type="code_style",
            pattern_data={"indent": 4},
            confidence=0.7 + i * 0.1
        )
    
    # 패턴 요약
    patterns = collector.get_patterns_summary()
    print(f"\n📊 Patterns Summary:")
    print(f"  Total: {patterns['total_patterns']}")
    
    for p in patterns['patterns']:
        print(f"\n  • {p['type']}:")
        print(f"    Frequency: {p['frequency']}")
        print(f"    Effectiveness: {p['effectiveness']:.2f}")
    
    collector.end_session()

if __name__ == "__main__":
    print("\n🚀 AUTUS Data Engine - Collector Test\n")
    
    test_session()
    test_pattern_collection()
    
    print("\n" + "="*60)
    print("✅ All Tests Complete!")
    print("="*60)
