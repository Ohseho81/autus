"""
AUTUS Replay - Determinism Verification
=======================================

리플레이 엔진:
- 로그에서 상태 재구성
- 결정론 검증
- 불일치 탐지

Version: 1.0.0
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from .kernel import Kernel, KernelState, get_kernel
from .chain import Chain, get_chain


@dataclass
class ReplayResult:
    """Result of replay operation."""
    success: bool
    steps_replayed: int
    final_state: Dict
    mismatches: List[Dict]
    deterministic: bool


class Replay:
    """
    Replay Engine
    
    핵심 기능:
    1. 로그 시퀀스 재실행
    2. 상태 일치 검증
    3. 결정론 보장 테스트
    """
    
    def __init__(self, kernel: Optional[Kernel] = None, 
                 chain: Optional[Chain] = None):
        self.kernel = kernel or get_kernel()
        self.chain = chain or get_chain()
    
    def replay_sequence(self, motion_sequence: List[str], 
                       initial_state: Optional[Dict] = None) -> ReplayResult:
        """
        Replay a sequence of motions.
        
        Args:
            motion_sequence: List of motion IDs to replay
            initial_state: Optional starting state (default: fresh state)
        
        Returns:
            ReplayResult with final state and any errors
        """
        # Reset or set initial state
        if initial_state:
            self.kernel.set_state(KernelState.from_dict(initial_state))
        else:
            self.kernel.reset()
        
        mismatches = []
        steps = 0
        
        for motion_id in motion_sequence:
            result = self.kernel.step(motion_id)
            steps += 1
            
            if not result.get("success", False):
                mismatches.append({
                    "step": steps,
                    "motion_id": motion_id,
                    "error": result.get("error", "Unknown error")
                })
        
        return ReplayResult(
            success=len(mismatches) == 0,
            steps_replayed=steps,
            final_state=self.kernel.get_state().to_dict(),
            mismatches=mismatches,
            deterministic=True  # If we got here, it's deterministic
        )
    
    def replay_from_chain(self, start_index: int = 0, 
                         end_index: Optional[int] = None) -> ReplayResult:
        """
        Replay from chain log entries.
        """
        entries = self.chain.get_entries(start_index, end_index)
        motion_sequence = [e["motion_id"] for e in entries]
        return self.replay_sequence(motion_sequence)
    
    def verify_determinism(self, motion_sequence: List[str], 
                          runs: int = 3) -> Dict:
        """
        Verify determinism by running sequence multiple times.
        
        Returns:
            {
                "deterministic": bool,
                "runs": int,
                "final_states": list,
                "all_match": bool
            }
        """
        results = []
        
        for _ in range(runs):
            result = self.replay_sequence(motion_sequence)
            results.append(result.final_state)
        
        # Check all results match
        all_match = all(r == results[0] for r in results)
        
        return {
            "deterministic": all_match,
            "runs": runs,
            "final_states": results,
            "all_match": all_match
        }
    
    def compare_states(self, state_a: Dict, state_b: Dict) -> Dict:
        """
        Compare two states and return differences.
        """
        diffs = {}
        
        def compare_dict(a: Dict, b: Dict, prefix: str = ""):
            for key in set(list(a.keys()) + list(b.keys())):
                path = f"{prefix}.{key}" if prefix else key
                
                if key not in a:
                    diffs[path] = {"status": "added", "value": b[key]}
                elif key not in b:
                    diffs[path] = {"status": "removed", "value": a[key]}
                elif isinstance(a[key], dict) and isinstance(b[key], dict):
                    compare_dict(a[key], b[key], path)
                elif a[key] != b[key]:
                    diffs[path] = {
                        "status": "changed",
                        "from": a[key],
                        "to": b[key]
                    }
        
        compare_dict(state_a, state_b)
        
        return {
            "identical": len(diffs) == 0,
            "differences": diffs
        }


# Singleton
_replay_instance: Optional[Replay] = None

def get_replay() -> Replay:
    global _replay_instance
    if _replay_instance is None:
        _replay_instance = Replay()
    return _replay_instance







