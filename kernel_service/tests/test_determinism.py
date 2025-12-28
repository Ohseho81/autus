"""
AUTUS Kernel - Determinism Tests
================================

성공 기준: 결정론 테스트 + 리플레이 일치 + 불변 로그 체인

Version: 1.0.0
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.kernel import Kernel, KernelState, MotionRegistry
from app.chain import Chain
from app.replay import Replay
from app.validator import Validator


class TestMotionRegistry:
    """Test Motion Registry."""
    
    def test_registry_loads(self):
        """Registry loads 68 motions."""
        registry = MotionRegistry()
        assert registry.total == 68
        assert registry.version == "1.0.0"
    
    def test_all_motions_valid(self):
        """All 68 motions are accessible."""
        registry = MotionRegistry()
        
        # User Actions: U001-U011
        for i in range(1, 12):
            assert registry.is_valid(f"U{i:03d}")
        
        # Entity: E001-E008
        for i in range(1, 9):
            assert registry.is_valid(f"E{i:03d}")
        
        # State: S001-S009
        for i in range(1, 10):
            assert registry.is_valid(f"S{i:03d}")
        
        # Loop: L001-L008
        for i in range(1, 9):
            assert registry.is_valid(f"L{i:03d}")
        
        # Justice: J001-J004 (Level 3)
        for i in range(1, 5):
            assert registry.is_valid(f"J{i:03d}")
            assert registry.is_level3(f"J{i:03d}")
        
        # Sensory: N001-N006
        for i in range(1, 7):
            assert registry.is_valid(f"N{i:03d}")
        
        # Map: M001-M010
        for i in range(1, 11):
            assert registry.is_valid(f"M{i:03d}")
        
        # Chain: C001-C007
        for i in range(1, 8):
            assert registry.is_valid(f"C{i:03d}")
        
        # Scale: X001-X005
        for i in range(1, 6):
            assert registry.is_valid(f"X{i:03d}")
    
    def test_invalid_motion(self):
        """Invalid motion returns False."""
        registry = MotionRegistry()
        assert not registry.is_valid("INVALID")
        assert not registry.is_valid("U999")


class TestDeterminism:
    """Test deterministic execution."""
    
    def test_same_sequence_same_result(self):
        """Same sequence always produces same result."""
        sequence = ["U001", "U002", "U003", "U001", "U002"]
        
        results = []
        for _ in range(5):
            kernel = Kernel()
            for motion_id in sequence:
                kernel.step(motion_id)
            results.append(kernel.get_state().to_dict())
        
        # All results must be identical
        for r in results[1:]:
            assert r == results[0], "Determinism violated!"
    
    def test_order_matters(self):
        """Different order produces different result."""
        kernel1 = Kernel()
        kernel1.step("U001")
        kernel1.step("U002")
        state1 = kernel1.get_state().to_dict()
        
        kernel2 = Kernel()
        kernel2.step("U002")
        kernel2.step("U001")
        state2 = kernel2.get_state().to_dict()
        
        # Different order = different result
        assert state1 != state2
    
    def test_level3_no_physics_change(self):
        """Level 3 motions don't change physics."""
        kernel = Kernel()
        state_before = kernel.get_state().to_dict()
        
        result = kernel.step("J001")  # CAP_APPLY
        
        assert result["level3"] == True
        state_after = kernel.get_state().to_dict()
        
        # Core and Level2 unchanged (only step increments)
        assert state_before["core"] == state_after["core"]
        assert state_before["level2"] == state_after["level2"]


class TestReplay:
    """Test replay consistency."""
    
    def test_replay_matches_original(self):
        """Replay produces identical state."""
        sequence = ["U001", "U003", "E002", "U002", "M001"]
        
        # Run original
        kernel = Kernel()
        for motion_id in sequence:
            kernel.step(motion_id)
        original_state = kernel.get_state().to_dict()
        
        # Replay
        replay = Replay(Kernel())
        result = replay.replay_sequence(sequence)
        
        assert result.success
        assert result.deterministic
        assert result.final_state == original_state
    
    def test_replay_verify_determinism(self):
        """Multiple replays are identical."""
        sequence = ["U001", "U002", "U003"] * 10
        
        replay = Replay(Kernel())
        result = replay.verify_determinism(sequence, runs=5)
        
        assert result["deterministic"]
        assert result["all_match"]


