"""
AUTUS Kernel - Deterministic Physics Engine
============================================

결정론 엔진: Motion → State(S001~S009) → Level2(σ/Stability/Recovery/logStateSpace)

IMMUTABLE RULES:
- 외부 호출 금지
- 난수 금지
- 시간 의존 금지 (t는 이산 step 카운터만)

Version: 1.0.0
"""

import json
import math
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple
from pathlib import Path


# ================================================================
# STATE DEFINITIONS (LOCKED)
# ================================================================

@dataclass
class CoreState:
    """
    Internal 6-axis state (S001-S006)
    """
    stability: float = 0.5      # S001 [0, 1]
    pressure: float = 0.0       # S002 [-1, 1]
    drag: float = 0.1           # S003 [0, 1]
    momentum: float = 0.0       # S004 [-1, 1]
    volatility: float = 0.3     # S005 σ [0, 1]
    recovery: float = 0.1       # S006 [0, ∞)


@dataclass
class Level2State:
    """
    Level 2 Physics State
    """
    sigma: float = 0.3          # Entropy σ = -Σ pᵢ log pᵢ
    stability: float = 0.5      # Stab = 1 - |ΔS|/Max
    recovery: float = 0.1       # Rec = 1/τ
    log_state_space: float = 3.0  # log(n^n)


@dataclass
class KernelState:
    """
    Complete Kernel State
    """
    step: int = 0
    core: CoreState = field(default_factory=CoreState)
    level2: Level2State = field(default_factory=Level2State)
    n_entities: int = 5
    
    def to_dict(self) -> Dict:
        return {
            "step": self.step,
            "core": asdict(self.core),
            "level2": asdict(self.level2),
            "n_entities": self.n_entities
        }
    
    @classmethod
    def from_dict(cls, d: Dict) -> "KernelState":
        state = cls()
        state.step = d.get("step", 0)
        state.n_entities = d.get("n_entities", 5)
        if "core" in d:
            state.core = CoreState(**d["core"])
        if "level2" in d:
            state.level2 = Level2State(**d["level2"])
        return state


# ================================================================
# MOTION REGISTRY LOADER
# ================================================================

class MotionRegistry:
    """
    68 Motion Registry (LOCKED)
    """
    
    def __init__(self, registry_path: Optional[str] = None):
        if registry_path is None:
            registry_path = Path(__file__).parent.parent / "data" / "motion_registry.json"
        
        with open(registry_path, "r") as f:
            data = json.load(f)
        
        self.motions = data["motions"]
        self.categories = data["categories"]
        self.version = data["_version"]
        self.total = data["_total_motions"]
    
    def get(self, motion_id: str) -> Optional[Dict]:
        return self.motions.get(motion_id)
    
    def is_valid(self, motion_id: str) -> bool:
        return motion_id in self.motions
    
    def is_level3(self, motion_id: str) -> bool:
        motion = self.get(motion_id)
        return motion.get("level3", False) if motion else False
    
    def get_effects(self, motion_id: str) -> Dict:
        motion = self.get(motion_id)
        return motion.get("effects", {}) if motion else {}


# ================================================================
# DETERMINISTIC KERNEL ENGINE
# ================================================================

