"""
AUTUS GlobePack Hybrid HQ v1.0
실사 + 디지털 혼합 지구
"""

GLOBE_PACK_SPEC = {
    "pack_id": "GlobePack_Hybrid_HQ",
    "version": "1.0",
    
    # 지오메트리
    "geometry": {
        "earth_sphere": {
            "type": "SphereGeometry",
            "radius": 1.0,
            "segments": 128,  # HQ
            "lod_levels": [128, 64, 32]
        },
        "atmosphere": {
            "type": "SphereGeometry",
            "radius": 1.02,
            "segments": 64
        },
        "grid_sphere": {
            "type": "SphereGeometry",
            "radius": 1.01,
            "segments": 48
        },
        "orbit_rings": {
            "type": "RingGeometry",
            "inner_radius": 1.3,
            "outer_radius": 1.32,
            "count": 3
        },
        "node_cloud": {
            "type": "InstancedPoints",
            "max_count": 500
        }
    },
    
    # 머티리얼/셰이더
    "materials": {
        "earth": {
            "type": "ShaderMaterial",
            "uniforms": [
                "u_time",
                "u_terminator_phase",
                "u_day_intensity",
                "u_night_intensity",
                "u_rim_color",
                "u_rim_power"
            ],
            "features": ["terminator", "rim_glow", "fresnel"]
        },
        "atmosphere": {
            "type": "ShaderMaterial",
            "uniforms": ["u_glow_color", "u_glow_intensity", "u_falloff"],
            "blend": "AdditiveBlending",
            "transparent": True
        },
        "grid": {
            "type": "ShaderMaterial",
            "uniforms": ["u_grid_color", "u_grid_opacity", "u_pulse"],
            "wireframe": True,
            "transparent": True
        },
        "orbit": {
            "type": "MeshBasicMaterial",
            "color": "#00d4ff",
            "opacity": 0.3,
            "transparent": True
        },
        "nodes": {
            "type": "PointsMaterial",
            "size": 0.02,
            "color": "#00ff88",
            "sizeAttenuation": True
        }
    },
    
    # TwinState 바인딩
    "bindings": {
        "u_terminator_phase": "lerp(0, 2*PI, time * 0.1)",
        "u_day_intensity": "lerp(0.8, 1.0, energy)",
        "u_night_intensity": "lerp(0.1, 0.4, entropy)",
        "u_rim_power": "lerp(2.0, 4.0, pressure)",
        "u_glow_intensity": "lerp(0.3, 0.8, energy)",
        "u_grid_opacity": "lerp(0.1, 0.3, flow)",
        "u_pulse": "sin(time * lerp(1, 3, risk))",
        "node_count": "round(lerp(50, 500, flow))"
    }
}
