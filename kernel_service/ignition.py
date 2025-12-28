#!/usr/bin/env python3
"""
AUTUS IGNITION SEQUENCE
=======================

첫 번째 시스템 점화 (Marker #00001)

Version: 1.0.0
Status: 🔥 EXECUTING
"""

import json
import hashlib
from datetime import datetime
from pathlib import Path

# ================================================================
# INITIAL DATA INJECTION
# ================================================================

INITIAL_DATA = {
    "marker_id": "#00001",
    "timestamp": datetime.now().isoformat(),
    "user_input": {
        "mass": 7.0,           # 현재 역량 (1-10)
        "energy_hours": 6,      # 하루 목표 투입 시간
        "volume": 85,           # 목표 난이도 (1-100)
        "node_x": "Context Switching"  # 간섭원
    }
}

# ================================================================
# PHYSICS TRANSFORM
# ================================================================

def normalize_input(data):
    """입력 데이터를 [0, 1] 범위로 정규화"""
    return {
        "M": data["mass"] / 10.0,                    # 0.7
        "E": min(data["energy_hours"] / 10.0, 1.0), # 0.6
        "volume": data["volume"] / 100.0,            # 0.85
    }

def calculate_initial_physics(norm):
    """초기 물리량 계산 (압축 전)"""
    M = norm["M"]
    E = norm["E"]
    volume = norm["volume"]
    
    # 기본 배분 (균등)
    leak = 0.15  # Context Switching으로 인한 누수
    pressure = 0.6
    sigma = 0.35  # 불확실성
    
    # Density = (E × (1-Leak) × Pressure) / Volume
    E_eff = E * (1 - leak)
    density = min(1.0, (E_eff * pressure) / volume)
    
    # Stability = 1 - sigma
    stability = 1 - sigma
    
    # P_outcome
    P_outcome = density * 0.65 + stability * 0.35 - leak * 0.2
    
    return {
        "M": round(M, 4),
        "E": round(E, 4),
        "volume": round(volume, 4),
        "leak": round(leak, 4),
        "pressure": round(pressure, 4),
        "sigma": round(sigma, 4),
        "density": round(density, 4),
        "stability": round(stability, 4),
        "P_outcome": round(P_outcome, 4)
    }

def apply_compression(physics):
    """COMPRESS 명령: Constraint(N) 투자 증가"""
    # Constraint 투자 → 압력 상승, 볼륨 감소
    physics["pressure"] = min(1.0, physics["pressure"] + 0.25)
    physics["volume"] = max(0.1, physics["volume"] - 0.15)
    physics["sigma"] = max(0.0, physics["sigma"] - 0.13)
    physics["leak"] = max(0.0, physics["leak"] - 0.05)
    
    # 재계산
    E_eff = physics["E"] * (1 - physics["leak"])
    physics["density"] = min(1.0, (E_eff * physics["pressure"]) / physics["volume"])
    physics["stability"] = 1 - physics["sigma"]
    physics["P_outcome"] = physics["density"] * 0.65 + physics["stability"] * 0.35 - physics["leak"] * 0.2
    
    return {k: round(v, 4) for k, v in physics.items()}

def apply_node_cut(physics):
    """CUT NODE 명령: Node X 삭제로 경로 최적화"""
    # 간섭원 제거 → 누수 감소, 안정성 증가
    physics["leak"] = max(0.0, physics["leak"] - 0.08)
    physics["sigma"] = max(0.0, physics["sigma"] - 0.07)
    
    # 재계산
    E_eff = physics["E"] * (1 - physics["leak"])
    physics["density"] = min(1.0, (E_eff * physics["pressure"]) / physics["volume"])
    physics["stability"] = 1 - physics["sigma"]
    physics["P_outcome"] = physics["density"] * 0.65 + physics["stability"] * 0.35 - physics["leak"] * 0.2
    
    return {k: round(v, 4) for k, v in physics.items()}

# ================================================================
# STATE HASH (결정론적)
# ================================================================

def compute_state_hash(data):
    """SHA256 상태 해시 생성"""
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]

# ================================================================
# MANDALA ALLOCATION
# ================================================================

def generate_mandala_allocation(physics, compressed=False):
    """만다라 8슬롯 배분 생성"""
    if compressed:
        return {
            "N": 0.20,   # Constraint (↑ 압축)
            "NE": 0.08,  # Risk
            "E": 0.25,   # Energy
            "SE": 0.05,  # Leak (↓ 감소)
            "S": 0.18,   # Pattern
            "SW": 0.07,  # Drag
            "W": 0.12,   # Connection
            "NW": 0.05   # Compression
        }
    else:
        return {
            "N": 0.125, "NE": 0.125, "E": 0.125, "SE": 0.125,
            "S": 0.125, "SW": 0.125, "W": 0.125, "NW": 0.125
        }

# ================================================================
# EXECUTION PIPELINE
# ================================================================