class TestChain:
    """Test immutable log chain."""
    
    def test_chain_append(self):
        """Chain appends entries correctly."""
        chain = Chain()
        
        chain.append("U001", {"test": "state1"})
        chain.append("U002", {"test": "state2"})
        
        assert len(chain.entries) == 2
        assert chain.entries[0].motion_id == "U001"
        assert chain.entries[1].motion_id == "U002"
    
    def test_chain_hash_link(self):
        """Each entry links to previous hash."""
        chain = Chain()
        
        entry1 = chain.append("U001", {"a": 1})
        entry2 = chain.append("U002", {"a": 2})
        
        assert entry2.prev_hash == entry1.hash
    
    def test_chain_integrity(self):
        """Chain verifies integrity."""
        chain = Chain()
        
        chain.append("U001", {"a": 1})
        chain.append("U002", {"a": 2})
        chain.append("U003", {"a": 3})
        
        result = chain.verify()
        assert result["valid"]
        assert result["length"] == 3
    
    def test_chain_tampering_detected(self):
        """Tampering is detected."""
        chain = Chain()
        
        chain.append("U001", {"a": 1})
        chain.append("U002", {"a": 2})
        
        # Tamper with entry
        chain.entries[0].state_snapshot = {"tampered": True}
        
        result = chain.verify()
        assert not result["valid"]
        assert len(result["errors"]) > 0


class TestValidator:
    """Test constitutional validator."""
    
    def test_valid_output(self):
        """Valid output passes."""
        validator = Validator()
        
        valid_text = """
        [PHYSICS]
        σ = 0.35
        Stability = 0.65
        
        [PATHS]
        Path 1: PUSH → σ = 0.40
        Path 2: HOLD → σ = 0.33
        
        [NO RECOMMENDATION PROVIDED]
        """
        
        is_valid, violations = validator.validate(valid_text)
        assert is_valid
    
    def test_forbidden_word_blocked(self):
        """Forbidden words are blocked."""
        validator = Validator()
        
        invalid_text = "I recommend choosing Path 2. You should do this."
        
        is_valid, violations = validator.validate(invalid_text)
        assert not is_valid
        
        violation_types = [v.type.value for v in violations]
        assert "forbidden_word" in violation_types or "recommendation" in violation_types
    
    def test_recommendation_blocked(self):
        """Recommendation patterns are blocked."""
        validator = Validator()
        
        invalid_text = "The best option is Path A. The optimal choice would be..."
        
        is_valid, violations = validator.validate(invalid_text)
        assert not is_valid
    
    def test_korean_forbidden(self):
        """Korean forbidden words are blocked."""
        validator = Validator()
        
        invalid_text = "이 경로가 더 좋습니다. 추천드립니다."
        
        is_valid, violations = validator.validate(invalid_text)
        assert not is_valid


class TestIntegration:
    """Integration tests."""
    
    def test_full_pipeline(self):
        """Full pipeline: Emit → Step → Log → Replay."""
        # Setup
        kernel = Kernel()
        chain = Chain()
        
        # Execute sequence with logging
        sequence = ["U001", "U002", "U003", "E002", "M001"]
        
        for motion_id in sequence:
            result = kernel.step(motion_id)
            if result.get("success"):
                chain.append(motion_id, result["next_state"])
        
        original_state = kernel.get_state().to_dict()
        
        # Verify chain
        chain_check = chain.verify()
        assert chain_check["valid"]
        
        # Replay from chain
        replay_kernel = Kernel()
        replay = Replay(replay_kernel, chain)
        
        replay_result = replay.replay_from_chain()
        
        assert replay_result.success
        assert replay_result.deterministic
        
        # States must match
        # Note: step count might differ, compare core physics
        assert replay_result.final_state["level2"] == original_state["level2"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])







