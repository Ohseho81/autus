"""Universe Physics v2.0 - Alignment 통합"""
from typing import List
from engine.schema import (
    SolarState, GalaxySnapshot, UniverseSnapshot,
    ExternalSolar, InternalState, UniverseMetrics,
    ContractEvent
)
from engine.alignment import (
    AlignmentAxes, calc_alignment, get_weights_for_domain,
    calc_effective_external_pressure, calc_contract_entropy_gain,
    calc_universe_risk
)

def calc_external_pressure(externals: List[ExternalSolar]) -> float:
    if not externals:
        return 0.0
    return sum(e.pressure for e in externals) / len(externals)

def calc_contract_entropy(contracts: List[ContractEvent]) -> float:
    if not contracts:
        return 0.0
    unresolved = sum(c.weight for c in contracts if not c.resolved)
    total = sum(c.weight for c in contracts)
    return unresolved / total if total > 0 else 0.0

def build_universe_snapshot(
    solar: SolarState,
    galaxy: GalaxySnapshot,
    externals: List[ExternalSolar],
    contracts: List[ContractEvent] = None
) -> UniverseSnapshot:
    contracts = contracts or []
    
    internal = InternalState(
        pressure=solar.pressure,
        entropy=solar.entropy,
        gravity=galaxy.gravity
    )
    
    # External with alignment
    raw_ext_pressure = calc_external_pressure(externals)
    avg_alignment = sum(e.alignment for e in externals) / len(externals) if externals else 1.0
    
    # Apply alignment to reduce effective pressure
    eff_ext_pressure = calc_effective_external_pressure(raw_ext_pressure, avg_alignment)
    
    # Contract entropy with alignment suppression
    raw_contract_entropy = calc_contract_entropy(contracts)
    eff_contract_entropy = calc_contract_entropy_gain(raw_contract_entropy, avg_alignment)
    
    # Total metrics
    total_pressure = solar.pressure + eff_ext_pressure
    total_entropy = (solar.entropy + eff_contract_entropy) / 2
    risk = calc_universe_risk(eff_ext_pressure, total_entropy, avg_alignment)
    
    return UniverseSnapshot(
        systems=galaxy.systems + len(externals),
        internal=internal,
        external=externals,
        universe=UniverseMetrics(
            pressure=round(total_pressure, 4),
            entropy=round(total_entropy, 4),
            alignment=round(avg_alignment, 4),
            risk=round(risk, 4)
        )
    )

def create_default_externals() -> List[ExternalSolar]:
    return [
        ExternalSolar(external_id="ORG_001", type="ORG", gravity=0.63, pressure=0.22, entropy=0.31, alignment=0.74),
        ExternalSolar(external_id="CITY_001", type="CITY", gravity=0.55, pressure=0.35, entropy=0.28, alignment=0.62),
        ExternalSolar(external_id="NAT_001", type="NATION", gravity=0.48, pressure=0.41, entropy=0.33, alignment=0.58)
    ]