class Kernel:
    """
    AUTUS Deterministic Kernel
    
    핵심 규칙:
    1. 모든 연산은 결정론적
    2. 외부 상태/시간/난수 의존 금지
    3. Motion → State → Level2 순서 고정
    """
    
    def __init__(self, registry: Optional[MotionRegistry] = None):
        self.registry = registry or MotionRegistry()
        self.state = KernelState()
    
    def reset(self) -> KernelState:
        """Reset to initial state."""
        self.state = KernelState()
        return self.state
    
    def step(self, motion_id: str, params: Optional[Dict] = None) -> Dict:
        """
        Execute one deterministic step.
        
        Pipeline: Validate → Apply Effects → Update Level2 → Increment Step
        
        Returns:
            {
                "success": bool,
                "motion_id": str,
                "prev_state": dict,
                "next_state": dict,
                "delta": dict
            }
        """
        params = params or {}
        
        # Validate motion
        if not self.registry.is_valid(motion_id):
            return {
                "success": False,
                "error": f"Invalid motion: {motion_id}",
                "motion_id": motion_id
            }
        
        # Level 3 motions don't change physics
        if self.registry.is_level3(motion_id):
            return {
                "success": True,
                "motion_id": motion_id,
                "level3": True,
                "message": "Level 3 motion: no physics change"
            }
        
        # Capture previous state
        prev_state = self.state.to_dict()
        
        # Apply motion effects
        effects = self.registry.get_effects(motion_id)
        delta = self._apply_effects(effects, params)
        
        # Update Level 2 from Core
        self._update_level2()
        
        # Increment step
        self.state.step += 1
        
        # Capture next state
        next_state = self.state.to_dict()
        
        return {
            "success": True,
            "motion_id": motion_id,
            "step": self.state.step,
            "prev_state": prev_state,
            "next_state": next_state,
            "delta": delta
        }
    
    def _apply_effects(self, effects: Dict, params: Dict) -> Dict:
        """Apply motion effects to core state."""
        delta = {}
        core = self.state.core
        
        for key, value in effects.items():
            # Handle parameterized effects
            if value == "param":
                value = params.get(key, 0.0)
            elif value == "-param":
                value = -params.get(key.replace("-", ""), 0.0)
            
            if key == "sigma":
                old = core.volatility
                core.volatility = self._clamp(core.volatility + value, 0, 1)
                delta["sigma"] = core.volatility - old
            
            elif key == "stability":
                old = core.stability
                core.stability = self._clamp(core.stability + value, 0, 1)
                delta["stability"] = core.stability - old
            
            elif key == "recovery":
                old = core.recovery
                core.recovery = max(0, core.recovery + value)
                delta["recovery"] = core.recovery - old
            
            elif key == "scale":
                old = self.state.n_entities
                self.state.n_entities = max(1, self.state.n_entities + int(value))
                delta["n_entities"] = self.state.n_entities - old
        
        return delta
    
    def _update_level2(self) -> None:
        """
        Update Level 2 state from Core state.
        
        Level 2 수식 (LOCKED):
        - σ = core.volatility (직접 매핑)
        - Stability = core.stability
        - Recovery = core.recovery
        - log_state_space = n * log(n)
        """
        l2 = self.state.level2
        core = self.state.core
        n = self.state.n_entities
        
        # Direct mapping
        l2.sigma = core.volatility
        l2.stability = core.stability
        l2.recovery = core.recovery
        
        # State space: n^n → log(n^n) = n * log(n)
        if n > 0:
            l2.log_state_space = n * math.log(n) if n > 1 else 0
        else:
            l2.log_state_space = 0
    
    def _clamp(self, value: float, min_val: float, max_val: float) -> float:
        """Clamp value to range."""
        return max(min_val, min(max_val, value))
    
    def get_state(self) -> KernelState:
        """Get current state (immutable copy)."""
        return KernelState.from_dict(self.state.to_dict())
    
    def set_state(self, state: KernelState) -> None:
        """Set state (for replay)."""
        self.state = KernelState.from_dict(state.to_dict())
    
    def forecast(self, motion_sequence: List[str], steps: int = 1) -> List[Dict]:
        """
        Forecast future states without modifying current state.
        
        Returns list of predicted states.
        """
        # Save current state
        saved = self.state.to_dict()
        
        forecasts = []
        for motion_id in motion_sequence[:steps]:
            result = self.step(motion_id)
            if result["success"]:
                forecasts.append({
                    "motion_id": motion_id,
                    "state": self.state.to_dict()
                })
        
        # Restore state
        self.state = KernelState.from_dict(saved)
        
        return forecasts


# ================================================================
# SINGLETON ACCESS
# ================================================================

_kernel_instance: Optional[Kernel] = None

def get_kernel() -> Kernel:
    """Get singleton kernel instance."""
    global _kernel_instance
    if _kernel_instance is None:
        _kernel_instance = Kernel()
    return _kernel_instance







