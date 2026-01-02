#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()



















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗   ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝   ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝   ║
║                                                                                           ║
║                       AUTUS BRIDGE - ULTIMATE EDITION v3.2                                ║
║                       The Self-Evolving Agent                                             ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Screen Capture                                                                    ║
║  ✅ Dark Theme UI                                                                         ║
║  ✅ VIP/Caution Alerts with Sound                                                         ║
║  ✅ Toast Notifications                                                                   ║
║  ✅ Auto-Update System                                                                    ║
║  ✅ Gamification (Daily Mission)                                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

설치 요구사항:
- Python 3.8+
- Tesseract OCR (https://github.com/tesseract-ocr/tesseract)
- pip install pyautogui pytesseract requests Pillow

배포:
    pyinstaller --noconsole --onefile --name="AUTUS_Bridge" autus_bridge_ultimate.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import os
import sys
import re
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-bridge")

# 선택적 임포트
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests 모듈이 설치되지 않았습니다. pip install requests")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui 모듈이 설치되지 않았습니다. pip install pyautogui")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract/Pillow 모듈이 설치되지 않았습니다. pip install pytesseract Pillow")

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

CURRENT_VERSION = "3.2.0"

# ⚠️ 배포 시 이 URL을 Railway 주소로 변경하세요!
DEFAULT_SERVER_URL = os.getenv("AUTUS_SERVER_URL", "http://localhost:8000")

# 스테이션 설정 (매장별로 다르게)
DEFAULT_STATION_ID = os.getenv("AUTUS_STATION_ID", "TEST_PC_01")
DEFAULT_BIZ_TYPE = os.getenv("AUTUS_BIZ_TYPE", "RESTAURANT")

# OCR 설정
SCAN_INTERVAL_SECONDS = 2
OCR_LANGUAGE = "kor+eng"

# Tesseract 경로
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'/usr/bin/tesseract',
    r'/opt/homebrew/bin/tesseract',
    r'/usr/local/bin/tesseract',
]


def find_tesseract() -> Optional[str]:
    """Tesseract 실행 파일 찾기"""
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            return path
    return None


