"""
Personalizer 테스트
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from packs.ai.pattern_learner import PatternLearner
from packs.ai.personalizer import Personalizer
from packs.ai.base import StyleProfile, LearningContext, ContentType
from datetime import datetime

def test_code_personalization():
    print("="*60)
    print("🎨 Test: Code Prompt Personalization")
    print("="*60)
    
    learner = PatternLearner()
    personalizer = Personalizer()
    
    profile = StyleProfile(
        user_id="test_user",
        patterns={},
        preferences={},
        statistics={},
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    sample_code = """
def calculate_fibonacci(n: int) -> int:
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)
"""
    
    context = LearningContext(content=sample_code, content_type=ContentType.CODE)
    profile = learner.update_profile(profile, context)
    
    original_prompt = "Write a function to sort a list"
    result = personalizer.personalize_code_prompt(original_prompt, profile)
    
    print(f"\n📝 Original Prompt:\n{result.original_prompt}")
    print(f"\n✨ Personalized Prompt:\n{result.personalized_prompt}")
    print(f"\n📊 Applied Patterns: {', '.join(result.applied_patterns)}")
    print(f"💪 Confidence: {result.confidence:.2%}")
    print(f"💡 Reasoning: {result.reasoning}")
    
    return result

def test_integration():
    print("\n" + "="*60)
    print("🔄 Test: Full Integration")
    print("="*60)
    
    learner = PatternLearner()
    personalizer = Personalizer()
    
    profile = StyleProfile(
        user_id="test_user",
        patterns={},
        preferences={},
        statistics={},
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    print("\n📚 Learning from multiple code samples...")
    
    codes = [
        'def hello_world():\n    """Say hello."""\n    print("Hello")',
        'def add_numbers(a: int, b: int) -> int:\n    """Add two numbers."""\n    return a + b',
        'def process_list(items):\n    return [x * 2 for x in items if x > 0]'
    ]
    
    for i, code in enumerate(codes, 1):
        context = LearningContext(content=code, content_type=ContentType.CODE)
        profile = learner.update_profile(profile, context)
        print(f"  Sample {i}: {len(profile.patterns)} patterns learned")
    
    print("\n✨ Applying personalization...")
    
    prompts = [
        "Create a function to calculate factorial",
        "Write a class for a simple calculator"
    ]
    
    for prompt in prompts:
        result = personalizer.apply_personalization(prompt, profile, 'code')
        print(f"\n• {prompt}")
        print(f"  Patterns: {len(result.applied_patterns)}, Confidence: {result.confidence:.2%}")

if __name__ == "__main__":
    print("\n🚀 AUTUS Learning Engine - Personalizer Test\n")
    
    result = test_code_personalization()
    test_integration()
    
    print("\n" + "="*60)
    print("✅ All Tests Complete!")
    print("="*60)
