# tests/test_physics.py
"""
AUTUS Physics Tests
"""

import pytest
from app.physics.orbit import (
    PLANETS,
    shadow_to_planets,
    planets_to_orbit,
    apply_forces,
    calculate_risk,
    calculate_status,
)
from app.physics.hash import sha256_hex, verify_chain


class TestShadowToPlanets:
    """Shadow32f → Planets 변환 테스트"""
    
    def test_valid_shadow(self):
        """정상 Shadow 변환"""
        shadow = [0.5] * 32
        planets = shadow_to_planets(shadow)
        
        assert len(planets) == 9
        assert all(p in planets for p in PLANETS)
        assert all(0 <= v <= 1 for v in planets.values())
    
    def test_empty_shadow(self):
        """빈 Shadow → 기본값"""
        planets = shadow_to_planets([])
        
        assert len(planets) == 9
        assert all(v == 0.5 for v in planets.values())
    
    def test_high_values(self):
        """높은 값 Shadow"""
        shadow = [1.0] * 32
        planets = shadow_to_planets(shadow)
        
        assert all(v == 1.0 for v in planets.values())


class TestPlanetsToOrbit:
    """Planets → Orbit 변환 테스트"""
    
    def test_basic_orbit(self):
        """기본 궤도 계산"""
        planets = {p: 0.5 for p in PLANETS}
        orbit = planets_to_orbit(planets, t=1.0)
        
        assert len(orbit) == 9
        assert all("x" in p and "y" in p and "z" in p for p in orbit)
    
    def test_time_parameter(self):
        """시간 파라미터 변화"""
        planets = {p: 0.5 for p in PLANETS}
        
        orbit_t0 = planets_to_orbit(planets, t=0.0)
        orbit_t1 = planets_to_orbit(planets, t=1.0)
        orbit_t2 = planets_to_orbit(planets, t=2.0)
        
        # 시간에 따라 위치가 달라야 함
        assert orbit_t0[0]["x"] != orbit_t1[0]["x"]
        assert orbit_t1[0]["x"] != orbit_t2[0]["x"]


class TestApplyForces:
    """Force Injection 테스트"""
    
    def test_energy_force(self):
        """E Force → OUTPUT 증가"""
        planets = {p: 0.5 for p in PLANETS}
        result = apply_forces(planets, {"E": 1.0})
        
        assert result["OUTPUT"] > planets["OUTPUT"]
    
    def test_friction_force(self):
        """R Force → FRICTION 감소"""
        planets = {p: 0.5 for p in PLANETS}
        result = apply_forces(planets, {"R": 1.0})
        
        assert result["FRICTION"] < planets["FRICTION"]
    
    def test_no_change_original(self):
        """원본 변경 없음"""
        planets = {p: 0.5 for p in PLANETS}
        original_output = planets["OUTPUT"]
        
        apply_forces(planets, {"E": 1.0})
        
        assert planets["OUTPUT"] == original_output


class TestRiskCalculation:
    """위험도 계산 테스트"""
    
    def test_low_risk(self):
        """낮은 위험도"""
        planets = {"SHOCK": 0.0, "FRICTION": 0.0, "STABILITY": 1.0, "RECOVERY": 1.0}
        risk = calculate_risk(planets)
        
        assert risk < 0.3
    
    def test_high_risk(self):
        """높은 위험도"""
        planets = {"SHOCK": 1.0, "FRICTION": 1.0, "STABILITY": 0.0, "RECOVERY": 0.0}
        risk = calculate_risk(planets)
        
        assert risk > 0.7


class TestStatusCalculation:
    """상태 판정 테스트"""
    
    def test_green_status(self):
        """GREEN 상태"""
        planets = {"SHOCK": 0.0, "FRICTION": 0.0, "STABILITY": 1.0, "RECOVERY": 1.0}
        status = calculate_status(planets)
        
        assert status == "GREEN"
    
    def test_red_status(self):
        """RED 상태"""
        planets = {"SHOCK": 1.0, "FRICTION": 1.0, "STABILITY": 0.0, "RECOVERY": 0.0}
        status = calculate_status(planets)
        
        assert status == "RED"


class TestHashFunctions:
    """해시 함수 테스트"""
    
    def test_sha256_deterministic(self):
        """결정론적 해시"""
        obj = {"a": 1, "b": 2}
        hash1 = sha256_hex(obj)
        hash2 = sha256_hex(obj)
        
        assert hash1 == hash2
    
    def test_sha256_different(self):
        """다른 객체 → 다른 해시"""
        hash1 = sha256_hex({"a": 1})
        hash2 = sha256_hex({"a": 2})
        
        assert hash1 != hash2
    
    def test_verify_chain_valid(self):
        """유효한 체인 검증"""
        events = [
            {
                "entity_id": "test",
                "entity_type": "company",
                "event_type": "create",
                "ts": 1000,
                "payload": {},
                "audit_hash": sha256_hex({
                    "prev": None,
                    "entity_id": "test",
                    "entity_type": "company",
                    "event_type": "create",
                    "ts": 1000,
                    "payload": {},
                }),
                "prev_hash": None,
            }
        ]
        
        assert verify_chain(events) is True
    
    def test_verify_chain_invalid(self):
        """무효한 체인 검증"""
        events = [
            {
                "entity_id": "test",
                "entity_type": "company",
                "event_type": "create",
                "ts": 1000,
                "payload": {},
                "audit_hash": "invalid_hash",
                "prev_hash": None,
            }
        ]
        
        assert verify_chain(events) is False
