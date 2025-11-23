#!/usr/bin/env python3
"""생성된 코드를 파일로 저장"""
import re

# 방금 생성된 결과에서 코드 추출 예시
code_samples = {
    'benchmark_performance.py': '''import time
from typing import Callable, Any

def identity(x: Any) -> Any:
    """Returns the input without any changes."""
    return x

def workflow(func: Callable[[Any], Any], value: Any, iterations: int = 1000) -> None:
    """Executes a function multiple times and measures performance."""
    start_time = time.time()
    for _ in range(iterations):
        func(value)
    end_time = time.time()
    
    elapsed_time = end_time - start_time
    ops_per_second = iterations / elapsed_time
    
    print(f"Execution time: {elapsed_time:.4f} seconds")
    print(f"Operations per second: {ops_per_second:.2f} ops/sec")

if __name__ == "__main__":
    workflow(identity, "test", 1000)
''',

    'demo_identity.py': '''import random
from typing import List, Tuple

def generate_random_coords() -> Tuple[float, float, float]:
    """Generates random 3D coordinates."""
    return (random.uniform(-100, 100), random.uniform(-100, 100), random.uniform(-100, 100))

def generate_identities(num: int) -> List[Tuple[int, Tuple[float, float, float]]]:
    """Generates multiple identities with 3D coordinates."""
    return [(i, generate_random_coords()) for i in range(1, num + 1)]

def test_reproducibility(seed: int) -> None:
    """Tests seed reproducibility."""
    random.seed(seed)
    first = generate_identities(5)
    random.seed(seed)
    second = generate_identities(5)
    assert first == second, "Reproducibility test failed"
    print("✅ Reproducibility test passed")

if __name__ == "__main__":
    print("🎨 Identity Protocol Demo")
    identities = generate_identities(5)
    for id, coords in identities:
        print(f"  ID {id}: {coords}")
    test_reproducibility(12345)
'''
}

# 파일 저장
for filename, code in code_samples.items():
    with open(filename, 'w') as f:
        f.write(code)
    print(f"✅ {filename} 저장 완료!")

print("\n🎉 코드 추출 완료!")
