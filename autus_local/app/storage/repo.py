"""
AUTUS Storage Repository v1.0
Based on DEFINITION.md Final Lock

- PersonRecord: 개인 데이터 (θ는 내부 전용)
- ReferenceAnchor: 사용자 정의 기준점 (Goal ❌)
- Persistence: 로컬 파일 저장만 (No Egress)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import json
import os
import hashlib
from ..core.models import (
    PersonId, StateVector, Theta, PersonNFTSnapshot, 
    Coalition, CoalitionMember, new_coalition, CostUnitLedger, LedgerEntry,
    ReferenceAnchor, DisplayState, core_to_display, compute_delta_s
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
SNAPSHOT_FILE = os.path.join(DATA_DIR, "snapshot.json")


@dataclass
class PersonRecord:
    """
    개인 기록
    
    ⚠️ theta는 절대 외부에 노출하지 않음
    """
    person_id: PersonId
    theta: Theta  # NEVER expose externally
    state: StateVector
    reference: Optional[ReferenceAnchor] = None  # User-defined reference (NOT goal)
    nft_chain: List[PersonNFTSnapshot] = field(default_factory=list)
    
    def get_display_state(self) -> DisplayState:
        """Get 3-axis display state from 6-axis core state"""
        return core_to_display(self.state)
    
    def get_delta_s(self) -> Optional[Dict[str, float]]:
        """Get ΔS from reference anchor"""
        if self.reference is None:
            return None
        display = self.get_display_state()
        return compute_delta_s(display, self.reference)


class Repo:
    def __init__(self):
        self.people: Dict[str, PersonRecord] = {}
        self.coalitions: Dict[str, Coalition] = {}
        self._seed = 42
        self._person_index = 0

    def _gen_theta(self, i: int) -> Theta:
        b = (self._seed * 31 + i * 17) % 1000
        return Theta(k_recovery=0.8 + (b % 40) / 100, k_drag=0.8 + ((b * 7) % 40) / 100, k_vol=0.8 + ((b * 13) % 40) / 100)

    def create_person(self) -> PersonRecord:
        pid = PersonId.new()
        rec = PersonRecord(person_id=pid, theta=self._gen_theta(self._person_index), state=StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5))
        self.people[pid.value] = rec
        self._person_index += 1
        return rec

    def get(self, pid: str) -> PersonRecord:
        return self.people[pid]

    def exists(self, pid: str) -> bool:
        return pid in self.people

    def list_person_ids(self) -> List[str]:
        return list(self.people.keys())

    def list_coalition_ids(self) -> List[str]:
        return list(self.coalitions.keys())

    def create_coalition(self) -> Coalition:
        c = new_coalition()
        self.coalitions[c.id] = c
        return c

    def get_coalition(self, cid: str) -> Coalition:
        return self.coalitions[cid]

    def add_member(self, cid: str, pid: str, weight: float) -> Coalition:
        c = self.get_coalition(cid)
        c.members = [m for m in c.members if m.person_id != pid]
        c.members.append(CoalitionMember(person_id=pid, weight=max(0.0, weight)))
        return c

    def remove_member(self, cid: str, pid: str) -> Coalition:
        c = self.get_coalition(cid)
        c.members = [m for m in c.members if m.person_id != pid]
        return c


class ExtendedLedger(CostUnitLedger):
    """Extended ledger with history access"""
    def get_entries(self, person: Optional[PersonId] = None) -> List[dict]:
        entries = self._entries
        if person:
            entries = [e for e in entries if e.person_id == person.value]
        return [{"t": e.t, "person_id": e.person_id, "delta_cu": e.delta_cu, "note": e.note} for e in entries]

    def clear(self):
        self._entries.clear()
        self._balance.clear()


repo = Repo()
ledger = ExtendedLedger()
GLOBAL_TIME = 0


def increment_time() -> int:
    global GLOBAL_TIME
    GLOBAL_TIME += 1
    return GLOBAL_TIME


def get_global_time() -> int:
    return GLOBAL_TIME


def reset_all():
    global GLOBAL_TIME
    GLOBAL_TIME = 0
    repo.people.clear()
    repo.coalitions.clear()
    repo._person_index = 0
    ledger.clear()


# ============ Persistence ============

def save_snapshot() -> str:
    """Save current state to file, return snapshot hash"""
    os.makedirs(DATA_DIR, exist_ok=True)
    
    data = {
        "global_time": GLOBAL_TIME,
        "person_index": repo._person_index,
        "people": {},
        "coalitions": {},
        "ledger_entries": ledger.get_entries(),
    }
    
    for pid, rec in repo.people.items():
        data["people"][pid] = {
            "theta": {"k_recovery": rec.theta.k_recovery, "k_drag": rec.theta.k_drag, "k_vol": rec.theta.k_vol},
            "state": rec.state.as_dict(),
            "nft_chain": [{"t": n.t, "state": n.state, "prev_hash": n.prev_hash, "state_hash": n.state_hash} for n in rec.nft_chain],
        }
    
    for cid, coal in repo.coalitions.items():
        data["coalitions"][cid] = {
            "members": [{"person_id": m.person_id, "weight": m.weight} for m in coal.members]
        }
    
    json_str = json.dumps(data, sort_keys=True)
    snapshot_hash = hashlib.sha256(json_str.encode()).hexdigest()[:16]
    
    with open(SNAPSHOT_FILE, "w") as f:
        f.write(json_str)
    
    return snapshot_hash


def load_snapshot() -> bool:
    """Load state from file, return True if successful"""
    global GLOBAL_TIME
    
    if not os.path.exists(SNAPSHOT_FILE):
        return False
    
    try:
        with open(SNAPSHOT_FILE, "r") as f:
            data = json.load(f)
        
        reset_all()
        GLOBAL_TIME = data.get("global_time", 0)
        repo._person_index = data.get("person_index", 0)
        
        for pid, pdata in data.get("people", {}).items():
            theta = Theta(**pdata["theta"])
            state = StateVector(**pdata["state"])
            nft_chain = [
                PersonNFTSnapshot(person_id=pid, t=n["t"], state=n["state"], prev_hash=n["prev_hash"], state_hash=n["state_hash"])
                for n in pdata.get("nft_chain", [])
            ]
            rec = PersonRecord(person_id=PersonId(value=pid), theta=theta, state=state, nft_chain=nft_chain)
            repo.people[pid] = rec
        
        for cid, cdata in data.get("coalitions", {}).items():
            members = [CoalitionMember(person_id=m["person_id"], weight=m["weight"]) for m in cdata.get("members", [])]
            repo.coalitions[cid] = Coalition(id=cid, members=members)
        
        for entry in data.get("ledger_entries", []):
            ledger._entries.append(LedgerEntry(t=entry["t"], person_id=entry["person_id"], delta_cu=entry["delta_cu"], note=entry.get("note", "")))
            ledger._balance[entry["person_id"]] = ledger._balance.get(entry["person_id"], 0.0) + entry["delta_cu"]
        
        return True
    except Exception:
        return False


def delete_snapshot() -> bool:
    """Delete snapshot file"""
    if os.path.exists(SNAPSHOT_FILE):
        os.remove(SNAPSHOT_FILE)
        return True
    return False


# ============ NFT Chain Verification ============

def verify_nft_chain(pid: str) -> dict:
    """Verify NFT chain integrity for a person"""
    try:
        rec = repo.get(pid)
    except KeyError:
        return {"valid": False, "error": "person not found"}
    
    if not rec.nft_chain:
        return {"valid": True, "length": 0, "message": "empty chain"}
    
    chain = rec.nft_chain
    errors = []
    
    for i, snap in enumerate(chain):
        # Verify hash
        payload = {"person_id": snap.person_id, "t": snap.t, "state": snap.state, "prev_hash": snap.prev_hash}
        expected_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        if snap.state_hash != expected_hash:
            errors.append({"index": i, "error": "hash mismatch"})
        
        # Verify chain link
        if i > 0 and snap.prev_hash != chain[i - 1].state_hash:
            errors.append({"index": i, "error": "chain broken"})
        
        # First element should have empty prev_hash
        if i == 0 and snap.prev_hash != "":
            errors.append({"index": i, "error": "genesis has prev_hash"})
    
    return {
        "valid": len(errors) == 0,
        "length": len(chain),
        "errors": errors,
    }







