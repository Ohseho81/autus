"""
AUTUS API Dependencies
Shared dependencies for FastAPI endpoints
"""

from fastapi import Depends, Query, HTTPException
from typing import Optional
from core.view_scope import ViewScope, Role


async def get_view_scope(
    role: Role = Query(default=Role.student, description="User role"),
    subject_id: str = Query(default="Z_test123", description="User's Zero ID"),
    org_id: Optional[str] = Query(default=None, description="Organization ID"),
    location_id: Optional[str] = Query(default=None, description="Location/Building ID"),
    city_id: Optional[str] = Query(default=None, description="City ID"),
) -> ViewScope:
    """
    Get ViewScope from query parameters.
    
    Usage in endpoint:
        @router.get("/me")
        async def get_me(scope: ViewScope = Depends(get_view_scope)):
            ...
    """
    return ViewScope(
        role=role,
        subject_id=subject_id,
        org_id=org_id,
        location_id=location_id,
        city_id=city_id,
    )


async def require_god_mode(
    role: Role = Query(..., description="Must be 'seho' for god mode"),
) -> Role:
    """
    Require god mode (seho role) for an endpoint.
    Returns 403 if not seho.
    
    Usage:
        @router.get("/god/universe")
        async def universe(role: Role = Depends(require_god_mode)):
            ...
    """
    if role != Role.seho:
        raise HTTPException(
            status_code=403,
            detail="God Mode required. Use ?role=seho"
        )
    return role

