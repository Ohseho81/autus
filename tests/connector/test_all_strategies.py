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
    
    from packs.integration.selector import IntelligentSelector, SelectionStrategy
    from unittest.mock import patch, AsyncMock
    from packs.integration.openai_connector import OpenAIConnector
    from packs.integration.base import AIResponse
    import time

    dummy_response = AIResponse(
        provider="openai",
        model="gpt-4-turbo",
        content="4",
        time_seconds=0.01,
        tokens_used=10,
        cost_usd=0.0,
        quality_score=1.0,
        metadata={}
    )

    with patch.object(OpenAIConnector, "generate", new=AsyncMock(return_value=dummy_response)):
        selector = IntelligentSelector()

        print("\n1. Fast request:")
        response = await selector.generate(
            "Quick: What is 2+2?",
            strategy=SelectionStrategy.SMART_SELECT
        )
        print(f"Result: {response.content[:100]}")
        print(f"Time: {response.time_seconds:.2f}s")

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
    
    from packs.integration.selector import IntelligentSelector, SelectionStrategy
    from unittest.mock import patch, AsyncMock
    from packs.integration.openai_connector import OpenAIConnector
    from packs.integration.base import AIResponse

    dummy_response = AIResponse(
        provider="openai",
        model="gpt-4-turbo",
        content="안녕하세요",
        time_seconds=0.01,
        tokens_used=10,
        cost_usd=0.0,
        quality_score=1.0,
        metadata={}
    )

    with patch.object(OpenAIConnector, "generate", new=AsyncMock(return_value=dummy_response)):
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
