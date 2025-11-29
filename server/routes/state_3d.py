from fastapi import APIRouter
from protocols.state_3d_protocol import State3DProtocol

router = APIRouter()

@router.get("/3d/state", tags=["3d-hud"])
def get_3d_state():
    # 실제 구현에서는 packs 상태를 동적으로 수집
    packs_state = {
        "emo_cmms": {"status": "ok"},
        "jeju_school": {"status": "ok"},
        "nba_atb": {"status": "ok"}
    }
    return State3DProtocol().build_state(packs_state)
