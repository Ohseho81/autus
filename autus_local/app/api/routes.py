"""
AUTUS API Routes v1.0
Based on DEFINITION.md Final Lock

⚠️ FORBIDDEN:
- External API calls
- θ parameter exposure
- Recommendation endpoints
- Ranking endpoints
- Judgment text in responses

✅ ALLOWED:
- State observation
- Physics forecast
- Numbers/metrics display
- Immutable logging
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..storage.repo import (
    repo, ledger, increment_time, get_global_time, reset_all,
    save_snapshot, load_snapshot, delete_snapshot, verify_nft_chain
)
from ..core.models import (
    Action, aggregate_state, aggregate_cu, mint_snapshot,
    ReferenceAnchor, core_to_display, compute_delta_s
)
from ..core.physics import update_state, compute_cu_delta
from ..core.justice import check_justice, compute_justice_metrics, get_justice_ui_effects
from ..core.replay import replay, verify_determinism, generate_deterministic_steps, StepInput
from ..core.metrics import project_efr, compute_dp_os_or, action_preview, trend_arrow

router = APIRouter()


# ============ Request Models ============

class StepIn(BaseModel):
    action: Action
    focus: float = 1.0
    commit: float = 1.0
    option_loss: float = 0.5


class CoalitionMemberIn(BaseModel):
    person_id: str
    weight: float = 1.0


class SimulateIn(BaseModel):
    n: int = 10
    steps: int = 50


class ReplayVerifyIn(BaseModel):
    person_id: str
    runs: int = 3


class ReferenceAnchorIn(BaseModel):
    """
    Reference Anchor (NOT Goal!)
    
    This is NOT an optimization target.
    Just a user-defined reference point for ΔS calculation.
    """
    E: float
    F: float
    R: float


# ============ Person APIs ============

@router.post("/person")
def create_person():
    return {"person_id": repo.create_person().person_id.value}


@router.get("/persons")
def list_persons():
    """List all person IDs"""
    ids = repo.list_person_ids()
    return {"count": len(ids), "person_ids": ids}


@router.get("/person/{pid}/state")
def get_state(pid: str):
    """Get 6-axis core state (internal physics kernel)"""
    try:
        return repo.get(pid).state.as_dict()
    except KeyError:
        raise HTTPException(404, "not found")


@router.get("/person/{pid}/display")
def get_display_state(pid: str):
    """
    Get 3-axis display state (E, F, R)
    
    This is what the UI shows to the user.
    E = f(stability, recovery)
    F = f(momentum, drag)
    R = f(pressure, volatility)
    """
    try:
        rec = repo.get(pid)
        display = rec.get_display_state()
        return display.as_dict()
    except KeyError:
        raise HTTPException(404, "not found")


@router.get("/person/{pid}/delta-s")
def get_delta_s(pid: str):
    """
    Get ΔS (State Deviation from Reference)
    
    Returns direction and magnitude only - NO judgment.
    Requires reference anchor to be set first.
    """
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    
    if rec.reference is None:
        return {"error": "no reference anchor set", "delta_s": None}
    
    delta = rec.get_delta_s()
    display = rec.get_display_state()
    
    return {
        "current": display.as_dict(),
        "reference": rec.reference.as_dict(),
        "delta_s": delta,
    }


@router.post("/person/{pid}/reference")
def set_reference_anchor(pid: str, body: ReferenceAnchorIn):
    """
    Set Reference Anchor (NOT Goal!)
    
    ⚠️ This is NOT:
    - An optimization target
    - An evaluation standard
    - An ideal state
    
    ✅ This IS:
    - A user-defined reference point
    - Used ONLY for calculating ΔS magnitude
    """
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    
    # Clamp values to [0, 1]
    rec.reference = ReferenceAnchor(
        E=max(0.0, min(1.0, body.E)),
        F=max(0.0, min(1.0, body.F)),
        R=max(0.0, min(1.0, body.R)),
    )
    
    return {
        "ok": True,
        "reference": rec.reference.as_dict(),
        "message": "Reference anchor set. This is NOT a goal."
    }


@router.get("/person/{pid}/reference")
def get_reference_anchor(pid: str):
    """Get current reference anchor"""
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    
    if rec.reference is None:
        return {"reference": None}
    
    return {"reference": rec.reference.as_dict()}


@router.get("/person/{pid}/metrics")
def get_metrics(pid: str):
    """
    Get UI metrics for display.
    
    Returns:
    - efr: E/F/R projection (3D display state)
    - panel: DP/OS/OR (Decision Power, Option Space, Overdose Risk)
    - trend: Direction arrows (UP/DOWN/FLAT)
    - preview: Action previews (physics outcome, NOT recommendation)
    
    ⚠️ This is NOT guidance or recommendation.
    ⚠️ Numbers and directions only.
    """
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    
    S = rec.state
    
    # E/F/R projection
    efr = project_efr(S)
    
    # Result panel (DP/OS/OR)
    panel = compute_dp_os_or(S)
    
    # Action preview (physics outcome, NOT recommendation)
    preview = action_preview(S, rec.theta)
    
    # Trend calculation (from NFT chain history)
    if len(rec.nft_chain) >= 2:
        prev_state_dict = rec.nft_chain[-2].state
        from ..core.models import StateVector
        prev_S = StateVector(**prev_state_dict)
        prev_panel = compute_dp_os_or(prev_S)
        trend = {
            "DP": trend_arrow(panel["DP"], prev_panel["DP"]),
            "OS": trend_arrow(panel["OS"], prev_panel["OS"]),
            "OR": trend_arrow(panel["OR"], prev_panel["OR"]),
        }
    else:
        trend = {"DP": "FLAT", "OS": "FLAT", "OR": "FLAT"}
    
    return {
        "efr": efr,          # E/F/R
        "panel": panel,      # DP/OS/OR
        "trend": trend,      # UP/DOWN/FLAT
        "preview": preview,  # action → {E,F,R,DP,OS,OR}
    }


@router.post("/person/{pid}/step")
def step(pid: str, body: StepIn):
    """
    Execute one step in the physics simulation
    
    Returns both 6-axis core state and 3-axis display state.
    Also returns ΔS if reference anchor is set.
    """
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    
    t = increment_time()
    rec.state = update_state(rec.state, body.action, rec.theta)
    delta_cu = compute_cu_delta(body.focus, body.commit, body.option_loss)
    ledger.add_cost(t, rec.person_id, delta_cu)
    prev_hash = rec.nft_chain[-1].state_hash if rec.nft_chain else ""
    snap = mint_snapshot(rec.person_id, t, rec.state, prev_hash)
    rec.nft_chain.append(snap)
    
    justice = check_justice(rec.state)
    ui_effects = get_justice_ui_effects(justice)
    display = rec.get_display_state()
    delta_s = rec.get_delta_s()
    
    return {
        "t": t,
        "core_state": rec.state.as_dict(),      # 6-axis (internal)
        "display_state": display.as_dict(),      # 3-axis (UI)
        "delta_s": delta_s,                      # ΔS from reference
        "cu_balance": ledger.balance(rec.person_id),
        "nft_hash": snap.state_hash,
        "justice": {
            "triggered": justice.triggered,
            "or_level": round(justice.or_level, 4),
            "ui_effects": ui_effects,
        }
    }


@router.get("/person/{pid}/cu")
def get_cu(pid: str):
    try:
        return {"balance": ledger.balance(repo.get(pid).person_id)}
    except KeyError:
        raise HTTPException(404, "not found")


@router.get("/person/{pid}/cu/history")
def get_cu_history(pid: str):
    """Get CU transaction history for a person"""
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    entries = ledger.get_entries(rec.person_id)
    return {"person_id": pid, "count": len(entries), "entries": entries, "balance": ledger.balance(rec.person_id)}


@router.get("/person/{pid}/justice")
def get_justice(pid: str):
    """
    Get Justice status
    
    ⚠️ UI should NOT display explicit alerts.
    Use the ui_effects for implicit feedback only:
    - OR (Overdose Risk) percentage
    - Available options count
    - Spin speed multiplier
    - Cooldown timer
    """
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    
    m = compute_justice_metrics(rec.state)
    d = check_justice(rec.state)
    ui = get_justice_ui_effects(d)
    
    return {
        "metrics": {
            "influence_concentration": round(m.influence_concentration, 4),
            "recovery_half_life": round(m.recovery_half_life, 4),
            "optionality_loss_rate": round(m.optionality_loss_rate, 4),
            "gini_coefficient": round(m.gini_coefficient, 4),
            "contagion_risk": round(m.contagion_risk, 4),
            "overdose_risk": round(m.overdose_risk, 4),
        },
        "triggered": d.triggered,
        "or_level": round(d.or_level, 4),
        "ui_effects": ui,
    }


# ============ NFT APIs ============

@router.get("/person/{pid}/nft/latest")
def get_latest_nft(pid: str):
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    if not rec.nft_chain:
        return {}
    snap = rec.nft_chain[-1]
    return {"t": snap.t, "state": snap.state, "hash": snap.state_hash, "prev": snap.prev_hash}


@router.get("/person/{pid}/nft/chain")
def get_nft_chain(pid: str):
    """Get full NFT chain for a person"""
    try:
        rec = repo.get(pid)
    except KeyError:
        raise HTTPException(404, "not found")
    chain = [{"t": n.t, "state": n.state, "hash": n.state_hash, "prev": n.prev_hash} for n in rec.nft_chain]
    return {"person_id": pid, "length": len(chain), "chain": chain}


@router.get("/person/{pid}/nft/verify")
def verify_nft(pid: str):
    """Verify NFT chain integrity"""
    result = verify_nft_chain(pid)
    if "error" in result and result.get("error") == "person not found":
        raise HTTPException(404, "not found")
    return result


# ============ Coalition APIs ============

@router.post("/coalition")
def create_coalition():
    return {"coalition_id": repo.create_coalition().id}


@router.get("/coalitions")
def list_coalitions():
    """List all coalition IDs"""
    ids = repo.list_coalition_ids()
    return {"count": len(ids), "coalition_ids": ids}


@router.post("/coalition/{cid}/member")
def add_coalition_member(cid: str, body: CoalitionMemberIn):
    try:
        c = repo.add_member(cid, body.person_id, body.weight)
    except KeyError as e:
        raise HTTPException(404, str(e))
    return {"coalition_id": c.id, "members": [{"person_id": m.person_id, "weight": m.weight} for m in c.members]}


@router.delete("/coalition/{cid}/member/{pid}")
def remove_coalition_member(cid: str, pid: str):
    try:
        c = repo.remove_member(cid, pid)
    except KeyError as e:
        raise HTTPException(404, str(e))
    return {"coalition_id": c.id, "members": [{"person_id": m.person_id, "weight": m.weight} for m in c.members]}


@router.get("/coalition/{cid}")
def view_coalition(cid: str):
    try:
        c = repo.get_coalition(cid)
    except KeyError:
        raise HTTPException(404, "not found")
    states = {pid: repo.get(pid).state for pid in repo.list_person_ids()}
    agg_state = aggregate_state(states, c.members)
    balances = {pid: ledger.balance(repo.get(pid).person_id) for pid in repo.list_person_ids()}
    agg_cu = aggregate_cu(balances, c.members)
    justice = check_justice(agg_state)
    return {"coalition_id": c.id, "members": [{"person_id": m.person_id, "weight": m.weight} for m in c.members], "state": agg_state.as_dict(), "cu": agg_cu, "justice_triggered": justice.triggered}


# ============ Replay & Determinism APIs ============

@router.post("/replay/verify")
def replay_verify(body: ReplayVerifyIn):
    """Verify replay determinism for a person's history"""
    try:
        rec = repo.get(body.person_id)
    except KeyError:
        raise HTTPException(404, "not found")
    
    if not rec.nft_chain:
        return {"verified": True, "steps": 0, "message": "no history"}
    
    # Rebuild steps from NFT chain (we can infer actions aren't stored, so use deterministic test)
    initial = rec.state.copy()
    # Reset to initial state for test
    initial.stability = initial.pressure = initial.drag = initial.momentum = initial.volatility = initial.recovery = 0.5
    
    steps = generate_deterministic_steps(len(rec.nft_chain))
    verified = verify_determinism(initial, rec.theta, steps, runs=body.runs)
    
    return {
        "verified": verified,
        "steps": len(steps),
        "runs": body.runs,
        "message": "deterministic" if verified else "non-deterministic detected"
    }


