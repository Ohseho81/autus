"""
Render Mapping
- gauges → render params 변환
- 텍스트/추천 없이 "표현만 변경"
- tier0/tier1 모드 지원
"""

from pydantic import BaseModel, Field


class RenderParams(BaseModel):
    """Render parameters for frontend visualization"""
    # Line rendering
    line_opacity: float = Field(ge=0.0, le=1.0)
    line_width: float = Field(ge=0.5, le=4.0)
    
    # Node rendering
    node_opacity: float = Field(ge=0.0, le=1.0)
    node_glow: float = Field(ge=0.0, le=1.0)
    
    # Motion rendering
    motion_speed: float = Field(ge=0.1, le=2.0)
    motion_noise: float = Field(ge=0.0, le=1.0)
    
    # Field rendering
    field_density: float = Field(ge=0.0, le=1.0)
    field_turbulence: float = Field(ge=0.0, le=1.0)
    
    # Shadow rendering
    shadow_hatch_density: float = Field(ge=0.0, le=1.0)
    shadow_blur: float = Field(ge=0.0, le=1.0)


def compute_render_params(gauges: dict, mode: str = "tier0") -> RenderParams:
    """
    Compute render parameters from gauges.
    No recommendations, just visual mapping.
    
    tier0: balanced rendering
    tier1: high contrast rendering
    """
    stability = gauges.get("stability", 0.5)
    pressure = gauges.get("pressure", 0.5)
    drag = gauges.get("drag", 0.5)
    momentum = gauges.get("momentum", 0.5)
    volatility = gauges.get("volatility", 0.5)
    recovery = gauges.get("recovery", 0.5)
    
    if mode == "tier0":
        # Balanced rendering
        return RenderParams(
            line_opacity=0.3 + stability * 0.4,
            line_width=1.0 + momentum * 1.5,
            node_opacity=0.4 + stability * 0.4,
            node_glow=pressure * 0.6,
            motion_speed=0.5 + momentum * 1.0,
            motion_noise=volatility * 0.5,
            field_density=0.2 + drag * 0.3,
            field_turbulence=volatility * 0.4,
            shadow_hatch_density=0.3 + (1 - stability) * 0.4,
            shadow_blur=pressure * 0.3,
        )
    
    elif mode == "tier1":
        # High contrast rendering
        return RenderParams(
            line_opacity=0.2 + stability * 0.6,
            line_width=0.8 + momentum * 2.5,
            node_opacity=0.3 + stability * 0.6,
            node_glow=pressure * 0.8,
            motion_speed=0.3 + momentum * 1.5,
            motion_noise=volatility * 0.7,
            field_density=0.1 + drag * 0.5,
            field_turbulence=volatility * 0.6,
            shadow_hatch_density=0.2 + (1 - stability) * 0.6,
            shadow_blur=pressure * 0.5,
        )
    
    # Default to tier0
    return compute_render_params(gauges, "tier0")


def build_render_payload(gauges_dict: dict, mode: str = "tier0") -> dict:
    """Build render payload for frontend"""
    params = compute_render_params(gauges_dict, mode)
    return params.model_dump()
