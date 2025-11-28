"""
간단한 벤치마크
"""

import asyncio
import time
import logging
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

logging.basicConfig(level=logging.WARNING)

async def benchmark():
    print("="*60)
    print("⚡ AUTUS Performance Benchmark")
    print("="*60)
    
    from packs.integration.selector import IntelligentSelector
    
    selector = IntelligentSelector()
    
    prompts = [
        "What is 2+2?",
        "Translate good morning to Spanish",
        "Write hello world in Python",
    ]
    
    print("\nRunning 3 requests...")
    
    times = []
    costs = []
    
    for i, prompt in enumerate(prompts, 1):
        start = time.time()
        response = await selector.generate(prompt)
        elapsed = time.time() - start
        
        times.append(elapsed)
        costs.append(response.cost_usd)
        
        print(f"{i}. {prompt:40} | {elapsed:5.2f}s | ${response.cost_usd:.6f}")
    
    print("\n" + "="*60)
    print("📊 Results")
    print("="*60)
    print(f"Average Time: {sum(times)/len(times):.2f}s")
    print(f"Total Cost: ${sum(costs):.6f}")
    
    import json
    print("\nConnector Status:")
    print(json.dumps(selector.get_status(), indent=2))

if __name__ == "__main__":
    asyncio.run(benchmark())
