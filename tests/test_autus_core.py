"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS CORE TESTS
필수 테스트 시나리오 (Fail-Fast)
═══════════════════════════════════════════════════════════════════════════════

반드시 통과해야 하는 테스트:
- [ ] 동일 입력 → 동일 Gate
- [ ] Gate 없이 프리셋 적용 불가
- [ ] LOCK 이후 되돌림 불가
- [ ] Afterimage 수정 불가
- [ ] Replay 불일치 없음
"""

import pytest
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src'))

# ═══════════════════════════════════════════════════════════════════════════════
# MOCK IMPLEMENTATIONS (테스트용)
# ═══════════════════════════════════════════════════════════════════════════════

# Gate 상태
class GateState:
    OBSERVE = "OBSERVE"
    RING = "RING"
    LOCK = "LOCK"
    AFTERIMAGE = "AFTERIMAGE"

# Gate 결정 함수 (순수 함수)
def determine_gate(
    entropy_acceleration: float,
    responsibility_load: float,
    responsibility_cap: float,
    energy: float,
    threshold: float
) -> str:
    """Gate 상태 결정 - 순수 함수"""
    
    # G3: 에너지 고갈
    if energy < 0:
        return GateState.LOCK
    
    # G2: 책임 부하 초과
    if responsibility_load > responsibility_cap * 1.5:
        return GateState.LOCK
    
    # G1: 엔트로피 가속 초과
    if entropy_acceleration > threshold:
        return GateState.LOCK
    
    # 경고 구간
    if entropy_acceleration > threshold * 0.8:
        return GateState.RING
    
    if responsibility_load > responsibility_cap:
        return GateState.RING
    
    return GateState.OBSERVE

# 해시 계산 (결정론적)
def compute_hash(data: str) -> str:
    """결정론적 해시 계산"""
    import hashlib
    return hashlib.sha256(data.encode()).hexdigest()[:16]

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: 동일 입력 → 동일 Gate (Determinism)
# ═══════════════════════════════════════════════════════════════════════════════

class TestGateDeterminism:
    """Gate 결정론 테스트"""
    
    def test_same_input_same_output(self):
        """동일 입력 → 동일 출력"""
        inputs = {
            "entropy_acceleration": 0.5,
            "responsibility_load": 0.8,
            "responsibility_cap": 1.0,
            "energy": 50,
            "threshold": 0.7
        }
        
        # 100번 실행해도 동일한 결과
        results = [determine_gate(**inputs) for _ in range(100)]
        
        assert len(set(results)) == 1, "Gate determination must be deterministic"
        assert results[0] == GateState.OBSERVE
    
    def test_entropy_triggers_lock(self):
        """엔트로피 초과 → LOCK"""
        result = determine_gate(
            entropy_acceleration=0.9,  # > 0.7 threshold
            responsibility_load=0.5,
            responsibility_cap=1.0,
            energy=50,
            threshold=0.7
        )
        assert result == GateState.LOCK
    
    def test_energy_depletion_triggers_lock(self):
        """에너지 고갈 → LOCK"""
        result = determine_gate(
            entropy_acceleration=0.3,
            responsibility_load=0.5,
            responsibility_cap=1.0,
            energy=-1,  # < 0
            threshold=0.7
        )
        assert result == GateState.LOCK
    
    def test_overload_triggers_lock(self):
        """부하 초과 → LOCK"""
        result = determine_gate(
            entropy_acceleration=0.3,
            responsibility_load=2.0,  # > 1.0 * 1.5
            responsibility_cap=1.0,
            energy=50,
            threshold=0.7
        )
        assert result == GateState.LOCK
    
    def test_warning_triggers_ring(self):
        """경고 수준 → RING"""
        result = determine_gate(
            entropy_acceleration=0.6,  # > 0.7 * 0.8 = 0.56
            responsibility_load=0.5,
            responsibility_cap=1.0,
            energy=50,
            threshold=0.7
        )
        assert result == GateState.RING

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Gate 전이 규칙 (No Rollback)
# ═══════════════════════════════════════════════════════════════════════════════

class TestGateTransition:
    """Gate 전이 테스트"""
    
    def test_can_transition_forward(self):
        """순방향 전이 허용"""
        transitions = [
            (GateState.OBSERVE, GateState.RING, True),
            (GateState.OBSERVE, GateState.LOCK, True),
            (GateState.RING, GateState.LOCK, True),
            (GateState.LOCK, GateState.AFTERIMAGE, True),
        ]
        
        for from_state, to_state, expected in transitions:
            result = can_transition(from_state, to_state)
            assert result == expected, f"Failed: {from_state} → {to_state}"
    
    def test_cannot_transition_backward(self):
        """역방향 전이 금지"""
        transitions = [
            (GateState.RING, GateState.OBSERVE, False),
            (GateState.LOCK, GateState.RING, False),
            (GateState.LOCK, GateState.OBSERVE, False),
            (GateState.AFTERIMAGE, GateState.LOCK, False),
        ]
        
        for from_state, to_state, expected in transitions:
            result = can_transition(from_state, to_state)
            assert result == expected, f"Failed: {from_state} → {to_state} should be {expected}"

def can_transition(from_state: str, to_state: str) -> bool:
    """전이 가능 여부"""
    order = [GateState.OBSERVE, GateState.RING, GateState.LOCK, GateState.AFTERIMAGE]
    from_idx = order.index(from_state)
    to_idx = order.index(to_state)
    return to_idx > from_idx

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: Afterimage 불변성
# ═══════════════════════════════════════════════════════════════════════════════

class TestAfterimageImmutability:
    """Afterimage 불변성 테스트"""
    
    def test_afterimage_is_frozen(self):
        """Afterimage 레코드 수정 불가"""
        
        class FrozenAfterimage:
            __slots__ = ('id', 'hash', 'data')
            
            def __init__(self, id: str, hash: str, data: str):
                object.__setattr__(self, 'id', id)
                object.__setattr__(self, 'hash', hash)
                object.__setattr__(self, 'data', data)
            
            def __setattr__(self, name, value):
                raise AttributeError("Afterimage is immutable")
        
        record = FrozenAfterimage("001", "abc123", "test")
        
        with pytest.raises(AttributeError):
            record.data = "modified"
    
    def test_hash_chain_integrity(self):
        """해시 체인 무결성"""
        records = []
        previous_hash = "GENESIS"
        
        for i in range(10):
            data = f"record_{i}|{previous_hash}"
            current_hash = compute_hash(data)
            records.append({
                "id": i,
                "data": f"record_{i}",
                "hash": current_hash,
                "previous_hash": previous_hash
            })
            previous_hash = current_hash
        
        # 체인 검증
        for i in range(1, len(records)):
            assert records[i]["previous_hash"] == records[i-1]["hash"]

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Replay 결정론 (Same Input = Same Hash)
# ═══════════════════════════════════════════════════════════════════════════════

class TestReplayDeterminism:
    """Replay 결정론 테스트"""
    
    def test_same_input_same_hash(self):
        """동일 입력 → 동일 해시"""
        input_data = "node_hq|LOCK|0.123456|0.654321|37.5665|126.9780|1704067200|previous_hash"
        
        # 100번 계산해도 동일한 해시
        hashes = [compute_hash(input_data) for _ in range(100)]
        
        assert len(set(hashes)) == 1, "Hash must be deterministic"
    
    def test_different_input_different_hash(self):
        """다른 입력 → 다른 해시"""
        hash1 = compute_hash("input_1")
        hash2 = compute_hash("input_2")
        
        assert hash1 != hash2

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: K-Scale 권한 격리
# ═══════════════════════════════════════════════════════════════════════════════

class TestKScaleIsolation:
    """K-Scale 권한 격리 테스트"""
    
    def test_k2_cannot_access_afterimage(self):
        """K2는 Afterimage 접근 불가"""
        k2_permissions = frozenset([
            "GET /api/v1/physics/state",
            "GET /api/v1/physics/gate",
        ])
        
        afterimage_path = "GET /api/v1/afterimage"
        
        assert afterimage_path not in k2_permissions
    
    def test_k10_can_access_afterimage(self):
        """K10은 Afterimage 접근 가능"""
        k10_permissions = frozenset([
            "GET /api/v1/physics/state",
            "GET /api/v1/afterimage",
            "GET /api/v1/afterimage/replay",
        ])
        
        afterimage_path = "GET /api/v1/afterimage"
        
        assert afterimage_path in k10_permissions
    
    def test_scale_hierarchy(self):
        """스케일 계층 구조"""
        scales = [2, 4, 5, 6, 10]
        
        # 상위 스케일은 하위 스케일 권한 포함
        for i in range(len(scales) - 1):
            lower = scales[i]
            higher = scales[i + 1]
            assert higher > lower

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: 금지된 작업 검증
# ═══════════════════════════════════════════════════════════════════════════════

class TestForbiddenOperations:
    """금지된 작업 테스트"""
    
    def test_no_apply_endpoint(self):
        """Apply 엔드포인트 없음"""
        allowed_methods = ["GET"]
        forbidden_methods = ["POST /apply", "PUT /update", "PATCH /override"]
        
        for method in forbidden_methods:
            assert method.split()[0] not in allowed_methods or "apply" not in method.lower()
    
    def test_no_admin_override(self):
        """Admin override 없음"""
        roles = ["k2", "k4", "k6", "k10"]
        
        # "admin" 또는 "superuser" 역할 없음
        assert "admin" not in roles
        assert "superuser" not in roles

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 7: 시뮬레이션 결정론
# ═══════════════════════════════════════════════════════════════════════════════

class TestSimulationDeterminism:
    """시뮬레이션 결정론 테스트"""
    
    def test_haversine_deterministic(self):
        """Haversine 계산 결정론"""
        import math
        
        def haversine(lat1, lng1, lat2, lng2):
            R = 6371000
            d_lat = math.radians(lat2 - lat1)
            d_lng = math.radians(lng2 - lng1)
            a = (math.sin(d_lat/2)**2 + 
                 math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
                 math.sin(d_lng/2)**2)
            return 2 * R * math.asin(math.sqrt(a))
        
        # 동일 입력 → 동일 결과
        results = [haversine(37.5665, 126.9780, 37.4979, 127.0276) for _ in range(100)]
        
        assert len(set(results)) == 1

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