@router.post("/replay/run")
def replay_run(body: ReplayVerifyIn):
    """Run replay and return state history"""
    try:
        rec = repo.get(body.person_id)
    except KeyError:
        raise HTTPException(404, "not found")
    
    initial = rec.state.copy()
    initial.stability = initial.pressure = initial.drag = initial.momentum = initial.volatility = initial.recovery = 0.5
    
    steps = generate_deterministic_steps(min(body.runs, 100))  # limit for safety
    states = replay(initial, rec.theta, steps)
    
    return {
        "person_id": body.person_id,
        "steps": len(states),
        "history": [s.as_dict() for s in states]
    }


# ============ Persistence APIs ============

@router.post("/snapshot/save")
def snapshot_save():
    """Save current state to disk"""
    try:
        hash_val = save_snapshot()
        return {"ok": True, "hash": hash_val}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/snapshot/load")
def snapshot_load():
    """Load state from disk"""
    success = load_snapshot()
    if success:
        return {"ok": True, "time": get_global_time(), "persons": len(repo.list_person_ids()), "coalitions": len(repo.list_coalition_ids())}
    else:
        return {"ok": False, "message": "no snapshot found or load failed"}


@router.delete("/snapshot")
def snapshot_delete():
    """Delete snapshot file"""
    deleted = delete_snapshot()
    return {"ok": True, "deleted": deleted}