if TESSERACT_AVAILABLE:
    tesseract_path = find_tesseract()
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract 경로: {tesseract_path}")
    else:
        logger.warning("Tesseract를 찾을 수 없습니다. OCR 기능이 제한됩니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 다크 테마 색상
# ═══════════════════════════════════════════════════════════════════════════════════════════

THEME: Dict[str, str] = {
    'bg': '#1a1a2e',
    'card_bg': '#16213e',
    'accent': '#f5a524',
    'success': '#4CAF50',
    'warning': '#FF4444',
    'text': '#ffffff',
    'text_dim': '#888888',
    'vip': '#FFD700',
    'border': '#333333',
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사운드 시스템
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SoundAlert:
    """알림음 시스템"""
    
    @classmethod
    def play_vip(cls) -> None:
        """VIP 알림음 (상승 멜로디)"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(523, 150)  # C
                winsound.Beep(659, 150)  # E
                winsound.Beep(784, 200)  # G
            except Exception as e:
                logger.debug(f"VIP 알림음 재생 실패: {e}")
        else:
            # macOS/Linux: 터미널 벨
            print('\a', end='', flush=True)
    
    @classmethod
    def play_warning(cls) -> None:
        """경고 알림음"""
        if WINSOUND_AVAILABLE:
            try:
                for _ in range(3):
                    winsound.Beep(1000, 100)
                    time.sleep(0.05)
            except Exception as e:
                logger.debug(f"경고 알림음 재생 실패: {e}")
        else:
            print('\a', end='', flush=True)
    
    @classmethod
    def play_success(cls) -> None:
        """성공음"""
        if WINSOUND_AVAILABLE:
            try:
                winsound.Beep(600, 150)
            except Exception as e:
                logger.debug(f"성공음 재생 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 토스트 알림
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ToastNotification:
    """토스트 스타일 팝업 알림"""
    
    COLORS: Dict[str, Tuple[str, str]] = {
        'vip': ('#FFD700', '#3d3400'),
        'caution': ('#FF4444', '#4a0000'),
        'success': ('#4CAF50', '#1b3d1b'),
    }
    
    def __init__(self, parent: tk.Tk):
        self.parent = parent
        self.toast_window: Optional[tk.Toplevel] = None
    
    def show(self, message: str, alert_type: str = 'success', duration: int = 4000) -> None:
        """토스트 알림 표시"""
        # 기존 토스트 제거
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
        
        fg, bg = self.COLORS.get(alert_type, self.COLORS['success'])
        
        self.toast_window = tk.Toplevel(self.parent)
        self.toast_window.overrideredirect(True)
        self.toast_window.attributes('-topmost', True)
        
        # 화면 우측 하단
        screen_w = self.parent.winfo_screenwidth()
        screen_h = self.parent.winfo_screenheight()
        self.toast_window.geometry(f'320x90+{screen_w - 340}+{screen_h - 150}')
        self.toast_window.configure(bg=bg)
        
        icon = "👑" if alert_type == 'vip' else "⚠️" if alert_type == 'caution' else "✓"
        
        frame = tk.Frame(self.toast_window, bg=bg, padx=15, pady=10)
        frame.pack(fill='both', expand=True)
        
        tk.Label(frame, text=icon, font=('Arial', 28), bg=bg, fg=fg).pack(side='left', padx=(0, 15))
        
        msg_frame = tk.Frame(frame, bg=bg)
        msg_frame.pack(side='left', fill='both', expand=True)
        
        tk.Label(msg_frame, text="AUTUS Alert", font=('Arial', 9, 'bold'), bg=bg, fg=fg).pack(anchor='w')
        tk.Label(msg_frame, text=message[:50], font=('Arial', 10), bg=bg, fg='white', wraplength=220).pack(anchor='w')
        
        self.toast_window.after(duration, self._close)
    
    def _close(self) -> None:
        """토스트 닫기"""
        if self.toast_window:
            try:
                self.toast_window.destroy()
            except tk.TclError:
                pass
            self.toast_window = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 애플리케이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusUltimateApp:
    """AUTUS Bridge Ultimate v3.2 메인 애플리케이션"""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"AUTUS Bridge v{CURRENT_VERSION}")
        self.root.geometry("380x580")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)
        self.root.configure(bg=THEME['bg'])
        
        # 토스트
        self.toast = ToastNotification(root)
        
        # 상태
        self.is_running = True
        self.is_paused = False
        self.capture_region: Tuple[int, int, int, int] = (200, 200, 600, 400)
        self.last_hash: int = 0
        self.stats: Dict[str, int] = {'sent': 0, 'vip': 0, 'caution': 0}
        
        # 임시 좌표 저장용
        self._temp_coords: Tuple[int, int] = (0, 0)
        
        # 자동 업데이트 체크
        self._check_update()
        
        # UI 구성
        self._build_ui()
        
        # 백그라운드 스레드
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
    
    def _check_update(self) -> None:
        """자동 업데이트 체크"""
        if not REQUESTS_AVAILABLE:
            return
        
        try:
            server = DEFAULT_SERVER_URL
            res = requests.get(f"{server}/version/check?current_version={CURRENT_VERSION}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                if data.get('needs_update'):
                    ans = messagebox.askyesno(
                        "업데이트 발견",
                        f"새 버전이 있습니다: v{data.get('latest_version')}\n\n"
                        f"{data.get('release_notes', '')}\n\n"
                        "지금 업데이트하시겠습니까?"
                    )
                    if ans:
                        self._perform_update(data.get('download_url'))
        except requests.exceptions.RequestException as e:
            logger.debug(f"업데이트 체크 실패: {e}")
    
    def _perform_update(self, url: Optional[str]) -> None:
        """업데이트 수행"""
        if not url:
            messagebox.showerror("업데이트 실패", "다운로드 URL이 없습니다.")
            return
        
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            
            with open("AUTUS_Bridge_new.exe", "wb") as f:
                f.write(r.content)
            
            # Windows용 교체 배치 파일
            if sys.platform == 'win32':
                with open("updater.bat", "w") as f:
                    f.write("""@echo off
timeout /t 2 /nobreak > nul
del AUTUS_Bridge.exe
ren AUTUS_Bridge_new.exe AUTUS_Bridge.exe
start AUTUS_Bridge.exe
del updater.bat
""")
                subprocess.Popen("updater.bat", shell=True)
            
            self.root.destroy()
            sys.exit()
        except Exception as e:
            messagebox.showerror("업데이트 실패", str(e))
    
    def _build_ui(self) -> None:
        """UI 구성"""
        # 헤더
        header = tk.Frame(self.root, bg=THEME['accent'], height=55)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header, text="🌉 AUTUS BRIDGE",
            font=('Arial', 15, 'bold'),
            bg=THEME['accent'], fg=THEME['bg']
        ).pack(pady=15)
        
        # 메인
        main = tk.Frame(self.root, bg=THEME['bg'], padx=20, pady=15)
        main.pack(fill='both', expand=True)
        
        # 상태 카드
        status_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        status_card.pack(fill='x', pady=(0, 10))
        
        status_row = tk.Frame(status_card, bg=THEME['card_bg'])
        status_row.pack(fill='x')
        
        self.status_dot = tk.Label(status_row, text="●", font=('Arial', 20),
                                   bg=THEME['card_bg'], fg=THEME['success'])
        self.status_dot.pack(side='left')
        
        self.status_text = tk.Label(status_row, text="SYSTEM READY",
                                    font=('Arial', 11, 'bold'),
                                    bg=THEME['card_bg'], fg=THEME['success'])
        self.status_text.pack(side='left', padx=10)
        
        # 지침 표시 영역
        self.guide_frame = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=15)
        self.guide_frame.pack(fill='x', pady=(0, 10))
        
        self.guide_icon = tk.Label(self.guide_frame, text="📋", font=('Arial', 28),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_icon.pack()
        
        self.guide_name = tk.Label(self.guide_frame, text="대기 중",
                                   font=('Arial', 12, 'bold'),
                                   bg=THEME['card_bg'], fg=THEME['text'])
        self.guide_name.pack(pady=(5, 0))
        
        self.guide_msg = tk.Label(self.guide_frame, text="회원 정보를 조회하면\nAI가 분석합니다.",
                                  font=('Arial', 10),
                                  bg=THEME['card_bg'], fg=THEME['text_dim'],
                                  justify='center', wraplength=280)
        self.guide_msg.pack(pady=(5, 0))
        
        # 미션 카드 (게이미피케이션)
        mission_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        mission_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(mission_card, text="🎯 오늘의 미션",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['accent']).pack(anchor='w')
        
        self.weather_label = tk.Label(mission_card, text="⏳ 서버 연결 대기 중...",
                                      font=('Arial', 9),
                                      bg=THEME['card_bg'], fg=THEME['text_dim'])
        self.weather_label.pack(anchor='w', pady=(5, 0))
        
        self.mission_label = tk.Label(mission_card, text="",
                                      font=('Arial', 10),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      wraplength=300, justify='left')
        self.mission_label.pack(anchor='w', pady=(3, 0))
        
        self.reward_label = tk.Label(mission_card, text="",
                                     font=('Arial', 9),
                                     bg=THEME['card_bg'], fg=THEME['vip'])
        self.reward_label.pack(anchor='w', pady=(3, 0))
        
        # 통계 카드
        stats_card = tk.Frame(main, bg=THEME['card_bg'], padx=15, pady=12)
        stats_card.pack(fill='x', pady=(0, 10))
        
        tk.Label(stats_card, text="📊 통계",
                 font=('Arial', 10, 'bold'),
                 bg=THEME['card_bg'], fg=THEME['text']).pack(anchor='w')
        
        stats_row = tk.Frame(stats_card, bg=THEME['card_bg'])
        stats_row.pack(fill='x', pady=(8, 0))
        
        self.stat_labels: Dict[str, tk.Label] = {}
        for key, (label, color) in [('sent', ('전송', THEME['text'])),
                                     ('vip', ('VIP', THEME['vip'])),
                                     ('caution', ('주의', THEME['warning']))]:
            f = tk.Frame(stats_row, bg=THEME['card_bg'])
            f.pack(side='left', expand=True)
            self.stat_labels[key] = tk.Label(f, text="0", font=('Arial', 18, 'bold'),
                                              bg=THEME['card_bg'], fg=color)
            self.stat_labels[key].pack()
            tk.Label(f, text=label, font=('Arial', 8),
                     bg=THEME['card_bg'], fg=THEME['text_dim']).pack()
        
        # 버튼
        btn_frame = tk.Frame(main, bg=THEME['bg'])
        btn_frame.pack(fill='x', pady=(5, 0))
        
        tk.Button(btn_frame, text="📐 좌표설정", command=self._set_region,
                  bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                  relief='flat', padx=12, pady=6).pack(side='left')
        
        self.pause_btn = tk.Button(btn_frame, text="⏸️ 일시정지", command=self._toggle_pause,
                                   bg=THEME['card_bg'], fg=THEME['text'], font=('Arial', 9),
                                   relief='flat', padx=12, pady=6)
        self.pause_btn.pack(side='left', padx=5)
        
        # 서버 URL
        server_frame = tk.Frame(main, bg=THEME['bg'])
        server_frame.pack(fill='x', pady=(10, 0))
        
        tk.Label(server_frame, text="서버:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.server_entry = tk.Entry(server_frame, width=30, font=('Arial', 8),
                                     bg=THEME['card_bg'], fg=THEME['text'],
                                     insertbackground=THEME['text'], relief='flat')
        self.server_entry.insert(0, DEFAULT_SERVER_URL)
        self.server_entry.pack(side='left', padx=5)
        
        # 스테이션 ID
        station_frame = tk.Frame(main, bg=THEME['bg'])
        station_frame.pack(fill='x', pady=(5, 0))
        
        tk.Label(station_frame, text="스테이션:", font=('Arial', 8),
                 bg=THEME['bg'], fg=THEME['text_dim']).pack(side='left')
        
        self.station_entry = tk.Entry(station_frame, width=26, font=('Arial', 8),
                                      bg=THEME['card_bg'], fg=THEME['text'],
                                      insertbackground=THEME['text'], relief='flat')
        self.station_entry.insert(0, DEFAULT_STATION_ID)
        self.station_entry.pack(side='left', padx=5)
    
    def _set_region(self) -> None:
        """좌표 설정"""
        if not PYAUTOGUI_AVAILABLE:
            messagebox.showerror("오류", "pyautogui가 설치되지 않았습니다.\npip install pyautogui")
            return
        
        messagebox.showinfo("좌표 설정 (1/2)",
                           "확인을 누르고 3초 후,\n마우스를 감시할 영역의 [좌측 상단]에 두세요.")
        self.root.after(3000, self._capture_point1)
    
    def _capture_point1(self) -> None:
        """좌측 상단 좌표 캡처"""
        x1, y1 = pyautogui.position()
        self._temp_coords = (x1, y1)
        messagebox.showinfo("좌표 설정 (2/2)",
                           f"좌측 상단: ({x1}, {y1})\n\n확인을 누르고 3초 후,\n[우측 하단]에 마우스를 두세요.")
        self.root.after(3000, self._capture_point2)
    
    def _capture_point2(self) -> None:
        """우측 하단 좌표 캡처"""
        x1, y1 = self._temp_coords
        x2, y2 = pyautogui.position()
        w, h = x2 - x1, y2 - y1
        
        if w <= 0 or h <= 0:
            messagebox.showerror("오류", "좌표가 올바르지 않습니다.\n우측 하단이 좌측 상단보다 아래, 오른쪽에 있어야 합니다.")
            return
        
        self.capture_region = (x1, y1, w, h)
        self._update_guide("설정 완료", f"감시 영역: {w}x{h}", THEME['success'])
        SoundAlert.play_success()
        logger.info(f"캡처 영역 설정: {self.capture_region}")
    
    def _toggle_pause(self) -> None:
        """일시정지 토글"""
        self.is_paused = not self.is_paused
        if self.is_paused:
            self.pause_btn.config(text="▶️ 재개")
            self._update_status("PAUSED", THEME['warning'])
        else:
            self.pause_btn.config(text="⏸️ 일시정지")
            self._update_status("SYSTEM READY", THEME['success'])
    
    def _update_status(self, text: str, color: str) -> None:
        """상태 표시 업데이트"""
        self.status_text.config(text=text, fg=color)
        self.status_dot.config(fg=color)
    
    def _update_guide(self, name: str, msg: str, color: str = THEME['text'], icon: str = "📋") -> None:
        """지침 표시 업데이트"""
        self.guide_icon.config(text=icon)
        self.guide_name.config(text=name, fg=color)
        self.guide_msg.config(text=msg)
    
    def _update_mission(self, weather: str, mission: str, reward: str) -> None:
        """미션 표시 업데이트"""
        self.weather_label.config(text=weather)
        self.mission_label.config(text=mission)
        self.reward_label.config(text=f"🎁 보상: {reward}")
    
    def _update_stats(self) -> None:
        """통계 표시 업데이트"""
        for key in ['sent', 'vip', 'caution']:
            self.stat_labels[key].config(text=str(self.stats[key]))
    
    def _loop(self) -> None:
        """백그라운드 감시 루프"""
        while not self.stop_event.is_set():
            try:
                if self.is_paused:
                    time.sleep(1)
                    continue
                
                # OCR 캡처
                text = ""
                if PYAUTOGUI_AVAILABLE and TESSERACT_AVAILABLE:
                    try:
                        screenshot = pyautogui.screenshot(region=self.capture_region)
                        text = pytesseract.image_to_string(screenshot, lang=OCR_LANGUAGE)
                    except Exception as e:
                        logger.debug(f"OCR 오류: {e}")
                
                # 변화 감지
                current_hash = hash(text)
                if current_hash == self.last_hash or not text.strip():
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                # 전화번호 확인
                if not re.search(r'010[-.\s]?\d{4}[-.\s]?\d{4}', text):
                    time.sleep(SCAN_INTERVAL_SECONDS)
                    continue
                
                self.last_hash = current_hash
                self.root.after(0, lambda: self._update_status("ANALYZING...", THEME['accent']))
                
                # 서버 전송
                if REQUESTS_AVAILABLE:
                    try:
                        server = self.server_entry.get().strip()
                        station_id = self.station_entry.get().strip() or DEFAULT_STATION_ID
                        
                        res = requests.post(f"{server}/ingest", json={
                            "station_id": station_id,
                            "raw_text": text,
                            "biz_type": DEFAULT_BIZ_TYPE,
                        }, timeout=5)
                        
                        if res.status_code == 200:
                            data = res.json()
                            guide = data.get('guide', {})
                            instruction = data.get('instruction', {})
                            
                            # 통계
                            self.stats['sent'] += 1
                            alert_level = guide.get('alert_level', 'normal')
                            if alert_level == 'urgent':
                                self.stats['vip'] += 1
                            elif alert_level == 'caution':
                                self.stats['caution'] += 1
                            
                            self.root.after(0, self._update_stats)
                            
                            # 지침 표시
                            name = guide.get('display_name', '고객')
                            msg = guide.get('message', '분석 완료')
                            icon = guide.get('icon', '✓')
                            
                            if alert_level == 'urgent':
                                color = THEME['vip']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'vip'))
                                threading.Thread(target=SoundAlert.play_vip, daemon=True).start()
                            elif alert_level == 'caution':
                                color = THEME['warning']
                                self.root.after(0, lambda m=msg: self.toast.show(m, 'caution'))
                                threading.Thread(target=SoundAlert.play_warning, daemon=True).start()
                            else:
                                color = THEME['success']
                            
                            self.root.after(0, lambda n=name, m=msg, c=color, i=icon: 
                                           self._update_guide(n, m, c, i))
                            
                            # 미션 업데이트
                            if instruction:
                                weather = instruction.get('weather_alert', '')
                                mission = instruction.get('daily_mission', '')
                                reward = instruction.get('mission_reward', '')
                                self.root.after(0, lambda w=weather, m=mission, r=reward:
                                               self._update_mission(w, m, r))
                            
                            self.root.after(0, lambda: self._update_status("SYSTEM READY", THEME['success']))
                        else:
                            logger.warning(f"서버 응답 오류: {res.status_code}")
                            self.root.after(0, lambda: self._update_status("ERROR", THEME['warning']))
                        
                    except requests.exceptions.RequestException as e:
                        logger.warning(f"서버 연결 오류: {e}")
                        self.root.after(0, lambda: self._update_status("OFFLINE", THEME['warning']))
                
            except Exception as e:
                logger.error(f"루프 오류: {e}")
            
            time.sleep(SCAN_INTERVAL_SECONDS)
    
    def on_closing(self) -> None:
        """종료 처리"""
        self.stop_event.set()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main() -> None:
    """메인 진입점"""
    root = tk.Tk()
    app = AutusUltimateApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    logger.info(f"AUTUS Bridge v{CURRENT_VERSION} 시작")
    logger.info(f"서버: {DEFAULT_SERVER_URL}")
    logger.info(f"스테이션: {DEFAULT_STATION_ID}")
    
    root.mainloop()


if __name__ == "__main__":
    main()
























