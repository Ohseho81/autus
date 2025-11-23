"""Data Analyzer 테스트"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.data.collector import DataCollector
from core.data.analyzer import DataAnalyzer

def test_analyzer():
    print("="*60)
    print("📊 Test: Data Analysis")
    print("="*60)
    
    collector = DataCollector()
    analyzer = DataAnalyzer()
    
    # 여러 세션 생성
    for i in range(3):
        collector.start_session()
        
        collector.collect_code_generation(
            prompt=f"Write function {i}",
            response=f"def func_{i}(): pass",
            ai_provider="anthropic" if i % 2 == 0 else "openai",
            time_seconds=2.0 + i * 0.5,
            success=True
        )
        
        collector.collect_pattern_learned(
            pattern_type="code_style",
            pattern_data={"indent": 4},
            confidence=0.8 + i * 0.05
        )
        
        collector.end_session()
    
    # 분석
    stats = analyzer.analyze_sessions(collector.sessions)
    
    print(f"\n📊 Statistics:")
    print(f"  Sessions: {stats.total_sessions}")
    print(f"  Events: {stats.total_events}")
    print(f"  Most Common: {stats.most_common_event}")
    
    # 패턴 분석
    pattern_analysis = analyzer.analyze_patterns(collector.patterns)
    
    print(f"\n🎯 Patterns:")
    print(f"  Total: {pattern_analysis['total_patterns']}")
    if pattern_analysis['most_frequent']:
        print(f"  Most Frequent: {pattern_analysis['most_frequent']['type']}")
    
    # 코드 생성 분석
    code_analysis = analyzer.analyze_code_generation(collector.sessions)
    
    print(f"\n💻 Code Generation:")
    print(f"  Total: {code_analysis['total_generated']}")
    print(f"  Success Rate: {code_analysis['success_rate']:.0%}")
    print(f"  Avg Time: {code_analysis['avg_time']:.2f}s")
    
    # 인사이트
    insights = analyzer.get_insights(collector.sessions, collector.patterns)
    
    print(f"\n💡 Insights:")
    for insight in insights:
        print(f"  • {insight}")
    
    # 리포트
    report = analyzer.generate_report(collector.sessions, collector.patterns)
    
    print(f"\n📝 Report Preview:")
    print(report[:300] + "...")

if __name__ == "__main__":
    print("\n🚀 AUTUS Data Analyzer Test\n")
    test_analyzer()
    print("\n" + "="*60)
    print("✅ All Tests Complete!")
    print("="*60)
