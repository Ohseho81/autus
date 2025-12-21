from fastapi import APIRouter
from pydantic import BaseModel
import sys
sys.path.insert(0, '.')

from core.connectors.trust_passport import trust_passport

router = APIRouter(prefix="/autus/passport", tags=["autus-passport"])

class PassportRequest(BaseModel):
    actor_id: str

@router.post("/check")
def check_passport(req: PassportRequest):
    raw = trust_passport.read({"actor_id": req.actor_id})
    features = trust_passport.extract_features(raw)
    score = trust_passport.compute_trust_score(features)
    return {
        "actor_id": req.actor_id,
        "trust_score": score,
        "features": len(features),
        "raw_sample": raw
    }

@router.get("/features")
def list_features():
    return {"features": trust_passport.FEATURE_IDS}
