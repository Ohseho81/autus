"""
Pattern Learner 테스트
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from packs.ai.pattern_learner import PatternLearner
from packs.ai.base import StyleProfile, LearningContext, ContentType, PatternType
from datetime import datetime

def test_code_patterns():
    """코드 패턴 학습 테스트"""
    
    print("="*60)
    print("🧪 Test: Code Pattern Learning")
    print("="*60)
    
    learner = PatternLearner()
    
    sample_code = '''
def calculate_fibonacci(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

def process_data(input_list):
    result = [x * 2 for x in input_list if x > 0]
    return result
'''
    
    patterns = learner.learn_from_code(sample_code)
    
    print(f"\n✅ Detected {len(patterns)} patterns:\n")
    
    for pattern in patterns:
        print(f"  • {pattern.pattern_type.value}:")
        print(f"    Confidence: {pattern.confidence:.2f}")
        print(f"    Data: {pattern.pattern_data}")
        print()
    
    return patterns

def test_profile_update():
    """프로필 업데이트 테스트"""
    
    print("="*60)
    print("🧪 Test: Profile Update")
    print("="*60)
    
    learner = PatternLearner()
    
    profile = StyleProfile(
        user_id="test_user",
        patterns={},
        preferences={},
        statistics={},
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    code_samples = [
        'def hello_world():\n    print("Hello")',
        'def another_function():\n    return 42',
        'def yet_another():\n    pass'
    ]
    
    for i, code in enumerate(code_samples, 1):
        context = LearningContext(
            content=code,
            content_type=ContentType.CODE
        )
        
        profile = learner.update_profile(profile, context)
        print(f"\nAfter sample {i}: {len(profile.patterns)} patterns")
    
    print("\n✅ Final Profile:")
    for pattern_type, pattern in profile.patterns.items():
        print(f"  • {pattern_type}: freq={pattern.frequency}, conf={pattern.confidence:.2f}")
    
    return profile

if __name__ == "__main__":
    print("\n🚀 AUTUS Learning Engine - Pattern Learner Test\n")
    
    patterns = test_code_patterns()
    profile = test_profile_update()
    
    print("\n" + "="*60)
    print("✅ All Tests Complete!")
    print("="*60)
