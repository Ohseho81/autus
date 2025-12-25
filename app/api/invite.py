"""
AUTUS × Thiel Edition: Invite-Only System
초기 1,000명 창업자 한정 - Small Monopoly First

"Competition is for losers. Start with a small monopoly, then expand."
— Peter Thiel
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import secrets
import hashlib
from datetime import datetime
from dataclasses import dataclass, field

router = APIRouter(prefix="/api/invite", tags=["Invite"])


# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

MAX_FOUNDERS = 1000
INVITE_USES_PER_CODE = 3
PHASE_THRESHOLDS = {
    "GENESIS": 100,      # 0-100명: 창시자 단계
    "GROWTH": 500,       # 101-500명: 성장 단계
    "EXPANSION": 1000    # 501-1000명: 확장 단계
}


# ═══════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════

@dataclass
class InviteCode:
    code: str
    created_by: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    uses_remaining: int = INVITE_USES_PER_CODE
    used_by: list = field(default_factory=list)
    
    def use(self, founder_id: str) -> bool:
        if self.uses_remaining <= 0:
            return False
        self.uses_remaining -= 1
        self.used_by.append({"founder_id": founder_id, "time": datetime.utcnow()})
        return True


@dataclass
class Founder:
    id: str
    joined_at: datetime
    invited_by: Optional[str] = None
    invite_code_used: Optional[str] = None
    founder_number: int = 0
    tier: str = "STANDARD"  # GENESIS, EARLY, STANDARD


class InviteRequest(BaseModel):
    code: str
    founder_id: str


class InviteResponse(BaseModel):
    valid: bool
    message: str
    founder_number: Optional[int] = None
    remaining_slots: int
    network_size: int
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
# IN-MEMORY STORAGE (실제로는 DB)
# ═══════════════════════════════════════════════════════════════

INVITE_CODES: Dict[str, InviteCode] = {}
FOUNDERS: Dict[str, Founder] = {}
CURRENT_FOUNDER_COUNT = 0


def _init_genesis_codes():
    """초기 Genesis 코드 생성"""
    genesis_codes = [
        "AUTUS-THIE-L001",
        "AUTUS-ZERO-ONE1",
        "AUTUS-MONO-POLY",
        "AUTUS-FOUN-DER1",
        "AUTUS-SECR-ET01"
    ]
    for code in genesis_codes:
        INVITE_CODES[code] = InviteCode(
            code=code,
            created_by="AUTUS_CORE",
            uses_remaining=10  # Genesis 코드는 10회 사용 가능
        )


_init_genesis_codes()


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def generate_invite_code(created_by: str) -> str:
    """창업자 전용 초대 코드 생성"""
    raw = f"{created_by}:{secrets.token_hex(8)}:{datetime.utcnow().isoformat()}"
    hash_code = hashlib.sha256(raw.encode()).hexdigest()[:8].upper()
    
    # 형식: AUTUS-XXXX-XXXX
    formatted = f"AUTUS-{hash_code[:4]}-{hash_code[4:8]}"
    
    INVITE_CODES[formatted] = InviteCode(
        code=formatted,
        created_by=created_by
    )
    
    return formatted


def get_phase(count: int) -> str:
    """현재 단계 반환"""
    if count < PHASE_THRESHOLDS["GENESIS"]:
        return "GENESIS"
    elif count < PHASE_THRESHOLDS["GROWTH"]:
        return "GROWTH"
    else:
        return "EXPANSION"


def get_tier(founder_number: int) -> str:
    """창업자 등급 반환"""
    if founder_number <= 100:
        return "GENESIS"  # 최초 100명
    elif founder_number <= 500:
        return "EARLY"    # 초기 500명
    else:
        return "STANDARD"


def get_thiel_quote(phase: str) -> str:
    """단계별 Thiel 명언"""
    quotes = {
        "GENESIS": '"Every moment in business happens only once. The next Bill Gates will not build an operating system."',
        "GROWTH": '"The best entrepreneurs know this: every great business is built around a secret that\'s hidden from the outside."',
        "EXPANSION": '"Competition is for losers. If you want to capture lasting value, build a monopoly."'
    }
    return quotes.get(phase, quotes["GENESIS"])


# ═══════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/validate", response_model=InviteResponse)
async def validate_invite(request: InviteRequest):
    """초대 코드 검증 및 사용"""
    global CURRENT_FOUNDER_COUNT
    
    code = request.code.upper().strip()
    founder_id = request.founder_id
    
    # 이미 가입한 창업자인지 확인
    if founder_id in FOUNDERS:
        existing = FOUNDERS[founder_id]
        return InviteResponse(
            valid=True,
            message=f"이미 Founder #{existing.founder_number}로 등록되어 있습니다.",
            founder_number=existing.founder_number,
            remaining_slots=MAX_FOUNDERS - CURRENT_FOUNDER_COUNT,
            network_size=CURRENT_FOUNDER_COUNT,
            tier=existing.tier
        )
    
    # 슬롯 확인
    if CURRENT_FOUNDER_COUNT >= MAX_FOUNDERS:
        raise HTTPException(
            status_code=403,
            detail="초기 1,000명 모집 완료. 대기자 명단에 등록하세요."
        )
    
    # 코드 확인
    if code not in INVITE_CODES:
        raise HTTPException(
            status_code=400,
            detail="유효하지 않은 초대 코드입니다."
        )
    
    invite = INVITE_CODES[code]
    
    if invite.uses_remaining <= 0:
        raise HTTPException(
            status_code=400,
            detail="이 초대 코드는 모두 사용되었습니다."
        )
    
    # 코드 사용 처리
    if not invite.use(founder_id):
        raise HTTPException(status_code=400, detail="코드 사용 실패")
    
    CURRENT_FOUNDER_COUNT += 1
    founder_number = CURRENT_FOUNDER_COUNT
    tier = get_tier(founder_number)
    
    # 창업자 등록
    FOUNDERS[founder_id] = Founder(
        id=founder_id,
        joined_at=datetime.utcnow(),
        invited_by=invite.created_by,
        invite_code_used=code,
        founder_number=founder_number,
        tier=tier
    )
    
    phase = get_phase(CURRENT_FOUNDER_COUNT)
    
    return InviteResponse(
        valid=True,
        message=f"환영합니다, Founder #{founder_number}! {phase} 단계 진입.",
        founder_number=founder_number,
        remaining_slots=MAX_FOUNDERS - CURRENT_FOUNDER_COUNT,
        network_size=CURRENT_FOUNDER_COUNT,
        tier=tier
    )


@router.get("/generate")
async def generate_new_invite(founder_id: str):
    """기존 창업자가 새 초대 코드 생성"""
    
    # 등록된 창업자인지 확인
    if founder_id not in FOUNDERS:
        raise HTTPException(
            status_code=403,
            detail="네트워크 회원만 초대 코드를 생성할 수 있습니다."
        )
    
    founder = FOUNDERS[founder_id]
    
    # Genesis 창업자는 더 많은 초대 가능
    extra_uses = 2 if founder.tier == "GENESIS" else 0
    
    code = generate_invite_code(created_by=founder_id)
    INVITE_CODES[code].uses_remaining += extra_uses
    
    return {
        "code": code,
        "uses": INVITE_CODES[code].uses_remaining,
        "message": f"{INVITE_CODES[code].uses_remaining}명의 창업자를 초대할 수 있습니다.",
        "expires_in": "30일",
        "thiel_quote": '"Great companies have secrets. Your invite code is one."'
    }


@router.get("/stats")
async def get_invite_stats():
    """네트워크 통계"""
    phase = get_phase(CURRENT_FOUNDER_COUNT)
    fill_rate = CURRENT_FOUNDER_COUNT / MAX_FOUNDERS
    
    # 단계별 통계
    genesis_count = len([f for f in FOUNDERS.values() if f.tier == "GENESIS"])
    early_count = len([f for f in FOUNDERS.values() if f.tier == "EARLY"])
    standard_count = len([f for f in FOUNDERS.values() if f.tier == "STANDARD"])
    
    return {
        "total_founders": CURRENT_FOUNDER_COUNT,
        "max_founders": MAX_FOUNDERS,
        "remaining_slots": MAX_FOUNDERS - CURRENT_FOUNDER_COUNT,
        "fill_rate": round(fill_rate * 100, 1),
        "phase": phase,
        "tier_breakdown": {
            "genesis": genesis_count,
            "early": early_count,
            "standard": standard_count
        },
        "active_codes": len([c for c in INVITE_CODES.values() if c.uses_remaining > 0]),
        "thiel_quote": get_thiel_quote(phase),
        "monopoly_score": round(fill_rate * 100, 1)  # 점유율
    }


@router.get("/leaderboard")
async def get_invite_leaderboard():
    """초대 리더보드"""
    # 가장 많이 초대한 창업자
    invite_counts = {}
    for code in INVITE_CODES.values():
        if code.created_by and code.created_by != "AUTUS_CORE":
            used_count = INVITE_USES_PER_CODE - code.uses_remaining
            if code.created_by not in invite_counts:
                invite_counts[code.created_by] = 0
            invite_counts[code.created_by] += used_count
    
    leaderboard = sorted(invite_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return {
        "leaderboard": [
            {"founder_id": f_id, "invites": count, "rank": i + 1}
            for i, (f_id, count) in enumerate(leaderboard)
        ],
        "total_invites": sum(invite_counts.values()),
        "network_effect": f"x{1 + len(FOUNDERS) * 0.001:.2f}"  # 네트워크 효과 계수
    }


@router.post("/waitlist")
async def join_waitlist(email: str):
    """대기자 명단 등록"""
    # 실제로는 DB에 저장
    return {
        "success": True,
        "message": "대기자 명단에 등록되었습니다. 슬롯 오픈 시 안내드립니다.",
        "position": CURRENT_FOUNDER_COUNT + 100,  # 시뮬레이션
        "estimated_wait": "1,000명 모집 완료 후 Phase 2에서 오픈"
    }
