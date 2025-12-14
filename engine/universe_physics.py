"""Universe Physics - 확장 규칙"""
from typing import List
from engine.schema import (
    SolarState, GalaxySnapshot, UniverseSnapshot,
    ExternalSolar, InternalState, UniverseMetrics,
    AlignmentEvent, ContractEvent, PressureEvent
)

# ============================================================
# Alignment Factor (4축)
# ============================================================
def calc_alignment(goal: float, time: float, incentive: float, risk: float,
                   weights: dict = None) -> float:
    """
    Alignment = weighted average of 4 axes
    """
    if weights is None:
        weights = {"goal": 0.3, "time": 0.2, "incentive": 0.25, "risk": 0.25}
    
    alignment = (
        goal * weights["goal"] +
        time * weights["time"] +
        incentive * weights["incentive"] +
        risk * weights["risk"]
    )
    return max(0, min(1, alignment))

# ============================================================
# External Pressure
# ============================================================
def calc_external_pressure(externals: List[ExternalSolar]) -> float:
    """
    ExternalPressure = Σ(external.pressure × (1 - alignment))
    """
    if not externals:
        return 0.0
    
    total = sum(e.pressure * (1 - e.alignment) for e in externals)
    return total / len(externals)

# ============================================================
# Contract Entropy
# ============================================================
def calc_contract_entropy(contracts: List[ContractEvent]) -> float:
    """
    ContractEntropy = Σ(unresolved × weight) / total
    """
    if not contracts:
        return 0.0
    
    unresolved = sum(c.weight for c in contracts if not c.resolved)
    total = sum(c.weight for c in contracts)
    
    return unresolved / total if total > 0 else 0.0

# ============================================================
# Universe Aggregation
# ============================================================
def build_universe_snapshot(
    solar: SolarState,
    galaxy: GalaxySnapshot,
    externals: List[ExternalSolar],
    contracts: List[ContractEvent] = None
) -> UniverseSnapshot:
    """
    Solar + Galaxy + External → Universe
    """
    contracts = contracts or []
    
    # Internal
    internal = InternalState(
        pressure=solar.pressure,
        entropy=solar.entropy,
        gravity=galaxy.gravity
    )
    
    # External aggregation
    ext_pressure = calc_external_pressure(externals)
    contract_entropy = calc_contract_entropy(contracts)
    
    # Universe metrics
    total_pressure = solar.pressure + ext_pressure
    total_entropy = (solar.entropy + contract_entropy) / 2
    avg_alignment = sum(e.alignment for e in externals) / len(externals) if externals else 1.0
    
    # Risk = high entropy + low alignment + high pressure
    risk = (total_entropy * 0.4 + (1 - avg_alignment) * 0.3 + total_pressure * 0.3)
    
    universe_metrics = UniverseMetrics(
        pressure=round(total_pressure, 4),
        entropy=round(total_entropy, 4),
        alignment=round(avg_alignment, 4),
        risk=round(risk, 4)
    )
    
    return UniverseSnapshot(
        systems=galaxy.systems + len(externals),
        internal=internal,
        external=externals,
        universe=universe_metrics
    )

# ============================================================
# Default External Solars
# ============================================================
def create_default_externals() -> List[ExternalSolar]:
    """기본 외부 태양 3종"""
    return [
        ExternalSolar(
            external_id="ORG_001",
            type="ORG",
            gravity=0.63,
            pressure=0.22,
            entropy=0.31,
            alignment=0.74
        ),
        ExternalSolar(
            external_id="CITY_001",
            type="CITY",
            gravity=0.55,
            pressure=0.35,
            entropy=0.28,
            alignment=0.62
        ),
        ExternalSolar(
            external_id="NAT_001",
            type="NATION",
            gravity=0.48,
            pressure=0.41,
            entropy=0.33,
            alignment=0.58
        )
    ]
