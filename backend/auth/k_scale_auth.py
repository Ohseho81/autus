"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS K-SCALE AUTHENTICATION & AUTHORIZATION
K2/K4/K10 역할 기반 접근 제어
═══════════════════════════════════════════════════════════════════════════════

원칙:
- K2 / K4 / K10 Role 분리
- API 레벨 접근 차단 (UI 차단만으로는 부족)
- K10만 Afterimage Replay 접근 가능
- K2는 Afterimage 존재 자체 인지 불가

절대 금지:
- Admin override
- Superuser bypass
"""

from fastapi import HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Set
from enum import IntEnum
from pydantic import BaseModel
from datetime import datetime
import hashlib
import hmac
import json

# ═══════════════════════════════════════════════════════════════════════════════
# K-SCALE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

class KScale(IntEnum):
    """K-Scale 레벨 정의 (불변)"""
    K2 = 2    # 책상 - 체감만
    K4 = 4    # 사무실 - 상태/제약
    K5 = 5    # 건물/도시 - 시뮬레이션
    K6 = 6    # 지역 - 그래프 시작
    K10 = 10  # 우주 - 관측만

class KScalePermissions:
    """K-Scale별 권한 매트릭스 (불변)"""
    
    # K2: 최소 권한 (체감만)
    K2_ALLOWED = frozenset([
        "GET /api/v1/physics/state",
        "GET /api/v1/physics/gate",
    ])
    
    # K4: 확장된 상태 접근
    K4_ALLOWED = frozenset([
        *K2_ALLOWED,
        "GET /api/v1/simulation/frame",
        "GET /api/v1/gravity/resolved",
    ])
    
    # K6: 그래프/네트워크 접근
    K6_ALLOWED = frozenset([
        *K4_ALLOWED,
        "GET /api/v1/simulation/frames",
        "GET /api/v1/gravity/presets",
    ])
    
    # K10: 전체 관측 (Afterimage 포함)
    K10_ALLOWED = frozenset([
        *K6_ALLOWED,
        "GET /api/v1/afterimage",
        "GET /api/v1/afterimage/replay",
        "GET /api/v1/afterimage/chain",
        "GET /api/v1/afterimage/verify",
    ])
    
    @classmethod
    def get_permissions(cls, scale: KScale) -> frozenset:
        """K-Scale에 따른 권한 반환"""
        if scale >= KScale.K10:
            return cls.K10_ALLOWED
        elif scale >= KScale.K6:
            return cls.K6_ALLOWED
        elif scale >= KScale.K4:
            return cls.K4_ALLOWED
        else:
            return cls.K2_ALLOWED

# ═══════════════════════════════════════════════════════════════════════════════
# USER CONTEXT
# ═══════════════════════════════════════════════════════════════════════════════

class UserContext(BaseModel):
    """사용자 컨텍스트 (불변)"""
    user_id: str
    k_scale: KScale
    region_id: Optional[str] = None
    permissions: Set[str]
    authenticated_at: datetime
    
    class Config:
        frozen = True

# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════════

security = HTTPBearer(auto_error=False)

# 실제 구현에서는 DB/Redis에서 조회
_mock_users = {
    "user_k2_001": {"k_scale": KScale.K2, "region_id": "seoul"},
    "user_k4_001": {"k_scale": KScale.K4, "region_id": "seoul"},
    "user_k6_001": {"k_scale": KScale.K6, "region_id": "korea"},
    "user_k10_001": {"k_scale": KScale.K10, "region_id": None},
}

def verify_token(token: str) -> Optional[dict]:
    """토큰 검증 (실제로는 JWT 검증)"""
    # Mock implementation
    if token.startswith("bearer_"):
        user_id = token.replace("bearer_", "")
        return _mock_users.get(user_id)
    return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserContext:
    """현재 사용자 컨텍스트 추출"""
    
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    user_data = verify_token(credentials.credentials)
    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    
    k_scale = user_data["k_scale"]
    permissions = KScalePermissions.get_permissions(k_scale)
    
    return UserContext(
        user_id=credentials.credentials.replace("bearer_", ""),
        k_scale=k_scale,
        region_id=user_data.get("region_id"),
        permissions=set(permissions),
        authenticated_at=datetime.utcnow()
    )

# ═══════════════════════════════════════════════════════════════════════════════
# AUTHORIZATION
# ═══════════════════════════════════════════════════════════════════════════════

class KScaleAuthorization:
    """K-Scale 기반 권한 검증"""
    
    def __init__(self, required_scale: KScale):
        self.required_scale = required_scale
    
    async def __call__(
        self, 
        request: Request,
        user: UserContext = Depends(get_current_user)
    ) -> UserContext:
        """권한 검증"""
        
        # K-Scale 레벨 체크
        if user.k_scale < self.required_scale:
            raise HTTPException(
                status_code=403,
                detail=f"Requires K{self.required_scale} or higher. Current: K{user.k_scale}"
            )
        
        # 경로 권한 체크
        path = f"{request.method} {request.url.path}"
        
        # 패턴 매칭 (실제로는 더 정교하게)
        path_allowed = False
        for allowed in user.permissions:
            if path.startswith(allowed.replace("GET ", f"{request.method} ")):
                path_allowed = True
                break
        
        if not path_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Path not allowed for K{user.k_scale}: {path}"
            )
        
        return user

# 편의 함수
def require_k2():
    """K2 이상 필요"""
    return KScaleAuthorization(KScale.K2)

def require_k4():
    """K4 이상 필요"""
    return KScaleAuthorization(KScale.K4)

def require_k6():
    """K6 이상 필요"""
    return KScaleAuthorization(KScale.K6)

def require_k10():
    """K10 필요"""
    return KScaleAuthorization(KScale.K10)

# ═══════════════════════════════════════════════════════════════════════════════
# AFTERIMAGE ACCESS CONTROL
# ═══════════════════════════════════════════════════════════════════════════════

async def require_afterimage_access(
    user: UserContext = Depends(get_current_user)
) -> UserContext:
    """
    Afterimage 접근 권한 검증
    
    - K10만 접근 가능
    - K2는 존재 자체 인지 불가
    """
    if user.k_scale < KScale.K10:
        # K2에게는 404 반환 (존재 자체 숨김)
        if user.k_scale <= KScale.K2:
            raise HTTPException(status_code=404, detail="Not found")
        # K4-K6에게는 권한 없음 표시
        raise HTTPException(
            status_code=403,
            detail="Afterimage access requires K10"
        )
    return user

# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOGGING (비노출)
# ═══════════════════════════════════════════════════════════════════════════════

class AuditLogger:
    """
    행위 기반 감사 로그 (비노출)
    
    - K2 Execute/Blockage 시도 로그
    - Gate 접근 시도 로그
    - UI에 표시 ❌
    - 내부 분석 전용
    """
    
    _logs: List[dict] = []
    
    @classmethod
    def log(
        cls,
        user_id: str,
        k_scale: KScale,
        action: str,
        resource: str,
        result: str,
        metadata: Optional[dict] = None
    ):
        """감사 로그 기록 (Append-only)"""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "k_scale": k_scale,
            "action": action,
            "resource": resource,
            "result": result,
            "metadata": metadata or {}
        }
        cls._logs.append(entry)
        # 실제로는 별도 로그 시스템에 전송
    
    @classmethod
    def log_gate_access(cls, user: UserContext, gate_state: str, node_id: str):
        """Gate 접근 로그"""
        cls.log(
            user_id=user.user_id,
            k_scale=user.k_scale,
            action="GATE_ACCESS",
            resource=f"node:{node_id}",
            result=gate_state,
            metadata={"gate_state": gate_state}
        )
    
    @classmethod
    def log_execute_attempt(cls, user: UserContext, node_id: str, blocked: bool):
        """Execute 시도 로그"""
        cls.log(
            user_id=user.user_id,
            k_scale=user.k_scale,
            action="EXECUTE_ATTEMPT",
            resource=f"node:{node_id}",
            result="BLOCKED" if blocked else "ALLOWED",
            metadata={"blocked": blocked}
        )
    
    @classmethod
    def log_afterimage_access(cls, user: UserContext, afterimage_id: str, allowed: bool):
        """Afterimage 접근 로그"""
        cls.log(
            user_id=user.user_id,
            k_scale=user.k_scale,
            action="AFTERIMAGE_ACCESS",
            resource=f"afterimage:{afterimage_id}",
            result="ALLOWED" if allowed else "DENIED",
            metadata={"allowed": allowed}
        )

# ═══════════════════════════════════════════════════════════════════════════════
# FORBIDDEN OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def deny_admin_override():
    """
    Admin Override 명시적 거부
    
    - Superuser bypass 불가
    - 모든 사용자는 K-Scale 제약 적용
    """
    raise HTTPException(
        status_code=403,
        detail="FORBIDDEN: Admin override does not exist in AUTUS. "
               "All users are subject to K-Scale constraints."
    )

def deny_superuser():
    """Superuser 명시적 거부"""
    raise HTTPException(
        status_code=403,
        detail="FORBIDDEN: Superuser role does not exist in AUTUS."
    )
