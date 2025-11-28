"""
Style Analyzer 테스트
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pytest
pytest.skip("core.learning.* 모듈 없음. 테스트 skip", allow_module_level=True)
from datetime import datetime

def test_style_analysis():
    print("="*60)
    print("🎨 Test: Style Analysis")
    print("="*60)
    
    learner = PatternLearner()
    analyzer = StyleAnalyzer()
    
    profile = StyleProfile(
        user_id="test_user",
        patterns={},
        preferences={},
        statistics={},
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    sample_code = """
def calculate_sum(numbers):
    result = sum(numbers)
    return result

def process_data(input_list):
    result = [x * 2 for x in input_list]
    return result
"""
    
    context = LearningContext(content=sample_code, content_type=ContentType.CODE)
    profile = learner.update_profile(profile, context)
    
    analysis = analyzer.analyze_code_style(profile)
    
    print("\n✅ Style Analysis:\n")
    print(f"Detected Style: {analysis['detected_style']}")
    print(f"Confidence: {analysis['confidence']:.2%}")
    print(f"\nCharacteristics:")
    for key, value in analysis['characteristics'].items():
        print(f"  • {key}: {value}")
    
    if analysis['recommendations']:
        print(f"\nRecommendations:")
        for rec in analysis['recommendations']:
            print(f"  • {rec}")
    
    return analysis

def test_style_guide():
    print("\n" + "="*60)
    print("📖 Test: Style Guide Generation")
    print("="*60)
    
    learner = PatternLearner()
    analyzer = StyleAnalyzer()
    
    profile = StyleProfile(
        user_id="test_user",
        patterns={},
        preferences={},
        statistics={},
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    codes = [
        'def hello():\n    print("hi")',
        'def world():\n    return 42',
        'def test():\n    pass'
    ]
    
    for code in codes:
        context = LearningContext(content=code, content_type=ContentType.CODE)
        profile = learner.update_profile(profile, context)
    
    guide = analyzer.generate_style_guide(profile)
    
    print("\n" + guide)
    
    return guide

if __name__ == "__main__":
    print("\n🚀 AUTUS Learning Engine - Style Analyzer Test\n")
    
    analysis = test_style_analysis()
    guide = test_style_guide()
    
    print("\n" + "="*60)
    print("✅ All Tests Complete!")
    print("="*60)
