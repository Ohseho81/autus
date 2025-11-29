import hashlib
import secrets
from typing import Tuple, Dict, List, Optional
from datetime import datetime

class Identity3DGenerator:
    GEOMETRIES = ["icosahedron", "dodecahedron", "octahedron", "tetrahedron", "sphere"]
    
    def __init__(self, seed: Optional[bytes] = None):
        self.seed = seed or secrets.token_bytes(32)
        self._hash = hashlib.sha256(self.seed).digest()
    
    @property
    def seed_hex(self) -> str:
        return self.seed.hex()
    
    def get_position(self) -> Tuple[float, float, float]:
        parts = [self.seed[0:10], self.seed[10:20], self.seed[20:32]]
        coords = []
        for part in parts:
            h = hashlib.sha256(part).digest()[:8]
            val = (int.from_bytes(h, "big") / (2**64)) * 2 - 1
            coords.append(round(val, 6))
        return tuple(coords)
    
    def get_color(self) -> Dict:
        hue = (self._hash[0] + self._hash[1]) % 360
        sat = 50 + (self._hash[2] % 30)
        light = 45 + (self._hash[3] % 20)
        return {
            "primary": self._hsl_to_hex(hue, sat, light),
            "secondary": self._hsl_to_hex((hue + 120) % 360, sat, light),
            "hsl": (hue, sat, light),
        }
    
    def get_shape(self) -> Dict:
        return {"geometry": self.GEOMETRIES[self._hash[4] % 5], "detail": 1 + (self._hash[5] % 4)}
    
    def get_full_3d_data(self) -> Dict:
        return {
            "seed_hash": self._hash.hex()[:16],
            "core": {
                "position": self.get_position(),
                "color": self.get_color(),
                "shape": self.get_shape(),
            },
            "generated_at": datetime.utcnow().isoformat(),
        }
    
    def _hsl_to_hex(self, h, s, l):
        s = s / 100
        light = l / 100
        c = (1 - abs(2 * light - 1)) * s
        x = c * (1 - abs((h / 60) % 2 - 1))
        m = light - c / 2
        if h < 60:
            r, g, b = c, x, 0
        elif h < 120:
            r, g, b = x, c, 0
        elif h < 180:
            r, g, b = 0, c, x
        elif h < 240:
            r, g, b = 0, x, c
        elif h < 300:
            r, g, b = x, 0, c
        else:
            r, g, b = c, 0, x
        return f"#{int((r + m) * 255):02x}{int((g + m) * 255):02x}{int((b + m) * 255):02x}"


class SurfaceEvolution:
    def __init__(self):
        self.interactions, self.patterns = [], []
    
    def record_pattern(self, name: str, category: str = "workflow"):
        ex = next((p for p in self.patterns if p["name"] == name), None)
        if ex:
            ex["count"] += 1
        else:
            self.patterns.append({"name": name, "category": category, "count": 1})
    
    def calculate_traits(self) -> Dict:
        return {
            "activity": min(len(self.interactions) / 100, 1.0),
            "learning": min(len(self.patterns) / 10, 1.0),
            "creativity": 0.5,
        }
    
    def get_satellites(self) -> List[Dict]:
        colors = {"workflow": "#4CAF50", "schedule": "#2196F3", "habit": "#9C27B0"}
        return [
            {
                "name": p["name"],
                "color": colors.get(p["category"], "#888"),
                "size": 0.1 + min(p["count"] / 10, 0.4),
            }
            for p in self.patterns
        ]


def generate_demo_data() -> Dict:
    gen = Identity3DGenerator()
    surf = SurfaceEvolution()
    for n in ["coder", "reviewer"]:
        surf.record_pattern(n)
    return {
        **gen.get_full_3d_data(),
        "surface": surf.calculate_traits(),
        "patterns": surf.get_satellites(),
    }