# ============ CU Ledger APIs ============

@router.get("/ledger")
def get_ledger(limit: int = 100):
    """Get all CU ledger entries"""
    entries = ledger.get_entries()
    return {"count": len(entries), "entries": entries[-limit:]}


# ============ System APIs ============

@router.post("/simulate")
def simulate(body: SimulateIn):
    reset_all()
    ids = [repo.create_person().person_id.value for _ in range(body.n)]
    for s in range(body.steps):
        for i, pid in enumerate(ids):
            idx = (i * 7 + s * 3) % 10
            action = Action.HOLD if idx < 4 else Action.PUSH if idx < 7 else Action.DRIFT
            step(pid, StepIn(action=action))
    return {"people": len(ids), "steps": body.steps, "final_time": get_global_time()}


@router.get("/time")
def get_time():
    return {"t": get_global_time()}


@router.post("/reset")
def reset():
    reset_all()
    return {"ok": True}


@router.get("/health")
def health():
    return {"status": "ok", "local": True}


# ============ Kernel Integration APIs ============
# AUTUS calls Kernel Service (port 8001)

@router.get("/kernel/health")
def kernel_health():
    """Check Kernel Service health"""
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.health()
    return resp.data if resp.success else {"error": resp.error}


@router.post("/kernel/step")
def kernel_step(motion_id: str, params: dict = None):
    """
    Execute motion through Kernel Service.
    
    AUTUS does NOT calculate physics directly.
    Kernel Service handles all deterministic computation.
    """
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.step(motion_id, params)
    return resp.data if resp.success else {"error": resp.error}