def execute_ignition():
    """7단계 실행 파이프라인"""
    print("=" * 70)
    print("   AUTUS IGNITION SEQUENCE — MARKER #00001")
    print("=" * 70)
    print()
    
    # Step 1: Normalization
    print("[1/7] NORMALIZATION...")
    norm = normalize_input(INITIAL_DATA["user_input"])
    print(f"      M={norm['M']}, E={norm['E']}, Volume={norm['volume']}")
    
    # Step 2: Physics Transform (Initial)
    print("[2/7] PHYSICS TRANSFORM (INITIAL)...")
    physics_initial = calculate_initial_physics(norm)
    print(f"      Density={physics_initial['density']:.2f}, Stability={physics_initial['stability']:.2f}")
    print(f"      P_outcome={physics_initial['P_outcome']*100:.0f}%")
    
    # Step 3: COMPRESS
    print("[3/7] APPLYING COMPRESSION...")
    physics_compressed = apply_compression(physics_initial.copy())
    print(f"      Density={physics_compressed['density']:.2f} (+{physics_compressed['density']-physics_initial['density']:.2f})")
    print(f"      Stability={physics_compressed['stability']:.2f} (+{physics_compressed['stability']-physics_initial['stability']:.2f})")
    print(f"      P_outcome={physics_compressed['P_outcome']*100:.0f}%")
    
    # Step 4: CUT NODE (Node X 삭제)
    print("[4/7] CUTTING NODE X (Context Switching)...")
    physics_final = apply_node_cut(physics_compressed.copy())
    print(f"      Leak={physics_final['leak']:.2f} (↓)")
    print(f"      P_outcome={physics_final['P_outcome']*100:.0f}%")
    
    # Step 5: Topology Mapping
    print("[5/7] TOPOLOGY MAPPING...")
    mandala = generate_mandala_allocation(physics_final, compressed=True)
    print(f"      Mandala slots allocated: {sum(mandala.values()):.2f}")
    
    # Step 6: State Hash
    print("[6/7] GENERATING STATE HASH...")
    state_data = {
        "marker": INITIAL_DATA["marker_id"],
        "timestamp": INITIAL_DATA["timestamp"],
        "measure": physics_final,
        "mandala": mandala,
        "node_x_status": "DELETED"
    }
    state_hash = compute_state_hash(state_data)
    print(f"      Hash: {state_hash}")
    
    # Step 7: Commit Ready
    print("[7/7] COMMIT READY")
    print()
    
    return {
        "initial": physics_initial,
        "compressed": physics_compressed,
        "final": physics_final,
        "mandala": mandala,
        "state_hash": state_hash,
        "state_data": state_data
    }

# ================================================================
# OBSERVATION REPORT
# ================================================================

def generate_report(result):
    """물리 관측 리포트 생성"""
    final = result["final"]
    
    report = f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 AUTUS OBSERVATION REPORT — MARKER #00001                                 ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   📊 PHYSICS STATUS                                                           ║
║   ─────────────────────────────────────────────────────────────────────────── ║
║                                                                               ║
║   Density (밀도)        {final['density']:.2f}  {"✓ OPTIMAL" if final['density'] >= 0.85 else "△ GROWING"}                                  ║
║   Stability (안정성)    {final['stability']:.2f}  {"✓ STABLE" if final['stability'] >= 0.70 else "△ STABILIZING"}                               ║
║   Leak (누수)           {final['leak']:.2f}  {"✓ MINIMAL" if final['leak'] <= 0.10 else "△ REDUCING"}                                 ║
║   P_outcome (성공률)    {final['P_outcome']*100:.0f}%  {"✓ COMMITTED" if final['P_outcome'] >= 0.90 else "△ APPROACHING"}                             ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   🎯 TRANSFORMATION SUMMARY                                                   ║
║   ─────────────────────────────────────────────────────────────────────────── ║
║                                                                               ║
║   Initial → Compressed → Final                                                ║
║   Density:    {result['initial']['density']:.2f} → {result['compressed']['density']:.2f} → {final['density']:.2f}                                        ║
║   Stability:  {result['initial']['stability']:.2f} → {result['compressed']['stability']:.2f} → {final['stability']:.2f}                                       ║
║   P_outcome:  {result['initial']['P_outcome']*100:.0f}% → {result['compressed']['P_outcome']*100:.0f}% → {final['P_outcome']*100:.0f}%                                          ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   📍 NODE X STATUS: DELETED (Context Switching)                               ║
║   🔐 STATE HASH: {result['state_hash']}                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
    return report

# ================================================================
# SAVE MARKER
# ================================================================

def save_marker(result):
    """마커 데이터 저장"""
    marker_path = Path(__file__).parent / "data" / "markers"
    marker_path.mkdir(parents=True, exist_ok=True)
    
    marker_file = marker_path / "marker_00001.json"
    
    marker_data = {
        "id": "#00001",
        "timestamp": INITIAL_DATA["timestamp"],
        "user_input": INITIAL_DATA["user_input"],
        "physics": result["final"],
        "mandala": result["mandala"],
        "state_hash": result["state_hash"],
        "status": "COMMITTED"
    }
    
    with open(marker_file, "w", encoding="utf-8") as f:
        json.dump(marker_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n📁 Marker saved: {marker_file}")
    return marker_file

# ================================================================
# MAIN
# ================================================================

if __name__ == "__main__":
    # Execute ignition
    result = execute_ignition()
    
    # Generate report
    report = generate_report(result)
    print(report)
    
    # Save marker
    save_marker(result)
    
    # Final status
    if result["final"]["P_outcome"] >= 0.90:
        print("\n🔒 COMMIT GATE: UNLOCKED — 90% THRESHOLD REACHED")
        print("   '당신의 미래는 이제 물리적 필연입니다.'")
    else:
        print(f"\n⚠️  COMMIT GATE: {result['final']['P_outcome']*100:.0f}% — 추가 최적화 권장")
        print("   'Constraint(N)를 더 늘리거나, 다른 간섭원을 제거하세요.'")
    
    print("\n" + "=" * 70)
    print("   AUTUS ENGINE: RUNNING")
    print("=" * 70)





