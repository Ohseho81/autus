"""
AUTUS SDF/MSDF HUD Primitive Library v1.0
벡터급 선명도 보장
"""

# A-1) HUD Primitive 목록
PRIMITIVES = {
    "line": {
        "type": "LINE",
        "variants": ["straight", "rounded", "dashed"],
        "params": ["start", "end", "thickness", "dash_length", "gap_length"]
    },
    "arc": {
        "type": "ARC",
        "variants": ["ring", "dashed", "segmented"],
        "params": ["center", "radius", "start_angle", "end_angle", "thickness", "segments"]
    },
    "circle": {
        "type": "CIRCLE",
        "variants": ["solid", "ring", "dashed"],
        "params": ["center", "radius", "thickness", "fill"]
    },
    "grid": {
        "type": "GRID",
        "variants": ["cartesian", "radial", "hex"],
        "params": ["spacing", "line_width", "fade_edge"]
    },
    "panel": {
        "type": "PANEL",
        "variants": ["frame", "corner_ticks", "clip"],
        "params": ["width", "height", "corner_radius", "border_width", "tick_size"]
    },
    "tick": {
        "type": "TICK",
        "variants": ["ruler", "gauge", "scale"],
        "params": ["count", "length", "width", "major_interval"]
    },
    "badge": {
        "type": "BADGE",
        "variants": ["dot", "label", "alert"],
        "params": ["size", "pulse_rate", "glow_intensity"]
    },
    "text": {
        "type": "MSDF_TEXT",
        "variants": ["kpi", "label", "title"],
        "params": ["font_size", "letter_spacing", "align"]
    }
}

# A-3) 공통 Uniform
COMMON_UNIFORMS = {
    "u_time": "float",
    "u_seed": "float",
    "u_energy": "float",
    "u_flow": "float",
    "u_risk": "float",
    "u_entropy": "float",
    "u_pressure": "float",
    "u_glowGain": "float",
    "u_noiseGain": "float",
    "u_alert": "float",
    "u_resolution": "vec2",
    "u_color": "vec3",
    "u_emissive": "vec3"
}

# A-2) Shader 규칙
SHADER_RULES = {
    "antialiasing": "SDF smoothstep based",
    "thickness": "uniform controlled",
    "color_layers": ["base", "emissive"],
    "bloom_target": "emissive only",
    "text_rendering": "MSDF atlas"
}
