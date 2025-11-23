"""
AUTUS Multi-AI Connector Test
"""

import asyncio
import logging
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)

async def main():
    print("="*60)
    print("🚀 AUTUS Multi-AI Connector Test")
    print("="*60)
    print()
    
    try:
        from core.connector.selector import IntelligentSelector, SelectionStrategy
        
        selector = IntelligentSelector()
        
        print("\n" + "="*60)
        print("Test: Parallel Race")
        print("="*60)
        
        response = await selector.generate(
            "Write a Python function to calculate fibonacci numbers",
            strategy=SelectionStrategy.PARALLEL_RACE
        )
        
        print(f"\n✅ Response received!")
        print(f"Provider: {response.provider}")
        print(f"Model: {response.model}")
        print(f"Time: {response.time_seconds:.2f}s")
        print(f"Tokens: {response.tokens_used}")
        print(f"Cost: ${response.cost_usd:.6f}")
        print(f"Quality: {response.quality_score:.2f}")
        print(f"\nContent:\n{'-'*60}")
        print(response.content)
        print('-'*60)
        
        print("\n" + "="*60)
        print("Connector Status:")
        print("="*60)
        
        import json
        print(json.dumps(selector.get_status(), indent=2))
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
