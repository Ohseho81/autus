"""
모든 전략 테스트
"""

import asyncio
import pytest

pytestmark = pytest.mark.asyncio
import logging
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

logging.basicConfig(level=logging.INFO, format="%(message)s")

async def test_smart_select():
    """Smart Select 테스트"""
    print("\n" + "="*60)
    print("🧠 Smart Select Test")
    print("="*60)
    
    from core.connector.selector import IntelligentSelector, SelectionStrategy
    
    selector = IntelligentSelector()
    
    # 빠른 요청
    print("\n1. Fast request:")
    response = await selector.generate(
        "Quick: What is 2+2?",
        strategy=SelectionStrategy.SMART_SELECT
    )
    print(f"Result: {response.content[:100]}")
    print(f"Time: {response.time_seconds:.2f}s")
    
    # 복잡한 요청  
    print("\n2. Complex request:")
    response = await selector.generate(
        "Write a comprehensive explanation of binary search",
        strategy=SelectionStrategy.SMART_SELECT
    )
    print(f"Result: {response.content[:200]}...")
    print(f"Time: {response.time_seconds:.2f}s")
    
    return selector

async def test_priority_cascade():
    """Priority Cascade 테스트"""
    print("\n" + "="*60)
    print("🎯 Priority Cascade Test")
    print("="*60)
    
    from core.connector.selector import IntelligentSelector, SelectionStrategy
    
    selector = IntelligentSelector()
    
    response = await selector.generate(
        "Translate hello to Korean",
        strategy=SelectionStrategy.PRIORITY_CASCADE
    )
    
    print(f"\nResult: {response.content}")
    print(f"Provider: {response.provider}")
    print(f"Time: {response.time_seconds:.2f}s")
    
    return selector

async def main():
    print("="*60)
    print("🚀 AUTUS - All Strategies Test")
    print("="*60)
    
    try:
        await test_smart_select()
        await test_priority_cascade()
        
        print("\n" + "="*60)
        print("✅ All Tests Passed!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
