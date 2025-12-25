#!/usr/bin/env python3
"""
AUTUS 2.0 HUD Renderer
======================
Tesla FSD 스타일 터미널 HUD 출력

기능:
- 손실 속도 (Loss Velocity) 실시간 표시
- PNR (Point of No Return) 마커
- MVA (Minimal Viable Action) 하이라이트
- 7대 노이즈 게이지
"""

import sys
import os
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from autus_distiller import HUDOutput, NoiseIndicator

# ═══════════════════════════════════════════════════════════════════════════════
# ANSI COLOR CODES (터미널 호환)
# ═══════════════════════════════════════════════════════════════════════════════

class Color:
    # 기본 색상
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    
    # 스타일
    BOLD = '\033[1m'
    DIM = '\033[2m'
    UNDERLINE = '\033[4m'
    BLINK = '\033[5m'
    
    # 배경
    BG_RED = '\033[41m'
    BG_GREEN = '\033[42m'
    BG_YELLOW = '\033[43m'
    BG_BLUE = '\033[44m'
    
    # 리셋
    RESET = '\033[0m'


# ═══════════════════════════════════════════════════════════════════════════════
# HUD RENDERER
# ═══════════════════════════════════════════════════════════════════════════════

class HUDRenderer:
    """Tesla FSD 스타일 HUD 렌더러"""
    
    WIDTH = 70
    
    def __init__(self, use_color: bool = True):
        self.use_color = use_color and sys.stdout.isatty()
    
    def c(self, color: str, text: str) -> str:
        """색상 적용"""
        if self.use_color:
            return f"{color}{text}{Color.RESET}"
        return text
    
    def render(self, hud: 'HUDOutput'):
        """HUD 전체 렌더링"""
        self._render_header(hud)
        self._render_core_metrics(hud)
        self._render_noise_gauges(hud)
        self._render_mva(hud)
        self._render_alternatives(hud)
        self._render_footer(hud)
    
    def _render_header(self, hud: 'HUDOutput'):
        """헤더 렌더링"""
        print()
        print(self.c(Color.CYAN, "╔" + "═" * (self.WIDTH - 2) + "╗"))
        
        title = "AUTUS 2.0 HUD"
        risk_color = {
            "HIGH": Color.RED,
            "MEDIUM": Color.YELLOW,
            "LOW": Color.GREEN
        }.get(hud.risk_assessment, Color.WHITE)
        
        risk_badge = self.c(risk_color + Color.BOLD, f"[{hud.risk_assessment}]")
        
        header = f"  {self.c(Color.BOLD + Color.WHITE, title)}  {risk_badge}"
        padding = self.WIDTH - len(title) - len(hud.risk_assessment) - 10
        print(self.c(Color.CYAN, "║") + header + " " * padding + self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╠" + "═" * (self.WIDTH - 2) + "╣"))
    
    def _render_core_metrics(self, hud: 'HUDOutput'):
        """핵심 지표 렌더링"""
        # Loss Velocity
        loss_str = f"₩{hud.loss_velocity:,.2f}/sec"
        loss_daily = hud.loss_velocity * 86400
        loss_monthly = loss_daily * 30
        
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.RED + Color.BOLD, f"  ⚡ LOSS VELOCITY: {loss_str}") +
              " " * (self.WIDTH - len(loss_str) - 22) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.DIM, f"     (일: ₩{loss_daily:,.0f} / 월: ₩{loss_monthly:,.0f})") +
              " " * (self.WIDTH - 45) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "║") + " " * (self.WIDTH - 2) + self.c(Color.CYAN, "║"))
        
        # PNR Marker
        pnr_color = Color.RED if hud.pnr_days < 30 else (Color.YELLOW if hud.pnr_days < 90 else Color.GREEN)
        pnr_bar = self._make_bar(min(hud.pnr_days, 365), 365, 30)
        
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.BLUE + Color.BOLD, f"  ⏱  PNR MARKER: ") +
              self.c(pnr_color + Color.BOLD, f"{hud.pnr_days} DAYS") +
              " " * (self.WIDTH - 32) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "║") + 
              f"     {pnr_bar}" +
              " " * (self.WIDTH - 37) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╠" + "─" * (self.WIDTH - 2) + "╣"))
    
    def _render_noise_gauges(self, hud: 'HUDOutput'):
        """7대 노이즈 게이지 렌더링"""
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.WHITE + Color.BOLD, "  📊 7대 노이즈 분석") +
              self.c(Color.DIM, f"  (총점: {hud.total_noise_score:.2f})") +
              " " * (self.WIDTH - 38) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "║") + " " * (self.WIDTH - 2) + self.c(Color.CYAN, "║"))
        
        for ind in hud.noise_indicators:
            self._render_noise_row(ind, ind.type == hud.dominant_noise)
        
        print(self.c(Color.CYAN, "╠" + "─" * (self.WIDTH - 2) + "╣"))
    
    def _render_noise_row(self, ind: 'NoiseIndicator', is_dominant: bool):
        """단일 노이즈 행 렌더링"""
        status_icon = {
            "DANGER": self.c(Color.RED, "🔴"),
            "WARNING": self.c(Color.YELLOW, "🟡"),
            "SAFE": self.c(Color.GREEN, "🟢")
        }.get(ind.status, "⚪")
        
        # 노이즈 이름
        name = f"{ind.name_kr}({ind.type})"
        if is_dominant:
            name = self.c(Color.RED + Color.BOLD, f"▶ {name}")
        else:
            name = f"  {name}"
        
        # 게이지 바
        bar = self._make_gauge(ind.score, ind.threshold)
        
        # 점수
        score_color = Color.RED if ind.score >= ind.threshold else (
            Color.YELLOW if ind.score >= ind.threshold * 0.7 else Color.GREEN
        )
        score_str = self.c(score_color, f"{ind.score:.2f}")
        
        # 예상 손실
        impact_str = f"₩{ind.impact_won:,.0f}"
        
        row = f"{status_icon} {name:<18} {bar} {score_str}  {self.c(Color.DIM, impact_str)}"
        padding = self.WIDTH - 65
        
        print(self.c(Color.CYAN, "║") + f"  {row}" + " " * max(0, padding) + self.c(Color.CYAN, "║"))
    
    def _render_mva(self, hud: 'HUDOutput'):
        """MVA 렌더링"""
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.GREEN + Color.BOLD, "  ✅ MVA (최소 유효 행동)") +
              " " * (self.WIDTH - 27) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "║") + " " * (self.WIDTH - 2) + self.c(Color.CYAN, "║"))
        
        # MVA 박스
        mva_text = hud.mva[:self.WIDTH - 10]
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.BG_GREEN + Color.WHITE + Color.BOLD, f"  → {mva_text}") +
              " " * (self.WIDTH - len(mva_text) - 8) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╠" + "─" * (self.WIDTH - 2) + "╣"))
    
    def _render_alternatives(self, hud: 'HUDOutput'):
        """대안 경로 렌더링"""
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.YELLOW, "  🔀 대안 경로") +
              " " * (self.WIDTH - 16) + 
              self.c(Color.CYAN, "║"))
        
        for i, alt in enumerate(hud.alternative_paths[:3], 1):
            alt_text = alt[:self.WIDTH - 12]
            print(self.c(Color.CYAN, "║") + 
                  self.c(Color.DIM, f"     {i}. {alt_text}") +
                  " " * (self.WIDTH - len(alt_text) - 10) + 
                  self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╠" + "─" * (self.WIDTH - 2) + "╣"))
    
    def _render_footer(self, hud: 'HUDOutput'):
        """푸터 렌더링"""
        time_str = hud.timestamp.split("T")[1][:8]
        hash_str = hud.input_hash
        
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.DIM, f"  📁 Vault: {hud.vault_path}") +
              " " * (self.WIDTH - len(str(hud.vault_path)) - 14) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "║") + 
              self.c(Color.DIM, f"  🕐 {time_str} | #{hash_str} | AUTUS 2.0") +
              " " * (self.WIDTH - 38) + 
              self.c(Color.CYAN, "║"))
        
        print(self.c(Color.CYAN, "╚" + "═" * (self.WIDTH - 2) + "╝"))
        print()
    
    def _make_gauge(self, value: float, threshold: float, width: int = 20) -> str:
        """게이지 바 생성"""
        filled = int(value * width)
        threshold_pos = int(threshold * width)
        
        bar = ""
        for i in range(width):
            if i < filled:
                if value >= threshold:
                    bar += self.c(Color.RED, "█")
                elif value >= threshold * 0.7:
                    bar += self.c(Color.YELLOW, "█")
                else:
                    bar += self.c(Color.GREEN, "█")
            elif i == threshold_pos:
                bar += self.c(Color.WHITE, "│")
            else:
                bar += self.c(Color.DIM, "░")
        
        return f"[{bar}]"
    
    def _make_bar(self, value: int, max_val: int, width: int = 30) -> str:
        """진행 바 생성"""
        ratio = value / max_val if max_val > 0 else 0
        filled = int(ratio * width)
        
        if ratio < 0.25:
            color = Color.RED
        elif ratio < 0.5:
            color = Color.YELLOW
        else:
            color = Color.GREEN
        
        bar = self.c(color, "█" * filled) + self.c(Color.DIM, "░" * (width - filled))
        return f"[{bar}]"


# ═══════════════════════════════════════════════════════════════════════════════
# STANDALONE USAGE
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트용 Mock 데이터
    from autus_distiller import Distiller
    
    test_input = "법인 부채 5억 상환 대신 신규 사업 확장에 3억 우선 투입 제안"
    
    distiller = Distiller()
    result = distiller.distill(test_input)
    
    renderer = HUDRenderer()
    renderer.render(result)
