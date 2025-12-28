"""
AUTUS Local - Core Tests
"""
import pytest
import os
from app.core.models import (
    Action, PersonId, Theta, StateVector, CostUnitLedger,
    mint_snapshot, Coalition, CoalitionMember, aggregate_state, aggregate_cu
)
from app.core.physics import update_state, compute_cu_delta
from app.core.justice import compute_justice_metrics, check_justice
from app.core.replay import replay, verify_determinism, generate_deterministic_steps, StepInput
from app.storage.repo import (
    repo, ledger, reset_all, verify_nft_chain,
    save_snapshot, load_snapshot, delete_snapshot, SNAPSHOT_FILE
)


class TestStateVector:
    def test_as_dict(self):
        s = StateVector(0.5, 0.6, 0.7, 0.8, 0.3, 0.4)
        d = s.as_dict()
        assert d["stability"] == 0.5
        assert d["momentum"] == 0.8
    
    def test_copy(self):
        s1 = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        s2 = s1.copy()
        s2.stability = 0.9
        assert s1.stability == 0.5  # Original unchanged


class TestPhysics:
    def test_hold_increases_stability(self):
        s = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        theta = Theta(k_recovery=1.0, k_drag=1.0, k_vol=1.0)
        s = update_state(s, Action.HOLD, theta)
        assert s.stability > 0.5
    
    def test_push_increases_momentum(self):
        s = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        theta = Theta(k_recovery=1.0, k_drag=1.0, k_vol=1.0)
        s = update_state(s, Action.PUSH, theta)
        assert s.momentum > 0.5
    
    def test_clipping(self):
        s = StateVector(0.99, 0.01, 0.5, 0.5, 0.5, 0.5)
        theta = Theta(k_recovery=1.0, k_drag=1.0, k_vol=1.0)
        s = update_state(s, Action.HOLD, theta)
        assert 0.0 <= s.stability <= 1.0
        assert 0.0 <= s.pressure <= 1.0
    
    def test_cu_delta_always_positive(self):
        delta = compute_cu_delta(1.0, 1.0, 0.5)
        assert delta >= 0


class TestCostUnitLedger:
    def test_add_cost(self):
        l = CostUnitLedger()
        pid = PersonId.new()
        l.add_cost(1, pid, 10.0)
        assert l.balance(pid) == 10.0
    
    def test_no_negative_cost(self):
        l = CostUnitLedger()
        pid = PersonId.new()
        with pytest.raises(ValueError):
            l.add_cost(1, pid, -5.0)


class TestNFT:
    def test_mint_snapshot_deterministic(self):
        pid = PersonId(value="test-person-123")
        s = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        snap1 = mint_snapshot(pid, 1, s, "")
        snap2 = mint_snapshot(pid, 1, s, "")
        assert snap1.state_hash == snap2.state_hash
    
    def test_chain_integrity(self):
        pid = PersonId(value="test-person-456")
        s1 = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        snap1 = mint_snapshot(pid, 1, s1, "")
        s2 = StateVector(0.6, 0.5, 0.5, 0.5, 0.5, 0.5)
        snap2 = mint_snapshot(pid, 2, s2, snap1.state_hash)
        assert snap2.prev_hash == snap1.state_hash


class TestJustice:
    def test_normal_state_not_triggered(self):
        s = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        decision = check_justice(s)
        assert decision.triggered is False
    
    def test_extreme_state_triggered(self):
        s = StateVector(0.1, 0.95, 0.95, 0.95, 0.95, 0.1)
        decision = check_justice(s)
        assert decision.triggered is True
    
    def test_metrics_computation(self):
        s = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        m = compute_justice_metrics(s)
        assert 0 <= m.influence_concentration <= 1
        assert 0 <= m.recovery_half_life <= 1
        assert 0 <= m.optionality_loss_rate <= 1


class TestReplay:
    def test_determinism(self):
        initial = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        theta = Theta(k_recovery=1.0, k_drag=1.0, k_vol=1.0)
        steps = generate_deterministic_steps(10)
        assert verify_determinism(initial, theta, steps)
    
    def test_replay_produces_states(self):
        initial = StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        theta = Theta(k_recovery=1.0, k_drag=1.0, k_vol=1.0)
        steps = [StepInput(t=0, action=Action.PUSH), StepInput(t=1, action=Action.HOLD)]
        states = replay(initial, theta, steps)
        assert len(states) == 2


class TestCoalition:
    def test_aggregate_state(self):
        s1 = StateVector(0.4, 0.4, 0.4, 0.4, 0.4, 0.4)
        s2 = StateVector(0.6, 0.6, 0.6, 0.6, 0.6, 0.6)
        members = [
            CoalitionMember(person_id="p1", weight=1.0),
            CoalitionMember(person_id="p2", weight=1.0),
        ]
        states = {"p1": s1, "p2": s2}
        agg = aggregate_state(states, members)
        assert abs(agg.stability - 0.5) < 0.001
    
    def test_aggregate_cu(self):
        balances = {"p1": 10.0, "p2": 20.0}
        members = [
            CoalitionMember(person_id="p1", weight=1.0),
            CoalitionMember(person_id="p2", weight=1.0),
        ]
        agg = aggregate_cu(balances, members)
        assert abs(agg - 15.0) < 0.001
    
    def test_weighted_aggregate(self):
        s1 = StateVector(0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
        s2 = StateVector(1.0, 1.0, 1.0, 1.0, 1.0, 1.0)
        members = [
            CoalitionMember(person_id="p1", weight=1.0),
            CoalitionMember(person_id="p2", weight=3.0),
        ]
        states = {"p1": s1, "p2": s2}
        agg = aggregate_state(states, members)
        assert abs(agg.stability - 0.75) < 0.001


class TestPersistence:
    def setup_method(self):
        reset_all()
        delete_snapshot()
    
    def teardown_method(self):
        reset_all()
        delete_snapshot()
    
    def test_save_and_load(self):
        # Create person and do step
        rec = repo.create_person()
        pid = rec.person_id.value
        rec.state = update_state(rec.state, Action.PUSH, rec.theta)
        snap = mint_snapshot(rec.person_id, 1, rec.state, "")
        rec.nft_chain.append(snap)
        
        # Save
        hash_val = save_snapshot()
        assert len(hash_val) == 16
        
        # Reset
        reset_all()
        assert len(repo.list_person_ids()) == 0
        
        # Load
        success = load_snapshot()
        assert success
        assert pid in repo.list_person_ids()
        assert len(repo.get(pid).nft_chain) == 1


class TestNFTVerification:
    def setup_method(self):
        reset_all()
    
    def teardown_method(self):
        reset_all()
    
    def test_valid_chain(self):
        rec = repo.create_person()
        pid = rec.person_id.value
        
        snap1 = mint_snapshot(rec.person_id, 1, rec.state, "")
        rec.nft_chain.append(snap1)
        
        rec.state = update_state(rec.state, Action.PUSH, rec.theta)
        snap2 = mint_snapshot(rec.person_id, 2, rec.state, snap1.state_hash)
        rec.nft_chain.append(snap2)
        
        result = verify_nft_chain(pid)
        assert result["valid"] is True
        assert result["length"] == 2
        assert result["errors"] == []
    
    def test_empty_chain(self):
        rec = repo.create_person()
        pid = rec.person_id.value
        result = verify_nft_chain(pid)
        assert result["valid"] is True
        assert result["length"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])