@router.get("/kernel/state")
def kernel_state():
    """Get state from Kernel Service"""
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.get_state()
    return resp.data if resp.success else {"error": resp.error}


@router.post("/kernel/forecast")
def kernel_forecast(motion_sequence: List[str], steps: int = 5):
    """
    Get forecast from Kernel Service.
    
    [NO RECOMMENDATION PROVIDED]
    User decides.
    """
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.forecast(motion_sequence, steps)
    return resp.data if resp.success else {"error": resp.error}


@router.post("/kernel/gate")
def kernel_gate(motion_id: str, consent: bool = False):
    """
    Level 3 Consent Gate through Kernel.
    
    consent=False: Preview only
    consent=True: Execute with consent
    """
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.gate_consent(motion_id, consent)
    return resp.data if resp.success else {"error": resp.error}


@router.get("/kernel/log")
def kernel_log(start: int = 0, limit: int = 100):
    """Get log entries from Kernel chain"""
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.get_log_entries(start, limit)
    return resp.data if resp.success else {"error": resp.error}


@router.get("/kernel/verify")
def kernel_verify():
    """Verify Kernel chain integrity"""
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.verify_log()
    return resp.data if resp.success else {"error": resp.error}


@router.post("/kernel/replay")
def kernel_replay(motion_sequence: List[str]):
    """Replay motion sequence through Kernel"""
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.replay_sequence(motion_sequence)
    return resp.data if resp.success else {"error": resp.error}


@router.post("/kernel/llm/validate")
def kernel_llm_validate(raw_text: str):
    """
    Validate LLM output through Kernel validator.
    
    LLM raw output → Validator → VALID or BLOCKED
    """
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.validate_llm(raw_text)
    return resp.data if resp.success else {"error": resp.error}


@router.get("/kernel/registry")
def kernel_registry():
    """Get motion registry (68 motions)"""
    from ..kernel_client import get_kernel_client
    client = get_kernel_client()
    resp = client.get_registry()
    return resp.data if resp.success else {"error": resp.error}


@router.get("/stats")
def get_stats():
    """Get system statistics"""
    return {
        "time": get_global_time(),
        "persons": len(repo.list_person_ids()),
        "coalitions": len(repo.list_coalition_ids()),
        "ledger_entries": len(ledger.get_entries()),
    }







