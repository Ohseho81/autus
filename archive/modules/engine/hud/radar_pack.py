"""
AUTUS RadarPack HQ v1.0
SDF 기반 레이더/스캔/타겟 HUD
"""

RADAR_PACK_SPEC = {
    "pack_id": "RadarPack_HQ",
    "version": "1.0",
    
    "scene_tree": [
        "RadarGrid",
        "SweepArc", 
        "TargetBlips",
        "Trajectories",
        "ThresholdBands",
        "Labels",
        "AlertOverlay"
    ],
    
    "components": {
        "radar_grid": {
            "type": "SDF_RADIAL_GRID",
            "params": {
                "radius_max": 1.0,
                "rings": {"min": 6, "max": 12, "default": 8},
                "spokes": {"min": 12, "max": 36, "default": 24},
                "thickness": "lerp(0.6, 1.2, u_energy)",
                "opacity": "lerp(0.25, 0.6, u_stability)"
            }
        },
        "sweep_arc": {
            "type": "SDF_ARC",
            "motion": "SWEEP",
            "params": {
                "rate": "lerp(0.15, 1.20, u_risk)",
                "width_deg": "lerp(6, 18, u_pressure)",
                "fade": 0.85,
                "noise": "lerp(0.0, 0.2, u_entropy)"
            },
            "emissive": True
        },
        "target_blips": {
            "type": "INSTANCED_POINTS",
            "max_count": 20000,
            "lifecycle": ["spawn", "peak", "decay", "die"],
            "params": {
                "count": "round(lerp(2, 60, u_risk))",
                "blink_hz": "lerp(0.5, 2.5, u_entropy)",
                "intensity": "lerp(0.4, 1.0, u_energy)",
                "lifetime_s": "lerp(1.5, 6.0, u_flow)"
            }
        },
        "threshold_bands": {
            "type": "SDF_RINGS",
            "levels": 3,
            "params": {
                "tightness": "lerp(0.2, 0.9, u_pressure)",
                "jitter": "lerp(0.0, 0.08, u_entropy)"
            },
            "colors": ["#00ff88", "#ffaa00", "#ff4444"]
        },
        "alert_overlay": {
            "trigger": "u_risk > 0.7",
            "effects": ["color_shift", "sweep_amplify", "threshold_highlight"]
        }
    },
    
    "uniform_bindings": {
        "u_risk": ["sweep.rate", "target.count", "alert.intensity"],
        "u_entropy": ["sweep.noise", "blip.blink"],
        "u_pressure": ["sweep.width", "threshold.tightness"],
        "u_flow": ["blip.lifetime"],
        "u_energy": ["grid.emissive", "target.emissive"]
    }
}
