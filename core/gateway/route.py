"""
Atlas Gateway - 전체 파이프라인 조합
"""
from typing import Dict, Any, List
from core.contract.atlas_envelope import AtlasEnvelope
from core.policy.gate import gate
from core.shadow.soa import ShadowVector32f
from core.features.apply_kernel1 import apply_kernel1
from core.physics.kernel2_core_to_derived import kernel2
from core.physics.kernel3_dynamics import kernel3
from core.audit.ledger import audit

class AtlasGateway:
    def __init__(self):
        self.s_history = []
    
    def process(self, envelope: AtlasEnvelope, features: List[Dict]) -> Dict[str, Any]:
        """
        Envelope → Policy → Features → Kernels → Shadow → Audit
        """
        # 1. Policy Gate
        for f in features:
            gate.check(f)
        
        # 2. Kernel 1: Feature → Slots
        slots = apply_kernel1(features)
        
        # 3. Kernel 2: Slots → Derived
        derived = kernel2(slots, [{"S": s} for s in self.s_history])
        
        # 4. Kernel 3: Dynamics
        self.s_history.append(derived["S"])
        if len(self.s_history) > 100:
            self.s_history.pop(0)
        
        dynamics = kernel3(derived, self.s_history)
        
        # 5. Shadow Vector
        shadow = ShadowVector32f.from_features(features)
        shadow_hash = shadow.hash()
        
        # 6. Audit
        audit_entry = audit.append(
            event_type=envelope.intent,
            shadow_hash=shadow_hash,
            metadata={"actor": envelope.actor_id, "target": envelope.target}
        )
        
        return {
            "slots": slots,
            "dynamics": dynamics,
            "shadow_hash": shadow_hash,
            "audit_hash": audit_entry["hash"],
            "envelope_hash": envelope.compute_hash()
        }

gateway = AtlasGateway()
