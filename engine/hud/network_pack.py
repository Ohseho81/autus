"""
AUTUS NetworkPack HQ v1.0
Node/Link/Heat 네트워크 시각화
"""

NETWORK_PACK_SPEC = {
    "pack_id": "NetworkPack_HQ",
    "version": "1.0",
    
    "scene_tree": [
        "BackgroundGrid",
        "HeatOverlay",
        "LinkLines",
        "NodeCloud",
        "Labels",
        "AlertOverlay"
    ],
    
    "components": {
        "background_grid": {
            "type": "SDF_GRID",
            "params": {
                "spacing": 40,
                "opacity": "lerp(0.1, 0.25, u_energy)"
            }
        },
        "heat_overlay": {
            "type": "GRADIENT_MESH",
            "params": {
                "intensity": "lerp(0.0, 0.4, u_pressure)",
                "colors": ["#001a33", "#004466", "#ff4444"]
            }
        },
        "link_lines": {
            "type": "SDF_LINES",
            "params": {
                "thickness": "lerp(0.5, 2.0, u_flow)",
                "glow": "lerp(0.2, 0.6, u_energy)",
                "threshold": 0.3
            }
        },
        "node_cloud": {
            "type": "INSTANCED_POINTS",
            "max_count": 500,
            "params": {
                "size": "lerp(4, 12, u_energy)",
                "pulse": "PULSE(u_flow)",
                "flicker": "lerp(0.0, 0.3, u_entropy)"
            }
        },
        "labels": {
            "type": "MSDF_TEXT",
            "params": {
                "size": 10,
                "opacity": 0.7
            }
        },
        "alert_overlay": {
            "trigger": "u_risk > 0.7",
            "effects": ["node_highlight", "link_pulse"]
        }
    },
    
    "uniform_bindings": {
        "u_flow": ["link.thickness", "node.pulse"],
        "u_energy": ["node.size", "link.glow", "grid.opacity"],
        "u_entropy": ["node.flicker", "link.noise"],
        "u_pressure": ["heat.intensity"],
        "u_risk": ["alert.trigger", "node.highlight"]
    }
}
