import random
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
