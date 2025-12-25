#!/usr/bin/env python3
"""
AUTUS Core - HUD Renderer
=========================
Tesla FSD 스타일 터미널 HUD
"""

import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .engine import AnalysisResult


class Color:
    """ANSI 색상"""
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'


class HUDRenderer:
    """HUD 렌더러"""
    
    WIDTH = 70
    
    def __init__(self, use_color: bool = True):
        self.use_color = use_color and sys.stdout.isatty()
    
    def c(self, color: str, text: str) -> str:
        return f"{color}{text}{Color.RESET}" if self.use_color else text
    
    def render(self, result: 'AnalysisResult'):
        """분석 결과 렌더링"""
        self._header(result)
        self._metrics(result)
        self._mva(result)
        self._footer(result)
    
    def _header(self, result: 'AnalysisResult'):
        print()
        print(self.c(Color.CYAN, "╔" + "═" * (self.WIDTH - 2) + "╗"))
        
        state_color = {
            "CRITICAL": Color.RED,
            "DANGER": Color.RED,
            "WARNING": Color.YELLOW,
            "STABLE": Color.GREEN
        }.get(result.state, Color.WHITE)
        
        title = f"AUTUS | {result.pack_name}"
        badge = self.c(state_color + Color.BOLD, f"[{result.state}]")
        
        print(self.c(Color.CYAN, "║") + 
              f"  {self.c(Color.BOLD, title)}  {badge}" +
              " " * (self.WIDTH - len(title) - len(result.state) - 12) +
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╠" + "═" * (self.WIDTH - 2) + "╣"))
    
    def _metrics(self, result: 'AnalysisResult'):
        # Loss Velocity
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.RED + Color.BOLD, f"  ⚡ LOSS: ₩{result.loss_velocity:,.2f}/sec") +
              " " * (self.WIDTH - 30) +
              self.c(Color.CYAN, "║"))
        
        # Risk Score
        risk_pct = result.risk_score * 100
        bar = self._make_bar(risk_pct, 100, 30)
        print(self.c(Color.CYAN, "║") + 
              f"  📊 RISK: {bar} {risk_pct:.0f}%" +
              " " * (self.WIDTH - 48) +
              self.c(Color.CYAN, "║"))
        
        # Pressure & Entropy
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.DIM, f"  P={result.pressure:.2f} | S={result.entropy:.2f}") +
              " " * (self.WIDTH - 28) +
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╠" + "─" * (self.WIDTH - 2) + "╣"))
    
    def _mva(self, result: 'AnalysisResult'):
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.GREEN + Color.BOLD, "  ✅ MVA") +
              " " * (self.WIDTH - 12) +
              self.c(Color.CYAN, "║"))
        
        mva = result.mva[:self.WIDTH - 8]
        print(self.c(Color.CYAN, "║") + 
              f"  → {mva}" +
              " " * (self.WIDTH - len(mva) - 6) +
              self.c(Color.CYAN, "║"))
        
        if result.alternatives:
            print(self.c(Color.CYAN, "║") + " " * (self.WIDTH - 2) + self.c(Color.CYAN, "║"))
            for i, alt in enumerate(result.alternatives[:3], 1):
                alt = alt[:self.WIDTH - 10]
                print(self.c(Color.CYAN, "║") + 
                      self.c(Color.DIM, f"  {i}. {alt}") +
                      " " * (self.WIDTH - len(alt) - 8) +
                      self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╠" + "─" * (self.WIDTH - 2) + "╣"))
    
    def _footer(self, result: 'AnalysisResult'):
        ts = result.timestamp.split("T")[1][:8] if "T" in result.timestamp else result.timestamp
        
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.DIM, f"  🕐 {ts} | {result.pack_id} v1.0") +
              " " * (self.WIDTH - 30) +
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╚" + "═" * (self.WIDTH - 2) + "╝"))
        print()
    
    def _make_bar(self, value: float, max_val: float, width: int) -> str:
        ratio = min(value / max_val, 1.0) if max_val else 0
        filled = int(ratio * width)
        
        if ratio >= 0.8:
            color = Color.RED
        elif ratio >= 0.5:
            color = Color.YELLOW
        else:
            color = Color.GREEN
        
        bar = self.c(color, "█" * filled) + self.c(Color.DIM, "░" * (width - filled))
        return f"[{bar}]"
